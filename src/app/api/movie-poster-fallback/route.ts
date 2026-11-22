import { NextRequest, NextResponse } from "next/server";
import { movieApi } from "@/services/movies/service";
import { getTmdbPosterUrl, searchTmdbPosterByTitle, getTmdbMediaImagesById } from "@/services/tmdbService";
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

export interface FallbackItemParams {
  tmdbId?: string | number;
  title?: string;
  origin_name?: string;
  year?: string | number;
  slug?: string;
  type?: string;
}

export interface ParsedItemKeys {
  cacheKey: string;
  redisPosterKey: string;
  slugCleanKey: string;
  tmdbId: string;
  title: string;
  origin_name: string;
  year: string;
  slug: string;
  type: string;
}

export function parseItemKeys(params: FallbackItemParams): ParsedItemKeys {
  const tmdbId = params.tmdbId ? String(params.tmdbId).trim() : "";
  const title = params.title?.trim() || "";
  const origin_name = params.origin_name?.trim() || "";
  const year = params.year ? String(params.year).trim() : "";
  const slug = params.slug?.trim() || "";
  const type = params.type?.trim() || "movie";

  const cacheKey = tmdbId
    ? `v3:tmdb:${tmdbId}:${type}`
    : `v3:${slug || title}|${origin_name}|${year}|${type}`.toLowerCase();
  const cleanKey = cacheKey.replace(/[^a-z0-9_]/g, "_").slice(0, 100);
  const redisPosterKey = `tmdb:fallback_poster:v2:${cleanKey}`;
  const slugCleanKey = slug
    ? `tmdb:fallback_poster:v2:${slug.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 100)}`
    : "";

  return {
    cacheKey,
    redisPosterKey,
    slugCleanKey,
    tmdbId,
    title,
    origin_name,
    year,
    slug,
    type,
  };
}

const CACHE_HEADERS_HIT = {
  "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
  "CDN-Cache-Control": "public, max-age=604800, stale-while-revalidate=86400",
  "Vercel-CDN-Cache-Control": "public, max-age=604800, stale-while-revalidate=86400",
};

const CACHE_HEADERS_MISS = {
  "Cache-Control": "public, max-age=3600, s-maxage=86400",
  "CDN-Cache-Control": "public, max-age=86400",
  "Vercel-CDN-Cache-Control": "public, max-age=86400",
};

