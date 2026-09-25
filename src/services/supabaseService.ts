import { supabase } from "@/lib/supabase";
import { MovieComment, CommentReactionType } from "@/types/comment";
import { UserProfile } from "@/types/user";
import { WatchHistoryItem } from "@/lib/watchHistory";
import { WatchlistItem } from "@/lib/watchlist";
import { MovieCollection } from "@/types/collection";
import { UserNotification } from "@/types/notification";

// ============================================================================
// 1. HỒ SƠ NGƯỜI DÙNG (PROFILES)
// ============================================================================

export async function upsertUserProfileSupabase(profile: Partial<UserProfile> & { uid: string }): Promise<void> {
  if (!profile.uid) return;
  try {
    const { auth } = await import("@/lib/firebase");
    const token = await auth?.currentUser?.getIdToken();
    if (token) {
      const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
      await fetch(`${baseUrl}/api/user/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          displayName: profile.displayName,
          photoURL: profile.photoURL,
          customAvatar: profile.customAvatar,
          bio: profile.bio,
          favoriteGenres: profile.favoriteGenres,
          badges: profile.badges,
          watchTimeMinutes: profile.watchTimeMinutes,
          playerSettings: profile.playerSettings,
        }),
      });
    }
  } catch (err) {
    console.warn("Lỗi lưu user profile qua API:", err);
  }
}

// In-memory micro-cache for user profiles (TTL 30s) to eliminate duplicate DB reads on comment threads
const profileMemoryCache = new Map<string, { data: UserProfile; expiry: number }>();
// In-flight Promise deduplication by userId
const inFlightProfilePromises = new Map<string, Promise<UserProfile | null>>();

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
            watchTimeMinutes: Number(d.watchTimeMinutes) || 0,
            role: d.role || "member",
            isCommentRestricted: Boolean(d.isCommentRestricted),
            createdAt: Number(d.createdAt) || Date.now(),
            lastLoginAt: Number(d.lastLoginAt) || Date.now(),
          };

          profileMemoryCache.set(userId, { data: profile, expiry: Date.now() + 30000 });
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
    const res = await fetch(`${baseUrl}/api/user/profile?all=true`, { cache: "no-store" });
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
    const { auth } = await import("@/lib/firebase");
    const token = await auth?.currentUser?.getIdToken();
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
    const { auth } = await import("@/lib/firebase");
    const token = await auth?.currentUser?.getIdToken();
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
    const { auth } = await import("@/lib/firebase");
    const token = await auth?.currentUser?.getIdToken();
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
} {
  const likedBy: string[] = [];
  const reactions: Record<string, CommentReactionType> = {};

  if (!likedByRaw) return { likedBy, reactions };

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
      if (uid) {
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

export async function getMovieCommentsSupabase(movieSlug: string): Promise<MovieComment[]> {
  if (!movieSlug) return [];

  const existingPromise = inFlightMovieCommentsPromises.get(movieSlug);
  if (existingPromise) {
    return existingPromise;
  }

  const fetchPromise = (async () => {
    try {
      const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
      const res = await fetch(`${baseUrl}/api/comments?movieSlug=${encodeURIComponent(movieSlug)}`, {
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
    const res = await fetch(`${baseUrl}/api/comments?userId=${encodeURIComponent(userId)}`, {
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
    const res = await fetch(`${baseUrl}/api/comments?parentId=${encodeURIComponent(parentId)}`, {
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

export async function postCommentSupabase(
  comment: Omit<MovieComment, "id" | "createdAt" | "updatedAt" | "likes" | "likedBy"> & {
    likes?: number;
    likedBy?: string[];
  }
): Promise<string> {
  const id = `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  try {
    const { auth } = await import("@/lib/firebase");
    const token = await auth?.currentUser?.getIdToken().catch(() => null);
    const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
    const res = await fetch(`${baseUrl}/api/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        movieSlug: comment.movieSlug,
        movieTitle: comment.movieTitle || "",
        rating: comment.rating || 5,
        content: comment.content,
        isSpoiler: Boolean(comment.isSpoiler),
        episodeSlug: comment.episodeSlug,
        episodeName: comment.episodeName,
        parentId: comment.parentId,
        parentOwnerId: comment.parentOwnerId,
        replyToUserId: comment.replyToUserId,
        replyToUserName: comment.replyToUserName,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.id) return data.id;
    }
  } catch (err) {
    console.warn("Lỗi postComment qua API:", err);
  }
  return id;
}

export async function updateCommentSupabase(
  commentId: string,
  data: Partial<{
    rating: number;
    content: string;
    episode_slug: string | null;
    episode_name: string | null;
    is_spoiler: boolean;
  }>
): Promise<void> {
  if (!commentId) return;
  try {
    const { auth } = await import("@/lib/firebase");
    const token = await auth?.currentUser?.getIdToken();
    if (token) {
      const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
      await fetch(`${baseUrl}/api/comments`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          commentId,
          rating: data.rating,
          content: data.content,
          isSpoiler: data.is_spoiler,
          episodeSlug: data.episode_slug,
          episodeName: data.episode_name,
        }),
      });
    }
  } catch (err) {
    console.warn("Lỗi update comment qua API:", err);
  }
}

export async function getAllCommentsSupabase(): Promise<MovieComment[]> {
  try {
    const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
    const res = await fetch(`${baseUrl}/api/comments?all=true`, {
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

export async function togglePinCommentSupabase(commentId: string, isPinned: boolean): Promise<void> {
  if (!commentId) return;
  try {
    const { auth } = await import("@/lib/firebase");
    const token = await auth?.currentUser?.getIdToken();
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

export async function setCommentReactionSupabase(
  commentId: string,
  userId: string,
  reactionType: string | null
): Promise<void> {
  if (!commentId || !userId) return;
  try {
    const { auth } = await import("@/lib/firebase");
    const token = await auth?.currentUser?.getIdToken();
    const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
    await fetch(`${baseUrl}/api/comments`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ commentId, userId, reactionType, action: "reaction" }),
    });
  } catch (err) {
    console.warn("Lỗi setCommentReaction qua API:", err);
  }
}

export async function deleteCommentSupabase(commentId: string): Promise<void> {
  if (!commentId) return;
  try {
    const { auth } = await import("@/lib/firebase");
    const token = await auth?.currentUser?.getIdToken();
    if (token) {
      const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
      await fetch(`${baseUrl}/api/comments?commentId=${encodeURIComponent(commentId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } catch (err) {
    console.warn("Lỗi deleteComment qua API:", err);
  }
}

export async function flagCommentSupabase(commentId: string, reason: string): Promise<void> {
  if (!commentId) return;
  try {
    const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
    await fetch(`${baseUrl}/api/comments`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId, reason, action: "flag" }),
    });
  } catch (err) {
    console.warn("Lỗi flagComment qua API:", err);
  }
}

export async function unflagCommentSupabase(commentId: string): Promise<void> {
  if (!commentId) return;
  try {
    const { auth } = await import("@/lib/firebase");
    const token = await auth?.currentUser?.getIdToken();
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

export async function syncWatchHistorySupabase(userId: string, items: WatchHistoryItem[]): Promise<void> {
  if (!userId || !items.length) return;
  try {
    const { auth } = await import("@/lib/firebase");
    const token = await auth?.currentUser?.getIdToken();
    if (token) {
      const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
      await fetch(`${baseUrl}/api/user/history`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ items }),
      });
    }
  } catch (err) {
    console.warn("Lỗi sync watch history qua API:", err);
  }
}

export async function getWatchHistorySupabase(userId: string): Promise<WatchHistoryItem[]> {
  if (!userId) return [];
  try {
    const { auth } = await import("@/lib/firebase");
    const token = await auth?.currentUser?.getIdToken();
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

export async function syncWatchlistSupabase(userId: string, items: WatchlistItem[]): Promise<void> {
  if (!userId || !items.length) return;
  try {
    const { auth } = await import("@/lib/firebase");
    const token = await auth?.currentUser?.getIdToken();
    if (token) {
      const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
      await fetch(`${baseUrl}/api/user/watchlist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ items }),
      });
    }
  } catch (err) {
    console.warn("Lỗi sync watchlist qua API:", err);
  }
}

export async function getWatchlistSupabase(userId: string): Promise<WatchlistItem[]> {
  if (!userId) return [];
  try {
    const { auth } = await import("@/lib/firebase");
    const token = await auth?.currentUser?.getIdToken();
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

export async function getUserCollectionsSupabase(userId: string): Promise<MovieCollection[]> {
  if (!userId) return [];
  try {
    const { auth } = await import("@/lib/firebase");
    const token = await auth?.currentUser?.getIdToken();
    const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
    const res = await fetch(`${baseUrl}/api/user/collections?userId=${encodeURIComponent(userId)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
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
  } catch (err) {
    console.warn("Lỗi lấy collections qua API:", err);
  }
  return [];
}

export async function saveCollectionSupabase(col: MovieCollection): Promise<void> {
  if (!col.id || !col.userId) return;
  try {
    const { auth } = await import("@/lib/firebase");
    const token = await auth?.currentUser?.getIdToken();
    if (token) {
      const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
      await fetch(`${baseUrl}/api/user/collections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(col),
      });
    }
  } catch (err) {
    console.warn("Lỗi lưu collection qua API:", err);
  }
}

export async function deleteCollectionSupabase(id: string): Promise<void> {
  if (!id) return;
  try {
    const { auth } = await import("@/lib/firebase");
    const token = await auth?.currentUser?.getIdToken();
    if (token) {
      const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
      await fetch(`${baseUrl}/api/user/collections?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } catch (err) {
    console.warn("Lỗi xóa collection qua API:", err);
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
    const { auth } = await import("@/lib/firebase");
    const token = await auth?.currentUser?.getIdToken();
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

export async function createNotificationSupabase(notif: UserNotification & { userId: string }): Promise<void> {
  if (!notif.userId) return;
  try {
    const { auth } = await import("@/lib/firebase");
    const token = await auth?.currentUser?.getIdToken();
    if (token) {
      const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
      await fetch(`${baseUrl}/api/notifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: notif.userId,
          notifId: notif.id,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          link: notif.link,
          movieSlug: notif.movieSlug,
          commentId: notif.commentId,
          replierName: notif.replierName,
          replierAvatar: notif.replierAvatar || notif.image,
        }),
      });
    }
  } catch (err) {
    console.warn("Lỗi tạo thông báo qua API:", err);
  }
}

export async function markNotificationAsReadSupabase(userId: string, notifId: string): Promise<void> {
  if (!userId || !notifId) return;
  try {
    const { auth } = await import("@/lib/firebase");
    const token = await auth?.currentUser?.getIdToken();
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
    const { auth } = await import("@/lib/firebase");
    const token = await auth?.currentUser?.getIdToken();
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
    const { auth } = await import("@/lib/firebase");
    const token = await auth?.currentUser?.getIdToken();
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

export async function removeWatchHistoryItemSupabase(userId: string, slug: string): Promise<void> {
  if (!userId || !slug) return;
  try {
    const { auth } = await import("@/lib/firebase");
    const token = await auth?.currentUser?.getIdToken();
    if (token) {
      const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
      await fetch(`${baseUrl}/api/user/history?slug=${encodeURIComponent(slug)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } catch (err) {
    console.warn("Lỗi xóa watch history item qua API:", err);
  }
}

export async function clearAllWatchHistorySupabase(userId: string): Promise<void> {
  if (!userId) return;
  try {
    const { auth } = await import("@/lib/firebase");
    const token = await auth?.currentUser?.getIdToken();
    if (token) {
      const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
      await fetch(`${baseUrl}/api/user/history?all=true`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } catch (err) {
    console.warn("Lỗi xóa all watch history qua API:", err);
  }
}

export async function removeWatchlistItemSupabase(userId: string, slug: string): Promise<void> {
  if (!userId || !slug) return;
  try {
    const { auth } = await import("@/lib/firebase");
    const token = await auth?.currentUser?.getIdToken();
    if (token) {
      const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
      await fetch(`${baseUrl}/api/user/watchlist?slug=${encodeURIComponent(slug)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } catch (err) {
    console.warn("Lỗi xóa watchlist item qua API:", err);
  }
}

export async function clearAllWatchlistSupabase(userId: string): Promise<void> {
  if (!userId) return;
  try {
    const { auth } = await import("@/lib/firebase");
    const token = await auth?.currentUser?.getIdToken();
    if (token) {
      const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
      await fetch(`${baseUrl}/api/user/watchlist?all=true`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } catch (err) {
    console.warn("Lỗi xóa all watchlist qua API:", err);
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
  if (!supabase || !userId) return null;
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
  if (!supabase || !userId) return null;
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

// ============================================================================
// 6. POSTGRES FULL-TEXT SEARCH (RPC)
// ============================================================================

export async function searchCommentsFtsSupabase(searchTerm: string): Promise<MovieComment[]> {
  if (!supabase || !searchTerm.trim()) return [];
  try {
    const { data, error } = await supabase.rpc("search_comments_fts", {
      search_term: searchTerm.trim(),
    });

    if (error || !data) return [];
    return (data as Record<string, unknown>[]).map((d) => {
      const { likedBy, reactions } = parseReactionsAndLikedBy(d.liked_by);
      return {
        id: String(d.id),
        movieSlug: String(d.movie_slug || ""),
        movieTitle: String(d.movie_title || ""),
        userId: String(d.user_id || ""),
        userName: String(d.user_name || "Thành viên"),
        userAvatar: String(d.user_avatar || ""),
        userEmail: d.user_email ? String(d.user_email) : undefined,
        rating: Number(d.rating) || 5,
        content: String(d.content || ""),
        episodeSlug: d.episode_slug ? String(d.episode_slug) : undefined,
        episodeName: d.episode_name ? String(d.episode_name) : undefined,
        parentId: d.parent_id ? String(d.parent_id) : undefined,
        parentOwnerId: d.parent_owner_id ? String(d.parent_owner_id) : undefined,
        replyToUserId: d.reply_to_user_id ? String(d.reply_to_user_id) : undefined,
        replyToUserName: d.reply_to_user_name ? String(d.reply_to_user_name) : undefined,
        isSpoiler: Boolean(d.is_spoiler),
        likes: Math.max(Number(d.likes) || 0, likedBy.length),
        likedBy,
        reactions,
        isFlagged: Boolean(d.is_flagged),
        flagReason: d.flag_reason ? String(d.flag_reason) : undefined,
        isApproved: d.is_approved !== false,
        isPinned: Boolean(d.is_pinned),
        createdAt: Number(d.created_at) || Date.now(),
        updatedAt: Number(d.updated_at) || Date.now(),
      };
    });
  } catch {
    return [];
  }
}

export async function searchCollectionsFtsSupabase(searchTerm: string): Promise<MovieCollection[]> {
  if (!supabase || !searchTerm.trim()) return [];
  try {
    const { data, error } = await supabase.rpc("search_collections_fts", {
      search_term: searchTerm.trim(),
    });

    if (error || !data) return [];
    return (data as Record<string, unknown>[]).map((d) => ({
      id: String(d.id),
      userId: String(d.user_id),
      creatorName: String(d.user_name || "Thành viên Nanaflix"),
      creatorPhoto: d.user_avatar ? String(d.user_avatar) : undefined,
      name: String(d.name || ""),
      description: String(d.description || ""),
      isPublic: Boolean(d.is_public),
      movies: Array.isArray(d.movies) ? (d.movies as MovieCollection["movies"]) : [],
      createdAt: Number(d.created_at) || Date.now(),
      updatedAt: Number(d.updated_at) || Date.now(),
    }));
  } catch {
    return [];
  }
}



// ============================================================================
// 10. TIẾP TỤC XEM ĐA THIẾT BỊ (DEVICE_HANDOFF)
// ============================================================================

export interface DeviceHandoffItem {
  id: string; // userId
  userId: string;
  movieSlug: string;
  movieTitle: string;
  poster?: string;
  episodeSlug?: string;
  episodeName?: string;
  progressSeconds: number;
  durationSeconds?: number;
  deviceName?: string;
  updatedAt: number;
}

const inFlightDeviceHandoffSave = new Map<string, Promise<void>>();
const inFlightDeviceHandoffGet = new Map<string, Promise<DeviceHandoffItem | null>>();

export async function saveDeviceHandoffSupabase(item: DeviceHandoffItem): Promise<void> {
  if (!item.userId) return;
  const dedupKey = `${item.userId}:${item.movieSlug}`;
  const existing = inFlightDeviceHandoffSave.get(dedupKey);
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    try {
      const { auth } = await import("@/lib/firebase");
      const token = await auth?.currentUser?.getIdToken();
      if (!token) return;
      const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
      await fetch(`${baseUrl}/api/user/handoff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          movieSlug: item.movieSlug,
          movieTitle: item.movieTitle,
          poster: item.poster,
          episodeSlug: item.episodeSlug,
          episodeName: item.episodeName,
          progressSeconds: item.progressSeconds,
          durationSeconds: item.durationSeconds,
          deviceName: item.deviceName,
        }),
      });
    } catch (err) {
      console.warn("Lỗi lưu device handoff qua API:", err);
    } finally {
      inFlightDeviceHandoffSave.delete(dedupKey);
    }
  })();

  inFlightDeviceHandoffSave.set(dedupKey, promise);
  return promise;
}

export async function getDeviceHandoffSupabase(userId: string): Promise<DeviceHandoffItem | null> {
  if (!userId) return null;
  const existing = inFlightDeviceHandoffGet.get(userId);
  if (existing) {
    return existing;
  }

  const promise = (async (): Promise<DeviceHandoffItem | null> => {
    try {
      const { auth } = await import("@/lib/firebase");
      const token = await auth?.currentUser?.getIdToken();
      if (!token) return null;
      const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
      const res = await fetch(`${baseUrl}/api/user/handoff`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.item) {
          const d = data.item;
          return {
            id: userId,
            userId: d.userId || userId,
            movieSlug: d.movieSlug,
            movieTitle: d.movieTitle,
            poster: d.poster,
            episodeSlug: d.episodeSlug,
            episodeName: d.episodeName,
            progressSeconds: Number(d.progressSeconds) || 0,
            durationSeconds: Number(d.durationSeconds) || 0,
            deviceName: d.deviceName,
            updatedAt: Number(d.updatedAt) || Date.now(),
          };
        }
      }
    } catch (err) {
      console.warn("Lỗi lấy device handoff qua API:", err);
    } finally {
      inFlightDeviceHandoffGet.delete(userId);
    }
    return null;
  })();

  inFlightDeviceHandoffGet.set(userId, promise);
  return promise;
}

export async function getAllDeviceHandoffsSupabase(): Promise<DeviceHandoffItem[]> {
  try {
    const { auth } = await import("@/lib/firebase");
    const token = await auth?.currentUser?.getIdToken();
    if (!token) return [];
    const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
    const res = await fetch(`${baseUrl}/api/user/handoff?all=true`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        return data.items.map((d: Record<string, unknown>) => ({
          id: String(d.id || d.userId || ""),
          userId: String(d.userId || d.user_id || ""),
          movieSlug: String(d.movieSlug || d.movie_slug || ""),
          movieTitle: String(d.movieTitle || d.movie_title || ""),
          poster: d.poster ? String(d.poster) : undefined,
          episodeSlug: d.episodeSlug ? String(d.episodeSlug) : undefined,
          episodeName: d.episodeName ? String(d.episodeName) : undefined,
          progressSeconds: Number(d.progressSeconds || d.progress_seconds) || 0,
          durationSeconds: Number(d.durationSeconds || d.duration_seconds) || 0,
          deviceName: d.deviceName ? String(d.deviceName) : undefined,
          updatedAt: Number(d.updatedAt || d.updated_at) || Date.now(),
        }));
      }
    }
  } catch {
    // ignore
  }
  return [];
}

export async function clearDeviceHandoffSupabase(userId: string): Promise<void> {
  if (!userId) return;
  try {
    const { auth } = await import("@/lib/firebase");
    const token = await auth?.currentUser?.getIdToken();
    if (!token) return;
    const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
    await fetch(`${baseUrl}/api/user/handoff`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    console.warn("Lỗi clear device handoff qua API:", err);
  }
}

export type { MovieViewStatItem } from "./communityWatchService";



