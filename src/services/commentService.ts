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
import { db, auth } from "@/lib/firebase";
import { MovieComment, MovieRatingStats, CommentReactionType } from "@/types/comment";
import { UserNotification } from "@/types/notification";
import { checkContentModeration } from "@/lib/contentModeration";
import { sanitizeSafeText } from "@/lib/security";

const setDocWithTimeout = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ref: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any,
  timeoutMs = 3500
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> => {
  return Promise.race([
    setDoc(ref, data),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Firestore setDoc timeout")), timeoutMs)
    ),
  ]);
};

const addDocWithTimeout = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ref: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any,
  timeoutMs = 3500
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> => {
  return Promise.race([
    addDoc(ref, data),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Firestore write timeout")), timeoutMs)
    ),
  ]);
};

const updateDocWithTimeout = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ref: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any,
  timeoutMs = 3500
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> => {
  return Promise.race([
    updateDoc(ref, data),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Firestore update timeout")), timeoutMs)
    ),
  ]);
};

const deleteDocWithTimeout = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ref: any,
  timeoutMs = 3500
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> => {
  return Promise.race([
    deleteDoc(ref),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Firestore delete timeout")), timeoutMs)
    ),
  ]);
};

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
 * Tự động chuyển sang Next.js Server API nếu Firestore client bị Adblocker chặn
 */
export function subscribeMovieComments(
  movieSlug: string,
  onUpdate: (comments: MovieComment[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  if (!movieSlug) {
    onUpdate([]);
    return () => {};
  }

  let isUnsubscribed = false;
  let fallbackInterval: NodeJS.Timeout | null = null;
  let retryTimer: NodeJS.Timeout | null = null;
  let retryCount = 0;
  // Giữ reference tới unsubscribe hiện tại để có thể tái tạo listener
  let currentFirestoreUnsub: (() => void) | null = null;

  // Fix #3: Guard isUnsubscribed trước và sau mọi async operation
  const fallbackFetch = async () => {
    if (isUnsubscribed) return;
    try {
      const res = await fetch(`/api/comments?movieSlug=${encodeURIComponent(movieSlug)}`);
      if (isUnsubscribed) return; // Check lại sau await
      if (res.ok) {
        const data = await res.json();
        if (!isUnsubscribed && data.items) {
          onUpdate(data.items);
        }
      }
    } catch {
      // Bỏ qua lỗi mạng — sẽ thử lại theo interval
    }
  };

  // Nạp dữ liệu ngay lập tức từ Server API (không chờ Firestore client kết nối)
  fallbackFetch();

  if (!db) {
    const interval = setInterval(fallbackFetch, 8000);
    return () => {
      isUnsubscribed = true;
      clearInterval(interval);
    };
  }

  // Fix #2: Hàm tạo / tái tạo Firestore listener
  const createFirestoreListener = () => {
    if (isUnsubscribed || !db) return;

    const commentsRef = collection(db, COLLECTION_NAME);
    const q = query(
      commentsRef,
      where("movieSlug", "==", movieSlug),
      limit(150),
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        if (isUnsubscribed) return;
        // Khi nhận được snapshot hợp lệ → reset retry counter và dừng fallback poll
        retryCount = 0;
        if (fallbackInterval) {
          clearInterval(fallbackInterval);
          fallbackInterval = null;
        }
        const items: MovieComment[] = [];
        snapshot.forEach((docSnap) => {
          const commentData = {
            id: docSnap.id,
            ...(docSnap.data() as Omit<MovieComment, "id">),
          };
          // Chỉ ẩn comment bị admin đánh dấu isFlagged, không tự xóa
          if (commentData.isFlagged) return;
          items.push(commentData);
        });
        items.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return (b.createdAt || 0) - (a.createdAt || 0);
        });
        onUpdate(items);
      },
      (error) => {
        if (isUnsubscribed) return;
        console.warn("Lỗi tải bình luận từ Firestore, dùng Server API Fallback:", error);
        fallbackFetch();
        // Bật fallback poll nếu chưa có
        if (!fallbackInterval) {
          fallbackInterval = setInterval(fallbackFetch, 8000);
        }
        if (onError) onError(error);

        // Fix #2: Exponential backoff reconnect Firestore
        const delay = Math.min(2000 * Math.pow(2, retryCount), 30000);
        retryCount++;
        if (retryTimer) clearTimeout(retryTimer);
        retryTimer = setTimeout(() => {
          if (isUnsubscribed) return;
          // Hủy listener cũ bị lỗi
          currentFirestoreUnsub?.();
          // Tạo listener mới
          createFirestoreListener();
        }, delay);
      },
    );

    currentFirestoreUnsub = unsub;
  };

  // Khởi tạo listener lần đầu
  createFirestoreListener();

  // Fix #2: Reconnect khi tab được focus lại sau khi bị background
  const handleVisibilityChange = () => {
    if (isUnsubscribed) return;
    if (document.visibilityState === "visible") {
      // Tab active lại → reset và tái kết nối Firestore ngay
      retryCount = 0;
      if (retryTimer) clearTimeout(retryTimer);
      currentFirestoreUnsub?.();
      createFirestoreListener();
    }
  };

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", handleVisibilityChange);
  }

  return () => {
    isUnsubscribed = true;
    if (retryTimer) clearTimeout(retryTimer);
    if (fallbackInterval) clearInterval(fallbackInterval);
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    }
    currentFirestoreUnsub?.();
  };
}


