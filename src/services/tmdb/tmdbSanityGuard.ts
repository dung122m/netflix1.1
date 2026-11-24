/**
 * TMDb Sanity Guard
 *
 * Chống nhiễm độc dữ liệu TMDb / IMDb từ các nguồn upstream (PhimAPI, NguonC):
 * 1. Kiểm tra tính hợp lệ cơ bản của định dạng TMDb ID (phải là chuỗi số nguyên dương).
 * 2. Xác thực đối chiếu ngữ nghĩa (Semantic Validation) chênh lệch năm phát hành và độ tương đồng tiêu đề giữa phim thực tế và bản ghi trả về từ TMDb.
 * 3. Làm sạch danh sách Tên gọi khác (alternative_names) dựa trên đối chiếu danh tính và từ tố (token overlap), loại bỏ triệt để các nhãn ngoại lai bị nhiễm độc.
 *
 * TUYỆT ĐỐI KHÔNG HARDCODE MÃ PHIM HOẶC TIÊU ĐỀ PHIM.
 */

import { normalizeVietnameseVowels } from "@/lib/stringUtils";

export interface MovieIdentity {
  name?: string;
  origin_name?: string;
  original_name?: string;
  title?: string;
  slug?: string;
  year?: string | number;
  country?: unknown;
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
 * Kiểm tra xem TMDb ID có phải là định dạng hợp lệ (số nguyên dương) hay không.
 * Thuần túy kiểm tra cấu trúc dữ liệu, không hardcode bất kỳ ID nào.
 */
export function isCorruptedTmdbId(
  tmdbId: string | number | undefined | null,
  _movie?: MovieIdentity
): boolean {
  if (!tmdbId) return true;
  const idStr = String(tmdbId).trim();
  if (!idStr || idStr === "0" || idStr === "null" || idStr === "undefined" || !/^\d+$/.test(idStr)) {
    return true;
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

const VIETNAMESE_DIACRITICS_REGEX =
  /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

/**
 * Đối chiếu chéo bản ghi trả về từ TMDb với danh tính bộ phim Nanaflix.
 * Thuần túy kiểm tra chênh lệch năm phát hành và so khớp chuỗi tiêu đề.
 * Từ chối nếu:
 * - Chênh lệch năm > 2 năm VÀ tiêu đề không có bất kỳ từ khóa tương đồng nào.
 * - Hoặc tiêu đề hoàn toàn không liên quan dù không xác định được năm.
 */
export function isTmdbPayloadMatchingMovie(
  tmdbData: TmdbMetadataPayload | null | undefined,
  movie: MovieIdentity
): boolean {
  if (!tmdbData) return false;

  const movieYear = movie.year ? parseInt(String(movie.year).trim(), 10) : NaN;
  const tmdbDate = tmdbData.release_date || tmdbData.first_air_date || "";
  const tmdbYear = tmdbDate ? parseInt(tmdbDate.slice(0, 4), 10) : NaN;

  // Xác định xem phim có nguồn gốc Việt Nam không
  const countryStr = typeof movie.country === "string"
    ? movie.country
    : Array.isArray(movie.country)
      ? movie.country
          .map((c) => {
            if (c && typeof c === "object") {
              const obj = c as Record<string, unknown>;
              return String(obj.name || obj.slug || "");
            }
            return String(c || "");
          })
          .join(" ")
      : "";

  const isExplicitVietnameseCountry =
    /vi[eêệ]t\s*nam/i.test(countryStr) ||
    /viet-?nam/i.test(countryStr);

  const hasForeignCountry =
    Boolean(countryStr) &&
    !isExplicitVietnameseCountry &&
    /(âu\s*mỹ|hàn\s*quốc|nhật\s*bản|trung\s*quốc|thái\s*lan|đài\s*loan|hồng\s*kông|ấn\s*độ|anh|pháp|đức|ý|nga|tây\s*ban\s*nha|mỹ|korea|japan|china|thailand|us|uk)/i.test(countryStr);

  // Thu thập danh sách tiêu đề chính thống của phim Nanaflix
  const primaryMovieTitles = [
    movie.name,
    movie.title,
    movie.slug ? movie.slug.replace(/-/g, " ") : "",
  ].filter((t): t is string => Boolean(t && t.trim().length >= 2));

  const hasVietnameseName = Boolean(movie.name && VIETNAMESE_DIACRITICS_REGEX.test(movie.name));
  const hasVietnameseOriginName = Boolean(movie.origin_name && VIETNAMESE_DIACRITICS_REGEX.test(movie.origin_name));

  // Phim nội địa Việt Nam:
  // 1. Metadata quốc gia chỉ rõ là Việt Nam.
  // 2. Hoặc khi không có thông tin quốc gia nước ngoài VÀ:
  //    - Tên gốc (origin_name) chứa ký tự tiếng Việt có dấu.
  //    - HOẶC tên phim chính thống có dấu tiếng Việt nhưng origin_name không có bất kỳ từ tố nào liên quan đến tên phim
  //      (dấu hiệu đặc trưng khi upstream scraper dịch máy tự động như "Xóm Nhỏ" -> "Hamlet").
  const isDomesticVietnameseMovie =
    isExplicitVietnameseCountry ||
    (!hasForeignCountry && (
      hasVietnameseOriginName ||
      (hasVietnameseName && Boolean(movie.origin_name && !checkTitlesOverlap(primaryMovieTitles, [movie.origin_name])))
    ));

  // Với phim nội địa Việt Nam, tuyệt đối không cho phép origin_name ngoại lai (do scraper dịch tự động như 'Hamlet')
  // đại diện cho bộ phim nếu không có bất kỳ từ tố nào liên quan đến tên tiếng Việt hoặc chứa ký tự tiếng Việt.
  const validOriginName =
    movie.origin_name &&
    (!isDomesticVietnameseMovie ||
      checkTitlesOverlap(primaryMovieTitles, [movie.origin_name]) ||
      hasVietnameseOriginName)
      ? movie.origin_name
      : undefined;

  const validOriginalName =
    movie.original_name &&
    (!isDomesticVietnameseMovie ||
      checkTitlesOverlap(primaryMovieTitles, [movie.original_name]) ||
      VIETNAMESE_DIACRITICS_REGEX.test(movie.original_name))
      ? movie.original_name
      : undefined;

  const movieTitles = [
    ...primaryMovieTitles,
    validOriginName,
    validOriginalName,
  ].filter((t): t is string => Boolean(t && t.trim().length >= 2));

  // Thu thập danh sách tiêu đề trả về từ TMDb
  const tmdbTitles = [
    tmdbData.title,
    tmdbData.name,
    tmdbData.original_title,
    tmdbData.original_name,
  ].filter((t): t is string => Boolean(t && t.trim().length >= 2));

  const hasOverlap = checkTitlesOverlap(movieTitles, tmdbTitles);

  // Nếu là phim nội địa Việt Nam: bắt buộc TMDb payload phải có sự tương đồng với tên chính thống tiếng Việt
  // hoặc bản thân TMDb payload phải có tiêu đề tiếng Việt. Tuyệt đối không cho phim thuần Anh/nước ngoài gán vào!
  if (isDomesticVietnameseMovie) {
    const hasPrimaryOverlap = checkTitlesOverlap(primaryMovieTitles, tmdbTitles);
    const hasVietnameseTmdb = tmdbTitles.some((t) => VIETNAMESE_DIACRITICS_REGEX.test(t));
    if (!hasPrimaryOverlap && !hasVietnameseTmdb) {
      return false;
    }
  }

  // Nếu cả 2 năm đều xác định được:
  if (!isNaN(movieYear) && !isNaN(tmdbYear)) {
    const diff = Math.abs(movieYear - tmdbYear);
    // Khi lệch nhau > 2 năm (như phim năm 1979 vs bản ghi TMDb năm 2025 lệch 46 năm)
    // bắt buộc phải có tên khớp, nếu không khớp chắc chắn là gán nhầm!
    if (diff > 2 && !hasOverlap) {
      return false;
    }
  }

  // Nếu tiêu đề hoàn toàn không có sự tương đồng:
  if (!hasOverlap) {
    // 1. Cả hai bên đều có tiêu đề tiếng Việt nhưng không có từ tố nào trùng nhau
    // (như "Bình Minh Đỏ" bị gán nhầm sang "Những Đứa Trẻ Trong Sương" cùng năm 2022)
    const hasVietnameseMovieTitle = movieTitles.some((t) => VIETNAMESE_DIACRITICS_REGEX.test(t));
    const hasVietnameseTmdbTitle = tmdbTitles.some((t) => VIETNAMESE_DIACRITICS_REGEX.test(t));
    if (hasVietnameseMovieTitle && hasVietnameseTmdbTitle) {
      return false;
    }

    // 2. Nếu không xác định được năm (hoặc chênh lệch năm) và tiêu đề hoàn toàn không liên quan
    if (isNaN(movieYear) || isNaN(tmdbYear)) {
      if (tmdbTitles.length > 0 && movieTitles.length > 0) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Loại bỏ các tên gọi khác bị nhiễm độc từ upstream scraper dựa trên đối chiếu danh tính.
 * Thuần túy dùng thuật toán so khớp từ tố và nguồn gốc xuất xứ, KHÔNG hardcode tên phim.
 */
export function sanitizeMovieAltNames(
  altNames: string[] | string | undefined | null,
  movie: MovieIdentity
): string[] {
  if (!altNames) return [];
  const list = Array.isArray(altNames)
    ? altNames
    : String(altNames).split(",").map((s) => s.trim()).filter(Boolean);

  const movieTitles = [
    movie.name,
    movie.origin_name,
    movie.original_name,
    movie.title,
    movie.slug ? movie.slug.replace(/-/g, " ") : "",
  ].filter((t): t is string => Boolean(t && t.trim().length >= 2));

  // Tập hợp các từ đơn chuẩn hóa từ danh tính của bộ phim
  const identityTokens = new Set<string>();
  for (const t of movieTitles) {
    const tokens = extractTokens(t);
    for (const tok of tokens) {
      identityTokens.add(tok);
    }
  }

  // Kiểm tra xem phim có phải là phim nội địa Việt Nam không
  const countryStr = typeof movie.country === "string"
    ? movie.country
    : Array.isArray(movie.country)
      ? movie.country
          .map((c) => {
            if (c && typeof c === "object") {
              const obj = c as Record<string, unknown>;
              return String(obj.name || obj.slug || "");
            }
            return String(c || "");
          })
          .join(" ")
      : "";

  const hasVietnamCountry = /vi[eêệ]t\s*nam/i.test(countryStr) || /viet-?nam/i.test(countryStr);

  // Phim nội địa Việt Nam:
  // 1. Quốc gia là Việt Nam
  // 2. Hoặc nếu chưa có dữ liệu quốc gia: không có tên gốc nước ngoài và tiêu đề chứa ký tự tiếng Việt
  const isDomesticVietnameseMovie = hasVietnamCountry || Boolean(
    !movie.country &&
    !movie.origin_name &&
    (VIETNAMESE_DIACRITICS_REGEX.test(movie.name || "") || VIETNAMESE_DIACRITICS_REGEX.test(movie.title || ""))
  );

  return list.filter((alt) => {
    if (!alt || typeof alt !== "string") return false;
    const clean = alt.trim();
    if (clean.length < 2) return false;

    // 1. Nếu tên gọi khác trùng khớp hoặc là chuỗi con của bất kỳ tiêu đề gốc nào -> chấp nhận
    for (const t of movieTitles) {
      const normT = normalizeVietnameseVowels(t);
      const normAlt = normalizeVietnameseVowels(clean);
      if (normT === normAlt || normT.includes(normAlt) || normAlt.includes(normT)) {
        return true;
      }
    }

    // 2. Kiểm tra token overlap
    const altTokens = extractTokens(clean);
    const hasCommonToken = altTokens.some((tok) => identityTokens.has(tok));
    if (hasCommonToken) {
      return true;
    }

    // 3. Với phim nội địa Việt Nam:
    // Nếu một tên gọi khác hoàn toàn không có bất kỳ từ tố nào liên quan đến tên tiếng Việt hoặc tên gốc
    // (ví dụ: các nhãn phim ngoại hoàn toàn xa lạ do nguồn phát gán nhầm từ bản ghi TMDb lỗi)
    // -> Loại bỏ để bảo toàn độ chính xác cho phim
    if (isDomesticVietnameseMovie && !hasCommonToken) {
      return false;
    }

    return true;
  });
}
