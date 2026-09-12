import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
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
  const q = query(
    commentsRef,
    where("movieSlug", "==", movieSlug),
    orderBy("createdAt", "desc"),
    limit(100),
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
      onUpdate(items);
    },
    (error) => {
      console.warn("Lỗi tải bình luận phim từ Firestore:", error);
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
 * Xóa bình luận của chính người dùng
 */
export async function deleteMovieComment(commentId: string): Promise<void> {
  if (!db || !commentId) return;
  const docRef = doc(db, COLLECTION_NAME, commentId);
  await deleteDoc(docRef);
}

/**
 * Tính toán thống kê điểm số đánh giá từ danh sách bình luận
 */
export function calculateMovieRatingStats(comments: MovieComment[]): MovieRatingStats {
  const ratedComments = comments.filter((c) => c.rating > 0);
  const totalReviews = ratedComments.length;

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
  ratedComments.forEach((c) => {
    const star = Math.min(5, Math.max(1, Math.round(c.rating))) as 1 | 2 | 3 | 4 | 5;
    starCounts[star] += 1;
    totalScore += c.rating;
  });

  const averageRating = Number((totalScore / totalReviews).toFixed(1));

  return {
    averageRating,
    totalReviews,
    starCounts,
  };
}
