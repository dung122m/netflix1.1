import { NextRequest, NextResponse } from "next/server";
import { recordAnalyticsEvent } from "@/services/analyticsService";
import { AnalyticsEventPayload } from "@/lib/analyticsClient";
import { verifyServerAuth } from "@/lib/serverAuth";

export const maxDuration = 10;

export async function POST(req: NextRequest) {
  try {
    let body: Partial<AnalyticsEventPayload> = {};

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json") || contentType.includes("text/plain")) {
      body = await req.json();
    } else {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    }

    if (!body || !body.eventType) {
      return NextResponse.json({ success: false, error: "Missing eventType" }, { status: 400 });
    }

    // 1. Server-controlled Timestamp (Do not trust client timestamp)
    const serverTimestamp = Date.now();

    // 2. Server-controlled Anonymous ID (Extract strictly from cookie)
    const cookieAnonId = req.cookies.get("nanaflix_anon_id")?.value;
    let finalAnonymousId = cookieAnonId && cookieAnonId.startsWith("anon_") ? cookieAnonId : null;
    let isNewCookieNeeded = false;

    if (!finalAnonymousId) {
      finalAnonymousId = "anon_" + Math.random().toString(36).substring(2, 10) + serverTimestamp.toString(36);
      isNewCookieNeeded = true;
    }

    // 3. Server-controlled User ID (Verify Firebase auth token, do NOT trust client body.userId)
    const auth = await verifyServerAuth(req);
    const verifiedUserId = auth.isAuthenticated && auth.userId ? auth.userId : undefined;

    // 4. Construct sanitized payload
    const sanitizedPayload: AnalyticsEventPayload = {
      eventType: body.eventType,
      movieSlug: typeof body.movieSlug === "string" ? body.movieSlug.slice(0, 200) : undefined,
      movieTitle: typeof body.movieTitle === "string" ? body.movieTitle.slice(0, 200) : undefined,
      episodeSlug: typeof body.episodeSlug === "string" ? body.episodeSlug.slice(0, 100) : undefined,
      episodeName: typeof body.episodeName === "string" ? body.episodeName.slice(0, 100) : undefined,
      userId: verifiedUserId, // Only set if token is verified by server
      anonymousId: finalAnonymousId, // Strictly from verified cookie
      deviceInfo: body.deviceInfo,
      durationSeconds: typeof body.durationSeconds === "number" ? Math.max(0, Math.min(body.durationSeconds, 86400)) : 0,
      progressSeconds: typeof body.progressSeconds === "number" ? Math.max(0, Math.min(body.progressSeconds, 86400)) : 0,
      keyword: typeof body.keyword === "string" ? body.keyword.slice(0, 100) : undefined,
      timestamp: serverTimestamp, // Strictly server time
    };

    const result = await recordAnalyticsEvent(sanitizedPayload);

    const response = NextResponse.json({ success: true, deduped: result.deduped || false });

    // Ensure cookie is set on client if it was missing
    if (isNewCookieNeeded) {
      response.cookies.set("nanaflix_anon_id", finalAnonymousId, {
        maxAge: 31536000, // 1 year
        path: "/",
        sameSite: "lax",
      });
    }

    return response;
  } catch (err) {
    console.warn("[Analytics Track API] Failed to record event:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 200 });
  }
}
