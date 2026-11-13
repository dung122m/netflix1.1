/* eslint-disable @typescript-eslint/no-explicit-any */
import { cacheService } from "@/lib/cache";
import {
  extractPartNumber,
  normalizeTitleCore,
  ROMAN_NUMERALS,
  checkCandidateTitleMatch,
} from "@/lib/movieTitle";

export { extractPartNumber, normalizeTitleCore, ROMAN_NUMERALS, checkCandidateTitleMatch };

// Types, domain utilities & modularized sub-services
import type { TmdbPerson, TmdbPersonDetail, TmdbMovieCredit, MatchTmdbOptions } from "./tmdb/types";
import { setBoundedMap, normalizeTmdbLookupMediaType, type CacheEntry } from "./tmdb/utils";
import {
  runWithConcurrencyLimit,
  matchTmdbMoviesWithSources,
  clearTmdbSingleMatchCache,
  TMDB_SINGLE_MOVIE_MATCH_CACHE,
} from "./tmdb/movieMatcher";

export type { TmdbPerson, TmdbPersonDetail, TmdbMovieCredit, MatchTmdbOptions, CacheEntry };
export {
  setBoundedMap,
  normalizeTmdbLookupMediaType,
  runWithConcurrencyLimit,
  matchTmdbMoviesWithSources,
  clearTmdbSingleMatchCache,
  TMDB_SINGLE_MOVIE_MATCH_CACHE,
};

// =========================================================================
// CẤU HÌNH TMDB API (LẤY TỪ BIẾN MÔI TRƯỜNG, BẢO MẬT PHÍA SERVER)
// =========================================================================
const TMDB_API_KEY =
  process.env.TMDB_API_KEY ||
  process.env.NEXT_PUBLIC_TMDB_API_KEY ||
  "3fd2be6f0c70a2a598f084ddfb75487c";

export const TMDB_BASE_URL = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

// 5. CACHE BACKDROP CHO HERO BANNER (24h RAM L1, 14 ngày L2 Upstash Redis)
const TMDB_BACKDROP_CACHE = new Map<string, { url: string | null; expireAt: number }>();

