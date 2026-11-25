import { normalizeForMatch, isAsianScript } from "@/lib/stringUtils";
import { escapeRegex, ACTOR_FILM_CACHE, setBoundedCache } from "./actorAliasResolver";
import { cacheService } from "@/lib/cache";
import { runWithConcurrencyLimit as runTitlesWithConcurrencyLimit } from "@/lib/asyncPool";
import { searchPhimApiByKeyword, searchNguonCByKeyword } from "@/services/movies/upstreamSearch";

export { isAsianScript };

/**
 * Trích xuất toàn bộ diễn viên, đạo diễn từ mọi biến thể tên trường trong Database
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractItemActorsAndDirectors(item: any): string[] {
  if (!item) return [];
  const list: string[] = [];

  const rawActors = item.actor || item.actors || item.casts || item.cast;
  if (Array.isArray(rawActors)) {
    for (const a of rawActors) {
      if (typeof a === "string") list.push(a);
      else if (a && typeof a === "object") list.push(a.name || a.slug || "");
    }
  } else if (typeof rawActors === "string") {
    list.push(...rawActors.split(",").map((s) => s.trim()));
  }

  const rawDirectors = item.director || item.directors || item.dao_dien;
  if (Array.isArray(rawDirectors)) {
    for (const d of rawDirectors) {
      if (typeof d === "string") list.push(d);
      else if (d && typeof d === "object") list.push(d.name || d.slug || "");
    }
  } else if (typeof rawDirectors === "string") {
    list.push(...rawDirectors.split(",").map((s) => s.trim()));
  }

  return list.map((s) => s.trim()).filter(Boolean);
}

/**
 * So khớp diễn viên nghiêm ngặt và toàn diện (Case-insensitive & Regex Match)
 */
