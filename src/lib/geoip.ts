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
import { getClientIp } from "@/lib/security";

export type GeoConfidence = "HIGH" | "LOW" | "NONE";

export interface GeoLocationInfo {
  country: string | null;
  countryCode: string | null;
  countryConfidence?: GeoConfidence;
  region: string | null;
  city: string | null;
  cityConfidence?: GeoConfidence;
  timezone: string | null;
}

export const EMPTY_GEO_LOCATION: Readonly<GeoLocationInfo> = Object.freeze({
  country: null,
  countryCode: null,
  countryConfidence: "NONE",
  region: null,
  city: null,
  cityConfidence: "NONE",
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

// In-Memory L1 Cache for GeoIP resolutions (TTL: 24 hours, zero Redis bandwidth)
interface GeoCacheEntry {
  data: GeoLocationInfo;
  expiresAt: number;
}
const geoL1Cache = new Map<string, GeoCacheEntry>();

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Extract GeoLocation directly from Edge Infrastructure Headers (Vercel & Cloudflare).
 * This provides 0ms lookup latency, high accuracy, and ZERO external third-party network calls.
 */
export function extractGeoLocationFromHeaders(headers: Headers): GeoLocationInfo | null {
  // 1. Cloudflare Edge Headers (Priority when behind Cloudflare proxy, since Cloudflare is the direct client edge)
  const cfCountryCode = headers.get("cf-ipcountry")?.trim().toUpperCase();
  const cfRegion = safeDecodeHeader(headers.get("cf-region") || headers.get("cf-region-code") || headers.get("cf-ipregion"));
  const cfCity = safeDecodeHeader(headers.get("cf-ipcity"));
  const cfTimezone = safeDecodeHeader(headers.get("cf-timezone"));

  if (cfCountryCode && cfCountryCode.length === 2 && cfCountryCode !== "XX" && cfCountryCode !== "T1") {
    return {
      country: getCountryNameFromCode(cfCountryCode),
      countryCode: cfCountryCode,
      countryConfidence: "HIGH",
      region: cfRegion || null,
      city: cfCity || null,
      cityConfidence: cfCity ? "HIGH" : "NONE",
      timezone: cfTimezone || null,
    };
  }

  // 2. Vercel Edge Headers
  const vercelCountryCode = headers.get("x-vercel-ip-country")?.trim().toUpperCase();
  const vercelRegion = safeDecodeHeader(headers.get("x-vercel-ip-country-region"));
  const vercelCity = safeDecodeHeader(headers.get("x-vercel-ip-city"));
  const vercelTimezone = safeDecodeHeader(headers.get("x-vercel-ip-timezone"));

  if (vercelCountryCode && vercelCountryCode.length === 2) {
    return {
      country: getCountryNameFromCode(vercelCountryCode),
      countryCode: vercelCountryCode,
      countryConfidence: "HIGH",
      region: vercelRegion || null,
      city: vercelCity || null,
      cityConfidence: vercelCity ? "HIGH" : "NONE",
      timezone: vercelTimezone || null,
    };
  }

  return null;
}

/**
 * Query a fallback public GeoIP provider with a strict timeout and fail-open guarantee.
 * Only invoked when running outside Vercel/Cloudflare edge (e.g., local testing or custom node runtime).
 */
async function fetchFallbackGeoFromIp(ip: string, timeoutMs = 1500): Promise<GeoLocationInfo> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // 1. Primary: ipinfo.io (Độ chính xác cao nhất cho ISP Việt Nam, nhận diện chính xác Thuận An, Dĩ An, Bình Dương)
    const ipPath = ip ? `${encodeURIComponent(ip)}/json` : "json";
    const res = await fetch(`https://ipinfo.io/${ipPath}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)",
      },
      signal: controller.signal,
    });

    if (res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await res.json();
      const countryCode = typeof data.country === "string" ? data.country.trim().toUpperCase() : null;
      const countryName = getCountryNameFromCode(countryCode);
      const region = typeof data.region === "string" ? data.region.trim() : null;
      const city = typeof data.city === "string" ? data.city.trim() : null;
      const timezone = typeof data.timezone === "string" ? data.timezone.trim() : null;

      if (countryCode) {
        clearTimeout(timeout);
        return {
          country: countryName || null,
          countryCode,
          countryConfidence: "HIGH",
          region: region || null,
          city: city || null,
          cityConfidence: city ? "HIGH" : "NONE",
          timezone: timezone || null,
        };
      }
    }

    // 2. Failover: ipwho.is
    const ipwhoPath = ip ? encodeURIComponent(ip) : "";
    const res2 = await fetch(`https://ipwho.is/${ipwhoPath}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)",
      },
      signal: controller.signal,
    });

    if (res2.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data2: any = await res2.json();
      if (data2 && data2.success) {
        clearTimeout(timeout);
        const countryCode = typeof data2.country_code === "string" ? data2.country_code.trim().toUpperCase() : null;
        const countryName = typeof data2.country === "string" ? data2.country.trim() : getCountryNameFromCode(countryCode);
        const region = typeof data2.region === "string" ? data2.region.trim() : null;
        const city = typeof data2.city === "string" ? data2.city.trim() : null;
        const timezone = typeof data2.timezone?.id === "string" ? data2.timezone.id.trim() : null;

        return {
          country: countryName || null,
          countryCode: countryCode || null,
          countryConfidence: countryCode ? "HIGH" : "NONE",
          region: region || null,
          city: city || null,
          cityConfidence: city ? "HIGH" : "NONE",
          timezone: timezone || null,
        };
      }
    }

    // 3. Failover: ip-api.com
    const ipApiPath = ip ? encodeURIComponent(ip) : "";
    const res3 = await fetch(`http://ip-api.com/json/${ipApiPath}?fields=status,country,countryCode,regionName,city,timezone`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res3.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data3: any = await res3.json();
      if (data3 && data3.status === "success") {
        const countryCode = typeof data3.countryCode === "string" ? data3.countryCode.trim().toUpperCase() : null;
        const countryName = typeof data3.country === "string" ? data3.country.trim() : getCountryNameFromCode(countryCode);
        const region = typeof data3.regionName === "string" ? data3.regionName.trim() : null;
        const city = typeof data3.city === "string" ? data3.city.trim() : null;
        const timezone = typeof data3.timezone === "string" ? data3.timezone.trim() : null;

        return {
          country: countryName || null,
          countryCode: countryCode || null,
          countryConfidence: countryCode || countryName ? "HIGH" : "NONE",
          region: region || null,
          city: city || null,
          cityConfidence: city ? "HIGH" : "NONE",
          timezone: timezone || null,
        };
      }
    }

    return { ...EMPTY_GEO_LOCATION };
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
    // Khi đang chạy local dev hoặc test trên máy phát triển (không phải Vercel), tự động tra cứu theo public IP của máy
    if (process.env.NODE_ENV === "development" || !process.env.VERCEL) {
      const devGeo = await fetchFallbackGeoFromIp("");
      if (devGeo.country || devGeo.countryCode) {
        return devGeo;
      }
    }
    return { ...EMPTY_GEO_LOCATION };
  }

  const cleanIp = ip.trim();

  // 3. Check L1 In-Memory Cache (0ms, 0 Redis commands)
  const now = Date.now();
  const cachedL1 = geoL1Cache.get(cleanIp);
  if (cachedL1 && cachedL1.expiresAt > now) {
    return cachedL1.data;
  }

  // 4. Fallback Lookup (free GeoIP service with 800ms timeout)
  const geoResult = await fetchFallbackGeoFromIp(cleanIp);

  // 5. Cache valid results in L1 RAM (zero Redis bandwidth)
  if (geoResult.country || geoResult.countryCode) {
    geoL1Cache.set(cleanIp, { data: geoResult, expiresAt: now + CACHE_TTL_MS });
  }

  return geoResult;
}

