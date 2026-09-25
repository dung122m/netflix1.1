import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyServerAuth } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

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

    return NextResponse.json({ success: true, item });
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

  try {
    const body = await req.json();
    const { movieSlug, movieTitle, poster, episodeSlug, episodeName, progressSeconds, durationSeconds, deviceName } = body;

    if (!movieSlug) {
      return NextResponse.json({ error: "Missing movieSlug" }, { status: 400 });
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

    const upsertPromise = (async () => {
      const { error } = await supabase.from("device_handoff").upsert(payload, { onConflict: "id" });
      if (error) {
        return { status: 500, body: { success: false, error: error.message } };
      }
      return { status: 200, body: { success: true, item: payload } };
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

  try {
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
