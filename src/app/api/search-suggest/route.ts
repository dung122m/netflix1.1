import { NextRequest, NextResponse } from "next/server";
import { movieApi } from "@/services/movies/service";
import { resolveActorMovies, isAmbiguousShortActorKeyword, hasExplicitActorPrefix } from "@/services/aiActorService";
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

    // 1. Kiểm tra L1 In-memory & L2 Upstash Redis qua cacheService
    const cacheKey = `search:suggest:v2:${normKw}`;
    const cached = await cacheService.get<{ items: unknown[] }>(cacheKey);
    if (cached && Array.isArray(cached.items)) {
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
    const [res, actorRes] = await Promise.all([
      Promise.race([
        movieApi.getMovies({
          keyword,
          page: 1,
          limit: 8,
          skipKvCache: true,
        }),
        new Promise<{ items: SuggestMovieItem[]; pagination?: unknown }>((resolve) =>
          setTimeout(() => resolve({ items: [] }), 1800)
        ),
      ]).catch(() => ({ items: [] })),
      shouldCheckActor
        ? Promise.race([
            resolveActorMovies(keyword),
            new Promise<{ isActor: boolean; actorName: string; titles: string[]; country?: string; source: "none" }>((resolve) =>
              setTimeout(() => resolve({ isActor: false, actorName: "", titles: [], source: "none" }), 800)
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

    const rawItems = ((res?.items || []) as SuggestMovieItem[]);

    // Sắp xếp gợi ý nhanh: Ưu tiên tuyệt đối các phim có tên khớp với từ khóa gõ vào
    const getSuggestScore = (item: SuggestMovieItem, kw: string): number => {
      const normTitle = normalizeForMatch(item.name || item.title || "");
      const normOrig = normalizeForMatch(item.origin_name || "");
      const normSlug = normalizeForMatch(item.slug || "");

      if (normTitle === kw || normOrig === kw || normSlug === kw.replace(/\s+/g, "-")) return 100;
      if (normTitle.startsWith(kw) || normOrig.startsWith(kw)) return 80;
      if (normTitle.includes(kw) || normOrig.includes(kw)) return 60;

      // Khớp toàn bộ token nếu query nhiều từ (tránh khớp bừa bãi như Conan)
      const kwTokens = kw.split(/\s+/).filter(Boolean);
      if (kwTokens.length > 1) {
        const titleTokens = new Set((normTitle + " " + normOrig + " " + normSlug).split(/\s+/).filter(Boolean));
        const matched = kwTokens.filter((tok) => titleTokens.has(tok)).length;
        if (matched === kwTokens.length) return 50;
      }
      return 0; // Không khớp tiêu đề -> 0 điểm (loại bỏ phim rác)
    };

    const validMovieItems = rawItems
      .filter((item) => getSuggestScore(item, normKw) >= 50)
      .sort((a, b) => getSuggestScore(b, normKw) - getSuggestScore(a, normKw));

    const items = validMovieItems.slice(0, 5).map((item) => ({
      slug: item.slug || "",
      title: item.name || item.title || "",
      poster: pickBestMoviePoster(item as MovieLike, "/default-poster.svg"),
      year: item.year || "",
      quality: item.quality || "HD",
      category: item.category?.[0]?.name || item.type || "",
    }));

    // 3. Nếu khớp diễn viên rõ ràng:
    // - Ưu tiên điều hướng thẳng sang trang chi tiết diễn viên (/dien-vien/:id-:slug hoặc /dien-vien/:slug)
    // - Chỉ đưa lên ĐẦU danh sách nếu người dùng gõ tiền tố rõ ràng (vd: "diễn viên ...", "phim của ...")
    //   hoặc kết quả phim trùng khớp ít (<= 2 phim)
    // - Với tìm kiếm thông thường có nhiều phim trùng tên, thẻ diễn viên được thêm vào danh sách
    // - TUYỆT ĐỐI không gắn thẻ diễn viên cho từ khóa ngắn/mơ hồ ("Mai", "An", "Anh"...)
    if (histArtist) {
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
      const syn = getActorSynonyms(keyword);
      const actorDisplayName =
        syn.isMatched && syn.canonicalName
          ? syn.canonicalName
          : actorRes.actorName;
      const targetCountry = actorRes.country || syn.country || "Điện Ảnh";

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
      } catch {}

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

    const responseData = { items };
    // 2. Lưu vào L1 Memory & L2 Redis (TTL 1 giờ), không cache khi có lỗi
    await cacheService.set(cacheKey, responseData, SUGGEST_CACHE_TTL_SECONDS).catch((err) => {
      console.warn("[search-suggest] Lỗi ghi cache Redis:", err);
    });

    return NextResponse.json(responseData, {
      headers: {
        "Cache-Control": "public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Lỗi tìm kiếm gợi ý:", error);
    return NextResponse.json({ items: [] });
  }
}
