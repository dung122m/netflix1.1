/**
 * CLOUDFLARE R2 ASSETS MANIFEST (DYNAMIC CDN LOADER)
 * Đã offload r2AssetsManifest.json (184 KB) khỏi Git bundle.
 * Tự động tải động từ Cloudflare R2 CDN (https://media.nanaflix.asia/manifest.json)
 * và lưu trong L1 RAM O(1) với Single-Flight Mutex chống trùng lặp.
 */

let dynamicManifest: Record<string, string> = {};
let isManifestLoaded = false;
let lastManifestFetch = 0;
const MANIFEST_REFRESH_INTERVAL_MS = 60 * 60 * 1000; // 1 giờ
let inFlightManifestFetch: Promise<Record<string, string>> | null = null;

/**
 * Đảm bảo manifest đã được tải từ Cloudflare R2 CDN vào RAM (Single-Flight Mutex)
 */
export async function ensureR2ManifestLoaded(): Promise<Record<string, string>> {
  const now = Date.now();
  if (isManifestLoaded && now - lastManifestFetch < MANIFEST_REFRESH_INTERVAL_MS) {
    return dynamicManifest;
  }

  if (inFlightManifestFetch) {
    return inFlightManifestFetch;
  }

  inFlightManifestFetch = (async () => {
    try {
      const publicUrl = process.env.R2_PUBLIC_URL || "https://media.nanaflix.asia";
      const cleanUrl = publicUrl.replace(/\/+$/, "");
      const res = await fetch(`${cleanUrl}/manifest.json`, {
        signal: AbortSignal.timeout(5000),
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = (await res.json()) as Record<string, string>;
        if (data && typeof data === "object") {
          dynamicManifest = { ...dynamicManifest, ...data };
          isManifestLoaded = true;
          lastManifestFetch = Date.now();
        }
      }
    } catch (err) {
      console.warn("[R2Manifest] Fetch from R2 failed:", err instanceof Error ? err.message : err);
    }
    return dynamicManifest;
  })().finally(() => {
    inFlightManifestFetch = null;
  });

  return inFlightManifestFetch;
}

export const refreshR2Manifest = ensureR2ManifestLoaded;

/**
 * Tra cứu URL CDN R2 nhanh 0ms cho asset tĩnh đã được pre-warm (client-safe, không import AWS SDK).
 */
export function getR2AssetUrl(key: string): string | null {
  if (!key) return null;
  const cleanKey = key.replace(/^\/+/, "");

  // 1. Kiểm tra RAM cache O(1)
  const match = dynamicManifest[cleanKey];
  if (match) return match;

  // 2. Kích hoạt tải ngầm nếu chưa nạp trên Server
  if (typeof window === "undefined" && (!isManifestLoaded || Date.now() - lastManifestFetch > MANIFEST_REFRESH_INTERVAL_MS)) {
    ensureR2ManifestLoaded().catch(() => {});
  }

  return null;
}

/**
 * Tra cứu thông minh logo đội thể thao từ Cloudflare R2 Manifest (0ms O(1)).
 * Hỗ trợ mọi môn (basketball, football, esports...), tự động thử cả dạng kebab-case lẫn collapsed.
 */
export function getR2TeamLogoUrl(
  teamName?: string | null,
  sport?: string | null
): string | null {
  if (!teamName) return null;
  const clean = teamName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(clb|fc|sc|afc|ac|as|rc|cf|cd|ud|sd|u\d{1,2})\b/gi, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const tokens = clean.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;

  const collapsed = tokens.join("");
  const kebab = tokens.join("-");

  const categories =
    sport === "basketball"
      ? ["teams/basketball", "teams/football", "teams/esports"]
      : sport === "esports"
      ? ["teams/esports", "teams/football", "teams/basketball"]
      : ["teams/football", "teams/basketball", "teams/esports"];

  for (const cat of categories) {
    const match =
      getR2AssetUrl(`${cat}/${kebab}.png`) ||
      getR2AssetUrl(`${cat}/${collapsed}.png`) ||
      getR2AssetUrl(`${cat}/${kebab}.webp`) ||
      getR2AssetUrl(`${cat}/${collapsed}.webp`);
    if (match) return match;
  }

  // Nếu tên đội gồm nhiều từ, thử tìm theo từ khóa chính (vd: "Pistons", "Hornets", "Raptors")
  if (tokens.length > 1) {
    const lastWord = tokens[tokens.length - 1];
    if (lastWord.length >= 4) {
      for (const cat of categories) {
        const match =
          getR2AssetUrl(`${cat}/${lastWord}.png`) ||
          getR2AssetUrl(`${cat}/${lastWord}.webp`);
        if (match) return match;
      }
    }
  }

  return null;
}

/**
 * Tra cứu thông minh Banner phim từ R2 CDN theo slug hoặc URL gốc.
 */
export function getR2BannerUrl(
  slug?: string | null,
  sourceUrl?: string | null
): string | null {
  if (slug) {
    const clean = slug.toLowerCase().trim();
    const noYear = clean.replace(/-\d{4}$/, "");
    const match =
      getR2AssetUrl(`banners/${clean}`) ||
      getR2AssetUrl(`banners/${clean}.jpg`) ||
      getR2AssetUrl(`banners/${clean}.webp`) ||
      getR2AssetUrl(`banners/${noYear}`) ||
      getR2AssetUrl(`banners/${noYear}.jpg`) ||
      getR2AssetUrl(`banners/${noYear}.webp`);
    if (match) return match;
  }
  if (sourceUrl && typeof sourceUrl === "string") {
    const directMatch = getR2AssetUrl(sourceUrl);
    if (directMatch) return directMatch;
    const filename = sourceUrl.split("/").pop()?.split("?")[0];
    if (filename) {
      const fileMatch = getR2AssetUrl(`banners/${filename}`);
      if (fileMatch) return fileMatch;
    }
  }
  return null;
}

// Tự động tải ngầm manifest trên Server runtime để làm ấm cache RAM
if (typeof window === "undefined") {
  ensureR2ManifestLoaded().catch(() => {});
}
