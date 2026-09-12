import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  limit,
  writeBatch,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { User } from "firebase/auth";
import { db } from "@/lib/firebase";
import { UserProfile } from "@/types/user";
import { WatchHistoryItem } from "@/lib/watchHistory";
import { WatchlistItem } from "@/lib/watchlist";
import { isUserAdmin } from "@/lib/adminConfig";

const USERS_COLLECTION = "users";
const COMMENTS_COLLECTION = "movie_comments";

/**
 * Ghi nhận hoặc cập nhật hồ sơ người dùng vào Firestore khi đăng nhập
 */
export async function recordUserProfile(user: User): Promise<void> {
  if (!db || !user || !user.uid) return;

  try {
    const userRef = doc(db, USERS_COLLECTION, user.uid);
    const now = Date.now();
    const isAdmin = isUserAdmin(user.email);

    await setDoc(
      userRef,
      {
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || "Thành viên Nanaflix",
        photoURL: user.photoURL || "",
        lastLoginAt: now,
        role: isAdmin ? "admin" : "member",
        // merge: true giữ nguyên createdAt nếu tài liệu đã có từ trước
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("Lỗi lưu thông tin người dùng vào Firestore:", err);
  }
}

/**
 * Lắng nghe danh sách tất cả thành viên theo thời gian thực (Dành cho Quản trị viên)
 */
export function subscribeAllUsers(
  onUpdate: (users: UserProfile[]) => void,
  onError?: (err: Error) => void,
  maxLimit: number = 300
): Unsubscribe {
  if (!db) {
    onUpdate([]);
    return () => {};
  }

  const usersRef = collection(db, USERS_COLLECTION);
  const q = query(usersRef, limit(maxLimit));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Chỉ lấy những doc là profile người dùng (có uid hoặc email)
        if (data && (data.uid || data.email)) {
          items.push({
            uid: docSnap.id,
            email: data.email || "",
            displayName: data.displayName || "Thành viên Nanaflix",
            photoURL: data.photoURL || "",
            createdAt: data.createdAt || data.lastLoginAt || Date.now(),
            lastLoginAt: data.lastLoginAt || Date.now(),
            role: data.role || (isUserAdmin(data.email) ? "admin" : "member"),
          });
        }
      });
      // Sắp xếp người hoạt động mới nhất lên đầu
      items.sort((a, b) => (b.lastLoginAt || 0) - (a.lastLoginAt || 0));
      onUpdate(items);
    },
    (error) => {
      console.warn("Lỗi tải danh sách người dùng Firestore:", error);
      if (onError) onError(error);
    }
  );
}

/**
 * Lấy lịch sử xem phim của 1 người dùng cụ thể từ Cloud Firestore
 */
export async function getUserCloudWatchHistory(userId: string): Promise<WatchHistoryItem[]> {
  if (!db || !userId) return [];
  try {
    const colRef = collection(db, USERS_COLLECTION, userId, "watch_history");
    const snap = await getDocs(colRef);
    const items: WatchHistoryItem[] = [];
    snap.forEach((d) => {
      items.push(d.data() as WatchHistoryItem);
    });
    items.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    return items;
  } catch (err) {
    console.warn("Lỗi đọc lịch sử xem của user:", err);
    return [];
  }
}

/**
 * Lấy danh sách phim yêu thích (Watchlist) của 1 người dùng từ Cloud Firestore
 */
export async function getUserCloudWatchlist(userId: string): Promise<WatchlistItem[]> {
  if (!db || !userId) return [];
  try {
    const colRef = collection(db, USERS_COLLECTION, userId, "watchlist");
    const snap = await getDocs(colRef);
    const items: WatchlistItem[] = [];
    snap.forEach((d) => {
      items.push(d.data() as WatchlistItem);
    });
    items.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
    return items;
  } catch (err) {
    console.warn("Lỗi đọc watchlist của user:", err);
    return [];
  }
}

/**
 * Xóa toàn bộ bình luận của một thành viên vi phạm (Dành cho Quản trị viên xóa hàng loạt spam)
 */
export async function deleteAllUserComments(userId: string): Promise<number> {
  if (!db || !userId) return 0;
  try {
    const commentsRef = collection(db, COMMENTS_COLLECTION);
    const q = query(commentsRef, where("userId", "==", userId));
    const snap = await getDocs(q);

    if (snap.empty) return 0;

    const batch = writeBatch(db);
    snap.forEach((d) => {
      batch.delete(d.ref);
    });

    await batch.commit();
    return snap.size;
  } catch (err) {
    console.error("Lỗi xóa toàn bộ bình luận của user:", err);
    throw err;
  }
}
