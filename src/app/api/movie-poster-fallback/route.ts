import { NextRequest, NextResponse } from "next/server";
import { searchTmdbPosterByTitle, getTmdbMediaImagesById, isCorruptedTmdbId } from "@/services/tmdbService";
import { cacheService } from "@/lib/cache";
import { setBoundedMap } from "@/lib/boundedMap";
import { runWithConcurrencyLimit } from "@/lib/asyncPool";
import {
  enforceRateLimit,
  buildRateLimitResponse,
  RATE_LIMIT_PRESETS,
} from "@/lib/rateLimit";

export const runtime = "nodejs";

interface PosterCacheEntry {
  posterUrl: string | null;
  backdropUrl: string | null;
  expireAt: number;
}

const posterMemoryCache = new Map<string, PosterCacheEntry>();
const inFlightPosterResolves = new Map<string, Promise<{ posterUrl: string | null; backdropUrl: string | null }>>();
const MEMORY_TTL = 24 * 60 * 60 * 1000;
const NEGATIVE_MEMORY_TTL = 30 * 60 * 1000;

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
  const redisPosterKey = `tmdb:fallback_poster:v3:${cleanKey}`;
  const slugCleanKey = slug
    ? `tmdb:fallback_poster:v3:${slug.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 100)}`
    : "";

  return { cacheKey, redisPosterKey, slugCleanKey, tmdbId, title, origin_name, year, slug, type };
}

const CACHE_HEADERS_HIT = {
  "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
  "CDN-Cache-Control": "public, max-age=604800, stale-while-revalidate=604800",
  "Vercel-CDN-Cache-Control": "public, max-age=604800, stale-while-revalidate=604800",
};

const CACHE_HEADERS_MISS = {
  "Cache-Control": "public, max-age=3600, s-maxage=86400",
  "CDN-Cache-Control": "public, max-age=86400",
  "Vercel-CDN-Cache-Control": "public, max-age=86400",
};

async function resolvePoster(keys: ParsedItemKeys): Promise<{ posterUrl: string | null; backdropUrl: string | null }> {
  const { tmdbId, title, origin_name, year, slug, type } = keys;

  if (tmdbId) {
    const movieIdentity = { name: title, origin_name, year, slug };
    if (!isCorruptedTmdbId(tmdbId, movieIdentity)) {
      try {
        const direct = await getTmdbMediaImagesById(tmdbId, type, undefined, movieIdentity);
        if (direct?.posterUrl || direct?.backdropUrl) return direct;
      } catch { }
    }
  }

  const cleanType = type === "tv" || type === "series" ? "tv" : "movie";
  const isDomesticVietnamese =
    /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(title || "");

  // Phim có tên tiếng Việt: Luôn ưu tiên tên tiếng Việt lên đầu để tránh trường hợp origin_name bị scraper dịch tự động (như Xóm Nhỏ -> Hamlet).
  // Phim quốc tế: Ưu tiên origin_name để tìm chuẩn xác trên TMDb quốc tế.
  const queries = isDomesticVietnamese
    ? [title, slug?.replace(/-/g, " "), origin_name]
    : [origin_name, title, slug?.replace(/-/g, " ")];

  const validQueries = queries.filter((q): q is string => Boolean(q && q.trim().length >= 2));

  for (const q of validQueries) {
    try {
      const res = await searchTmdbPosterByTitle(
        q,
        year || undefined,
        cleanType,
        undefined,
        isDomesticVietnamese ? "VN" : undefined
      );
      if (res?.posterUrl || res?.backdropUrl) return res;
    } catch { }
  }

  return { posterUrl: null, backdropUrl: null };
}

async function resolvePosterCoalesced(keys: ParsedItemKeys): Promise<{ posterUrl: string | null; backdropUrl: string | null }> {
  const existingFlight = inFlightPosterResolves.get(keys.cacheKey);
  if (existingFlight) return existingFlight;

  const task = resolvePoster(keys).finally(() => {
    inFlightPosterResolves.delete(keys.cacheKey);
  });
  inFlightPosterResolves.set(keys.cacheKey, task);
  return task;
}

