import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabaseAdmin";
import { verifyServerAuth } from "@/lib/serverAuth";
import { checkDistributedRateLimit, getClientIp } from "@/lib/security";
import { getGeoLocationFromIp } from "@/lib/geoip";
import { ClientDeviceProfile } from "@/lib/deviceProfile";

export const maxDuration = 10;

export async function POST(req: NextRequest) {
  try {
    // 1. Rate limiting per IP (Transient check in Redis/memory only — raw IP is NOT stored in DB)
    const clientIp = getClientIp(req);
    const rateLimit = await checkDistributedRateLimit(`device_profile_${clientIp}`, 60, 60);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many profile sync requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rateLimit.resetSeconds) } }
      );
    }

    let body: Partial<ClientDeviceProfile> = {};
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json") || contentType.includes("text/plain")) {
      body = await req.json();
    } else {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    }

    if (!body || !body.guestId) {
      return NextResponse.json({ success: false, error: "Missing guestId" }, { status: 400 });
    }

    // 2. Server-controlled IDs & Time
    const now = Date.now();
    const userAgent = req.headers.get("user-agent") || "";
    const cookieAnonId = req.cookies.get("nanaflix_anon_id")?.value;
    const bodyGuestId = typeof body.guestId === "string" ? body.guestId.trim() : "";

    const isValidAnon = (id: string | null | undefined) =>
      Boolean(id && /^anon_[a-zA-Z0-9_-]{8,64}$/.test(id));

    let finalGuestId: string;
    if (isValidAnon(bodyGuestId)) {
      finalGuestId = bodyGuestId;
    } else if (isValidAnon(cookieAnonId)) {
      finalGuestId = cookieAnonId!;
    } else {
      finalGuestId = "anon_" + Math.random().toString(36).substring(2, 10) + now.toString(36);
    }

    // 3. Server-verified User ID
    const auth = await verifyServerAuth(req);
    const verifiedUserId = auth.isAuthenticated && auth.userId ? auth.userId : null;

    // 4. One browser installation = One unique profile ID (guestId)
    // When a guest logs in, the profile is seamlessly updated with user_id without creating duplicate records
    const profileId = finalGuestId;

    const client = isSupabaseAdminConfigured() ? getSupabaseAdmin() : supabase;
    let existingUserId: string | null = null;
    let existingFirstSeen: number = now;

    if (client) {
      try {
        // Check if a profile record already exists for this guestId
        const { data: existingProf } = await client
          .from("device_profiles")
          .select("id, user_id, first_seen")
          .eq("id", profileId)
          .maybeSingle();

        if (existingProf) {
          existingUserId = existingProf.user_id || null;
          if (typeof existingProf.first_seen === "number" && existingProf.first_seen > 0) {
            existingFirstSeen = existingProf.first_seen;
          }
        }
      } catch {
        // Fallback gracefully
      }
    }

    // Transfer/link user_id: If authenticated, update to verifiedUserId; if not, retain existing user_id if any
    const finalUserId = verifiedUserId || existingUserId;

    // 5. Resolve Approximate GeoLocation (Edge Headers or Cached IP lookup - No raw IP stored)
    const geo = await getGeoLocationFromIp(clientIp, req);

    // 6. Build sanitized record (No raw IP stored to respect privacy)
    const sanitizedRecord = {
      id: profileId,
      guest_id: finalGuestId,
      user_id: finalUserId,
      device_type: ["desktop", "mobile", "tablet"].includes(String(body.deviceType))
        ? body.deviceType
        : "desktop",
      browser: typeof body.browser === "string" ? body.browser.slice(0, 50) : "Other",
      os: typeof body.os === "string" ? body.os.slice(0, 50) : "Other",
      platform: typeof body.platform === "string" ? body.platform.slice(0, 50) : "unknown",
      language: typeof body.language === "string" ? body.language.slice(0, 20) : "vi-VN",
      timezone: geo.timezone || (typeof body.timezone === "string" ? body.timezone.slice(0, 60) : "Asia/Ho_Chi_Minh"),
      country: geo.country ? geo.country.slice(0, 60) : null,
      country_code: geo.countryCode ? geo.countryCode.slice(0, 10) : null,
      region: geo.region ? geo.region.slice(0, 80) : null,
      city: geo.city ? geo.city.slice(0, 80) : null,
      screen_width: typeof body.screenWidth === "number" ? Math.max(0, Math.min(body.screenWidth, 10000)) : 0,
      screen_height: typeof body.screenHeight === "number" ? Math.max(0, Math.min(body.screenHeight, 10000)) : 0,
      viewport_width: typeof body.viewportWidth === "number" ? Math.max(0, Math.min(body.viewportWidth, 10000)) : 0,
      viewport_height: typeof body.viewportHeight === "number" ? Math.max(0, Math.min(body.viewportHeight, 10000)) : 0,
      pixel_ratio: typeof body.pixelRatio === "number" ? Math.max(0.5, Math.min(body.pixelRatio, 10)) : 1,
      touch: Boolean(body.touch),
      device_memory: typeof body.deviceMemory === "number" ? body.deviceMemory : null,
      hardware_concurrency: typeof body.hardwareConcurrency === "number" ? body.hardwareConcurrency : null,
      network_effective_type: body.network?.effectiveType || "unknown",
      network_downlink: typeof body.network?.downlink === "number" ? body.network.downlink : null,
      network_rtt: typeof body.network?.rtt === "number" ? body.network.rtt : null,
      network_save_data: Boolean(body.network?.saveData),
      prefers_dark: Boolean(body.prefersDark),
      prefers_reduced_motion: Boolean(body.prefersReducedMotion),
      codec_h264: Boolean(body.codecs?.h264 ?? true),
      codec_hevc: Boolean(body.codecs?.hevc),
      codec_av1: Boolean(body.codecs?.av1),
      user_agent: userAgent.slice(0, 300),
      first_seen: existingFirstSeen,
      last_seen: now,
    };

    if (client) {
      // Upsert into device_profiles keyed by id (finalGuestId)
      const { error: upsertErr } = await client
        .from("device_profiles")
        .upsert(sanitizedRecord, {
          onConflict: "id",
          ignoreDuplicates: false,
        });

      if (upsertErr) {
        // Fallback update
        await client
          .from("device_profiles")
          .update({
            user_id: sanitizedRecord.user_id,
            device_type: sanitizedRecord.device_type,
            browser: sanitizedRecord.browser,
            os: sanitizedRecord.os,
            platform: sanitizedRecord.platform,
            language: sanitizedRecord.language,
            timezone: sanitizedRecord.timezone,
            country: sanitizedRecord.country,
            country_code: sanitizedRecord.country_code,
            region: sanitizedRecord.region,
            city: sanitizedRecord.city,
            screen_width: sanitizedRecord.screen_width,
            screen_height: sanitizedRecord.screen_height,
            viewport_width: sanitizedRecord.viewport_width,
            viewport_height: sanitizedRecord.viewport_height,
            pixel_ratio: sanitizedRecord.pixel_ratio,
            touch: sanitizedRecord.touch,
            device_memory: sanitizedRecord.device_memory,
            hardware_concurrency: sanitizedRecord.hardware_concurrency,
            network_effective_type: sanitizedRecord.network_effective_type,
            network_downlink: sanitizedRecord.network_downlink,
            network_rtt: sanitizedRecord.network_rtt,
            network_save_data: sanitizedRecord.network_save_data,
            prefers_dark: sanitizedRecord.prefers_dark,
            prefers_reduced_motion: sanitizedRecord.prefers_reduced_motion,
            codec_h264: sanitizedRecord.codec_h264,
            codec_hevc: sanitizedRecord.codec_hevc,
            codec_av1: sanitizedRecord.codec_av1,
            user_agent: sanitizedRecord.user_agent,
            last_seen: now,
          })
          .eq("id", profileId);
      }

      // Safe cleanup of legacy duplicate composite rows if present
      try {
        await client
          .from("device_profiles")
          .delete()
          .eq("guest_id", finalGuestId)
          .neq("id", profileId);
      } catch {
        // Ignore cleanup blips
      }
    }

    const response = NextResponse.json({ success: true, profileId });
    if (finalGuestId !== cookieAnonId) {
      response.cookies.set("nanaflix_anon_id", finalGuestId, {
        maxAge: 31536000,
        path: "/",
        sameSite: "lax",
      });
    }

    return response;
  } catch (err) {
    console.warn("[Device Profile API] Upsert error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 200 });
  }
}

