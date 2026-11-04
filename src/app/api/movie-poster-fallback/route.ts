import { NextRequest, NextResponse } from "next/server";
import { movieApi } from "@/services/movies/service";
import { pickBestMoviePoster, pickBestMovieThumb } from "@/lib/movieMedia";
import { getTmdbPosterUrl, searchTmdbPosterByTitle } from "@/services/tmdbService";
import { searchAniListPoster } from "@/services/aniListService";
import {
  enforceRateLimit,
  buildRateLimitResponse,
  RATE_LIMIT_PRESETS,
} from "@/lib/rateLimit";

export const runtime = "nodejs";

const TMDB_API_KEY =
  process.env.TMDB_API_KEY ||
  process.env.NEXT_PUBLIC_TMDB_API_KEY ||
  "3fd2be6f0c70a2a598f084ddfb75487c";

// In-memory L1 cache (24h)
interface PosterCacheEntry {
  posterUrl: string | null;
  backdropUrl: string | null;
  expireAt: number;
}
const posterMemoryCache = new Map<string, PosterCacheEntry>();
const MEMORY_TTL = 24 * 60 * 60 * 1000;

function setBoundedMap<K, V>(map: Map<K, V>, key: K, value: V, maxSize = 2000): void {
  if (map.size >= maxSize) {
    const firstKey = map.keys().next().value;
    if (firstKey !== undefined) {
      map.delete(firstKey);
    }
  }
  map.set(key, value);
}

function getSearchVariants(text: string): string[] {
  if (!text) return [];
  const res: string[] = [];
  const add = (s: string) => {
    const trimmed = (s || "").trim();
    if (trimmed.length >= 2 && !res.includes(trimmed)) res.push(trimmed);
  };
  add(text);
  const noSeason = text
    .replace(/\((?:Phần|Season|SS|Part)\s*\d+[^)]*\)/gi, "")
    .replace(/(?:Phần|Season|SS|Part)\s*\d+/gi, "")
    .replace(/\[[^\]]*\]/g, "")
    .trim();
  add(noSeason);

  const matches = text.match(/\(([^)]+)\)/g);
  if (matches) {
    for (const m of matches) {
      const inside = m.slice(1, -1).trim();
      if (!/^(Phần|Season|SS|Part)\s*\d+/i.test(inside)) {
        add(inside);
      }
    }
  }

  const noParens = text.replace(/\([^)]*\)/g, "").trim();
  add(noParens);

  return res;
}

interface TmdbCandidate {
  poster_path?: string;
  backdrop_path?: string;
  release_date?: string;
  first_air_date?: string;
  vote_count?: number;
  popularity?: number;
  [key: string]: unknown;
}

