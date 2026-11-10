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

