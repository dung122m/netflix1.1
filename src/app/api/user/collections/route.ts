import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyServerAuth } from "@/lib/serverAuth";
import { sanitizeSafeText } from "@/lib/security";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/collections
 * - ?id=xxx: Lấy chi tiết bộ sưu tập (nếu public hoặc là owner/admin)
 * - Mặc định: Lấy danh sách bộ sưu tập của chính user đã đăng nhập
 */
export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ success: true, items: [] });
  }

  const { searchParams } = new URL(req.url);
  const collectionId = searchParams.get("id");
  const auth = await verifyServerAuth(req);

  try {
    if (collectionId) {
      const { data, error } = await supabase
        .from("collections")
        .select("*")
        .eq("id", collectionId)
        .maybeSingle();

      if (error || !data) {
        return NextResponse.json({ success: false, error: "Không tìm thấy bộ sưu tập" }, { status: 404 });
      }

      // Cho phép xem nếu là public HOẶC là chủ sở hữu HOẶC là Admin
      const isOwner = auth.isAuthenticated && auth.userId === data.user_id;
      const isPublic = Boolean(data.is_public);
      if (!isPublic && !isOwner && !auth.isAdmin) {
        return NextResponse.json({ error: "Forbidden: Bộ sưu tập riêng tư" }, { status: 403 });
      }

      return NextResponse.json({ success: true, item: data });
    }

    // Lấy danh sách bộ sưu tập của chính user
    if (!auth.isAuthenticated || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("collections")
      .select("*")
      .eq("user_id", auth.userId)
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, items: data || [] });
  } catch (err) {
    console.error("[Collections API GET] Error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

/**
 * POST /api/user/collections
 * Tạo hoặc cập nhật bộ sưu tập (Xác thực quyền sở hữu server-side)
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
    const { id, name, description, isPublic, colorGradient, coverUrl, movies } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Tên bộ sưu tập không được để trống" }, { status: 400 });
    }

    const userId = auth.userId;
    const now = Date.now();
    const collectionId = id || `col_${userId}_${now}`;

    // Kiểm tra quyền sở hữu nếu là cập nhật bộ sưu tập đã có
    if (id) {
      const { data: existing } = await supabase
        .from("collections")
        .select("user_id")
        .eq("id", id)
        .maybeSingle();

      if (existing && existing.user_id !== userId && !auth.isAdmin) {
        return NextResponse.json(
          { error: "Forbidden: Bạn không có quyền chỉnh sửa bộ sưu tập này" },
          { status: 403 }
        );
      }
    }

    const payload = {
      id: collectionId,
      user_id: userId,
      user_name: sanitizeSafeText(auth.displayName || "Thành viên Nanaflix", 100),
      user_avatar: auth.photoUrl || null,
      name: sanitizeSafeText(name, 120),
      description: description ? sanitizeSafeText(description, 500) : null,
      is_public: Boolean(isPublic),
      color_gradient: colorGradient || null,
      cover_url: coverUrl || null,
      movies: Array.isArray(movies) ? movies : [],
      updated_at: now,
      created_at: id ? undefined : now,
    };

    const { error } = await supabase.from("collections").upsert(payload, { onConflict: "id" });
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: collectionId, item: payload });
  } catch (err) {
    console.error("[Collections API POST] Error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

/**
 * DELETE /api/user/collections?id=xxx
 * Xóa bộ sưu tập (Chỉ chủ sở hữu hoặc Admin mới có quyền)
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
    const collectionId = searchParams.get("id");
    if (!collectionId) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("collections")
      .select("user_id")
      .eq("id", collectionId)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ success: true, message: "Collection already deleted" });
    }

    if (existing.user_id !== auth.userId && !auth.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Bạn không có quyền xóa bộ sưu tập này" },
        { status: 403 }
      );
    }

    const { error } = await supabase.from("collections").delete().eq("id", collectionId);
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: collectionId });
  } catch (err) {
    console.error("[Collections API DELETE] Error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
