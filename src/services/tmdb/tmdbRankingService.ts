/* eslint-disable @typescript-eslint/no-explicit-any */
import { cacheService } from "@/lib/cache";
import { normalizeForMatch as cleanStringForMatch } from "@/lib/stringUtils";
import { IMDB_TOP_250_SNAPSHOT } from "@/data/imdb/imdbTop250";
import {
  fetchTmdbEndpoint,
  matchTmdbMoviesWithSources,
  runWithConcurrencyLimit,
  TmdbMovieCredit,
} from "../tmdbService";

interface CacheEntry<T> {
  data: T;
  expireAt: number;
  staleUntil: number;
}

// Cache danh sách phim thịnh hành TMDB Trending (3h tươi, 12h stale)
export const TMDB_TRENDING_MOVIES_CACHE = new Map<string, CacheEntry<any[]>>();

export type TmdbRankType = "week" | "month" | "top_rated";

/**
 * 10. LẤY DANH SÁCH BẢNG XẾP HẠNG PHIM ĐÃ ĐỐI CHIẾU CATALOG NANAFLIX
 * - week: TMDB /trending/movie/week (Thịnh hành trong tuần)
 * - month: TMDB /movie/popular (Nổi bật trong tháng)
 * - top_rated: IMDb Top 250 Snapshot thực sự (Kiệt tác điện ảnh mọi thời đại, logic 10 + 10)
 * - Đối chiếu PhimAPI & NguonC qua matchTmdbMoviesWithSources()
 * - SWR Cache In-Memory: Phản hồi 0ms
 */
export async function getTmdbRankedMovies(
  type: TmdbRankType = "week",
  limit = 20,
  concurrency = 8
): Promise<any[]> {
  const cacheKey = `TMDB_RANKED_${type}_V8`;
  const now = Date.now();
  const cached = TMDB_TRENDING_MOVIES_CACHE.get(cacheKey);

  if (cached) {
    if (cached.expireAt > now) {
      return cached.data.slice(0, limit);
    }
    if (cached.staleUntil > now) {
      setTimeout(() => {
        const queryFn =
          type === "top_rated"
            ? executeImdbTop250Query(cacheKey, limit, concurrency)
            : executeTmdbRankingQuery(type, cacheKey, limit, concurrency);
        queryFn.catch(() => {});
      }, 100);
      return cached.data.slice(0, limit);
    }
  }

  const kvKey = `tmdb:ranked_movies:${type}:${limit}:v8`;
  const ttlSeconds = type === "top_rated" ? 24 * 3600 : 12 * 3600;

  return await cacheService.fetchOrSet(
    kvKey,
    () =>
      type === "top_rated"
        ? executeImdbTop250Query(cacheKey, limit, concurrency)
        : executeTmdbRankingQuery(type, cacheKey, limit, concurrency),
    ttlSeconds
  );
}

// Backward-compatible alias
export async function getTmdbTrendingMovies(
  timeWindow: "day" | "week" = "week",
  limit = 20,
  concurrency = 8
): Promise<any[]> {
  return getTmdbRankedMovies(timeWindow === "day" ? "week" : "week", limit, concurrency);
}

/**
 * Xử lý bảng xếp hạng trending/popular TMDB cho Tab Tuần & Tháng
 */
