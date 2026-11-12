import { NextRequest, NextResponse } from "next/server";
import {
  enforceRateLimit,
  buildRateLimitResponse,
  RATE_LIMIT_PRESETS,
} from "@/lib/rateLimit";
import {
  getMovieRecommendations,
  getCanonicalRecommendationsCacheKey,
  packRecommendationsPayload,
  unpackRecommendationsPayload,
  parseRecommendationsQuery,
} from "@/services/movies/recommendations";

export const maxDuration = 15;

export {
  getCanonicalRecommendationsCacheKey,
  packRecommendationsPayload,
  unpackRecommendationsPayload,
};

const EMPTY_RECOMMENDATIONS_RESPONSE = {
  success: false,
  genreMovies: [],
  countryMovies: [],
  actorMovies: [],
  directorMovies: [],
  allMovies: [],
};

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

const PRIVATE_NO_STORE = "private, no-cache, no-store, max-age=0, must-revalidate";
const PUBLIC_EDGE_CACHE = "public, s-maxage=3600, stale-while-revalidate=86400";

export async function GET(req: NextRequest) {
  try {
    const rateLimit = await enforceRateLimit(req, RATE_LIMIT_PRESETS.RECOMMENDATIONS_IN_MEMORY);
    if (!rateLimit.allowed) {
      return buildRateLimitResponse(rateLimit);
    }

    const searchParams = req.nextUrl?.searchParams ?? new URL(req.url).searchParams;
    const payload = parseRecommendationsQuery(searchParams);
    if (!payload.currentMovieSlug) {
      return NextResponse.json(EMPTY_RECOMMENDATIONS_RESPONSE, {
        status: 400,
        headers: NO_STORE_HEADERS,
      });
    }

    const { data, cacheStatus } = await getMovieRecommendations(payload);
    const isCacheable = Boolean(
      data?.success && Array.isArray(data.allMovies) && data.allMovies.length > 0
    );

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": isCacheable ? PUBLIC_EDGE_CACHE : PRIVATE_NO_STORE,
        "X-Cache": cacheStatus,
      },
    });
  } catch (err) {
    console.error("[movie recommendations GET API] Lỗi:", err);
    return NextResponse.json(EMPTY_RECOMMENDATIONS_RESPONSE, {
      status: 500,
      headers: NO_STORE_HEADERS,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const rateLimit = await enforceRateLimit(req, RATE_LIMIT_PRESETS.RECOMMENDATIONS_IN_MEMORY);
    if (!rateLimit.allowed) {
      return buildRateLimitResponse(rateLimit);
    }

    const body = await req.json().catch(() => null);
    const { currentMovieSlug } = body || {};

    if (!currentMovieSlug) {
      return NextResponse.json(EMPTY_RECOMMENDATIONS_RESPONSE, {
        status: 400,
        headers: NO_STORE_HEADERS,
      });
    }

    const { data, cacheStatus } = await getMovieRecommendations(body);
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": PRIVATE_NO_STORE,
        "X-Cache": cacheStatus,
      },
    });
  } catch (err) {
    console.error("[movie recommendations API] Lỗi:", err);
    return NextResponse.json(EMPTY_RECOMMENDATIONS_RESPONSE, {
      status: 500,
      headers: NO_STORE_HEADERS,
    });
  }
}
