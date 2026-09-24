import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sanitizeSafeText } from "@/lib/security";
import { verifyServerAuth } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const ALLOWED_NOTIFICATION_TYPES = ["comment_reply", "comment_reaction"] as const;

/**
 * GET /api/notifications
 * - Yêu cầu xác thực Firebase auth, chỉ lấy thông báo Bình luận (comment_reply) và Cảm xúc (comment_reaction)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  // Loại bỏ hoàn toàn thông báo system / movie recommendation ngoài luồng
  if (type === "system") {
    return NextResponse.json({ success: true, items: [] });
  }

  const auth = await verifyServerAuth(req);
  if (!auth.isAuthenticated || !auth.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: true, items: [] });
    }

    // Chỉ truy vấn đúng 2 loại thông báo: Comment (comment_reply) và Like (comment_reaction)
    const { data, error } = await supabase
      .from("notifications")
      .select("id, user_id, type, title, message, link, movie_slug, comment_id, replier_name, replier_avatar, is_read, created_at")
      .eq("user_id", auth.userId)
      .in("type", ALLOWED_NOTIFICATION_TYPES)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !data) {
      return NextResponse.json({ success: true, items: [] });
    }

    const items = data.map((d) => ({
      id: d.id,
      type: d.type as "comment_reply" | "comment_reaction",
      title: d.title,
      message: d.message || "",
      link: d.link || "",
      image: d.replier_avatar || undefined,
      movieSlug: d.movie_slug || undefined,
      commentId: d.comment_id || undefined,
      replierName: d.replier_name || undefined,
      replierAvatar: d.replier_avatar || undefined,
      isRead: Boolean(d.is_read),
      createdAt: Number(d.created_at) || Date.now(),
    }));

    return NextResponse.json(
      { success: true, items },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          "CDN-Cache-Control": "no-store",
          "Vercel-CDN-Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Lỗi API get notifications:", error);
    return NextResponse.json({ success: true, items: [] });
  }
}

/**
 * PATCH /api/notifications
 * Đánh dấu thông báo là đã đọc (Yêu cầu xác thực, chỉ được phép sửa thông báo của chính mình)
 */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await verifyServerAuth(req);
    if (!auth.isAuthenticated || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { notifId, all } = body;

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase chưa được cấu hình" }, { status: 500 });
    }

    // Chỉ cập nhật thông báo thuộc về auth.userId đã xác thực
    if (all) {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", auth.userId)
        .in("type", ALLOWED_NOTIFICATION_TYPES);

      return NextResponse.json({ success: true, allRead: true });
    } else if (notifId) {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", auth.userId)
        .eq("id", notifId);

      return NextResponse.json({ success: true, notifId, isRead: true });
    }

    return NextResponse.json({ error: "Tham số không hợp lệ" }, { status: 400 });
  } catch (error) {
    console.error("Lỗi API PATCH notifications:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST /api/notifications
 * Tạo thông báo mới cho người dùng (Chỉ cho phép comment_reply và comment_reaction)
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyServerAuth(req);
    if (!auth.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { userId, notifId, type, title, message, link, movieSlug, commentId, replierName, replierAvatar } = body;

    if (!userId || !title) {
      return NextResponse.json({ error: "Thiếu thông tin thông báo!" }, { status: 400 });
    }

    const finalType = type || "comment_reply";
    // Chỉ cho phép tạo thông báo comment_reply và comment_reaction
    if (!ALLOWED_NOTIFICATION_TYPES.includes(finalType)) {
      return NextResponse.json({ error: "Loại thông báo không được hỗ trợ" }, { status: 400 });
    }

    // Không cho phép guest hoặc user thông thường tự ý chèn thông báo vào inbox của người khác
    if (!auth.isAdmin && userId !== auth.userId) {
      return NextResponse.json(
        { error: "Forbidden: Bạn không có quyền gửi thông báo cho người dùng khác" },
        { status: 403 }
      );
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase chưa được cấu hình" }, { status: 500 });
    }

    const docId = notifId || `notif_${Date.now()}`;
    const payload = {
      id: docId,
      user_id: userId,
      type: finalType,
      title: sanitizeSafeText(title, 150),
      message: sanitizeSafeText(message || "", 500),
      link: link || null,
      movie_slug: movieSlug || null,
      comment_id: commentId || null,
      replier_name: replierName ? sanitizeSafeText(replierName, 100) : null,
      replier_avatar: replierAvatar || null,
      is_read: false,
      created_at: Date.now(),
    };

    const { error } = await supabase.from("notifications").upsert(payload, { onConflict: "id" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: docId });
  } catch (error) {
    console.error("Lỗi API post notification:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE /api/notifications
 * Xóa thông báo của chính người dùng
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyServerAuth(req);
    if (!auth.isAuthenticated || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const notifId = searchParams.get("notifId");

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase chưa được cấu hình" }, { status: 500 });
    }

    if (notifId) {
      await supabase
        .from("notifications")
        .delete()
        .eq("user_id", auth.userId)
        .eq("id", notifId);

      return NextResponse.json({ success: true, deleted: notifId });
    }

    return NextResponse.json({ error: "Thiếu notifId" }, { status: 400 });
  } catch (error) {
    console.error("Lỗi API DELETE notifications:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
