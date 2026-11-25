import {
  upgradeKnownHttpsStreamUrl,
  hasSignedStreamParams,
} from "@/services/live/shared/streamUrlHelper";

export const FOOTBALL_STREAM_PROXY_ENDPOINT =
  process.env.NEXT_PUBLIC_STREAM_PROXY_URL?.trim() || "/api/live-football/proxy";

/**
 * Converts supported unsigned FLV stream URLs to playable HLS (.m3u8) endpoints.
 * Signed FLV URLs (auth_key, wsSecret, token...) must not be rewritten because
 * their signatures are bound to the .flv path.
 */
export function toPlayableHlsUrl(url: string): string {
  if (!url) return "";
  if (url.includes("lauthaitv.cc") && url.includes(".flv")) {
    return url
      .replace("flv.lauthaitv.cc", "hls.lauthaitv.cc")
      .replace(/\.flv(\?.*)?$/i, "/index.m3u8$1");
  }
  if (url.includes(".flv") && !hasSignedStreamParams(url)) {
    return url.replace(/\.flv(\?.*)?$/i, ".m3u8$1");
  }
  return url;
}

function buildFootballProxyUrl(
  targetUrl: string,
  referer?: string,
  userAgent?: string,
  headerSig?: string,
): string {
  const params = new URLSearchParams();
  params.set("url", targetUrl);
  if (headerSig) {
    if (referer && /^https?:\/\//i.test(referer)) {
      params.set("ref", referer);
    }
    if (userAgent) {
      params.set("ua", userAgent.slice(0, 256));
    }
    params.set("hsig", headerSig);
  }
  return `${FOOTBALL_STREAM_PROXY_ENDPOINT}?${params.toString()}`;
}

/**
 * Resolves the optimal playback URL for football streams:
 * upgrades known HTTPS hosts, serves HTTPS direct-first unless proxy fallback
 * is active, and proxies plain HTTP URLs (or failed direct streams with custom headers).
 */
export function getFootballStreamUrl(
  rawUrl: string,
  isHls: boolean,
  useProxyFallback: boolean,
  referer?: string,
  userAgent?: string,
  headerSig?: string,
): string {
  if (!rawUrl) return "";
  // Nâng cấp http sang https nếu domain hỗ trợ HTTPS
  const finalUrl = upgradeKnownHttpsStreamUrl(toPlayableHlsUrl(rawUrl).trim());

  const finalIsHls = isHls || finalUrl.includes(".m3u8");
  if (finalIsHls) {
    // Ưu tiên phát trực tiếp từ trình duyệt cho các link HTTPS; chỉ qua Proxy khi gặp lỗi network/CORS/403
    if (finalUrl.startsWith("https://")) {
      if (useProxyFallback) {
        return buildFootballProxyUrl(finalUrl, referer, userAgent, headerSig);
      }
      return finalUrl;
    }
    // Link HTTP thuần cần qua Proxy để không bị chặn Mixed Content trên trang HTTPS
    if (finalUrl.startsWith("http://")) {
      return buildFootballProxyUrl(finalUrl, referer, userAgent, headerSig);
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

