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

const RAW_COUNTRY_CODE_MAP: Record<string, string> = {
  CN: "Trung Quốc",
  HK: "Hồng Kông",
  TW: "Đài Loan",
  VN: "Việt Nam",
  KR: "Hàn Quốc",
  JP: "Nhật Bản",
  US: "Mỹ",
  TH: "Thái Lan",
  GB: "Anh",
  UK: "Anh",
  FR: "Pháp",
  DE: "Đức",
  IT: "Ý",
  ES: "Tây Ban Nha",
  IN: "Ấn Độ",
  RU: "Nga",
  AU: "Úc",
  CA: "Canada",
};

/**
 * Chuẩn hóa tên quốc gia, loại bỏ cờ emoji (Regional Indicator Symbols như 🇨🇳, 🇻🇳, 🇺🇸...)
 * và mã quốc gia viết hoa kèm theo trên Windows (ví dụ: "Trung Quốc 🇨🇳" -> "Trung Quốc", "Hồng Kông HK" -> "Hồng Kông")
 */
export function cleanCountryName(country?: string | null): string {
  if (!country) return "";
  const trimmed = country.trim();
  if (!trimmed) return "";

  // Nếu chỉ là mã quốc gia 2 ký tự (e.g. "CN", "HK", "VN")
  const upperCode = trimmed.toUpperCase();
  if (RAW_COUNTRY_CODE_MAP[upperCode]) {
    return RAW_COUNTRY_CODE_MAP[upperCode];
  }

  // 1. Loại bỏ các emoji cờ quốc gia (Regional Indicator Symbols Unicode range: \uD83C\uDDE6 - \uD83C\uDDFF)
  let clean = trimmed.replace(/[\uD83C][\uDDE6-\uDDFF]/g, "");

  // 2. Loại bỏ các ký tự chữ cái mã vùng dư ra do font Windows không render được cờ (ví dụ: "Trung Quốc CN", "Hồng Kông HK", "Việt Nam VN")
  clean = clean.replace(/\s+(?:CN|VN|US|KR|HK|JP|TW|TH|GB|UK|FR|DE|IT|ES|IN|RU|AU|CA)$/i, "");

  // 3. Rút gọn khoảng trắng thừa
  clean = clean.replace(/\s+/g, " ").trim();

  // 4. Nếu kết quả sau khi lọc chỉ là mã quốc gia
  if (RAW_COUNTRY_CODE_MAP[clean.toUpperCase()]) {
    return RAW_COUNTRY_CODE_MAP[clean.toUpperCase()];
  }

  return clean;
}

