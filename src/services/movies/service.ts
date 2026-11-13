import { cache } from "react";
import { cleanHtmlText } from "@/lib/cleanHtml";
import { cacheService } from "@/lib/cache";
import { findEpisodeMatch, formatEpisodeName } from "@/lib/formatEpisode";
import { formatGenreName, formatCountryName, getCanonicalGenreSlug, getCanonicalCountrySlug } from "@/lib/movieMedia";
import { enrichMovieListPosters } from "@/services/movies/posterEnrichment";
import {
  NGUONC_GENRE_MAP,
  DEFAULT_GENRES,
  DEFAULT_COUNTRIES,
} from "@/data/movies/taxonomy";

export { DEFAULT_GENRES, DEFAULT_COUNTRIES };

const API_NGUONC = process.env.NEXT_PUBLIC_API_URL || "https://phim.nguonc.com/api";
const API_PHIMAPI = process.env.NEXT_PUBLIC_API_URL_2 || "https://phimapi.com";

const PHIMAPI_TIMEOUT_MS = 6000;
const PHIMAPI_SEARCH_TIMEOUT_MS = 4000;
const NGUONC_TIMEOUT_MS = 7500;

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

// In-flight deduplication để tránh gọi lặp cùng 1 trang NguonC (đặc biệt các trang giao thoa như page 5, page 10)
interface NguonCPageResponse {
  items?: Record<string, unknown>[];
  data?: { items?: Record<string, unknown>[] };
  paginate?: { total_items?: number; total_page?: number };
}

const inFlightNguonC = new Map<string, Promise<NguonCPageResponse | null>>();

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
  posterEnrichmentBudgetMs?: number;
}

export interface AiCandidateOptions {
  minCandidates?: number;
}

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

function getNormalizedStreamUrls(srv: { server_data?: Array<{ link_m3u8?: string; link_embed?: string }> }): string[] {
  const urls: string[] = [];
  for (const ep of srv?.server_data || []) {
    const m3u8 = String(ep?.link_m3u8 || "").trim().toLowerCase();
    const embed = String(ep?.link_embed || "").trim().toLowerCase();
    if (m3u8) urls.push(m3u8);
    if (embed) urls.push(embed);
  }
  return urls;
}

function hasDistinctStream(
  srv: { server_data?: Array<{ link_m3u8?: string; link_embed?: string }> },
  seenUrls: Set<string>,
): boolean {
  const urls = getNormalizedStreamUrls(srv);
  if (urls.length === 0) return false;
  return urls.some((u) => !seenUrls.has(u));
}

function registerServerStreamUrls(
  srv: { server_data?: Array<{ link_m3u8?: string; link_embed?: string }> },
  seenUrls: Set<string>,
): void {
  for (const u of getNormalizedStreamUrls(srv)) {
    seenUrls.add(u);
  }
}

