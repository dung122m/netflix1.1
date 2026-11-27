import { NextRequest, NextResponse } from "next/server";
import {
  filterLiveMatchesSnapshot,
  liveFootballService,
  type LiveFootballData,
} from "@/services/live/football/service";
import { buildEdgeCacheHeaders } from "@/lib/cacheHeaders";
import {
  enforceRateLimit,
  buildRateLimitResponse,
  RATE_LIMIT_PRESETS,
} from "@/lib/rateLimit";

export const runtime = "nodejs";

// In-memory cache 60s để tránh chạy scraping lặp đi lặp lại (không cache mảng rỗng)
let lastMatchesCache: { data: LiveFootballData; expireAt: number } | null = null;

export async function GET(req: NextRequest) {
  const rateLimit = await enforceRateLimit(req, RATE_LIMIT_PRESETS.PUBLIC_IN_MEMORY_READ);
  if (!rateLimit.allowed) {
    return buildRateLimitResponse(rateLimit);
  }

  const now = Date.now();
  if (lastMatchesCache && now < lastMatchesCache.expireAt) {
    const filteredCached = filterLiveMatchesSnapshot(lastMatchesCache.data, now);
    if (filteredCached.matches.length > 0) {
      return NextResponse.json(
        {
          status: true,
          data: filteredCached,
        },
        {
          headers: buildEdgeCacheHeaders(60, 120),
        }
      );
    }
  }

  try {
    const data = await liveFootballService.getFootballMatches();
    const hasMatches = Array.isArray(data.matches) && data.matches.length > 0;
    if (hasMatches) {
      lastMatchesCache = {
        data,
        expireAt: now + 60_000,
      };
    } else {
      lastMatchesCache = null;
    }

    return NextResponse.json(
      {
        status: true,
        data,
      },
      {
        headers: hasMatches
          ? buildEdgeCacheHeaders(60, 120)
          : buildEdgeCacheHeaders(15, 30),
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: false,
        message: (error as Error).message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
