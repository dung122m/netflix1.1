import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sanitizeSafeText } from "@/lib/security";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

/**
 * GET /api/user-profile?userId=xxx
 * Lấy hồ sơ cá nhân qua Supabase Server API
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "Thiếu userId!" }, { status: 400 });
  }

  try {
    if (!supabase) {
      return NextResponse.json({ success: false, profile: null });
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ success: false, profile: null });
    }

    const profile = {
      uid: data.id,
      email: data.email || "",
      displayName: data.display_name || "Thành viên",
      photoURL: data.photo_url || data.custom_avatar || "",
      customAvatar: data.custom_avatar,
      bio: data.bio,
      favoriteGenres: data.favorite_genres || [],
      badges: data.badges || [],
      watchTimeMinutes: data.watch_time_minutes || 0,
      role: data.role || "member",
      isCommentRestricted: Boolean(data.is_comment_restricted),
      violationsCount: data.violations_count || 0,
      lastViolationReason: data.last_violation_reason,
      createdAt: data.created_at,
      lastLoginAt: data.last_login_at,
    };

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error("Lỗi API get user profile:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST /api/user-profile
 * Cập nhật hồ sơ cá nhân qua Supabase Server API
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      email,
      displayName,
      photoURL,
      customAvatar,
      bio,
      favoriteGenres,
      badges,
      watchTimeMinutes,
      role,
    } = body;

    if (!userId) {
      return NextResponse.json({ error: "Thiếu userId!" }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ error: "Supabase chưa được cấu hình" }, { status: 500 });
    }

    const payload: Record<string, unknown> = {
      id: userId,
      updated_at: Date.now(),
    };

    if (email !== undefined) payload.email = email;
    if (displayName !== undefined) payload.display_name = sanitizeSafeText(displayName, 60);
    if (photoURL !== undefined) payload.photo_url = photoURL;
    if (customAvatar !== undefined) payload.custom_avatar = customAvatar;
    if (bio !== undefined) payload.bio = sanitizeSafeText(bio, 200);
    if (favoriteGenres !== undefined && Array.isArray(favoriteGenres)) payload.favorite_genres = favoriteGenres;
    if (badges !== undefined && Array.isArray(badges)) payload.badges = badges;
    if (watchTimeMinutes !== undefined) payload.watch_time_minutes = Number(watchTimeMinutes);
    if (role !== undefined) payload.role = role;

    const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });

    if (error) {
      console.warn("Lỗi lưu user profile Supabase:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, profile: { uid: userId, ...payload } });
  } catch (error) {
    console.error("Lỗi API post user profile:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
