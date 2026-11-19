import { cacheService } from "@/lib/cache";
import { findEpisodeMatch, formatEpisodeName } from "@/lib/formatEpisode";
import { getCanonicalGenreSlug, getCanonicalCountrySlug, cleanNormalizedForMatch } from "@/lib/movieMedia";
import { decodeStreamUrl } from "@/lib/streamCrypto";
import { resolveCinemaM3u8 } from "@/components/cinema/cinemaStreamHelpers";

export const API_NGUONC = process.env.NEXT_PUBLIC_API_URL || "https://phim.nguonc.com/api";
export const API_PHIMAPI = process.env.NEXT_PUBLIC_API_URL_2 || "https://phimapi.com";

export const DEFAULT_FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
};

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

export interface RawEpisodeItem {
  name?: string;
  slug?: string;
  link_embed?: string;
  link_m3u8?: string;
}

export interface RawServerItem {
  server_name?: string;
  server_data?: RawEpisodeItem[];
}

export interface MovieDetailCachePayload {
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

// In-flight deduplication maps
const inFlightStreams = new Map<string, Promise<EpisodeStreamResult[]>>();
const inFlightDiscovery = new Map<string, Promise<void>>();

/**
 * Trích xuất thứ tự số học của tập phim để sắp xếp danh sách tập chuẩn xác
 */
export function extractEpisodeOrder(name?: string, slug?: string): number {
  const str = `${name || ""} ${slug || ""}`.trim().toLowerCase();
  if (!str) return 0;
  if (str.includes("trailer")) return 999999;
  if (str.includes("full")) return 0;

  const hyphenPartMatch = str.match(/(?:tập|tap|ep)?[\s-_]*(\d+)[\s-_]+(\d+)/i);
  if (hyphenPartMatch) {
    const main = parseInt(hyphenPartMatch[1], 10);
    const sub = parseInt(hyphenPartMatch[2], 10);
    return main + (sub < 100 ? sub / 100 : 0.01);
  }

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

export function serverHasM3u8(
  srv: { server_data?: Array<{ link_m3u8?: unknown; link_embed?: unknown }> } | null | undefined
): boolean {
  if (!srv || !Array.isArray(srv.server_data) || srv.server_data.length === 0) return false;
  return srv.server_data.some((e: { link_m3u8?: unknown; link_embed?: unknown }) => {
    if (!e) return false;
    const rawM3u8 = typeof e.link_m3u8 === "string" ? decodeStreamUrl(e.link_m3u8) : "";
    if (rawM3u8 && (rawM3u8.includes(".m3u8") || rawM3u8.includes("/hls/"))) return true;
    const rawEmbed = typeof e.link_embed === "string" ? decodeStreamUrl(e.link_embed) : "";
    if (rawEmbed) {
      const resolved = resolveCinemaM3u8(rawM3u8, rawEmbed, rawM3u8 || rawEmbed);
      if (resolved && (resolved.includes(".m3u8") || resolved.includes("/hls/"))) return true;
    }
    return false;
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isBetterServerCandidate(candidate: any, current: any): boolean {
  if (!current) return true;
  const candM3u8 = serverHasM3u8(candidate);
  const curM3u8 = serverHasM3u8(current);
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
 * Lọc, khử trùng lặp và chuẩn hóa tối đa 4 server (Lồng Tiếng, Thuyết Minh, Vietsub, Dự phòng)
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
    pushUnique(bestThuyetMinh, "Thuyết Minh");
    pushUnique(bestVietsub, "Vietsub");
  } else if (bestThuyetMinh) {
    pushUnique(bestThuyetMinh, "Thuyết Minh");
  } else if (bestVietsub) {
    pushUnique(bestVietsub, "Thuyết Minh");
  }

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

  result.sort((a, b) => {
    const aM3u8 = serverHasM3u8(a) ? 1 : 0;
    const bM3u8 = serverHasM3u8(b) ? 1 : 0;
    return bM3u8 - aM3u8;
  });

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

  const finalServers: typeof result = [];
  const finalSeenUrls = new Set<string>();
  for (const srv of result) {
    if (!hasDistinctStream(srv, finalSeenUrls)) continue;
    registerServerStreamUrls(srv, finalSeenUrls);
    finalServers.push(srv);
  }

  finalServers.sort((a, b) => {
    const aM3u8 = serverHasM3u8(a) ? 1 : 0;
    const bM3u8 = serverHasM3u8(b) ? 1 : 0;
    return bM3u8 - aM3u8;
  });

  return finalServers.slice(0, MAX_SERVERS);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeNguonCMovieDetail(raw: any) {
  if (!raw || !raw.movie) return null;
  const movie = raw.movie;

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

  const isSingle =
    movie.tmdb?.type === "movie" ||
    Number(movie.total_episodes) === 1 ||
    String(movie.current_episode || "").trim().toUpperCase() === "FULL" ||
    String(movie.episode_total || "").trim() === "1";
  const movieType = isSingle ? "single" : "series";

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
      type: movieType,
      status: movie.current_episode || "",
      thumb_url: movie.poster_url_webp || movie.poster_url || movie.thumb_url_webp || movie.thumb_url || "",
      poster_url: movie.thumb_url_webp || movie.thumb_url || movie.poster_url_webp || movie.poster_url || "",
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
      tmdb: movie.tmdb
        ? {
            ...movie.tmdb,
            type: movie.tmdb.type || (isSingle ? "movie" : "tv"),
          }
        : undefined,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toCompactDetailPayload(data: any, requestedEpSlug?: string): MovieDetailV3Payload {
  if (!data || !data.movie) return data;

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function discoverAndMergeMissingSources(result: any, slug: string) {
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
        } catch { }
        return null;
      })());
    }

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
        } catch { }
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

/**
 * Lấy stream URL trực tiếp cho 1 tập phim cụ thể
 */
export async function getEpisodeStream(
  slug: string,
  episodeSlug: string,
  serverName?: string,
  source?: "nguonc" | "ophim",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetchFreshDetailFn?: (slug: string, source?: "nguonc" | "ophim") => Promise<any>
): Promise<EpisodeStreamResult[]> {
  const normEp = normalizeEpisodeSlug(episodeSlug);
  const serverKey = serverName ? serverName.toLowerCase().replace(/[^a-z0-9]/g, "_") : "any";

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

      if (fetchFreshDetailFn) {
        const freshDetail = await fetchFreshDetailFn(slug, source);
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
            cacheService.set(streamKvKey, streams, 7 * 86400).catch(() => { });
            return streams;
          }
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
