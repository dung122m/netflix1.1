import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyServerAuth } from "@/lib/serverAuth";
import { sanitizeSafeText } from "@/lib/security";
import { isUserAdmin } from "@/lib/adminConfig";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/profile
 * - ?userId=xxx: Lấy hồ sơ công khai của một người dùng
 * - Mặc định: Lấy hồ sơ của chính người dùng đã đăng nhập (verified qua Firebase Token)
 */
export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get("userId");

  let uid = targetUserId;
  if (!uid) {
    const auth = await verifyServerAuth(req);
    if (!auth.isAuthenticated || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    uid = auth.userId;
  }

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ success: true, profile: null });
    }

    const profile = {
      uid: data.id,
      email: data.email,
      displayName: data.display_name,
      photoURL: data.photo_url,
      customAvatar: data.custom_avatar,
      bio: data.bio,
      favoriteGenres: data.favorite_genres || [],
      badges: data.badges || [],
      watchTimeMinutes: data.watch_time_minutes || 0,
      role: data.role || "member",
      isCommentRestricted: Boolean(data.is_comment_restricted),
      violationsCount: data.violations_count || 0,
      createdAt: Number(data.created_at) || Date.now(),
      lastLoginAt: Number(data.last_login_at) || Date.now(),
      updatedAt: Number(data.updated_at) || Date.now(),
    };

    return NextResponse.json({ success: true, profile });
  } catch (err) {
    console.error("[Profile API GET] Error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

/**
 * POST /api/user/profile
 * Ghi nhận hoặc cập nhật hồ sơ người dùng (Yêu cầu đăng nhập; danh tính xác thực từ Firebase token)
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
    const userId = auth.userId;
    const now = Date.now();

    // 1. Lấy profile hiện có từ database
    const { data: existing } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    // 2. Xác định vai trò role: KHÔNG BAO GIỜ tin tưởng body.role từ client
    // Quyền Admin chỉ được gán nếu email nằm trong danh sách Quản trị viên server
    const userEmail = auth.email || body.email || existing?.email || "";
    const computedRole = isUserAdmin(userEmail)
      ? "admin"
      : existing?.role || "member";

    const displayName =
      body.displayName !== undefined
        ? sanitizeSafeText(body.displayName, 100)
        : existing?.display_name || auth.displayName || "Thành viên Nanaflix";

    const payload = {
      id: userId,
      email: userEmail,
      display_name: displayName,
      photo_url: body.photoURL || body.photo_url || existing?.photo_url || auth.photoUrl || "",
      custom_avatar: body.customAvatar !== undefined ? body.customAvatar : existing?.custom_avatar || null,
      bio: body.bio !== undefined ? sanitizeSafeText(body.bio, 500) : existing?.bio || null,
      favorite_genres: body.favoriteGenres || body.favorite_genres || existing?.favorite_genres || [],
      badges: body.badges || existing?.badges || [],
      watch_time_minutes:
        typeof body.watchTimeMinutes === "number"
          ? Math.max(0, body.watchTimeMinutes)
          : existing?.watch_time_minutes || 0,
      role: computedRole,
      is_comment_restricted: existing?.is_comment_restricted || false,
      violations_count: existing?.violations_count || 0,
      created_at: existing?.created_at || now,
      last_login_at: now,
      updated_at: now,
    };

    const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, profile: payload });
  } catch (err) {
    console.error("[Profile API POST] Error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
