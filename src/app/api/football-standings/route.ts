import { NextRequest, NextResponse } from "next/server";
import { fetchLeagueStandings, POPULAR_LEAGUES } from "@/services/footballDataService";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const leagueId = searchParams.get("league") || "eng.1";

  try {
    const standings = await fetchLeagueStandings(leagueId);
    return NextResponse.json(
      {
        league: POPULAR_LEAGUES.find((l) => l.id === leagueId) || { id: leagueId, name: leagueId, vietnameseName: leagueId, flag: "⚽" },
        standings,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=900",
        },
      }
    );
  } catch (error) {
    console.error("Football standings API error:", error);
    return NextResponse.json({ error: "Failed to fetch standings" }, { status: 500 });
  }
}
