import type { TvChannel } from "@/services/live/tv/service";
import { upgradeKnownHttpsStreamUrl } from "@/services/live/shared/streamUrlHelper";

export const TV_STREAM_PROXY_ENDPOINT =
  process.env.NEXT_PUBLIC_TV_PROXY_URL?.trim() ||
  process.env.NEXT_PUBLIC_STREAM_PROXY_URL?.trim() ||
  "/api/live-tv/proxy";

/**
 * Resolves a Live TV channel URL to either a direct upgraded HTTPS URL
 * or an internal proxy URL for HTTP/CORS-restricted origins.
 */
export function getStreamUrl(url: string): string {
  if (!url) return "";
  // Nâng cấp http sang https nếu domain hỗ trợ HTTPS
  const cleanUrl = upgradeKnownHttpsStreamUrl(url.trim());

  // Nếu là domain không hỗ trợ CORS cho trình duyệt (như vnns.net, dethich.pw) -> ưu tiên bọc qua proxy luôn để phát mượt mà không bị lỗi CORS
  if (
    cleanUrl.startsWith("https://") &&
    /vnns\.net|dethich\.pw/i.test(cleanUrl)
  ) {
    return `${TV_STREAM_PROXY_ENDPOINT}?url=${encodeURIComponent(cleanUrl)}`;
  }

  // Nếu là HTTPS -> phát trực tiếp từ trình duyệt để tối ưu độ trễ
  if (cleanUrl.startsWith("https://")) {
    return cleanUrl;
  }

  // Nếu là link HTTP thuần trên trang HTTPS -> Bắt buộc bọc qua Proxy để tránh Mixed Content
  if (cleanUrl.startsWith("http://")) {
    return `${TV_STREAM_PROXY_ENDPOINT}?url=${encodeURIComponent(cleanUrl)}`;
  }
  return cleanUrl;
}

/**
 * Builds prioritized candidate playback URLs for a TV channel,
 * including direct HTTPS, CORS proxy fallback, and channel fallback_url.
 */
export function buildTvCandidateUrls(channel: TvChannel): string[] {
  const channelWithFallback = channel as TvChannel & {
    fallback_url?: string;
    fallbackUrl?: string;
  };
  const fallbackUrl =
    channelWithFallback.fallback_url || channelWithFallback.fallbackUrl;

  const candidateUrls: string[] = [];
  const directPrimary = getStreamUrl(channel.url);
  if (directPrimary) candidateUrls.push(directPrimary);

  // Nguồn dự phòng nếu có
  if (fallbackUrl && fallbackUrl !== channel.url) {
    const directFallback = getStreamUrl(fallbackUrl);
    if (directFallback && !candidateUrls.includes(directFallback)) {
      candidateUrls.push(directFallback);
    }
  }

  return candidateUrls;
}

