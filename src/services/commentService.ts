import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  limit,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  increment,
  setDoc,
  deleteField,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MovieComment, MovieRatingStats, CommentReactionType } from "@/types/comment";
import { UserNotification } from "@/types/notification";

const COLLECTION_NAME = "movie_comments";
const USERS_COLLECTION = "users";

// Hàm làm sạch dữ liệu trước khi gửi lên Firestore để tránh lỗi 'undefined'
function sanitizeCommentData(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Đăng ký lắng nghe bình luận theo thời gian thực (Real-time listener)
 * Chỉ lấy top-level comments (không có parentId)
 */
export function subscribeMovieComments(
  movieSlug: string,
  onUpdate: (comments: MovieComment[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  if (!db || !movieSlug) {
    onUpdate([]);
    return () => {};
  }

  const commentsRef = collection(db, COLLECTION_NAME);
  // Sử dụng single-field query (where movieSlug) để không bao giờ bị lỗi thiếu Composite Index của Firestore
  const q = query(
    commentsRef,
    where("movieSlug", "==", movieSlug),
    limit(300),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: MovieComment[] = [];
      snapshot.forEach((docSnap) => {
        items.push({
          id: docSnap.id,
          ...(docSnap.data() as Omit<MovieComment, "id">),
        });
      });
      // Sắp xếp theo thời gian mới nhất trực tiếp trong bộ nhớ
      items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      onUpdate(items);
    },
    (error) => {
      console.warn("Lỗi tải bình luận phim từ Firestore:", error);
      if (onError) onError(error);
    },
  );
}

/**
 * Lắng nghe replies (trả lời) của một comment cụ thể theo thời gian thực
 */
export function subscribeCommentReplies(
  parentId: string,
  onUpdate: (replies: MovieComment[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  if (!db || !parentId) {
    onUpdate([]);
    return () => {};
  }

  const commentsRef = collection(db, COLLECTION_NAME);
  const q = query(
    commentsRef,
    where("parentId", "==", parentId),
    limit(50),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: MovieComment[] = [];
      snapshot.forEach((docSnap) => {
        items.push({
          id: docSnap.id,
          ...(docSnap.data() as Omit<MovieComment, "id">),
        });
      });
      items.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)); // Cũ nhất lên trên trong replies
      onUpdate(items);
    },
    (error) => {
      console.warn("Lỗi tải replies từ Firestore:", error);
      if (onError) onError(error);
    },
  );
}

/**
 * Lắng nghe toàn bộ bình luận từ cộng đồng theo thời gian thực (Dành riêng cho Quản Trị Viên)
 */
export function subscribeAllComments(
  onUpdate: (comments: MovieComment[]) => void,
  onError?: (err: Error) => void,
  maxLimit: number = 300,
): Unsubscribe {
  if (!db) {
    onUpdate([]);
    return () => {};
  }

  const commentsRef = collection(db, COLLECTION_NAME);
  const q = query(commentsRef, limit(maxLimit));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: MovieComment[] = [];
      snapshot.forEach((docSnap) => {
        items.push({
          id: docSnap.id,
          ...(docSnap.data() as Omit<MovieComment, "id">),
        });
      });
      // Sắp xếp thời gian mới nhất lên đầu trong bộ nhớ để không cần Firestore composite index
      items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      onUpdate(items);
    },
    (error) => {
      console.warn("Lỗi tải toàn bộ bình luận cho Admin:", error);
      if (onError) onError(error);
    },
  );
}


/**
 * Thêm một bình luận hoặc đánh giá mới cho phim
 */
export async function addMovieComment(
  comment: Omit<MovieComment, "id" | "likes" | "likedBy" | "createdAt">,
): Promise<string> {
  if (!db) {
    throw new Error("Chưa kết nối được cơ sở dữ liệu Firebase!");
  }

  const commentsRef = collection(db, COLLECTION_NAME);
  const newComment = sanitizeCommentData({
    ...comment,
    likes: 0,
    likedBy: [],
    createdAt: Date.now(),
  });

  const docRef = await addDoc(commentsRef, newComment);
  return docRef.id;
}

/**
 * Thêm reply cho một bình luận và gửi thông báo cho người được trả lời
 */
