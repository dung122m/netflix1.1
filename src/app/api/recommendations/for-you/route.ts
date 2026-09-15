import { NextRequest, NextResponse } from "next/server";
import { movieApi } from "@/services/movieApi";
import { normalizeMovie } from "@/lib/movieMedia";
import { searchMoviesBySemantic } from "@/services/aiVectorService";

export const maxDuration = 20;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { genres = [], watchedTitles = [], watchedSlugs = [] } = body || {};

    const watchedSet = new Set<string>(watchedSlugs.map((s: string) => s.toLowerCase()));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let recommendedMovies: any[] = [];
    let matchContext = "Tuyển chọn đặc sắc";

    // 1. Thử Vector Semantic Search nếu có danh sách phim đã xem hoặc thể loại yêu thích
    const promptKeywords = [
      ...genres.slice(0, 3),
      ...watchedTitles.slice(0, 2),
    ].filter(Boolean);

    if (promptKeywords.length > 0) {
      try {
        const queryText = `Phim thể loại ${promptKeywords.join(", ")} hay nhất, kịch tính, hấp dẫn`;
        const semanticResults = await searchMoviesBySemantic(queryText, 12, 0.25);

        if (semanticResults && semanticResults.length > 0) {
          recommendedMovies = semanticResults
            .filter((m) => !watchedSet.has(m.id.toLowerCase()))
            .map((m) => ({
              slug: m.id,
              name: m.title,
              title: m.title,
              origin_name: m.originalName,
              poster_url: m.posterUrl,
              thumb_url: m.thumbUrl || m.posterUrl,
              year: m.year,
              quality: m.quality || "HD",
              category: [{ name: m.category || "Đặc sắc" }],
              matchPercentage: Math.min(99, Math.floor((m.similarity || 0.8) * 100)),
              matchReason: watchedTitles.length > 0
                ? `Tương đồng với "${watchedTitles[0]}"`
                : `Hợp gu thể loại ${genres[0] || "của bạn"}`,
            }));
        }
      } catch (e) {
        console.warn("[for-you recommendations] Semantic search error:", e);
      }
    }

    // 2. Nếu chưa đủ 8 phim, bổ sung bằng API lọc theo thể loại yêu thích hoặc phim đánh giá cao
    if (recommendedMovies.length < 8) {
      const topGenreSlug = genres.length > 0 ? genres[0].toLowerCase() : undefined;
      const res = await movieApi.getMovies({
        page: 1,
        limit: 16,
        category: topGenreSlug,
        sort: "rating",
      });

      const items = res?.items || [];
      const existingSlugs = new Set(recommendedMovies.map((m) => m.slug));

      for (const raw of items) {
        const norm = normalizeMovie(raw);
        if (!norm.slug || watchedSet.has(norm.slug.toLowerCase()) || existingSlugs.has(norm.slug)) {
          continue;
        }

        const randomMatch = Math.floor(Math.random() * 8) + 91; // 91% - 98%
        recommendedMovies.push({
          slug: norm.slug,
          name: norm.title,
          title: norm.title,
          origin_name: norm.origin_name,
          poster_url: norm.posterUrl || norm.imageUrl || "/default-poster.jpg",
          thumb_url: norm.thumbUrl || norm.posterUrl || "/default-hero.jpg",
          year: norm.year,
          quality: norm.quality || "Full HD",
          category: [{ name: norm.genre || "Phim Hay" }],
          matchPercentage: randomMatch,
          matchReason: genres.length > 0
            ? `Phù hợp sở thích ${genres.join(", ")}`
            : "Được cộng đồng đánh giá cao",
        });

        if (recommendedMovies.length >= 12) break;
      }
    }

    if (watchedTitles.length > 0) {
      matchContext = `Dựa trên "${watchedTitles[0]}" và gu phim của bạn`;
    } else if (genres.length > 0) {
      matchContext = `Dựa trên thể loại yêu thích: ${genres.slice(0, 2).join(", ")}`;
    }

    return NextResponse.json({
      success: true,
      context: matchContext,
      items: recommendedMovies.slice(0, 10),
    });
  } catch (err) {
    console.error("[for-you recommendations] Error:", err);
    return NextResponse.json({ success: false, items: [] }, { status: 500 });
  }
}
