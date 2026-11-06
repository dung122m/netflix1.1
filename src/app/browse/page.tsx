import Link from "next/link";
import { MovieGrid } from "@/components/MovieGrid";
import { FilterBarClient } from "@/components/FilterBarClient";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SortSelector } from "@/components/SortSelector";
import { Film, ExternalLink, Sparkles } from "lucide-react";
import { movieApi } from "@/services/movies/service";
import {
  resolveActorMovies,
  queryMoviesByActor,
  getActorSynonyms,
  GOLDEN_ACTOR_INDEX,
  hasExplicitActorPrefix,
  isAmbiguousShortActorKeyword,
  cleanActorQuery,
} from "@/services/aiActorService";
import { searchMoviesBySemantic } from "@/services/aiVectorService";
import { evaluateConceptEvidence, resolveConcepts } from "@/services/conceptRegistry";
import { BrowseAiSearchBanner } from "@/components/BrowseAiSearchBanner";
import { PaginationControl } from "@/components/PaginationControl";
import {
  isBrokenImageUrl,
  cleanNormalizedForMatch,
  getTitleEvidence,
  formatGenreName,
  formatCountryName,
  getCanonicalGenreSlug,
  getCanonicalCountrySlug,
  isRawId,
  extractMovieModifiedTime,
  } from "@/lib/movieMedia";
import { getTmdbPosterUrl, searchTmdbPosterByTitle } from "@/services/tmdbService";
import { searchAniListPoster } from "@/services/aniListService";

// ==========================================
// METADATA
// ==========================================
const TYPE_TITLES: Record<string, string> = {
  "phim-chieu-rap": "🎬 Phim Chiếu Rạp Mới Nhất",
  "phim-sap-chieu": "⏳ Phim Sắp Chiếu & Trailer",
  "phim-thuyet-minh": "🎙️ Phim Thuyết Minh Tiếng Việt",
  "phim-long-tieng": "🗣️ Phim Lồng Tiếng Đặc Sắc",
  "phim-bo": "📺 Phim Bộ Chọn Lọc",
  "phim-le": "🍿 Phim Lẻ Đặc Sắc",
  "hoat-hinh": "🎨 Phim Hoạt Hình & Anime",
  "tv-shows": "🎪 TV Shows & Truyền Hình",
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    country?: string;
    year?: string;
    keyword?: string;
    actor?: string;
    type?: string;
  }>;
}) {
  const params = await searchParams;

  let title = "Khám Phá Kho Phim";
  let description =
    "Xem phim trực tuyến chất lượng cao cùng Trợ lý Nana gợi ý phim thông minh, cập nhật liên tục các siêu phẩm điện ảnh mới nhất.";

  if (params.actor) {
    title = `Tuyển Tập Phim Của ${params.actor}`;
    description = `Khám phá các tác phẩm điện ảnh xuất sắc nhất của ${params.actor} trên Nanaflix. Xem phim chất lượng cao miễn phí.`;
  } else if (params.keyword) {
    title = `Tìm kiếm "${params.keyword}"`;
    description = `Kết quả tìm kiếm phim với từ khóa "${params.keyword}" trên Nanaflix. Xem phim chất lượng cao miễn phí.`;
  } else if (params.type && TYPE_TITLES[params.type]) {
    title = TYPE_TITLES[params.type].replace(/^[^\w\s\u00C0-\u1EF9]*\s*/u, "");
    description = `Khám phá danh sách ${title} hay nhất, chất lượng Full HD Vietsub & Thuyết minh trên Nanaflix.`;
  } else if (params.category) {
    const resolvedCat = getCanonicalGenreSlug(null, params.category) || (isRawId(params.category) ? "" : params.category);
    const catName = formatGenreName(resolvedCat) || resolvedCat || "Tổng Hợp";
    title = `Phim ${catName}`;
    description = `Khám phá danh sách phim ${catName} hay nhất, chất lượng Full HD Vietsub & Thuyết minh trên Nanaflix.`;
  } else if (params.country) {
    const resolvedCtry = getCanonicalCountrySlug(null, params.country) || (isRawId(params.country) ? "" : params.country);
    const ctryName = formatCountryName(resolvedCtry) || resolvedCtry || "Quốc Tế";
    title = `Phim ${ctryName}`;
    description = `Khám phá danh sách phim ${ctryName} hay nhất, chất lượng Full HD Vietsub & Thuyết minh trên Nanaflix.`;
  } else if (params.year) {
    title = `Phim Năm ${params.year}`;
    description = `Khám phá danh sách phim phát hành năm ${params.year} hay nhất trên Nanaflix.`;
  } else if (params.category || params.country || params.year || params.type) {
    title = "Bộ Lọc Phim Nâng Cao";
    description = "Tìm kiếm và lọc phim theo thể loại, quốc gia, năm phát hành chất lượng cao trên Nanaflix.";
  }

  const fullTitle = `Nanaflix - ${title}`;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://nanaflix.asia").replace(/\/+$/, "");
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value.trim()) {
      search.set(key, value);
    }
  }
  const queryString = search.toString();
  const canonicalUrl = queryString ? `${siteUrl}/browse?${queryString}` : `${siteUrl}/browse`;

  return {
    title: fullTitle,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: fullTitle,
      description,
      type: "website",
      images: [
        {
          url: `${siteUrl}/default-hero.jpg?v=2`,
          secureUrl: `${siteUrl}/default-hero.jpg?v=2`,
          width: 1200,
          height: 630,
          alt: fullTitle,
          type: "image/jpeg",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [`${siteUrl}/default-hero.jpg?v=2`],
    },
  };
}

