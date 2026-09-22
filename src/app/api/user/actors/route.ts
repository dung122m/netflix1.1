import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyServerAuth } from "@/lib/serverAuth";
import { checkRateLimit, getClientIp, sanitizeSafeText } from "@/lib/security";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/actors
 * Lấy danh sách nghệ sĩ/diễn viên người dùng đang theo dõi
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
      .from("followed_actors")
      .select("*")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const items = (data || []).map((row) => ({
      actorId: row.actor_id,
      actorName: row.actor_name,
      actorAvatar: row.actor_avatar,
      createdAt: Number(row.created_at) || Date.now(),
    }));

    return NextResponse.json({ success: true, items });
  } catch (err) {
    console.error("[Actors API GET] Error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

/**
 * POST /api/user/actors
 * Theo dõi nghệ sĩ/diễn viên mới
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

  const clientIp = getClientIp(req);
  const rateLimitKey = `follow_actor_${auth.userId}_${clientIp}`;
  const rateLimit = checkRateLimit(rateLimitKey, 30, 60);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Thao tác quá nhanh, vui lòng thử lại sau giây lát." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { actorId, actorName, actorAvatar } = body;

    if (!actorId || !actorName) {
      return NextResponse.json({ error: "Missing actorId or actorName" }, { status: 400 });
    }

    const cleanActorId = sanitizeSafeText(String(actorId).trim(), 100);
    const cleanActorName = sanitizeSafeText(String(actorName).trim(), 100);
    const cleanAvatar = typeof actorAvatar === "string" ? sanitizeSafeText(actorAvatar.trim(), 500) : null;

    if (!cleanActorId || !cleanActorName) {
      return NextResponse.json({ error: "Invalid actor data" }, { status: 400 });
    }

    const id = `${auth.userId}_${cleanActorId}`;
    const payload = {
      id,
      user_id: auth.userId,
      actor_id: cleanActorId,
      actor_name: cleanActorName,
      actor_avatar: cleanAvatar || null,
      created_at: Date.now(),
    };

    const { error } = await supabase.from("followed_actors").upsert(payload, { onConflict: "id" });
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      item: {
        actorId: payload.actor_id,
        actorName: payload.actor_name,
        actorAvatar: payload.actor_avatar,
        createdAt: payload.created_at,
      },
    });
  } catch (err) {
    console.error("[Actors API POST] Error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

/**
 * DELETE /api/user/actors?actorId=xxx
 * Bỏ theo dõi nghệ sĩ/diễn viên
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
    const actorId = searchParams.get("actorId");
    if (!actorId) {
      return NextResponse.json({ error: "Missing actorId parameter" }, { status: 400 });
    }

    const cleanActorId = sanitizeSafeText(actorId.trim(), 100);
    const id = `${auth.userId}_${cleanActorId}`;

    const { error } = await supabase
      .from("followed_actors")
      .delete()
      .eq("id", id)
      .eq("user_id", auth.userId);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, actorId: cleanActorId });
  } catch (err) {
    console.error("[Actors API DELETE] Error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
