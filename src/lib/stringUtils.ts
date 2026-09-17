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
    .replace(/[^\w\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Alias dùng cho các module tương thích */
export const cleanStringForMatch = normalizeForMatch;
export const cleanNormalizedString = normalizeForMatch;
