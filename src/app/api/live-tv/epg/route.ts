import { NextRequest, NextResponse } from "next/server";
import { epgService } from "@/services/live/tv/epgService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channel = searchParams.get("channel");

    if (channel) {
      const channelEpg = await epgService.getEpgForChannel(channel);
      return NextResponse.json({
        success: true,
        channel,
        epg: channelEpg,
      });
    }

    const epgMap = await epgService.getEpgData();
    return NextResponse.json({
      success: true,
      epg: epgMap,
    });
  } catch (err) {
    console.warn("[API live-tv/epg] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load EPG data" },
      { status: 500 }
    );
  }
}
