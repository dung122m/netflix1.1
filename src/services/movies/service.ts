import { cache } from "react";
import { cleanHtmlText } from "@/lib/cleanHtml";
import { cacheService } from "@/lib/cache";
import {
  fetchVsmovDetail,
  fetchVsmovFiltered,
  adaptVsmovMovieItem,
  adaptVsmovMovieDetail,
  performVsmovCatalogIngestion,
} from "@/services/providers/vsmov";
import { normalizeForMatch } from "@/lib/stringUtils";

const API_NGUONC = process.env.NEXT_PUBLIC_API_URL || "https://phim.nguonc.com/api";
const API_PHIMAPI = process.env.NEXT_PUBLIC_API_URL_2 || "https://phimapi.com";

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
  "khoa-hoc": "tai-lieu",
};

function getNguonCGenreSlug(slug?: string): string {
  if (!slug) return "";
  return NGUONC_GENRE_MAP[slug] || slug;
}

/**
 * Khử trùng lặp tập phim trong từng server (Chống lỗi duplicate key tap-14, tap-15 từ upstream API)
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

  return uniqueList;
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
        countries.push(...list.map((c) => ({ id: c.id, name: c.name, slug: c.id })));
      } else if (grpName.includes("thể loại") || grpName.includes("the loai")) {
        categories.push(...list.map((c) => ({ id: c.id, name: c.name, slug: c.id })));
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
const fetchMovieDetailInternal = async (
  slug: string,
  source?: "nguonc" | "ophim" | "vsmov",
) => {
  const localKey = `${slug}_${source || "any"}`;
  const now = Date.now();

  if (movieDetailMemoryCache.has(localKey)) {
    const entry = movieDetailMemoryCache.get(localKey)!;
    if (entry.expireAt > now) {
      if (entry.data === null) return undefined;
      return sanitizeMovieDetailEpisodes(entry.data);
    }
    // Trả về dữ liệu đệm ngay lập tức nếu chưa quá hạn stale (0ms)
    if (entry.staleUntil > now) {
      if (entry.data === null) return undefined;
      // Revalidate ngầm
      revalidateMovieDetail(slug, source, localKey).catch(() => {});
      return sanitizeMovieDetailEpisodes(entry.data);
    }
  }

  const kvKey = `movie:detail:${slug}:${source || "any"}`;
  const data = await cacheService.fetchOrSet(
    kvKey,
    () => fetchAndCacheMovieDetail(slug, source, localKey),
    7 * 24 * 60 * 60 // 7 ngày
  );
  if (!data || (typeof data === "object" && "_isNegative" in data)) {
    return undefined;
  }
  return sanitizeMovieDetailEpisodes(data);
};

async function revalidateMovieDetail(slug: string, source?: "nguonc" | "ophim" | "vsmov", cacheKey?: string) {
  try {
    await fetchAndCacheMovieDetail(slug, source, cacheKey || `${slug}_${source || "any"}`);
  } catch {}
}

async function fetchAndCacheMovieDetail(slug: string, source?: "nguonc" | "ophim" | "vsmov", cacheKey?: string) {
  const now = Date.now();
  const key = cacheKey || `${slug}_${source || "any"}`;

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
          signal: AbortSignal.timeout(5000),
        }).then(async (res) => {
          if (!res.ok) throw new Error("PhimAPI not ok");
          return res.json();
        }),

        fetch(`${API_NGUONC}/film/${slug}`, {
          next: { revalidate: 600 },
          signal: AbortSignal.timeout(5000),
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
        const vsmovData = await fetchVsmovDetail(slug);
        if (vsmovData) {
          result = adaptVsmovMovieDetail(vsmovData);
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

        // Bổ sung các server phát từ nguồn phụ (NguonC Embed hoặc PhimAPI) để người dùng có nhiều server lựa chọn
        const secondaryEpContainer = secondary?.episodes || secondary?.movie?.episodes;
        if (Array.isArray(secondaryEpContainer) && secondaryEpContainer.length > 0) {
          if (!primary.movie.episodes) primary.movie.episodes = [];
          if (!primary.episodes) primary.episodes = primary.movie.episodes;

          // Thu thập toàn bộ các stream URL thực tế đang có ở server chính để chống duplicate link
          const primaryStreamUrls = new Set<string>();
          for (const s of primary.movie.episodes) {
            for (const ep of s?.server_data || []) {
              const u = (ep?.link_m3u8 || ep?.link_embed || "").trim();
              if (u) primaryStreamUrls.add(u);
            }
          }

          const existingNames = new Set(
            primary.movie.episodes.map((s: { server_name?: string }) => (s.server_name || "").trim().toLowerCase())
          );

          for (const s of secondaryEpContainer) {
            if (!s || !Array.isArray(s.server_data) || s.server_data.length === 0) continue;

            // Kiểm tra xem server phụ này có mang stream khác biệt so với server chính hay không
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

              const newServerObj = {
                ...s,
                server_name: targetName,
              };
              primary.movie.episodes.push(newServerObj);
              if (primary.episodes && primary.episodes !== primary.movie.episodes) {
                primary.episodes.push(newServerObj);
              }
            }
          }
        }

        // Bổ sung đầy đủ metadata từ secondary nếu primary bị thiếu (actor, director, category, country, alt names,...)
        if (secondary?.movie && primary?.movie) {
          const pm = primary.movie;
          const sm = secondary.movie;
          if ((!pm.actor || (Array.isArray(pm.actor) && pm.actor.length === 0)) && sm.actor) pm.actor = sm.actor;
          if ((!pm.casts || (Array.isArray(pm.casts) && pm.casts.length === 0)) && sm.casts) pm.casts = sm.casts;
          if ((!pm.director || (Array.isArray(pm.director) && pm.director.length === 0)) && sm.director) pm.director = sm.director;
          if ((!pm.category || (Array.isArray(pm.category) && pm.category.length === 0)) && sm.category) pm.category = sm.category;
          if ((!pm.country || (Array.isArray(pm.country) && pm.country.length === 0)) && sm.country) pm.country = sm.country;
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
    const kvKey = `movie:detail:${slug}:${source || "any"}`;
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
    catSlugs.some((c) => c.includes("tv-shows") || c.includes("tv shows") || c.includes("show"));

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
    const effectiveSortMode = params.sort || "rating";
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
      const timeoutMs = isSearchPhimApi ? 4000 : 6000;

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

      if (!res.ok) return null;
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
            return `${cdnClean}/${path.replace(/^\/+/, "")}`;
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

      return {
        items: mappedItems,
        totalPages,
        totalItems,
      };
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

    const pagesToFetch: number[] = [];
    for (let p = startNguonCPage; p <= endNguonCPage; p++) {
      pagesToFetch.push(p);
    }

    const nguonCResults = await Promise.all(
      pagesToFetch.map(async (p) => {
        const u = buildNguonCUrl(p);
        if (!u) return null;
        try {
          const res = await fetch(u, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
              Accept: "application/json, text/plain, */*",
              "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
            },
            next: { revalidate: 300 },
            signal: AbortSignal.timeout(6500),
          });
          if (!res.ok) return null;
          return await res.json();
        } catch {
          return null;
        }
      })
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawCombined: any[] = [];
    let nguonCTotalItems = 0;
    for (const r of nguonCResults) {
      if (r) {
        const itms = r.items || r.data?.items || [];
        rawCombined.push(...itms);
        if (r.paginate?.total_items) {
          nguonCTotalItems = Math.max(nguonCTotalItems, r.paginate.total_items);
        }
      }
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

      // Hydrate metadata known from request endpoint
      const categories: { id?: string; name: string; slug: string }[] = [];
      const countries: { id?: string; name: string; slug: string }[] = [];
      let itemType: string | undefined = undefined;
      let chieurap: boolean | undefined = undefined;

      if (params.category) {
        categories.push({ id: params.category, name: params.category, slug: params.category });
      }
      if (params.country) {
        countries.push({ id: params.country, name: params.country, slug: params.country });
      }
      if (params.type === "phim-chieu-rap") {
        chieurap = true;
        itemType = "phim-chieu-rap";
      } else if (params.type === "hoat-hinh") {
        itemType = "hoat-hinh";
        if (!categories.some((c) => c.slug === "hoat-hinh")) {
          categories.push({ id: "hoat-hinh", name: "Hoạt Hình", slug: "hoat-hinh" });
        }
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
        ...(categories.length > 0 ? { category: categories } : {}),
        ...(countries.length > 0 ? { country: countries } : {}),
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
    const timeout = params.vsmovTimeoutMs || 6000;

    const rawRes = await fetchVsmovFiltered(
      {
        keyword: isSearch && params.keyword ? params.keyword.trim() : undefined,
        type: params.type,
        category: params.category,
        country: params.country,
        year: params.year,
        page,
        limit: fetchLimit,
      },
      timeout
    );

    if (!rawRes || !Array.isArray(rawRes.items)) return null;

    const mappedItems = rawRes.items
      .map((item) => {
        const adapted = adaptVsmovMovieItem(item);
        if (!adapted) return null;
        if (params.category && (!adapted.category || (Array.isArray(adapted.category) && adapted.category.length === 0))) {
          adapted.category = [{ id: params.category, name: params.category, slug: params.category }];
        }
        if (params.country && (!adapted.country || (Array.isArray(adapted.country) && adapted.country.length === 0))) {
          adapted.country = [{ id: params.country, name: params.country, slug: params.country }];
        }
        return adapted;
      })
      .filter(Boolean);

    const totalItems = rawRes.pagination?.totalItems || mappedItems.length || 0;
    const totalPages =
      rawRes.pagination?.totalPages ||
      Math.max(1, Math.ceil(totalItems / (rawRes.pagination?.totalItemsPerPage || fetchLimit)));

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
// KHỬ TRÙNG LẶP & LỌC ỨNG VIÊN (GIỮ SOURCE PROVENANCE)
// ============================================================
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

    if (existing) {
      // Merge source provenance
      const itemSources = Array.isArray(item.sources) ? item.sources : (item.source ? [item.source] : []);
      const existingSources = Array.isArray(existing.sources) ? existing.sources : (existing.source ? [existing.source] : []);
      const mergedSources = Array.from(new Set([...existingSources, ...itemSources]));
      existing.sources = mergedSources;

      // Merge missing metadata nếu existing bị khuyết
      if (!existing.poster_url && item.poster_url) existing.poster_url = item.poster_url;
      if (!existing.thumb_url && item.thumb_url) existing.thumb_url = item.thumb_url;
      if (!existing.year && item.year) existing.year = item.year;
      if (!existing.quality && item.quality) existing.quality = item.quality;
      if (!existing.lang && item.lang) existing.lang = item.lang;
      if (!existing.time && item.time) existing.time = item.time;
      if (!existing.tmdb && item.tmdb) existing.tmdb = item.tmdb;
      if (!existing.imdb && item.imdb) existing.imdb = item.imdb;
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

    uniqueItems.push(item);
  }

  return uniqueItems;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyMovieFilters(items: any[], params: MovieFilterParams): any[] {
  let filtered = items;

  // 1. Lọc theo Loại Phim
  if (params.type) {
    filtered = filtered.filter((item) =>
      isMovieOfType(item, params.type!)
    );
  }

  // 2. Lọc theo Quốc Gia
  if (params.country) {
    const targetCountry = params.country.toLowerCase().trim();
    filtered = filtered.filter((item) => {
      if (!item.country || (Array.isArray(item.country) && item.country.length === 0)) {
        return true;
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

  // 3. Lọc theo Thể Loại
  if (params.category) {
    const targetCat = params.category.toLowerCase().trim();
    const isExplicitHoatHinh = params.category === "hoat-hinh" || params.type === "hoat-hinh";

    filtered = filtered.filter((item) => {
      if (!isExplicitHoatHinh && isMovieOfType(item, "hoat-hinh")) {
        return false;
      }

      if (!item.category || (Array.isArray(item.category) && item.category.length === 0)) {
        return true;
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
        return true;
      }
      return String(item.year || "").includes(String(params.year));
    });
  }

  return filtered;
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
  const effectiveSort = params.sort || "rating";

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
    fetchVsmovSourceData(params, isSearch),
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

  if (effectiveSort === "year") {
    candidates.sort((a, b) => {
      const yearA = Number(a.year || 0);
      const yearB = Number(b.year || 0);
      return yearB - yearA;
    });
  }

  const finalItems = candidates.slice(0, limit);

  // ============================================================
  // TÍNH TỔNG SỐ PHIM VÀ TRANG (CHUẨN HÓA THEO PHẠM VI BỘ LỌC FEDERATION 3 NGUỒN)
  // ============================================================
  const countApi1 = resPhimApi?.totalItems || 0;
  const countApi2 = resNguonC?.totalItems   || 0;
  const countApi3 = resVsmov?.totalItems    || 0;

  const activeFiltersCount =
    (params.type ? 1 : 0) +
    (params.category ? 1 : 0) +
    (params.country ? 1 : 0) +
    (params.year ? 1 : 0);

  let totalItemsCount: number;
  let maxTotalPages: number;

  if (params.type || activeFiltersCount > 1) {
    // KHI CÓ BỘ LỌC TYPE HOẶC NHIỀU BỘ LỌC KẾT HỢP:
    const NGUONC_OVERLAP = 0.80;
    const VSMOV_OVERLAP = 0.75;
    const uniqueFromNguonC = Math.round(countApi2 * (1 - NGUONC_OVERLAP));
    const uniqueFromVsmov = Math.round(countApi3 * (1 - VSMOV_OVERLAP));
    totalItemsCount = (countApi1 || 0) + (countApi2 > 0 ? uniqueFromNguonC : 0) + (countApi3 > 0 ? uniqueFromVsmov : 0) || candidates.length;
    maxTotalPages = Math.max(1, Math.ceil(totalItemsCount / limit));
  } else {
    // KHI LÀ BỘ LỌC ĐƠN LẺ (Country/Category/Year) HOẶC TÌM KIẾM KEYWORD HOẶC MẶC ĐỊNH:
    // Áp dụng công thức cộng bù độc quyền từ NguonC (~25%) và VSMOV (~30%):
    const NGUONC_OVERLAP = 0.75;
    const VSMOV_OVERLAP = 0.70;
    const uniqueFromNguonC = Math.round(countApi2 * (1 - NGUONC_OVERLAP));
    const uniqueFromVsmov = Math.round(countApi3 * (1 - VSMOV_OVERLAP));
    totalItemsCount = (countApi1 || 0) + (countApi2 > 0 ? uniqueFromNguonC : 0) + (countApi3 > 0 ? uniqueFromVsmov : 0) || candidates.length;
    maxTotalPages = Math.max(1, Math.ceil(totalItemsCount / limit));
  }

  const payload = {
    status: true,
    items: finalItems,
    pagination: {
      currentPage: params.page || 1,
      totalPages: maxTotalPages,
      totalItems: totalItemsCount,
    },
  };

  const now = Date.now();
  moviesMemoryCache.set(cacheKey, {
    data: payload,
    expireAt: now + 300 * 1000,    // 5 phút tươi
    staleUntil: now + 1800 * 1000, // Cho phép dùng stale đến 30 phút trong nền
  });

  return payload;
}

export function buildMovieCacheKey(params: MovieFilterParams): string {
  return JSON.stringify({
    v: 7,
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
        return entry.data;
      }
      // Nếu hết hạn tươi nhưng vẫn trong hạn stale -> trả về ngay lập tức (0ms) và revalidate ngầm!
      if (entry.staleUntil > now) {
        executeGetMovies(params, cacheKey).catch(() => {});
        return entry.data;
      }
    }

    // Nếu yêu cầu bỏ qua KV (như search suggestions limit: 8), chỉ thực thi fetcher & cache vào RAM
    if (params.skipKvCache) {
      return await executeGetMovies(params, cacheKey);
    }

    const kvKey = `movie:list:${cacheKey}`;
    const ttlSeconds = params.keyword ? 86400 : 7200; // 1 ngày cho search, 2 giờ cho list
    return await cacheService.fetchOrSet(
      kvKey,
      () => executeGetMovies(params, cacheKey),
      ttlSeconds
    );
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
  getMovieDetail: cachedGetMovieDetail,

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
      v: "ai_cand_1",
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
