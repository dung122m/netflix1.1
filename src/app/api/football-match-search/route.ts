import { NextRequest, NextResponse } from "next/server";
import { searchMatchByTeams } from "@/services/footballDataService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const team1 = searchParams.get("team1") || "";
  const team2 = searchParams.get("team2") || "";
  const title = searchParams.get("title") || "";

  if (!team1 && !team2 && !title) {
    return NextResponse.json(
      { success: false, found: false, error: "Thiếu tên đội bóng để tìm kiếm" },
      { status: 400 }
    );
  }

  try {
    const result = await searchMatchByTeams(team1, team2, title);
    return NextResponse.json(
      {
        success: true,
        ...result,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=20, stale-while-revalidate=40",
        },
      }
    );
  } catch (error) {
    console.error("API football match search error:", error);
    return NextResponse.json(
      {
        success: false,
        found: false,
        error: "Lỗi tìm kiếm trận đấu",
      },
      { status: 500 }
    );
  }
}
