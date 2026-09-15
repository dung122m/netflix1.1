import { supabase } from "@/lib/supabase";
import { MovieComment } from "@/types/comment";
import { UserProfile } from "@/types/user";
import { WatchHistoryItem } from "@/lib/watchHistory";
import { WatchlistItem } from "@/lib/watchlist";
import { MovieCollection } from "@/types/collection";
import { UserNotification } from "@/types/notification";

// ============================================================================
// 1. HỒ SƠ NGƯỜI DÙNG (PROFILES)
// ============================================================================

export async function upsertUserProfileSupabase(profile: Partial<UserProfile> & { uid: string }): Promise<void> {
  if (!supabase || !profile.uid) return;
  try {
    const payload = {
      id: profile.uid,
      email: profile.email || "",
      display_name: profile.displayName || "Thành viên Nanaflix",
      photo_url: profile.photoURL || "",
      custom_avatar: profile.customAvatar || null,
      bio: profile.bio || null,
      favorite_genres: profile.favoriteGenres || [],
      badges: profile.badges || [],
      watch_time_minutes: profile.watchTimeMinutes || 0,
      role: profile.role || "member",
      last_login_at: Date.now(),
      updated_at: Date.now(),
    };

    await supabase.from("profiles").upsert(payload, { onConflict: "id" });
  } catch (err) {
    console.warn("Lỗi lưu user profile vào Supabase:", err);
  }
}

export async function getAllProfilesSupabase(): Promise<UserProfile[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("last_login_at", { ascending: false });

    if (error || !data) return [];

    return data.map((d) => ({
      uid: d.id,
      email: d.email || "",
      displayName: d.display_name || "Thành viên",
      photoURL: d.photo_url || d.custom_avatar || "",
      customAvatar: d.custom_avatar,
      bio: d.bio,
      favoriteGenres: d.favorite_genres || [],
      badges: d.badges || [],
      watchTimeMinutes: d.watch_time_minutes || 0,
      role: (d.role as "admin" | "member") || "member",
      isCommentRestricted: Boolean(d.is_comment_restricted),
      violationsCount: d.violations_count || 0,
      lastViolationReason: d.last_violation_reason,
      createdAt: d.created_at,
      lastLoginAt: d.last_login_at,
    }));
  } catch {
    return [];
  }
}

// ============================================================================
// 2. BÌNH LUẬN & ĐÁNH GIÁ (COMMENTS)
// ============================================================================

export async function getMovieCommentsSupabase(movieSlug: string): Promise<MovieComment[]> {
  if (!supabase || !movieSlug) return [];
  try {
    const { data, error } = await supabase
      .from("movie_comments")
      .select("*")
      .eq("movie_slug", movieSlug)
      .order("created_at", { ascending: false });

    if (error || !data) return [];

    return data.map((d) => ({
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
      likes: d.likes || 0,
      likedBy: d.liked_by || [],
      isFlagged: Boolean(d.is_flagged),
      flagReason: d.flag_reason,
      isApproved: d.is_approved !== false,
      isPinned: Boolean(d.is_pinned),
      createdAt: Number(d.created_at) || Date.now(),
      updatedAt: Number(d.updated_at) || Date.now(),
    }));
  } catch {
    return [];
  }
}

