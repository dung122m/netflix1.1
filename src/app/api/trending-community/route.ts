import { NextRequest, NextResponse } from "next/server";
import { getTopTrendingCommunitySupabase } from "@/services/supabaseService";
import { fetchMoviesByTitles } from "@/services/aiActorService";
import { normalizeMovie } from "@/lib/movieMedia";

export const revalidate = 60; // Cache 60s
export const maxDuration = 15;

// 1. TOP 10 TOÀN THỜI GIAN: Các kiệt tác điện ảnh kinh điển mọi thời đại
const POPULAR_COMMUNITY_ALLTIME = [
  { title: "Ký Sinh Trùng", baseViews: 58900 },
  { title: "Interstellar", baseViews: 54300 },
  { title: "Chuyến Tàu Sinh Tử", baseViews: 48200 },
  { title: "Diệp Vấn", baseViews: 45300 },
  { title: "Đại Thoại Tây Du", baseViews: 43700 },
  { title: "Đội Bóng Thiếu Lâm", baseViews: 40000 },
  { title: "Hạ Cánh Nơi Anh", baseViews: 37500 },
  { title: "Hoắc Nguyên Giáp", baseViews: 35200 },
  { title: "Thanh Gươm Diệt Quỷ", baseViews: 33800 },
  { title: "Khởi Nguồn", baseViews: 31400 },
];

// 2. TOP 10 TRONG TUẦN: Các bom tấn thịnh hành, phim rạp & anime cực hot mới nhất
const POPULAR_COMMUNITY_WEEKLY = [
  { title: "Oppenheimer", baseViews: 14800 },
  { title: "Sát Thủ John Wick", baseViews: 13900 },
  { title: "Hành Tinh Cát", baseViews: 12700 },
  { title: "Quật Mộ Trùng Ma", baseViews: 11500 },
  { title: "Chú Thuật Hồi Chiến", baseViews: 10800 },
  { title: "Cửu Long Thành Trại", baseViews: 9900 },
  { title: "Godzilla", baseViews: 9200 },
  { title: "Thám Tử Lừng Danh Conan", baseViews: 8600 },
  { title: "Nữ Hoàng Nước Mắt", baseViews: 8100 },
  { title: "Diệp Vấn", baseViews: 7400 },
];

// In-memory cache trên server (10 phút)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SERVER_CACHE = new Map<string, { data: any; expireAt: number }>();
const CACHE_TTL = 10 * 60 * 1000;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const timeframe = (searchParams.get("timeframe") === "week" ? "week" : "total") as "total" | "week";
  const limit = Math.min(Number(searchParams.get("limit")) || 10, 20);
  const cacheKey = `${timeframe}_${limit}`;

  // 0. Kiểm tra bộ nhớ cache trên RAM server (0ms)
  const cached = SERVER_CACHE.get(cacheKey);
  if (cached && cached.expireAt > Date.now()) {
    return NextResponse.json(cached.data);
  }

  try {
    // 1. Lấy dữ liệu lượt xem thực tế từ Supabase
    const dbTrending = await getTopTrendingCommunitySupabase(limit, timeframe);

    // 2. Nếu đã có đủ ít nhất 6 phim trong database thực tế, sử dụng trực tiếp
    if (dbTrending && dbTrending.length >= 6) {
      const responseData = {
        success: true,
        source: "database",
        items: dbTrending.slice(0, 10),
      };
      SERVER_CACHE.set(cacheKey, { data: responseData, expireAt: Date.now() + CACHE_TTL });
      return NextResponse.json(responseData);
    }

    // 3. Sử dụng danh sách theo từng khung thời gian riêng biệt
    const targetSourceList =
      timeframe === "week" ? POPULAR_COMMUNITY_WEEKLY : POPULAR_COMMUNITY_ALLTIME;

    const titlesToFetch = targetSourceList.map((m) => m.title);
    const resolvedMovies = await fetchMoviesByTitles(titlesToFetch, 12);

    const existingSlugs = new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mergedList: any[] = [];

    // Thêm các phim có trong DB trước
    for (const d of dbTrending) {
      existingSlugs.add(d.movieSlug.toLowerCase());
      mergedList.push(d);
    }

    for (let i = 0; i < resolvedMovies.length; i++) {
      const raw = resolvedMovies[i];
      const norm = normalizeMovie(raw);
      if (!norm.slug || existingSlugs.has(norm.slug.toLowerCase())) continue;
      existingSlugs.add(norm.slug.toLowerCase());

      const baseInfo = targetSourceList[i] || { baseViews: 10000 };
      const viewsTotal = timeframe === "week"
        ? Math.floor(baseInfo.baseViews * 3.6) + Math.floor(Math.random() * 2000)
        : baseInfo.baseViews + Math.floor(Math.random() * 1500);

      const viewsWeek = timeframe === "week"
        ? baseInfo.baseViews + Math.floor(Math.random() * 500)
        : Math.floor(viewsTotal * 0.26) + Math.floor(Math.random() * 400);

      mergedList.push({
        movieSlug: norm.slug,
        movieTitle: norm.title,
        poster: norm.posterUrl || norm.imageUrl || "/default-poster.jpg",
        thumb: norm.thumbUrl || norm.posterUrl || "/default-hero.jpg",
        year: Number(norm.year) || undefined,
        quality: norm.quality || "Full HD",
        category: norm.genre || (timeframe === "week" ? "Đang Hot" : "Kinh Điển"),
        viewsTotal,
        viewsWeek,
        lastViewedAt: Date.now() - Math.floor(Math.random() * 3600000),
      });

      if (mergedList.length >= 10) break;
    }

    const responseData = {
      success: true,
      timeframe,
      source: dbTrending.length > 0 ? "hybrid" : "curated_masterpieces",
      items: mergedList.slice(0, 10),
    };

    if (mergedList.length > 0) {
      SERVER_CACHE.set(cacheKey, { data: responseData, expireAt: Date.now() + CACHE_TTL });
    }

    return NextResponse.json(responseData);
  } catch (err) {
    console.error("[trending-community API] Lỗi:", err);
    return NextResponse.json({ success: false, items: [] }, { status: 500 });
  }
}
