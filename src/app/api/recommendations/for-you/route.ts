import { NextRequest, NextResponse } from "next/server";
import { movieApi } from "@/services/movieApi";
import { normalizeMovie } from "@/lib/movieMedia";
import { searchMoviesBySemantic } from "@/services/aiVectorService";

export const maxDuration = 20;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { genres = [], watchedTitles = [], watchedSlugs = [], refreshSeed = 0, currentSlugs = [] } = body || {};

    const watchedSet = new Set<string>([
      ...watchedSlugs.map((s: string) => s.toLowerCase()),
      ...((currentSlugs as string[]) || []).map((s: string) => s.toLowerCase()),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let recommendedMovies: any[] = [];
    let matchContext = "Tuyển chọn đặc sắc";

    // Chọn chủ đề gợi ý luân phiên dựa trên refreshSeed (để mỗi lần bấm 'Đổi Gợi Ý' là 1 chủ đề & danh sách phim hoàn toàn mới)
    const seedMod = Number(refreshSeed) % 3;

    let targetTopic = "";
    if (seedMod === 0 && watchedTitles.length > 0) {
      targetTopic = watchedTitles[0];
      matchContext = `Dựa trên "${watchedTitles[0]}" và gu phim của bạn`;
    } else if (seedMod === 1 && genres.length > 0) {
      const g = genres[refreshSeed % genres.length];
      targetTopic = `thể loại ${g}`;
      matchContext = `Tuyển chọn đỉnh cao thể loại ${g.toUpperCase()} cho bạn`;
    } else if (watchedTitles.length > 1) {
      const secondMovie = watchedTitles[1];
      targetTopic = secondMovie;
      matchContext = `Khám phá thêm từ phim "${secondMovie}"`;
    } else {
      const fallbackGenres = ["Hành Động", "Viễn Tưởng", "Kinh Dị", "Tình Cảm", "Hài Hước", "Võ Thuật"];
      const g = fallbackGenres[refreshSeed % fallbackGenres.length];
      targetTopic = `phim ${g}`;
      matchContext = `Gợi ý đặc sắc: Phim ${g} chọn lọc`;
    }

    // 1. Thử Vector Semantic Search với số lượng ứng viên rộng hơn (24 phim)
    try {
      const queryText = `Phim ${targetTopic} hay nhất, kịch tính, hấp dẫn, rating cao`;
      const semanticResults = await searchMoviesBySemantic(queryText, 24, 0.22);

      if (semanticResults && semanticResults.length > 0) {
        // Lọc bỏ phim đã xem và các phim đang hiển thị ở lượt trước
        const filtered = semanticResults.filter((m) => !watchedSet.has(m.id.toLowerCase()));
        
        // Nếu sau khi lọc còn ít, nới lỏng bỏ currentSlugs
        const pool = filtered.length >= 6 ? filtered : semanticResults.filter((m) => !watchedSlugs.includes(m.id.toLowerCase()));

        recommendedMovies = pool.map((m) => ({
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
          matchReason: targetTopic.includes("thể loại")
            ? `Hợp gu ${targetTopic}`
            : `Tương đồng với "${targetTopic}"`,
        }));
      }
    } catch (e) {
      console.warn("[for-you recommendations] Semantic search error:", e);
    }

    // 2. Bổ sung từ API phim nếu chưa đủ 10 phim
    if (recommendedMovies.length < 10) {
      const genreCategories = ["hanh-dong", "vien-tuong", "kinh-di", "tam-ly", "hai-huoc", "vo-thuat", "hoat-hinh"];
      const chosenCat = genreCategories[(refreshSeed + 1) % genreCategories.length];
      const pageIndex = (refreshSeed % 4) + 1;

      const res = await movieApi.getMovies({
        page: pageIndex,
        limit: 16,
        category: chosenCat,
        sort: "views",
      });

      const items = res?.items || [];
      const existingSlugs = new Set(recommendedMovies.map((m) => m.slug.toLowerCase()));

      for (const raw of items) {
        const norm = normalizeMovie(raw);
        if (!norm.slug || watchedSet.has(norm.slug.toLowerCase()) || existingSlugs.has(norm.slug.toLowerCase())) {
          continue;
        }

        const randomMatch = Math.floor(Math.random() * 7) + 92; // 92% - 98%
        recommendedMovies.push({
          slug: norm.slug,
          name: norm.title,
          title: norm.title,
          origin_name: norm.origin_name,
          poster_url: norm.posterUrl || norm.imageUrl || "/default-poster.jpg",
          thumb_url: norm.thumbUrl || norm.posterUrl || "/default-hero.jpg",
          year: norm.year,
          quality: norm.quality || "Full HD",
          category: [{ name: norm.genre || "Thịnh Hành" }],
          matchPercentage: randomMatch,
          matchReason: "Thịnh hành được yêu thích",
        });

        if (recommendedMovies.length >= 12) break;
      }
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