/**
 * Lắng nghe replies (trả lời) của một comment cụ thể theo thời gian thực
 */
export function subscribeCommentReplies(
  parentId: string,
  onUpdate: (replies: MovieComment[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  if (!parentId) {
    onUpdate([]);
    return () => {};
  }

  let isUnsubscribed = false;
  let fallbackInterval: NodeJS.Timeout | null = null;
  let retryTimer: NodeJS.Timeout | null = null;
  let retryCount = 0;
  let currentFirestoreUnsub: (() => void) | null = null;

  // Fix #3: guard isUnsubscribed sau await
  const fallbackFetch = async () => {
    if (isUnsubscribed) return;
    try {
      const res = await fetch(`/api/comments?parentId=${encodeURIComponent(parentId)}`);
      if (isUnsubscribed) return;
      if (res.ok) {
        const data = await res.json();
        if (!isUnsubscribed && data.items) onUpdate(data.items);
      }
    } catch {}
  };

  fallbackFetch();

  if (!db) {
    const interval = setInterval(fallbackFetch, 8000);
    return () => { isUnsubscribed = true; clearInterval(interval); };
  }

  const createListener = () => {
    if (isUnsubscribed || !db) return;
    const q = query(collection(db, COLLECTION_NAME), where("parentId", "==", parentId), limit(50));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        if (isUnsubscribed) return;
        retryCount = 0;
        if (fallbackInterval) { clearInterval(fallbackInterval); fallbackInterval = null; }
        const items: MovieComment[] = [];
        snapshot.forEach((docSnap) => {
          const commentData = { id: docSnap.id, ...(docSnap.data() as Omit<MovieComment, "id">) };
          if (commentData.isFlagged) return;
          items.push(commentData);
        });
        items.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        onUpdate(items);
      },
      (error) => {
        if (isUnsubscribed) return;
        console.warn("Lỗi tải replies từ Firestore, dùng Server API Fallback:", error);
        fallbackFetch();
        if (!fallbackInterval) fallbackInterval = setInterval(fallbackFetch, 8000);
        if (onError) onError(error);
        // Fix #2: exponential backoff
        const delay = Math.min(2000 * Math.pow(2, retryCount), 30000);
        retryCount++;
        if (retryTimer) clearTimeout(retryTimer);
        retryTimer = setTimeout(() => {
          if (isUnsubscribed) return;
          currentFirestoreUnsub?.();
          createListener();
        }, delay);
      },
    );
    currentFirestoreUnsub = unsub;
  };

  createListener();

  return () => {
    isUnsubscribed = true;
    if (retryTimer) clearTimeout(retryTimer);
    if (fallbackInterval) clearInterval(fallbackInterval);
    currentFirestoreUnsub?.();
  };
}

/**
 * Lắng nghe tất cả bình luận do một Người Dùng đăng theo thời gian thực
 */
