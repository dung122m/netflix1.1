import { NextRequest, NextResponse } from "next/server";
import { checkContentModeration } from "@/lib/contentModeration";
import { sanitizeSafeText } from "@/lib/security";
import { verifyServerAuth } from "@/lib/serverAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
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
import {
  COMMENT_SELECT_FIELDS,
  mapCommentRecord,
  fetchReactionsMap,
  fetchProfilesMap,
  sortComments,
  invalidateCommentsCache,
  handleCommentReaction,
  handleCommentFlagOrReport,
  collectDescendantCommentIds,
} from "./commentHelpers";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

/**
 * GET /api/comments?movieSlug=xxx
 * Lấy bình luận an toàn qua Server Admin Client
 */
export async function GET(req: NextRequest) {
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

    const auth = await verifyServerAuth(req);
    const isAdmin = Boolean(auth.isAuthenticated && auth.isAdmin);
    const isFresh = searchParams.has("_t") || searchParams.get("fresh") === "true";

    const isPublicMovieQuery = Boolean(
      movieSlug &&
      !parentId &&
      !userId &&
      all !== "true" &&
      !isAdmin
    );

    if (isPublicMovieQuery && movieSlug) {
      if (isFresh) {
        const { data, error } = await supabaseAdmin
          .from("movie_comments")
          .select(COMMENT_SELECT_FIELDS)
          .eq("is_flagged", false)
          .eq("movie_slug", movieSlug)
          .order("created_at", { ascending: false })
          .limit(300);

        let mapped: MovieComment[] = [];
        if (!error && data && data.length > 0) {
          const [profileMap, reactionsMap] = await Promise.all([
            fetchProfilesMap(supabaseAdmin, data as Array<Record<string, unknown>>),
            fetchReactionsMap(supabaseAdmin, data as Array<Record<string, unknown>>),
          ]);
          mapped = sortComments(
            (data as Array<Record<string, unknown>>).map((d) => mapCommentRecord(d, false, profileMap, reactionsMap))
          );
        }

        await cacheService.set(`comments:movie:${movieSlug}`, mapped, 60).catch(() => false);

        return NextResponse.json(
          { success: true, items: mapped },
          {
            headers: {
              "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
              "CDN-Cache-Control": "no-store",
              "Vercel-CDN-Cache-Control": "no-store",
            },
          }
        );
      }

      const items = await cacheService.fetchOrSet<MovieComment[]>(
        `comments:movie:${movieSlug}`,
        async () => {
          const { data, error } = await supabaseAdmin
            .from("movie_comments")
            .select(COMMENT_SELECT_FIELDS)
            .eq("is_flagged", false)
            .eq("movie_slug", movieSlug)
            .order("created_at", { ascending: false })
            .limit(300);

          if (error || !data || data.length === 0) return [];
          const [profileMap, reactionsMap] = await Promise.all([
            fetchProfilesMap(supabaseAdmin, data as Array<Record<string, unknown>>),
            fetchReactionsMap(supabaseAdmin, data as Array<Record<string, unknown>>),
          ]);
          const mapped = (data as Array<Record<string, unknown>>).map((d) =>
            mapCommentRecord(d, false, profileMap, reactionsMap)
          );
          return sortComments(mapped);
        },
        180
      );

      return NextResponse.json(
        { success: true, items },
        {
          headers: {
            "Cache-Control": "public, max-age=15, s-maxage=30, stale-while-revalidate=60",
            "CDN-Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
            "Vercel-CDN-Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
          },
        }
      );
    }

    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");
    const isPaginated = Boolean(pageParam || limitParam);

    let query = supabaseAdmin.from("movie_comments").select(COMMENT_SELECT_FIELDS, { count: isPaginated ? "exact" : undefined });

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

    let page = 1;
    let limit = 100;
    if (isPaginated) {
      const parsedPage = Number.parseInt(pageParam || "1", 10);
      const parsedLimit = Number.parseInt(limitParam || "20", 10);
      page = Math.max(1, Number.isFinite(parsedPage) ? parsedPage : 1);
      limit = Math.max(1, Math.min(300, Number.isFinite(parsedLimit) ? parsedLimit : 20));
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);
    } else if (!movieSlug && !parentId && !userId && all !== "true") {
      query = query.limit(100);
    } else {
      query = query.limit(300);
    }

    const { data, count, error } = await query;
    if (error || !data) {
      return NextResponse.json({ success: true, items: [] });
    }

    const [profileMap, reactionsMap] = await Promise.all([
      fetchProfilesMap(supabaseAdmin, data as Array<Record<string, unknown>>),
      fetchReactionsMap(supabaseAdmin, data as Array<Record<string, unknown>>),
    ]);
    const items = sortComments(
      (data as Array<Record<string, unknown>>).map((d) => mapCommentRecord(d, isAdmin, profileMap, reactionsMap))
    );

    const responsePayload: Record<string, unknown> = { success: true, items };
    if (isPaginated) {
      responsePayload.pagination = {
        page,
        limit,
        totalItems: typeof count === "number" ? count : items.length,
        totalPages: Math.ceil((typeof count === "number" ? count : items.length) / limit),
      };
    }

    return NextResponse.json(responsePayload, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Lỗi API get comments:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST /api/comments
 * Gửi bình luận an toàn vào Supabase
 */
export async function POST(req: NextRequest) {
  try {
    const methodErr = validateHttpMethod(req, ["POST"]);
    if (methodErr) return methodErr;

    const typeErr = validateContentType(req, ["application/json"]);
    if (typeErr) return typeErr;

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
    } catch {}

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

    const targetUserId = replyToUserId || (parentOwnerId && parentOwnerId !== userId ? parentOwnerId : null);
    const notifTask =
      targetUserId && targetUserId !== userId
        ? (() => {
            const isDirect = Boolean(replyToUserId);
            return supabaseAdmin.from("notifications").upsert({
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
          })()
        : Promise.resolve();

    recordRecentContent(userId, rawContent);
    await Promise.allSettled([notifTask, invalidateCommentsCache(movieSlug)]);

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

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Supabase chưa được cấu hình" }, { status: 500 });
    }

    // 1. GHIM / BỎ GHIM BÌNH LUẬN: Dành riêng cho Quản trị viên
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

      const { error: pinErr } = await supabaseAdmin
        .from("movie_comments")
        .update({ is_pinned: Boolean(isPinned) })
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

      const { error: unflagErr } = await supabaseAdmin
        .from("movie_comments")
        .update({ is_flagged: false, flag_reason: null })
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

      const reactRateLimit = await enforceRateLimit(req, RATE_LIMIT_PRESETS.COMMENT_REACTION_IN_MEMORY, auth.userId);
      if (!reactRateLimit.allowed) {
        return buildRateLimitResponse(reactRateLimit);
      }

      return handleCommentReaction({
        commentId,
        reactionType,
        effectiveUserId: auth.userId,
        supabaseAdmin,
        auth,
      });
    }

    // 4. BÁO CÁO VI PHẠM (flag / report)
    if (action === "flag") {
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

      return handleCommentFlagOrReport({
        req,
        auth,
        commentId,
        reason,
        supabaseAdmin,
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
 * Cập nhật bình luận trên Supabase
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

    let body: Record<string, unknown> | null = null;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { commentId, rating, content, isSpoiler, episodeSlug, episodeName } = (body || {}) as {
      commentId?: string;
      rating?: number | string | null;
      content?: string;
      isSpoiler?: boolean;
      episodeSlug?: string;
      episodeName?: string;
    };
    if (!commentId) {
      return NextResponse.json({ error: "Thiếu commentId!" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Supabase chưa được cấu hình" }, { status: 500 });
    }

    const { data: existingComment, error: fetchErr } = await supabaseAdmin
      .from("movie_comments")
      .select("user_id, movie_slug, liked_by")
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

    const currentLikedBy =
      existingComment.liked_by && typeof existingComment.liked_by === "object"
        ? { ...(existingComment.liked_by as Record<string, unknown>) }
        : {};
    currentLikedBy.__edited_at = Date.now();

    const payload: Record<string, unknown> = {
      liked_by: currentLikedBy,
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
 * Xóa bình luận khỏi Supabase
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyServerAuth(req);
    if (!auth.isAuthenticated || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = await enforceRateLimit(req, RATE_LIMIT_PRESETS.COMMENT_DELETE, auth.userId);
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

    if (targetUserId) {
      if (!auth.isAdmin) {
        return NextResponse.json(
          { error: "Forbidden: Chỉ quản trị viên mới có quyền xóa hàng loạt bình luận" },
          { status: 403 }
        );
      }
      const { data: deletedRows, error } = await supabaseAdmin
        .from("movie_comments")
        .delete()
        .eq("user_id", targetUserId)
        .select("movie_slug");
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      const affectedSlugs = Array.from(
        new Set(
          ((deletedRows || []) as Array<{ movie_slug?: string | null }>)
            .map((r) => r.movie_slug)
            .filter((s): s is string => Boolean(s))
        )
      ).slice(0, 50);
      if (affectedSlugs.length > 0) {
        await Promise.allSettled(affectedSlugs.map((s) => invalidateCommentsCache(s)));
      }
      return NextResponse.json({ success: true, allDeletedForUser: targetUserId });
    }

    if (!commentId) {
      return NextResponse.json({ error: "Thiếu commentId!" }, { status: 400 });
    }

    const { data: existingComment, error: fetchErr } = await supabaseAdmin
      .from("movie_comments")
      .select("user_id, movie_slug")
      .eq("id", commentId)
      .maybeSingle();

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

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

    const allDescendantIds = await collectDescendantCommentIds(supabaseAdmin, commentId);

    if (allDescendantIds.length > 0) {
      const { error: deleteChildrenErr } = await supabaseAdmin
        .from("movie_comments")
        .delete()
        .in("id", allDescendantIds);

      if (deleteChildrenErr) {
        return NextResponse.json({ error: deleteChildrenErr.message }, { status: 500 });
      }
    }

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
