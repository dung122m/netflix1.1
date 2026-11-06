import { NextRequest, NextResponse } from "next/server";
import { recordMovieViewSupabase } from "@/services/communityWatchService";
import {
  enforceRateLimit,
  buildRateLimitResponse,
} from "@/lib/rateLimit";
import { verifyServerAuth } from "@/lib/serverAuth";

export const maxDuration = 10;

export async function POST(req: NextRequest) {
  try {
    // 1. Giới hạn tần suất in-memory (0ms, 0 Redis commands) - ngăn chặn bot spam ghi dữ liệu
    const rateLimit = await enforceRateLimit(req, {
      namespace: "record-view",
      maxRequests: 30,
      windowSeconds: 60,
      failClosed: false,
      strategy: "in-memory-only",
    });
    if (!rateLimit.allowed) {
      return buildRateLimitResponse(rateLimit, "Too many record view requests. Please try again later.");
    }

    const body = await req.json();
    const {
      slug,
      title,
      poster,
      thumb,
      year,
      quality,
      category,
      anonymousId: bodyAnonId,
    } = body || {};

    if (!slug || typeof slug !== "string") {
      return NextResponse.json({ success: false, error: "Thiếu slug phim" }, { status: 400 });
    }

    const cleanSlug = slug.trim();

    // 2. Xác thực danh tính phía Server: ưu tiên userId khi đã đăng nhập, tuyệt đối không fallback sang anonymousId khi đã xác thực
    const auth = await verifyServerAuth(req);
    const cookieAnonId = req.cookies.get("nanaflix_anon_id")?.value;
    const isValidAnon = (id: unknown): id is string => typeof id === "string" && /^anon_[a-zA-Z0-9_-]{8,64}$/.test(id);

    let verifiedUserId: string | undefined;
    let verifiedAnonymousId: string | undefined;

    if (auth.isAuthenticated && auth.userId) {
      verifiedUserId = auth.userId;
      verifiedAnonymousId = undefined; // Khi đã đăng nhập, tuyệt đối không dùng Guest identity
    } else {
      verifiedAnonymousId = isValidAnon(bodyAnonId) ? bodyAnonId : (isValidAnon(cookieAnonId) ? cookieAnonId : undefined);
    }

    // 3. Ghi nhận lịch sử xem cá nhân vào Supabase (để phục vụ Continue Watching)
    await recordMovieViewSupabase({
      slug: cleanSlug,
      title: title || cleanSlug,
      poster,
      thumb,
      year: Number(year) || undefined,
      quality,
      category,
      userId: verifiedUserId,
      anonymousId: verifiedAnonymousId,
    }).catch((err) => {
      console.warn("[record-view API] Lỗi ghi watch_history:", err);
    });

    // Không xóa cache Trending trên mỗi lượt xem (tránh gây bão Redis DEL và tái tạo cache liên tục)
    // Dữ liệu Trending được làm mới định kỳ có kiểm soát theo TTL 15 phút

    return NextResponse.json({ success: true });
  } catch (err) {
    console.warn("[record-view API] Lỗi:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
