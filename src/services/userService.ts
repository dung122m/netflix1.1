export interface BaseAuthUser {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}
import { UserProfile } from "@/types/user";
import { WatchHistoryItem } from "@/lib/watchHistory";
import { WatchlistItem } from "@/lib/watchlist";
import { isUserAdmin } from "@/lib/adminConfig";
import { sanitizeSafeText } from "@/lib/security";
import {
  upsertUserProfileSupabase,
  getUserProfileSupabase,
  getAllProfilesSupabase,
  getTopWatchLeaderboardSupabase,
  updateUserProfileSupabase,
  setUserCommentRestrictionSupabase,
  deleteAllUserCommentsSupabase,
  getWatchHistorySupabase,
  getWatchlistSupabase,
} from "./supabaseService";
import { isSupabaseConfigured } from "@/lib/supabase";

const PROFILE_CACHE_PREFIX = "nanaflix_user_profile_";

/**
 * Lấy cache hồ sơ người dùng từ LocalStorage (giúp UI hiển thị tức thì 0ms)
 */
export function getCachedUserProfile(userId: string): UserProfile | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = localStorage.getItem(`${PROFILE_CACHE_PREFIX}${userId}`);
    if (raw) return JSON.parse(raw) as UserProfile;
  } catch {}
  return null;
}

/**
 * Lưu cache hồ sơ người dùng vào LocalStorage
 */
export function setCachedUserProfile(userId: string, profile: Partial<UserProfile>): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    const current = getCachedUserProfile(userId) || ({ uid: userId } as UserProfile);
    const merged = { ...current, ...profile };
    localStorage.setItem(`${PROFILE_CACHE_PREFIX}${userId}`, JSON.stringify(merged));
  } catch {}
}

/**
 * Tính tổng số phút cày phim từ lịch sử xem cục bộ
 */
function calculateLocalHistoryWatchMinutes(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem("nanaflix_watch_history");
    if (!raw) return 0;
    const list: WatchHistoryItem[] = JSON.parse(raw);
    let totalSecs = 0;
    list.forEach((item) => {
      if (item.progressSeconds && item.progressSeconds > 0) {
        totalSecs += item.progressSeconds;
      }
    });
    return Math.floor(totalSecs / 60);
  } catch {
    return 0;
  }
}

/**
 * Ghi nhận hoặc cập nhật hồ sơ người dùng vào Supabase khi đăng nhập
 */
export async function recordUserProfile(user: BaseAuthUser): Promise<void> {
  if (!user || !user.uid) return;

  try {
    const now = Date.now();
    const isAdmin = isUserAdmin(user.email);
    const cached = getCachedUserProfile(user.uid);
    const localHistoryMins = calculateLocalHistoryWatchMinutes();

    // Lấy profile hiện có từ Supabase nếu có
    let remoteProfile: UserProfile | null = null;
    if (isSupabaseConfigured()) {
      try {
        remoteProfile = await getUserProfileSupabase(user.uid);
      } catch {}
    }

    const mergedDisplayName =
      cached?.displayName ||
      remoteProfile?.displayName ||
      sanitizeSafeText(user.displayName || "Thành viên Nanaflix", 100);

    const mergedCustomAvatar =
      cached?.customAvatar ||
      remoteProfile?.customAvatar ||
      "";

    const mergedPhotoURL =
      cached?.photoURL ||
      remoteProfile?.photoURL ||
      user.photoURL ||
      "";

    const mergedBio =
      cached?.bio ||
      remoteProfile?.bio ||
      "";

    const mergedFavoriteGenres =
      cached?.favoriteGenres && cached.favoriteGenres.length > 0
        ? cached.favoriteGenres
        : remoteProfile?.favoriteGenres || [];

    const mergedBadges =
      cached?.badges && cached.badges.length > 0
        ? cached.badges
        : remoteProfile?.badges || [];

    const currentWatchMins = Math.max(
      Number(cached?.watchTimeMinutes || 0),
      Number(remoteProfile?.watchTimeMinutes || 0),
      localHistoryMins
    );

    const profileData: Partial<UserProfile> & { uid: string } = {
      uid: user.uid,
      email: user.email || "",
      displayName: mergedDisplayName,
      photoURL: mergedPhotoURL,
      customAvatar: mergedCustomAvatar || undefined,
      bio: mergedBio || undefined,
      favoriteGenres: mergedFavoriteGenres,
      badges: mergedBadges,
      lastLoginAt: now,
      role: isAdmin ? "admin" : (remoteProfile?.role || "member"),
      createdAt: remoteProfile?.createdAt || cached?.createdAt || now,
      watchTimeMinutes: currentWatchMins,
    };

    // Lưu vào Local cache
    setCachedUserProfile(user.uid, profileData as Partial<UserProfile>);

    // Lưu vào Supabase Database
    if (isSupabaseConfigured()) {
      await upsertUserProfileSupabase(profileData);
    }
  } catch (err) {
    console.warn("Lỗi lưu thông tin người dùng vào Supabase:", err);
  }
}

