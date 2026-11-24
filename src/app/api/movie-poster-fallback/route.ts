import { NextRequest, NextResponse } from "next/server";
import { searchTmdbPosterByTitle, getTmdbMediaImagesById, isCorruptedTmdbId } from "@/services/tmdbService";
import { cacheService } from "@/lib/cache";

export const runtime = "nodejs";

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

export async function GET(req: NextRequest) {
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

  const resolved = await resolvePoster(keys);
  const hasPoster = Boolean(resolved.posterUrl || resolved.backdropUrl);

  setBoundedMap(posterMemoryCache, keys.cacheKey, {
    posterUrl: resolved.posterUrl,
    backdropUrl: resolved.backdropUrl,
    expireAt: now + MEMORY_TTL,
  });

  return NextResponse.json(
    { status: true, posterUrl: resolved.posterUrl, backdropUrl: resolved.backdropUrl, source: "tmdb" },
    { headers: hasPoster ? CACHE_HEADERS_HIT : CACHE_HEADERS_MISS }
  );
}

export async function POST(req: NextRequest) {
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

  const items = rawItems.slice(0, 32);
  const now = Date.now();
  const results: Record<string, { posterUrl: string | null; backdropUrl: string | null; source: string }> = {};

  await Promise.allSettled(
    items.map(async (it) => {
      const keys = parseItemKeys(it);
      const cached = posterMemoryCache.get(keys.cacheKey);
      if (cached && cached.expireAt > now) {
        results[keys.cacheKey] = {
          posterUrl: cached.posterUrl,
          backdropUrl: cached.backdropUrl,
          source: "l1-cache",
        };
        return;
      }

      const resolved = await resolvePoster(keys);
      setBoundedMap(posterMemoryCache, keys.cacheKey, {
        posterUrl: resolved.posterUrl,
        backdropUrl: resolved.backdropUrl,
        expireAt: now + MEMORY_TTL,
      });

      if (resolved.posterUrl) {
        cacheService
          .set(
            keys.redisPosterKey,
            { posterUrl: resolved.posterUrl, backdropUrl: resolved.backdropUrl },
            30 * 86400
          )
          .catch(() => {});
        if (keys.slugCleanKey) {
          cacheService
            .set(
              keys.slugCleanKey,
              { posterUrl: resolved.posterUrl, backdropUrl: resolved.backdropUrl },
              30 * 86400
            )
            .catch(() => {});
        }
      }

      results[keys.cacheKey] = {
        posterUrl: resolved.posterUrl,
        backdropUrl: resolved.backdropUrl,
        source: "tmdb",
      };
    })
  );

  return NextResponse.json({ status: true, results }, { headers: CACHE_HEADERS_HIT });
}
