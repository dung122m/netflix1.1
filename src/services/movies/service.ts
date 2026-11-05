import { cache } from "react";
import { cleanHtmlText } from "@/lib/cleanHtml";
import { cacheService } from "@/lib/cache";
import { findEpisodeMatch } from "@/lib/formatEpisode";
import {
  fetchVsmovDetail,
  fetchVsmovFiltered,
  adaptVsmovMovieItem,
  adaptVsmovMovieDetail,
  performVsmovCatalogIngestion,
  searchVsmov,
} from "@/services/providers/vsmov";
import { formatGenreName, formatCountryName, getCanonicalGenreSlug, getCanonicalCountrySlug } from "@/lib/movieMedia";
import { getTmdbPosterUrl, searchTmdbPosterByTitle } from "@/services/tmdbService";
import { searchAniListPoster } from "@/services/aniListService";

const API_NGUONC = process.env.NEXT_PUBLIC_API_URL || "https://phim.nguonc.com/api";
const API_PHIMAPI = process.env.NEXT_PUBLIC_API_URL_2 || "https://phimapi.com";

const PHIMAPI_TIMEOUT_MS = 6000;
const PHIMAPI_SEARCH_TIMEOUT_MS = 4000;
const NGUONC_TIMEOUT_MS = 7500;
const VSMOV_TIMEOUT_MS = 7500;

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

// In-flight deduplication để tránh gọi lặp cùng 1 trang NguonC (đặc biệt các trang giao thoa như page 5, page 10)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const inFlightNguonC = new Map<string, Promise<any>>();

// Cache metadata phân trang của NguonC (totalItems, totalPages) theo query để chống gọi các trang vượt quá giới hạn
const nguonCQueryMetaCache = new Map<string, { totalItems: number; totalPages: number; timestamp: number }>();

function getNguonCQueryMetaKey(params: MovieFilterParams, isSearch: boolean): string {
  if (isSearch && params.keyword) {
    return `search:${params.keyword.trim().toLowerCase()}`;
  }
  return `filter:${params.type || ""}:${params.category || ""}:${params.country || ""}:${params.year || ""}`;
}

let cachedFilters: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  genres: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  countries: any[];
  years: string[];
} | null = null;

export interface MovieFilterParams {
  category?: string;
  country?: string;
  year?: string;
  keyword?: string;
  page?: number;
  limit?: number;
  type?: string;
  slug?: string;
  sort?: "latest" | "rating" | "views" | "year";
  skipKvCache?: boolean;
  vsmovTimeoutMs?: number;
  skipVsmov?: boolean;
}

export interface AiCandidateOptions {
  minCandidates?: number;
  skipVsmov?: boolean;
}

// Bảng ánh xạ slug thể loại sang NguonC
const NGUONC_GENRE_MAP: Record<string, string> = {
  "hai-huoc": "phim-hai",
  "vien-tuong": "khoa-hoc-vien-tuong",
  "am-nhac": "phim-nhac",
  "vo-thuat": "hanh-dong",
  "than-thoai": "gia-tuong",
  "hoc-duong": "tam-ly",
  "the-thao": "tam-ly",
  "khoa-hoc": "khoa-hoc-vien-tuong",
};

function getNguonCGenreSlug(slug?: string): string {
  if (!slug) return "";
  return NGUONC_GENRE_MAP[slug] || slug;
}

/**
 * Khử trùng lặp tập phim trong từng server (Chống lỗi duplicate key tap-14, tap-15 từ upstream API)
 */
/**
 * Trích xuất thứ tự số học của tập phim để sắp xếp danh sách tập chuẩn xác
 * Hỗ trợ các định dạng: "Tập 01", "1", "tap-1187", "1187-2", "Full", "Trailer"
 */
export function extractEpisodeOrder(name?: string, slug?: string): number {
  const str = `${name || ""} ${slug || ""}`.trim().toLowerCase();
  if (!str) return 0;
  if (str.includes("trailer")) return 999999;
  if (str.includes("full")) return 0;

  // Match patterns like "1187-2" or "tap-1187-2" (tập phụ/part 2)
  const hyphenPartMatch = str.match(/(?:tập|tap|ep)?[\s-_]*(\d+)[\s-_]+(\d+)/i);
  if (hyphenPartMatch) {
    const main = parseInt(hyphenPartMatch[1], 10);
    const sub = parseInt(hyphenPartMatch[2], 10);
    return main + (sub < 100 ? sub / 100 : 0.01);
  }

  // Match standard numbers: "tap 12" -> 12, "tap-1187" -> 1187
  const numMatch = str.match(/(?:tập|tap|ep)?[\s-_]*(\d+)/i);
  if (numMatch) {
    return parseInt(numMatch[1], 10);
  }

  return 0;
}

/**
 * Khử trùng lặp và sắp xếp tập phim theo thứ tự số học tự nhiên trong từng server
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function deduplicateServerEpisodes(serverData: any[]): any[] {
  if (!Array.isArray(serverData)) return [];
  const seenKeys = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uniqueList: any[] = [];

  for (const ep of serverData) {
    if (!ep) continue;
    const rawSlug = String(ep.slug || "").trim().toLowerCase();
    const rawName = String(ep.name || "").trim().toLowerCase();
    const key = rawSlug || rawName;

    if (!key) {
      uniqueList.push(ep);
      continue;
    }

    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueList.push(ep);
    }
  }

  // Sắp xếp tự nhiên theo thứ tự tập số học
  return uniqueList.sort((a, b) => {
    const orderA = extractEpisodeOrder(a.name, a.slug);
    const orderB = extractEpisodeOrder(b.name, b.slug);
    if (orderA !== orderB) return orderA - orderB;
    return String(a.name || "").localeCompare(String(b.name || ""), undefined, { numeric: true });
  });
}

/**
 * Chuẩn hóa slug tập phim, đảm bảo tap-3, tap-03, tap 3, 3 đều được nhận diện thống nhất
 */
export function normalizeEpisodeSlug(epSlug?: string): string {
  if (!epSlug) return "tap-01";
  const trimmed = epSlug.trim().toLowerCase();
  if (trimmed === "full" || trimmed === "tap-full") return "tap-full";
  const numMatch = trimmed.match(/^(?:tap|ep)?[-_\s]*0*(\d+)/i);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    const padded = num < 10 ? `0${num}` : String(num);
    return `tap-${padded}`;
  }
  return trimmed;
}

