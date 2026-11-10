/**
 * Bộ lọc và chuẩn hóa tên Bình luận viên (BLV) cho luồng thể thao trực tiếp.
 * Ngăn chặn từ ngữ phản cảm, khiếm nhã hoặc troll gây ảnh hưởng trải nghiệm người dùng.
 */

export const OFFENSIVE_COMMENTATOR_REGEXES: RegExp[] = [
  /(?<=^|[^\p{L}\p{N}])(?:mù|ngu|ngáo(?:\s*đá)?|khùng|điên|óc\s*chó|chó|đĩ|đụ|cặc|lồn|buồi|dâm|dái|thối|bố\s*láo|mất\s*dạy)(?=[^\p{L}\p{N}]|$)/iu,
  /^(?:mù|ngu|ngáo|khùng|điên|chó|đĩ|đụ|cặc|lồn|buồi)$/iu,
];

/**
 * Kiểm tra xem tên BLV thô có chứa từ ngữ phản cảm/troll hay không.
 */
export function isOffensiveCommentatorName(name: string): boolean {
  if (!name || typeof name !== "string") return false;
  const clean = name.trim();
  if (!clean) return false;
  return OFFENSIVE_COMMENTATOR_REGEXES.some((rx) => rx.test(clean));
}

/**
 * Làm sạch tên bình luận viên:
 * - Loại bỏ tiền tố "BLV", "Bình luận viên"
 * - Kiểm tra danh sách từ ngữ phản cảm / troll
 * - Nếu tên không hợp lệ:
 *   + Nếu nguồn thuộc nhóm đài chính thức tin cậy (TV360, FPT Play, VTV, HTV...), trả về tên đài
 *   + Ngược lại, trả về rỗng "" (giao diện sẽ hiển thị nhãn trung tính 🎙️ BLV)
 */
export function sanitizeCommentatorName(
  rawName: string,
  cleanGroup?: string,
): string {
  if (!rawName || typeof rawName !== "string") return "";
  const clean = rawName.replace(/^(?:blv|bình luận viên)\s+/i, "").trim();
  if (!clean) return "";

  // Tách trường hợp nhiều BLV ngăn cách bằng dấu phẩy
  const parts = clean.split(/[,/&]+/).map((p) => p.trim()).filter(Boolean);
  const validParts: string[] = [];

  for (const p of parts) {
    if (isOffensiveCommentatorName(p)) {
      continue;
    }
    // Loại bỏ các thẻ kỹ thuật như HD, FHD, 1080p, SD nếu bị parse nhầm thành tên BLV
    if (/^(?:fhd|hd|4k|1080p|720p|sd|link\s*\d+|server\s*\d+)$/i.test(p)) {
      continue;
    }
    validParts.push(p);
  }

  if (validParts.length > 0) {
    return validParts.join(", ");
  }

  // Nếu không còn tên hợp lệ:
  // Nếu có nhóm đài phát sóng chính thức uy tín
  if (cleanGroup && /^(?:TV360|FPT Play|VTVcab|SCTV|K\+|HTV|VTV)\b/i.test(cleanGroup)) {
    return cleanGroup;
  }

  return "";
}

