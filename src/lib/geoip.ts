/**
 * Server-Side GeoIP & Approximate Location Determination for Nanaflix
 * 
 * PRIVACY & ACCURACY NOTICE:
 * 1. APPROXIMATE LOCATION ONLY: This module determines the approximate geographic region
 *    (Country, Country Code, Province/Region, City, Timezone) based on client IP / Edge headers.
 * 2. NOT GPS: It does NOT use GPS, latitude, longitude, street address, or HTML5 Geolocation API.
 * 3. NO FINGERPRINTING: Zero canvas, WebGL, AudioContext, font, or hardware fingerprints.
 * 4. PRIVACY COMPLIANT: Raw client IPs are transiently inspected and are NEVER persistently stored in the database.
 * 5. NETWORK UNCERTAINTY: VPNs, proxies, mobile networks (CGNAT), and ISP gateways may cause
 *    the reported city/region to differ from physical location.
 */

import { NextRequest } from "next/server";
import { Redis } from "@upstash/redis";

export interface GeoLocationInfo {
  country: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
}

export const EMPTY_GEO_LOCATION: Readonly<GeoLocationInfo> = Object.freeze({
  country: null,
  countryCode: null,
  region: null,
  city: null,
  timezone: null,
});

// Private, Loopback, and Bogon IP patterns (RFC 1918, RFC 3927, RFC 4193, RFC 4291)
const PRIVATE_OR_LOCAL_IP_PATTERNS = [
  /^anonymous-client$/i,
  /^localhost$/i,
  /^127\./,                          // 127.0.0.0/8 Loopback
  /^10\./,                           // 10.0.0.0/8 Private
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // 172.16.0.0/12 Private
  /^192\.168\./,                     // 192.168.0.0/16 Private
  /^169\.254\./,                     // 169.254.0.0/16 Link-local
  /^0\.0\.0\.0$/,
  /^::1$/,                           // IPv6 Loopback
  /^fe80:/i,                         // IPv6 Link-Local
  /^fc00:/i,                         // IPv6 Unique Local
  /^fd[0-9a-f]{2}:/i,                // IPv6 Unique Local
];

/**
 * Checks whether an IP address is a private, local, or invalid client IP
 */
export function isPrivateOrLocalIp(ip: string | null | undefined): boolean {
  if (!ip || typeof ip !== "string") return true;
  const trimmed = ip.trim().toLowerCase();
  if (!trimmed || trimmed === "unknown") return true;

  return PRIVATE_OR_LOCAL_IP_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Convert ISO 3166-1 alpha-2 country code to English standard name
 */
export function getCountryNameFromCode(countryCode: string | null | undefined): string | null {
  if (!countryCode || typeof countryCode !== "string") return null;
  const cleanCode = countryCode.trim().toUpperCase();
  if (cleanCode.length !== 2) return null;

  try {
    if (typeof Intl !== "undefined" && typeof Intl.DisplayNames === "function") {
      const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
      const resolved = displayNames.of(cleanCode);
      if (resolved) return resolved;
    }
  } catch {
    // Intl resolution fallback
  }

  const COMMON_ISO_MAP: Record<string, string> = {
    VN: "Vietnam",
    US: "United States",
    JP: "Japan",
    KR: "South Korea",
    CN: "China",
    HK: "Hong Kong",
    TW: "Taiwan",
    TH: "Thailand",
    SG: "Singapore",
    MY: "Malaysia",
    ID: "Indonesia",
    PH: "Philippines",
    IN: "India",
    GB: "United Kingdom",
    FR: "France",
    DE: "Germany",
    CA: "Canada",
    AU: "Australia",
    RU: "Russia",
    BR: "Brazil",
  };

  return COMMON_ISO_MAP[cleanCode] || cleanCode;
}

/**
 * Safely decode URL-encoded edge header values (e.g., "Ho%20Chi%20Minh" -> "Ho Chi Minh")
 */
function safeDecodeHeader(val: string | null | undefined): string | null {
  if (!val) return null;
  const trimmed = val.trim();
  if (!trimmed) return null;

  try {
    return decodeURIComponent(trimmed).replace(/\+/g, " ");
  } catch {
    return trimmed;
  }
}

// In-Memory L1 Cache for GeoIP resolutions (TTL: 24 hours)
interface GeoCacheEntry {
  data: GeoLocationInfo;
  expiresAt: number;
}
const geoL1Cache = new Map<string, GeoCacheEntry>();

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Upstash Redis client singleton for distributed L2 cache
let geoRedisClient: Redis | null = null;
let isGeoRedisChecked = false;

function getGeoRedis(): Redis | null {
  if (isGeoRedisChecked) return geoRedisClient;
  isGeoRedisChecked = true;

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    geoRedisClient = null;
    return null;
  }

  try {
    geoRedisClient = new Redis({ url, token });
    return geoRedisClient;
  } catch {
    geoRedisClient = null;
    return null;
  }
}

/**
 * Extract GeoLocation directly from Edge Infrastructure Headers (Vercel & Cloudflare).
 * This provides 0ms lookup latency, high accuracy, and ZERO external third-party network calls.
 */
