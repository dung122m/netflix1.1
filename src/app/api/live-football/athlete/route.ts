import { NextRequest, NextResponse } from "next/server";
import { getAthleteProfile } from "@/services/live/football-score/athleteProfile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id")?.trim() || "";
    const rawName = searchParams.get("name")?.trim() || "";
    const name = rawName.slice(0, 80).replace(/[^\p{L}\p{N}\s'-]/gu, "").trim();

    // 1. Kiểm tra tham số ID hợp lệ (ngăn ngừa ký tự độc hại / injection)
    if (!id || !/^[a-zA-Z0-9_-]{1,64}$/.test(id)) {
      return NextResponse.json(
        {
          status: false,
          error: "Invalid or missing 'id' parameter.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        },
      );
    }

    // 2. Lấy hồ sơ cầu thủ (từ cache server hoặc ESPN Core + Wikimedia fallback)
    const profile = await getAthleteProfile(id, name);

    if (!profile) {
      return NextResponse.json(
        {
          status: false,
          error: "Athlete profile not found.",
        },
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        },
      );
    }

    // 3. Cache Control: Lưu cache trình duyệt 1 ngày và CDN 7 ngày vì thông tin cầu thủ rất ít biến động
    return NextResponse.json(
      {
        status: true,
        data: profile,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: false,
        error: (error as Error).message || "Internal server error.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  }
}
