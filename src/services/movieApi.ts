import { cache } from "react";

const API_VSMOV = process.env.NEXT_PUBLIC_API_URL || "https://vsmov.com/api";
const API_PHIMAPI = process.env.NEXT_PUBLIC_API_URL_2 || "https://phimapi.com";

// =========================================================
// BỘ NHỚ ĐỆM SERVER (IN-MEMORY CACHE) TĂNG TỐC TỐI ĐA (0ms)
// =========================================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const moviesMemoryCache = new Map<string, { data: any; expireAt: number }>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const movieDetailMemoryCache = new Map<string, { data: any; expireAt: number }>();

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

// Hàm nội bộ lấy chi tiết phim có in-memory cache
const fetchMovieDetailInternal = async (
  slug: string,
  source?: "vsmov" | "ophim",
) => {
  const cacheKey = `${slug}_${source || "any"}`;
  const now = Date.now();

  if (movieDetailMemoryCache.has(cacheKey)) {
    const cached = movieDetailMemoryCache.get(cacheKey)!;
    if (cached.expireAt > now) {
      return cached.data;
    }
    movieDetailMemoryCache.delete(cacheKey);
  }

  try {
    let result = undefined;

    // 1. Nếu đã biết chính xác nguồn là VSMOV
    if (source === "vsmov") {
      const res = await fetch(`${API_VSMOV}/phim/${slug}`, {
        next: { revalidate: 600 },
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) result = await res.json();
    }
    // 2. Nếu đã biết chính xác nguồn là Ophim/KKPhim
    else if (source === "ophim") {
      const res = await fetch(`${API_PHIMAPI}/phim/${slug}`, {
        next: { revalidate: 600 },
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) result = await res.json();
    }
    // 3. Nếu không truyền source, bắn Promise.any để đua tốc độ 2 bên
    else {
      try {
        result = await Promise.any([
          fetch(`${API_VSMOV}/phim/${slug}`, {
            next: { revalidate: 600 },
            signal: AbortSignal.timeout(6000),
          }).then((res) => {
            if (!res.ok) throw new Error("VSMOV 404");
            return res.json();
          }),

          fetch(`${API_PHIMAPI}/phim/${slug}`, {
            next: { revalidate: 600 },
            signal: AbortSignal.timeout(6000),
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
      // Cache 10 phút trên server
      movieDetailMemoryCache.set(cacheKey, {
        data: result,
        expireAt: now + 600 * 1000,
      });
    }

    return result;
  } catch {
    console.error("❌ Lỗi tải chi tiết phim:", slug);
    return undefined;
  }
};

// Sử dụng React cache để khử trùng lặp giữa generateMetadata và Page Component
const cachedGetMovieDetail = cache(fetchMovieDetailInternal);

export const movieApi = {
  // ==========================================
  // 1. LẤY DANH SÁCH PHIM TỪ CẢ 2 NGUỒN (CÓ MEMORY CACHE)
  // ==========================================
  getMovies: async ({
    category,
    country,
    year,
    keyword,
    page = 1,
    limit = 24,
    type,
    sort,
  }: MovieFilterParams = {}) => {
    const cacheKey = JSON.stringify({
      category: category || "",
      country: country || "",
      year: year || "",
      keyword: keyword?.trim() || "",
      page,
      limit,
      type: type || "",
      sort: sort || "latest",
    });

    const now = Date.now();
    if (moviesMemoryCache.has(cacheKey)) {
      const cached = moviesMemoryCache.get(cacheKey)!;
      if (cached.expireAt > now) {
        return cached.data;
      }
      moviesMemoryCache.delete(cacheKey);
    }

    // Hàm phụ để fetch và parse dữ liệu an toàn
    const fetchSource = async (baseUrl: string, isSearch: boolean) => {
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(limit));

        let fullUrl = "";

        if (baseUrl === API_PHIMAPI) {
          if (isSearch && keyword) {
            params.set("keyword", keyword.trim());
            fullUrl = `${baseUrl}/v1/api/tim-kiem?${params.toString()}`;
          } else {
            if (category) params.set("category", category);
            if (country) params.set("country", country);
            if (year) params.set("year", year);

            const currentType = type || "phim-le";
            fullUrl = `${baseUrl}/v1/api/danh-sach/${currentType}?${params.toString()}`;
          }
        } else {
          if (isSearch && keyword) {
            params.set("keyword", keyword.trim());
            fullUrl = `${baseUrl}/tim-kiem?${params.toString()}`;
          } else {
            if (category) params.set("category", category);
            if (country) params.set("country", country);
            if (year) params.set("year", year);
            fullUrl = `${baseUrl}/danh-sach/?${params.toString()}`;
          }
        }

        const res = await fetch(fullUrl, {
          next: { revalidate: 300 }, // 5 phút Next.js cache
          signal: AbortSignal.timeout(6000), // Timeout 6s tránh treo trang
        });

        if (!res.ok) {
          return null;
        }

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
              const fixedThumb =
                typeof item.thumb_url === "string" &&
                item.thumb_url.startsWith("http")
                  ? item.thumb_url
                  : `${imageDomain}/${item.thumb_url}`;
              const fixedPoster =
                typeof item.poster_url === "string" &&
                item.poster_url.startsWith("http")
                  ? item.poster_url
                  : `${imageDomain}/${item.poster_url}`;

              return {
                ...item,
                thumb_url: fixedThumb,
                poster_url: fixedPoster,
              };
            },
          );

          return {
            items: mappedItems,
            totalPages:
              json.data?.params?.pagination?.totalPages ||
              json.pagination?.totalPages ||
              0,
          };
        }

        return {
          items: json.data?.items || json.items || [],
          totalPages:
            json.data?.params?.pagination?.totalPages ||
            json.pagination?.totalPages ||
            0,
        };
      } catch {
        return null;
      }
    };

    const isSearch = Boolean(keyword?.trim());

    let dataVsmov = null;
    let dataPhimApi = null;

    if (type) {
      dataPhimApi = await fetchSource(API_PHIMAPI, isSearch);
    } else {
      const [resVsmov, resPhimApi] = await Promise.all([
        fetchSource(API_VSMOV, isSearch),
        fetchSource(API_PHIMAPI, isSearch),
      ]);
      dataVsmov = resVsmov;
      dataPhimApi = resPhimApi;
    }

    const itemsVsmov = dataVsmov?.items || [];
    const itemsPhimApi = dataPhimApi?.items || [];

    // Gộp và khử trùng lặp slug
    const combinedItems = [...itemsVsmov, ...itemsPhimApi];
    const uniqueItemsMap = new Map();
    combinedItems.forEach((item) => {
      if (!uniqueItemsMap.has(item.slug)) {
        uniqueItemsMap.set(item.slug, item);
      }
    });

    const allUniqueItems = Array.from(uniqueItemsMap.values());

    // Sắp xếp theo yêu cầu người dùng
    if (sort === "rating") {
      allUniqueItems.sort((a, b) => {
        const rateA = Number(a.tmdb?.vote_average || a.imdb?.vote_average || 0);
        const rateB = Number(b.tmdb?.vote_average || b.imdb?.vote_average || 0);
        return rateB - rateA;
      });
    } else if (sort === "views") {
      allUniqueItems.sort((a, b) => {
        const countA = Number(a.tmdb?.vote_count || a.view || 0);
        const countB = Number(b.tmdb?.vote_count || b.view || 0);
        return countB - countA;
      });
    } else if (sort === "year") {
      allUniqueItems.sort((a, b) => {
        const yearA = Number(a.year || 0);
        const yearB = Number(b.year || 0);
        return yearB - yearA;
      });
    }

    // Cắt chính xác số lượng limit (24 phim) để tránh render gấp đôi DOM
    const finalItems = allUniqueItems.slice(0, limit);

    const totalPagesVsmov = dataVsmov?.totalPages || 0;
    const totalPagesPhimApi = dataPhimApi?.totalPages || 0;
    const maxTotalPages = Math.max(totalPagesVsmov, totalPagesPhimApi) || 1;
    const totalItemsCount = totalPagesVsmov * limit + totalPagesPhimApi * limit;

    const payload = {
      status: true,
      items: finalItems,
      pagination: {
        currentPage: page,
        totalPages: maxTotalPages,
        totalItems: totalItemsCount,
      },
    };

    // Lưu vào in-memory cache 5 phút
    moviesMemoryCache.set(cacheKey, {
      data: payload,
      expireAt: now + 300 * 1000,
    });

    return payload;
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
          signal: AbortSignal.timeout(6000),
        }),
        fetch(`${API_VSMOV}/quoc-gia`, {
          next: { revalidate: 3600 },
          signal: AbortSignal.timeout(6000),
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
