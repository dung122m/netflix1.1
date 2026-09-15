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
import { isSupabaseConfigured } from "@/lib/supabase";

// In-memory cache lưu danh sách bình luận theo movieSlug để hiển thị ngay 0ms không bị chớp hay mất
const movieCommentsMemoryCache: Record<string, MovieComment[]> = {};

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

    const map = new Map<string, MovieComment>();
    validItems.forEach((item) => map.set(item.id, item));
    existingCache.forEach((item) => {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    });

    const merged = Array.from(map.values());
    merged.sort((a, b) => {
      const isPinnedA = Boolean(a.isPinned);
      const isPinnedB = Boolean(b.isPinned);
      if (isPinnedA && !isPinnedB) return -1;
      if (!isPinnedA && isPinnedB) return 1;
      return (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0);
    });

    movieCommentsMemoryCache[movieSlug] = merged;
    saveLocalMovieComments(movieSlug, merged);
    onUpdate(merged);
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

  // 3. Lắng nghe event comments-updated để reload tức thời
  const handleCommentsUpdated = (e: Event) => {
    if (isUnsubscribed) return;
    const customEvent = e as CustomEvent<{ movieSlug?: string }>;
    if (!customEvent.detail?.movieSlug || customEvent.detail.movieSlug === movieSlug) {
      fetchSupabase();
      const cur = movieCommentsMemoryCache[movieSlug];
      if (cur) onUpdate([...cur]);
    }
  };

  // 4. Polling nhẹ mỗi 4s
  const syncInterval = setInterval(fetchSupabase, 4000);

  if (typeof window !== "undefined") {
    window.addEventListener("comments-updated", handleCommentsUpdated);
  }

  return () => {
    isUnsubscribed = true;
    clearInterval(syncInterval);
    if (typeof window !== "undefined") {
      window.removeEventListener("comments-updated", handleCommentsUpdated);
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

  const fetchReplies = async () => {
    if (isUnsubscribed) return;
    if (isSupabaseConfigured()) {
      try {
        const items = await getCommentRepliesSupabase(parentId);
        if (!isUnsubscribed) {
          onUpdate(items);
        }
      } catch (err) {
        if (onError && err instanceof Error) onError(err);
      }
    }
  };

  fetchReplies();

  const handleLocalReplyUpdated = (e: Event) => {
    if (isUnsubscribed) return;
    const customEvent = e as CustomEvent<{ parentId?: string; reply?: MovieComment }>;
    if (customEvent.detail?.parentId === parentId) {
      fetchReplies();
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("comments-updated", handleLocalReplyUpdated);
  }

  const interval = setInterval(fetchReplies, 4000);

  return () => {
    isUnsubscribed = true;
    clearInterval(interval);
    if (typeof window !== "undefined") {
      window.removeEventListener("comments-updated", handleLocalReplyUpdated);
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
  }

  const syncInterval = setInterval(fetchAll, 3000);

  return () => {
    isUnsubscribed = true;
    clearInterval(syncInterval);
    if (typeof window !== "undefined") {
      window.removeEventListener("comments-updated", handleCommentsUpdated);
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
  }

  const interval = setInterval(fetchUserComments, 5000);

  return () => {
    isUnsubscribed = true;
    clearInterval(interval);
    if (typeof window !== "undefined") {
      window.removeEventListener("comments-updated", handleCommentsUpdated);
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
      id: `notif_${createdId}_${Date.now()}`,
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

  // 1. Cập nhật Supabase ngay lập tức
  if (isSupabaseConfigured()) {
    setCommentReactionSupabase(commentId, userId, reactionType !== null).catch(() => {});
  }

  // 2. Cập nhật ngay bộ nhớ cache & localStorage
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

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("comments-updated", { detail: { commentId } }));
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
): Promise<void> {
  if (!commentId) return;

  // 1. Cập nhật ngay lập tức vào Memory Cache & LocalStorage
  let affectedMovieSlug: string | undefined;
  for (const [slug, list] of Object.entries(movieCommentsMemoryCache)) {
    const idx = list.findIndex((c) => c.id === commentId);
    if (idx !== -1) {
      affectedMovieSlug = slug;
      movieCommentsMemoryCache[slug] = list.map((c) =>
        c.id === commentId ? { ...c, ...data, updatedAt: Date.now() } : c
      );
      saveLocalMovieComments(slug, movieCommentsMemoryCache[slug]);
      break;
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("comments-updated", { detail: { commentId, movieSlug: affectedMovieSlug } }));
  }

  // 2. Cập nhật vào Supabase Database
  if (isSupabaseConfigured()) {
    await updateCommentSupabase(commentId, {
      rating: data.rating,
      content: data.content,
      episode_slug: data.episodeSlug || null,
      episode_name: data.episodeName || null,
      is_spoiler: data.isSpoiler,
    });
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

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("comments-updated", { detail: { commentId, movieSlug: affectedMovieSlug, deleted: true } }));
  }

  // 2. Xóa trên Supabase
  if (isSupabaseConfigured()) {
    await deleteCommentSupabase(commentId);
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
    await togglePinCommentSupabase(commentId, newPinnedState);
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
