import { MovieComment, MovieRatingStats, CommentReactionType } from "@/types/comment";
import { checkContentModeration, detectSpoiler } from "@/lib/contentModeration";
import { sanitizeSafeText } from "@/lib/security";
import {
  getMovieCommentsSupabase,
  getCommentRepliesSupabase,
  getUserCommentsSupabase,
  getAllCommentsSupabase,
  togglePinCommentSupabase,
  flagCommentSupabase,
  unflagCommentSupabase,
  getUserProfileSupabase,
} from "./supabaseService";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { auth } from "@/lib/firebase";

// In-memory cache lưu danh sách bình luận theo movieSlug để hiển thị ngay 0ms không bị chớp hay mất
const movieCommentsMemoryCache: Record<string, MovieComment[]> = {};
const replyCommentsMemoryCache: Record<string, MovieComment[]> = {};
const userCommentsMemoryCache: Record<string, MovieComment[]> = {};

// Quản lý ID các bình luận đã bị xóa để ngăn chặn tuyệt đối tình trạng hồi sinh (Ghost Comments)
const deletedCommentIds = new Set<string>();

export function markCommentDeleted(commentId: string): void {
  if (!commentId) return;
  deletedCommentIds.add(commentId);
  try {
    if (typeof sessionStorage !== "undefined") {
      const stored = JSON.parse(sessionStorage.getItem("nanaflix_deleted_comments") || "[]");
      if (Array.isArray(stored) && !stored.includes(commentId)) {
        stored.push(commentId);
        sessionStorage.setItem("nanaflix_deleted_comments", JSON.stringify(stored.slice(-200)));
      }
    }
  } catch {}
}

export function unmarkCommentDeleted(commentId: string): void {
  if (!commentId) return;
  deletedCommentIds.delete(commentId);
  try {
    if (typeof sessionStorage !== "undefined") {
      const stored = JSON.parse(sessionStorage.getItem("nanaflix_deleted_comments") || "[]");
      if (Array.isArray(stored)) {
        sessionStorage.setItem(
          "nanaflix_deleted_comments",
          JSON.stringify(stored.filter((id: string) => id !== commentId))
        );
      }
    }
  } catch {}
}

export function isCommentDeleted(commentId: string): boolean {
  if (!commentId) return false;
  if (deletedCommentIds.has(commentId)) return true;
  try {
    if (typeof sessionStorage !== "undefined") {
      const stored = JSON.parse(sessionStorage.getItem("nanaflix_deleted_comments") || "[]");
      if (Array.isArray(stored) && stored.includes(commentId)) {
        deletedCommentIds.add(commentId);
        return true;
      }
    }
  } catch {}
  return false;
}

/**
 * Lấy danh sách bình luận từ LocalStorage theo movieSlug
 */
function getLocalMovieComments(movieSlug: string): MovieComment[] {
  if (typeof window === "undefined" || !movieSlug) return [];
  try {
    const raw = localStorage.getItem(`nanaflix_comments_${movieSlug}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {}
  return [];
}

/**
 * Lưu danh sách bình luận vào LocalStorage theo movieSlug
 */
function saveLocalMovieComments(movieSlug: string, items: MovieComment[]): void {
  if (typeof window === "undefined" || !movieSlug) return;
  try {
    localStorage.setItem(`nanaflix_comments_${movieSlug}`, JSON.stringify(items.slice(0, 100)));
  } catch {}
}

/**
 * Lấy danh sách bình luận cá nhân từ LocalStorage theo userId
 */
function getLocalUserComments(userId: string): MovieComment[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = localStorage.getItem(`nanaflix_user_comments_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {}
  return [];
}

/**
 * Lưu danh sách bình luận cá nhân vào LocalStorage theo userId
 */
function saveLocalUserComments(userId: string, items: MovieComment[]): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.setItem(`nanaflix_user_comments_${userId}`, JSON.stringify(items.slice(0, 100)));
  } catch {}
}

/**
 * Đăng ký lắng nghe bình luận theo thời gian thực (Supabase PostgreSQL + 0ms Optimistic UI)
 */
