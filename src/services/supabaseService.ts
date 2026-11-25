import { MovieComment, CommentReactionType } from "@/types/comment";
import { UserProfile } from "@/types/user";
import { WatchHistoryItem } from "@/lib/watchHistory";
import { WatchlistItem } from "@/lib/watchlist";
import { MovieCollection } from "@/types/collection";
import { UserNotification } from "@/types/notification";

// ============================================================================
// 1. HỒ SƠ NGƯỜI DÙNG (PROFILES)
// ============================================================================

import { setBoundedMap } from "@/lib/boundedMap";
import { getFirebaseIdToken } from "@/lib/clientAuth";

// In-memory micro-cache for user profiles (TTL 5 phút) để triệt tiêu request trùng lặp khi điều hướng trang
const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000;
const profileMemoryCache = new Map<string, { data: UserProfile; expiry: number }>();
// In-flight Promise deduplication by userId
const inFlightProfilePromises = new Map<string, Promise<UserProfile | null>>();

export function invalidateUserProfileCache(userId: string): void {
  if (!userId) return;
  profileMemoryCache.delete(userId);
  inFlightProfilePromises.delete(userId);
}

export function setProfileMemoryCache(userId: string, profile: UserProfile): void {
  if (!userId || !profile) return;
  setBoundedMap(profileMemoryCache, userId, { data: profile, expiry: Date.now() + PROFILE_CACHE_TTL_MS }, 500);
  inFlightProfilePromises.delete(userId);
}

export async function getUserProfileSupabase(userId: string): Promise<UserProfile | null> {
  if (!userId) return null;

  const now = Date.now();
  const cached = profileMemoryCache.get(userId);
  if (cached && cached.expiry > now) {
    return cached.data;
  }

  const existingPromise = inFlightProfilePromises.get(userId);
  if (existingPromise) {
    return existingPromise;
  }

  const fetchPromise = (async () => {
    try {
      const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
      const res = await fetch(`${baseUrl}/api/user/profile?userId=${encodeURIComponent(userId)}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.profile) {
          const d = data.profile;
          const profile: UserProfile = {
            uid: d.uid,
            email: d.email || "",
            displayName: d.displayName || "Thành viên",
            photoURL: d.photoURL || d.customAvatar || "",
            customAvatar: d.customAvatar,
            bio: d.bio,
            favoriteGenres: d.favoriteGenres || [],
            badges: d.badges || [],
            playerSettings: d.playerSettings || undefined,
            watchTimeMinutes: Number(d.watchTimeMinutes) || 0,
            role: d.role || "member",
            isCommentRestricted: Boolean(d.isCommentRestricted),
            createdAt: Number(d.createdAt) || Date.now(),
            lastLoginAt: Number(d.lastLoginAt) || Date.now(),
            updatedAt: Number(d.updatedAt) || Date.now(),
          };

          setBoundedMap(profileMemoryCache, userId, { data: profile, expiry: Date.now() + PROFILE_CACHE_TTL_MS }, 500);
          return profile;
        }
      }
      return null;
    } catch {
      return null;
    }
  })().finally(() => {
    inFlightProfilePromises.delete(userId);
  });

  inFlightProfilePromises.set(userId, fetchPromise);
  return fetchPromise;
}

export async function getAllProfilesSupabase(): Promise<{ profiles: UserProfile[]; totalCount: number }> {
  try {
    const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
    const token = await getFirebaseIdToken();
    if (!token) {
      return { profiles: [], totalCount: 0 };
    }

    const res = await fetch(`${baseUrl}/api/user/profile?all=true`, {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.ok) {
      const apiRes = await res.json();
      if (apiRes.success && Array.isArray(apiRes.profiles)) {
        return {
          profiles: apiRes.profiles,
          totalCount: typeof apiRes.totalCount === "number" ? apiRes.totalCount : apiRes.profiles.length,
        };
      }
    }
  } catch (apiErr) {
    console.warn("[AdminMembers] Failed to fetch all profiles via API:", apiErr);
  }

  return { profiles: [], totalCount: 0 };
}

export async function updateUserProfileSupabase(
  userId: string,
  data: Partial<{
    displayName: string;
    photoURL: string;
    bio: string;
    favoriteGenres: string[];
    customAvatar: string;
    badges: string[];
    watchTimeMinutes: number;
    role: "admin" | "member";
  }>
): Promise<void> {
  if (!userId) return;
  try {
    const token = await getFirebaseIdToken();
    if (token) {
      const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
      await fetch(`${baseUrl}/api/user/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          displayName: data.displayName,
          photoURL: data.photoURL,
          customAvatar: data.customAvatar,
          bio: data.bio,
          favoriteGenres: data.favoriteGenres,
          badges: data.badges,
          watchTimeMinutes: data.watchTimeMinutes,
        }),
      });
    }
  } catch (err) {
    console.warn("Lỗi update user profile qua API:", err);
  }
}

