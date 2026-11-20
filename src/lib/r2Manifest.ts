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
 * Tra cứu logo đội thể thao dùng Convention-based URL trực tiếp:
 * https://media.nanaflix.asia/teams/{sport}/{slug}.webp
 * Không phụ thuộc manifest mạng hay fetch runtime.
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

  const slug = tokens.join("-");
  const sportCategory =
    sport === "basketball"
      ? "basketball"
      : sport === "esports"
      ? "esports"
      : "football";

  const publicBase =
    (typeof process !== "undefined" &&
      (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL)) ||
    "https://media.nanaflix.asia";
  const cleanBase = publicBase.replace(/\/+$/, "");
  return `${cleanBase}/teams/${sportCategory}/${slug}.webp`;
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