export function subscribeMovieComments(
  movieSlug: string,
  onUpdate: (comments: MovieComment[]) => void,
  onError?: (err: Error) => void,
): () => void {
  if (!movieSlug) {
    onUpdate([]);
    return () => {};
  }

  let isUnsubscribed = false;

  // 1. Phục hồi ngay lập tức từ bộ nhớ đệm (0ms - không bị nhấp nháy hay mất comment)
  const memCached = movieCommentsMemoryCache[movieSlug];
  if (memCached && Array.isArray(memCached) && memCached.length > 0) {
    onUpdate(memCached.filter((c) => !isCommentDeleted(c.id)));
  } else {
    const local = getLocalMovieComments(movieSlug).filter((c) => !isCommentDeleted(c.id));
    if (local.length > 0) {
      movieCommentsMemoryCache[movieSlug] = local;
      onUpdate(local);
    }
  }

  const handleNewData = (items: MovieComment[]) => {
    const validItems = items
      .filter((c) => !isCommentDeleted(c.id))
      .filter((c) => !c.movieSlug || c.movieSlug === movieSlug);

    const existingCache = (movieCommentsMemoryCache[movieSlug] || []).filter((c) => !isCommentDeleted(c.id));
    const localMap = new Map<string, MovieComment>();
    existingCache.forEach((item) => localMap.set(item.id, item));

    const mergedItems = validItems.map((remoteItem) => {
      const localItem = localMap.get(remoteItem.id);
      if (!localItem) return remoteItem;

      // Kiểm tra xem local item có bản cập nhật mới hơn remote không
      const nowTime = Date.now();
      const isLocalNewer =
        (localItem.updatedAt || 0) > (remoteItem.updatedAt || 0) &&
        nowTime - (Number(localItem.updatedAt) || 0) < 30000;

      let mergedReactions: Record<string, CommentReactionType>;
      let likedByList: string[];
      let calculatedLikes: number;

      if (isLocalNewer && localItem.reactions !== undefined) {
        // Bản cập nhật cục bộ mới hơn (ví dụ vừa thả cảm xúc / gỡ cảm xúc), ưu tiên dữ liệu cục bộ
        mergedReactions = { ...localItem.reactions };
        likedByList = Array.isArray(localItem.likedBy) ? [...localItem.likedBy] : Object.keys(mergedReactions);
        calculatedLikes = localItem.likes !== undefined ? localItem.likes : Object.keys(mergedReactions).length;
      } else {
        mergedReactions = {
          ...(remoteItem.reactions || {}),
        };
        const likedBySet = new Set<string>([
          ...(Array.isArray(remoteItem.likedBy) ? remoteItem.likedBy : []),
          ...Object.keys(mergedReactions),
        ]);
        likedByList = Array.from(likedBySet);
        calculatedLikes = Math.max(remoteItem.likes || 0, likedByList.length);
      }

      const tally: Partial<Record<CommentReactionType, number>> = {};
      Object.values(mergedReactions).forEach((t) => {
        tally[t] = (tally[t] || 0) + 1;
      });

      return {
        ...remoteItem,
        ...(isLocalNewer
          ? {
              content: localItem.content,
              rating: localItem.rating,
              isSpoiler: localItem.isSpoiler,
              episodeSlug: localItem.episodeSlug,
              episodeName: localItem.episodeName,
              updatedAt: localItem.updatedAt,
            }
          : {}),
        reactions: mergedReactions,
        reactionCounts: tally,
        likedBy: likedByList,
        likes: calculatedLikes,
        isPinned: localItem.isPinned !== undefined ? localItem.isPinned : remoteItem.isPinned,
      };
    });

    // Giữ lại các comment vừa tạo cục bộ (< 15 giây) mà Supabase chưa kịp trả về trong request này
    // TUYỆT ĐỐI KHÔNG giữ lại comment đã bị xóa
    const now = Date.now();
    existingCache.forEach((localItem) => {
      if (
        !isCommentDeleted(localItem.id) &&
        !mergedItems.some((m) => m.id === localItem.id) &&
        now - (Number(localItem.createdAt) || 0) < 15000
      ) {
        mergedItems.push(localItem);
      }
    });

    mergedItems.sort((a, b) => {
      const isPinnedA = Boolean(a.isPinned);
      const isPinnedB = Boolean(b.isPinned);
      if (isPinnedA && !isPinnedB) return -1;
      if (!isPinnedA && isPinnedB) return 1;
      return (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0);
    });

    movieCommentsMemoryCache[movieSlug] = mergedItems;
    saveLocalMovieComments(movieSlug, mergedItems);
    onUpdate(mergedItems);
  };

  // 2. Fetch dữ liệu mới nhất từ Supabase (mặc định đọc từ Redis Cache DB 2)
  const fetchSupabase = async (fresh = false) => {
    if (isUnsubscribed) return;
    if (isSupabaseConfigured()) {
      try {
        const items = await getMovieCommentsSupabase(movieSlug, fresh);
        if (!isUnsubscribed) {
          handleNewData(items);
        }
      } catch (err) {
        if (!isUnsubscribed) {
          handleNewData(getLocalMovieComments(movieSlug));
        }
        if (onError && err instanceof Error) onError(err);
      }
    } else {
      if (!isUnsubscribed) {
        handleNewData(getLocalMovieComments(movieSlug));
      }
    }
  };

  fetchSupabase(false);

  let lastFetchTime = Date.now();
  const handleVisibilityOrFocus = () => {
    if (isUnsubscribed) return;
    if (typeof document !== "undefined" && !document.hidden) {
      if (Date.now() - lastFetchTime > 15000) {
        lastFetchTime = Date.now();
        fetchSupabase(false);
      }
    }
  };

  // 3. Lắng nghe event comments-updated để reload tức thời
  const handleCommentsUpdated = (e: Event) => {
    if (isUnsubscribed) return;
    const customEvent = e as CustomEvent<{
      movieSlug?: string;
      commentId?: string;
      deleted?: boolean;
      comment?: MovieComment;
      reply?: MovieComment;
      parentId?: string;
      skipRemoteFetch?: boolean;
    }>;
    if (!customEvent.detail?.movieSlug || customEvent.detail.movieSlug === movieSlug) {
      if (customEvent.detail?.deleted && customEvent.detail?.commentId) {
        const cId = customEvent.detail.commentId;
        const cur = movieCommentsMemoryCache[movieSlug] || [];
        const filtered = cur.filter((c) => c.id !== cId && c.parentId !== cId);
        movieCommentsMemoryCache[movieSlug] = filtered;
        saveLocalMovieComments(movieSlug, filtered);
        onUpdate(filtered);
      } else if (customEvent.detail?.comment || customEvent.detail?.reply) {
        const newC = (customEvent.detail.comment || customEvent.detail.reply)!;
        const cur = movieCommentsMemoryCache[movieSlug] || [];
        const updated = [newC, ...cur.filter((c) => c.id !== newC.id)];
        movieCommentsMemoryCache[movieSlug] = updated;
        saveLocalMovieComments(movieSlug, updated);
        onUpdate(updated);
      } else {
        const cur = movieCommentsMemoryCache[movieSlug];
        if (cur) onUpdate(cur.filter((c) => !isCommentDeleted(c.id)));
      }

      if (customEvent.detail?.skipRemoteFetch) {
        return;
      }

      lastFetchTime = Date.now();
      fetchSupabase(true);
    }
  };

  // 4. Polling dự phòng mỗi 5 phút (chỉ khi tab hoạt động) nếu kết nối WebSocket gián đoạn
  const syncInterval = setInterval(() => {
    if (!isUnsubscribed && typeof document !== "undefined" && !document.hidden) {
      if (Date.now() - lastFetchTime > 180000) {
        lastFetchTime = Date.now();
        fetchSupabase(false);
      }
    }
  }, 300000);

  if (typeof window !== "undefined") {
    window.addEventListener("comments-updated", handleCommentsUpdated);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);
  }

  // 5. Lắng nghe bình luận mới qua Supabase Realtime WebSocket (< 50ms)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let realtimeChannel: any = null;
  if (supabase) {
    try {
      realtimeChannel = supabase
        .channel(`realtime_comments_${movieSlug}_${Date.now()}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "movie_comments",
            filter: `movie_slug=eq.${movieSlug}`,
          },
          () => {
            if (!isUnsubscribed) {
              lastFetchTime = Date.now();
              fetchSupabase(true);
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.warn("Lỗi đăng ký Realtime comments:", err);
    }
  }

  return () => {
    isUnsubscribed = true;
    clearInterval(syncInterval);
    if (realtimeChannel && supabase) {
      try {
        supabase.removeChannel(realtimeChannel);
      } catch {}
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("comments-updated", handleCommentsUpdated);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
    }
  };
}

/**
 * Lắng nghe replies (trả lời) của một comment cụ thể theo thời gian thực
 */
export function subscribeCommentReplies(
  parentId: string,
  onUpdate: (replies: MovieComment[]) => void,
  onError?: (err: Error) => void,
): () => void {
  if (!parentId) {
    onUpdate([]);
    return () => {};
  }

  let isUnsubscribed = false;

  const handleNewReplies = (items: MovieComment[]) => {
    const validItems = items.filter((r) => !isCommentDeleted(r.id));
    const existingReplies = (replyCommentsMemoryCache[parentId] || []).filter((r) => !isCommentDeleted(r.id));
    const localMap = new Map<string, MovieComment>();
    existingReplies.forEach((r) => localMap.set(r.id, r));

    const merged = validItems.map((remoteItem) => {
      const localItem = localMap.get(remoteItem.id);
      if (!localItem) return remoteItem;

      const nowTime = Date.now();
      const isLocalNewer =
        (localItem.updatedAt || 0) > (remoteItem.updatedAt || 0) &&
        nowTime - (Number(localItem.updatedAt) || 0) < 30000;

      let mergedReactions: Record<string, CommentReactionType>;
      let likedByList: string[];
      let calculatedLikes: number;

      if (isLocalNewer && localItem.reactions !== undefined) {
        mergedReactions = { ...localItem.reactions };
        likedByList = Array.isArray(localItem.likedBy) ? [...localItem.likedBy] : Object.keys(mergedReactions);
        calculatedLikes = localItem.likes !== undefined ? localItem.likes : Object.keys(mergedReactions).length;
      } else {
        mergedReactions = {
          ...(remoteItem.reactions || {}),
        };
        const likedBySet = new Set<string>([
          ...(Array.isArray(remoteItem.likedBy) ? remoteItem.likedBy : []),
          ...Object.keys(mergedReactions),
        ]);
        likedByList = Array.from(likedBySet);
        calculatedLikes = Math.max(remoteItem.likes || 0, likedByList.length);
      }

      const tally: Partial<Record<CommentReactionType, number>> = {};
      Object.values(mergedReactions).forEach((t) => {
        tally[t] = (tally[t] || 0) + 1;
      });

      return {
        ...remoteItem,
        reactions: mergedReactions,
        reactionCounts: tally,
        likedBy: likedByList,
        likes: calculatedLikes,
      };
    });

    // Giữ lại các reply tạo cục bộ (< 15 giây) mà Supabase chưa kịp trả về
    // Tuyệt đối không giữ lại reply đã bị xóa
    const now = Date.now();
    existingReplies.forEach((localItem) => {
      if (
        !isCommentDeleted(localItem.id) &&
        !merged.some((m) => m.id === localItem.id) &&
        now - (Number(localItem.createdAt) || 0) < 15000
      ) {
        merged.push(localItem);
      }
    });

    merged.sort((a, b) => (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0));
    replyCommentsMemoryCache[parentId] = merged;
    onUpdate(merged);
  };

  if (replyCommentsMemoryCache[parentId]) {
    onUpdate(replyCommentsMemoryCache[parentId].filter((r) => !isCommentDeleted(r.id)));
  }

  const fetchReplies = async () => {
    if (isUnsubscribed) return;
    if (isSupabaseConfigured()) {
      try {
        const items = await getCommentRepliesSupabase(parentId);
        if (!isUnsubscribed) {
          handleNewReplies(items);
        }
      } catch (err) {
        if (onError && err instanceof Error) onError(err);
      }
    }
  };

  fetchReplies();

  let lastReplyFetch = Date.now();
  const handleVisibilityOrFocus = () => {
    if (isUnsubscribed) return;
    if (typeof document !== "undefined" && !document.hidden) {
      if (Date.now() - lastReplyFetch > 20000) {
        lastReplyFetch = Date.now();
        fetchReplies();
      }
    }
  };

  const handleLocalReplyUpdated = (e: Event) => {
    if (isUnsubscribed) return;
    const customEvent = e as CustomEvent<{
      parentId?: string;
      reply?: MovieComment;
      deleted?: boolean;
      commentId?: string;
      skipRemoteFetch?: boolean;
    }>;

    if (customEvent.detail?.deleted && customEvent.detail?.commentId) {
      const cId = customEvent.detail.commentId;
      const cur = replyCommentsMemoryCache[parentId] || [];
      const updated = cur.filter((r) => r.id !== cId);
      replyCommentsMemoryCache[parentId] = updated;
      onUpdate(updated);
      return;
    }

    if (customEvent.detail?.parentId === parentId) {
      if (customEvent.detail.reply && !isCommentDeleted(customEvent.detail.reply.id)) {
        const cur = replyCommentsMemoryCache[parentId] || [];
        const updated = [...cur.filter((r) => r.id !== customEvent.detail.reply!.id), customEvent.detail.reply];
        replyCommentsMemoryCache[parentId] = updated;
        onUpdate(updated);
      }
      if (customEvent.detail?.skipRemoteFetch) {
        return;
      }
      lastReplyFetch = Date.now();
      fetchReplies();
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("comments-updated", handleLocalReplyUpdated);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);
  }

  const interval = setInterval(() => {
    if (!isUnsubscribed && typeof document !== "undefined" && !document.hidden) {
      if (Date.now() - lastReplyFetch > 180000) {
        lastReplyFetch = Date.now();
        fetchReplies();
      }
    }
  }, 300000);

  // Lắng nghe replies mới qua Supabase Realtime WebSocket (< 50ms)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let replyRealtimeChannel: any = null;
  if (supabase) {
    try {
      replyRealtimeChannel = supabase
        .channel(`realtime_replies_${parentId}_${Date.now()}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "movie_comments",
            filter: `parent_id=eq.${parentId}`,
          },
          () => {
            if (!isUnsubscribed) {
              lastReplyFetch = Date.now();
              fetchReplies();
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.warn("Lỗi đăng ký Realtime replies:", err);
    }
  }

  return () => {
    isUnsubscribed = true;
    clearInterval(interval);
    if (replyRealtimeChannel && supabase) {
      try {
        supabase.removeChannel(replyRealtimeChannel);
      } catch {}
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("comments-updated", handleLocalReplyUpdated);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
    }
  };
}

/**
 * Lấy toàn bộ bình luận trực tiếp từ Supabase / Server API (dùng cho tải ban đầu và làm mới tức thì)
 */
export async function fetchAllCommentsDirect(): Promise<MovieComment[]> {
  if (isSupabaseConfigured()) {
    try {
      const items = await getAllCommentsSupabase();
      if (items && items.length > 0) return items;
    } catch {}
  }
  try {
    const res = await fetch(`/api/comments?all=true&_t=${Date.now()}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.items)) {
        return data.items as MovieComment[];
      }
    }
  } catch (err) {
    console.warn("Lỗi fetchAllCommentsDirect:", err);
  }
  return [];
}

/**
 * Lắng nghe toàn bộ bình luận từ cộng đồng theo thời gian thực (Dành riêng cho Quản Trị Viên)
 */
export function subscribeAllComments(
  onUpdate: (comments: MovieComment[]) => void,
  onError?: (err: Error) => void,
  _maxLimit: number = 500,
): () => void {
  void _maxLimit;
  let isUnsubscribed = false;
  let isFetching = false;

  const fetchAll = async () => {
    if (isUnsubscribed || isFetching) return;
    isFetching = true;
    try {
      if (isSupabaseConfigured()) {
        try {
          const items = await getAllCommentsSupabase();
          if (!isUnsubscribed) {
            onUpdate(items);
            return;
          }
        } catch (err) {
          if (onError && err instanceof Error) onError(err);
        }
      }
      try {
        const items = await fetchAllCommentsDirect();
        if (!isUnsubscribed && items.length > 0) {
          onUpdate(items);
        }
      } catch {}
    } finally {
      isFetching = false;
    }
  };

  fetchAll();

  const handleCommentsUpdated = () => {
    if (!isUnsubscribed) fetchAll();
  };

  const handleVisibilityChange = () => {
    if (!isUnsubscribed && typeof document !== "undefined" && !document.hidden) {
      fetchAll();
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("comments-updated", handleCommentsUpdated);
    document.addEventListener("visibilitychange", handleVisibilityChange);
  }

  const syncInterval = setInterval(() => {
    if (!isUnsubscribed && typeof document !== "undefined" && !document.hidden) {
      fetchAll();
    }
  }, 300000);

  return () => {
    isUnsubscribed = true;
    clearInterval(syncInterval);
    if (typeof window !== "undefined") {
      window.removeEventListener("comments-updated", handleCommentsUpdated);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    }
  };
}

/**
 * Lắng nghe tất cả bình luận do một Người Dùng đăng theo thời gian thực (0ms Optimistic UI + Supabase/API Sync)
 */
export function subscribeUserComments(
  userId: string,
  onUpdate: (comments: MovieComment[]) => void,
  onError?: (err: Error) => void,
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  let isUnsubscribed = false;
  let isFetching = false;

  // 1. Phục hồi 0ms từ memory cache hoặc localStorage
  const memCached = userCommentsMemoryCache[userId];
  if (memCached && Array.isArray(memCached) && memCached.length > 0) {
    onUpdate(memCached.filter((c) => !isCommentDeleted(c.id)));
  } else {
    const local = getLocalUserComments(userId).filter((c) => !isCommentDeleted(c.id));
    if (local.length > 0) {
      userCommentsMemoryCache[userId] = local;
      onUpdate(local);
    }
  }

  const handleNewUserComments = (items: MovieComment[]) => {
    const validItems = items.filter((c) => !isCommentDeleted(c.id));
    userCommentsMemoryCache[userId] = validItems;
    saveLocalUserComments(userId, validItems);
    onUpdate(validItems);
  };

  const fetchUserComments = async () => {
    if (isUnsubscribed || isFetching) return;
    isFetching = true;
    try {
      let items: MovieComment[] = [];
      try {
        items = await getUserCommentsSupabase(userId);
      } catch {}

      if (!isUnsubscribed) {
        handleNewUserComments(items);
      }
    } catch (err) {
      if (onError && err instanceof Error) onError(err);
    } finally {
      isFetching = false;
    }
  };

  fetchUserComments();

  // 2. Lắng nghe event comments-updated để cập nhật tức thời không có độ trễ
  const handleCommentsUpdated = (e: Event) => {
    if (isUnsubscribed) return;
    const customEvent = e as CustomEvent<{
      commentId?: string;
      deleted?: boolean;
      userId?: string;
      comment?: MovieComment;
      reply?: MovieComment;
    }>;

    // Nếu là sự kiện xóa comment
    if (customEvent.detail?.deleted && customEvent.detail?.commentId) {
      const cId = customEvent.detail.commentId;
      const cur = userCommentsMemoryCache[userId] || [];
      const filtered = cur.filter((c) => c.id !== cId);
      userCommentsMemoryCache[userId] = filtered;
      saveLocalUserComments(userId, filtered);
      onUpdate(filtered);
      return;
    }

    // Nếu là sự kiện thêm mới comment/reply của user hiện tại
    const newCommentOrReply = customEvent.detail?.comment || customEvent.detail?.reply;
    if (newCommentOrReply && customEvent.detail?.userId === userId) {
      const newC = newCommentOrReply;
      const cur = userCommentsMemoryCache[userId] || [];
      const updated = [newC, ...cur.filter((c) => c.id !== newC.id)];
      userCommentsMemoryCache[userId] = updated;
      saveLocalUserComments(userId, updated);
      onUpdate(updated);
    }

    fetchUserComments();
  };

  const handleVisibilityChange = () => {
    if (!isUnsubscribed && typeof document !== "undefined" && !document.hidden) {
      fetchUserComments();
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("comments-updated", handleCommentsUpdated);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);
  }

  // 3. Supabase Realtime cho user comments (< 50ms)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let realtimeChannel: any = null;
  if (supabase) {
    try {
      realtimeChannel = supabase
        .channel(`realtime_user_comments_${userId}_${Date.now()}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "movie_comments",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            if (!isUnsubscribed) fetchUserComments();
          }
        )
        .subscribe();
    } catch (err) {
      console.warn("Lỗi đăng ký Realtime user comments:", err);
    }
  }

  const interval = setInterval(() => {
    if (!isUnsubscribed && typeof document !== "undefined" && !document.hidden) {
      fetchUserComments();
    }
  }, 300000);

  return () => {
    isUnsubscribed = true;
    clearInterval(interval);
    if (realtimeChannel && supabase) {
      try {
        supabase.removeChannel(realtimeChannel);
      } catch {}
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("comments-updated", handleCommentsUpdated);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    }
  };
}

