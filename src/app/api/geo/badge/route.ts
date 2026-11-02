import { NextRequest, NextResponse } from "next/server";
import { getGeoLocationFromRequest, getRegionalBadge } from "@/lib/geoip";
import {
  enforceRateLimit,
  buildRateLimitResponse,
  RATE_LIMIT_PRESETS,
} from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const rateLimit = await enforceRateLimit(req, RATE_LIMIT_PRESETS.PUBLIC_READ);
  if (!rateLimit.allowed) {
    return buildRateLimitResponse(rateLimit);
  }

  try {
    const geo = await getGeoLocationFromRequest(req);
    const badge = getRegionalBadge(geo);
    return NextResponse.json(
      { badge, countryCode: geo.countryCode || "VN", city: geo.city || null },
      {
        headers: {
          "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch {
    return NextResponse.json({ badge: "VN", countryCode: "VN", city: null });
  }
}
