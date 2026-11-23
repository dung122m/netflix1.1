/**
 * TMDb Sanity Guard
 *
 * Chống nhiễm độc dữ liệu TMDb / IMDb từ các nguồn upstream (PhimAPI, NguonC):
 * 1. Phát hiện và loại bỏ các mã TMDb ID gán nhầm hàng loạt từ nguồn phát (vd: ID 1126166 Flight Risk gán nhầm cho 19 phim Việt Nam kinh điển).
 * 2. Xác thực đối chiếu năm phát hành và tiêu đề giữa phim thực tế và bản ghi TMDb (ngăn chặn chênh lệch > 2 năm không trùng tên).
 * 3. Làm sạch danh sách Tên gọi khác (alternative_names) bị nhiễm độc nhãn phim ngoại.
 */

import { normalizeForMatch, normalizeVietnameseVowels } from "@/lib/stringUtils";

export interface MovieIdentity {
  name?: string;
  origin_name?: string;
  original_name?: string;
  title?: string;
  slug?: string;
  year?: string | number;
}

export interface TmdbMetadataPayload {
  id?: string | number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
}

/**
 * Kiểm tra xem TMDb ID từ nguồn phát có phải là ID rác / gán nhầm hàng loạt không.
 */
export function isCorruptedTmdbId(
  tmdbId: string | number | undefined | null,
  movie: MovieIdentity
): boolean {
  if (!tmdbId) return false;
  const idStr = String(tmdbId).trim();
  if (!idStr || idStr === "0" || idStr === "null" || idStr === "undefined") return true;

  const rawName = (movie.name || movie.title || "").trim().toLowerCase();
  const rawOrigin = (movie.origin_name || movie.original_name || "").trim().toLowerCase();
  const rawSlug = (movie.slug || "").trim().toLowerCase();
  const combined = `${rawName} ${rawOrigin} ${rawSlug}`;

  // 1. ID 1126166 là "Flight Risk" (Cuộc Đào Tẩu Trên Không - 2025, Mark Wahlberg).
  // PhimAPI đã gán nhầm ID này cho 19 phim điện ảnh kinh điển Việt Nam (Cánh Đồng Hoang 1979, Nơi Bình Yên Chim Hót 1986, Mùa Gió Chướng 1978, v.v.).
  if (idStr === "1126166") {
    const isActuallyFlightRisk =
      combined.includes("flight risk") ||
      combined.includes("cuoc dao tau tren khong") ||
      combined.includes("cuộc đào tẩu trên không");
    if (!isActuallyFlightRisk) return true;
  }

  // 2. ID 893030 là "Những Đứa Trẻ Trong Sương" (2022).
  // PhimAPI gán nhầm cho phim "Bình Minh Đỏ" (2022).
  if (idStr === "893030") {
    const isActuallyChildrenOfTheMist =
      combined.includes("nhung dua tre trong suong") ||
      combined.includes("những đứa trẻ trong sương") ||
      combined.includes("children of the mist");
    if (!isActuallyChildrenOfTheMist) return true;
  }

  return false;
}

/**
 * Tách chuỗi thành mảng các từ đơn (tokens) có ý nghĩa (bỏ ký tự đặc biệt, chuẩn hóa i/y)
 */
function extractTokens(str: string): string[] {
  const norm = normalizeVietnameseVowels(str);
  return norm.split(/\s+/).filter((w) => w.length >= 2);
}

/**
 * Kiểm tra độ tương đồng tiêu đề giữa danh sách tiêu đề phim Nanaflix và TMDb.
 */