export async function getTmdbBackdropUrl(
  tmdbId: string | number | undefined | null,
  type: string = "movie"
): Promise<string | null> {
  if (!tmdbId) return null;
  const cleanId = String(tmdbId).trim();
  if (!cleanId || cleanId === "0" || cleanId === "null" || cleanId === "undefined") return null;

  const cleanType = type === "tv" || type === "series" ? "tv" : "movie";
  const cacheKey = `${cleanType}:${cleanId}`;

  const now = Date.now();
  const memoryHit = TMDB_BACKDROP_CACHE.get(cacheKey);
  if (memoryHit && memoryHit.expireAt > now) {
    return memoryHit.url;
  }

  try {
    let data = await fetchTmdbEndpoint(`/${cleanType}/${cleanId}`, 86400);
    if (!data?.backdrop_path && !data?.id) {
      // Thử loại hình thay thế nếu phim bị phân loại nhầm giữa tv/movie
      const altType = cleanType === "tv" ? "movie" : "tv";
      data = await fetchTmdbEndpoint(`/${altType}/${cleanId}`, 86400);
    }
    const backdropUrl = data?.backdrop_path
      ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}`
      : null;

    setBoundedMap(TMDB_BACKDROP_CACHE, cacheKey, {
      url: backdropUrl,
      expireAt: now + (backdropUrl ? 24 * 3600 * 1000 : 3600 * 1000),
    });

    return backdropUrl;
  } catch (err) {
    console.warn(`[TMDB] Error fetching backdrop for ${cleanType}/${cleanId}:`, err);
    return null;
  }
}

// 5.0 CACHE POSTER & BACKDROP TMDB CHO THẺ PHIM (24h RAM L1, Next.js Data Cache 24h)
const TMDB_MEDIA_IMAGES_CACHE = new Map<
  string,
  { posterUrl: string | null; backdropUrl: string | null; expireAt: number }
>();
const inFlightTmdbIdImages = new Map<
  string,
  Promise<{ posterUrl: string | null; backdropUrl: string | null }>
>();

function combineTimeoutSignal(timeoutMs: number, externalSignal?: AbortSignal): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  return externalSignal ? AbortSignal.any([timeoutSignal, externalSignal]) : timeoutSignal;
}

function awaitWithAbort<T>(promise: Promise<T>, signal?: AbortSignal, fallback?: T): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) {
    if (fallback !== undefined) return Promise.resolve(fallback);
    return Promise.reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      if (fallback !== undefined) {
        resolve(fallback);
      } else {
        reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      }
    };
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (val) => {
        signal.removeEventListener("abort", onAbort);
        resolve(val);
      },
      (err) => {
        signal.removeEventListener("abort", onAbort);
        reject(err);
      }
    );
  });
}

export async function getTmdbMediaImagesById(
  tmdbId: string | number | undefined | null,
  type: string = "movie",
  externalSignal?: AbortSignal
): Promise<{ posterUrl: string | null; backdropUrl: string | null }> {
  if (!tmdbId || externalSignal?.aborted) return { posterUrl: null, backdropUrl: null };
  const cleanId = String(tmdbId).trim();
  if (!cleanId || cleanId === "0" || cleanId === "null" || cleanId === "undefined") {
    return { posterUrl: null, backdropUrl: null };
  }

  const cleanType = normalizeTmdbLookupMediaType(type);
  const cacheKey = `v3:${cleanType}:${cleanId}`;

  const now = Date.now();
  const memoryHit = TMDB_MEDIA_IMAGES_CACHE.get(cacheKey);
  if (memoryHit && memoryHit.expireAt > now) {
    return { posterUrl: memoryHit.posterUrl, backdropUrl: memoryHit.backdropUrl };
  }

  const existingFlight = inFlightTmdbIdImages.get(cacheKey);
  if (existingFlight) {
    return awaitWithAbort(existingFlight, externalSignal, { posterUrl: null, backdropUrl: null });
  }

  const task = (async (): Promise<{ posterUrl: string | null; backdropUrl: string | null }> => {
    try {
      // 1. Thử lấy poster tiếng Việt theo cleanType
      let data = await fetchTmdbEndpoint(`/${cleanType}/${cleanId}?language=vi-VN`, 86400, externalSignal);

      // 2. Nếu có phim nhưng chưa có poster tiếng Việt, lấy poster mặc định quốc tế
      if (!data?.poster_path && data?.id && !externalSignal?.aborted) {
        data = await fetchTmdbEndpoint(`/${cleanType}/${cleanId}`, 86400, externalSignal);
      }

      // 3. Fallback sang loại media khác (movie <-> tv) bất cứ khi nào chưa có poster_path
      // (TMDB ID của movie và tv nằm ở 2 namespace tách biệt, có thể trùng số ID)
      if (!data?.poster_path && !externalSignal?.aborted) {
        const altType = cleanType === "tv" ? "movie" : "tv";
        const altVi = await fetchTmdbEndpoint(`/${altType}/${cleanId}?language=vi-VN`, 86400, externalSignal);
        if (altVi?.poster_path) {
          data = altVi;
        } else if (altVi?.id && !externalSignal?.aborted) {
          const altGlobal = await fetchTmdbEndpoint(`/${altType}/${cleanId}`, 86400, externalSignal);
          if (altGlobal?.poster_path) {
            data = altGlobal;
          }
        }
      }

      const posterUrl = data?.poster_path
        ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
        : null;
      const backdropUrl = data?.backdrop_path
        ? `https://image.tmdb.org/t/p/w780${data.backdrop_path}`
        : null;

      if (!externalSignal?.aborted || posterUrl) {
        setBoundedMap(TMDB_MEDIA_IMAGES_CACHE, cacheKey, {
          posterUrl,
          backdropUrl,
          expireAt: Date.now() + (posterUrl ? 24 * 3600 * 1000 : 120 * 1000),
        });
      }

      return { posterUrl, backdropUrl };
    } catch (err) {
      if (!externalSignal?.aborted) {
        console.warn(`[TMDB] Error fetching poster for ${cleanType}/${cleanId}:`, err);
      }
      return { posterUrl: null, backdropUrl: null };
    } finally {
      inFlightTmdbIdImages.delete(cacheKey);
    }
  })();

  inFlightTmdbIdImages.set(cacheKey, task);
  return task;
}

export async function getTmdbPosterUrl(
  tmdbId: string | number | undefined | null,
  type: string = "movie"
): Promise<string | null> {
  const res = await getTmdbMediaImagesById(tmdbId, type);
  return res.posterUrl;
}

const TMDB_TITLE_POSTER_CACHE = new Map<string, { posterUrl: string | null; backdropUrl: string | null; expireAt: number }>();

function extractTitleVariants(text: string): string[] {
  if (!text) return [];
  const res: string[] = [];
  const add = (s: string) => {
    const trimmed = (s || "").trim();
    if (trimmed.length >= 2 && !res.includes(trimmed)) res.push(trimmed);
  };
  add(text);

  const noSeason = text
    .replace(/\((?:Phần|Season|SS|Part)\s*\d+[^)]*\)/gi, "")
    .replace(/(?:Phần|Season|SS|Part)\s*\d+/gi, "")
    .replace(/\[[^\]]*\]/g, "")
    .trim();
  add(noSeason);

  const matches = text.match(/\(([^)]+)\)/g);
  if (matches) {
    for (const m of matches) {
      const inside = m.slice(1, -1).trim();
      if (!/^(Phần|Season|SS|Part)\s*\d+/i.test(inside)) {
        add(inside);
      }
    }
  }

  const noParens = text.replace(/\([^)]*\)/g, "").trim();
  add(noParens);

  return res;
}

