import { createHash } from "node:crypto";
import { movieApi, DEFAULT_GENRES, DEFAULT_COUNTRIES } from "@/services/movies/service";
import { matchesActorAlias } from "@/lib/actorAlias";
import { queryMoviesByActor } from "@/services/aiActorService";
import { getTmdbMovieRecommendations, getDirectorFilmographyFromTmdb } from "@/services/tmdbService";
import { cacheService } from "@/lib/cache";

export interface TaxonomyRef {
  name: string;
  slug?: string;
}

export interface RecommendationsRequestPayload {
  currentMovieSlug: string;
  currentMovieTitle?: string;
  categories?: TaxonomyRef[];
  countries?: TaxonomyRef[];
  primaryActor?: string;
  primaryDirector?: string;
  year?: number | string;
  type?: string;
  tmdbId?: number | string | null;
  tmdbType?: string;
  contentText?: string;
  hasMartialArts?: boolean;
}

export interface CompactMovieCard {
  _id?: string;
  name: string;
  slug: string;
  origin_name?: string;
  thumb_url?: string;
  poster_url?: string;
  year?: number | string;
  time?: string;
  quality?: string;
  episode_current?: string;
  lang?: string;
  category?: Array<{ name: string; slug?: string }>;
  country?: Array<{ name: string; slug?: string }>;
  type?: string;
  matchPercent?: number;
}

export interface RecommendationsData {
  success: boolean;
  currentMovieTitle?: string;
  genreName?: string;
  countryName?: string;
  actorName?: string;
  directorName?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  genreMovies: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  countryMovies: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actorMovies?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  directorMovies?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  allMovies: any[];
}

export interface CompactRecommendationsPayload {
  v: 13;
  success: boolean;
  currentMovieTitle: string;
  genreName: string;
  countryName: string;
  actorName: string;
  directorName: string;
  pool: CompactMovieCard[];
  genreSlugs: string[];
  countrySlugs: string[];
  actorSlugs: string[];
  directorSlugs: string[];
  allSlugs: string[];
}

interface RecommendationCacheEntry {
  data: RecommendationsData;
  expireAt: number;
  staleUntil: number;
}

export type RecommendationCacheStatus = "HIT" | "STALE" | "MISS";

// Module-level L1 memory cache v13 (SWR: 30 phút tươi, 4 giờ stale)
const recommendationsL1Cache = new Map<string, RecommendationCacheEntry>();

// Module-level in-flight Promise map: Khử trùng lặp request đang chạy trên server
const serverInFlightRecs = new Map<string, Promise<RecommendationsData>>();

interface ItemTaxonomy {
  name?: string;
  slug?: string;
}

interface GenericCandidateMovie {
  slug?: string;
  name?: string;
  category?: ItemTaxonomy[];
  genre?: string;
  country?: ItemTaxonomy[] | string;
  [key: string]: unknown;
}

const MARTIAL_ARTS_REGEX = /võ thuật|kung fu|martial|quyền|kiếm hiệp/i;
const REDIS_REC_PREFIX = "movie:recommendations:v13:";

function hasMartialArtsSignal(body?: Partial<RecommendationsRequestPayload>): boolean {
  if (!body) return false;
  if (body.hasMartialArts) return true;
  const plainContent = (body.contentText || "").replace(/<[^>]+>/g, " ");
  return MARTIAL_ARTS_REGEX.test(plainContent);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
  ]);
}

function movieMatchesTargetGenre(item: GenericCandidateMovie, targetSlug: string, targetName: string): boolean {
  if (!targetSlug && !targetName) return false;
  const cats: ItemTaxonomy[] = Array.isArray(item.category)
    ? item.category
    : typeof item.genre === "string"
    ? item.genre.split(",").map((g: string) => ({ name: g.trim() }))
    : [];
  return cats.some((c: ItemTaxonomy) => {
    const s = (c?.slug || "").toLowerCase().trim();
    const n = (c?.name || "").toLowerCase().trim();
    return (targetSlug && s === targetSlug) || (targetName && n === targetName);
  });
}

