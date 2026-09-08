import { NextResponse } from "next/server";
import { movieApi } from "@/services/movieApi";
import { normalizeMovie } from "@/lib/movieMedia";

export async function GET() {
  try {
    // Lấy ngẫu nhiên từ trang 1 đến trang 4 của danh sách phim
    const randomPage = Math.floor(Math.random() * 4) + 1;
    const res = await movieApi.getMovies({ page: randomPage, limit: 24 });
    const items = res?.items || [];

    if (items.length > 0) {
      // Xáo trộn ngẫu nhiên danh sách (Fisher-Yates)
      const shuffled = [...items].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 3).map((m) => {
        const norm = normalizeMovie(m);
        return {
          slug: norm.slug,
          title: norm.title,
          imageUrl: norm.imageUrl,
          year: norm.year,
          rating: norm.score,
          genre: norm.genre,
          quality: norm.quality,
          time: norm.time,
          description: norm.description,
        };
      });

      const primary = selected[0] || { slug: "squid-game", title: "Trò Chơi Con Mực" };

      return NextResponse.json({
        slug: primary.slug,
        title: primary.title,
        movies: selected,
      });
    }

    return NextResponse.json({
      slug: "squid-game",
      title: "Trò Chơi Con Mực",
      movies: [],
    });
  } catch (error) {
    console.error("Lỗi lấy phim ngẫu nhiên:", error);
    return NextResponse.json(
      { slug: "squid-game", title: "Trò Chơi Con Mực", movies: [] },
      { status: 500 }
    );
  }
}

