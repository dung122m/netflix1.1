import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sanitizeSafeText } from "@/lib/security";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

/**
 * GET /api/notifications
 * - Không có userId: Trả về danh sách thông báo hệ thống / phim mới cập nhật / sự kiện hot
 * - Có userId: Lấy danh sách thông báo cá nhân từ Supabase
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  // 1. Trường hợp không có userId: Trả về thông báo hệ thống & phim mới cập nhật
  if (!userId) {
    try {
      const upstreamRes = await fetch("https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=1", {
        next: { revalidate: 300 }, // Cache 5 phút
      });

      const dynamicItems: Array<Record<string, unknown>> = [];

      if (upstreamRes.ok) {
        const data = await upstreamRes.json();
        const movies = Array.isArray(data.items) ? data.items.slice(0, 5) : [];

        movies.forEach((m: { name?: string; slug?: string; poster_url?: string; thumb_url?: string; episode_current?: string; year?: number }) => {
          if (m.slug && m.name) {
            const posterImg = m.poster_url?.startsWith("http")
              ? m.poster_url
              : m.thumb_url?.startsWith("http")
                ? m.thumb_url
                : `https://phimimg.com/${m.poster_url || m.thumb_url}`;

            dynamicItems.push({
              id: `sys_movie_${m.slug}`,
              type: "movie",
              title: m.name,
              message: `Đã cập nhật ${m.episode_current || "bản HD Vietsub"}. Bấm xem ngay hôm nay!`,
              time: "Hôm nay",
              link: `/movies/${m.slug}`,
              image: posterImg,
              badge: "TẬP MỚI",
              badgeColor: "bg-netflix-red text-white",
            });
          }
        });
      }

      // Thông báo trực tiếp bóng đá / sự kiện hot
      dynamicItems.unshift({
        id: "sys_live_hot",
        type: "live",
        title: "Trực Tiếp Bóng Đá & Sự Kiện Thể Thao",
        message: "Xem trực tiếp các trận cầu đỉnh cao Ngoại Hạng Anh, C1 chất lượng Full HD không giật lag!",
        time: "Trực tiếp",
        link: "/live",
        badge: "LIVE 🔴",
        badgeColor: "bg-red-600 text-white animate-pulse",
      });

      return NextResponse.json({ success: true, items: dynamicItems });
    } catch (err) {
      console.error("Lỗi lấy thông báo hệ thống:", err);
      return NextResponse.json({
        success: true,
        items: [
          {
            id: "sys_welcome",
            type: "system",
            title: "Chào mừng bạn đến với Nanaflix!",
            message: "Hàng ngàn bộ phim bom tấn và phim bộ chất lượng 4K đang chờ bạn khám phá.",
            time: "Hôm nay",
            link: "/browse",
            badge: "HOT",
            badgeColor: "bg-netflix-red text-white",
          },
        ],
      });
    }
  }

  // 2. Trường hợp có userId: Lấy thông báo cá nhân từ Supabase
  try {
    if (!supabase) {
      return NextResponse.json({ success: true, items: [] });
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error || !data) {
      return NextResponse.json({ success: true, items: [] });
    }

    const items = data.map((d) => ({
      id: d.id,
      type: d.type,
      title: d.title,
      message: d.message || "",
      link: d.link,
      movieSlug: d.movie_slug,
      commentId: d.comment_id,
      replierName: d.replier_name,
      replierAvatar: d.replier_avatar,
      isRead: Boolean(d.is_read),
      createdAt: Number(d.created_at) || Date.now(),
    }));

    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error("Lỗi API get notifications:", error);
    return NextResponse.json({ success: true, items: [] });
  }
}

/**
 * PATCH /api/notifications
 * Đánh dấu thông báo là đã đọc
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, notifId, all } = body;

    if (!userId) {
      return NextResponse.json({ error: "Thiếu userId" }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ error: "Supabase chưa được cấu hình" }, { status: 500 });
    }

    if (all) {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId);

      return NextResponse.json({ success: true, allRead: true });
    } else if (notifId) {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
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
 * Tạo thông báo mới cho người dùng
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, notifId, type, title, message, link, movieSlug, commentId, replierName, replierAvatar } = body;

    if (!userId || !title) {
      return NextResponse.json({ error: "Thiếu thông tin thông báo!" }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ error: "Supabase chưa được cấu hình" }, { status: 500 });
    }

    const docId = notifId || `notif_${Date.now()}`;
    const payload = {
      id: docId,
      user_id: userId,
      type: type || "comment_reply",
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
