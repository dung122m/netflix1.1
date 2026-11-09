import crypto from "crypto";
import { getR2AssetUrl, uploadToR2 } from "@/lib/r2";
import r2Manifest from "@/data/r2AssetsManifest.json";

// In-memory runtime cache để tra cứu O(1) 0ms các URL đã sync
const runtimeManifest = new Map<string, string>(Object.entries(r2Manifest));

// Set các URL đang trong tiến trình tải/upload để ngăn chặn trùng lặp hoàn toàn (In-Flight Dedup)
const inFlightUrls = new Set<string>();

/**
 * Tạo deterministic key cho logo/ảnh VĐV từ URL gốc
 */
export function getLiveAssetR2Key(url: string, category: "team" | "athlete" = "team"): string {
  const hash = crypto.createHash("md5").update(url.trim()).digest("hex").slice(0, 16);
  return `live-assets/${category}/${hash}.png`;
}

/**
 * Tra cứu nhanh 0ms xem URL ngoài này đã có phiên bản Cloudflare R2 hay chưa
 */
export function getSyncedLiveAssetUrl(url?: string | null): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();

  // Nếu đã là link R2 CDN thì giữ nguyên
  if (trimmed.includes("media.nanaflix.asia")) return trimmed;

  // Tra cứu theo URL gốc hoặc theo hash key
  const directMatch = runtimeManifest.get(trimmed) || getR2AssetUrl(trimmed);
  if (directMatch) return directMatch;

  const hashKey = getLiveAssetR2Key(trimmed, "team");
  const hashMatch = runtimeManifest.get(hashKey) || getR2AssetUrl(hashKey);
  if (hashMatch) return hashMatch;

  return null;
}

/**
 * Đồng bộ một ảnh logo đội bóng / VĐV sang Cloudflare R2 ngầm (Background Fire-and-Forget)
 * - Tự động khử trùng lặp (Dedup)
 * - Tuân thủ cầu chì Quota Guard
 * - Trả về URL R2 nếu thành công hoặc URL gốc nếu bị ngắt
 */
export async function syncLiveAssetToR2(
  url: string,
  category: "team" | "athlete" = "team"
): Promise<string> {
  if (!url || !url.startsWith("http") || url.includes("media.nanaflix.asia")) {
    return url;
  }

  // 1. Kiểm tra xem đã có trên R2 chưa (Dedup tầng 1: 0ms)
  const existingR2 = getSyncedLiveAssetUrl(url);
  if (existingR2) {
    return existingR2;
  }

  // 2. Kiểm tra xem có đang được tải ngầm bởi request khác không (Dedup tầng 2: In-flight Mutex)
  if (inFlightUrls.has(url)) {
    return url;
  }

  inFlightUrls.add(url);
  const key = getLiveAssetR2Key(url, category);

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Referer: "https://nanaflix.asia",
      },
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      return url;
    }

    const arrayBuf = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    // Bỏ qua nếu file rỗng hoặc kích thước quá lớn (> 1.5MB - logo thực tế chỉ 3KB-20KB)
    if (buffer.length < 50 || buffer.length > 1500 * 1024) {
      return url;
    }

    let contentType = res.headers.get("content-type") || "image/png";
    if (!contentType.startsWith("image/")) {
      contentType = "image/png";
    }

    // Upload qua uploadToR2 có cầu chì r2QuotaGuard bảo vệ
    const publicUrl = await uploadToR2({
      key,
      buffer,
      contentType,
    });

    if (publicUrl) {
      runtimeManifest.set(url, publicUrl);
      runtimeManifest.set(key, publicUrl);
      return publicUrl;
    }

    return url;
  } catch {
    // Fail-safe: nếu lỗi mạng, trả về link gốc, không crash ứng dụng
    return url;
  } finally {
    inFlightUrls.delete(url);
  }
}

/**
 * Quét toàn bộ danh sách trận đấu trên trang Live:
 * 1. Thay thế 0ms các logo đã có trên R2
 * 2. Kích hoạt tải ngầm các logo mới xuất hiện (Fire-and-Forget, tối đa 15 logo/lần quét)
 */
export function processLiveMatchesR2Logos<
  T extends { homeLogo?: string; awayLogo?: string; sport?: string }
>(matches: T[]): T[] {
  if (!matches || matches.length === 0) return matches;

  const toSyncUrls: string[] = [];

  for (const m of matches) {
    // 1. homeLogo
    if (m.homeLogo && m.homeLogo.startsWith("http")) {
      const r2Url = getSyncedLiveAssetUrl(m.homeLogo);
      if (r2Url) {
        m.homeLogo = r2Url;
      } else if (!m.homeLogo.includes("media.nanaflix.asia") && toSyncUrls.length < 15) {
        toSyncUrls.push(m.homeLogo);
      }
    }

    // 2. awayLogo
    if (m.awayLogo && m.awayLogo.startsWith("http")) {
      const r2Url = getSyncedLiveAssetUrl(m.awayLogo);
      if (r2Url) {
        m.awayLogo = r2Url;
      } else if (!m.awayLogo.includes("media.nanaflix.asia") && toSyncUrls.length < 15) {
        toSyncUrls.push(m.awayLogo);
      }
    }
  }

  // Kích hoạt đồng bộ ngầm không chặn luồng chính (Fire-and-forget)
  if (toSyncUrls.length > 0) {
    const uniqueUrls = Array.from(new Set(toSyncUrls));
    Promise.allSettled(uniqueUrls.map((u) => syncLiveAssetToR2(u))).catch(() => {});
  }

  return matches;
}
