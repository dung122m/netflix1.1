import { cache } from "react";
import { cleanHtmlText } from "@/lib/cleanHtml";
import { cacheService } from "@/lib/cache";
import { findEpisodeMatch } from "@/lib/formatEpisode";
import {
  deduplicateMovieItems,
  extractMovieIdentityKeys,
  isMovieInSeenSet,
  extractMovieRatingScore,
  extractMovieModifiedTime,
  evaluateSearchRelevance,
  isSlowProviderSourceUrl,
} from "@/lib/movieMedia";
import { enrichMovieListPosters } from "@/services/movies/posterEnrichment";
import { DEFAULT_GENRES, DEFAULT_COUNTRIES } from "@/data/movies/taxonomy";

// 1. Types and query parsing
import {
  MovieFilterParams,
  ParsedSortMode,
  NormalizedSortField,
  NormalizedSortDirection,
  parseSortMode,
  AiCandidateOptions,
} from "./filterTypes";

// 2. Episode deduplication, stream decryption, and source merging
import {
  API_NGUONC,
  API_PHIMAPI,
  CompactEpisodeItem,
  CompactServerItem,
  MovieDetailV3Payload,
  EpisodeStreamResult,
  RawEpisodeItem,
  RawServerItem,
  MovieDetailCachePayload,
  extractEpisodeOrder,
  deduplicateServerEpisodes,
  normalizeEpisodeSlug,
  serverHasM3u8,
  filterDualServers,
  normalizeNguonCMovieDetail,
  sanitizeMovieDetailEpisodes,
  toCompactDetailPayload,
  unpackDetailPayload,
  discoverAndMergeMissingSources,
  getEpisodeStream as baseGetEpisodeStream,
} from "./episodeProcessing";

// 3. Multi-source pagination and filter execution
import {
  isNguonCSupportedForParams,
  applyMovieFilters,
  fetchSourceData,
  sortMovieCandidates,
} from "./catalogFederation";

// Public re-exports for complete backward compatibility across all modules and tests
export { DEFAULT_GENRES, DEFAULT_COUNTRIES };
export type {
  MovieFilterParams,
  ParsedSortMode,
  NormalizedSortField,
  NormalizedSortDirection,
  AiCandidateOptions,
  CompactEpisodeItem,
  CompactServerItem,
  MovieDetailV3Payload,
  EpisodeStreamResult,
};
export {
  parseSortMode,
  extractEpisodeOrder,
  deduplicateServerEpisodes,
  normalizeEpisodeSlug,
  serverHasM3u8,
  filterDualServers,
  sanitizeMovieDetailEpisodes,
  toCompactDetailPayload,
  unpackDetailPayload,
  isNguonCSupportedForParams,
  applyMovieFilters,
  deduplicateMovieItems,
  extractMovieIdentityKeys,
  isMovieInSeenSet,
  extractMovieRatingScore,
  extractMovieModifiedTime,
  evaluateSearchRelevance,
};

// =========================================================
// BỘ NHỚ ĐỆM SERVER (IN-MEMORY CACHE SWR - 0MS RESPONSE)
// =========================================================
interface CacheEntry<T> {
  data: T;
  expireAt: number;     // Hết hạn tươi (Fresh TTL)
  staleUntil: number;   // Vẫn dùng được tạm thời khi revalidate ngầm (Stale TTL)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const moviesMemoryCache = new Map<string, CacheEntry<any>>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const movieDetailMemoryCache = new Map<string, CacheEntry<any>>();
// Track degraded responses internally so Redis KV never persists partial upstream outages
const degradedMoviePayloads = new WeakSet<object>();

let cachedFilters: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  genres: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  countries: any[];
  years: string[];
} | null = null;

// Mutex maps ngăn ngừa fetch trùng lặp đồng thời
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const inFlightDetailBase = new Map<string, Promise<any>>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const inFlightDetailFetches = new Map<string, Promise<any>>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const inFlightGetMovies = new Map<string, Promise<any>>();

