/**
 * Shared HTTP & CDN cache header helpers for API Route Handlers.
 */

export const NO_CACHE_HEADERS: Record<string, string> = {
  "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate, proxy-revalidate",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
};

export function buildEdgeCacheHeaders(
  sMaxAgeSeconds: number,
  staleWhileRevalidateSeconds: number,
  browserMaxAgeSeconds?: number,
): Record<string, string> {
  const sMax = Math.max(0, Math.floor(sMaxAgeSeconds));
  const swr = Math.max(0, Math.floor(staleWhileRevalidateSeconds));
  const cdnDirective = `public, s-maxage=${sMax}, stale-while-revalidate=${swr}`;
  const browserDirective =
    typeof browserMaxAgeSeconds === "number" && browserMaxAgeSeconds >= 0
      ? `public, max-age=${Math.floor(browserMaxAgeSeconds)}, s-maxage=${sMax}, stale-while-revalidate=${swr}`
      : cdnDirective;

  return {
    "Cache-Control": browserDirective,
    "CDN-Cache-Control": cdnDirective,
    "Vercel-CDN-Cache-Control": cdnDirective,
  };
}
