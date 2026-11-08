import { NextRequest, NextResponse } from "next/server";
import { recordAnalyticsEvent } from "@/services/analyticsService";
import { AnalyticsEventPayload } from "@/lib/analyticsClient";
import { verifyServerAuth } from "@/lib/serverAuth";
import {
  enforceRateLimit,
  buildRateLimitResponse,
  RATE_LIMIT_PRESETS,
} from "@/lib/rateLimit";

export const maxDuration = 10;

export async function POST(req: NextRequest) {
  try {
    // 1. Kiểm tra tần suất in-memory (0ms, 0 Redis commands; bảo vệ endpoint chống bot flood)
    const rateLimit = await enforceRateLimit(req, RATE_LIMIT_PRESETS.ANALYTICS_TRACK);
    if (!rateLimit.allowed) {
      return buildRateLimitResponse(
        rateLimit,
        "Too many analytics requests. Please try again later."
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

    // 4. Deterministic identity token for the current visitor session
    // - Authenticated User: `u_${verifiedUserId}`
    // - Anonymous Guest: `a_${finalAnonymousId}`
    const currentVisitorToken = verifiedUserId ? `u_${verifiedUserId}` : `a_${finalAnonymousId}`;
    const cookieVisitorToken = req.cookies.get("nanaflix_has_visited")?.value;
    const isReturningVisitor = Boolean(cookieVisitorToken && cookieVisitorToken === currentVisitorToken);

    // 5. Extract Geo Location from Cloudflare and Vercel edge headers (0ms latency, zero external API cost)
    const rawCity = req.headers.get("cf-ipcity") || req.headers.get("x-vercel-ip-city");
    const rawCountryCode = req.headers.get("cf-ipcountry") || req.headers.get("x-vercel-ip-country");
    const rawRegion = req.headers.get("cf-region") || req.headers.get("x-vercel-ip-country-region");

    let cleanCity: string | undefined = undefined;
    if (rawCity) {
      try {
        cleanCity = decodeURIComponent(rawCity).trim();
      } catch {
        cleanCity = rawCity.trim();
      }
    }

    const cleanCountryCode = rawCountryCode ? rawCountryCode.trim().toUpperCase() : undefined;
    let cleanRegion: string | undefined = undefined;
    if (rawRegion) {
      try {
        cleanRegion = decodeURIComponent(rawRegion).trim();
      } catch {
        cleanRegion = rawRegion.trim();
      }
    }

    // Friendly country name mapping
    let cleanCountry: string | undefined = undefined;
    if (cleanCountryCode === "VN") cleanCountry = "Việt Nam";
    else if (cleanCountryCode === "US") cleanCountry = "Hoa Kỳ";
    else if (cleanCountryCode === "SG") cleanCountry = "Singapore";
    else if (cleanCountryCode === "JP") cleanCountry = "Nhật Bản";
    else if (cleanCountryCode === "KR") cleanCountry = "Hàn Quốc";
    else if (cleanCountryCode === "DE") cleanCountry = "Đức";
    else if (cleanCountryCode === "GB" || cleanCountryCode === "UK") cleanCountry = "Vương quốc Anh";
    else if (cleanCountryCode === "FR") cleanCountry = "Pháp";
    else if (cleanCountryCode === "AU") cleanCountry = "Úc";
    else if (cleanCountryCode === "CA") cleanCountry = "Canada";
    else if (cleanCountryCode === "TH") cleanCountry = "Thái Lan";
    else if (cleanCountryCode) cleanCountry = cleanCountryCode;

    // Friendly Vietnamese city / region normalization
    if (cleanCountryCode === "VN") {
      if (cleanCity) {
        const lower = cleanCity.toLowerCase();
        if (lower.includes("ho chi minh") || lower.includes("saigon") || lower === "hcm" || lower.includes("sai gon")) {
          cleanCity = "TP. Hồ Chí Minh";
        } else if (lower.includes("hanoi") || lower.includes("ha noi")) {
          cleanCity = "Hà Nội";
        } else if (lower.includes("da nang") || lower.includes("danang")) {
          cleanCity = "Đà Nẵng";
        } else if (lower.includes("hai phong") || lower.includes("haiphong")) {
          cleanCity = "Hải Phòng";
        } else if (lower.includes("can tho") || lower.includes("cantho")) {
          cleanCity = "Cần Thơ";
        } else if (lower.includes("binh duong") || lower.includes("thuan an") || lower.includes("di an") || lower.includes("thu dau mot")) {
          cleanCity = "Bình Dương";
        } else if (lower.includes("bien hoa") || lower.includes("dong nai")) {
          cleanCity = "Đồng Nai";
        } else if (lower.includes("vung tau") || lower.includes("ba ria")) {
          cleanCity = "Bà Rịa - Vũng Tàu";
        } else if (lower.includes("nha trang") || lower.includes("khanh hoa")) {
          cleanCity = "Khánh Hòa";
        } else if (lower.includes("hue") || lower.includes("thua thien")) {
          cleanCity = "Thừa Thiên Huế";
        } else if (lower.includes("quang ninh") || lower.includes("ha long")) {
          cleanCity = "Quảng Ninh";
        } else if (lower.includes("bac ninh")) {
          cleanCity = "Bắc Ninh";
        } else if (lower.includes("thai nguyen")) {
          cleanCity = "Thái Nguyên";
        } else if (lower.includes("nam dinh")) {
          cleanCity = "Nam Định";
        } else if (lower.includes("thanh hoa")) {
          cleanCity = "Thanh Hóa";
        } else if (lower.includes("nghe an") || lower.includes("vinh")) {
          cleanCity = "Nghệ An";
        } else if (lower.includes("lam dong") || lower.includes("da lat")) {
          cleanCity = "Đà Lạt (Lâm Đồng)";
        }
      } else if (cleanRegion) {
        // Fallback to region if city header was omitted (e.g. mobile 4G/CGNAT)
        const lowerReg = cleanRegion.toLowerCase();
        if (lowerReg.includes("ho chi minh") || lowerReg === "sg") cleanCity = "TP. Hồ Chí Minh";
        else if (lowerReg.includes("hanoi") || lowerReg.includes("ha noi") || lowerReg === "hn") cleanCity = "Hà Nội";
        else if (lowerReg.includes("da nang") || lowerReg === "dn") cleanCity = "Đà Nẵng";
        else if (lowerReg.includes("hai phong") || lowerReg === "hp") cleanCity = "Hải Phòng";
        else if (lowerReg.includes("can tho") || lowerReg === "ct") cleanCity = "Cần Thơ";
        else if (lowerReg.includes("binh duong") || lowerReg === "bd") cleanCity = "Bình Dương";
        else if (lowerReg.includes("dong nai") || lowerReg === "dna") cleanCity = "Đồng Nai";
      }
    }

    // 6. Construct sanitized site_visit payload
    const sanitizedPayload: AnalyticsEventPayload = {
      eventType: "site_visit",
      movieSlug: typeof body.movieSlug === "string" ? body.movieSlug.trim().slice(0, 100) : "home",
      movieTitle: typeof body.movieTitle === "string" ? body.movieTitle.trim().slice(0, 200) : "/",
      userId: verifiedUserId, // Only set if token is verified by server
      anonymousId: finalAnonymousId, // Always populated with valid anonId to satisfy PostgreSQL NOT NULL constraint
      isReturningVisitor,
      country: cleanCountry,
      countryCode: cleanCountryCode,
      region: cleanRegion,
      city: cleanCity,
      deviceInfo: body.deviceInfo
        ? {
            deviceType: body.deviceInfo.deviceType || "desktop",
            os: body.deviceInfo.os || "Other",
            browser: body.deviceInfo.browser || "Other",
          }
        : undefined,
      durationSeconds: 0,
      progressSeconds: 0,
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