/**
 * Báo cáo hoặc tự động ghi nhận vi phạm thuần phong mỹ tục / spam cho Quản trị viên
 */
export async function reportCommentViolation(params: {
  userId: string;
  userName: string;
  userEmail?: string;
  userAvatar?: string;
  movieSlug: string;
  movieTitle?: string;
  attemptedContent: string;
  reason: string;
  violations: string[];
  isSpam?: boolean;
  commentId?: string;
}): Promise<void> {
  if (!params.userId) return;

  try {
    if (params.commentId && isSupabaseConfigured()) {
      await flagCommentSupabase(params.commentId, params.reason);
    }
  } catch (err) {
    console.warn("Lỗi ghi nhận vi phạm vào Supabase:", err);
  }
}

/**
 * Gỡ cờ đánh dấu bình luận (Dành cho Quản trị viên duyệt lại bình luận hợp lệ)
 */
export async function unflagComment(commentId: string): Promise<void> {
  if (!commentId) return;
  try {
    if (isSupabaseConfigured()) {
      await unflagCommentSupabase(commentId);
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("comments-updated", { detail: { commentId } }));
    }
  } catch (err) {
    console.error("Lỗi gỡ đánh dấu bình luận:", err);
    throw err;
  }
}

/**
 * Thêm một bình luận hoặc đánh giá mới cho phim (Có kiểm duyệt nội dung)
 */
