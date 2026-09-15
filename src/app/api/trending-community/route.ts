import { NextRequest, NextResponse } from "next/server";
import { getTopTrendingCommunitySupabase } from "@/services/supabaseService";
import { movieApi } from "@/services/movieApi";
import { normalizeMovie } from "@/lib/movieMedia";

export const revalidate = 60; // Cache 60s
export const maxDuration = 15;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const timeframe = (searchParams.get("timeframe") === "week" ? "week" : "total") as "total" | "week";
  const limit = Math.min(Number(searchParams.get("limit")) || 10, 20);

  try {
    // 1. Lấy dữ liệu lượt xem thực tế từ Supabase
    const dbTrending = await getTopTrendingCommunitySupabase(limit, timeframe);

    // 2. Nếu đã có đủ ít nhất 6 phim trong database, sử dụng dữ liệu thực tế
    if (dbTrending && dbTrending.length >= 6) {
      return NextResponse.json({
        success: true,
        source: "database",
        items: dbTrending.slice(0, 10),
      });
    }

    // 3. Nếu database chưa đủ dữ liệu (hệ thống mới khởi tạo), lấy thêm từ phim hot/views cao
    const fallbackRes = await movieApi.getMovies({ page: 1, limit: 12, sort: "views" });
    const fallbackItems = fallbackRes?.items || [];

    const existingSlugs = new Set(dbTrending.map((d) => d.movieSlug));
    const mergedList = [...dbTrending];

    for (const raw of fallbackItems) {
      const norm = normalizeMovie(raw);
      if (!norm.slug || existingSlugs.has(norm.slug)) continue;

      mergedList.push({
        movieSlug: norm.slug,
        movieTitle: norm.title,
        poster: norm.posterUrl || norm.imageUrl || "/default-poster.jpg",
        thumb: norm.thumbUrl || norm.posterUrl || "/default-hero.jpg",
        year: Number(norm.year) || undefined,
        quality: norm.quality || "Full HD",
        category: norm.genre || "Hot",
        viewsTotal: Math.floor(Math.random() * 300) + 450, // Base trending seed
        viewsWeek: Math.floor(Math.random() * 80) + 120,
        lastViewedAt: Date.now() - Math.floor(Math.random() * 3600000),
      });

      if (mergedList.length >= 10) break;
    }

    return NextResponse.json({
      success: true,
      source: dbTrending.length > 0 ? "hybrid" : "curated",
      items: mergedList.slice(0, 10),
    });
  } catch (err) {
    console.error("[trending-community API] Lỗi:", err);
    return NextResponse.json({ success: false, items: [] }, { status: 500 });
  }
}