function pickBestTmdbCandidate(results: any[], targetType: string, targetYear?: number | string): any | null {
  if (!Array.isArray(results) || results.length === 0) return null;

  const valid = results.filter((r) => r && (r.poster_path || r.backdrop_path));
  if (valid.length === 0) return results[0] || null;

  const parsedYear = targetYear ? parseInt(String(targetYear).trim(), 10) : null;

  const scored = valid.map((r) => {
    let score = 0;
    const itemType = r.media_type || (r.first_air_date ? "tv" : "movie");
    if (itemType === targetType) score += 60;

    const relDate = r.release_date || r.first_air_date || "";
    if (parsedYear && relDate) {
      const itemYear = parseInt(relDate.slice(0, 4), 10);
      if (!isNaN(itemYear)) {
        const diff = Math.abs(itemYear - parsedYear);
        if (diff === 0) score += 80;
        else if (diff === 1) score += 40;
      }
    }

    if (r.poster_path) score += 30;
    score += Math.min(40, Math.log10((r.vote_count || 0) + 1) * 10);
    score += Math.min(20, (r.popularity || 0) / 10);

    return { item: r, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.item || valid[0];
}

const inFlightTmdbTitlePoster = new Map<string, Promise<{ posterUrl: string | null; backdropUrl: string | null }>>();

export async function searchTmdbPosterByTitle(
  query: string,
  year?: number | string,
  type: string = "movie",
  externalSignal?: AbortSignal
): Promise<{ posterUrl: string | null; backdropUrl: string | null }> {
  if (!query || typeof query !== "string" || externalSignal?.aborted) {
    return { posterUrl: null, backdropUrl: null };
  }
  const cleanQuery = query.trim();
  if (cleanQuery.length < 2) return { posterUrl: null, backdropUrl: null };

  const cacheKey = `${cleanQuery}|${year || ""}|${type}`.toLowerCase();
  const now = Date.now();
  const memHit = TMDB_TITLE_POSTER_CACHE.get(cacheKey);
  if (memHit && memHit.expireAt > now) {
    return { posterUrl: memHit.posterUrl, backdropUrl: memHit.backdropUrl };
  }

  const existingFlight = inFlightTmdbTitlePoster.get(cacheKey);
  if (existingFlight) {
    return awaitWithAbort(existingFlight, externalSignal, { posterUrl: null, backdropUrl: null });
  }

  const cleanType = normalizeTmdbLookupMediaType(type);
  const searchYear = year && /^\d{4}$/.test(String(year).trim()) ? `&year=${String(year).trim()}` : "";
  const variants = extractTitleVariants(cleanQuery).slice(0, 3);

  const task = (async (): Promise<{ posterUrl: string | null; backdropUrl: string | null }> => {
    let result: { posterUrl: string | null; backdropUrl: string | null } = {
      posterUrl: null,
      backdropUrl: null,
    };

    try {
      for (let i = 0; i < variants.length; i++) {
        if (externalSignal?.aborted) break;
        const v = variants[i];
        // 1. Thử search/multi (bao quát cả movie và tv series/anime, match cả tên gốc và tên tiếng Việt)
        try {
          const endpointMulti = `/search/multi?query=${encodeURIComponent(v)}&include_adult=false`;
          const dataMulti = await fetchTmdbEndpoint(endpointMulti, 86400, externalSignal);
          const bestMulti = pickBestTmdbCandidate(dataMulti?.results, cleanType, year);
          if (bestMulti?.poster_path) {
            result = {
              posterUrl: `https://image.tmdb.org/t/p/w500${bestMulti.poster_path}`,
              backdropUrl: bestMulti.backdrop_path ? `https://image.tmdb.org/t/p/w1280${bestMulti.backdrop_path}` : null,
            };
            break;
          }
        } catch {}

        // 2. Fallback localized theo type cho 2 biến thể đầu tiên
        if (i < 2 && !externalSignal?.aborted) {
          try {
            const endpointType = `/search/${cleanType}?query=${encodeURIComponent(v)}${searchYear}&language=vi-VN`;
            const dataType = await fetchTmdbEndpoint(endpointType, 86400, externalSignal);
            const bestType = pickBestTmdbCandidate(dataType?.results, cleanType, year);
            if (bestType?.poster_path) {
              result = {
                posterUrl: `https://image.tmdb.org/t/p/w500${bestType.poster_path}`,
                backdropUrl: bestType.backdrop_path ? `https://image.tmdb.org/t/p/w1280${bestType.backdrop_path}` : null,
              };
              break;
            }
          } catch {}
        }
      }

      if (!externalSignal?.aborted || result.posterUrl) {
        setBoundedMap(TMDB_TITLE_POSTER_CACHE, cacheKey, {
          posterUrl: result.posterUrl,
          backdropUrl: result.backdropUrl,
          expireAt: Date.now() + (result.posterUrl ? 24 * 3600 * 1000 : 120 * 1000),
        });
      }

      return result;
    } finally {
      inFlightTmdbTitlePoster.delete(cacheKey);
    }
  })();

  inFlightTmdbTitlePoster.set(cacheKey, task);
  return task;
}

// 5.1 CACHE CLEARLOGO TRONG SUỐT CHO MOVIE DETAIL (24h L1 RAM, 30 ngày L2 Upstash)
const TMDB_LOGO_CACHE = new Map<string, { url: string | null; expireAt: number }>();

export interface TmdbImageLogo {
  aspect_ratio: number;
  height: number;
  iso_639_1: string | null;
  file_path: string;
  vote_average: number;
  vote_count: number;

  width: number;
}

export async function getTmdbMovieLogo(
  tmdbId: string | number | undefined | null,
  type: string = "movie"
): Promise<string | null> {
  if (!tmdbId) return null;
  const cleanId = String(tmdbId).trim();
  if (!cleanId || cleanId === "0" || cleanId === "null" || cleanId === "undefined") return null;

  const cleanType =
    type === "tv" || type === "series" || type === "phim-bo" || type === "tvshows" ? "tv" : "movie";
  const cacheKey = `${cleanType}:${cleanId}`;
  const now = Date.now();

  const memHit = TMDB_LOGO_CACHE.get(cacheKey);
  if (memHit && memHit.expireAt > now) {
    return memHit.url;
  }

  const kvKey = `tmdb:logo:v1:${cleanType}:${cleanId}`;
  const logoUrl = await cacheService.fetchOrSet<string | null>(
    kvKey,
    async () => {
      try {
        // 1. Gọi endpoint images với ngôn ngữ vi, en và null
        let data = await fetchTmdbEndpoint(
          `/${cleanType}/${cleanId}/images?include_image_language=vi,en,null`
        );
        let logos: TmdbImageLogo[] = Array.isArray(data?.logos) ? data.logos : [];

        // 2. Fallback sang loại hình thay thế nếu upstream phân loại nhầm giữa movie và tv
        if (logos.length === 0) {
          const altType = cleanType === "tv" ? "movie" : "tv";
          data = await fetchTmdbEndpoint(
            `/${altType}/${cleanId}/images?include_image_language=vi,en,null`
          );
          logos = Array.isArray(data?.logos) ? data.logos : [];
        }

        if (logos.length === 0) return null;

        // 3. Lọc các logo hợp lệ: định dạng png/svg, tỷ lệ ngang hợp lý, độ phân giải tối thiểu
        const validLogos = logos.filter((l) => {
          if (!l || !l.file_path) return false;
          const fp = l.file_path.toLowerCase();
          const isTransparentFormat = fp.endsWith(".png") || fp.endsWith(".svg");
          // Lọc aspect ratio ngang chuẩn (tránh poster bị tag nhầm thành logo)
          const isHorizontal = l.aspect_ratio >= 0.8 && l.aspect_ratio <= 8.0;
          const isGoodResolution = (l.width || 0) >= 120 && (l.height || 0) >= 30;
          return isTransparentFormat && isHorizontal && isGoodResolution;
        });

        if (validLogos.length === 0) return null;

        // 4. Sắp xếp theo thứ tự ưu tiên:
        // Priority 1: Tiếng Việt (vi)
        // Priority 2: Tiếng Anh (en)
        // Priority 3: Không phân biệt ngôn ngữ (null / khác)
        // Tie-breaker: Vote cao hơn hoặc độ phân giải cao hơn
        validLogos.sort((a, b) => {
          const getLangScore = (lang: string | null) => {
            if (lang === "vi") return 300;
            if (lang === "en") return 200;
            if (lang === null || !lang) return 100;
            return 50;
          };
          const scoreA = getLangScore(a.iso_639_1) + (a.vote_average || 0) * 5 + (a.width > 300 ? 10 : 0);
          const scoreB = getLangScore(b.iso_639_1) + (b.vote_average || 0) * 5 + (b.width > 300 ? 10 : 0);
          return scoreB - scoreA;
        });

        const best = validLogos[0];
        if (best && best.file_path) {
          return `https://image.tmdb.org/t/p/w500${best.file_path}`;
        }
        return null;
      } catch (err) {
        console.warn(`[TMDB] Error fetching logo for ${cleanType}/${cleanId}:`, err);
        return null;
      }
    },
    30 * 86400 // 30 ngày trên Upstash KV
  );

  TMDB_LOGO_CACHE.set(cacheKey, {
    url: logoUrl,
    expireAt: now + (logoUrl ? 24 * 3600 * 1000 : 3600 * 1000),
  });

  return logoUrl;
}

// 5.2 CACHE TRAILER CHÍNH THỨC TỪ TMDB (24h L1 RAM, 7 ngày L2 KV)
const TMDB_TRAILER_CACHE = new Map<string, { url: string | null; expireAt: number }>();

export async function getTmdbTrailerUrl(
  tmdbId: string | number | undefined | null,
  type: string = "movie"
): Promise<string | null> {
  if (!tmdbId) return null;
  const cleanId = String(tmdbId).trim();
  if (!cleanId || cleanId === "0" || cleanId === "null" || cleanId === "undefined") return null;

  const cleanType =
    type === "tv" || type === "series" || type === "phim-bo" || type === "tvshows" ? "tv" : "movie";
  const cacheKey = `${cleanType}:${cleanId}`;

  const now = Date.now();
  const memoryHit = TMDB_TRAILER_CACHE.get(cacheKey);
  if (memoryHit && memoryHit.expireAt > now) {
    return memoryHit.url;
  }

  const kvKey = `tmdb:trailer:v1:${cleanType}:${cleanId}`;
  const trailerUrl = await cacheService.fetchOrSet<string | null>(
    kvKey,
    async () => {
      try {
        let data = await fetchTmdbEndpoint(`/${cleanType}/${cleanId}/videos?include_video_language=vi,en,null`);
        let videos = Array.isArray(data?.results) ? data.results : [];

        if (videos.length === 0) {
          // Thử loại hình thay thế nếu phim bị phân loại nhầm giữa tv/movie
          const altType = cleanType === "tv" ? "movie" : "tv";
          data = await fetchTmdbEndpoint(`/${altType}/${cleanId}/videos?include_video_language=vi,en,null`);
          videos = Array.isArray(data?.results) ? data.results : [];
        }

        const ytVideos = videos.filter((v: any) => v.site === "YouTube" && v.key);
        if (ytVideos.length === 0) return null;

        // Ưu tiên Trailer Tiếng Việt chính thức -> Trailer Tiếng Anh chính thức -> Bất kỳ Trailer -> Teaser
        const viOfficial = ytVideos.find((v: any) => v.type === "Trailer" && v.official && v.iso_639_1 === "vi");
        const enOfficial = ytVideos.find((v: any) => v.type === "Trailer" && v.official);
        const anyOfficial = ytVideos.find((v: any) => v.official);
        const anyTrailer = ytVideos.find((v: any) => v.type === "Trailer");
        const anyTeaser = ytVideos.find((v: any) => v.type === "Teaser");

        const best = viOfficial || enOfficial || anyOfficial || anyTrailer || anyTeaser || ytVideos[0];
        if (best?.key) {
          return `https://www.youtube.com/watch?v=${best.key}`;
        }
        return null;
      } catch (err) {
        console.warn(`[TMDB] Error fetching trailer for ${cleanType}/${cleanId}:`, err);
        return null;
      }
    },
    7 * 86400 // 7 ngày trên Upstash KV
  );

  TMDB_TRAILER_CACHE.set(cacheKey, {
    url: trailerUrl,
    expireAt: now + (trailerUrl ? 24 * 3600 * 1000 : 3600 * 1000),
  });

  return trailerUrl;
}

export async function searchTmdbTrailerByTitle(
  query: string,
  year?: number | string,
  type: string = "movie"
): Promise<string | null> {
  if (!query || typeof query !== "string") return null;
  const cleanQuery = query.trim();
  if (cleanQuery.length < 2) return null;

  const cleanType =
    type === "tv" || type === "series" || type === "phim-bo" || type === "tvshows" ? "tv" : "movie";
  const searchYear = year ? `&year=${year}` : "";
  const endpoint = `/search/${cleanType}?query=${encodeURIComponent(cleanQuery)}${searchYear}&language=vi-VN`;

  try {
    const data = await fetchTmdbEndpoint(endpoint, 86400);
    const results = Array.isArray(data?.results) ? data.results : [];
    if (results.length > 0 && results[0]?.id) {
      return await getTmdbTrailerUrl(results[0].id, cleanType);
    }
  } catch {}
  return null;
}

// 6. CACHE REVIEWS KHÁN GIẢ TMDB (24h L1 RAM, 14 ngày L2 Upstash)
const TMDB_REVIEWS_CACHE = new Map<string, { data: TmdbReview[]; expireAt: number }>();

export interface TmdbReview {
  id: string;
  author: string;
  author_name?: string;
  author_username?: string;
  author_avatar?: string | null;
  rating?: number | null;
  content: string;
  created_at: string;
  url: string;
}

export async function getTmdbReviews(
  tmdbId: string | number | undefined | null,
  type: string = "movie"
): Promise<TmdbReview[]> {
  if (!tmdbId) return [];
  const cleanId = String(tmdbId).trim();
  if (!cleanId || cleanId === "0" || cleanId === "null" || cleanId === "undefined") return [];

  const cleanType = type === "tv" || type === "series" ? "tv" : "movie";
  const cacheKey = `${cleanType}:${cleanId}`;
  const now = Date.now();

  const memHit = TMDB_REVIEWS_CACHE.get(cacheKey);
  if (memHit && memHit.expireAt > now) {
    return memHit.data;
  }

  const kvKey = `tmdb:reviews:${cleanType}:${cleanId}`;
  const reviews = await cacheService.fetchOrSet<TmdbReview[]>(
    kvKey,
    async () => {
      try {
        let res = await fetchTmdbEndpoint(`/${cleanType}/${cleanId}/reviews?page=1`);
        if (!res?.results || res.results.length === 0) {
          const altType = cleanType === "tv" ? "movie" : "tv";
          res = await fetchTmdbEndpoint(`/${altType}/${cleanId}/reviews?page=1`);
        }
        if (!res?.results || !Array.isArray(res.results)) return [];

        const items: TmdbReview[] = res.results.slice(0, 10).map((r: any) => {
          let avatar = r.author_details?.avatar_path || null;
          if (avatar && typeof avatar === "string") {
            if (avatar.startsWith("/https://") || avatar.startsWith("/http://")) {
              avatar = avatar.slice(1);
            } else if (avatar.startsWith("/")) {
              avatar = `https://image.tmdb.org/t/p/w185${avatar}`;
            }
          }
          return {
            id: r.id || String(Math.random()),
            author: r.author || r.author_details?.username || "Khán giả TMDB",
            author_name: r.author_details?.name || undefined,
            author_username: r.author_details?.username || undefined,
            author_avatar: avatar,
            rating: typeof r.author_details?.rating === "number" ? r.author_details.rating : null,
            content: (r.content || "").trim(),
            created_at: r.created_at || new Date().toISOString(),
            url: r.url || `https://www.themoviedb.org/${cleanType}/${cleanId}`,
          };
        });

        return items;
      } catch (err) {
        console.warn(`[TMDB] Error fetching reviews for ${cleanType}/${cleanId}:`, err);
        return [];
      }
    },
    14 * 86400 // 14 ngày
  );

  TMDB_REVIEWS_CACHE.set(cacheKey, {
    data: reviews || [],
    expireAt: now + 24 * 3600 * 1000,
  });

  return reviews || [];
}

// 7. CACHE DÀN DIỄN VIÊN & NHÂN VẬT (24h L1 RAM, 30 ngày L2 Upstash)
const TMDB_CAST_CACHE = new Map<string, { data: TmdbCastMember[]; expireAt: number }>();

export interface TmdbCastMember {
  id: number;
  name: string;
  original_name?: string;
  character?: string;
  profile_path?: string | null;
  known_for_department?: string;
  order?: number;
}

export async function getTmdbMovieCredits(
  tmdbId: string | number | undefined | null,
  type: string = "movie"
): Promise<TmdbCastMember[]> {
  if (!tmdbId) return [];
  const cleanId = String(tmdbId).trim();
  if (!cleanId || cleanId === "0" || cleanId === "null" || cleanId === "undefined") return [];

  const cleanType =
    type === "tv" || type === "series" || type === "phim-bo" || type === "tvshows" ? "tv" : "movie";
  const cacheKey = `${cleanType}:${cleanId}`;
  const now = Date.now();

  const memHit = TMDB_CAST_CACHE.get(cacheKey);
  if (memHit && memHit.expireAt > now) {
    return memHit.data;
  }

  const kvKey = `tmdb:credits:v1:${cleanType}:${cleanId}`;
  const castList = await cacheService.fetchOrSet<TmdbCastMember[]>(
    kvKey,
    async () => {
      try {
        // 1. Thử lấy credits với ngôn ngữ tiếng Việt
        let res = await fetchTmdbEndpoint(`/${cleanType}/${cleanId}/credits?language=vi-VN`);
        if (!res?.cast || !Array.isArray(res.cast) || res.cast.length === 0) {
          // 2. Fallback sang tiếng Anh / gốc
          res = await fetchTmdbEndpoint(`/${cleanType}/${cleanId}/credits`);
        }
        if (!res?.cast || !Array.isArray(res.cast) || res.cast.length === 0) {
          // 3. Fallback sang loại hình thay thế (movie <-> tv) nếu upstream gán nhầm
          const altType = cleanType === "tv" ? "movie" : "tv";
          res = await fetchTmdbEndpoint(`/${altType}/${cleanId}/credits`);
        }

        if (!res?.cast || !Array.isArray(res.cast)) return [];

        const validCast: TmdbCastMember[] = res.cast
          .filter((c: any) => c && c.name && typeof c.name === "string" && c.name.trim())
          .slice(0, 15)
          .map((c: any, index: number) => ({
            id: Number(c.id) || index,
            name: String(c.name).trim(),
            original_name: c.original_name ? String(c.original_name).trim() : undefined,
            character: c.character
              ? String(c.character).trim()
              : c.roles?.[0]?.character
              ? String(c.roles[0].character).trim()
              : "",
            profile_path: c.profile_path ? `https://image.tmdb.org/t/p/w276_and_h350_face${c.profile_path}` : null,
            known_for_department: c.known_for_department || "Acting",
            order: typeof c.order === "number" ? c.order : index,
          }));

        return validCast;
      } catch (err) {
        console.warn(`[TMDB] Error fetching credits for ${cleanType}/${cleanId}:`, err);
        return [];
      }
    },
    30 * 86400 // 30 ngày trên Upstash KV
  );

  TMDB_CAST_CACHE.set(cacheKey, {
    data: castList || [],
    expireAt: now + 24 * 3600 * 1000,
  });

  return castList || [];
}

// 8. CACHE ĐỀ XUẤT PHIM TƯƠNG TỰ TỪ TMDB (24h L1 RAM, 14 ngày L2 Upstash)
const TMDB_RECOMMENDATIONS_CACHE = new Map<string, { data: any[]; expireAt: number }>();

export async function getTmdbMovieRecommendations(
  tmdbId: string | number | undefined | null,
  type: string = "movie",
  excludeSlug?: string | string[],
  limit: number = 12
): Promise<any[]> {
  if (!tmdbId) return [];
  const cleanId = String(tmdbId).trim();
  if (!cleanId || cleanId === "0" || cleanId === "null" || cleanId === "undefined") return [];

  const cleanType =
    type === "tv" || type === "series" || type === "phim-bo" || type === "tvshows" ? "tv" : "movie";
  const cacheKey = `${cleanType}:${cleanId}`;
  const now = Date.now();

  const filterExcludes = (list: any[]) => {
    if (!excludeSlug) return list.slice(0, limit);
    const exSet = new Set(Array.isArray(excludeSlug) ? excludeSlug : [excludeSlug]);
    return list.filter((m: any) => !exSet.has(m?.slug)).slice(0, limit);
  };

  const memHit = TMDB_RECOMMENDATIONS_CACHE.get(cacheKey);
  if (memHit && memHit.expireAt > now) {
    return filterExcludes(memHit.data);
  }

  const kvKey = `tmdb:recommendations:v1:${cleanType}:${cleanId}`;
  const matchedMovies = await cacheService.fetchOrSet<any[]>(
    kvKey,
    async () => {
      try {
        // 1. Thử lấy danh sách recommendations trước (ưu tiên số 1)
        let res = await fetchTmdbEndpoint(`/${cleanType}/${cleanId}/recommendations?language=vi-VN&page=1`);
        let results = Array.isArray(res?.results) ? res.results : [];

        // 2. Nếu recommendations rỗng hoặc ít hơn 6 phim, bổ sung / fallback từ endpoint similar (ưu tiên số 2)
        if (results.length < 6) {
          const simRes = await fetchTmdbEndpoint(`/${cleanType}/${cleanId}/similar?language=vi-VN&page=1`);
          const simResults = Array.isArray(simRes?.results) ? simRes.results : [];
          const existingIds = new Set(results.map((r: any) => r?.id).filter(Boolean));
          for (const s of simResults) {
            if (s?.id && !existingIds.has(s.id)) {
              existingIds.add(s.id);
              results.push(s);
            }
          }
        }

        // 3. Fallback loại hình chéo nếu upstream phân loại nhầm giữa movie và tv
        if (results.length === 0) {
          const altType = cleanType === "tv" ? "movie" : "tv";
          res = await fetchTmdbEndpoint(`/${altType}/${cleanId}/recommendations?language=vi-VN&page=1`);
          results = Array.isArray(res?.results) ? res.results : [];
          if (results.length === 0) {
            const altSim = await fetchTmdbEndpoint(`/${altType}/${cleanId}/similar?language=vi-VN&page=1`);
            results = Array.isArray(altSim?.results) ? altSim.results : [];
          }
        }

        if (results.length === 0) return [];

        // Lọc top 15 - 20 candidates TMDB chất lượng nhất, loại bỏ phim tương lai
        const currentYear = new Date().getFullYear();
        const seenIds = new Set<number>();
        const candidateCredits: TmdbMovieCredit[] = [];

        for (const item of results) {
          if (!item || !item.id || seenIds.has(item.id)) continue;
          seenIds.add(item.id);

          const releaseDate = item.release_date || item.first_air_date || "";
          if (releaseDate) {
            const y = parseInt(releaseDate.slice(0, 4), 10);
            if (!isNaN(y) && y > currentYear + 1) continue;
          }

          candidateCredits.push({
            id: item.id,
            title: item.title || item.name || "",
            original_title: item.original_title || item.original_name || item.title || item.name || "",
            release_date: releaseDate,
            vote_average: Number(item.vote_average || 0),
            vote_count: Number(item.vote_count || 0),
            popularity: Number(item.popularity || 0),
            poster_path: item.poster_path || null,
            backdrop_path: item.backdrop_path || null,
            overview: item.overview || "",
            media_type: item.media_type || (item.first_air_date ? "tv" : "movie"),
            genre_ids: Array.isArray(item.genre_ids) ? item.genre_ids : undefined,
            original_language: item.original_language || undefined,
          });

          if (candidateCredits.length >= 14) break;
        }

        if (candidateCredits.length === 0) return [];

        // 4. Đối chiếu candidate TMDB với catalog Nanaflix (PhimAPI/NguonC)
        // Ưu tiên: 1. TMDB ID -> 2. IMDb ID -> 3. Title + Year match
        const matched = await matchTmdbMoviesWithSources(candidateCredits, candidateCredits.length, 10);
        return matched || [];
      } catch (err) {
        console.warn(`[TMDB] Error fetching recommendations for ${cleanType}/${cleanId}:`, err);
        return [];
      }
    },
    14 * 86400 // 14 ngày trên Upstash KV
  );

  TMDB_RECOMMENDATIONS_CACHE.set(cacheKey, {
    data: matchedMovies || [],
    expireAt: now + 24 * 3600 * 1000,
  });

  const list = matchedMovies || [];
  return filterExcludes(list);
}

// DNS IP cache nhằm khắc phục việc một số nhà mạng VNPT/Viettel chặn hoặc lỗi phân giải api.themoviedb.org
let cachedTmdbIp: string | null = null;
let lastIpResolveTime = 0;

async function resolveTmdbIp(): Promise<string> {
  const now = Date.now();
  if (cachedTmdbIp && now - lastIpResolveTime < 3600000) {
    return cachedTmdbIp;
  }
  if (typeof window === "undefined") {
    try {
      const dnsModule = await import("dns");
      const resolver = new dnsModule.promises.Resolver();
      resolver.setServers(["8.8.8.8", "1.1.1.1"]);
      const ips = await resolver.resolve4("api.themoviedb.org");
      if (ips && ips.length > 0) {
        cachedTmdbIp = ips[0];
        lastIpResolveTime = now;
        return cachedTmdbIp;
      }
    } catch {}
  }
  return "api.themoviedb.org";
}

const inFlightTmdbEndpoint = new Map<string, Promise<any>>();

/**
 * Gọi TMDB API bền bỉ và tối ưu:
 * 1. Thử fetch chuẩn của Node/Next.js có next.revalidate.
 * 2. Chỉ fallback sang DNS Google 8.8.8.8 + https agent khi gặp lỗi mạng/DNS thực sự (không chạy lại khi server đã trả HTTP 4xx/5xx).
 */
export async function fetchTmdbEndpoint(
  endpointPath: string,
  revalidateSeconds = 3600,
  externalSignal?: AbortSignal
): Promise<any> {
  if (externalSignal?.aborted) return null;

  const existingFlight = inFlightTmdbEndpoint.get(endpointPath);
  if (existingFlight) {
    return awaitWithAbort(existingFlight, externalSignal, null);
  }

  const sep = endpointPath.includes("?") ? "&" : "?";
  const authQuery = TMDB_API_KEY ? `api_key=${TMDB_API_KEY}` : "";
  const fullRelativePath = `${endpointPath}${sep}${authQuery}`;
  const fullUrl = `${TMDB_BASE_URL}${fullRelativePath}`;

  const task = (async (): Promise<any> => {
    let shouldFallbackDns = false;

    // 1. Thử gọi native fetch
    try {
      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Nanaflix/1.0",
        Accept: "application/json",
      };
      if (TMDB_API_KEY && TMDB_API_KEY.startsWith("eyJ")) {
        headers["Authorization"] = `Bearer ${TMDB_API_KEY}`;
      }

      const res = await fetch(fullUrl, {
        headers,
        signal: combineTimeoutSignal(3000, externalSignal),
        next: { revalidate: revalidateSeconds },
      });
      if (res.ok) {
        return await res.json();
      }
      // Server đã phản hồi HTTP (404, 400, 401, 429...) -> trả null ngay, không fallback DNS/HTTPS lặp lại
      return null;
    } catch (err: any) {
      if (externalSignal?.aborted) {
        return null;
      }
      const msg = String(err?.message || "");
      const causeCode = String(err?.cause?.code || err?.code || "");
      const causeMsg = String(err?.cause?.message || "");
      const combined = `${msg} ${causeCode} ${causeMsg}`;
      const isTimeout = err?.name === "TimeoutError" || msg.includes("aborted due to timeout");
      const isDnsOrNetworkBlock =
        !isTimeout &&
        (combined.includes("ENOTFOUND") ||
          combined.includes("EAI_AGAIN") ||
          combined.includes("ECONNREFUSED") ||
          combined.includes("ECONNRESET") ||
          combined.includes("fetch failed"));

      shouldFallbackDns = isDnsOrNetworkBlock;
      if (!isDnsOrNetworkBlock && !isTimeout) {
        console.warn("[TMDB] Native fetch error:", msg);
      }
    }

    // 2. Fallback sang https qua Resolved IP với Google/Cloudflare DNS (chỉ khi gặp lỗi DNS/network block)
    if (shouldFallbackDns && !externalSignal?.aborted && typeof window === "undefined") {
      try {
        const httpsModule = await import("https");
        const ip = await awaitWithAbort(
          Promise.race([
            resolveTmdbIp(),
            new Promise<string>((resolve) => setTimeout(() => resolve("api.themoviedb.org"), 1500)),
          ]),
          externalSignal
        );
        if (externalSignal?.aborted) return null;

        return await new Promise((resolve, reject) => {
          const reqHeaders: Record<string, string> = {
            Host: "api.themoviedb.org",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Nanaflix/1.0",
            Accept: "application/json",
            Connection: "close",
          };
          if (TMDB_API_KEY && TMDB_API_KEY.startsWith("eyJ")) {
            reqHeaders["Authorization"] = `Bearer ${TMDB_API_KEY}`;
          }

          const req = httpsModule.request(
            {
              host: ip,
              path: `/3${fullRelativePath}`,
              headers: reqHeaders,
              servername: "api.themoviedb.org",
              method: "GET",
              agent: false,
            },
            (res: any) => {
              let body = "";
              res.on("data", (chunk: any) => (body += chunk));
              res.on("end", () => {
                cleanupAbort();
                try {
                  if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(body));
                  } else {
                    resolve(null);
                  }
                } catch (parseErr) {
                  reject(parseErr);
                }
              });
            }
          );

          const onAbort = () => {
            req.destroy();
            reject(externalSignal?.reason ?? new DOMException("Aborted", "AbortError"));
          };
          const cleanupAbort = () => {
            externalSignal?.removeEventListener("abort", onAbort);
          };
          if (externalSignal) {
            externalSignal.addEventListener("abort", onAbort, { once: true });
          }

          req.on("error", (err: any) => {
            cleanupAbort();
            reject(err);
          });
          req.setTimeout(2500, () => {
            cleanupAbort();
            req.destroy();
            reject(new Error("TMDB HTTPS request timeout"));
          });
          req.end();
        });
      } catch {}
    }

    return null;
  })();

  inFlightTmdbEndpoint.set(endpointPath, task);
  try {
    return await task;
  } finally {
    inFlightTmdbEndpoint.delete(endpointPath);
  }
}

// =========================================================================
// PERSON & ARTIST FILMOGRAPHY SERVICES (DELEGATED TO MODULAR SUB-SERVICES)
// =========================================================================
export {
  searchTmdbPerson,
  getTmdbPersonDetail,
  getTmdbPersonMovieCredits,
  getActorFilmographyFromTmdb,
  getDirectorFilmographyFromTmdb,
} from "./tmdb/personService";

export type { TmdbRankType } from "./tmdb/tmdbRankingService";
export {
  getTmdbRankedMovies,
  getTmdbTrendingMovies,
  searchTmdbMedia,
  discoverTmdbConceptMovies,
} from "./tmdb/tmdbRankingService";
