import { StreamServer } from "@/services/liveFootballService";
import { toCanonicalSourceUrl, extractStreamHost } from "./streamUrlHelper";

/**
 * Xác định chất lượng nguồn phát từ metadata của StreamServer:
 * - 1080p, 1080, FHD, Full HD -> "FHD"
 * - 720p, 720, HD -> "HD"
 * - Không xác định -> null (không tự gán)
 */
export function getSourceQuality(
  server?: Partial<StreamServer>,
): "FHD" | "HD" | null {
  if (!server) return null;

  // 1. Kiểm tra trường quality từ metadata nếu có
  const quality = (server.quality || "").toString().trim().toUpperCase();
  if (
    quality === "FHD" ||
    quality === "1080P" ||
    quality === "1080" ||
    quality === "FULL HD"
  ) {
    return "FHD";
  }
  if (quality === "HD" || quality === "720P" || quality === "720") {
    return "HD";
  }

  // 2. Kiểm tra tên máy chủ hoặc resolution
  const rawText = `${server.name || ""} ${(server as Record<string, unknown>).resolution || ""
    }`.toLowerCase();

  if (
    /\b(1080p|1080|fhd|full\s*hd)\b/i.test(rawText) ||
    /\[fhd\]/i.test(rawText) ||
    /fhd/i.test(server.name || "")
  ) {
    return "FHD";
  }

  if (
    /\b(720p|720|hd)\b/i.test(rawText) ||
    /\[hd\]/i.test(rawText) ||
    /\bhd\b/i.test(server.name || "")
  ) {
    return "HD";
  }

  return null;
}

/**
 * Điểm ưu tiên chất lượng nguồn phát:
 * FHD (2) > HD (1) > Không xác định (0)
 */
export function getQualityPriorityScore(
  server?: Partial<StreamServer>,
): number {
  const q = getSourceQuality(server);
  if (q === "FHD") return 2;
  if (q === "HD") return 1;
  return 0;
}

export function isSourceFailed(url?: string | null, failedSet: Set<string> = new Set()): boolean {
  if (!url) return false;
  const canonical = toCanonicalSourceUrl(url);
  if (!canonical) return false;
  if (failedSet.has(canonical)) return true;
  const host = extractStreamHost(url);
  if (host && failedSet.has(`host:${host}`)) return true;
  return false;
}

/**
 * Làm sạch tên nền tảng/nhóm nguồn để hiển thị gọn gàng, hiện đại (ví dụ: Xôi Lạc, Gà Vàng, Cola TV...)
 */
export function cleanPlatformName(name?: string): string {
  if (!name) return "";
  const trimmed = name.toWellFormed().replace(/^[🔴🟢🟡⚪🟠📡\s]+/u, "").trim();
  if (
    /^(?:other|live football|bóng đá|thể thao|livetv|sports)$/i.test(trimmed)
  ) {
    return "";
  }
  const clean = trimmed
    .replace(/^(?:xoilac|xôi\s*lạc)(?:\s*z)?(?:\s*tv)?$/i, "Xôi Lạc")
    .replace(/^(?:gà\s*vàng|gavang)(?:\s*\d+h?)?(?:\s*tv)?$/i, "Gà Vàng")
    .replace(/\s*Z\s*TV$/i, "")
    .replace(/\s*\d+h?\s*TV$/i, "");

  return clean.trim();
}

/**
 * Trích xuất tên BLV hoặc tên nguồn thân thiện kèm tên nền tảng theo Kiểu 1 (BLV ... · Nền tảng)
 */