export async function setUserCommentRestrictionSupabase(
  userId: string,
  isRestricted: boolean,
  reason?: string
): Promise<void> {
  if (!userId) return;
  try {
    const token = await getFirebaseIdToken();
    if (token) {
      const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
      await fetch(`${baseUrl}/api/user/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          isCommentRestricted: isRestricted,
          reason,
        }),
      });
    }
  } catch (err) {
    console.warn("Lỗi update comment restriction qua API:", err);
  }
}

export async function deleteAllUserCommentsSupabase(userId: string): Promise<void> {
  if (!userId) return;
  try {
    const token = await getFirebaseIdToken();
    if (token) {
      const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
      await fetch(`${baseUrl}/api/comments?userId=${encodeURIComponent(userId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } catch (err) {
    console.warn("Lỗi xóa comments của user qua API:", err);
  }
}

// ============================================================================
// 2. BÌNH LUẬN & ĐÁNH GIÁ (COMMENTS)
// ============================================================================

export function parseReactionsAndLikedBy(likedByRaw: unknown): {
  likedBy: string[];
  reactions: Record<string, CommentReactionType>;
  editedAt?: number;
} {
  const likedBy: string[] = [];
  const reactions: Record<string, CommentReactionType> = {};
  let editedAt: number | undefined = undefined;

  if (!likedByRaw) return { likedBy, reactions, editedAt };

  if (Array.isArray(likedByRaw)) {
    likedByRaw.forEach((item) => {
      if (typeof item === "string" && item) {
        likedBy.push(item);
        reactions[item] = "like";
      } else if (item && typeof item === "object" && "userId" in item) {
        const uId = String((item as { userId: string }).userId);
        const rType = ((item as { type?: string }).type as CommentReactionType) || "like";
        if (uId) {
          likedBy.push(uId);
          reactions[uId] = rType;
        }
      }
    });
  } else if (typeof likedByRaw === "object") {
    Object.entries(likedByRaw as Record<string, unknown>).forEach(([uid, val]) => {
      if (uid === "__edited_at") {
        editedAt = Number(val) || undefined;
        return;
      }
      if (uid && !uid.startsWith("__")) {
        likedBy.push(uid);
        if (typeof val === "string" && ["like", "love", "haha", "wow", "sad", "angry"].includes(val)) {
          reactions[uid] = val as CommentReactionType;
        } else {
          reactions[uid] = "like";
        }
      }
    });
  }

  return { likedBy, reactions };
}

// In-flight Promise deduplication by movieSlug
const inFlightMovieCommentsPromises = new Map<string, Promise<MovieComment[]>>();

export async function getMovieCommentsSupabase(movieSlug: string, fresh = false): Promise<MovieComment[]> {
  if (!movieSlug) return [];

  // Khi yêu cầu fresh, bỏ qua existing in-flight cache promise để lấy trực tiếp dữ liệu mới nhất
  const existingPromise = !fresh ? inFlightMovieCommentsPromises.get(movieSlug) : undefined;
  if (existingPromise) {
    return existingPromise;
  }

  const fetchPromise = (async () => {
    try {
      const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
      const url = fresh
        ? `${baseUrl}/api/comments?movieSlug=${encodeURIComponent(movieSlug)}&fresh=true`
        : `${baseUrl}/api/comments?movieSlug=${encodeURIComponent(movieSlug)}`;
      const res = await fetch(url, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.items)) {
          return data.items;
        }
      }
    } catch {
      return [];
    }
    return [];
  })().finally(() => {
    inFlightMovieCommentsPromises.delete(movieSlug);
  });

  inFlightMovieCommentsPromises.set(movieSlug, fetchPromise);
  return fetchPromise;
}

export async function getUserCommentsSupabase(userId: string): Promise<MovieComment[]> {
  if (!userId) return [];
  try {
    const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
    const res = await fetch(`${baseUrl}/api/comments?userId=${encodeURIComponent(userId)}&_t=${Date.now()}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        return data.items;
      }
    }
  } catch {
    return [];
  }
  return [];
}

export async function getCommentRepliesSupabase(parentId: string): Promise<MovieComment[]> {
  if (!parentId) return [];
  try {
    const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
    const res = await fetch(`${baseUrl}/api/comments?parentId=${encodeURIComponent(parentId)}&_t=${Date.now()}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        return data.items;
      }
    }
  } catch {
    return [];
  }
  return [];
}

export async function getAllCommentsSupabase(): Promise<MovieComment[]> {
  try {
    const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
    const token = await getFirebaseIdToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${baseUrl}/api/comments?all=true&_t=${Date.now()}`, {
      cache: "no-store",
      headers,
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        return data.items;
      }
    }
  } catch {
    return [];
  }
  return [];
}

export async function togglePinCommentSupabase(commentId: string, isPinned: boolean): Promise<void> {
  if (!commentId) return;
  try {
    const token = await getFirebaseIdToken();
    if (token) {
      const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
      await fetch(`${baseUrl}/api/comments`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ commentId, isPinned, action: "pin" }),
      });
    }
  } catch (err) {
    console.warn("Lỗi togglePinComment qua API:", err);
  }
}

export async function flagCommentSupabase(commentId: string, reason: string): Promise<void> {
  if (!commentId) return;
  try {
    const token = await getFirebaseIdToken();
    if (!token) return;

    const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
    await fetch(`${baseUrl}/api/comments`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ commentId, reason, action: "flag" }),
    });
  } catch (err) {
    console.warn("Lỗi flagComment qua API:", err);
  }
}

export async function unflagCommentSupabase(commentId: string): Promise<void> {
  if (!commentId) return;
  try {
    const token = await getFirebaseIdToken();
    if (token) {
      const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
      await fetch(`${baseUrl}/api/comments`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ commentId, action: "unflag" }),
      });
    }
  } catch (err) {
    console.warn("Lỗi unflagComment qua API:", err);
  }
}

// ============================================================================
// 3. LỊCH SỬ XEM & DANH SÁCH YÊU THÍCH (HISTORY & WATCHLIST)
// ============================================================================

export async function getWatchHistorySupabase(userId: string): Promise<WatchHistoryItem[]> {
  if (!userId) return [];
  try {
    const token = await getFirebaseIdToken();
    if (token) {
      const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
      const res = await fetch(`${baseUrl}/api/user/history?userId=${encodeURIComponent(userId)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.items)) {
          return data.items;
        }
      }
    }
  } catch (err) {
    console.warn("Lỗi lấy watch history qua API:", err);
  }
  return [];
}

