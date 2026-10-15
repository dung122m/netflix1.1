import { AthleteProfile } from "./types";

// In-memory cache cho hồ sơ cầu thủ (TTL 24 giờ vì thông tin tiểu sử và ảnh không thay đổi theo phút)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;

interface CacheEntry {
  data: AthleteProfile;
  expireAt: number;
}

const athleteCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<AthleteProfile | null>>();

/**
 * Làm sạch và chuẩn hóa text an toàn
 */
function sanitizeString(str?: string): string | undefined {
  if (!str || typeof str !== "string") return undefined;
  const trimmed = str.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Danh sách hostname được phép tải ảnh/cờ nhằm ngăn chặn SSRF và truy cập tài nguyên nội bộ
 */
const ALLOWED_PHOTO_HOSTS = new Set([
  "upload.wikimedia.org",
  "commons.wikimedia.org",
  "thumb.wikimedia.org",
  "a.espncdn.com",
  "espncdn.com",
]);

const ALLOWED_FLAG_HOSTS = new Set([
  "a.espncdn.com",
  "espncdn.com",
]);

/**
 * Xác thực URL an toàn: Bắt buộc HTTPS và thuộc danh sách hostname cho phép
 */
function isSafeHttpsUrl(urlStr?: string, allowedHosts?: Set<string>): string | undefined {
  if (!urlStr || typeof urlStr !== "string") return undefined;
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "https:") return undefined;
    const hostname = parsed.hostname.toLowerCase();
    if (allowedHosts && !allowedHosts.has(hostname)) {
      return undefined;
    }
    return parsed.href;
  } catch {
    return undefined;
  }
}

/**
 * Kiểm tra giấy phép bản quyền có phải là giấy phép mở/miễn phí được phép sử dụng hay không
 * BẮT BUỘC: Nếu không xác minh được giấy phép mở hợp lệ hoặc thuộc diện Fair Use / All Rights Reserved, từ chối sử dụng ảnh!
 */
export function isPermittedOpenLicense(license?: string): boolean {
  if (!license || typeof license !== "string") return false;
  const l = license.trim().toLowerCase();
  // Từ chối tuyệt đối các loại bản quyền đóng, fair use hoặc giới hạn thương mại/sử dụng
  if (
    l.includes("all rights reserved") ||
    l.includes("fair use") ||
    l.includes("copyrighted") ||
    l.includes("restricted") ||
    l.includes("non-commercial") ||
    l.includes("nc")
  ) {
    return false;
  }
  // Chấp nhận Creative Commons, Public Domain, CC0, CC-BY, GFDL, v.v.
  return /^(cc|creative commons|public domain|pd|cc0|gfdl|attribution|free)/i.test(l);
}

/**
 * Truy vấn thông tin tiểu sử từ ESPN Core Athlete API (chính thức, dựa trên athlete ID)
 */
