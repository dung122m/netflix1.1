import { NextRequest, NextResponse } from "next/server";
import { verifyServerAuth } from "@/lib/serverAuth";
import {
  getSecurityIncidents,
  getSecurityStats,
  resolveSecurityIncident,
  unblockSecurityEntity,
} from "@/services/securityRiskService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyServerAuth(req);
    if (!auth.isAdmin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const status = searchParams.get("status") as "all" | "active" | "resolved" | null;
    const minRisk = searchParams.get("minRisk") ? parseInt(searchParams.get("minRisk")!, 10) : undefined;

    const [incidents, stats] = await Promise.all([
      getSecurityIncidents({
        limit,
        status: status || "all",
        minRisk,
      }),
      getSecurityStats(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        incidents,
        stats,
      },
    });
  } catch (error) {
    console.error("[api/admin/security] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyServerAuth(req);
    if (!auth.isAdmin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === "resolve") {
      const { incidentId } = body;
      if (!incidentId) {
        return NextResponse.json(
          { success: false, error: "incidentId is required" },
          { status: 400 }
        );
      }
      const success = await resolveSecurityIncident(
        incidentId,
        auth.email || auth.userId || "admin"
      );
      return NextResponse.json({ success });
    }

    if (action === "unblock") {
      const { entityType, entityId } = body;
      if (!entityType || !entityId) {
        return NextResponse.json(
          { success: false, error: "entityType and entityId are required" },
          { status: 400 }
        );
      }
      const success = await unblockSecurityEntity(
        entityType,
        entityId,
        auth.email || auth.userId || "admin"
      );
      return NextResponse.json({ success });
    }

    return NextResponse.json(
      { success: false, error: `Invalid action: ${action}` },
      { status: 400 }
    );
  } catch (error) {
    console.error("[api/admin/security] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
