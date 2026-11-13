/**
 * TMDb Movie Matcher
 * - Đối chiếu phim từ TMDb với nguồn phát PhimAPI / NguonC
 * - Cache L1 RAM từng phim đạt tốc độ 0ms
 * - Hạn chế concurrency và tối ưu timeout
 */

import { normalizeForMatch as cleanStringForMatch } from "@/lib/stringUtils";
import { checkCandidateTitleMatch } from "@/lib/movieTitle";
import { TMDB_GENRE_ID_MAP } from "@/lib/movieMedia";
import { TmdbMovieCredit, MatchTmdbOptions } from "./types";
import { getTmdbPosterUrl } from "../tmdbService";

// Concurrency pool runner
export async function runWithConcurrencyLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (true) {
      const idx = currentIndex++;
      if (idx >= items.length) break;
      try {
        results[idx] = await fn(items[idx], idx);
      } catch {
        // Safe skip on error
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

interface SingleMovieMatchEntry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  movie: any | null;
  expireAt: number;
}

export const TMDB_SINGLE_MOVIE_MATCH_CACHE = new Map<number, SingleMovieMatchEntry>();

// Single-Flight Mutex for concurrent individual TMDB movie source probes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const inFlightSourceProbes = new Map<number | string, Promise<{ candidate: any; matchType: "tmdb_id" | "imdb_id" | "title_year" } | null>>();

export function clearTmdbSingleMatchCache(): void {
  TMDB_SINGLE_MOVIE_MATCH_CACHE.clear();
}

/**
 * ĐỐI CHIẾU TMDB MOVIE VỚI PHIMAPI VÀ NGUONC CHẠY SONG SONG
 * ƯU TIÊN MATCH THEO THỨ TỰ:
 * Priority 1: TMDB ID (so khớp tmdb.id)
 * Priority 2: IMDB ID (so khớp imdb.id)
 * Priority 3: Title + Year (tiêu đề khớp + năm trong khoảng ±1)
 */
export async function matchTmdbMoviesWithSources(
  credits: TmdbMovieCredit[],
  maxCheckCount = 80,
  concurrency = 16,
  options?: MatchTmdbOptions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  if (!credits || credits.length === 0) return [];

  const tStart = performance.now();
  const currentYear = new Date().getFullYear();

  const validCredits = credits.filter((credit) => {
    if (!credit) return false;
    const title = (credit.title || "").trim();
    const origTitle = (credit.original_title || "").trim();
    if (!title && !origTitle) return false;
    if (title.length < 2 && origTitle.length < 2) return false;

    if (credit.release_date) {
      const year = parseInt(credit.release_date.slice(0, 4), 10);
      if (!isNaN(year) && year > currentYear) {
        return false;
      }
    }
    return true;
  });

  const seenTmdbIds = new Set<number | string>();
  const seenTitleYears = new Set<string>();
  const dedupedCredits: TmdbMovieCredit[] = [];

  for (const credit of validCredits) {
    if (!credit) continue;
    if (credit.id && credit.id !== 0) {
      if (seenTmdbIds.has(credit.id)) continue;
      seenTmdbIds.add(credit.id);
      dedupedCredits.push(credit);
    } else {
      const year = credit.release_date ? credit.release_date.slice(0, 4) : "";
      const normTitle = cleanStringForMatch(credit.original_title || credit.title);
      const titleYearKey = `${normTitle}_${year}`;
      if (seenTitleYears.has(titleYearKey)) continue;
      seenTitleYears.add(titleYearKey);
      dedupedCredits.push(credit);
    }
  }

  const candidateCredits = dedupedCredits.slice(0, maxCheckCount);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matchedMovies: any[] = [];
  const seenSlugs = new Set<string>();
  const now = Date.now();

  const missedL1: TmdbMovieCredit[] = [];
  for (const credit of candidateCredits) {
    const memEntry = TMDB_SINGLE_MOVIE_MATCH_CACHE.get(credit.id);
    if (memEntry && memEntry.expireAt > now) {
      if (memEntry.movie) {
        if (!memEntry.movie.content && !memEntry.movie.description) {
          memEntry.movie.content = credit.overview || "";
          memEntry.movie.description = credit.overview || "";
        }
        if (!seenSlugs.has(memEntry.movie.slug)) {
          seenSlugs.add(memEntry.movie.slug);
          matchedMovies.push(memEntry.movie);
        }
      }
      continue;
    }
    missedL1.push(credit);
  }

  const creditsToFetch: TmdbMovieCredit[] = missedL1;

  if (creditsToFetch.length > 0) {
    await runWithConcurrencyLimit(creditsToFetch, concurrency, async (credit) => {
      const tmdbIdStr = String(credit.id);
      const tmdbYear = credit.release_date ? parseInt(credit.release_date.slice(0, 4), 10) : undefined;
      const cleanOrig = cleanStringForMatch(credit.original_title);
      const cleanVi = cleanStringForMatch(credit.title);

      const isLatinOriginal =
        credit.original_title && /^[A-Za-z0-9\s\-':,.]+$/.test(credit.original_title);

      const cleanOrigTitle = credit.original_title ? credit.original_title.replace(/[:\-']/g, " ").replace(/\s+/g, " ").trim() : "";
      const cleanViTitle = credit.title ? credit.title.replace(/[:\-']/g, " ").replace(/\s+/g, " ").trim() : "";

      const primarySearchKw = isLatinOriginal ? cleanOrigTitle : (cleanViTitle || cleanOrigTitle);
      const secondarySearchKw = isLatinOriginal ? cleanViTitle : cleanOrigTitle;

      if ((!primarySearchKw || primarySearchKw.length < 2) && (!secondarySearchKw || secondarySearchKw.length < 2)) {
        TMDB_SINGLE_MOVIE_MATCH_CACHE.set(credit.id, { movie: null, expireAt: now + 12 * 3600 * 1000 });
        return;
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const trySearchAndMatch = async (searchKw: string): Promise<{ candidate: any; matchType: "tmdb_id" | "imdb_id" | "title_year" } | null> => {
          if (!searchKw || searchKw.length < 2) return null;

          const phimApiRes = await fetch(
            `https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(searchKw)}&limit=6`,
            { signal: AbortSignal.timeout(2200), next: { revalidate: 3600 } }
          )
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const phimApiItems: any[] = phimApiRes?.data?.items || [];

          for (const item of phimApiItems) {
            if (item?.tmdb?.id && String(item.tmdb.id) === tmdbIdStr) {
              return { candidate: item, matchType: "tmdb_id" };
            }
          }

          if (credit.imdb_id) {
            for (const item of phimApiItems) {
              if (item?.imdb?.id && String(item.imdb.id) === credit.imdb_id) {
                return { candidate: item, matchType: "imdb_id" };
              }
            }
          }

          for (const item of phimApiItems) {
            const isMatch = checkCandidateTitleMatch(
              item.name,
              item.origin_name,
              item.year ? parseInt(String(item.year), 10) : undefined,
              cleanOrig,
              cleanVi,
              tmdbYear,
              credit.title,
              credit.original_title
            );

            if (isMatch) {
              return { candidate: item, matchType: "title_year" };
            }
          }

          const nguonCRes = await fetch(
            `https://phim.nguonc.com/api/films/search?keyword=${encodeURIComponent(searchKw)}`,
            { signal: AbortSignal.timeout(2200), next: { revalidate: 3600 } }
          )
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const nguonCItems: any[] = Array.isArray(nguonCRes?.items) ? nguonCRes.items : [];
          if (nguonCItems.length > 0) {
            for (const nc of nguonCItems) {
              const isMatch = checkCandidateTitleMatch(
                nc.name,
                nc.original_name,
                nc.year ? parseInt(String(nc.year), 10) : undefined,
                cleanOrig,
                cleanVi,
                tmdbYear,
                credit.title,
                credit.original_title
              );

              if (isMatch) {
                const formattedNc = {
                  ...nc,
                  origin_name: nc.original_name || nc.name,
                  poster_url: nc.poster_url || nc.thumb_url,
                  thumb_url: nc.thumb_url || nc.poster_url,
                  quality: nc.quality || "HD",
                  lang: nc.language || "Vietsub",
                };
                return { candidate: formattedNc, matchType: "title_year" };
              }
            }
          }

          return null;
        };

        let probePromise = inFlightSourceProbes.get(credit.id);
        if (!probePromise) {
          probePromise = (async () => {
            let res = await trySearchAndMatch(primarySearchKw);
            if (!res && secondarySearchKw && secondarySearchKw !== primarySearchKw) {
              res = await trySearchAndMatch(secondarySearchKw);
            }
            return res;
          })().finally(() => {
            inFlightSourceProbes.delete(credit.id);
          });
          inFlightSourceProbes.set(credit.id, probePromise);
        }

        const matchResult = await probePromise;
        const matchedCandidate = matchResult?.candidate || null;
        const matchType = matchResult?.matchType || null;

        if (matchedCandidate && matchedCandidate.slug) {
          let synchronizedPoster = credit.poster_path
            ? `https://image.tmdb.org/t/p/w500${credit.poster_path}`
            : "";

          if (!synchronizedPoster && credit.id) {
            try {
              const fetched = await getTmdbPosterUrl(credit.id, credit.media_type || "movie");
              if (fetched) {
                synchronizedPoster = fetched;
              }
            } catch {
              // Safe skip
            }
          }

          const posterImg =
            synchronizedPoster ||
            matchedCandidate.poster_url ||
            matchedCandidate.thumb_url ||
            "";

          const tmdbBackdrop = credit.backdrop_path
            ? `https://image.tmdb.org/t/p/w1280${credit.backdrop_path}`
            : "";

          const thumbImg =
            tmdbBackdrop ||
            matchedCandidate.thumb_url ||
            matchedCandidate.poster_url ||
            posterImg;

          const formattedMovie = {
            _id: matchedCandidate._id || matchedCandidate.id || matchedCandidate.slug,
            name: matchedCandidate.name || credit.title,
            slug: matchedCandidate.slug,
            origin_name: matchedCandidate.origin_name || credit.original_title || matchedCandidate.name,
            content: matchedCandidate.content || matchedCandidate.description || credit.overview || "",
            description: matchedCandidate.description || matchedCandidate.content || credit.overview || "",
            poster_url: posterImg,
            thumb_url: thumbImg,
            backdrop_url: tmdbBackdrop || matchedCandidate.backdrop_url || matchedCandidate.backdropUrl || undefined,
            backdrop_path: credit.backdrop_path || undefined,
            year: matchedCandidate.year || tmdbYear,
            time: matchedCandidate.time || "",
            type: matchedCandidate.type || (credit.media_type === "tv" ? "series" : (credit.media_type === "movie" ? "single" : "")),
            episode_current: matchedCandidate.episode_current || (credit.media_type === "tv" ? "Tập mới" : ""),
            episode_total: matchedCandidate.episode_total || matchedCandidate.total_episodes || "",
            quality: matchedCandidate.quality || "HD",
            lang: matchedCandidate.lang || matchedCandidate.language || "Vietsub",
            category:
              Array.isArray(matchedCandidate.category) && matchedCandidate.category.length > 0
                ? matchedCandidate.category
                : Array.isArray(credit.genre_ids) && credit.genre_ids.length > 0
                ? credit.genre_ids
                    .map((id) => TMDB_GENRE_ID_MAP[Number(id)])
                    .filter(Boolean)
                    .map((name) => ({ id: "", name, slug: "" }))
                : [],
            country:
              Array.isArray(matchedCandidate.country) && matchedCandidate.country.length > 0
                ? matchedCandidate.country
                : [],
            actor: Array.isArray(matchedCandidate.actor) ? matchedCandidate.actor : [],
            director: Array.isArray(matchedCandidate.director) ? matchedCandidate.director : [],
            genre_ids: credit.genre_ids || matchedCandidate.genre_ids || undefined,
            original_language: credit.original_language || matchedCandidate.original_language || undefined,
            tmdb: {
              id: tmdbIdStr,
              vote_average: credit.vote_average || matchedCandidate.tmdb?.vote_average || 0,
              vote_count: credit.vote_count || matchedCandidate.tmdb?.vote_count || 0,
              genre_ids: credit.genre_ids || matchedCandidate.tmdb?.genre_ids,
              original_language: credit.original_language || matchedCandidate.tmdb?.original_language,
            },
            isActorFilmography: options?.isActorFilmography === true,
            matchBy: matchType,
            ...(typeof matchedCandidate.trailer_url === "string" && matchedCandidate.trailer_url.trim()
              ? { trailer_url: matchedCandidate.trailer_url.trim() }
              : {}),
          };

          TMDB_SINGLE_MOVIE_MATCH_CACHE.set(credit.id, {
            movie: formattedMovie,
            expireAt: now + 60 * 60 * 1000,
          });

          if (!seenSlugs.has(formattedMovie.slug)) {
            seenSlugs.add(formattedMovie.slug);
            matchedMovies.push(formattedMovie);
          }
        } else {
          TMDB_SINGLE_MOVIE_MATCH_CACHE.set(credit.id, {
            movie: null,
            expireAt: now + 12 * 3600 * 1000,
          });
        }
      } catch {
        // Skip individual errors
      }
    });
  }

  const tEnd = performance.now();
  console.log(
    `[TMDB Perf] Matched ${matchedMovies.length}/${candidateCredits.length} movies in ${(tEnd - tStart).toFixed(0)}ms (L1/L2 Hits: ${candidateCredits.length - creditsToFetch.length}, Probes: ${creditsToFetch.length})`
  );

  const isFilmography = options?.isActorFilmography === true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return matchedMovies.map((m: any) => ({
    ...m,
    isActorFilmography: isFilmography,
  }));
}
