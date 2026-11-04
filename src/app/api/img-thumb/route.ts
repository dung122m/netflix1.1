import { NextRequest, NextResponse } from "next/server";
import {
  enforceRateLimit,
  buildRateLimitResponse,
  RATE_LIMIT_PRESETS,
} from "@/lib/rateLimit";

export const runtime = "nodejs";

/**
 * /api/img-thumb:
 * PURGED & PERMANENTLY BLOCKED.
 * Nanaflix has completely eliminated phimimg.com from all image loading flows.
 * No proxying, no fallback, no trial fetching upstream.
 * Returns HTTP 410 Gone immediately.
 */
export async function GET(req: NextRequest) {
  const rateLimit = await enforceRateLimit(
    req,
    RATE_LIMIT_PRESETS.PUBLIC_IN_MEMORY_READ,
  );
  if (!rateLimit.allowed) {
    return buildRateLimitResponse(rateLimit);
  }

  return new NextResponse(
    "Phimimg source is permanently purged and unsupported. Please use verified TMDb/AniList sources.",
    {
      status: 410,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
      },
    }
  );
}
