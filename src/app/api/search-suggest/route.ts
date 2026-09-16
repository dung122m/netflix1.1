import { NextRequest, NextResponse } from "next/server";
import { movieApi } from "@/services/movieApi";
import { resolveActorMovies } from "@/services/aiActorService";
import { pickBestMoviePoster, MovieLike } from "@/lib/movieMedia";

function normalizeForMatch(str: string): string {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SUGGEST_CACHE = new Map<string, { data: any; expireAt: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const keyword = searchParams.get("keyword")?.trim() || "";

    if (!keyword || keyword.length < 2) {
      return NextResponse.json({ items: [] });
    }

    const cleanKey = keyword.toLowerCase();
    const cached = SUGGEST_CACHE.get(cleanKey);
    if (cached && cached.expireAt > Date.now()) {
      return NextResponse.json(cached.data);
    }

    const normKw = normalizeForMatch(keyword);

    // Chạy song song tìm kiếm phim và phân giải diễn viên với timeout cực ngắn
    const [res, actorRes] = await Promise.all([
      movieApi.getMovies({
        keyword,
        page: 1,
        limit: 8,
      }),
      Promise.race([
        resolveActorMovies(keyword),
        new Promise<{ isActor: boolean; actorName: string; titles: string[]; country?: string; source: "none" }>((resolve) =>
          setTimeout(() => resolve({ isActor: false, actorName: "", titles: [], source: "none" }), 500)
        ),
      ]).catch(() => null),
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

    // 3. Nếu khớp diễn viên, gắn thẻ đề xuất diễn viên lên đầu danh sách
    if (actorRes?.isActor && actorRes.actorName) {
      items.unshift({
        slug: `browse?keyword=${encodeURIComponent(actorRes.actorName)}`,
        title: `✨ Tuyển tập phim của ${actorRes.actorName}`,
        poster: "/default-hero.jpg",
        year: actorRes.country || "Tuyển Chọn",
        quality: "✨ AI Gợi Ý",
        category: "Diễn Viên",
      });
    }

    const responseData = { items };
    SUGGEST_CACHE.set(cleanKey, { data: responseData, expireAt: Date.now() + CACHE_TTL });

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Lỗi tìm kiếm gợi ý:", error);
    return NextResponse.json({ items: [] });
  }
}