// Helper to check if a server has playable direct M3U8 links
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serverHasM3u8(srv: any): boolean {
  return (
    Array.isArray(srv?.server_data) &&
    srv.server_data.some(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (e: any) => typeof e?.link_m3u8 === "string" && e.link_m3u8.includes(".m3u8")
    )
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isBetterServerCandidate(candidate: any, current: any): boolean {
  if (!current) return true;
  const candM3u8 = serverHasM3u8(candidate);
  const curM3u8 = serverHasM3u8(current);
  // Ưu tiên tuyệt đối server có đường truyền direct .m3u8 (phát mượt mà qua HLS, không dính quảng cáo iframe hay lỗi CORS/403)
  if (candM3u8 && !curM3u8) return true;
  if (!candM3u8 && curM3u8) return false;
  return (candidate.server_data?.length || 0) > (current.server_data?.length || 0);
}

/**
 * Lọc và chuẩn hóa tối đa đúng 2 server: Lồng Tiếng và Thuyết Minh (hoặc Vietsub)
 * Ưu tiên server có luồng phát trực tiếp .m3u8, không để server iframe lỗi đè lên server m3u8 chất lượng cao
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function filterDualServers(rawServers: any[]): any[] {
  if (!Array.isArray(rawServers) || rawServers.length === 0) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let longTiengServer: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let thuyetMinhServer: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let vietsubServer: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const otherServers: any[] = [];

  for (const srv of rawServers) {
    if (!srv || !Array.isArray(srv.server_data) || srv.server_data.length === 0) continue;
    const sName = String(srv.server_name || "").trim();
    const nameLower = sName.toLowerCase();

    const isLongTieng =
      nameLower.includes("lồng tiếng") ||
      nameLower.includes("long tieng") ||
      nameLower.includes("dub");

    const isThuyetMinh =
      nameLower.includes("thuyết minh") ||
      nameLower.includes("thuyet minh") ||
      nameLower.includes("voiceover");

    const isVietsub =
      nameLower.includes("vietsub") ||
      nameLower.includes("phụ đề") ||
      nameLower.includes("sub");

    if (isLongTieng) {
      if (isBetterServerCandidate(srv, longTiengServer)) {
        longTiengServer = { ...srv, server_name: "Lồng Tiếng" };
      }
    } else if (isThuyetMinh) {
      if (isBetterServerCandidate(srv, thuyetMinhServer)) {
        thuyetMinhServer = { ...srv, server_name: "Thuyết Minh" };
      }
    } else if (isVietsub) {
      if (isBetterServerCandidate(srv, vietsubServer)) {
        vietsubServer = { ...srv, server_name: "Thuyết Minh" };
      }
    } else {
      otherServers.push(srv);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any[] = [];
  if (longTiengServer) result.push(longTiengServer);
  if (thuyetMinhServer) {
    result.push(thuyetMinhServer);
  } else if (vietsubServer) {
    result.push(vietsubServer);
  }

  // Fallback nếu nguồn phim không đặt tên server theo mẫu chuẩn
  if (result.length === 0 && otherServers.length > 0) {
    otherServers.sort((a, b) => (isBetterServerCandidate(a, b) ? -1 : 1));
    result.push({ ...otherServers[0], server_name: "Lồng Tiếng" });
    if (otherServers.length > 1) {
      result.push({ ...otherServers[1], server_name: "Thuyết Minh" });
    }
  } else if (result.length === 1 && otherServers.length > 0) {
    otherServers.sort((a, b) => (isBetterServerCandidate(a, b) ? -1 : 1));
    const missingName = result[0].server_name === "Lồng Tiếng" ? "Thuyết Minh" : "Lồng Tiếng";
    result.push({ ...otherServers[0], server_name: missingName });
  }

  return result.slice(0, 2);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeNguonCMovieDetail(raw: any) {
  if (!raw || !raw.movie) return null;
  const movie = raw.movie;

  // Trích xuất thể loại & quốc gia từ cấu trúc group của NguonC
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const categories: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const countries: any[] = [];

  if (movie.category && typeof movie.category === "object") {
    for (const key of Object.keys(movie.category)) {
      const grp = movie.category[key];
      const grpName = (grp?.group?.name || "").toLowerCase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const list = (grp?.list || []) as any[];
      if (grpName.includes("quốc gia") || grpName.includes("quoc gia")) {
        countries.push(...list.map((c) => ({ id: c.id, name: c.name, slug: getCanonicalCountrySlug(c.name, c.slug) })));
      } else if (grpName.includes("thể loại") || grpName.includes("the loai")) {
        categories.push(...list.map((c) => ({ id: c.id, name: c.name, slug: getCanonicalGenreSlug(c.name, c.slug) })));
      }
    }
  }

  // Chuẩn hóa danh sách tập phim sang định dạng server_data của ứng dụng
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const episodes = (movie.episodes || []).map((srv: any, idx: number) => ({
    server_name: srv.server_name || `Server NguonC #${idx + 1}`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    server_data: deduplicateServerEpisodes((srv.items || []).map((ep: any) => {
      const epName = String(ep.name || "");
      const formattedName = epName.toLowerCase().startsWith("tập") ? epName : `Tập ${epName}`;
      return {
        name: formattedName,
        slug: ep.slug || `tap-${epName}`,
        filename: `${movie.name || ""} - ${formattedName}`,
        link_embed: ep.embed || "",
        link_m3u8: "",
      };
    })),
  }));

  const castsArr = typeof movie.casts === "string"
    ? movie.casts.split(",").map((s: string) => s.trim()).filter(Boolean)
    : Array.isArray(movie.casts)
    ? movie.casts
    : [];

  const directorArr = typeof movie.director === "string"
    ? movie.director.split(",").map((s: string) => s.trim()).filter(Boolean)
    : Array.isArray(movie.director)
    ? movie.director
    : [];

  return {
    status: true,
    msg: "done",
    movie: {
      _id: movie.id || movie.slug,
      name: movie.name,
      slug: movie.slug,
      origin_name: movie.original_name || movie.name,
      content: movie.description || "",
      description: movie.description || "",
      type: "series",
      status: movie.current_episode || "",
      thumb_url: movie.poster_url || movie.thumb_url || "",
      poster_url: movie.thumb_url || movie.poster_url || "",
      time: movie.time || "",
      episode_current: movie.current_episode || "",
      episode_total: String(movie.total_episodes || ""),
      quality: movie.quality || "HD",
      lang: movie.language || "Vietsub",
      year: Number(movie.year) || new Date().getFullYear(),
      actor: castsArr,
      casts: castsArr,
      director: directorArr,
      category: categories,
      country: countries,
      modified: movie.modified ? { time: String(movie.modified) } : undefined,
      created: movie.created ? { time: String(movie.created) } : undefined,
      alternative_names: movie.original_name && movie.original_name !== movie.name ? [movie.original_name] : [],
      tmdb: movie.tmdb || undefined,
      imdb: movie.imdb || undefined,
      episodes: episodes,
    },
    episodes: episodes,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sanitizeMovieDetailEpisodes(result: any): any {
  if (!result) return result;
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
  return result;
}

// Hàm nội bộ lấy chi tiết phim có multi-tier cache (L1 Memory SWR + L2 Cloudflare KV)
interface MovieDetailCachePayload {
  status?: boolean;
  msg?: string;
  movie?: {
    _id?: string;
    name?: string;
    slug?: string;
    source?: string;
    sources?: string[];
    episodes?: Array<{ server_name?: string; server_data?: unknown[] }>;
    [key: string]: unknown;
  };
  episodes?: Array<{ server_name?: string; server_data?: unknown[] }>;
  _isFallback?: boolean;
  _isNegative?: boolean;
  _v?: number;
  [key: string]: unknown;
}

export interface CompactEpisodeItem {
  name: string;
  slug: string;
  link_embed?: string;
  link_m3u8?: string;
}

export interface CompactServerItem {
  server_name: string;
  server_data: CompactEpisodeItem[];
}

export interface MovieDetailV3Payload {
  _v: 3;
  status?: boolean;
  msg?: string;
  movie: Record<string, unknown>;
  episodes: CompactServerItem[];
  _isFallback?: boolean;
  _isNegative?: boolean;
}

export interface EpisodeStreamResult {
  server_name: string;
  link_embed?: string;
  link_m3u8?: string;
}

interface RawEpisodeItem {
  name?: string;
  slug?: string;
  link_embed?: string;
  link_m3u8?: string;
}

interface RawServerItem {
  server_name?: string;
  server_data?: RawEpisodeItem[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toCompactDetailPayload(data: any, requestedEpSlug?: string): MovieDetailV3Payload {
  if (!data || !data.movie) return data;

  // Lọc tối đa đúng 2 server: Lồng Tiếng và Thuyết Minh, loại bỏ hoàn toàn các server dư thừa
  const rawEpisodes: RawServerItem[] = filterDualServers(data.episodes || data.movie?.episodes || []);
  const cleanMovie = { ...data.movie };
  delete cleanMovie.episodes;

  const normReqEp = requestedEpSlug ? normalizeEpisodeSlug(requestedEpSlug) : undefined;

  const compactEpisodes: CompactServerItem[] = rawEpisodes.map((srv: RawServerItem, sIdx: number) => {
    const rawData: RawEpisodeItem[] = srv?.server_data || [];
    const isSmallSeries = rawData.length <= 12;

    const compactData: CompactEpisodeItem[] = rawData.map((ep: RawEpisodeItem, epIdx: number) => {
      const epNorm = normalizeEpisodeSlug(ep.slug || ep.name);
      const isReqMatch = Boolean(
        normReqEp &&
        (ep.slug === requestedEpSlug ||
         ep.name === requestedEpSlug ||
         epNorm === normReqEp)
      );
      const isInitial = epIdx < 2 || isReqMatch;
      if (isSmallSeries || isInitial) {
        return {
          name: ep.name || "",
          slug: ep.slug || "",
          link_embed: ep.link_embed || "",
          link_m3u8: ep.link_m3u8 || "",
        };
      }
      return {
        name: ep.name || "",
        slug: ep.slug || "",
      };
    });

    return {
      server_name: srv.server_name || `Server #${sIdx + 1}`,
      server_data: deduplicateServerEpisodes(compactData),
    };
  });

  return {
    _v: 3,
    status: data.status ?? true,
    msg: data.msg ?? "done",
    movie: cleanMovie,
    episodes: compactEpisodes,
    _isFallback: Boolean(data._isFallback),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function unpackDetailPayload(raw: any): any {
  if (!raw || !raw.movie) return raw;
  const episodes = raw.episodes || raw.movie.episodes || [];
  const movie = { ...raw.movie, episodes };
  return {
    ...raw,
    movie,
    episodes,
  };
}




const DEFAULT_FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mergeSecondaryIntoPrimary(primary: any, secondary: any) {
  if (!primary || !secondary) return;
  const secondaryEpContainer = secondary?.episodes || secondary?.movie?.episodes;
  if (Array.isArray(secondaryEpContainer) && secondaryEpContainer.length > 0) {
    const primaryEpisodes = primary.episodes || primary.movie?.episodes || [];
    primary.episodes = primaryEpisodes;
    if (primary.movie) {
      primary.movie.episodes = primaryEpisodes;
    }

    const primaryStreamUrls = new Set<string>();
    for (const s of primaryEpisodes) {
      for (const ep of s?.server_data || []) {
        const u = (ep?.link_m3u8 || ep?.link_embed || "").trim();
        if (u) primaryStreamUrls.add(u);
      }
    }

    const existingNames = new Set(
      primaryEpisodes.map((s: { server_name?: string }) => (s.server_name || "").trim().toLowerCase())
    );

    for (const s of secondaryEpContainer) {
      if (!s || !Array.isArray(s.server_data) || s.server_data.length === 0) continue;

      const hasDistinctStream = s.server_data.some((ep: { link_m3u8?: string; link_embed?: string }) => {
        const u = (ep?.link_m3u8 || ep?.link_embed || "").trim();
        return u && !primaryStreamUrls.has(u);
      });

      if (hasDistinctStream) {
        let targetName = (s.server_name || "Dự phòng").trim();
        if (existingNames.has(targetName.toLowerCase())) {
          targetName = `${targetName} (Dự phòng)`;
        }
        if (existingNames.has(targetName.toLowerCase())) {
          targetName = `${targetName} #2`;
        }
        existingNames.add(targetName.toLowerCase());

        primaryEpisodes.push({
          ...s,
          server_name: targetName,
        });
      }
    }

    if (primary.movie) {
      primary.movie.episodes = primaryEpisodes;
    }
  }

  // Bổ sung metadata nếu primary bị thiếu
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
}

// Mutex map ngăn ngừa gọi discovery trùng lặp đồng thời trên cùng 1 slug
const inFlightDiscovery = new Map<string, Promise<void>>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function discoverAndMergeMissingSources(result: any, slug: string) {
  if (!result?.movie) return;

  const discoveryKey = slug.trim().toLowerCase();
  const existing = inFlightDiscovery.get(discoveryKey);
  if (existing) {
    await existing;
    return;
  }

  const promise = (async () => {
    const m = result.movie;
    const primaryEpisodes = result.episodes || m.episodes || [];
    const primaryStreamUrls = new Set<string>();
    for (const s of primaryEpisodes) {
      for (const ep of s?.server_data || []) {
        const u = (ep?.link_m3u8 || ep?.link_embed || "").trim().toLowerCase();
        if (u) primaryStreamUrls.add(u);
      }
    }

    const hasPhimApi = m.source === "phimapi" || Array.from(primaryStreamUrls).some((u) => u.includes("phimapi.com") || u.includes(".m3u8"));
    const hasNguonC = m.source === "nguonc" || Array.from(primaryStreamUrls).some((u) => u.includes("nguonc") || u.includes("gatec"));
    const hasVsmov = m.source === "vsmov" || Array.from(primaryStreamUrls).some((u) => u.includes("vsmov"));

    const targetName = String(m.name || m.title || "").trim();
    const targetOrig = String(m.origin_name || "").trim();
    if (!targetName && !targetOrig) return;

    const cleanTargetName = cleanNormalizedForMatch(targetName);
    const cleanTargetOrig = cleanNormalizedForMatch(targetOrig);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const discoveryPromises: Promise<any>[] = [];

    // 1. Khám phá NguonC nếu chưa có
    if (!hasNguonC) {
      discoveryPromises.push((async () => {
        try {
          const query = targetName || targetOrig;
          const res = await fetch(`${API_NGUONC}/films/search?keyword=${encodeURIComponent(query)}&page=1`, {
            headers: DEFAULT_FETCH_HEADERS,
            next: { revalidate: 600 },
            signal: AbortSignal.timeout(4000),
          });
          if (!res.ok) return null;
          const json = await res.json();
          const items = json?.items || [];
          for (const itm of items) {
            const cn = cleanNormalizedForMatch(itm.name || "");
            const co = cleanNormalizedForMatch(itm.original_name || "");
            const matched = (cleanTargetName && (cn === cleanTargetName || co === cleanTargetName)) ||
                            (cleanTargetOrig && (cn === cleanTargetOrig || co === cleanTargetOrig));
            if (matched && itm.slug && itm.slug !== slug) {
              const detailRes = await fetch(`${API_NGUONC}/film/${itm.slug}`, {
                headers: DEFAULT_FETCH_HEADERS,
                next: { revalidate: 600 },
                signal: AbortSignal.timeout(4000),
              });
              if (detailRes.ok) {
                const detailJson = await detailRes.json();
                return normalizeNguonCMovieDetail(detailJson);
              }
            }
          }
        } catch {}
        return null;
      })());
    }

    // 2. Khám phá PhimAPI nếu chưa có
    if (!hasPhimApi) {
      discoveryPromises.push((async () => {
        try {
          const query = targetName || targetOrig;
          const res = await fetch(`${API_PHIMAPI}/v1/api/tim-kiem?keyword=${encodeURIComponent(query)}&limit=10`, {
            headers: DEFAULT_FETCH_HEADERS,
            next: { revalidate: 600 },
            signal: AbortSignal.timeout(4000),
          });
          if (!res.ok) return null;
          const json = await res.json();
          const items = json?.data?.items || json?.items || [];
          for (const itm of items) {
            const cn = cleanNormalizedForMatch(itm.name || "");
            const co = cleanNormalizedForMatch(itm.origin_name || "");
            const matched = (cleanTargetName && (cn === cleanTargetName || co === cleanTargetName)) ||
                            (cleanTargetOrig && (cn === cleanTargetOrig || co === cleanTargetOrig));
            if (matched && itm.slug && itm.slug !== slug) {
              const detailRes = await fetch(`${API_PHIMAPI}/phim/${itm.slug}`, {
                headers: DEFAULT_FETCH_HEADERS,
                next: { revalidate: 600 },
                signal: AbortSignal.timeout(4000),
              });
              if (detailRes.ok) {
                return await detailRes.json();
              }
            }
          }
        } catch {}
        return null;
      })());
    }

    // 3. Khám phá VSMOV nếu chưa có
    if (!hasVsmov) {
      discoveryPromises.push((async () => {
        try {
          const vsmovExact = await fetchVsmovDetail(slug, 3500);
          if (vsmovExact) return adaptVsmovMovieDetail(vsmovExact);

          const query = targetName || targetOrig;
          const searchRes = await searchVsmov(query, 1, 10);
          const items = searchRes?.items || [];
          for (const itm of items) {
            const cn = cleanNormalizedForMatch(itm.name || "");
            const co = cleanNormalizedForMatch(itm.origin_name || "");
            const matched = (cleanTargetName && (cn === cleanTargetName || co === cleanTargetName)) ||
                            (cleanTargetOrig && (cn === cleanTargetOrig || co === cleanTargetOrig));
            if (matched && itm.slug && itm.slug !== slug) {
              const detail = await fetchVsmovDetail(itm.slug, 3500);
              if (detail) return adaptVsmovMovieDetail(detail);
            }
          }
        } catch {}
        return null;
      })());
    }

    if (discoveryPromises.length > 0) {
      const settled = await Promise.allSettled(discoveryPromises);
      for (const s of settled) {
        if (s.status === "fulfilled" && s.value) {
          mergeSecondaryIntoPrimary(result, s.value);
        }
      }
    }
  })();

  inFlightDiscovery.set(discoveryKey, promise);
  try {
    await promise;
  } finally {
    inFlightDiscovery.delete(discoveryKey);
  }
}

// Mutex map ngăn ngừa gọi Base Movie Detail trùng lặp (giữa generateMetadata và Page component)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const inFlightDetailBase = new Map<string, Promise<any>>();

const fetchMovieDetailBase = async (
  slug: string,
  source?: "nguonc" | "ophim" | "vsmov",
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
      revalidateMovieDetail(slug, source, localKey).catch(() => {});
      return entry.data;
    }
  }

  const existing = inFlightDetailBase.get(localKey);
  if (existing) return existing;

  const promise = (async () => {
    // 1. Đọc từ Redis v3 Compact Metadata (~2KB)
    const kvKeyV3 = `movie:detail:v4:${slug}:${source || "any"}`;

    let data: MovieDetailCachePayload | null = null;
    const rawData = await cacheService.get<MovieDetailCachePayload>(kvKeyV3);
    if (rawData) {
      data = unpackDetailPayload(rawData);
    }

    // Cơ chế Tự Phục Hồi (Self-Healing Cache):
    // Nếu cache trước đây bị nhiễm fallback VSMOV trong khi source yêu cầu là mặc định ("any" / Nanaflix),
    // thử kích hoạt live fetch để khôi phục nguồn phát chuẩn Nanaflix (PhimAPI/NguonC)
    if (!source && data?.movie?.source === "vsmov") {
      try {
        const freshNanaflix = await fetchAndCacheMovieDetail(slug, source, localKey);
        if (freshNanaflix && freshNanaflix.movie?.source !== "vsmov") {
          const ttl = Boolean((freshNanaflix as MovieDetailCachePayload)?._isFallback) ? 180 : 7 * 24 * 60 * 60;
          const compact = toCompactDetailPayload(freshNanaflix, requestedEpisode);
          await cacheService.set(kvKeyV3, compact, ttl);
          data = freshNanaflix;
        }
      } catch {}
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



export async function getEpisodeStream(
  slug: string,
  episodeSlug: string,
  serverName?: string,
  source?: "nguonc" | "ophim" | "vsmov"
): Promise<EpisodeStreamResult[]> {
  const normEp = normalizeEpisodeSlug(episodeSlug);
  const serverKey = serverName ? serverName.toLowerCase().replace(/[^a-z0-9]/g, "_") : "any";
  const localKey = `${slug}_${source || "any"}`;
  const now = Date.now();

  // 1. Kiểm tra L1 Memory Cache: Nếu full detail đang có trong RAM, lọc đúng 2 server và trả về ngay
  const mem = movieDetailMemoryCache.get(localKey);
  if (mem && mem.data && mem.expireAt > now) {
    const rawServers: RawServerItem[] = mem.data.episodes || mem.data.movie?.episodes || [];
    const dualServers = filterDualServers(rawServers);
    const streams: EpisodeStreamResult[] = [];
    for (const srv of dualServers) {
      if (serverName && !srv.server_name?.toLowerCase().includes(serverName.toLowerCase())) {
        continue;
      }
      const epList: RawEpisodeItem[] = srv?.server_data || [];
      const match = findEpisodeMatch(epList, episodeSlug) || findEpisodeMatch(epList, normEp);
      if (match && (match.link_m3u8 || match.link_embed)) {
        streams.push({
          server_name: srv.server_name || "Server",
          link_embed: match.link_embed || "",
          link_m3u8: match.link_m3u8 || "",
        });
      }
    }
    if (streams.length > 0) return streams;
  }

  // 2. Kiểm tra L2 Redis Cache cho tập và server cụ thể (~200 bytes)
  const streamKvKey = `movie:stream:v2:${slug}:${serverKey}:${normEp}`;
  const cachedStreams = await cacheService.get<EpisodeStreamResult[]>(streamKvKey);
  if (cachedStreams && Array.isArray(cachedStreams) && cachedStreams.length > 0) {
    return cachedStreams;
  }

  // 3. Nạp nguồn trực tiếp từ upstream và lưu cache riêng cho tập này (~200 bytes, KHÔNG đọc payload 1.33MB)
  try {
    const freshDetail = await fetchAndCacheMovieDetail(slug, source, localKey);
    if (freshDetail) {
      const rawServers: RawServerItem[] = freshDetail.episodes || freshDetail.movie?.episodes || [];
      const dualServers = filterDualServers(rawServers);
      const streams: EpisodeStreamResult[] = [];
      for (const srv of dualServers) {
        if (serverName && !srv.server_name?.toLowerCase().includes(serverName.toLowerCase())) {
          continue;
        }
        const epList: RawEpisodeItem[] = srv?.server_data || [];
        const match = findEpisodeMatch(epList, episodeSlug) || findEpisodeMatch(epList, normEp);
        if (match && (match.link_m3u8 || match.link_embed)) {
          streams.push({
            server_name: srv.server_name || "Server",
            link_embed: match.link_embed || "",
            link_m3u8: match.link_m3u8 || "",
          });
        }
      }
      if (streams.length > 0) {
        cacheService.set(streamKvKey, streams, 7 * 86400).catch(() => {});
        return streams;
      }
    }
  } catch {}

  return [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function attachRequestedEpisodeStreams(data: any, requestedEpSlug?: string): Promise<any> {
  if (!data || !requestedEpSlug || !data.episodes) return data;
  const episodes: RawServerItem[] = data.episodes || data.movie?.episodes || [];
  const movieSlug = data.movie?.slug;
  if (!movieSlug) return data;

  const tasks: Promise<void>[] = [];
  for (const srv of episodes) {
    const list: RawEpisodeItem[] = srv.server_data || [];
    const target = list.find((e: RawEpisodeItem) => e.slug === requestedEpSlug || e.name === requestedEpSlug)
      || findEpisodeMatch(list, requestedEpSlug);
    if (!target) continue;
    if (target.link_m3u8 || target.link_embed) continue;

    const localKey = `${movieSlug}_any`;
    const mem = movieDetailMemoryCache.get(localKey);
    let foundInMem = false;
    if (mem?.data?.episodes) {
      for (const memSrv of mem.data.episodes) {
        if (memSrv.server_name === srv.server_name || (!memSrv.server_name && !srv.server_name)) {
          const memMatch = (memSrv.server_data || []).find((e: RawEpisodeItem) => e.slug === target?.slug || e.name === target?.name)
            || findEpisodeMatch(memSrv.server_data || [], requestedEpSlug);
          if (memMatch && (memMatch.link_m3u8 || memMatch.link_embed)) {
            target.link_embed = memMatch.link_embed || target.link_embed;
            target.link_m3u8 = memMatch.link_m3u8 || target.link_m3u8;
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
              }
            }
          } catch {}
        })()
      );
    }
  }

  if (tasks.length > 0) {
    await Promise.allSettled(tasks);
  }

  return data;
}

const fetchMovieDetailInternal = async (
  slug: string,
  source?: "nguonc" | "ophim" | "vsmov",
  requestedEpisode?: string,
) => {
  const data = await fetchMovieDetailBase(slug, source, requestedEpisode);
  if (!data) return undefined;
  return sanitizeMovieDetailEpisodes(await attachRequestedEpisodeStreams(data, requestedEpisode));
};

async function revalidateMovieDetail(slug: string, source?: "nguonc" | "ophim" | "vsmov", cacheKey?: string) {
  try {
    await fetchAndCacheMovieDetail(slug, source, cacheKey || `${slug}_${source || "any"}`);
  } catch {}
}

// Mutex map ngăn ngừa gọi fetchAndCacheMovieDetail trùng lặp đồng thời
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const inFlightDetailFetches = new Map<string, Promise<any>>();

async function fetchAndCacheMovieDetail(slug: string, source?: "nguonc" | "ophim" | "vsmov", cacheKey?: string) {
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
    } else if (source === "vsmov") {
      const vsmovData = await fetchVsmovDetail(slug);
      if (vsmovData) {
        result = adaptVsmovMovieDetail(vsmovData);
      }
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

      if (validCandidates.length === 0) {
        // Fallback sang nguồn thứ 3 VSMOV nếu PhimAPI & NguonC không có phim
        const vsmovData = await fetchVsmovDetail(slug, 7500);
        if (vsmovData) {
          result = adaptVsmovMovieDetail(vsmovData);
          if (result) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (result as any)._isFallback = true;
          }
        }
      } else if (validCandidates.length === 1) {
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
      const hasPlayableStreams = currentServers.some((s: { server_data?: unknown[] }) => Array.isArray(s.server_data) && s.server_data.length > 0);
      if (!hasPlayableStreams) {
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
    // NEGATIVE CACHE (60s TTL):
    // Khi slug không tìm thấy trên cả 3 nguồn (PhimAPI, NguonC, VSMOV)
    // -> Lưu negative cache ngắn 60s để chống lãng phí quét upstream liên tục
    // ============================================================
    movieDetailMemoryCache.set(key, {
      data: null,
      expireAt: now + 60 * 1000,
      staleUntil: now + 60 * 1000,
    });
    const kvKey = `movie:detail:v4:${slug}:${source || "any"}`;
    cacheService.set(kvKey, { _isNegative: true }, 60).catch(() => {});

    return undefined;
  } catch {
    // Negative cache an toàn khi có lỗi
    movieDetailMemoryCache.set(key, {
      data: null,
      expireAt: now + 60 * 1000,
      staleUntil: now + 60 * 1000,
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

// Sử dụng React cache để khử trùng lặp giữa generateMetadata và Page Component
const cachedGetMovieDetail = cache(fetchMovieDetailInternal);

// Hàm kiểm tra chính xác loại phim (Khử hoàn toàn việc lẫn lộn phim lẻ / phim bộ / hoạt hình / tv-shows)
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
        c.includes("anime")
    );

  const isPhimBo =
    rawType === "series" ||
    rawType === "phim-bo" ||
    epTotal > 1 ||
    timeStr.includes("phút/tập") ||
    timeStr.includes("/tập") ||
    (epCurrent.includes("tập") && !epCurrent.includes("1 tập") && !epCurrent.includes("full")) ||
    catSlugs.some((c) => c.includes("phim-bo") || c.includes("phim bộ"));

  const isTvShows =
    rawType === "tvshows" ||
    rawType === "tv-shows" ||
    (rawType !== "single" &&
      item.type !== "single" &&
      (item.tmdb as { type?: string })?.type !== "movie" &&
      catSlugs.some(
        (c) =>
          c === "tv-shows" ||
          c === "tv shows" ||
          c === "chuong-trinh-truyen-hinh" ||
          c.includes("gameshow") ||
          c.includes("talkshow")
      ));

  const isChieuRap = Boolean(
    item.chieurap === true ||
      item.chieurap === "true" ||
      item.chieurap === 1 ||
      item.chieu_rap === true ||
      catSlugs.some((c) => c.includes("chieu-rap") || c.includes("chiếu rạp"))
  );

  switch (type) {
    case "phim-le":
      // Phim lẻ: Tuyệt đối KHÔNG phải hoạt hình/anime, KHÔNG phải phim bộ nhiều tập, KHÔNG phải TV Shows
      return !isHoatHinh && !isPhimBo && !isTvShows;
    case "phim-bo":
      // Phim bộ: Là phim bộ nhiều tập, không phải anime hoạt hình
      return isPhimBo && !isHoatHinh;
    case "hoat-hinh":
      // Hoạt hình & Anime
      return isHoatHinh;
    case "phim-chieu-rap":
      if (item.chieurap !== undefined || item.chieu_rap !== undefined) {
        return Boolean(item.chieurap || item.chieu_rap);
      }
      if (Array.isArray(item.category) && item.category.length > 0) {
        return isChieuRap;
      }
      return true;
    case "tv-shows":
      return isTvShows;
    default:
      return true;
  }
}

// Hàm tải nguồn phim nhanh có giới hạn timeout an toàn
async function fetchSourceData(
  baseUrl: string,
  params: MovieFilterParams,
  isSearch: boolean,
  pageOverride?: number
) {
  try {
    const page = pageOverride || params.page || 1;

    const urlParams = new URLSearchParams();
    urlParams.set("page", String(page));
    const fetchLimit = params.limit && params.limit <= 48 ? params.limit : 24;
    urlParams.set("limit", String(fetchLimit));

    if (params.category) urlParams.set("category", params.category);
    if (params.country) urlParams.set("country", params.country);
    if (params.year) urlParams.set("year", params.year);
    const effectiveSortMode = params.sort || "latest";
    if (effectiveSortMode) {
      urlParams.set(
        "sort_field",
        effectiveSortMode === "views" ? "view" : effectiveSortMode === "year" ? "year" : "modified.time"
      );
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
      // NguonC REST API Endpoints: Ưu tiên bộ lọc có phạm vi hẹp nhất (country > category > year > type)
      if (isSearch && params.keyword) {
        fullUrl = `${baseUrl}/films/search?keyword=${encodeURIComponent(params.keyword.trim())}&page=${page}`;
      } else if (params.country) {
        fullUrl = `${baseUrl}/films/quoc-gia/${params.country}?page=${page}`;
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
          // Các loại phim NguonC không hỗ trợ (phim-chieu-rap, phim-sap-chieu, phim-thuyet-minh, phim-long-tieng) -> bỏ qua để tránh 404
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

        const mappedItems = items.map(
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

        const totalItems =
          json.data?.params?.pagination?.totalItems ||
          json.pagination?.totalItems ||
          mappedItems.length ||
          0;

        const totalPages =
          json.data?.params?.pagination?.totalPages ||
          json.pagination?.totalPages ||
          Math.ceil(totalItems / fetchLimit) ||
          1;

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

    // ============================================================
    // NguonC Offset-Aligned Fetching (Đồng bộ 10 items/trang sang 24 items/trang)
    // ============================================================
    const offsetStart = (page - 1) * fetchLimit;
    const offsetEnd = page * fetchLimit;
    const startNguonCPage = Math.floor(offsetStart / 10) + 1;
    const endNguonCPage = Math.ceil(offsetEnd / 10);

    const buildNguonCUrl = (p: number) => {
      if (isSearch && params.keyword) {
        return `${baseUrl}/films/search?keyword=${encodeURIComponent(params.keyword.trim())}&page=${p}`;
      } else if (params.country) {
        return `${baseUrl}/films/quoc-gia/${params.country}?page=${p}`;
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

    // Dừng sớm ngay lập tức nếu đã biết query này chỉ có N trang và offset bắt đầu vượt quá số trang đó
    if (isMetaFresh && cachedNguonCMeta && cachedNguonCMeta.totalPages > 0 && startNguonCPage > cachedNguonCMeta.totalPages) {
      return {
        items: [],
        totalPages: Math.ceil(cachedNguonCMeta.totalItems / fetchLimit) || 1,
        totalItems: cachedNguonCMeta.totalItems,
      };
    }

    // Giới hạn trang cuối không vượt quá total_page đã biết
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fetchSingleNguonC = (p: number, u: string): Promise<any> => {
      const inFlight = inFlightNguonC.get(u);
      if (inFlight) return inFlight;

      const promise = (async () => {
        const t0 = performance.now();
        try {
          const res = await fetch(u, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
              Accept: "application/json, text/plain, */*",
              "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
            },
            next: { revalidate: 300 },
            signal: AbortSignal.timeout(NGUONC_TIMEOUT_MS),
          });
          const elapsed = Math.round(performance.now() - t0);
          if (!res.ok) {
            console.info(`[NguonC] page=${p} status=${res.status} elapsed=${elapsed}ms`);
            return null;
          }
          const json = await res.json();
          const itmCount = json?.items?.length || 0;
          const tot = json?.paginate?.total_items || itmCount;
          const totalPage = json?.paginate?.total_page || (tot ? Math.ceil(tot / 10) : 0);
          console.info(`[NguonC] page=${p} status=200 elapsed=${elapsed}ms items=${itmCount} total=${tot}`);

          // Ghi nhận metadata phân trang để các page khác cùng query không gọi vượt ngưỡng
          if (totalPage > 0 || tot > 0) {
            const current = nguonCQueryMetaCache.get(nguonCMetaKey);
            nguonCQueryMetaCache.set(nguonCMetaKey, {
              totalItems: Math.max(tot, current?.totalItems || 0),
              totalPages: Math.max(totalPage, current?.totalPages || 0),
              timestamp: Date.now(),
            });
          }
          return json;
        } catch (err) {
          const elapsed = Math.round(performance.now() - t0);
          const errType = err instanceof Error && err.name === "AbortError" ? "timeout" : "network_error";
          console.info(`[NguonC] page=${p} error=${errType} elapsed=${elapsed}ms`);
          return null;
        } finally {
          inFlightNguonC.delete(u);
        }
      })();

      inFlightNguonC.set(u, promise);
      return promise;
    };

    const nguonCSettled = await Promise.allSettled(
      pagesToFetch.map((p) => {
        const u = buildNguonCUrl(p);
        if (!u) return Promise.resolve(null);
        return fetchSingleNguonC(p, u);
      })
    );

    const nguonCResults = nguonCSettled.map((s) => (s.status === "fulfilled" ? s.value : null));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawCombined: any[] = [];
    let nguonCTotalItems = 0;
    let successfulPagesCount = 0;

    for (const r of nguonCResults) {
      if (r) {
        successfulPagesCount++;
        const itms = r.items || r.data?.items || [];
        rawCombined.push(...itms);
        if (r.paginate?.total_items) {
          nguonCTotalItems = Math.max(nguonCTotalItems, r.paginate.total_items);
        }
      }
    }

    if (successfulPagesCount === 0) {
      return null;
    }

    if (rawCombined.length === 0) {
      return {
        items: [],
        totalPages: Math.ceil(nguonCTotalItems / fetchLimit) || 1,
        totalItems: nguonCTotalItems,
      };
    }

    const chunkStartOffset = (startNguonCPage - 1) * 10;
    const sliceFrom = Math.max(0, offsetStart - chunkStartOffset);
    const sliceTo = sliceFrom + fetchLimit;
    const rawItems = rawCombined.slice(sliceFrom, sliceTo);

    // Mapping danh sách phim từ NguonC
    const mappedNguonCItems = rawItems.map((item: {
      name?: string;
      slug?: string;
      original_name?: string;
      thumb_url?: string;
      poster_url?: string;
      quality?: string;
      language?: string;
      current_episode?: string;
      time?: string;
      year?: string | number;
      [key: string]: unknown;
    }) => {
      const nguoncBackdrop = item.poster_url;
      const nguoncPoster = item.thumb_url;
      const cleanPoster = nguoncPoster || item.poster_url || "";
      const cleanThumb = nguoncBackdrop || item.thumb_url || "";

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
      }

      return {
        ...item,
        source: "nguonc",
        sources: ["nguonc"],
        name: item.name,
        slug: item.slug,
        origin_name: item.original_name || item.name,
        poster_url: cleanPoster || cleanThumb,
        thumb_url: cleanThumb || cleanPoster,
        quality: item.quality || "HD",
        lang: item.language || "Vietsub",
        episode_current: item.current_episode || "",
        year: Number(item.year) || undefined,
        time: item.time || "",
        modified: typeof item.modified === "string" ? { time: item.modified } : item.modified || (item.created ? { time: String(item.created) } : undefined),
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
    });

    const totalPages =
      Math.ceil(nguonCTotalItems / fetchLimit) ||
      1;

    return {
      items: mappedNguonCItems,
      totalPages,
      totalItems: nguonCTotalItems,
    };
  } catch {
    return null;
  }
}

