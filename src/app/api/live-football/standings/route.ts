import { NextRequest, NextResponse } from "next/server";
import {
  footballScoreService,
  VERIFIED_SCOREBOARD_LEAGUES,
  LeagueSlug,
} from "@/services/live/football-score/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const league = searchParams.get("league")?.trim() || "";
    const seasonParam = searchParams.get("season")?.trim();

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

    // 3. Xác thực tham số season nếu được cung cấp (năm hợp lệ từ 2000 đến 2100)
    let seasonNum: number | undefined = undefined;
    if (seasonParam) {
      if (!/^\d{4}$/.test(seasonParam)) {
        return NextResponse.json(
          {
            status: false,
            error: "Invalid season parameter. Must be a 4-digit year.",
          },
          { status: 400 },
        );
      }
      seasonNum = parseInt(seasonParam, 10);
      if (seasonNum < 2000 || seasonNum > 2100) {
        return NextResponse.json(
          {
            status: false,
            error: "Season year must be between 2000 and 2100.",
          },
          { status: 400 },
        );
      }
    }

    // 4. Lấy dữ liệu standings từ service (có server memory cache 10 phút và in-flight deduplication)
    const { data, isCupOrNoStandings, cached } = await footballScoreService.getStandings(
      league,
      seasonNum,
    );

    // 5. Nếu là giải cúp hoặc không có bảng xếp hạng vòng tròn
    if (isCupOrNoStandings) {
      return NextResponse.json(
        {
          status: true,
          data: null,
          isCupOrNoStandings: true,
          message: "Giải đấu này theo thể thức cúp / loại trực tiếp và không có bảng xếp hạng thể thức vòng tròn.",
          cached,
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200, max-age=600",
          },
        },
      );
    }

    // 6. Upstream lỗi hoặc không tìm thấy dữ liệu
    if (!data) {
      return NextResponse.json(
        {
          status: false,
          error: "Không thể tải dữ liệu bảng xếp hạng từ máy chủ lúc này.",
        },
        { status: 502 },
      );
    }

    // 7. Trả dữ liệu chuẩn hóa thành công (TTL cache 10 phút)
    return NextResponse.json(
      {
        status: true,
        data,
        isCupOrNoStandings: false,
        cached,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200, max-age=600",
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        status: false,
        error: "Internal server error occurred while retrieving league standings.",
      },
      { status: 500 },
    );
  }
}
