import { NextRequest, NextResponse } from "next/server";
import { getAnalyticsDashboardStats } from "@/services/analyticsService";
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

    // 2. Parse timeframe
    const rawTimeframe = req.nextUrl.searchParams.get("timeframe") || "today";
    const timeframe = ["today", "7d", "30d", "all"].includes(rawTimeframe)
      ? (rawTimeframe as "today" | "7d" | "30d" | "all")
      : "today";

    // 3. Retrieve stats
    const stats = await getAnalyticsDashboardStats(timeframe);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    console.error("[Analytics Stats API] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve analytics statistics" },
      { status: 500 }
    );
  }
}
