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

import { COUNTRY_DISPLAY_MAP } from "@/data/movies/taxonomy";

/**
 * Chuẩn hóa tên quốc gia, loại bỏ cờ emoji (Regional Indicator Symbols như 🇨🇳, 🇻🇳, 🇺🇸...)
 * và mã quốc gia viết hoa kèm theo trên Windows (ví dụ: "Trung Quốc 🇨🇳" -> "Trung Quốc", "Hồng Kông HK" -> "Hồng Kông")
 */
export function cleanCountryName(country?: string | null): string {
  if (!country) return "";
  const trimmed = country.trim();
  if (!trimmed) return "";

  // Nếu chỉ là mã quốc gia 2-3 ký tự (e.g. "CN", "HK", "VN")
  if (trimmed.length <= 3) {
    const mapped = COUNTRY_DISPLAY_MAP[trimmed.toLowerCase()];
    if (mapped) return mapped;
  }

  // 1. Loại bỏ các emoji cờ quốc gia (Regional Indicator Symbols Unicode range: \uD83C\uDDE6 - \uD83C\uDDFF)
  let clean = trimmed.replace(/[\uD83C][\uDDE6-\uDDFF]/g, "");

  // 2. Loại bỏ các ký tự chữ cái mã vùng dư ra do font Windows không render được cờ (ví dụ: "Trung Quốc CN", "Hồng Kông HK", "Việt Nam VN")
  clean = clean.replace(/\s+(?:CN|VN|US|KR|HK|JP|TW|TH|GB|UK|FR|DE|IT|ES|IN|RU|AU|CA)$/i, "");

  // 3. Rút gọn khoảng trắng thừa
  clean = clean.replace(/\s+/g, " ").trim();

  // 4. Nếu kết quả sau khi lọc chỉ là mã quốc gia
  if (clean.length <= 3) {
    const mapped = COUNTRY_DISPLAY_MAP[clean.toLowerCase()];
    if (mapped) return mapped;
  }

  return clean;
}

/**
 * Kiểm tra xem chuỗi có chứa chữ viết tượng hình / chữ châu Á
 * (Chữ Hán / Hanzi / Kanji, Hiragana / Katakana tiếng Nhật, Hangul tiếng Hàn, chữ Thái)
 */
export function isAsianScript(str?: string | null): boolean {
  if (!str) return false;
  return /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}]/u.test(str);
}

/**
 * Chuẩn hóa chuỗi thành slug URL không dấu, gạch nối ngăn cách
 * (ví dụ: "Lật Mặt 7: Một Điều Ước" -> "lat-mat-7-mot-dieu-uoc", "lat mat 7" -> "lat-mat-7")
 */
export function slugify(str?: string | null): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .normalize("NFC")
    .replace(/[^\p{L}\p{M}\p{N}\s-]/gu, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Thuật toán Damerau-Levenshtein Distance cục bộ
 * Tính toán khoảng cách chỉnh sửa có tính đến hoán vị 2 ký tự liền kề (transposition),
 * chèn (insertion), xóa (deletion), và thay thế (substitution).
 * Độ phức tạp O(N * M), tính toán trực tiếp giữa chuỗi ngắn (< 100 ký tự) tốn < 0.1ms.
 */
export function damerauLevenshteinDistance(source: string, target: string): number {
  if (source === target) return 0;
  const sLen = source.length;
  const tLen = target.length;
  if (sLen === 0) return tLen;
  if (tLen === 0) return sLen;

  const d: number[][] = Array.from({ length: sLen + 2 }, () => new Array(tLen + 2).fill(0));
  const maxDist = sLen + tLen;
  d[0][0] = maxDist;

  for (let i = 0; i <= sLen; i++) {
    d[i + 1][0] = maxDist;
    d[i + 1][1] = i;
  }
  for (let j = 0; j <= tLen; j++) {
    d[0][j + 1] = maxDist;
    d[1][j + 1] = j;
  }

  const lastRow = new Map<string, number>();

  for (let i = 1; i <= sLen; i++) {
    let db = 0;
    const sChar = source[i - 1];
    for (let j = 1; j <= tLen; j++) {
      const tChar = target[j - 1];
      const i1 = lastRow.get(tChar) || 0;
      const j1 = db;
      let cost = 1;
      if (sChar === tChar) {
        cost = 0;
        db = j;
      }

      d[i + 1][j + 1] = Math.min(
        d[i][j + 1] + 1, // deletion
        d[i + 1][j] + 1, // insertion
        d[i][j] + cost,  // substitution
        d[i1][j1] + (i - i1 - 1) + 1 + (j - j1 - 1) // transposition
      );
    }
    lastRow.set(sChar, i);
  }

  return d[sLen + 1][tLen + 1];
}

/**
 * Tính hệ số tương đồng Damerau-Levenshtein (0.0 đến 1.0)
 * Trả về 1.0 nếu chuỗi giống nhau hoàn toàn, 0.0 nếu khác biệt tối đa.
 */
export function calculateDamerauLevenshteinSimilarity(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = damerauLevenshteinDistance(a, b);
  return Math.max(0, 1 - dist / maxLen);
}