/**
 * Lắng nghe danh sách tất cả thành viên theo thời gian thực (Dành cho Quản trị viên)
 */
export function subscribeAllUsers(
  onUpdate: (users: UserProfile[]) => void,
  onError?: (err: Error) => void,
  _maxLimit: number = 300
): () => void {
  void _maxLimit;
  let isUnsubscribed = false;

  const fetchUsers = async () => {
    if (isUnsubscribed) return;
    if (isSupabaseConfigured()) {
      try {
        const items = await getAllProfilesSupabase();
        if (!isUnsubscribed) {
          onUpdate(items);
        }
      } catch (err) {
        if (onError && err instanceof Error) onError(err);
      }
    }
  };

  fetchUsers();

  const handleUpdate = () => {
    if (!isUnsubscribed) fetchUsers();
  };

  if (typeof window !== "undefined") {
    window.addEventListener("user-profile-updated", handleUpdate);
    document.addEventListener("visibilitychange", handleUpdate);
  }

  const interval = setInterval(() => {
    if (!isUnsubscribed && typeof document !== "undefined" && !document.hidden) {
      fetchUsers();
    }
  }, 45000);

  return () => {
    isUnsubscribed = true;
    clearInterval(interval);
    if (typeof window !== "undefined") {
      window.removeEventListener("user-profile-updated", handleUpdate);
      document.removeEventListener("visibilitychange", handleUpdate);
    }
  };
}

/**
 * Khóa hoặc Mở khóa quyền bình luận của một thành viên (Dành cho Quản trị viên)
 */
export async function setUserCommentRestriction(
  userId: string,
  isRestricted: boolean,
  reason?: string
): Promise<void> {
  if (!userId) return;

  if (isSupabaseConfigured()) {
    await setUserCommentRestrictionSupabase(userId, isRestricted, reason);
  }
}

/**
 * Lấy lịch sử xem phim của 1 người dùng cụ thể từ Supabase
 */
export async function getUserCloudWatchHistory(userId: string): Promise<WatchHistoryItem[]> {
  if (!userId) return [];

  if (isSupabaseConfigured()) {
    try {
      const items = await getWatchHistorySupabase(userId);
      if (items && items.length > 0) return items;
    } catch {}
  }
  return [];
}

/**
 * Lấy danh sách phim yêu thích (Watchlist) của 1 người dùng từ Supabase
 */
export async function getUserCloudWatchlist(userId: string): Promise<WatchlistItem[]> {
  if (!userId) return [];

  if (isSupabaseConfigured()) {
    try {
      const items = await getWatchlistSupabase(userId);
      if (items && items.length > 0) return items;
    } catch {}
  }
  return [];
}

/**
 * Xóa toàn bộ bình luận của một thành viên vi phạm (Dành cho Quản trị viên xóa hàng loạt spam)
 */
export async function deleteAllUserComments(userId: string): Promise<number> {
  if (!userId) return 0;

  if (isSupabaseConfigured()) {
    await deleteAllUserCommentsSupabase(userId);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("comments-updated", { detail: { userId } }));
    }
    return 1;
  }
  return 0;
}

/**
 * Lấy hồ sơ người dùng đầy đủ từ Supabase (bao gồm bio, sở thích, avatar tùy chỉnh)
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (!userId) return null;

  // 1. Đọc nhanh từ local cache
  const cached = getCachedUserProfile(userId);

  // 2. Đọc từ Supabase Database
  if (isSupabaseConfigured()) {
    try {
      const supaProfile = await getUserProfileSupabase(userId);
      if (supaProfile) {
        setCachedUserProfile(userId, supaProfile);
        return supaProfile;
      }
    } catch {}
  }

  return cached;
}

/**
 * Lắng nghe hồ sơ người dùng theo thời gian thực (Supabase + LocalStorage)
 */
