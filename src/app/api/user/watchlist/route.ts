import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyServerAuth } from "@/lib/serverAuth";
import {
  enforceRateLimit,
  buildRateLimitResponse,
  RATE_LIMIT_PRESETS,
} from "@/lib/rateLimit";
import { safeParseJson } from "@/lib/securityValidation";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/watchlist
 * Lấy danh sách yêu thích của user đã xác thực
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

  const rateLimit = await enforceRateLimit(req, RATE_LIMIT_PRESETS.PUBLIC_READ, auth.userId);
  if (!rateLimit.allowed) {
    return buildRateLimitResponse(rateLimit);
  }

  try {
    const { searchParams } = new URL(req.url);
    const targetUserId = (auth.isAdmin && searchParams.get("userId"))
      ? searchParams.get("userId")!
      : auth.userId;

    const { data, error } = await supabase
      .from("watchlist")
      .select("*")
      .eq("user_id", targetUserId)
      .order("added_at", { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const items = (data || []).map((row) => {
      const slug = String(row.slug || "");
      const isEpisode = slug.includes("__ep__");
      let seriesSlug: string | undefined = undefined;
      let episodeSlug: string | undefined = undefined;
      if (isEpisode) {
        const parts = slug.split("__ep__");
        seriesSlug = parts[0];
        episodeSlug = parts[1];
      }
      return {
        slug: row.slug,
        title: row.title,
        poster: row.poster,
        imageUrl: row.poster || "/default-poster.jpg",
        year: row.year ? Number(row.year) : undefined,
        quality: row.quality || "HD",
        category: row.category || "Phim Hay",
        addedAt: Number(row.added_at) || Date.now(),
        itemType: isEpisode ? ("episode" as const) : undefined,
        seriesSlug,
        episodeSlug,
      };
    });

    return NextResponse.json({ success: true, items });
  } catch (err) {
    console.error("[Watchlist API GET] Error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

/**
 * POST /api/user/watchlist
 * Thêm / đồng bộ danh sách yêu thích của chính user
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
    {
      namespace: "user-watchlist-post",
      maxRequests: 60,
      windowSeconds: 60,
      failClosed: true,
    },
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
        poster: item.poster ? String(item.poster) : (item.imageUrl ? String(item.imageUrl) : null),
        year: item.year ? Number(item.year) : null,
        quality: String(item.quality || "HD"),
        category: String(item.category || item.genre || "Phim Hay"),
        added_at: item.addedAt ? Number(item.addedAt) : now,
      }));

    if (rows.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const { error } = await supabase.from("watchlist").upsert(rows, { onConflict: "id" });
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: rows.length });
  } catch (err) {
    console.error("[Watchlist API POST] Error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

/**
 * DELETE /api/user/watchlist?slug=xxx hoặc ?all=true
 * Xóa mục hoặc toàn bộ watchlist của user
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
      namespace: "user-watchlist-delete",
      maxRequests: 30,
      windowSeconds: 60,
      failClosed: true,
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
      const { error } = await supabase.from("watchlist").delete().eq("user_id", auth.userId);
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, allCleared: true });
    }

    if (slug) {
      const id = `${auth.userId}_${slug}`;
      const { error } = await supabase.from("watchlist").delete().eq("id", id).eq("user_id", auth.userId);
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, slug });
    }

    return NextResponse.json({ error: "Missing slug or all parameter" }, { status: 400 });
  } catch (err) {
    console.error("[Watchlist API DELETE] Error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
