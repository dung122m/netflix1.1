import { NextRequest, NextResponse } from "next/server";
import { getTopTrendingCommunitySupabase } from "@/services/communityWatchService";
import {
  enforceRateLimit,
  buildRateLimitResponse,
  RATE_LIMIT_PRESETS,
} from "@/lib/rateLimit";

export const maxDuration = 10;

// In-memory cache trên server (60 giây để chống bão request và phản hồi 0ms)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SERVER_CACHE = new Map<string, { data: any; expireAt: number }>();
const CACHE_TTL = 60 * 1000;

export function invalidateTrendingCache(): void {
  // Chỉ xóa cache RAM cục bộ, không gửi hàng loạt lệnh Redis DEL khi có lượt xem phim
  SERVER_CACHE.clear();
}

export async function GET(req: NextRequest) {
  const rateLimit = await enforceRateLimit(req, RATE_LIMIT_PRESETS.PUBLIC_IN_MEMORY_READ);
  if (!rateLimit.allowed) {
    return buildRateLimitResponse(rateLimit);
  }
  const { searchParams } = new URL(req.url);
  const timeframe = (searchParams.get("timeframe") === "week" ? "week" : "total") as "total" | "week";
  const limit = Math.min(Number(searchParams.get("limit")) || 10, 20);
  const cacheKey = `trending:${timeframe}:${limit}`;

  const edgeHeaders = {
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    "CDN-Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    "Vercel-CDN-Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
  };

  // 1. Kiểm tra bộ nhớ cache trên RAM server (phản hồi tức thì ~1ms)
  const cached = SERVER_CACHE.get(cacheKey);
  if (cached && cached.expireAt > Date.now()) {
    return NextResponse.json(cached.data, {
      headers: edgeHeaders,
    });
  }

  try {
    // 2. Lấy dữ liệu lượt xem thực tế (đã có single-flight + cache Redis DB1 trending:community:summary:v1 bên trong)
    const realTrending = await getTopTrendingCommunitySupabase(limit, timeframe);

    if (realTrending && realTrending.length > 0) {
      const responseData = {
        success: true,
        timeframe,
        source: "analytics_views",
        items: realTrending,
      };
      SERVER_CACHE.set(cacheKey, { data: responseData, expireAt: Date.now() + CACHE_TTL });
      return NextResponse.json(responseData, {
        headers: edgeHeaders,
      });
    }

    // 3. Fallback: Nếu không có dữ liệu mới nhưng có cache cũ, trả về cache cũ
    if (cached && cached.data) {
      return NextResponse.json(cached.data, {
        headers: edgeHeaders,
      });
    }

    // 4. Nếu chưa có dữ liệu nào, trả về danh sách rỗng (không tạo số liệu ảo)
    return NextResponse.json({
      success: true,
      timeframe,
      source: "empty",
      items: [],
    });
  } catch (err) {
    console.error("[trending-community API] Lỗi:", err);
    if (cached && cached.data) {
      return NextResponse.json(cached.data);
    }
    return NextResponse.json({ success: false, items: [] }, { status: 500 });
  }
}