function persistPosterToRedis(keys: ParsedItemKeys, resolved: { posterUrl: string | null; backdropUrl: string | null }): void {
  const ttl = resolved.posterUrl || resolved.backdropUrl ? 30 * 86400 : 1800;
  const payload = { posterUrl: resolved.posterUrl, backdropUrl: resolved.backdropUrl };
  cacheService.set(keys.redisPosterKey, payload, ttl).catch(() => {});
  if (keys.slugCleanKey && (resolved.posterUrl || resolved.backdropUrl)) {
    cacheService.set(keys.slugCleanKey, payload, ttl).catch(() => {});
  }
}

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

  const cached = posterMemoryCache.get(keys.cacheKey);
  if (cached && cached.expireAt > now) {
    return NextResponse.json(
      { status: true, posterUrl: cached.posterUrl, backdropUrl: cached.backdropUrl, source: "l1-cache" },
      { headers: cached.posterUrl || cached.backdropUrl ? CACHE_HEADERS_HIT : CACHE_HEADERS_MISS }
    );
  }

  const redisCached = await cacheService.get<{ posterUrl?: string | null; backdropUrl?: string | null }>(
    keys.redisPosterKey
  );
  if (redisCached && (redisCached.posterUrl !== undefined || redisCached.backdropUrl !== undefined)) {
    const posterUrl = redisCached.posterUrl ?? null;
    const backdropUrl = redisCached.backdropUrl ?? null;
    setBoundedMap(posterMemoryCache, keys.cacheKey, {
      posterUrl,
      backdropUrl,
      expireAt: now + (posterUrl || backdropUrl ? MEMORY_TTL : NEGATIVE_MEMORY_TTL),
    });
    return NextResponse.json(
      { status: true, posterUrl, backdropUrl, source: "redis-cache" },
      { headers: posterUrl || backdropUrl ? CACHE_HEADERS_HIT : CACHE_HEADERS_MISS }
    );
  }

  const resolved = await resolvePosterCoalesced(keys);
  const hasPoster = Boolean(resolved.posterUrl || resolved.backdropUrl);

  setBoundedMap(posterMemoryCache, keys.cacheKey, {
    posterUrl: resolved.posterUrl,
    backdropUrl: resolved.backdropUrl,
    expireAt: now + (hasPoster ? MEMORY_TTL : NEGATIVE_MEMORY_TTL),
  });
  persistPosterToRedis(keys, resolved);

  return NextResponse.json(
    { status: true, posterUrl: resolved.posterUrl, backdropUrl: resolved.backdropUrl, source: "tmdb" },
    { headers: hasPoster ? CACHE_HEADERS_HIT : CACHE_HEADERS_MISS }
  );
}

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

  const items = rawItems.slice(0, 24);
  const now = Date.now();
  const results: Record<string, { posterUrl: string | null; backdropUrl: string | null; source: string }> = {};
  const missingRedisChecks: Array<{ keys: ParsedItemKeys }> = [];

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
      missingRedisChecks.push({ keys });
    }
  }

  const needTmdbResolve: ParsedItemKeys[] = [];
  if (missingRedisChecks.length > 0) {
    const redisValues = await cacheService.mget<{ posterUrl?: string | null; backdropUrl?: string | null }>(
      missingRedisChecks.map((m) => m.keys.redisPosterKey)
    );
    missingRedisChecks.forEach((m, idx) => {
      const hit = redisValues[idx];
      if (hit && (hit.posterUrl !== undefined || hit.backdropUrl !== undefined)) {
        const posterUrl = hit.posterUrl ?? null;
        const backdropUrl = hit.backdropUrl ?? null;
        setBoundedMap(posterMemoryCache, m.keys.cacheKey, {
          posterUrl,
          backdropUrl,
          expireAt: now + (posterUrl || backdropUrl ? MEMORY_TTL : NEGATIVE_MEMORY_TTL),
        });
        results[m.keys.cacheKey] = { posterUrl, backdropUrl, source: "redis-cache" };
      } else {
        needTmdbResolve.push(m.keys);
      }
    });
  }

  if (needTmdbResolve.length > 0) {
    await runWithConcurrencyLimit(needTmdbResolve, 4, async (keys) => {
      const resolved = await resolvePosterCoalesced(keys);
      const hasPoster = Boolean(resolved.posterUrl || resolved.backdropUrl);
      setBoundedMap(posterMemoryCache, keys.cacheKey, {
        posterUrl: resolved.posterUrl,
        backdropUrl: resolved.backdropUrl,
        expireAt: now + (hasPoster ? MEMORY_TTL : NEGATIVE_MEMORY_TTL),
      });
      persistPosterToRedis(keys, resolved);
      results[keys.cacheKey] = {
        posterUrl: resolved.posterUrl,
        backdropUrl: resolved.backdropUrl,
        source: "tmdb",
      };
    });
  }

  return NextResponse.json(
    { status: true, results },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
