/**
 * Utility chuẩn hóa và trích xuất URL nguồn phát trực tiếp thể thao & truyền hình
 * Tách biệt khỏi LivePlayer để tối ưu hóa bundle size và ngăn chặn coupling vào MatchCard
 */

export function toCanonicalSourceUrl(url?: string | null): string {
  if (!url) return "";
  let clean = url.trim();
  if (clean.includes("/proxy?url=") || clean.includes("proxy?url=")) {
    try {
      const match = clean.match(/url=([^&]+)/);
      if (match) {
        clean = decodeURIComponent(match[1]).trim();
      }
    } catch {}
  }
  return clean.split("?")[0].trim();
}

const KNOWN_HTTPS_STREAM_HOST_REGEX =
  /fptplay|akamaized|cloudfront|vtv|cdn|vietnam|vnns|losartang|miekgo|msdht|monarch|byteark|fastly|splay|dethich|thvl|xoilac|vebo|tiengruoi|cakhia|mitom|thevang|thapcam|90phut/i;

const SIGNED_STREAM_QUERY_REGEX =
  /[?&](?:auth_key|wssecret|sign|signature|token|md5|hash|hdnea|verify)=/i;

export function hasSignedStreamParams(url?: string | null): boolean {
  return Boolean(url && SIGNED_STREAM_QUERY_REGEX.test(url));
}

export function upgradeKnownHttpsStreamUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http://") && KNOWN_HTTPS_STREAM_HOST_REGEX.test(url)) {
    return url.replace(/^http:\/\//i, "https://");
  }
  return url;
}

export function extractStreamHost(url?: string | null): string {
  if (!url) return "";
  const canonical = toCanonicalSourceUrl(url);
  if (!canonical) return "";
  try {
    const parsed = new URL(canonical.startsWith("http") ? canonical : `http://${canonical}`);
    return parsed.hostname.toLowerCase();
  } catch {
    return "";
  }
}

