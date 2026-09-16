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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const keyword = searchParams.get("keyword")?.trim() || "";

    if (!keyword || keyword.length < 2) {
      return NextResponse.json({ items: [] });
    }

    const normKw = normalizeForMatch(keyword);

    // 1. Phân giải diễn viên bằng AI + Cache thông minh (< 5ms khi có cache)
    const actorRes = await resolveActorMovies(keyword).catch(() => null);

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

    // 2. Tìm kiếm trực tiếp qua movieApi với SWR Cache cực nhanh (< 5ms)
    const res = await movieApi.getMovies({
      keyword,
      page: 1,
      limit: 8,
    });
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

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Lỗi tìm kiếm gợi ý:", error);
    return NextResponse.json({ items: [] });
  }
}
