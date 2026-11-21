import { NextRequest, NextResponse } from "next/server";
import { footballScoreService, VERIFIED_SCOREBOARD_LEAGUES, LeagueSlug } from "@/services/live/football-score/service";
import {
  enforceRateLimit,
  buildRateLimitResponse,
  RATE_LIMIT_PRESETS,
} from "@/lib/rateLimit";

export const runtime = "nodejs";

function buildHeaders(isLive: boolean, isFinished: boolean): Record<string, string> {
  const cacheControlHeader = isLive
    ? "public, max-age=15, s-maxage=25, stale-while-revalidate=25"
    : isFinished
      ? "public, s-maxage=300, stale-while-revalidate=600, max-age=300"
      : "public, s-maxage=60, stale-while-revalidate=120, max-age=60";

  const cdnCacheControl = isLive
    ? "public, max-age=25"
    : isFinished
      ? "public, max-age=300"
      : "public, max-age=60";

  const vercelCdnCacheControl = isLive
    ? "max-age=25, stale-while-revalidate=25"
    : isFinished
      ? "max-age=300, stale-while-revalidate=600"
      : "max-age=60, stale-while-revalidate=120";

  return {
    "Cache-Control": cacheControlHeader,
    "CDN-Cache-Control": cdnCacheControl,
    "Vercel-CDN-Cache-Control": vercelCdnCacheControl,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const league = searchParams.get("league")?.trim() || "";
    const event = searchParams.get("event")?.trim() || "";

    // 1. Kiểm tra tính hợp lệ của tham số đầu vào
    if (!league || !event) {
      return NextResponse.json(
        {
          status: false,
          error: "Missing required query parameters 'league' and 'event'.",
        },
        { status: 400 },
      );
    }

    // 2. Chặn các league slug không nằm trong danh sách đã xác minh (ngăn URL upstream tùy ý)
    if (!VERIFIED_SCOREBOARD_LEAGUES.includes(league as LeagueSlug)) {
      return NextResponse.json(
        {
          status: false,
          error: "Invalid or unsupported league identifier.",
        },
        { status: 400 },
      );
    }

    // 3. Chặn ký tự bất thường trong event ID
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(event)) {
      return NextResponse.json(
        {
          status: false,
          error: "Invalid event identifier format.",
        },
        { status: 400 },
      );
    }

    // 4. Short-circuit RAM Cache: Trả lời 0ms CPU, 0 Redis calls khi có sẵn trong RAM
    const peeked = footballScoreService.peekSummary(league, event);
    if (peeked) {
      return NextResponse.json(
        {
          status: true,
          data: peeked,
          cached: true,
        },
        {
          headers: buildHeaders(peeked.status === "live", peeked.status === "finished"),
        },
      );
    }

    // 5. Chỉ khi RAM miss mới cần rate-limit trước khi gọi upstream/Redis
    const rateLimit = await enforceRateLimit(request, RATE_LIMIT_PRESETS.FOOTBALL_POLLING);
    if (!rateLimit.allowed) {
      return buildRateLimitResponse(rateLimit);
    }

    // 6. Lấy dữ liệu summary từ service (có cache Redis và in-flight deduplication)
    const { data, cached } = await footballScoreService.getMatchSummary(league, event);

    if (!data) {
      return NextResponse.json(
        {
          status: false,
          error: "Match summary not found or upstream unavailable.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        status: true,
        data,
        cached,
      },
      {
        headers: buildHeaders(data.status === "live", data.status === "finished"),
      },
    );
  } catch {
    // Fail-safe tối đa: không trả stack trace hoặc thông tin nội bộ cho client
    return NextResponse.json(
      {
        status: false,
        error: "Internal server error occurred while retrieving match summary.",
      },
      { status: 500 },
    );
  }
}