export async function getEpisodeStream(
  slug: string,
  episodeSlug: string,
  serverName?: string,
  source?: "nguonc" | "ophim"
): Promise<EpisodeStreamResult[]> {
  return baseGetEpisodeStream(slug, episodeSlug, serverName, source, fetchAndCacheMovieDetail);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function attachRequestedEpisodeStreams(data: any, requestedEpSlug?: string): Promise<any> {
  if (!data || !requestedEpSlug || (!data.episodes && !data.movie?.episodes)) return data;
  const episodes: RawServerItem[] = data.episodes || data.movie?.episodes || [];
  if (!data.episodes && episodes.length > 0) {
    data.episodes = episodes;
  }
  const movieSlug = data.movie?.slug;
  if (!movieSlug) return data;

  const tasks: Promise<void>[] = [];
  for (const srv of episodes) {
    const list: RawEpisodeItem[] = srv.server_data || [];
    const target = list.find((e: RawEpisodeItem) => e.slug === requestedEpSlug || e.name === requestedEpSlug)
      || findEpisodeMatch(list, requestedEpSlug);
    if (!target) continue;
    if (target.link_m3u8) continue;

    const localKey = `${movieSlug}_any`;
    const mem = movieDetailMemoryCache.get(localKey);
    let foundInMem = false;
    if (mem?.data?.episodes) {
      for (const memSrv of mem.data.episodes) {
        if (memSrv.server_name === srv.server_name || (!memSrv.server_name && !srv.server_name)) {
          const memMatch = (memSrv.server_data || []).find((e: RawEpisodeItem) => e.slug === target?.slug || e.name === target?.name)
            || findEpisodeMatch(memSrv.server_data || [], requestedEpSlug);
          if (memMatch && memMatch.link_m3u8) {
            target.link_embed = memMatch.link_embed || target.link_embed;
            target.link_m3u8 = memMatch.link_m3u8;
            foundInMem = true;
            break;
          }
        }
      }
    }

    if (!foundInMem) {
      tasks.push(
        (async () => {
          try {
            const streams = await getEpisodeStream(movieSlug, requestedEpSlug, srv.server_name);
            if (Array.isArray(streams) && streams.length > 0) {
              const match = streams.find(s => s.server_name === srv.server_name) || streams[0];
              if (match) {
                target.link_embed = match.link_embed || target.link_embed;
                target.link_m3u8 = match.link_m3u8 || target.link_m3u8;
                if (mem?.data?.episodes) {
                  for (const memSrv of mem.data.episodes) {
                    if (memSrv.server_name === srv.server_name || (!memSrv.server_name && !srv.server_name)) {
                      const m = (memSrv.server_data || []).find((e: RawEpisodeItem) => e.slug === target?.slug || e.name === target?.name);
                      if (m) {
                        m.link_embed = target.link_embed;
                        m.link_m3u8 = target.link_m3u8;
                      }
                    }
                  }
                }
              }
            }
          } catch { }
        })()
      );
    }
  }

  if (tasks.length > 0) {
    await Promise.allSettled(tasks);
  }

  return data;
}

async function revalidateMovieDetail(slug: string, source?: "nguonc" | "ophim", cacheKey?: string) {
  try {
    await fetchAndCacheMovieDetail(slug, source, cacheKey || `${slug}_${source || "any"}`);
  } catch { }
}

async function fetchAndCacheMovieDetail(slug: string, source?: "nguonc" | "ophim", cacheKey?: string) {
  const key = cacheKey || `${slug}_${source || "any"}`;
  const existing = inFlightDetailFetches.get(key);
  if (existing) return existing;

  const promise = (async () => {
    const now = Date.now();

    try {
      let result = undefined;

      if (source === "nguonc") {
        const res = await fetch(`${API_NGUONC}/film/${slug}`, {
          next: { revalidate: 600 },
          signal: AbortSignal.timeout(4500),
        });
        if (res.ok) {
          const json = await res.json();
          result = normalizeNguonCMovieDetail(json);
        }
      } else if (source === "ophim") {
        const res = await fetch(`${API_PHIMAPI}/phim/${slug}`, {
          next: { revalidate: 600 },
          signal: AbortSignal.timeout(4500),
        });
        if (res.ok) result = await res.json();
      } else {
        // Fetch đồng thời cả 2 nguồn PhimAPI và NguonC
        const results = await Promise.allSettled([
          fetch(`${API_PHIMAPI}/phim/${slug}`, {
            next: { revalidate: 600 },
            signal: AbortSignal.timeout(10000),
          }).then(async (res) => {
            if (!res.ok) throw new Error("PhimAPI not ok");
            return res.json();
          }),

          fetch(`${API_NGUONC}/film/${slug}`, {
            next: { revalidate: 600 },
            signal: AbortSignal.timeout(10000),
          }).then(async (res) => {
            if (!res.ok) throw new Error("NguonC not ok");
            const json = await res.json();
            return normalizeNguonCMovieDetail(json);
          }),
        ]);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const validCandidates: any[] = [];
        for (const r of results) {
          if (r.status === "fulfilled" && r.value?.movie) {
            validCandidates.push(r.value);
          }
        }

        if (validCandidates.length === 1) {
          result = validCandidates[0];
        } else if (validCandidates.length > 1) {
          // Ưu tiên PhimAPI (hỗ trợ m3u8 direct streaming) làm nguồn chính nếu có đủ tập
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const getEpMax = (data: any) => {
            if (!data?.episodes || !Array.isArray(data.episodes)) return 0;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return data.episodes.reduce((max: number, s: any) => Math.max(max, s?.server_data?.length || 0), 0);
          };

          const resPhimApi = validCandidates.find((c) => c.movie?._id && !String(c.movie._id).includes("-"));
          const resNguonC = validCandidates.find((c) => c !== resPhimApi) || validCandidates[1];

          const primary = resPhimApi && getEpMax(resPhimApi) > 0 ? resPhimApi : validCandidates[0];
          const secondary = primary === resPhimApi ? resNguonC : resPhimApi;

          // Bổ sung và lọc tối đa đúng 2 server: Lồng Tiếng và Thuyết Minh
          const secondaryEpContainer = secondary?.episodes || secondary?.movie?.episodes;
          const primaryEpisodes = primary.episodes || primary.movie?.episodes || [];
          const combined = Array.isArray(secondaryEpContainer) && secondaryEpContainer.length > 0
            ? [...primaryEpisodes, ...secondaryEpContainer]
            : primaryEpisodes;

          const dual = filterDualServers(combined);
          primary.episodes = dual;
          if (primary.movie) {
            primary.movie.episodes = dual;
          }

          // Bổ sung đầy đủ metadata từ secondary nếu primary bị thiếu (actor, director, category, country, alt names,...)
          if (secondary?.movie && primary?.movie) {
            const pm = primary.movie;
            const sm = secondary.movie;
            if ((!pm.actor || (Array.isArray(pm.actor) && pm.actor.length === 0)) && sm.actor) pm.actor = sm.actor;
            if ((!pm.casts || (Array.isArray(pm.casts) && pm.casts.length === 0)) && sm.casts) pm.casts = sm.casts;
            if ((!pm.director || (Array.isArray(pm.director) && pm.director.length === 0)) && sm.director) pm.director = sm.director;
            if ((!pm.category || (Array.isArray(pm.category) && pm.category.length === 0)) && sm.category && (!Array.isArray(sm.category) || sm.category.length > 0)) pm.category = sm.category;
            if ((!pm.country || (Array.isArray(pm.country) && pm.country.length === 0)) && sm.country && (!Array.isArray(sm.country) || sm.country.length > 0)) pm.country = sm.country;
            if ((!pm.alternative_names || (Array.isArray(pm.alternative_names) && pm.alternative_names.length === 0)) && sm.alternative_names) pm.alternative_names = sm.alternative_names;
            if (!pm.tmdb && sm.tmdb) pm.tmdb = sm.tmdb;
            if (!pm.imdb && sm.imdb) pm.imdb = sm.imdb;
            if (!pm.modified && sm.modified) pm.modified = sm.modified;
            if (!pm.created && sm.created) pm.created = sm.created;
            if (!pm.trailer_url && sm.trailer_url) pm.trailer_url = sm.trailer_url;
            if ((!pm.content || !pm.description) && (sm.content || sm.description)) {
              if (!pm.content) pm.content = sm.content || sm.description;
              if (!pm.description) pm.description = sm.description || sm.content;
            }
          }

          result = primary;
        }
      }

      if (result && !source) {
        const currentServers = result.episodes || result.movie?.episodes || [];
        const hasDualServers = currentServers.length >= 2;
        if (!hasDualServers) {
          await discoverAndMergeMissingSources(result, slug);
        }
      }

      if (result) {
        // Đảm bảo kết quả luôn tuân thủ tối đa 2 server
        const dual = filterDualServers(result.episodes || result.movie?.episodes || []);
        result.episodes = dual;
        if (result.movie) {
          result.movie.episodes = dual;
        }
      }

      if (result) {
        // Khử trùng lặp các tập phim trong từng server của kết quả (Chống lỗi duplicate key từ upstream API)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const episodeContainers = [result.episodes, result.movie?.episodes].filter(Boolean) as any[][];
        for (const container of episodeContainers) {
          if (Array.isArray(container)) {
            for (const srv of container) {
              if (srv && Array.isArray(srv.server_data)) {
                srv.server_data = deduplicateServerEpisodes(srv.server_data);
              }
            }
          }
        }

        if (result.movie) {
          if (result.movie.content) {
            result.movie.content = cleanHtmlText(result.movie.content);
          }
          if (result.movie.description) {
            result.movie.description = cleanHtmlText(result.movie.description);
          }
        }
        // Cache tươi 10 phút, cho phép dùng lại stale tới 60 phút
        movieDetailMemoryCache.set(key, {
          data: result,
          expireAt: now + 600 * 1000,
          staleUntil: now + 3600 * 1000,
        });
        return result;
      }

      // ============================================================
      // NEGATIVE CACHE (1800s / 30m TTL):
      // Khi slug không tìm thấy trên cả 2 nguồn (PhimAPI, NguonC)
      // -> Lưu negative cache 30 phút để chống lãng phí quét upstream và Redis liên tục
      // ============================================================
      movieDetailMemoryCache.set(key, {
        data: null,
        expireAt: now + 1800 * 1000,
        staleUntil: now + 1800 * 1000,
      });
      const kvKey = `movie:detail:v6:${slug}:${source || "any"}`;
      cacheService.set(kvKey, { _isNegative: true }, 1800).catch(() => { });

      return undefined;
    } catch {
      // Negative cache an toàn khi có lỗi
      movieDetailMemoryCache.set(key, {
        data: null,
        expireAt: now + 1800 * 1000,
        staleUntil: now + 1800 * 1000,
      });
      return undefined;
    }
  })();

  inFlightDetailFetches.set(key, promise);
  try {
    return await promise;
  } finally {
    inFlightDetailFetches.delete(key);
  }
}

const fetchMovieDetailBase = async (
  slug: string,
  source?: "nguonc" | "ophim",
  requestedEpisode?: string,
) => {
  const localKey = `${slug}_${source || "any"}`;
  const now = Date.now();

  if (movieDetailMemoryCache.has(localKey)) {
    const entry = movieDetailMemoryCache.get(localKey)!;
    if (entry.expireAt > now) {
      return entry.data;
    }
    // Trả về dữ liệu đệm ngay lập tức nếu chưa quá hạn stale (0ms)
    if (entry.staleUntil > now) {
      revalidateMovieDetail(slug, source, localKey).catch(() => { });
      return entry.data;
    }
  }

  const existing = inFlightDetailBase.get(localKey);
  if (existing) return existing;

  const promise = (async () => {
    // 1. Đọc từ Redis v6 Compact Metadata (~2KB)
    const kvKeyV3 = `movie:detail:v6:${slug}:${source || "any"}`;

    let data: MovieDetailCachePayload | null = null;
    const rawData = await cacheService.get<MovieDetailCachePayload>(kvKeyV3);
    if (rawData) {
      data = unpackDetailPayload(rawData);
      // Nạp ngay vào L1 RAM cache khi trúng Redis để các request tiếp theo lấy trong 0ms với 0 lệnh Redis
      if (data?.movie) {
        movieDetailMemoryCache.set(localKey, {
          data,
          expireAt: now + 600 * 1000,
          staleUntil: now + 3600 * 1000,
        });

        // Nếu bản ghi cũ trong Redis (chưa có _v từ compact pipeline mới) hoàn toàn không có stream .m3u8 nào (chỉ có embed iframe bên ngoài),
        // hủy bỏ dữ liệu cũ để fetch nguồn trực tiếp từ upstream có direct m3u8.
        // Đối với bản ghi đã có version (_v >= 3), giữ nguyên cache để tránh lặp fetch vô tận cho phim chỉ có embed/cinema trailer.
        const isAlreadyVersioned = Boolean(rawData && typeof rawData === "object" && "_v" in rawData);
        const hasDirectM3u8 = Array.isArray(data.episodes) && data.episodes.some(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (s: any) => Array.isArray(s.server_data) && s.server_data.some((e: any) => e.link_m3u8 && String(e.link_m3u8).includes(".m3u8"))
        );
        if (!hasDirectM3u8 && !isAlreadyVersioned) {
          data = null;
        }
      }
    }

    if (!data) {
      data = await fetchAndCacheMovieDetail(slug, source, localKey);
      if (data && !(typeof data === "object" && "_isNegative" in data)) {
        const ttl = Boolean((data as MovieDetailCachePayload)?._isFallback) ? 180 : 7 * 24 * 60 * 60;
        const compact = toCompactDetailPayload(data, requestedEpisode);
        await cacheService.set(kvKeyV3, compact, ttl);
      }
    }

    if (!data || (typeof data === "object" && "_isNegative" in data)) {
      return null;
    }
    return data;
  })();

  inFlightDetailBase.set(localKey, promise);
  try {
    return await promise;
  } finally {
    inFlightDetailBase.delete(localKey);
  }
};

// Sử dụng React cache để khử trùng lặp Base Movie Detail giữa generateMetadata và Page Component
// Chuẩn hóa tham số (slug, source || "any") để cả 2 hàm luôn chia sẻ ĐÚNG 1 lượt đọc duy nhất trong 1 request SSR!
const cachedFetchMovieDetailBase = cache(
  async (slug: string, source: "nguonc" | "ophim" | "any" = "any") => {
    const realSource = source === "any" ? undefined : source;
    return await fetchMovieDetailBase(slug, realSource);
  }
);

// ============================================================
// AI CANDIDATE SOURCING (FEDERATED 2 SOURCES IN PARALLEL)
// ============================================================
async function executeGetAiCandidates(params: MovieFilterParams, _options?: AiCandidateOptions) {
  const isSearch = Boolean(params.keyword?.trim());
  const limit = params.limit || 24;
  const isNguonCAvailable = isNguonCSupportedForParams(params, isSearch);
  const targetPhimApiLimit = isNguonCAvailable ? Math.max(1, Math.round((limit * 2) / 3)) : limit;
  const targetNguonCLimit = isNguonCAvailable ? Math.max(0, limit - targetPhimApiLimit) : 0;

  // Song song 2 nguồn chính chất lượng cao (PhimAPI + NguonC)
  const [resPhimApi, resNguonC] = await Promise.all([
    fetchSourceData(API_PHIMAPI, params, isSearch, undefined, targetPhimApiLimit),
    isNguonCAvailable
      ? fetchSourceData(API_NGUONC, params, isSearch, undefined, targetNguonCLimit)
      : Promise.resolve(null),
  ]);

  const pItems = resPhimApi?.items || [];
  const nItems = resNguonC?.items || [];

  // Interleave 2:1 (PhimAPI : NguonC)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const primaryItems: any[] = [];
  let pi = 0;
  let ni = 0;
  while (pi < pItems.length || ni < nItems.length) {
    for (let k = 0; k < 2 && pi < pItems.length; k++) {
      primaryItems.push(pItems[pi++]);
    }
    if (ni < nItems.length) {
      primaryItems.push(nItems[ni++]);
    }
  }

  let candidates = deduplicateMovieItems(primaryItems);
  candidates = applyMovieFilters(candidates, params);

  if (isSearch && params.keyword && !_options?.skipRelevanceScoring) {
    const kw = params.keyword.trim();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scored = candidates.map((m: any) => ({
      ...m,
      relevanceScore: evaluateSearchRelevance(m, kw).score,
    }));
    const hasStrong = scored.some((m) => m.relevanceScore >= 40);
    candidates = scored.filter((m) => (hasStrong ? m.relevanceScore >= 40 : m.relevanceScore > 0));
  }

  return {
    status: true,
    items: candidates.slice(0, limit),
    pagination: {
      currentPage: params.page || 1,
      totalPages: Math.max(1, Math.ceil(candidates.length / limit)),
      totalItems: candidates.length,
    },
  };
}

async function executeGetMovies(params: MovieFilterParams, cacheKey: string) {
  const isSearch = Boolean(params.keyword?.trim());
  const limit = params.limit && params.limit > 0 ? params.limit : 24;
  const parsedSort = parseSortMode(params.sort);
  const requestedPage = params.page && params.page >= 1 ? Math.floor(params.page) : 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let finalItems: any[] = [];
  let totalItemsCount = 0;
  let maxTotalPages = 1;
  let isDegraded = false;

  if (isSearch) {
    // ============================================================
    // 1. TÌM KIẾM THEO TỪ KHÓA (SEARCH FEDERATION):
    // Song song 2 nguồn để tối đa hóa độ phủ tìm kiếm
    // ============================================================
    const isNguonCAvailable = isNguonCSupportedForParams(params, true);
    const [resPhimApi, resNguonC] = await Promise.all([
      fetchSourceData(API_PHIMAPI, params, true, requestedPage, limit),
      isNguonCAvailable
        ? fetchSourceData(API_NGUONC, params, true, requestedPage, limit)
        : Promise.resolve(null),
    ]);

    const pItems = resPhimApi?.items || [];
    const nItems = resNguonC?.items || [];
    let candidates = deduplicateMovieItems([...pItems, ...nItems]);
    candidates = applyMovieFilters(candidates, params);

    const kw = params.keyword!.trim();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scored = candidates.map((m: any) => ({
      ...m,
      relevanceScore: evaluateSearchRelevance(m, kw).score,
    }));
    const hasStrong = scored.some((m) => m.relevanceScore >= 40);
    candidates = scored.filter((m) => (hasStrong ? m.relevanceScore >= 40 : m.relevanceScore > 0));

    sortMovieCandidates(candidates, parsedSort, true);

    totalItemsCount = Math.max(
      resPhimApi?.totalItems || 0,
      resNguonC?.totalItems || 0,
      candidates.length
    );
    maxTotalPages = Math.max(1, Math.ceil(totalItemsCount / limit));
    finalItems = (maxTotalPages > 0 && requestedPage > maxTotalPages) ? [] : candidates.slice(0, limit);
    isDegraded = resPhimApi === null && resNguonC === null;
  } else {
    // ============================================================
    // 2. DUYỆT DANH MỤC & BỘ LỌC (CATALOG BROWSING):
    // PhimAPI là authoritative source chuẩn:
    // - Lọc đa tiêu chí kết hợp (type, category, country, year, sort) trên database
    // - Chuẩn xác tuyệt đối limit items / page (0 khuyết phim)
    // - 0 trùng lặp giữa các trang (0 duplicate movies across pages)
    // - 1 HTTP call siêu tốc (50-150ms)
    // - Tự động fallback sang NguonC khi PhimAPI lỗi hoặc trả về 0 kết quả
    // ============================================================
    const resPhimApi = await fetchSourceData(API_PHIMAPI, params, false, requestedPage, limit);

    if (resPhimApi && resPhimApi.totalItems > 0 && resPhimApi.items.length > 0) {
      const items = resPhimApi.items;
      if (parsedSort.field === "rating") {
        sortMovieCandidates(items, parsedSort, false);
      }
      finalItems = items.slice(0, limit);
      totalItemsCount = resPhimApi.totalItems;
      maxTotalPages = Math.max(1, Math.ceil(totalItemsCount / limit));
    } else {
      // Fallback sang NguonC khi PhimAPI không có phim hoặc bị lỗi
      const isNguonCAvailable = isNguonCSupportedForParams(params, false);
      if (isNguonCAvailable) {
        const resNguonC = await fetchSourceData(API_NGUONC, params, false, requestedPage, limit);
        if (resNguonC && resNguonC.items.length > 0) {
          const candidates = applyMovieFilters(resNguonC.items, params);
          sortMovieCandidates(candidates, parsedSort, false);
          finalItems = candidates.slice(0, limit);
          totalItemsCount = resNguonC.totalItems || candidates.length;
          maxTotalPages = Math.max(1, Math.ceil(totalItemsCount / limit));
          if ("isPartial" in resNguonC && resNguonC.isPartial) {
            isDegraded = true;
          }
        } else {
          isDegraded = resNguonC === null;
        }
      } else {
        isDegraded = resPhimApi === null;
      }
    }
  }

  // SERVER-SIDE POSTER ENRICHMENT (Mặc định 0ms đọc RAM, không block SSR để giảm thiểu Active CPU):
  const enrichBudgetMs = params.posterEnrichmentBudgetMs ?? 0;
  if (enrichBudgetMs > 0) {
    await enrichMovieListPosters(finalItems, { budgetMs: enrichBudgetMs, stripProxyUrls: true });
  } else {
    await enrichMovieListPosters(finalItems, { budgetMs: 0, stripProxyUrls: true });
  }

  const payload = {
    status: true,
    items: finalItems,
    pagination: {
      currentPage: requestedPage,
      totalPages: maxTotalPages,
      totalItems: totalItemsCount,
    },
  };

  if (isDegraded) {
    degradedMoviePayloads.add(payload);
  }
  const now = Date.now();
  const freshTtl = isDegraded ? 15 * 1000 : 300 * 1000;
  const staleTtl = isDegraded ? 30 * 1000 : 1800 * 1000;

  moviesMemoryCache.set(cacheKey, {
    data: payload,
    expireAt: now + freshTtl,
    staleUntil: now + staleTtl,
  });

  return payload;
}

export const MOVIE_CACHE_VERSION = 26;

export function buildMovieCacheKey(params: MovieFilterParams): string {
  return JSON.stringify({
    v: MOVIE_CACHE_VERSION,
    category: params.category || "",
    country: params.country || "",
    year: params.year || "",
    keyword: params.keyword?.trim() || "",
    page: params.page || 1,
    limit: params.limit || 24,
    type: params.type || "",
    sort: params.sort || "latest",
  });
}

function sanitizeMovieImages<T>(data: T): T {
  return data;
}

export const movieApi = {
  // ==========================================
  // 1. LẤY DANH SÁCH PHIM (STALE-WHILE-REVALIDATE 0MS)
  // ==========================================
  getMovies: async (rawParams: MovieFilterParams = {}) => {
    const parsedPage = Number(rawParams.page);
    const parsedLimit = Number(rawParams.limit);
    const params: MovieFilterParams = {
      ...rawParams,
      page: Number.isFinite(parsedPage) && parsedPage >= 1 ? Math.floor(parsedPage) : 1,
      ...(rawParams.limit !== undefined
        ? { limit: Number.isFinite(parsedLimit) && parsedLimit >= 1 ? Math.floor(parsedLimit) : 24 }
        : {}),
    };

    const cacheKey = buildMovieCacheKey(params);

    const now = Date.now();
    if (moviesMemoryCache.has(cacheKey)) {
      const entry = moviesMemoryCache.get(cacheKey)!;
      if (
        params.posterEnrichmentBudgetMs &&
        params.posterEnrichmentBudgetMs > 0 &&
        Array.isArray(entry.data?.items) &&
        entry.data.items.some((it: { poster_url?: string }) => isSlowProviderSourceUrl(it?.poster_url))
      ) {
        await enrichMovieListPosters(entry.data.items, {
          budgetMs: Math.min(params.posterEnrichmentBudgetMs, 1500),
          stripProxyUrls: true,
        }).catch(() => {});
      }
      // Trả về dữ liệu ngay lập tức nếu cache còn tươi
      if (entry.expireAt > now) {
        return sanitizeMovieImages(entry.data);
      }
      // Nếu hết hạn tươi nhưng vẫn trong hạn stale -> trả về ngay lập tức (0ms) và revalidate ngầm!
      if (entry.staleUntil > now) {
        executeGetMovies(params, cacheKey).catch(() => { });
        return sanitizeMovieImages(entry.data);
      }
    }

    // Nếu yêu cầu bỏ qua KV (như search suggestions limit: 8), chỉ thực thi fetcher & cache vào RAM
    if (params.skipKvCache) {
      const res = await executeGetMovies(params, cacheKey);
      return sanitizeMovieImages(res);
    }

    // Phân trang sâu thông minh (Deep Pagination Caching):
    // Cho phép lưu cache Redis L2 lên đến trang 50 (đáp ứng trọn vẹn nhu cầu duyệt phim sâu của người dùng)
    // Trang > 50 (rất hiếm gặp ở người dùng thật) sẽ chỉ xử lý trực tiếp và lưu RAM để bảo vệ dung lượng
    const pageNum = params.page || 1;
    if (pageNum > 50 && !params.keyword) {
      const res = await executeGetMovies(params, cacheKey);
      return sanitizeMovieImages(res);
    }

    const kvKey = `movie:list:${cacheKey}`;
    // Phân tầng TTL hợp lý trên Redis DB 1:
    // Trang 1-5 (User phổ thông): giữ 6 giờ (21600s)
    // Trang 6-15 (Duyệt mở rộng): giữ 2 giờ (7200s)
    // Trang 16-50 (Duyệt sâu): giữ 1 giờ (3600s)
    // Tìm kiếm từ khóa: giữ 24 giờ (86400s)
    const ttlSeconds = params.keyword
      ? 86400
      : pageNum <= 5
        ? 21600
        : pageNum <= 15
          ? 7200
          : 3600;

    // Single-Flight Mutex: Gom các request đồng thời cho cùng danh mục/trang trên cùng instance
    const inFlightKey = cacheKey;
    const existingInFlight = inFlightGetMovies.get(inFlightKey);
    if (existingInFlight) {
      return await existingInFlight;
    }

    const task = (async () => {
      try {
        let res = await cacheService.get<Awaited<ReturnType<typeof executeGetMovies>>>(kvKey);

        // Chống nhiễm độc Cache: Nếu cache trả về mảng rỗng cho filter danh mục/quốc gia/loại phim,
        // coi như cache miss và fetch dữ liệu mới (KHÔNG gọi lệnh DEL làm tốn commands)
        if (res && (!Array.isArray(res.items) || (res.items.length === 0 && !params.keyword))) {
          res = null;
        }

        if (res) {
          if (Array.isArray(res.items) && res.items.length > 0) {
            const hitBudget =
              params.posterEnrichmentBudgetMs && params.posterEnrichmentBudgetMs > 0
                ? Math.min(params.posterEnrichmentBudgetMs, 1500)
                : 0;
            await enrichMovieListPosters(res.items, { budgetMs: hitBudget, stripProxyUrls: true }).catch(() => {});
          }
          // Nạp ngay vào L1 RAM cache để các request kế tiếp trên instance này lấy trong 0ms (0 Redis GETs)
          moviesMemoryCache.set(cacheKey, {
            data: res,
            expireAt: now + 900 * 1000,
            staleUntil: now + 3600 * 1000,
          });
        } else {
          res = await executeGetMovies(params, cacheKey);
          if (
            res &&
            Array.isArray(res.items) &&
            res.items.length > 0 &&
            !degradedMoviePayloads.has(res)
          ) {
            await cacheService.set(kvKey, res, ttlSeconds).catch(() => { });
          }
        }
        return sanitizeMovieImages(res);
      } finally {
        inFlightGetMovies.delete(inFlightKey);
      }
    })();

    inFlightGetMovies.set(inFlightKey, task);
    return await task;
  },

  // ==========================================
  // 2. LẤY FILTER (DÙNG STATIC DATA NHANH 0MS, KHÔNG PHỤ THUỘC API NGOÀI)
  // ==========================================
  getFilters: async () => {
    if (cachedFilters) {
      return cachedFilters;
    }

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 50 }, (_, index) =>
      String(currentYear - index),
    );

    const result = {
      genres: DEFAULT_GENRES,
      countries: DEFAULT_COUNTRIES,
      years,
    };

    cachedFilters = result;
    return result;
  },

  // ==========================================
  // 3. CHI TIẾT PHIM (ĐÃ ĐƯỢC CACHE REACT & MEMORY)
  // ==========================================
  getMovieDetail: async (
    slug: string,
    source?: "nguonc" | "ophim",
    requestedEpisode?: string
  ) => {
    // 1. Luôn dùng cachedFetchMovieDetailBase với 2 tham số chuẩn hóa (slug, safeSource)
    // React.cache bảo đảm 100% trong cùng request SSR: generateMetadata(slug) và MovieDetail(slug, undefined, ep)
    // CHIA SẺ CHÍNH XÁC 1 LẦN ĐỌC DỮ LIỆU DUY NHẤT (0 REDIS GET DƯ THỪA)!
    const safeSource = source || "any";
    const baseData = await cachedFetchMovieDetailBase(slug, safeSource);
    if (!baseData) return undefined;

    // 2. Tự động gắn stream cho tập yêu cầu hoặc tập đầu tiên (đặc biệt khi tập đầu chưa có link_m3u8 trực tiếp)
    const episodesList = baseData.episodes || baseData.movie?.episodes || [];
    const firstEp = episodesList[0]?.server_data?.[0];
    const targetEpSlug = requestedEpisode || (firstEp && !firstEp.link_m3u8 ? (firstEp.slug || "full") : undefined);

    const dataWithStreams = targetEpSlug
      ? await attachRequestedEpisodeStreams(baseData, targetEpSlug)
      : baseData;

    const res = sanitizeMovieDetailEpisodes(dataWithStreams);
    return sanitizeMovieImages(res);
  },

  /**
   * Batch get movie details for multiple slugs (Checks L1 Memory first, then executes Redis MGET)
   * Giảm thiểu N+1 Redis GET queries xuống thành 1 MGET duy nhất.
   */
  getMoviesDetailBatch: async (
    slugs: string[],
    source?: "nguonc" | "ophim"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<Record<string, any>> => {
    if (!slugs || slugs.length === 0) return {};
    const uniqueSlugs = Array.from(new Set(slugs.map((s) => s.trim()).filter(Boolean)));
    if (uniqueSlugs.length === 0) return {};

    const now = Date.now();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: Record<string, any> = {};
    const missingSlugs: string[] = [];

    // 1. Kiểm tra L1 Memory Cache trước (0ms, 0 Redis commands)
    for (const slug of uniqueSlugs) {
      const localKey = `${slug}_${source || "any"}`;
      const entry = movieDetailMemoryCache.get(localKey);
      if (entry && entry.expireAt > now && entry.data) {
        result[slug] = sanitizeMovieImages(entry.data);
      } else {
        missingSlugs.push(slug);
      }
    }

    if (missingSlugs.length === 0) {
      return result;
    }

    // 2. Gom các missing slugs và thực hiện MGET 1 lần trên Redis
    const redisKeys = missingSlugs.map((slug) => `movie:detail:v6:${slug}:${source || "any"}`);
    const cachedItems = await cacheService.mget<MovieDetailCachePayload>(redisKeys);

    const stillMissingSlugs: string[] = [];

    for (let i = 0; i < missingSlugs.length; i++) {
      const slug = missingSlugs[i];
      const raw = cachedItems[i];
      const localKey = `${slug}_${source || "any"}`;

      if (raw && !(typeof raw === "object" && "_isNegative" in raw)) {
        const data = unpackDetailPayload(raw);
        if (data?.movie) {
          movieDetailMemoryCache.set(localKey, {
            data,
            expireAt: now + 600 * 1000,
            staleUntil: now + 3600 * 1000,
          });
          result[slug] = sanitizeMovieImages(data);
          continue;
        }
      } else if (raw && typeof raw === "object" && "_isNegative" in raw) {
        // Negative cache hit -> phim không tồn tại
        continue;
      }

      stillMissingSlugs.push(slug);
    }

    // 3. Fallback chỉ fetch các phim thực sự thiếu trên cả L1 và Redis (tối đa 10 phim đồng thời)
    if (stillMissingSlugs.length > 0) {
      const liveFetches = stillMissingSlugs.slice(0, 10).map(async (slug) => {
        try {
          const detail = await movieApi.getMovieDetail(slug, source);
          if (detail && detail.movie) {
            result[slug] = detail;
          }
        } catch { }
      });
      await Promise.allSettled(liveFetches);
    }

    return result;
  },

  getEpisodeStream: async (
    slug: string,
    episodeSlug: string,
    serverName?: string,
    source?: "nguonc" | "ophim"
  ) => {
    return await getEpisodeStream(slug, episodeSlug, serverName, source);
  },

  // ==========================================
  // 4. TÌM KIẾM PHIM THEO TỪ KHÓA
  // ==========================================
  searchMovies: async (keyword: string, limit = 24) => {
    return await movieApi.getMovies({ keyword, limit });
  },

  // ==========================================
  // 5. TRUY VẤN ỨNG VIÊN CHO AI CONCIERGE & ROULETTE (PHIMAPI + NGUONC)
  // ==========================================
  getAiCandidates: async (params: MovieFilterParams = {}, options?: AiCandidateOptions) => {
    const cacheKey = JSON.stringify({
      v: "ai_cand_2",
      category: params.category || "",
      country: params.country || "",
      year: params.year || "",
      keyword: params.keyword?.trim() || "",
      page: params.page || 1,
      limit: params.limit || 24,
      type: params.type || "",
      sort: params.sort || "latest",
      min: options?.minCandidates || 0,
    });

    const now = Date.now();
    if (moviesMemoryCache.has(cacheKey)) {
      const entry = moviesMemoryCache.get(cacheKey)!;
      if (entry.expireAt > now) {
        return entry.data;
      }
      if (entry.staleUntil > now) {
        executeGetAiCandidates(params, options).catch(() => { });
        return entry.data;
      }
    }

    if (params.skipKvCache) {
      const res = await executeGetAiCandidates(params, options);
      moviesMemoryCache.set(cacheKey, {
        data: res,
        expireAt: now + 300 * 1000,
        staleUntil: now + 1800 * 1000,
      });
      return res;
    }

    const kvKey = `ai:candidate:${cacheKey}`;
    const ttlSeconds = params.keyword ? 86400 : 7200;
    return await cacheService.fetchOrSet(
      kvKey,
      async () => {
        const res = await executeGetAiCandidates(params, options);
        moviesMemoryCache.set(cacheKey, {
          data: res,
          expireAt: Date.now() + 300 * 1000,
          staleUntil: Date.now() + 1800 * 1000,
        });
        return res;
      },
      ttlSeconds
    );
  },
};