export async function executeTmdbRankingQuery(
  type: "week" | "month",
  cacheKey: string,
  limit: number,
  concurrency: number
): Promise<any[]> {
  try {
    let endpoint = `/trending/movie/week?language=vi-VN`;
    const revalidateTime = 21600; // 6 giờ cho trending tuần & tháng

    if (type === "month") {
      endpoint = `/movie/popular?language=vi-VN`;
    }

    const sep = endpoint.includes("?") ? "&" : "?";
    const [page1Data, page2Data] = await Promise.all([
      fetchTmdbEndpoint(`${endpoint}${sep}page=1`, revalidateTime),
      fetchTmdbEndpoint(`${endpoint}${sep}page=2`, revalidateTime).catch(() => null),
    ]);

    let rawResults: any[] = [];
    if (Array.isArray(page1Data?.results)) rawResults.push(...page1Data.results);
    if (Array.isArray(page2Data?.results)) rawResults.push(...page2Data.results);
    if (rawResults.length === 0) return [];

    const seenTmdbIds = new Set<number>();
    rawResults = rawResults.filter((m: any) => {
      if (!m?.id || seenTmdbIds.has(m.id)) return false;
      seenTmdbIds.add(m.id);
      return true;
    });

    const credits: TmdbMovieCredit[] = rawResults.map((m: any) => ({
      id: m.id,
      title: m.title || m.name || "",
      original_title: m.original_title || m.original_name || "",
      release_date: m.release_date || m.first_air_date || "",
      vote_average: Number(m.vote_average || 0),
      vote_count: Number(m.vote_count || 0),
      popularity: Number(m.popularity || 0),
      poster_path: m.poster_path || null,
      backdrop_path: m.backdrop_path || null,
      overview: m.overview || "",
      media_type: m.media_type || "movie",
      genre_ids: Array.isArray(m.genre_ids) ? m.genre_ids : undefined,
      original_language: m.original_language || undefined,
    }));

    const matchedMovies = await matchTmdbMoviesWithSources(credits, 40, concurrency);

    const now = Date.now();
    TMDB_TRENDING_MOVIES_CACHE.set(cacheKey, {
      data: matchedMovies,
      expireAt: now + 6 * 3600 * 1000, // 6h tươi
      staleUntil: now + 24 * 3600 * 1000, // 24h stale
    });

    return matchedMovies.slice(0, limit);
  } catch (err) {
    console.warn(`[TMDB Ranking Query: ${type}] Error fetching ranking:`, err);
    return [];
  }
}

/**
 * Xử lý bảng xếp hạng IMDb Top 250 Thực Sự cho Tab "Mọi Thời Đại"
 * Logic 10 + 10:
 * - Nhóm 1: 10 phim khả dụng đầu tiên có rank IMDb cao nhất.
 * - Nhóm 2: 10 phim khả dụng tiếp theo tiếp nối từ vị trí đang dừng.
 * - Tuyệt đối không dùng TMDB /movie/top_rated hay tự tính ranking.
 */