export async function addMovieComment(
  comment: Omit<MovieComment, "id" | "likes" | "likedBy" | "createdAt">,
): Promise<string> {
  if (!isSupabaseConfigured()) {
    throw new Error("Chưa kết nối được cơ sở dữ liệu Supabase!");
  }

  // 1. Kiểm tra tài khoản có đang bị hạn chế bình luận không
  try {
    const profile = await getUserProfileSupabase(comment.userId);
    if (profile?.isCommentRestricted) {
      throw new Error("Tài khoản của bạn tạm thời bị khóa tính năng bình luận do vi phạm tiêu chuẩn cộng đồng nhiều lần!");
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("bị khóa tính năng")) {
      throw err;
    }
  }

  // 2. Kiểm duyệt nội dung từ ngữ & spam
  const modCheck = checkContentModeration(comment.content);
  if (!modCheck.isAllowed) {
    reportCommentViolation({
      userId: comment.userId,
      userName: comment.userName,
      userEmail: comment.userEmail,
      userAvatar: comment.userAvatar,
      movieSlug: comment.movieSlug,
      movieTitle: comment.movieTitle,
      attemptedContent: comment.content,
      reason: modCheck.reason || "Sử dụng từ ngữ không phù hợp thuần phong mỹ tục",
      violations: modCheck.violations,
      isSpam: modCheck.isSpam,
    }).catch(() => {});

    throw new Error(modCheck.reason || "Nội dung vi phạm tiêu chuẩn cộng đồng!");
  }

  const now = Date.now();
  const newComment = {
    movieSlug: sanitizeSafeText(comment.movieSlug),
    movieTitle: sanitizeSafeText(comment.movieTitle || ""),
    userId: comment.userId,
    userName: sanitizeSafeText(comment.userName),
    userAvatar: comment.userAvatar || "",
    userEmail: comment.userEmail || "",
    content: sanitizeSafeText(comment.content),
    rating: comment.rating || 0,
    likes: 0,
    likedBy: [],
    reactions: {},
    replyCount: 0,
    isSpoiler: Boolean(comment.isSpoiler || detectSpoiler(comment.content)),
    isPinned: false,
    episodeSlug: comment.episodeSlug,
    episodeName: comment.episodeName,
    createdAt: now,
    updatedAt: now,
    isEdited: false,
  };

  // 3. Ghi vào cơ sở dữ liệu qua Server API (/api/comments)
  const idToken = await auth?.currentUser?.getIdToken().catch(() => null);
  const res = await fetch("/api/comments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify({
      movieSlug: newComment.movieSlug,
      movieTitle: newComment.movieTitle,
      rating: newComment.rating,
      content: newComment.content,
      isSpoiler: newComment.isSpoiler,
      episodeSlug: newComment.episodeSlug,
      episodeName: newComment.episodeName,
    }),
  });

  if (!res.ok) {
    let errMsg = "Không thể gửi bình luận!";
    try {
      const errJson = await res.json();
      if (errJson.error) errMsg = errJson.error;
    } catch {}
    throw new Error(errMsg);
  }

  const resData = await res.json();
  if (!resData.id) {
    throw new Error("Máy chủ không trả về mã định danh bình luận!");
  }
  const createdId: string = resData.id;

  const fullComment: MovieComment = { id: createdId, ...newComment } as MovieComment;

  const curList = movieCommentsMemoryCache[comment.movieSlug] || [];
  movieCommentsMemoryCache[comment.movieSlug] = [fullComment, ...curList.filter((c) => c.id !== createdId)];
  saveLocalMovieComments(comment.movieSlug, movieCommentsMemoryCache[comment.movieSlug]);

  if (comment.userId) {
    const curUserList = userCommentsMemoryCache[comment.userId] || [];
    userCommentsMemoryCache[comment.userId] = [fullComment, ...curUserList.filter((c) => c.id !== createdId)];
    saveLocalUserComments(comment.userId, userCommentsMemoryCache[comment.userId]);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("comments-updated", {
        detail: {
          movieSlug: comment.movieSlug,
          comment: fullComment,
          userId: comment.userId,
        },
      })
    );
  }

  return createdId;
}

