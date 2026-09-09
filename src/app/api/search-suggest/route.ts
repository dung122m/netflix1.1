import { NextRequest, NextResponse } from "next/server";
import { movieApi } from "@/services/movieApi";
import { resolveActorMovies, fetchMoviesByTitles } from "@/services/aiActorService";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const keyword = searchParams.get("keyword")?.trim() || "";

    if (!keyword || keyword.length < 2) {
      return NextResponse.json({ items: [] });
    }

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

    let rawItems: SuggestMovieItem[] = [];

    // 1. Kiểm tra xem từ khóa có phải tên diễn viên không
    const actorInfo = await resolveActorMovies(keyword);
    if (actorInfo.isActor && actorInfo.titles.length > 0) {
      const actorMovies = (await fetchMoviesByTitles(actorInfo.titles.slice(0, 5), 5)) as SuggestMovieItem[];
      if (actorMovies.length > 0) {
        rawItems = actorMovies;
      }
    }

    // 2. Nếu không phải diễn viên hoặc không có phim diễn viên, tìm kiếm theo tiêu đề thông thường
    if (rawItems.length === 0) {
      const res = await movieApi.getMovies({
        keyword,
        page: 1,
        limit: 6,
      });
      rawItems = ((res?.items || []) as SuggestMovieItem[]);
    }

    const items = rawItems.slice(0, 5).map((item) => ({
      slug: item.slug || "",
      title: item.name || item.title || "",
      poster: item.poster_url || item.thumb_url || "/default-hero.jpg",
      year: item.year || "",
      quality: item.quality || "HD",
      category: item.category?.[0]?.name || item.type || "",
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Lỗi tìm kiếm gợi ý:", error);
    return NextResponse.json({ items: [] });
  }
}
