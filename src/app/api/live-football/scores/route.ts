import { NextRequest, NextResponse } from "next/server";
import { footballScoreService } from "@/services/live/football-score/service";
import { buildScoresMap } from "@/services/live/football-score/matcher";
import { liveFootballService } from "@/services/liveFootballService";
import {
  enforceRateLimit,
  buildRateLimitResponse,
  RATE_LIMIT_PRESETS,
} from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const rateLimit = await enforceRateLimit(req, RATE_LIMIT_PRESETS.FOOTBALL_POLLING);
  if (!rateLimit.allowed) {
    return buildRateLimitResponse(rateLimit);
  }

  try {
    const { events, updatedAt, cached } =
      await footballScoreService.getScoreboardEvents();

    let scores = {};
    try {
      // Ưu tiên đọc từ RAM cache đồng bộ của liveFootballService (0ms, 0 Redis commands)
      let footballData = liveFootballService.getCachedFootballMatchesSync();
      if (!footballData?.matches || footballData.matches.length === 0) {
        footballData = await liveFootballService.getFootballMatches();
      }
      if (footballData?.matches && footballData.matches.length > 0) {
        scores = buildScoresMap(footballData.matches, events);
      }
    } catch {
      // Giữ scores rỗng nếu liveFootballService gặp lỗi, không làm hỏng phản hồi
    }

    const hasLive = events.some((e) => e.status === "live");
    const cacheControl = hasLive
      ? "public, s-maxage=4, stale-while-revalidate=3, max-age=0"
      : "public, s-maxage=15, stale-while-revalidate=30, max-age=15";

    const responseHeaders: Record<string, string> = {
      "Cache-Control": cacheControl,
    };

    return NextResponse.json(
      {
        status: true,
        data: {
          scores,
          eventsCount: events.length,
          updatedAt,
          cached,
        },
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