/**
 * Thêm reply cho một bình luận và gửi thông báo cho người được trả lời (Có kiểm duyệt)
 */
export async function addReplyComment(params: {
  parentId: string;
  parentOwnerId: string;
  parentOwnerName?: string;
  replyToUserId?: string;
  replyToUserName?: string;
  movieSlug: string;
  movieTitle?: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userEmail?: string;
  content: string;
  isSpoiler?: boolean;
}): Promise<string> {
  // 1. Kiểm duyệt nội dung phản hồi
  const modCheck = checkContentModeration(params.content);
  if (!modCheck.isAllowed) {
    reportCommentViolation({
      userId: params.userId,
      userName: params.userName,
      userEmail: params.userEmail,
      userAvatar: params.userAvatar,
      movieSlug: params.movieSlug,
      movieTitle: params.movieTitle,
      attemptedContent: params.content,
      reason: modCheck.reason || "Sử dụng từ ngữ không phù hợp thuần phong mỹ tục trong phản hồi",
      violations: modCheck.violations,
      isSpam: modCheck.isSpam,
      commentId: params.parentId,
    }).catch(() => {});

    throw new Error(modCheck.reason || "Nội dung phản hồi vi phạm tiêu chuẩn cộng đồng!");
  }

  const { parentId, parentOwnerId, replyToUserId, replyToUserName, ...replyData } = params;

  // 2. Ghi qua Server API
  const idToken = await auth?.currentUser?.getIdToken().catch(() => null);
  const res = await fetch("/api/comments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify({
      movieSlug: params.movieSlug,
      movieTitle: params.movieTitle,
      rating: 0,
      content: sanitizeSafeText(replyData.content, 2500),
      isSpoiler: Boolean(params.isSpoiler || detectSpoiler(params.content)),
      parentId,
      parentOwnerId,
      replyToUserId,
      replyToUserName: replyToUserName ? sanitizeSafeText(replyToUserName, 100) : undefined,
    }),
  });

  if (!res.ok) {
    let errMsg = "Không thể gửi phản hồi!";
    try {
      const errJson = await res.json();
      if (errJson.error) errMsg = errJson.error;
    } catch {}
    throw new Error(errMsg);
  }

  const resData = await res.json();
  if (!resData.id) {
    throw new Error("Máy chủ không trả về mã định danh phản hồi!");
  }
  const createdId: string = resData.id;

  const fullReply: MovieComment = {
    id: createdId,
    parentId,
    parentOwnerId,
    replyToUserId,
    replyToUserName,
    movieSlug: params.movieSlug,
    movieTitle: params.movieTitle,
    userId: params.userId,
    userName: params.userName,
    userAvatar: params.userAvatar,
    content: params.content,
    rating: 0,
    likes: 0,
    likedBy: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const curList = movieCommentsMemoryCache[params.movieSlug] || [];
  movieCommentsMemoryCache[params.movieSlug] = [...curList.filter((c) => c.id !== createdId), fullReply];
  saveLocalMovieComments(params.movieSlug, movieCommentsMemoryCache[params.movieSlug]);

  // Cập nhật cả cache replies cho parentId
  const curReplies = replyCommentsMemoryCache[parentId] || [];
  replyCommentsMemoryCache[parentId] = [...curReplies.filter((r) => r.id !== createdId), fullReply];

  if (params.userId) {
    const curUserList = userCommentsMemoryCache[params.userId] || [];
    userCommentsMemoryCache[params.userId] = [fullReply, ...curUserList.filter((c) => c.id !== createdId)];
    saveLocalUserComments(params.userId, userCommentsMemoryCache[params.userId]);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("comments-updated", {
        detail: {
          movieSlug: params.movieSlug,
          parentId,
          reply: fullReply,
          comment: fullReply,
          userId: params.userId,
        },
      })
    );
  }

  return createdId;
}