export function matchesActorAliases(castList: string[], aliases: string[]): boolean {
  if (!Array.isArray(castList) || castList.length === 0) return false;
  if (!Array.isArray(aliases) || aliases.length === 0) return false;

  for (const rawActor of castList) {
    if (!rawActor || typeof rawActor !== "string") continue;
    const actorLower = rawActor.toLowerCase().trim();
    const actorNorm = normalizeForMatch(rawActor);
    if (!actorLower || actorLower.length < 2) continue;

    for (const rawAlias of aliases) {
      if (!rawAlias || typeof rawAlias !== "string") continue;
      const aliasLower = rawAlias.toLowerCase().trim();
      const aliasNorm = normalizeForMatch(rawAlias);
      if (!aliasLower || aliasLower.length < 2) continue;

      if (actorLower === aliasLower || actorNorm === aliasNorm) {
        return true;
      }

      const isMultiWord = aliasLower.includes(" ") || aliasNorm.includes(" ") || aliasLower.includes("-");
      const isAsian = isAsianScript(aliasNorm) && aliasNorm.length >= 2;

      if (isMultiWord || isAsian) {
        if (actorNorm.includes(aliasNorm) || actorLower.includes(aliasLower)) {
          return true;
        }

        try {
          const regexNorm = new RegExp("(^|[^a-z0-9])" + escapeRegex(aliasNorm) + "($|[^a-z0-9])", "i");
          if (regexNorm.test(actorNorm)) {
            return true;
          }
          const regexLower = new RegExp("(^|[^a-z0-9])" + escapeRegex(aliasLower) + "($|[^a-z0-9])", "i");
          if (regexLower.test(actorLower)) {
            return true;
          }
        } catch {}
      } else {
        if (actorLower === aliasLower || actorNorm === aliasNorm) {
          return true;
        }
        if (actorLower.includes(`(${aliasLower})`) || actorNorm.includes(`(${aliasNorm})`)) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Rút gọn payload Movie Card cho Actor Filmography nhằm tiết kiệm RAM Redis DB3
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function slimActorMovieItem(m: any): any {
  if (!m) return null;
  return {
    _id: m._id || m.id,
    name: m.name || m.title || "",
    origin_name: m.origin_name || m.original_name,
    slug: m.slug,
    poster_url: m.poster_url || m.thumb_url,
    thumb_url: m.thumb_url || m.poster_url,
    year: m.year,
    quality: m.quality || "FHD",
    time: m.time || m.episode_current,
    episode_current: m.episode_current,
    type: m.type || m.type_name,
    type_name: m.type_name || m.type,
    category: Array.isArray(m.category)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? m.category.map((c: any) => ({ name: typeof c === "string" ? c : c?.name || "", slug: c?.slug }))
      : undefined,
    country: Array.isArray(m.country)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? m.country.map((c: any) => ({ name: typeof c === "string" ? c : c?.name || "", slug: c?.slug }))
      : undefined,
    tmdb: m.tmdb
      ? {
          id: m.tmdb.id,
          vote_average: m.tmdb.vote_average,
          vote_count: m.tmdb.vote_count,
          popularity: m.tmdb.popularity,
        }
      : undefined,
    vote_average: m.vote_average ?? m.tmdb?.vote_average ?? 0,
    vote_count: m.vote_count ?? m.tmdb?.vote_count ?? 0,
    popularity: m.popularity ?? m.tmdb?.popularity ?? 0,
    view: m.view ?? m.views ?? m.tmdb?.vote_count ?? Math.round((m.tmdb?.popularity || 0) * 100) ?? 0,
    modified: m.modified,
    isActorFilmography: true,
    matchBy: m.matchBy,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function searchPhimApiForTitle(keyword: string): Promise<any[]> {
  return searchPhimApiByKeyword(keyword, { limit: 6, timeoutMs: 2400, normalizeImages: true });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function searchNguonCForTitle(keyword: string): Promise<any[]> {
  return searchNguonCByKeyword(keyword, { timeoutMs: 2400 });
}

export interface FetchMoviesOptions {
  actorName?: string;
  actorAliases?: string[];
  country?: string;
  strictActorFilter?: boolean;
}

export async function fetchMoviesByTitles(
  titles: string[],
  maxMovies = 16,
  options?: FetchMoviesOptions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  if (!titles || titles.length === 0) return [];

  const topTitles = titles.slice(0, 14);
  const cacheKey = `${options?.actorName || ""}|${topTitles.join("|")}`;
  const cached = ACTOR_FILM_CACHE.get(cacheKey);
  if (cached && cached.expireAt > Date.now()) {
    return cached.items.slice(0, maxMovies);
  }

  const kvKey = `movie:by_titles:${cacheKey}`;
  return await cacheService.fetchOrSet(
    kvKey,
    async () => {
      const seenSlugs = new Set<string>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results: any[] = [];

      const allAliases = [options?.actorName, ...(options?.actorAliases || [])]
        .filter((s): s is string => typeof s === "string" && s.trim().length >= 2)
        .map(normalizeForMatch);

      const resolvedItems = await runTitlesWithConcurrencyLimit(topTitles, 6, async (rawTitle) => {
        try {
          const viTitle = rawTitle.replace(/\([^)]*\)/g, "").trim();
          const matchEng = rawTitle.match(/\(([^)]+)\)/);
          const engPart = matchEng ? matchEng[1].trim() : "";
          const matchYear = rawTitle.match(/\b(19\d\d|20\d\d)\b/);
          const targetYear = matchYear ? parseInt(matchYear[1], 10) : undefined;
          const engTitle = engPart.replace(/\b(19\d\d|20\d\d)\b/g, "").replace(/,/g, "").trim();

          const cleanTargetVi = normalizeForMatch(viTitle);
          const cleanTargetEng = normalizeForMatch(engTitle);

          if (!cleanTargetVi && !cleanTargetEng) return null;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const evaluateCandidates = (candidates: any[]): any | null => {
            let bestItem = null;
            let highestScore = -1;

            for (const item of candidates) {
              if (!item || !item.slug || seenSlugs.has(item.slug)) continue;

              const normName = normalizeForMatch(item.name);
              const normOrig = normalizeForMatch(item.origin_name);
              const itemCountry = normalizeForMatch(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                Array.isArray(item.country) ? item.country.map((c: any) => c.name || c.slug || "").join(" ") : typeof item.country === "string" ? item.country : ""
              );

              const itemActorsAndDirectors: string[] = [];
              if (Array.isArray(item.actor)) itemActorsAndDirectors.push(...item.actor);
              else if (typeof item.actor === "string") itemActorsAndDirectors.push(item.actor);
              if (Array.isArray(item.director)) itemActorsAndDirectors.push(...item.director);
              else if (typeof item.director === "string") itemActorsAndDirectors.push(item.director);
              const fullCastStr = normalizeForMatch(itemActorsAndDirectors.join(" "));

              const hasActorOrDirector = allAliases.length > 0 && allAliases.some((alias) => fullCastStr.includes(alias));

              if (options?.country) {
                const normExpectedCountry = normalizeForMatch(options.country);
                const isVietnamTarget = normExpectedCountry.includes("viet nam");
                const isForeignMovie =
                  itemCountry.includes("au my") ||
                  itemCountry.includes("my") ||
                  itemCountry.includes("anh") ||
                  itemCountry.includes("phap") ||
                  itemCountry.includes("han quoc") ||
                  itemCountry.includes("trung quoc") ||
                  itemCountry.includes("nhat ban");

                if (isVietnamTarget && isForeignMovie && !hasActorOrDirector) {
                  continue;
                }
              }

              if (options?.strictActorFilter && itemActorsAndDirectors.length > 0 && !hasActorOrDirector) {
                const isExactTitleMatch = (cleanTargetVi && normName === cleanTargetVi) || (cleanTargetEng && (normOrig === cleanTargetEng || normName === cleanTargetEng));
                if (!isExactTitleMatch) {
                  continue;
                }
              }

              let score = 0;
              const isExactVi = cleanTargetVi && (normName === cleanTargetVi || normOrig === cleanTargetVi);
              const isExactEng = cleanTargetEng && (normName === cleanTargetEng || normOrig === cleanTargetEng);

              if (isExactVi) {
                score = 100;
              } else if (isExactEng) {
                score = 95;
              } else {
                const isShortTitle = cleanTargetVi.length < 8 || cleanTargetEng.length < 8;
                if (isShortTitle && !hasActorOrDirector) {
                  continue;
                }

                if (cleanTargetVi && (normName.includes(cleanTargetVi) || cleanTargetVi.includes(normName))) {
                  score = 60;
                } else if (cleanTargetEng && (normOrig.includes(cleanTargetEng) || cleanTargetEng.includes(normOrig))) {
                  score = 55;
                } else {
                  const targetWords = (cleanTargetVi || cleanTargetEng).split(" ").filter((w) => w.length > 1);
                  if (targetWords.length > 0) {
                    const matchedWords = targetWords.filter(
                      (w) => normName.includes(w) || normOrig.includes(w)
                    );
                    const ratio = matchedWords.length / targetWords.length;
                    if (ratio >= 0.7) score = Math.round(ratio * 40);
                  }
                }
              }

              if (hasActorOrDirector) {
                score += 60;
              }

              if (targetYear && item.year) {
                const itemY = parseInt(String(item.year), 10);
                if (!isNaN(itemY)) {
                  if (itemY === targetYear) {
                    score += 15;
                  } else if (Math.abs(itemY - targetYear) <= 1) {
                    score += 5;
                  } else if (Math.abs(itemY - targetYear) > 3) {
                    score -= 20;
                  }
                }
              }

              if (score >= 50 && score > highestScore) {
                highestScore = score;
                bestItem = item;
              }
            }

            return bestItem;
          };

          let phimApiItems = cleanTargetVi.length >= 2 ? await searchPhimApiForTitle(viTitle) : [];
          if (phimApiItems.length === 0 && engTitle && cleanTargetEng.length >= 2) {
            phimApiItems = await searchPhimApiForTitle(engTitle);
          }

          const matched = evaluateCandidates(phimApiItems);
          if (matched) {
            return matched;
          }

          let nguonCItems = cleanTargetVi.length >= 2 ? await searchNguonCForTitle(viTitle) : [];
          if (nguonCItems.length === 0 && engTitle && cleanTargetEng.length >= 2) {
            nguonCItems = await searchNguonCForTitle(engTitle);
          }

          return evaluateCandidates(nguonCItems);
        } catch (err) {
          console.warn(`[aiActorService] Error searching title "${rawTitle}":`, err);
          return null;
        }
      });

      for (const item of resolvedItems) {
        if (item && item.slug && !seenSlugs.has(item.slug)) {
          seenSlugs.add(item.slug);
          results.push(item);
          if (results.length >= maxMovies) break;
        }
      }

      if (results.length > 0) {
        setBoundedCache(ACTOR_FILM_CACHE, cacheKey, {
          items: results,
          expireAt: Date.now() + 24 * 60 * 60 * 1000,
          staleUntil: Date.now() + 48 * 60 * 60 * 1000,
        });
      }

      return results;
    },
    7 * 86400
  );
}