export function subscribeUserComments(
  userId: string,
  onUpdate: (comments: MovieComment[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  let isUnsubscribed = false;
  let fallbackInterval: NodeJS.Timeout | null = null;
  let retryTimer: NodeJS.Timeout | null = null;
  let retryCount = 0;
  let currentFirestoreUnsub: (() => void) | null = null;

  // Fix #3: guard isUnsubscribed sau await
  const fallbackFetch = async () => {
    if (isUnsubscribed) return;
    try {
      const res = await fetch(`/api/comments?userId=${encodeURIComponent(userId)}&all=true`);
      if (isUnsubscribed) return;
      if (res.ok) {
        const data = await res.json();
        if (!isUnsubscribed && data.items) onUpdate(data.items);
      }
    } catch {}
  };

  fallbackFetch();

  if (!db) {
    const interval = setInterval(fallbackFetch, 8000);
    return () => { isUnsubscribed = true; clearInterval(interval); };
  }

  const createListener = () => {
    if (isUnsubscribed || !db) return;
    const q = query(collection(db, COLLECTION_NAME), where("userId", "==", userId), limit(150));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        if (isUnsubscribed) return;
        retryCount = 0;
        if (fallbackInterval) { clearInterval(fallbackInterval); fallbackInterval = null; }
        const items: MovieComment[] = [];
        snapshot.forEach((docSnap) => {
          const commentData = { id: docSnap.id, ...(docSnap.data() as Omit<MovieComment, "id">) };
          items.push(commentData);
        });
        items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        onUpdate(items);
      },
      (error) => {
        if (isUnsubscribed) return;
        console.warn("Lỗi tải bình luận cá nhân từ Firestore, dùng Server API Fallback:", error);
        fallbackFetch();
        if (!fallbackInterval) fallbackInterval = setInterval(fallbackFetch, 8000);
        if (onError) onError(error);
        // Fix #2: exponential backoff
        const delay = Math.min(2000 * Math.pow(2, retryCount), 30000);
        retryCount++;
        if (retryTimer) clearTimeout(retryTimer);
        retryTimer = setTimeout(() => {
          if (isUnsubscribed) return;
          currentFirestoreUnsub?.();
          createListener();
        }, delay);
      },
    );
    currentFirestoreUnsub = unsub;
  };

  createListener();

  return () => {
    isUnsubscribed = true;
    if (retryTimer) clearTimeout(retryTimer);
    if (fallbackInterval) clearInterval(fallbackInterval);
    currentFirestoreUnsub?.();
  };
}


/**
 * Lắng nghe toàn bộ bình luận từ cộng đồng theo thời gian thực (Dành riêng cho Quản Trị Viên)
 */
