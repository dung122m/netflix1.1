import Link from "next/link";
import Image from "next/image";
import { MovieGrid } from "@/components/movies/MovieGrid";
import { FilterBarClient } from "@/components/browse/FilterBarClient";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Film, ChevronRight } from "lucide-react";
import { findHistoricalArtist } from "@/data/history/historicalArtistsBirthdays";
import { searchTmdbPerson } from "@/services/tmdb/personService";
import { movieApi, parseSortMode } from "@/services/movies/service";
import { executeSmartSearch } from "@/services/movies/smartSearchService";

/** Cache danh mục phim 30 phút trên Vercel Edge CDN để giảm tải tối đa CPU Serverless và triệt tiêu Redis calls */
export const revalidate = 1800;
import {
  resolveActorMovies,
  queryMoviesByActor,
  getActorSynonyms,
  GOLDEN_ACTOR_INDEX,
  hasExplicitActorPrefix,
  isAmbiguousShortActorKeyword,
  cleanActorQuery,
  toVietnameseTitleCase,
} from "@/services/aiActorService";
import { PaginationControl } from "@/components/ui/PaginationControl";
import { getPaginationPages } from "@/lib/pagination";
import { CountryBadge } from "@/components/ui/CountryBadge";
import {
  cleanNormalizedForMatch,
  getTitleEvidence,
  formatGenreName,
  formatCountryName,
  getCanonicalGenreSlug,
  getCanonicalCountrySlug,
  isRawId,
  extractMovieModifiedTime,
  } from "@/lib/movieMedia";
import { slugify } from "@/lib/stringUtils";
import { enrichMovieListPosters } from "@/services/movies/posterEnrichment";

function getActorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ==========================================
// METADATA
// ==========================================
const TYPE_TITLES: Record<string, string> = {
  "phim-chieu-rap": "Phim Chiếu Rạp Mới Nhất",
  "phim-sap-chieu": "Phim Sắp Chiếu & Trailer",
  "phim-thuyet-minh": "Phim Thuyết Minh Tiếng Việt",
  "phim-long-tieng": "Phim Lồng Tiếng Đặc Sắc",
  "phim-bo": "Phim Bộ Chọn Lọc",
  "phim-le": "Phim Lẻ Đặc Sắc",
  "hoat-hinh": "Phim Hoạt Hình & Anime",
  "tv-shows": "TV Shows & Truyền Hình",
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

  let title = "Kho Phim";
  let description =
    "Kho phim trực tuyến chất lượng cao, cập nhật liên tục các tác phẩm điện ảnh và phim bộ mới nhất.";

  if (params.actor) {
    title = `Tuyển Tập Phim Của ${params.actor}`;
    description = `Khám phá các tác phẩm điện ảnh xuất sắc nhất của ${params.actor} trên Nanaflix. Xem phim chất lượng cao miễn phí.`;
  } else if (params.keyword) {
    title = `Tìm kiếm "${params.keyword}"`;
    description = `Kết quả tìm kiếm phim với từ khóa "${params.keyword}" trên Nanaflix. Xem phim chất lượng cao miễn phí.`;
  } else if (params.type && TYPE_TITLES[params.type]) {
    title = TYPE_TITLES[params.type];
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
          url: `${siteUrl}/og-cinema.jpg?v=2026`,
          secureUrl: `${siteUrl}/og-cinema.jpg?v=2026`,
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
      images: [`${siteUrl}/og-cinema.jpg?v=2026`],
    },
  };
}

