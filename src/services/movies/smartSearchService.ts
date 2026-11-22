/**
 * Smart Search Service (100% Zero-AI, Zero-Hardcode)
 * 
 * Luồng xử lý 3 tầng ưu tiên tự động ngầm:
 * - Tầng 1: Smart Filter Tokenizer (Bóc tách bộ lọc động: năm, loại phim, thể loại, quốc gia từ dynamic API)
 * - Tầng 2: Direct Catalog Search & Slug Normalization (Tìm trực tiếp + chuẩn hóa slug không dấu)
 * - Tầng 3: TMDb Multi-Search & Typo Tolerance Fallback (Sửa lỗi chính tả qua TMDb + Damerau-Levenshtein cục bộ)
 * 
 * Không nạp RAM L1 để duyệt Levenshtein toàn bộ catalog (tiết kiệm CPU Vercel Serverless tối đa).
 */

import { movieApi } from "./service";
import { getDynamicTaxonomy, parseSearchFilterIntent } from "./dynamicTaxonomy";
import {
  slugify,
  normalizeForMatch,
  calculateDamerauLevenshteinSimilarity,
} from "@/lib/stringUtils";
import { fetchTmdbEndpoint } from "../tmdbService";
import { matchTmdbMoviesWithSources } from "../tmdb/movieMatcher";
import { TmdbMovieCredit } from "../tmdb/types";
import { cacheService } from "@/lib/cache";

export interface SmartSearchParams {
  query: string;
  page?: number;
  limit?: number;
  sort?: string;
  category?: string;
  country?: string;
  year?: string;
  type?: string;
  skipKvCache?: boolean;
}

export interface SmartSearchResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  tier: "tier1_filter" | "tier2_direct" | "tier2_slug" | "tier3_tmdb" | "empty";
  correctedQuery?: string;
  originalQuery: string;
}

interface SmartSearchMemoryEntry {
  data: SmartSearchResult;
  expireAt: number;
}

const SMART_SEARCH_MEMORY_CACHE = new Map<string, SmartSearchMemoryEntry>();
const SMART_SEARCH_CACHE_TTL_SECONDS = 3600; // 1 giờ

/**
 * Sinh biến thể chính tả nhẹ nếu TMDb trả về 0 kết quả (ví dụ "openeimer" -> "openheimer")
 */
function getPhoneticSpellingVariants(str: string): string[] {
  const q = str.trim().toLowerCase();
  const variants = new Set<string>();

  // 1. Chèn âm câm 'h' trước 'ei' nếu chưa có (ví dụ "eimer" -> "heimer")
  if (q.includes("eim") && !q.includes("heim")) {
    variants.add(q.replace("eim", "heim"));
  }

  // 2. Nhân đôi các phụ âm đơn phổ biến p, m, t, l, s, c, n
  for (const c of ["p", "m", "t", "l", "s", "c", "n"]) {
    if (q.includes(c) && !q.includes(c + c)) {
      variants.add(q.replace(c, c + c));
    }
  }

  // 3. Khử trùng lặp phụ âm liền kề
  const deduped = q.replace(/([a-z])\1/g, "$1");
  if (deduped !== q) variants.add(deduped);

  return Array.from(variants).slice(0, 4);
}

/**
 * THỰC THI SMART SEARCH 3 TẦNG
 */
