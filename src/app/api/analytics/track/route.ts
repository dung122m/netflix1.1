import { NextRequest, NextResponse } from "next/server";
import { recordAnalyticsEvent } from "@/services/analyticsService";
import { AnalyticsEventPayload } from "@/lib/analyticsClient";
import { verifyServerAuth } from "@/lib/serverAuth";
import { checkDistributedRateLimit, getClientIp } from "@/lib/security";
import { getGeoLocationFromRequest } from "@/lib/geoip";

export const maxDuration = 10;

// Các event cốt lõi phục vụ Admin Dashboard (lượt truy cập, xem phim, thời gian xem, tìm kiếm)
const CORE_ANALYTICS_EVENT_TYPES = new Set<string>([
  "site_visit",
  "movie_view",
  "watch_start",
  "watch_progress",
  "watch_end",
  "search",
]);

export async function POST(req: NextRequest) {
  try {
    // 1. Giới hạn tần suất phân tán theo IP (120 requests / 60s) qua Upstash Redis
    const clientIp = getClientIp(req);
    const rateLimit = await checkDistributedRateLimit(`analytics_${clientIp}`, 120, 60);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many analytics requests. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.resetSeconds) },
        }
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

    // Bỏ qua các event vi mô/UI interaction không dùng để tiết kiệm quota DB & Redis
    if (!CORE_ANALYTICS_EVENT_TYPES.has(body.eventType)) {
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

    // 4. Resolve Server-side Approximate GeoIP Location (Fast cache / edge headers)
    const location = await getGeoLocationFromRequest(req);

    // 5. Construct sanitized payload
    const sanitizedPayload: AnalyticsEventPayload = {
      eventType: body.eventType,
      movieSlug: typeof body.movieSlug === "string" ? body.movieSlug.slice(0, 200) : undefined,
      movieTitle: typeof body.movieTitle === "string" ? body.movieTitle.slice(0, 200) : undefined,
      episodeSlug: typeof body.episodeSlug === "string" ? body.episodeSlug.slice(0, 100) : undefined,
      episodeName: typeof body.episodeName === "string" ? body.episodeName.slice(0, 100) : undefined,
      userId: verifiedUserId, // Only set if token is verified by server
      anonymousId: finalAnonymousId, // Strictly from verified cookie
      deviceInfo: body.deviceInfo
        ? {
            deviceType: body.deviceInfo.deviceType || "desktop",
            os: body.deviceInfo.os || "Other",
            browser: body.deviceInfo.browser || "Other",
          }
        : undefined,
      durationSeconds: typeof body.durationSeconds === "number" ? Math.max(0, Math.min(body.durationSeconds, 86400)) : 0,
      progressSeconds: typeof body.progressSeconds === "number" ? Math.max(0, Math.min(body.progressSeconds, 86400)) : 0,
      keyword: typeof body.keyword === "string" ? body.keyword.slice(0, 100) : undefined,
      country: location.country || undefined,
      countryCode: location.countryCode || undefined,
      region: location.region || undefined,
      city: location.city || undefined,
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