function pickBestTmdbCandidate(results: TmdbCandidate[], targetYear?: string): TmdbCandidate | null {
  if (!Array.isArray(results) || results.length === 0) return null;

  const valid = results.filter((r) => r && (r.poster_path || r.backdrop_path));
  if (valid.length === 0) return results[0] || null;

  const parsedYear = targetYear ? parseInt(String(targetYear).trim(), 10) : null;

  const scored = valid.map((r) => {
    let score = 0;
    const relDate = r.release_date || r.first_air_date || "";
    if (parsedYear && relDate) {
      const itemYear = parseInt(relDate.slice(0, 4), 10);
      if (!isNaN(itemYear)) {
        const diff = Math.abs(itemYear - parsedYear);
        if (diff === 0) score += 80;
        else if (diff === 1) score += 40;
      }
    }

    if (r.poster_path) score += 30;
    score += Math.min(40, Math.log10((r.vote_count || 0) + 1) * 10);
    score += Math.min(20, (Number(r.popularity) || 0) / 10);

    return { item: r, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.item || valid[0];
}

async function queryTmdbPoster(query: string, year?: string): Promise<{ posterUrl: string | null; backdropUrl: string | null }> {
  if (!query || query.trim().length < 2) {
    return { posterUrl: null, backdropUrl: null };
  }

  const variants = getSearchVariants(query);
  const yearParam = year && /^\d{4}$/.test(year.trim()) ? `&year=${year.trim()}` : "";

  for (const v of variants) {
    // 1. Thử search/multi trước (hỗ trợ cả movie và tv series, anime, chấm điểm theo năm và độ phổ biến)
    try {
      const urlMulti = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(v)}${yearParam}`;
      const res = await fetch(urlMulti, {
        signal: AbortSignal.timeout(3000),
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        const best = pickBestTmdbCandidate(data.results, year);
        if (best?.poster_path || best?.backdrop_path) {
          return {
            posterUrl: best.poster_path ? `https://image.tmdb.org/t/p/w500${best.poster_path}` : null,
            backdropUrl: best.backdrop_path ? `https://image.tmdb.org/t/p/w1280${best.backdrop_path}` : null,
          };
        }
      }
    } catch {}

    // 2. Thử search/tv riêng nếu multi chưa ra kết quả
    try {
      const urlTv = `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(v)}`;
      const resTv = await fetch(urlTv, {
        signal: AbortSignal.timeout(3000),
        headers: { Accept: "application/json" },
      });
      if (resTv.ok) {
        const dataTv = await resTv.json();
        const bestTv = pickBestTmdbCandidate(dataTv.results, year);
        if (bestTv?.poster_path || bestTv?.backdrop_path) {
          return {
            posterUrl: bestTv.poster_path ? `https://image.tmdb.org/t/p/w500${bestTv.poster_path}` : null,
            backdropUrl: bestTv.backdrop_path ? `https://image.tmdb.org/t/p/w1280${bestTv.backdrop_path}` : null,
          };
        }
      }
    } catch {}
  }

  return { posterUrl: null, backdropUrl: null };
}

