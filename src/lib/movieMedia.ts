import { cleanHtmlText } from "@/lib/cleanHtml";
import { normalizeForMatch } from "@/lib/stringUtils";
import { getR2BannerUrl } from "@/lib/r2Manifest";
import {
  KNOWN_COUNTRIES,
  COUNTRY_DISPLAY_MAP,
  GENRE_DISPLAY_MAP,
  KNOWN_GENRE_SET,
  TMDB_GENRE_ID_MAP,
  TMDB_SAFE_LANGUAGE_COUNTRY_MAP,
  NGUONC_HASH_MAP,
} from "@/data/movies/taxonomy";

export {
  KNOWN_COUNTRIES,
  COUNTRY_DISPLAY_MAP,
  GENRE_DISPLAY_MAP,
  KNOWN_GENRE_SET,
  TMDB_GENRE_ID_MAP,
  TMDB_SAFE_LANGUAGE_COUNTRY_MAP,
  NGUONC_HASH_MAP,
};

export type MovieLike = {
  poster_url?: unknown;
  thumb_url?: unknown;
  imageUrl?: unknown;
  [key: string]: unknown;
};

/**
 * Trích xuất và chuẩn hóa điểm đánh giá thống nhất từ TMDB / IMDb / internal score.
 * - Trả về rating trong khoảng (0, 10] và voteCount >= 0.
 * - Điểm không hợp lệ, null, NaN hoặc <= 0 trả về 0 (không tự gán điểm cao).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractMovieRatingScore(m: any): { rating: number; voteCount: number } {
  if (!m) return { rating: 0, voteCount: 0 };
  const rawRating =
    m.tmdb?.vote_average ??
    m.imdb?.vote_average ??
    m.imdb?.rating ??
    m.vote_average ??
    m.score ??
    m.rating;
  const parsedRating = typeof rawRating === "string" ? parseFloat(rawRating) : Number(rawRating);
  const rating = Number.isFinite(parsedRating) && parsedRating > 0 && parsedRating <= 10 ? parsedRating : 0;

  const rawVoteCount = m.tmdb?.vote_count ?? m.imdb?.vote_count ?? 0;
  const parsedVoteCount = typeof rawVoteCount === "string" ? parseInt(rawVoteCount, 10) : Number(rawVoteCount);
  const voteCount = Number.isFinite(parsedVoteCount) && parsedVoteCount > 0 ? parsedVoteCount : 0;

  return { rating, voteCount };
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractMovieModifiedTime(m: any): number {
  if (!m) return 0;
  const rawTime =
    m.modified?.time ??
    (typeof m.modified === 'string' ? m.modified : undefined) ??
    m.updated_at ??
    m.created ??
    m.created_at;
  if (!rawTime || typeof rawTime !== 'string') return 0;
  const parsed = new Date(rawTime).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function isBrokenImageUrl(url?: unknown): boolean {
  if (!url || typeof url !== "string") return true;
  const s = url.trim();
  if (
    !s ||
    s === "null" ||
    s === "undefined" ||
    s.endsWith("/null") ||
    s.endsWith("/undefined")
  ) {
    return true;
  }
  return false;
}

// ============================================================
// KHỬ TRÙNG LẶP & LỌC ỨNG VIÊN (GIỮ SOURCE PROVENANCE)
// ============================================================
export function cleanNormalizedForMatch(str: string): string {
  return (str || "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type TitleEvidence = { score: number; matched: boolean };

export function getTitleEvidence(
  movie: { name?: unknown; title?: unknown; origin_name?: unknown; slug?: unknown },
  query: string
): TitleEvidence {
  const cleanQuery = cleanNormalizedForMatch(query);
  if (!cleanQuery) return { score: 0, matched: false };

  const name = cleanNormalizedForMatch(String(movie.name || movie.title || ""));
  const original = cleanNormalizedForMatch(String(movie.origin_name || ""));
  const slug = cleanNormalizedForMatch(String(movie.slug || ""));
  const slugQuery = cleanQuery.replace(/\s+/g, "-");

  if (name === cleanQuery || original === cleanQuery || slug === cleanQuery || slug === slugQuery) {
    return { score: 100, matched: true };
  }

  const escapedCleanQuery = cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const startsWithWordRegex = new RegExp(`^${escapedCleanQuery}(?:$|\\s)`, "i");
  const startsWithSlugRegex = new RegExp(`^${slugQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|-)`, "i");
  if (startsWithWordRegex.test(name) || startsWithWordRegex.test(original) || startsWithSlugRegex.test(slug)) {
    return { score: 85, matched: true };
  }

  const phrasePattern = new RegExp(
    `(?:^|\\s)${cleanQuery.split(" ").map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\\\$&")).join("\\\\s+")}(?=$|\\s)`
  );
  if (phrasePattern.test(name) || phrasePattern.test(original) || phrasePattern.test(slug)) {
    return { score: 70, matched: true };
  }

  return { score: 0, matched: false };
}

export interface SearchRelevanceResult {
  score: number;
  matchType: "title" | "actor" | "content";
  matchSnippet?: string;
}

export function evaluateSearchRelevance(
  movie: { name?: unknown; title?: unknown; origin_name?: unknown; slug?: unknown; content?: unknown; description?: unknown },
  query: string
): SearchRelevanceResult {
  if (!query || !query.trim()) return { score: 100, matchType: "title" };
  const rawKw = query.trim().toLowerCase();
  const normKw = cleanNormalizedForMatch(query);
  if (!normKw) return { score: 0, matchType: "title" };

  const rawTitle = String(movie.name || movie.title || "").trim().toLowerCase();
  const rawOrig = String(movie.origin_name || "").trim().toLowerCase();
  const slug = String(movie.slug || "").trim().toLowerCase();

  const normTitle = cleanNormalizedForMatch(rawTitle);
  const normOrig = cleanNormalizedForMatch(rawOrig);
  const normSlug = slug.replace(/-/g, " ");

  const escapedNormKw = normKw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedRawKw = rawKw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // 1. EXACT FULL MATCH
  const slugKw = normKw.replace(/\s+/g, "-");
  if (rawTitle === rawKw || rawOrig === rawKw || slug === slugKw) {
    return { score: 100, matchType: "title" };
  }
  if (normTitle === normKw || normOrig === normKw || normSlug === normKw) {
    return { score: 95, matchType: "title" };
  }

  // 2. STARTS WITH FULL PHRASE
  const startsWithRawRegex = new RegExp(`^${escapedRawKw}(?:$|\\s)`, "i");
  const startsWithNormRegex = new RegExp(`^${escapedNormKw}(?:$|\\s)`, "i");
  if (startsWithRawRegex.test(rawTitle) || startsWithRawRegex.test(rawOrig)) {
    return { score: 90, matchType: "title" };
  }
  if (startsWithNormRegex.test(normTitle) || startsWithNormRegex.test(normOrig) || startsWithNormRegex.test(normSlug)) {
    return { score: 85, matchType: "title" };
  }

  // 3. CONTAINS FULL PHRASE
  const containsRawRegex = new RegExp(`(?:^|\\s)${escapedRawKw}(?:$|\\s)`, "i");
  const containsNormRegex = new RegExp(`(?:^|\\s)${escapedNormKw}(?:$|\\s)`, "i");
  if (containsRawRegex.test(rawTitle) || containsRawRegex.test(rawOrig)) {
    return { score: 85, matchType: "title" };
  }
  if (containsNormRegex.test(normTitle) || containsNormRegex.test(normOrig) || containsNormRegex.test(normSlug)) {
    return { score: 80, matchType: "title" };
  }

  // 4. DIACRITIC-AWARE MULTI-WORD / SINGLE-WORD MATCHING
  const userHasDiacritics = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(query);
  const kwWords = rawKw.split(/\s+/).filter((w) => w.length > 0);

  if (userHasDiacritics) {
    if (kwWords.length > 1) {
      const titleTokens = rawTitle.split(/[^\w\u00C0-\u1EF9]+/).filter(Boolean);
      const origTokens = rawOrig.split(/[^\w\u00C0-\u1EF9]+/).filter(Boolean);
      const allTokens = new Set([...titleTokens, ...origTokens]);

      const allWordsPresent = kwWords.every((qw) => allTokens.has(qw));
      if (allWordsPresent) return { score: 75, matchType: "title" };
      return { score: 0, matchType: "title" };
    }
    const singleWordRegex = new RegExp(`(?:^|\\s)${escapedRawKw}(?:$|\\s)`, "i");
    if (singleWordRegex.test(rawTitle) || singleWordRegex.test(rawOrig)) {
      return { score: 75, matchType: "title" };
    }
    return { score: 0, matchType: "title" };
  }

  // 5. UNACCENTED TOKEN MATCH
  const normKwTokens = normKw.split(/\s+/).filter((w) => w.length > 1);
  if (normKwTokens.length > 1) {
    const titleTokens = new Set(normTitle.split(/\s+/).filter(Boolean));
    const origTokens = new Set(normOrig.split(/\s+/).filter(Boolean));
    const slugTokens = new Set(normSlug.split(/\s+/).filter(Boolean));

    const matchedTokensCount = normKwTokens.filter(
      (tok) => titleTokens.has(tok) || origTokens.has(tok) || slugTokens.has(tok)
    ).length;

    if (matchedTokensCount === normKwTokens.length) {
      return { score: 65, matchType: "title" };
    }
    if (matchedTokensCount / normKwTokens.length >= 0.75) {
      return { score: 45, matchType: "title" };
    }
    return { score: 0, matchType: "title" };
  }

  // 6. SINGLE-WORD UNACCENTED SEARCH
  if (normKwTokens.length === 1) {
    const singleWord = normKwTokens[0];
    const wordRegex = new RegExp(`(?:^|\\s)${singleWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|\\s)`, "i");
    if (wordRegex.test(normTitle) || wordRegex.test(normOrig) || wordRegex.test(normSlug)) {
      return { score: 70, matchType: "title" };
    }
  }

  // 7. CONTENT / SYNOPSIS MATCH
  const desc = cleanNormalizedForMatch(String(movie.content || movie.description || ""));
  if (desc && containsNormRegex.test(desc)) {
    return {
      score: 30,
      matchType: "content",
    };
  }

  return { score: 0, matchType: "title" };
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function deduplicateMovieItems(items: any[]): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seenMap = new Map<string, any>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uniqueItems: any[] = [];

  for (const item of items) {
    if (!item) continue;
    const tmdbId = item.tmdb?.id ? String(item.tmdb.id).trim() : "";
    const imdbId = item.imdb?.id ? String(item.imdb.id).trim().toLowerCase() : "";
    const slug = item.slug ? String(item.slug).trim().toLowerCase() : "";
    const year = item.year ? String(item.year).trim() : "";
    const normName = item.name ? normalizeForMatch(String(item.name)) : "";
    const titleYearKey = normName && year ? `${normName}_${year}` : "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let existing: any = null;
    if (tmdbId && seenMap.has(`tmdb:${tmdbId}`)) existing = seenMap.get(`tmdb:${tmdbId}`);
    else if (imdbId && seenMap.has(`imdb:${imdbId}`)) existing = seenMap.get(`imdb:${imdbId}`);
    else if (slug && seenMap.has(`slug:${slug}`)) existing = seenMap.get(`slug:${slug}`);
    else if (titleYearKey && seenMap.has(`ty:${titleYearKey}`)) existing = seenMap.get(`ty:${titleYearKey}`);
    else if (normName && seenMap.has(`name:${normName}`)) {
      const candidate = seenMap.get(`name:${normName}`);
      const candYear = candidate.year ? String(candidate.year).trim() : "";
      if (!year || !candYear || year === candYear) {
        existing = candidate;
      }
    }

    if (existing) {
      // Merge source provenance
      const itemSources = Array.isArray(item.sources) ? item.sources : (item.source ? [item.source] : []);
      const existingSources = Array.isArray(existing.sources) ? existing.sources : (existing.source ? [existing.source] : []);
      const mergedSources = Array.from(new Set([...existingSources, ...itemSources]));
      existing.sources = mergedSources;

      // Merge missing metadata hoặc nâng cấp ảnh nếu existing bị trỏ vào CDN lỗi (upload/vod)
      if (!existing.origin_name && item.origin_name) existing.origin_name = item.origin_name;
      if (
        (!existing.poster_url || isBrokenImageUrl(existing.poster_url)) &&
        item.poster_url &&
        !isBrokenImageUrl(item.poster_url)
      ) {
        existing.poster_url = item.poster_url;
      } else if (!existing.poster_url && item.poster_url) {
        existing.poster_url = item.poster_url;
      }

      if (
        (!existing.thumb_url || isBrokenImageUrl(existing.thumb_url)) &&
        item.thumb_url &&
        !isBrokenImageUrl(item.thumb_url)
      ) {
        existing.thumb_url = item.thumb_url;
      } else if (!existing.thumb_url && item.thumb_url) {
        existing.thumb_url = item.thumb_url;
      }
      if (!existing.year && item.year) existing.year = item.year;
      if (!existing.quality && item.quality) existing.quality = item.quality;
      if (!existing.lang && item.lang) existing.lang = item.lang;
      if (!existing.time && item.time) existing.time = item.time;
      if ((!existing.category || (Array.isArray(existing.category) && existing.category.length === 0)) && item.category && (!Array.isArray(item.category) || item.category.length > 0)) {
        existing.category = item.category;
      }
      if ((!existing.country || (Array.isArray(existing.country) && existing.country.length === 0)) && item.country && (!Array.isArray(item.country) || item.country.length > 0)) {
        existing.country = item.country;
      }
      if ((!existing.genre_ids || (Array.isArray(existing.genre_ids) && existing.genre_ids.length === 0)) && item.genre_ids) {
        existing.genre_ids = item.genre_ids;
      }
      if (!existing.original_language && item.original_language) {
        existing.original_language = item.original_language;
      }
      if (!existing.tmdb && item.tmdb) {
        existing.tmdb = item.tmdb;
      } else if (existing.tmdb && item.tmdb) {
        const existingRate = Number(existing.tmdb.vote_average || 0);
        const itemRate = Number(item.tmdb.vote_average || 0);
        if (existingRate <= 0 && itemRate > 0) {
          existing.tmdb.vote_average = itemRate;
          if (item.tmdb.vote_count) existing.tmdb.vote_count = item.tmdb.vote_count;
        }
      }
      if (!existing.imdb && item.imdb) {
        existing.imdb = item.imdb;
      } else if (existing.imdb && item.imdb) {
        const existingRate = Number(existing.imdb.vote_average || 0);
        const itemRate = Number(item.imdb.vote_average || 0);
        if (existingRate <= 0 && itemRate > 0) {
          existing.imdb.vote_average = itemRate;
          if (item.imdb.vote_count) existing.imdb.vote_count = item.imdb.vote_count;
        }
      }

      // Giữ thời gian cập nhật mới nhất giữa các nguồn
      const existingMod = extractMovieModifiedTime(existing);
      const itemMod = extractMovieModifiedTime(item);
      if (itemMod > existingMod) {
        existing.modified = item.modified;
      }

      continue;
    }

    // Đảm bảo item có sources
    if (!item.sources) {
      item.sources = item.source ? [item.source] : (item._id && !String(item._id).includes("-") ? ["phimapi"] : ["nguonc"]);
    }

    if (tmdbId) seenMap.set(`tmdb:${tmdbId}`, item);
    if (imdbId) seenMap.set(`imdb:${imdbId}`, item);
    if (slug) seenMap.set(`slug:${slug}`, item);
    if (titleYearKey) seenMap.set(`ty:${titleYearKey}`, item);
    if (normName && !seenMap.has(`name:${normName}`)) seenMap.set(`name:${normName}`, item);

    uniqueItems.push(item);
  }

  return uniqueItems;
}


export function sanitizeImageUrl(url: string): string {
  if (!url || typeof url !== "string") return "";
  let clean = url.trim();
  if (isBrokenImageUrl(clean)) {
    return "";
  }
  // Mở bọc nếu URL đang bị wrap qua proxy /api/img-thumb
  if (clean.includes("/api/img-thumb?url=")) {
    try {
      const match = clean.match(/[?&]url=([^&]+)/);
      if (match && match[1]) {
        clean = decodeURIComponent(match[1]);
      }
    } catch {}
  }

  if (!clean.startsWith("http://") && !clean.startsWith("https://") && !clean.startsWith("/")) {
    return "";
  }
  // Sửa lỗi url có 2 dấu gạch chéo // sau tên miền (gây redirect chậm)
  clean = clean.replace(/(https?:\/\/)([^/]+)\/\/+/g, "$1$2/");

  // Tối ưu ảnh NguonC: Nhận diện mã hash TMDb (kể cả có subfolder /movie-slug/ và tiền tố poster_/backdrop_)
  const tmdbHashMatch = clean.match(
    /https?:\/\/(?:phim\.nguonc\.com\/public\/images\/Film)(?:\/[^/]+)*\/(?:poster_|backdrop_)?([a-zA-Z0-9]{22,35}\.(?:jpg|jpeg|png|webp))$/i
  );
  if (tmdbHashMatch && !tmdbHashMatch[1].includes("-")) {
    clean = `https://image.tmdb.org/t/p/w500/${tmdbHashMatch[1]}`;
  }

  // Tối ưu ảnh TMDB: Dùng w780 (chuẩn HD cho màn hình Retina 2x & màn hình lớn), giữ nguyên độ nét mà nén chỉ ~45KB
  if (clean.includes("image.tmdb.org/t/p/original/")) {
    clean = clean.replace("/t/p/original/", "/t/p/w780/");
  } else if (clean.includes("image.tmdb.org/t/p/w1280/")) {
    clean = clean.replace("/t/p/w1280/", "/t/p/w780/");
  }

  // Tối ưu ảnh IMDb: Amazon CloudFront CDN cho phép resize tự động bằng URL slug
  // Dùng _UX720_ chuẩn HD sắc sảo từng nét chữ trên cả màn hình Retina 2x/4K, nén chỉ ~35KB
  if (clean.includes("media-amazon.com/images/M/")) {
    clean = clean.replace(/_V1_.*(\.(?:jpg|jpeg|png|webp))$/i, "_V1_QL85_UX720_$1");
  }

  return clean;
}

export function isNguonCSource(movie: MovieLike): boolean {
  if (!movie) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = (movie as any)?.movie || movie;
  const p = String(raw.poster_url || raw.posterUrl || "");
  const t = String(raw.thumb_url || raw.thumbUrl || "");
  return (
    p.includes("nguonc.com") ||
    t.includes("nguonc.com") ||
    (raw._id !== undefined && typeof raw._id === "number")
  );
}

export function pickBestMoviePoster(movie: MovieLike, fallback = "/default-poster.svg"): string {
  if (!movie) return fallback;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawMovie = (movie as any)?.movie || movie;
  const isNguonC = isNguonCSource(movie);

  // NguonC đảo ngược trường: thumb_url là poster dọc (2:3), poster_url là backdrop ngang (16:9)
  const primary = isNguonC
    ? rawMovie.thumb_url || rawMovie.thumbUrl || movie.thumb_url || movie.thumbUrl
    : rawMovie.poster_url || rawMovie.posterUrl || movie.poster_url || movie.posterUrl;

  const secondary = isNguonC
    ? rawMovie.poster_url || rawMovie.posterUrl || movie.poster_url || movie.posterUrl
    : rawMovie.thumb_url || rawMovie.thumbUrl || movie.thumb_url || movie.thumbUrl;

  const candidates = [primary, secondary, movie.imageUrl]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .map(sanitizeImageUrl)
    .filter((url) => Boolean(url) && !url.endsWith("/null") && !url.endsWith("/undefined"));

  if (candidates.length === 0) return fallback;

  // 1. Ưu tiên tuyệt đối TMDb CDN chính hãng (image.tmdb.org)
  for (const c of candidates) {
    if (c.includes("image.tmdb.org")) {
      return c;
    }
  }

  // 1.1 Ưu tiên AniList CDN chính hãng cho Anime/Hoạt hình (s4.anilist.co)
  for (const c of candidates) {
    if (c.includes("anilist.co")) {
      return c;
    }
  }

  // 2. Ưu tiên bất kỳ CDN / nguồn ảnh nào KHÔNG PHẢI phimimg.com (như NguonC, Amazon, v.v.)
  for (const c of candidates) {
    if (!c.includes("phimimg.com")) {
      const l = c.toLowerCase();
      if (
        l.includes("-poster") ||
        l.includes("poster_") ||
        l.includes("/poster") ||
        l.includes("/post/") ||
        l.includes("/w500") ||
        l.includes("/w300") ||
        l.includes("_ux")
      ) {
        return c;
      }
    }
  }
  for (const c of candidates) {
    if (!c.includes("phimimg.com")) {
      return c;
    }
  }

  // 3. Nguồn phimimg.com: Ưu tiên poster dọc (-poster.webp) nếu có
  for (const c of candidates) {
    if (c.toLowerCase().includes("-poster")) {
      return c;
    }
  }
  if (candidates.length > 0) {
    return candidates[0];
  }

  return fallback || "";
}

export function pickBestMovieThumb(movie: MovieLike, fallback = "/default-hero.svg"): string {
  if (!movie) return fallback;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawMovie = (movie as any)?.movie || movie;
  const isNguonC = isNguonCSource(movie);

  // NguonC đảo ngược trường: poster_url là backdrop ngang (16:9), thumb_url là poster dọc (2:3)
  const primary = isNguonC
    ? rawMovie.poster_url || rawMovie.posterUrl || movie.poster_url || movie.posterUrl
    : rawMovie.thumb_url || rawMovie.thumbUrl || movie.thumb_url || movie.thumbUrl;

  const secondary = isNguonC
    ? rawMovie.thumb_url || rawMovie.thumbUrl || movie.thumb_url || movie.thumbUrl
    : rawMovie.poster_url || rawMovie.posterUrl || movie.poster_url || movie.posterUrl;

  const candidates = [primary, secondary, movie.imageUrl]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .map(sanitizeImageUrl)
    .filter((url) => Boolean(url) && !url.endsWith("/null") && !url.endsWith("/undefined"));

  if (candidates.length === 0) return fallback;

  // 1. Ưu tiên tuyệt đối TMDb CDN backdrop chính hãng (image.tmdb.org)
  for (const c of candidates) {
    if (c.includes("image.tmdb.org")) {
      return c;
    }
  }

  // 2. Ưu tiên ảnh thumb ngang / backdrop (chứa keyword thumb, backdrop, banner, w780, w1280)
  for (const c of candidates) {
    const l = c.toLowerCase();
    if (
      l.includes("thumb_") ||
      l.includes("/thumb") ||
      l.includes("-thumb") ||
      l.includes("backdrop") ||
      l.includes("banner") ||
      l.includes("w780") ||
      l.includes("w1280") ||
      l.includes("w500")
    ) {

      return c;
    }
  }

  // 2. Trả về candidate hợp lệ sẵn có
  for (const c of candidates) {
    if (!c.includes("/default-") && !c.includes("null") && !c.includes("undefined")) {
      return c;
    }
  }

  return candidates[0] || fallback || "";
}

export const ALLOWED_PROXY_WIDTHS = [192, 320, 480, 640, 1280] as const;
export type OptimizedProxyWidth = (typeof ALLOWED_PROXY_WIDTHS)[number];

/**
 * Tối ưu ảnh từ nguồn phimimg.com qua internal image proxy (/api/img-thumb).
 * CHỈ rewrite các ảnh thực sự nặng chưa có biến thể nhỏ:
 * 1. /upload/vod/ (JPEG gốc 1-3MB)
 * 2. /uploads/movies/...-poster.webp (Poster dọc 2000x3000 ~900KB)
 *
 * KHÔNG rewrite:
 * - ...-thumb.webp (ảnh thumb đã tối ưu sẵn ~25-46KB)
 * - TMDB, IMDb, hoặc ảnh local (/default-...)
 * - URL đã được bọc /api/img-thumb
 */
