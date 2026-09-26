import { NextRequest, NextResponse } from "next/server";
import { getDailyVisitorsStats } from "@/services/analyticsService";
import { verifyServerAuth } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET(req: NextRequest) {
  try {
    // 1. Enforce Admin Authentication
    const auth = await verifyServerAuth(req);
    if (!auth.isAuthenticated) {
      return NextResponse.json(
        { success: false, error: "Yêu cầu đăng nhập tài khoản Quản trị viên (Unauthorized)" },
        { status: 401 }
      );
    }

    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: "Tài khoản của bạn không có quyền Quản trị viên (Forbidden)" },
        { status: 403 }
      );
    }

    // 2. Parse date parameter (YYYY-MM-DD)
    const dateParam = req.nextUrl.searchParams.get("date") || undefined;

    // 3. Retrieve daily visitor statistics
    const data = await getDailyVisitorsStats(dateParam);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("[Daily Visitors API] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve daily visitors" },
      { status: 500 }
    );
  }
}
