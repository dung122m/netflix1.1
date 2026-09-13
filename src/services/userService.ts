import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
  writeBatch,
  onSnapshot,
  increment,
  type Unsubscribe,
} from "firebase/firestore";
import { User, updateProfile as updateAuthProfile } from "firebase/auth";
import { db } from "@/lib/firebase";
import { UserProfile } from "@/types/user";
import { WatchHistoryItem } from "@/lib/watchHistory";
import { WatchlistItem } from "@/lib/watchlist";
import { isUserAdmin } from "@/lib/adminConfig";
import { sanitizeSafeText } from "@/lib/security";

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
        displayName: sanitizeSafeText(user.displayName || "Thành viên Nanaflix", 100),
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
            isCommentRestricted: Boolean(data.isCommentRestricted),
            violationsCount: Number(data.violationsCount || 0),
            lastViolationAt: data.lastViolationAt,
            lastViolationReason: data.lastViolationReason,
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
 * Khóa hoặc Mở khóa quyền bình luận của một thành viên (Dành cho Quản trị viên)
 */
export async function setUserCommentRestriction(
  userId: string,
  isRestricted: boolean,
  reason?: string
): Promise<void> {
  if (!db || !userId) return;
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await setDoc(
      userRef,
      {
        isCommentRestricted: isRestricted,
        ...(reason ? { lastViolationReason: sanitizeSafeText(reason, 200) } : {}),
      },
      { merge: true }
    );
  } catch (err) {
    console.error("Lỗi cập nhật quyền bình luận của user:", err);
    throw err;
  }
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

/**
 * Lấy hồ sơ người dùng đầy đủ từ Firestore (bao gồm bio, sở thích, avatar tùy chỉnh)
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (!db || !userId) return null;
  try {
    const docRef = doc(db, USERS_COLLECTION, userId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return {
      uid: snap.id,
      ...(snap.data() as Omit<UserProfile, "uid">),
    };
  } catch (err) {
    console.warn("Lỗi đọc hồ sơ user:", userId, err);
    return null;
  }
}

/**
 * Lắng nghe hồ sơ người dùng theo thời gian thực (Real-time profile listener)
 */
export function subscribeUserProfile(
  userId: string,
  onUpdate: (profile: UserProfile | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!db || !userId) {
    onUpdate(null);
    return () => {};
  }

  const userRef = doc(db, USERS_COLLECTION, userId);
  return onSnapshot(
    userRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate({
          uid: snap.id,
          ...(snap.data() as Omit<UserProfile, "uid">),
        });
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.warn("Lỗi lắng nghe hồ sơ user:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * Cập nhật hồ sơ tùy chỉnh của người dùng (tên hiển thị, avatar, bio, sở thích)
 */
export async function updateUserProfile(
  authUser: User | null,
  userId: string,
  data: {
    displayName?: string;
    photoURL?: string;
    bio?: string;
    favoriteGenres?: string[];
    customAvatar?: string;
    badges?: string[];
  }
): Promise<void> {
  if (!db || !userId) return;

  const payload: Record<string, unknown> = {
    updatedAt: Date.now(),
  };

  if (data.displayName !== undefined) {
    payload.displayName = sanitizeSafeText(data.displayName, 50);
  }
  if (data.photoURL !== undefined) {
    payload.photoURL = data.photoURL;
  }
  if (data.customAvatar !== undefined) {
    payload.customAvatar = data.customAvatar;
  }
  if (data.bio !== undefined) {
    payload.bio = sanitizeSafeText(data.bio, 150);
  }
  if (data.favoriteGenres !== undefined) {
    payload.favoriteGenres = data.favoriteGenres.slice(0, 10);
  }
  if (data.badges !== undefined) {
    payload.badges = data.badges;
  }

  const userRef = doc(db, USERS_COLLECTION, userId);
  await setDoc(userRef, payload, { merge: true });

  // Cập nhật profile Firebase Auth nếu đang đăng nhập đúng tài khoản
  if (authUser && authUser.uid === userId) {
    const authUpdates: { displayName?: string; photoURL?: string } = {};
    if (data.displayName) authUpdates.displayName = payload.displayName as string;
    if (data.photoURL || data.customAvatar) {
      authUpdates.photoURL = (data.customAvatar || data.photoURL) as string;
    }

    if (Object.keys(authUpdates).length > 0) {
      try {
        await updateAuthProfile(authUser, authUpdates);
      } catch (err) {
        console.warn("Lỗi cập nhật Auth profile:", err);
      }
    }
  }

  // Bắn event toàn cục để Navbar & UI tự động cập nhật
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("user-profile-updated"));
  }
}

/**
 * Tích lũy thời gian cày phim (phút) cho người dùng trong Firestore khi đang xem phim
 */
export async function incrementUserWatchTime(userId: string, minutes: number = 1): Promise<number> {
  if (!db || !userId || minutes <= 0) return 0;
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await setDoc(
      userRef,
      {
        watchTimeMinutes: increment(minutes),
        lastWatchedAt: Date.now(),
      },
      { merge: true }
    );

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("user-watch-time-updated", { detail: { minutes } }));
    }
    return minutes;
  } catch (err) {
    console.warn("Lỗi cộng thời gian cày phim:", err);
    return 0;
  }
}

