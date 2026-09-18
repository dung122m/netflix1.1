import { NextRequest, NextResponse } from "next/server";
import { movieApi } from "@/services/movieApi";
import { resolveActorMovies, isAmbiguousShortActorKeyword, hasExplicitActorPrefix } from "@/services/aiActorService";
import { pickBestMoviePoster, MovieLike } from "@/lib/movieMedia";
import { normalizeForMatch } from "@/lib/stringUtils";
import { cacheService } from "@/lib/cache";

// TTL cho Search Suggest: 1 giờ (3600s), theo convention của Nanaflix
const SUGGEST_CACHE_TTL_SECONDS = 3600;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const keyword = searchParams.get("keyword")?.trim() || "";

    // Không tạo cache riêng cho search < 2 ký tự
    if (!keyword || keyword.length < 2) {
      return NextResponse.json({ items: [] });
    }

    const normKw = normalizeForMatch(keyword);
    if (!normKw || normKw.length < 2) {
      return NextResponse.json({ items: [] });
    }

    // 1. Kiểm tra L1 In-memory & L2 Upstash Redis qua cacheService
    const cacheKey = `search:suggest:${normKw}`;
    const cached = await cacheService.get<{ items: unknown[] }>(cacheKey);
    if (cached && Array.isArray(cached.items)) {
      return NextResponse.json(cached);
    }

    // Chỉ truy vấn actor khi người dùng gõ tiền tố rõ ràng (vd: "diễn viên ...", "đạo diễn ...", "phim của ...", "actor: ...")
    const shouldCheckActor = hasExplicitActorPrefix(keyword);

    // Chạy song song tìm kiếm phim và phân giải diễn viên với timeout cực ngắn
    // skipKvCache: true đảm bảo các truy vấn gợi ý dở dang (limit 8) không ghi rác lên Cloudflare KV
    const [res, actorRes] = await Promise.all([
      movieApi.getMovies({
        keyword,
        page: 1,
        limit: 8,
        skipKvCache: true,
      }),
      shouldCheckActor
        ? Promise.race([
            resolveActorMovies(keyword),
            new Promise<{ isActor: boolean; actorName: string; titles: string[]; country?: string; source: "none" }>((resolve) =>
              setTimeout(() => resolve({ isActor: false, actorName: "", titles: [], source: "none" }), 500)
            ),
          ]).catch(() => null)
        : Promise.resolve(null),
    ]);

    interface SuggestMovieItem {
      slug?: string;
      name?: string;
      title?: string;
      origin_name?: string;
      poster_url?: string;
      thumb_url?: string;
      year?: number | string;
      quality?: string;
      type?: string;
      category?: Array<{ name?: string }>;
    }

    const rawItems = ((res?.items || []) as SuggestMovieItem[]);

    // Sắp xếp gợi ý nhanh: Ưu tiên tuyệt đối các phim có tên khớp với từ khóa gõ vào
    const getSuggestScore = (item: SuggestMovieItem, kw: string): number => {
      const normTitle = normalizeForMatch(item.name || item.title || "");
      const normOrig = normalizeForMatch(item.origin_name || "");
      const normSlug = normalizeForMatch(item.slug || "");

      if (normTitle === kw || normOrig === kw || normSlug === kw.replace(/\s+/g, "-")) return 100;
      if (normTitle.startsWith(kw) || normOrig.startsWith(kw)) return 80;
      if (normTitle.includes(kw) || normOrig.includes(kw)) return 60;
      return 20; // Khớp trong mô tả / nội dung
    };

    rawItems.sort((a, b) => getSuggestScore(b, normKw) - getSuggestScore(a, normKw));

    const items = rawItems.slice(0, 5).map((item) => ({
      slug: item.slug || "",
      title: item.name || item.title || "",
      poster: pickBestMoviePoster(item as MovieLike, "/default-poster.svg"),
      year: item.year || "",
      quality: item.quality || "HD",
      category: item.category?.[0]?.name || item.type || "",
    }));

    // 3. Nếu khớp diễn viên rõ ràng:
    // - Chỉ đưa lên ĐẦU danh sách nếu người dùng gõ tiền tố rõ ràng (vd: "diễn viên ...", "phim của ...")
    // - Với tìm kiếm thông thường (vd: "Trấn Thành"), phim tìm theo tên vẫn ưu tiên hàng đầu, thẻ diễn viên được thêm vào CUỐI danh sách để người dùng có thể bấm vào nếu muốn xem tuyển tập
    // - TUYỆT ĐỐI không gắn thẻ diễn viên cho từ khóa ngắn/mơ hồ ("Mai", "An", "Anh"...)
    if (actorRes?.isActor && actorRes.actorName && !isAmbiguousShortActorKeyword(keyword)) {
      const actorItem = {
        slug: `browse?actor=${encodeURIComponent(actorRes.actorName)}`,
        title: `✨ Tuyển tập phim của ${actorRes.actorName}`,
        poster: "/default-hero.jpg",
        year: actorRes.country || "Tuyển Chọn",
        quality: "✨ AI Gợi Ý",
        category: "Diễn Viên",
      };

      if (hasExplicitActorPrefix(keyword) || items.length === 0) {
        items.unshift(actorItem);
      } else {
        items.push(actorItem);
      }
    }

    const responseData = { items };
    // 2. Lưu vào L1 Memory & L2 Redis (TTL 1 giờ), không cache khi có lỗi
    await cacheService.set(cacheKey, responseData, SUGGEST_CACHE_TTL_SECONDS).catch((err) => {
      console.warn("[search-suggest] Lỗi ghi cache Redis:", err);
    });

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Lỗi tìm kiếm gợi ý:", error);
    return NextResponse.json({ items: [] });
  }
}
