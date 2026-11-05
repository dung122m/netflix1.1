import { NextRequest, NextResponse } from "next/server";
import { checkContentModeration } from "@/lib/contentModeration";
import { sanitizeSafeText } from "@/lib/security";
import { verifyServerAuth } from "@/lib/serverAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { parseReactionsAndLikedBy } from "@/services/supabaseService";
import { MovieComment } from "@/types/comment";
import { cacheService } from "@/lib/cache";
import {
  enforceRateLimit,
  buildRateLimitResponse,
  RATE_LIMIT_PRESETS,
} from "@/lib/rateLimit";
import {
  safeParseJson,
  validateHttpMethod,
  validateContentType,
  detectMaliciousPayload,
  detectContentSpam,
  isDuplicateContent,
  recordRecentContent,
} from "@/lib/securityValidation";
import { logSecurityEvent } from "@/lib/securityLogger";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function mapCommentRecord(d: Record<string, unknown>, isAdmin: boolean = false): MovieComment {
  const { likedBy, reactions } = parseReactionsAndLikedBy(d.liked_by);
  return {
    id: String(d.id),
    movieSlug: String(d.movie_slug || ""),
    movieTitle: String(d.movie_title || ""),
    userId: String(d.user_id || ""),
    userName: String(d.user_name || "Thành viên"),
    userAvatar: String(d.user_avatar || ""),
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
    isEdited: Boolean(
      d.is_edited ??
        d.isEdited ??
        (Number(d.updated_at) > (Number(d.created_at) || 0) + 3000)
    ),
    editedAt:
      d.edited_at
        ? Number(d.edited_at)
        : Number(d.updated_at) > (Number(d.created_at) || 0) + 3000
        ? Number(d.updated_at)
        : undefined,
  };
}

function sortComments(items: MovieComment[]): MovieComment[] {
  return items.sort((a, b) => {
    const isPinnedA = Boolean(a.isPinned);
    const isPinnedB = Boolean(b.isPinned);
    if (isPinnedA && !isPinnedB) return -1;
    if (!isPinnedA && isPinnedB) return 1;
    return (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0);
  });
}