export function extractGeoLocationFromHeaders(headers: Headers): GeoLocationInfo | null {
  // 1. Vercel Edge Headers
  const vercelCountryCode = headers.get("x-vercel-ip-country")?.trim().toUpperCase();
  const vercelRegion = safeDecodeHeader(headers.get("x-vercel-ip-country-region"));
  const vercelCity = safeDecodeHeader(headers.get("x-vercel-ip-city"));
  const vercelTimezone = safeDecodeHeader(headers.get("x-vercel-ip-timezone"));

  if (vercelCountryCode && vercelCountryCode.length === 2) {
    return {
      country: getCountryNameFromCode(vercelCountryCode),
      countryCode: vercelCountryCode,
      region: vercelRegion || null,
      city: vercelCity || null,
      timezone: vercelTimezone || null,
    };
  }

  // 2. Cloudflare Edge Headers
  const cfCountryCode = headers.get("cf-ipcountry")?.trim().toUpperCase();
  const cfRegion = safeDecodeHeader(headers.get("cf-region") || headers.get("cf-region-code"));
  const cfCity = safeDecodeHeader(headers.get("cf-ipcity"));
  const cfTimezone = safeDecodeHeader(headers.get("cf-timezone"));

  if (cfCountryCode && cfCountryCode.length === 2 && cfCountryCode !== "XX" && cfCountryCode !== "T1") {
    return {
      country: getCountryNameFromCode(cfCountryCode),
      countryCode: cfCountryCode,
      region: cfRegion || null,
      city: cfCity || null,
      timezone: cfTimezone || null,
    };
  }

  return null;
}

/**
 * Query a fallback public GeoIP provider with a strict timeout and fail-open guarantee.
 * Only invoked when running outside Vercel/Cloudflare edge (e.g., local testing or custom node runtime).
 */
async function fetchFallbackGeoFromIp(ip: string, timeoutMs = 800): Promise<GeoLocationInfo> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // freeipapi.com: Free, SSL, no API key required, supports IPv4 & IPv6, rate limit 60 req/min
    const res = await fetch(`https://freeipapi.com/api/json/${encodeURIComponent(ip)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return { ...EMPTY_GEO_LOCATION };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();
    const countryCode = typeof data.countryCode === "string" ? data.countryCode.trim().toUpperCase() : null;
    const countryName = typeof data.countryName === "string" ? data.countryName.trim() : getCountryNameFromCode(countryCode);
    const region = typeof data.regionName === "string" ? data.regionName.trim() : null;
    const city = typeof data.cityName === "string" ? data.cityName.trim() : null;
    const timezone = typeof data.timeZone === "string" ? data.timeZone.trim() : null;

    if (!countryCode && !countryName) {
      return { ...EMPTY_GEO_LOCATION };
    }

    return {
      country: countryName || null,
      countryCode: countryCode || null,
      region: region || null,
      city: city || null,
      timezone: timezone || null,
    };
  } catch {
    clearTimeout(timeout);
    return { ...EMPTY_GEO_LOCATION };
  }
}

/**
 * Main server function to determine approximate user location from IP / Request.
 * 
 * Execution Priority:
 * 1. Edge Headers from NextRequest (0ms, 0 external calls, 100% private)
 * 2. L1 RAM Cache by IP (0ms)
 * 3. L2 Redis Cache by IP (1-5ms)
 * 4. Fallback free GeoIP service with 800ms timeout
 * 
 * @param ip Client IP address
 * @param req Optional NextRequest to extract Edge Headers
 * @returns {GeoLocationInfo} Approximate location object (Never throws, returns nulls on failure)
 */
export async function getGeoLocationFromIp(
  ip: string,
  req?: NextRequest | Headers | null
): Promise<GeoLocationInfo> {
  // 1. Try resolving via Edge Infrastructure Headers if available
  if (req) {
    const headers = "headers" in req ? req.headers : req;
    const edgeGeo = extractGeoLocationFromHeaders(headers);
    if (edgeGeo && (edgeGeo.country || edgeGeo.countryCode)) {
      return edgeGeo;
    }
  }

  // 2. Filter out private, local, or invalid IPs
  if (isPrivateOrLocalIp(ip)) {
    return { ...EMPTY_GEO_LOCATION };
  }

  const cleanIp = ip.trim();

  // 3. Check L1 In-Memory Cache
  const now = Date.now();
  const cachedL1 = geoL1Cache.get(cleanIp);
  if (cachedL1 && cachedL1.expiresAt > now) {
    return cachedL1.data;
  }

  // 4. Check L2 Upstash Redis Cache
  const redis = getGeoRedis();
  const redisKey = `geo:${cleanIp}`;

  if (redis) {
    try {
      const cachedL2 = await redis.get<GeoLocationInfo>(redisKey);
      if (cachedL2 && typeof cachedL2 === "object") {
        geoL1Cache.set(cleanIp, { data: cachedL2, expiresAt: now + CACHE_TTL_MS });
        return cachedL2;
      }
    } catch {
      // Fail open to continue resolution
    }
  }

  // 5. Fallback Lookup
  const geoResult = await fetchFallbackGeoFromIp(cleanIp);

  // 6. Cache valid results
  if (geoResult.country || geoResult.countryCode) {
    geoL1Cache.set(cleanIp, { data: geoResult, expiresAt: now + CACHE_TTL_MS });
    if (redis) {
      redis.set(redisKey, JSON.stringify(geoResult), { ex: 24 * 60 * 60 }).catch(() => {});
    }
  }

  return geoResult;
}

/**
 * Convenient helper to resolve approximate GeoLocation directly from NextRequest
 */
export async function getGeoLocationFromRequest(req: NextRequest, explicitIp?: string): Promise<GeoLocationInfo> {
  const edgeGeo = extractGeoLocationFromHeaders(req.headers);
  if (edgeGeo && (edgeGeo.country || edgeGeo.countryCode)) {
    return edgeGeo;
  }

  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const ip = explicitIp || (forwardedFor ? forwardedFor.split(",")[0].trim() : (realIp ? realIp.trim() : ""));

  return getGeoLocationFromIp(ip, req);
}
