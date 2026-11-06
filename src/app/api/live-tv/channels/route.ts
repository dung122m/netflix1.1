import { NextRequest, NextResponse } from "next/server";
import { liveTvService } from "@/services/live/tv/service";
import {
  enforceRateLimit,
  buildRateLimitResponse,
  RATE_LIMIT_PRESETS,
} from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req?: NextRequest) {
  const request = req ?? new NextRequest("http://localhost/api/live-tv/channels");
  const rateLimit = await enforceRateLimit(request, RATE_LIMIT_PRESETS.PUBLIC_IN_MEMORY_READ);
  if (!rateLimit.allowed) {
    return buildRateLimitResponse(rateLimit);
  }

  try {
    const data = await liveTvService.getTvChannels();
    return NextResponse.json(
      {
        status: true,
        data,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
        },
      }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    console.error("❌ Lỗi lấy danh sách kênh TV:", msg);
    return NextResponse.json(
      {
        status: false,
        error: "Không thể tải danh sách kênh truyền hình lúc này.",
      },
      { status: 500 }
    );
  }
}

