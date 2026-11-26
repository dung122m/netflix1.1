import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sanitizeSafeText } from "@/lib/security";
import { verifyServerAuth } from "@/lib/serverAuth";
import {
  enforceRateLimit,
  buildRateLimitResponse,
  RATE_LIMIT_PRESETS,
} from "@/lib/rateLimit";
import { safeParseJson } from "@/lib/securityValidation";
import { movieApi } from "@/services/movies/service";
import { cacheService } from "@/lib/cache";
import { NO_CACHE_HEADERS } from "@/lib/cacheHeaders";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const ALLOWED_NOTIFICATION_TYPES = ["comment_reply", "comment_reaction"] as const;

/**
 * GET /api/notifications
 * - Yêu cầu xác thực Firebase auth, chỉ lấy thông báo Bình luận (comment_reply) và Cảm xúc (comment_reaction)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  // Loại bỏ hoàn toàn thông báo system / movie recommendation ngoài luồng
  if (type === "system") {
    return NextResponse.json({ success: true, items: [] });
  }

  const auth = await verifyServerAuth(req);
  if (!auth.isAuthenticated || !auth.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await enforceRateLimit(req, RATE_LIMIT_PRESETS.USER_READ, auth.userId);
  if (!rateLimit.allowed) {
    return buildRateLimitResponse(rateLimit);
  }

  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: true, items: [] });
    }

    // Chỉ truy vấn đúng 2 loại thông báo: Comment (comment_reply) và Like (comment_reaction)
    const { data, error } = await supabase
      .from("notifications")
      .select("id, user_id, type, title, message, link, movie_slug, comment_id, replier_name, replier_avatar, is_read, created_at")
      .eq("user_id", auth.userId)
      .in("type", ALLOWED_NOTIFICATION_TYPES)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !data) {
      return NextResponse.json({ success: true, items: [] });
    }

    // Thu thập danh sách slug phim để giải mã tiêu đề tiếng Việt chuẩn có dấu
    const movieSlugs = Array.from(
      new Set(data.map((d) => d.movie_slug).filter((s): s is string => Boolean(s)))
    );
    const movieTitleMap = new Map<string, string>();

    if (movieSlugs.length > 0) {
      try {
        const { data: comments } = await supabase
          .from("movie_comments")
          .select("movie_slug, movie_title")
          .in("movie_slug", movieSlugs)
          .not("movie_title", "is", null)
          .neq("movie_title", "")
          .limit(Math.max(movieSlugs.length * 3, 60));

        if (comments) {
          for (const c of comments) {
            if (c.movie_slug && c.movie_title && !movieTitleMap.has(c.movie_slug)) {
              movieTitleMap.set(c.movie_slug, c.movie_title);
            }
          }
        }
      } catch {}

      // Bổ sung các phim chưa tìm thấy qua cacheService / movieApi
      const missingSlugs = movieSlugs.filter((s) => !movieTitleMap.has(s));
      if (missingSlugs.length > 0) {
        await Promise.allSettled(
          missingSlugs.slice(0, 10).map(async (slug) => {
            try {
              // 1. Kiểm tra cache Redis/L1 trước (0ms)
              const cachedTitle = await cacheService.get<string>(`movie:title:${slug}`);
              if (cachedTitle) {
                movieTitleMap.set(slug, cachedTitle);
                return;
              }
              // 2. Fallback gọi movieApi với timeout 1.5s và lưu cache 7 ngày
              const detail = await Promise.race([
                movieApi.getMovieDetail(slug),
                new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
              ]);
              const name = detail?.movie?.name || detail?.movie?.title;
              if (name) {
                movieTitleMap.set(slug, name);
                await cacheService.set(`movie:title:${slug}`, name, 86400 * 7).catch(() => false);
              }
            } catch {}
          })
        );
      }
    }

    // 2. Tra cứu avatar và tên mới nhất từ bảng profiles cho người gửi thông báo
    interface LiveActorProfile {
      custom_avatar?: string | null;
      photo_url?: string | null;
      display_name?: string | null;
    }

    const replyCommentIds = Array.from(
      new Set(
        data
          .filter((d) => d.type === "comment_reply" && d.comment_id)
          .map((d) => String(d.comment_id)),
      ),
    );
    const reactionCommentIds = Array.from(
      new Set(
        data
          .filter((d) => d.type === "comment_reaction" && d.comment_id)
          .map((d) => String(d.comment_id)),
      ),
    );

    const notifActorIdMap = new Map<string, string>();
    const profileByIdMap = new Map<string, LiveActorProfile>();
    const uniqueNameProfileMap = new Map<string, LiveActorProfile | null>();

    try {
      const [replyCommentsRes, reactionRowsRes] = await Promise.all([
        replyCommentIds.length > 0
          ? supabase
              .from("movie_comments")
              .select("id, user_id")
              .in("id", replyCommentIds)
          : Promise.resolve({ data: null }),
        reactionCommentIds.length > 0
          ? supabase
              .from("comment_reactions")
              .select("comment_id, user_id, updated_at")
              .in("comment_id", reactionCommentIds)
              .order("updated_at", { ascending: false })
              .limit(300)
          : Promise.resolve({ data: null }),
      ]);

      const replyAuthorByCommentId = new Map<string, string>();
      if (Array.isArray(replyCommentsRes?.data)) {
        for (const row of replyCommentsRes.data) {
          if (row.id && row.user_id) {
            replyAuthorByCommentId.set(String(row.id), String(row.user_id));
          }
        }
      }

      const reactorByCommentId = new Map<string, string>();
      if (Array.isArray(reactionRowsRes?.data)) {
        for (const row of reactionRowsRes.data) {
          const cid = row.comment_id ? String(row.comment_id) : "";
          const uid = row.user_id ? String(row.user_id) : "";
          if (cid && uid && uid !== auth.userId && !reactorByCommentId.has(cid)) {
            reactorByCommentId.set(cid, uid);
          }
        }
      }

      const actorUserIds = new Set<string>();
      const unresolvedNames = new Set<string>();

      for (const d of data) {
        const cid = d.comment_id ? String(d.comment_id) : "";
        let actorId = "";
        if (d.type === "comment_reply" && cid) {
          actorId = replyAuthorByCommentId.get(cid) || "";
        } else if (d.type === "comment_reaction" && cid) {
          actorId = reactorByCommentId.get(cid) || "";
        }

        if (actorId) {
          notifActorIdMap.set(String(d.id), actorId);
          actorUserIds.add(actorId);
        } else if (d.replier_name && typeof d.replier_name === "string" && d.replier_name.trim()) {
          unresolvedNames.add(d.replier_name.trim());
        }
      }

      const [profilesByIdRes, profilesByNameRes] = await Promise.all([
        actorUserIds.size > 0
          ? supabase
              .from("profiles")
              .select("id, custom_avatar, photo_url, display_name")
              .in("id", Array.from(actorUserIds))
          : Promise.resolve({ data: null }),
        unresolvedNames.size > 0
          ? supabase
              .from("profiles")
              .select("id, custom_avatar, photo_url, display_name")
              .in("display_name", Array.from(unresolvedNames))
          : Promise.resolve({ data: null }),
      ]);

      if (Array.isArray(profilesByIdRes?.data)) {
        for (const p of profilesByIdRes.data) {
          if (p.id) {
            profileByIdMap.set(String(p.id), p);
          }
        }
      }

      if (Array.isArray(profilesByNameRes?.data)) {
        for (const p of profilesByNameRes.data) {
          const nameKey = p.display_name ? String(p.display_name).trim() : "";
          if (!nameKey) continue;
          if (!uniqueNameProfileMap.has(nameKey)) {
            uniqueNameProfileMap.set(nameKey, p);
          } else {
            // Ambiguous display_name shared by multiple users -> do not guess
            uniqueNameProfileMap.set(nameKey, null);
          }
        }
      }
    } catch {}

    const items = data.map((d) => {
      const actorId = notifActorIdMap.get(String(d.id));
      const directProfile = actorId ? profileByIdMap.get(actorId) : undefined;
      const fallbackByName =
        !directProfile && d.replier_name
          ? uniqueNameProfileMap.get(String(d.replier_name).trim()) || undefined
          : undefined;
      const liveProfile = directProfile || fallbackByName;

      const liveAvatar =
        liveProfile?.custom_avatar ||
        liveProfile?.photo_url ||
        d.replier_avatar ||
        undefined;
      const liveName =
        liveProfile?.display_name ||
        d.replier_name ||
        undefined;

      return {
        id: d.id,
        type: d.type as "comment_reply" | "comment_reaction",
        title: d.title,
        message: d.message || "",
        link: d.link || "",
        image: liveAvatar,
        movieSlug: d.movie_slug || undefined,
        movieTitle: d.movie_slug ? (movieTitleMap.get(d.movie_slug) || undefined) : undefined,
        commentId: d.comment_id || undefined,
        replierName: liveName,
        replierAvatar: liveAvatar,
        isRead: Boolean(d.is_read),
        createdAt: Number(d.created_at) || Date.now(),
      };
    });

    return NextResponse.json(
      { success: true, items },
      {
        headers: NO_CACHE_HEADERS,
      }
    );
  } catch (error) {
    console.error("Lỗi API get notifications:", error);
    return NextResponse.json({ success: true, items: [] });
  }
}

/**
 * PATCH /api/notifications
 * Đánh dấu thông báo là đã đọc (Yêu cầu xác thực, chỉ được phép sửa thông báo của chính mình)
 */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await verifyServerAuth(req);
    if (!auth.isAuthenticated || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = await enforceRateLimit(
      req,
      { namespace: "notif-patch", maxRequests: 30, windowSeconds: 60, failClosed: true },
      auth.userId
    );
    if (!rateLimit.allowed) return buildRateLimitResponse(rateLimit);

    const parseRes = await safeParseJson<Record<string, unknown>>(req, 30 * 1024);
    if (!parseRes.success) {
      return parseRes.response;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = parseRes.data as Record<string, any>;
    const { notifId, all } = body;

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase chưa được cấu hình" }, { status: 500 });
    }

    // Chỉ cập nhật thông báo thuộc về auth.userId đã xác thực
    if (all) {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", auth.userId)
        .in("type", ALLOWED_NOTIFICATION_TYPES);

      return NextResponse.json({ success: true, allRead: true });
    } else if (notifId) {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", auth.userId)
        .eq("id", notifId);

      return NextResponse.json({ success: true, notifId, isRead: true });
    }

    return NextResponse.json({ error: "Tham số không hợp lệ" }, { status: 400 });
  } catch (error) {
    console.error("Lỗi API PATCH notifications:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST /api/notifications
 * Tạo thông báo mới cho người dùng (Chỉ cho phép comment_reply và comment_reaction)
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyServerAuth(req);
    if (!auth.isAuthenticated || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = await enforceRateLimit(
      req,
      { namespace: "notif-post", maxRequests: 20, windowSeconds: 60, failClosed: true },
      auth.userId
    );
    if (!rateLimit.allowed) return buildRateLimitResponse(rateLimit);

    const parseRes = await safeParseJson<Record<string, unknown>>(req, 30 * 1024);
    if (!parseRes.success) {
      return parseRes.response;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = parseRes.data as Record<string, any>;
    const { userId, notifId, type, title, message, link, movieSlug, movieTitle, commentId, replierName, replierAvatar } = body;

    if (!userId || !title) {
      return NextResponse.json({ error: "Thiếu thông tin thông báo!" }, { status: 400 });
    }

    if (movieSlug && movieTitle) {
      cacheService.set(`movie:title:${movieSlug}`, String(movieTitle), 86400 * 7).catch(() => false);
    }

    const finalType = type || "comment_reply";
    // Chỉ cho phép tạo thông báo comment_reply và comment_reaction
    if (!ALLOWED_NOTIFICATION_TYPES.includes(finalType)) {
      return NextResponse.json({ error: "Loại thông báo không được hỗ trợ" }, { status: 400 });
    }

    // Không cho phép guest hoặc user thông thường tự ý chèn thông báo vào inbox của người khác
    if (!auth.isAdmin && userId !== auth.userId) {
      return NextResponse.json(
        { error: "Forbidden: Bạn không có quyền gửi thông báo cho người dùng khác" },
        { status: 403 }
      );
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase chưa được cấu hình" }, { status: 500 });
    }

    const docId = notifId || `notif_${Date.now()}`;
    const payload = {
      id: docId,
      user_id: userId,
      type: finalType,
      title: sanitizeSafeText(title, 150),
      message: sanitizeSafeText(message || "", 500),
      link: link || null,
      movie_slug: movieSlug || null,
      comment_id: commentId || null,
      replier_name: replierName ? sanitizeSafeText(replierName, 100) : null,
      replier_avatar: replierAvatar || null,
      is_read: false,
      created_at: Date.now(),
    };

    const { error } = await supabase.from("notifications").upsert(payload, { onConflict: "id" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: docId });
  } catch (error) {
    console.error("Lỗi API post notification:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE /api/notifications
 * Xóa thông báo của chính người dùng
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyServerAuth(req);
    if (!auth.isAuthenticated || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = await enforceRateLimit(
      req,
      { namespace: "notif-delete", maxRequests: 30, windowSeconds: 60, failClosed: true },
      auth.userId
    );
    if (!rateLimit.allowed) return buildRateLimitResponse(rateLimit);

    const { searchParams } = new URL(req.url);
    const notifId = searchParams.get("notifId");

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase chưa được cấu hình" }, { status: 500 });
    }

    if (notifId) {
      await supabase
        .from("notifications")
        .delete()
        .eq("user_id", auth.userId)
        .eq("id", notifId);

      return NextResponse.json({ success: true, deleted: notifId });
    }

    return NextResponse.json({ error: "Thiếu notifId" }, { status: 400 });
  } catch (error) {
    console.error("Lỗi API DELETE notifications:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