export async function executeSmartSearch(
  params: SmartSearchParams
): Promise<SmartSearchResult> {
  const rawQuery = (params.query || "").trim();
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.max(1, Math.min(60, Number(params.limit) || 24));
  const sort = params.sort || "latest";

  if (!rawQuery) {
    return {
      items: [],
      totalItems: 0,
      totalPages: 0,
      currentPage: page,
      tier: "empty",
      originalQuery: "",
    };
  }

  const normQuery = normalizeForMatch(rawQuery);
  const cacheKey = `search:smart:v4:${normQuery}:${page}:${limit}:${params.category || ""}:${params.country || ""}:${params.year || ""}:${params.type || ""}:${sort}`;

  // Kiểm tra L1 In-Memory Cache (0ms)
  const now = Date.now();
  const memHit = SMART_SEARCH_MEMORY_CACHE.get(cacheKey);
  if (memHit && memHit.expireAt > now) {
    return memHit.data;
  }

  // Kiểm tra L2 Upstash Redis Cache (trừ khi skipKvCache = true)
  if (!params.skipKvCache) {
    try {
      const cached = await cacheService.get<SmartSearchResult>(cacheKey);
      if (cached && Array.isArray(cached.items)) {
        SMART_SEARCH_MEMORY_CACHE.set(cacheKey, {
          data: cached,
          expireAt: now + 300 * 1000,
        });
        return cached;
      }
    } catch { }
  }

  // =========================================================================
  // TẦNG 1: SMART FILTER TOKENIZER (Bóc tách bộ lọc động)
  // =========================================================================
  try {
    const taxonomy = await getDynamicTaxonomy();
    const intent = parseSearchFilterIntent(rawQuery, taxonomy);

    if (intent.hasFilter) {
      // Kết hợp bộ lọc được tách ra từ câu truy vấn với các tham số bộ lọc người dùng đã chọn
      const combinedCategory = params.category || intent.filter.category;
      const combinedCountry = params.country || intent.filter.country;
      const combinedYear = params.year || intent.filter.year;
      const combinedType = params.type || intent.filter.type;
      const searchKeyword = intent.remainingQuery.trim() || undefined;

      // Chỉ thực hiện tìm kiếm lọc nếu câu truy vấn chứa thông tin phân loại rõ ràng
      const filterRes = await movieApi.getMovies({
        category: combinedCategory,
        country: combinedCountry,
        year: combinedYear,
        type: combinedType,
        keyword: searchKeyword,
        page,
        limit,
        sort,
        skipKvCache: params.skipKvCache,
        posterEnrichmentBudgetMs: 0,
      });

      if (filterRes && Array.isArray(filterRes.items) && filterRes.items.length > 0) {
        const result: SmartSearchResult = {
          items: filterRes.items,
          totalItems: filterRes.pagination?.totalItems || filterRes.items.length,
          totalPages: filterRes.pagination?.totalPages || 1,
          currentPage: page,
          tier: "tier1_filter",
          originalQuery: rawQuery,
        };

        // Cache kết quả
        SMART_SEARCH_MEMORY_CACHE.set(cacheKey, {
          data: result,
          expireAt: now + 300 * 1000,
        });
        if (!params.skipKvCache) {
          cacheService.set(cacheKey, result, SMART_SEARCH_CACHE_TTL_SECONDS).catch(() => { });
        }
        return result;
      }
    }
  } catch {
    // Nếu bóc tách lỗi, tự động chuyển tiếp mượt mà sang Tầng 2
  }

  // =========================================================================
  // TẦNG 2: DIRECT CATALOG SEARCH & SLUG NORMALIZATION
  // =========================================================================
  try {
    // 2A. Tìm trực tiếp trên catalog qua movieApi.getMovies
    const directRes = await movieApi.getMovies({
      category: params.category,
      country: params.country,
      year: params.year,
      type: params.type,
      keyword: rawQuery,
      page,
      limit,
      sort,
      skipKvCache: params.skipKvCache,
      posterEnrichmentBudgetMs: 0,
    });

    if (directRes && Array.isArray(directRes.items) && directRes.items.length > 0) {
      const result: SmartSearchResult = {
        items: directRes.items,
        totalItems: directRes.pagination?.totalItems || directRes.items.length,
        totalPages: directRes.pagination?.totalPages || 1,
        currentPage: page,
        tier: "tier2_direct",
        originalQuery: rawQuery,
      };

      SMART_SEARCH_MEMORY_CACHE.set(cacheKey, {
        data: result,
        expireAt: now + 300 * 1000,
      });
      if (!params.skipKvCache) {
        cacheService.set(cacheKey, result, SMART_SEARCH_CACHE_TTL_SECONDS).catch(() => { });
      }
      return result;
    }

    // 2B. Chuẩn hóa chuỗi không dấu (slugify) nếu tìm theo chuỗi gốc chưa ra kết quả
    const slugQuery = slugify(rawQuery);
    if (slugQuery && slugQuery !== normQuery) {
      // Thử tìm với slug qua searchMovies
      const slugSearchRes = await movieApi.getMovies({
        category: params.category,
        country: params.country,
        year: params.year,
        type: params.type,
        keyword: slugQuery,
        page,
        limit,
        sort,
        skipKvCache: params.skipKvCache,
        posterEnrichmentBudgetMs: 0,
      });

      if (slugSearchRes && Array.isArray(slugSearchRes.items) && slugSearchRes.items.length > 0) {
        const result: SmartSearchResult = {
          items: slugSearchRes.items,
          totalItems: slugSearchRes.pagination?.totalItems || slugSearchRes.items.length,
          totalPages: slugSearchRes.pagination?.totalPages || 1,
          currentPage: page,
          tier: "tier2_slug",
          originalQuery: rawQuery,
        };

        SMART_SEARCH_MEMORY_CACHE.set(cacheKey, {
          data: result,
          expireAt: now + 300 * 1000,
        });
        if (!params.skipKvCache) {
          cacheService.set(cacheKey, result, SMART_SEARCH_CACHE_TTL_SECONDS).catch(() => { });
        }
        return result;
      }

      // Thử kiểm tra trực tiếp movie detail theo slug nếu query là slug của một phim
      const movieDetail = await movieApi.getMovieDetail(slugQuery).catch(() => undefined);
      if (movieDetail && movieDetail.movie) {
        const m = movieDetail.movie;
        const result: SmartSearchResult = {
          items: [m],
          totalItems: 1,
          totalPages: 1,
          currentPage: 1,
          tier: "tier2_slug",
          originalQuery: rawQuery,
        };

        SMART_SEARCH_MEMORY_CACHE.set(cacheKey, {
          data: result,
          expireAt: now + 300 * 1000,
        });
        if (!params.skipKvCache) {
          cacheService.set(cacheKey, result, SMART_SEARCH_CACHE_TTL_SECONDS).catch(() => { });
        }
        return result;
      }
    }
  } catch {
    // Chuyển tiếp sang Tầng 3 nếu Tầng 2 gặp lỗi
  }

  // =========================================================================
  // TẦNG 3: TMDB MULTI-SEARCH & TYPO TOLERANCE FALLBACK (Zero-AI, Không nạp RAM L1)
  // Chỉ kích hoạt khi Tầng 1 và Tầng 2 trả về 0 kết quả
  // =========================================================================
  try {
    // 1. Gửi query gốc sang TMDb /search/multi
    let tmdbData = await fetchTmdbEndpoint(
      `/search/multi?query=${encodeURIComponent(rawQuery)}&language=vi-VN&include_adult=false`,
      SMART_SEARCH_CACHE_TTL_SECONDS
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let tmdbResults: any[] = Array.isArray(tmdbData?.results) ? tmdbData.results : [];

    // Nếu không có kết quả với language=vi-VN, thử tìm quốc tế không giới hạn ngôn ngữ
    if (tmdbResults.length === 0) {
      tmdbData = await fetchTmdbEndpoint(
        `/search/multi?query=${encodeURIComponent(rawQuery)}&include_adult=false`,
        SMART_SEARCH_CACHE_TTL_SECONDS
      );
      tmdbResults = Array.isArray(tmdbData?.results) ? tmdbData.results : [];
    }

    // Nếu vẫn chưa có kết quả và query dài >= 6 ký tự, thử thêm 1-2 biến thể chính tả nhẹ
    if (tmdbResults.length === 0 && rawQuery.length >= 6) {
      const variants = getPhoneticSpellingVariants(rawQuery);
      for (const variant of variants) {
        const varData = await fetchTmdbEndpoint(
          `/search/multi?query=${encodeURIComponent(variant)}&include_adult=false`,
          SMART_SEARCH_CACHE_TTL_SECONDS
        );
        if (Array.isArray(varData?.results) && varData.results.length > 0) {
          tmdbResults = varData.results;
          break;
        }
      }
    }

    // Lọc các ứng viên là phim điện ảnh hoặc series truyền hình
    const mediaCandidates = tmdbResults.filter(
      (c) => c && (c.media_type === "movie" || c.media_type === "tv") && (c.title || c.name)
    );

    if (mediaCandidates.length > 0) {
      // 2. Chuyển đổi thành TmdbMovieCredit để đối chiếu ngược lại kho phim Nanaflix
      const credits: TmdbMovieCredit[] = mediaCandidates.slice(0, 5).map((c) => ({
        id: Number(c.id),
        title: String(c.title || c.name || "").trim(),
        original_title: String(c.original_title || c.original_name || "").trim(),
        release_date: c.release_date || c.first_air_date,
        vote_average: Number(c.vote_average || 0),
        vote_count: Number(c.vote_count || 0),
        poster_path: c.poster_path || null,
        backdrop_path: c.backdrop_path || null,
        media_type: c.media_type,
        genre_ids: Array.isArray(c.genre_ids) ? c.genre_ids : [],
        original_language: c.original_language,
      }));

      // Đối chiếu nguồn song song với PhimAPI & NguonC
      const matchedMovies = await matchTmdbMoviesWithSources(credits, 10, 5);

      if (Array.isArray(matchedMovies) && matchedMovies.length > 0) {
        // 3. Tính Damerau-Levenshtein CỤC BỘ giữa query gốc (độ dài >= 5 ký tự) với top 3 tên chuẩn TMDb
        // Tuyệt đối không nạp toàn bộ danh sách tên phim vào RAM L1
        let detectedCorrectedQuery: string | undefined;

        if (rawQuery.trim().length >= 5) {
          const topCandidates = mediaCandidates.slice(0, 3);
          let bestSim = 0;
          let bestTitle: string | undefined;

          for (const cand of topCandidates) {
            const rawTitles = [
              cand.title,
              cand.original_title,
              cand.name,
              cand.original_name,
            ].filter((t): t is string => Boolean(t && t.trim().length >= 2));

            // Thu thập cả tên đầy đủ và tên cơ bản (trước dấu :, -, (, /)
            const candTitles: Array<{ full: string; display: string }> = [];
            for (const rt of rawTitles) {
              candTitles.push({ full: rt, display: rt });
              const base = rt.split(/[:\-\–\(\/]/)[0].trim();
              if (base.length >= 3 && base !== rt) {
                candTitles.push({ full: base, display: base });
              }
            }

            for (const { full, display } of candTitles) {
              const sim = calculateDamerauLevenshteinSimilarity(normQuery, normalizeForMatch(full));
              if (sim > bestSim) {
                bestSim = sim;
                bestTitle = display;
              }
            }
          }

          // Sai lệch nhỏ: mức tương đồng > 80% (similarity > 0.8)
          if (bestSim > 0.8 && bestTitle && normalizeForMatch(bestTitle) !== normQuery) {
            detectedCorrectedQuery = bestTitle;
          }
        }

        const result: SmartSearchResult = {
          items: matchedMovies,
          totalItems: matchedMovies.length,
          totalPages: Math.ceil(matchedMovies.length / limit) || 1,
          currentPage: 1,
          tier: "tier3_tmdb",
          correctedQuery: detectedCorrectedQuery,
          originalQuery: rawQuery,
        };

        SMART_SEARCH_MEMORY_CACHE.set(cacheKey, {
          data: result,
          expireAt: now + 300 * 1000,
        });
        if (!params.skipKvCache) {
          cacheService.set(cacheKey, result, SMART_SEARCH_CACHE_TTL_SECONDS).catch(() => { });
        }
        return result;
      }
    }
  } catch {
    // Không làm gián đoạn
  }

  // =========================================================================
  // NẾU SAU CẢ 3 TẦNG VẪN KHÔNG CÓ PHIM -> TRẢ VỀ EMPTY STATE
  // =========================================================================
  const emptyResult: SmartSearchResult = {
    items: [],
    totalItems: 0,
    totalPages: 0,
    currentPage: page,
    tier: "empty",
    originalQuery: rawQuery,
  };

  SMART_SEARCH_MEMORY_CACHE.set(cacheKey, {
    data: emptyResult,
    expireAt: now + 120 * 1000,
  });

  return emptyResult;
}
