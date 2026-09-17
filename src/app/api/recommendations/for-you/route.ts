import { NextRequest, NextResponse } from "next/server";
import { generateFastAiChat } from "@/services/aiProviderService";
import { fetchMoviesByTitles } from "@/services/aiActorService";
import { normalizeMovie } from "@/lib/movieMedia";
import { movieApi } from "@/services/movieApi";
import { kvCache } from "@/services/kvCacheService";

export const maxDuration = 20;

// Danh sách hạt giống các siêu phẩm điện ảnh kinh điển mọi thời đại (Fallback chất lượng cao)
const MASTERPIECE_BLOCKBUSTERS = [
  "Ký Sinh Trùng (Parasite, 2019)",
  "Hố Đen Tử Thần (Interstellar, 2014)",
  "Chuyến Tàu Sinh Tử (Train to Busan, 2016)",
  "Diệp Vấn (Ip Man, 2008)",
  "Đại Thoại Tây Du (A Chinese Odyssey, 1995)",
  "Đội Bóng Thiếu Lâm (Shaolin Soccer, 2001)",
  "Hạ Cánh Nơi Anh (Crash Landing on You, 2019)",
  "Thanh Gươm Diệt Quỷ: Chuyến Tàu Vô Tận (Demon Slayer: Mugen Train, 2020)",
  "Hoắc Nguyên Giáp (Fearless, 2006)",
  "Khởi Nguồn (Inception, 2010)",
  "Tuyệt Đỉnh Kungfu (Kung Fu Hustle, 2004)",
  "Sát Phá Lang (SPL: Kill Zone, 2005)",
  "Kỵ Sĩ Bóng Đêm (The Dark Knight, 2008)",
  "Kẻ Đánh Cắp Giấc Mơ (Inception, 2010)",
  "Vùng Đất Linh Hồn (Spirited Away, 2001)",
  "Vua Sư Tử (The Lion King, 1994)",
  "Avatar (2009)",
  "Titanic (1997)",
  "Bố Già (The Godfather, 1972)",
  "7 Tội Lỗi Chết Người (Se7en, 1995)",
  "Cuộc Chiến Vô Cực (Avengers: Infinity War, 2018)",
  "Kẻ Huỷ Diệt (The Terminator, 1984)",
  "Ma Trận (The Matrix, 1999)",
  "Nhà Tù Shawshank (The Shawshank Redemption, 1994)",
  "Võ Sĩ Giác Đấu (Gladiator, 2000)",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      genres = [],
      watchedTitles = [],
      watchedSlugs = [],
      refreshSeed = 0,
      currentSlugs = [],
    } = body || {};

    const watchedSet = new Set<string>([
      ...watchedSlugs.map((s: string) => s.toLowerCase()),
      ...((currentSlugs as string[]) || []).map((s: string) => s.toLowerCase()),
    ]);

    const hasRichHistory = watchedTitles.length >= 3;
    const hasFavoriteGenres = Array.isArray(genres) && genres.length > 0;
    const seed = Number(refreshSeed) || 0;

    let matchContext = "Tuyển tập siêu phẩm thịnh hành được đánh giá cao nhất";
    let targetTopic = "";
    let isBroadCurated = false;

    if (hasRichHistory) {
      // Người dùng đã có lịch sử xem thực sự (từ 3 phim trở lên)
      const seedMod = seed % 3;
      if (seedMod === 0) {
        targetTopic = `kết hợp gu các phim: ${watchedTitles.slice(0, 3).join(", ")}`;
        matchContext = "Dựa trên các thể loại bạn quan tâm & lịch sử xem gần đây";
      } else if (seedMod === 1 && hasFavoriteGenres) {
        const g = genres[seed % genres.length];
        targetTopic = `thể loại ${g}`;
        matchContext = `Tuyển tập đỉnh cao thể loại ${g.toUpperCase()} dành cho bạn`;
      } else {
        const sample = watchedTitles[seed % watchedTitles.length];
        targetTopic = `phong cách tương đồng tác phẩm "${sample}"`;
        matchContext = `Khám phá các kiệt tác điện ảnh cùng phong cách bạn quan tâm`;
      }
    } else if (hasFavoriteGenres) {
      // Người dùng đã chọn thể loại yêu thích trong hồ sơ
      const g = genres[seed % genres.length];
      targetTopic = `thể loại ${g}`;
      matchContext = `Tuyển tập đỉnh cao thể loại ${g.toUpperCase()} theo sở thích của bạn`;
    } else {
      // Người dùng mới hoặc chỉ mới click dạo 1-2 phim: gợi ý đa dạng phong phú, không kết luận vội vã
      isBroadCurated = true;
      const cinemaCollections = [
        { topic: "Siêu phẩm chiếu rạp & kiệt tác điện ảnh quốc tế", ctx: "Tuyển tập siêu phẩm thịnh hành được đánh giá cao nhất" },
        { topic: "Võ thuật & Hành động kịch tính mãn nhãn", ctx: "Những tác phẩm hành động & võ thuật đỉnh cao nhất" },
        { topic: "Trinh thám hình sự & Bí ẩn ly kỳ", ctx: "Các tựa phim giật gân, giải mã bí ẩn cuốn hút" },
        { topic: "Khoa học viễn tưởng & Du hành không gian", ctx: "Vũ trụ điện ảnh giả tưởng & hack não kinh điển" },
        { topic: "Hài hước, Hoạt hình & Chữa lành cảm xúc", ctx: "Tuyển tập thư giãn nhẹ nhàng & chữa lành tâm hồn" },
      ];
      const selected = cinemaCollections[seed % cinemaCollections.length];
      targetTopic = selected.topic;
      matchContext = selected.ctx;
    }

    // =========================================================================
    // KIỂM TRA CLOUDFLARE KV CACHE TOÀN CẦU (L1 RAM + L2 CLOUDFLARE KV)
    // Không gọi lại AI và API ngoài nếu kết quả phù hợp đã có trong KV!
    // =========================================================================
    const topicHash = targetTopic.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 80);
    const kvForYouKey = `foryou:topic:${topicHash}:${seed % 4}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cachedPool = await kvCache.get<{ context: string; movies: any[] }>(kvForYouKey);
    if (cachedPool && Array.isArray(cachedPool.movies) && cachedPool.movies.length > 0) {
      // Lọc bỏ phim user đã xem mà không làm rò rỉ dữ liệu cá nhân giữa các user
      const filtered = cachedPool.movies.filter(
        (m) => m && m.slug && !watchedSet.has(m.slug.toLowerCase())
      );
      if (filtered.length >= 8) {
        return NextResponse.json({
          success: true,
          context: cachedPool.context || matchContext,
          items: filtered.slice(0, 18),
          cached: true,
        });
      }
    }

    // =========================================================================
    // 1. HYBRID STRATEGY: BỎ GỌI AI NẾU LÀ USER MỚI HOẶC CHỈ CÓ GENRE ĐƠN GIẢN
    // Lấy trực tiếp từ kho phim theo thể loại/xu hướng và xoay vòng page theo seed
    // =========================================================================
    if (!hasRichHistory) {
      const targetCategory = hasFavoriteGenres ? genres[seed % genres.length] : undefined;
      const page = (seed % 5) + 1;

      try {
        const catalogRes = await movieApi.getMovies({
          category: targetCategory,
          page,
          limit: 18,
          sort: "views",
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const catalogMovies: any[] = [];
        const seenSlugs = new Set<string>();

        for (const raw of catalogRes?.items || []) {
          const norm = normalizeMovie(raw);
          if (!norm.slug || watchedSet.has(norm.slug.toLowerCase()) || seenSlugs.has(norm.slug.toLowerCase())) {
            continue;
          }
          seenSlugs.add(norm.slug.toLowerCase());

          const matchScore = Math.floor(Math.random() * 5) + 94; // 94% - 98%
          const matchReason = hasFavoriteGenres
            ? `Tuyển tập đỉnh cao thể loại ${(targetCategory || "").toUpperCase()} chuẩn gu bạn`
            : `Siêu phẩm ăn khách phù hợp xu hướng điện ảnh`;

          catalogMovies.push({
            slug: norm.slug,
            name: norm.title,
            title: norm.title,
            origin_name: norm.origin_name,
            poster_url: norm.posterUrl || norm.imageUrl || "/default-poster.jpg",
            thumb_url: norm.thumbUrl || norm.posterUrl || "/default-hero.jpg",
            year: norm.year,
            quality: norm.quality || "Full HD",
            category: [{ name: norm.genre || (hasFavoriteGenres ? targetCategory : "Đề Xuất") }],
            matchPercentage: matchScore,
            matchReason,
          });

          if (catalogMovies.length >= 16) break;
        }

        if (catalogMovies.length > 0) {
          kvCache.set(
            kvForYouKey,
            {
              context: matchContext,
              movies: catalogMovies,
            },
            6 * 3600
          ).catch(() => {});

          return NextResponse.json({
            success: true,
            context: matchContext,
            items: catalogMovies,
          });
        }
      } catch (catalogErr) {
        console.warn("[for-you recommendations] Catalog fetch error, fallback to AI flow:", catalogErr);
      }
    }

    // 2. DÙNG FAST AI ĐỐI VỚI NGƯỜI DÙNG CÓ GU PHỨC TẠP / LỊCH SỬ XEM
    let aiRecommendedTitles: Array<{ title: string; whyMatch: string; matchScore: number }> = [];

    try {
      const systemPrompt = `Bạn là Chuyên gia Tuyển chọn Điện ảnh Đẳng cấp Quốc tế (Master Cinema Curator) của Nanaflix.
