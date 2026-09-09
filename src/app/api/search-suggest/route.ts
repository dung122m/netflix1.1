import { NextRequest, NextResponse } from "next/server";
import { movieApi } from "@/services/movieApi";
import { KNOWN_ACTORS_FILMOGRAPHY } from "@/services/aiActorService";

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

    // 1. Kiểm tra tức thì xem có khớp diễn viên trong từ điển không (< 0.1ms)
    const matchedActor = KNOWN_ACTORS_FILMOGRAPHY.find((item) =>
      item.aliases.some((alias) => {
        const normAlias = normalizeForMatch(alias);
        return normKw === normAlias || normKw.includes(normAlias) || normAlias.includes(normKw);
      })
    );

    interface SuggestMovieItem {
      slug?: string;
      name?: string;
      title?: string;
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
      limit: 6,
    });
    const rawItems = ((res?.items || []) as SuggestMovieItem[]);

    const items = rawItems.slice(0, 5).map((item) => ({
      slug: item.slug || "",
      title: item.name || item.title || "",
      poster: item.poster_url || item.thumb_url || "/default-hero.jpg",
      year: item.year || "",
      quality: item.quality || "HD",
      category: item.category?.[0]?.name || item.type || "",
    }));

    // 3. Nếu khớp diễn viên, gắn thẻ đề xuất diễn viên lên đầu danh sách
    if (matchedActor) {
      items.unshift({
        slug: `browse?keyword=${encodeURIComponent(matchedActor.name)}`,
        title: `✨ Tuyển tập phim của ${matchedActor.name}`,
        poster: "/default-hero.jpg",
        year: matchedActor.country || "Tuyển Chọn",
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
