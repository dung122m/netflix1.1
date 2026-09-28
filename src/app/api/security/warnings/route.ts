import { NextRequest, NextResponse } from "next/server";
import { verifyServerAuth } from "@/lib/serverAuth";
import { getActiveSecurityWarning, hashClientIp } from "@/services/securityRiskService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyServerAuth(req);
    const { searchParams } = new URL(req.url);

    const userId = auth.isAuthenticated && auth.userId ? auth.userId : searchParams.get("userId") || undefined;
    const anonymousId =
      req.headers.get("x-anonymous-id") ||
      searchParams.get("anonymousId") ||
      undefined;

    const forwarded = req.headers.get("x-forwarded-for");
    const rawIp = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";
    const ipHash = hashClientIp(rawIp);

    const warning = await getActiveSecurityWarning({
      userId,
      anonymousId,
      ipHash,
    });

    return NextResponse.json({
      success: true,
      data: warning,
    });
  } catch (error) {
    console.error("[api/security/warnings] GET error:", error);
    return NextResponse.json(
      { success: false, data: { hasWarning: false } },
      { status: 200 }
    );
  }
}