async function resolvePosterFromUpstream(
  keys: ParsedItemKeys
): Promise<{ posterUrl: string | null; backdropUrl: string | null }> {
  const { tmdbId, title, origin_name, year, slug, type } = keys;
  let result: { posterUrl: string | null; backdropUrl: string | null } | null = null;

  const isVietnamese =
    /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(title || "") ||
    /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(origin_name || "");

  // 1. Tra cứu trực tiếp theo TMDB ID nếu có (siêu nhanh ~20ms, chính xác 100%)
  if (tmdbId) {
    try {
      const direct = await getTmdbMediaImagesById(tmdbId, type);
      if (direct?.posterUrl || direct?.backdropUrl) {
        result = direct;
      }
    } catch {}
  }

  // 2. Tra cứu theo tên phim / origin_name / slug
  if (!result) {
    const queryOrder = isVietnamese
      ? ([title, slug ? slug.replace(/-/g, " ") : null, origin_name && origin_name !== title ? origin_name : null].filter(Boolean) as string[])
      : ([origin_name && origin_name !== title ? origin_name : null, title, slug ? slug.replace(/-/g, " ") : null].filter(Boolean) as string[]);

    const candidateLookups = queryOrder.map((q) =>
      queryTmdbPoster(q, year, undefined).catch(() => null)
    );
    const candidateResults = await Promise.race([
      Promise.all(candidateLookups),
      new Promise<never[]>((resolve) => setTimeout(() => resolve([]), 1500)),
    ]);
    result = candidateResults.find((r) => r && (r.posterUrl || r.backdropUrl)) || null;
  }

  // 3. Fallback tra cứu chi tiết phim từ slug: Tận dụng tmdb.id và origin_name
  if (!result && slug) {
    try {
      const detail = await movieApi.getMovieDetail(slug);
      if (detail?.movie) {
        const m = detail.movie;
        if (m.tmdb?.id) {
          const tmdbType = m.tmdb.type || (m.type === "series" ? "tv" : "movie");
          let tmdbPoster = await getTmdbPosterUrl(m.tmdb.id, tmdbType);
          if (!tmdbPoster) {
            const altType = tmdbType === "tv" ? "movie" : "tv";
            tmdbPoster = await getTmdbPosterUrl(m.tmdb.id, altType);
          }
          if (tmdbPoster) {
            result = {
              posterUrl: tmdbPoster,
              backdropUrl: tmdbPoster,
            };
          }
        }

        if (!result) {
          const altName = isVietnamese
            ? (m.name || (m.slug ? m.slug.replace(/-/g, " ") : null))
            : (m.origin_name && m.origin_name !== m.name ? m.origin_name : (m.name || m.slug));
          if (altName) {
            const res = await searchTmdbPosterByTitle(
              altName,
              m.year || year,
              m.type || type,
              undefined,
              undefined
            );
            if (res?.posterUrl || res?.backdropUrl) {
              result = res;
            }
          }
        }
      }
    } catch {}
  }

  // 4. Fallback searchMovies
  if (!result && title) {
    try {
      const searchRes = await movieApi.searchMovies(title, 2);
      const first = searchRes?.items?.[0];
      if (first) {
        if (first.tmdb?.id) {
          const tmdbType = first.tmdb.type || (first.type === "series" ? "tv" : "movie");
          let tmdbPoster = await getTmdbPosterUrl(first.tmdb.id, tmdbType);
          if (!tmdbPoster) {
            const altType = tmdbType === "tv" ? "movie" : "tv";
            tmdbPoster = await getTmdbPosterUrl(first.tmdb.id, altType);
          }
          if (tmdbPoster) {
            result = {
              posterUrl: tmdbPoster,
              backdropUrl: tmdbPoster,
            };
          }
        }
        if (!result && first.origin_name) {
          const res = await searchTmdbPosterByTitle(
            first.origin_name,
            first.year || year,
            first.type || type,
            undefined,
            undefined
          );
          if (res?.posterUrl || res?.backdropUrl) {
            result = res;
          }
        }
      }
    } catch {}
  }

  // 5. Dự phòng cho Hoạt hình / Anime / Donghua qua AniList GraphQL
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
  const now = Date.now();

  const cacheEntry: PosterCacheEntry = {
    posterUrl: finalPosterUrl,
    backdropUrl: finalBackdropUrl,
    expireAt: now + MEMORY_TTL,
  };

  // Lưu vào L1 RAM
  setBoundedMap(posterMemoryCache, keys.cacheKey, cacheEntry);

  // Lưu vào L2 Upstash Redis DB 3 (TTL: 14 ngày nếu có ảnh, 24h nếu miss)
  const redisTtlSeconds = hasPoster ? 14 * 86400 : 86400;
  cacheService.set(keys.redisPosterKey, cacheEntry, redisTtlSeconds).catch(() => {});
  if (keys.slugCleanKey && keys.slugCleanKey !== keys.redisPosterKey) {
    cacheService.set(keys.slugCleanKey, cacheEntry, redisTtlSeconds).catch(() => {});
  }

  return { posterUrl: finalPosterUrl, backdropUrl: finalBackdropUrl };
}

/**
 * GET: Tra cứu 1 phim đơn lẻ (hỗ trợ tương thích ngược toàn diện).
 */
