import { NextRequest, NextResponse } from "next/server";
import { movieApi } from "@/services/movies/service";
import { pickBestMoviePoster, pickBestMovieThumb } from "@/lib/movieMedia";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slugsParam = searchParams.get("slugs") || searchParams.get("slug") || "";
    const slugs = slugsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20); // Giới hạn tối đa 20 phim mỗi lượt

    if (slugs.length === 0) {
      return NextResponse.json({ success: true, movies: {} });
    }

    const results = await Promise.allSettled(
      slugs.map(async (slug) => {
        const detail = await movieApi.getMovieDetail(slug);
        if (!detail || !detail.movie) return null;
        const m = detail.movie;
        const title = m.name || m.title || slug;
        const poster = pickBestMoviePoster(m, "/default-poster.jpg");
        const thumb = pickBestMovieThumb(m, "/default-hero.jpg");
        const rawCats = Array.isArray(m.category)
          ? m.category
          : Array.isArray(m.categories)
          ? m.categories
          : [];
        const category =
          rawCats
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((c: any) => (typeof c === "string" ? c : c?.name || ""))
            .filter(Boolean)
            .join(", ") || "Phim Hay";

        return {
          slug,
          title,
          poster,
          thumb,
          year: m.year ? Number(m.year) : undefined,
          quality: m.quality || "HD",
          category,
          type: m.type,
        };
      })
    );

    const movies: Record<string, unknown> = {};
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) {
        movies[r.value.slug] = r.value;
      }
    }

    return NextResponse.json({ success: true, movies });
  } catch (err) {
    console.error("[api/movies/meta] Lỗi lấy metadata phim:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
