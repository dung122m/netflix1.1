import { NextRequest, NextResponse } from "next/server";
import { getTmdbRankedMovies, TmdbRankType } from "@/services/tmdbService";

export const revalidate = 21600; // Cache 6 giờ trên CDN
export const maxDuration = 10;

// In-memory cache trên server (6 giờ)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SERVER_CACHE = new Map<string, { data: any; expireAt: number }>();
const CACHE_TTL = 6 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawType = searchParams.get("timeframe") || searchParams.get("type") || "week";
  const type: TmdbRankType =
    rawType === "month" || rawType === "top_rated" ? rawType : "week";
  const limit = Math.min(Number(searchParams.get("limit")) || 10, 20);
  const cacheKey = `${type}_${limit}`;

  // 1. Kiểm tra bộ nhớ cache trên RAM server (phản hồi tức thì ~0ms)
  const cached = SERVER_CACHE.get(cacheKey);
  if (cached && cached.expireAt > Date.now()) {
    return NextResponse.json(cached.data);
  }

  try {
    // 2. Lấy dữ liệu phim từ TMDB Ranking và đối chiếu catalog Nanaflix
    const items = await getTmdbRankedMovies(type, limit);

    if (items && items.length > 0) {
      const responseData = {
        success: true,
        type,
        source: `tmdb_${type}_matched`,
        items,
      };
      SERVER_CACHE.set(cacheKey, { data: responseData, expireAt: Date.now() + CACHE_TTL });
      return NextResponse.json(responseData, {
        headers: {
          "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=43200",
        },
      });
    }

    // 3. Fallback: Nếu không có dữ liệu mới nhưng có cache cũ, trả về cache cũ
    if (cached && cached.data) {
      return NextResponse.json(cached.data);
    }

    return NextResponse.json({
      success: true,
      type,
      source: "empty",
      items: [],
    });
  } catch (err) {
    console.error("[trending-tmdb API] Lỗi:", err);
    if (cached && cached.data) {
      return NextResponse.json(cached.data);
    }
    return NextResponse.json({ success: false, items: [] }, { status: 500 });
  }
}
