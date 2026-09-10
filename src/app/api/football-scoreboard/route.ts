import { NextRequest, NextResponse } from "next/server";
import { fetchLeagueScoreboard } from "@/services/footballDataService";

export const runtime = "edge";
export const revalidate = 20;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const league = searchParams.get("league") || "eng.1";

  try {
    const matches = await fetchLeagueScoreboard(league);
    return NextResponse.json(
      {
        success: true,
        league,
        count: matches.length,
        data: matches,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=20, stale-while-revalidate=40",
        },
      }
    );
  } catch (error) {
    console.error("API football scoreboard error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Không thể lấy tỉ số trận đấu",
        data: [],
      },
      { status: 500 }
    );
  }
}