export async function GET(req: NextRequest) {
  const rateLimit = await enforceRateLimit(req, RATE_LIMIT_PRESETS.POSTER_FALLBACK_IN_MEMORY);
  if (!rateLimit.allowed) {
    return buildRateLimitResponse(rateLimit);
  }

  const { searchParams } = req.nextUrl;
  const tmdbId = searchParams.get("tmdb_id")?.trim() || searchParams.get("tmdbId")?.trim() || "";
  const title = searchParams.get("title")?.trim() || "";
  const origin_name = searchParams.get("origin_name")?.trim() || "";
  const year = searchParams.get("year")?.trim() || "";
  const slug = searchParams.get("slug")?.trim() || "";
  const type = searchParams.get("type")?.trim() || "movie";

  if (!title && !origin_name && !slug && !tmdbId) {
    return NextResponse.json({ status: false, error: "Missing query parameters" }, { status: 400 });
  }

  const keys = parseItemKeys({ tmdbId, title, origin_name, year, slug, type });
  const now = Date.now();

  // 1. Kiểm tra L1 RAM cache
  const cached = posterMemoryCache.get(keys.cacheKey);
  if (cached && cached.expireAt > now) {
    const hasPoster = Boolean(cached.posterUrl || cached.backdropUrl);
    return NextResponse.json(
      {
        status: true,
        posterUrl: cached.posterUrl,
        backdropUrl: cached.backdropUrl,
        source: "l1-cache",
      },
      { headers: hasPoster ? CACHE_HEADERS_HIT : CACHE_HEADERS_MISS }
    );
  }

  // 2. Kiểm tra L2 Upstash Redis
  try {
    const redisCached = await cacheService.get<PosterCacheEntry>(keys.redisPosterKey);
    if (redisCached) {
      setBoundedMap(posterMemoryCache, keys.cacheKey, {
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
        { headers: hasPoster ? CACHE_HEADERS_HIT : CACHE_HEADERS_MISS }
      );
    }
  } catch {}

  // 3. Tra cứu trực tiếp từ upstream TMDb / AniList
  const resolved = await resolvePosterFromUpstream(keys);
  const hasPoster = Boolean(resolved.posterUrl || resolved.backdropUrl);

  return NextResponse.json(
    {
      status: true,
      posterUrl: resolved.posterUrl,
      backdropUrl: resolved.backdropUrl,
      source: "tmdb",
    },
    { headers: hasPoster ? CACHE_HEADERS_HIT : CACHE_HEADERS_MISS }
  );
}

/**
 * POST: Gom Batch Tra Cứu Toàn Bộ Phim Trong 1 Request Duy Nhất
 * - Tiết kiệm 95% Vercel Serverless Function Invocations (1 call thay vì 24 calls).
 * - Dùng 1 lệnh `cacheService.mget` duy nhất thay vì hàng chục lệnh Redis riêng lẻ.
 * - Tuyệt đối không upload ảnh vào R2 Bucket.
 */
export async function POST(req: NextRequest) {
  const rateLimit = await enforceRateLimit(req, RATE_LIMIT_PRESETS.POSTER_FALLBACK_IN_MEMORY);
  if (!rateLimit.allowed) {
    return buildRateLimitResponse(rateLimit);
  }

  let body: { items?: FallbackItemParams[] } | null = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ status: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const rawItems = Array.isArray(body?.items) ? body.items : [];
  if (rawItems.length === 0) {
    return NextResponse.json({ status: false, error: "No items provided" }, { status: 400 });
  }

  // Giới hạn tối đa 32 phim / batch để đảm bảo hoàn thành nhanh gọn trong 2-3s
  const items = rawItems.slice(0, 32);
  const now = Date.now();
  const results: Record<string, { posterUrl: string | null; backdropUrl: string | null; source: string }> = {};

  const redisLookupList: Array<{ item: FallbackItemParams; keys: ParsedItemKeys }> = [];
  const redisKeys: string[] = [];

  // TẦNG 1: L1 RAM Cache O(1)
  for (const it of items) {
    const keys = parseItemKeys(it);
    const cached = posterMemoryCache.get(keys.cacheKey);
    if (cached && cached.expireAt > now) {
      results[keys.cacheKey] = {
        posterUrl: cached.posterUrl,
        backdropUrl: cached.backdropUrl,
        source: "l1-cache",
      };
    } else {
      redisLookupList.push({ item: it, keys });
      if (!redisKeys.includes(keys.redisPosterKey)) {
        redisKeys.push(keys.redisPosterKey);
      }
    }
  }

  // TẦNG 2: 1 Lệnh Redis `mget` Duy Nhất Cho Toàn Bộ Phim Còn Lại
  const pendingUpstreamList: Array<{ item: FallbackItemParams; keys: ParsedItemKeys }> = [];

  if (redisLookupList.length > 0 && redisKeys.length > 0) {
    try {
      const redisHits = await Promise.race([
        cacheService.mget<PosterCacheEntry>(redisKeys),
        new Promise<null[]>((resolve) => setTimeout(() => resolve(new Array(redisKeys.length).fill(null)), 250)),
      ]);

      const redisHitMap = new Map<string, PosterCacheEntry>();
      if (Array.isArray(redisHits)) {
        for (let i = 0; i < redisKeys.length; i++) {
          const val = redisHits[i];
          if (val && typeof val === "object") {
            redisHitMap.set(redisKeys[i], val);
          }
        }
      }

      for (const entry of redisLookupList) {
        const hit = redisHitMap.get(entry.keys.redisPosterKey);
        if (hit) {
          setBoundedMap(posterMemoryCache, entry.keys.cacheKey, {
            posterUrl: hit.posterUrl,
            backdropUrl: hit.backdropUrl,
            expireAt: now + MEMORY_TTL,
          });
          results[entry.keys.cacheKey] = {
            posterUrl: hit.posterUrl,
            backdropUrl: hit.backdropUrl,
            source: "l2-redis",
          };
        } else {
          pendingUpstreamList.push(entry);
        }
      }
    } catch {
      pendingUpstreamList.push(...redisLookupList);
    }
  }

  // TẦNG 3: Tra cứu trực tiếp Upstream TMDb / AniList cho các phim còn thiếu (giới hạn tối đa 6 phim song song)
  if (pendingUpstreamList.length > 0) {
    const toResolve = pendingUpstreamList.slice(0, 6);
    await Promise.allSettled(
      toResolve.map(async ({ keys }) => {
        const resolved = await resolvePosterFromUpstream(keys);
        results[keys.cacheKey] = {
          posterUrl: resolved.posterUrl,
          backdropUrl: resolved.backdropUrl,
          source: "tmdb",
        };
      })
    );
  }

  return NextResponse.json(
    {
      status: true,
      results,
    },
    { headers: CACHE_HEADERS_HIT }
  );
}