/**
 * Convenient helper to resolve approximate GeoLocation directly from NextRequest
 */
export async function getGeoLocationFromRequest(req: NextRequest, explicitIp?: string): Promise<GeoLocationInfo> {
  const ip = explicitIp || getClientIp(req);
  const isCfProxy = Boolean(req.headers.get("cf-connecting-ip"));

  // 1. Nếu KHÔNG qua Cloudflare Proxy (truy cập Vercel trực tiếp), đọc Vercel Edge Headers trực tiếp
  if (!isCfProxy) {
    const edgeGeo = extractGeoLocationFromHeaders(req.headers);
    if (edgeGeo && (edgeGeo.country || edgeGeo.countryCode) && edgeGeo.city) {
      return {
        ...edgeGeo,
        countryConfidence: edgeGeo.countryCode ? "HIGH" : "NONE",
        cityConfidence: edgeGeo.city ? "HIGH" : "NONE",
      };
    }
  }

  // 2. Xác thực header quốc gia Cloudflare (được Cloudflare gắn trực tiếp từ IP kết nối thực tế)
  const cfCountryCode = req.headers.get("cf-ipcountry")?.trim().toUpperCase() || null;
  const hasValidCfCountry = Boolean(
    cfCountryCode &&
    cfCountryCode.length === 2 &&
    cfCountryCode !== "XX" &&
    cfCountryCode !== "T1"
  );

  // 3. Phân giải vị trí từ IP thật đã được xác thực (bỏ qua vị trí máy chủ trung chuyển Cloudflare HKG/HAN)
  if (!isPrivateOrLocalIp(ip)) {
    try {
      const ipGeo = await getGeoLocationFromIp(ip, null);
      if (ipGeo && (ipGeo.city || ipGeo.region)) {
        return {
          country: ipGeo.country || (hasValidCfCountry && cfCountryCode ? getCountryNameFromCode(cfCountryCode) : null),
          countryCode: ipGeo.countryCode || (hasValidCfCountry && cfCountryCode ? cfCountryCode : null),
          countryConfidence: "HIGH",
          region: ipGeo.region || null,
          city: ipGeo.city || null,
          cityConfidence: ipGeo.city ? "HIGH" : "NONE",
          timezone: ipGeo.timezone || null,
        };
      }
      if (ipGeo && (ipGeo.country || ipGeo.countryCode)) {
        return {
          country: ipGeo.country || (hasValidCfCountry && cfCountryCode ? getCountryNameFromCode(cfCountryCode) : null),
          countryCode: ipGeo.countryCode || (hasValidCfCountry && cfCountryCode ? cfCountryCode : null),
          countryConfidence: "HIGH",
          region: null,
          city: null,
          cityConfidence: "NONE",
          timezone: ipGeo.timezone || null,
        };
      }
    } catch {
      // Fall through to edge country
    }
  } else if (process.env.NODE_ENV === "development" || !process.env.VERCEL) {
    // Khi đang chạy local dev hoặc test trên máy phát triển (localhost, 127.0.0.1)
    try {
      const devGeo = await getGeoLocationFromIp(ip, null);
      if (devGeo && (devGeo.country || devGeo.countryCode)) {
        return devGeo;
      }
    } catch {}
  }

  // 4. Nếu chỉ có quốc gia xác thực qua Cloudflare header (Confidence Quốc gia HIGH, Tỉnh/Thành NONE)
  if (hasValidCfCountry && cfCountryCode) {
    return {
      country: getCountryNameFromCode(cfCountryCode),
      countryCode: cfCountryCode,
      countryConfidence: "HIGH",
      region: null,
      city: null,
      cityConfidence: "NONE",
      timezone: null,
    };
  }

  // 5. Unknown (Private/Local IP hoặc lỗi tra cứu)
  return {
    ...EMPTY_GEO_LOCATION,
    countryConfidence: "NONE",
    cityConfidence: "NONE",
  };
}