export async function addReplyComment(params: {
  parentId: string;
  parentOwnerId: string;     // userId của chủ comment gốc
  parentOwnerName?: string;  // tên chủ comment gốc
  replyToUserId?: string;    // userId của người được reply cụ thể (nếu reply lại một reply)
  replyToUserName?: string;  // tên người được reply cụ thể
  movieSlug: string;
  movieTitle?: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  isSpoiler?: boolean;
}): Promise<string> {
  if (!db) {
    throw new Error("Chưa kết nối được cơ sở dữ liệu Firebase!");
  }

  const { parentId, parentOwnerId, parentOwnerName, replyToUserId, replyToUserName, ...replyData } = params;

  // 1. Lưu reply vào Firestore (dùng chung collection movie_comments với parentId)
  const commentsRef = collection(db, COLLECTION_NAME);
  const newReply = sanitizeCommentData({
    ...replyData,
    parentId,
    replyToUserId,
    replyToUserName,
    rating: 0, // Reply không có rating
    likes: 0,
    likedBy: [],
    createdAt: Date.now(),
  });

  const docRef = await addDoc(commentsRef, newReply);

  // 2. Gửi thông báo
  // A. Gửi cho người được reply trực tiếp (nếu có và không phải chính họ)
  if (replyToUserId && replyToUserId !== params.userId) {
    try {
      const notifId = `reply_target_${docRef.id}`;
      const notifRef = doc(db, USERS_COLLECTION, replyToUserId, "notifications", notifId);
      const notifData: UserNotification = {
        id: notifId,
        type: "comment_reply",
        title: `${params.userName} đã trả lời bình luận của bạn`,
        message: params.content.length > 80
          ? params.content.slice(0, 80) + "..."
          : params.content,
        link: `/movies/${params.movieSlug}#comments`,
        movieSlug: params.movieSlug,
        commentId: parentId,
        replierName: params.userName,
        replierAvatar: params.userAvatar,
        isRead: false,
        createdAt: Date.now(),
      };
      setDoc(notifRef, sanitizeCommentData(notifData as unknown as Record<string, unknown>)).catch(() => {});
    } catch {}
  }

  // B. Gửi cho chủ bài đánh giá gốc (nếu khác người gửi và khác người ở mục A)
  if (parentOwnerId && parentOwnerId !== params.userId && parentOwnerId !== replyToUserId) {
    try {
      const notifId = `reply_root_${docRef.id}`;
      const notifRef = doc(db, USERS_COLLECTION, parentOwnerId, "notifications", notifId);
      const notifData: UserNotification = {
        id: notifId,
        type: "comment_reply",
        title: `${params.userName} đã bình luận trong bài đánh giá của bạn`,
        message: params.content.length > 80
          ? params.content.slice(0, 80) + "..."
          : params.content,
        link: `/movies/${params.movieSlug}#comments`,
        movieSlug: params.movieSlug,
        commentId: parentId,
        replierName: params.userName,
        replierAvatar: params.userAvatar,
        isRead: false,
        createdAt: Date.now(),
      };
      setDoc(notifRef, sanitizeCommentData(notifData as unknown as Record<string, unknown>)).catch(() => {});
    } catch {}
  }

  // Suppress unused variable warning
  void parentOwnerName;

  return docRef.id;
}

/**
 * Thả cảm xúc đa dạng (Facebook Reactions: Like, Love, Haha, Wow, Sad, Angry) cho một bình luận
 */
export async function setCommentReaction(
  commentId: string,
  userId: string,
  reactionType: CommentReactionType | null,
  prevReactionType?: CommentReactionType | null,
): Promise<void> {
  if (!db || !commentId || !userId) return;

  const docRef = doc(db, COLLECTION_NAME, commentId);

  // 1. Trường hợp gỡ bỏ cảm xúc (Un-react)
  if (!reactionType) {
    const updatePayload: Record<string, unknown> = {
      likes: increment(-1),
      likedBy: arrayRemove(userId),
      [`reactions.${userId}`]: deleteField(),
    };
    if (prevReactionType) {
      updatePayload[`reactionCounts.${prevReactionType}`] = increment(-1);
    }
    await updateDoc(docRef, updatePayload);
    return;
  }

  // 2. Trường hợp thả cảm xúc lần đầu (chưa có cảm xúc trước đó)
  if (!prevReactionType) {
    await updateDoc(docRef, {
      likes: increment(1),
      likedBy: arrayUnion(userId),
      [`reactions.${userId}`]: reactionType,
      [`reactionCounts.${reactionType}`]: increment(1),
    });
    return;
  }

  // 3. Trường hợp đổi từ cảm xúc này sang cảm xúc khác (vd: Like -> Love)
  if (prevReactionType !== reactionType) {
    await updateDoc(docRef, {
      [`reactions.${userId}`]: reactionType,
      [`reactionCounts.${prevReactionType}`]: increment(-1),
      [`reactionCounts.${reactionType}`]: increment(1),
    });
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
  if (!db || !commentId) return;
  const docRef = doc(db, COLLECTION_NAME, commentId);
  await updateDoc(
    docRef,
    sanitizeCommentData({
      ...data,
      updatedAt: Date.now(),
    }),
  );
}

/**
 * Xóa bình luận của chính người dùng
 */
export async function deleteMovieComment(commentId: string): Promise<void> {
  if (!db || !commentId) return;
  const docRef = doc(db, COLLECTION_NAME, commentId);
  await deleteDoc(docRef);
}

/**
 * Tính toán thống kê điểm số đánh giá từ danh sách bình luận.
 * ĐẢM BẢO: Mỗi người dùng (userId) chỉ đóng góp đúng 1 lá phiếu điểm số duy nhất!
 * Chỉ tính top-level comments (không phải replies)
 */
export function calculateMovieRatingStats(comments: MovieComment[]): MovieRatingStats {
  // Lọc chỉ top-level comments có rating > 0
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