// ==========================================
// PHÂN TRANG
// ==========================================
function parsePositivePage(rawPage?: string): number {
  if (!rawPage) return 1;
  const parsed = parseInt(rawPage, 10);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
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
      getActorSynonyms(query).isMatched ||
      Boolean(findHistoricalArtist(query)))
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
  sort?: string;
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
    : ((actorSynonyms?.isMatched ? actorSynonyms.canonicalName : "") || actorParam || "");
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

  const historicalArtist = findHistoricalArtist(canonicalName) || (actorParam ? findHistoricalArtist(actorParam) : undefined);
  if (historicalArtist?.aliases) {
    actorAliases.push(...historicalArtist.aliases);
  }

  const tmdbId = actorResult.tmdbPersonId || historicalArtist?.tmdbPersonId;
  const actorCountry = actorResult.country || actorSynonyms?.country || matchedPreset?.country || historicalArtist?.country;
  const actorMovies = await queryMoviesByActor(canonicalName, actorAliases, actorCountry, 150, tmdbId);
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
  const parsedSort = parseSortMode(sort);
  if (parsedSort.field === "rating") {
    filteredActorMovies.sort((a, b) => {
      const voteCountA = Number(a.tmdb?.vote_count || 0);
      const voteCountB = Number(b.tmdb?.vote_count || 0);
      const hasReliableVotesA = voteCountA >= 50 ? 1 : 0;
      const hasReliableVotesB = voteCountB >= 50 ? 1 : 0;
      if (hasReliableVotesA !== hasReliableVotesB) {
        return parsedSort.direction === "asc"
          ? hasReliableVotesA - hasReliableVotesB
          : hasReliableVotesB - hasReliableVotesA;
      }
      const rateA = Number(a.tmdb?.vote_average || a.imdb?.vote_average || 0);
      const rateB = Number(b.tmdb?.vote_average || b.imdb?.vote_average || 0);
      if (rateB !== rateA) {
        return parsedSort.direction === "asc" ? rateA - rateB : rateB - rateA;
      }
      return parsedSort.direction === "asc" ? voteCountA - voteCountB : voteCountB - voteCountA;
    });
  } else if (parsedSort.field === "view") {
    filteredActorMovies.sort((a, b) => {
      const vA = Number(a.view || a.tmdb?.vote_count || 0);
      const vB = Number(b.view || b.tmdb?.vote_count || 0);
      if (vB !== vA) {
        return parsedSort.direction === "asc" ? vA - vB : vB - vA;
      }
      return parsedSort.direction === "asc"
        ? extractMovieModifiedTime(a) - extractMovieModifiedTime(b)
        : extractMovieModifiedTime(b) - extractMovieModifiedTime(a);
    });
  } else if (parsedSort.field === "year") {
    filteredActorMovies.sort((a, b) => {
      const yearA = Number(a.year || 0);
      const yearB = Number(b.year || 0);
      if (yearB !== yearA) {
        return parsedSort.direction === "asc" ? yearA - yearB : yearB - yearA;
      }
      return parsedSort.direction === "asc"
        ? extractMovieModifiedTime(a) - extractMovieModifiedTime(b)
        : extractMovieModifiedTime(b) - extractMovieModifiedTime(a);
    });
  } else {
    // "modified.time" ("latest" desc hoặc "oldest" asc)
    filteredActorMovies.sort((a, b) => {
      const timeA = extractMovieModifiedTime(a);
      const timeB = extractMovieModifiedTime(b);
      if (timeB !== timeA) {
        return parsedSort.direction === "asc" ? timeA - timeB : timeB - timeA;
      }
      const yearA = Number(a.year || 0);
      const yearB = Number(b.year || 0);
      if (yearB !== yearA) {
        return parsedSort.direction === "asc" ? yearA - yearB : yearB - yearA;
      }
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }
  const totalItems = filteredActorMovies.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageLimit));
  const startIndex = (currentPage - 1) * pageLimit;
  const histArtist = findHistoricalArtist(canonicalName) || (actorParam ? findHistoricalArtist(actorParam) : undefined);
  let bestAvatar = (actorResult as any)?.avatarUrl || histArtist?.avatarUrl;
  let resolvedPersonId = (actorResult as any)?.tmdbPersonId || histArtist?.tmdbPersonId;

  if (!bestAvatar || !resolvedPersonId) {
    try {
      const p = await searchTmdbPerson(canonicalName, actorSynonyms?.englishName, actorAliases);
      if (p?.profile_path && !bestAvatar) {
        bestAvatar = p.profile_path.startsWith("http")
          ? p.profile_path
          : `https://image.tmdb.org/t/p/w500${p.profile_path}`;
      }
      if (p?.id && !resolvedPersonId) {
        resolvedPersonId = p.id;
      }
    } catch {}
  }

  const displayActorName = toVietnameseTitleCase(histArtist?.name || canonicalName);
  return {
    actor: {
      name: displayActorName,
      englishName: histArtist?.englishName || actorSynonyms?.englishName,
      country: histArtist?.country || actorCountry,
      avatarUrl: bestAvatar,
      tmdbPersonId: resolvedPersonId,
    },
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
  const rawSort = params.sort?.trim() || undefined;
  const sort = rawSort || "latest";
  const effectiveSort = sort;

  const currentPage = parsePositivePage(params.page);
  const PAGE_LIMIT = 24;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let movies: any[] = [];
  // Keep the raw title payload available to the intent fallback decision.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let upstreamMovies: any[] = [];
  let totalPages = 1;
  let totalItems = 0;
  let detectedActor: { name: string; englishName?: string; country?: string; href?: string; avatarUrl?: string } | null = null;
  let correctedQuery: string | undefined = undefined;

  // =========================================================================
  // 1. TÁCH BIỆT RÕ RÀNG: TÌM KIẾM THEO DIỄN VIÊN VS TÌM KIẾM THEO TÊN PHIM
  // =========================================================================

  // Explicit actor routes are intentional. Keyword searches always go through the title search first.
  const targetActorQuery = actorParam ? actorParam.trim() : undefined;
  const actorSynonyms = targetActorQuery ? getActorSynonyms(targetActorQuery) : null;
  const historicalArtist = targetActorQuery ? (findHistoricalArtist(targetActorQuery) || findHistoricalArtist(cleanActorQuery(targetActorQuery))) : undefined;
  const actorRes = targetActorQuery
    ? actorSynonyms?.isMatched
      ? { actorName: actorSynonyms.canonicalName, country: actorSynonyms.country, aliases: actorSynonyms.variants, isActor: true, tmdbPersonId: historicalArtist?.tmdbPersonId, source: "preset" as const }
      : await resolveActorMovies(targetActorQuery)
    : null;

  if (actorRes && (actorRes.isActor || actorParam || actorSynonyms?.isMatched)) {
    const actorSearch = await runActorSearch({ actorResult: actorRes, actorSynonyms, actorParam, category, country, year, type, sort, currentPage, pageLimit: PAGE_LIMIT });
    if (actorSearch) {
      if (actorSearch.movies.length > 0 || (actorParam && Boolean(actorSearch.actor.avatarUrl))) {
        const rawActorName = historicalArtist?.name || (actorSynonyms?.isMatched ? actorSynonyms.canonicalName : "") || actorSearch.actor.name;
        const actorSlug = (historicalArtist?.slug || (actorSynonyms?.isMatched ? actorSynonyms.slug : "") || slugify(rawActorName))
          .toLowerCase()
          .replace(/^-+|-+$/g, "");
        const personId = actorSearch.actor.tmdbPersonId || actorRes?.tmdbPersonId || historicalArtist?.tmdbPersonId;
        const actorHref = personId ? `/dien-vien/${personId}-${actorSlug}` : (actorSlug ? `/dien-vien/${actorSlug}` : undefined);
        detectedActor = {
          ...actorSearch.actor,
          href: actorHref,
        };
      }
      movies = actorSearch.movies;
      totalItems = actorSearch.totalItems;
      totalPages = actorSearch.totalPages;
    }
  } else if (keyword) {
    // 2A. TÌM KIẾM THÔNG MINH 3 TẦNG (100% ZERO-AI, ZERO-HARDCODE)
    // Tầng 1: Smart Filter Tokenizer -> Tầng 2: Direct Search & Slug Normalization -> Tầng 3: TMDb & Typo Tolerance
    const smartSearchRes = await executeSmartSearch({
      query: keyword,
      page: currentPage,
      limit: PAGE_LIMIT,
      sort: effectiveSort,
      category,
      country,
      year,
      type,
    });

    movies = smartSearchRes.items;
    if (movies.length > 0) {
      await enrichMovieListPosters(movies, { budgetMs: 400, stripProxyUrls: true });
    }
    upstreamMovies = movies;
    totalPages = smartSearchRes.totalPages;
    totalItems = smartSearchRes.totalItems;
    correctedQuery = smartSearchRes.correctedQuery;
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
      posterEnrichmentBudgetMs: 400,
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
    const historicalArtist = findHistoricalArtist(actorKeyword) || findHistoricalArtist(cleanActorQuery(actorKeyword));
    const fallbackResult = fallbackSynonyms.isMatched
      ? {
          actorName: fallbackSynonyms.canonicalName,
          country: fallbackSynonyms.country,
          aliases: fallbackSynonyms.variants,
          isActor: true,
          tmdbPersonId: historicalArtist?.tmdbPersonId,
          source: "preset" as const,
        }
      : historicalArtist
      ? {
          actorName: historicalArtist.name,
          englishName: historicalArtist.englishName,
          country: historicalArtist.country,
          aliases: historicalArtist.aliases,
          isActor: true,
          tmdbPersonId: historicalArtist.tmdbPersonId,
          source: "preset" as const,
        }
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
        if (
          actorSearch.movies.length > 0 ||
          (hasExplicitActorPrefix(keyword) && Boolean(actorSearch.actor.avatarUrl)) ||
          !hasSuitableTitleResults
        ) {
          const rawActorName = historicalArtist?.name || (fallbackSynonyms?.isMatched ? fallbackSynonyms.canonicalName : "") || actorSearch.actor.name;
          const actorSlug = (historicalArtist?.slug || (fallbackSynonyms?.isMatched ? fallbackSynonyms.slug : "") || slugify(rawActorName))
            .toLowerCase()
            .replace(/^-+|-+$/g, "");
          const personId = actorSearch.actor.tmdbPersonId || fallbackResult?.tmdbPersonId || historicalArtist?.tmdbPersonId;
          const actorHref = personId ? `/dien-vien/${personId}-${actorSlug}` : (actorSlug ? `/dien-vien/${actorSlug}` : undefined);
          detectedActor = {
            ...actorSearch.actor,
            href: actorHref,
          };
          movies = actorSearch.movies;
          totalItems = actorSearch.totalItems;
          totalPages = actorSearch.totalPages;
        }
      }
    }
  }

  const pages = getPaginationPages(currentPage, totalPages);

  if (movies.length === 0 && (keyword || actorParam)) {
    const fallbackRes = await movieApi.getMovies({ limit: 24, sort: "views", posterEnrichmentBudgetMs: 0 });
    const rawFallback = fallbackRes?.items || [];
    // Đảm bảo số lượng phim tròn hàng trên lưới 6 cột (12 hoặc 18 phim), tuyệt đối không bị khuyết ô trống
    const count = Math.floor(rawFallback.length / 6) * 6;
    fallbackMovies = rawFallback.slice(0, count >= 12 ? Math.min(count, 18) : 12);
  }

  // TẦNG 1: NẠP SẴN POSTER TMDB TRONG RAM/REDIS VÀO HTML BAN ĐẦU (1 LỆNH MGET DUY NHẤT, CAP 400MS)
  const posterTasks: Promise<void>[] = [];
  if (movies.length > 0) {
    posterTasks.push(enrichMovieListPosters(movies, { budgetMs: 400, stripProxyUrls: true }));
  }
  if (fallbackMovies.length > 0) {
    posterTasks.push(enrichMovieListPosters(fallbackMovies, { budgetMs: 400, stripProxyUrls: true }));
  }
  if (posterTasks.length > 0) {
    await Promise.allSettled(posterTasks);
  }

  let title = "Kho Phim";

  if (detectedActor) {
    const actorDisplayName = detectedActor.englishName && detectedActor.englishName !== detectedActor.name
      ? `${detectedActor.name} (${detectedActor.englishName})`
      : detectedActor.name;
    if (country) {
      title = `Tuyển Tập Phim: ${actorDisplayName} • ${COUNTRY_NAMES[country] || country}`;
    } else {
      title = `Tuyển Tập Phim: ${actorDisplayName}`;
    }
  } else if (keyword) {
    if (country) {
      title = `Kết quả tìm kiếm: "${keyword}" • ${COUNTRY_NAMES[country] || country}`;
    } else {
      title = `Kết quả tìm kiếm: "${keyword}"`;
    }
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
    title = `Phim ${formatGenreName(category) || GENRE_NAMES[category] || category}`;
  } else if (country) {
    title = `Phim ${formatCountryName(country) || COUNTRY_NAMES[country] || country}`;
  } else if (year) {
    title = `Phim Năm ${year}`;
  } else if (rawSort === "rating" || rawSort === "rating-desc") {
    title = "Phim Có Điểm Đánh Giá Cao";
  } else if (rawSort === "rating-asc") {
    title = "Phim Có Điểm Đánh Giá Thấp";
  } else if (rawSort === "views" || rawSort === "views-desc") {
    title = "Phim Có Lượt Xem Nhiều Nhất";
  } else if (rawSort === "views-asc") {
    title = "Phim Có Lượt Xem Ít Nhất";
  } else if (rawSort === "year" || rawSort === "year-desc") {
    title = "Phim Năm Mới Nhất";
  } else if (rawSort === "year-asc") {
    title = "Phim Năm Cũ Nhất";
  } else if (rawSort === "oldest" || rawSort === "time-asc") {
    title = "Phim Cập Nhật Cũ Nhất";
  } else if (rawSort === "latest" || rawSort === "time-desc") {
    title = "Phim Mới Cập Nhật";
  } else if (category || country || year || type) {
    title = "Kết Quả Lọc Phim";
  }

  return (
    <div className="page-cinema-container min-h-dvh pb-0 w-full max-w-full overflow-x-clip">
      <Navbar />

      {/* TRỤC CĂN CHỈNH NỘI DUNG CHÍNH (MAX-WIDTH 1440PX ĐỒNG BỘ THẲNG HÀNG 100%) */}
      <div className="w-full max-w-[1440px] mx-auto px-4 md:px-8">
        {/* BỘ LỌC PHIM CHI TIẾT */}
        <div className="pt-16 sm:pt-24">
          <FilterBarClient />
        </div>

        <div className="relative z-10 pt-2 sm:pt-4">
          {detectedActor ? (
            /* KHỐI HỒ SƠ NGHỆ SĨ DUY NHẤT (GỘP TIÊU ĐỀ + PROFILE CARD CHUẨN APPLE TV+, TRIỆT TIÊU 100% TRÙNG LẶP TEXT) */
            <div className="mb-7 p-4 sm:p-5 rounded-2xl bg-zinc-900/95 border border-white/[0.08] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-200 mt-4">
              <div className="flex items-center gap-4 min-w-0">
                {detectedActor.avatarUrl ? (
                  <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border border-white/10 flex-none shadow-lg">
                    <Image
                      src={detectedActor.avatarUrl}
                      alt={detectedActor.name}
                      fill
                      unoptimized
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center flex-none shadow-lg text-sm sm:text-base font-bold text-zinc-200">
                    {getActorInitials(detectedActor.name)}
                  </div>
                )}
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white">
                      {detectedActor.name}
                    </h1>
                    {detectedActor.englishName && detectedActor.englishName !== detectedActor.name ? (
                      <span className="text-sm sm:text-base md:text-lg font-medium text-zinc-400">
                        ({detectedActor.englishName})
                      </span>
                    ) : null}

                    <div className="inline-flex items-baseline gap-2 sm:gap-2.5">
                      <span className="text-zinc-600 select-none text-xs sm:text-sm hidden sm:inline">•</span>
                      {detectedActor.country && (
                        <>
                          <CountryBadge
                            country={detectedActor.country}
                            variant="inline"
                            flagSize={14}
                            className="text-xs sm:text-sm text-zinc-300 font-medium"
                          />
                          <span className="text-zinc-600 select-none text-xs sm:text-sm">•</span>
                        </>
                      )}
                      <span className="text-xs sm:text-sm font-medium text-zinc-400">
                        Diễn viên
                      </span>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed truncate sm:whitespace-normal">
                    Tuyển tập {totalItems.toLocaleString("vi-VN")} tác phẩm nổi bật của {detectedActor.name}.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 self-start md:self-auto flex-none flex-wrap">
                <div className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-1.5 text-xs text-zinc-200 border border-white/5 shadow-sm">
                  <Film className="w-3.5 h-3.5 text-netflix-red" />
                  <span>{totalItems.toLocaleString("vi-VN")} phim</span>
                  <span className="text-white/30">•</span>
                  <span>Trang {currentPage}</span>
                </div>
                {detectedActor.href && (
                  <Link
                    href={detectedActor.href}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 active:bg-white/20 text-white font-medium text-xs transition border border-white/10 shadow-sm cursor-pointer"
                  >
                    <span>Hồ sơ nghệ sĩ</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>
          ) : (
            /* TIÊU ĐỀ & KẾT QUẢ DANH MỤC THÔNG THƯỜNG */
            <div className="mb-7 flex flex-wrap items-center justify-between gap-3 mt-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                  {title}
                </h1>
                {correctedQuery ? (
                  <p className="mt-1 text-sm text-zinc-400">
                    Hiển thị kết quả cho <strong className="text-white font-medium">{correctedQuery}</strong>
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-zinc-400 max-w-[65ch] leading-relaxed">
                    Kho phim trực tuyến chất lượng cao, cập nhật liên tục các tác phẩm mới nhất.
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-1.5 text-xs md:text-sm text-zinc-200 shadow-sm">
                  <Film className="w-3.5 h-3.5 text-netflix-red" />
                  <span>{totalItems.toLocaleString("vi-VN")} phim</span>
                  <span className="text-white/40">•</span>
                  <span>Trang {currentPage}</span>
                </div>
              </div>
            </div>
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
            <div className="max-w-xl mx-auto rounded-2xl bg-zinc-900/90 border border-white/[0.06] p-6 md:p-8 text-center shadow-2xl">
              <Film className="w-12 h-12 text-zinc-500 mx-auto mb-3" />
              <h3 className="text-lg md:text-xl font-bold text-white">
                {detectedActor
                  ? `Chưa có phim của ${detectedActor.name}`
                  : keyword
                    ? `Không tìm thấy phim cho "${keyword}"`
                    : "Không tìm thấy dữ liệu phim."}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
                {detectedActor
                  ? "Dữ liệu tác phẩm của nghệ sĩ này đang được cập nhật thêm. Bạn có thể xem các phim nổi bật bên dưới:"
                  : "Không tìm thấy phim phù hợp với từ khóa này. Bạn có thể thử tìm theo tên khác hoặc xem các phim nổi bật dưới đây:"}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
                <Link
                  href="/browse"
                  className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs sm:text-sm font-bold transition shadow-md"
                >
                  Xem tất cả phim
                </Link>
              </div>
            </div>

            {fallbackMovies.length > 0 && (
              <div className="mt-12">
                <div className="mb-5">
                  <h3 className="text-xl md:text-2xl font-extrabold text-white">
                    Phim Thịnh Hành
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
