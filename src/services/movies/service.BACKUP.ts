import { cache } from "react";
import { cleanHtmlText } from "@/lib/cleanHtml";
import { cacheService } from "@/lib/cache";

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
  waitForFullSync?: boolean;
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
    server_data: (srv.items || []).map((ep: any) => {
      const epName = String(ep.name || "");
      const formattedName = epName.toLowerCase().startsWith("tập") ? epName : `Tập ${epName}`;
      return {
        name: formattedName,
        slug: ep.slug || `tap-${epName}`,
        filename: `${movie.name || ""} - ${formattedName}`,
        link_embed: ep.embed || "",
        link_m3u8: "",
      };
    }),
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
      director: directorArr,
      category: categories,
      country: countries,
      episodes: episodes,
    },
  };
}

// Hàm nội bộ lấy chi tiết phim có multi-tier cache (L1 Memory SWR + L2 Cloudflare KV)
const fetchMovieDetailInternal = async (
  slug: string,
  source?: "nguonc" | "ophim",
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
      // Revalidate ngầm
      revalidateMovieDetail(slug, source, localKey).catch(() => {});
      return entry.data;
    }
  }

  const kvKey = `movie:detail:${slug}:${source || "any"}`;
  return await cacheService.fetchOrSet(
    kvKey,
    () => fetchAndCacheMovieDetail(slug, source, localKey),
    7 * 24 * 60 * 60 // 7 ngày
  );
};

async function revalidateMovieDetail(slug: string, source?: "nguonc" | "ophim", cacheKey?: string) {
  try {
    await fetchAndCacheMovieDetail(slug, source, cacheKey || `${slug}_${source || "any"}`);
  } catch {}
}

async function fetchAndCacheMovieDetail(slug: string, source?: "nguonc" | "ophim", cacheKey?: string) {
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

        // Bổ sung các server phát từ nguồn phụ (NguonC Embed hoặc PhimAPI) để người dùng có nhiều server lựa chọn
        if (secondary?.movie?.episodes && Array.isArray(secondary.movie.episodes)) {
          if (!primary.movie.episodes) primary.movie.episodes = [];
          const primaryServerNames = new Set(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            primary.movie.episodes.map((s: any) => (s.server_name || "").trim().toLowerCase())
          );
          for (const s of secondary.movie.episodes) {
            const cleanName = (s.server_name || "").trim().toLowerCase();
            if (!primaryServerNames.has(cleanName) && s.server_data?.length > 0) {
              primary.movie.episodes.push(s);
              primaryServerNames.add(cleanName);
            }
          }
        }

        result = primary;
      }
    }

    if (result) {
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
    }

    return result;
  } catch {
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
    const activeFiltersCount =
      (params.type ? 1 : 0) +
      (params.category ? 1 : 0) +
      (params.country ? 1 : 0) +
      (params.year ? 1 : 0);
    const isMultiFilter = activeFiltersCount > 1;
    const page = pageOverride || params.page || 1;

    const urlParams = new URLSearchParams();
    urlParams.set("page", String(page));
    const fetchLimit = isMultiFilter ? 48 : (params.limit && params.limit <= 48 ? params.limit : 24);
    urlParams.set("limit", String(fetchLimit));

    if (params.category) urlParams.set("category", params.category);
    if (params.country) urlParams.set("country", params.country);
    if (params.year) urlParams.set("year", params.year);
    if (params.sort) {
      urlParams.set(
        "sort_field",
        params.sort === "views" ? "view" : params.sort === "year" ? "year" : "modified.time"
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
        } else if (params.type === "phim-chieu-rap") {
          fullUrl = `${baseUrl}/films/danh-sach/dang-chieu?page=${page}`;
        } else if (params.type === "phim-bo") {
          fullUrl = `${baseUrl}/films/danh-sach/phim-bo?page=${page}`;
        } else if (params.type === "phim-le") {
          fullUrl = `${baseUrl}/films/danh-sach/phim-le?page=${page}`;
        } else if (params.type === "tv-shows") {
          fullUrl = `${baseUrl}/films/danh-sach/tv-shows?page=${page}`;
        } else {
          fullUrl = `${baseUrl}/films/danh-sach/${params.type}?page=${page}`;
        }
      } else {
        fullUrl = `${baseUrl}/films/phim-moi-cap-nhat?page=${page}`;
      }
    }

    const isNguonCSearch = baseUrl === API_NGUONC && isSearch;
    const timeoutMs = isNguonCSearch ? 1500 : 6000;

    const res = await fetch(fullUrl, {
      next: { revalidate: 300 }, // 5 phút Next.js cache
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) return null;

    const json = await res.json();

    if (baseUrl === API_PHIMAPI) {
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
        Math.ceil(totalItems / 24) ||
        1;

      return {
        items: mappedItems,
        totalPages,
        totalItems,
      };
    }

    // Mapping danh sách phim từ NguonC
    const rawItems = json.items || json.data?.items || [];
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

    const totalItems =
      json.paginate?.total_items ||
      mappedNguonCItems.length ||
      0;

    const totalPages =
      json.paginate?.total_page ||
      Math.ceil(totalItems / 10) ||
      1;

    return {
      items: mappedNguonCItems,
      totalPages,
      totalItems,
    };
  } catch {
    return null;
  }
}

