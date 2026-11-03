import { normalizeForMatch } from "./stringUtils";

export const ROMAN_NUMERALS: Record<string, number> = {
  i: 1,
  ii: 2,
  iii: 3,
  iv: 4,
  v: 5,
  vi: 6,
  vii: 7,
  viii: 8,
  ix: 9,
  x: 10,
};

/**
 * Trích xuất số phần phim (part/season/chapter) từ tiêu đề tiếng Việt hoặc quốc tế.
 * Nhận diện dạng chữ (phần 2, part 2, season 2, ss 2), chữ số La Mã (phần II, IV) hoặc số ở đuôi chuỗi.
 */
export function extractPartNumber(title?: string | null): number | null {
  if (!title) return null;
  const s = normalizeForMatch(title);

  // Check patterns like 'phan 2', 'part 2', 'season 2', 'ss 2', 'chapter 2', 'tap 2', 'hoi 2'
  const partWordMatch = s.match(/\b(?:phan|part|season|ss|chapter|chuong|tap|hoi)\s+([0-9]+|[ivx]+)\b/i);
  if (partWordMatch) {
    const val = partWordMatch[1].toLowerCase();
    if (/^[0-9]+$/.test(val)) return parseInt(val, 10);
    if (ROMAN_NUMERALS[val]) return ROMAN_NUMERALS[val];
  }

  // Check middle number if standalone e.g. "lat mat 2 phim truong"
  const middleNumMatch = s.match(/^[a-z\s]+\s+([0-9]+|[ivx]+)\s+[a-z\s]+$/i);
  if (middleNumMatch) {
    const val = middleNumMatch[1].toLowerCase();
    if (/^[0-9]+$/.test(val)) return parseInt(val, 10);
    if (ROMAN_NUMERALS[val]) return ROMAN_NUMERALS[val];
  }

  // Check franchise part at the end e.g. "lat mat 2", "diep van 2", "john wick 2"
  const trailingNumMatch = s.match(/\b([0-9]+|[ivx]+)$/i);
  if (trailingNumMatch) {
    const val = trailingNumMatch[1].toLowerCase();
    if (/^[0-9]+$/.test(val)) return parseInt(val, 10);
    if (ROMAN_NUMERALS[val]) return ROMAN_NUMERALS[val];
  }

  return null;
}

/**
 * Chuẩn hóa tên phim về phần thân (loại bỏ từ khóa số phần, chữ số, chữ số La Mã)
 * để so sánh phần cốt lõi của tiêu đề franchise.
 */
export function normalizeTitleCore(str?: string | null): string {
  if (!str) return "";
  let s = normalizeForMatch(str);

  // Replace part patterns: phan 1, phan ii, part 1, season 1, chapter 1, etc.
  s = s.replace(/\b(?:phan|part|season|ss|chapter|chuong|tap|hoi)\s+([0-9]+|[ivx]+)\b/gi, " ");

  // Replace standalone numbers or roman numerals
  s = s.replace(/\b([0-9]|[ivx]+)\b/gi, " ");

  // Collapse whitespace
  return s.replace(/\s+/g, " ").trim();
}

/**
 * So khớp tiêu đề ứng viên (candidate title match) cho TMDB / nguồn phim:
 * 1. Khớp tuyệt đối qua tiêu đề đã chuẩn hóa
 * 2. Khớp qua Title Core (nếu cùng franchise nhưng khác dấu câu / cách ghi)
 * 3. Khớp substring an toàn nếu tiêu đề dài (>= 6 ký tự) và không mâu thuẫn số phần
 */
export function checkCandidateTitleMatch(
  candName: string,
  candOrig: string,
  candYear: number | undefined,
  cleanOrig: string,
  cleanVi: string,
  tmdbYear: number | undefined,
  rawCreditTitle: string,
  rawCreditOrig: string
): boolean {
  const cOrig = normalizeForMatch(candOrig);
  const cName = normalizeForMatch(candName);
  const isYearMatch = !candYear || !tmdbYear || Math.abs(candYear - tmdbYear) <= 1;

  if (!isYearMatch) return false;

  // 1. Khớp tuyệt đối qua tiêu đề đã chuẩn hóa
  if (
    (cleanOrig && (cOrig === cleanOrig || cName === cleanOrig)) ||
    (cleanVi && (cName === cleanVi || cOrig === cleanVi))
  ) {
    return true;
  }

  // 2. Khớp qua Title Core (nếu chỉ khác số thứ tự phần phim / định dạng dấu :)
  const coreOrig = normalizeTitleCore(cleanOrig);
  const coreVi = normalizeTitleCore(cleanVi);
  const cNameCore = normalizeTitleCore(cName);
  const cOrigCore = normalizeTitleCore(cOrig);

  const isCoreMatch =
    (coreOrig && (cOrigCore === coreOrig || cNameCore === coreOrig)) ||
    (coreVi && (cNameCore === coreVi || cOrigCore === coreVi));

  if (isCoreMatch) {
    const partTmdb = extractPartNumber(rawCreditTitle) ?? extractPartNumber(rawCreditOrig);
    const partCandidate = extractPartNumber(candName) ?? extractPartNumber(candOrig);

    // Không match nếu cả 2 bên đều có số phần nhưng khác nhau rõ rệt (e.g. Phần 1 vs Phần 2)
    if (partTmdb !== null && partCandidate !== null && partTmdb !== partCandidate) {
      return false;
    }
    return true;
  }

  // 3. Khớp substring an toàn cho tiêu đề dài (>= 6 ký tự) và không mâu thuẫn số phần
  if (cleanOrig.length >= 6 && (cOrig.includes(cleanOrig) || cleanOrig.includes(cOrig))) {
    const partTmdb = extractPartNumber(rawCreditTitle) ?? extractPartNumber(rawCreditOrig);
    const partCandidate = extractPartNumber(candName) ?? extractPartNumber(candOrig);
    if (partTmdb !== null && partCandidate !== null && partTmdb !== partCandidate) {
      return false;
    }
    return true;
  }

  return false;
}

