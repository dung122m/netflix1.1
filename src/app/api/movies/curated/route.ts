import { NextRequest, NextResponse } from "next/server";
import { movieApi } from "@/services/movies/service";
import { getTmdbRankedMovies } from "@/services/tmdbService";
import {
  enforceRateLimit,
  buildRateLimitResponse,
  RATE_LIMIT_PRESETS,
} from "@/lib/rateLimit";
import { buildEdgeCacheHeaders } from "@/lib/cacheHeaders";

export const revalidate = 7200; // CDN cache 2 giờ
export const maxDuration = 10;

interface CacheEntry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[];
  expireAt: number;
}

const SERVER_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 giờ trong RAM server

const TAB_PARAMS: Record<
  string,
  { sort?: "views" | "rating" | "latest"; type?: string; limit: number }
> = {
  trending: { sort: "views", limit: 12 },
  rating: { sort: "rating", limit: 12 },
  theaters: { type: "phim-chieu-rap", limit: 12 },
  latest: { sort: "latest", limit: 12 },
};

export async function GET(req: NextRequest) {
  const rateLimit = await enforceRateLimit(req, RATE_LIMIT_PRESETS.PUBLIC_IN_MEMORY_READ);
  if (!rateLimit.allowed) {
    return buildRateLimitResponse(rateLimit);
  }

  const { searchParams } = new URL(req.url);
  const rawTab = searchParams.get("tab") || "trending";
  const tab = TAB_PARAMS[rawTab] ? rawTab : "trending";
  const limitParam = Number(searchParams.get("limit"));
  const limit = Math.min(Math.max(1, limitParam || 12), 24);

  const cacheKey = `${tab}_${limit}_v1`;

  const edgeHeaders = buildEdgeCacheHeaders(7200, 14400);

  const cached = SERVER_CACHE.get(cacheKey);
  if (cached && cached.expireAt > Date.now()) {
    return NextResponse.json({ success: true, items: cached.items }, { headers: edgeHeaders });
  }

  try {
    const config = TAB_PARAMS[tab] || TAB_PARAMS.trending;
    const fetchParams = {
      ...config,
      limit,
      page: 1,
      posterEnrichmentBudgetMs: 0,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let items: any[] = [];
    try {
      const res = await movieApi.getMovies(fetchParams);
      items = (res?.items || []).slice(0, limit);
    } catch (e) {
      console.warn(`[Curated API] movieApi.getMovies warning for tab ${tab}:`, e);
    }

    // Fallback an toàn nếu nguồn rỗng
    if (items.length === 0) {
      if (tab === "trending") {
        try {
          const tmdbItems = await getTmdbRankedMovies("week", limit);
          if (Array.isArray(tmdbItems) && tmdbItems.length > 0) {
            items = tmdbItems.slice(0, limit);
          }
        } catch { }
      } else if (tab === "rating") {
        try {
          const tmdbItems = await getTmdbRankedMovies("top_rated", limit);
          if (Array.isArray(tmdbItems) && tmdbItems.length > 0) {
            items = tmdbItems.slice(0, limit);
          }
        } catch { }
      }
    }

    if (items.length > 0) {
      SERVER_CACHE.set(cacheKey, {
        items,
        expireAt: Date.now() + CACHE_TTL_MS,
      });
    }

    return NextResponse.json(
      { success: true, items },
      {
        headers:
          items.length > 0
            ? edgeHeaders
            : { "Cache-Control": "public, max-age=30, s-maxage=60" },
      }
    );
  } catch (err) {
    console.error(`[Curated API] Unexpected error:`, err);
    return NextResponse.json({ success: false, items: [] }, { status: 500 });
  }
}
