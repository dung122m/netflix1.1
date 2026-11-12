export const FOOTBALL_STREAM_PROXY_ENDPOINT =
  process.env.NEXT_PUBLIC_STREAM_PROXY_URL?.trim() || "/api/live-football/proxy";

/**
 * Converts supported FLV stream URLs to playable HLS (.m3u8) endpoints.
 */
export function toPlayableHlsUrl(url: string): string {
  if (!url) return "";
  if (url.includes("lauthaitv.cc") && url.includes(".flv")) {
    return url
      .replace("flv.lauthaitv.cc", "hls.lauthaitv.cc")
      .replace(/\.flv(\?.*)?$/i, "/index.m3u8$1");
  }
  if (url.includes(".flv")) {
    return url.replace(/\.flv(\?.*)?$/i, ".m3u8$1");
  }
  return url;
}

/**
 * Resolves the optimal playback URL for football streams:
 * upgrades known HTTPS hosts, serves HTTPS direct-first unless proxy fallback
 * is active, and proxies plain HTTP URLs to avoid mixed content errors.
 */
export function getFootballStreamUrl(
  rawUrl: string,
  isHls: boolean,
  useProxyFallback: boolean,
): string {
  if (!rawUrl) return "";
  const playableUrl = toPlayableHlsUrl(rawUrl).trim();
  let finalUrl = playableUrl;

  // Nâng cấp http sang https nếu domain hỗ trợ HTTPS
  if (
    finalUrl.startsWith("http://") &&
    /fptplay|akamaized|cloudfront|vtv|cdn|vietnam|vnns|losartang|miekgo|msdht|monarch|byteark|fastly|splay|dethich|thvl|xoilac|vebo|tiengruoi|cakhia|mitom|thevang|thapcam|90phut/i.test(
      finalUrl,
    )
  ) {
    finalUrl = finalUrl.replace(/^http:\/\//i, "https://");
  }

  const finalIsHls = isHls || finalUrl.includes(".m3u8");
  if (finalIsHls) {
    // Ưu tiên phát trực tiếp từ trình duyệt cho các link HTTPS; chỉ qua Proxy khi gặp lỗi network/CORS
    if (finalUrl.startsWith("https://")) {
      if (useProxyFallback) {
        return `${FOOTBALL_STREAM_PROXY_ENDPOINT}?url=${encodeURIComponent(finalUrl)}`;
      }
      return finalUrl;
    }
    // Link HTTP thuần cần qua Proxy để không bị chặn Mixed Content trên trang HTTPS
    if (finalUrl.startsWith("http://")) {
      return `${FOOTBALL_STREAM_PROXY_ENDPOINT}?url=${encodeURIComponent(finalUrl)}`;
    }
  }
  return finalUrl;
}

/**
 * Detects whether a stream URL points to an embeddable HTML/iframe page.
 */
export function isIframeStreamUrl(url?: string | null): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes("/embed/") ||
    lower.includes("youtube.com/embed") ||
    lower.includes("youtu.be/") ||
    lower.includes("player.") ||
    lower.includes("iframe") ||
    lower.endsWith(".html") ||
    lower.endsWith(".htm")
  );
}

