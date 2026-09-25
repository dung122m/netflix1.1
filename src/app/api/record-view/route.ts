import { NextRequest, NextResponse } from "next/server";
import { recordMovieViewSupabase } from "@/services/communityWatchService";
import { checkRateLimit, getClientIp } from "@/lib/security";
import { verifyServerAuth } from "@/lib/serverAuth";

export const maxDuration = 10;

export async function POST(req: NextRequest) {
  try {
    // 1. Giới hạn tần suất theo IP (30 requests / 60s) - ngăn chặn bot spam ghi dữ liệu
    const clientIp = getClientIp(req);
    const rateLimit = checkRateLimit(`record_view_${clientIp}`, 30, 60);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many record view requests. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.resetSeconds) },
        }
      );
    }

    const body = await req.json();
    const { slug, title, poster, thumb, year, quality, category, anonymousId: bodyAnonId } = body || {};

    if (!slug || typeof slug !== "string") {
      return NextResponse.json({ success: false, error: "Thiếu slug phim" }, { status: 400 });
    }

    // 2. Xác thực danh tính phía Server: ưu tiên userId khi đã đăng nhập, ngược lại dùng anonymousId ổn định
    const auth = await verifyServerAuth(req);
    const cookieAnonId = req.cookies.get("nanaflix_anon_id")?.value;
    const isValidAnon = (id: unknown): id is string => typeof id === "string" && /^anon_[a-zA-Z0-9_-]{8,64}$/.test(id);

    let verifiedUserId: string | undefined;
    let verifiedAnonymousId: string | undefined;

    if (auth.isAuthenticated && auth.userId) {
      verifiedUserId = auth.userId;
    } else {
      verifiedAnonymousId = isValidAnon(bodyAnonId) ? bodyAnonId : (isValidAnon(cookieAnonId) ? cookieAnonId : undefined);
    }

    // Ghi nhận lượt xem vào Supabase
    await recordMovieViewSupabase({
      slug: slug.trim(),
      title: title || slug,
      poster,
      thumb,
      year: Number(year) || undefined,
      quality,
      category,
      userId: verifiedUserId,
      anonymousId: verifiedAnonymousId,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.warn("[record-view API] Lỗi:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

