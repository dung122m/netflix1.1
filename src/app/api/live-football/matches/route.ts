import { NextResponse } from "next/server";
import { liveFootballService } from "@/services/liveFootballService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const data = await liveFootballService.getFootballMatches();
    return NextResponse.json({
      status: true,
      data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: false,
        message: (error as Error).message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
