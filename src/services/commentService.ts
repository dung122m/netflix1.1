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
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MovieComment, MovieRatingStats } from "@/types/comment";

const COLLECTION_NAME = "movie_comments";

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
    limit(150),
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
 * Thả tim hoặc bỏ tim cho một bình luận
 */
export async function toggleLikeComment(
  commentId: string,
  userId: string,
  hasLiked: boolean,
): Promise<void> {
  if (!db || !commentId || !userId) return;

  const docRef = doc(db, COLLECTION_NAME, commentId);
  if (hasLiked) {
    // Đã like rồi -> Bỏ like
    await updateDoc(docRef, {
      likes: increment(-1),
      likedBy: arrayRemove(userId),
    });
  } else {
    // Chưa like -> Thả tim
    await updateDoc(docRef, {
      likes: increment(1),
      likedBy: arrayUnion(userId),
    });
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
 */
export function calculateMovieRatingStats(comments: MovieComment[]): MovieRatingStats {
  // Lọc lấy 1 đánh giá mới nhất có rating > 0 của mỗi user
  const userRatingsMap = new Map<string, number>();
  for (const c of comments) {
    if (c.rating > 0 && !userRatingsMap.has(c.userId)) {
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
