import { NextRequest, NextResponse } from "next/server";
import { fetchMatchSummary } from "@/services/footballDataService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("event") || searchParams.get("id");

  if (!eventId) {
    return NextResponse.json(
      { success: false, error: "Thiếu event ID trận đấu" },
      { status: 400 }
    );
  }

  try {
    const summary = await fetchMatchSummary(eventId);
    if (!summary) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy thông tin trận đấu" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: summary,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
        },
      }
    );
  } catch (error) {
    console.error("API football match detail error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Không thể lấy chi tiết trận đấu",
      },
      { status: 500 }
    );
  }
}