export async function executeImdbTop250Query(
  cacheKey: string,
  limit: number,
  concurrency: number
): Promise<any[]> {
  try {
    const targetTotal = Math.min(limit, 20);
    const targetGroup1 = Math.min(10, targetTotal);
    const targetGroup2 = Math.max(0, targetTotal - 10);

    const group1: any[] = [];
    const group2: any[] = [];
    const seenSlugs = new Set<string>();
    const seenTmdbIds = new Set<number>();
    const seenImdbIds = new Set<string>();

    let currentIndex = 0;
    const batchSize = 15;

    async function processBatch(startIndex: number, count: number): Promise<any[]> {
      const batch = IMDB_TOP_250_SNAPSHOT.slice(startIndex, startIndex + count);
      if (batch.length === 0) return [];

      // 1. Resolve TMDB Movie IDs từ IMDb ID (cache 7 ngày)
      const resolvedList = await runWithConcurrencyLimit(batch, concurrency, async (item) => {
        const findRes = await fetchTmdbEndpoint(
          `/find/${item.imdbId}?external_source=imdb_id&language=vi-VN`,
          86400 * 7
        );
        const movie = findRes?.movie_results?.[0];
        if (!movie || !movie.id) return null;
        const credit: TmdbMovieCredit & { imdbRank: number; imdbId: string } = {
          id: movie.id,
          imdb_id: item.imdbId,
          imdbId: item.imdbId,
          imdbRank: item.rank,
          title: movie.title || movie.name || "",
          original_title: movie.original_title || movie.original_name || "",
          release_date: movie.release_date || "",
          vote_average: Number(movie.vote_average || 0),
          vote_count: Number(movie.vote_count || 0),
          popularity: Number(movie.popularity || 0),
          poster_path: movie.poster_path || null,
          backdrop_path: movie.backdrop_path || null,
          overview: movie.overview || "",
          media_type: "movie",
          genre_ids: Array.isArray(movie.genre_ids) ? movie.genre_ids : undefined,
          original_language: movie.original_language || undefined,
        };
        return credit;
      });

      const validCredits = resolvedList.filter(
        (c): c is TmdbMovieCredit & { imdbRank: number; imdbId: string } => Boolean(c)
      );
      if (validCredits.length === 0) return [];

      // Bảo toàn thứ tự rank IMDb tăng dần
      validCredits.sort((a, b) => a.imdbRank - b.imdbRank);

      // 2. Đối chiếu với PhimAPI & NguonC
      const matchedList = await matchTmdbMoviesWithSources(validCredits, validCredits.length, concurrency);

      const matchedMap = new Map<string, any>();
      for (const m of matchedList) {
        if (m?.tmdb?.id) matchedMap.set(`tmdb_${m.tmdb.id}`, m);
        if (m?.imdb?.id) matchedMap.set(`imdb_${m.imdb.id}`, m);
        if (m?.slug) matchedMap.set(`slug_${m.slug}`, m);
      }

      const orderedBatchResults: any[] = [];
      for (const credit of validCredits) {
        const match =
          matchedMap.get(`imdb_${credit.imdbId}`) ||
          matchedMap.get(`tmdb_${credit.id}`) ||
          matchedList.find(
            (m) => m?.id === credit.id || String(m?.tmdb?.id) === String(credit.id)
          );

        if (
          match &&
          !seenSlugs.has(match.slug) &&
          !seenTmdbIds.has(credit.id) &&
          !seenImdbIds.has(credit.imdbId)
        ) {
          seenSlugs.add(match.slug);
          seenTmdbIds.add(credit.id);
          seenImdbIds.add(credit.imdbId);
          orderedBatchResults.push({
            ...match,
            imdb_rank: credit.imdbRank,
            imdb_id: credit.imdbId,
          });
        }
      }

      return orderedBatchResults;
    }

    // NHÓM 1: Lấy 10 phim khả dụng đầu tiên có rank IMDb cao nhất
    while (group1.length < targetGroup1 && currentIndex < IMDB_TOP_250_SNAPSHOT.length) {
      const matched = await processBatch(currentIndex, batchSize);
      for (const movie of matched) {
        if (group1.length >= targetGroup1) break;
        group1.push(movie);
      }
      currentIndex += batchSize;
    }

    // NHÓM 2: Tiếp tục duyệt từ vị trí đang dừng để lấy 10 phim khả dụng tiếp theo
    while (group2.length < targetGroup2 && currentIndex < IMDB_TOP_250_SNAPSHOT.length) {
      const matched = await processBatch(currentIndex, batchSize);
      for (const movie of matched) {
        if (group2.length >= targetGroup2) break;
        group2.push(movie);
      }
      currentIndex += batchSize;
    }

    const finalResults = [...group1, ...group2];

    const now = Date.now();
    TMDB_TRENDING_MOVIES_CACHE.set(cacheKey, {
      data: finalResults,
      expireAt: now + 24 * 3600 * 1000, // 24h tươi
      staleUntil: now + 48 * 3600 * 1000, // 48h stale
    });

    return finalResults;
  } catch (err) {
    console.warn("[IMDb Top 250 Query] Error fetching ranking:", err);
    return [];
  }
}

/**
 * 11. TRA CỨU TMDB ID TỪ TIÊU ĐỀ PHIM (SEARCH MEDIA MULTI)
 * Dùng cho Nana AI khi phân tích câu hỏi "Phim giống [Tựa Phim]"
 */
const TMDB_MEDIA_SEARCH_CACHE = new Map<string, { data: { id: number; type: "movie" | "tv"; title: string } | null; expireAt: number }>();

export async function searchTmdbMedia(title: string): Promise<{ id: number; type: "movie" | "tv"; title: string } | null> {
  const cleanTitle = title.trim();
  if (!cleanTitle || cleanTitle.length < 2) return null;

  const cacheKey = cleanStringForMatch(cleanTitle);
  const now = Date.now();
  const memHit = TMDB_MEDIA_SEARCH_CACHE.get(cacheKey);
  if (memHit && memHit.expireAt > now) {
    return memHit.data;
  }

  const kvKey = `tmdb:media_search:v1:${cacheKey}`;
  const result = await cacheService.fetchOrSet<{ id: number; type: "movie" | "tv"; title: string } | null>(
    kvKey,
    async () => {
      try {
        let data = await fetchTmdbEndpoint(
          `/search/multi?query=${encodeURIComponent(cleanTitle)}&language=vi-VN&include_adult=false`
        );
        let results = Array.isArray(data?.results) ? data.results : [];
        if (results.length === 0) {
          data = await fetchTmdbEndpoint(
            `/search/multi?query=${encodeURIComponent(cleanTitle)}&include_adult=false`
          );
          results = Array.isArray(data?.results) ? data.results : [];
        }

        const best = results.find((r: any) => r && (r.media_type === "movie" || r.media_type === "tv") && r.id);
        if (best) {
          return {
            id: Number(best.id),
            type: best.media_type === "tv" ? "tv" : "movie",
            title: best.title || best.name || cleanTitle,
          };
        }
        return null;
      } catch (err) {
        console.warn(`[TMDB] Error searching media for "${cleanTitle}":`, err);
        return null;
      }
    },
    14 * 86400 // 14 ngày
  );

  TMDB_MEDIA_SEARCH_CACHE.set(cacheKey, {
    data: result,
    expireAt: now + 24 * 3600 * 1000,
  });

  return result;
}