export async function GET(req: NextRequest) {
  const rateLimit = await enforceRateLimit(req, RATE_LIMIT_PRESETS.POSTER_FALLBACK_IN_MEMORY);
  if (!rateLimit.allowed) {
    return buildRateLimitResponse(rateLimit);
  }

  const { searchParams } = req.nextUrl;
  const title = searchParams.get("title")?.trim() || "";
  const origin_name = searchParams.get("origin_name")?.trim() || "";
  const year = searchParams.get("year")?.trim() || "";
  const slug = searchParams.get("slug")?.trim() || "";

  if (!title && !origin_name && !slug) {
    return NextResponse.json({ status: false, error: "Missing query parameters" }, { status: 400 });
  }

  const cacheKey = `${slug || title}|${origin_name}|${year}`.toLowerCase();
  const now = Date.now();

  // 1. Kiểm tra L1 RAM cache
  const cached = posterMemoryCache.get(cacheKey);
  if (cached && cached.expireAt > now) {
    const hasPoster = Boolean(cached.posterUrl || cached.backdropUrl);
    return NextResponse.json(
      {
        status: true,
        posterUrl: cached.posterUrl,
        backdropUrl: cached.backdropUrl,
        source: "l1-cache",
      },
      {
        headers: {
          "Cache-Control": hasPoster
            ? "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400"
            : "public, max-age=3600, s-maxage=86400",
        },
      }
    );
  }

  // 2. Không truy vấn Redis Upstash, tự tìm kiếm fallback trực tiếp và lưu RAM + CDN
  let result: { posterUrl: string | null; backdropUrl: string | null } | null = null;

  // 1. Ưu tiên tìm theo tên gốc tiếng Anh/quốc tế trước (tỷ lệ match TMDB chuẩn xác 98%)
  if (origin_name && origin_name !== title) {
    const res = await queryTmdbPoster(origin_name, year);
    if (res.posterUrl || res.backdropUrl) result = res;
  }

  // 2. Thử tìm theo tên tiếng Việt
  if (!result && title) {
    const res = await queryTmdbPoster(title, year);
    if (res.posterUrl || res.backdropUrl) result = res;
  }

  // 3. Thử tìm theo slug được chuẩn hóa thành từ khóa
  if (!result && slug) {
    const slugQuery = slug.replace(/-/g, " ");
    const res = await queryTmdbPoster(slugQuery, year);
    if (res.posterUrl || res.backdropUrl) result = res;
  }

  // 4. Fallback tra cứu chi tiết phim từ slug: Tận dụng tmdb.id và origin_name của phim
  if (!result && slug) {
    try {
      const detail = await movieApi.getMovieDetail(slug);
      if (detail?.movie) {
        const m = detail.movie;
        // 4a. Nếu upstream có gắn tmdb.id, lấy trực tiếp ảnh TMDb chuẩn xác 100%
        if (m.tmdb?.id) {
          const tmdbPoster = await getTmdbPosterUrl(m.tmdb.id, m.type);
          if (tmdbPoster) {
            result = {
              posterUrl: tmdbPoster,
              backdropUrl: tmdbPoster,
            };
          }
        }

        // 4b. Tìm theo tên gốc quốc tế của phim (vd: Otis, Ultraman Tiga, A Melody to Remember)
        if (!result) {
          const altName = m.origin_name && m.origin_name !== m.name ? m.origin_name : (m.name || m.slug);
          if (altName) {
            const res = await searchTmdbPosterByTitle(altName, m.year || year, m.type);
            if (res?.posterUrl || res?.backdropUrl) {
              result = res;
            }
          }
        }

        // 4c. Cuối cùng mới lấy poster/thumb gốc
        if (!result) {
          const p = pickBestMoviePoster(m, "");
          const t = pickBestMovieThumb(m, "");
          if (p || t) {
            result = {
              posterUrl: p || t || null,
              backdropUrl: t || p || null,
            };
          }
        }
      }
    } catch {}
  }

  if (!result && title) {
    try {
      const searchRes = await movieApi.searchMovies(title, 2);
      const first = searchRes?.items?.[0];
      if (first) {
        if (first.tmdb?.id) {
          const tmdbPoster = await getTmdbPosterUrl(first.tmdb.id, first.type);
          if (tmdbPoster) {
            result = {
              posterUrl: tmdbPoster,
              backdropUrl: tmdbPoster,
            };
          }
        }
        if (!result && first.origin_name) {
          const res = await searchTmdbPosterByTitle(first.origin_name, first.year || year, first.type);
          if (res?.posterUrl || res?.backdropUrl) {
            result = res;
          }
        }
        if (!result) {
          const p = pickBestMoviePoster(first, "");
          const t = pickBestMovieThumb(first, "");
          if (p || t) {
            result = {
              posterUrl: p || t || null,
              backdropUrl: t || p || null,
            };
          }
        }
      }
    } catch {}
  }

  // TẦNG 2: Dự phòng cho Hoạt hình / Anime / Donghua qua AniList GraphQL
  if (!result && (title || origin_name)) {
    try {
      const aniRes = await searchAniListPoster(title, origin_name);
      if (aniRes?.posterUrl || aniRes?.backdropUrl) {
        result = aniRes;
      }
    } catch {}
  }

  const finalPosterUrl = result?.posterUrl || null;
  const finalBackdropUrl = result?.backdropUrl || null;

  // Lưu vào bounded L1 RAM
  setBoundedMap(posterMemoryCache, cacheKey, {
    posterUrl: finalPosterUrl,
    backdropUrl: finalBackdropUrl,
    expireAt: now + MEMORY_TTL,
  });

  const hasPoster = Boolean(finalPosterUrl || finalBackdropUrl);
  return NextResponse.json(
    {
      status: true,
      posterUrl: finalPosterUrl,
      backdropUrl: finalBackdropUrl,
      source: "tmdb",
    },
    {
      headers: {
        "Cache-Control": hasPoster
          ? "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400"
          : "public, max-age=3600, s-maxage=86400",
      },
    }
  );
}
