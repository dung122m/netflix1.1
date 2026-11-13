import { NextRequest, NextResponse } from "next/server";
import { liveFootballService } from "@/services/liveFootballService";
import {
  enforceRateLimit,
  buildRateLimitResponse,
  RATE_LIMIT_PRESETS,
} from "@/lib/rateLimit";

export const runtime = "nodejs";

// In-memory cache 60s để tránh chạy scraping lặp đi lặp lại
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let lastMatchesCache: { data: any; expireAt: number } | null = null;

export async function GET(req: NextRequest) {
  const rateLimit = await enforceRateLimit(req, RATE_LIMIT_PRESETS.PUBLIC_IN_MEMORY_READ);
  if (!rateLimit.allowed) {
    return buildRateLimitResponse(rateLimit);
  }

  const now = Date.now();
  if (lastMatchesCache && now < lastMatchesCache.expireAt) {
    return NextResponse.json(
      {
        status: true,
        data: lastMatchesCache.data,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
          "CDN-Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
          "Vercel-CDN-Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
        },
      }
    );
  }

  try {
    const data = await liveFootballService.getFootballMatches();
    lastMatchesCache = {
      data,
      expireAt: now + 60_000,
    };
    return NextResponse.json(
      {
        status: true,
        data,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
          "CDN-Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
          "Vercel-CDN-Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
        },
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