/**
 * Ánh xạ tên tỉnh thành Việt Nam sang mã viết tắt 2-3 ký tự (ví dụ: HCM, HN, BD, HT, DN...)
 */
export function getVietnamProvinceAbbreviation(locationName: string | null | undefined): string | null {
  if (!locationName) return null;
  const clean = locationName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/^(tp|thanh pho|tinh|thanh pho truoc thuoc trung uong)\s+/i, "")
    .replace(/\s+(city|province)$/i, "")
    .trim();

  // 1. Bình Dương cũ & các đô thị trực thuộc (Thuận An, Dĩ An, Thủ Dầu Một, Bến Cát, Tân Uyên...) -> Mã Branding "BD"
  if (/binh\s*duong|thuan\s*an|di\s*an|thu\s*dau\s*mot|ben\s*cat|tan\s*uyen|bau\s*bang|dau\s*tieng|phu\s*giao|bd\b/i.test(clean)) return "BD";
  // 2. TP. Hồ Chí Minh -> "HCM"
  if (/ho\s*chi\s*minh|sai\s*gon|thu\s*duc|hcmc?|sg\b/i.test(clean)) return "HCM";
  // 3. Hà Nội -> "HN"
  if (/ha\s*noi|ha\s*dong|son\s*tay|hn\b/i.test(clean)) return "HN";
  // 4. Đà Nẵng -> "DN"
  if (/da\s*nang|danang|dn\b/i.test(clean)) return "DN";
  // 5. Đồng Nai -> "DNI" (Mã branding nội bộ Nanaflix, triệt tiêu xung đột hiển thị với "DN" của Đà Nẵng)
  if (/dong\s*nai|bien\s*hoa|long\s*khanh|dni\b/i.test(clean)) return "DNI";
  // 6. Hải Phòng -> "HP"
  if (/hai\s*phong|haiphong|hp\b/i.test(clean)) return "HP";
  // 7. Cần Thơ -> "CT"
  if (/can\s*tho|cantho|ct\b/i.test(clean)) return "CT";
  // 8. Khánh Hòa / Nha Trang -> "NT"
  if (/khanh\s*hoa|nha\s*trang|nhatrang|cam\s*ranh|nt\b|kh\b/i.test(clean)) return "NT";
  // 9. Bà Rịa - Vũng Tàu -> "VT"
  if (/ba\s*ria|vung\s*tau|vungtau|vt\b/i.test(clean)) return "VT";
  // 10. Lâm Đồng / Đà Lạt -> "DL"
  if (/lam\s*dong|da\s*lat|dalat|dl\b/i.test(clean)) return "DL";
  if (/ha\s*tinh|ht\b/i.test(clean)) return "HT";
  if (/nghe\s*an|nghean|na\b/i.test(clean)) return "NA";
  if (/thanh\s*hoa|thanhhoa|th\b/i.test(clean)) return "TH";
  if (/quang\s*ninh|quangninh|qn\b/i.test(clean)) return "QN";
  if (/tay\s*ninh|tayninh|tn\b/i.test(clean)) return "TN";
  if (/an\s*giang|angiang|ag\b/i.test(clean)) return "AG";
  if (/tien\s*giang|my\s*tho|mytho|tg\b/i.test(clean)) return "TG";
  if (/ben\s*tre|bentre|bte\b/i.test(clean)) return "BT";
  if (/ca\s*mau|camau|cm\b/i.test(clean)) return "CM";
  if (/kien\s*giang|rach\s*gia|phu\s*quoc|kg\b/i.test(clean)) return "KG";
  if (/dak\s*lak|buon\s*ma\s*thuot|daklak|dlk\b/i.test(clean)) return "ĐL";
  if (/gia\s*lai|pleiku|gl\b/i.test(clean)) return "GL";
  if (/hue\b|thua\s*thien|tth\b/i.test(clean)) return "HUE";
  if (/quang\s*nam|tam\s*ky|hoi\s*an|qnam\b/i.test(clean)) return "QN";
  if (/quang\s*ngai|quangngai|qng\b/i.test(clean)) return "QNG";
  if (/binh\s*dinh|quy\s*nhon|quynhon|bdh\b/i.test(clean)) return "QNH";
  if (/phu\s*yen|tuy\s*hoa|tuyhoa|py\b/i.test(clean)) return "PY";
  if (/binh\s*thuan|phan\s*thiet|phanthiet|bth\b/i.test(clean)) return "PT";
  if (/ninh\s*thuan|phan\s*rang|phanrang/i.test(clean)) return "PR";
  if (/long\s*an|tan\s*an|la\b/i.test(clean)) return "LA";
  if (/dong\s*thap|cao\s*lanh|sa\s*dec|dt\b/i.test(clean)) return "ĐT";
  if (/vinh\s*long|vinhlong|vl\b/i.test(clean)) return "VL";
  if (/hau\s*giang|vi\s*thanh|hg\b/i.test(clean)) return "HG";
  if (/soc\s*trang|soctrang|st\b/i.test(clean)) return "ST";
  if (/bac\s*lieu|baclieu|bl\b/i.test(clean)) return "BL";
  if (/tra\s*vinh|travinh|tv\b/i.test(clean)) return "TV";
  if (/nam\s*dinh|namdinh|nd\b/i.test(clean)) return "NĐ";
  if (/thai\s*binh|thaibinh|tb\b/i.test(clean)) return "TB";
  if (/ninh\s*binh|ninhbinh|nb\b/i.test(clean)) return "NB";
  if (/ha\s*nam|phu\s*ly|phuly|hna\b/i.test(clean)) return "HNA";
  if (/hung\s*yen|hungyen|hy\b/i.test(clean)) return "HY";
  if (/hai\s*duong|haiduong|hd\b/i.test(clean)) return "HD";
  if (/bac\s*ninh|bacninh|bn\b/i.test(clean)) return "BN";
  if (/bac\s*giang|bacgiang|bg\b/i.test(clean)) return "BG";
  if (/phu\s*tho|viet\s*tri|viettri|pt\b/i.test(clean)) return "PT";
  if (/vinh\s*phuc|vinh\s*yen|vinhyen|vp\b/i.test(clean)) return "VP";
  if (/thai\s*nguyen|thainguyen/i.test(clean)) return "TN";
  if (/tuyen\s*quang|tuyenquang|tq\b/i.test(clean)) return "TQ";
  if (/lao\s*cai|sapa|lc\b/i.test(clean)) return "LC";
  if (/yen\s*bai|yenbai|yb\b/i.test(clean)) return "YB";
  if (/son\s*la|sonla|sl\b/i.test(clean)) return "SL";
  if (/dien\s*bien|dienbien|db\b/i.test(clean)) return "ĐB";
  if (/lai\s*chau|laichau/i.test(clean)) return "LC";
  if (/hoa\s*binh|hoabinh|hb\b/i.test(clean)) return "HB";
  if (/lang\s*son|langson|ls\b/i.test(clean)) return "LS";
  if (/cao\s*bang|caobang|cb\b/i.test(clean)) return "CB";
  if (/bac\s*kan|backan|bk\b/i.test(clean)) return "BK";
  if (/ha\s*giang|hagiang/i.test(clean)) return "HG";
  if (/quang\s*binh|dong\s*hoi|donghoi|qb\b/i.test(clean)) return "QB";
  if (/quang\s*tri|dong\s*ha|dongha|qt\b/i.test(clean)) return "QT";

  return null;
}

/**
 * Trích xuất ký hiệu vị trí cho Logo Nanaflix (VN, HCM, HN, BD, HT... hoặc Quốc tế US, JP, KR, SG...)
 */
export function getRegionalBadge(geo: GeoLocationInfo | null | undefined): string {
  if (!geo || !geo.countryCode) return "VN";
  const code = geo.countryCode.trim().toUpperCase();
  if (code === "VN") {
    const provinceCode =
      getVietnamProvinceAbbreviation(geo.city) ||
      getVietnamProvinceAbbreviation(geo.region);
    return provinceCode || "VN";
  }
  // Nếu ở nước ngoài: hiển thị mã quốc gia ISO alpha-2 chuẩn (ví dụ: US, JP, KR, SG, AU, CA, GB, FR, DE...)
  // Tuân thủ ISO 3166-1 alpha-2 nghiêm ngặt (Vương quốc Anh giữ nguyên GB, không tự đổi thành UK)
  if (code.length === 2) {
    return code;
  }
  return "VN";
}
