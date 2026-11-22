import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { parseReactionsAndLikedBy } from "@/services/supabaseService";
import { MovieComment, CommentReactionType } from "@/types/comment";
import { cacheService } from "@/lib/cache";
import { enforceRateLimit, buildRateLimitResponse } from "@/lib/rateLimit";
import { sanitizeSafeText } from "@/lib/security";
import { logSecurityEvent } from "@/lib/securityLogger";
import { ServerAuthResult } from "@/lib/serverAuth";

export const COMMENT_SELECT_FIELDS =
  "id, movie_slug, movie_title, user_id, user_name, user_avatar, user_email, rating, content, episode_slug, episode_name, parent_id, parent_owner_id, reply_to_user_id, reply_to_user_name, is_spoiler, likes, liked_by, is_flagged, flag_reason, is_approved, is_pinned, created_at, updated_at";

export interface CommentUserProfile {
  custom_avatar?: string | null;
  photo_url?: string | null;
  display_name?: string | null;
  badges?: string[] | null;
}

export function mapCommentRecord(
  d: Record<string, unknown>,
  isAdmin: boolean = false,
  profileMap?: Map<string, CommentUserProfile>,
  reactionsMap?: Map<string, { likedBy: string[]; reactions: Record<string, CommentReactionType> }>
): MovieComment {
  const commentId = String(d.id || "");
  const fallback = parseReactionsAndLikedBy(d.liked_by);
  const reactionData = reactionsMap?.get(commentId);

  const likedBy = reactionData ? reactionData.likedBy : fallback.likedBy;
  const reactions = reactionData ? reactionData.reactions : fallback.reactions;
  const editedAt = fallback.editedAt;
  const userId = String(d.user_id || "");
  const profile = userId && profileMap ? profileMap.get(userId) : undefined;
  const userAvatar = profile?.custom_avatar || profile?.photo_url || String(d.user_avatar || "");
  const userName = profile?.display_name || String(d.user_name || "Thành viên");
  const userBadges = Array.isArray(profile?.badges) ? (profile.badges as string[]) : [];

  return {
    id: commentId,
    movieSlug: String(d.movie_slug || ""),
    movieTitle: String(d.movie_title || ""),
    userId,
    userName,
    userAvatar,
    userBadges,
    userEmail: isAdmin && d.user_email ? String(d.user_email) : undefined,
    rating: (() => {
      const num = Number(d.rating);
      return !isNaN(num) && num >= 1 && num <= 5 ? Math.round(num) : 0;
    })(),
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
    flagReason: isAdmin && d.flag_reason ? String(d.flag_reason) : undefined,
    isPinned: Boolean(d.is_pinned),
    createdAt: Number(d.created_at) || Date.now(),
    updatedAt: Number(d.updated_at) || Date.now(),
    isEdited: Boolean(editedAt || d.is_edited || d.isEdited),
    editedAt: editedAt || (d.edited_at ? Number(d.edited_at) : undefined),
  };
}

export async function fetchReactionsMap(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  records: Array<Record<string, unknown>>
): Promise<Map<string, { likedBy: string[]; reactions: Record<string, CommentReactionType> }>> {
  const map = new Map<string, { likedBy: string[]; reactions: Record<string, CommentReactionType> }>();
  if (!supabaseAdmin || !records || records.length === 0) return map;
  const commentIds = records.map((r) => String(r.id || "")).filter(Boolean);
  if (commentIds.length === 0) return map;

  const validTypes = new Set<string>(["like", "love", "haha", "wow", "sad", "angry"]);

  try {
    const { data, error } = await supabaseAdmin
      .from("comment_reactions")
      .select("comment_id, user_id, reaction_type")
      .in("comment_id", commentIds)
      .limit(1000);

    if (!error && data && Array.isArray(data) && data.length > 0) {
      for (const row of data) {
        const cId = String(row.comment_id);
        const uId = String(row.user_id);
        const rawType = String(row.reaction_type || "like").toLowerCase();
        const rType: CommentReactionType = validTypes.has(rawType)
          ? (rawType as CommentReactionType)
          : rawType === "heart"
          ? "love"
          : "like";

        if (!map.has(cId)) {
          map.set(cId, { likedBy: [], reactions: {} });
        }
        const item = map.get(cId)!;
        if (!item.likedBy.includes(uId)) {
          item.likedBy.push(uId);
        }
        item.reactions[uId] = rType;
      }
    }
  } catch {}
  return map;
}