export function subscribeUserProfile(
  userId: string,
  onUpdate: (profile: UserProfile | null) => void,
  _onError?: (err: Error) => void
): () => void {
  void _onError;
  if (!userId) {
    onUpdate(null);
    return () => {};
  }

  let isUnsubscribed = false;

  // 1. Phục vụ ngay từ Local cache (0ms delay)
  const cached = getCachedUserProfile(userId);
  if (cached) {
    onUpdate(cached);
  }

  // 2. Nạp từ Supabase Database
  const fetchProfile = () => {
    if (isUnsubscribed) return;
    if (isSupabaseConfigured()) {
      getUserProfileSupabase(userId)
        .then((profile) => {
          if (profile && !isUnsubscribed) {
            setCachedUserProfile(userId, profile);
            onUpdate(profile);
          }
        })
        .catch(() => {});
    }
  };

  fetchProfile();

  const handleUpdate = (e: Event) => {
    if (isUnsubscribed) return;
    const customEv = e as CustomEvent<{ userId?: string; profile?: UserProfile }>;
    if (customEv?.detail?.userId === userId && customEv?.detail?.profile) {
      onUpdate(customEv.detail.profile);
    } else {
      const freshCached = getCachedUserProfile(userId);
      if (freshCached) onUpdate(freshCached);
      fetchProfile();
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("user-profile-updated", handleUpdate);
  }

  return () => {
    isUnsubscribed = true;
    if (typeof window !== "undefined") {
      window.removeEventListener("user-profile-updated", handleUpdate);
    }
  };
}

/**
 * Cập nhật hồ sơ tùy chỉnh của người dùng (tên hiển thị, avatar, bio, sở thích)
 */
export async function updateUserProfile(
  authUser: BaseAuthUser | null,
  userId: string,
  data: {
    displayName?: string;
    photoURL?: string;
    bio?: string;
    favoriteGenres?: string[];
    customAvatar?: string;
    badges?: string[];
    watchTimeMinutes?: number;
  }
): Promise<void> {
  if (!userId) return;

  const currentCached = getCachedUserProfile(userId);
  const now = Date.now();

  const payload: Partial<UserProfile> = {
    ...currentCached,
    uid: userId,
    updatedAt: now,
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
  if (data.watchTimeMinutes !== undefined) {
    payload.watchTimeMinutes = data.watchTimeMinutes;
  }

  // 1. Cập nhật ngay lập tức vào Local cache (Optimistic UI 0ms)
  setCachedUserProfile(userId, payload);

  // 2. Lưu trực tiếp vào Supabase Database
  if (isSupabaseConfigured()) {
    try {
      await updateUserProfileSupabase(userId, {
        displayName: payload.displayName,
        photoURL: payload.photoURL,
        customAvatar: payload.customAvatar,
        bio: payload.bio,
        favoriteGenres: payload.favoriteGenres,
        badges: payload.badges,
        watchTimeMinutes: payload.watchTimeMinutes,
      });
    } catch (e) {
      console.warn("Lỗi lưu user profile vào Supabase:", e);
    }
  }

  // 3. Bắn event toàn cục để Navbar & UI tự động cập nhật
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("user-profile-updated", { detail: { userId, profile: payload } }));
  }
}

// Debounce timer for saving watch time to DB (reduces DB write calls by ~80%)
const watchTimeSaveTimers = new Map<string, NodeJS.Timeout>();

export async function incrementUserWatchTime(userId: string, minutes: number = 1): Promise<number> {
  if (!userId || minutes <= 0) return 0;

  try {
    const cached = getCachedUserProfile(userId);
    const prevMins = Number(cached?.watchTimeMinutes) || 0;
    const newMins = prevMins + minutes;

    // 1. Cập nhật ngay lập tức vào Local Cache để UI hiển thị tức thì 0ms
    const updatedProfile: UserProfile = {
      ...(cached || {
        uid: userId,
        email: "",
        displayName: "Thành viên",
        photoURL: "",
        role: "member",
        favoriteGenres: [],
        badges: [],
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
      }),
      watchTimeMinutes: newMins,
    };
    setCachedUserProfile(userId, updatedProfile);

    // 2. Cập nhật vào Supabase Database có Debounce (2 phút) để tránh spam request liên tục
    if (isSupabaseConfigured()) {
      if (watchTimeSaveTimers.has(userId)) {
        clearTimeout(watchTimeSaveTimers.get(userId));
      }
      const timer = setTimeout(() => {
        watchTimeSaveTimers.delete(userId);
        updateUserProfileSupabase(userId, { watchTimeMinutes: newMins }).catch(() => {});
      }, 120000);
      watchTimeSaveTimers.set(userId, timer);
    }

    // 3. Phát sự kiện đồng bộ toàn bộ UI (ProfileModal, Header, Leaderboard, Level Badge)
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("user-profile-updated", {
          detail: { userId, profile: updatedProfile },
        })
      );
      window.dispatchEvent(
        new CustomEvent("user-watch-time-updated", {
          detail: { userId, minutes, totalMinutes: newMins },
        })
      );
    }
    return newMins;
  } catch (err) {
    console.warn("Lỗi incrementUserWatchTime:", err);
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
 * Lấy danh sách Top Fan Cày Phim từ Supabase (Leaderboard) được tối ưu hóa Index
 */
export async function getTopWatchLeaderboard(maxLimit: number = 10): Promise<UserProfile[]> {
  if (isSupabaseConfigured()) {
    try {
      return await getTopWatchLeaderboardSupabase(maxLimit);
    } catch (err) {
      console.warn("Lỗi đọc Bảng Xếp Hạng Leaderboard:", err);
    }
  }
  return [];
}