export function subscribeAllComments(
  onUpdate: (comments: MovieComment[]) => void,
  onError?: (err: Error) => void,
  maxLimit: number = 300,
): Unsubscribe {
  let isUnsubscribed = false;

  const fallbackFetch = async () => {
    try {
      const res = await fetch(`/api/comments?all=true`);
      if (res.ok) {
        const data = await res.json();
        if (data.items && !isUnsubscribed) {
          onUpdate(data.items);
        }
      }
    } catch {}
  };

  // Nạp ngay dữ liệu từ Server API giúp hiển thị tức thì 100% không sợ Adblocker / Extension chặn Firestore client
  fallbackFetch();

  if (!db) {
    const interval = setInterval(fallbackFetch, 8000);
    return () => {
      isUnsubscribed = true;
      clearInterval(interval);
    };
  }

  const commentsRef = collection(db, COLLECTION_NAME);
  const q = query(commentsRef, limit(maxLimit));

  let fallbackInterval: NodeJS.Timeout | null = null;

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      if (isUnsubscribed) return;
      const items: MovieComment[] = [];
      snapshot.forEach((docSnap) => {
        items.push({
          id: docSnap.id,
          ...(docSnap.data() as Omit<MovieComment, "id">),
        });
      });
      items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      onUpdate(items);
    },
    (error) => {
      console.warn("Lỗi tải toàn bộ bình luận cho Admin, kích hoạt Server Fallback:", error);
      fallbackFetch();
      if (!fallbackInterval && !isUnsubscribed) {
        fallbackInterval = setInterval(fallbackFetch, 8000);
      }
      if (onError) onError(error);
    },
  );

  return () => {
    isUnsubscribed = true;
    if (fallbackInterval) clearInterval(fallbackInterval);
    unsubscribe();
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

  let userBadges: string[] = [];
  let userWatchTimeMinutes = 0;

  // 1. Kiểm tra tài khoản có đang bị hạn chế bình luận không (bọc try-catch an toàn)
  try {
    const userRef = doc(db, USERS_COLLECTION, comment.userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const uData = userSnap.data();
      if (uData?.isCommentRestricted) {
        throw new Error("Tài khoản của bạn tạm thời bị khóa tính năng bình luận do vi phạm tiêu chuẩn cộng đồng nhiều lần!");
      }
      userBadges = uData?.badges || [];
      userWatchTimeMinutes = uData?.watchTimeMinutes || 0;
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("bị khóa tính năng")) {
      throw err;
    }
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
    userBadges: comment.userBadges || userBadges,
    userWatchTimeMinutes: comment.userWatchTimeMinutes || userWatchTimeMinutes,
    content: sanitizeSafeText(comment.content, 2500),
    userName: sanitizeSafeText(comment.userName, 100),
    movieTitle: sanitizeSafeText(comment.movieTitle || "", 200),
    likes: 0,
    likedBy: [],
    createdAt: Date.now(),
  });

  try {
    const docRef = await addDocWithTimeout(commentsRef, newComment, 3500);
    return docRef.id;
  } catch (err) {
    console.warn("Lỗi ghi Firestore trực tiếp, chuyển sang Server API Fallback:", err);
    let authHeader = "";
    if (auth?.currentUser) {
      try {
        const idToken = await auth.currentUser.getIdToken();
        authHeader = `Bearer ${idToken}`;
      } catch {}
    }
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(newComment),
    });
    const resJson = await res.json();
    if (!res.ok) throw new Error(resJson.error || "Không thể gửi bình luận lúc này!");
    return resJson.id || `cmt_${Date.now()}`;
  }
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

  // 1. Kiểm tra hạn chế tài khoản (bọc try-catch an toàn)
  try {
    const userRef = doc(db, USERS_COLLECTION, params.userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists() && userSnap.data()?.isCommentRestricted) {
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

  const { parentId, parentOwnerId, parentOwnerName, replyToUserId, replyToUserName, ...replyData } = params;

  // 3. Lưu reply vào Firestore
  const commentsRef = collection(db, COLLECTION_NAME);
  const newReply = sanitizeCommentData({
    ...replyData,
    content: sanitizeSafeText(replyData.content, 2500),
    userName: sanitizeSafeText(replyData.userName, 100),
    movieTitle: sanitizeSafeText(replyData.movieTitle || "", 200),
    parentId,
    replyToUserId,
    replyToUserName: sanitizeSafeText(replyToUserName || "", 100),
    rating: 0,
    likes: 0,
    likedBy: [],
    createdAt: Date.now(),
  });

  let createdId = "";
  try {
    const docRef = await addDocWithTimeout(commentsRef, newReply, 3500);
    createdId = docRef.id;
  } catch (err) {
    console.warn("Lỗi ghi reply Firestore trực tiếp, chuyển sang Server API Fallback:", err);
    let authHeader = "";
    if (auth?.currentUser) {
      try {
        const idToken = await auth.currentUser.getIdToken();
        authHeader = `Bearer ${idToken}`;
      } catch {}
    }
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify({
        ...newReply,
        parentId,
        replyToUserId,
        replyToUserName,
      }),
    });
    const resJson = await res.json();
    if (!res.ok) throw new Error(resJson.error || "Không thể gửi phản hồi lúc này!");
    createdId = resJson.id || `reply_${Date.now()}`;
  }

  // 4. Gửi thông báo trực tiếp qua Server API đảm bảo 100% người dùng nhận được thông báo
  const sendNotificationServer = async (targetUserId: string, notifPayload: UserNotification) => {
    // Cập nhật localStorage ngay lập tức
    try {
      if (typeof window !== "undefined") {
        const localKey = `nanaflix_notifs_${targetUserId}`;
        const raw = localStorage.getItem(localKey);
        const list = raw ? JSON.parse(raw) : [];
        if (Array.isArray(list)) {
          const map = new Map<string, UserNotification>();
          map.set(notifPayload.id, notifPayload);
          list.forEach((item: UserNotification) => {
            if (!map.has(item.id)) map.set(item.id, item);
          });
          localStorage.setItem(localKey, JSON.stringify(Array.from(map.values()).slice(0, 50)));
        }
      }
    } catch {}

    try {
      if (db) {
        const notifRef = doc(db, USERS_COLLECTION, targetUserId, "notifications", notifPayload.id);
        await setDocWithTimeout(notifRef, sanitizeCommentData(notifPayload as unknown as Record<string, unknown>), 2000);
        return;
      }
    } catch {}

    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: targetUserId,
          notifId: notifPayload.id,
          type: notifPayload.type,
          title: notifPayload.title,
          message: notifPayload.message,
          link: notifPayload.link,
          movieSlug: notifPayload.movieSlug,
          commentId: notifPayload.commentId,
          replierName: notifPayload.replierName,
          replierAvatar: notifPayload.replierAvatar,
        }),
      });
    } catch {}
  };

  if (replyToUserId && replyToUserId !== params.userId) {
    const notifId = `reply_target_${createdId}`;
    const notifData: UserNotification = {
      id: notifId,
      type: "comment_reply",
      title: `${params.userName} đã trả lời bình luận của bạn`,
      message: params.content.length > 80
        ? params.content.slice(0, 80) + "..."
        : params.content,
      link: `/movies/${params.movieSlug}?highlightComment=${createdId}#comment-${createdId}`,
      movieSlug: params.movieSlug,
      commentId: createdId,
      replierName: params.userName,
      replierAvatar: params.userAvatar,
      isRead: false,
      createdAt: Date.now(),
    };
    sendNotificationServer(replyToUserId, notifData).catch(() => {});
  }

  if (parentOwnerId && parentOwnerId !== params.userId && parentOwnerId !== replyToUserId) {
    const notifId = `reply_root_${createdId}`;
    const notifData: UserNotification = {
      id: notifId,
      type: "comment_reply",
      title: `${params.userName} đã bình luận trong bài đánh giá của bạn`,
      message: params.content.length > 80
        ? params.content.slice(0, 80) + "..."
        : params.content,
      link: `/movies/${params.movieSlug}?highlightComment=${createdId}#comment-${createdId}`,
      movieSlug: params.movieSlug,
      commentId: createdId,
      replierName: params.userName,
      replierAvatar: params.userAvatar,
      isRead: false,
      createdAt: Date.now(),
    };
    sendNotificationServer(parentOwnerId, notifData).catch(() => {});
  }

  void parentOwnerName;
  return createdId;
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
  if (!commentId) return;
  const safeData: typeof data = { ...data };
  if (safeData.content) {
    safeData.content = sanitizeSafeText(safeData.content, 2500);
  }

  const payload = sanitizeCommentData({
    ...safeData,
    updatedAt: Date.now(),
  });

  if (db) {
    try {
      const docRef = doc(db, COLLECTION_NAME, commentId);
      await updateDocWithTimeout(docRef, payload, 3500);
      return;
    } catch (err) {
      console.warn("Lỗi updateDoc trực tiếp, chuyển sang Server API Fallback:", err);
    }
  }

  let authHeader = "";
  if (auth?.currentUser) {
    try {
      const idToken = await auth.currentUser.getIdToken();
      authHeader = `Bearer ${idToken}`;
    } catch {}
  }

  const res = await fetch("/api/comments", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    body: JSON.stringify({ commentId, ...payload }),
  });
  if (!res.ok) {
    const resJson = await res.json().catch(() => ({}));
    throw new Error(resJson.error || "Không thể cập nhật bình luận lúc này!");
  }
}

