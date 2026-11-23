import {
  NGUONC_GENRE_MAP,
  NGUONC_COUNTRY_MAP,
} from "@/data/movies/taxonomy";
import {
  formatGenreName,
  formatCountryName,
  getCanonicalGenreSlug,
  getCanonicalCountrySlug,
  extractMovieDirectors,
  extractMovieActors,
  extractMovieRatingScore,
  extractMovieModifiedTime,
} from "@/lib/movieMedia";
import { MovieFilterParams, ParsedSortMode, parseSortMode } from "./filterTypes";

export const API_NGUONC = process.env.NEXT_PUBLIC_API_URL || "https://phim.nguonc.com/api";
export const API_PHIMAPI = process.env.NEXT_PUBLIC_API_URL_2 || "https://phimapi.com";

export const PHIMAPI_TIMEOUT_MS = 6000;
export const PHIMAPI_SEARCH_TIMEOUT_MS = 4000;
export const NGUONC_TIMEOUT_MS = 7500;

export interface QueryPaginationMeta {
  countApi1: number;
  countApi2: number;
  countApi3?: number;
  totalItems: number;
  totalPages: number;
  updatedAt: number;
}

export const queryMetadataCache = new Map<string, QueryPaginationMeta>();

export function buildQueryMetaKey(params: MovieFilterParams): string {
  return JSON.stringify({
    v: 23,
    category: params.category || "",
    country: params.country || "",
    year: params.year || "",
    keyword: params.keyword?.trim() || "",
    limit: params.limit || 24,
    type: params.type || "",
    sort: params.sort || "latest",
  });
}

export function getNguonCGenreSlug(slug?: string): string {
  if (!slug) return "";
  return NGUONC_GENRE_MAP[slug] || slug;
}

export function getNguonCCountrySlug(slug?: string): string {
  if (!slug) return "";
  return NGUONC_COUNTRY_MAP[slug] || slug;
}

