import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyServerAuth } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/reminders
 * Lấy danh sách lịch nhắc thể thao của user
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
      .from("match_reminders")
      .select("*")
      .eq("user_id", auth.userId)
      .order("match_time", { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const items = (data || []).map((row) => ({
      matchId: row.match_id,
      homeTeam: row.home_team,
      awayTeam: row.away_team,
      matchTime: Number(row.match_time) || 0,
      tournament: row.tournament,
      isNotified: Boolean(row.is_notified),
      createdAt: Number(row.created_at) || Date.now(),
    }));

    return NextResponse.json({ success: true, items });
  } catch (err) {
    console.error("[Reminders API GET] Error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

/**
 * POST /api/user/reminders
 * Thêm nhắc nhở lịch đấu
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
    const { matchId, homeTeam, awayTeam, matchTime, tournament } = body;

    if (!matchId || !homeTeam || !awayTeam || !matchTime) {
      return NextResponse.json({ error: "Missing required match fields" }, { status: 400 });
    }

    const id = `${auth.userId}_${matchId}`;
    const payload = {
      id,
      user_id: auth.userId,
      match_id: matchId,
      home_team: homeTeam,
      away_team: awayTeam,
      match_time: Number(matchTime),
      tournament: tournament || null,
      is_notified: false,
      created_at: Date.now(),
    };

    const { error } = await supabase.from("match_reminders").upsert(payload, { onConflict: "id" });
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, item: payload });
  } catch (err) {
    console.error("[Reminders API POST] Error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

/**
 * DELETE /api/user/reminders?matchId=xxx
 * Hủy nhắc nhở lịch đấu
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
    const matchId = searchParams.get("matchId");
    if (!matchId) {
      return NextResponse.json({ error: "Missing matchId parameter" }, { status: 400 });
    }

    const id = `${auth.userId}_${matchId}`;
    const { error } = await supabase.from("match_reminders").delete().eq("id", id).eq("user_id", auth.userId);
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, matchId });
  } catch (err) {
    console.error("[Reminders API DELETE] Error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
