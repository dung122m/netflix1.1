import { NextRequest, NextResponse } from "next/server";
import { recordAnalyticsEvent } from "@/services/analyticsService";
import { AnalyticsEventPayload } from "@/lib/analyticsClient";
import { verifyServerAuth } from "@/lib/serverAuth";

import { getGeoLocationFromRequest } from "@/lib/geoip";
import { getClientIp } from "@/lib/clientIp";

export const maxDuration = 10;

// Bộ nhớ đệm giới hạn tần suất local (30 req / 10s per IP) chống bot flood mà không tốn Redis commands
const localTrackRateMap = new Map<string, number[]>();

function checkLocalTrackRateLimit(ip: string): boolean {
  const now = Date.now();
  let timestamps = localTrackRateMap.get(ip);
  if (!timestamps) {
    timestamps = [];
    localTrackRateMap.set(ip, timestamps);
  }
  timestamps = timestamps.filter((t) => now - t < 10000);
  if (timestamps.length >= 30) {
    return false;
  }
  timestamps.push(now);
  localTrackRateMap.set(ip, timestamps);
  return true;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Kiểm tra tần suất in-memory (0ms, 0 Redis commands; bảo vệ endpoint mà không phát sinh Redis ZSET)
    const clientIp = getClientIp(req);
    if (!checkLocalTrackRateLimit(clientIp)) {
      return NextResponse.json(
        { success: false, error: "Too many analytics requests. Please try again later." },
        { status: 429, headers: { "Retry-After": "10" } }
      );
    }

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

    // Bỏ qua tất cả các event không phải site_visit để tiết kiệm quota DB & Redis
    if (body.eventType !== "site_visit") {
      return NextResponse.json({ success: true, ignored: true });
    }

    // 1. Server-controlled Timestamp (Do not trust client timestamp)
    const serverTimestamp = Date.now();

    // 2. Server-controlled Anonymous ID (Validate client anonymousId or fallback to cookie / server generation)
    const cookieAnonId = req.cookies.get("nanaflix_anon_id")?.value;
    const bodyAnonId = typeof body.anonymousId === "string" ? body.anonymousId.trim() : "";

    const isValidAnonId = (id: string | null | undefined): boolean =>
      Boolean(id && /^anon_[a-zA-Z0-9_-]{8,64}$/.test(id));

    let finalAnonymousId: string;
    let isNewCookieNeeded = false;

    if (isValidAnonId(bodyAnonId)) {
      finalAnonymousId = bodyAnonId;
      if (cookieAnonId !== bodyAnonId) {
        isNewCookieNeeded = true;
      }
    } else if (isValidAnonId(cookieAnonId)) {
      finalAnonymousId = cookieAnonId!;
    } else {
      finalAnonymousId = "anon_" + Math.random().toString(36).substring(2, 10) + serverTimestamp.toString(36);
      isNewCookieNeeded = true;
    }

    // 3. Server-controlled User ID (Verify Firebase auth token, do NOT trust client body.userId)
    const auth = await verifyServerAuth(req);
    const verifiedUserId = auth.isAuthenticated && auth.userId ? auth.userId : undefined;

    // 4. Resolve Server-side Approximate GeoIP Location for regional distribution
    const location = await getGeoLocationFromRequest(req);

    // 5. Deterministic identity token for the current visitor session
    // - Authenticated User: `u_${verifiedUserId}`
    // - Anonymous Guest: `a_${finalAnonymousId}`
    const currentVisitorToken = verifiedUserId ? `u_${verifiedUserId}` : `a_${finalAnonymousId}`;
    const cookieVisitorToken = req.cookies.get("nanaflix_has_visited")?.value;
    const isReturningVisitor = Boolean(cookieVisitorToken && cookieVisitorToken === currentVisitorToken);

    // 6. Construct sanitized site_visit payload
    const sanitizedPayload: AnalyticsEventPayload = {
      eventType: "site_visit",
      movieSlug: typeof body.movieSlug === "string" ? body.movieSlug.trim().slice(0, 100) : "home",
      movieTitle: typeof body.movieTitle === "string" ? body.movieTitle.trim().slice(0, 200) : "/",
      userId: verifiedUserId, // Only set if token is verified by server
      anonymousId: finalAnonymousId, // Always populated with valid anonId to satisfy PostgreSQL NOT NULL constraint
      isReturningVisitor,
      deviceInfo: body.deviceInfo
        ? {
            deviceType: body.deviceInfo.deviceType || "desktop",
            os: body.deviceInfo.os || "Other",
            browser: body.deviceInfo.browser || "Other",
          }
        : undefined,
      durationSeconds: 0,
      progressSeconds: 0,
      country: location.country || undefined,
      countryCode: location.countryCode || undefined,
      region: location.region || undefined,
      city: location.city || undefined,
      timestamp: serverTimestamp, // Strictly server time
    };

    const result = await recordAnalyticsEvent(sanitizedPayload);

    const response = NextResponse.json({ success: true, deduped: result.deduped || false });

    // ONLY issue or update the returning visitor cookie IF storage/Redis successfully recorded the visitor
    if (result.visitorRecorded && (!cookieVisitorToken || cookieVisitorToken !== currentVisitorToken)) {
      response.cookies.set("nanaflix_has_visited", currentVisitorToken, {
        maxAge: 30 * 86400, // 30 days
        path: "/",
        sameSite: "lax",
      });
    }

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