/**
 * Thả cảm xúc đa dạng (Facebook Reactions: Like, Love, Haha, Wow, Sad, Angry) cho một bình luận
 */
export async function setCommentReaction(
  commentId: string,
  userId: string,
  reactionType: CommentReactionType | null,
  _prevReactionType?: CommentReactionType | null,
): Promise<void> {
  void _prevReactionType;
  if (!commentId || !userId) return;

  // 1. Cập nhật ngay bộ nhớ cache & localStorage cho root comments
  Object.keys(movieCommentsMemoryCache).forEach((slug) => {
    movieCommentsMemoryCache[slug] = movieCommentsMemoryCache[slug].map((c) => {
      if (c.id !== commentId) return c;
      const currentLikedBy = Array.isArray(c.likedBy) ? c.likedBy : [];
      let newLikedBy = currentLikedBy;
      let newLikes = c.likes || 0;
      if (reactionType !== null) {
        if (!newLikedBy.includes(userId)) {
          newLikedBy = [...newLikedBy, userId];
          newLikes += 1;
        }
      } else {
        newLikedBy = newLikedBy.filter((id) => id !== userId);
        newLikes = Math.max(0, newLikes - 1);
      }
      const updatedReactions: Record<string, CommentReactionType> = { ...(c.reactions || {}) };
      if (reactionType) {
        updatedReactions[userId] = reactionType;
      } else {
        delete updatedReactions[userId];
      }
      const tally: Partial<Record<CommentReactionType, number>> = {};
      Object.values(updatedReactions).forEach((t) => {
        tally[t] = (tally[t] || 0) + 1;
      });
      return {
        ...c,
        likes: newLikes,
        likedBy: newLikedBy,
        reactions: updatedReactions,
        reactionCounts: tally,
        updatedAt: c.updatedAt,
      };
    });
    saveLocalMovieComments(slug, movieCommentsMemoryCache[slug]);
  });

  // 2. Cập nhật cache của reply comments (nếu reaction thuộc về một reply)
  Object.keys(replyCommentsMemoryCache).forEach((parentId) => {
    replyCommentsMemoryCache[parentId] = replyCommentsMemoryCache[parentId].map((r) => {
      if (r.id !== commentId) return r;
      const currentLikedBy = Array.isArray(r.likedBy) ? r.likedBy : [];
      let newLikedBy = currentLikedBy;
      let newLikes = r.likes || 0;
      if (reactionType !== null) {
        if (!newLikedBy.includes(userId)) {
          newLikedBy = [...newLikedBy, userId];
          newLikes += 1;
        }
      } else {
        newLikedBy = newLikedBy.filter((id) => id !== userId);
        newLikes = Math.max(0, newLikes - 1);
      }
      const updatedReactions: Record<string, CommentReactionType> = { ...(r.reactions || {}) };
      if (reactionType) {
        updatedReactions[userId] = reactionType;
      } else {
        delete updatedReactions[userId];
      }
      const tally: Partial<Record<CommentReactionType, number>> = {};
      Object.values(updatedReactions).forEach((t) => {
        tally[t] = (tally[t] || 0) + 1;
      });
      return {
        ...r,
        likes: newLikes,
        likedBy: newLikedBy,
        reactions: updatedReactions,
        reactionCounts: tally,
        updatedAt: r.updatedAt,
      };
    });
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("comments-updated", { detail: { commentId, skipRemoteFetch: true } })
    );
  }

  // 3. Cập nhật qua Server API
  try {
    const idToken = await auth?.currentUser?.getIdToken().catch(() => null);
    await fetch("/api/comments", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify({ commentId, userId, reactionType, action: "reaction" }),
    });
  } catch (err) {
    console.warn("Lỗi gửi reaction qua API:", err);
  }
}

/**
 * Thả tim hoặc bỏ tim cơ bản cho một bình luận (Tương thích ngược)
 */
export async function toggleLikeComment(
  commentId: string,
  userId: string,
  hasLiked: boolean,
  currentReaction?: CommentReactionType | null,
): Promise<void> {
  if (hasLiked) {
    await setCommentReaction(commentId, userId, null, currentReaction || "like");
  } else {
    await setCommentReaction(commentId, userId, "like", null);
  }
}

/**
 * Cập nhật nội dung hoặc điểm đánh giá của bình luận đã có
 */
