import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
  getDoc,
  getDocs,
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
import { checkContentModeration } from "@/lib/contentModeration";

const COLLECTION_NAME = "movie_comments";
const USERS_COLLECTION = "users";
const VIOLATIONS_COLLECTION = "admin_violations";

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
        const commentData = {
          id: docSnap.id,
          ...(docSnap.data() as Omit<MovieComment, "id">),
        };

        // TỰ ĐỘNG LỌC & TỰ ĐỘNG XÓA BÌNH LUẬN VÔ VĂN HÓA / SPAM
        const mod = checkContentModeration(commentData.content || "");
        if (!mod.isAllowed || commentData.isFlagged) {
          // Tự động xóa ngầm khỏi Firestore
          if (db) {
            deleteDoc(doc(db, COLLECTION_NAME, docSnap.id)).catch(() => {});
          }
          return; // Không hiển thị cho người xem
        }

        items.push(commentData);
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
        const commentData = {
          id: docSnap.id,
          ...(docSnap.data() as Omit<MovieComment, "id">),
        };

        // TỰ ĐỘNG LỌC & TỰ ĐỘNG XÓA REPLY VÔ VĂN HÓA / SPAM
        const mod = checkContentModeration(commentData.content || "");
        if (!mod.isAllowed || commentData.isFlagged) {
          if (db) {
            deleteDoc(doc(db, COLLECTION_NAME, docSnap.id)).catch(() => {});
          }
          return;
        }

        items.push(commentData);
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
  if (!db || !params.userId) return;

  try {
    const violationId = `viol_${params.userId}_${Date.now()}`;
    const violRef = doc(db, VIOLATIONS_COLLECTION, violationId);

    // 1. Lưu bản ghi chi tiết vi phạm vào admin_violations
    await setDoc(
      violRef,
      sanitizeCommentData({
        id: violationId,
        userId: params.userId,
        userName: params.userName,
        userEmail: params.userEmail || "",
        userAvatar: params.userAvatar || "",
        movieSlug: params.movieSlug,
        movieTitle: params.movieTitle || "",
        attemptedContent: params.attemptedContent,
        reason: params.reason,
        violations: params.violations,
        isSpam: Boolean(params.isSpam),
        commentId: params.commentId || "",
        createdAt: Date.now(),
        status: "pending_admin_review",
      })
    );

    // 2. Cập nhật hồ sơ thành viên (tăng số lần vi phạm)
    const userRef = doc(db, USERS_COLLECTION, params.userId);
    const userSnap = await getDoc(userRef);
    const currentViolations = userSnap.exists() ? Number(userSnap.data()?.violationsCount || 0) : 0;
    const newViolationsCount = currentViolations + 1;

    await setDoc(
      userRef,
      sanitizeCommentData({
        violationsCount: newViolationsCount,
        lastViolationAt: Date.now(),
        lastViolationReason: params.reason,
        // Tự động hạn chế quyền bình luận nếu cố tình vi phạm từ 3 lần trở lên
        isCommentRestricted: newViolationsCount >= 3,
      }),
      { merge: true }
    );
  } catch (err) {
    console.warn("Lỗi ghi nhận vi phạm vào Firestore:", err);
  }
}

/**
 * Gỡ cờ đánh dấu bình luận (Dành cho Quản trị viên duyệt lại bình luận hợp lệ)
 */
