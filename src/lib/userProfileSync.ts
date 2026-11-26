import type { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { cacheService } from "@/lib/cache";

type SupabaseAdminClient = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

export interface SyncUserProfileAcrossContentParams {
  supabase: SupabaseAdminClient;
  userId: string;
  nextAvatar?: string | null;
  prevAvatar?: string | null;
  nextDisplayName?: string | null;
  prevDisplayName?: string | null;
}

/**
 * Synchronizes updated user avatar and displayName across movie_comments,
 * Redis comment caches, collections, and notifications.
 */
export async function syncUserProfileAcrossContent({
  supabase,
  userId,
  nextAvatar,
  prevAvatar,
  nextDisplayName,
  prevDisplayName,
}: SyncUserProfileAcrossContentParams): Promise<void> {
  if (!userId) return;

  const cleanNextAvatar = typeof nextAvatar === "string" ? nextAvatar.trim() : "";
  const cleanPrevAvatar = typeof prevAvatar === "string" ? prevAvatar.trim() : "";
  const cleanNextName = typeof nextDisplayName === "string" ? nextDisplayName.trim() : "";
  const cleanPrevName = typeof prevDisplayName === "string" ? prevDisplayName.trim() : "";

  const avatarChanged = Boolean(cleanNextAvatar && cleanNextAvatar !== cleanPrevAvatar);
  const nameChanged = Boolean(cleanNextName && cleanNextName !== cleanPrevName);

  if (!avatarChanged && !nameChanged) return;

  const commentUpdates: Record<string, unknown> = {};
  const notifUpdates: Record<string, unknown> = {};
  const collectionUpdates: Record<string, unknown> = {};

  if (avatarChanged) {
    commentUpdates.user_avatar = cleanNextAvatar;
    notifUpdates.replier_avatar = cleanNextAvatar;
    collectionUpdates.user_avatar = cleanNextAvatar;
  }
  if (nameChanged) {
    commentUpdates.user_name = cleanNextName;
    notifUpdates.replier_name = cleanNextName;
    collectionUpdates.user_name = cleanNextName;
  }

  // 1. Fetch user's comments (for cache invalidation & reply notification matching)
  let userCommentIds: string[] = [];
  let userMovieSlugs: string[] = [];
  try {
    const { data: userComments } = await supabase
      .from("movie_comments")
      .select("id, movie_slug")
      .eq("user_id", userId)
      .limit(1000);

    if (Array.isArray(userComments) && userComments.length > 0) {
      userCommentIds = userComments.map((c) => String(c.id || "")).filter(Boolean);
      userMovieSlugs = Array.from(
        new Set(userComments.map((c) => String(c.movie_slug || "")).filter(Boolean)),
      );
    }
  } catch (err) {
    console.warn("[UserProfileSync] Failed to query user comments:", err);
  }

  const tasks: Array<Promise<unknown>> = [];

  // 2. Update movie_comments and invalidate Redis comments cache per movieSlug
  if (Object.keys(commentUpdates).length > 0) {
    tasks.push(
      Promise.resolve(
        supabase.from("movie_comments").update(commentUpdates).eq("user_id", userId),
      ).catch((err) => {
        console.warn("[UserProfileSync] Failed updating movie_comments:", err);
      }),
    );
  }

  for (const slug of userMovieSlugs) {
    tasks.push(
      cacheService.delete(`comments:movie:${slug}`).catch(() => false),
    );
  }

  // 3. Update collections authored by user
  if (Object.keys(collectionUpdates).length > 0) {
    tasks.push(
      Promise.resolve(
        supabase.from("collections").update(collectionUpdates).eq("user_id", userId),
      ).catch((err) => {
        console.warn("[UserProfileSync] Failed updating collections:", err);
      }),
    );
  }

  // 4. Sync comment_reply notifications referencing this user's reply comments
  if (Object.keys(notifUpdates).length > 0 && userCommentIds.length > 0) {
    for (let i = 0; i < userCommentIds.length; i += 200) {
      const batchIds = userCommentIds.slice(i, i + 200);
      tasks.push(
        Promise.resolve(
          supabase
            .from("notifications")
            .update(notifUpdates)
            .eq("type", "comment_reply")
            .in("comment_id", batchIds),
        ).catch((err) => {
          console.warn("[UserProfileSync] Failed updating reply notifications:", err);
        }),
      );
    }
  }

  // 5. Sync comment_reaction notifications where this user reacted (matching previous actor snapshot)
  if (Object.keys(notifUpdates).length > 0) {
    tasks.push(
      (async () => {
        try {
          const { data: userReactions } = await supabase
            .from("comment_reactions")
            .select("comment_id")
            .eq("user_id", userId)
            .limit(500);

          const reactedCommentIds = Array.from(
            new Set(
              (userReactions || []).map((r) => String(r.comment_id || "")).filter(Boolean),
            ),
          );
          if (reactedCommentIds.length === 0) return;

          const nameFilters = Array.from(
            new Set([cleanPrevName, cleanNextName].filter(Boolean)),
          );
          for (let i = 0; i < reactedCommentIds.length; i += 200) {
            const batchIds = reactedCommentIds.slice(i, i + 200);
            let query = supabase
              .from("notifications")
              .update(notifUpdates)
              .eq("type", "comment_reaction")
              .in("comment_id", batchIds);

            if (nameFilters.length > 0) {
              query = query.in("replier_name", nameFilters);
            } else if (cleanPrevAvatar) {
              query = query.eq("replier_avatar", cleanPrevAvatar);
            } else {
              continue;
            }
            await query;
          }
        } catch (err) {
          console.warn("[UserProfileSync] Failed updating reaction notifications:", err);
        }
      })(),
    );
  }

  await Promise.allSettled(tasks);
}
