import { NextRequest, NextResponse } from "next/server";
import {
  footballScoreService,
  VERIFIED_SCOREBOARD_LEAGUES,
  LeagueSlug,
  filterFixturesByDate,
} from "@/services/live/football-score/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const league = searchParams.get("league")?.trim() || "";
    const statusParam = searchParams.get("status")?.trim().toLowerCase();
    const dateParam = searchParams.get("date")?.trim();
    const pageParam = searchParams.get("page")?.trim();
    const limitParam = searchParams.get("limit")?.trim();

    // 1. Kiểm tra tính hợp lệ của tham số league
    if (!league) {
      return NextResponse.json(
        {
          status: false,
          error: "Missing required query parameter 'league'.",
        },
        { status: 400 },
      );
    }

    // 2. Chặn các league slug không nằm trong danh sách đã xác minh
    if (!VERIFIED_SCOREBOARD_LEAGUES.includes(league as LeagueSlug)) {
      return NextResponse.json(
        {
          status: false,
          error: "Invalid or unsupported league identifier.",
        },
        { status: 400 },
      );
    }

    // 3. Xác thực status param (nếu có: chấp nhận all, pre, post, scheduled, finished, live)
    let statusFilter: "all" | "pre" | "post" | "scheduled" | "finished" | "live" = "all";
    if (statusParam) {
      if (
        statusParam === "all" ||
        statusParam === "pre" ||
        statusParam === "post" ||
        statusParam === "scheduled" ||
        statusParam === "finished" ||
        statusParam === "live"
      ) {
        statusFilter = statusParam;
      } else {
        return NextResponse.json(
          {
            status: false,
            error:
              "Invalid status parameter. Must be 'all', 'pre', 'post', 'scheduled', 'finished', or 'live'.",
          },
          { status: 400 },
        );
      }
    }

    // 4. Xác thực date param (nếu có: định dạng YYYY-MM-DD theo giờ UTC+7)
    if (dateParam && !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return NextResponse.json(
        {
          status: false,
          error: "Invalid date parameter. Must be in 'YYYY-MM-DD' format.",
        },
        { status: 400 },
      );
    }

    // 5. Xác thực page & limit params
    let pageNum = 1;
    if (pageParam) {
      const parsedPage = parseInt(pageParam, 10);
      if (isNaN(parsedPage) || parsedPage < 1) {
        return NextResponse.json(
          {
            status: false,
            error: "Invalid page parameter. Must be a positive integer.",
          },
          { status: 400 },
        );
      }
      pageNum = parsedPage;
    }

    let limitNum = 100;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        return NextResponse.json(
          {
            status: false,
            error: "Invalid limit parameter. Must be an integer between 1 and 100.",
          },
          { status: 400 },
        );
      }
      limitNum = parsedLimit;
    }

    // 6. Lấy dữ liệu fixtures từ service (có server memory cache 10 phút và in-flight deduplication)
    const { data, cached } = await footballScoreService.getFixtures(league, {
      status: statusFilter,
      page: pageNum,
      limit: limitNum,
    });

    if (!data) {
      return NextResponse.json(
        {
          status: false,
          error: "Không thể tải dữ liệu lịch thi đấu & kết quả từ máy chủ lúc này.",
        },
        { status: 502 },
      );
    }

    // 7. Lọc theo ngày (UTC+7) nếu có yêu cầu
    if (dateParam) {
      const filteredEvents = filterFixturesByDate(data.events, dateParam);
      const responseData = {
        ...data,
        count: filteredEvents.length,
        events: filteredEvents,
      };

      return NextResponse.json(
        {
          status: true,
          data: responseData,
          cached,
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600, max-age=300",
          },
        },
      );
    }

    // 8. Trả kết quả chuẩn hóa đầy đủ
    return NextResponse.json(
      {
        status: true,
        data,
        cached,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600, max-age=300",
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        status: false,
        error: "Internal server error occurred while retrieving league fixtures.",
      },
      { status: 500 },
    );
  }
}
