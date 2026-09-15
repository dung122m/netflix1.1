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

export async function getUserProfileSupabase(userId: string): Promise<UserProfile | null> {
  if (!supabase || !userId) return null;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      uid: data.id,
      email: data.email || "",
      displayName: data.display_name || "Thành viên",
      photoURL: data.photo_url || data.custom_avatar || "",
      customAvatar: data.custom_avatar,
      bio: data.bio,
      favoriteGenres: data.favorite_genres || [],
      badges: data.badges || [],
      watchTimeMinutes: data.watch_time_minutes || 0,
      role: (data.role as "admin" | "member") || "member",
      isCommentRestricted: Boolean(data.is_comment_restricted),
      violationsCount: data.violations_count || 0,
      lastViolationReason: data.last_violation_reason,
      createdAt: data.created_at,
      lastLoginAt: data.last_login_at,
    };
  } catch {
    return null;
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
  if (!supabase || !userId) return;
  try {
    const payload: Record<string, unknown> = {
      updated_at: Date.now(),
    };
    if (data.displayName !== undefined) payload.display_name = data.displayName;
    if (data.photoURL !== undefined) payload.photo_url = data.photoURL;
    if (data.customAvatar !== undefined) payload.custom_avatar = data.customAvatar;
    if (data.bio !== undefined) payload.bio = data.bio;
    if (data.favoriteGenres !== undefined) payload.favorite_genres = data.favoriteGenres;
    if (data.badges !== undefined) payload.badges = data.badges;
    if (data.watchTimeMinutes !== undefined) payload.watch_time_minutes = data.watchTimeMinutes;
    if (data.role !== undefined) payload.role = data.role;

    await supabase.from("profiles").update(payload).eq("id", userId);
  } catch (err) {
    console.warn("Lỗi update user profile trong Supabase:", err);
  }
}

export async function setUserCommentRestrictionSupabase(
  userId: string,
  isRestricted: boolean,
  reason?: string
): Promise<void> {
  if (!supabase || !userId) return;
  try {
    const payload: Record<string, unknown> = {
      is_comment_restricted: isRestricted,
      updated_at: Date.now(),
    };
    if (reason !== undefined) payload.last_violation_reason = reason;
    await supabase.from("profiles").update(payload).eq("id", userId);
  } catch (err) {
    console.warn("Lỗi update comment restriction Supabase:", err);
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
    return data.map((d) => ({
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

export async function createNotificationSupabase(notif: UserNotification & { userId: string }): Promise<void> {
  if (!supabase || !notif.userId) return;
  try {
    const payload = {
      id: notif.id,
      user_id: notif.userId,
      type: notif.type,
      title: notif.title,
      message: notif.message || null,
      link: notif.link || null,
      movie_slug: notif.movieSlug || null,
      comment_id: notif.commentId || null,
      replier_name: notif.replierName || null,
      replier_avatar: notif.replierAvatar || null,
      is_read: Boolean(notif.isRead),
      created_at: notif.createdAt || Date.now(),
    };
    await supabase.from("notifications").upsert(payload, { onConflict: "id" });
  } catch (err) {
    console.warn("Lỗi lưu notification vào Supabase:", err);
  }
}

export async function markNotificationAsReadSupabase(userId: string, notifId: string): Promise<void> {
  if (!supabase || !userId || !notifId) return;
  try {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("id", notifId);
  } catch (err) {
    console.warn("Lỗi update notification Supabase:", err);
  }
}

export async function markAllNotificationsAsReadSupabase(userId: string): Promise<void> {
  if (!supabase || !userId) return;
  try {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId);
  } catch (err) {
    console.warn("Lỗi mark all notifications Supabase:", err);
  }
}