export async function unflagComment(commentId: string): Promise<void> {
  if (!db || !commentId) return;
  try {
    const docRef = doc(db, COLLECTION_NAME, commentId);
    await updateDoc(docRef, {
      isFlagged: false,
      flagReason: deleteField(),
      flaggedKeywords: deleteField(),
      flaggedAt: deleteField(),
    });
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
  if (!db) {
    throw new Error("Chưa kết nối được cơ sở dữ liệu Firebase!");
  }

  // 1. Kiểm tra tài khoản có đang bị hạn chế bình luận không
  const userRef = doc(db, USERS_COLLECTION, comment.userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists() && userSnap.data()?.isCommentRestricted) {
    throw new Error("Tài khoản của bạn tạm thời bị khóa tính năng bình luận do vi phạm tiêu chuẩn cộng đồng nhiều lần!");
  }

  // 2. Kiểm duyệt nội dung từ ngữ & spam
  const modCheck = checkContentModeration(comment.content);
  if (!modCheck.isAllowed) {
    // Tự động ghi nhận vi phạm cho Admin
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
 * Thêm reply cho một bình luận và gửi thông báo cho người được trả lời (Có kiểm duyệt)
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
  userEmail?: string;
  content: string;
  isSpoiler?: boolean;
}): Promise<string> {
  if (!db) {
    throw new Error("Chưa kết nối được cơ sở dữ liệu Firebase!");
  }

  // 1. Kiểm tra hạn chế tài khoản
  const userRef = doc(db, USERS_COLLECTION, params.userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists() && userSnap.data()?.isCommentRestricted) {
    throw new Error("Tài khoản của bạn tạm thời bị khóa tính năng bình luận do vi phạm tiêu chuẩn cộng đồng nhiều lần!");
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

  const { parentId, parentOwnerId, parentOwnerName, replyToUserId, replyToUserName, ...replyData } = params;

  // 3. Lưu reply vào Firestore
  const commentsRef = collection(db, COLLECTION_NAME);
  const newReply = sanitizeCommentData({
    ...replyData,
    parentId,
    replyToUserId,
    replyToUserName,
    rating: 0,
    likes: 0,
    likedBy: [],
    createdAt: Date.now(),
  });

  const docRef = await addDoc(commentsRef, newReply);

  // 4. Gửi thông báo
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
 * Quét toàn bộ hoặc danh sách bình luận đã tải, phát hiện và xóa vĩnh viễn các bình luận vi phạm
 */
export async function autoCleanAllToxicAndSpamComments(allComments?: MovieComment[]): Promise<AutoCleanResult> {
  if (!db) {
    return { scannedCount: 0, deletedCount: 0, deletedItems: [] };
  }

  let itemsToScan = allComments;
  if (!itemsToScan || itemsToScan.length === 0) {
    try {
      const commentsRef = collection(db, COLLECTION_NAME);
      const q = query(commentsRef, limit(500));
      const snap = await getDocs(q);
      const fetched: MovieComment[] = [];
      snap.forEach((docSnap) => {
        fetched.push({
          id: docSnap.id,
          ...(docSnap.data() as Omit<MovieComment, "id">),
        });
      });
      itemsToScan = fetched;
    } catch (e) {
      console.error("Lỗi tải bình luận để quét tự động:", e);
      return { scannedCount: 0, deletedCount: 0, deletedItems: [] };
    }
  }

  const deletedItems: AutoCleanResult["deletedItems"] = [];

  for (const c of itemsToScan) {
    const mod = checkContentModeration(c.content || "");
    const isToxicOrSpam = !mod.isAllowed || c.isFlagged;

    if (isToxicOrSpam) {
      try {
        await deleteDoc(doc(db, COLLECTION_NAME, c.id));
        deletedItems.push({
          id: c.id,
          userName: c.userName || "Ẩn danh",
          movieSlug: c.movieSlug || "",
          content: c.content || "",
          reason: mod.reason || c.flagReason || "Bình luận vi phạm thuần phong mỹ tục hoặc spam",
          violations: mod.violations?.length ? mod.violations : (c.flaggedKeywords || []),
        });

        // Ghi nhận / tăng số lần vi phạm của user
        if (c.userId) {
          const userRef = doc(db, USERS_COLLECTION, c.userId);
          const userSnap = await getDoc(userRef);
          const currentViolations = userSnap.exists() ? Number(userSnap.data()?.violationsCount || 0) : 0;
          const newCount = currentViolations + 1;
          await setDoc(
            userRef,
            {
              violationsCount: newCount,
              lastViolationAt: Date.now(),
              lastViolationReason: mod.reason || c.flagReason || "Tự động xóa do vi phạm tiêu chuẩn cộng đồng",
              isCommentRestricted: newCount >= 3,
            },
            { merge: true }
          );
        }
      } catch (err) {
        console.warn("Lỗi xóa tự động comment rác:", c.id, err);
      }
    }
  }

  return {
    scannedCount: itemsToScan.length,
    deletedCount: deletedItems.length,
    deletedItems,
  };
}

/**
 * Xóa nhanh tất cả bình luận đang bị gắn cờ vi phạm trong 1 thao tác
 */
export async function purgeAllFlaggedComments(commentsList: MovieComment[]): Promise<number> {
  if (!db || !commentsList) return 0;
  const flagged = commentsList.filter((c) => c.isFlagged);
  let deletedCount = 0;
  for (const c of flagged) {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, c.id));
      deletedCount++;
    } catch (e) {
      console.warn("Lỗi xóa cmt gắn cờ:", c.id, e);
    }
  }
  return deletedCount;
}