/**
 * Tính cấp độ cày phim & danh hiệu của người dùng dựa trên số phút xem
 */
export interface WatchLevelInfo {
  levelName: string;
  badgeIcon: string;
  minMinutes: number;
  colorClass: string;
  nextLevelName?: string;
  nextMinMinutes?: number;
  badges: string[];
}

export function getWatchLevelInfo(totalMinutes: number = 0): WatchLevelInfo {
  if (totalMinutes >= 12000) {
    return {
      levelName: "Thánh Phim Nanaflix",
      badgeIcon: "👑",
      minMinutes: 12000,
      colorClass: "from-amber-500 via-rose-500 to-amber-300 text-amber-200 border-amber-400/60",
      badges: ["🍿 Mọt Phim Đêm", "🎬 Đạo Diễn Tương Lai", "👑 Top Fan Nanaflix", "⚡ Cày Phim Siêu Cấp", "💎 Cương Thi Đêm"],
    };
  }
  if (totalMinutes >= 3000) {
    return {
      levelName: "Kim Cương Cày Phim",
      badgeIcon: "💎",
      minMinutes: 3000,
      colorClass: "from-cyan-400 to-blue-500 text-cyan-300 border-cyan-400/50",
      nextLevelName: "Thánh Phim Nanaflix",
      nextMinMinutes: 12000,
      badges: ["🍿 Mọt Phim Đêm", "🎬 Đạo Diễn Tương Lai", "⚡ Cày Phim Siêu Cấp", "💎 Cương Thi Đêm"],
    };
  }
  if (totalMinutes >= 600) {
    return {
      levelName: "Thành Viên Vàng",
      badgeIcon: "🌟",
      minMinutes: 600,
      colorClass: "from-amber-500 to-yellow-400 text-amber-300 border-amber-400/50",
      nextLevelName: "Kim Cương Cày Phim",
      nextMinMinutes: 3000,
      badges: ["🍿 Mọt Phim Đêm", "🎬 Đạo Diễn Tương Lai", "⚡ Cày Phim Siêu Cấp"],
    };
  }
  if (totalMinutes >= 60) {
    return {
      levelName: "Thành Viên Bạc",
      badgeIcon: "🥈",
      minMinutes: 60,
      colorClass: "from-slate-300 to-gray-400 text-gray-200 border-gray-400/50",
      nextLevelName: "Thành Viên Vàng",
      nextMinMinutes: 600,
      badges: ["🍿 Mọt Phim Đêm", "🎬 Đạo Diễn Tương Lai"],
    };
  }
  return {
    levelName: "Tân Thủ Cày Phim",
    badgeIcon: "🍿",
    minMinutes: 0,
    colorClass: "from-zinc-700 to-zinc-800 text-gray-300 border-zinc-700",
    nextLevelName: "Thành Viên Bạc",
    nextMinMinutes: 60,
    badges: ["🍿 Mọt Phim Đêm"],
  };
}

/**
 * Lấy danh sách Top Fan Cày Phim từ Firestore (Leaderboard)
 */
export async function getTopWatchLeaderboard(maxLimit: number = 10): Promise<UserProfile[]> {
  if (!db) return [];
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const snap = await getDocs(usersRef);
    const items: UserProfile[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && (data.uid || data.email)) {
        items.push({
          uid: docSnap.id,
          email: data.email || "",
          displayName: data.displayName || "Thành viên Nanaflix",
          photoURL: data.customAvatar || data.photoURL || "",
          customAvatar: data.customAvatar,
          bio: data.bio,
          favoriteGenres: data.favoriteGenres,
          watchTimeMinutes: Number(data.watchTimeMinutes || 0),
          badges: data.badges || [],
          createdAt: data.createdAt || Date.now(),
          lastLoginAt: data.lastLoginAt || Date.now(),
          role: data.role || "member",
        });
      }
    });
    // Sắp xếp theo tổng số phút đã xem giảm dần
    items.sort((a, b) => (b.watchTimeMinutes || 0) - (a.watchTimeMinutes || 0));
    return items.slice(0, maxLimit);
  } catch (err) {
    console.warn("Lỗi đọc Bảng Xếp Hạng Leaderboard:", err);
    return [];
  }
}