export async function fetchProfilesMap(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  records: Array<Record<string, unknown>>
): Promise<Map<string, CommentUserProfile>> {
  const map = new Map<string, CommentUserProfile>();
  if (!supabaseAdmin || !records || records.length === 0) return map;
  const userIds = Array.from(
    new Set(records.map((r) => String(r.user_id || "")).filter(Boolean))
  );
  if (userIds.length === 0) return map;

  try {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id, custom_avatar, photo_url, display_name, badges")
      .in("id", userIds)
      .limit(300);
    if (data && Array.isArray(data)) {
      for (const p of data) {
        map.set(p.id, p);
      }
    }
  } catch {}
  return map;
}

export function sortComments(items: MovieComment[]): MovieComment[] {
  return items.sort((a, b) => {
    const isPinnedA = Boolean(a.isPinned);
    const isPinnedB = Boolean(b.isPinned);
    if (isPinnedA && !isPinnedB) return -1;
    if (!isPinnedA && isPinnedB) return 1;
    return (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0);
  });
}

export async function invalidateCommentsCache(movieSlug?: string, commentId?: string): Promise<void> {
  try {
    if (movieSlug) {
      await cacheService.delete(`comments:movie:${movieSlug}`);
      return;
    }
    if (commentId) {
      const supabaseAdmin = getSupabaseAdmin();
      if (supabaseAdmin) {
        const { data } = await supabaseAdmin
          .from("movie_comments")
          .select("movie_slug")
          .eq("id", commentId)
          .maybeSingle();
        if (data?.movie_slug) {
          await cacheService.delete(`comments:movie:${data.movie_slug}`);
        }
      }
    }
  } catch (err) {
    console.warn("[Comments Cache Invalidation Warning]:", err);
  }
}

/**
 * Xử lý thả phản ứng (Facebook Reactions)
 */
export async function handleCommentReaction({
  commentId,
  reactionType,
  effectiveUserId,
  supabaseAdmin,
  auth,
}: {
  commentId: string;
  reactionType?: string;
  effectiveUserId: string;
  supabaseAdmin: NonNullable<ReturnType<typeof getSupabaseAdmin>>;
  auth: ServerAuthResult;
}): Promise<NextResponse> {
  // 1. Ghi độc lập vào bảng comment_reactions để phân tán tải ghi (tránh Row Lock Write Contention)
  try {
    if (reactionType) {
      await supabaseAdmin.from("comment_reactions").upsert(
        {
          id: `${commentId}_${effectiveUserId}`,
          comment_id: commentId,
          user_id: effectiveUserId,
          reaction_type: reactionType,
          updated_at: Date.now(),
        },
        { onConflict: "id" }
      );
    } else {
      await supabaseAdmin.from("comment_reactions").delete().eq("id", `${commentId}_${effectiveUserId}`);
    }
  } catch (crErr) {
    console.warn("[Comments API] Ghi nhận comment_reactions fallback:", crErr);
  }

  const { data: cmtData } = await supabaseAdmin
    .from("movie_comments")
    .select("likes, liked_by, user_id, user_name, movie_slug, content")
    .eq("id", commentId)
    .maybeSingle();

  if (cmtData) {
    const { reactions, editedAt } = parseReactionsAndLikedBy(cmtData.liked_by);
    const updatedReactions: Record<string, unknown> = { ...reactions };
    if (editedAt) {
      updatedReactions.__edited_at = editedAt;
    }

    if (reactionType) {
      updatedReactions[effectiveUserId] = reactionType;
    } else {
      delete updatedReactions[effectiveUserId];
    }

    const newLikedBy = Object.keys(updatedReactions).filter((k) => !k.startsWith("__"));
    const newLikes = newLikedBy.length;

    const { error: reactionErr } = await supabaseAdmin
      .from("movie_comments")
      .update({
        likes: newLikes,
        liked_by: updatedReactions,
      })
      .eq("id", commentId);

    if (reactionErr) {
      console.error("[Comments API] Lỗi cập nhật reaction:", reactionErr);
      return NextResponse.json({ error: "Lỗi cơ sở dữ liệu khi cập nhật cảm xúc: " + reactionErr.message }, { status: 500 });
    }

    // Tạo thông báo reaction an toàn (chỉ khi thêm reaction và người thả khác chủ bình luận)
    if (reactionType && cmtData.user_id && cmtData.user_id !== effectiveUserId) {
      let reactorName = auth.displayName || "Một thành viên";
      let reactorAvatar = auth.photoUrl || "";
      try {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("display_name, photo_url, custom_avatar")
          .eq("id", effectiveUserId)
          .maybeSingle();

        if (profile?.display_name) reactorName = profile.display_name;
        if (profile?.custom_avatar || profile?.photo_url) reactorAvatar = profile.custom_avatar || profile.photo_url;
      } catch {}

      const emojiMap: Record<string, string> = {
        heart: "❤️",
        love: "❤️",
        like: "👍",
        laugh: "😂",
        haha: "😂",
        wow: "😮",
        sad: "😢",
        angry: "😡",
      };
      const emoji = emojiMap[reactionType] || "❤️";

      let otherCount = 0;
      if (cmtData.liked_by && typeof cmtData.liked_by === "object") {
        const keys = Object.keys(cmtData.liked_by).filter((uid) => uid !== effectiveUserId && uid !== cmtData.user_id);
        otherCount = keys.length;
      }

      const notifTitle = otherCount > 0
        ? `${emoji} ${reactorName} và ${otherCount} người khác đã phản ứng với bình luận của bạn`
        : `${emoji} ${reactorName} đã thích bình luận của bạn`;

      const msgSnippet = (cmtData.content || "").length > 80
        ? (cmtData.content || "").slice(0, 80) + "..."
        : cmtData.content || "";

      try {
        await supabaseAdmin.from("notifications").upsert({
          id: `react_${commentId}_${cmtData.user_id}`,
          user_id: cmtData.user_id,
          type: "comment_reaction",
          title: notifTitle,
          message: msgSnippet,
          link: `/movies/${cmtData.movie_slug}?highlightComment=${commentId}#comment-${commentId}`,
          movie_slug: cmtData.movie_slug,
          comment_id: commentId,
          replier_name: reactorName,
          replier_avatar: reactorAvatar,
          is_read: false,
          created_at: Date.now(),
        }, { onConflict: "id" });
      } catch {}
    }

    if (cmtData.movie_slug) {
      await invalidateCommentsCache(cmtData.movie_slug);
    }
  }

  return NextResponse.json({ success: true });
}

