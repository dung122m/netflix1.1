import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabaseAdmin";
import { isR2Configured } from "@/lib/r2";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Health check & Keep-alive endpoint
 * 1. Giữ Supabase luôn ở trạng thái Active (ngăn chặn cơ chế tự động Pause sau 7 ngày của Supabase Free Tier)
 * 2. Cung cấp endpoint giám sát uptime chuẩn cho Vercel Cron và các dịch vụ uptime bên ngoài
 */
export async function GET() {
  const startedAt = Date.now();
  const checks: Record<string, string> = {
    app: "ok",
    r2: isR2Configured() ? "ok" : "unconfigured",
  };

  // Ping Supabase để giữ kết nối và PostgREST schema cache luôn ấm
  if (isSupabaseAdminConfigured()) {
    try {
      const admin = getSupabaseAdmin();
      if (admin) {
        const { error } = await admin
          .from("user_profiles")
          .select("id", { count: "exact", head: true })
          .limit(1);

        checks.supabase = error ? `warn: ${error.message}` : "ok";

        // Tự động dọn dẹp log analytics cũ hơn 60 ngày để bảo vệ vĩnh viễn hạn ngạch 500MB Supabase Free Tier
        const sixtyDaysAgo = Date.now() - 60 * 86400 * 1000;
        const { error: pruneError } = await admin
          .from("analytics_events")
          .delete()
          .lt("created_at", sixtyDaysAgo);

        if (pruneError) {
          console.warn("[Health Cron] Prune analytics_events skipped:", pruneError.message);
        } else {
          checks.analytics_pruned = "ok";
        }
      } else {
        checks.supabase = "unconfigured";
      }
    } catch (err) {
      checks.supabase = `error: ${err instanceof Error ? err.message : "unknown"}`;
    }
  } else {
    checks.supabase = "unconfigured";
  }

  const durationMs = Date.now() - startedAt;

  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      durationMs,
      services: checks,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