Nhiệm vụ của bạn: Khi nhận được yêu cầu tuyển chọn, hãy đề xuất 16 đến 20 tác phẩm điện ảnh/truyền hình THỰC SỰ XUẤT SẮC, NỔI TIẾNG, ĐƯỢC KHÁN GIẢ ĐÁNH GIÁ CỰC CAO (IMDb cao, phim chiếu rạp kinh điển, siêu phẩm ăn khách) thuộc nhiều quốc gia (Việt Nam, Hàn Quốc, Hollywood, Hồng Kông...).

Tránh việc chỉ tập trung vào duy nhất 1 quốc gia hay 1 đạo diễn, hãy tạo danh sách phong phú, hấp dẫn.

Trả về DUY NHẤT một chuỗi JSON hợp lệ theo định dạng:
{
  "recommendations": [
    {
      "title": "Tên phim tiếng Việt kèm tên gốc tiếng Anh và năm phát hành trong ngoặc đơn (vd: Kẻ Đánh Cắp Giấc Mơ (Inception, 2010), Kỵ Sĩ Bóng Đêm (The Dark Knight, 2008), Ký Sinh Trùng (Parasite, 2019), Chuyến Tàu Sinh Tử (Train to Busan, 2016), Diệp Vấn (Ip Man, 2008))",
      "whyMatch": "Lý do ngắn gọn vì sao bộ phim này đáng xem (1 câu ngắn)",
      "matchScore": 98
    }
  ]
}`;

      const userPrompt = isBroadCurated
        ? `Hãy tuyển chọn 16-20 bộ phim xuất sắc và ăn khách nhất cho chủ đề: "${targetTopic}".`
        : `Người dùng quan tâm: "${targetTopic}". Hãy chọn ra 16-20 tác phẩm điện ảnh xuất sắc, đa dạng và hấp dẫn nhất.`;

      const aiRes = await generateFastAiChat({
        systemPrompt,
        userPrompt,
        temperature: 0.35,
        maxTokens: 1000,
        jsonMode: true,
        timeoutMs: 5000,
      });

      if (aiRes && aiRes.text) {
        const cleaned = aiRes.text.replace(/```(?:json)?\s*/gi, "").replace(/\s*```/g, "").trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
        if (Array.isArray(parsed.recommendations)) {
          aiRecommendedTitles = parsed.recommendations;
        }
      }
    } catch (err) {
      console.warn("[for-you recommendations] AI generation fallback:", err);
    }

    // Nếu AI không trả về đủ, ghép thêm từ danh sách hạt giống siêu phẩm
    if (aiRecommendedTitles.length < 12) {
      const existingTitles = new Set(aiRecommendedTitles.map((r) => r.title.toLowerCase()));
      for (const t of MASTERPIECE_BLOCKBUSTERS) {
        if (!existingTitles.has(t.toLowerCase())) {
          aiRecommendedTitles.push({
            title: t,
            whyMatch: "Siêu phẩm điện ảnh kinh điển được yêu thích nhất",
            matchScore: Math.floor(Math.random() * 5) + 94,
          });
          existingTitles.add(t.toLowerCase());
        }
        if (aiRecommendedTitles.length >= 20) break;
      }
    }

    const titlesToFetch = aiRecommendedTitles.map((r) => r.title).filter(Boolean);

    // 2. TÌM VÀ ĐỐI CHIẾU CHÍNH XÁC PHIM TỪ KHO PHIM API
    const resolvedRawMovies = await fetchMoviesByTitles(titlesToFetch, 20);

    // 3. Chuẩn hoá dữ liệu và ghép matchPercentage từ AI
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recommendedMovies: any[] = [];
    const seenSlugs = new Set<string>();

    for (const raw of resolvedRawMovies) {
      const norm = normalizeMovie(raw);
      if (!norm.slug || watchedSet.has(norm.slug.toLowerCase()) || seenSlugs.has(norm.slug.toLowerCase())) {
        continue;
      }
      seenSlugs.add(norm.slug.toLowerCase());

      const matchMeta = aiRecommendedTitles.find((r) => {
        const rt = (r.title || "").toLowerCase();
        const viOnly = rt.replace(/\([^)]*\)/g, "").trim();
        const matchParen = rt.match(/\(([^)]+)\)/);
        const engOnly = (matchParen ? matchParen[1] : "").toLowerCase().replace(/\b\d{4}\b/g, "").replace(/,/g, "").trim();
        const nt = (norm.title || "").toLowerCase();
        const no = (norm.origin_name || "").toLowerCase();

        return (
          (viOnly && (nt.includes(viOnly) || viOnly.includes(nt) || no.includes(viOnly) || viOnly.includes(no))) ||
          (engOnly && (nt.includes(engOnly) || engOnly.includes(nt) || no.includes(engOnly) || engOnly.includes(no)))
        );
      });

      const matchScore = matchMeta?.matchScore || (Math.floor(Math.random() * 5) + 92); // 92% - 98%
      const matchReason = matchMeta?.whyMatch || `Cùng đẳng cấp với ${targetTopic}`;

      recommendedMovies.push({
        slug: norm.slug,
        name: norm.title,
        title: norm.title,
        origin_name: norm.origin_name,
        poster_url: norm.posterUrl || norm.imageUrl || "/default-poster.jpg",
        thumb_url: norm.thumbUrl || norm.posterUrl || "/default-hero.jpg",
        year: norm.year,
        quality: norm.quality || "Full HD",
        category: [{ name: norm.genre || "Siêu Phẩm" }],
        matchPercentage: matchScore,
        matchReason,
      });

      if (recommendedMovies.length >= 16) break;
    }

    // 4. BỔ SUNG BACKFILL NẾU SỐ LƯỢNG VẪN DƯỚI 12 PHIM (ĐẢM BẢO CAROUSEL LUÔN ĐẦY ĐẶN 12-16 PHIM)
    if (recommendedMovies.length < 12) {
      try {
        const fallbackRes = await movieApi.getMovies({
          page: 1,
          limit: 16,
          sort: "views",
        });
        const fallbackItems = fallbackRes?.items || [];
        for (const raw of fallbackItems) {
          const norm = normalizeMovie(raw);
          if (!norm.slug || watchedSet.has(norm.slug.toLowerCase()) || seenSlugs.has(norm.slug.toLowerCase())) {
            continue;
          }
          seenSlugs.add(norm.slug.toLowerCase());
          recommendedMovies.push({
            slug: norm.slug,
            name: norm.title,
            title: norm.title,
            origin_name: norm.origin_name,
            poster_url: norm.posterUrl || norm.imageUrl || "/default-poster.jpg",
            thumb_url: norm.thumbUrl || norm.posterUrl || "/default-hero.jpg",
            year: norm.year,
            quality: norm.quality || "Full HD",
            category: [{ name: norm.genre || "Đề Xuất" }],
            matchPercentage: Math.floor(Math.random() * 6) + 90,
            matchReason: `Siêu phẩm ăn khách phù hợp với ${targetTopic}`,
          });
          if (recommendedMovies.length >= 14) break;
        }
      } catch (backfillErr) {
        console.warn("[for-you recommendations] Backfill error:", backfillErr);
      }
    }

    // Lưu vào Cloudflare KV với TTL 6 giờ
    if (recommendedMovies.length > 0) {
      kvCache.set(
        kvForYouKey,
        {
          context: matchContext,
          movies: recommendedMovies,
        },
        6 * 3600
      ).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      context: matchContext,
      items: recommendedMovies,
    });
  } catch (err) {
    console.error("[for-you recommendations] Error:", err);
    return NextResponse.json({ success: false, items: [] }, { status: 500 });
  }
}