async function invalidateCommentsCache(movieSlug?: string, commentId?: string): Promise<void> {
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
 * GET /api/comments?movieSlug=xxx
 * Lấy bình luận an toàn qua Server Admin Client
 */
export async function GET(req: NextRequest) {
  // 1. Giới hạn tần suất phân tán (60 req / phút / IP)
  const rateLimit = await enforceRateLimit(req, RATE_LIMIT_PRESETS.COMMENTS_READ_IN_MEMORY);
  if (!rateLimit.allowed) {
    logSecurityEvent(req, {
      event: "RATE_LIMIT_EXCEEDED",
      status: 429,
      reason: rateLimit.reason,
    });
    return buildRateLimitResponse(rateLimit);
  }

  const { searchParams } = new URL(req.url);
  const movieSlug = searchParams.get("movieSlug");
  const parentId = searchParams.get("parentId");
  const userId = searchParams.get("userId");
  const all = searchParams.get("all");

  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ success: true, items: [] });
    }

    // Kiểm tra quyền Admin (chỉ Admin mới được xem flag_reason và email người dùng)
    const auth = await verifyServerAuth(req);
    const isAdmin = Boolean(auth.isAuthenticated && auth.isAdmin);

    // 2. Tối ưu hoá Cache cho truy vấn công khai theo bộ phim (Giảm tải Supabase)
    const isPublicMovieQuery = Boolean(
      movieSlug &&
      !parentId &&
      !userId &&
      all !== "true" &&
      !isAdmin
    );

    if (isPublicMovieQuery && movieSlug) {
      const items = await cacheService.fetchOrSet<MovieComment[]>(
        `comments:movie:${movieSlug}`,
        async () => {
          const { data, error } = await supabaseAdmin
            .from("movie_comments")
            .select("*")
            .eq("is_flagged", false)
            .eq("movie_slug", movieSlug)
            .order("created_at", { ascending: false });

          if (error || !data) return [];
          const mapped = (data as Array<Record<string, unknown>>).map((d) => mapCommentRecord(d, false));
          return sortComments(mapped);
        },
        60 // TTL 60 giây (tự động xóa khi có tương tác mới)
      );

      return NextResponse.json(
        { success: true, items },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
            "CDN-Cache-Control": "no-store",
            "Vercel-CDN-Cache-Control": "no-store",
          },
        }
      );
    }

    let query = supabaseAdmin.from("movie_comments").select("*");

    if (all !== "true" || !isAdmin) {
      query = query.eq("is_flagged", false);
    }
    if (movieSlug) {
      query = query.eq("movie_slug", movieSlug);
    } else if (parentId) {
      query = query.eq("parent_id", parentId);
    } else if (userId) {
      query = query.eq("user_id", userId);
    }

    query = query.order("created_at", { ascending: false });
    if (!movieSlug && !parentId && !userId && all !== "true") {
      query = query.limit(100);
    }

    const { data, error } = await query;
    if (error || !data) {
      return NextResponse.json({ success: true, items: [] });
    }

    const items = sortComments(
      (data as Array<Record<string, unknown>>).map((d) => mapCommentRecord(d, isAdmin))
    );

    return NextResponse.json(
      { success: true, items },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          "CDN-Cache-Control": "no-store",
          "Vercel-CDN-Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Lỗi API get comments:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST /api/comments
 * Gửi bình luận an toàn vào Supabase
 * Xác thực danh tính qua Firebase Auth, không tin tưởng userId/userName/userAvatar từ client.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Kiểm tra phương thức HTTP & Content-Type
    const methodErr = validateHttpMethod(req, ["POST"]);
    if (methodErr) return methodErr;

    const typeErr = validateContentType(req, ["application/json"]);
    if (typeErr) return typeErr;

    // 2. Xác thực danh tính bắt buộc qua Firebase Auth
    const auth = await verifyServerAuth(req);
    if (!auth.isAuthenticated || !auth.userId) {
      logSecurityEvent(req, {
        event: "AUTH_FAILURE",
        status: 401,
        reason: "Yêu cầu đăng nhập trước khi bình luận",
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = auth.userId;
    const userEmail = auth.email || "";

    // 3. Giới hạn tần suất phân tán Fail-Closed (5 lần / 10 phút / user)
    const rateLimit = await enforceRateLimit(req, RATE_LIMIT_PRESETS.COMMENT_CREATE, userId);
    if (!rateLimit.allowed) {
      logSecurityEvent(req, {
        event: "RATE_LIMIT_EXCEEDED",
        status: 429,
        userId,
        reason: rateLimit.reason || "Vượt quá giới hạn đăng bình luận",
      });
      return buildRateLimitResponse(
        rateLimit,
        "Bạn đang gửi bình luận quá nhanh. Vui lòng chờ ít phút trước khi đăng bình luận tiếp theo."
      );
    }

    // 4. Đọc JSON an toàn với giới hạn kích thước tối đa 50KB
    const parseRes = await safeParseJson<Record<string, unknown>>(req, 50 * 1024);
    if (!parseRes.success) {
      logSecurityEvent(req, {
        event: "PAYLOAD_TOO_LARGE",
        status: 400,
        userId,
        reason: "Payload bình luận vượt quá giới hạn 50KB",
      });
      return parseRes.response;
    }

    const body = parseRes.data;

    // 5. Kiểm tra mã độc hoặc injection trong payload
    const malCheck = detectMaliciousPayload(body);
    if (malCheck.isMalicious) {
      logSecurityEvent(req, {
        event: "MALICIOUS_PAYLOAD",
        status: 400,
        userId,
        reason: malCheck.reason,
      });
      return NextResponse.json(
        { error: malCheck.reason || "Nội dung bình luận chứa định dạng không hợp lệ." },
        { status: 400 }
      );
    }

    const movieSlug = typeof body.movieSlug === "string" ? body.movieSlug.trim() : "";
    const movieTitle = typeof body.movieTitle === "string" ? body.movieTitle.trim() : "";
    const rating = typeof body.rating === "number" ? body.rating : undefined;
    const rawContent = typeof body.content === "string" ? body.content.trim() : "";
    const isSpoiler = Boolean(body.isSpoiler);
    const episodeSlug = typeof body.episodeSlug === "string" ? body.episodeSlug.trim() : undefined;
    const episodeName = typeof body.episodeName === "string" ? body.episodeName.trim() : undefined;
    const parentId = typeof body.parentId === "string" ? body.parentId.trim() : undefined;
    const parentOwnerId = typeof body.parentOwnerId === "string" ? body.parentOwnerId.trim() : undefined;
    const replyToUserId = typeof body.replyToUserId === "string" ? body.replyToUserId.trim() : undefined;
    const replyToUserName = typeof body.replyToUserName === "string" ? body.replyToUserName.trim() : undefined;

    if (!movieSlug || !rawContent) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc!" }, { status: 400 });
    }

    // 6. Kiểm tra spam nội dung (link lặp lại, từ khóa rác)
    const spamCheck = detectContentSpam(rawContent);
    if (spamCheck.isSpam) {
      logSecurityEvent(req, {
        event: "SPAM_DETECTED",
        status: 400,
        userId,
        reason: spamCheck.reason,
      });
      return NextResponse.json(
        { error: spamCheck.reason || "Nội dung bình luận có dấu hiệu spam." },
        { status: 400 }
      );
    }

    // 7. Kiểm tra spam bình luận trùng lặp gửi liên tục
    if (isDuplicateContent(userId, rawContent, 60)) {
      logSecurityEvent(req, {
        event: "SPAM_DETECTED",
        status: 400,
        userId,
        reason: "Phát hiện gửi bình luận có nội dung trùng lặp liên tục",
      });
      return NextResponse.json(
        { error: "Bạn vừa gửi một bình luận có nội dung tương tự. Vui lòng không spam bình luận trùng lặp." },
        { status: 400 }
      );
    }

    const content = sanitizeSafeText(rawContent, 2000);

    const modCheck = checkContentModeration(content);
    if (!modCheck.isAllowed) {
      return NextResponse.json({ error: modCheck.reason || "Nội dung vi phạm tiêu chuẩn cộng đồng!" }, { status: 400 });
    }

    let userName = auth.displayName || (auth.email ? auth.email.split("@")[0] : "") || "Thành viên Nanaflix";
    let userAvatar = auth.photoUrl || "";

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Supabase chưa được cấu hình" }, { status: 500 });
    }

    try {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("is_comment_restricted, display_name, photo_url, custom_avatar")
        .eq("id", userId)
        .maybeSingle();

      if (profile?.is_comment_restricted) {
        return NextResponse.json(
          { error: "Tài khoản của bạn tạm thời bị khóa tính năng bình luận do vi phạm tiêu chuẩn cộng đồng!" },
          { status: 403 }
        );
      }
      if (profile?.display_name) userName = profile.display_name;
      if (profile?.custom_avatar || profile?.photo_url) userAvatar = profile.custom_avatar || profile.photo_url;
    } catch {
      // Sử dụng tên/avatar từ Firebase token
    }

    const commentId = `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = Date.now();

    let safeRating = 0;
    if (rating !== undefined && !isNaN(rating) && rating >= 1 && rating <= 5) {
      safeRating = Math.round(rating);
    }

    const payload = {
      id: commentId,
      movie_slug: movieSlug,
      movie_title: movieTitle || "",
      user_id: userId,
      user_name: sanitizeSafeText(userName, 100),
      user_avatar: userAvatar || "",
      user_email: userEmail || "",
      rating: safeRating,
      content: sanitizeSafeText(content, 2500),
      episode_slug: episodeSlug || null,
      episode_name: episodeName || null,
      parent_id: parentId || null,
      parent_owner_id: parentOwnerId || null,
      reply_to_user_id: replyToUserId || null,
      reply_to_user_name: replyToUserName ? sanitizeSafeText(replyToUserName, 100) : null,
      is_spoiler: Boolean(isSpoiler),
      likes: 0,
      liked_by: [],
      is_flagged: false,
      is_approved: true,
      is_pinned: false,
      created_at: now,
      updated_at: now,
    };

    const { error: insertErr } = await supabaseAdmin.from("movie_comments").insert(payload);
    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // Tạo thông báo phản hồi hợp lệ ở phía server qua supabaseAdmin
    const targetUserId = replyToUserId || (parentOwnerId && parentOwnerId !== userId ? parentOwnerId : null);
    if (targetUserId && targetUserId !== userId) {
      const isDirect = Boolean(replyToUserId);
      try {
        await supabaseAdmin.from("notifications").upsert({
          id: `notif_reply_${commentId}_${targetUserId}`,
          user_id: targetUserId,
          type: "comment_reply",
          title: isDirect
            ? `${userName} đã trả lời bình luận của bạn`
            : `${userName} đã bình luận trong bài đánh giá của bạn`,
          message: content.length > 80 ? content.slice(0, 80) + "..." : content,
          link: `/movies/${movieSlug}?highlightComment=${commentId}#comment-${commentId}`,
          movie_slug: movieSlug,
          comment_id: commentId,
          replier_name: userName,
          replier_avatar: userAvatar,
          is_read: false,
          created_at: Date.now(),
        }, { onConflict: "id" });
      } catch {}
    }

    // Ghi nhận nội dung đã gửi vào bộ nhớ đệm chống trùng lặp
    recordRecentContent(userId, rawContent);

    // Xóa cache bình luận phim để phản ánh ngay bình luận mới
    await invalidateCommentsCache(movieSlug);

    return NextResponse.json({ success: true, id: commentId });
  } catch (error) {
    console.error("Lỗi API post comment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * PATCH /api/comments
 * Ghim/bỏ ghim (chỉ Admin), thả reaction, báo cáo/gỡ báo cáo bình luận trên Supabase
 */
export async function PATCH(req: NextRequest) {
  try {
    const parseRes = await safeParseJson<Record<string, unknown>>(req, 20 * 1024);
    if (!parseRes.success) {
      return parseRes.response;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = parseRes.data as Record<string, any>;
    const { commentId, isPinned, action, reactionType, reason } = body;
    if (!commentId) {
      return NextResponse.json({ error: "Thiếu commentId!" }, { status: 400 });
    }

    // Rate limit: Phân biệt thao tác reaction (tần suất cao, in-memory) với các thao tác quản trị khác
    if (action !== "reaction") {
      const rateLimit = await enforceRateLimit(req, RATE_LIMIT_PRESETS.COMMENT_MUTATION);
      if (!rateLimit.allowed) {
        logSecurityEvent(req, {
          event: "RATE_LIMIT_EXCEEDED",
          status: 429,
          reason: rateLimit.reason || "Vượt quá giới hạn thao tác bình luận",
        });
        return buildRateLimitResponse(rateLimit);
      }
    }

    // 1. GHIM / BỎ GHIM BÌNH LUẬN: Dành riêng cho Quản trị viên (Admin-only)
    if (isPinned !== undefined || action === "pin") {
      const auth = await verifyServerAuth(req);
      if (!auth.isAuthenticated) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (!auth.isAdmin) {
        return NextResponse.json(
          { error: "Forbidden: Chỉ quản trị viên mới có quyền ghim bình luận!" },
          { status: 403 }
        );
      }

      const supabaseAdmin = getSupabaseAdmin();
      if (!supabaseAdmin) {
        return NextResponse.json({ error: "Supabase chưa được cấu hình" }, { status: 500 });
      }

      const { error: pinErr } = await supabaseAdmin
        .from("movie_comments")
        .update({ is_pinned: Boolean(isPinned), updated_at: Date.now() })
        .eq("id", commentId);

      if (pinErr) {
        console.error("[Comments API] Lỗi ghim bình luận:", pinErr);
        return NextResponse.json({ error: "Lỗi cơ sở dữ liệu khi ghim bình luận: " + pinErr.message }, { status: 500 });
      }

      await invalidateCommentsCache(undefined, commentId);

      return NextResponse.json({ success: true });
    }

    // 2. GỠ ĐÁNH DẤU VI PHẠM (unflag): Dành riêng cho Quản trị viên
    if (action === "unflag") {
      const auth = await verifyServerAuth(req);
      if (!auth.isAuthenticated) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (!auth.isAdmin) {
        return NextResponse.json(
          { error: "Forbidden: Chỉ quản trị viên mới có quyền gỡ cờ bình luận!" },
          { status: 403 }
        );
      }

      const supabaseAdmin = getSupabaseAdmin();
      if (!supabaseAdmin) {
        return NextResponse.json({ error: "Supabase chưa được cấu hình" }, { status: 500 });
      }

      const { error: unflagErr } = await supabaseAdmin
        .from("movie_comments")
        .update({ is_flagged: false, flag_reason: null, updated_at: Date.now() })
        .eq("id", commentId);

      if (unflagErr) {
        console.error("[Comments API] Lỗi gỡ cờ bình luận:", unflagErr);
        return NextResponse.json({ error: "Lỗi cơ sở dữ liệu khi gỡ cờ: " + unflagErr.message }, { status: 500 });
      }

      await invalidateCommentsCache(undefined, commentId);

      return NextResponse.json({ success: true });
    }

    // 3. THẢ CẢM XÚC (reaction)
    if (action === "reaction") {
      const auth = await verifyServerAuth(req);
      if (!auth.isAuthenticated || !auth.userId) {
        return NextResponse.json({ error: "Unauthorized: Vui lòng đăng nhập để thả cảm xúc" }, { status: 401 });
      }
      const effectiveUserId = auth.userId;

      // Rate limit thao tác reaction theo người dùng kết hợp IP (Dual-Key) - In-Memory (0 Redis commands)
      const reactRateLimit = await enforceRateLimit(req, RATE_LIMIT_PRESETS.COMMENT_REACTION_IN_MEMORY, effectiveUserId);
      if (!reactRateLimit.allowed) {
        return buildRateLimitResponse(reactRateLimit);
      }

      if (effectiveUserId) {
        const supabaseAdmin = getSupabaseAdmin();
        if (!supabaseAdmin) {
          return NextResponse.json({ error: "Supabase chưa được cấu hình" }, { status: 500 });
        }

        const { data: cmtData } = await supabaseAdmin
          .from("movie_comments")
          .select("likes, liked_by, user_id, user_name, movie_slug, content")
          .eq("id", commentId)
          .maybeSingle();

        if (cmtData) {
          const { reactions } = parseReactionsAndLikedBy(cmtData.liked_by);
          const updatedReactions: Record<string, string> = { ...reactions };

          if (reactionType) {
            updatedReactions[effectiveUserId] = reactionType;
          } else {
            delete updatedReactions[effectiveUserId];
          }

          const newLikedBy = Object.keys(updatedReactions);
          const newLikes = newLikedBy.length;

          const { error: reactionErr } = await supabaseAdmin
            .from("movie_comments")
            .update({
              likes: newLikes,
              liked_by: updatedReactions,
              updated_at: Date.now(),
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
      }
      return NextResponse.json({ success: true });
    }

    // 4. BÁO CÁO VI PHẠM (flag / report)
    if (action === "flag") {
      // 4.1 Bắt buộc xác thực danh tính qua Firebase Token
      const auth = await verifyServerAuth(req);
      if (!auth.isAuthenticated || !auth.userId) {
        logSecurityEvent(req, {
          event: "AUTH_FAILURE",
          status: 401,
          reason: "Yêu cầu đăng nhập để báo cáo hoặc kiểm duyệt bình luận",
        });
        return NextResponse.json(
          { error: "Unauthorized: Vui lòng đăng nhập để thực hiện thao tác này." },
          { status: 401 }
        );
      }

      // 4.2 Kiểm tra dữ liệu đầu vào (commentId và reason)
      const cleanReason = typeof reason === "string" ? reason.trim() : "";
      if (!cleanReason) {
        return NextResponse.json(
          { error: "Lý do báo cáo không được để trống!" },
          { status: 400 }
        );
      }

      // 4.3 Kiểm tra bình luận mục tiêu có tồn tại không
      const supabaseAdmin = getSupabaseAdmin();
      if (!supabaseAdmin) {
        return NextResponse.json({ error: "Supabase chưa được cấu hình" }, { status: 500 });
      }

      const { data: targetComment, error: fetchErr } = await supabaseAdmin
        .from("movie_comments")
        .select("id, movie_slug, movie_title, user_id, content, is_flagged")
        .eq("id", commentId)
        .maybeSingle();

      if (fetchErr || !targetComment) {
        return NextResponse.json(
          { error: "Không tìm thấy bình luận cần xử lý!" },
          { status: 404 }
        );
      }

      // 4.4 QUẢN TRỊ VIÊN (Admin-only): Có quyền trực tiếp ẩn/gắn cờ bình luận
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

      // 4.5 NGƯỜI DÙNG THƯỜNG: Không được phép tự động ẩn bình luận
      // Áp dụng Rate Limit riêng chống spam report (Tối đa 5 lượt báo cáo / 10 phút / user)
      const reportRateLimit = await enforceRateLimit(
        req,
        {
          namespace: "comment-report",
          maxRequests: 5,
          windowSeconds: 600,
          failClosed: true,
        },
        auth.userId
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

      // Kiểm tra trùng lặp: Ngăn 1 user gửi báo cáo lặp vô hạn cho cùng 1 bình luận
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

      // Ghi nhận báo cáo vào bảng error_reports (bình luận KHÔNG bị ẩn, is_flagged giữ nguyên)
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
        // Phân biệt Postgres Unique Key Violation (code 23505) với lỗi DB thực sự
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lỗi API patch comment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * PUT /api/comments
 * Cập nhật bình luận trên Supabase (Yêu cầu đăng nhập; chỉ tác giả hoặc Admin mới được sửa)
 */
export async function PUT(req: NextRequest) {
  try {
    const auth = await verifyServerAuth(req);
    if (!auth.isAuthenticated || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = await enforceRateLimit(req, {
      namespace: "comments-update",
      maxRequests: 20,
      windowSeconds: 600,
      failClosed: true,
    }, auth.userId);
    if (!rateLimit.allowed) {
      return buildRateLimitResponse(rateLimit);
    }

    const body = await req.json();
    const { commentId, rating, content, isSpoiler, episodeSlug, episodeName } = body;
    if (!commentId) {
      return NextResponse.json({ error: "Thiếu commentId!" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Supabase chưa được cấu hình" }, { status: 500 });
    }

    // Kiểm tra quyền sở hữu bình luận từ cơ sở dữ liệu (không tin tưởng client)
    const { data: existingComment, error: fetchErr } = await supabaseAdmin
      .from("movie_comments")
      .select("user_id, movie_slug")
      .eq("id", commentId)
      .maybeSingle();

    if (fetchErr || !existingComment) {
      return NextResponse.json({ error: "Không tìm thấy bình luận" }, { status: 404 });
    }

    const isOwner = existingComment.user_id === auth.userId;
    const isAdmin = Boolean(auth.isAdmin);

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Bạn không có quyền chỉnh sửa bình luận này" },
        { status: 403 }
      );
    }

    if (content !== undefined) {
      const modCheck = checkContentModeration(content);
      if (!modCheck.isAllowed) {
        return NextResponse.json(
          { error: modCheck.reason || "Nội dung vi phạm tiêu chuẩn cộng đồng!" },
          { status: 400 }
        );
      }
    }

    const payload: Record<string, unknown> = {
      updated_at: Date.now(),
    };
    if (rating !== undefined) {
      if (rating === null || rating === 0 || rating === "") {
        payload.rating = 0;
      } else {
        const parsed = Number(rating);
        payload.rating = !isNaN(parsed) && parsed >= 1 && parsed <= 5 ? Math.round(parsed) : 0;
      }
    }
    if (content !== undefined) payload.content = sanitizeSafeText(content, 2500);
    if (isSpoiler !== undefined) payload.is_spoiler = Boolean(isSpoiler);
    if (episodeSlug !== undefined) payload.episode_slug = episodeSlug;
    if (episodeName !== undefined) payload.episode_name = episodeName;

    const { error: updateErr } = await supabaseAdmin
      .from("movie_comments")
      .update(payload)
      .eq("id", commentId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    if (existingComment?.movie_slug) {
      await invalidateCommentsCache(existingComment.movie_slug);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lỗi API update comment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE /api/comments?commentId=xxx hoặc ?userId=xxx (Admin-only)
 * Xóa bình luận khỏi Supabase (Yêu cầu đăng nhập; chỉ tác giả hoặc Admin mới được xóa)
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyServerAuth(req);
    if (!auth.isAuthenticated || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = await enforceRateLimit(
      req,
      RATE_LIMIT_PRESETS.COMMENT_DELETE,
      auth.userId
    );
    if (!rateLimit.allowed) {
      logSecurityEvent(req, {
        event: "RATE_LIMIT_EXCEEDED",
        status: 429,
        userId: auth.userId,
        reason: rateLimit.reason || "Vượt quá giới hạn xóa bình luận",
      });
      return buildRateLimitResponse(rateLimit);
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Supabase chưa được cấu hình" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("userId");
    const commentId = searchParams.get("commentId");

    // Cho phép Admin xóa toàn bộ comment của một user
    if (targetUserId) {
      if (!auth.isAdmin) {
        return NextResponse.json(
          { error: "Forbidden: Chỉ quản trị viên mới có quyền xóa hàng loạt bình luận" },
          { status: 403 }
        );
      }
      const { error } = await supabaseAdmin.from("movie_comments").delete().eq("user_id", targetUserId);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, allDeletedForUser: targetUserId });
    }

    if (!commentId) {
      return NextResponse.json({ error: "Thiếu commentId!" }, { status: 400 });
    }

    // Kiểm tra quyền sở hữu bình luận từ cơ sở dữ liệu (không tin tưởng client)
    const { data: existingComment, error: fetchErr } = await supabaseAdmin
      .from("movie_comments")
      .select("user_id, movie_slug")
      .eq("id", commentId)
      .maybeSingle();

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    // Tính chất lũy thừa (Idempotent): nếu bình luận không còn trong DB (đã xóa), trả về thành công
    if (!existingComment) {
      return NextResponse.json({ success: true, alreadyDeleted: true });
    }

    const isOwner = existingComment.user_id === auth.userId;
    const isAdmin = Boolean(auth.isAdmin);

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Bạn không có quyền xóa bình luận này" },
        { status: 403 }
      );
    }

    // Thu thập tất cả các reply con/cháu (descendants) để xóa sạch, tránh để lại orphaned replies
    let allDescendantIds: string[] = [];
    let currentParentIds = [commentId];
    while (currentParentIds.length > 0) {
      const { data: children, error: childErr } = await supabaseAdmin
        .from("movie_comments")
        .select("id")
        .in("parent_id", currentParentIds);

      if (childErr) {
        return NextResponse.json({ error: childErr.message }, { status: 500 });
      }
      if (!children || children.length === 0) break;

      const foundIds = children
        .map((c) => String(c.id))
        .filter((id) => !allDescendantIds.includes(id) && id !== commentId);
      if (foundIds.length === 0) break;

      allDescendantIds = allDescendantIds.concat(foundIds);
      currentParentIds = foundIds;
    }

    // Thứ tự an toàn: Xóa toàn bộ con cháu trước nếu có
    if (allDescendantIds.length > 0) {
      const { error: deleteChildrenErr } = await supabaseAdmin
        .from("movie_comments")
        .delete()
        .in("id", allDescendantIds);

      if (deleteChildrenErr) {
        return NextResponse.json({ error: deleteChildrenErr.message }, { status: 500 });
      }
    }

    // Sau khi dọn dẹp các reply con thành công, xóa bình luận chính
    const { error: deleteErr } = await supabaseAdmin.from("movie_comments").delete().eq("id", commentId);
    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    if (existingComment?.movie_slug) {
      await invalidateCommentsCache(existingComment.movie_slug);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lỗi API delete comment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
