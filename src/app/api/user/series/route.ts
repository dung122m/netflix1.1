import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyServerAuth } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/series
 * Lấy danh sách phim bộ theo dõi của user
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

  try {
    const { data, error } = await supabase
      .from("followed_series")
      .select("*")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const items = (data || []).map((row) => ({
      movieSlug: row.movie_slug,
      movieTitle: row.movie_title,
      poster: row.poster,
      lastNotifiedEpisode: row.last_notified_episode,
      createdAt: Number(row.created_at) || Date.now(),
    }));

    return NextResponse.json({ success: true, items });
  } catch (err) {
    console.error("[Series API GET] Error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

/**
 * POST /api/user/series
 * Theo dõi phim bộ
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

  try {
    const body = await req.json();
    const movieSlug = body.movieSlug || body.slug;
    const movieTitle = body.movieTitle || body.title || movieSlug;
    const poster = body.poster || body.posterUrl || null;
    const lastNotifiedEpisode = body.lastNotifiedEpisode || body.last_notified_episode || null;

    if (!movieSlug) {
      return NextResponse.json({ error: "Missing movieSlug" }, { status: 400 });
    }

    const id = `${auth.userId}_${movieSlug}`;
    const payload = {
      id,
      user_id: auth.userId,
      movie_slug: movieSlug,
      movie_title: movieTitle,
      poster: poster,
      last_notified_episode: lastNotifiedEpisode,
      created_at: Date.now(),
    };

    const { error } = await supabase.from("followed_series").upsert(payload, { onConflict: "id" });
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, item: payload });
  } catch (err) {
    console.error("[Series API POST] Error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

/**
 * DELETE /api/user/series?slug=xxx
 * Bỏ theo dõi phim bộ
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

  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug") || searchParams.get("movieSlug");
    if (!slug) {
      return NextResponse.json({ error: "Missing slug parameter" }, { status: 400 });
    }

    const id = `${auth.userId}_${slug}`;
    const { error } = await supabase.from("followed_series").delete().eq("id", id).eq("user_id", auth.userId);
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, slug });
  } catch (err) {
    console.error("[Series API DELETE] Error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
