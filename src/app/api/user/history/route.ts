import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyServerAuth, getEffectiveTargetUserId } from "@/lib/serverAuth";
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
 * GET /api/user/history
 * Lấy lịch sử xem của user đã xác thực
 */
export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
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
    const targetUserId = getEffectiveTargetUserId(auth, req) || auth.userId;

    const { data, error } = await supabase
      .from("watch_history")
      .select("*")
      .eq("user_id", targetUserId)
      .order("updated_at", { ascending: false })
      .limit(150);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const items = (data || []).map((row) => ({
      slug: row.slug,
      title: row.title,
      poster: row.poster,
      episodeName: row.episode_name,
      episodeSlug: row.episode_slug,
      progressSeconds: Number(row.progress_seconds) || 0,
      durationSeconds: Number(row.duration_seconds) || 0,
      year: row.year ? Number(row.year) : undefined,
      quality: row.quality || "HD",
      category: row.category || "Phim Hay",
      updatedAt: Number(row.updated_at) || Date.now(),
      syncedAt: Number(row.synced_at) || Date.now(),
      watchedEpisodes: Array.isArray(row.watched_episodes)
        ? row.watched_episodes
        : typeof row.watched_episodes === "string"
        ? (() => { try { return JSON.parse(row.watched_episodes); } catch { return []; } })()
        : [],
    }));

    return NextResponse.json({ success: true, items }, { headers: NO_CACHE_HEADERS });
  } catch (err) {
    console.error("[History API GET] Error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

/**
 * POST /api/user/history
 * Đồng bộ / ghi nhận lịch sử xem cho user đã xác thực
 */
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
    RATE_LIMIT_PRESETS.USER_HISTORY_IN_MEMORY,
    auth.userId
  );
  if (!rateLimit.allowed) {
    return buildRateLimitResponse(rateLimit);
  }

  try {
    const parseRes = await safeParseJson<Record<string, unknown>>(req, 100 * 1024);
    if (!parseRes.success) {
      return parseRes.response;
    }

    const body = parseRes.data;
    const rawItems = Array.isArray(body.items) ? body.items : [body];
    const items = rawItems.slice(0, 100);
    const userId = auth.userId;
    const now = Date.now();

    const rows = (items as Array<Record<string, unknown>>)
      .filter((item) => item && item.slug)
      .map((item) => ({
        id: `${userId}_${item.slug}`,
        user_id: userId,
        slug: String(item.slug),
        title: String(item.title || item.slug),
        poster: item.poster ? String(item.poster) : null,
        episode_name: item.episodeName ? String(item.episodeName) : null,
        episode_slug: item.episodeSlug ? String(item.episodeSlug) : null,
        progress_seconds: Number(item.progressSeconds) || 0,
        duration_seconds: Number(item.durationSeconds) || 0,
        year: item.year ? Number(item.year) : null,
        quality: String(item.quality || "HD"),
        category: String(item.category || "Phim Hay"),
        synced_at: now,
        updated_at: item.updatedAt ? Number(item.updatedAt) : now,
        watched_episodes: Array.isArray(item.watchedEpisodes) ? item.watchedEpisodes : [],
      }));

    if (rows.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    // Bảo toàn danh sách tập đã xem (watched_episodes) hiện có trên Supabase để tránh một thiết bị/tab chưa đồng bộ ghi đè thành []
    let mergedRows = rows;
    const rowIds = rows.map((r) => r.id);
    const { data: existingRows, error: existingErr } = await supabase
      .from("watch_history")
      .select("id, watched_episodes")
      .eq("user_id", userId)
      .in("id", rowIds);

    if (!existingErr && Array.isArray(existingRows) && existingRows.length > 0) {
      const existingMap = new Map<string, string[]>();
      for (const ex of existingRows) {
        const list = Array.isArray(ex.watched_episodes)
          ? ex.watched_episodes
          : typeof ex.watched_episodes === "string"
          ? (() => { try { return JSON.parse(ex.watched_episodes); } catch { return []; } })()
          : [];
        existingMap.set(String(ex.id), list.filter(Boolean).map(String));
      }
      mergedRows = rows.map((row) => {
        const prevWatched = existingMap.get(row.id) || [];
        const incomingWatched = Array.isArray(row.watched_episodes) ? row.watched_episodes.filter(Boolean).map(String) : [];
        return {
          ...row,
          watched_episodes: Array.from(new Set([...prevWatched, ...incomingWatched])),
        };
      });
    }

    let { error } = await supabase.from("watch_history").upsert(mergedRows, { onConflict: "id" });
    if (error && (error.message?.includes("watched_episodes") || (error as { code?: string })?.code === "42703")) {
      // Graceful fallback nếu cột watched_episodes chưa được add trong Supabase Postgres
      const fallbackRows = mergedRows.map(({ watched_episodes: _watchedEpisodes, ...rest }) => rest);
      const retry = await supabase.from("watch_history").upsert(fallbackRows, { onConflict: "id" });
      error = retry.error;
    }
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: rows.length });
  } catch (err) {
    console.error("[History API POST] Error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

/**
 * DELETE /api/user/history?slug=xxx hoặc ?all=true
 * Xóa 1 mục hoặc toàn bộ lịch sử xem của chính user
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
    {
      namespace: "user-history-delete",
      maxRequests: 30,
      windowSeconds: 60,
      failClosed: false,
      strategy: "in-memory-only",
    },
    auth.userId
  );
  if (!rateLimit.allowed) {
    return buildRateLimitResponse(rateLimit);
  }

  try {
    const { searchParams } = new URL(req.url);
    const isAll = searchParams.get("all") === "true";
    const slug = searchParams.get("slug");

    if (isAll) {
      const { error } = await supabase.from("watch_history").delete().eq("user_id", auth.userId);
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, allCleared: true });
    }

    if (slug) {
      const id = `${auth.userId}_${slug}`;
      const { error } = await supabase.from("watch_history").delete().eq("id", id).eq("user_id", auth.userId);
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, slug });
    }

    return NextResponse.json({ error: "Missing slug or all parameter" }, { status: 400 });
  } catch (err) {
    console.error("[History API DELETE] Error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
