import { cache } from "react";
import { cleanHtmlText } from "@/lib/cleanHtml";

const API_VSMOV = process.env.NEXT_PUBLIC_API_URL || "https://vsmov.com/api";
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
}

// Hàm nội bộ lấy chi tiết phim có in-memory cache SWR
const fetchMovieDetailInternal = async (
  slug: string,
  source?: "vsmov" | "ophim",
) => {
  const cacheKey = `${slug}_${source || "any"}`;
  const now = Date.now();

  if (movieDetailMemoryCache.has(cacheKey)) {
    const entry = movieDetailMemoryCache.get(cacheKey)!;
    if (entry.expireAt > now) {
      return entry.data;
    }
    // Trả về dữ liệu đệm ngay lập tức nếu chưa quá hạn stale (0ms)
    if (entry.staleUntil > now) {
      // Revalidate ngầm
      revalidateMovieDetail(slug, source, cacheKey).catch(() => {});
      return entry.data;
    }
  }

  return await fetchAndCacheMovieDetail(slug, source, cacheKey);
};

async function revalidateMovieDetail(slug: string, source?: "vsmov" | "ophim", cacheKey?: string) {
  try {
    await fetchAndCacheMovieDetail(slug, source, cacheKey || `${slug}_${source || "any"}`);
  } catch {}
}

