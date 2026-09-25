import { NextRequest, NextResponse } from "next/server";
import { movieApi } from "@/services/movieApi";
import { cleanHtmlText } from "@/lib/cleanHtml";
import { pickHeroBackdropImage, pickBestMoviePoster, pickBestMovieThumb } from "@/lib/movieMedia";
import { getTmdbBackdropUrl } from "@/services/tmdbService";

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
  backdrop_url?: string;
  poster_url?: string;
  thumb_url?: string;
}

// Bộ nhớ đệm RAM trên server cho các yêu cầu tóm tắt và thông tin chi tiết phim (giới hạn tối đa 500 mục)
const serverSynopsisCache = new Map<string, SynopsisDetailPayload>();
const inFlightServerRequests = new Map<string, Promise<SynopsisDetailPayload | null>>();
const MAX_SYNOPSIS_CACHE = 500;

function setBoundedSynopsisCache(slug: string, payload: SynopsisDetailPayload) {
  if (serverSynopsisCache.size >= MAX_SYNOPSIS_CACHE) {
    const oldestKey = serverSynopsisCache.keys().next().value;
    if (oldestKey !== undefined) {
      serverSynopsisCache.delete(oldestKey);
    }
  }
  serverSynopsisCache.set(slug, payload);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.json(
      { error: "Thiếu tham số slug phim" },
      { status: 400 }
    );
  }

  // 1. Kiểm tra RAM Cache Server (0ms Response)
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

  // 1.5 Kiểm tra in-flight Promise trên server để không gọi trùng đồng thời
  if (inFlightServerRequests.has(slug)) {
    const inFlightPayload = await inFlightServerRequests.get(slug);
    if (inFlightPayload) {
      return NextResponse.json(
        { slug, ...inFlightPayload },
        {
          headers: {
            "Cache-Control":
              "public, s-maxage=86400, stale-while-revalidate=86400",
          },
        }
      );
    }
  }

  const promise = (async (): Promise<SynopsisDetailPayload | null> => {
    try {
      // 2. Lấy dữ liệu chi tiết phim
      const data = await movieApi.getMovieDetail(slug);
      const movie = data?.movie;
      const rawContent = movie?.content || movie?.description || "";
      const originName = movie?.origin_name || "";
      const trailerUrl = movie?.trailer_url || "";

      // Làm sạch toàn bộ thẻ HTML và giải mã các thực thể HTML (&nbsp;, &amp;, &quot;...)
      const cleanContent = cleanHtmlText(rawContent);

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

      let backdropUrl = "";
      if (movie?.tmdb?.id) {
        try {
          backdropUrl = (await getTmdbBackdropUrl(movie.tmdb.id, movie.tmdb.type)) || "";
        } catch {
          // Fallback
        }
      }
      if (!backdropUrl && movie) {
        backdropUrl = pickHeroBackdropImage(movie);
      }
      const posterUrl = movie ? pickBestMoviePoster(movie) : "";
      const thumbUrl = movie ? pickBestMovieThumb(movie) : "";

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
        backdrop_url: backdropUrl,
        poster_url: posterUrl,
        thumb_url: thumbUrl,
      };

      // Lưu vào RAM cache (bounded FIFO)
      setBoundedSynopsisCache(slug, payload);
      return payload;
    } catch (err) {
      console.error("Lỗi lấy tóm tắt phim:", slug, err);
      return null;
    }
  })();

  inFlightServerRequests.set(slug, promise);

  try {
    const payload = await promise;
    if (payload) {
      return NextResponse.json(
        { slug, ...payload },
        {
          headers: {
            "Cache-Control":
              "public, s-maxage=86400, stale-while-revalidate=86400",
          },
        }
      );
    }
    return NextResponse.json(
      { slug, content: "", origin_name: "", actor: [], director: [] },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=300",
        },
      }
    );
  } finally {
    inFlightServerRequests.delete(slug);
  }
}
