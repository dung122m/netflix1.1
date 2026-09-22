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
    const page = params.page || 1;

    const urlParams = new URLSearchParams();
    urlParams.set("page", String(page));
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
      // NguonC REST API Endpoints
      if (isSearch && params.keyword) {
        fullUrl = `${baseUrl}/films/search?keyword=${encodeURIComponent(params.keyword.trim())}&page=${page}`;
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
      } else if (params.category) {
        fullUrl = `${baseUrl}/films/the-loai/${getNguonCGenreSlug(params.category)}?page=${page}`;
      } else if (params.country) {
        fullUrl = `${baseUrl}/films/quoc-gia/${params.country}?page=${page}`;
      } else if (params.year) {
        fullUrl = `${baseUrl}/films/nam-phat-hanh/${params.year}?page=${page}`;
      } else {
        fullUrl = `${baseUrl}/films/phim-moi-cap-nhat?page=${page}`;
      }
    }

    const isNguonCSearch = baseUrl === API_NGUONC && isSearch;
    const timeoutMs = isNguonCSearch ? 600 : 1000;

    const res = await fetch(fullUrl, {
      next: { revalidate: 300 }, // 5 phút Next.js cache
      signal: AbortSignal.timeout(timeoutMs), // 600ms cho NguonC search (fast path PhimAPI), 1.0s cho danh sách
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
      };
    });

    const totalItems =
      json.paginate?.total_items ||
      mappedNguonCItems.length ||
      0;

    const totalPages =
      json.paginate?.total_page ||
      Math.ceil(totalItems / (json.paginate?.items_per_page || 10)) ||
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

async function executeGetMovies(params: MovieFilterParams, cacheKey: string) {
  const isSearch = Boolean(params.keyword?.trim());
  const limit = params.limit || 24;

  // ============================================================
  // CHIẾN LƯỢC MERGE ĐỒNG BỘ:
  // - Fetch page N từ cả 2 nguồn (PhimAPI + NguonC) song song
  // - Gộp danh sách phim → khử trùng theo slug
  // - Ưu tiên PhimAPI (hỗ trợ m3u8 direct) và bổ sung phim độc quyền từ NguonC
  // ============================================================
  const [resPhimApi, resNguonC] = await Promise.all([
    fetchSourceData(API_PHIMAPI, params, isSearch),
    fetchSourceData(API_NGUONC,   params, isSearch),
  ]);

  // Gộp: PhimAPI trước → NguonC sau
  const allItems = [
    ...(resPhimApi?.items || []),
    ...(resNguonC?.items  || []),
  ];

  // Khử trùng lặp theo slug — giữ phần tử đầu tiên gặp
  const uniqueItemsMap = new Map();
  allItems.forEach((item) => {
    if (item?.slug && !uniqueItemsMap.has(item.slug)) {
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
    // Ưu tiên phim có lượt đánh giá nếu có dữ liệu TMDB
    const ratedItems = allUniqueItems.filter((item) => {
      const voteCount = Number(item.tmdb?.vote_count || 0);
      return voteCount >= 50;
    });
    if (ratedItems.length >= 5) {
      allUniqueItems = ratedItems;
    }

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

  const finalItems = allUniqueItems.slice(0, limit);

  // ============================================================
  // TÍNH TỔNG SỐ PHIM VÀ TRANG
  // ============================================================
  const countApi1 = resPhimApi?.totalItems || 0;
  const countApi2 = resNguonC?.totalItems   || 0;

  // ~25% phim từ NguonC là độc quyền bổ sung cho PhimAPI
  const OVERLAP_RATIO = 0.75;
  const uniqueFromNguonC = Math.round(countApi2 * (1 - OVERLAP_RATIO));
  const totalItemsCount = (countApi1 || 0) + (countApi2 > 0 ? uniqueFromNguonC : 0) || allUniqueItems.length;

  const realPages1 = resPhimApi?.totalPages || 0;
  const realPages2 = resNguonC?.totalPages   || 0;
  const maxTotalPages = Math.max(realPages1, realPages2) || 1;

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
      movieApi.getMovies({ ...tab, limit: 24, skipKvCache: true }).catch(() => {});
    });
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
