import { NextRequest, NextResponse } from "next/server";
import { movieApi, DEFAULT_GENRES, DEFAULT_COUNTRIES } from "@/services/movieApi";
import { matchesActorAlias } from "@/lib/actorAlias";

export const maxDuration = 15;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      currentMovieSlug,
      currentMovieTitle,
      categories = [],
      countries = [],
      primaryActor,
      primaryDirector,
      year,
      type,
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
      .slice(0, 3); // Lấy tối đa 3 thể loại đặc trưng để query

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
      .slice(0, 2); // Lấy tối đa 2 quốc gia để query

    // 2. Phát hiện tín hiệu võ thuật từ nội dung phim nguồn (KHÔNG dùng genre hanh-dong làm tiêu chí)
    const plainContent = (contentText || "").replace(/<[^>]+>/g, " ");
    const srcHasMartialArts = /võ thuật|kung fu|martial|quyền|kiếm hiệp/i.test(plainContent);

    // 3. Truy vấn song song các nguồn phim: thể loại, quốc gia, diễn viên, và tùy chọn võ thuật
    const [genreResults, countryResults, actorResult, martialArtsResult] = await Promise.all([
      Promise.all(
        targetCategories.map((c) =>
          movieApi.getMovies({ category: c.slug, page: 1, limit: 16 }).catch(() => null)
        )
      ),
      Promise.all(
        targetCountries.map((c) =>
          movieApi.getMovies({ country: c.slug, page: 1, limit: 16 }).catch(() => null)
        )
      ),
      primaryActor
        ? movieApi
            .getMovies({ keyword: primaryActor, page: 1, limit: 12, skipKvCache: true })
            .catch(() => null)
        : Promise.resolve(null),
      // Chỉ thêm pool võ thuật khi phim nguồn thực sự có tín hiệu võ thuật trong nội dung
      srcHasMartialArts
        ? movieApi.getMovies({ category: "vo-thuat", page: 1, limit: 16 }).catch(() => null)
        : Promise.resolve(null),
    ]);

    // 4. Khử trùng lặp và loại bỏ phim hiện tại
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dedupedMap = new Map<string, any>();

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

    for (const item of actorResult?.items || []) {
      if (item?.slug && item.slug !== currentMovieSlug && !dedupedMap.has(item.slug)) {
        dedupedMap.set(item.slug, item);
      }
    }

    // Pool võ thuật bổ sung (chỉ active khi srcHasMartialArts = true)
    for (const item of martialArtsResult?.items || []) {
      if (item?.slug && item.slug !== currentMovieSlug && !dedupedMap.has(item.slug)) {
        dedupedMap.set(item.slug, item);
      }
    }

    // 5. Chuẩn bị các Set phục vụ chấm điểm tương đồng thực tế
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
      let score = 0;

      // +8 nếu có cùng diễn viên chính (tín hiệu mạnh nhất — so khớp alias EN/VN/ZH)
      let hasActorMatch = false;
      if (primaryActor) {
        const itemActors: string[] = Array.isArray(item.actor)
          ? item.actor.map((a: unknown) => String(a))
          : typeof item.actor === "string"
          ? item.actor.split(",").map((s: string) => s.trim())
          : [];
        if (matchesActorAlias(primaryActor, itemActors, item.name, item.origin_name)) {
          hasActorMatch = true;
          score += 8;
        }
      }

      // +5 nếu cùng đạo diễn
      if (normDirector) {
        const itemDirectors = Array.isArray(item.director)
          ? item.director.map((d: unknown) => String(d).toLowerCase().trim())
          : typeof item.director === "string"
          ? item.director.toLowerCase().split(",").map((s: string) => s.trim())
          : [];
        if (itemDirectors.some((d: string) => d.includes(normDirector) || normDirector.includes(d))) {
          score += 5;
        }
      }

      // +5/+2 nếu ứng viên có thể loại võ thuật (vo-thuat)
      const itemHasVoThuat = Array.isArray(item.category)
        ? item.category.some((g: { slug?: string }) => (g?.slug || "") === "vo-thuat")
        : false;
      if (itemHasVoThuat) {
        score += srcHasMartialArts ? 5 : 2;
      }

      // +3 cho mỗi thể loại trùng (tối đa 3 thể loại = +9 tối đa)
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
      score += matchedGenreCount * 3;

      // +3 nếu cùng quốc gia
      let hasCountryMatch = false;
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
          hasCountryMatch = true;
          break;
        }
      }
      if (hasCountryMatch) {
        score += 3;
      }

      // +1 nếu cùng type (phim lẻ / phim bộ)
      if (type && item.type) {
        const normTypeA = type === "movie" || type === "single" ? "single" : type;
        const normTypeB = item.type === "movie" || item.type === "single" ? "single" : item.type;
        if (normTypeA === normTypeB) {
          score += 1;
        }
      }

      // +1 nếu năm gần nhau (chênh lệch <= 5 năm)
      if (currentYearNum && currentYearNum > 1900 && item.year) {
        const itemYearNum =
          typeof item.year === "number" ? item.year : parseInt(String(item.year), 10);
        if (itemYearNum && !isNaN(itemYearNum) && Math.abs(itemYearNum - currentYearNum) <= 5) {
          score += 1;
        }
      }

      // 6. Chuẩn hóa % Khớp theo thang điểm mở rộng
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
      else if (score <= 25) matchPercent = 93;
      else if (score <= 27) matchPercent = 95;
      else if (score <= 29) matchPercent = 97;
      else matchPercent = 99;

      scoredItems.push({
        ...item,
        recScore: score,
        matchPercent,
        _hasCountryMatch: hasCountryMatch,
        _hasGenreMatch: matchedGenreCount > 0,
        _hasActorMatch: hasActorMatch,
      });
    }

    // 6. Sắp xếp theo score giảm dần (ưu tiên điểm tương đồng cao nhất)
    scoredItems.sort((a, b) => {
      if (b.recScore !== a.recScore) {
        return b.recScore - a.recScore;
      }
      const rateA = Number(a.imdb?.vote_average) || Number(a.tmdb?.vote_average) || 0;
      const rateB = Number(b.imdb?.vote_average) || Number(b.tmdb?.vote_average) || 0;
      if (rateB !== rateA) return rateB - rateA;
      return Number(b.year || 0) - Number(a.year || 0);
    });

    // 7. Lấy tối đa 24 phim sau khi sort
    const allMovies = scoredItems.slice(0, 24);
    const genreMovies = scoredItems.filter((it) => it._hasGenreMatch).slice(0, 24);
    const countryMovies = scoredItems.filter((it) => it._hasCountryMatch).slice(0, 24);
    const actorMovies = scoredItems.filter((it) => it._hasActorMatch).slice(0, 24);

    const mainGenreName = (categories as Array<{ name?: string }>)[0]?.name || "Thể loại";
    const mainCountryName = (countries as Array<{ name?: string }>)[0]?.name || "Quốc gia";

    return NextResponse.json({
      success: true,
      currentMovieTitle,
      genreName: mainGenreName,
      countryName: mainCountryName,
      actorName: primaryActor,
      genreMovies: genreMovies.length > 0 ? genreMovies : allMovies,
      countryMovies: countryMovies.length > 0 ? countryMovies : allMovies,
      actorMovies,
      allMovies,
    });
  } catch (err) {
    console.error("[movie recommendations API] Lỗi:", err);
    return NextResponse.json(
      {
        success: false,
        genreMovies: [],
        countryMovies: [],
        actorMovies: [],
        allMovies: [],
      },
      { status: 500 }
    );
  }
}
