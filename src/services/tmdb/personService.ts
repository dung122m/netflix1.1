/**
 * TMDb Person Service
 * - Tìm kiếm nghệ sĩ (diễn viên, đạo diễn) trên TMDb
 * - Lấy thông tin tiểu sử chi tiết
 * - Lấy filmography đầy đủ và đối chiếu nguồn phát
 */

import {
  normalizeForMatch as cleanStringForMatch,
  isAsianScript,
} from "@/lib/stringUtils";
import { cacheService } from "@/lib/cache";
import { fetchTmdbEndpoint } from "../tmdbService";
import { matchTmdbMoviesWithSources } from "./movieMatcher";
import { TmdbPerson, TmdbPersonDetail, TmdbMovieCredit } from "./types";
import { CacheEntry } from "./utils";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

export function normalizeSinoVietnameseVariants(str: string): string {
  if (!str) return "";
  return str
    .replace(/\bchau\b/g, "chu")
    .replace(/\bhuynh\b/g, "hoang")
    .replace(/\bvu\b/g, "vo")
    .replace(/\btrieu\b/g, "tieu")
    .replace(/\bphung\b/g, "phong");
}

// Caches
const TMDB_PERSON_CACHE = new Map<string, CacheEntry<TmdbPerson | null>>();
const TMDB_PERSON_DETAIL_CACHE = new Map<number, CacheEntry<TmdbPersonDetail | null>>();
const TMDB_CREDITS_CACHE = new Map<number, CacheEntry<TmdbMovieCredit[]>>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TMDB_ACTOR_MOVIES_CACHE = new Map<string, CacheEntry<any[]>>();
const inFlightCredits = new Map<number, Promise<TmdbMovieCredit[]>>();

/**
 * TÌM KIẾM DIỄN VIÊN / ĐẠO DIỄN TRÊN TMDB (SEARCH PERSON)
 */
