import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { movieApi, DEFAULT_GENRES, DEFAULT_COUNTRIES } from "@/services/movieApi";
import { matchesActorAlias } from "@/lib/actorAlias";
import { queryMoviesByActor } from "@/services/aiActorService";
import { getTmdbMovieRecommendations, getDirectorFilmographyFromTmdb } from "@/services/tmdbService";
import { cacheService } from "@/lib/cache";
import {
  enforceRateLimit,
  buildRateLimitResponse,
  RATE_LIMIT_PRESETS,
} from "@/lib/rateLimit";

export const maxDuration = 15;

interface RecommendationCacheEntry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  expireAt: number;
  staleUntil: number;
}

// Module-level L1 memory cache v12 (SWR: 30 phút tươi, 4 giờ stale)
const recommendationsL1Cache = new Map<string, RecommendationCacheEntry>();

// Module-level in-flight Promise map: Khử trùng lặp request đang chạy trên server
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const serverInFlightRecs = new Map<string, Promise<any>>();

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
async function computeMovieRecommendations(body: any) {
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
      contentText = "",
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

    // 2. Phát hiện tín hiệu võ thuật từ nội dung phim nguồn
    const plainContent = (contentText || "").replace(/<[^>]+>/g, " ");
    const srcHasMartialArts = /võ thuật|kung fu|martial|quyền|kiếm hiệp/i.test(plainContent);

    // 3. Truy vấn song song các nguồn phim (TUYỆT ĐỐI LOẠI TRỪ VSMOV: skipVsmov = true)
    const [tmdbRecs, genreResults, countryResults, actorResult, directorResult, martialArtsResult] = await Promise.all([
      tmdbId
        ? getTmdbMovieRecommendations(tmdbId, tmdbType || type, currentMovieSlug).catch(() => [])
        : Promise.resolve([]),
      Promise.all(
        targetCategories.map((c) =>
          movieApi.getMovies({ category: c.slug, page: 1, limit: 16, skipKvCache: true, skipVsmov: true }).catch(() => null)
        )
      ),
      Promise.all(
        targetCountries.map((c) =>
          movieApi.getMovies({ country: c.slug, page: 1, limit: 16, skipKvCache: true, skipVsmov: true }).catch(() => null)
        )
      ),
      primaryActor
        ? queryMoviesByActor(primaryActor, [], undefined, 12).catch(() => [])
        : Promise.resolve([]),
      primaryDirector
        ? getDirectorFilmographyFromTmdb(primaryDirector, 12).catch(() => [])
        : Promise.resolve([]),
      srcHasMartialArts
        ? movieApi.getMovies({ category: "vo-thuat", page: 1, limit: 16, skipKvCache: true, skipVsmov: true }).catch(() => null)
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      : (actorResult as any)?.items || [];
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      : (directorResult as any)?.items || [];
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
      // Xác minh diễn viên (TÁCH BIỆT HOÀN TOÀN KHỎI ĐẠO DIỄN)
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

      // Xác minh đạo diễn (TÁCH BIỆT HOÀN TOÀN KHỎI DIỄN VIÊN)
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

      // Kiểm tra chính xác thể loại và quốc gia mục tiêu
      const hasExactTargetGenre = movieMatchesTargetGenre(item, mainGenreSlug, mainGenreName);
      const hasExactTargetCountry = movieMatchesTargetCountry(item, mainCountrySlug, mainCountryName);

      // Điểm thể loại trùng (tối đa 3 thể loại = +9)
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

      // Điểm quốc gia trùng
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

      // Tín hiệu võ thuật
      const itemHasVoThuat = Array.isArray(item.category)
        ? item.category.some((g: { slug?: string }) => (g?.slug || "") === "vo-thuat")
        : false;

      // Cùng loại & Cùng năm
      const sameType = Boolean(
        type && item.type &&
        (type === "movie" || type === "single" ? "single" : type) ===
        (item.type === "movie" || item.type === "single" ? "single" : item.type)
      );
      const closeYear = Boolean(
        currentYearNum && currentYearNum > 1900 && item.year &&
        Math.abs((parseInt(String(item.year), 10) || 0) - currentYearNum) <= 5
      );

      // CHẤM ĐIỂM TƯƠNG ĐỒNG CÂN BẰNG CHO TAB TƯƠNG TỰ
      let score = 0;
      if (item._isTmdbRec) score += 8; // Điểm bổ trợ TMDb, không lấn át
      if (hasActorMatch) score += 8;
      if (hasDirectorMatch) score += 8;
      score += matchedGenreCount * 3;
      if (hasAnyCountryMatch) score += 4;
      if (itemHasVoThuat) score += srcHasMartialArts ? 4 : 2;
      if (sameType) score += 1;
      if (closeYear) score += 1;

      // Chuẩn hóa % Khớp
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

    // 6. PHÂN BỔ VÀ SẮP XẾP THEO TỪNG TAB RIÊNG BIỆT (KHÔNG DÙNG CHUNG DANH SÁCH RỒI FALLBACK)
    // 6.1 Tab Tương Tự: Hybrid similarity score
    const allMovies = [...scoredItems]
      .sort((a, b) => {
        if (b.recScore !== a.recScore) return b.recScore - a.recScore;
        const rateA = Number(a.imdb?.vote_average) || Number(a.tmdb?.vote_average) || 0;
        const rateB = Number(b.imdb?.vote_average) || Number(b.tmdb?.vote_average) || 0;
        if (rateB !== rateA) return rateB - rateA;
        return Number(b.year || 0) - Number(a.year || 0);
      })
      .slice(0, 24);

    // 6.2 Tab Thể Loại: Chỉ nhận phim THỰC SỰ có đúng thể loại mục tiêu (Tuyệt đối KHÔNG fallback sang allMovies)
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

    // 6.3 Tab Quốc Gia: Chỉ nhận phim THỰC SỰ có đúng quốc gia mục tiêu (Tuyệt đối KHÔNG fallback sang allMovies)
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

    // 6.4 Tab Diễn Viên: Chỉ nhận phim THỰC SỰ có diễn viên mục tiêu trong cast
    const actorMovies = scoredItems
      .filter((it) => it._hasActorMatch)
      .sort((a, b) => Number(b.year || 0) - Number(a.year || 0))
      .slice(0, 24);

    // 6.5 Tab Đạo Diễn: Chỉ nhận phim THỰC SỰ do đạo diễn mục tiêu đạo diễn
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
    contentText = "",
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
    content: String(contentText || "").toLowerCase().trim(),
  };

  const hash = createHash("sha256").update(JSON.stringify(canonicalObj)).digest("hex").slice(0, 32);
  return `${canonicalObj.slug}_${hash}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeAndCacheRecommendations(cacheKey: string, body: any) {
  const kvKey = `movie:recommendations:v12:${cacheKey}`;
  const data = await cacheService.fetchOrSet(
    kvKey,
    () => computeMovieRecommendations(body),
    12 * 3600 // 12 giờ trên Upstash KV
  );

  const now = Date.now();
  if (data && data.success && Array.isArray(data.allMovies) && data.allMovies.length > 0) {
    recommendationsL1Cache.set(cacheKey, {
      data,
      expireAt: now + 30 * 60 * 1000, // 30 phút tươi
      staleUntil: now + 4 * 3600 * 1000, // 4 giờ stale
    });
  }

  return data;
}

export async function POST(req: NextRequest) {
  try {
    const rateLimit = await enforceRateLimit(req, RATE_LIMIT_PRESETS.RECOMMENDATIONS);
    if (!rateLimit.allowed) {
      return buildRateLimitResponse(rateLimit);
    }

    const body = await req.json();
    const { currentMovieSlug } = body || {};

    if (!currentMovieSlug) {
      return NextResponse.json(
        {
          success: false,
          genreMovies: [],
          countryMovies: [],
          actorMovies: [],
          directorMovies: [],
          allMovies: [],
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    const cacheKey = getCanonicalRecommendationsCacheKey(body);
    const now = Date.now();

    // 1. Kiểm tra L1 In-memory cache (SWR: Stale-While-Revalidate)
    if (recommendationsL1Cache.has(cacheKey)) {
      const entry = recommendationsL1Cache.get(cacheKey)!;
      if (entry.expireAt > now) {
        return NextResponse.json(entry.data, {
          headers: {
            "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
            "X-Cache": "HIT",
          },
        });
      }
      if (entry.staleUntil > now) {
        executeAndCacheRecommendations(cacheKey, body).catch(() => {});
        return NextResponse.json(entry.data, {
          headers: {
            "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
            "X-Cache": "STALE",
          },
        });
      }
    }

    // 2. Module-level in-flight deduplication trên server
    let serverPromise = serverInFlightRecs.get(cacheKey);
    if (!serverPromise) {
      serverPromise = executeAndCacheRecommendations(cacheKey, body).finally(() => {
        serverInFlightRecs.delete(cacheKey);
      });
      serverInFlightRecs.set(cacheKey, serverPromise);
    }

    const result = await serverPromise;
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
        "X-Cache": "MISS",
      },
    });
  } catch (err) {
    console.error("[movie recommendations API] Lỗi:", err);
    return NextResponse.json(
      {
        success: false,
        genreMovies: [],
        countryMovies: [],
        actorMovies: [],
        directorMovies: [],
        allMovies: [],
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }
}