function movieMatchesTargetCountry(item: GenericCandidateMovie, targetSlug: string, targetName: string): boolean {
  if (!targetSlug && !targetName) return false;
  const ctrs: ItemTaxonomy[] = Array.isArray(item.country)
    ? item.country
    : typeof item.country === "string"
    ? [{ name: item.country }]
    : [];
  return ctrs.some((c: ItemTaxonomy) => {
    const s = (c?.slug || "").toLowerCase().trim();
    const n = (c?.name || "").toLowerCase().trim();
    return (targetSlug && s === targetSlug) || (targetName && n === targetName);
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function computeMovieRecommendations(body: any): Promise<RecommendationsData> {
  try {
    const {
      currentMovieSlug,
      currentMovieTitle,
      categories = [],
      countries = [],
      primaryActor,
      primaryDirector,
      year,
      type,
      tmdbId,
      tmdbType,
    } = body || {};

    // 1. Lấy danh sách thể loại & quốc gia hợp lệ để truy vấn song song
    const targetCategories = (categories as Array<{ name: string; slug?: string }>)
      .filter((c) => Boolean(c?.name || c?.slug))
      .map((c) => ({
        name: c.name,
        slug:
          c.slug ||
          DEFAULT_GENRES.find((g) => g.name.toLowerCase() === c.name.toLowerCase())?.slug ||
          "",
      }))
      .filter((c) => Boolean(c.slug))
      .slice(0, 2);

    const targetCountries = (countries as Array<{ name: string; slug?: string }>)
      .filter((c) => Boolean(c?.name || c?.slug))
      .map((c) => ({
        name: c.name,
        slug:
          c.slug ||
          DEFAULT_COUNTRIES.find((d) => d.name.toLowerCase() === c.name.toLowerCase())?.slug ||
          "",
      }))
      .filter((c) => Boolean(c.slug))
      .slice(0, 2);

    // 2. Phát hiện tín hiệu võ thuật từ cờ truyền vào hoặc mô tả phim nguồn
    const srcHasMartialArts = hasMartialArtsSignal(body);

    // 3. Truy vấn song song các nguồn với timeout cứng <= 1800ms và bỏ qua bước enrich poster đồng bộ (3000ms)
    const [tmdbRecs, genreResults, countryResults, actorResult, directorResult, martialArtsResult] = await Promise.all([
      tmdbId
        ? withTimeout(getTmdbMovieRecommendations(tmdbId, tmdbType || type, currentMovieSlug).catch(() => []), 1800, [])
        : Promise.resolve([]),
      Promise.all(
        targetCategories.map((c) =>
          withTimeout(
            movieApi
              .getMovies({ category: c.slug, page: 1, limit: 16, posterEnrichmentBudgetMs: 0 })
              .catch(() => null),
            1800,
            null
          )
        )
      ),
      Promise.all(
        targetCountries.map((c) =>
          withTimeout(
            movieApi
              .getMovies({ country: c.slug, page: 1, limit: 16, posterEnrichmentBudgetMs: 0 })
              .catch(() => null),
            1800,
            null
          )
        )
      ),
      primaryActor
        ? withTimeout(queryMoviesByActor(primaryActor, [], undefined, 12).catch(() => []), 1800, [])
        : Promise.resolve([]),
      primaryDirector
        ? withTimeout(getDirectorFilmographyFromTmdb(primaryDirector, 12).catch(() => []), 1800, [])
        : Promise.resolve([]),
      srcHasMartialArts
        ? withTimeout(
            movieApi
              .getMovies({ category: "vo-thuat", page: 1, limit: 16, posterEnrichmentBudgetMs: 0 })
              .catch(() => null),
            1800,
            null
          )
        : Promise.resolve(null),
    ]);

    // 4. Khử trùng lặp và loại bỏ phim hiện tại
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dedupedMap = new Map<string, any>();

    // 4.1 Ưu tiên nạp đề xuất TMDB đã đối chiếu catalog trước
    for (const item of tmdbRecs || []) {
      if (item?.slug && item.slug !== currentMovieSlug && !dedupedMap.has(item.slug)) {
        dedupedMap.set(item.slug, { ...item, _isTmdbRec: true });
      }
    }

    for (const res of genreResults) {
      for (const item of res?.items || []) {
        if (item?.slug && item.slug !== currentMovieSlug && !dedupedMap.has(item.slug)) {
          dedupedMap.set(item.slug, item);
        }
      }
    }

    for (const res of countryResults) {
      for (const item of res?.items || []) {
        if (item?.slug && item.slug !== currentMovieSlug && !dedupedMap.has(item.slug)) {
          dedupedMap.set(item.slug, item);
        }
      }
    }

    // Nạp danh sách phim theo diễn viên thực tế
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actorItems: any[] = Array.isArray(actorResult)
      ? actorResult
      : // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (actorResult as any)?.items || [];
    const verifiedActorSlugs = new Set<string>();
    for (const item of actorItems) {
      if (item?.slug && item.slug !== currentMovieSlug) {
        verifiedActorSlugs.add(item.slug);
        if (!dedupedMap.has(item.slug)) {
          dedupedMap.set(item.slug, { ...item, _isActorRec: true, isActorFilmography: true });
        }
      }
    }

    // Nạp danh sách phim theo đạo diễn thực tế
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const directorItems: any[] = Array.isArray(directorResult)
      ? directorResult
      : // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (directorResult as any)?.items || [];
    const verifiedDirectorSlugs = new Set<string>();
    for (const item of directorItems) {
      if (item?.slug && item.slug !== currentMovieSlug) {
        verifiedDirectorSlugs.add(item.slug);
        if (!dedupedMap.has(item.slug)) {
          dedupedMap.set(item.slug, { ...item, _isDirectorRec: true });
        }
      }
    }

    // Pool võ thuật bổ sung (chỉ active khi srcHasMartialArts = true)
    for (const item of martialArtsResult?.items || []) {
      if (item?.slug && item.slug !== currentMovieSlug && !dedupedMap.has(item.slug)) {
        dedupedMap.set(item.slug, item);
      }
    }

    // 5. Chuẩn bị tiêu chuẩn so khớp
    const mainGenre = targetCategories[0];
    const mainGenreSlug = (mainGenre?.slug || "").toLowerCase().trim();
    const mainGenreName = (mainGenre?.name || "").toLowerCase().trim();

    const mainCountry = targetCountries[0];
    const mainCountrySlug = (mainCountry?.slug || "").toLowerCase().trim();
    const mainCountryName = (mainCountry?.name || "").toLowerCase().trim();

    const targetGenreSlugs = new Set(
      (categories as Array<{ slug?: string }>).map((c) => (c.slug || "").toLowerCase().trim()).filter(Boolean)
    );
    const targetGenreNames = new Set(
      (categories as Array<{ name?: string }>).map((c) => (c.name || "").toLowerCase().trim()).filter(Boolean)
    );

    const targetCountrySlugs = new Set(
      (countries as Array<{ slug?: string }>).map((c) => (c.slug || "").toLowerCase().trim()).filter(Boolean)
    );
    const targetCountryNames = new Set(
      (countries as Array<{ name?: string }>).map((c) => (c.name || "").toLowerCase().trim()).filter(Boolean)
    );

    const normDirector = primaryDirector ? primaryDirector.toLowerCase().trim() : "";
    const currentYearNum = typeof year === "number" ? year : parseInt(String(year || "0"), 10);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scoredItems: any[] = [];

    for (const item of dedupedMap.values()) {
      let hasActorMatch = false;
      if (primaryActor) {
        if (verifiedActorSlugs.has(item.slug)) {
          hasActorMatch = true;
        } else {
          const itemActors: string[] = Array.isArray(item.actor)
            ? item.actor.map((a: unknown) => String(a))
            : typeof item.actor === "string"
            ? item.actor.split(",").map((s: string) => s.trim())
            : [];
          if (itemActors.length > 0 && matchesActorAlias(primaryActor, itemActors, item.name, item.origin_name)) {
            hasActorMatch = true;
          }
        }
      }

      let hasDirectorMatch = false;
      if (normDirector) {
        if (verifiedDirectorSlugs.has(item.slug)) {
          hasDirectorMatch = true;
        } else {
          const itemDirectors: string[] = Array.isArray(item.director)
            ? item.director.map((d: unknown) => String(d).toLowerCase().trim())
            : typeof item.director === "string"
            ? item.director.toLowerCase().split(",").map((s: string) => s.trim())
            : [];
          if (itemDirectors.some((d: string) => d.includes(normDirector) || normDirector.includes(d))) {
            hasDirectorMatch = true;
          }
        }
      }

      const hasExactTargetGenre = movieMatchesTargetGenre(item, mainGenreSlug, mainGenreName);
      const hasExactTargetCountry = movieMatchesTargetCountry(item, mainCountrySlug, mainCountryName);

      let matchedGenreCount = 0;
      const itemCategories = Array.isArray(item.category)
        ? item.category
        : typeof item.genre === "string"
        ? item.genre.split(",").map((g: string) => ({ name: g.trim() }))
        : [];
      const seenGenres = new Set<string>();
      for (const g of itemCategories) {
        if (matchedGenreCount >= 3) break;
        const gSlug = (g?.slug || "").toLowerCase().trim();
        const gName = (g?.name || "").toLowerCase().trim();
        const key = gSlug || gName;
        if (!key || seenGenres.has(key)) continue;
        if (
          (gSlug && targetGenreSlugs.has(gSlug)) ||
          (gName && targetGenreNames.has(gName))
        ) {
          seenGenres.add(key);
          matchedGenreCount++;
        }
      }

      let hasAnyCountryMatch = false;
      const itemCountries = Array.isArray(item.country)
        ? item.country
        : typeof item.country === "string"
        ? [{ name: item.country }]
        : [];
      for (const c of itemCountries) {
        const cSlug = (c?.slug || "").toLowerCase().trim();
        const cName = (c?.name || "").toLowerCase().trim();
        if (
          (cSlug && targetCountrySlugs.has(cSlug)) ||
          (cName && targetCountryNames.has(cName))
        ) {
          hasAnyCountryMatch = true;
          break;
        }
      }

      const itemHasVoThuat = Array.isArray(item.category)
        ? item.category.some((g: { slug?: string }) => (g?.slug || "") === "vo-thuat")
        : false;

      const sameType = Boolean(
        type && item.type &&
        (type === "movie" || type === "single" ? "single" : type) ===
        (item.type === "movie" || item.type === "single" ? "single" : item.type)
      );
      const closeYear = Boolean(
        currentYearNum && currentYearNum > 1900 && item.year &&
        Math.abs((parseInt(String(item.year), 10) || 0) - currentYearNum) <= 5
      );

      let score = 0;
      if (item._isTmdbRec) score += 8;
      if (hasActorMatch) score += 8;
      if (hasDirectorMatch) score += 8;
      score += matchedGenreCount * 3;
      if (hasAnyCountryMatch) score += 4;
      if (itemHasVoThuat) score += srcHasMartialArts ? 4 : 2;
      if (sameType) score += 1;
      if (closeYear) score += 1;

      let matchPercent = 50;
      if (score <= 2) matchPercent = 50;
      else if (score <= 5) matchPercent = 58;
      else if (score <= 8) matchPercent = 64;
      else if (score <= 11) matchPercent = 70;
      else if (score <= 13) matchPercent = 74;
      else if (score <= 15) matchPercent = 78;
      else if (score <= 17) matchPercent = 82;
      else if (score <= 19) matchPercent = 85;
      else if (score <= 21) matchPercent = 88;
      else if (score <= 23) matchPercent = 91;
      else if (score <= 25) matchPercent = 94;
      else matchPercent = 98;

      scoredItems.push({
        ...item,
        recScore: score,
        matchPercent,
        _hasExactTargetGenre: hasExactTargetGenre,
        _hasExactTargetCountry: hasExactTargetCountry,
        _hasActorMatch: hasActorMatch,
        _hasDirectorMatch: hasDirectorMatch,
      });
    }

    const allMovies = [...scoredItems]
      .sort((a, b) => {
        if (b.recScore !== a.recScore) return b.recScore - a.recScore;
        const rateA = Number(a.imdb?.vote_average) || Number(a.tmdb?.vote_average) || 0;
        const rateB = Number(b.imdb?.vote_average) || Number(b.tmdb?.vote_average) || 0;
        if (rateB !== rateA) return rateB - rateA;
        return Number(b.year || 0) - Number(a.year || 0);
      })
      .slice(0, 24);

    const genreMovies = scoredItems
      .filter((it) => it._hasExactTargetGenre)
      .sort((a, b) => {
        const bonusA = (a._hasExactTargetCountry ? 4 : 0) + (a._hasActorMatch ? 3 : 0) + (a._hasDirectorMatch ? 3 : 0);
        const bonusB = (b._hasExactTargetCountry ? 4 : 0) + (b._hasActorMatch ? 3 : 0) + (b._hasDirectorMatch ? 3 : 0);
        const rateA = (Number(a.imdb?.vote_average) || Number(a.tmdb?.vote_average) || 0) + bonusA;
        const rateB = (Number(b.imdb?.vote_average) || Number(b.tmdb?.vote_average) || 0) + bonusB;
        if (rateB !== rateA) return rateB - rateA;
        return Number(b.year || 0) - Number(a.year || 0);
      })
      .slice(0, 24);

    const countryMovies = scoredItems
      .filter((it) => it._hasExactTargetCountry)
      .sort((a, b) => {
        const bonusA = (a._hasExactTargetGenre ? 5 : 0) + (a._hasActorMatch ? 3 : 0) + (a._hasDirectorMatch ? 3 : 0);
        const bonusB = (b._hasExactTargetGenre ? 5 : 0) + (b._hasActorMatch ? 3 : 0) + (b._hasDirectorMatch ? 3 : 0);
        const rateA = (Number(a.imdb?.vote_average) || Number(a.tmdb?.vote_average) || 0) + bonusA;
        const rateB = (Number(b.imdb?.vote_average) || Number(b.tmdb?.vote_average) || 0) + bonusB;
        if (rateB !== rateA) return rateB - rateA;
        return Number(b.year || 0) - Number(a.year || 0);
      })
      .slice(0, 24);

    const actorMovies = scoredItems
      .filter((it) => it._hasActorMatch)
      .sort((a, b) => Number(b.year || 0) - Number(a.year || 0))
      .slice(0, 24);

    const directorMovies = scoredItems
      .filter((it) => it._hasDirectorMatch)
      .sort((a, b) => Number(b.year || 0) - Number(a.year || 0))
      .slice(0, 24);

    return {
      success: true,
      currentMovieTitle,
      genreName: mainGenre?.name || "",
      countryName: mainCountry?.name || "",
      actorName: primaryActor || "",
      directorName: primaryDirector || "",
      genreMovies,
      countryMovies,
      actorMovies,
      directorMovies,
      allMovies,
    };
  } catch (err) {
    console.error("[movie recommendations compute] Lỗi:", err);
    return {
      success: false,
      genreMovies: [],
      countryMovies: [],
      actorMovies: [],
      directorMovies: [],
      allMovies: [],
    };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getCanonicalRecommendationsCacheKey(body: any): string {
  const {
    currentMovieSlug = "",
    tmdbId = "",
    tmdbType = "",
    type = "",
    categories = [],
    countries = [],
    primaryActor = "",
    primaryDirector = "",
    year = 0,
  } = body || {};

  const normCategories = (Array.isArray(categories) ? categories : [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((c: any) => (c?.slug || c?.name || "").toLowerCase().trim())
    .filter(Boolean)
    .sort();

  const normCountries = (Array.isArray(countries) ? countries : [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((c: any) => (c?.slug || c?.name || "").toLowerCase().trim())
    .filter(Boolean)
    .sort();

  const srcHasMartialArts = hasMartialArtsSignal(body);

  const canonicalObj = {
    v: 12,
    slug: String(currentMovieSlug).toLowerCase().trim(),
    tmdbId: String(tmdbId || "").trim(),
    tmdbType: String(tmdbType || "").toLowerCase().trim(),
    type: String(type || "").toLowerCase().trim(),
    categories: normCategories,
    countries: normCountries,
    actor: String(primaryActor || "").toLowerCase().trim(),
    director: String(primaryDirector || "").toLowerCase().trim(),
    year: Number(year) || 0,
    martial: srcHasMartialArts ? 1 : 0,
  };

  const hash = createHash("sha256").update(JSON.stringify(canonicalObj)).digest("hex").slice(0, 32);
  return `${canonicalObj.slug}_${hash}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function packRecommendationsPayload(data: any): CompactRecommendationsPayload {
  const poolMap = new Map<string, CompactMovieCard>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getCleanCard = (item: any): CompactMovieCard => ({
    _id: item._id,
    name: item.name || item.title || "",
    slug: item.slug,
    origin_name: item.origin_name || item.original_name,
    thumb_url: item.thumb_url || item.poster_url,
    poster_url: item.poster_url || item.thumb_url,
    year: item.year,
    time: item.time,
    quality: item.quality,
    episode_current: item.episode_current,
    lang: item.lang,
    category: Array.isArray(item.category)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? item.category.map((c: any) => ({ name: c.name || "", slug: c.slug || "" }))
      : undefined,
    country: Array.isArray(item.country)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? item.country.map((c: any) => ({ name: c.name || "", slug: c.slug || "" }))
      : undefined,
    type: item.type,
    matchPercent: item.matchPercent,
  });

  const lists = [
    data.genreMovies || [],
    data.countryMovies || [],
    data.actorMovies || [],
    data.directorMovies || [],
    data.allMovies || [],
  ];

  for (const list of lists) {
    for (const item of list) {
      if (item && item.slug && !poolMap.has(item.slug)) {
        poolMap.set(item.slug, getCleanCard(item));
      }
    }
  }

  return {
    v: 13,
    success: data.success ?? true,
    currentMovieTitle: data.currentMovieTitle || "",
    genreName: data.genreName || "",
    countryName: data.countryName || "",
    actorName: data.actorName || "",
    directorName: data.directorName || "",
    pool: Array.from(poolMap.values()),
    genreSlugs: (data.genreMovies || []).map((m: { slug?: string }) => m.slug).filter(Boolean),
    countrySlugs: (data.countryMovies || []).map((m: { slug?: string }) => m.slug).filter(Boolean),
    actorSlugs: (data.actorMovies || []).map((m: { slug?: string }) => m.slug).filter(Boolean),
    directorSlugs: (data.directorMovies || []).map((m: { slug?: string }) => m.slug).filter(Boolean),
    allSlugs: (data.allMovies || []).map((m: { slug?: string }) => m.slug).filter(Boolean),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function unpackRecommendationsPayload(raw: any): RecommendationsData {
  if (!raw) return raw;
  if (raw.v === 13 && Array.isArray(raw.pool)) {
    const poolMap = new Map<string, CompactMovieCard>();
    for (const card of raw.pool) {
      if (card && card.slug) {
        poolMap.set(card.slug, card);
      }
    }

    return {
      success: raw.success ?? true,
      currentMovieTitle: raw.currentMovieTitle || "",
      genreName: raw.genreName || "",
      countryName: raw.countryName || "",
      actorName: raw.actorName || "",
      directorName: raw.directorName || "",
      genreMovies: (raw.genreSlugs || []).map((slug: string) => poolMap.get(slug)).filter(Boolean),
      countryMovies: (raw.countrySlugs || []).map((slug: string) => poolMap.get(slug)).filter(Boolean),
      actorMovies: (raw.actorSlugs || []).map((slug: string) => poolMap.get(slug)).filter(Boolean),
      directorMovies: (raw.directorSlugs || []).map((slug: string) => poolMap.get(slug)).filter(Boolean),
      allMovies: (raw.allSlugs || []).map((slug: string) => poolMap.get(slug)).filter(Boolean),
    };
  }

  return raw;
}

function storeRecommendationsL1(cacheKey: string, data: RecommendationsData): void {
  if (data && data.success && Array.isArray(data.allMovies) && data.allMovies.length > 0) {
    const now = Date.now();
    recommendationsL1Cache.set(cacheKey, {
      data,
      expireAt: now + 30 * 60 * 1000,
      staleUntil: now + 4 * 3600 * 1000,
    });
  }
}

async function executeAndCacheRecommendations(
  cacheKey: string,
  body: RecommendationsRequestPayload | Record<string, unknown>
): Promise<RecommendationsData> {
  const kvKeyV13 = `${REDIS_REC_PREFIX}${cacheKey}`;

  let rawData = await cacheService.get<CompactRecommendationsPayload | Record<string, unknown>>(kvKeyV13);

  if (!rawData) {
    const computed = await computeMovieRecommendations(body);
    if (computed && computed.success) {
      const packed = packRecommendationsPayload(computed);
      cacheService.set(kvKeyV13, packed, 12 * 3600).catch(() => {});
      rawData = packed;
    } else {
      rawData = computed as unknown as Record<string, unknown>;
    }
  }

  const data = unpackRecommendationsPayload(rawData);
  storeRecommendationsL1(cacheKey, data);
  return data;
}

/**
 * Truy vấn đầy đủ có L1 SWR, server in-flight deduplication và Redis v13 fallback.
 */
export async function getMovieRecommendations(
  body: RecommendationsRequestPayload | Record<string, unknown>
): Promise<{ data: RecommendationsData; cacheStatus: RecommendationCacheStatus }> {
  const cacheKey = getCanonicalRecommendationsCacheKey(body);
  const now = Date.now();

  if (recommendationsL1Cache.has(cacheKey)) {
    const entry = recommendationsL1Cache.get(cacheKey)!;
    if (entry.expireAt > now) {
      return { data: entry.data, cacheStatus: "HIT" };
    }
    if (entry.staleUntil > now) {
      executeAndCacheRecommendations(cacheKey, body).catch(() => {});
      return { data: entry.data, cacheStatus: "STALE" };
    }
  }

  let serverPromise = serverInFlightRecs.get(cacheKey);
  if (!serverPromise) {
    serverPromise = executeAndCacheRecommendations(cacheKey, body).finally(() => {
      serverInFlightRecs.delete(cacheKey);
    });
    serverInFlightRecs.set(cacheKey, serverPromise);
  }

  const data = await serverPromise;
  return { data, cacheStatus: "MISS" };
}

/**
 * Đọc nhanh cache L1 / Redis v13 cho SSR với timeout cứng (mặc định 120ms).
 * Tuyệt đối không chạy compute upstream để không làm chậm TTFB của video player.
 */
export async function getCachedMovieRecommendationsFast(
  body: RecommendationsRequestPayload,
  redisTimeoutMs = 120
): Promise<RecommendationsData | null> {
  if (!body?.currentMovieSlug) return null;

  const cacheKey = getCanonicalRecommendationsCacheKey(body);
  const now = Date.now();

  if (recommendationsL1Cache.has(cacheKey)) {
    const entry = recommendationsL1Cache.get(cacheKey)!;
    if (entry.expireAt > now) {
      return entry.data;
    }
    if (entry.staleUntil > now) {
      executeAndCacheRecommendations(cacheKey, body).catch(() => {});
      return entry.data;
    }
  }

  const kvKeyV13 = `${REDIS_REC_PREFIX}${cacheKey}`;
  const rawData = await withTimeout(
    cacheService
      .get<CompactRecommendationsPayload | Record<string, unknown>>(kvKeyV13)
      .catch(() => null),
    redisTimeoutMs,
    null
  );

  if (!rawData) return null;

  const data = unpackRecommendationsPayload(rawData);
  if (data && data.success && Array.isArray(data.allMovies) && data.allMovies.length > 0) {
    storeRecommendationsL1(cacheKey, data);
    return data;
  }

  return null;
}

function parseTaxonomyQueryParam(raw: string | null): TaxonomyRef[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((part): TaxonomyRef | null => {
      const sepIdx = part.indexOf("~");
      if (sepIdx === -1) {
        const v = part.trim();
        return v ? { name: v, slug: v } : null;
      }
      const slug = part.slice(0, sepIdx).trim();
      const name = part.slice(sepIdx + 1).trim();
      return slug || name ? { slug, name: name || slug } : null;
    })
    .filter((item): item is TaxonomyRef => item !== null);
}

/**
 * Parse query parameters của GET /api/movies/recommendations thành payload chuẩn.
 */
export function parseRecommendationsQuery(searchParams: URLSearchParams): RecommendationsRequestPayload {
  const currentMovieSlug = (searchParams.get("slug") || "").trim();
  const currentMovieTitle = searchParams.get("title") || "";
  const categories = parseTaxonomyQueryParam(searchParams.get("cats"));
  const countries = parseTaxonomyQueryParam(searchParams.get("ctrs"));
  const primaryActor = searchParams.get("actor") || undefined;
  const primaryDirector = searchParams.get("director") || undefined;
  const year = searchParams.get("year") || undefined;
  const type = searchParams.get("type") || undefined;
  const tmdbId = searchParams.get("tmdbId") || undefined;
  const tmdbType = searchParams.get("tmdbType") || undefined;
  const hasMartialArts = searchParams.get("martial") === "1";

  return {
    currentMovieSlug,
    currentMovieTitle,
    categories,
    countries,
    primaryActor,
    primaryDirector,
    year,
    type,
    tmdbId,
    tmdbType,
    hasMartialArts,
  };
}