/**
 * 12. DISCOVERY NANA AI THEO CHỦ ĐỀ / KEYWORDS QUA TMDB GRAPH
 * Khám phá candidate từ TMDB rồi đối chiếu sang catalog Nanaflix
 */
const TMDB_CONCEPT_CACHE = new Map<string, { data: any[]; expireAt: number }>();

export async function discoverTmdbConceptMovies(
  keywords: string[],
  limit = 10,
  excludeSlugs: string[] = []
): Promise<any[]> {
  if (!keywords || keywords.length === 0) return [];

  const cleanKeywords = keywords
    .map((k) => (k || "").trim())
    .filter((k) => k.length >= 2)
    .slice(0, 3);
  if (cleanKeywords.length === 0) return [];

  const cacheKey = cleanKeywords.map(cleanStringForMatch).join("_");
  const now = Date.now();
  const memHit = TMDB_CONCEPT_CACHE.get(cacheKey);
  if (memHit && memHit.expireAt > now) {
    const exSet = new Set(excludeSlugs.map((s) => s.toLowerCase()));
    return memHit.data.filter((m: any) => m?.slug && !exSet.has(m.slug.toLowerCase())).slice(0, limit);
  }

  const kvKey = `tmdb:concept:v1:${cacheKey}`;
  const matchedMovies = await cacheService.fetchOrSet<any[]>(
    kvKey,
    async () => {
      try {
        const searchTasks = cleanKeywords.map((kw) =>
          fetchTmdbEndpoint(
            `/search/multi?query=${encodeURIComponent(kw)}&language=vi-VN&include_adult=false`
          )
            .then((d) => (Array.isArray(d?.results) ? d.results : []))
            .catch(() => [])
        );

        const resultsNested = await Promise.all(searchTasks);
        const seenIds = new Set<number>();
        const credits: TmdbMovieCredit[] = [];

        for (const list of resultsNested) {
          for (const m of list) {
            if (!m || !m.id || seenIds.has(m.id)) continue;
            if (m.media_type !== "movie" && m.media_type !== "tv") continue;
            seenIds.add(m.id);

            credits.push({
              id: Number(m.id),
              title: m.title || m.name || "",
              original_title: m.original_title || m.original_name || m.title || m.name || "",
              release_date: m.release_date || m.first_air_date || "",
              vote_average: Number(m.vote_average || 0),
              vote_count: Number(m.vote_count || 0),
              popularity: Number(m.popularity || 0),
              poster_path: m.poster_path || null,
              backdrop_path: m.backdrop_path || null,
              overview: m.overview || "",
              media_type: m.media_type,
              genre_ids: Array.isArray(m.genre_ids) ? m.genre_ids : undefined,
              original_language: m.original_language || undefined,
            });

            if (credits.length >= 20) break;
          }
          if (credits.length >= 20) break;
        }

        if (credits.length === 0) return [];

        const matched = await matchTmdbMoviesWithSources(credits, Math.min(credits.length, 16), 8);
        return matched || [];
      } catch (err) {
        console.warn(`[TMDB] Error discovering concept for "${keywords.join(', ')}":`, err);
        return [];
      }
    },
    7 * 86400 // 7 ngày
  );

  TMDB_CONCEPT_CACHE.set(cacheKey, {
    data: matchedMovies || [],
    expireAt: now + 24 * 3600 * 1000,
  });

  const exSet = new Set(excludeSlugs.map((s) => s.toLowerCase()));
  return (matchedMovies || []).filter((m: any) => m?.slug && !exSet.has(m.slug.toLowerCase())).slice(0, limit);
}