export async function updateMovieComment(
  commentId: string,
  data: Partial<Pick<MovieComment, "rating" | "content" | "isSpoiler" | "episodeSlug" | "episodeName">>,
  movieSlug?: string,
): Promise<void> {
  if (!commentId) return;

  const now = Date.now();

  // Snapshot memory cache & local storage trước khi mutate để sẵn sàng rollback nếu API thất bại
  const previousMovieCache: Record<string, MovieComment[]> = {};
  for (const [slug, list] of Object.entries(movieCommentsMemoryCache)) {
    previousMovieCache[slug] = [...list];
  }
  const previousReplyCache: Record<string, MovieComment[]> = {};
  for (const [pid, list] of Object.entries(replyCommentsMemoryCache)) {
    previousReplyCache[pid] = [...list];
  }
  const previousUserCache: Record<string, MovieComment[]> = {};
  for (const [uid, list] of Object.entries(userCommentsMemoryCache)) {
    previousUserCache[uid] = [...list];
  }

  // 1. Cập nhật ngay lập tức vào Memory Cache & LocalStorage
  let affectedMovieSlug: string | undefined = movieSlug;
  for (const [slug, list] of Object.entries(movieCommentsMemoryCache)) {
    const idx = list.findIndex((c) => c.id === commentId);
    if (idx !== -1) {
      if (!affectedMovieSlug) affectedMovieSlug = slug;
      movieCommentsMemoryCache[slug] = list.map((c) =>
        c.id === commentId ? { ...c, ...data, isEdited: true, editedAt: now, updatedAt: now } : c
      );
      saveLocalMovieComments(slug, movieCommentsMemoryCache[slug]);
      break;
    }
  }

  // Cập nhật cả trong reply memory cache nếu là reply
  Object.keys(replyCommentsMemoryCache).forEach((parentId) => {
    replyCommentsMemoryCache[parentId] = replyCommentsMemoryCache[parentId].map((r) =>
      r.id === commentId ? { ...r, ...data, isEdited: true, editedAt: now, updatedAt: now } : r
    );
  });

  // Cập nhật trong user comments memory cache
  Object.keys(userCommentsMemoryCache).forEach((uid) => {
    userCommentsMemoryCache[uid] = userCommentsMemoryCache[uid].map((c) =>
      c.id === commentId ? { ...c, ...data, isEdited: true, editedAt: now, updatedAt: now } : c
    );
    saveLocalUserComments(uid, userCommentsMemoryCache[uid]);
  });

  const finalIsSpoiler = data.isSpoiler !== undefined 
    ? (data.isSpoiler || (data.content ? detectSpoiler(data.content) : false))
    : (data.content ? detectSpoiler(data.content) : undefined);

  // 2. Ghi qua Server API và kiểm tra kết quả trả về
  try {
    const idToken = await auth?.currentUser?.getIdToken().catch(() => null);
    const res = await fetch("/api/comments", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify({
        commentId,
        rating: data.rating,
        content: data.content,
        episodeSlug: data.episodeSlug,
        episodeName: data.episodeName,
        isSpoiler: finalIsSpoiler,
      }),
    });

    if (!res.ok) {
      let errMsg = "Không thể cập nhật bình luận!";
      try {
        const errJson = await res.json();
        if (errJson.error) errMsg = errJson.error;
      } catch {}
      throw new Error(errMsg);
    }
  } catch (err) {
    // ROLLBACK TOÀN DIỆN: Phục hồi lại toàn bộ cache và LocalStorage về trạng thái trước khi sửa
    for (const [slug, list] of Object.entries(previousMovieCache)) {
      movieCommentsMemoryCache[slug] = list;
      saveLocalMovieComments(slug, list);
    }
    for (const [pid, list] of Object.entries(previousReplyCache)) {
      replyCommentsMemoryCache[pid] = list;
    }
    for (const [uid, list] of Object.entries(previousUserCache)) {
      userCommentsMemoryCache[uid] = list;
      saveLocalUserComments(uid, list);
    }
    throw err;
  }

  // 3. Sau khi ghi thành công vào database, phát event để đồng bộ toàn bộ tab/component
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("comments-updated", { detail: { commentId, movieSlug: affectedMovieSlug } }));
  }
}

/**
 * Xóa bình luận của chính người dùng
 */
export async function deleteMovieComment(
  commentId: string,
  options?: { movieSlug?: string; userId?: string }
): Promise<void> {
  if (!commentId) return;

  // Snapshot memory cache & local storage trước khi xóa
  const previousMovieCache: Record<string, MovieComment[]> = {};
  for (const [slug, list] of Object.entries(movieCommentsMemoryCache)) {
    previousMovieCache[slug] = [...list];
  }
  const previousReplyCache: Record<string, MovieComment[]> = {};
  for (const [pid, list] of Object.entries(replyCommentsMemoryCache)) {
    previousReplyCache[pid] = [...list];
  }
  const previousUserCache: Record<string, MovieComment[]> = {};
  for (const [uid, list] of Object.entries(userCommentsMemoryCache)) {
    previousUserCache[uid] = [...list];
  }

  // 1. Đánh dấu xóa vào Set chống hồi sinh (Ghost Comments)
  markCommentDeleted(commentId);

  // 2. Xóa ngay lập tức khỏi Memory Cache & LocalStorage
  let affectedMovieSlug: string | undefined = options?.movieSlug;
  for (const [slug, list] of Object.entries(movieCommentsMemoryCache)) {
    if (list.some((c) => c.id === commentId || c.parentId === commentId)) {
      if (!affectedMovieSlug) affectedMovieSlug = slug;
      movieCommentsMemoryCache[slug] = list.filter((c) => c.id !== commentId && c.parentId !== commentId);
      saveLocalMovieComments(slug, movieCommentsMemoryCache[slug]);
    }
  }

  if (affectedMovieSlug) {
    const local = getLocalMovieComments(affectedMovieSlug);
    const cleaned = local.filter((c) => c.id !== commentId && c.parentId !== commentId);
    saveLocalMovieComments(affectedMovieSlug, cleaned);
  } else if (typeof window !== "undefined") {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("nanaflix_comments_")) {
          const raw = localStorage.getItem(key);
          if (raw && raw.includes(commentId)) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              const cleaned = parsed.filter((c) => c.id !== commentId && c.parentId !== commentId);
              localStorage.setItem(key, JSON.stringify(cleaned));
            }
          }
        }
      }
    } catch {}
  }

  // Xóa trong reply cache
  Object.keys(replyCommentsMemoryCache).forEach((parentId) => {
    replyCommentsMemoryCache[parentId] = replyCommentsMemoryCache[parentId].filter(
      (r) => r.id !== commentId && r.parentId !== commentId
    );
  });

  // Xóa trong user comments memory cache
  const effectiveUserId = options?.userId || auth?.currentUser?.uid;
  if (effectiveUserId && userCommentsMemoryCache[effectiveUserId]) {
    userCommentsMemoryCache[effectiveUserId] = userCommentsMemoryCache[effectiveUserId].filter(
      (c) => c.id !== commentId && c.parentId !== commentId
    );
    saveLocalUserComments(effectiveUserId, userCommentsMemoryCache[effectiveUserId]);
  } else if (typeof window !== "undefined") {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("nanaflix_user_comments_")) {
          const raw = localStorage.getItem(key);
          if (raw && raw.includes(commentId)) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              const cleaned = parsed.filter((c) => c.id !== commentId && c.parentId !== commentId);
              localStorage.setItem(key, JSON.stringify(cleaned));
            }
          }
        }
      }
    } catch {}
  }

  // 3. Xóa qua Server API và BẮT BUỘC CHỜ PHẢN HỒI từ cơ sở dữ liệu
  try {
    const idToken = await auth?.currentUser?.getIdToken().catch(() => null);
    const res = await fetch(`/api/comments?commentId=${encodeURIComponent(commentId)}`, {
      method: "DELETE",
      headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
    });

    // Tính chất lũy thừa: 200/204 hoặc 404 (đã bị xóa trước đó) được coi là thành công
    if (!res.ok && res.status !== 404) {
      let errMsg = "Không thể xóa bình luận!";
      try {
        const errJson = await res.json();
        if (errJson.error) errMsg = errJson.error;
      } catch {}
      throw new Error(errMsg);
    }
  } catch (err) {
    // ROLLBACK NẾU XÓA THẤT BẠI: Hủy đánh dấu xóa và phục hồi lại cache
    unmarkCommentDeleted(commentId);
    for (const [slug, list] of Object.entries(previousMovieCache)) {
      movieCommentsMemoryCache[slug] = list;
      saveLocalMovieComments(slug, list);
    }
    for (const [pid, list] of Object.entries(previousReplyCache)) {
      replyCommentsMemoryCache[pid] = list;
    }
    for (const [uid, list] of Object.entries(previousUserCache)) {
      userCommentsMemoryCache[uid] = list;
      saveLocalUserComments(uid, list);
    }
    console.error("Lỗi delete comment qua API:", err);
    throw err;
  }

  // 4. CHỈ PHÁT EVENT ĐỒNG BỘ SAU KHI SERVER ĐÃ XÁC NHẬN XÓA XONG
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("comments-updated", {
        detail: {
          commentId,
          movieSlug: affectedMovieSlug,
          userId: effectiveUserId,
          deleted: true,
        },
      })
    );
  }
}