export async function postCommentSupabase(comment: Omit<MovieComment, "id" | "createdAt" | "updatedAt">): Promise<string> {
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

export async function deleteCommentSupabase(commentId: string): Promise<void> {
  if (!supabase || !commentId) return;
  await supabase.from("movie_comments").delete().eq("id", commentId);
}

// ============================================================================
// 3. LỊCH SỬ XEM & DANH SÁCH YÊU THÍCH (HISTORY & WATCHLIST)
// ============================================================================

export async function syncWatchHistorySupabase(userId: string, items: WatchHistoryItem[]): Promise<void> {
  if (!supabase || !userId || !items.length) return;
  try {
    const rows = items.map((item) => ({
      id: `${userId}_${item.slug}`,
      user_id: userId,
      slug: item.slug,
      title: item.title,
      poster: item.poster || null,
      episode_name: item.episodeName || null,
      episode_slug: item.episodeSlug || null,
      progress_seconds: item.progressSeconds || 0,
      duration_seconds: item.durationSeconds || 0,
      year: item.year || null,
      quality: item.quality || null,
      category: item.category || null,
      updated_at: item.updatedAt || Date.now(),
      synced_at: Date.now(),
    }));

    await supabase.from("watch_history").upsert(rows, { onConflict: "id" });
  } catch (err) {
    console.warn("Lỗi sync watch history lên Supabase:", err);
  }
}

export async function getWatchHistorySupabase(userId: string): Promise<WatchHistoryItem[]> {
  if (!supabase || !userId) return [];
  try {
    const { data } = await supabase
      .from("watch_history")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (!data) return [];
    return data.map((d) => ({
      slug: d.slug,
      title: d.title,
      poster: d.poster || "",
      episodeName: d.episode_name,
      episodeSlug: d.episode_slug,
      progressSeconds: d.progress_seconds || 0,
      durationSeconds: d.duration_seconds || 0,
      year: d.year,
      quality: d.quality,
      category: d.category,
      updatedAt: d.updated_at,
    }));
  } catch {
    return [];
  }
}

export async function syncWatchlistSupabase(userId: string, items: WatchlistItem[]): Promise<void> {
  if (!supabase || !userId || !items.length) return;
  try {
    const rows = items.map((item) => ({
      id: `${userId}_${item.slug}`,
      user_id: userId,
      slug: item.slug,
      title: item.title,
      poster: item.poster || null,
      year: item.year || null,
      quality: item.quality || null,
      category: item.category || null,
      added_at: item.addedAt || Date.now(),
    }));

    await supabase.from("watchlist").upsert(rows, { onConflict: "id" });
  } catch (err) {
    console.warn("Lỗi sync watchlist lên Supabase:", err);
  }
}

export async function getWatchlistSupabase(userId: string): Promise<WatchlistItem[]> {
  if (!supabase || !userId) return [];
  try {
    const { data } = await supabase
      .from("watchlist")
      .select("*")
      .eq("user_id", userId)
      .order("added_at", { ascending: false });

    if (!data) return [];
    return data.map((d) => ({
      slug: d.slug,
      title: d.title,
      poster: d.poster || "",
      year: d.year,
      quality: d.quality,
      category: d.category,
      addedAt: d.added_at,
    }));
  } catch {
    return [];
  }
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
      userName: d.user_name || "Thành viên Nanaflix",
      userAvatar: d.user_avatar,
      name: d.name,
      description: d.description,
      isPublic: Boolean(d.is_public),
      colorGradient: d.color_gradient,
      movies: d.movies || [],
      likesCount: d.likes_count || 0,
      viewsCount: d.views_count || 0,
      createdAt: Number(d.created_at) || Date.now(),
      updatedAt: Number(d.updated_at) || Date.now(),
    }));
  } catch {
    return [];
  }
}

export async function saveCollectionSupabase(collection: MovieCollection): Promise<void> {
  if (!supabase || !collection.id || !collection.userId) return;
  try {
    const payload = {
      id: collection.id,
      user_id: collection.userId,
      user_name: collection.userName || "Thành viên Nanaflix",
      user_avatar: collection.userAvatar || null,
      name: collection.name,
      description: collection.description || null,
      is_public: Boolean(collection.isPublic),
      color_gradient: collection.colorGradient || null,
      movies: collection.movies || [],
      likes_count: collection.likesCount || 0,
      views_count: collection.viewsCount || 0,
      created_at: collection.createdAt || Date.now(),
      updated_at: collection.updatedAt || Date.now(),
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
      userName: d.user_name || "Thành viên Nanaflix",
      userAvatar: d.user_avatar,
      name: d.name,
      description: d.description,
      isPublic: Boolean(d.is_public),
      colorGradient: d.color_gradient,
      movies: d.movies || [],
      likesCount: d.likes_count || 0,
      viewsCount: d.views_count || 0,
      createdAt: Number(d.created_at) || Date.now(),
      updatedAt: Number(d.updated_at) || Date.now(),
    }));
  } catch {
    return [];
  }
}

export async function getUserNotificationsSupabase(userId: string): Promise<UserNotification[]> {
  if (!supabase || !userId) return [];
  try {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (!data) return [];
    return data.map((d) => ({
      id: d.id,
      type: d.type as UserNotification["type"],
      title: d.title,
      message: d.message || "",
      link: d.link,
      movieSlug: d.movie_slug,
      commentId: d.comment_id,
      replierName: d.replier_name,
      replierAvatar: d.replier_avatar,
      isRead: Boolean(d.is_read),
      createdAt: Number(d.created_at) || Date.now(),
    }));
  } catch {
    return [];
  }
}