/**
 * Xử lý báo cáo vi phạm (Flag từ Admin hoặc Report từ người dùng)
 */
export async function handleCommentFlagOrReport({
  req,
  auth,
  commentId,
  reason,
  supabaseAdmin,
}: {
  req: NextRequest;
  auth: ServerAuthResult;
  commentId: string;
  reason: string;
  supabaseAdmin: NonNullable<ReturnType<typeof getSupabaseAdmin>>;
}): Promise<NextResponse> {
  const cleanReason = typeof reason === "string" ? reason.trim() : "";
  if (!cleanReason) {
    return NextResponse.json({ error: "Lý do báo cáo không được để trống!" }, { status: 400 });
  }

  const { data: targetComment, error: fetchErr } = await supabaseAdmin
    .from("movie_comments")
    .select("id, movie_slug, movie_title, user_id, content, is_flagged")
    .eq("id", commentId)
    .maybeSingle();

  if (fetchErr || !targetComment) {
    return NextResponse.json({ error: "Không tìm thấy bình luận cần xử lý!" }, { status: 404 });
  }

  // Quản trị viên: Có quyền trực tiếp ẩn/gắn cờ bình luận
  if (auth.isAdmin) {
    const sanitizedReason = sanitizeSafeText(cleanReason, 200);
    const { error: updateErr } = await supabaseAdmin
      .from("movie_comments")
      .update({
        is_flagged: true,
        flag_reason: sanitizedReason,
        updated_at: Date.now(),
      })
      .eq("id", commentId);

    if (updateErr) {
      console.error("[Comments API] Lỗi Admin flag comment:", updateErr);
      return NextResponse.json(
        { error: "Lỗi cơ sở dữ liệu khi gắn cờ bình luận: " + updateErr.message },
        { status: 500 }
      );
    }

    logSecurityEvent(req, {
      event: "ADMIN_ACTION",
      status: 200,
      userId: auth.userId,
      reason: `Admin ẩn bình luận ${commentId}: ${sanitizedReason}`,
      metadata: { commentId, flagReason: sanitizedReason },
    });

    if (targetComment?.movie_slug) {
      await invalidateCommentsCache(targetComment.movie_slug);
    }

    return NextResponse.json({
      success: true,
      action: "flagged_by_admin",
      commentId,
      isFlagged: true,
    });
  }

  // Người dùng thường: Áp dụng Rate Limit riêng (Tối đa 5 lượt / 10 phút)
  const reportRateLimit = await enforceRateLimit(
    req,
    {
      namespace: "comment-report",
      maxRequests: 5,
      windowSeconds: 600,
      failClosed: true,
    },
    auth.userId!
  );
  if (!reportRateLimit.allowed) {
    logSecurityEvent(req, {
      event: "RATE_LIMIT_EXCEEDED",
      status: 429,
      userId: auth.userId,
      reason: "Vượt quá giới hạn tần suất gửi báo cáo vi phạm",
    });
    return buildRateLimitResponse(
      reportRateLimit,
      "Bạn đã gửi quá nhiều báo cáo trong thời gian ngắn. Vui lòng chờ 10 phút trước khi thử lại."
    );
  }

  // Kiểm tra trùng lặp báo cáo
  const reportId = `rep_${commentId}_${auth.userId}`;
  const { data: existingReport, error: checkErr } = await supabaseAdmin
    .from("error_reports")
    .select("id")
    .eq("id", reportId)
    .maybeSingle();

  if (checkErr) {
    console.error("[Comments API] Lỗi kiểm tra duplicate report:", checkErr);
    return NextResponse.json(
      { error: "Lỗi cơ sở dữ liệu khi kiểm tra báo cáo: " + checkErr.message },
      { status: 500 }
    );
  }

  if (existingReport) {
    return NextResponse.json(
      {
        success: true,
        message: "Bạn đã gửi báo cáo cho bình luận này rồi. Ban quản trị đang trong quá trình xem xét.",
        alreadyReported: true,
      },
      { status: 200 }
    );
  }

  const sanitizedReason = sanitizeSafeText(cleanReason, 300);
  const movieTitleSafe = targetComment.movie_title || targetComment.movie_slug || "Phim";
  const reporterContact = auth.email ? ` (Email: ${auth.email})` : "";
  const { error: insertErr } = await supabaseAdmin.from("error_reports").insert({
    id: reportId,
    movie_slug: targetComment.movie_slug,
    movie_title: movieTitleSafe,
    issue_type: "comment_violation",
    description: `Báo cáo bình luận [ID: ${commentId}] từ tác giả [UID: ${targetComment.user_id}]: "${sanitizedReason}". Người báo cáo: ${auth.displayName || "Thành viên"}${reporterContact}. Trích đoạn: "${(targetComment.content || "").slice(0, 150)}"`,
    user_id: auth.userId,
    user_name: auth.displayName || "Thành viên",
    status: "pending",
    created_at: Date.now(),
  });

  if (insertErr) {
    if (insertErr.code === "23505" || insertErr.message?.includes("duplicate key")) {
      return NextResponse.json(
        {
          success: true,
          message: "Bạn đã gửi báo cáo cho bình luận này rồi. Ban quản trị đang trong quá trình xem xét.",
          alreadyReported: true,
        },
        { status: 200 }
      );
    }

    console.error("[Comments API] Lỗi ghi nhận báo cáo vào error_reports:", insertErr);
    return NextResponse.json(
      { error: "Lỗi cơ sở dữ liệu khi lưu báo cáo vi phạm: " + insertErr.message },
      { status: 500 }
    );
  }

  logSecurityEvent(req, {
    event: "SPAM_DETECTED",
    status: 200,
    userId: auth.userId,
    reason: `Người dùng báo cáo vi phạm bình luận ${commentId}`,
    metadata: { commentId, reason: sanitizedReason },
  });

  return NextResponse.json({
    success: true,
    message: "Cảm ơn bạn! Báo cáo vi phạm đã được gửi đến Ban quản trị để kiểm duyệt.",
    reported: true,
  });
}

/**
 * Thu thập tất cả các ID reply con/cháu (descendants) để xóa sạch theo cascade
 */
export async function collectDescendantCommentIds(
  supabaseAdmin: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  rootCommentId: string
): Promise<string[]> {
  let allDescendantIds: string[] = [];
  let currentParentIds = [rootCommentId];

  while (currentParentIds.length > 0) {
    const { data: children, error: childErr } = await supabaseAdmin
      .from("movie_comments")
      .select("id")
      .in("parent_id", currentParentIds)
      .limit(200);

    if (childErr || !children || children.length === 0) break;

    const foundIds = children
      .map((c) => String(c.id))
      .filter((id) => !allDescendantIds.includes(id) && id !== rootCommentId);
    if (foundIds.length === 0) break;

    allDescendantIds = allDescendantIds.concat(foundIds);
    currentParentIds = foundIds;
  }

  return allDescendantIds;
}