/**
 * Ghim hoặc bỏ ghim một bình luận (Dành riêng cho Quản trị viên)
 */
export async function togglePinComment(
  commentId: string,
  currentIsPinned: boolean,
  _adminEmail: string
): Promise<boolean> {
  void _adminEmail;
  const newPinnedState = !currentIsPinned;

  // 1. Cập nhật ngay bộ nhớ cache & localStorage cho toàn bộ tabs
  Object.keys(movieCommentsMemoryCache).forEach((slug) => {
    movieCommentsMemoryCache[slug] = movieCommentsMemoryCache[slug].map((c) =>
      c.id === commentId ? { ...c, isPinned: newPinnedState } : c
    );
    saveLocalMovieComments(slug, movieCommentsMemoryCache[slug]);
  });

  // 2. Cập nhật Supabase qua API server để tránh bị AdBlocker chặn và đảm bảo an toàn RLS
  try {
    const idToken = await auth?.currentUser?.getIdToken().catch(() => null);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (idToken) headers["Authorization"] = `Bearer ${idToken}`;

    const res = await fetch("/api/comments", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ commentId, isPinned: newPinnedState, action: "pin" }),
    });
    if (!res.ok && isSupabaseConfigured()) {
      await togglePinCommentSupabase(commentId, newPinnedState).catch(() => {});
    }
  } catch {
    if (isSupabaseConfigured()) {
      await togglePinCommentSupabase(commentId, newPinnedState).catch(() => {});
    }
  }

  // 3. Phát event cập nhật toàn bộ giao diện realtime 0ms
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("comments-updated", { detail: { commentId, isPinned: newPinnedState } }));
  }

  return newPinnedState;
}

/**
 * Tính toán thống kê điểm số đánh giá từ danh sách bình luận.
 */
export function calculateMovieRatingStats(comments: MovieComment[]): MovieRatingStats {
  const userRatingsMap = new Map<string, number>();
  for (const c of comments) {
    if (c.rating > 0 && !c.parentId && !userRatingsMap.has(c.userId)) {
      userRatingsMap.set(c.userId, c.rating);
    }
  }

  const uniqueRatings = Array.from(userRatingsMap.values());
  const totalReviews = uniqueRatings.length;

  const starCounts = {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  };

  if (totalReviews === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      starCounts,
    };
  }

  let totalScore = 0;
  uniqueRatings.forEach((ratingScore) => {
    const star = Math.min(5, Math.max(1, Math.round(ratingScore))) as 1 | 2 | 3 | 4 | 5;
    starCounts[star] += 1;
    totalScore += ratingScore;
  });

  const averageRating = Number((totalScore / totalReviews).toFixed(1));

  return {
    averageRating,
    totalReviews,
    starCounts,
  };
}

export interface AutoCleanResult {
  scannedCount: number;
  deletedCount: number;
  deletedItems: Array<{
    id: string;
    userName: string;
    movieSlug: string;
    content: string;
    reason: string;
    violations: string[];
  }>;
}

/**
 * HỆ THỐNG TỰ ĐỘNG QUÉT & XÓA BÌNH LUẬN VÔ VĂN HÓA, TỤC TĨU, SPAM
 */
export async function autoCleanAllToxicAndSpamComments(allComments?: MovieComment[]): Promise<AutoCleanResult> {
  let itemsToScan = allComments;
  if (!itemsToScan || itemsToScan.length === 0) {
    if (isSupabaseConfigured()) {
      try {
        itemsToScan = await getAllCommentsSupabase();
      } catch {
        itemsToScan = [];
      }
    }
  }

  const items = itemsToScan || [];
  const deletedItems: AutoCleanResult["deletedItems"] = [];

  for (const c of items) {
    const mod = checkContentModeration(c.content || "");
    const isToxicOrSpam = !mod.isAllowed || c.isFlagged;

    if (isToxicOrSpam) {
      try {
        await deleteMovieComment(c.id);
        deletedItems.push({
          id: c.id,
          userName: c.userName,
          movieSlug: c.movieSlug,
          content: c.content,
          reason: mod.reason || c.flagReason || "Tự động xóa do vi phạm tiêu chuẩn cộng đồng",
          violations: mod.violations,
        });
      } catch (err) {
        console.warn("Lỗi xóa tự động comment rác:", c.id, err);
      }
    }
  }

  return {
    scannedCount: items.length,
    deletedCount: deletedItems.length,
    deletedItems,
  };
}

/**
 * Xóa nhanh tất cả bình luận đang bị gắn cờ vi phạm trong 1 thao tác
 */
export async function purgeAllFlaggedComments(commentsList: MovieComment[]): Promise<number> {
  if (!commentsList) return 0;
  const flagged = commentsList.filter((c) => c.isFlagged);
  let deletedCount = 0;
  for (const c of flagged) {
    try {
      await deleteMovieComment(c.id);
      deletedCount++;
    } catch (e) {
      console.warn("Lỗi xóa cmt gắn cờ:", c.id, e);
    }
  }
  return deletedCount;
}