export function toOptimizedPhimimgUrl(
  url: string,
  _targetWidth: number | OptimizedProxyWidth = 320
): string {
  if (!url || typeof url !== "string") return "";
  const clean = sanitizeImageUrl(url);
  if (!clean) return "";

  // Bỏ qua ảnh local, ảnh TMDB/IMDb hoặc đã là URL proxy
  if (
    clean.startsWith("/api/img-thumb") ||
    clean.startsWith("/default-") ||
    clean.startsWith("/images/") ||
    clean.includes("image.tmdb.org") ||
    clean.includes("media-amazon.com")
  ) {
    return clean;
  }

  if (clean.includes("phimimg.com")) {
    return clean;
  }

  return clean;
}

/**
 * Tối ưu ảnh cho Thẻ phim 16:9 trong danh sách (CuratedMovieSection / MediaCard).
 * - TMDb: Dùng TMDb w780 (~45KB) cho độ sắc nét Retina 2x/4K, tải siêu nhanh và không bị mờ.
 * - Phimimg: Dùng proxy an toàn nén thành WebP nhẹ và chuẩn kích thước.
 */
export function toOptimizedCardBackdropUrl(url: string, _targetWidth: number = 320): string {
  if (!url || typeof url !== "string") return "";
  let clean = sanitizeImageUrl(url);
  if (!clean) return "";

  // Bỏ qua ảnh local, proxy
  if (
    clean.startsWith("/api/img-thumb") ||
    clean.startsWith("/default-") ||
    clean.startsWith("/images/")
  ) {
    return clean;
  }

  if (clean.includes("image.tmdb.org/t/p/")) {
    clean = clean.replace(/\/t\/p\/(w1280|original)\//, "/t/p/w780/");
    return clean;
  }

  if (clean.includes("phimimg.com")) {
    if (clean.includes("-poster.webp")) {
      return clean.replace("-poster.webp", "-thumb.webp");
    }
    return clean;
  }

  return clean;
}

/**
 * Tối ưu ảnh cho Thẻ phim dọc 2:3 trên mobile (MediaCard / Mobile Grid).
 * - TMDb: Dùng TMDb w500 chuẩn tỷ lệ poster 2:3 sắc nét.
 * - Phimimg: Tự động đổi -thumb.webp thành -poster.webp (chuẩn tỷ lệ 2:3).
 */
export function toOptimizedCardPosterUrl(url: string, _targetWidth: number = 320): string {
  if (!url || typeof url !== "string") return "";
  let clean = sanitizeImageUrl(url);
  if (!clean) return "";

  if (
    clean.startsWith("/api/img-thumb") ||
    clean.startsWith("/default-") ||
    clean.startsWith("/images/")
  ) {
    return clean;
  }

  if (clean.includes("image.tmdb.org/t/p/")) {
    clean = clean.replace(/\/t\/p\/(w1280|original|w780)\//, "/t/p/w500/");
    return clean;
  }

  if (clean.includes("phimimg.com")) {
    if (clean.includes("-thumb.webp")) {
      return clean.replace("-thumb.webp", "-poster.webp");
    }
    return clean;
  }

  return clean;
}

/**
 * Bảo vệ thẻ <img> trên client khỏi tải trực tiếp từ phimimg.com (nặng, chậm, thường bị chặn tại VN):
 * chuyển mọi URL phimimg.com còn sót lại sang Cloudflare R2 Proxy (/api/media/r2-proxy).
 */
export function toFastCdnImageUrl(url: string): string {
  if (!url || typeof url !== "string") return "";
  const clean = url.trim();
  if (!clean || clean.startsWith("/api/media/r2-proxy")) return clean;
  if (clean.includes("phimimg.com")) {
    return `/api/media/r2-proxy?url=${encodeURIComponent(clean)}`;
  }
  return clean;
}

/**
 * Dành riêng cho Banner Hero cỡ lớn toàn màn hình trên đầu trang.
 * Ưu tiên độ phân giải gốc cực cao (original / w1280) cho màn hình lớn & Retina 2x/4K.
 */
export function toHighResBackdropUrl(url: string, targetWidth: "w780" | "w1280" = "w1280"): string {
  if (!url || typeof url !== "string") return "";
  let clean = url.trim();
  if (
    !clean ||
    clean === "null" ||
    clean === "undefined" ||
    clean.endsWith("/null") ||
    clean.endsWith("/undefined")
  ) {
    return "";
  }

  // 1. Nhận diện trực tiếp mã hash TMDb từ NguonC -> Chuyển sang TMDb targetWidth (mặc định w1280, mobile w780)
  const tmdbHashMatch = clean.match(
    /https?:\/\/(?:phim\.nguonc\.com\/public\/images\/Film)(?:\/[^/]+)*\/(?:poster_|backdrop_)?([a-zA-Z0-9]{22,35}\.(?:jpg|jpeg|png|webp))$/i
  );
  if (tmdbHashMatch && !tmdbHashMatch[1].includes("-")) {
    return `https://image.tmdb.org/t/p/${targetWidth}/${tmdbHashMatch[1]}`;
  }

  // 2. Nhận diện đường dẫn tương đối TMDb (vd: /jUiZOFbC9MjQV3gzi9nn7AsQ4Ea.jpg)
  if (/^\/[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp)$/i.test(clean)) {
    return `https://image.tmdb.org/t/p/${targetWidth}${clean}`;
  }

  // 3. Chuẩn hóa qua sanitizeImageUrl
  clean = sanitizeImageUrl(url);

  // 4. Nếu là ảnh TMDb, chuyển về targetWidth (w1280 cho desktop, w780 cho mobile) thay vì original để tránh làm nghẽn LCP
  if (clean.includes("image.tmdb.org/t/p/")) {
    clean = clean.replace(/\/t\/p\/(w\d+|original)\//, `/t/p/${targetWidth}/`);
    return clean;
  }

  if (clean.includes("phimimg.com")) {
    if (clean.includes("-poster.webp")) {
      return clean.replace("-poster.webp", "-thumb.webp");
    }
    return clean;
  }

  return clean;
}

export function pickHeroBackdropImage(
  movie: MovieLike,
  fallback = "/default-hero.jpg",
  targetWidth: "w780" | "w1280" = "w1280"
): string {
  if (!movie) return fallback;
  const rawMovie = ((movie as Record<string, unknown>)?.movie as MovieLike) || movie;

  // 0. Ưu tiên tuyệt đối backdrop/banner đã được cache trên Cloudflare R2 CDN
  const movieSlug = ((rawMovie.slug || movie.slug) as string | undefined)?.toLowerCase().trim();
  const rawBackdrop = (rawMovie.backdrop_url || rawMovie.backdropUrl || movie.backdrop_url || movie.backdropUrl) as string | undefined;
  const r2Url = getR2BannerUrl(movieSlug, rawBackdrop);
  if (r2Url) return r2Url;

  const isNguonC = isNguonCSource(movie);

  // NguonC đảo ngược: poster_url là backdrop 16:9, thumb_url là poster dọc 2:3
  const primary = isNguonC
    ? rawMovie.poster_url || rawMovie.posterUrl || movie.poster_url || movie.posterUrl
    : rawMovie.thumb_url || rawMovie.thumbUrl || movie.thumb_url || movie.thumbUrl;

  const secondary = isNguonC
    ? rawMovie.thumb_url || rawMovie.thumbUrl || movie.thumb_url || movie.thumbUrl
    : rawMovie.poster_url || rawMovie.posterUrl || movie.poster_url || movie.posterUrl;

  // Thu thập các trường backdrop chuyên dụng độ phân giải cao
  const backdropFields = [
    rawMovie.backdrop_url,
    rawMovie.backdropUrl,
    movie.backdrop_url,
    movie.backdropUrl,
    (rawMovie.tmdb as Record<string, unknown> | undefined)?.backdrop_url,
    (movie.tmdb as Record<string, unknown> | undefined)?.backdrop_url,
    rawMovie.banner_url,
    rawMovie.bannerUrl,
    movie.banner_url,
    movie.bannerUrl,
    rawMovie.backdrop_path,
    movie.backdrop_path,
    rawMovie.backdropPath,
    movie.backdropPath,
    (rawMovie.tmdb as Record<string, unknown> | undefined)?.backdrop_path,
    (movie.tmdb as Record<string, unknown> | undefined)?.backdrop_path,
  ];

  const rawCandidates = [
    ...backdropFields,
    primary,
    secondary,
    movie.imageUrl,
    rawMovie.imageUrl,
  ].filter((value): value is string => typeof value === "string" && value.length > 0);

  const candidates = rawCandidates
    .map((u) => toHighResBackdropUrl(u, targetWidth))
    .filter((url) => Boolean(url) && !url.endsWith("/null") && !url.endsWith("/undefined"));

  if (candidates.length === 0) return fallback;

  const isPoster = (url: string) => {
    const l = url.toLowerCase();
    return (
      l.includes("-poster.") ||
      l.includes("_poster.") ||
      l.includes("/poster/") ||
      l.includes("poster_") ||
      l.includes("thumb-360x504")
    );
  };

  const isLowResThumb = (url: string) => {
    const l = url.toLowerCase();
    return l.includes("-thumb.webp") || l.includes("/thumb.webp") || l.endsWith("thumb.webp");
  };

  // 1. Ưu tiên tuyệt đối backdrop TMDb w1280 (hoặc w780 cho mobile)
  for (const c of candidates) {
    if (!isPoster(c)) {
      const l = c.toLowerCase();
      if (l.includes("image.tmdb.org/t/p/w1280") || l.includes("image.tmdb.org/t/p/w780")) {
        return c;
      }
    }
  }

  // 2. TMDb w1920 (chỉ dùng nếu w1280 không tồn tại/không khả dụng)
  for (const c of candidates) {
    if (!isPoster(c)) {
      const l = c.toLowerCase();
      if (l.includes("image.tmdb.org/t/p/w1920")) {
        return c;
      }
    }
  }

  // 3. Ảnh backdrop chuyên dụng hoặc banner chất lượng cao (không phải poster, không phải thumb.webp)
  for (const c of candidates) {
    if (!isPoster(c) && !isLowResThumb(c)) {
      const l = c.toLowerCase();
      if (l.includes("backdrop") || l.includes("banner") || l.includes("image.tmdb.org")) {
        return c;
      }
    }
  }

  // 4. Ảnh ngang chất lượng cao khác (vd: NguonC Post 16:9, ảnh JPG/PNG không phải poster và không phải thumb.webp)
  for (const c of candidates) {
    if (!isPoster(c) && !isLowResThumb(c)) {
      return c;
    }
  }

  // Tuyệt đối không dùng poster dọc hoặc thumb.webp độ phân giải thấp gây mờ cho Hero -> fallback an toàn
  return fallback;
}

export function pickBestMovieImage(movie: MovieLike, fallback: string) {
  return pickBestMovieThumb(movie, fallback);
}

function extractNamedEntries(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === "string"
          ? item.trim()
          : String((item as { name?: unknown } | null)?.name || "").trim()
      )
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export function buildMovieDescriptionFallback(movie: {
  origin_name?: string;
  year?: string | number;
  time?: string | number;
  lang?: string;
  quality?: string;
  category?: Array<{ name?: string }> | string;
  country?: Array<{ name?: string }> | string;
  director?: string[] | string;
  actor?: string[] | string;
}) {
  const parts: string[] = [];
  if (movie.origin_name) parts.push(`Tên gốc: ${movie.origin_name}.`);

  const cleanTime = movie.time
    ? String(movie.time).trim().replace(/phút\/tập\s*phút/gi, "phút/tập").replace(/phút\s*phút/gi, "phút")
    : null;
  const formattedTime = cleanTime
    ? cleanTime.toLowerCase().includes("phút") || cleanTime.toLowerCase().includes("h")
      ? cleanTime
      : `${cleanTime} phút`
    : null;

  const meta = [
    movie.year ? `${movie.year}` : null,
    formattedTime,
    movie.lang || null,
    movie.quality || null,
  ]
    .filter(Boolean)
    .join(" • ");
  if (meta) parts.push(meta);

  const genres = extractNamedEntries(movie.category).join(", ");
  if (genres) parts.push(`Thể loại: ${genres}.`);

  const countries = extractNamedEntries(movie.country).join(", ");
  if (countries) parts.push(`Quốc gia: ${countries}.`);

  const directors = extractNamedEntries(movie.director).slice(0, 2).join(", ");
  if (directors) parts.push(`Đạo diễn: ${directors}.`);

  return parts.join(" ").trim();
}

export interface NormalizedMovie {
  slug: string;
  title: string;
  origin_name?: string;
  imageUrl: string;
  posterUrl: string;
  thumbUrl: string;
  year: string;
  time?: string;
  quality: string;
  genre: string;
  categories?: Array<{ name: string; slug?: string }>;
  description: string;
  score: string;
  isTrailerOnly: boolean;
  trailer_url?: string;
  hasTrailer: boolean;
  lang?: string;
  chieurap?: boolean;
  sub_docquyen?: boolean;
  actor?: string[];
  director?: string[];
  country?: string;
  type_name?: string;
  matchSnippet?: string;
  matchType?: "title" | "actor" | "content";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: any;
}

export function formatCountryName(raw?: unknown): string {
  if (!raw) return "";
  let clean = "";
  if (typeof raw === "string") {
    clean = raw.trim();
  } else if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    clean = String(obj.name || obj.slug || obj.id || "").trim();
  }
  if (!clean || clean === "N/A" || clean === "Đang cập nhật") return "";

  // 1. Lọc bỏ nếu là loại phim hoặc thể loại phim (tuyệt đối không nhầm thể loại thành quốc gia)
  const lower = clean.toLowerCase();
  const lookupKey = lower.replace(/_/g, "-");
  if (
    lower === "phim lẻ" ||
    lower === "phim bộ" ||
    lower === "phimle" ||
    lower === "phimbo" ||
    lower === "phim rạp" ||
    lower === "hoạt hình" ||
    lower === "tv shows" ||
    lower === "tvshows" ||
    KNOWN_GENRE_SET.has(lower) ||
    KNOWN_GENRE_SET.has(lookupKey) ||
    KNOWN_GENRE_SET.has(lower.replace(/\s+/g, "-"))
  ) {
    return "";
  }

  // Khử các ký tự phân tách nếu truyền chuỗi kép
  if (clean.includes(",") || clean.includes("/") || clean.includes(";")) {
    clean = clean.split(/[,/;]/)[0].trim();
  }

  const cleanLookupKey = clean.toLowerCase().replace(/_/g, "-");
  if (COUNTRY_DISPLAY_MAP[cleanLookupKey]) {
    return COUNTRY_DISPLAY_MAP[cleanLookupKey];
  }

  // Tra cứu theo key thay gạch nối bằng khoảng trắng và ngược lại
  const spaceKey = cleanLookupKey.replace(/-/g, " ");
  if (COUNTRY_DISPLAY_MAP[spaceKey]) {
    return COUNTRY_DISPLAY_MAP[spaceKey];
  }
  const hyphenKey = cleanLookupKey.replace(/\s+/g, "-");
  if (COUNTRY_DISPLAY_MAP[hyphenKey]) {
    return COUNTRY_DISPLAY_MAP[hyphenKey];
  }

  // Ẩn nếu là mã ISO 2-3 chữ cái viết hoa không xác định
  if (/^[A-Z]{2,3}$/.test(clean)) {
    return "";
  }

  // Nếu là slug có dấu gạch nối (vd: "trieu-tien"), chuyển thành từ viết hoa có khoảng trắng
  if (cleanLookupKey.includes("-")) {
    return cleanLookupKey
      .split("-")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  if (clean.length > 20) {
    return clean.slice(0, 20) + "…";
  }

  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

// ==========================================
// TMDB GENRE ID MAP (MAPPING ID CHÍNH THỨC SANG TIẾNG VIỆT)
// ==========================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractMovieActors(m: any): string[] {
  if (!m) return [];
  if (Array.isArray(m.actor)) {
    return m.actor.map(String).map((s: string) => s.trim()).filter(Boolean);
  }
  if (typeof m.actor === "string" && m.actor) {
    return m.actor.split(",").map((s: string) => s.trim()).filter(Boolean);
  }
  if (Array.isArray(m.casts)) {
    return m.casts.map(String).map((s: string) => s.trim()).filter(Boolean);
  }
  return [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractMovieDirectors(m: any): string[] {
  if (!m) return [];
  if (Array.isArray(m.director)) {
    return m.director.map(String).map((s: string) => s.trim()).filter(Boolean);
  }
  if (typeof m.director === "string" && m.director) {
    return m.director.split(",").map((s: string) => s.trim()).filter(Boolean);
  }
  return [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractMovieCountry(m: any): string | undefined {
  if (!m) return undefined;

  // 1. Array of objects or strings: m.country, m.countries hoặc m.movie?.country (Ưu tiên cao nhất từ nguồn phim)
  const countryList = m.country || m.countries || m.movie?.country;
  if (Array.isArray(countryList) && countryList.length > 0) {
    const first = countryList[0];
    if (typeof first === "string" && first.trim()) {
      const formatted = formatCountryName(first);
      if (formatted) return formatted;
    }
    if (first && typeof first === "object") {
      const formatted = formatCountryName(first.name || first.slug || first.id);
      if (formatted) return formatted;
    }
  }
  if (typeof countryList === "string" && countryList.trim()) {
    const formatted = formatCountryName(countryList);
    if (formatted) return formatted;
  }

  // 2. Direct string fields (country_name, countryName)
  if (m.country_name && typeof m.country_name === "string") {
    const formatted = formatCountryName(m.country_name);
    if (formatted) return formatted;
  }
  if (m.countryName && typeof m.countryName === "string") {
    const formatted = formatCountryName(m.countryName);
    if (formatted) return formatted;
  }

  // 3. TMDB production_countries (Quốc gia sản xuất từ TMDB)
  const prodCountries = m.production_countries || m.tmdb?.production_countries;
  if (Array.isArray(prodCountries) && prodCountries.length > 0) {
    for (const pc of prodCountries) {
      if (!pc) continue;
      const isoOrName = typeof pc === "string" ? pc : pc.iso_3166_1 || pc.name;
      const formatted = formatCountryName(isoOrName);
      if (formatted) return formatted;
    }
  }

  // 4. Check categories for country tags (nếu nguồn nhét quốc gia vào danh mục thể loại)
  const catList = m.category || m.categories;
  if (Array.isArray(catList)) {
    for (const cat of catList) {
      const catName = (typeof cat === "string" ? cat : cat?.name || cat?.slug || "").trim();
      const catSlug = typeof cat === "object" && cat?.slug ? String(cat.slug).trim() : "";

      // TUYỆT ĐỐI bỏ qua nếu là thể loại phim rõ ràng (Hành Động, Kinh Dị, Hài Hước...)
      const lowerName = catName.toLowerCase();
      const lowerSlug = catSlug.toLowerCase();
      if (
        KNOWN_GENRE_SET.has(lowerName) ||
        KNOWN_GENRE_SET.has(lowerName.replace(/\s+/g, "-")) ||
        KNOWN_GENRE_SET.has(lowerSlug)
      ) {
        continue;
      }

      // CHỈ chấp nhận nếu thực sự khớp một quốc gia đã biết (trong COUNTRY_DISPLAY_MAP hoặc KNOWN_COUNTRIES)
      const formatted = catSlug ? formatCountryName(catSlug) : formatCountryName(catName);
      if (formatted && !KNOWN_GENRE_SET.has(formatted.toLowerCase())) {
        return formatted;
      }
      for (const kc of KNOWN_COUNTRIES) {
        if (catName.toLowerCase() === kc.toLowerCase() || catName.toLowerCase().includes(kc.toLowerCase())) {
          return kc;
        }
      }
    }
  }

  // 5. TMDB original_language: Chỉ áp dụng khi có ánh xạ an toàn, xác thực 1-to-1 không gây hiểu nhầm
  const rawLang = String(m.original_language || m.tmdb?.original_language || "").trim().toLowerCase();
  if (rawLang && TMDB_SAFE_LANGUAGE_COUNTRY_MAP[rawLang]) {
    return TMDB_SAFE_LANGUAGE_COUNTRY_MAP[rawLang];
  }

  // 6. Check origin_name for language/script clues (Hangul cho Hàn Quốc, Kana cho Nhật Bản)
  const origin = String(m.origin_name || "");
  if (/[\uac00-\ud7a3]/.test(origin)) return "Hàn Quốc";
  if (/[\u3040-\u30ff]/.test(origin)) return "Nhật Bản";

  return undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function detectMovieTypeName(m: any): string {
  if (!m) return "Phim lẻ";

  const rawType = String(m?.type || m?.type_name || m?.type_slug || "").toLowerCase().trim();
  const rawName = String(m?.name || m?.title || m?.origin_name || "").toLowerCase();
  const rawSlug = String(m?.slug || "").toLowerCase();
  const timeStr = String(m?.time || "").toLowerCase();
  const epCurrent = String(m?.episode_current || "").toLowerCase();
  const epTotal = Number(m?.episode_total || 0);

  const categories = Array.isArray(m?.category)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? m.category.map((c: any) => (typeof c === "string" ? c : `${c?.slug || ""} ${c?.name || ""}`).toLowerCase())
    : [String(m?.category || "").toLowerCase()];

  const isHoatHinh =
    rawType === "hoathinh" ||
    rawType === "hoat-hinh" ||
    rawType === "anime" ||
    categories.some((c: string) => c.includes("hoat-hinh") || c.includes("hoạt hình") || c.includes("anime"));

  const isTvShows =
    rawType === "tvshows" ||
    rawType === "tv-shows" ||
    categories.some((c: string) => c.includes("tv-shows") || c.includes("tv shows") || c.includes("show"));

  const isChieuRap = Boolean(
    m?.chieurap === true ||
      m?.chieurap === "true" ||
      m?.chieurap === 1 ||
      m?.chieu_rap === true ||
      categories.some((c: string) => c.includes("chieu-rap") || c.includes("chiếu rạp"))
  );

  // Nhận diện phim bộ nhiều tập chuẩn xác tuyệt đối:
  // 1. Phim có từ khóa phần/tập/season trong tiêu đề hoặc slug (ví dụ: "Tây Du Ký - Phần 1", "Tây Du Ký (Phần 2)", "-phan-1", "-phan-2", "Season 2")
  const hasSeriesKeywordsInTitle =
    /phần\s*\d+|phần\s*[ivx]+|season\s*\d+|ss\s*\d+|\btập\s*\d+/i.test(rawName) ||
    /-phan-\d+|-phan-[ivx]+|-season-\d+|-tap-\d+/i.test(rawSlug);

  // 2. Định dạng tập trong episode_current (ví dụ: "Hoàn Tất (16/16)", "Tập 25", "25/25", "45 phút/tập")
  const hasEpCountPattern =
    /\(\d+\/\d+\)|\d+\/\d+|\btập\s*\d+/i.test(epCurrent) ||
    timeStr.includes("/tập") ||
    timeStr.includes("phút/tập");

  const isPhimBo =
    rawType === "series" ||
    rawType === "phim-bo" ||
    rawType === "tv" ||
    rawType.includes("bộ") ||
    epTotal > 1 ||
    hasEpCountPattern ||
    hasSeriesKeywordsInTitle ||
    categories.some(
      (c: string) =>
        c.includes("phim-bo") ||
        c.includes("phim bộ") ||
        c.includes("truyền hình") ||
        c.includes("series") ||
        c.includes("drama")
    );

  if (isHoatHinh) return "Hoạt hình";
  if (isTvShows) return "TV Shows";
  if (isPhimBo) return "Phim bộ";
  if (isChieuRap) return "Phim rạp";

  return "Phim lẻ";
}

/**
 * Chuẩn hóa tên thể loại từ slug hoặc chuỗi thô sang tiếng Việt có dấu, viết hoa đẹp mắt.
 * Tự động loại bỏ các từ dịch thuật / chất lượng (vietsub, thuyết minh, cam).
 */
export function formatGenreName(raw?: unknown): string {
  if (!raw || typeof raw !== "string") return "";
  let clean = raw.trim();
  if (!clean || clean === "N/A" || clean === "Đang cập nhật") return "";

  // Bỏ các nhãn phát hành/dịch thuật vô nghĩa nếu bị nhét vào trường genre
  const lower = clean.toLowerCase();
  if (
    lower.includes("vietsub") ||
    lower.includes("thuyết minh") ||
    lower.includes("lồng tiếng") ||
    lower.includes("bản đẹp") ||
    lower.includes("raw") ||
    lower.includes("cam")
  ) {
    return "";
  }

  // Khử các ký tự phân tách nếu truyền chuỗi kép (vd: "hanh-dong, phieu-luu")
  if (clean.includes(",") || clean.includes("/")) {
    clean = clean.split(/[,/]/)[0].trim();
  }

  const lookupKey = clean.toLowerCase().replace(/_/g, "-");
  if (GENRE_DISPLAY_MAP[lookupKey]) {
    return GENRE_DISPLAY_MAP[lookupKey];
  }

  // Nếu là slug có dấu gạch nối (vd: "tam-ly-xa-hoi")
  if (lookupKey.includes("-")) {
    return lookupKey
      .split("-")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  // Nếu đã viết hoa đẹp hoặc từ tiếng Việt chuẩn
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export function isRawId(str?: string | null): boolean {
  if (!str) return false;
  const trimmed = str.trim();
  return /^[0-9a-fA-F]{24,32}$/.test(trimmed) || /^\d+$/.test(trimmed);
}

export function getCanonicalGenreSlug(name?: string | null, rawSlug?: string | null): string {
  // 1. Nếu rawSlug là NguonC MD5 hash
  if (rawSlug && NGUONC_HASH_MAP[rawSlug.trim()]) {
    return NGUONC_HASH_MAP[rawSlug.trim()].slug;
  }

  // 2. Nếu rawSlug là slug hợp lệ và không phải ID thô
  if (rawSlug && typeof rawSlug === "string") {
    const trimmed = rawSlug.trim().toLowerCase().replace(/_/g, "-");
    if (!isRawId(trimmed) && trimmed.length >= 2) {
      if (trimmed === "khoa-hoc-vien-tuong" || trimmed === "gia-tuong") return "vien-tuong";
      if (trimmed === "phim-hai") return "hai-huoc";
      if (trimmed === "phim-nhac") return "am-nhac";
      return trimmed;
    }
  }

  // 3. Chuyển đổi tên sang slug chuẩn
  if (name && typeof name === "string") {
    const norm = normalizeForMatch(name).replace(/\s+/g, "-");
    if (!norm) return "";
    if (norm === "hanh-dong" || norm === "action") return "hanh-dong";
    if (norm === "tinh-cam" || norm === "romance") return "tinh-cam";
    if (norm === "kinh-di" || norm === "horror") return "kinh-di";
    if (norm === "hai-huoc" || norm === "comedy" || norm === "phim-hai") return "hai-huoc";
    if (norm.includes("vien-tuong") || norm.includes("sci-fi") || norm === "gia-tuong") return "vien-tuong";
    if (norm === "co-trang") return "co-trang";
    if (norm === "tam-ly" || norm === "drama") return "tam-ly";
    if (norm === "vo-thuat" || norm === "martial-arts") return "vo-thuat";
    if (norm === "trinh-tham" || norm === "detective") return "trinh-tham";
    if (norm === "chien-tranh" || norm === "war") return "chien-tranh";
    if (norm === "phieu-luu" || norm === "adventure") return "phieu-luu";
    if (norm === "am-nhac" || norm === "music" || norm === "phim-nhac") return "am-nhac";
    if (norm === "the-thao" || norm === "sports" || norm === "sport") return "the-thao";
    if (norm === "tai-lieu" || norm === "documentary") return "tai-lieu";
    if (norm === "khoa-hoc" || norm === "science") return "khoa-hoc";
    if (norm === "hoat-hinh" || norm === "animation" || norm === "anime") return "hoat-hinh";
    if (norm === "hinh-su" || norm === "crime") return "hinh-su";
    if (norm === "bi-an" || norm === "mystery") return "bi-an";
    if (norm === "hoc-duong" || norm === "school") return "hoc-duong";
    if (norm === "gia-dinh" || norm === "family") return "gia-dinh";
    if (norm === "than-thoai" || norm === "mythology" || norm === "fantasy") return "than-thoai";
    if (norm === "lich-su" || norm === "history") return "lich-su";
    if (norm === "chinh-kich") return "chinh-kich";
    if (norm === "giat-gan" || norm === "thriller") return "giat-gan";
    if (norm === "gay-can") return "gay-can";
    if (norm === "lang-man") return "lang-man";
    if (norm === "chieu-rap") return "chieu-rap";
    return norm;
  }

  return "";
}

export function getCanonicalCountrySlug(name?: string | null, rawSlug?: string | null): string {
  if (rawSlug && NGUONC_HASH_MAP[rawSlug.trim()]) {
    return NGUONC_HASH_MAP[rawSlug.trim()].slug;
  }

  if (rawSlug && typeof rawSlug === "string") {
    const trimmed = rawSlug.trim().toLowerCase().replace(/_/g, "-");
    if (!isRawId(trimmed) && trimmed.length >= 2) {
      if (trimmed === "korea" || trimmed === "south-korea") return "han-quoc";
      if (trimmed === "china") return "trung-quoc";
      if (trimmed === "japan") return "nhat-ban";
      if (trimmed === "us" || trimmed === "usa" || trimmed === "united-states") return "au-my";
      if (trimmed === "thailand") return "thai-lan";
      if (trimmed === "vietnam") return "viet-nam";
      if (trimmed === "hongkong") return "hong-kong";
      if (trimmed === "taiwan") return "dai-loan";
      if (trimmed === "india") return "an-do";
      if (trimmed === "uk") return "anh";
      if (trimmed === "france") return "phap";
      return trimmed;
    }
  }

  if (name && typeof name === "string") {
    const norm = normalizeForMatch(name).replace(/\s+/g, "-");
    if (!norm) return "";
    if (norm.includes("han-quoc") || norm.includes("korea")) return "han-quoc";
    if (norm.includes("trung-quoc") || norm.includes("china")) return "trung-quoc";
    if (norm.includes("nhat-ban") || norm.includes("japan")) return "nhat-ban";
    if (norm.includes("au-my") || norm.includes("my") || norm.includes("usa") || norm.includes("hoa-ky") || norm.includes("canada") || norm.includes("duc") || norm.includes("tay-ban-nha") || norm.includes("uc")) return "au-my";
    if (norm.includes("thai-lan") || norm.includes("thailand")) return "thai-lan";
    if (norm.includes("viet-nam") || norm.includes("vietnam")) return "viet-nam";
    if (norm.includes("hong-kong") || norm.includes("hongkong")) return "hong-kong";
    if (norm.includes("dai-loan") || norm.includes("taiwan")) return "dai-loan";
    if (norm.includes("an-do") || norm.includes("india")) return "an-do";
    if (norm.includes("anh") || norm.includes("uk")) return "anh";
    if (norm.includes("phap") || norm.includes("france")) return "phap";
    return norm;
  }

  return "";
}

// Cache ổn định tham chiếu array diễn viên / đạo diễn theo từng movie object
const movieArrayCache = new WeakMap<object, { actor?: string[]; director?: string[] }>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeMovie(m: any): NormalizedMovie {
  const title = m?.name || m?.title || "Phim";
  const origin_name = m?.origin_name || undefined;
  let posterUrl = pickBestMoviePoster(m, "");
  let thumbUrl = pickBestMovieThumb(m, "");

  if (!thumbUrl && posterUrl) thumbUrl = posterUrl;
  if (!posterUrl && thumbUrl) posterUrl = thumbUrl;
  if (!thumbUrl) thumbUrl = "/default-hero.svg";
  if (!posterUrl) posterUrl = "/default-poster.svg";

  const imageUrl = thumbUrl || posterUrl;

  // Chuẩn hóa và làm sạch năm phát hành: Loại bỏ năm vô lý (< 1920 hoặc > năm hiện tại + 2, ví dụ lỗi 1885)
  let year = "";
  if (m?.year) {
    const parsedYear = typeof m.year === "number" ? m.year : parseInt(String(m.year).trim(), 10);
    const maxYear = new Date().getFullYear() + 2;
    if (Number.isFinite(parsedYear) && parsedYear >= 1920 && parsedYear <= maxYear) {
      year = String(parsedYear);
    }
  }

  const quality = m?.quality || "FHD";
  const time = m?.time || m?.episode_current || undefined;
  const rawCats = Array.isArray(m?.category)
    ? m.category
    : Array.isArray(m?.movie?.category)
    ? m.movie.category
    : Array.isArray(m?.categories)
    ? m.categories
    : [];

  const genreIds: number[] = Array.isArray(m?.genre_ids)
    ? m.genre_ids
    : Array.isArray(m?.tmdb?.genre_ids)
    ? m.tmdb.genre_ids
    : Array.isArray(m?.movie?.genre_ids)
    ? m.movie.genre_ids
    : [];

  const categories: Array<{ name: string; slug?: string }> = rawCats
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((c: any) => {
      const rawName = typeof c === "string" ? c.trim() : String(c?.name || "").trim();
      const slug = typeof c === "object" && c?.slug ? String(c.slug).trim() : undefined;
      const formatted = formatGenreName(rawName) || (slug ? formatGenreName(slug) : "");
      return {
        name: formatted || rawName,
        slug,
      };
    })
    .filter((c: { name: string }) => Boolean(c.name));

  // Nếu không có thể loại từ nguồn phim nhưng có genre_ids từ TMDB, ánh xạ sang tiếng Việt chuẩn
  if (categories.length === 0 && genreIds.length > 0) {
    for (const id of genreIds) {
      const name = TMDB_GENRE_ID_MAP[Number(id)];
      if (name && !categories.some((c) => c.name === name)) {
        categories.push({ name, slug: "" });
      }
    }
  }

  const rawGenre =
    (Array.isArray(m?.category) ? m.category[0]?.name : undefined) ||
    categories[0]?.name ||
    (Array.isArray(m?.genre) ? m.genre.join(", ") : m?.genre) ||
    "";

  // Thể loại chính được chuẩn hoá tiếng Việt đẹp mắt
  let genre = formatGenreName(rawGenre) || categories[0]?.name || "";

  // Nếu dữ liệu upstream hoàn toàn không có thể loại, tự động gán loại phim (Phim lẻ / Phim bộ / Hoạt hình)
  // để các thẻ luôn có danh mục nhất quán, không bị khuyết tạo cảm giác "lạc quẻ"
  const type_name = detectMovieTypeName(m);
  if (!genre) {
    genre = type_name;
  }

  const isTrailerOnly =
    m?.status === "trailer" || m?.episode_current === "Trailer";

  const chieurap = Boolean(
    m?.chieurap === true ||
      m?.chieurap === "true" ||
      m?.chieurap === 1 ||
      m?.chieu_rap === true
  );
  const sub_docquyen = Boolean(
    m?.sub_docquyen === true ||
      m?.sub_docquyen === "true" ||
      m?.sub_docquyen === 1 ||
      m?.doc_quyen === true
  );

  const { rating: normRating } = extractMovieRatingScore(m);
  const score = normRating > 0 ? normRating.toFixed(1) : "N/A";

  // Bóc tách diễn viên & đạo diễn (tái sử dụng tham chiếu array ổn định nếu cùng movie object)
  const isObject = typeof m === "object" && m !== null;
  const cachedArrays = isObject ? movieArrayCache.get(m) : undefined;
  let actor: string[] | undefined;
  let director: string[] | undefined;

  if (cachedArrays) {
    actor = cachedArrays.actor;
    director = cachedArrays.director;
  } else {
    actor = extractMovieActors(m);
    director = extractMovieDirectors(m);

    if (isObject) {
      movieArrayCache.set(m, { actor, director });
    }
  }

  const country = extractMovieCountry(m);

  const cleanedDesc = cleanHtmlText(m?.content || m?.description || "");
  const description =
    cleanedDesc ||
    buildMovieDescriptionFallback({
      origin_name: m?.origin_name,
      year: m?.year,
      time: m?.time,
      lang: m?.lang,
      quality: m?.quality,
      category: categories.length > 0 ? categories : m?.category,
      country: m?.country || (country ? [{ name: country }] : undefined),
      director,
      actor,
    }) ||
    "";

  const trailer_url: string | undefined =
    m?.trailer_url || m?.trailer || m?.movie?.trailer_url || undefined;
  const hasTrailer = Boolean(
    trailer_url || isTrailerOnly || m?.hasTrailer || (typeof trailer_url === "string" && trailer_url.length > 0)
  );

  return {
    slug: m?.slug || "",
    title,
    origin_name,
    imageUrl,
    posterUrl,
    thumbUrl,
    year,
    time,
    quality,
    genre,
    categories,
    description,
    score,
    isTrailerOnly,
    trailer_url,
    hasTrailer,
    lang: m?.lang,
    chieurap,
    sub_docquyen,
    actor,
    director,
    country,
    type_name,
    matchSnippet: m?.matchSnippet,
    matchType: m?.matchType,
    raw: m,
  };
}
