import { NextRequest, NextResponse } from "next/server";
import { movieApi } from "@/services/movies/service";
import { executeSmartSearch } from "@/services/movies/smartSearchService";
import { enrichMovieListPosters } from "@/services/movies/posterEnrichment";
import {
  resolveActorMovies,
  queryMoviesByActor,
  isAmbiguousShortActorKeyword,
  hasExplicitActorPrefix,
} from "@/services/aiActorService";
import { getActorSynonyms } from "@/services/actor/actorAliasResolver";
import { findHistoricalArtist } from "@/data/history/historicalArtistsBirthdays";
import { searchTmdbPerson } from "@/services/tmdbService";
import { pickBestMoviePoster, MovieLike } from "@/lib/movieMedia";
import { normalizeForMatch } from "@/lib/stringUtils";
import { cacheService } from "@/lib/cache";
import {
  enforceRateLimit,
  buildRateLimitResponse,
  RATE_LIMIT_PRESETS,
} from "@/lib/rateLimit";
import { validateHttpMethod } from "@/lib/securityValidation";
import { logSecurityEvent } from "@/lib/securityLogger";

// TTL cho Search Suggest: 1 giờ (3600s), theo convention của Nanaflix
const SUGGEST_CACHE_TTL_SECONDS = 3600;

export async function GET(req: NextRequest) {
  try {
    // 1. Kiểm tra phương thức HTTP
    const methodErr = validateHttpMethod(req, ["GET"]);
    if (methodErr) return methodErr;

    // 2. Giới hạn tần suất phân tán (30 requests / phút / IP)
    const rateLimit = await enforceRateLimit(req, RATE_LIMIT_PRESETS.SEARCH_IN_MEMORY);
    if (!rateLimit.allowed) {
      logSecurityEvent(req, {
        event: "RATE_LIMIT_EXCEEDED",
        status: 429,
        reason: "Vượt quá giới hạn tìm kiếm",
      });
      return buildRateLimitResponse(
        rateLimit,
        "Bạn đang gửi yêu cầu tìm kiếm quá nhanh. Vui lòng chờ giây lát."
      );
    }

    const { searchParams } = new URL(req.url);
    const rawKeyword = searchParams.get("keyword")?.trim() || "";
    // Giới hạn độ dài keyword tối đa 100 ký tự (chống chuỗi quá dài gây treo CPU)
    const keyword = rawKeyword.slice(0, 100);

    // Không tạo cache riêng cho search < 2 ký tự
    if (!keyword || keyword.length < 2) {
      return NextResponse.json({ items: [] });
    }

    const normKw = normalizeForMatch(keyword);
    if (!normKw || normKw.length < 2) {
      return NextResponse.json({ items: [] });
    }

    // 1. Kiểm tra L1 In-memory & L2 Upstash Redis qua cacheService (chỉ dùng cache khi có ít nhất 1 kết quả)
    const cacheKey = `search:suggest:v2:${normKw}`;
    const cached = await cacheService.get<{ items: unknown[] }>(cacheKey);
    if (cached && Array.isArray(cached.items) && cached.items.length > 0) {
      return NextResponse.json(cached);
    }

    // Tra cứu nhanh nghệ sĩ từ bộ dữ liệu Historical Artists O(1) (0ms)
    const histArtist = findHistoricalArtist(keyword);

    // Kiểm tra actor resolution cho từ khóa không mơ hồ (>= 2 từ hoặc có tiền tố rõ ràng)
    const shouldCheckActor =
      !histArtist &&
      (hasExplicitActorPrefix(keyword) ||
        (!isAmbiguousShortActorKeyword(keyword) && keyword.trim().split(/\s+/).length >= 2));

    // Chạy song song tìm kiếm phim và phân giải diễn viên với timeout tối đa 1800ms
    // skipKvCache: true đảm bảo các truy vấn gợi ý dở dang (limit 8) không ghi rác lên Cloudflare KV
    // posterEnrichmentBudgetMs: 500ms nâng cấp poster sang TMDb CDN chính hãng
    const [res, actorRes] = await Promise.all([
      Promise.race([
        movieApi.getMovies({
          keyword,
          page: 1,
          limit: 8,
          skipKvCache: true,
          posterEnrichmentBudgetMs: 500,
        }),
        new Promise<{ items: SuggestMovieItem[]; pagination?: unknown }>((resolve) =>
          setTimeout(() => resolve({ items: [] }), 1800)
        ),
      ]).catch(() => ({ items: [] })),
      shouldCheckActor
        ? Promise.race([
          resolveActorMovies(keyword),
          new Promise<{ isActor: boolean; actorName: string; titles: string[]; aliases: string[]; country?: string; source: "none" }>((resolve) =>
            setTimeout(() => resolve({ isActor: false, actorName: "", titles: [], aliases: [], source: "none" }), 800)
          ),
        ]).catch(() => null)
        : Promise.resolve(null),
    ]);

    interface SuggestMovieItem {
      slug?: string;
      name?: string;
      title?: string;
      origin_name?: string;
      poster_url?: string;
      thumb_url?: string;
      year?: number | string;
      quality?: string;
      type?: string;
      category?: Array<{ name?: string }>;
    }

    let rawItems = ((res?.items || []) as SuggestMovieItem[]);

    // Tích hợp Smart Search 3 tầng: nếu tìm kiếm trực tiếp trả về 0 kết quả
    if (rawItems.length === 0) {
      try {
        const smartRes = await Promise.race([
          executeSmartSearch({ query: keyword, limit: 8, skipKvCache: true }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200)),
        ]);
        if (smartRes && Array.isArray(smartRes.items) && smartRes.items.length > 0) {
          rawItems = smartRes.items as SuggestMovieItem[];
        }
      } catch { }
    }

    // Sắp xếp gợi ý nhanh: Ưu tiên tuyệt đối các phim có tên khớp với từ khóa gõ vào
    const getSuggestScore = (item: SuggestMovieItem, kw: string): number => {
      const normTitle = normalizeForMatch(item.name || item.title || "");
      const normOrig = normalizeForMatch(item.origin_name || "");
      const normSlug = normalizeForMatch(item.slug || "");

      if (normTitle === kw || normOrig === kw || normSlug === kw.replace(/\s+/g, "-")) return 100;
      if (normTitle.startsWith(kw) || normOrig.startsWith(kw)) return 80;
      if (normTitle.includes(kw) || normOrig.includes(kw)) return 60;

      // Khớp toàn bộ token nếu query nhiều từ
      const kwTokens = kw.split(/\s+/).filter(Boolean);
      if (kwTokens.length > 1) {
        const titleTokens = new Set((normTitle + " " + normOrig + " " + normSlug).split(/\s+/).filter(Boolean));
        const matched = kwTokens.filter((tok) => titleTokens.has(tok)).length;
        if (matched === kwTokens.length) return 50;
      }
      return 20; // Phim do nguồn API tìm kiếm trả về
    };

    let validMovieItems = rawItems
      .filter((item) => getSuggestScore(item, normKw) >= 50)
      .sort((a, b) => getSuggestScore(b, normKw) - getSuggestScore(a, normKw));

    // Fallback thông minh: nếu không có phim đạt điểm >= 50 nhưng nguồn API có kết quả,
    // giữ lại tối đa 5 phim từ nguồn thay vì bỏ trắng
    if (validMovieItems.length === 0 && rawItems.length > 0) {
      validMovieItems = rawItems.slice(0, 5);
    }

    const topMovieItems = validMovieItems.slice(0, 5);
    // Chủ động nâng cấp sang TMDb CDN chính hãng siêu nhẹ (~35KB) thay vì để raw phimimg/nguonc
    await enrichMovieListPosters(topMovieItems, { budgetMs: 500 }).catch(() => {});

    const items = topMovieItems.map((item) => ({
      slug: item.slug || "",
      title: item.name || item.title || "",
      poster: pickBestMoviePoster(item as MovieLike, "/default-poster.svg"),
      year: item.year || "",
      quality: item.quality || "HD",
      category: item.category?.[0]?.name || item.type || "",
    }));

    // 3. Nếu khớp diễn viên rõ ràng:
    // - Ưu tiên điều hướng thẳng sang trang chi tiết diễn viên (/dien-vien/:id-:slug hoặc /dien-vien/:slug)
    // - Bổ sung các tác phẩm tiêu biểu của nghệ sĩ vào danh sách gợi ý phim bên dưới
    const syn = getActorSynonyms(keyword);
    let matchedActorName = "";
    let matchedActorAliases: string[] = [];
    let matchedActorCountry: string | undefined = undefined;
    let matchedTmdbPersonId: number | undefined = undefined;

    if (histArtist) {
      matchedActorName = histArtist.name;
      matchedActorAliases = histArtist.aliases || [];
      matchedActorCountry = histArtist.country;
      matchedTmdbPersonId = histArtist.tmdbPersonId;

      const displayTitle = histArtist.englishName && histArtist.englishName !== histArtist.name
        ? `Diễn viên: ${histArtist.name} (${histArtist.englishName})`
        : `Diễn viên: ${histArtist.name}`;
      const actorItem = {
        slug: `dien-vien/${histArtist.slug}`,
        title: displayTitle,
        poster: histArtist.avatarUrl || "/default-hero.jpg",
        year: histArtist.country || "Điện Ảnh",
        quality: "Hồ Sơ",
        category: "Diễn Viên",
      };
      items.unshift(actorItem);
    } else if (actorRes?.isActor && actorRes.actorName && !isAmbiguousShortActorKeyword(keyword)) {
      matchedActorName = syn.isMatched && syn.canonicalName ? syn.canonicalName : actorRes.actorName;
      matchedActorAliases = syn.variants || (actorRes && "aliases" in actorRes && Array.isArray(actorRes.aliases) ? actorRes.aliases : []);
      matchedActorCountry = actorRes.country || syn.country || "Điện Ảnh";

      const actorDisplayName = matchedActorName;
      const targetCountry = matchedActorCountry;

      // Tra cứu nhanh TMDB person để lấy ID và ảnh chân dung diễn viên (budget 450ms)
      const personCandidates = [
        actorDisplayName,
        syn.englishName,
        syn.canonicalName,
        keyword,
        syn.slug ? syn.slug.replace(/-/g, " ") : "",
      ].filter((s): s is string => Boolean(s && s.trim().length >= 2));

      let tmdbPerson: { id: number; name: string; profile_path?: string | null } | null = null;
      try {
        for (const cand of personCandidates.slice(0, 3)) {
          const found = await Promise.race([
            searchTmdbPerson(cand),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 450)),
          ]);
          if (found && (found.profile_path || !tmdbPerson)) {
            tmdbPerson = found;
            if (found.profile_path) break;
          }
        }
      } catch { }

      if (tmdbPerson?.id) {
        matchedTmdbPersonId = tmdbPerson.id;
      }

      const cleanSlugPart = (syn.slug || tmdbPerson?.name || actorDisplayName)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const destinationSlug = tmdbPerson?.id
        ? `dien-vien/${tmdbPerson.id}-${cleanSlugPart}`
        : cleanSlugPart
          ? `dien-vien/${cleanSlugPart}`
          : `browse?actor=${encodeURIComponent(actorDisplayName)}`;

      const actorPoster =
        tmdbPerson?.profile_path ||
        "/default-hero.jpg";

      const actorItem = {
        slug: destinationSlug,
        title: `Diễn viên: ${actorDisplayName}`,
        poster: actorPoster,
        year: targetCountry,
        quality: "Hồ Sơ",
        category: "Diễn Viên",
      };

      if (hasExplicitActorPrefix(keyword) || items.length <= 1) {
        items.unshift(actorItem);
      } else {
        items.push(actorItem);
      }
    }

    // Nếu là từ khóa diễn viên và danh sách phim đang ít (<= 1 phim),
    // tự động lấy thêm 4 phim tiêu biểu của nghệ sĩ để danh sách gợi ý luôn đầy đủ
    if (matchedActorName && items.length <= 2) {
      try {
        const actorFilms = await Promise.race([
          queryMoviesByActor(
            matchedActorName,
            matchedActorAliases,
            matchedActorCountry,
            5,
            matchedTmdbPersonId
          ),
          new Promise<Record<string, unknown>[]>((resolve) => setTimeout(() => resolve([]), 1200)),
        ]).catch(() => []);

        if (Array.isArray(actorFilms) && actorFilms.length > 0) {
          const topActorFilms = actorFilms.slice(0, 5);
          await enrichMovieListPosters(topActorFilms, { budgetMs: 400 }).catch(() => {});
          const existingSlugs = new Set(items.map((i) => i.slug));
          for (const film of topActorFilms) {
            if (items.length >= 5) break;
            const fSlug = film.slug || "";
            if (!fSlug || existingSlugs.has(fSlug) || existingSlugs.has(`phim/${fSlug}`)) continue;
            existingSlugs.add(fSlug);
            items.push({
              slug: fSlug,
              title: film.name || film.title || "",
              poster: pickBestMoviePoster(film as MovieLike, "/default-poster.svg"),
              year: film.year || "",
              quality: film.quality || "HD",
              category: film.category?.[0]?.name || film.type || "",
            });
          }
        }
      } catch { }
    }

    const responseData = { items };
    // 2. Lưu vào L1 Memory & L2 Redis (TTL 1 giờ), CHỈ cache khi có kết quả
    if (items.length > 0) {
      await cacheService.set(cacheKey, responseData, SUGGEST_CACHE_TTL_SECONDS).catch((err) => {
        console.warn("[search-suggest] Lỗi ghi cache Redis:", err);
      });
    }

    return NextResponse.json(responseData, {
      headers: {
        "Cache-Control": "public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400",
        "CDN-Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        "Vercel-CDN-Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Lỗi tìm kiếm gợi ý:", error);
    return NextResponse.json({ items: [] });
  }
}