export function parseServerDisplayLabel(
  server?: StreamServer,
  index: number = 0,
): string {
  if (!server) return `Nguồn ${index + 1}`;

  const platform = cleanPlatformName(server.sourceName);

  const formatWithPlatform = (blv: string): string => {
    if (!platform) return blv;
    if (blv.toLowerCase().includes(platform.toLowerCase())) return blv;
    return `${blv} · ${platform}`;
  };

  // 1. Tên BLV trong ngoặc: "(BLV Lê Hoàn)", "(Bình luận viên Batman)", "(HD ASTRA)"
  const matchParen = server.name.match(
    /\((?:blv\s+|bình luận viên\s+)?([^)]+)\)/i,
  );
  if (matchParen && matchParen[1]) {
    const candidate = matchParen[1]
      .replace(/^(?:blv|bình luận viên)\s+/i, "")
      .replace(/^(?:hd|fhd|4k|sd)\s+/i, "")
      .replace(/\s+(?:hd|fhd|4k|sd)$/i, "")
      .trim();
    if (
      candidate &&
      !/^\d+$/.test(candidate) &&
      !/^(?:fhd|hd|4k|sd|hls|flv)$/i.test(candidate)
    ) {
      return formatWithPlatform(`BLV ${candidate}`);
    }
  }

  // 2. Tên BLV dạng "BLV ..." hoặc "Bình luận viên ..."
  const matchInline = server.name.match(
    /(?:blv|bình luận viên)\s+([^\s#\[\]()]+(?:\s+[^\s#\[\]()]+)?)/i,
  );
  if (matchInline && matchInline[1]) {
    const candidate = matchInline[1]
      .replace(/^(?:hd|fhd|4k|sd)\s+/i, "")
      .replace(/\s+(?:hd|fhd|4k|sd)$/i, "")
      .trim();
    return formatWithPlatform(`BLV ${candidate}`);
  }

  // 3. Tên nhóm nguồn sạch (ví dụ: FPT Play, K+ SPORT, Xoilac)
  if (platform) {
    return `${platform} · Nguồn ${index + 1}`;
  }

  // 4. Loại bỏ các nhãn kỹ thuật [FHD], [HD], #1, Server 1...
  const cleaned = server.name
    .replace(/\s*\[(?:FHD|HD|4K|SD|HLS|FLV)\]/gi, "")
    .replace(/#\d+/g, "")
    .trim();

  if (
    !cleaned ||
    /^(?:server|máy chủ|nguồn|link|stream)(?:\s*(?:#?\d+))?$/i.test(cleaned) ||
    /^\d+$/.test(cleaned)
  ) {
    return `Nguồn ${index + 1}`;
  }

  const stripped = cleaned
    .replace(/^(?:server|máy chủ|nguồn)\s*(?:#?\d+)?\s*[-:·]?\s*/i, "")
    .trim();
  if (stripped && stripped.length > 2 && !/^\d+$/.test(stripped)) {
    return stripped;
  }

  if (cleaned.length > 2 && !/^\d+$/.test(cleaned)) {
    return cleaned;
  }

  return `Nguồn ${index + 1}`;
}

/**
 * Tìm máy chủ khởi tạo tối ưu theo thứ tự ưu tiên:
 * FHD / 1080p -> HD / 720p -> Không xác định
 */
export function findBestInitialServerIndex(
  serverList: StreamServer[],
  failedSet: Set<string> = new Set(),
): number {
  if (!serverList || serverList.length === 0) return 0;
  let bestIdx = 0;
  let bestScore = -1;
  for (let i = 0; i < serverList.length; i++) {
    const s = serverList[i];
    if (isSourceFailed(s?.url, failedSet)) continue;
    const score = getQualityPriorityScore(s);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
      if (score === 2) {
        break; // FHD là chất lượng cao nhất, chọn ngay máy chủ đầu tiên đạt FHD
      }
    }
  }
  return bestIdx;
}

/**
 * Tìm máy chủ dự phòng tiếp theo:
 * Ưu tiên:
 * 1. Không nằm trong danh sách failed (đối chiếu bằng canonical URL và host-level failure)
 * 2. Điểm chất lượng cao hơn (FHD > HD > Khác)
 * 3. Duyệt xoay vòng tự nhiên sau currentIndex để tránh nhảy hỗn loạn
 * Nếu không còn nguồn nào -> trả về -1
 */
export function findNextFallbackServerIndex(
  serverList: StreamServer[],
  failedSet: Set<string>,
  currentIndex: number,
): number {
  if (!serverList || serverList.length === 0) return -1;

  const available: { index: number; score: number }[] = [];
  serverList.forEach((s, idx) => {
    if (!isSourceFailed(s?.url, failedSet)) {
      available.push({
        index: idx,
        score: getQualityPriorityScore(s),
      });
    }
  });

  if (available.length === 0) return -1;

  available.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const distA = (a.index - currentIndex + serverList.length) % serverList.length;
    const distB = (b.index - currentIndex + serverList.length) % serverList.length;
    return distA - distB;
  });

  return available[0].index;
}

