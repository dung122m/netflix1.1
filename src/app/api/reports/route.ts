import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyServerAuth } from "@/lib/serverAuth";
import { sanitizeSafeText, checkRateLimit, getClientIp } from "@/lib/security";

export const dynamic = "force-dynamic";

/**
 * GET /api/reports
 * Lấy danh sách báo cáo lỗi (Chỉ dành cho Admin)
 */
export async function GET(req: NextRequest) {
  const auth = await verifyServerAuth(req);
  if (!auth.isAuthenticated || !auth.isAdmin) {
    return NextResponse.json({ error: "Forbidden: Yêu cầu quyền Quản trị viên" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ success: true, items: [] });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    let query = supabase
      .from("error_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, items: data || [] });
  } catch (err) {
    console.error("[Reports API GET] Error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

/**
 * POST /api/reports
 * Gửi báo cáo sự cố phim (Hỗ trợ cả guest và user)
 */
export async function POST(req: NextRequest) {
  // Rate limit: tối đa 5 report / phút / IP để chống spam
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`report_issue_${clientIp}`, 5, 60);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Bạn đã gửi quá nhiều báo cáo. Vui lòng chờ 1 phút." },
      { status: 429 }
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 });
  }

  try {
    const auth = await verifyServerAuth(req);
    const body = await req.json();
    const {
      movieSlug,
      movieTitle,
      episodeName,
      episodeSlug,
      serverName,
      issueType,
      description,
      userName,
      userEmail,
    } = body;

    if (!movieSlug || !movieTitle || !issueType) {
      return NextResponse.json({ error: "Thiếu thông tin báo cáo bắt buộc" }, { status: 400 });
    }

    const now = Date.now();
    const reportId = `rep_${now}_${Math.random().toString(36).substring(2, 6)}`;

    const payload = {
      id: reportId,
      movie_slug: sanitizeSafeText(movieSlug, 100),
      movie_title: sanitizeSafeText(movieTitle, 150),
      episode_name: episodeName ? sanitizeSafeText(episodeName, 100) : null,
      episode_slug: episodeSlug ? sanitizeSafeText(episodeSlug, 100) : null,
      server_name: serverName ? sanitizeSafeText(serverName, 80) : null,
      issue_type: sanitizeSafeText(issueType, 50),
      description: description ? sanitizeSafeText(description, 1000) : null,
      user_id: auth.isAuthenticated && auth.userId ? auth.userId : null,
      user_name: auth.isAuthenticated && auth.displayName ? auth.displayName : (userName ? sanitizeSafeText(userName, 100) : "Khách"),
      user_email: auth.isAuthenticated && auth.email ? auth.email : (userEmail ? sanitizeSafeText(userEmail, 100) : null),
      status: "pending",
      created_at: now,
      updated_at: now,
    };

    const { error } = await supabase.from("error_reports").insert(payload);
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: reportId });
  } catch (err) {
    console.error("[Reports API POST] Error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

/**
 * PATCH /api/reports
 * Cập nhật trạng thái báo cáo (Chỉ dành cho Admin)
 */
export async function PATCH(req: NextRequest) {
  const auth = await verifyServerAuth(req);
  if (!auth.isAuthenticated || !auth.isAdmin) {
    return NextResponse.json({ error: "Forbidden: Yêu cầu quyền Quản trị viên" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { id, status, adminNote } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
    }

    const payload: Record<string, unknown> = {
      status,
      updated_at: Date.now(),
    };
    if (adminNote !== undefined) {
      payload.admin_note = sanitizeSafeText(adminNote, 500);
    }

    const { error } = await supabase.from("error_reports").update(payload).eq("id", id);
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error("[Reports API PATCH] Error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

/**
 * DELETE /api/reports?id=xxx
 * Xóa báo cáo (Chỉ dành cho Admin)
 */
export async function DELETE(req: NextRequest) {
  const auth = await verifyServerAuth(req);
  if (!auth.isAuthenticated || !auth.isAdmin) {
    return NextResponse.json({ error: "Forbidden: Yêu cầu quyền Quản trị viên" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const reportId = searchParams.get("id");
    if (!reportId) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }

    const { error } = await supabase.from("error_reports").delete().eq("id", reportId);
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: reportId });
  } catch (err) {
    console.error("[Reports API DELETE] Error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