export function getNguonCQueryMetaKey(params: MovieFilterParams, isSearch: boolean): string {
  if (isSearch && params.keyword) {
    return `search:${params.keyword.trim().toLowerCase()}`;
  }
  return `filter:${params.type || ""}:${params.category || ""}:${params.country || ""}:${params.year || ""}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sortMovieCandidates<T extends Record<string, any>>(
  candidates: T[],
  parsedSort: ParsedSortMode,
  isSearch: boolean = false
): T[] {
  if (isSearch) {
    candidates.sort((a, b) => (Number(b.relevanceScore) || 0) - (Number(a.relevanceScore) || 0));
  } else if (parsedSort.field === "rating") {
    candidates.sort((a, b) => {
      const { rating: rateA, voteCount: vcA } = extractMovieRatingScore(a);
      const { rating: rateB, voteCount: vcB } = extractMovieRatingScore(b);

      if (parsedSort.direction === "asc") {
        if (rateA !== rateB) return rateA - rateB;
        if (vcA !== vcB) return vcA - vcB;
        const yearA = Number(a.year || 0);
        const yearB = Number(b.year || 0);
        if (yearA !== yearB) return yearA - yearB;
      } else {
        if (rateB !== rateA) return rateB - rateA;
        if (vcB !== vcA) return vcB - vcA;
        const yearA = Number(a.year || 0);
        const yearB = Number(b.year || 0);
        if (yearB !== yearA) return yearB - yearA;
      }
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  } else if (parsedSort.field === "year") {
    candidates.sort((a, b) => {
      const yearA = Number(a.year || 0);
      const yearB = Number(b.year || 0);
      if (yearB !== yearA) {
        return parsedSort.direction === "asc" ? yearA - yearB : yearB - yearA;
      }
      return parsedSort.direction === "asc"
        ? extractMovieModifiedTime(a) - extractMovieModifiedTime(b)
        : extractMovieModifiedTime(b) - extractMovieModifiedTime(a);
    });
  } else if (parsedSort.field === "view") {
    candidates.sort((a, b) => {
      const vA = Number(a.view || a.tmdb?.vote_count || 0);
      const vB = Number(b.view || b.tmdb?.vote_count || 0);
      if (vB !== vA) {
        return parsedSort.direction === "asc" ? vA - vB : vB - vA;
      }
      return parsedSort.direction === "asc"
        ? extractMovieModifiedTime(a) - extractMovieModifiedTime(b)
        : extractMovieModifiedTime(b) - extractMovieModifiedTime(a);
    });
  } else {
    // "modified.time" ("latest" desc hoặc "oldest" asc)
    candidates.sort((a, b) => {
      const timeA = extractMovieModifiedTime(a);
      const timeB = extractMovieModifiedTime(b);
      if (timeB !== timeA) {
        return parsedSort.direction === "asc" ? timeA - timeB : timeB - timeA;
      }
      const yearA = Number(a.year || 0);
      const yearB = Number(b.year || 0);
      if (yearB !== yearA) {
        return parsedSort.direction === "asc" ? yearA - yearB : yearB - yearA;
      }
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }
  return candidates;
}

export interface SourcePageAllocation {
  aOffset: number;
  aLimit: number;
  bOffset: number;
  bLimit: number;
}

export function calculateSourcePageAllocation(
  page: number,
  limit: number,
  totalA: number,
  totalB: number,
  isBAvailable: boolean
): SourcePageAllocation {
  if (!isBAvailable) {
    return {
      aOffset: (page - 1) * limit,
      aLimit: limit,
      bOffset: 0,
      bLimit: 0,
    };
  }

  const defaultALimit = Math.max(1, Math.round((limit * 2) / 3)); // 16
  const defaultBLimit = Math.max(0, limit - defaultALimit); // 8

  // Nếu chưa có thông tin về tổng số items (trang 1 lần đầu), mặc định phân bổ 16 : 8
  if (totalA <= 0 && totalB <= 0) {
    return {
      aOffset: (page - 1) * defaultALimit,
      aLimit: defaultALimit,
      bOffset: (page - 1) * defaultBLimit,
      bLimit: defaultBLimit,
    };
  }

  // Nếu PhimAPI chắc chắn không có phim nào cho query này
  if (totalA <= 0 && totalB > 0) {
    return {
      aOffset: 0,
      aLimit: 0,
      bOffset: (page - 1) * limit,
      bLimit: limit,
    };
  }

  // Nếu NguonC chắc chắn không có phim nào cho query này
  if (totalB <= 0 && totalA > 0) {
    return {
      aOffset: (page - 1) * limit,
      aLimit: limit,
      bOffset: 0,
      bLimit: 0,
    };
  }

  // PhimAPI capacity
  const pAFull = Math.floor(totalA / defaultALimit);
  const pARem = totalA % defaultALimit;
  const pAExhaust = pARem > 0 ? pAFull + 1 : pAFull;

  // NguonC capacity
  const pBFull = Math.floor(totalB / defaultBLimit);
  const pBRem = totalB % defaultBLimit;
  const pBExhaust = pBRem > 0 ? pBFull + 1 : pBFull;

  // Case 1: Source A runs out earlier than Source B (e.g. hoat-hinh, phim-bo, phim-le)
  if (pAExhaust <= pBExhaust) {
    if (page < pAExhaust) {
      return {
        aOffset: (page - 1) * defaultALimit,
        aLimit: defaultALimit,
        bOffset: (page - 1) * defaultBLimit,
        bLimit: defaultBLimit,
      };
    } else if (page === pAExhaust) {
      const aTake = pARem > 0 ? pARem : defaultALimit;
      const bTake = limit - aTake;
      return {
        aOffset: (page - 1) * defaultALimit,
        aLimit: aTake,
        bOffset: (page - 1) * defaultBLimit,
        bLimit: bTake,
      };
    } else {
      const bConsumedAtExhaust =
        pARem > 0
          ? (pAExhaust - 1) * defaultBLimit + (limit - pARem)
          : pAExhaust * defaultBLimit;
      const pagesAfterExhaust = page - pAExhaust - 1;
      const bOffset = bConsumedAtExhaust + pagesAfterExhaust * limit;
      return {
        aOffset: totalA,
        aLimit: 0,
        bOffset,
        bLimit: limit,
      };
    }
  }

  // Case 2: Source B runs out earlier than Source A (e.g. tv-shows)
  if (page < pBExhaust) {
    return {
      aOffset: (page - 1) * defaultALimit,
      aLimit: defaultALimit,
      bOffset: (page - 1) * defaultBLimit,
      bLimit: defaultBLimit,
    };
  } else if (page === pBExhaust) {
    const bTake = pBRem > 0 ? pBRem : defaultBLimit;
    const aTake = limit - bTake;
    return {
      aOffset: (page - 1) * defaultALimit,
      aLimit: aTake,
      bOffset: (page - 1) * defaultBLimit,
      bLimit: bTake,
    };
  } else {
    const aConsumedAtExhaust =
      pBRem > 0
        ? (pBExhaust - 1) * defaultALimit + (limit - pBRem)
        : pBExhaust * defaultALimit;
    const pagesAfterExhaust = page - pBExhaust - 1;
    const aOffset = aConsumedAtExhaust + pagesAfterExhaust * limit;
    return {
      aOffset,
      aLimit: limit,
      bOffset: totalB,
      bLimit: 0,
    };
  }
}

// In-flight deduplication để tránh gọi lặp cùng 1 trang NguonC
interface NguonCPageResponse {
  items?: Record<string, unknown>[];
  data?: { items?: Record<string, unknown>[] };
  paginate?: { total_items?: number; total_page?: number };
}

const inFlightNguonC = new Map<string, Promise<NguonCPageResponse | null>>();
const nguonCQueryMetaCache = new Map<string, { totalItems: number; totalPages: number; timestamp: number }>();

export function _clearNguonCMetaCacheForTesting() {
  nguonCQueryMetaCache.clear();
  inFlightNguonC.clear();
}

export function isMovieOfType(item: Record<string, unknown>, type: string): boolean {
  if (!type) return true;
  const rawType = String(item.type || "").toLowerCase().trim();
  const timeStr = String(item.time || "").toLowerCase();
  const epTotal = Number(item.episode_total || 0);
  const epCurrent = String(item.episode_current || "").toLowerCase();

  const catSlugs = Array.isArray(item.category)
    ? item.category.map((c: unknown) =>
      typeof c === "string"
        ? c.toLowerCase()
        : `${(c as { slug?: string })?.slug || ""} ${(c as { name?: string })?.name || ""}`.toLowerCase()
    )
    : [String(item.category || "").toLowerCase()];

  const isHoatHinh =
    rawType === "hoathinh" ||
    rawType === "hoat-hinh" ||
    rawType === "anime" ||
    catSlugs.some(
      (c) =>
        c.includes("hoat-hinh") ||
        c.includes("hoạt hình") ||
        c.includes("anime") ||
        c.includes("animation")
    );

  if (type === "hoat-hinh") {
    return isHoatHinh;
  }

  if (type === "phim-chieu-rap") {
    return (
      item.chieurap === true ||
      item.chieu_rap === true ||
      rawType === "chieurap" ||
      rawType === "phim-chieu-rap" ||
      catSlugs.some((c) => c.includes("chieu-rap") || c.includes("chiếu rạp"))
    );
  }

  if (type === "phim-bo") {
    if (isHoatHinh) return false;
    return (
      rawType === "series" ||
      rawType === "phim-bo" ||
      rawType === "tv" ||
      epTotal > 1 ||
      timeStr.includes("tập") ||
      timeStr.includes("phần") ||
      (epCurrent.length > 0 && !epCurrent.includes("full") && epCurrent !== "hd")
    );
  }

  if (type === "phim-le") {
    if (isHoatHinh) return false;
    return (
      rawType === "single" ||
      rawType === "phim-le" ||
      rawType === "movie" ||
      ((epTotal === 1 || epTotal === 0) &&
        (timeStr.includes("phút") || timeStr.includes("m") || (!timeStr.includes("tập") && !timeStr.includes("phần"))) &&
        (epCurrent.includes("full") || epCurrent === "hd" || !epCurrent || epCurrent === "1/1"))
    );
  }

  if (type === "tv-shows") {
    return (
      rawType === "tvshows" ||
      rawType === "tv-shows" ||
      catSlugs.some((c) => c.includes("tv-shows") || c.includes("shows") || c.includes("truyền hình"))
    );
  }

  return rawType.includes(type.toLowerCase());
}

export function isNguonCSupportedForParams(params: MovieFilterParams, isSearch: boolean): boolean {
  if (isSearch && params.keyword) return true;
  if (!isSearch && params.sort && params.sort !== "latest" && params.sort !== "time-desc") {
    return false;
  }
  if (params.type) {
    if (params.type === "phim-chieu-rap" || params.type === "phim-sap-chieu") {
      return false;
    }
  }
  return true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyMovieFilters(items: any[], params: MovieFilterParams): any[] {
  let filtered = items;

  if (params.type) {
    filtered = filtered.filter((item) => isMovieOfType(item, params.type!));
  }

  if (params.country) {
    const rawTarget = params.country.toLowerCase().trim();
    const canonicalTarget = getCanonicalCountrySlug(null, rawTarget);
    filtered = filtered.filter((item) => {
      if (!item.country || (Array.isArray(item.country) && item.country.length === 0)) {
        return false;
      }
      const ctryArray = Array.isArray(item.country)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? item.country.map((c: any) => {
          const cSlug = c.slug || "";
          const cName = c.name || "";
          const canonical = getCanonicalCountrySlug(cName, cSlug);
          return `${cSlug} ${cName} ${canonical}`.toLowerCase();
        })
        : [
          `${String(item.country || "")} ${getCanonicalCountrySlug(String(item.country || ""), null)}`.toLowerCase()
        ];
      return ctryArray.some((cStr: string) =>
        cStr.includes(rawTarget) || Boolean(canonicalTarget && cStr.includes(canonicalTarget))
      );
    });
  }

  if (params.category) {
    const rawTarget = params.category.toLowerCase().trim();
    const canonicalTarget = getCanonicalGenreSlug(null, rawTarget);

    filtered = filtered.filter((item) => {
      if (!item.category || (Array.isArray(item.category) && item.category.length === 0)) {
        return false;
      }
      const catArray = Array.isArray(item.category)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? item.category.map((c: any) => {
          const cSlug = c.slug || "";
          const cName = c.name || "";
          const canonical = getCanonicalGenreSlug(cName, cSlug);
          return `${cSlug} ${cName} ${canonical}`.toLowerCase();
        })
        : [
          `${String(item.category || "")} ${getCanonicalGenreSlug(String(item.category || ""), null)}`.toLowerCase()
        ];
      return catArray.some((cStr: string) =>
        cStr.includes(rawTarget) || Boolean(canonicalTarget && cStr.includes(canonicalTarget))
      );
    });
  }

  if (params.year) {
    filtered = filtered.filter((item) => {
      if (item.year === undefined || item.year === null || item.year === "") {
        return false;
      }
      return String(item.year || "").includes(String(params.year));
    });
  }

  return filtered;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapNguonCListItem(item: any, params: MovieFilterParams) {
  // Ưu tiên biến thể WebP siêu nhẹ (~23KB) thay vì PNG gốc chưa nén (~290KB)
  const nguoncBackdrop = item.poster_url_webp || item.poster_url;
  const nguoncPoster = item.thumb_url_webp || item.thumb_url;
  const cleanPoster = nguoncPoster || item.poster_url_webp || item.poster_url || "";
  const cleanThumb = nguoncBackdrop || item.thumb_url_webp || item.thumb_url || "";

  let itemType: string | undefined = undefined;
  let chieurap: boolean | undefined = undefined;

  if (params.type === "phim-chieu-rap") {
    chieurap = true;
    itemType = "phim-chieu-rap";
  } else if (params.type === "hoat-hinh") {
    itemType = "hoat-hinh";
  } else if (params.type === "phim-bo") {
    itemType = "series";
  } else if (params.type === "phim-le") {
    itemType = "single";
  } else if (params.type === "tv-shows") {
    itemType = "tv-shows";
  } else {
    // Tự động phân loại dựa trên metadata NguonC và TMDb
    if (
      item.tmdb?.type === "movie" ||
      Number(item.total_episodes) === 1 ||
      String(item.current_episode || "").trim().toUpperCase() === "FULL"
    ) {
      itemType = "single";
    } else if (item.tmdb?.type === "tv" || Number(item.total_episodes) > 1) {
      itemType = "series";
    }
  }

  const tmdbType = item.tmdb?.type || (itemType === "single" ? "movie" : "tv");
  const normalizedTmdb = item.tmdb ? { ...item.tmdb, type: tmdbType } : undefined;

  const normalizedDirectors = extractMovieDirectors(item);
  const normalizedActors = extractMovieActors(item);

  return {
    ...item,
    source: "nguonc",
    sources: ["nguonc"],
    name: item.name,
    slug: item.slug,
    origin_name: item.original_name || item.name,
    type: itemType || item.type || "single",
    itemType: itemType || "single",
    chieurap,
    tmdb: normalizedTmdb,
    tmdbId: normalizedTmdb?.id,
    poster_url: cleanPoster || cleanThumb,
    thumb_url: cleanThumb || cleanPoster,
    quality: item.quality || "HD",
    lang: item.language || "Vietsub",
    episode_current: item.current_episode || "",
    year: Number(item.year) || undefined,
    time: item.time || "",
    director: normalizedDirectors,
    actor: normalizedActors,
    modified:
      typeof item.modified === "string"
        ? { time: item.modified }
        : item.modified || (item.created ? { time: String(item.created) } : undefined),
    ...(Array.isArray(item.category) && item.category.length > 0
      ? { category: item.category }
      : params.category
        ? { category: [{ name: formatGenreName(params.category) || params.category, slug: params.category }] }
        : {}),
    ...(Array.isArray(item.country) && item.country.length > 0
      ? { country: item.country }
      : params.country
        ? { country: [{ name: formatCountryName(params.country) || params.country, slug: params.country }] }
        : {}),
    ...(itemType ? { type: itemType } : {}),
    ...(chieurap !== undefined ? { chieurap } : {}),
  };
}

export async function fetchSourceData(
  baseUrl: string,
  params: MovieFilterParams,
  isSearch: boolean,
  pageOverride?: number,
  limitOverride?: number,
  offsetOverride?: number
) {
  try {
    const page = pageOverride || params.page || 1;
    const effectivePageLimit = params.limit && params.limit > 0 ? params.limit : 24;
    const fetchLimit = limitOverride !== undefined ? limitOverride : effectivePageLimit;

    if (fetchLimit <= 0) {
      return {
        items: [],
        overflowItems: [],
        isPartial: false,
        totalPages: 1,
        totalItems: 0,
      };
    }

    const urlParams = new URLSearchParams();
    if (offsetOverride !== undefined && fetchLimit > 0) {
      const pPage = Math.floor(offsetOverride / fetchLimit) + 1;
      urlParams.set("page", String(pPage));
    } else {
      urlParams.set("page", String(page));
    }
    urlParams.set("limit", String(fetchLimit));

    if (params.category) urlParams.set("category", params.category);
    if (params.country) urlParams.set("country", params.country);
    if (params.year) urlParams.set("year", params.year);

    const parsedSort = parseSortMode(params.sort);
    if (baseUrl === API_PHIMAPI) {
      if (parsedSort.field === "rating") {
        urlParams.set("sort_field", "modified.time");
        urlParams.set("sort_type", parsedSort.direction);
      } else {
        urlParams.set("sort_field", parsedSort.field);
        urlParams.set("sort_type", parsedSort.direction);
      }
    }

    let fullUrl = "";

    if (baseUrl === API_PHIMAPI) {
      if (isSearch && params.keyword) {
        urlParams.set("keyword", params.keyword.trim());
        fullUrl = `${baseUrl}/v1/api/tim-kiem?${urlParams.toString()}`;
      } else if (params.type) {
        fullUrl = `${baseUrl}/v1/api/danh-sach/${params.type}?${urlParams.toString()}`;
      } else if (params.category) {
        fullUrl = `${baseUrl}/v1/api/the-loai/${params.category}?${urlParams.toString()}`;
      } else if (params.country) {
        fullUrl = `${baseUrl}/v1/api/quoc-gia/${params.country}?${urlParams.toString()}`;
      } else {
        fullUrl = `${baseUrl}/v1/api/danh-sach/phim-moi-cap-nhat?${urlParams.toString()}`;
      }
    } else {
      if (!isSearch && params.sort && params.sort !== "latest" && params.sort !== "time-desc") {
        return null;
      }

      if (isSearch && params.keyword) {
        fullUrl = `${baseUrl}/films/search?keyword=${encodeURIComponent(params.keyword.trim())}&page=${page}`;
      } else if (params.country) {
        fullUrl = `${baseUrl}/films/quoc-gia/${getNguonCCountrySlug(params.country)}?page=${page}`;
      } else if (params.category) {
        fullUrl = `${baseUrl}/films/the-loai/${getNguonCGenreSlug(params.category)}?page=${page}`;
      } else if (params.year) {
        fullUrl = `${baseUrl}/films/nam-phat-hanh/${params.year}?page=${page}`;
      } else if (params.type) {
        if (params.type === "hoat-hinh") {
          fullUrl = `${baseUrl}/films/the-loai/hoat-hinh?page=${page}`;
        } else if (params.type === "phim-bo") {
          fullUrl = `${baseUrl}/films/danh-sach/phim-bo?page=${page}`;
        } else if (params.type === "phim-le") {
          fullUrl = `${baseUrl}/films/danh-sach/phim-le?page=${page}`;
        } else if (params.type === "tv-shows") {
          fullUrl = `${baseUrl}/films/danh-sach/tv-shows?page=${page}`;
        } else {
          return null;
        }
      } else {
        fullUrl = `${baseUrl}/films/phim-moi-cap-nhat?page=${page}`;
      }
    }

    if (baseUrl === API_PHIMAPI) {
      const isSearchPhimApi = isSearch && params.keyword;
      const timeoutMs = isSearchPhimApi ? PHIMAPI_SEARCH_TIMEOUT_MS : PHIMAPI_TIMEOUT_MS;
      const t0 = performance.now();

      try {
        const res = await fetch(fullUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            Accept: "application/json, text/plain, */*",
            "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
          },
          next: { revalidate: 300 },
          signal: AbortSignal.timeout(timeoutMs),
        });
        const elapsed = Math.round(performance.now() - t0);

        if (!res.ok) {
          console.info(`[PhimAPI] status=${res.status} elapsed=${elapsed}ms url=${fullUrl}`);
          return null;
        }
        const json = await res.json();

        const imageDomain =
          json.data?.APP_DOMAIN_CDN_IMAGE ||
          json.data?.APP_DOMAIN_FRONTEND ||
          "https://phimimg.com/";
        const items = json.data?.items || json.items || [];

        let mappedItems = items.map(
          (item: {
            thumb_url?: string;
            poster_url?: string;
            slug?: string;
            [key: string]: unknown;
          }) => {
            const rawThumb =
              typeof item.thumb_url === "string" &&
                item.thumb_url.trim() &&
                item.thumb_url !== "null" &&
                item.thumb_url !== "undefined"
                ? item.thumb_url.trim()
                : "";
            const rawPoster =
              typeof item.poster_url === "string" &&
                item.poster_url.trim() &&
                item.poster_url !== "null" &&
                item.poster_url !== "undefined"
                ? item.poster_url.trim()
                : "";

            const cdnClean = imageDomain.replace(/\/+$/, "");

            const formatImg = (path: string) => {
              if (!path) return "";
              if (path.startsWith("http://") || path.startsWith("https://")) return path;
              if (cdnClean) {
                return `${cdnClean}/${path.replace(/^\/+/, "")}`;
              }
              return path;
            };

            const formattedThumb = formatImg(rawThumb);
            const formattedPoster = formatImg(rawPoster);

            return {
              ...item,
              source: "phimapi",
              sources: ["phimapi"],
              thumb_url: formattedThumb || formattedPoster,
              poster_url: formattedPoster || formattedThumb,
            };
          },
        );

        if (offsetOverride !== undefined && fetchLimit > 0) {
          const pPage = Math.floor(offsetOverride / fetchLimit) + 1;
          const chunkStartOffset = (pPage - 1) * fetchLimit;
          const rawSliceStart = Math.max(0, offsetOverride - chunkStartOffset);
          mappedItems = mappedItems.slice(rawSliceStart, rawSliceStart + fetchLimit);
        }

        const totalItems =
          json.data?.params?.pagination?.totalItems ||
          json.pagination?.totalItems ||
          mappedItems.length ||
          0;

        const totalPages = Math.max(1, Math.ceil(totalItems / effectivePageLimit));

        console.info(`[PhimAPI] status=200 elapsed=${elapsed}ms items=${mappedItems.length} total=${totalItems}`);

        return {
          items: mappedItems,
          totalPages,
          totalItems,
        };
      } catch (err) {
        const elapsed = Math.round(performance.now() - t0);
        const errType = err instanceof Error && err.name === "AbortError" ? "timeout" : "network_error";
        console.info(`[PhimAPI] error=${errType} elapsed=${elapsed}ms`);
        return null;
      }
    }

    // NguonC Offset-Aligned Fetching
    const offsetStart = offsetOverride !== undefined ? Math.max(0, offsetOverride) : (page - 1) * fetchLimit;
    const offsetEnd = offsetStart + fetchLimit;
    const startNguonCPage = Math.floor(offsetStart / 10) + 1;
    const endNguonCPage = Math.ceil(offsetEnd / 10);

    const buildNguonCUrl = (p: number) => {
      if (isSearch && params.keyword) {
        return `${baseUrl}/films/search?keyword=${encodeURIComponent(params.keyword.trim())}&page=${p}`;
      } else if (params.country) {
        return `${baseUrl}/films/quoc-gia/${getNguonCCountrySlug(params.country)}?page=${p}`;
      } else if (params.category) {
        return `${baseUrl}/films/the-loai/${getNguonCGenreSlug(params.category)}?page=${p}`;
      } else if (params.year) {
        return `${baseUrl}/films/nam-phat-hanh/${params.year}?page=${p}`;
      } else if (params.type) {
        if (params.type === "hoat-hinh") {
          return `${baseUrl}/films/the-loai/hoat-hinh?page=${p}`;
        } else if (params.type === "phim-bo") {
          return `${baseUrl}/films/danh-sach/phim-bo?page=${p}`;
        } else if (params.type === "phim-le") {
          return `${baseUrl}/films/danh-sach/phim-le?page=${p}`;
        } else if (params.type === "tv-shows") {
          return `${baseUrl}/films/danh-sach/tv-shows?page=${p}`;
        }
        return null;
      }
      return `${baseUrl}/films/phim-moi-cap-nhat?page=${p}`;
    };

    if (buildNguonCUrl(1) === null) {
      return null;
    }

    const nguonCMetaKey = getNguonCQueryMetaKey(params, isSearch);
    const cachedNguonCMeta = nguonCQueryMetaCache.get(nguonCMetaKey);
    const now = Date.now();
    const isMetaFresh = Boolean(cachedNguonCMeta && (now - cachedNguonCMeta.timestamp < 300000));

    if (isMetaFresh && cachedNguonCMeta && cachedNguonCMeta.totalPages > 0 && startNguonCPage > cachedNguonCMeta.totalPages) {
      return {
        items: [],
        totalPages: Math.ceil(cachedNguonCMeta.totalItems / effectivePageLimit) || 1,
        totalItems: cachedNguonCMeta.totalItems,
      };
    }

    const effectiveEndNguonCPage = (isMetaFresh && cachedNguonCMeta && cachedNguonCMeta.totalPages > 0)
      ? Math.min(endNguonCPage, cachedNguonCMeta.totalPages)
      : endNguonCPage;

    const pagesToFetch: number[] = [];
    for (let p = startNguonCPage; p <= effectiveEndNguonCPage; p++) {
      pagesToFetch.push(p);
    }

    if (pagesToFetch.length === 0) {
      return {
        items: [],
        totalPages: 1,
        totalItems: cachedNguonCMeta?.totalItems || 0,
      };
    }

    async function fetchSingleNguonCPage(
      p: number,
      u: string,
      nguonCMetaKey: string,
    ): Promise<NguonCPageResponse | null> {
      const existing = inFlightNguonC.get(u);
      if (existing) return existing;

      const requestOnce = async (isRetry: boolean) => {
        const t0 = performance.now();
        try {
          const res = await fetch(u, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
              Accept: "application/json, text/plain, */*",
              "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
            },
            ...(isRetry ? { cache: "no-store" as const } : { next: { revalidate: 300 } }),
            signal: AbortSignal.timeout(NGUONC_TIMEOUT_MS),
          });
          const elapsed = Math.round(performance.now() - t0);
          if (!res.ok) {
            console.info(`[NguonC] page=${p} status=${res.status} elapsed=${elapsed}ms retry=${isRetry}`);
            return { ok: false, retryable: res.status === 429 || res.status >= 500, json: null };
          }
          const json = await res.json();
          const itmCount = json?.items?.length || 0;
          const tot = json?.paginate?.total_items || itmCount;
          const totalPage = json?.paginate?.total_page || (tot ? Math.ceil(tot / 10) : 0);
          console.info(`[NguonC] page=${p} status=200 elapsed=${elapsed}ms items=${itmCount} total=${tot}`);

          if (totalPage > 0 || tot > 0) {
            const current = nguonCQueryMetaCache.get(nguonCMetaKey);
            nguonCQueryMetaCache.set(nguonCMetaKey, {
              totalItems: Math.max(tot, current?.totalItems || 0),
              totalPages: Math.max(totalPage, current?.totalPages || 0),
              timestamp: Date.now(),
            });
          }
          return { ok: true, retryable: false, json };
        } catch (err) {
          const elapsed = Math.round(performance.now() - t0);
          const errType = err instanceof Error && err.name === "AbortError" ? "timeout" : "network_error";
          console.info(`[NguonC] page=${p} error=${errType} elapsed=${elapsed}ms retry=${isRetry}`);
          return { ok: false, retryable: true, json: null };
        }
      };

      const promise = (async () => {
        try {
          const first = await requestOnce(false);
          if (first.ok || !first.retryable) {
            return first.json;
          }
          const backoffMs = 200 + Math.floor(Math.random() * 180);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          const second = await requestOnce(true);
          return second.json;
        } finally {
          inFlightNguonC.delete(u);
        }
      })();

      inFlightNguonC.set(u, promise);
      return promise;
    }

    const nguonCSettled = await Promise.allSettled(
      pagesToFetch.map((p) => {
        const u = buildNguonCUrl(p);
        if (!u) return Promise.resolve(null);
        return fetchSingleNguonCPage(p, u, nguonCMetaKey);
      })
    );

    const nguonCResults = nguonCSettled.map((s) => (s.status === "fulfilled" ? s.value : null));

    let nguonCTotalItems = cachedNguonCMeta?.totalItems || 0;
    let nguonCTotalPages = cachedNguonCMeta?.totalPages || 0;
    let successfulPagesCount = 0;
    let failedPagesCount = 0;
    const firstSlotSucceeded = Boolean(nguonCResults[0]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawCandidateStream: any[] = [];
    const seenRawSlugs = new Set<string>();

    const appendSlotItems = (r: { items?: unknown[]; data?: { items?: unknown[] }; paginate?: { total_items?: number; total_page?: number } } | null) => {
      if (!r) return;
      const itms = r.items || r.data?.items || [];
      if (r.paginate?.total_items) {
        nguonCTotalItems = Math.max(nguonCTotalItems, r.paginate.total_items);
      }
      if (r.paginate?.total_page) {
        nguonCTotalPages = Math.max(nguonCTotalPages, r.paginate.total_page);
      }
      for (const itm of itms) {
        rawCandidateStream.push(itm);
      }
    };

    for (let idx = 0; idx < nguonCResults.length; idx++) {
      const r = nguonCResults[idx];
      if (r) {
        successfulPagesCount++;
        appendSlotItems(r);
      } else {
        failedPagesCount++;
      }
    }

    if (successfulPagesCount === 0) {
      return null;
    }

    const chunkStartOffset = (startNguonCPage - 1) * 10;
    const rawSliceStart = firstSlotSucceeded ? Math.max(0, offsetStart - chunkStartOffset) : 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uniquePostOffset: any[] = [];
    for (let i = rawSliceStart; i < rawCandidateStream.length; i++) {
      const item = rawCandidateStream[i];
      const slugKey = item?.slug ? String(item.slug) : "";
      if (slugKey) {
        if (seenRawSlugs.has(slugKey)) continue;
        seenRawSlugs.add(slugKey);
      }
      uniquePostOffset.push(item);
    }

    const maxAllowedNguonCPage = nguonCTotalPages > 0 ? nguonCTotalPages : effectiveEndNguonCPage + 2;
    let nextExtraPage = effectiveEndNguonCPage + 1;
    let extraAttempts = 0;
    while (uniquePostOffset.length < fetchLimit && nextExtraPage <= maxAllowedNguonCPage && extraAttempts < 2) {
      const extraUrl = buildNguonCUrl(nextExtraPage);
      if (!extraUrl) break;
      const extraRes = await fetchSingleNguonCPage(nextExtraPage, extraUrl, nguonCMetaKey);
      extraAttempts++;
      nextExtraPage++;
      if (!extraRes) continue;
      const extraItems = extraRes.items || extraRes.data?.items || [];
      if (extraRes.paginate?.total_items) {
        nguonCTotalItems = Math.max(nguonCTotalItems, extraRes.paginate.total_items);
      }
      if (extraRes.paginate?.total_page) {
        nguonCTotalPages = Math.max(nguonCTotalPages, extraRes.paginate.total_page);
      }
      for (const item of extraItems) {
        const slugKey = item?.slug ? String(item.slug) : "";
        if (slugKey) {
          if (seenRawSlugs.has(slugKey)) continue;
          seenRawSlugs.add(slugKey);
        }
        uniquePostOffset.push(item);
      }
    }

    if (uniquePostOffset.length === 0) {
      return {
        items: [],
        overflowItems: [],
        isPartial: failedPagesCount > 0,
        totalPages: Math.ceil(nguonCTotalItems / effectivePageLimit) || 1,
        totalItems: nguonCTotalItems,
      };
    }

    const mappedAll = uniquePostOffset.map((item) => mapNguonCListItem(item, params));
    const primaryItems = mappedAll.slice(0, fetchLimit);
    const overflowItems = mappedAll.slice(fetchLimit);

    const totalPages = Math.ceil(nguonCTotalItems / effectivePageLimit) || 1;
    const isPartial = failedPagesCount > 0 || (page < totalPages && primaryItems.length < fetchLimit);

    return {
      items: primaryItems,
      overflowItems,
      isPartial,
      totalPages,
      totalItems: nguonCTotalItems,
    };
  } catch {
    return null;
  }
}
