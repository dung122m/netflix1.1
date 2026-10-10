import { NextResponse } from "next/server";
import { footballScoreService } from "@/services/live/football-score/service";
import { buildScoresMap } from "@/services/live/football-score/matcher";
import { liveFootballService } from "@/services/liveFootballService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const { events, updatedAt, cached } =
      await footballScoreService.getScoreboardEvents();

    let scores = {};
    try {
      // Lấy danh sách trận hiện tại từ memory cache của liveFootballService
      const footballData = await liveFootballService.getFootballMatches();
      if (footballData?.matches && footballData.matches.length > 0) {
        scores = buildScoresMap(footballData.matches, events);
      }
    } catch {
      // Giữ scores rỗng nếu liveFootballService gặp lỗi, không làm hỏng phản hồi
    }

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
        headers: {
          "Cache-Control":
            "public, s-maxage=60, stale-while-revalidate=120, max-age=60",
        },
      },
    );
  } catch (error) {
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