export async function getWatchlistSupabase(userId: string): Promise<WatchlistItem[]> {
  if (!userId) return [];
  try {
    const token = await getFirebaseIdToken();
    if (token) {
      const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
      const res = await fetch(`${baseUrl}/api/user/watchlist?userId=${encodeURIComponent(userId)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.items)) {
          return data.items;
        }
      }
    }
  } catch (err) {
    console.warn("Lỗi lấy watchlist qua API:", err);
  }
  return [];
}

// ============================================================================
// 4. BỘ SƯU TẬP (COLLECTIONS) & THÔNG BÁO (NOTIFICATIONS)
// ============================================================================

export type SupabaseCollectionsResult =
  | { status: "success"; items: MovieCollection[] }
  | { status: "unauthorized" | "forbidden" | "network_error" | "server_error"; error?: string };

export async function getUserCollectionsSupabase(userId: string): Promise<SupabaseCollectionsResult> {
  if (!userId) {
    return { status: "unauthorized", error: "Missing userId" };
  }
  try {
    const token = await getFirebaseIdToken();
    if (!token) {
      // Bảo vệ riêng tư: Không có token xác thực tuyệt đối không gọi endpoint public ?userId=...
      // vì server sẽ lọc mất các bộ sưu tập riêng tư của chính user này
      return { status: "unauthorized", error: "No auth token available" };
    }

    const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
    const res = await fetch(`${baseUrl}/api/user/collections?userId=${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (res.status === 401) {
      return { status: "unauthorized", error: "Unauthorized 401" };
    }
    if (res.status === 403) {
      return { status: "forbidden", error: "Forbidden 403" };
    }
    if (!res.ok) {
      return { status: "server_error", error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    if (data.success && Array.isArray(data.items)) {
      const items = (data.items as Array<Record<string, unknown>>).map((d) => ({
        id: String(d.id),
        userId: String(d.user_id || d.userId || ""),
        creatorName: String(d.user_name || d.creatorName || "Thành viên Nanaflix"),
        creatorPhoto: d.user_avatar ? String(d.user_avatar) : (d.creatorPhoto ? String(d.creatorPhoto) : undefined),
        name: String(d.name || ""),
        description: String(d.description || ""),
        isPublic: Boolean(d.is_public ?? d.isPublic ?? true),
        movies: Array.isArray(d.movies) ? (d.movies as MovieCollection["movies"]) : [],
        createdAt: Number(d.created_at || d.createdAt) || Date.now(),
        updatedAt: Number(d.updated_at || d.updatedAt) || Date.now(),
      }));
      return { status: "success", items };
    }

    return { status: "server_error", error: "Invalid response format" };
  } catch (err: unknown) {
    console.warn("Lỗi lấy collections qua API fallback:", err);
    return { status: "network_error", error: err instanceof Error ? err.message : String(err) };
  }
}

export async function getPublicCollectionsSupabase(): Promise<MovieCollection[]> {
  try {
    const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
    const res = await fetch(`${baseUrl}/api/user/collections?public=true`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        return (data.items as Array<Record<string, unknown>>).map((d) => ({
          id: String(d.id),
          userId: String(d.user_id || d.userId || ""),
          creatorName: String(d.user_name || d.creatorName || "Thành viên Nanaflix"),
          creatorPhoto: d.user_avatar ? String(d.user_avatar) : (d.creatorPhoto ? String(d.creatorPhoto) : undefined),
          name: String(d.name || ""),
          description: String(d.description || ""),
          isPublic: Boolean(d.is_public ?? d.isPublic ?? true),
          movies: Array.isArray(d.movies) ? (d.movies as MovieCollection["movies"]) : [],
          createdAt: Number(d.created_at || d.createdAt) || Date.now(),
          updatedAt: Number(d.updated_at || d.updatedAt) || Date.now(),
        }));
      }
    }
  } catch {
    return [];
  }
  return [];
}

export async function getUserNotificationsSupabase(userId: string): Promise<UserNotification[]> {
  if (!userId) return [];
  try {
    const token = await getFirebaseIdToken();
    if (token) {
      const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
      const res = await fetch(`${baseUrl}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.items)) {
          return data.items;
        }
      }
    }
  } catch (err) {
    console.warn("Lỗi lấy thông báo qua API:", err);
  }
  return [];
}

export async function markNotificationAsReadSupabase(userId: string, notifId: string): Promise<void> {
  if (!userId || !notifId) return;
  try {
    const token = await getFirebaseIdToken();
    if (token) {
      const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
      await fetch(`${baseUrl}/api/notifications`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notifId }),
      });
    }
  } catch (err) {
    console.warn("Lỗi update notification qua API:", err);
  }
}

export async function markAllNotificationsAsReadSupabase(userId: string): Promise<void> {
  if (!userId) return;
  try {
    const token = await getFirebaseIdToken();
    if (token) {
      const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
      await fetch(`${baseUrl}/api/notifications`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ all: true }),
      });
    }
  } catch (err) {
    console.warn("Lỗi mark all notifications qua API:", err);
  }
}

export async function deleteNotificationSupabase(userId: string, notifId: string): Promise<void> {
  if (!userId || !notifId) return;
  try {
    const token = await getFirebaseIdToken();
    if (token) {
      const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
      await fetch(`${baseUrl}/api/notifications?notifId=${encodeURIComponent(notifId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } catch (err) {
    console.warn("Lỗi delete notification qua API:", err);
  }
}

// ============================================================================
// 5. SUPABASE STORAGE (KHO LƯU TRỮ AVATAR & BỘ SƯU TẬP)
// ============================================================================

export async function uploadAvatarSupabase(
  userId: string,
  fileOrBlob: Blob | File,
  fileExt: string = "jpg"
): Promise<string | null> {
  if (!userId) return null;
  // 1. Ưu tiên upload qua Server API /api/user/avatar (Lưu trữ Cloudflare R2 vĩnh viễn, 0đ egress)
  try {
    const token = await getFirebaseIdToken();
    if (token) {
      const formData = new FormData();
      formData.append("file", fileOrBlob, `avatar.${fileExt}`);
      const res = await fetch("/api/user/avatar", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.avatarUrl) {
          return data.avatarUrl;
        }
      }
    }
  } catch (apiErr) {
    console.warn("Lỗi API upload avatar R2:", apiErr);
  }

  // 2. Dự phòng trực tiếp Supabase Storage nếu không có mạng API
  const { supabase } = await import("@/lib/supabase");
  if (!supabase) return null;
  try {
    const fileName = `${userId}_${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, fileOrBlob, {
        upsert: true,
        contentType: fileOrBlob.type || "image/jpeg",
      });

    if (uploadError) {
      console.warn("Lỗi upload avatar lên Supabase Storage:", uploadError.message);
      return null;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
    return data?.publicUrl || null;
  } catch (err) {
    console.warn("Lỗi ngoại lệ upload avatar Supabase:", err);
    return null;
  }
}

export async function uploadCollectionCoverSupabase(
  userId: string,
  fileOrBlob: Blob | File,
  fileExt: string = "jpg"
): Promise<string | null> {
  if (!userId) return null;
  // 1. Ưu tiên upload qua Server API /api/user/collections/cover (Lưu trữ Cloudflare R2 vĩnh viễn)
  try {
    const token = await getFirebaseIdToken();
    if (token) {
      const formData = new FormData();
      formData.append("file", fileOrBlob, `cover.${fileExt}`);
      const res = await fetch("/api/user/collections/cover", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.coverUrl) {
          return data.coverUrl;
        }
      }
    }
  } catch (apiErr) {
    console.warn("Lỗi API upload collection cover R2:", apiErr);
  }

  // 2. Dự phòng trực tiếp Supabase Storage
  const { supabase } = await import("@/lib/supabase");
  if (!supabase) return null;
  try {
    const fileName = `${userId}_${Date.now()}.${fileExt}`;
    const filePath = `covers/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("collection-covers")
      .upload(filePath, fileOrBlob, {
        upsert: true,
        contentType: fileOrBlob.type || "image/jpeg",
      });

    if (uploadError) {
      console.warn("Lỗi upload cover lên Supabase Storage:", uploadError.message);
      return null;
    }

    const { data } = supabase.storage.from("collection-covers").getPublicUrl(filePath);
    return data?.publicUrl || null;
  } catch (err) {
    console.warn("Lỗi ngoại lệ upload collection cover Supabase:", err);
    return null;
  }
}

export type { MovieViewStatItem } from "./communityWatchService";



