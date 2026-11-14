/**
 * Chuẩn hóa hoán đổi nguyên âm i/y trong tiếng Việt để so khớp không bị lệch
 * (ví dụ: lí <-> lý, kỉ <-> kỷ, thúy <-> thúi, huỳnh <-> huình...)
 * Chỉ áp dụng cho so khớp tên nghệ sĩ, diễn viên hoặc từ khóa tìm kiếm tiếng Việt.
 */
export function normalizeVietnameseVowels(str?: string | null): string {
  if (!str) return "";
  return normalizeForMatch(str).replace(/y/g, "i");
}

/**
 * Chuẩn hóa chuỗi tiếng Việt và quốc tế dùng cho so khớp tên phim, diễn viên, thể loại, quốc gia.
 * - Chuyển chữ thường
 * - Thay thế đ/Đ -> d trước khi chuẩn hóa NFD
 * - Khử dấu thanh Unicode (NFD + loại bỏ \u0300-\u036f)
 * - Thay ký tự đặc biệt thành khoảng trắng
 * - Rút gọn khoảng trắng thừa và trim
 */
export function normalizeForMatch(str?: string | null): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .normalize("NFC")
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Alias dùng cho các module tương thích */
export const cleanStringForMatch = normalizeForMatch;
export const cleanNormalizedString = normalizeForMatch;