/**
 * Lọc, khử trùng lặp và chuẩn hóa tối đa 4 server (Lồng Tiếng, Thuyết Minh, Vietsub, Dự phòng):
 * - Mỗi nhóm âm thanh giữ bản tốt nhất (.m3u8 > embed-only, nhiều tập hơn)
 * - Giữ tách bạch cả Thuyết Minh và Vietsub nếu cả hai đều có nguồn phát khác nhau
 * - Cho phép giữ thêm server .m3u8 dự phòng (khác hoàn toàn stream URL) và chống tuyệt đối trùng lặp
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function filterDualServers(rawServers: any[]): any[] {
  if (!Array.isArray(rawServers) || rawServers.length === 0) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cleanedServers: any[] = [];
  for (const srv of rawServers) {
    if (!srv || !Array.isArray(srv.server_data) || srv.server_data.length === 0) continue;
    const sName = String(srv.server_name || "").trim();
    if (sName.toLowerCase().includes("vsmov")) continue;

    // Loại bỏ các tập có nguồn vsmov bị hỏng, giữ nguyên phần còn lại
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const validEpisodes = srv.server_data.filter((e: any) => {
      const u = `${e?.link_embed || ""} ${e?.link_m3u8 || ""}`.toLowerCase();
      return !u.includes("vsmov") && !u.includes("streamvsmov");
    });
    if (validEpisodes.length === 0) continue;

    cleanedServers.push({
      ...srv,
      server_name: sName || "Server",
      server_data: validEpisodes,
    });
  }

  if (cleanedServers.length === 0) return [];

  type Category = "long_tieng" | "thuyet_minh" | "vietsub" | "other";
  const classifyServer = (name: string): Category => {
    const lower = name.toLowerCase();
    if (lower.includes("lồng tiếng") || lower.includes("long tieng") || lower.includes("dub")) {
      return "long_tieng";
    }
    if (lower.includes("thuyết minh") || lower.includes("thuyet minh") || lower.includes("voiceover")) {
      return "thuyet_minh";
    }
    if (lower.includes("vietsub") || lower.includes("phụ đề") || lower.includes("sub")) {
      return "vietsub";
    }
    return "other";
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const byCategory: Record<Category, any[]> = {
    long_tieng: [],
    thuyet_minh: [],
    vietsub: [],
    other: [],
  };

  for (const srv of cleanedServers) {
    byCategory[classifyServer(srv.server_name)].push(srv);
  }

  // Chọn bản tốt nhất trong từng nhóm
  const pickBest = (list: typeof cleanedServers) => {
    let best = null;
    for (const candidate of list) {
      if (isBetterServerCandidate(candidate, best)) {
        best = candidate;
      }
    }
    return best;
  };

  const bestLongTieng = pickBest(byCategory.long_tieng);
  const bestThuyetMinh = pickBest(byCategory.thuyet_minh);
  const bestVietsub = pickBest(byCategory.vietsub);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any[] = [];
  const seenUrls = new Set<string>();
  const usedNames = new Set<string>();

  const pushUnique = (srv: typeof cleanedServers[number] | null, targetName: string) => {
    if (!srv) return false;
    if (!hasDistinctStream(srv, seenUrls)) return false;
    const finalName = usedNames.has(targetName.toLowerCase()) ? `${targetName} (Dự phòng)` : targetName;
    if (usedNames.has(finalName.toLowerCase())) return false;
    usedNames.add(finalName.toLowerCase());
    registerServerStreamUrls(srv, seenUrls);
    result.push({ ...srv, server_name: finalName });
    return true;
  };

  if (bestLongTieng) {
    pushUnique(bestLongTieng, "Lồng Tiếng");
  }
  if (bestThuyetMinh && bestVietsub) {
    // Khi có cả Thuyết Minh và Vietsub khác nguồn -> giữ tách bạch cả 2
    pushUnique(bestThuyetMinh, "Thuyết Minh");
    pushUnique(bestVietsub, "Vietsub");
  } else if (bestThuyetMinh) {
    pushUnique(bestThuyetMinh, "Thuyết Minh");
  } else if (bestVietsub) {
    // Bảo toàn quy ước slot 2 "Thuyết Minh" khi chỉ có Vietsub (khớp các test & UI hiện tại)
    pushUnique(bestVietsub, "Thuyết Minh");
  }

  // Fallback nếu nguồn phim không đặt tên chuẩn (otherServers)
  const sortedOthers = [...byCategory.other].sort((a, b) => (isBetterServerCandidate(a, b) ? -1 : 1));
  for (const srv of sortedOthers) {
    if (result.length >= 3) break;
    const defaultLabel =
      !usedNames.has("lồng tiếng")
        ? "Lồng Tiếng"
        : !usedNames.has("thuyết minh")
        ? "Thuyết Minh"
        : srv.server_name || "Dự phòng";
    pushUnique(srv, defaultLabel);
  }

  // Bổ sung tối đa 1 server Dự phòng thực sự hữu ích (ưu tiên server có .m3u8 khác CDN, không thêm clone embed yếu nếu cùng nhóm đã có .m3u8)
  const MAX_SERVERS = 4;
  if (result.length < MAX_SERVERS) {
    const backupPool = [
      ...byCategory.long_tieng,
      ...byCategory.thuyet_minh,
      ...byCategory.vietsub,
      ...sortedOthers,
    ]
      .filter((cand) => {
        if (!hasDistinctStream(cand, seenUrls)) return false;
        const cat = classifyServer(cand.server_name);
        const primaryForCat =
          cat === "long_tieng"
            ? bestLongTieng
            : cat === "thuyet_minh"
            ? bestThuyetMinh
            : cat === "vietsub"
            ? bestVietsub
            : null;
        // Nếu cùng loại âm thanh đã có .m3u8 mà ứng viên này chỉ là embed -> bỏ qua tránh rác/trùng
        if (primaryForCat && serverHasM3u8(primaryForCat) && !serverHasM3u8(cand)) {
          return false;
        }
        return serverHasM3u8(cand) || result.every((r) => !serverHasM3u8(r));
      })
      .sort((a, b) => (isBetterServerCandidate(a, b) ? -1 : 1));

    if (backupPool.length > 0) {
      pushUnique(backupPool[0], "Dự phòng");
    }
  }

  // Đảm bảo server có luồng trực tiếp .m3u8 luôn đứng trước server chỉ có embed (mặc định phát mượt ngay khi mở phim)
  result.sort((a, b) => {
    const aM3u8 = serverHasM3u8(a) ? 1 : 0;
    const bM3u8 = serverHasM3u8(b) ? 1 : 0;
    return bM3u8 - aM3u8;
  });

  // Backfill luồng m3u8 trực tiếp từ các server CÙNG NHÓM ÂM THANH (tránh chép nhầm audio Thuyết Minh sang Vietsub/Lồng Tiếng)
  for (const selected of result) {
    const selectedCat = classifyServer(selected.server_name);
    for (const ep of selected.server_data || []) {
      if (!ep.link_m3u8) {
        for (const candidate of cleanedServers) {
          const candCat = classifyServer(candidate.server_name);
          if (selectedCat !== "other" && candCat !== "other" && candCat !== selectedCat) {
            continue;
          }
          const match = (findEpisodeMatch(candidate?.server_data || [], ep.slug) || findEpisodeMatch(candidate?.server_data || [], ep.name)) as { link_m3u8?: string; link_embed?: string } | undefined;
          if (match?.link_m3u8) {
            ep.link_m3u8 = match.link_m3u8;
            if (!ep.link_embed || ep.link_embed.includes("streamc")) {
              ep.link_embed = match.link_embed || ep.link_embed;
            }
            break;
          }
        }
      }
    }
  }

  // Khử trùng lặp lần cuối sau backfill: không để 2 server có tập stream y hệt nhau
  const finalServers: typeof result = [];
  const finalSeenUrls = new Set<string>();
  for (const srv of result) {
    if (!hasDistinctStream(srv, finalSeenUrls)) continue;
    registerServerStreamUrls(srv, finalSeenUrls);
    finalServers.push(srv);
  }

  return finalServers.slice(0, MAX_SERVERS);
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
      const epName = String(ep.name || "").trim();
      const formattedName = formatEpisodeName(epName, "Tập 1");
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
      registerServerStreamUrls(s, primaryStreamUrls);
    }

    const existingNames = new Set(
      primaryEpisodes.map((s: { server_name?: string }) => (s.server_name || "").trim().toLowerCase())
    );

    for (const s of secondaryEpContainer) {
      if (!s || !Array.isArray(s.server_data) || s.server_data.length === 0) continue;

      if (hasDistinctStream(s, primaryStreamUrls)) {
        let targetName = (s.server_name || "Dự phòng").trim();
        if (existingNames.has(targetName.toLowerCase())) {
          targetName = `${targetName} (Dự phòng)`;
        }
        if (existingNames.has(targetName.toLowerCase())) {
          targetName = `${targetName} #2`;
        }
        existingNames.add(targetName.toLowerCase());
        registerServerStreamUrls(s, primaryStreamUrls);

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

    const targetName = String(m.name || m.title || "").trim();
    const targetOrig = String(m.origin_name || "").trim();
    if (!targetName && !targetOrig) return;

    const cleanTargetName = cleanNormalizedForMatch(targetName);
    const cleanTargetOrig = cleanNormalizedForMatch(targetOrig);

    const targetYear = m.year ? Number(m.year) : undefined;
    const afterColonName = targetName.includes(":")
      ? targetName.split(":").slice(1).join(":").trim()
      : "";
    const cleanAfterColon = afterColonName ? cleanNormalizedForMatch(afterColonName) : "";
    const searchCandidates = Array.from(
      new Set([targetName, afterColonName, targetOrig].map((s) => s.trim()).filter(Boolean))
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const discoveryPromises: Promise<any>[] = [];

    // 1. Khám phá NguonC nếu chưa có
    if (!hasNguonC) {
      discoveryPromises.push((async () => {
        try {
          for (const query of searchCandidates) {
            const res = await fetch(`${API_NGUONC}/films/search?keyword=${encodeURIComponent(query)}&page=1`, {
              headers: DEFAULT_FETCH_HEADERS,
              next: { revalidate: 600 },
              signal: AbortSignal.timeout(4000),
            });
            if (!res.ok) continue;
            const json = await res.json();
            const items = json?.items || [];
            for (const itm of items) {
              const cn = cleanNormalizedForMatch(itm.name || "");
              const co = cleanNormalizedForMatch(itm.original_name || "");
              const sameYearOrMissing = !targetYear || !itm.year || Number(itm.year) === targetYear;
              const matched =
                (cleanTargetName && (cn === cleanTargetName || co === cleanTargetName)) ||
                (cleanTargetOrig && (cn === cleanTargetOrig || co === cleanTargetOrig)) ||
                (cleanAfterColon && (cn === cleanAfterColon || co === cleanAfterColon) && sameYearOrMissing);
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
          }
        } catch {}
        return null;
      })());
    }

    // 2. Khám phá PhimAPI nếu chưa có
    if (!hasPhimApi) {
      discoveryPromises.push((async () => {
        try {
          for (const query of searchCandidates) {
            const res = await fetch(`${API_PHIMAPI}/v1/api/tim-kiem?keyword=${encodeURIComponent(query)}&limit=10`, {
              headers: DEFAULT_FETCH_HEADERS,
              next: { revalidate: 600 },
              signal: AbortSignal.timeout(4000),
            });
            if (!res.ok) continue;
            const json = await res.json();
            const items = json?.data?.items || json?.items || [];
            for (const itm of items) {
              const cn = cleanNormalizedForMatch(itm.name || "");
              const co = cleanNormalizedForMatch(itm.origin_name || "");
              const sameYearOrMissing = !targetYear || !itm.year || Number(itm.year) === targetYear;
              const matched =
                (cleanTargetName && (cn === cleanTargetName || co === cleanTargetName)) ||
                (cleanTargetOrig && (cn === cleanTargetOrig || co === cleanTargetOrig)) ||
                (cleanAfterColon && (cn === cleanAfterColon || co === cleanAfterColon) && sameYearOrMissing);
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
const inFlightStreams = new Map<string, Promise<EpisodeStreamResult[]>>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const inFlightGetMovies = new Map<string, Promise<any>>();

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
      revalidateMovieDetail(slug, source, localKey).catch(() => {});
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

        // Nếu bản ghi trong Redis hoàn toàn không có stream .m3u8 nào (chỉ có embed iframe bên ngoài),
        // hủy bỏ dữ liệu cũ để fetch nguồn trực tiếp từ upstream có direct m3u8
        const hasDirectM3u8 = Array.isArray(data.episodes) && data.episodes.some(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (s: any) => Array.isArray(s.server_data) && s.server_data.some((e: any) => e.link_m3u8 && String(e.link_m3u8).includes(".m3u8"))
        );
        if (!hasDirectM3u8) {
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



export async function getEpisodeStream(
  slug: string,
  episodeSlug: string,
  serverName?: string,
  source?: "nguonc" | "ophim"
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

  // 2. Kiểm tra L2 Redis Cache cho tập và server cụ thể (~200 bytes) với Single-Flight Mutex
  const streamKvKey = `movie:stream:v4:${slug}:${serverKey}:${normEp}`;
  const existingStreamTask = inFlightStreams.get(streamKvKey);
  if (existingStreamTask) {
    return await existingStreamTask;
  }

  const streamTask = (async (): Promise<EpisodeStreamResult[]> => {
    try {
      const cachedStreams = await cacheService.get<EpisodeStreamResult[]>(streamKvKey);
      if (cachedStreams && Array.isArray(cachedStreams) && cachedStreams.length > 0) {
        return cachedStreams;
      }

      // 3. Nạp nguồn trực tiếp từ upstream và lưu cache riêng cho tập này (~200 bytes, KHÔNG đọc payload 1.33MB)
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
            const embedStr = match.link_embed || "";
            const m3u8Str = match.link_m3u8 || "";
            if (embedStr.includes("vsmov") || m3u8Str.includes("vsmov") || embedStr.includes("streamvsmov")) {
              continue;
            }
            streams.push({
              server_name: srv.server_name || "Server",
              link_embed: embedStr,
              link_m3u8: m3u8Str,
            });
          }
        }
        if (streams.length > 0) {
          cacheService.set(streamKvKey, streams, 7 * 86400).catch(() => {});
          return streams;
        }
      }
      return [];
    } catch {
      return [];
    } finally {
      inFlightStreams.delete(streamKvKey);
    }
  })();

  inFlightStreams.set(streamKvKey, streamTask);
  return await streamTask;
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

async function revalidateMovieDetail(slug: string, source?: "nguonc" | "ophim", cacheKey?: string) {
  try {
    await fetchAndCacheMovieDetail(slug, source, cacheKey || `${slug}_${source || "any"}`);
  } catch {}
}

// Mutex map ngăn ngừa gọi fetchAndCacheMovieDetail trùng lặp đồng thời
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const inFlightDetailFetches = new Map<string, Promise<any>>();

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
      const hasDirectM3u8 = currentServers.some(
        (s: { server_data?: Array<{ link_m3u8?: string }> }) =>
          Array.isArray(s.server_data) && s.server_data.some((ep) => Boolean(ep?.link_m3u8))
      );
      if (!hasDirectM3u8) {
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
    const kvKey = `movie:detail:v4:${slug}:${source || "any"}`;
    cacheService.set(kvKey, { _isNegative: true }, 1800).catch(() => {});

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

// Sử dụng React cache để khử trùng lặp Base Movie Detail giữa generateMetadata và Page Component
// Chuẩn hóa tham số (slug, source || "any") để cả 2 hàm luôn chia sẻ ĐÚNG 1 lượt đọc duy nhất trong 1 request SSR!
const cachedFetchMovieDetailBase = cache(
  async (slug: string, source: "nguonc" | "ophim" | "any" = "any") => {
    const realSource = source === "any" ? undefined : source;
    return await fetchMovieDetailBase(slug, realSource);
  }
);

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

      // Ghi nhận metadata phân trang để các page khác cùng query không gọi vượt ngưỡng
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
      // Retry once after short jittered delay to recover from transient HTTP 429 / socket bursts
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapNguonCListItem(item: any, params: MovieFilterParams) {
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

  const normalizedDirectors = extractMovieDirectors(item);
  const normalizedActors = extractMovieActors(item);

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

    // Chỉ cắt phần offset đầu khi trang NguonC đầu tiên thực sự tải thành công;
    // nếu trang đầu bị lỗi sau retry, giữ nguyên đầu dải trang kế để tránh mất thêm phim.
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

    // Nếu bị hụt phim do 1 trang con lỗi hoặc có phim trùng lắp giữa các trang liền kề khi NguonC dịch chuyển,
    // chủ động tải bù thêm tối đa 2 trang NguonC kế tiếp (nếu vẫn còn trong tổng số trang NguonC).
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
        totalPages: Math.ceil(nguonCTotalItems / fetchLimit) || 1,
        totalItems: nguonCTotalItems,
      };
    }

    const mappedAll = uniquePostOffset.map((item) => mapNguonCListItem(item, params));
    const primaryItems = mappedAll.slice(0, fetchLimit);
    const overflowItems = mappedAll.slice(fetchLimit);

    const totalPages = Math.ceil(nguonCTotalItems / fetchLimit) || 1;
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

// ============================================================
// CHUẨN HÓA ĐIỂM ĐÁNH GIÁ & KHỬ TRÙNG LẶP CATALOG
// ============================================================
import {
  deduplicateMovieItems,
  evaluateSearchRelevance,
  cleanNormalizedForMatch,
  extractMovieRatingScore,
  extractMovieModifiedTime,
  extractMovieDirectors,
  extractMovieActors,
} from "@/lib/movieMedia";
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
  countApi3?: number;
  totalItems: number;
  totalPages: number;
  updatedAt: number;
  seenSlugsByPage?: Map<number, Set<string>>;
}
const queryMetadataCache = new Map<string, QueryPaginationMeta>();

function buildQueryMetaKey(params: MovieFilterParams): string {
  return JSON.stringify({
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
async function executeGetAiCandidates(params: MovieFilterParams, _options?: AiCandidateOptions) {
  const isSearch = Boolean(params.keyword?.trim());
  const limit = params.limit || 24;

  // Song song 2 nguồn chính chất lượng cao (PhimAPI + NguonC)
  const [resPhimApi, resNguonC] = await Promise.all([
    fetchSourceData(API_PHIMAPI, params, isSearch),
    fetchSourceData(API_NGUONC,   params, isSearch),
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
  const limit = params.limit && params.limit > 0 ? params.limit : 24;
  const effectiveSort = params.sort || "latest";
  const metaKey = buildQueryMetaKey(params);
  const cachedMeta = queryMetadataCache.get(metaKey);
  const seenSlugsByPage =
    cachedMeta && Date.now() - (cachedMeta.updatedAt || 0) < 300_000 && cachedMeta.seenSlugsByPage
      ? cachedMeta.seenSlugsByPage
      : new Map<number, Set<string>>();

  // ============================================================
  // CHIẾN LƯỢC FEDERATION PER-PAGE SONG SONG CHO BROWSE:
  // - Fetch song song cả 2 nguồn: PhimAPI + NguonC với bounded timeout (4000ms)
  // - Interleave 2:1 (PhimAPI : NguonC)
  // - Dedupe 4 cấp độ (TMDB ID, IMDb ID, slug, title+year), merge metadata & source provenance
  // - Áp dụng filter & sort
  // ============================================================
  const [resPhimApi, resNguonC] = await Promise.all([
    fetchSourceData(API_PHIMAPI, params, isSearch),
    fetchSourceData(API_NGUONC,   params, isSearch),
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

    // Khử trùng lặp giữa các trang (cross-page deduplication): chỉ loại bỏ phim đã xuất hiện ở trang trước (< requestedPageNum)
    const requestedPageNum = params.page && params.page >= 1 ? Math.floor(params.page) : 1;
    if (requestedPageNum > 1 && !seenSlugsByPage.has(1)) {
      try {
        const p1Key = buildMovieCacheKey({ ...params, page: 1 });
        let p1Cached = moviesMemoryCache.get(p1Key)?.data;
        if (!p1Cached) {
          p1Cached = await executeGetMovies({ ...params, page: 1 }, p1Key);
        }
        if (p1Cached?.items) {
          seenSlugsByPage.set(
            1,
            new Set(
              p1Cached.items
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((itm: any) => itm?.slug)
                .filter(Boolean)
            )
          );
        }
      } catch {}
    }

    if (requestedPageNum > 1 && seenSlugsByPage.size > 0) {
      const priorSeen = new Set<string>();
      for (const [seenPage, slugSet] of seenSlugsByPage.entries()) {
        if (seenPage < requestedPageNum) {
          for (const s of slugSet) priorSeen.add(s);
        }
      }
      if (priorSeen.size > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        candidates = candidates.filter((m: any) => !priorSeen.has(m.slug));
      }
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

  // Nếu một nguồn bị lỗi/timeout hoặc vượt quá số trang riêng của nguồn đó (trả về 0),
  // kế thừa giá trị count đã biết từ queryMetadataCache để tránh sụt giảm totalItems giữa các trang.
  if (countApi1 === 0 && cachedMeta?.countApi1) countApi1 = cachedMeta.countApi1;
  if (countApi2 === 0 && cachedMeta?.countApi2) countApi2 = cachedMeta.countApi2;

  const activeFiltersCount =
    (params.type ? 1 : 0) +
    (params.category ? 1 : 0) +
    (params.country ? 1 : 0) +
    (params.year ? 1 : 0);

  let totalItemsCount: number;

  if (isSearch) {
    totalItemsCount = candidates.length;
  } else if (activeFiltersCount >= 2) {
    // KHI CÓ TỪ 2 BỘ LỌC TRỞ LÊN (VD: type + country hoặc category + year):
    totalItemsCount = countApi1 > 0 ? countApi1 : (countApi2 || candidates.length);
  } else {
    // BỘ LỌC ĐƠN LẺ (Type / Country / Category / Year) HOẶC MẶC ĐỊNH:
    const availableCounts = [countApi1, countApi2].filter((c) => c > 0);
    totalItemsCount = availableCounts.length > 0 ? Math.max(...availableCounts) : candidates.length;
  }

  // Bảo đảm tính bất biến/ổn định của totalItems cho cùng query giữa các trang khác nhau trong cùng phiên duyệt
  if (cachedMeta?.totalItems && (Date.now() - (cachedMeta.updatedAt || 0) < 300_000)) {
    totalItemsCount = cachedMeta.totalItems;
  }

  const maxTotalPages = Math.max(1, Math.ceil(totalItemsCount / limit));
  const requestedPage = params.page && params.page >= 1 ? Math.floor(params.page) : 1;
  let finalItems = (maxTotalPages > 0 && requestedPage > maxTotalPages) ? [] : candidates.slice(0, limit);

  // Tự động bù đắp (top-up) nếu sau khi lọc/dedupe trang bị khuyết dưới target limit
  if (finalItems.length < limit && requestedPage < maxTotalPages && !isSearch) {
    try {
      const existingSlugs = new Set(candidates.map((c) => c.slug).filter(Boolean));
      const appendUniqueFiltered = (items: unknown[]) => {
        if (!Array.isArray(items) || items.length === 0) return;
        const filtered = applyMovieFilters(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          items.filter((item: any) => item?.slug && !existingSlugs.has(item.slug)),
          params
        );
        for (const item of filtered) {
          if (finalItems.length >= limit) break;
          existingSlugs.add(item.slug);
          candidates.push(item);
          finalItems.push(item);
        }
      };

      // 1. Tận dụng phần dư NguonC đã fetch sẵn trong bộ nhớ (0 extra HTTP calls)
      if (resNguonC && "overflowItems" in resNguonC && Array.isArray(resNguonC.overflowItems)) {
        appendUniqueFiltered(resNguonC.overflowItems);
      }

      // 2. Nếu vẫn thiếu, bù đắp song song từ cả PhimAPI (nếu còn trang) và NguonC (trang kế tiếp)
      if (finalItems.length < limit) {
        const shouldTopUpPhimApi =
          !resPhimApi || resPhimApi.items.length > 0 || requestedPage < (resPhimApi.totalPages || 0);
        const shouldTopUpNguonC =
          !resNguonC || resNguonC.items.length > 0 || requestedPage < (resNguonC.totalPages || 0);

        const [topUpPhimApi, topUpNguonC] = await Promise.all([
          shouldTopUpPhimApi
            ? fetchSourceData(API_PHIMAPI, params, isSearch, requestedPage + 1)
            : Promise.resolve(null),
          shouldTopUpNguonC
            ? fetchSourceData(API_NGUONC, params, isSearch, requestedPage + 1)
            : Promise.resolve(null),
        ]);

        const mergedTopUp = [];
        const pTop = topUpPhimApi?.items || [];
        const nTop = topUpNguonC?.items || [];
        let pIdx = 0;
        let nIdx = 0;
        while (pIdx < pTop.length || nIdx < nTop.length) {
          for (let k = 0; k < 2 && pIdx < pTop.length; k++) {
            mergedTopUp.push(pTop[pIdx++]);
          }
          if (nIdx < nTop.length) {
            mergedTopUp.push(nTop[nIdx++]);
          }
        }
        appendUniqueFiltered(mergedTopUp);
      }
    } catch {}
  }

  // Bảo đảm an toàn tuyệt đối cho trang cuối (chỉ cho Browse/Filter, KHÔNG áp dụng cho Search từ khóa):
  if (!isSearch && requestedPage === maxTotalPages && finalItems.length === 0 && totalItemsCount > 0) {
    if (candidates.length > 0) {
      finalItems = candidates.slice(0, Math.min(limit, candidates.length));
    } else {
      try {
        const fallbackPage = Math.max(1, requestedPage - 1);
        const phimApiFallbackPage = countApi1 > 0 ? Math.min(fallbackPage, Math.max(1, Math.ceil(countApi1 / limit))) : fallbackPage;
        const [phimFallbackRes, nguonCFallbackRes] = await Promise.all([
          countApi1 > 0
            ? fetchSourceData(API_PHIMAPI, params, isSearch, phimApiFallbackPage)
            : Promise.resolve(null),
          fetchSourceData(API_NGUONC, params, isSearch, fallbackPage),
        ]);
        const fallbackCombined = applyMovieFilters(
          deduplicateMovieItems([
            ...(phimFallbackRes?.items || []),
            ...(nguonCFallbackRes?.items || []),
          ]),
          params
        );
        if (fallbackCombined.length > 0) {
          finalItems = fallbackCombined.slice(0, limit);
        }
      } catch {}
    }
  }

  // SERVER-SIDE POSTER ENRICHMENT (Ưu tiên nguồn TMDb image.tmdb.org, bỏ qua nếu caller set budget = 0):
  const enrichBudgetMs = params.posterEnrichmentBudgetMs ?? 3000;
  if (enrichBudgetMs > 0) {
    await enrichMovieListPosters(finalItems, { budgetMs: enrichBudgetMs });
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

  const nguonCIsPartial = Boolean(resNguonC && "isPartial" in resNguonC && resNguonC.isPartial);
  const expectedMoreItems =
    !isSearch &&
    requestedPage < maxTotalPages &&
    finalItems.length < limit &&
    (countApi1 >= requestedPage * limit || countApi2 >= requestedPage * limit);
  const isDegraded =
    resPhimApi === null ||
    resNguonC === null ||
    nguonCIsPartial ||
    expectedMoreItems;
  if (isDegraded) {
    degradedMoviePayloads.add(payload);
  }
  const now = Date.now();
  // Nếu bị degraded (1 trong các nguồn bị timeout/lỗi/khuyết trang), chỉ lưu RAM ngắn hạn (15s) thay vì 300s để request sau phục hồi trọn vẹn
  const freshTtl = isDegraded ? 15 * 1000 : 300 * 1000;
  const staleTtl = isDegraded ? 30 * 1000 : 1800 * 1000;

  if (isSearch && finalItems.length > 0) {
    seenSlugsByPage.set(
      requestedPage,
      new Set(
        finalItems
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((itm: any) => itm?.slug)
          .filter(Boolean)
      )
    );
  }

  queryMetadataCache.set(metaKey, {
    seenSlugsByPage,
    countApi1: Math.max(countApi1, cachedMeta?.countApi1 || 0),
    countApi2: Math.max(countApi2, cachedMeta?.countApi2 || 0),
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
    v: 17,
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
          // Nạp ngay vào L1 RAM cache để các request kế tiếp trên instance này lấy trong 0ms (0 Redis GETs)
          moviesMemoryCache.set(cacheKey, {
            data: res,
            expireAt: now + 300 * 1000,
            staleUntil: now + 1800 * 1000,
          });
        } else {
          res = await executeGetMovies(params, cacheKey);
          if (
            res &&
            Array.isArray(res.items) &&
            res.items.length > 0 &&
            !degradedMoviePayloads.has(res)
          ) {
            cacheService.set(kvKey, res, ttlSeconds).catch(() => {});
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
        } catch {}
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
