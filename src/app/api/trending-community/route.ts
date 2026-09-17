import { NextRequest, NextResponse } from "next/server";
import { getTopTrendingCommunitySupabase } from "@/services/supabaseService";

export const revalidate = 300; // Cache 5 phút
export const maxDuration = 10;

// In-memory cache trên server (5 phút)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SERVER_CACHE = new Map<string, { data: any; expireAt: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const timeframe = (searchParams.get("timeframe") === "week" ? "week" : "total") as "total" | "week";
  const limit = Math.min(Number(searchParams.get("limit")) || 10, 20);
  const cacheKey = `${timeframe}_${limit}`;

  // 1. Kiểm tra bộ nhớ cache trên RAM server (phản hồi tức thì ~1ms)
  const cached = SERVER_CACHE.get(cacheKey);
  if (cached && cached.expireAt > Date.now()) {
    return NextResponse.json(cached.data);
  }

  try {
    // 2. Lấy dữ liệu lượt xem thực tế từ Supabase watch_history
    const realTrending = await getTopTrendingCommunitySupabase(limit, timeframe);

    if (realTrending && realTrending.length > 0) {
      const responseData = {
        success: true,
        timeframe,
        source: "watch_history",
        items: realTrending,
      };
      SERVER_CACHE.set(cacheKey, { data: responseData, expireAt: Date.now() + CACHE_TTL });
      return NextResponse.json(responseData);
    }

    // 3. Fallback: Nếu không có dữ liệu mới nhưng có cache cũ, trả về cache cũ
    if (cached && cached.data) {
      return NextResponse.json(cached.data);
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
