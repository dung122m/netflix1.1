import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyServerAuth } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

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

  try {
    const { data, error } = await supabase
      .from("watch_history")
      .select("*")
      .eq("user_id", auth.userId)
      .order("updated_at", { ascending: false })
      .limit(50);

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
    }));

    return NextResponse.json({ success: true, items });
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

  try {
    const body = await req.json();
    const items = Array.isArray(body.items) ? body.items : [body];
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
      }));

    if (rows.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const { error } = await supabase.from("watch_history").upsert(rows, { onConflict: "id" });
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
