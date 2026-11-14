import { NextRequest, NextResponse } from "next/server";
import { footballScoreService } from "@/services/live/football-score/service";
import { buildScoresMap } from "@/services/live/football-score/matcher";
import { isVerifiedScoreboardMatch } from "@/services/live/football-score/canonicalLeagues";
import { liveFootballService } from "@/services/liveFootballService";
import {
  enforceRateLimit,
  buildRateLimitResponse,
  RATE_LIMIT_PRESETS,
} from "@/lib/rateLimit";

export const runtime = "nodejs";

// In-memory short cache to collapse burst polling into 0ms CPU responses
let lastScoresCache: {
  data: {
    scores: Record<string, unknown>;
    eventsCount: number;
    updatedAt: string;
    cached: boolean;
  };
  hasLive: boolean;
  expireAt: number;
} | null = null;

export async function GET(req: NextRequest) {
  const rateLimit = await enforceRateLimit(req, RATE_LIMIT_PRESETS.FOOTBALL_POLLING);
  if (!rateLimit.allowed) {
    return buildRateLimitResponse(rateLimit);
  }

  const now = Date.now();
  if (lastScoresCache && now < lastScoresCache.expireAt) {
    const cacheControl = lastScoresCache.hasLive
      ? "public, max-age=15, s-maxage=25, stale-while-revalidate=45"
      : "public, max-age=60, s-maxage=120, stale-while-revalidate=240";
    return NextResponse.json(
      {
        status: true,
        data: lastScoresCache.data,
      },
      {
        headers: {
          "Cache-Control": cacheControl,
          "CDN-Cache-Control": cacheControl,
          "Vercel-CDN-Cache-Control": cacheControl,
        },
      }
    );
  }

  try {
    // 1. Kiểm tra nhanh danh sách trận đấu hôm nay từ bộ nhớ RAM (0ms)
    let footballData = liveFootballService.getCachedFootballMatchesSync();
    if (!footballData?.matches || footballData.matches.length === 0) {
      footballData = await liveFootballService.getFootballMatches();
    }

    const matches = footballData?.matches || [];
    const hasAnyVerifiedMatch = matches.some((m) => isVerifiedScoreboardMatch(m));

    // Nếu toàn bộ danh sách trận hôm nay KHÔNG CÓ trận nào thuộc 16 giải đấu lớn (chỉ có bóng rổ, tennis, giải phong trào...)
    // Hoàn toàn không cần gọi ESPN CDN 16 giải -> trả ngay scores rỗng, cache CDN 5 phút (0ms CPU)
    if (!hasAnyVerifiedMatch) {
      const responseData = {
        scores: {},
        eventsCount: 0,
        updatedAt: new Date().toISOString(),
        cached: true,
      };
      lastScoresCache = {
        data: responseData,
        hasLive: false,
        expireAt: now + 90_000,
      };
      const idleCacheControl = "public, max-age=60, s-maxage=300, stale-while-revalidate=600";
      return NextResponse.json(
        { status: true, data: responseData },
        {
          headers: {
            "Cache-Control": idleCacheControl,
            "CDN-Cache-Control": idleCacheControl,
            "Vercel-CDN-Cache-Control": idleCacheControl,
          },
        }
      );
    }

    const { events, updatedAt, cached } =
      await footballScoreService.getScoreboardEvents();

    let scores = {};
    if (matches.length > 0) {
      scores = buildScoresMap(matches, events);
    }

    const hasLive = events.some((e) => e.status === "live");
    const cacheControl = hasLive
      ? "public, max-age=15, s-maxage=25, stale-while-revalidate=45"
      : "public, max-age=60, s-maxage=120, stale-while-revalidate=240";

    const responseData = {
      scores,
      eventsCount: events.length,
      updatedAt,
      cached,
    };

    lastScoresCache = {
      data: responseData,
      hasLive,
      expireAt: now + (hasLive ? 25_000 : 90_000),
    };

    const responseHeaders: Record<string, string> = {
      "Cache-Control": cacheControl,
      "CDN-Cache-Control": cacheControl,
      "Vercel-CDN-Cache-Control": cacheControl,
    };

    return NextResponse.json(
      {
        status: true,
        data: responseData,
      },
      {
        headers: responseHeaders,
      },
    );
  } catch {
    // Fail-safe tuyệt đối: trả về status true với dữ liệu rỗng, không bao giờ throw 500 làm sập giao diện
    return NextResponse.json({
      status: true,
      data: {
        scores: {},
        eventsCount: 0,
        updatedAt: new Date().toISOString(),
        cached: false,
      },
    });
  }
}
