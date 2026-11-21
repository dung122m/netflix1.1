/**
 * CLOUDFLARE R2 ASSETS MANIFEST & CONVENTION RESOLVER
 * Dữ liệu manifest tĩnh được nhập trực tiếp tại build-time từ local JSON (0ms latency, không fetch mạng):
 * src/data/r2AssetsManifest.json
 */

import r2AssetsManifestRaw from "@/data/r2AssetsManifest.json";

const staticManifest: Record<string, string> =
  (r2AssetsManifestRaw && typeof r2AssetsManifestRaw === "object"
    ? (r2AssetsManifestRaw as Record<string, string>)
    : {}) || {};

/**
 * Đảm bảo manifest đã sẵn sàng (trả về trực tiếp bản đồ tĩnh 0ms, không tốn network).
 */
export async function ensureR2ManifestLoaded(): Promise<Record<string, string>> {
  return staticManifest;
}

export const refreshR2Manifest = ensureR2ManifestLoaded;

/**
 * Tra cứu URL CDN R2 nhanh 0ms cho asset tĩnh đã được pre-warm (client-safe, không import AWS SDK).
 */
export function getR2AssetUrl(key: string): string | null {
  if (!key) return null;
  const cleanKey = key.replace(/^\/+/, "");
  return staticManifest[cleanKey] || null;
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
      getR2AssetUrl(`${cat}/${kebab}.webp`) ||
      getR2AssetUrl(`${cat}/${collapsed}.webp`) ||
      getR2AssetUrl(`${cat}/${kebab}.png`) ||
      getR2AssetUrl(`${cat}/${collapsed}.png`);
    if (match) return match;
  }

  if (tokens.length > 1) {
    const lastWord = tokens[tokens.length - 1];
    if (lastWord.length >= 4) {
      for (const cat of categories) {
        const match =
          getR2AssetUrl(`${cat}/${lastWord}.webp`) ||
          getR2AssetUrl(`${cat}/${lastWord}.png`);
        if (match) return match;
      }
    }
  }

  return null;
}

/**
 * Tra cứu thông minh Banner phim từ R2 CDN theo slug hoặc URL gốc từ manifest cục bộ.
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