/**
 * Xóa bình luận của chính người dùng
 */
export async function deleteMovieComment(commentId: string): Promise<void> {
  if (!commentId) return;

  if (db) {
    try {
      const docRef = doc(db, COLLECTION_NAME, commentId);
      await deleteDocWithTimeout(docRef, 3500);
      return;
    } catch (err) {
      console.warn("Lỗi deleteDoc trực tiếp, chuyển sang Server API Fallback:", err);
    }
  }

  let authHeader = "";
  if (auth?.currentUser) {
    try {
      const idToken = await auth.currentUser.getIdToken();
      authHeader = `Bearer ${idToken}`;
    } catch {}
  }

  const res = await fetch(`/api/comments?commentId=${encodeURIComponent(commentId)}`, {
    method: "DELETE",
    headers: authHeader ? { Authorization: authHeader } : {},
  });
  if (!res.ok) {
    const resJson = await res.json().catch(() => ({}));
    throw new Error(resJson.error || "Không thể xóa bình luận lúc này!");
  }
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

/**
 * Ghim hoặc bỏ ghim một bình luận (Dành riêng cho Quản trị viên)
 */
export async function togglePinComment(
  commentId: string,
  currentIsPinned: boolean,
  adminEmail: string
): Promise<boolean> {
  const newPinnedState = !currentIsPinned;
  if (db) {
    try {
      const commentRef = doc(db, COLLECTION_NAME, commentId);
      await updateDoc(commentRef, {
        isPinned: newPinnedState,
        pinnedAt: newPinnedState ? Date.now() : deleteField(),
        pinnedBy: newPinnedState ? adminEmail : deleteField(),
      });
      return newPinnedState;
    } catch (err) {
      console.warn("Lỗi ghim/bỏ ghim comment Firestore client, thử dùng API server:", err);
    }
  }

  try {
    const res = await fetch("/api/comments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commentId,
        isPinned: newPinnedState,
        adminEmail,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("Lỗi togglePinComment:", err);
    throw err;
  }
}

