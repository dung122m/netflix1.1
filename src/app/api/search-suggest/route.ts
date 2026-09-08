import { NextRequest, NextResponse } from "next/server";
import { movieApi } from "@/services/movieApi";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const keyword = searchParams.get("keyword")?.trim() || "";

    if (!keyword || keyword.length < 2) {
      return NextResponse.json({ items: [] });
    }

    const res = await movieApi.getMovies({
      keyword,
      page: 1,
      limit: 6,
    });

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

    const items = ((res?.items || []) as SuggestMovieItem[]).slice(0, 5).map((item) => ({
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