export interface DatasetCacheEntry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[];
  totalItems: number;
  totalPages: number;
  expireAt: number;
  staleUntil: number;
  phimApiFetched: number;
  nguonCFetched: number;
  mergedBeforeDedup: number;
  uniqueAfterDedup: number;
  afterFilter: number;
  isFullSync?: boolean;
}

const filterDatasetMemoryCache = new Map<string, DatasetCacheEntry>();
const inFlightIngestionMap = new Map<string, Promise<DatasetCacheEntry>>();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getDatasetFilterKey(params: MovieFilterParams): string {
  return JSON.stringify({
    category: params.category || "",
    country: params.country || "",
    year: params.year || "",
    type: params.type || "",
    keyword: params.keyword?.trim() || "",
    sort: params.sort || "latest",
  });
}

function getBrowseDatasetRedisKey(filterKey: string): string {
  const safe = filterKey
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 160);
  return `browse:dataset:${safe}`;
}

// Chuẩn hóa item gọn gàng để tối ưu dung lượng RAM và Redis
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toCompactBrowseMovie(item: any) {
  if (!item) return null;
  return {
    slug: item.slug || "",
    name: item.name || "",
    origin_name: item.origin_name || item.original_name || "",
    thumb_url: item.thumb_url || "",
    poster_url: item.poster_url || "",
    year: item.year || "",
    type: item.type || "",
    quality: item.quality || "",
    time: item.time || "",
    episode_current: item.episode_current || item.current_episode || "",
    episode_total: item.episode_total || "",
    chieurap: item.chieurap !== undefined ? item.chieurap : undefined,
    view: Number(item.view || 0),
    tmdb: item.tmdb
      ? {
          vote_average: Number(item.tmdb.vote_average || 0),
          vote_count: Number(item.tmdb.vote_count || 0),
        }
      : undefined,
    imdb: item.imdb
      ? {
          vote_average: Number(item.imdb.vote_average || 0),
          vote_count: Number(item.imdb.vote_count || 0),
        }
      : undefined,
    category: Array.isArray(item.category)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? item.category.map((c: any) => ({
          id: c?.id || c?.slug,
          slug: c?.slug || c?.id,
          name: c?.name || c?.slug || "",
        }))
      : undefined,
    country: Array.isArray(item.country)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? item.country.map((c: any) => ({
          id: c?.id || c?.slug,
          slug: c?.slug || c?.id,
          name: c?.name || c?.slug || "",
        }))
      : undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function filterAndSortDataset(items: any[], params: MovieFilterParams): any[] {
  let filtered = [...items];

  // 1. Lọc theo Loại Phim (Phim lẻ / Phim bộ / Hoạt hình / Chiếu rạp / TV Shows)
  if (params.type) {
    filtered = filtered.filter((item) => isMovieOfType(item, params.type!));
  }

  // 2. Lọc theo Quốc Gia
  if (params.country) {
    const targetCountry = params.country.toLowerCase().trim();
    filtered = filtered.filter((item) => {
      // Schema NguonC thiếu metadata quốc gia -> không giả định thiếu metadata nghĩa là không match
      if (!item.country || (Array.isArray(item.country) && item.country.length === 0)) {
        return true;
      }
      const ctryArray = Array.isArray(item.country)
        ? item.country.map((c: { slug?: string; name?: string }) =>
            `${c.slug || ""} ${c.name || ""}`.toLowerCase()
          )
        : [String(item.country || "").toLowerCase()];
      return ctryArray.some((cStr: string) => cStr.includes(targetCountry));
    });
  }

  // 3. Lọc theo Thể Loại
  if (params.category) {
    const targetCat = params.category.toLowerCase().trim();
    filtered = filtered.filter((item) => {
      // Schema NguonC thiếu metadata thể loại -> không giả định thiếu metadata nghĩa là không match
      if (!item.category || (Array.isArray(item.category) && item.category.length === 0)) {
        return true;
      }
      const catArray = Array.isArray(item.category)
        ? item.category.map((c: { slug?: string; name?: string }) =>
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

  // 5. Sắp xếp
  if (params.sort === "rating") {
    const ratedItems = filtered.filter((item) => {
      const voteCount = Number(item.tmdb?.vote_count || 0);
      return voteCount >= 50;
    });
    if (ratedItems.length >= 5) {
      filtered = ratedItems;
    }

    filtered.sort((a, b) => {
      const rateA = Number(a.tmdb?.vote_average || a.imdb?.vote_average || 0);
      const rateB = Number(b.tmdb?.vote_average || b.imdb?.vote_average || 0);
      return rateB - rateA;
    });
  } else if (params.sort === "views") {
    filtered.sort((a, b) => {
      const countA = Number(a.tmdb?.vote_count || a.view || 0);
      const countB = Number(b.tmdb?.vote_count || b.view || 0);
      return countB - countA;
    });
  } else if (params.sort === "year") {
    filtered.sort((a, b) => {
      const yearA = Number(a.year || 0);
      const yearB = Number(b.year || 0);
      return yearB - yearA;
    });
  }

  return filtered;
}

// Bounded Concurrency Batch Fetching cho background indexing
async function batchFetchPages(
  baseUrl: string,
  params: MovieFilterParams,
  isSearch: boolean,
  pages: number[],
  concurrency: number = 16,
  delayMs: number = 20
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allItems: any[] = [];
  let consecutiveEmptyBatches = 0;

  for (let i = 0; i < pages.length; i += concurrency) {
    const chunk = pages.slice(i, i + concurrency);
    const results = await Promise.all(
      chunk.map(async (p) => {
        let res = await fetchSourceData(baseUrl, params, isSearch, p);
        if (!res || !res.items || res.items.length === 0) {
          // Retry 1 lần nếu gặp sự cố mạng ngắt quãng
          await sleep(60);
          res = await fetchSourceData(baseUrl, params, isSearch, p);
        }
        return res;
      })
    );

    let batchCount = 0;
    for (const r of results) {
      if (r?.items && r.items.length > 0) {
        allItems.push(...r.items);
        batchCount += r.items.length;
      }
    }

    if (batchCount === 0) {
      consecutiveEmptyBatches++;
      if (consecutiveEmptyBatches >= 3) {
        break;
      }
    } else {
      consecutiveEmptyBatches = 0;
    }

    if (delayMs > 0 && i + concurrency < pages.length) {
      await sleep(delayMs);
    }
  }

  return allItems;
}

export interface BrowseDatasetMeta {
  version: number;
  totalItems: number;
  totalPages: number;
  chunkSize: number;
  chunkCount: number;
  updatedAt: number;
  expireAt: number;
  staleUntil: number;
  phimApiFetched?: number;
  nguonCFetched?: number;
  mergedBeforeDedup?: number;
  uniqueAfterDedup?: number;
  afterFilter?: number;
  isFullSync?: boolean;
}

const datasetMetaMemoryCache = new Map<string, BrowseDatasetMeta>();

// Lưu dataset dưới dạng nhiều chunks nhỏ (mỗi chunk ~1-1.5 MB, an toàn tuyệt đối dưới trần 10 MB của Upstash)
export async function saveDatasetInChunks(
  filterKey: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[],
  diagnostics?: Partial<BrowseDatasetMeta>
): Promise<BrowseDatasetMeta> {
  const filterKeySafe = getBrowseDatasetRedisKey(filterKey);
  const version = Date.now();
  const ttlSeconds = 86400; // 24 hours
  const now = Date.now();

  // Xác định chunkSize tối ưu: mặc định 2400 items (~1.2 MB, đúng bằng 100 trang 24 items)
  let chunkSize = 2400;
  if (items.length > 0) {
    const sample = items.slice(0, Math.min(2400, items.length));
    const sampleBytes = Buffer.byteLength(JSON.stringify(sample), "utf8");
    if (sampleBytes > 2.0 * 1024 * 1024) {
      chunkSize = 1200; // Fallback xuống 1200 items (~1 MB, 50 trang 24 items)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chunks: any[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  if (chunks.length === 0) chunks.push([]);

  // Bước 1: Ghi toàn bộ các chunk trước
  for (let i = 0; i < chunks.length; i++) {
    const chunkKey = `${filterKeySafe}:v:${version}:chunk:${i}`;
    await cacheService.set(chunkKey, chunks[i], ttlSeconds).catch((err) => {
      console.warn(`[CHUNK WRITE ERROR] key="${chunkKey}":`, err);
    });
  }

  // Bước 2: Tạo và ghi meta SAU CÙNG
  const meta: BrowseDatasetMeta = {
    version,
    totalItems: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / 24)),
    chunkSize,
    chunkCount: chunks.length,
    updatedAt: now,
    expireAt: now + ttlSeconds * 1000,
    staleUntil: now + 2 * ttlSeconds * 1000,
    phimApiFetched: diagnostics?.phimApiFetched || 0,
    nguonCFetched: diagnostics?.nguonCFetched || 0,
    mergedBeforeDedup: diagnostics?.mergedBeforeDedup || 0,
    uniqueAfterDedup: diagnostics?.uniqueAfterDedup || items.length,
    afterFilter: diagnostics?.afterFilter || items.length,
    isFullSync: diagnostics?.isFullSync ?? true,
  };

  const metaKey = `${filterKeySafe}:v:${version}:meta`;
  await cacheService.set(metaKey, meta, ttlSeconds).catch((err) => {
    console.warn(`[META WRITE ERROR] key="${metaKey}":`, err);
  });

  // Bước 3: Lấy active pointer cũ để dọn dẹp sau, sau đó ghi active pointer mới
  const activeKey = `${filterKeySafe}:active`;
  const prevActive = await cacheService.get<{ activeVersion: number }>(activeKey).catch(() => null);

  await cacheService.set(activeKey, { activeVersion: version, updatedAt: now }, ttlSeconds).catch((err) => {
    console.warn(`[ACTIVE POINTER WRITE ERROR] key="${activeKey}":`, err);
  });

  // Lưu meta vào RAM L1
  datasetMetaMemoryCache.set(filterKey, meta);

  // Bước 4: Sau khi snapshot mới đã usable và active, dọn dẹp version cũ ngầm (non-blocking)
  if (prevActive && prevActive.activeVersion && prevActive.activeVersion !== version) {
    cleanupOldDatasetVersion(filterKeySafe, prevActive.activeVersion).catch(() => {});
  }

  // Xóa key legacy single-string cũ nếu còn tồn tại
  cacheService.delete(filterKeySafe).catch(() => {});

  return meta;
}

// Hàm dọn dẹp các chunk của version cũ
async function cleanupOldDatasetVersion(filterKeySafe: string, oldVersion: number): Promise<void> {
  try {
    const oldMetaKey = `${filterKeySafe}:v:${oldVersion}:meta`;
    const oldMeta = await cacheService.get<BrowseDatasetMeta>(oldMetaKey).catch(() => null);
    if (oldMeta && oldMeta.chunkCount) {
      for (let i = 0; i < oldMeta.chunkCount; i++) {
        await cacheService.delete(`${filterKeySafe}:v:${oldVersion}:chunk:${i}`).catch(() => {});
      }
    }
    await cacheService.delete(oldMetaKey).catch(() => {});
  } catch (err) {
    console.warn(`[CLEANUP OLD VERSION ERROR] v:${oldVersion}:`, err);
  }
}

// Đọc chính xác page từ Redis chunks mà TUYỆT ĐỐI KHÔNG GET TOÀN BỘ DATASET
export async function getBrowsePageFromStorage(
  filterKey: string,
  params: MovieFilterParams,
  limit: number = 24,
  page: number = 1
): Promise<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[];
  totalItems: number;
  totalPages: number;
  meta: BrowseDatasetMeta;
} | null> {
  const filterKeySafe = getBrowseDatasetRedisKey(filterKey);
  const now = Date.now();

  // 1. Kiểm tra L1 Memory Meta
  let meta = datasetMetaMemoryCache.get(filterKey);
  if (!meta || meta.staleUntil <= now) {
    // 2. Đọc pointer active version từ Redis
    const activeKey = `${filterKeySafe}:active`;
    const active = await cacheService
      .get<{ activeVersion: number; updatedAt: number }>(activeKey)
      .catch(() => null);

    if (active?.activeVersion) {
      const metaKey = `${filterKeySafe}:v:${active.activeVersion}:meta`;
      const redisMeta = await cacheService.get<BrowseDatasetMeta>(metaKey).catch(() => null);
      if (redisMeta && redisMeta.chunkCount > 0) {
        meta = redisMeta;
        datasetMetaMemoryCache.set(filterKey, meta);
      }
    }
  }

  // 3. Fallback đọc legacy single-string key nếu hệ thống đang migrate
  if (!meta) {
    const legacy = await cacheService.get<DatasetCacheEntry>(filterKeySafe).catch(() => null);
    if (legacy && legacy.items && legacy.items.length > 0) {
      // Async lưu sang chunks và dọn dẹp legacy
      saveDatasetInChunks(filterKey, legacy.items, legacy).catch(() => {});

      const startIndex = (page - 1) * limit;
      const pageItems = legacy.items.slice(startIndex, startIndex + limit);
      return {
        items: pageItems,
        totalItems: legacy.totalItems,
        totalPages: legacy.totalPages,
        meta: {
          version: 0,
          totalItems: legacy.totalItems,
          totalPages: legacy.totalPages,
          chunkSize: legacy.items.length,
          chunkCount: 1,
          updatedAt: Date.now(),
          expireAt: legacy.expireAt,
          staleUntil: legacy.staleUntil,
          phimApiFetched: legacy.phimApiFetched,
          nguonCFetched: legacy.nguonCFetched,
          mergedBeforeDedup: legacy.mergedBeforeDedup,
          uniqueAfterDedup: legacy.uniqueAfterDedup,
          afterFilter: legacy.afterFilter,
          isFullSync: legacy.isFullSync,
        },
      };
    }
    return null; // Cache miss
  }

  // 4. Có meta hợp lệ -> tính toán chunk chứa page này
  const totalItems = meta.totalItems;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const startIndex = (page - 1) * limit;

  if (startIndex >= totalItems) {
    return {
      items: [],
      totalItems,
      totalPages,
      meta,
    };
  }

  const endIndex = Math.min(startIndex + limit, totalItems);
  const startChunkIndex = Math.floor(startIndex / meta.chunkSize);
  const endChunkIndex = Math.floor((endIndex - 1) / meta.chunkSize);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pageItems: any[] = [];

  if (startChunkIndex === endChunkIndex) {
    // 99.9% trường hợp: page nằm gọn trong 1 chunk -> CHỈ GET ĐÚNG 1 CHUNK NÀY (~1 MB)!
    const chunkKey = `${filterKeySafe}:v:${meta.version}:chunk:${startChunkIndex}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chunk = await cacheService.get<any[]>(chunkKey).catch(() => null);
    const chunkOffset = startIndex - startChunkIndex * meta.chunkSize;
    pageItems = (chunk || []).slice(chunkOffset, chunkOffset + limit);
  } else {
    // Trường hợp page vắt ngang qua 2 chunk (khi limit tùy ý như limit=100)
    const chunkKey1 = `${filterKeySafe}:v:${meta.version}:chunk:${startChunkIndex}`;
    const chunkKey2 = `${filterKeySafe}:v:${meta.version}:chunk:${endChunkIndex}`;
    const [c1, c2] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cacheService.get<any[]>(chunkKey1).catch(() => null),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cacheService.get<any[]>(chunkKey2).catch(() => null),
    ]);
    const offset1 = startIndex - startChunkIndex * meta.chunkSize;
    const itemsFromC1 = (c1 || []).slice(offset1);
    const remainingNeeded = limit - itemsFromC1.length;
    const itemsFromC2 = (c2 || []).slice(0, remainingNeeded);
    pageItems = [...itemsFromC1, ...itemsFromC2];
  }

  return {
    items: pageItems,
    totalItems,
    totalPages,
    meta,
  };
}

// Background Task: Quét toàn bộ dataset, hợp nhất, khử trùng lặp và lưu vào Redis
export async function runBackgroundDatasetIngestion(
  params: MovieFilterParams,
  filterKey: string
): Promise<DatasetCacheEntry> {
  const isSearch = Boolean(params.keyword?.trim());

  console.log(`[INGESTION START] Filter key="${filterKey}"`);
  const t0 = Date.now();

  try {
    const [resP1, resN1] = await Promise.all([
      fetchSourceData(API_PHIMAPI, params, isSearch, 1),
      fetchSourceData(API_NGUONC, params, isSearch, 1),
    ]);

    const totalPhimApiPages = isSearch
      ? Math.min(resP1?.totalPages || 0, 5)
      : resP1?.totalPages || 0;
    const totalNguonCPages = isSearch
      ? Math.min(resN1?.totalPages || 0, 8)
      : resN1?.totalPages || 0;

    const initialPhimApiItems = resP1?.items || [];
    const initialNguonCItems = resN1?.items || [];

    const pPages = Array.from(
      { length: Math.max(0, totalPhimApiPages - 1) },
      (_, i) => i + 2
    );
    const nPages = Array.from(
      { length: Math.max(0, totalNguonCPages - 1) },
      (_, i) => i + 2
    );

    // Fetch toàn bộ các trang còn lại với concurrency giới hạn an toàn
    const [morePhimApi, moreNguonC] = await Promise.all([
      batchFetchPages(API_PHIMAPI, params, isSearch, pPages, 16, 20),
      batchFetchPages(API_NGUONC, params, isSearch, nPages, 16, 20),
    ]);

    const allPhimApiItems = [...initialPhimApiItems, ...morePhimApi];
    const allNguonCItems = [...initialNguonCItems, ...moreNguonC];

    // Interleave 2 nguồn theo tỉ lệ 2:1
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const interleaved: any[] = [];
    let pi = 0;
    let ni = 0;
    while (pi < allPhimApiItems.length || ni < allNguonCItems.length) {
      for (let k = 0; k < 2 && pi < allPhimApiItems.length; k++) {
        interleaved.push(allPhimApiItems[pi++]);
      }
      if (ni < allNguonCItems.length) {
        interleaved.push(allNguonCItems[ni++]);
      }
    }

    // Dedup theo slug (slug là identity duy nhất)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uniqueItemsMap = new Map<string, any>();
    interleaved.forEach((item) => {
      if (item?.slug && !uniqueItemsMap.has(item.slug)) {
        uniqueItemsMap.set(item.slug, toCompactBrowseMovie(item));
      }
    });

    // Lọc và sắp xếp dataset
    const filteredAndSortedItems = filterAndSortDataset(
      Array.from(uniqueItemsMap.values()),
      params
    );

    // 1. Lưu vào L2 Upstash Redis dưới dạng CHUNKS (mỗi chunk ~1-1.5 MB, an toàn tuyệt đối)
    const meta = await saveDatasetInChunks(filterKey, filteredAndSortedItems, {
      phimApiFetched: allPhimApiItems.length,
      nguonCFetched: allNguonCItems.length,
      mergedBeforeDedup: interleaved.length,
      uniqueAfterDedup: uniqueItemsMap.size,
      afterFilter: filteredAndSortedItems.length,
      isFullSync: true,
    });

    const dataset: DatasetCacheEntry = {
      items: filteredAndSortedItems,
      totalItems: meta.totalItems,
      totalPages: meta.totalPages,
      expireAt: meta.expireAt,
      staleUntil: meta.staleUntil,
      phimApiFetched: meta.phimApiFetched || 0,
      nguonCFetched: meta.nguonCFetched || 0,
      mergedBeforeDedup: meta.mergedBeforeDedup || 0,
      uniqueAfterDedup: meta.uniqueAfterDedup || 0,
      afterFilter: meta.afterFilter || 0,
      isFullSync: true,
    };

    // 2. Lưu vào L1 RAM
    filterDatasetMemoryCache.set(filterKey, dataset);

    console.log(
      `[BROWSE INGESTION COMPLETE] Filter="${filterKey}" in ${Date.now() - t0}ms: ` +
        `PhimAPI=${meta.phimApiFetched}, NguonC=${meta.nguonCFetched}, ` +
        `Merged=${meta.mergedBeforeDedup}, Unique=${meta.uniqueAfterDedup}, ` +
        `AfterFilter=${meta.afterFilter}, TotalPages=${meta.totalPages}, ` +
        `Chunks=${meta.chunkCount} (chunkSize=${meta.chunkSize})`
    );

    return dataset;
  } catch (error) {
    console.error(`[INGESTION ERROR] Filter key="${filterKey}":`, error);
    const existing = filterDatasetMemoryCache.get(filterKey);
    if (existing) return existing;
    throw error;
  }
}

// Hàm kích hoạt hoặc chờ đồng bộ hoàn toàn dataset (dành cho pre-warm & regression tests)
export async function syncFullBrowseDataset(params: MovieFilterParams): Promise<DatasetCacheEntry> {
  const filterKey = getDatasetFilterKey(params);
  let ingestionPromise = inFlightIngestionMap.get(filterKey);
  if (!ingestionPromise) {
    ingestionPromise = runBackgroundDatasetIngestion(params, filterKey).finally(() => {
      inFlightIngestionMap.delete(filterKey);
    });
    inFlightIngestionMap.set(filterKey, ingestionPromise);
  }
  return await ingestionPromise;
}

async function executeGetMovies(params: MovieFilterParams, cacheKey: string) {
  const isSearch = Boolean(params.keyword?.trim());
  const limit = params.limit || 24;
  const page = params.page || 1;
  const filterKey = getDatasetFilterKey(params);
  const now = Date.now();

  // 1. Kiểm tra L1 In-Memory Cache (Full Dataset)
  let dataset = filterDatasetMemoryCache.get(filterKey);
  if (dataset && dataset.staleUntil > now) {
    const startIndex = (page - 1) * limit;
    const finalItems = dataset.items.slice(startIndex, startIndex + limit);
    const totalItems = dataset.totalItems;
    const totalPages = dataset.totalPages;

    console.log(`[BROWSE DATASET]
PhimAPI fetched: ${dataset.phimApiFetched}
NguonC fetched: ${dataset.nguonCFetched}
Merged: ${dataset.mergedBeforeDedup}
Unique: ${dataset.uniqueAfterDedup}
After filter: ${dataset.afterFilter}
Returned page items: ${finalItems.length}
TotalItems: ${totalItems}
TotalPages: ${totalPages}`);

    if (process.env.NODE_ENV !== "production") {
      console.debug("[BROWSE META]", { page, totalItems, totalPages });
    }

    const payload = {
      status: true,
      items: finalItems,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
      },
    };

    moviesMemoryCache.set(cacheKey, {
      data: payload,
      expireAt: now + 300 * 1000,
      staleUntil: now + 1800 * 1000,
    });

    return payload;
  }

  // 2. Kiểm tra Chunked Storage từ Redis (CHỈ GET CHUNK CẦN THIẾT, KHÔNG GET TOÀN BỘ DATASET)
  const chunkedResult = await getBrowsePageFromStorage(filterKey, params, limit, page);
  if (chunkedResult) {
    const finalItems = chunkedResult.items;
    const totalItems = chunkedResult.totalItems;
    const totalPages = chunkedResult.totalPages;

    console.log(`[BROWSE DATASET]
PhimAPI fetched: ${chunkedResult.meta.phimApiFetched ?? "cached"}
NguonC fetched: ${chunkedResult.meta.nguonCFetched ?? "cached"}
Merged: ${chunkedResult.meta.mergedBeforeDedup ?? "cached"}
Unique: ${chunkedResult.meta.uniqueAfterDedup ?? totalItems}
After filter: ${chunkedResult.meta.afterFilter ?? totalItems}
Returned page items: ${finalItems.length}
TotalItems: ${totalItems}
TotalPages: ${totalPages}`);

    if (process.env.NODE_ENV !== "production") {
      console.debug("[BROWSE META]", { page, totalItems, totalPages });
    }

    const payload = {
      status: true,
      items: finalItems,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
      },
    };

    moviesMemoryCache.set(cacheKey, {
      data: payload,
      expireAt: now + 300 * 1000,
      staleUntil: now + 1800 * 1000,
    });

    return payload;
  }

  // 3. Cache Miss:
  if (params.waitForFullSync) {
    // Chỉ kích hoạt và chờ Full Ingestion khi caller yêu cầu rõ ràng (Cron sync / test runner)
    let ingestionPromise = inFlightIngestionMap.get(filterKey);
    if (!ingestionPromise) {
      ingestionPromise = runBackgroundDatasetIngestion(params, filterKey).finally(() => {
        inFlightIngestionMap.delete(filterKey);
      });
      inFlightIngestionMap.set(filterKey, ingestionPromise);
    }
    dataset = await ingestionPromise;
  } else {
    // HTTP user request: KHÔNG tự động detached-crawl hàng trăm upstream pages!
    // Xây dựng fast initial fallback batch trong ~400ms để trả ngay cho user, tránh trắng trang UI
    const [resP1, resN1] = await Promise.all([
      fetchSourceData(API_PHIMAPI, params, isSearch, 1),
      fetchSourceData(API_NGUONC, params, isSearch, 1),
    ]);

    const totalP = resP1?.totalPages || 0;
    const totalN = resN1?.totalPages || 0;
    const batchP = isSearch ? 2 : Math.min(totalP, 10);
    const batchN = isSearch ? 3 : Math.min(totalN, 24);

    const pPages = Array.from({ length: Math.max(0, batchP - 1) }, (_, i) => i + 2);
    const nPages = Array.from({ length: Math.max(0, batchN - 1) }, (_, i) => i + 2);

    const [moreP, moreN] = await Promise.all([
      batchFetchPages(API_PHIMAPI, params, isSearch, pPages, 8, 20),
      batchFetchPages(API_NGUONC, params, isSearch, nPages, 8, 20),
    ]);

    const allP = [...(resP1?.items || []), ...moreP];
    const allN = [...(resN1?.items || []), ...moreN];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fallbackInterleaved: any[] = [];
    let fpi = 0;
    let fni = 0;
    while (fpi < allP.length || fni < allN.length) {
      for (let k = 0; k < 2 && fpi < allP.length; k++) {
        fallbackInterleaved.push(allP[fpi++]);
      }
      if (fni < allN.length) {
        fallbackInterleaved.push(allN[fni++]);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fallbackMap = new Map<string, any>();
    fallbackInterleaved.forEach((item) => {
      if (item?.slug && !fallbackMap.has(item.slug)) {
        fallbackMap.set(item.slug, toCompactBrowseMovie(item));
      }
    });

    const fallbackFiltered = filterAndSortDataset(Array.from(fallbackMap.values()), params);
    dataset = {
      items: fallbackFiltered,
      totalItems: fallbackFiltered.length,
      totalPages: Math.max(1, Math.ceil(fallbackFiltered.length / limit)),
      expireAt: now + 300 * 1000,
      staleUntil: now + 1800 * 1000,
      phimApiFetched: allP.length,
      nguonCFetched: allN.length,
      mergedBeforeDedup: fallbackInterleaved.length,
      uniqueAfterDedup: fallbackMap.size,
      afterFilter: fallbackFiltered.length,
      isFullSync: false,
    };
    filterDatasetMemoryCache.set(filterKey, dataset);
  }

  // 4. Metadata BẤT BIẾN lấy từ dataset đã tính toán
  const totalItems = dataset.totalItems;
  const totalPages = dataset.totalPages;

  // 5. Slice theo page từ dataset cố định
  const startIndex = (page - 1) * limit;
  const finalItems = dataset.items.slice(startIndex, startIndex + limit);

  console.log(`[BROWSE DATASET]
PhimAPI fetched: ${dataset.phimApiFetched}
NguonC fetched: ${dataset.nguonCFetched}
Merged: ${dataset.mergedBeforeDedup}
Unique: ${dataset.uniqueAfterDedup}
After filter: ${dataset.afterFilter}
Returned page items: ${finalItems.length}
TotalItems: ${totalItems}
TotalPages: ${totalPages}`);

  // Debug log (chỉ trong DEV)
  if (process.env.NODE_ENV !== "production") {
    console.debug("[BROWSE META]", { page, totalItems, totalPages });
  }

  const payload = {
    status: true,
    items: finalItems,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems,
    },
  };

  moviesMemoryCache.set(cacheKey, {
    data: payload,
    expireAt: now + 300 * 1000,
    staleUntil: now + 1800 * 1000,
  });

  return payload;
}

let hasWarmedUp = false;
function warmUpTopCategories() {
  if (hasWarmedUp) return;
  hasWarmedUp = true;
  // Tránh spam background requests khi đang chạy test runner
  const isTest =
    process.env.NODE_ENV === "test" ||
    process.argv.some((a) => a.includes("--test") || a.includes(".test.ts"));
  if (isTest) return;

  const commonFilters: MovieFilterParams[] = [
    { country: "thai-lan" },
    { category: "hai-huoc" },
    { type: "phim-bo" },
    { type: "phim-le" },
    { type: "hoat-hinh" },
    { type: "phim-chieu-rap" },
  ];
  setTimeout(async () => {
    for (const filter of commonFilters) {
      try {
        await syncFullBrowseDataset(filter);
        await sleep(500);
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[WARMUP BACKGROUND ERROR]", err);
        }
      }
    }
  }, 2000);
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
  syncFullBrowseDataset,
  // ==========================================
  // 1. LẤY DANH SÁCH PHIM (STALE-WHILE-REVALIDATE 0MS)
  // ==========================================
  getMovies: async (params: MovieFilterParams = {}) => {
    // Kích hoạt nạp sẵn dữ liệu các danh mục chính trong nền
    if (!hasWarmedUp) {
      warmUpTopCategories();
    }

    const cacheKey = JSON.stringify({
      v: 3,
      category: params.category || "",
      country: params.country || "",
      year: params.year || "",
      keyword: params.keyword?.trim() || "",
      page: params.page || 1,
      limit: params.limit || 24,
      type: params.type || "",
      sort: params.sort || "latest",
    });

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
};
