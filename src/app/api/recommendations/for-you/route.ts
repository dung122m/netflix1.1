import { NextRequest, NextResponse } from "next/server";
import { generateFastAiChat } from "@/services/aiProviderService";
import { fetchMoviesByTitles } from "@/services/aiActorService";
import { normalizeMovie } from "@/lib/movieMedia";
import { movieApi } from "@/services/movieApi";

export const maxDuration = 20;

// Danh sách hạt giống các siêu phẩm điện ảnh kinh điển mọi thời đại (Fallback chất lượng cao)
const MASTERPIECE_BLOCKBUSTERS = [
  "Ký Sinh Trùng",
  "Interstellar",
  "Chuyến Tàu Sinh Tử",
  "Diệp Vấn",
  "Đại Thoại Tây Du",
  "Đội Bóng Thiếu Lâm",
  "Hạ Cánh Nơi Anh",
  "Thanh Gươm Diệt Quỷ: Chuyến Tàu Vô Tận",
  "Hoắc Nguyên Giáp",
  "Khởi Nguồn Inception",
  "Tuyệt Đỉnh Kungfu",
  "Sát Phá Lang",
  "Kỵ Sĩ Bóng Đêm",
  "Kẻ Đánh Cắp Giấc Mơ",
  "Vùng Đất Linh Hồn",
  "Vua Sư Tử",
  "Vũ Trụ Điện Ảnh Marvel",
  "Avatar",
  "Titanic",
  "Bố Già",
  "7 Tội Lỗi Chết Người",
  "Cuộc Chiến Vô Cực",
  "Thế Thân Avatar",
  "Kẻ Huỷ Diệt",
  "Ma Trận",
  "Vực Thẳm Đen",
  "Nhà Tù Shawshank",
  "Võ Sĩ Giác Đấu",
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

    // 1. DÙNG FAST AI ĐỂ CHỌN 16-24 SIÊU PHẨM CÙNG ĐẲNG CẤP
    let aiRecommendedTitles: Array<{ title: string; whyMatch: string; matchScore: number }> = [];

    try {
      const systemPrompt = `Bạn là Chuyên gia Tuyển chọn Điện ảnh Đẳng cấp Quốc tế (Master Cinema Curator) của Nanaflix.
Nhiệm vụ của bạn: Khi nhận được yêu cầu tuyển chọn, hãy đề xuất 16 đến 20 tác phẩm điện ảnh/truyền hình THỰC SỰ XUẤT SẮC, NỔI TIẾNG, ĐƯỢC KHÁN GIẢ ĐÁNH GIÁ CỰC CAO (IMDb cao, phim chiếu rạp kinh điển, siêu phẩm ăn khách) thuộc nhiều quốc gia (Việt Nam, Hàn Quốc, Hollywood, Hồng Kông...).

Tránh việc chỉ tập trung vào duy nhất 1 quốc gia hay 1 đạo diễn, hãy tạo danh sách phong phú, hấp dẫn.

Trả về DUY NHẤT một chuỗi JSON hợp lệ theo định dạng:
{
  "recommendations": [
    {
      "title": "Tên phim tiếng Việt chuẩn phổ biến (vd: Diệp Vấn, Hoắc Nguyên Giáp, Sát Phá Lang, Kẻ Đánh Cắp Giấc Mơ, Kỵ Sĩ Bóng Đêm, Chuyến Tàu Sinh Tử)",
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
        const nt = (norm.title || "").toLowerCase();
        const no = (norm.origin_name || "").toLowerCase();
        return nt.includes(rt) || rt.includes(nt) || no.includes(rt) || rt.includes(no);
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
