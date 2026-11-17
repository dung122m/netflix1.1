import { NextRequest, NextResponse } from "next/server";
import { movieApi } from "@/services/movies/service";
import { pickBestMoviePoster, pickBestMovieThumb } from "@/lib/movieMedia";
import { getTmdbPosterUrl, searchTmdbPosterByTitle } from "@/services/tmdbService";
import { searchAniListPoster } from "@/services/aniListService";
import { cacheService } from "@/lib/cache";
import {
  enforceRateLimit,
  buildRateLimitResponse,
  RATE_LIMIT_PRESETS,
} from "@/lib/rateLimit";

export const runtime = "nodejs";

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

async function queryTmdbPoster(
  query: string,
  year?: string,
  expectedCountry?: string
): Promise<{ posterUrl: string | null; backdropUrl: string | null }> {
  if (!query || query.trim().length < 2) {
    return { posterUrl: null, backdropUrl: null };
  }
  return searchTmdbPosterByTitle(query, year, "movie", undefined, expectedCountry);
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

  // 1.5 Kiểm tra L2 Upstash Redis Cache (DB 3: Aux / TMDb - tmdb:fallback_poster:v2:*)
  const cleanKey = cacheKey.replace(/[^a-z0-9_]/g, "_").slice(0, 100);
  const redisPosterKey = `tmdb:fallback_poster:v2:${cleanKey}`;
  try {
    const redisCached = await cacheService.get<PosterCacheEntry>(redisPosterKey);
    if (redisCached) {
      setBoundedMap(posterMemoryCache, cacheKey, {
        posterUrl: redisCached.posterUrl,
        backdropUrl: redisCached.backdropUrl,
        expireAt: now + MEMORY_TTL,
      });
      const hasPoster = Boolean(redisCached.posterUrl || redisCached.backdropUrl);
      return NextResponse.json(
        {
          status: true,
          posterUrl: redisCached.posterUrl,
          backdropUrl: redisCached.backdropUrl,
          source: "l2-redis",
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
  } catch {}

  // 2. Tra cứu fallback trực tiếp nếu cả RAM và Redis đều chưa có
  let result: { posterUrl: string | null; backdropUrl: string | null } | null = null;

  const isVietnamese =
    /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(title || "") ||
    /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(origin_name || "");

  // Đối với phim Việt Nam: Luôn ưu tiên tên tiếng Việt và slug trước,
  // tuyệt đối không ưu tiên origin_name dịch nghĩa tiếng Anh (vd: "Hamlet" cho "Xóm Nhỏ")
  const queryOrder = isVietnamese
    ? ([title, slug ? slug.replace(/-/g, " ") : null, origin_name && origin_name !== title ? origin_name : null].filter(Boolean) as string[])
    : ([origin_name && origin_name !== title ? origin_name : null, title, slug ? slug.replace(/-/g, " ") : null].filter(Boolean) as string[]);

  for (const q of queryOrder) {
    if (result) break;
    const res = await queryTmdbPoster(q, year, isVietnamese ? "VN" : undefined);
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
  const hasPoster = Boolean(finalPosterUrl || finalBackdropUrl);

  const cacheEntry: PosterCacheEntry = {
    posterUrl: finalPosterUrl,
    backdropUrl: finalBackdropUrl,
    expireAt: now + MEMORY_TTL,
  };

  // Lưu vào bounded L1 RAM
  setBoundedMap(posterMemoryCache, cacheKey, cacheEntry);

  // Lưu vào L2 Upstash Redis DB 3 (Aux / TMDb - tmdb:fallback_poster:*)
  // TTL: 14 ngày nếu có ảnh, 24 giờ nếu không tìm thấy
  const redisTtlSeconds = hasPoster ? 14 * 86400 : 86400;
  cacheService.set(redisPosterKey, cacheEntry, redisTtlSeconds).catch(() => {});
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
