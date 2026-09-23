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

export async function getUserProfileSupabase(userId: string): Promise<UserProfile | null> {
  if (!supabase || !userId) return null;

  const now = Date.now();
  const cached = profileMemoryCache.get(userId);
  if (cached && cached.expiry > now) {
    return cached.data;
  }

  try {
    const { data, error } = await supabase
      .from("public_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) return null;

    const profile: UserProfile = {
      uid: data.id,
      email: "",
      displayName: data.display_name || "Thành viên",
      photoURL: data.photo_url || data.custom_avatar || "",
      customAvatar: data.custom_avatar,
      bio: data.bio,
      favoriteGenres: [],
      badges: data.badges || [],
      watchTimeMinutes: Number(data.watch_time_minutes) || 0,
      role: "member",
      createdAt: Number(data.created_at) || Date.now(),
      lastLoginAt: Number(data.last_login_at) || Date.now(),
    };

    profileMemoryCache.set(userId, { data: profile, expiry: now + 30000 });
    return profile;
  } catch {
    return null;
  }
}

export async function getTopWatchLeaderboardSupabase(limit: number = 10): Promise<UserProfile[]> {
  try {
    const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
    const res = await fetch(`${baseUrl}/api/user/profile?leaderboard=true&limit=${limit}`, { cache: "no-store" });
    if (res.ok) {
      const apiRes = await res.json();
      if (apiRes.success && Array.isArray(apiRes.leaderboard)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return apiRes.leaderboard.map((d: any) => ({
          uid: d.uid,
          email: "",
          displayName: d.displayName || "Thành viên",
          photoURL: d.photoURL || d.customAvatar || "",
          customAvatar: d.customAvatar,
          badges: d.badges || [],
          watchTimeMinutes: d.watchTimeMinutes || 0,
          role: "member",
        }));
      }
    }
    return [];
  } catch (err) {
    console.warn("[Leaderboard] Error fetching top watch leaderboard:", err);
    return [];
  }
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
  if (!supabase || !userId) return;
  try {
    await supabase.from("movie_comments").delete().eq("user_id", userId);
  } catch (err) {
    console.warn("Lỗi xóa comments của user trên Supabase:", err);
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

export async function getMovieCommentsSupabase(movieSlug: string): Promise<MovieComment[]> {
  if (!supabase || !movieSlug) return [];
  try {
    const { data, error } = await supabase
      .from("movie_comments")
      .select("*")
      .eq("movie_slug", movieSlug)
      .order("created_at", { ascending: false });

    if (error || !data) return [];

    return data.map((d) => {
      const { likedBy, reactions } = parseReactionsAndLikedBy(d.liked_by);
      return {
        id: d.id,
        movieSlug: d.movie_slug,
        movieTitle: d.movie_title || "",
        userId: d.user_id,
        userName: d.user_name || "Thành viên",
        userAvatar: d.user_avatar || "",
        userEmail: d.user_email,
        rating: d.rating || 5,
        content: d.content || "",
        episodeSlug: d.episode_slug,
        episodeName: d.episode_name,
        parentId: d.parent_id,
        parentOwnerId: d.parent_owner_id,
        replyToUserId: d.reply_to_user_id,
        replyToUserName: d.reply_to_user_name,
        isSpoiler: Boolean(d.is_spoiler),
        likes: Math.max(d.likes || 0, likedBy.length),
        likedBy,
        reactions,
        isFlagged: Boolean(d.is_flagged),
        flagReason: d.flag_reason,
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

export async function getUserCommentsSupabase(userId: string): Promise<MovieComment[]> {
  if (!supabase || !userId) return [];
  try {
    const { data, error } = await supabase
      .from("movie_comments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error || !data) return [];
    return data.map((d) => {
      const { likedBy, reactions } = parseReactionsAndLikedBy(d.liked_by);
      return {
        id: d.id,
        movieSlug: d.movie_slug,
        movieTitle: d.movie_title || "",
        userId: d.user_id,
        userName: d.user_name || "Thành viên",
        userAvatar: d.user_avatar || "",
        userEmail: d.user_email,
        rating: d.rating || 5,
        content: d.content || "",
        episodeSlug: d.episode_slug,
        episodeName: d.episode_name,
        parentId: d.parent_id,
        parentOwnerId: d.parent_owner_id,
        replyToUserId: d.reply_to_user_id,
        replyToUserName: d.reply_to_user_name,
        isSpoiler: Boolean(d.is_spoiler),
        likes: Math.max(d.likes || 0, likedBy.length),
        likedBy,
        reactions,
        isFlagged: Boolean(d.is_flagged),
        flagReason: d.flag_reason,
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

export async function getCommentRepliesSupabase(parentId: string): Promise<MovieComment[]> {
  if (!supabase || !parentId) return [];
  try {
    const { data, error } = await supabase
      .from("movie_comments")
      .select("*")
      .eq("parent_id", parentId)
      .order("created_at", { ascending: true })
      .limit(50);

    if (error || !data) return [];
    return data.map((d) => {
      const { likedBy, reactions } = parseReactionsAndLikedBy(d.liked_by);
      return {
        id: d.id,
        movieSlug: d.movie_slug,
        movieTitle: d.movie_title || "",
        userId: d.user_id,
        userName: d.user_name || "Thành viên",
        userAvatar: d.user_avatar || "",
        userEmail: d.user_email,
        rating: d.rating || 0,
        content: d.content || "",
        episodeSlug: d.episode_slug,
        episodeName: d.episode_name,
        parentId: d.parent_id,
        parentOwnerId: d.parent_owner_id,
        replyToUserId: d.reply_to_user_id,
        replyToUserName: d.reply_to_user_name,
        isSpoiler: Boolean(d.is_spoiler),
        likes: Math.max(d.likes || 0, likedBy.length),
        likedBy,
        reactions,
        isFlagged: Boolean(d.is_flagged),
        flagReason: d.flag_reason,
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

export async function postCommentSupabase(
  comment: Omit<MovieComment, "id" | "createdAt" | "updatedAt" | "likes" | "likedBy"> & {
    likes?: number;
    likedBy?: string[];
  }
): Promise<string> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình");

  const id = `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = Date.now();

  const payload = {
    id,
    movie_slug: comment.movieSlug,
    movie_title: comment.movieTitle || "",
    user_id: comment.userId,
    user_name: comment.userName || "Thành viên",
    user_avatar: comment.userAvatar || "",
    user_email: comment.userEmail || "",
    rating: comment.rating || 5,
    content: comment.content,
    episode_slug: comment.episodeSlug || null,
    episode_name: comment.episodeName || null,
    parent_id: comment.parentId || null,
    parent_owner_id: comment.parentOwnerId || null,
    reply_to_user_id: comment.replyToUserId || null,
    reply_to_user_name: comment.replyToUserName || null,
    is_spoiler: Boolean(comment.isSpoiler),
    likes: 0,
    liked_by: [],
    is_flagged: false,
    is_approved: true,
    is_pinned: false,
    created_at: now,
    updated_at: now,
  };

  const { error } = await supabase.from("movie_comments").insert(payload);
  if (error) {
    throw new Error(error.message);
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
  if (!supabase || !commentId) return;
  try {
    const payload: Record<string, unknown> = {
      updated_at: Date.now(),
    };
    if (data.rating !== undefined) payload.rating = data.rating;
    if (data.content !== undefined) payload.content = data.content;
    if (data.episode_slug !== undefined) payload.episode_slug = data.episode_slug;
    if (data.episode_name !== undefined) payload.episode_name = data.episode_name;
    if (data.is_spoiler !== undefined) payload.is_spoiler = data.is_spoiler;

    await supabase.from("movie_comments").update(payload).eq("id", commentId);
  } catch (err) {
    console.warn("Lỗi update comment Supabase:", err);
  }
}

export async function getAllCommentsSupabase(): Promise<MovieComment[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("movie_comments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data) return [];

    return data.map((d) => {
      const { likedBy, reactions } = parseReactionsAndLikedBy(d.liked_by);
      return {
        id: d.id,
        movieSlug: d.movie_slug,
        movieTitle: d.movie_title || "",
        userId: d.user_id,
        userName: d.user_name || "Thành viên",
        userAvatar: d.user_avatar || "",
        userEmail: d.user_email,
        rating: d.rating || 5,
        content: d.content || "",
        episodeSlug: d.episode_slug,
        episodeName: d.episode_name,
        parentId: d.parent_id,
        parentOwnerId: d.parent_owner_id,
        replyToUserId: d.reply_to_user_id,
        replyToUserName: d.reply_to_user_name,
        isSpoiler: Boolean(d.is_spoiler),
        likes: Math.max(d.likes || 0, likedBy.length),
        likedBy,
        reactions,
        isFlagged: Boolean(d.is_flagged),
        flagReason: d.flag_reason,
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

export async function togglePinCommentSupabase(commentId: string, isPinned: boolean): Promise<void> {
  if (!supabase || !commentId) return;
  try {
    const { error } = await supabase
      .from("movie_comments")
      .update({ is_pinned: isPinned, updated_at: Date.now() })
      .eq("id", commentId);

    if (error) {
      console.warn("Lỗi togglePinComment Supabase:", error.message || error);
    }
  } catch (err) {
    console.warn("Lỗi ngoại lệ togglePinComment Supabase:", err);
  }
}

export async function setCommentReactionSupabase(
  commentId: string,
  userId: string,
  reactionType: string | null
): Promise<void> {
  if (!supabase || !commentId || !userId) return;
  try {
    const { data, error: selectErr } = await supabase
      .from("movie_comments")
      .select("likes, liked_by")
      .eq("id", commentId)
      .maybeSingle();

    if (selectErr) {
      console.error("Lỗi lấy reaction Supabase:", selectErr.message || selectErr);
      return;
    }
    if (!data) return;

    const { reactions } = parseReactionsAndLikedBy(data.liked_by);
    const updatedReactions: Record<string, string> = { ...reactions };

    if (reactionType) {
      updatedReactions[userId] = reactionType;
    } else {
      delete updatedReactions[userId];
    }

    const newLikedBy = Object.keys(updatedReactions);
    const newLikes = newLikedBy.length;

    const { error: updateErr } = await supabase
      .from("movie_comments")
      .update({
        likes: newLikes,
        liked_by: updatedReactions,
        updated_at: Date.now(),
      })
      .eq("id", commentId);

    if (updateErr) {
      console.error("Lỗi cập nhật reaction vào Supabase:", updateErr.message || updateErr);
    }
  } catch (err) {
    console.error("Lỗi ngoại lệ setCommentReaction Supabase:", err);
  }
}

export async function deleteCommentSupabase(commentId: string): Promise<void> {
  if (!supabase || !commentId) return;
  try {
    const { error } = await supabase.from("movie_comments").delete().eq("id", commentId);
    if (error) {
      console.error("Lỗi deleteComment Supabase:", error.message || error);
    }
  } catch (err) {
    console.error("Lỗi ngoại lệ deleteComment Supabase:", err);
  }
}

export async function flagCommentSupabase(commentId: string, reason: string): Promise<void> {
  if (!supabase || !commentId) return;
  try {
    const { error } = await supabase
      .from("movie_comments")
      .update({ is_flagged: true, flag_reason: reason, updated_at: Date.now() })
      .eq("id", commentId);
    if (error) {
      console.error("Lỗi flagComment Supabase:", error.message || error);
    }
  } catch (err) {
    console.error("Lỗi flagComment Supabase:", err);
  }
}

export async function unflagCommentSupabase(commentId: string): Promise<void> {
  if (!supabase || !commentId) return;
  try {
    const { error } = await supabase
      .from("movie_comments")
      .update({ is_flagged: false, flag_reason: null, updated_at: Date.now() })
      .eq("id", commentId);
    if (error) {
      console.error("Lỗi unflagComment Supabase:", error.message || error);
    }
  } catch (err) {
    console.error("Lỗi unflagComment Supabase:", err);
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
  if (!supabase || !userId) return [];
  try {
    const { data } = await supabase
      .from("collections")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (!data) return [];
    return data.map((d) => ({
      id: d.id,
      userId: d.user_id,
      creatorName: d.user_name || "Thành viên Nanaflix",
      creatorPhoto: d.user_avatar || undefined,
      name: d.name,
      description: d.description || "",
      isPublic: Boolean(d.is_public),
      movies: Array.isArray(d.movies) ? d.movies : [],
      createdAt: Number(d.created_at) || Date.now(),
      updatedAt: Number(d.updated_at) || Date.now(),
    }));
  } catch {
    return [];
  }
}

export async function saveCollectionSupabase(col: MovieCollection): Promise<void> {
  if (!supabase || !col.id || !col.userId) return;
  try {
    const payload = {
      id: col.id,
      user_id: col.userId,
      user_name: col.creatorName || "Thành viên Nanaflix",
      user_avatar: col.creatorPhoto || null,
      name: col.name,
      description: col.description || null,
      is_public: Boolean(col.isPublic),
      movies: col.movies || [],
      created_at: col.createdAt || Date.now(),
      updated_at: col.updatedAt || Date.now(),
    };
    await supabase.from("collections").upsert(payload, { onConflict: "id" });
  } catch (err) {
    console.warn("Lỗi lưu collection lên Supabase:", err);
  }
}

export async function deleteCollectionSupabase(id: string): Promise<void> {
  if (!supabase || !id) return;
  try {
    await supabase.from("collections").delete().eq("id", id);
  } catch (err) {
    console.warn("Lỗi xóa collection trên Supabase:", err);
  }
}

export async function getPublicCollectionsSupabase(): Promise<MovieCollection[]> {
  if (!supabase) return [];
  try {
    const { data } = await supabase
      .from("collections")
      .select("*")
      .eq("is_public", true)
      .order("created_at", { ascending: false });

    if (!data) return [];
    return data.map((d) => ({
      id: d.id,
      userId: d.user_id,
      creatorName: d.user_name || "Thành viên Nanaflix",
      creatorPhoto: d.user_avatar || undefined,
      name: d.name,
      description: d.description || "",
      isPublic: Boolean(d.is_public),
      movies: Array.isArray(d.movies) ? d.movies : [],
      createdAt: Number(d.created_at) || Date.now(),
      updatedAt: Number(d.updated_at) || Date.now(),
    }));
  } catch {
    return [];
  }
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
// 7. BÁO CÁO LỖI PHIM (ERROR_REPORTS)
// ============================================================================

export interface ErrorReportItem {
  id: string;
  movieSlug: string;
  movieTitle: string;
  episodeName?: string;
  episodeSlug?: string;
  serverName?: string;
  issueType: string;
  description?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  status: "pending" | "resolved" | "ignored";
  adminNote?: string;
  createdAt: number;
  updatedAt: number;
}

export async function createErrorReportSupabase(
  report: Omit<ErrorReportItem, "id" | "createdAt" | "updatedAt" | "status">
): Promise<string> {
  const id = `err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  try {
    const { auth } = await import("@/lib/firebase");
    const token = await auth?.currentUser?.getIdToken().catch(() => null);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
    const res = await fetch(`${baseUrl}/api/reports`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        movieSlug: report.movieSlug,
        movieTitle: report.movieTitle,
        episodeName: report.episodeName,
        episodeSlug: report.episodeSlug,
        serverName: report.serverName,
        issueType: report.issueType,
        description: report.description,
        userName: report.userName,
        userEmail: report.userEmail,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.id) return data.id;
    }
  } catch (err) {
    console.warn("Lỗi gửi error report qua API:", err);
  }
  return id;
}

export async function getErrorReportsSupabase(statusFilter?: string): Promise<ErrorReportItem[]> {
  try {
    const { auth } = await import("@/lib/firebase");
    const token = await auth?.currentUser?.getIdToken();
    if (!token) return [];
    const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
    const statusParam = statusFilter && statusFilter !== "all" ? `?status=${encodeURIComponent(statusFilter)}` : "";
    const res = await fetch(`${baseUrl}/api/reports${statusParam}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        return data.items.map((d: Record<string, unknown>) => ({
          id: String(d.id),
          movieSlug: String(d.movie_slug || ""),
          movieTitle: String(d.movie_title || ""),
          episodeName: d.episode_name ? String(d.episode_name) : undefined,
          episodeSlug: d.episode_slug ? String(d.episode_slug) : undefined,
          serverName: d.server_name ? String(d.server_name) : undefined,
          issueType: String(d.issue_type || ""),
          description: d.description ? String(d.description) : undefined,
          userId: d.user_id ? String(d.user_id) : undefined,
          userName: d.user_name ? String(d.user_name) : undefined,
          userEmail: d.user_email ? String(d.user_email) : undefined,
          status: (d.status as ErrorReportItem["status"]) || "pending",
          adminNote: d.admin_note ? String(d.admin_note) : undefined,
          createdAt: Number(d.created_at) || Date.now(),
          updatedAt: Number(d.updated_at) || Date.now(),
        }));
      }
    }
  } catch (err) {
    console.warn("Lỗi lấy error reports qua API:", err);
  }
  return [];
}

export async function updateErrorReportStatusSupabase(
  id: string,
  status: "pending" | "resolved" | "ignored",
  adminNote?: string
): Promise<boolean> {
  if (!id) return false;
  try {
    const { auth } = await import("@/lib/firebase");
    const token = await auth?.currentUser?.getIdToken();
    if (!token) return false;
    const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
    const res = await fetch(`${baseUrl}/api/reports`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id, status, adminNote }),
    });
    return res.ok;
  } catch (err) {
    console.warn("Lỗi cập nhật trạng thái báo cáo lỗi qua API:", err);
    return false;
  }
}

export async function deleteErrorReportSupabase(id: string): Promise<boolean> {
  if (!id) return false;
  try {
    const { auth } = await import("@/lib/firebase");
    const token = await auth?.currentUser?.getIdToken();
    if (!token) return false;
    const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
    const res = await fetch(`${baseUrl}/api/reports?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch (err) {
    console.warn("Lỗi xóa báo cáo lỗi qua API:", err);
    return false;
  }
}

export function subscribeErrorReportsSupabase(
  onUpdate: (reports: ErrorReportItem[]) => void
): () => void {
  let isUnsubscribed = false;
  const fetchReports = () => {
    if (isUnsubscribed) return;
    getErrorReportsSupabase().then((items) => {
      if (!isUnsubscribed) onUpdate(items);
    });
  };

  fetchReports();

  const handleVisibility = () => {
    if (!isUnsubscribed && typeof document !== "undefined" && !document.hidden) {
      fetchReports();
    }
  };

  if (typeof window !== "undefined") {
    document.addEventListener("visibilitychange", handleVisibility);
  }

  const interval = setInterval(() => {
    if (!isUnsubscribed && typeof document !== "undefined" && !document.hidden) {
      fetchReports();
    }
  }, 45000);

  return () => {
    isUnsubscribed = true;
    clearInterval(interval);
    if (typeof window !== "undefined") {
      document.removeEventListener("visibilitychange", handleVisibility);
    }
  };
}

// ============================================================================
// 8. THEO DÕI PHIM BỘ (FOLLOWED_SERIES)
// ============================================================================

export interface FollowedSeriesItem {
  id: string; // userId_movieSlug
  userId: string;
  movieSlug: string;
  movieTitle: string;
  poster?: string;
  lastNotifiedEpisode?: string;
  createdAt: number;
}

export async function followSeriesSupabase(
  userId: string,
  movieSlug: string,
  movieTitle: string,
  poster?: string
): Promise<void> {
  if (!userId || !movieSlug) return;
  try {
    const { auth } = await import("@/lib/firebase");
    const token = await auth?.currentUser?.getIdToken();
    if (!token) return;
    const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
    await fetch(`${baseUrl}/api/user/series`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ movieSlug, movieTitle, poster }),
    });
  } catch (err) {
    console.warn("Lỗi follow series qua API:", err);
  }
}

export async function unfollowSeriesSupabase(userId: string, movieSlug: string): Promise<void> {
  if (!userId || !movieSlug) return;
  try {
    const { auth } = await import("@/lib/firebase");
    const token = await auth?.currentUser?.getIdToken();
    if (!token) return;
    const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
    await fetch(`${baseUrl}/api/user/series?slug=${encodeURIComponent(movieSlug)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    console.warn("Lỗi unfollow series qua API:", err);
  }
}

export async function isSeriesFollowedSupabase(userId: string, movieSlug: string): Promise<boolean> {
  if (!userId || !movieSlug) return false;
  try {
    const list = await getUserFollowedSeriesSupabase(userId);
    return list.some((item) => item.movieSlug === movieSlug);
  } catch {
    return false;
  }
}

export async function getUserFollowedSeriesSupabase(userId: string): Promise<FollowedSeriesItem[]> {
  if (!userId) return [];
  try {
    const { auth } = await import("@/lib/firebase");
    const token = await auth?.currentUser?.getIdToken();
    if (!token) return [];
    const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
    const res = await fetch(`${baseUrl}/api/user/series`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        return data.items.map((row: Record<string, unknown>) => ({
          id: `${userId}_${row.movieSlug}`,
          userId,
          movieSlug: String(row.movieSlug || ""),
          movieTitle: String(row.movieTitle || ""),
          poster: row.poster ? String(row.poster) : undefined,
          lastNotifiedEpisode: row.lastNotifiedEpisode ? String(row.lastNotifiedEpisode) : undefined,
          createdAt: Number(row.createdAt) || Date.now(),
        }));
      }
    }
  } catch (err) {
    console.warn("Lỗi lấy danh sách followed series qua API:", err);
  }
  return [];
}

// ============================================================================
// 9. NHẮC LỊCH THỂ THAO & BÓNG ĐÁ (MATCH_REMINDERS)
// ============================================================================

export interface MatchReminderItem {
  id: string; // userId_matchId
  userId: string;
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  matchTime: number;
  tournament?: string;
  isNotified?: boolean;
  createdAt: number;
}

export async function saveMatchReminderSupabase(item: MatchReminderItem): Promise<void> {
  if (!item.userId || !item.matchId) return;
  try {
    const { auth } = await import("@/lib/firebase");
    const token = await auth?.currentUser?.getIdToken();
    if (!token) return;
    const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
    await fetch(`${baseUrl}/api/user/reminders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        matchId: item.matchId,
        homeTeam: item.homeTeam,
        awayTeam: item.awayTeam,
        matchTime: item.matchTime,
        tournament: item.tournament,
      }),
    });
  } catch (err) {
    console.warn("Lỗi lưu match reminder qua API:", err);
  }
}

export async function getMatchRemindersSupabase(userId: string): Promise<MatchReminderItem[]> {
  if (!userId) return [];
  try {
    const { auth } = await import("@/lib/firebase");
    const token = await auth?.currentUser?.getIdToken();
    if (!token) return [];
    const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
    const res = await fetch(`${baseUrl}/api/user/reminders`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        return data.items.map((row: Record<string, unknown>) => ({
          id: `${userId}_${row.matchId}`,
          userId,
          matchId: String(row.matchId || ""),
          homeTeam: String(row.homeTeam || ""),
          awayTeam: String(row.awayTeam || ""),
          matchTime: Number(row.matchTime) || 0,
          tournament: row.tournament ? String(row.tournament) : undefined,
          isNotified: Boolean(row.isNotified),
          createdAt: Number(row.createdAt) || Date.now(),
        }));
      }
    }
  } catch (err) {
    console.warn("Lỗi lấy match reminders qua API:", err);
  }
  return [];
}

export async function removeMatchReminderSupabase(userId: string, matchId: string): Promise<void> {
  if (!userId || !matchId) return;
  try {
    const { auth } = await import("@/lib/firebase");
    const token = await auth?.currentUser?.getIdToken();
    if (!token) return;
    const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
    await fetch(`${baseUrl}/api/user/reminders?matchId=${encodeURIComponent(matchId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    console.warn("Lỗi xóa match reminder qua API:", err);
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

export async function saveDeviceHandoffSupabase(item: DeviceHandoffItem): Promise<void> {
  if (!item.userId) return;
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
  }
}

export async function getDeviceHandoffSupabase(userId: string): Promise<DeviceHandoffItem | null> {
  if (!userId) return null;
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
  }
  return null;
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



