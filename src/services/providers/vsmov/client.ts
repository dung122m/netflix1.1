import { VsmovRawListResponse, VsmovRawDetailResponse } from "./types";

const VSMOV_API_BASE = "https://vsmov.com/api";
const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
  "Sec-Ch-Ua": '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "cross-site",
  Referer: "https://vsmov.com/",
  Origin: "https://vsmov.com",
};

/**
 * Fetch latest updated movies from VSMOV
 */
export async function fetchVsmovList(
  page: number = 1,
  timeoutMs: number = 6000
): Promise<VsmovRawListResponse | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(
      `${VSMOV_API_BASE}/danh-sach/phim-moi-cap-nhat?page=${page}`,
      {
        headers: DEFAULT_HEADERS,
        signal: controller.signal,
        next: { revalidate: 300 }, // 5 mins cache
      }
    );
    clearTimeout(timer);

    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch (error) {
    console.warn("[VSMOV Client] fetchVsmovList failed:", error);
    return null;
  }
}

/**
 * Fetch movie detail from VSMOV by slug
 */
export async function fetchVsmovDetail(
  slug: string,
  timeoutMs: number = 5000
): Promise<VsmovRawDetailResponse | null> {
  if (!slug) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(
      `${VSMOV_API_BASE}/phim/${encodeURIComponent(slug)}`,
      {
        headers: DEFAULT_HEADERS,
        signal: controller.signal,
        next: { revalidate: 1800 }, // 30 mins cache
      }
    );
    clearTimeout(timer);

    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch (error) {
    console.warn(`[VSMOV Client] fetchVsmovDetail (${slug}) failed:`, error);
    return null;
  }
}

/**
 * Search movies from VSMOV by keyword
 */
export async function searchVsmov(
  keyword: string,
  page: number = 1,
  timeoutMs: number = 4000
): Promise<VsmovRawListResponse | null> {
  if (!keyword) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(
      `${VSMOV_API_BASE}/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${page}`,
      {
        headers: DEFAULT_HEADERS,
        signal: controller.signal,
        next: { revalidate: 300 },
      }
    );
    clearTimeout(timer);

    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch (error) {
    console.warn(`[VSMOV Client] searchVsmov (${keyword}) failed:`, error);
    return null;
  }
}

/**
 * Fetch movies by type from VSMOV (phim-bo, phim-le, subteam)
 */
export async function fetchVsmovType(
  type: string,
  page: number = 1,
  timeoutMs: number = 4000
): Promise<VsmovRawListResponse | null> {
  if (!type) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(
      `${VSMOV_API_BASE}/danh-sach/${encodeURIComponent(type)}?page=${page}`,
      {
        headers: DEFAULT_HEADERS,
        signal: controller.signal,
        next: { revalidate: 300 },
      }
    );
    clearTimeout(timer);

    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch (error) {
    console.warn(`[VSMOV Client] fetchVsmovType (${type}) failed:`, error);
    return null;
  }
}

/**
 * Fetch movies by category/genre from VSMOV
 */
export async function fetchVsmovCategory(
  categorySlug: string,
  page: number = 1,
  timeoutMs: number = 4000
): Promise<VsmovRawListResponse | null> {
  if (!categorySlug) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(
      `${VSMOV_API_BASE}/the-loai/${encodeURIComponent(categorySlug)}?page=${page}`,
      {
        headers: DEFAULT_HEADERS,
        signal: controller.signal,
        next: { revalidate: 300 },
      }
    );
    clearTimeout(timer);

    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch (error) {
    console.warn(`[VSMOV Client] fetchVsmovCategory (${categorySlug}) failed:`, error);
    return null;
  }
}

/**
 * Fetch movies by country from VSMOV
 */
export async function fetchVsmovCountry(
  countrySlug: string,
  page: number = 1,
  timeoutMs: number = 4000
): Promise<VsmovRawListResponse | null> {
  if (!countrySlug) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(
      `${VSMOV_API_BASE}/quoc-gia/${encodeURIComponent(countrySlug)}?page=${page}`,
      {
        headers: DEFAULT_HEADERS,
        signal: controller.signal,
        next: { revalidate: 300 },
      }
    );
    clearTimeout(timer);

    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch (error) {
    console.warn(`[VSMOV Client] fetchVsmovCountry (${countrySlug}) failed:`, error);
    return null;
  }
}

