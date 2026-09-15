import { MovieComment, MovieRatingStats, CommentReactionType } from "@/types/comment";
import { UserNotification } from "@/types/notification";
import { checkContentModeration } from "@/lib/contentModeration";
import { sanitizeSafeText } from "@/lib/security";
import {
  postCommentSupabase,
  getMovieCommentsSupabase,
  getCommentRepliesSupabase,
  getUserCommentsSupabase,
  getAllCommentsSupabase,
  updateCommentSupabase,
  deleteCommentSupabase,
  togglePinCommentSupabase,
  setCommentReactionSupabase,
  flagCommentSupabase,
  unflagCommentSupabase,
  createNotificationSupabase,
  getUserProfileSupabase,
} from "./supabaseService";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

// In-memory cache lưu danh sách bình luận theo movieSlug để hiển thị ngay 0ms không bị chớp hay mất
const movieCommentsMemoryCache: Record<string, MovieComment[]> = {};
const replyCommentsMemoryCache: Record<string, MovieComment[]> = {};

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
    onUpdate(memCached);
  } else {
    const local = getLocalMovieComments(movieSlug);
    if (local.length > 0) {
      movieCommentsMemoryCache[movieSlug] = local;
      onUpdate(local);
    }
  }

  const handleNewData = (items: MovieComment[]) => {
    const validItems = items.filter((c) => !c.movieSlug || c.movieSlug === movieSlug);
    const existingCache = movieCommentsMemoryCache[movieSlug] || [];
    const localMap = new Map<string, MovieComment>();
    existingCache.forEach((item) => localMap.set(item.id, item));

    const mergedItems = validItems.map((remoteItem) => {
      const localItem = localMap.get(remoteItem.id);
      if (!localItem) return remoteItem;

      // Nếu local có bản sửa mới hơn chưa kịp sync (hoặc vừa lưu xong), giữ lại dữ liệu edit
      const isLocalNewer = (localItem.updatedAt || 0) > (remoteItem.updatedAt || 0);

      // Hợp nhất reactions từ remote và local để tránh bị mất emoji reaction
      const mergedReactions: Record<string, CommentReactionType> = {
        ...(remoteItem.reactions || {}),
        ...(localItem.reactions || {}),
      };

      const likedBySet = new Set<string>([
        ...(Array.isArray(remoteItem.likedBy) ? remoteItem.likedBy : []),
        ...(Array.isArray(localItem.likedBy) ? localItem.likedBy : []),
        ...Object.keys(mergedReactions),
      ]);

      const calculatedLikes = Math.max(
        remoteItem.likes || 0,
        localItem.likes || 0,
        likedBySet.size,
        Object.keys(mergedReactions).length
      );

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
        likedBy: Array.from(likedBySet),
        likes: calculatedLikes,
        isPinned: localItem.isPinned !== undefined ? localItem.isPinned : remoteItem.isPinned,
      };
    });

    // Giữ lại các comment vừa tạo cục bộ mà Supabase chưa kịp trả về trong request này
    existingCache.forEach((localItem) => {
      if (!mergedItems.some((m) => m.id === localItem.id)) {
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

  // 2. Fetch dữ liệu mới nhất từ Supabase
  const fetchSupabase = async () => {
    if (isUnsubscribed) return;
    if (isSupabaseConfigured()) {
      try {
        const items = await getMovieCommentsSupabase(movieSlug);
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

  fetchSupabase();

  let lastFetchTime = Date.now();
  const handleVisibilityOrFocus = () => {
    if (isUnsubscribed) return;
    if (typeof document !== "undefined" && !document.hidden) {
      if (Date.now() - lastFetchTime > 15000) {
        lastFetchTime = Date.now();
        fetchSupabase();
      }
    }
  };

  // 3. Lắng nghe event comments-updated để reload tức thời
  const handleCommentsUpdated = (e: Event) => {
    if (isUnsubscribed) return;
    const customEvent = e as CustomEvent<{ movieSlug?: string }>;
    if (!customEvent.detail?.movieSlug || customEvent.detail.movieSlug === movieSlug) {
      const cur = movieCommentsMemoryCache[movieSlug];
      if (cur) onUpdate([...cur]);
      lastFetchTime = Date.now();
      fetchSupabase();
    }
  };

  // 4. Polling dự phòng mỗi 5 phút (chỉ khi tab hoạt động) nếu kết nối WebSocket gián đoạn
  const syncInterval = setInterval(() => {
    if (!isUnsubscribed && typeof document !== "undefined" && !document.hidden) {
      if (Date.now() - lastFetchTime > 180000) {
        lastFetchTime = Date.now();
        fetchSupabase();
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
              fetchSupabase();
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
    const existingReplies = replyCommentsMemoryCache[parentId] || [];
    const localMap = new Map<string, MovieComment>();
    existingReplies.forEach((r) => localMap.set(r.id, r));

    const merged = items.map((remoteItem) => {
      const localItem = localMap.get(remoteItem.id);
      if (!localItem) return remoteItem;

      const mergedReactions: Record<string, CommentReactionType> = {
        ...(remoteItem.reactions || {}),
        ...(localItem.reactions || {}),
      };

      const likedBySet = new Set<string>([
        ...(Array.isArray(remoteItem.likedBy) ? remoteItem.likedBy : []),
        ...(Array.isArray(localItem.likedBy) ? localItem.likedBy : []),
        ...Object.keys(mergedReactions),
      ]);

      return {
        ...remoteItem,
        reactions: mergedReactions,
        likedBy: Array.from(likedBySet),
        likes: Math.max(
          remoteItem.likes || 0,
          localItem.likes || 0,
          likedBySet.size,
          Object.keys(mergedReactions).length
        ),
      };
    });

    existingReplies.forEach((localItem) => {
      if (!merged.some((m) => m.id === localItem.id)) {
        merged.push(localItem);
      }
    });

    merged.sort((a, b) => (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0));
    replyCommentsMemoryCache[parentId] = merged;
    onUpdate(merged);
  };

  if (replyCommentsMemoryCache[parentId]) {
    onUpdate(replyCommentsMemoryCache[parentId]);
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
    const customEvent = e as CustomEvent<{ parentId?: string; reply?: MovieComment }>;
    if (customEvent.detail?.parentId === parentId) {
      if (customEvent.detail.reply) {
        const cur = replyCommentsMemoryCache[parentId] || [];
        const updated = [...cur.filter((r) => r.id !== customEvent.detail.reply!.id), customEvent.detail.reply];
        replyCommentsMemoryCache[parentId] = updated;
        onUpdate(updated);
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

  const fetchAll = async () => {
    if (isUnsubscribed) return;
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
  };

  fetchAll();

  const handleCommentsUpdated = () => {
    if (!isUnsubscribed) fetchAll();
  };

  if (typeof window !== "undefined") {
    window.addEventListener("comments-updated", handleCommentsUpdated);
    document.addEventListener("visibilitychange", handleCommentsUpdated);
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
      document.removeEventListener("visibilitychange", handleCommentsUpdated);
    }
  };
}

/**
 * Lắng nghe tất cả bình luận do một Người Dùng đăng theo thời gian thực
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

  const fetchUserComments = async () => {
    if (isUnsubscribed) return;
    if (isSupabaseConfigured()) {
      try {
        const items = await getUserCommentsSupabase(userId);
        if (!isUnsubscribed) {
          onUpdate(items);
        }
      } catch (err) {
        if (onError && err instanceof Error) onError(err);
      }
    }
  };

  fetchUserComments();

  const handleCommentsUpdated = () => {
    if (!isUnsubscribed) fetchUserComments();
  };

  if (typeof window !== "undefined") {
    window.addEventListener("comments-updated", handleCommentsUpdated);
    document.addEventListener("visibilitychange", handleCommentsUpdated);
  }

  const interval = setInterval(() => {
    if (!isUnsubscribed && typeof document !== "undefined" && !document.hidden) {
      fetchUserComments();
    }
  }, 300000);

  return () => {
    isUnsubscribed = true;
    clearInterval(interval);
    if (typeof window !== "undefined") {
      window.removeEventListener("comments-updated", handleCommentsUpdated);
      document.removeEventListener("visibilitychange", handleCommentsUpdated);
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
    isSpoiler: !!comment.isSpoiler,
    isPinned: false,
    episodeSlug: comment.episodeSlug,
    episodeName: comment.episodeName,
    createdAt: now,
    updatedAt: now,
  };

  // 3. Ghi trực tiếp vào Supabase Database (0ms Optimistic Update)
  const createdId = await postCommentSupabase(newComment as unknown as Omit<MovieComment, "id" | "createdAt" | "updatedAt">);
  const fullComment: MovieComment = { id: createdId, ...newComment } as MovieComment;

  const curList = movieCommentsMemoryCache[comment.movieSlug] || [];
  movieCommentsMemoryCache[comment.movieSlug] = [fullComment, ...curList.filter((c) => c.id !== createdId)];
  saveLocalMovieComments(comment.movieSlug, movieCommentsMemoryCache[comment.movieSlug]);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("comments-updated", { detail: { movieSlug: comment.movieSlug, comment: fullComment } }));
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
  if (!isSupabaseConfigured()) {
    throw new Error("Chưa kết nối được cơ sở dữ liệu Supabase!");
  }

  // 1. Kiểm tra hạn chế tài khoản
  try {
    const profile = await getUserProfileSupabase(params.userId);
    if (profile?.isCommentRestricted) {
      throw new Error("Tài khoản của bạn tạm thời bị khóa tính năng bình luận do vi phạm tiêu chuẩn cộng đồng nhiều lần!");
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("bị khóa tính năng")) {
      throw err;
    }
  }

  // 2. Kiểm duyệt nội dung phản hồi
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

  // 3. Ghi trực tiếp vào Supabase
  const createdId = await postCommentSupabase({
    movieSlug: params.movieSlug,
    movieTitle: params.movieTitle,
    userId: params.userId,
    userName: params.userName,
    userAvatar: params.userAvatar,
    userEmail: params.userEmail,
    content: sanitizeSafeText(replyData.content, 2500),
    parentId,
    parentOwnerId,
    replyToUserId,
    replyToUserName: replyToUserName ? sanitizeSafeText(replyToUserName, 100) : undefined,
    rating: 0,
    isSpoiler: params.isSpoiler,
  });

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

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("comments-updated", { detail: { movieSlug: params.movieSlug, parentId, reply: fullReply } }));
  }

  // 4. Gửi thông báo cho người nhận
  const targetUserId = replyToUserId || (parentOwnerId && parentOwnerId !== params.userId ? parentOwnerId : null);
  if (targetUserId && targetUserId !== params.userId) {
    const isDirect = Boolean(replyToUserId);
    const notifData: UserNotification & { userId: string } = {
      id: `notif_reply_${createdId}_${targetUserId}`,
      userId: targetUserId,
      type: "comment_reply",
      title: isDirect
        ? `${params.userName} đã trả lời bình luận của bạn`
        : `${params.userName} đã bình luận trong bài đánh giá của bạn`,
      message: params.content.length > 80 ? params.content.slice(0, 80) + "..." : params.content,
      link: `/movies/${params.movieSlug}?highlightComment=${createdId}#comment-${createdId}`,
      movieSlug: params.movieSlug,
      commentId: createdId,
      replierName: params.userName,
      replierAvatar: params.userAvatar,
      isRead: false,
      createdAt: Date.now(),
    };
    createNotificationSupabase(notifData).catch(() => {});
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
      return {
        ...c,
        likes: newLikes,
        likedBy: newLikedBy,
        reactions: updatedReactions,
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
      return {
        ...r,
        likes: newLikes,
        likedBy: newLikedBy,
        reactions: updatedReactions,
      };
    });
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("comments-updated", { detail: { commentId } }));
  }

  // 3. Cập nhật Supabase trực tiếp & fallback qua API route
  if (isSupabaseConfigured()) {
    try {
      await setCommentReactionSupabase(commentId, userId, reactionType);
    } catch {
      fetch("/api/comments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, userId, reactionType, action: "reaction" }),
      }).catch(() => {});
    }
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

  // 1. Cập nhật ngay lập tức vào Memory Cache & LocalStorage
  let affectedMovieSlug: string | undefined = movieSlug;
  for (const [slug, list] of Object.entries(movieCommentsMemoryCache)) {
    const idx = list.findIndex((c) => c.id === commentId);
    if (idx !== -1) {
      if (!affectedMovieSlug) affectedMovieSlug = slug;
      movieCommentsMemoryCache[slug] = list.map((c) =>
        c.id === commentId ? { ...c, ...data, updatedAt: now } : c
      );
      saveLocalMovieComments(slug, movieCommentsMemoryCache[slug]);
      break;
    }
  }

  // Cập nhật cả trong reply memory cache nếu là reply
  Object.keys(replyCommentsMemoryCache).forEach((parentId) => {
    replyCommentsMemoryCache[parentId] = replyCommentsMemoryCache[parentId].map((r) =>
      r.id === commentId ? { ...r, ...data, updatedAt: now } : r
    );
  });

  // 2. Ghi trực tiếp vào Supabase Database trước
  if (isSupabaseConfigured()) {
    try {
      await updateCommentSupabase(commentId, {
        rating: data.rating,
        content: data.content,
        episode_slug: data.episodeSlug || null,
        episode_name: data.episodeName || null,
        is_spoiler: data.isSpoiler,
      });
    } catch {
      fetch("/api/comments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, ...data }),
      }).catch(() => {});
    }
  }

  // 3. Sau khi Supabase ghi xong, phát event để đồng bộ toàn bộ tab/component
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("comments-updated", { detail: { commentId, movieSlug: affectedMovieSlug } }));
  }
}

/**
 * Xóa bình luận của chính người dùng
 */
export async function deleteMovieComment(commentId: string): Promise<void> {
  if (!commentId) return;

  // 1. Xóa ngay lập tức khỏi Memory Cache & LocalStorage
  let affectedMovieSlug: string | undefined;
  for (const [slug, list] of Object.entries(movieCommentsMemoryCache)) {
    if (list.some((c) => c.id === commentId || c.parentId === commentId)) {
      affectedMovieSlug = slug;
      movieCommentsMemoryCache[slug] = list.filter((c) => c.id !== commentId && c.parentId !== commentId);
      saveLocalMovieComments(slug, movieCommentsMemoryCache[slug]);
      break;
    }
  }

  // Xóa trong reply cache
  Object.keys(replyCommentsMemoryCache).forEach((parentId) => {
    replyCommentsMemoryCache[parentId] = replyCommentsMemoryCache[parentId].filter(
      (r) => r.id !== commentId && r.parentId !== commentId
    );
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("comments-updated", { detail: { commentId, movieSlug: affectedMovieSlug, deleted: true } }));
  }

  // 2. Xóa trên Supabase
  if (isSupabaseConfigured()) {
    try {
      await deleteCommentSupabase(commentId);
    } catch {
      fetch(`/api/comments?commentId=${encodeURIComponent(commentId)}`, { method: "DELETE" }).catch(() => {});
    }
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

  // 2. Cập nhật Supabase ngay lập tức
  if (isSupabaseConfigured()) {
    try {
      await togglePinCommentSupabase(commentId, newPinnedState);
    } catch {
      fetch("/api/comments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, isPinned: newPinnedState, action: "pin" }),
      }).catch(() => {});
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
