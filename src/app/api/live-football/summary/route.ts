import { NextRequest, NextResponse } from "next/server";
import { footballScoreService, VERIFIED_SCOREBOARD_LEAGUES, LeagueSlug } from "@/services/live/football-score/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

    // 4. Lấy dữ liệu summary từ service (có cache và in-flight deduplication)
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

    // 5. Cấu hình Cache-Control phù hợp với trạng thái trận đấu
    const maxAge = data.status === "live" ? 15 : data.status === "finished" ? 300 : 60;
    const sMaxAge = maxAge;
    const staleWhileRevalidate = maxAge * 2;

    return NextResponse.json(
      {
        status: true,
        data,
        cached,
      },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}, max-age=${maxAge}`,
        },
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
