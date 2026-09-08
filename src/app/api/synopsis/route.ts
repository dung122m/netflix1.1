import { NextRequest, NextResponse } from "next/server";
import { movieApi } from "@/services/movieApi";

export interface SynopsisDetailPayload {
  content: string;
  origin_name?: string;
  trailer_url?: string;
  actor?: string[];
  director?: string[];
  country?: string[];
  category?: string[];
  episode_current?: string;
  time?: string;
  year?: string | number;
}

// Bộ nhớ đệm RAM trên server cho các yêu cầu tóm tắt và thông tin chi tiết phim
const serverSynopsisCache = new Map<string, SynopsisDetailPayload>();

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.json(
      { error: "Tham số slug là bắt buộc" },
      { status: 400 }
    );
  }

  // 1. Kiểm tra cache RAM
  if (serverSynopsisCache.has(slug)) {
    const cached = serverSynopsisCache.get(slug)!;
    return NextResponse.json(
      { slug, ...cached },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=86400, stale-while-revalidate=86400",
        },
      }
    );
  }

  try {
    // 2. Lấy dữ liệu chi tiết phim
    const data = await movieApi.getMovieDetail(slug);
    const movie = data?.movie;
    const rawContent = movie?.content || "";
    const originName = movie?.origin_name || "";
    const trailerUrl = movie?.trailer_url || "";

    // Làm sạch thẻ HTML (<p>, <em>, <b>, <br>) thành văn bản thuần túy
    const cleanContent = String(rawContent)
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Bóc tách danh sách diễn viên (actor / casts)
    let actorList: string[] = [];
    if (Array.isArray(movie?.actor)) {
      actorList = movie.actor.map(String).map((s: string) => s.trim()).filter(Boolean);
    } else if (typeof movie?.actor === "string" && movie.actor) {
      actorList = movie.actor.split(",").map((s: string) => s.trim()).filter(Boolean);
    } else if (Array.isArray(movie?.casts)) {
      actorList = movie.casts.map(String).map((s: string) => s.trim()).filter(Boolean);
    }

    // Bóc tách đạo diễn
    let directorList: string[] = [];
    if (Array.isArray(movie?.director)) {
      directorList = movie.director.map(String).map((s: string) => s.trim()).filter(Boolean);
    } else if (typeof movie?.director === "string" && movie.director) {
      directorList = movie.director.split(",").map((s: string) => s.trim()).filter(Boolean);
    }

    // Bóc tách thể loại
    const categoryList: string[] = Array.isArray(movie?.category)
      ? movie.category.map((c: { name?: string }) => c.name || "").filter(Boolean)
      : typeof movie?.genre === "string"
      ? movie.genre.split(",").map((g: string) => g.trim()).filter(Boolean)
      : [];

    // Bóc tách quốc gia
    const countryList: string[] = Array.isArray(movie?.country)
      ? movie.country.map((c: { name?: string }) => c.name || "").filter(Boolean)
      : [];

    const payload: SynopsisDetailPayload = {
      content: cleanContent,
      origin_name: originName,
      trailer_url: trailerUrl,
      actor: actorList,
      director: directorList,
      country: countryList,
      category: categoryList,
      episode_current: movie?.episode_current || "",
      time: movie?.time || "",
      year: movie?.year || "",
    };

    // Lưu vào RAM cache
    serverSynopsisCache.set(slug, payload);

    return NextResponse.json(
      { slug, ...payload },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=86400, stale-while-revalidate=86400",
        },
      }
    );
  } catch (err) {
    console.error("Lỗi lấy tóm tắt phim:", slug, err);
    return NextResponse.json(
      { slug, content: "", origin_name: "", actor: [], director: [] },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=300",
        },
      }
    );
  }
}