function checkTitlesOverlap(movieTitles: string[], tmdbTitles: string[]): boolean {
  for (const mTitle of movieTitles) {
    const normM = normalizeVietnameseVowels(mTitle);
    if (!normM) continue;
    const tokensM = extractTokens(normM);

    for (const tTitle of tmdbTitles) {
      const normT = normalizeVietnameseVowels(tTitle);
      if (!normT) continue;
      const tokensT = extractTokens(normT);

      // 1. Khớp chính xác hoặc là chuỗi con trực tiếp
      if (normM === normT || normM.includes(normT) || normT.includes(normM)) {
        return true;
      }

      // 2. Token overlap: nếu có từ 2 từ trùng nhau hoặc >= 50% số từ của tiêu đề ngắn hơn
      if (tokensM.length > 0 && tokensT.length > 0) {
        const setT = new Set(tokensT);
        const commonTokens = tokensM.filter((t) => setT.has(t));
        const minLength = Math.min(tokensM.length, tokensT.length);
        if (commonTokens.length >= 2 || (minLength > 0 && commonTokens.length / minLength >= 0.5)) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Đối chiếu chéo bản ghi trả về từ TMDb với danh tính bộ phim Nanaflix.
 * Từ chối nếu:
 * - Chênh lệch năm > 2 năm VÀ tiêu đề không có bất kỳ từ khóa tương đồng nào.
 */
export function isTmdbPayloadMatchingMovie(
  tmdbData: TmdbMetadataPayload | null | undefined,
  movie: MovieIdentity
): boolean {
  if (!tmdbData) return false;

  const movieYear = movie.year ? parseInt(String(movie.year).trim(), 10) : NaN;
  const tmdbDate = tmdbData.release_date || tmdbData.first_air_date || "";
  const tmdbYear = tmdbDate ? parseInt(tmdbDate.slice(0, 4), 10) : NaN;

  // Thu thập danh sách tiêu đề của phim Nanaflix
  const movieTitles = [
    movie.name,
    movie.origin_name,
    movie.original_name,
    movie.title,
    movie.slug ? movie.slug.replace(/-/g, " ") : "",
  ].filter((t): t is string => Boolean(t && t.trim().length >= 2));

  // Thu thập danh sách tiêu đề trả về từ TMDb
  const tmdbTitles = [
    tmdbData.title,
    tmdbData.name,
    tmdbData.original_title,
    tmdbData.original_name,
  ].filter((t): t is string => Boolean(t && t.trim().length >= 2));

  const hasOverlap = checkTitlesOverlap(movieTitles, tmdbTitles);

  // Nếu cả 2 năm đều xác định được:
  if (!isNaN(movieYear) && !isNaN(tmdbYear)) {
    const diff = Math.abs(movieYear - tmdbYear);
    // Khi lệch nhau > 2 năm (như Cánh Đồng Hoang 1979 vs Flight Risk 2025 lệch 46 năm)
    // bắt buộc phải có tên khớp, nếu không khớp chắc chắn là gán nhầm!
    if (diff > 2 && !hasOverlap) {
      return false;
    }
    // Nếu chênh lệch năm <= 2 năm, đây là bản ghi hợp lệ từ cùng thời kỳ
    return true;
  }

  // Nếu không xác định được năm (hoặc 1 bên thiếu năm):
  // Nếu có trùng khớp tiêu đề -> chấp nhận
  if (hasOverlap) return true;

  // Nếu cả năm không có và tiêu đề hoàn toàn không liên quan -> từ chối
  if (tmdbTitles.length > 0 && movieTitles.length > 0) {
    return false;
  }

  return true;
}

/**
 * Loại bỏ các tên gọi khác bị nhiễm độc từ upstream scraper.
 */
export function sanitizeMovieAltNames(
  altNames: string[] | string | undefined | null,
  movie: MovieIdentity
): string[] {
  if (!altNames) return [];
  const list = Array.isArray(altNames)
    ? altNames
    : String(altNames).split(",").map((s) => s.trim()).filter(Boolean);

  const rawName = (movie.name || movie.title || "").trim().toLowerCase();
  const rawOrigin = (movie.origin_name || movie.original_name || "").trim().toLowerCase();
  const isFlightRisk =
    rawName.includes("flight risk") ||
    rawOrigin.includes("flight risk") ||
    rawName.includes("cuoc dao tau tren khong");

  return list.filter((alt) => {
    if (!alt || typeof alt !== "string") return false;
    const clean = alt.trim().toLowerCase();
    // Loại bỏ nhãn của Flight Risk gán nhầm vào phim Việt Nam
    if (!isFlightRisk && (clean === "flight risk" || clean === "vol à haut risque" || clean === "插翅难飞")) {
      return false;
    }
    return true;
  });
}