/**
 * Fetch movies by release year from VSMOV
 */
export async function fetchVsmovYear(
  year: string | number,
  page: number = 1,
  timeoutMs: number = 4000
): Promise<VsmovRawListResponse | null> {
  if (!year) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(
      `${VSMOV_API_BASE}/nam/${encodeURIComponent(String(year))}?page=${page}`,
      {
        headers: DEFAULT_HEADERS,
        signal: controller.signal,
        next: { revalidate: 300 },
      }
    );
    clearTimeout(timer);

    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch (error) {
    console.warn(`[VSMOV Client] fetchVsmovYear (${year}) failed:`, error);
    return null;
  }
}

export interface VsmovFilterOptions {
  keyword?: string;
  type?: string;
  category?: string;
  country?: string;
  year?: string | number;
  page?: number;
  limit?: number;
}

/**
 * Generalized VSMOV catalog fetcher with first-class server-side filter support:
 * - Keyword search: /api/tim-kiem
 * - Types: /api/danh-sach/phim-bo, /api/danh-sach/phim-le, /api/the-loai/hoat-hinh, /api/the-loai/tv-shows
 * - Genres: /api/the-loai/[slug] (supports year, country, type params)
 * - Countries: /api/quoc-gia/[slug] (supports year, type params)
 * - Years: /api/nam/[year] (supports type params)
 * - Default: /api/danh-sach/phim-moi-cap-nhat
 */
export async function fetchVsmovFiltered(
  options: VsmovFilterOptions,
  timeoutMs: number = 6000
): Promise<VsmovRawListResponse | null> {
  const page = options.page || 1;
  const limit = options.limit || 24;

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  if (limit) queryParams.set("limit", String(limit));

  let endpoint = "";

  if (options.keyword && options.keyword.trim()) {
    queryParams.set("keyword", options.keyword.trim());
    endpoint = `${VSMOV_API_BASE}/tim-kiem?${queryParams.toString()}`;
  } else if (options.type) {
    if (options.year) queryParams.set("year", String(options.year));
    if (options.country) queryParams.set("country", options.country);
    if (options.category) queryParams.set("category", options.category);

    if (options.type === "phim-bo") {
      endpoint = `${VSMOV_API_BASE}/danh-sach/phim-bo?${queryParams.toString()}`;
    } else if (options.type === "phim-le") {
      endpoint = `${VSMOV_API_BASE}/danh-sach/phim-le?${queryParams.toString()}`;
    } else if (options.type === "hoat-hinh") {
      endpoint = `${VSMOV_API_BASE}/the-loai/hoat-hinh?${queryParams.toString()}`;
    } else if (options.type === "tv-shows") {
      endpoint = `${VSMOV_API_BASE}/the-loai/tv-shows?${queryParams.toString()}`;
    } else if (options.type === "subteam") {
      endpoint = `${VSMOV_API_BASE}/danh-sach/subteam?${queryParams.toString()}`;
    } else {
      endpoint = `${VSMOV_API_BASE}/danh-sach/${encodeURIComponent(options.type)}?${queryParams.toString()}`;
    }
  } else if (options.category) {
    if (options.year) queryParams.set("year", String(options.year));
    if (options.country) queryParams.set("country", options.country);
    endpoint = `${VSMOV_API_BASE}/the-loai/${encodeURIComponent(options.category)}?${queryParams.toString()}`;
  } else if (options.country) {
    if (options.year) queryParams.set("year", String(options.year));
    endpoint = `${VSMOV_API_BASE}/quoc-gia/${encodeURIComponent(options.country)}?${queryParams.toString()}`;
  } else if (options.year) {
    endpoint = `${VSMOV_API_BASE}/nam/${encodeURIComponent(String(options.year))}?${queryParams.toString()}`;
  } else {
    endpoint = `${VSMOV_API_BASE}/danh-sach/phim-moi-cap-nhat?${queryParams.toString()}`;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(endpoint, {
      headers: DEFAULT_HEADERS,
      signal: controller.signal,
      next: { revalidate: 300 },
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch (error) {
    console.warn(`[VSMOV Client] fetchVsmovFiltered (${endpoint}) failed:`, error);
    return null;
  }
}
