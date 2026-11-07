import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyServerAuth } from "@/lib/serverAuth";
import { cacheService } from "@/lib/cache";
import {
  enforceRateLimit,
  buildRateLimitResponse,
  RATE_LIMIT_PRESETS,
} from "@/lib/rateLimit";
import { safeParseJson } from "@/lib/securityValidation";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const NO_CACHE_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate, proxy-revalidate",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
};

/**
 * GET /api/user/handoff
 * Lấy tiến độ xem đa thiết bị của chính user
 */
export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ success: true, item: null });
  }

  const auth = await verifyServerAuth(req);
  if (!auth.isAuthenticated || !auth.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await enforceRateLimit(req, RATE_LIMIT_PRESETS.USER_READ, auth.userId);
  if (!rateLimit.allowed) {
    return buildRateLimitResponse(rateLimit);
  }

  const { searchParams } = new URL(req.url);
  const isAll = searchParams.get("all") === "true";

  if (isAll) {
    if (!auth.isAdmin) {
      return NextResponse.json({ error: "Forbidden: Yêu cầu quyền Quản trị viên" }, { status: 403 });
    }

    try {
      const { data, error } = await supabase
        .from("device_handoff")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(50);

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      const items = (data || []).map((d) => ({
        userId: d.user_id,
        movieSlug: d.movie_slug,
        movieTitle: d.movie_title,
        poster: d.poster,
        episodeSlug: d.episode_slug,
        episodeName: d.episode_name,
        progressSeconds: Number(d.progress_seconds) || 0,
        durationSeconds: Number(d.duration_seconds) || 0,
        deviceName: d.device_name,
        updatedAt: Number(d.updated_at) || Date.now(),
      }));

      return NextResponse.json({ success: true, items });
    } catch (err) {
      console.error("[Handoff API GET ALL] Error:", err);
      return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
    }
  }

  // 1. Kiểm tra cache Redis DB 2 trước (phản hồi siêu tốc < 10ms giữa các thiết bị)
  const redisKey = `user:handoff:${auth.userId}`;
  try {
    const cached = await cacheService.get<Record<string, unknown>>(redisKey);
    if (cached && typeof cached.movieSlug === "string") {
      return NextResponse.json({ success: true, item: cached, fromCache: true }, { headers: NO_CACHE_HEADERS });
    }
  } catch {}

  try {
    const { data, error } = await supabase
      .from("device_handoff")
      .select("*")
      .eq("id", auth.userId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ success: true, item: null });
    }

    const item = {
      userId: data.user_id,
      movieSlug: data.movie_slug,
      movieTitle: data.movie_title,
      poster: data.poster,
      episodeSlug: data.episode_slug,
      episodeName: data.episode_name,
      progressSeconds: Number(data.progress_seconds) || 0,
      durationSeconds: Number(data.duration_seconds) || 0,
      deviceName: data.device_name,
      updatedAt: Number(data.updated_at) || Date.now(),
    };

    // Nạp vào Redis DB 2 để các lần đọc tiếp theo từ các thiết bị khác nhận ngay lập tức
    cacheService.set(redisKey, item, 7 * 86400).catch(() => {});

    return NextResponse.json({ success: true, item }, { headers: NO_CACHE_HEADERS });
  } catch (err) {
    console.error("[Handoff API GET] Error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

/**
 * POST /api/user/handoff
 * Lưu tiến độ xem đa thiết bị của chính user
 */
// In-flight dedup map cho server-side POST handoff
const inFlightServerHandoffPosts = new Map<string, Promise<{ status: number; body: Record<string, unknown> }>>();

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 });
  }

  const auth = await verifyServerAuth(req);
  if (!auth.isAuthenticated || !auth.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await enforceRateLimit(
    req,
    RATE_LIMIT_PRESETS.USER_HANDOFF_IN_MEMORY,
    auth.userId
  );
  if (!rateLimit.allowed) {
    return buildRateLimitResponse(rateLimit);
  }

  try {
    const parseRes = await safeParseJson<Record<string, unknown>>(req, 30 * 1024);
    if (!parseRes.success) {
      return parseRes.response;
    }

    const body = parseRes.data;
    const { movieSlug, movieTitle, poster, episodeSlug, episodeName, progressSeconds, durationSeconds, deviceName } = body;

    if (!movieSlug || typeof movieSlug !== "string") {
      return NextResponse.json({ error: "Missing or invalid movieSlug" }, { status: 400 });
    }

    const serverDedupKey = `${auth.userId}:${movieSlug}`;
    const existing = inFlightServerHandoffPosts.get(serverDedupKey);
    if (existing) {
      const resData = await existing;
      return NextResponse.json(resData.body, { status: resData.status });
    }

    const payload = {
      id: auth.userId,
      user_id: auth.userId,
      movie_slug: movieSlug,
      movie_title: movieTitle || movieSlug,
      poster: poster || null,
      episode_slug: episodeSlug || null,
      episode_name: episodeName || null,
      progress_seconds: Number(progressSeconds) || 0,
      duration_seconds: Number(durationSeconds) || 0,
      device_name: deviceName || "Web Browser",
      updated_at: Date.now(),
    };

    const clientItem = {
      userId: auth.userId,
      movieSlug: payload.movie_slug,
      movieTitle: payload.movie_title,
      poster: payload.poster,
      episodeSlug: payload.episode_slug,
      episodeName: payload.episode_name,
      progressSeconds: payload.progress_seconds,
      durationSeconds: payload.duration_seconds,
      deviceName: payload.device_name,
      updatedAt: payload.updated_at,
    };

    // 1. Ghi tức thì vào Redis DB 2 (< 10ms) để các thiết bị khác đồng bộ ngay tức thì
    cacheService.set(`user:handoff:${auth.userId}`, clientItem, 7 * 86400).catch(() => {});

    const upsertPromise = (async () => {
      const { error } = await supabase.from("device_handoff").upsert(payload, { onConflict: "id" });
      if (error) {
        return { status: 500, body: { success: false, error: error.message } };
      }
      return { status: 200, body: { success: true, item: clientItem } };
    })();

    inFlightServerHandoffPosts.set(serverDedupKey, upsertPromise);
    try {
      const result = await upsertPromise;
      return NextResponse.json(result.body, { status: result.status });
    } finally {
      inFlightServerHandoffPosts.delete(serverDedupKey);
    }
  } catch (err) {
    console.error("[Handoff API POST] Error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

/**
 * DELETE /api/user/handoff
 * Xóa tiến độ xem đa thiết bị của user
 */
export async function DELETE(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 });
  }

  const auth = await verifyServerAuth(req);
  if (!auth.isAuthenticated || !auth.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await enforceRateLimit(
    req,
    { namespace: "handoff-delete", maxRequests: 30, windowSeconds: 60, failClosed: false, strategy: "in-memory-only" },
    auth.userId
  );
  if (!rateLimit.allowed) {
    return buildRateLimitResponse(rateLimit);
  }

  try {
    // Xóa đồng thời trên Redis DB 2 và Supabase
    cacheService.delete(`user:handoff:${auth.userId}`).catch(() => {});
    const { error } = await supabase.from("device_handoff").delete().eq("id", auth.userId);
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Handoff API DELETE] Error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
