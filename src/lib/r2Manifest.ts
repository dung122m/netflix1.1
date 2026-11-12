import r2Manifest from "@/data/r2AssetsManifest.json";

let dynamicManifest: Record<string, string> = { ...(r2Manifest as Record<string, string>) };
let lastManifestFetch = 0;
const MANIFEST_REFRESH_INTERVAL_MS = 60 * 60 * 1000; // 1 giờ

/**
 * Tự động đồng bộ manifest mới nhất từ Cloudflare R2 CDN vào RAM.
 */
export async function refreshR2Manifest(): Promise<void> {
  const now = Date.now();
  if (now - lastManifestFetch < MANIFEST_REFRESH_INTERVAL_MS) return;
  lastManifestFetch = now;
  try {
    const publicUrl = process.env.R2_PUBLIC_URL || "https://media.nanaflix.asia";
    const res = await fetch(`${publicUrl.replace(/\/+$/, "")}/manifest.json`, {
      signal: AbortSignal.timeout(4000),
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const data = (await res.json()) as Record<string, string>;
      if (data && typeof data === "object") {
        dynamicManifest = { ...dynamicManifest, ...data };
      }
    }
  } catch {
    // Giữ nguyên snapshot hiện tại nếu network lỗi
  }
}

/**
 * Tra cứu URL CDN R2 nhanh 0ms cho asset tĩnh đã được pre-warm (client-safe, không import AWS SDK).
 */
export function getR2AssetUrl(key: string): string | null {
  const match = dynamicManifest[key];
  if (match) return match;
  if (typeof window === "undefined" && Date.now() - lastManifestFetch > MANIFEST_REFRESH_INTERVAL_MS) {
    refreshR2Manifest().catch(() => {});
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