async function fetchAndCacheMovieDetail(slug: string, source?: "vsmov" | "ophim", cacheKey?: string) {
  const now = Date.now();
  const key = cacheKey || `${slug}_${source || "any"}`;

  try {
    let result = undefined;

    if (source === "vsmov") {
      const res = await fetch(`${API_VSMOV}/phim/${slug}`, {
        next: { revalidate: 600 },
        signal: AbortSignal.timeout(4500),
      });
      if (res.ok) result = await res.json();
    } else if (source === "ophim") {
      const res = await fetch(`${API_PHIMAPI}/phim/${slug}`, {
        next: { revalidate: 600 },
        signal: AbortSignal.timeout(4500),
      });
      if (res.ok) result = await res.json();
    } else {
      try {
        result = await Promise.any([
          fetch(`${API_VSMOV}/phim/${slug}`, {
            next: { revalidate: 600 },
            signal: AbortSignal.timeout(4500),
          }).then((res) => {
            if (!res.ok) throw new Error("VSMOV 404");
            return res.json();
          }),

          fetch(`${API_PHIMAPI}/phim/${slug}`, {
            next: { revalidate: 600 },
            signal: AbortSignal.timeout(4500),
          }).then((res) => {
            if (!res.ok) throw new Error("PhimAPI 404");
            return res.json();
          }),
        ]);
      } catch {
        result = undefined;
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
function isMovieOfType(item: Record<string, unknown>, type: string): boolean {
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
      return isChieuRap;
    case "tv-shows":
      return isTvShows;
    default:
      return true;
  }
}

// Hàm tải nguồn phim nhanh có giới hạn timeout an toàn
async function fetchSourceData(baseUrl: string, params: MovieFilterParams, isSearch: boolean) {
  try {
    const isMultiFilter = Boolean(params.type && (params.category || params.country || params.year));
    
    // VSMOV không hỗ trợ kết hợp type + category/country/year trên /danh-sach/ -> Bỏ qua để tránh dump toàn bộ 37k phim rác
    if (baseUrl === API_VSMOV && isMultiFilter) {
      return null;
    }

    const urlParams = new URLSearchParams();
    urlParams.set("page", String(params.page || 1));
    const fetchLimit = isMultiFilter ? 48 : (params.limit || 24);
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
      if (isSearch && params.keyword) {
        urlParams.set("keyword", params.keyword.trim());
        fullUrl = `${baseUrl}/tim-kiem?${urlParams.toString()}`;
      } else if (params.type) {
        if (params.type === "hoat-hinh" || params.type === "tv-shows") {
          fullUrl = `${baseUrl}/the-loai/${params.type}?${urlParams.toString()}`;
        } else {
          fullUrl = `${baseUrl}/danh-sach/${params.type}?${urlParams.toString()}`;
        }
      } else if (params.category) {
        fullUrl = `${baseUrl}/the-loai/${params.category}?${urlParams.toString()}`;
      } else if (params.country) {
        fullUrl = `${baseUrl}/quoc-gia/${params.country}?${urlParams.toString()}`;
      } else {
        fullUrl = `${baseUrl}/danh-sach/phim-moi-cap-nhat?${urlParams.toString()}`;
      }
    }

    const res = await fetch(fullUrl, {
      next: { revalidate: 300 }, // 5 phút Next.js cache
      signal: AbortSignal.timeout(4500), // Timeout 4.5s tránh giữ kết nối
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

    const rawItems = json.data?.items || json.items || [];
    const mappedVsmovItems = rawItems.map((item: {
      thumb_url?: string;
      poster_url?: string;
      slug?: string;
      [key: string]: unknown;
    }) => {
      const vsmovBackdrop = item.poster_url;
      const vsmovPoster = item.thumb_url;
      const cleanPoster = vsmovPoster || item.poster_url || "";
      const cleanThumb = vsmovBackdrop || item.thumb_url || "";
      return {
        ...item,
        poster_url: cleanPoster || cleanThumb,
        thumb_url: cleanThumb || cleanPoster,
      };
    });

    const totalItems =
      json.data?.params?.pagination?.totalItems ||
      json.pagination?.totalItems ||
      mappedVsmovItems.length ||
      0;

    const totalPages =
      json.data?.params?.pagination?.totalPages ||
      json.pagination?.totalPages ||
      Math.ceil(totalItems / 24) ||
      1;

    return {
      items: mappedVsmovItems,
      totalPages,
      totalItems,
    };
  } catch {
    return null;
  }
}

async function executeGetMovies(params: MovieFilterParams, cacheKey: string) {
  const isSearch = Boolean(params.keyword?.trim());
  
  // Tải đồng thời từ cả 2 nguồn API để có kho phim phong phú nhất
  const [resVsmov, resPhimApi] = await Promise.all([
    fetchSourceData(API_VSMOV, params, isSearch),
    fetchSourceData(API_PHIMAPI, params, isSearch),
  ]);

  const itemsVsmov = resVsmov?.items || [];
  const itemsPhimApi = resPhimApi?.items || [];

  // Gộp và khử trùng lặp slug
  const combinedItems = [...itemsVsmov, ...itemsPhimApi];
  const uniqueItemsMap = new Map();
  combinedItems.forEach((item) => {
    if (!uniqueItemsMap.has(item.slug)) {
      uniqueItemsMap.set(item.slug, item);
    }
  });

  let allUniqueItems = Array.from(uniqueItemsMap.values());

  // 1. Lọc theo Loại Phim (Phim lẻ / Phim bộ / Hoạt hình / Chiếu rạp / TV Shows)
  if (params.type) {
    const filteredByType = allUniqueItems.filter((item) =>
      isMovieOfType(item, params.type!)
    );
    if (filteredByType.length > 0) {
      allUniqueItems = filteredByType;
    }
  }

  // 2. Lọc theo Quốc Gia
  if (params.country) {
    const targetCountry = params.country.toLowerCase().trim();
    const filtered = allUniqueItems.filter((item) => {
      const ctryArray = Array.isArray(item.country)
        ? item.country.map((c: { slug?: string; name?: string }) =>
            `${c.slug || ""} ${c.name || ""}`.toLowerCase()
          )
        : [String(item.country || "").toLowerCase()];
      return ctryArray.some((cStr: string) => cStr.includes(targetCountry));
    });
    if (filtered.length > 0) allUniqueItems = filtered;
  }

  // 3. Lọc theo Thể Loại
  if (params.category) {
    const targetCat = params.category.toLowerCase().trim();
    const filtered = allUniqueItems.filter((item) => {
      const catArray = Array.isArray(item.category)
        ? item.category.map((c: { slug?: string; name?: string }) =>
            `${c.slug || ""} ${c.name || ""}`.toLowerCase()
          )
        : [String(item.category || "").toLowerCase()];
      return catArray.some((cStr: string) => cStr.includes(targetCat));
    });
    if (filtered.length > 0) allUniqueItems = filtered;
  }

  // 4. Lọc theo Năm
  if (params.year) {
    const filtered = allUniqueItems.filter((item) =>
      String(item.year || "").includes(String(params.year))
    );
    if (filtered.length > 0) allUniqueItems = filtered;
  }

  // 5. Sắp xếp
  if (params.sort === "rating") {
    allUniqueItems.sort((a, b) => {
      const rateA = Number(a.tmdb?.vote_average || a.imdb?.vote_average || 0);
      const rateB = Number(b.tmdb?.vote_average || b.imdb?.vote_average || 0);
      return rateB - rateA;
    });
  } else if (params.sort === "views") {
    allUniqueItems.sort((a, b) => {
      const countA = Number(a.tmdb?.vote_count || a.view || 0);
      const countB = Number(b.tmdb?.vote_count || b.view || 0);
      return countB - countA;
    });
  } else if (params.sort === "year") {
    allUniqueItems.sort((a, b) => {
      const yearA = Number(a.year || 0);
      const yearB = Number(b.year || 0);
      return yearB - yearA;
    });
  }

  const limit = params.limit || 24;
  const finalItems = allUniqueItems.slice(0, limit);

  // Tính tổng số lượng phim thực tế kết hợp từ cả 2 nguồn API (đã trừ tỷ lệ trùng lặp ~55% giữa 2 nguồn)
  const countApi1 = resPhimApi?.totalItems || 0;
  const countApi2 = resVsmov?.totalItems || 0;

  let totalItemsCount = 0;
  if (countApi1 > 0 && countApi2 > 0) {
    totalItemsCount =
      Math.max(countApi1, countApi2) + Math.round(Math.min(countApi1, countApi2) * 0.45);
  } else {
    totalItemsCount = countApi1 || countApi2 || allUniqueItems.length;
  }

  const maxTotalPages = Math.max(
    resPhimApi?.totalPages || 0,
    resVsmov?.totalPages || 0,
    Math.ceil(totalItemsCount / limit) || 1
  );

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

let hasWarmedUp = false;
function warmUpTopCategories() {
  if (hasWarmedUp) return;
  hasWarmedUp = true;
  const commonTabs = [
    { type: "phim-bo" },
    { type: "phim-le" },
    { type: "phim-chieu-rap" },
    { type: "hoat-hinh" },
    { year: "2026" },
  ];
  setTimeout(() => {
    commonTabs.forEach((tab) => {
      movieApi.getMovies({ type: tab.type, limit: 24 }).catch(() => {});
    });
  }, 200);
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

    const cacheKey = JSON.stringify({
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

    return await executeGetMovies(params, cacheKey);
  },

  // ==========================================
  // 2. LẤY FILTER (VỚI IN-MEMORY CACHE)
  // ==========================================
  getFilters: async () => {
    if (cachedFilters) {
      return cachedFilters;
    }

    try {
      const [theLoaiRes, quocGiaRes] = await Promise.all([
        fetch(`${API_VSMOV}/the-loai`, {
          next: { revalidate: 3600 },
          signal: AbortSignal.timeout(4000),
        }),
        fetch(`${API_VSMOV}/quoc-gia`, {
          next: { revalidate: 3600 },
          signal: AbortSignal.timeout(4000),
        }),
      ]);

      const theLoaiData = await theLoaiRes.json();
      const quocGiaData = await quocGiaRes.json();
      const currentYear = new Date().getFullYear();
      const years = Array.from({ length: 50 }, (_, index) =>
        String(currentYear - index),
      );

      const result = {
        genres: theLoaiData.data?.items || theLoaiData.items || [],
        countries: quocGiaData.data?.items || quocGiaData.items || [],
        years,
      };

      cachedFilters = result;
      return result;
    } catch (error) {
      console.error("❌ Lỗi tải filter:", error);
      return { genres: [], countries: [], years: [] };
    }
  },

  // ==========================================
  // 3. CHI TIẾT PHIM (ĐÃ ĐƯỢC CACHE REACT & MEMORY)
  // ==========================================
  getMovieDetail: cachedGetMovieDetail,
};