export async function searchTmdbPerson(
  actorQuery: string,
  canonicalName?: string,
  aliases: string[] = []
): Promise<TmdbPerson | null> {
  const trimmed = actorQuery.trim();
  if (!trimmed) return null;

  const cacheKey = `PERSON:${cleanStringForMatch(trimmed)}_${cleanStringForMatch(canonicalName)}`;
  const now = Date.now();
  const cached = TMDB_PERSON_CACHE.get(cacheKey);
  if (cached && cached.expireAt > now) {
    return cached.data;
  }

  const kvKey = `tmdb:person_v3:${cleanStringForMatch(trimmed)}_${cleanStringForMatch(canonicalName)}`;
  return await cacheService.fetchOrSet(
    kvKey,
    async () => {
      const queriesToTry = Array.from(
        new Set([trimmed, canonicalName, ...aliases].filter(Boolean) as string[])
      );
      const targetNamesNormalized = queriesToTry.map(cleanStringForMatch).filter(Boolean);

      let bestPerson: TmdbPerson | null = null;
      let highestScore = -1;

      for (const q of queriesToTry) {
        let data = await fetchTmdbEndpoint(
          `/search/person?query=${encodeURIComponent(q)}&language=vi-VN&include_adult=false`
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let results = (data?.results || []) as any[];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const evaluateCandidates = (candidates: any[]) => {
          for (const p of candidates) {
            if (!p || !p.id) continue;
            let score = 0;
            const pName = cleanStringForMatch(p.name);
            const pOrig = cleanStringForMatch(p.original_name);
            const pNameSino = normalizeSinoVietnameseVariants(pName);

            if (
              targetNamesNormalized.includes(pName) ||
              targetNamesNormalized.includes(pOrig) ||
              targetNamesNormalized.some((t) => normalizeSinoVietnameseVariants(t) === pNameSino)
            ) {
              score += 100;
            } else if (
              Array.isArray(p.also_known_as) &&
              p.also_known_as.some((aka: string) => {
                const akaClean = cleanStringForMatch(aka);
                return (
                  targetNamesNormalized.includes(akaClean) ||
                  targetNamesNormalized.some((t) => normalizeSinoVietnameseVariants(t) === normalizeSinoVietnameseVariants(akaClean))
                );
              })
            ) {
              score += 100;
            } else if (
              targetNamesNormalized.some((t) => {
                const s1 = t.replace(/[\s\-'.]+/g, "");
                const s2 = pName.replace(/[\s\-'.]+/g, "");
                if (s1 === s2) return true;
                const r1 = s1.replace(/(.)\1+/g, "$1");
                const r2 = s2.replace(/(.)\1+/g, "$1");
                return r1 === r2;
              })
            ) {
              score += 95;
            } else if (
              targetNamesNormalized.some((t) => {
                const wordsT = t.split(" ").filter((w) => w.length > 1);
                const wordsP = pName.split(" ").filter((w) => w.length > 1);
                return wordsT.length >= 2 && wordsT.every((w) => wordsP.includes(w));
              })
            ) {
              score += 90;
            } else if (
              targetNamesNormalized.some(
                (t) =>
                  (t.length >= 6 || (isAsianScript(t) && t.length >= 2)) &&
                  (pName.includes(t) || pOrig.includes(t))
              )
            ) {
              score += 30;
            }

            if (p.known_for_department === "Acting") score += 25;
            else if (p.known_for_department === "Directing") score += 20;

            score += Math.min(10, Number(p.popularity || 0));
            if (p.profile_path) score += 5;

            if (score > highestScore && score >= 115) {
              highestScore = score;
              bestPerson = {
                id: p.id,
                name: p.name,
                original_name: p.original_name,
                profile_path: p.profile_path
                  ? (p.profile_path.startsWith("http") ? p.profile_path : `${TMDB_IMAGE_BASE}${p.profile_path}`)
                  : null,
                popularity: p.popularity,
                known_for_department: p.known_for_department,
                also_known_as: Array.isArray(p.also_known_as) ? p.also_known_as : undefined,
              };
            }
          }
        };

        evaluateCandidates(results);

        if (!bestPerson && results.length > 0 && results[0]?.id) {
          const topCandidate = results[0];
          try {
            const detail = await getTmdbPersonDetail(topCandidate.id);
            if (detail && Array.isArray(detail.also_known_as)) {
              topCandidate.also_known_as = detail.also_known_as;
              evaluateCandidates([topCandidate]);
            }
          } catch {}
        }

        if (!bestPerson) {
          data = await fetchTmdbEndpoint(
            `/search/person?query=${encodeURIComponent(q)}&include_adult=false`
          );
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          results = (data?.results || []) as any[];
          evaluateCandidates(results);

          if (!bestPerson && results.length > 0 && results[0]?.id) {
            const topCandidate = results[0];
            try {
              const detail = await getTmdbPersonDetail(topCandidate.id);
              if (detail && Array.isArray(detail.also_known_as)) {
                topCandidate.also_known_as = detail.also_known_as;
                evaluateCandidates([topCandidate]);
              }
            } catch {}
          }
        }

        if (bestPerson && highestScore >= 120) {
          break;
        }
      }

      TMDB_PERSON_CACHE.set(cacheKey, {
        data: bestPerson,
        expireAt: Date.now() + 24 * 3600 * 1000,
        staleUntil: Date.now() + 48 * 3600 * 1000,
      });

      return bestPerson;
    },
    30 * 86400
  );
}

/**
 * LẤY THÔNG TIN CHI TIẾT CỦA DIỄN VIÊN TỪ TMDB (PERSON DETAIL)
 */
export async function getTmdbPersonDetail(personId: number): Promise<TmdbPersonDetail | null> {
  if (!personId) return null;

  const now = Date.now();
  const cached = TMDB_PERSON_DETAIL_CACHE.get(personId);
  if (cached && cached.expireAt > now) {
    return cached.data;
  }

  const kvKey = `tmdb:person_detail_v2:${personId}`;
  return await cacheService.fetchOrSet(
    kvKey,
    async () => {
      try {
        let data = await fetchTmdbEndpoint(`/person/${personId}?language=vi-VN&append_to_response=external_ids`);
        if (!data || !data.name) {
          data = await fetchTmdbEndpoint(`/person/${personId}?append_to_response=external_ids`);
        }
        if (!data || !data.id) return null;

        const alsoKnownAs: string[] = Array.isArray(data.also_known_as) ? data.also_known_as : [];
        let extractedEnglishName: string | undefined = undefined;

        // Trích xuất tên tiếng Anh / Tên quốc tế (Latin) từ name hoặc also_known_as
        if (data.name && typeof data.name === "string" && !isAsianScript(data.name) && /[a-zA-Z]/.test(data.name)) {
          extractedEnglishName = data.name.trim();
        } else if (alsoKnownAs.length > 0) {
          const latinAka = alsoKnownAs.find(
            (a) =>
              typeof a === "string" &&
              !isAsianScript(a) &&
              /^[a-zA-Z\s\-'.]{2,40}$/.test(a.trim())
          );
          if (latinAka) {
            extractedEnglishName = latinAka.trim();
          }
        }

        const detail: TmdbPersonDetail = {
          id: data.id,
          name: data.name,
          original_name: data.also_known_as?.[0] || data.name,
          profile_path: data.profile_path ? `${TMDB_IMAGE_BASE}${data.profile_path}` : null,
          popularity: Number(data.popularity || 0),
          known_for_department: data.known_for_department,
          birthday: data.birthday || undefined,
          deathday: data.deathday || undefined,
          place_of_birth: data.place_of_birth || undefined,
          biography: data.biography || undefined,
          also_known_as: alsoKnownAs,
          english_name: extractedEnglishName,
          gender: data.gender,
          homepage: data.homepage || undefined,
          imdb_id: data.external_ids?.imdb_id || data.imdb_id || undefined,
        };

        TMDB_PERSON_DETAIL_CACHE.set(personId, {
          data: detail,
          expireAt: Date.now() + 24 * 3600 * 1000,
          staleUntil: Date.now() + 48 * 3600 * 1000,
        });

        return detail;
      } catch (err) {
        console.warn(`[TMDB] Error fetching detail for person ${personId}:`, err);
        return null;
      }
    },
    30 * 86400
  );
}

/**
 * GỌI TMDB person/{person_id}/movie_credits ĐỂ LẤY TOÀN BỘ PHIM DIỄN VIÊN THAM GIA
 */
export async function getTmdbPersonMovieCredits(personId: number): Promise<TmdbMovieCredit[]> {
  if (!personId) return [];

  const now = Date.now();
  const cached = TMDB_CREDITS_CACHE.get(personId);
  if (cached && cached.expireAt > now) {
    return cached.data;
  }

  const kvKey = `tmdb:person_credits_v2:${personId}`;
  return await cacheService.fetchOrSet<TmdbMovieCredit[]>(
    kvKey,
    async () => {
      const existing = inFlightCredits.get(personId);
      if (existing) {
        return existing;
      }

      const task = (async () => {
        try {
          const [dataVi, dataEn] = await Promise.all([
            fetchTmdbEndpoint(`/person/${personId}/combined_credits?language=vi-VN`),
            fetchTmdbEndpoint(`/person/${personId}/combined_credits?language=en-US`),
          ]);

          const rawCastVi = Array.isArray(dataVi?.cast) ? dataVi.cast : [];
          const rawCrewVi = Array.isArray(dataVi?.crew) ? dataVi.crew : [];
          const rawCastEn = Array.isArray(dataEn?.cast) ? dataEn.cast : [];
          const rawCrewEn = Array.isArray(dataEn?.crew) ? dataEn.crew : [];

          // Xây dựng bản đồ tiêu đề tiếng Anh / quốc tế để đối chiếu chính xác với trường origin_name của PhimAPI & NguonC
          const enMap = new Map<number, { title: string; overview?: string }>();
          for (const m of [...rawCastEn, ...rawCrewEn]) {
            if (m?.id && (m.title || m.name)) {
              enMap.set(m.id, {
                title: m.title || m.name || "",
                overview: m.overview || "",
              });
            }
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const directingCrew = rawCrewVi.filter((c: any) => c.department === "Directing");
          const combined = [...rawCastVi, ...directingCrew];
          const uniqueMap = new Map<number, TmdbMovieCredit>();
          const currentYear = new Date().getFullYear();

          for (const m of combined) {
            if (!m || !m.id || uniqueMap.has(m.id)) continue;

            const releaseDate = m.release_date || m.first_air_date || "";
            if (releaseDate) {
              const year = parseInt(releaseDate.slice(0, 4), 10);
              if (year > currentYear + 1) continue;
            }

            const charLower = (m.character || "").toLowerCase();
            const jobLower = (m.job || "").toLowerCase();
            const genreIds: number[] = Array.isArray(m.genre_ids) ? m.genre_ids : [];
            const isTv = m.media_type === "tv" || Boolean(m.first_air_date);
            const episodeCount = Number(m.episode_count || 1);

            if (
              charLower.includes("uncredited") &&
              (charLower.includes("archive") || charLower.includes("thanks"))
            ) {
              continue;
            }
            if (jobLower.includes("special thanks") || jobLower.includes("thanks")) {
              continue;
            }

            const isRealityOrTalk =
              genreIds.includes(10764) || genreIds.includes(10767) || genreIds.includes(10763);
            const isGuestOrSelf =
              charLower.startsWith("self - guest") ||
              charLower.includes("guest") ||
              charLower === "self" ||
              charLower === "self - host" ||
              !charLower;

            if (isTv && (isRealityOrTalk || (isGuestOrSelf && episodeCount <= 2))) {
              continue;
            }

            const enInfo = enMap.get(m.id);
            const englishTitle = enInfo?.title || "";

            uniqueMap.set(m.id, {
              id: m.id,
              title: m.title || m.name || m.original_name || m.original_title || englishTitle || "",
              original_title: m.original_title || m.original_name || m.title || m.name || "",
              english_title: englishTitle || undefined,
              release_date: releaseDate,
              vote_average: Number(m.vote_average || 0),
              vote_count: Number(m.vote_count || 0),
              popularity: Number(m.popularity || 0),
              poster_path: m.poster_path || null,
              character: m.character || "",
              media_type: m.media_type || (m.first_air_date ? "tv" : "movie"),
              genre_ids: Array.isArray(m.genre_ids) ? m.genre_ids : (genreIds.length > 0 ? genreIds : undefined),
              original_language: m.original_language || undefined,
              overview: m.overview || enInfo?.overview || "",
            });
          }

          const sortedCredits = Array.from(uniqueMap.values()).sort((a, b) => {
            const scoreA = (a.vote_count || 0) * 0.7 + (a.popularity || 0) * 10;
            const scoreB = (b.vote_count || 0) * 0.7 + (b.popularity || 0) * 10;
            return scoreB - scoreA;
          });

          TMDB_CREDITS_CACHE.set(personId, {
            data: sortedCredits,
            expireAt: Date.now() + 24 * 3600 * 1000,
            staleUntil: Date.now() + 48 * 3600 * 1000,
          });

          return sortedCredits;
        } finally {
          inFlightCredits.delete(personId);
        }
      })();

      inFlightCredits.set(personId, task);
      return task;
    },
    14 * 86400
  );
}

/**
 * TỔNG HỢP FILMOGRAPHY DIỄN VIÊN TỪ TMDB ĐÃ ĐỐI CHIẾU NGUỒN PHÁT
 */
export async function getActorFilmographyFromTmdb(
  actorQuery: string,
  canonicalName?: string,
  aliases: string[] = [],
  maxMovies = 250,
  concurrency = 16,
  tmdbPersonId?: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  const cleanKey = cleanStringForMatch(actorQuery) || cleanStringForMatch(canonicalName);
  if (!cleanKey && !tmdbPersonId) return [];

  const cacheKey = `TMDB_ACTOR_FLOW_V11:${tmdbPersonId || cleanKey}`;
  const now = Date.now();
  const cached = TMDB_ACTOR_MOVIES_CACHE.get(cacheKey);

  if (cached && cached.data && cached.data.length > 0) {
    if (cached.expireAt > now) {
      return cached.data.slice(0, maxMovies);
    }
    if (cached.staleUntil > now) {
      setTimeout(() => {
        executeTmdbActorFlow(actorQuery, canonicalName, aliases, cacheKey, maxMovies, concurrency, tmdbPersonId).catch(() => {});
      }, 100);
      return cached.data.slice(0, maxMovies);
    }
  }

  const kvKey = `tmdb:actor_flow_v4:${tmdbPersonId || cleanKey}:${maxMovies}`;
  const res = await cacheService.fetchOrSet(
    kvKey,
    async () => {
      return await executeTmdbActorFlow(actorQuery, canonicalName, aliases, cacheKey, maxMovies, concurrency, tmdbPersonId);
    },
    7 * 86400
  );

  if (Array.isArray(res) && res.length === 0) {
    cacheService.set(kvKey, [], 1800).catch(() => {});
  }

  return res || [];
}

async function executeTmdbActorFlow(
  actorQuery: string,
  canonicalName: string | undefined,
  aliases: string[],
  cacheKey: string,
  maxMovies = 250,
  concurrency = 16,
  tmdbPersonId?: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  const tTotalStart = performance.now();
  try {
    let personId = tmdbPersonId;
    let personName = canonicalName || actorQuery;

    if (!personId) {
      const { findHistoricalArtist, getHistoricalArtistBySlug } = await import("@/data/history/historicalArtistsBirthdays");
      const historicalArtist =
        findHistoricalArtist(actorQuery) ||
        (canonicalName ? findHistoricalArtist(canonicalName) : undefined) ||
        getHistoricalArtistBySlug(actorQuery);
      if (historicalArtist?.tmdbPersonId) {
        personId = historicalArtist.tmdbPersonId;
        personName = historicalArtist.name;
      }
    }

    let tPersonStart = 0;
    let tPersonEnd = 0;
    if (!personId) {
      tPersonStart = performance.now();
      const person = await searchTmdbPerson(actorQuery, canonicalName, aliases);
      tPersonEnd = performance.now();

      if (!person || !person.id) {
        return [];
      }
      personId = person.id;
      personName = person.name;
    }

    const tCreditsStart = performance.now();
    const credits = await getTmdbPersonMovieCredits(personId);
    const tCreditsEnd = performance.now();

    if (!credits || credits.length === 0) {
      return [];
    }

    // Sắp xếp bản sao credits theo popularity / vote_count giảm dần (không mutate mảng gốc trong cache)
    const sortedCredits = [...credits].sort((a, b) => {
      const popDiff = (b.popularity || 0) - (a.popularity || 0);
      if (popDiff !== 0) return popDiff;
      return (b.vote_count || 0) - (a.vote_count || 0);
    });

    const tMatchStart = performance.now();
    // Quét tối đa 72 tác phẩm nổi bật nhất để giảm ~70% subrequests và CPU trên Vercel
    const checkLimit = Math.min(
      sortedCredits.length,
      Math.max(Math.round(maxMovies), 48),
      72
    );
    const matchedMovies = await matchTmdbMoviesWithSources(
      sortedCredits,
      checkLimit,
      Math.max(concurrency, 20),
      {
        isActorFilmography: true,
        budgetMs: 3800,
        maxMatched: maxMovies,
      }
    );
    const tMatchEnd = performance.now();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filmographyMovies = matchedMovies.map((m: any) => ({
      ...m,
      isActorFilmography: true,
      actor: Array.isArray(m.actor) && m.actor.length > 0 ? m.actor : [],
    }));

    const tTotalEnd = performance.now();
    const personTiming = tPersonEnd > 0 ? `${(tPersonEnd - tPersonStart).toFixed(0)}ms` : "0ms (bypassed)";
    console.log(
      `[TMDB Actor Flow: ${personName}] Person: ${personTiming} | Credits: ${(tCreditsEnd - tCreditsStart).toFixed(0)}ms | Sources Match: ${(tMatchEnd - tMatchStart).toFixed(0)}ms | Total: ${(tTotalEnd - tTotalStart).toFixed(0)}ms`
    );

    const now = Date.now();
    TMDB_ACTOR_MOVIES_CACHE.set(cacheKey, {
      data: filmographyMovies,
      expireAt: now + 2 * 3600 * 1000,
      staleUntil: now + 24 * 3600 * 1000,
    });

    return filmographyMovies.slice(0, maxMovies);
  } catch (err) {
    console.error("[TMDB Actor Flow] Execution error:", err);
    return [];
  }
}

/**
 * LẤY DANH SÁCH PHIM CỦA ĐẠO DIỄN TỪ TMDB ĐÃ ĐỐI CHIẾU NGUỒN PHÁT
 */
export async function getDirectorFilmographyFromTmdb(
  directorQuery: string,
  maxMovies = 250,
  concurrency = 16,
  tmdbPersonId?: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  const cleanKey = cleanStringForMatch(directorQuery);
  if (!cleanKey && !tmdbPersonId) return [];

  const cacheKey = `TMDB_DIR_FLOW_V3:${tmdbPersonId || cleanKey}`;
  const now = Date.now();
  const cached = TMDB_ACTOR_MOVIES_CACHE.get(cacheKey);

  if (cached && cached.data && cached.data.length > 0) {
    if (cached.expireAt > now) {
      return cached.data.slice(0, maxMovies);
    }
  }

  const kvKey = `tmdb:dir_flow_v3:${tmdbPersonId || cleanKey}:${maxMovies}`;
  return await cacheService.fetchOrSet(
    kvKey,
    async () => {
      try {
        let personId = tmdbPersonId;
        let personName = directorQuery;

        if (!personId) {
          const { getHistoricalArtistBySlug } = await import("@/data/history/historicalArtistsBirthdays");
          const historicalArtist = getHistoricalArtistBySlug(directorQuery);
          if (historicalArtist?.tmdbPersonId) {
            personId = historicalArtist.tmdbPersonId;
            personName = historicalArtist.name;
          }
        }

        if (!personId) {
          const person = await searchTmdbPerson(directorQuery);
          if (!person || !person.id) return [];
          personId = person.id;
          personName = person.name;
        }

        const data = await fetchTmdbEndpoint(`/person/${personId}/combined_credits?language=vi-VN`);
        const rawCrew = Array.isArray(data?.crew) ? data.crew : [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const directorCrew = rawCrew.filter((c: any) =>
          (c.job && c.job.toLowerCase() === "director") ||
          (c.department && c.department.toLowerCase() === "directing" && !c.job)
        );

        if (directorCrew.length === 0) return [];

        const currentYear = new Date().getFullYear();
        const seenTmdbIds = new Set<number>();
        const credits: TmdbMovieCredit[] = [];

        for (const m of directorCrew) {
          if (!m?.id || seenTmdbIds.has(m.id)) continue;
          seenTmdbIds.add(m.id);

          const releaseDate = m.release_date || m.first_air_date || "";
          if (releaseDate) {
            const year = parseInt(releaseDate.slice(0, 4), 10);
            if (year > currentYear + 1) continue;
          }

          credits.push({
            id: m.id,
            title: m.title || m.name || "",
            original_title: m.original_title || m.original_name || "",
            release_date: releaseDate,
            vote_average: Number(m.vote_average || 0),
            vote_count: Number(m.vote_count || 0),
            popularity: Number(m.popularity || 0),
            poster_path: m.poster_path || null,
            backdrop_path: m.backdrop_path || null,
            overview: m.overview || "",
            media_type: m.media_type || "movie",
            genre_ids: Array.isArray(m.genre_ids) ? m.genre_ids : undefined,
            original_language: m.original_language || undefined,
            department: "Directing",
            job: "Director",
          });
        }

        const sortedCredits = [...credits].sort((a, b) => {
          const popDiff = (b.popularity || 0) - (a.popularity || 0);
          if (popDiff !== 0) return popDiff;
          return (b.vote_count || 0) - (a.vote_count || 0);
        });
        const checkLimit = Math.min(
          sortedCredits.length,
          Math.max(Math.round(maxMovies * 1.5), 60),
          150
        );
        const matchedMovies = await matchTmdbMoviesWithSources(sortedCredits, checkLimit, concurrency);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filmographyMovies = matchedMovies.map((m: any) => ({
          ...m,
          _isDirectorRec: true,
          director: Array.isArray(m.director) && m.director.length > 0 ? m.director : [personName],
        }));

        TMDB_ACTOR_MOVIES_CACHE.set(cacheKey, {
          data: filmographyMovies,
          expireAt: now + 2 * 3600 * 1000,
          staleUntil: now + 24 * 3600 * 1000,
        });

        return filmographyMovies.slice(0, maxMovies);
      } catch (err) {
        console.error("[TMDB Director Flow] Execution error:", err);
        return [];
      }
    },
    14 * 86400
  );
}