async function fetchEspnCoreAthlete(athleteId: string): Promise<Partial<AthleteProfile> | null> {
  try {
    const url = `https://sports.core.api.espn.com/v2/sports/soccer/athletes/${encodeURIComponent(athleteId)}`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(2500),
    });

    if (!res.ok) return null;

    const d = await res.json();
    let birthPlace: string | undefined = undefined;
    if (d.birthPlace?.city) {
      birthPlace = [d.birthPlace.city, d.birthPlace.country].filter(Boolean).join(", ");
    }

    const safeFlag = isSafeHttpsUrl(d.flag?.href, ALLOWED_FLAG_HOSTS);
    const safeHeadshot = isSafeHttpsUrl(d.headshot?.href, ALLOWED_PHOTO_HOSTS);

    return {
      displayName: d.displayName || d.fullName || "",
      citizenship: sanitizeString(d.citizenship),
      flagUrl: safeFlag,
      dateOfBirth: sanitizeString(d.dateOfBirth),
      age: typeof d.age === "number" ? d.age : undefined,
      height: sanitizeString(d.displayHeight),
      weight: sanitizeString(d.displayWeight),
      birthPlace,
      photoUrl: safeHeadshot,
      photoSource: safeHeadshot ? "espn" : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Lấy thông tin bản quyền và link ảnh trực tiếp từ Wikimedia Commons
 */
async function fetchCommonsImageInfo(fileName: string): Promise<{
  url: string;
  license?: string;
  licenseUrl?: string;
  attribution?: string;
} | null> {
  try {
    const cleanName = fileName.replace(/^File:/i, "");
    const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(
      cleanName,
    )}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=240&format=json`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Nanaflix/1.0 (https://nanaflix.vercel.app; support@nanaflix.com)",
      },
      signal: AbortSignal.timeout(2500),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const pages = data.query?.pages;
    if (!pages) return null;

    const page = Object.values(pages)[0] as any;
    const info = page?.imageinfo?.[0];
    const candidateUrl = info?.thumburl || info?.url;
    if (!candidateUrl) return null;

    // 1. Kiểm tra an toàn URL ảnh (bắt buộc HTTPS & host upload.wikimedia.org / thumb.wikimedia.org)
    const safeUrl = isSafeHttpsUrl(candidateUrl, ALLOWED_PHOTO_HOSTS);
    if (!safeUrl) return null;

    // 2. Xác minh giấy phép: BẮT BUỘC phải là giấy phép mở đã được xác minh
    const license = info.extmetadata?.LicenseShortName?.value || info.extmetadata?.UsageTerms?.value;
    const licenseClean = sanitizeString(license);
    if (!licenseClean || !isPermittedOpenLicense(licenseClean)) {
      return null;
    }

    const licenseUrl = isSafeHttpsUrl(info.extmetadata?.LicenseUrl?.value);
    const artistRaw = info.extmetadata?.Artist?.value || info.extmetadata?.Credit?.value;
    const attribution = artistRaw ? artistRaw.replace(/<[^>]+>/g, "").trim() : undefined;

    return {
      url: safeUrl,
      license: licenseClean,
      licenseUrl,
      attribution: sanitizeString(attribution),
    };
  } catch {
    return null;
  }
}

/**
 * Tìm ảnh bổ sung từ Wikidata / Wikimedia Commons dựa trên ESPN Player ID (P3681) hoặc tên + thuộc tính đối soát độc lập
 */
async function fetchWikidataPhotoFallback(
  athleteId: string,
  name?: string,
  verifiedDob?: string,
  verifiedCountry?: string,
): Promise<{
  photoUrl: string;
  photoSource: "wikimedia";
  photoLicense?: string;
  photoLicenseUrl?: string;
  photoAttribution?: string;
} | null> {
  // 1. Ưu tiên cấp 1: Đối soát chính xác 100% bằng ESPN Player ID (P3681) trên Wikidata
  try {
    // Escape ký tự đặc biệt trong ID để tránh SPARQL injection
    const safeId = athleteId.replace(/["\\]/g, "").trim();
    if (!safeId) return null;

    const sparql = `SELECT ?item ?image WHERE {
      ?item wdt:P3681 "${safeId}".
      ?item wdt:P18 ?image.
    } LIMIT 1`;

    const qUrl = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`;
    const wRes = await fetch(qUrl, {
      headers: {
        "User-Agent": "Nanaflix/1.0 (https://nanaflix.vercel.app; support@nanaflix.com)",
      },
      signal: AbortSignal.timeout(2500),
    });

    if (wRes.ok) {
      const wData = await wRes.json();
      const rawImageUri = wData.results?.bindings?.[0]?.image?.value;
      if (rawImageUri) {
        // Tách tên file từ URI
        const fileName = decodeURIComponent(rawImageUri.split("/Special:FilePath/")[1] || rawImageUri.split("/").pop());
        const commonsInfo = await fetchCommonsImageInfo(fileName);
        if (commonsInfo && commonsInfo.license) {
          return {
            photoUrl: commonsInfo.url,
            photoSource: "wikimedia",
            photoLicense: commonsInfo.license,
            photoLicenseUrl: commonsInfo.licenseUrl,
            photoAttribution: commonsInfo.attribution,
          };
        }
      }
    }
  } catch {}

  // 2. Cấp 2: Tìm theo tên nhưng BẮT BUỘC phải đối soát chéo độc lập với Ngày sinh
  if (!name || !verifiedDob) {
    return null;
  }

  const safeName = name.slice(0, 80).replace(/[^\p{L}\p{N}\s'-]/gu, "").trim();
  if (safeName.length < 2) return null;

  try {
    const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(
      safeName,
    )}&language=en&format=json&type=item&limit=3`;

    const sRes = await fetch(searchUrl, {
      headers: { "User-Agent": "Nanaflix/1.0 (https://nanaflix.vercel.app)" },
      signal: AbortSignal.timeout(2000),
    });

    if (!sRes.ok) return null;

    const sData = await sRes.json();
    const candidates = sData.search || [];

    for (const cand of candidates) {
      const desc = (cand.description || "").toLowerCase();
      // Phải là cầu thủ bóng đá
      if (!desc.includes("football") && !desc.includes("soccer")) {
        continue;
      }

      // Lấy entity chi tiết để đối soát ngày sinh (P569) hoặc quốc tịch (P27)
      const eRes = await fetch(
        `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${cand.id}&props=claims&format=json`,
        {
          headers: { "User-Agent": "Nanaflix/1.0" },
          signal: AbortSignal.timeout(3000),
        },
      );

      if (!eRes.ok) continue;

      const eData = await eRes.json();
      const claims = eData.entities?.[cand.id]?.claims;
      if (!claims) continue;

      // Kiểm tra năm sinh
      let dobMatched = false;
      if (verifiedDob) {
        const p569Time = claims.P569?.[0]?.mainsnak?.datavalue?.value?.time;
        if (p569Time) {
          const wikiYear = p569Time.substring(1, 5); // "+1988-12-19..." -> "1988"
          const espnYear = verifiedDob.substring(0, 4);
          if (wikiYear === espnYear) {
            dobMatched = true;
          }
        }
      }

      // Chỉ chấp nhận khi đã đối soát khớp năm sinh
      if (dobMatched) {
        const p18 = claims.P18?.[0]?.mainsnak?.datavalue?.value;
        if (p18) {
          const commonsInfo = await fetchCommonsImageInfo(p18);
          if (commonsInfo) {
            return {
              photoUrl: commonsInfo.url,
              photoSource: "wikimedia",
              photoLicense: commonsInfo.license || "Creative Commons",
              photoLicenseUrl: commonsInfo.licenseUrl,
              photoAttribution: commonsInfo.attribution,
            };
          }
        }
      }
    }
  } catch {}

  return null;
}

/**
 * Lấy hồ sơ đầy đủ của cầu thủ (tiểu sử + ảnh chân dung) có cache server và in-flight deduplication
 */
export async function getAthleteProfile(
  athleteId: string,
  fallbackName?: string,
): Promise<AthleteProfile | null> {
  const cleanId = String(athleteId || "").trim();
  if (!cleanId || !/^[a-zA-Z0-9_-]{1,64}$/.test(cleanId)) {
    return null;
  }

  // 1. Kiểm tra Cache
  const cached = athleteCache.get(cleanId);
  if (cached && cached.expireAt > Date.now()) {
    return cached.data;
  }

  // 2. In-flight Deduplication (Tránh gọi trùng lặp song song cho cùng 1 ID)
  if (inFlightRequests.has(cleanId)) {
    return inFlightRequests.get(cleanId)!;
  }

  const fetchPromise = (async () => {
    try {
      // Bước A: Lấy tiểu sử chính thức từ ESPN Core
      const espnBio = await fetchEspnCoreAthlete(cleanId);
      const nowIso = new Date().toISOString();

      const baseProfile: AthleteProfile = {
        id: cleanId,
        displayName: espnBio?.displayName || fallbackName || "Cầu thủ",
        citizenship: espnBio?.citizenship,
        flagUrl: espnBio?.flagUrl,
        dateOfBirth: espnBio?.dateOfBirth,
        age: espnBio?.age,
        height: espnBio?.height,
        weight: espnBio?.weight,
        birthPlace: espnBio?.birthPlace,
        photoUrl: espnBio?.photoUrl,
        photoSource: espnBio?.photoSource,
        updatedAt: nowIso,
        provenance: {
          source: "espn-core",
          updatedAt: nowIso,
          fields: {
            bio: espnBio ? "espn-core" : undefined,
            photo: espnBio?.photoUrl ? "espn-core" : undefined,
          },
        },
      };

      // Bước B: Nếu ESPN chưa có ảnh chân dung, bổ sung ảnh từ Wikimedia Commons nếu xác minh được quyền sở hữu
      if (!baseProfile.photoUrl) {
        const wikiPhoto = await fetchWikidataPhotoFallback(
          cleanId,
          baseProfile.displayName,
          baseProfile.dateOfBirth,
          baseProfile.citizenship,
        );

        if (wikiPhoto) {
          baseProfile.photoUrl = wikiPhoto.photoUrl;
          baseProfile.photoSource = "wikimedia";
          baseProfile.photoLicense = wikiPhoto.photoLicense;
          baseProfile.photoLicenseUrl = wikiPhoto.photoLicenseUrl;
          baseProfile.photoAttribution = wikiPhoto.photoAttribution;
          baseProfile.provenance = {
            source: baseProfile.citizenship ? "espn-wikidata-hybrid" : "wikidata",
            updatedAt: nowIso,
            fields: {
              bio: baseProfile.citizenship ? "espn-core" : undefined,
              photo: "wikimedia-commons",
            },
          };
        }
      }

      // Nếu không có cả ESPN Bio lẫn ảnh bổ sung (ID không tồn tại), không tạo profile rỗng
      if (!espnBio && !baseProfile.photoUrl) {
        return null;
      }

      // Lưu Cache
      if (athleteCache.size >= MAX_CACHE_ENTRIES) {
        const firstKey = athleteCache.keys().next().value;
        if (firstKey) athleteCache.delete(firstKey);
      }

      athleteCache.set(cleanId, {
        data: baseProfile,
        expireAt: Date.now() + CACHE_TTL_MS,
      });

      return baseProfile;
    } catch {
      return null;
    } finally {
      inFlightRequests.delete(cleanId);
    }
  })();

  inFlightRequests.set(cleanId, fetchPromise);
  return fetchPromise;
}

/**
 * Xóa cache (hỗ trợ kiểm thử)
 */
export function clearAthleteProfileCache() {
  athleteCache.clear();
  inFlightRequests.clear();
}