// Hàm tải nguồn phim VSMOV (FIRST-CLASS CATALOG PROVIDER)
async function fetchVsmovSourceData(
  params: MovieFilterParams,
  isSearch: boolean,
  pageOverride?: number
) {
  try {
    const page = pageOverride || params.page || 1;
    const fetchLimit = params.limit && params.limit <= 48 ? params.limit : 24;
    const timeout = params.vsmovTimeoutMs || VSMOV_TIMEOUT_MS;

    const offsetStart = (page - 1) * fetchLimit;
    const offsetEnd = page * fetchLimit;
    const VSMOV_PAGE_SIZE = 20;
    const startVsmovPage = Math.floor(offsetStart / VSMOV_PAGE_SIZE) + 1;
    const endVsmovPage = Math.ceil(offsetEnd / VSMOV_PAGE_SIZE);

    const pagesToFetch: number[] = [];
    for (let p = startVsmovPage; p <= endVsmovPage; p++) {
      pagesToFetch.push(p);
    }

    const vsmovSettled = await Promise.allSettled(
      pagesToFetch.map((p) =>
        fetchVsmovFiltered(
          {
            keyword: isSearch && params.keyword ? params.keyword.trim() : undefined,
            type: params.type,
            category: params.category,
            country: params.country,
            year: params.year,
            page: p,
            limit: VSMOV_PAGE_SIZE,
          },
          timeout
        )
      )
    );

    const vsmovResults = vsmovSettled.map((s) => (s.status === "fulfilled" ? s.value : null));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawCombined: any[] = [];
    let vsmovTotalItems = 0;
    let successfulPagesCount = 0;

    for (const r of vsmovResults) {
      if (r && Array.isArray(r.items)) {
        successfulPagesCount++;
        rawCombined.push(...r.items);
        if (r.pagination?.totalItems && r.pagination.totalItems > vsmovTotalItems) {
          vsmovTotalItems = r.pagination.totalItems;
        }
      }
    }

    if (successfulPagesCount === 0 && rawCombined.length === 0) {
      return null;
    }

    const baseOffset = (startVsmovPage - 1) * VSMOV_PAGE_SIZE;
    const relStart = Math.max(0, offsetStart - baseOffset);
    const relEnd = Math.max(relStart, offsetEnd - baseOffset);
    const rawSliced = rawCombined.slice(relStart, relEnd);

    const mappedItems = rawSliced
      .map((item) => {
        const adapted = adaptVsmovMovieItem(item);
        if (!adapted) return null;
        if (params.category && (!adapted.category || adapted.category.length === 0)) {
          adapted.category = [{ name: formatGenreName(params.category) || params.category, slug: params.category }];
        }
        if (params.country && (!adapted.country || adapted.country.length === 0)) {
          adapted.country = [{ name: formatCountryName(params.country) || params.country, slug: params.country }];
        }
        return adapted;
      })
      .filter(Boolean);

    const totalItems = vsmovTotalItems || mappedItems.length || 0;
    const totalPages = Math.max(1, Math.ceil(totalItems / fetchLimit));

    return {
      items: mappedItems,
      totalPages,
      totalItems,
    };
  } catch {
    return null;
  }
}