// ==========================================
// PHÂN TRANG
// ==========================================
const getPagination = (current: number, total: number) => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  if (current <= 4) {
    return [1, 2, 3, 4, 5, "...", total];
  }

  if (current >= total - 3) {
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  }

  return [1, "...", current - 1, current, current + 1, "...", total];
};

function isRelevantSemanticCandidate(
  candidate: { name?: unknown; title?: unknown; origin_name?: unknown; slug?: unknown; similarity?: unknown },
  query: string,
  concepts: ReturnType<typeof resolveConcepts>
): boolean {
  const titleEvidence = getTitleEvidence(candidate, query);
  if (titleEvidence.matched) return true;

  if (concepts.length === 0) return false;

  const conceptEvidence = evaluateConceptEvidence(candidate, concepts);
  return conceptEvidence.relevant && conceptEvidence.score >= 70;
}

function isKnownActorName(query: string): boolean {
  const normalizedQuery = cleanNormalizedForMatch(query);
  return (
    Boolean(normalizedQuery) &&
    (GOLDEN_ACTOR_INDEX.some(
      (profile) =>
        cleanNormalizedForMatch(profile.name) === normalizedQuery ||
        profile.aliases.some((alias) => cleanNormalizedForMatch(alias) === normalizedQuery)
    ) ||
      getActorSynonyms(query).isMatched)
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type ActorSearchOptions = {
  actorResult: Awaited<ReturnType<typeof resolveActorMovies>>;
  actorSynonyms: ReturnType<typeof getActorSynonyms> | null;
  actorParam?: string;
  category?: string;
  country?: string;
  year?: string;
  type?: string;
  sort?: "latest" | "rating" | "views" | "year";
  currentPage: number;
  pageLimit: number;
};

/** Run the existing actor filmography flow after the title router has ruled out title matches. */
async function runActorSearch(options: ActorSearchOptions) {
  const {
    actorResult,
    actorSynonyms,
    actorParam,
    category,
    country,
    year,
    type,
    sort,
    currentPage,
    pageLimit,
  } = options;
  if (!actorResult.isActor && !actorParam && !actorSynonyms?.isMatched) return null;

  const canonicalName = actorResult.isActor
    ? actorResult.actorName
    : (actorSynonyms?.canonicalName || actorParam || "");
  if (!canonicalName) return null;

  const actorAliases = Array.from(new Set([
    canonicalName,
    ...(actorSynonyms?.variants || []),
    ...(actorResult.aliases || []),
    ...(actorParam ? [actorParam] : []),
  ])).filter(Boolean);
  const matchedPreset = GOLDEN_ACTOR_INDEX.find(
    (p) => cleanNormalizedForMatch(p.name) === cleanNormalizedForMatch(canonicalName)
  );
  if (matchedPreset) actorAliases.push(...matchedPreset.aliases);

  const actorCountry = actorResult.country || actorSynonyms?.country || matchedPreset?.country;
  const actorMovies = await queryMoviesByActor(canonicalName, actorAliases, actorCountry, 150);
  let filteredActorMovies = actorMovies;

  if (category) {
    const catNorm = cleanNormalizedForMatch(category);
    filteredActorMovies = filteredActorMovies.filter((m: any) => {
      const mCats = Array.isArray(m.category)
        ? m.category.map((c: any) => cleanNormalizedForMatch(c.slug || c.name || ""))
        : [cleanNormalizedForMatch(String(m.category || ""))];
      return mCats.some((c: string) => c.includes(catNorm));
    });
  }
  if (country) {
    const cntNorm = cleanNormalizedForMatch(country);
    filteredActorMovies = filteredActorMovies.filter((m: any) => {
      const mCnts = Array.isArray(m.country)
        ? m.country.map((c: any) => cleanNormalizedForMatch(c.slug || c.name || ""))
        : [cleanNormalizedForMatch(String(m.country || ""))];
      return mCnts.some((c: string) => c.includes(cntNorm));
    });
  }
  if (year) {
    filteredActorMovies = filteredActorMovies.filter((m: any) => String(m.year || "").includes(year));
  }
  if (type) {
    const t = type.toLowerCase();
    filteredActorMovies = filteredActorMovies.filter((m: any) => {
      const cat = Array.isArray(m.category)
        ? m.category.map((c: any) => cleanNormalizedForMatch(c.slug || c.name || "")).join(" ")
        : cleanNormalizedForMatch(String(m.category || ""));
      const itemType = cleanNormalizedForMatch(String(m.type || ""));
      if (t === "phim-bo") return itemType.includes("series") || cat.includes("phim bo") || Number(m.total_episodes) > 1;
      if (t === "phim-le") return itemType.includes("single") || cat.includes("phim le") || !m.total_episodes || Number(m.total_episodes) <= 1;
      if (t === "hoat-hinh") return itemType.includes("hoathinh") || cat.includes("hoat hinh") || cat.includes("anime");
      if (t === "tv-shows") return itemType.includes("tvshows") || cat.includes("tv show") || cat.includes("truyen hinh");
      if (t === "phim-chieu-rap") return Boolean(m.chieurap) || cat.includes("chieu rap");
      return true;
    });
  }
  const effectiveActorSort = sort || "latest";
  if (effectiveActorSort === "rating") {
    filteredActorMovies.sort((a, b) => {
      const voteCountA = Number(a.tmdb?.vote_count || 0);
      const voteCountB = Number(b.tmdb?.vote_count || 0);
      const hasReliableVotesA = voteCountA >= 50 ? 1 : 0;
      const hasReliableVotesB = voteCountB >= 50 ? 1 : 0;
      if (hasReliableVotesA !== hasReliableVotesB) {
        return hasReliableVotesB - hasReliableVotesA;
      }
      const rateA = Number(a.tmdb?.vote_average || a.imdb?.vote_average || 0);
      const rateB = Number(b.tmdb?.vote_average || b.imdb?.vote_average || 0);
      if (rateB !== rateA) {
        return rateB - rateA;
      }
      return voteCountB - voteCountA;
    });
  } else if (effectiveActorSort === "views") {
    filteredActorMovies.sort((a, b) => {
      const vA = Number(a.view || a.tmdb?.vote_count || 0);
      const vB = Number(b.view || b.tmdb?.vote_count || 0);
      if (vB !== vA) return vB - vA;
      return extractMovieModifiedTime(b) - extractMovieModifiedTime(a);
    });
  } else if (effectiveActorSort === "year") {
    filteredActorMovies.sort((a, b) => {
      const yearA = Number(a.year || 0);
      const yearB = Number(b.year || 0);
      if (yearB !== yearA) return yearB - yearA;
      return extractMovieModifiedTime(b) - extractMovieModifiedTime(a);
    });
  } else {
    // "latest" (Mặc định)
    filteredActorMovies.sort((a, b) => {
      const timeA = extractMovieModifiedTime(a);
      const timeB = extractMovieModifiedTime(b);
      if (timeB !== timeA) return timeB - timeA;
      const yearA = Number(a.year || 0);
      const yearB = Number(b.year || 0);
      if (yearB !== yearA) return yearB - yearA;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }
  const totalItems = filteredActorMovies.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageLimit));
  const startIndex = (currentPage - 1) * pageLimit;
  return {
    actor: { name: canonicalName, country: actorCountry },
    movies: filteredActorMovies.slice(startIndex, startIndex + pageLimit).map((m: any) => ({ ...m, isActorFilmography: true })),
    totalItems,
    totalPages,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const GENRE_NAMES: Record<string, string> = {
  "hanh-dong": "Hành Động",
  "tinh-cam": "Tình Cảm",
  "kinh-di": "Kinh Dị",
  "hai-huoc": "Hài Hước",
  "vien-tuong": "Viễn Tưởng",
  "co-trang": "Cổ Trang",
  "tam-ly": "Tâm Lý",
  "vo-thuat": "Võ Thuật",
  "trinh-tham": "Trinh Thám",
  "chien-tranh": "Chiến Tranh",
  "phieu-luu": "Phiêu Lưu",
  "am-nhac": "Âm Nhạc",
  "the-thao": "Thể Thao",
  "tai-lieu": "Tài Liệu",
  "khoa-hoc": "Khoa Học",
  "hoat-hinh": "Hoạt Hình",
  "hinh-su": "Hình Sự",
  "bi-an": "Bí Ẩn",
  "hoc-duong": "Học Đường",
  "gia-dinh": "Gia Đình",
  "than-thoai": "Thần Thoại",
  "lich-su": "Lịch Sử",
  "chinh-kich": "Chính Kịch",
  "giat-gan": "Giật Gân",
  "gay-can": "Gây Cấn",
  "lang-man": "Lãng Mạn",
  "chieu-rap": "Chiếu Rạp",
};

const COUNTRY_NAMES: Record<string, string> = {
  "han-quoc": "Hàn Quốc",
  "trung-quoc": "Trung Quốc",
  "au-my": "Âu Mỹ",
  "nhat-ban": "Nhật Bản",
  "thai-lan": "Thái Lan",
  "viet-nam": "Việt Nam",
  "hong-kong": "Hồng Kông",
  "dai-loan": "Đài Loan",
  "an-do": "Ấn Độ",
  "anh": "Anh",
  "phap": "Pháp",
};

/**
 * Tự động nâng cấp poster của danh sách phim sang TMDb CDN siêu nhanh (30ms Cloudflare Edge),
 * đẩy nguồn phimimg.com xuống tầng dưới cùng dự phòng.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function enrichMoviesWithTmdbPosters(movieList: any[]) {
  if (!movieList || movieList.length === 0) return;
  await Promise.allSettled(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    movieList.map(async (item: any) => {
      if (item.tmdb?.id) {
        try {
          const p = await getTmdbPosterUrl(item.tmdb.id, item.type);
          if (p) {
            item.poster_url = p;
            if (isBrokenImageUrl(item.thumb_url)) item.thumb_url = p;
            return;
          }
        } catch {}
      }
      // Bất kỳ phim nào chưa có ảnh TMDB chuẩn (đặc biệt là link phimimg dễ bị nhà mạng VN chặn): BẮT BUỘC tra cứu TMDB
      const isNonTmdb =
        !item.poster_url ||
        !item.poster_url.includes("image.tmdb.org") ||
        item.poster_url.includes("phimimg.com");
      const needsTmdbPoster = isNonTmdb || isBrokenImageUrl(item.poster_url);

      if (needsTmdbPoster) {
        const queryCandidates = [
          item.origin_name && item.origin_name !== item.name ? item.origin_name : null,
          item.name,
          item.slug ? item.slug.replace(/-/g, " ") : null,
        ].filter(Boolean) as string[];

        // TẦNG 1 (Chính): TMDb Multi Search (Bao quát 90% mọi thể loại từ phim bộ, phim lẻ đến hoạt hình)
        let foundPoster = false;
        for (const query of queryCandidates) {
          try {
            const res = await searchTmdbPosterByTitle(query, item.year, item.type);
            if (res?.posterUrl) {
              item.poster_url = res.posterUrl;
              if (isBrokenImageUrl(item.thumb_url) || !item.thumb_url?.includes("image.tmdb.org")) {
                item.thumb_url = res.backdropUrl || res.posterUrl;
              }
              foundPoster = true;
              break;
            }
          } catch {}
        }

        // TẦNG 2 (Dự phòng cho Hoạt hình): AniList GraphQL (Miễn phí, không cần key, chuyên trị 10% anime/donghua còn lại)
        if (!foundPoster) {
          const isAnimeOrAnimation =
            item.type === "hoathinh" ||
            item.type === "hoat-hinh" ||
            item.category?.some(
              (c: { slug?: string; name?: string }) => c.slug === "hoat-hinh" || c.name?.toLowerCase().includes("hoạt hình")
            );

          if (isAnimeOrAnimation) {
            try {
              const aniRes = await searchAniListPoster(
                item.name,
                item.origin_name,
                item.alternative_names
              );
              if (aniRes?.posterUrl) {
                item.poster_url = aniRes.posterUrl;
                if (isBrokenImageUrl(item.thumb_url) || !item.thumb_url?.includes("anilist.co")) {
                  item.thumb_url = aniRes.backdropUrl || aniRes.posterUrl;
                }
                foundPoster = true;
              }
            } catch {}
          }
        }

        // TẦNG 3: Nếu TMDb và AniList không có, giữ nguyên ảnh gốc hợp lệ của phim; chỉ fallback khi link hoàn toàn rỗng hoặc hỏng
        if (!foundPoster && (!item.poster_url || isBrokenImageUrl(item.poster_url))) {
          if (item.thumb_url && !isBrokenImageUrl(item.thumb_url)) {
            item.poster_url = item.thumb_url;
          } else {
            item.poster_url = "/default-poster.jpg";
          }
        }

        // Purged: Loại bỏ hoàn toàn nguồn phimimg.com
        if (item.poster_url && (item.poster_url.includes("phimimg.com") || item.poster_url.includes("/api/img-thumb"))) {
          item.poster_url = "";
        }
        if (item.thumb_url && (item.thumb_url.includes("phimimg.com") || item.thumb_url.includes("/api/img-thumb"))) {
          item.thumb_url = "";
        }
      }
    })
  );
}

// ==========================================
export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    country?: string;
    year?: string;
    keyword?: string;
    actor?: string;
    page?: string;
    type?: string;
    sort?: string;
  }>;
}) {
  const params = await searchParams;

  const rawCategory = params.category?.trim() || undefined;
  const rawCountry = params.country?.trim() || undefined;

  const category = (rawCategory ? getCanonicalGenreSlug(null, rawCategory) : undefined) || (rawCategory && !isRawId(rawCategory) ? rawCategory : undefined);
  const country = (rawCountry ? getCanonicalCountrySlug(null, rawCountry) : undefined) || (rawCountry && !isRawId(rawCountry) ? rawCountry : undefined);
  const year = params.year || undefined;
  const keyword = params.keyword || undefined;
  const actorParam = params.actor || undefined;
  const type = params.type || undefined;
  const rawSort = (params.sort as "latest" | "rating" | "views" | "year") || undefined;
  const sort = rawSort || "latest";
  const effectiveSort = sort;

  const currentPage = params.page ? parseInt(params.page, 10) : 1;
  const PAGE_LIMIT = 24;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let movies: any[] = [];
  // Keep the raw title payload available to the intent fallback decision.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let upstreamMovies: any[] = [];
  let totalPages = 1;
  let totalItems = 0;
  let detectedActor: { name: string; country?: string } | null = null;

  // =========================================================================
  // 1. TÁCH BIỆT RÕ RÀNG: TÌM KIẾM THEO DIỄN VIÊN VS TÌM KIẾM THEO TÊN PHIM
  // =========================================================================
  // Explicit actor routes are intentional. Keyword searches always go through the title search first.
  const targetActorQuery = actorParam ? actorParam.trim() : undefined;
  const actorSynonyms = targetActorQuery ? getActorSynonyms(targetActorQuery) : null;
  const actorRes = targetActorQuery
    ? actorSynonyms?.isMatched
      ? { actorName: actorSynonyms.canonicalName, country: actorSynonyms.country, aliases: actorSynonyms.variants, isActor: true, source: "preset" as const }
      : await resolveActorMovies(targetActorQuery)
    : null;

  if (actorRes && (actorRes.isActor || actorParam || actorSynonyms?.isMatched)) {
    const actorSearch = await runActorSearch({ actorResult: actorRes, actorSynonyms, actorParam, category, country, year, type, sort, currentPage, pageLimit: PAGE_LIMIT });
    if (actorSearch) {
      detectedActor = actorSearch.actor;
      movies = actorSearch.movies;
      totalItems = actorSearch.totalItems;
      totalPages = actorSearch.totalPages;
    }
  } else if (keyword) {
    // 2A. TÌM KIẾM THEO TỪ KHÓA (SEARCH MODE)
    // Hệ thống phân trang đồng bộ qua movieApi.getMovies với limit = PAGE_LIMIT (24),
    // đảm bảo tính nhất quán totalPages, khử trùng lặp và không bỏ sót phim giữa các trang.
    const [searchResponse, semanticPicks] = await Promise.all([
      movieApi.getMovies({
        category,
        country,
        year,
        keyword,
        page: currentPage,
        limit: PAGE_LIMIT,
        type,
        sort: effectiveSort,
      }),
      currentPage === 1 && keyword.trim().length >= 3
        ? Promise.race([
            searchMoviesBySemantic(keyword, 16, 0.42),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 800)),
          ]).catch(() => [])
        : Promise.resolve([]),
    ]);

    const items = searchResponse?.items || [];
    totalPages = searchResponse?.pagination?.totalPages || 1;
    totalItems = searchResponse?.pagination?.totalItems || items.length;

    // Khi không có kết quả từ khóa trực tiếp, hiển thị gợi ý thông minh từ AI Semantic Search
    if (items.length === 0 && Array.isArray(semanticPicks) && semanticPicks.length > 0) {
      const semanticConcepts = resolveConcepts(keyword);
      const relevantSemanticPicks = semanticPicks.filter((candidate) =>
        isRelevantSemanticCandidate(candidate, keyword, semanticConcepts)
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      movies = relevantSemanticPicks.map((sp: any) => ({
        slug: sp.id,
        name: sp.title,
        origin_name: sp.originalName || "",
        poster_url: sp.posterUrl,
        thumb_url: sp.thumbUrl || sp.posterUrl,
        year: sp.year,
        quality: sp.quality || "HD",
        category: sp.category ? [{ name: sp.category, slug: "" }] : [],
        content: sp.description,
        isSemanticMatch: true,
        similarity: sp.similarity,
      }));
      if (movies.length > 0) {
        totalPages = 1;
        totalItems = movies.length;
      }
    } else {
      movies = items;
    }

  } else {
    // 2B. DUYỆT THEO DANH MỤC / QUỐC GIA / NĂM (CATALOG BROWSING)
    const response = await movieApi.getMovies({
      category,
      country,
      year,
      page: currentPage,
      limit: PAGE_LIMIT,
      type,
      sort: effectiveSort,
    });

    upstreamMovies = response?.items || [];
    movies = upstreamMovies;
    totalPages = response?.pagination?.totalPages || 1;
    totalItems = response?.pagination?.totalItems || movies.length;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fallbackMovies: any[] = [];
  // A title result is authoritative when it contains a meaningful title match.
  // Content-only/semantic noise must not prevent a genuine person query from reaching Actor intent.
  const hasUpstreamTitleEvidence = !keyword || upstreamMovies.some(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (movie: any) => getTitleEvidence(movie, keyword || "").matched
  );
  const hasSuitableTitleResults = !keyword || hasUpstreamTitleEvidence || movies.some(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (movie: any) =>
      (movie.matchType === "title" && Number(movie.relevanceScore || 0) >= 40) ||
      getTitleEvidence(movie, keyword || "").matched
  );
  if (
    (!hasSuitableTitleResults || isKnownActorName(keyword || "")) &&
    keyword &&
    !actorParam &&
    !isAmbiguousShortActorKeyword(keyword)
  ) {
    const actorKeyword = hasExplicitActorPrefix(keyword) ? cleanActorQuery(keyword) : keyword;
    const fallbackSynonyms = getActorSynonyms(actorKeyword);
    const fallbackResult = fallbackSynonyms.isMatched
      ? { actorName: fallbackSynonyms.canonicalName, country: fallbackSynonyms.country, aliases: fallbackSynonyms.variants, isActor: true, source: "preset" as const }
      : await resolveActorMovies(actorKeyword);
    if (fallbackResult.isActor) {
      const actorSearch = await runActorSearch({
        actorResult: fallbackResult,
        actorSynonyms: fallbackSynonyms,
        category,
        country,
        year,
        type,
        sort,
        currentPage,
        pageLimit: PAGE_LIMIT,
      });
      if (actorSearch) {
        movies = actorSearch.movies;
        totalItems = actorSearch.totalItems;
        totalPages = actorSearch.totalPages;
        detectedActor = actorSearch.actor;
      }
    }
  }

  const pages = getPagination(currentPage, totalPages);

  if (movies.length === 0 && (keyword || actorParam)) {
    const fallbackRes = await movieApi.getMovies({ limit: 16, sort: "views" });
    fallbackMovies = fallbackRes?.items || [];
  }

  // NÂNG CẤP TOÀN BỘ POSTER SANG TMDB CDN SIÊU TỐC (ĐẨY PHIMIMG XUỐNG TẦNG DƯỚI CÙNG DỰ PHÒNG)
  if (movies.length > 0) {
    await enrichMoviesWithTmdbPosters(movies);
  }
  if (fallbackMovies.length > 0) {
    await enrichMoviesWithTmdbPosters(fallbackMovies);
  }

  let title = "Khám Phá Kho Phim";

  if (detectedActor) {
    if (country) {
      title = `Tuyển Tập Phim: ${detectedActor.name} • ${COUNTRY_NAMES[country] || country}`;
    } else {
      title = `Tuyển Tập Phim: ${detectedActor.name}`;
    }
  } else if (keyword) {
    if (country) {
      title = `Kết quả tìm kiếm: "${keyword}" • ${COUNTRY_NAMES[country] || country}`;
    } else {
      title = `Kết quả tìm kiếm: "${keyword}"`;
    }
  } else if (rawSort === "rating") {
    title = "⭐ Phim Có Điểm Đánh Giá Cao Nhất";
  } else if (rawSort === "views") {
    title = "🔥 Phim Có Lượt Xem & Bình Chọn Nhiều Nhất";
  } else if (rawSort === "latest") {
    title = "🕒 Phim Mới Cập Nhật";
  } else if (type && category) {
    const typeLabel = TYPE_TITLES[type] || type;
    const catLabel = formatGenreName(category) || GENRE_NAMES[category] || category;
    title = `${typeLabel} • ${catLabel}`;
  } else if (type && country) {
    const typeLabel = TYPE_TITLES[type] || type;
    const ctryLabel = formatCountryName(country) || COUNTRY_NAMES[country] || country;
    title = `${typeLabel} • ${ctryLabel}`;
  } else if (type && TYPE_TITLES[type]) {
    title = TYPE_TITLES[type];
  } else if (category) {
    title = `🎬 Phim ${formatGenreName(category) || GENRE_NAMES[category] || category}`;
  } else if (country) {
    title = `🌐 Phim ${formatCountryName(country) || COUNTRY_NAMES[country] || country}`;
  } else if (year) {
    title = `📅 Phim Năm ${year}`;
  } else if (category || country || year || type) {
    title = "Kết quả lọc";
  }

  return (
    <div className="page-cinema-container min-h-screen pb-20">
      <Navbar />

      {/* TRỤC CĂN CHỈNH NỘI DUNG CHÍNH (MAX-WIDTH 1440PX ĐỒNG BỘ THẲNG HÀNG 100%) */}
      <div className="w-full max-w-[1440px] mx-auto px-4 md:px-8">
        {/* BỘ LỌC PHIM CHI TIẾT */}
        <div className="pt-20 sm:pt-24">
          <FilterBarClient />
        </div>

        <div className="relative z-10 pt-2 sm:pt-4">
          {/* TIÊU ĐỀ & KẾT QUẢ DANH MỤC */}
          <div className="mb-7 flex flex-wrap items-center justify-between gap-3 mt-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              {title}
            </h1>
            <p className="mt-1 text-sm text-zinc-400 max-w-[65ch] leading-relaxed">
              Khám phá bộ sưu tập phim chất lượng cao do Nana tuyển chọn, cập nhật liên tục.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <SortSelector />
            <div className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-1.5 text-xs md:text-sm text-zinc-200 backdrop-blur-sm shadow-sm">
              <Film className="w-3.5 h-3.5 text-netflix-red" />
              <span>{totalItems.toLocaleString("vi-VN")} phim</span>
              <span className="text-white/40">•</span>
              <span>Trang {currentPage}</span>
            </div>
          </div>
        </div>

        {detectedActor && (
          <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-white/[0.08] flex items-center justify-between gap-3 shadow-lg animate-in fade-in duration-300">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-netflix-red/15 border border-netflix-red/25 text-netflix-red flex items-center justify-center flex-none">
                <Sparkles className="w-5 h-5 text-netflix-red" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-2 flex-wrap">
                  <span>Tuyển Tập Tác Phẩm Của {detectedActor.name}</span>
                  {detectedActor.country && (
                    <span className="text-xs text-white font-bold px-2.5 py-0.5 rounded-full bg-white/10">
                      {detectedActor.country}
                    </span>
                  )}
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 font-semibold border border-white/10">
                    Diễn viên
                  </span>
                </h4>
                <p className="text-xs text-zinc-300 mt-0.5">
                  Tự động tổng hợp các tác phẩm tiêu biểu & xuất sắc nhất của {detectedActor.name}
                </p>
              </div>
            </div>
          </div>
        )}

        {keyword && !detectedActor && (
          <BrowseAiSearchBanner
            keyword={keyword}
            hasContentMatches={movies.some((movie) => movie.matchType === "content" && movie.matchSnippet)}
          />
        )}

        {movies.length > 0 ? (
          <>
            <MovieGrid movies={movies} />

            {/* THANH PHÂN TRANG CHUẨN GỌN GÀNG */}
            <PaginationControl
              currentPage={currentPage}
              totalPages={totalPages}
              pages={pages}
            />
          </>
        ) : (
          <div className="py-12 space-y-10">
            <div className="max-w-xl mx-auto rounded-2xl bg-zinc-900/80 p-6 md:p-8 text-center backdrop-blur-md shadow-2xl">
              <Film className="w-12 h-12 text-zinc-500 mx-auto mb-3" />
              <h3 className="text-lg md:text-xl font-bold text-white">
                {detectedActor
                  ? `Chưa có dữ liệu tuyển tập cho ${detectedActor.name}`
                  : keyword
                    ? `Chưa tìm thấy phim khớp với "${keyword}"`
                    : "Không tìm thấy dữ liệu phim."}
              </h3>
              {detectedActor ? (
                <>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
                    Hiện tại kho phim của Nanaflix chưa có sẵn các tác phẩm do <strong>{detectedActor.name}</strong> đóng chính hoặc làm đạo diễn. Hệ thống đang liên tục cập nhật thêm nhiều phim mới mỗi ngày!
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
                    <a
                      href={`https://www.themoviedb.org/search/person?query=${encodeURIComponent(detectedActor.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#01b4e4] hover:bg-[#01b4e4]/80 text-white text-xs font-bold transition shadow-md shadow-black/50"
                    >
                      <span>Tra cứu &quot;{detectedActor.name}&quot; trên TMDb</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <Link
                      href="/browse"
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-200 hover:text-white text-xs font-semibold transition"
                    >
                      Khám phá tất cả phim
                    </Link>
                  </div>
                </>
              ) : keyword ? (
                <>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
                    Hệ thống nguồn phim tìm kiếm trực tiếp theo <strong>tiêu đề phim</strong>. Nếu đây là tên diễn viên hoặc đạo diễn, bạn có thể tra cứu hồ sơ và danh sách phim trên TMDb hoặc thưởng thức các phim đề xuất bên dưới:
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
                    <a
                      href={`https://www.themoviedb.org/search?query=${encodeURIComponent(keyword)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#01b4e4] hover:bg-[#01b4e4]/80 text-white text-xs font-bold transition shadow-md shadow-black/50"
                    >
                      <span>Tra cứu &quot;{keyword}&quot; trên TMDb</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <Link
                      href="/browse"
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-200 hover:text-white text-xs font-semibold transition"
                    >
                      Khám phá tất cả phim
                    </Link>
                  </div>
                </>
              ) : (
                <div className="mt-5">
                  <Link
                    href="/browse"
                    className="px-4 py-2 rounded-xl bg-netflix-red hover:brightness-110 active:brightness-95 text-white text-xs font-semibold transition"
                  >
                    Xem tất cả phim
                  </Link>
                </div>
              )}
            </div>

            {!detectedActor && fallbackMovies.length > 0 && (
              <div className="mt-12">
                <div className="flex items-center gap-2 mb-5">
                  <span className="text-xl">🔥</span>
                  <h3 className="text-xl md:text-2xl font-extrabold text-white">
                    Phim Thịnh Hành Nana Gợi Ý Cho Bạn
                  </h3>
                </div>
                <MovieGrid movies={fallbackMovies} />
              </div>
            )}
          </div>
        )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