// ============================================================
// CHUẨN HÓA ĐIỂM ĐÁNH GIÁ & KHỬ TRÙNG LẶP CATALOG
// ============================================================
import { deduplicateMovieItems, evaluateSearchRelevance, cleanNormalizedForMatch, extractMovieRatingScore, extractMovieModifiedTime, isBrokenImageUrl } from "@/lib/movieMedia";
export { deduplicateMovieItems, extractMovieRatingScore, extractMovieModifiedTime };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyMovieFilters(items: any[], params: MovieFilterParams): any[] {
  let filtered = items;

  // 1. Lọc theo Loại Phim
  if (params.type) {
    filtered = filtered.filter((item) =>
      isMovieOfType(item, params.type!)
    );
  }

  // 2. Lọc theo Quốc Gia: Khi có filter country cụ thể, KHÔNG được coi unknown/empty là match
  if (params.country) {
    const targetCountry = params.country.toLowerCase().trim();
    filtered = filtered.filter((item) => {
      if (!item.country || (Array.isArray(item.country) && item.country.length === 0)) {
        return false;
      }
      const ctryArray = Array.isArray(item.country)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? item.country.map((c: any) =>
            `${c.slug || ""} ${c.name || ""}`.toLowerCase()
          )
        : [String(item.country || "").toLowerCase()];
      return ctryArray.some((cStr: string) => cStr.includes(targetCountry));
    });
  }

  // 3. Lọc theo Thể Loại: Khi có filter category cụ thể, KHÔNG được coi unknown/empty là match
  if (params.category) {
    const targetCat = params.category.toLowerCase().trim();

    filtered = filtered.filter((item) => {
      if (!item.category || (Array.isArray(item.category) && item.category.length === 0)) {
        return false;
      }
      const catArray = Array.isArray(item.category)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? item.category.map((c: any) =>
            `${c.slug || ""} ${c.name || ""}`.toLowerCase()
          )
        : [String(item.category || "").toLowerCase()];
      return catArray.some((cStr: string) => cStr.includes(targetCat));
    });
  }

  // 4. Lọc theo Năm
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

interface QueryPaginationMeta {
  countApi1: number;
  countApi2: number;
  countApi3: number;
  totalItems: number;
  totalPages: number;
  updatedAt: number;
  seenSlugs?: Set<string>;
}
const queryMetadataCache = new Map<string, QueryPaginationMeta>();

function buildQueryMetaKey(params: MovieFilterParams): string {
  return JSON.stringify({
    skipVsmov: Boolean(params.skipVsmov),
    category: params.category || "",
    country: params.country || "",
    year: params.year || "",
    keyword: params.keyword?.trim() || "",
    limit: params.limit || 24,
    type: params.type || "",
    sort: params.sort || "latest",
  });
}

// ============================================================
// AI CANDIDATE SOURCING (FEDERATED 3 SOURCES IN PARALLEL)
// ============================================================
async function executeGetAiCandidates(params: MovieFilterParams, options?: AiCandidateOptions) {
  const isSearch = Boolean(params.keyword?.trim());
  const limit = params.limit || 24;

  // Song song cả 3 nguồn (PhimAPI + NguonC + VSMOV)
  const [resPhimApi, resNguonC, resVsmov] = await Promise.all([
    fetchSourceData(API_PHIMAPI, params, isSearch),
    fetchSourceData(API_NGUONC,   params, isSearch),
    options?.skipVsmov ? Promise.resolve(null) : fetchVsmovSourceData(params, isSearch),
  ]);

  const pItems = resPhimApi?.items || [];
  const nItems = resNguonC?.items || [];
  const vItems = resVsmov?.items || [];

  // Interleave 2:1:1 (PhimAPI : NguonC : VSMOV)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const primaryItems: any[] = [];
  let pi = 0;
  let ni = 0;
  let vi = 0;
  while (pi < pItems.length || ni < nItems.length || vi < vItems.length) {
    for (let k = 0; k < 2 && pi < pItems.length; k++) {
      primaryItems.push(pItems[pi++]);
    }
    if (ni < nItems.length) {
      primaryItems.push(nItems[ni++]);
    }
    if (vi < vItems.length) {
      primaryItems.push(vItems[vi++]);
    }
  }

  let candidates = deduplicateMovieItems(primaryItems);
  candidates = applyMovieFilters(candidates, params);

  if (isSearch && params.keyword) {
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
  const limit = params.limit || 24;
  const effectiveSort = params.sort || "latest";
  const metaKey = buildQueryMetaKey(params);
  const cachedMeta = queryMetadataCache.get(metaKey);
  const currentSeen = cachedMeta?.seenSlugs || new Set<string>();

  // ============================================================
  // CHIẾN LƯỢC FEDERATION PER-PAGE SONG SONG CHO BROWSE:
  // - Fetch song song cả 3 nguồn: PhimAPI + NguonC + VSMOV với bounded timeout (4000ms)
  // - Interleave 2:1:1
  // - Dedupe 4 cấp độ (TMDB ID, IMDb ID, slug, title+year), merge metadata & source provenance
  // - Áp dụng filter & sort
  // ============================================================
  const [resPhimApi, resNguonC, resVsmov] = await Promise.all([
    fetchSourceData(API_PHIMAPI, params, isSearch),
    fetchSourceData(API_NGUONC,   params, isSearch),
    params.skipVsmov ? Promise.resolve(null) : fetchVsmovSourceData(params, isSearch),
  ]);

  const pItems = resPhimApi?.items || [];
  const nItems = resNguonC?.items || [];
  const vItems = resVsmov?.items || [];

  // Interleave 2:1:1 (PhimAPI : NguonC : VSMOV)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const primaryItems: any[] = [];
  let pi = 0;
  let ni = 0;
  let vi = 0;
  while (pi < pItems.length || ni < nItems.length || vi < vItems.length) {
    for (let k = 0; k < 2 && pi < pItems.length; k++) {
      primaryItems.push(pItems[pi++]);
    }
    if (ni < nItems.length) {
      primaryItems.push(nItems[ni++]);
    }
    if (vi < vItems.length) {
      primaryItems.push(vItems[vi++]);
    }
  }

  let candidates = deduplicateMovieItems(primaryItems);
  candidates = applyMovieFilters(candidates, params);

  if (isSearch && params.keyword) {
    const kw = params.keyword.trim();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scored = candidates.map((m: any) => ({
      ...m,
      relevanceScore: evaluateSearchRelevance(m, kw).score,
    }));
    const hasStrong = scored.some((m) => m.relevanceScore >= 40);
    candidates = scored.filter((m) => (hasStrong ? m.relevanceScore >= 40 : m.relevanceScore > 0));

    // Với tìm kiếm, sắp xếp ưu tiên phim có điểm liên quan (relevance) cao nhất
    candidates.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

    // Khử trùng lặp giữa các trang (cross-page deduplication)
    const requestedPageNum = params.page || 1;
    if (requestedPageNum > 1 && currentSeen.size === 0) {
      try {
        const p1Key = buildMovieCacheKey({ ...params, page: 1 });
        let p1Cached = moviesMemoryCache.get(p1Key)?.data;
        if (!p1Cached) {
          p1Cached = await executeGetMovies({ ...params, page: 1 }, p1Key);
        }
        if (p1Cached?.items) {
          for (const itm of p1Cached.items) {
            if (itm?.slug) currentSeen.add(itm.slug);
          }
        }
      } catch {}
    }

    if (requestedPageNum > 1 && currentSeen.size > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      candidates = candidates.filter((m: any) => !currentSeen.has(m.slug));
    }
  } else if (effectiveSort === "rating") {
    candidates.sort((a, b) => {
      const { rating: rateA, voteCount: vcA } = extractMovieRatingScore(a);
      const { rating: rateB, voteCount: vcB } = extractMovieRatingScore(b);

      // 1. Phim có điểm thực tế xếp trên phim không có điểm (hoặc điểm = 0)
      if (rateB !== rateA) {
        return rateB - rateA;
      }
      // 2. Tie-break: Phim có lượt vote tin cậy / nhiều hơn xếp trên
      if (vcB !== vcA) {
        return vcB - vcA;
      }
      // 3. Tie-break phụ: Năm phát hành mới hơn xếp trên
      const yearA = Number(a.year || 0);
      const yearB = Number(b.year || 0);
      if (yearB !== yearA) {
        return yearB - yearA;
      }
      // 4. Tie-break ổn định: Tiêu đề phim (alphabetical) để thứ tự không phụ thuộc nguồn
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  } else if (effectiveSort === "year") {
    candidates.sort((a, b) => {
      const yearA = Number(a.year || 0);
      const yearB = Number(b.year || 0);
      if (yearB !== yearA) return yearB - yearA;
      return extractMovieModifiedTime(b) - extractMovieModifiedTime(a);
    });
  } else if (effectiveSort === "views") {
    candidates.sort((a, b) => {
      const vA = Number(a.view || a.tmdb?.vote_count || 0);
      const vB = Number(b.view || b.tmdb?.vote_count || 0);
      if (vB !== vA) return vB - vA;
      return extractMovieModifiedTime(b) - extractMovieModifiedTime(a);
    });
  } else {
    // "latest" (Mặc định toàn hệ thống): Sắp xếp theo timestamp cập nhật thực tế từ nguồn dữ liệu
    candidates.sort((a, b) => {
      const timeA = extractMovieModifiedTime(a);
      const timeB = extractMovieModifiedTime(b);
      if (timeB !== timeA) {
        return timeB - timeA;
      }
      // Tie-break: Năm phát hành mới hơn xếp trước
      const yearA = Number(a.year || 0);
      const yearB = Number(b.year || 0);
      if (yearB !== yearA) {
        return yearB - yearA;
      }
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }

  // ============================================================
  // TÍNH TỔNG SỐ PHIM VÀ TRANG (FEDERATION THỰC TẾ & BẢO ĐẢM NHẤT QUÁN TOÀN HỆ THỐNG)
  // ============================================================
  let countApi1 = resPhimApi?.totalItems || 0;
  let countApi2 = resNguonC?.totalItems   || 0;
  let countApi3 = resVsmov?.totalItems    || 0;

  // Nếu một nguồn bị lỗi/timeout hoặc vượt quá số trang riêng của nguồn đó (trả về 0),
  // kế thừa giá trị count đã biết từ queryMetadataCache để tránh sụt giảm totalItems giữa các trang.
  if (countApi1 === 0 && cachedMeta?.countApi1) countApi1 = cachedMeta.countApi1;
  if (countApi2 === 0 && cachedMeta?.countApi2) countApi2 = cachedMeta.countApi2;
  if (countApi3 === 0 && cachedMeta?.countApi3) countApi3 = cachedMeta.countApi3;

  const activeFiltersCount =
    (params.type ? 1 : 0) +
    (params.category ? 1 : 0) +
    (params.country ? 1 : 0) +
    (params.year ? 1 : 0);

  let totalItemsCount: number;

  if (activeFiltersCount >= 2) {
    // KHI CÓ TỪ 2 BỘ LỌC TRỞ LÊN (VD: type + country hoặc category + year):
    // PhimAPI và VSMOV hỗ trợ filter server-side đa chiều, NguonC chỉ lọc 1 chiều.
    // Lấy count lớn nhất từ các nguồn hỗ trợ compound filter.
    const compoundCounts = [countApi1, countApi3].filter((c) => c > 0);
    totalItemsCount = compoundCounts.length > 0 ? Math.max(...compoundCounts) : (countApi2 || candidates.length);
  } else {
    // BỘ LỌC ĐƠN LẺ (Type / Country / Category / Year) HOẶC TÌM KIẾM KEYWORD HOẶC MẶC ĐỊNH:
    // Các nguồn đều hỗ trợ endpoint tương ứng và được query song song theo cùng virtual page offset.
    // KHÔNG cộng dồn hư cấu (fictitious summing); độ sâu phân trang khả dụng được xác định bởi
    // catalog lớn nhất trong các provider hợp lệ, bảo đảm trang cuối cùng luôn có phim.
    const availableCounts = [countApi1, countApi2, countApi3].filter((c) => c > 0);
    totalItemsCount = availableCounts.length > 0 ? Math.max(...availableCounts) : candidates.length;
  }

  // Bảo đảm tính bất biến/đơn điệu của totalItems cho cùng query giữa các trang khác nhau
  if (cachedMeta?.totalItems && cachedMeta.totalItems > totalItemsCount) {
    totalItemsCount = cachedMeta.totalItems;
  }

  const maxTotalPages = Math.max(1, Math.ceil(totalItemsCount / limit));
  const requestedPage = params.page || 1;
  let finalItems = (maxTotalPages > 0 && requestedPage > maxTotalPages) ? [] : candidates.slice(0, limit);

  // Tự động bù đắp (top-up) nếu sau khi lọc/dedupe trang bị khuyết dưới target limit
  if (finalItems.length < limit && requestedPage < maxTotalPages && !isSearch) {
    try {
      const topUpRes = await fetchSourceData(API_PHIMAPI, params, isSearch, requestedPage + 1);
      if (topUpRes?.items && topUpRes.items.length > 0) {
        const existingSlugs = new Set(candidates.map((c) => c.slug));
        const filteredTopUp = applyMovieFilters(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          topUpRes.items.filter((item: any) => item?.slug && !existingSlugs.has(item.slug)),
          params
        );
        for (const item of filteredTopUp) {
          if (finalItems.length >= limit) break;
          existingSlugs.add(item.slug);
          candidates.push(item);
          finalItems.push(item);
        }
      }
    } catch {}
  }

  // Bảo đảm an toàn tuyệt đối cho trang cuối: không bao giờ trả về [] nếu totalItemsCount > 0
  if (requestedPage === maxTotalPages && finalItems.length === 0 && totalItemsCount > 0) {
    if (candidates.length > 0) {
      finalItems = candidates.slice(0, Math.min(limit, candidates.length));
    } else {
      try {
        const fallbackPage = Math.max(1, Math.min(requestedPage - 1, Math.floor((countApi1 || totalItemsCount) / limit)));
        const fallbackRes = await fetchSourceData(API_PHIMAPI, params, isSearch, fallbackPage);
        if (fallbackRes?.items && fallbackRes.items.length > 0) {
          finalItems = fallbackRes.items.slice(0, limit);
        }
      } catch {}
    }
  }

  // SERVER-SIDE POSTER ENRICHMENT (Ưu tiên tuyệt đối nguồn TMDb siêu tốc image.tmdb.org):
  // Duyệt qua các phim trong trang trả về:
  // 1. Phim có tmdb.id: Luôn nâng cấp sang poster TMDb chính hãng (50ms, chuẩn tỉ lệ 2:3, không bao giờ bị nghẽn)
  // 2. Phim bị mất ảnh/hỏng ảnh/upload/vod: Tra cứu TMDb theo tên để đắp ảnh thay thế
  await Promise.allSettled(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    finalItems.map(async (item: any) => {
      // 1. Ưu tiên tuyệt đối: Nếu có TMDB ID, luôn lấy poster chuẩn sắc nét, siêu nhanh từ TMDb CDN
      if (item.tmdb?.id) {
        try {
          const p = await getTmdbPosterUrl(item.tmdb.id, item.type);
          if (p) {
            item.poster_url = p;
            if (isBrokenImageUrl(item.thumb_url)) item.thumb_url = p;
            return;
          }
        } catch {}
      }

      // 2. Bắt buộc tra cứu TMDb nếu chưa có poster TMDb (đặc biệt là link phimimg dễ bị nhà mạng VN chặn)
      const isNonTmdb =
        !item.poster_url ||
        !item.poster_url.includes("image.tmdb.org") ||
        item.poster_url.includes("phimimg.com");
      const needsTmdbPoster = isNonTmdb || isBrokenImageUrl(item.poster_url);
      if (needsTmdbPoster) {
        const queryCandidates = [
          item.origin_name && item.origin_name !== item.name ? item.origin_name : null,
          item.name,
          item.slug ? item.slug.replace(/-/g, " ") : null,
        ].filter(Boolean);

        // TẦNG 1 (Chính): TMDb Multi Search (Bao quát 90% mọi thể loại từ phim bộ, phim lẻ đến hoạt hình)
        let foundPoster = false;
        for (const query of queryCandidates) {
          try {
            const res = await searchTmdbPosterByTitle(query as string, item.year, item.type);
            if (res?.posterUrl) {
              item.poster_url = res.posterUrl;
              if (isBrokenImageUrl(item.thumb_url) || !item.thumb_url?.includes("image.tmdb.org")) {
                item.thumb_url = res.backdropUrl || res.posterUrl;
              }
              foundPoster = true;
              break;
            }
          } catch {}
        }

        // TẦNG 2 (Dự phòng cho Hoạt hình): AniList GraphQL (Miễn phí, không cần key, chuyên trị 10% anime/donghua còn lại)
        if (!foundPoster) {
          const isAnimeOrAnimation =
            item.type === "hoathinh" ||
            item.type === "hoat-hinh" ||
            item.category?.some(
              (c: { slug?: string; name?: string }) => c.slug === "hoat-hinh" || c.name?.toLowerCase().includes("hoạt hình")
            );

          if (isAnimeOrAnimation) {
            try {
              const aniRes = await searchAniListPoster(
                item.name,
                item.origin_name,
                item.alternative_names
              );
              if (aniRes?.posterUrl) {
                item.poster_url = aniRes.posterUrl;
                if (isBrokenImageUrl(item.thumb_url) || !item.thumb_url?.includes("anilist.co")) {
                  item.thumb_url = aniRes.backdropUrl || aniRes.posterUrl;
                }
                foundPoster = true;
              }
            } catch {}
          }
        }

        // TẦNG 3: Nếu TMDb và AniList không có, giữ nguyên ảnh gốc hợp lệ của phim; chỉ fallback khi link hoàn toàn rỗng hoặc hỏng
        if (!foundPoster && (!item.poster_url || isBrokenImageUrl(item.poster_url))) {
          if (item.thumb_url && !isBrokenImageUrl(item.thumb_url)) {
            item.poster_url = item.thumb_url;
          } else {
            item.poster_url = "/default-poster.jpg";
          }
        }


      }
    })
  );

  const payload = {
    status: true,
    items: finalItems,
    pagination: {
      currentPage: requestedPage,
      totalPages: maxTotalPages,
      totalItems: totalItemsCount,
    },
  };

  const isDegraded = resPhimApi === null || resNguonC === null || resVsmov === null;
  const now = Date.now();
  // Nếu bị degraded (1 trong các nguồn bị timeout/lỗi), chỉ lưu RAM ngắn hạn (15s) thay vì 300s để request sau phục hồi trọn vẹn
  const freshTtl = isDegraded ? 15 * 1000 : 300 * 1000;
  const staleTtl = isDegraded ? 30 * 1000 : 1800 * 1000;

  if (isSearch && finalItems.length > 0) {
    for (const itm of finalItems) {
      if (itm?.slug) currentSeen.add(itm.slug);
    }
  }

  queryMetadataCache.set(metaKey, {
    seenSlugs: currentSeen,
    countApi1: Math.max(countApi1, cachedMeta?.countApi1 || 0),
    countApi2: Math.max(countApi2, cachedMeta?.countApi2 || 0),
    countApi3: Math.max(countApi3, cachedMeta?.countApi3 || 0),
    totalItems: totalItemsCount,
    totalPages: maxTotalPages,
    updatedAt: Date.now(),
  });

  moviesMemoryCache.set(cacheKey, {
    data: payload,
    expireAt: now + freshTtl,
    staleUntil: now + staleTtl,
  });

  return payload;
}



export function buildMovieCacheKey(params: MovieFilterParams): string {
  return JSON.stringify({
    v: 16,
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

const PRIORITY_WARMUP_COMBINATIONS: MovieFilterParams[] = [
  { type: "phim-le" },
  { type: "phim-bo" },
  { type: "phim-le", country: "han-quoc" },
  { type: "phim-le", country: "hong-kong" },
  { type: "phim-le", country: "viet-nam" },
  { type: "phim-bo", country: "han-quoc" },
  { type: "phim-chieu-rap" },
  { type: "hoat-hinh" },
];

let hasWarmedUp = false;
function warmUpTopCategories() {
  // Vô hiệu hóa: Loại bỏ request storm và tiêu thụ Redis bandwidth khi idle
  return;
  if (hasWarmedUp) return;
  hasWarmedUp = true;
  const isTest =
    process.env.NODE_ENV === "test" ||
    process.argv.some((a) => a.includes("--test") || a.includes(".test.ts"));
  if (isTest) return;

  // Background non-blocking execution với Concurrency = 2
  setTimeout(async () => {
    try {
      const now = Date.now();
      // Chỉ nạp các combination chưa có trong cache hoặc đã hết hạn tươi
      const needed = PRIORITY_WARMUP_COMBINATIONS.filter((comb) => {
        const key = buildMovieCacheKey({ ...comb, limit: 24, page: 1 });
        const entry = moviesMemoryCache.get(key);
        return !entry || entry.expireAt <= now;
      });

      // Chạy theo nhóm 2 requests (Chunking) để tránh request storm lên upstream providers
      const CHUNK_SIZE = 2;
      for (let i = 0; i < needed.length; i += CHUNK_SIZE) {
        const batch = needed.slice(i, i + CHUNK_SIZE);
        await Promise.all(
          batch.map(async (comb) => {
            try {
              await movieApi.getMovies({ ...comb, limit: 24, page: 1 });
            } catch {
              // Bỏ qua lỗi ngầm để đảm bảo tính cô lập
            }
          })
        );
        // Nghỉ 100ms giữa các chunk
        if (i + CHUNK_SIZE < needed.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      // Kích hoạt Ingestion VSMOV catalog feed chạy ngầm (Non-blocking)
      performVsmovCatalogIngestion().catch(() => {});
    } catch {
      // Safe fallback
    }
  }, 200);
}

export const DEFAULT_GENRES = [
  { name: "Hành Động", slug: "hanh-dong" },
  { name: "Tình Cảm", slug: "tinh-cam" },
  { name: "Cổ Trang", slug: "co-trang" },
  { name: "Tâm Lý", slug: "tam-ly" },
  { name: "Hài Hước", slug: "hai-huoc" },
  { name: "Hoạt Hình", slug: "hoat-hinh" },
  { name: "Kinh Dị", slug: "kinh-di" },
  { name: "Viễn Tưởng", slug: "vien-tuong" },
  { name: "Võ Thuật", slug: "vo-thuat" },
  { name: "Phiêu Lưu", slug: "phieu-luu" },
  { name: "Hình Sự", slug: "hinh-su" },
  { name: "Chiến Tranh", slug: "chien-tranh" },
  { name: "Tài Liệu", slug: "tai-lieu" },
  { name: "Bí Ẩn", slug: "bi-an" },
  { name: "Học Đường", slug: "hoc-duong" },
  { name: "Gia Đình", slug: "gia-dinh" },
  { name: "Âm Nhạc", slug: "am-nhac" },
  { name: "Thể Thao", slug: "the-thao" },
  { name: "Khoa Học", slug: "khoa-hoc" },
  { name: "Thần Thoại", slug: "than-thoai" },
];

export const DEFAULT_COUNTRIES = [
  { name: "Việt Nam", slug: "viet-nam" },
  { name: "Trung Quốc", slug: "trung-quoc" },
  { name: "Hàn Quốc", slug: "han-quoc" },
  { name: "Nhật Bản", slug: "nhat-ban" },
  { name: "Thái Lan", slug: "thai-lan" },
  { name: "Âu Mỹ", slug: "au-my" },
  { name: "Đài Loan", slug: "dai-loan" },
  { name: "Hồng Kông", slug: "hong-kong" },
  { name: "Ấn Độ", slug: "an-do" },
  { name: "Anh", slug: "anh" },
  { name: "Pháp", slug: "phap" },
  { name: "Canada", slug: "canada" },
  { name: "Đức", slug: "duc" },
  { name: "Tây Ban Nha", slug: "tay-ban-nha" },
  { name: "Thổ Nhĩ Kỳ", slug: "tho-nhi-ky" },
  { name: "Nga", slug: "nga" },
  { name: "Úc", slug: "uc" },
];


function sanitizeMovieImages<T>(data: T): T {
  return data;
}

export const movieApi = {
  // ==========================================
  // 1. LẤY DANH SÁCH PHIM (STALE-WHILE-REVALIDATE 0MS)
  // ==========================================
  getMovies: async (params: MovieFilterParams = {}) => {
    // Kích hoạt nạp sẵn dữ liệu các danh mục chính trong nền
    if (!hasWarmedUp) {
      warmUpTopCategories();
    }

    const cacheKey = buildMovieCacheKey(params);

    const now = Date.now();
    if (moviesMemoryCache.has(cacheKey)) {
      const entry = moviesMemoryCache.get(cacheKey)!;
      // Trả về dữ liệu ngay lập tức nếu cache còn tươi
      if (entry.expireAt > now) {
        return sanitizeMovieImages(entry.data);
      }
      // Nếu hết hạn tươi nhưng vẫn trong hạn stale -> trả về ngay lập tức (0ms) và revalidate ngầm!
      if (entry.staleUntil > now) {
        executeGetMovies(params, cacheKey).catch(() => {});
        return sanitizeMovieImages(entry.data);
      }
    }

    // Nếu yêu cầu bỏ qua KV (như search suggestions limit: 8), chỉ thực thi fetcher & cache vào RAM
    if (params.skipKvCache) {
      const res = await executeGetMovies(params, cacheKey);
      return sanitizeMovieImages(res);
    }

    const kvKey = `movie:list:${cacheKey}`;
    const ttlSeconds = params.keyword ? 86400 : 7200; // 1 ngày cho search, 2 giờ cho list

    let res = await cacheService.get<Awaited<ReturnType<typeof executeGetMovies>>>(kvKey);

    // Chống nhiễm độc Cache: Nếu cache trả về mảng rỗng cho filter danh mục/quốc gia/loại phim,
    // coi như cache miss, xóa key hỏng và fetch dữ liệu mới!
    if (res && (!Array.isArray(res.items) || (res.items.length === 0 && !params.keyword))) {
      cacheService.delete(kvKey).catch(() => {});
      res = null;
    }

    if (!res) {
      res = await executeGetMovies(params, cacheKey);
      if (res && Array.isArray(res.items) && res.items.length > 0) {
        cacheService.set(kvKey, res, ttlSeconds).catch(() => {});
      }
    }
    return sanitizeMovieImages(res);
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
  getMovieDetail: async (...args: Parameters<typeof cachedGetMovieDetail>) => {
    const res = await cachedGetMovieDetail(...args);
    return sanitizeMovieImages(res);
  },
  getEpisodeStream: async (
    slug: string,
    episodeSlug: string,
    serverName?: string,
    source?: "nguonc" | "ophim" | "vsmov"
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
  // 5. TRUY VẤN ỨNG VIÊN CHO AI CONCIERGE & ROULETTE (FAST PHIMAPI + NGUONC, VSMOV CHỈ FALLBACK KHI THIẾU)
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
      skipV: options?.skipVsmov || false,
    });

    const now = Date.now();
    if (moviesMemoryCache.has(cacheKey)) {
      const entry = moviesMemoryCache.get(cacheKey)!;
      if (entry.expireAt > now) {
        return entry.data;
      }
      if (entry.staleUntil > now) {
        executeGetAiCandidates(params, options).catch(() => {});
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
