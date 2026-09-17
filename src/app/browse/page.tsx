import dynamic from "next/dynamic";
import Link from "next/link";
import { MovieGrid } from "@/components/MovieGrid";
import { FilterBarClient } from "@/components/FilterBarClient";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ContinueWatchingRow } from "@/components/ContinueWatchingRow";
import { QuickGenreChips } from "@/components/QuickGenreChips";
import { SortSelector } from "@/components/SortSelector";
import { Film, ExternalLink, Sparkles } from "lucide-react";
import { movieApi } from "@/services/movieApi";
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
import { BrowseAiSearchBanner } from "@/components/BrowseAiSearchBanner";
import { CuratedMovieSection } from "@/components/CuratedMovieSection";
import { CommunityTopTrending } from "@/components/CommunityTopTrending";
import { ForYouPersonalizedRow } from "@/components/ForYouPersonalizedRow";

const HeroFeatured = dynamic(() =>
  import("@/components/browse/HeroFeatured").then(
    (mod) => mod.HeroFeatured,
  ),
);



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

  let title = "Phim Mới Cập Nhật";
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
  } else if (params.category || params.country || params.year || params.type) {
    title = "Bộ Lọc Phim Nâng Cao";
    description = "Tìm kiếm và lọc phim theo thể loại, quốc gia, năm phát hành chất lượng cao trên Nanaflix.";
  }

  const fullTitle = `Nanaflix - ${title}`;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://netflix1-1.vercel.app").replace(/\/+$/, "");

  return {
    title: fullTitle,
    description,
    alternates: {
      canonical: `${siteUrl}/browse`,
    },
    openGraph: {
      title: fullTitle,
      description,
      type: "website",
      images: [
        {
          url: `${siteUrl}/default-hero.jpg`,
          secureUrl: `${siteUrl}/default-hero.jpg`,
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
      images: [`${siteUrl}/default-hero.jpg`],
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

function cleanNormalizedForMatch(str: string): string {
  return (str || "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractDescriptionSnippet(content: string, kw: string): string | undefined {
  if (!content || !kw) return undefined;
  const plainText = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const cleanPlain = cleanNormalizedForMatch(plainText);
  const cleanKw = cleanNormalizedForMatch(kw);

  if (!cleanKw || cleanKw.length < 2) return undefined;

  const idx = cleanPlain.indexOf(cleanKw);
  if (idx === -1) return undefined;

  const start = Math.max(0, idx - 30);
  const end = Math.min(plainText.length, idx + kw.length + 45);

  let snippet = plainText.slice(start, end).trim();
  if (start > 0) snippet = "..." + snippet;
  if (end < plainText.length) snippet = snippet + "...";
  return snippet;
}

// ==========================================
// BROWSE PAGE
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

  const category = params.category || undefined;
  const country = params.country || undefined;
  const year = params.year || undefined;
  const keyword = params.keyword || undefined;
  const actorParam = params.actor || undefined;
  const type = params.type || undefined;
  const sort = (params.sort as "latest" | "rating" | "views" | "year") || undefined;

  const currentPage = params.page ? parseInt(params.page, 10) : 1;
  const PAGE_LIMIT = 24; // Chuẩn lưới 4 cột (desktop), 3 cột (tablet), 2 cột (mobile) -> chia hết cho cả 2, 3, 4 giúp hàng luôn lấp đầy 100%, không bị khuyết ô

  const isPlainHomepage =
    currentPage === 1 &&
    !keyword &&
    !actorParam &&
    !category &&
    !country &&
    !year &&
    !type &&
    !sort;

  const effectiveSort = sort || (isPlainHomepage ? "views" : undefined);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let movies: any[] = [];
  let totalPages = 1;
  let totalItems = 0;
  let detectedActor: { name: string; country?: string } | null = null;
  let hasContentMatches = false;

  // =========================================================================
  // 1. TÁCH BIỆT RÕ RÀNG: TÌM KIẾM THEO DIỄN VIÊN VS TÌM KIẾM THEO TÊN PHIM
  // =========================================================================
  // CHỈ kích hoạt tìm kiếm diễn viên khi:
  // (1) Có tham số actorParam (người dùng click vào gợi ý diễn viên hoặc tag diễn viên)
  // (2) Hoặc từ khóa có tiền tố chỉ định rõ ràng (ví dụ: "diễn viên Trấn Thành", "phim của Mai", "đạo diễn...")
  // TUYỆT ĐỐI KHÔNG tự động chuyển keyword thông thường ("Mai", "An", "Anh", "Avatar") thành tìm diễn viên
  const hasExplicitActor = Boolean(actorParam) || (Boolean(keyword) && hasExplicitActorPrefix(keyword!));
  const targetActorQuery = actorParam
    ? actorParam.trim()
    : hasExplicitActor && keyword
    ? cleanActorQuery(keyword)
    : undefined;

  const actorSynonyms = targetActorQuery ? getActorSynonyms(targetActorQuery) : null;
  const actorRes = targetActorQuery
    ? actorSynonyms?.isMatched
      ? {
          actorName: actorSynonyms.canonicalName,
          country: actorSynonyms.country,
          aliases: actorSynonyms.variants,
          isActor: true,
          source: "preset" as const,
        }
      : await resolveActorMovies(targetActorQuery)
    : null;

  const isActorSearch = Boolean(
    actorParam ||
    (hasExplicitActor && (actorRes?.isActor || actorSynonyms?.isMatched))
  );

  if (isActorSearch && (actorRes?.isActor || actorParam || actorSynonyms?.isMatched)) {
    const canonicalName = actorRes?.isActor ? actorRes.actorName : (actorSynonyms?.canonicalName || actorParam || "");
    const actorAliases = Array.from(
      new Set([
        canonicalName,
        ...(actorSynonyms?.variants || []),
        ...(actorRes?.aliases || []),
        ...(actorParam ? [actorParam] : []),
      ])
    ).filter(Boolean);

    const matchedPreset = GOLDEN_ACTOR_INDEX.find(
      (p) => cleanNormalizedForMatch(p.name) === cleanNormalizedForMatch(canonicalName)
    );
    if (matchedPreset) {
      actorAliases.push(...matchedPreset.aliases);
    }

    detectedActor = {
      name: canonicalName,
      country: actorRes?.country || actorSynonyms?.country || matchedPreset?.country,
    };

    // Truy vấn động toàn bộ phim của nghệ sĩ từ DB với bộ lọc diễn viên đa biến thể
    // (Bao gồm tên tiếng Việt có dấu, không dấu, và tên tiếng Anh gốc như 'Jackie Chan')
    // TUYỆT ĐỐI KHÔNG tìm kiếm lấn sang tiêu đề phim (tránh chữ 'Long' lọt vào phim khác)
    const actorMovies = await queryMoviesByActor(
      canonicalName,
      actorAliases,
      detectedActor.country,
      250
    );

    // Áp dụng các bộ lọc phụ (Thể loại, Quốc gia, Năm, Loại phim) nếu người dùng chọn kết hợp
    let filteredActorMovies = actorMovies;

    if (category) {
      const catNorm = cleanNormalizedForMatch(category);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filteredActorMovies = filteredActorMovies.filter((m: any) => {
        const mCats = Array.isArray(m.category)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? m.category.map((c: any) => cleanNormalizedForMatch(c.slug || c.name || ""))
          : [cleanNormalizedForMatch(String(m.category || ""))];
        return mCats.some((c: string) => c.includes(catNorm));
      });
    }

    if (country) {
      const cntNorm = cleanNormalizedForMatch(country);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filteredActorMovies = filteredActorMovies.filter((m: any) => {
        const mCnts = Array.isArray(m.country)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? m.country.map((c: any) => cleanNormalizedForMatch(c.slug || c.name || ""))
          : [cleanNormalizedForMatch(String(m.country || ""))];
        return mCnts.some((c: string) => c.includes(cntNorm));
      });
    }

    if (year) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filteredActorMovies = filteredActorMovies.filter((m: any) =>
        String(m.year || "").includes(year)
      );
    }

    if (type) {
      const t = type.toLowerCase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filteredActorMovies = filteredActorMovies.filter((m: any) => {
        const cat = Array.isArray(m.category)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? m.category.map((c: any) => cleanNormalizedForMatch(c.slug || c.name || "")).join(" ")
          : cleanNormalizedForMatch(String(m.category || ""));
        const itemType = cleanNormalizedForMatch(String(m.type || ""));

        if (t === "phim-bo") {
          return itemType.includes("series") || cat.includes("phim bo") || Number(m.total_episodes) > 1;
        }
        if (t === "phim-le") {
          return itemType.includes("single") || cat.includes("phim le") || !m.total_episodes || Number(m.total_episodes) <= 1;
        }
        if (t === "hoat-hinh") {
          return itemType.includes("hoathinh") || cat.includes("hoat hinh") || cat.includes("anime");
        }
        if (t === "tv-shows") {
          return itemType.includes("tvshows") || cat.includes("tv show") || cat.includes("truyen hinh");
        }
        if (t === "phim-chieu-rap") {
          return Boolean(m.chieurap) || cat.includes("chieu rap");
        }
        return true;
      });
    }

    // Sắp xếp nếu có chỉ định
    if (sort === "rating") {
      filteredActorMovies.sort((a, b) => (Number(b.tmdb?.vote_average || b.imdb?.vote_average || 0)) - (Number(a.tmdb?.vote_average || a.imdb?.vote_average || 0)));
    } else if (sort === "views") {
      filteredActorMovies.sort((a, b) => (Number(b.view || b.tmdb?.vote_count || 0)) - (Number(a.view || a.tmdb?.vote_count || 0)));
    } else if (sort === "year") {
      filteredActorMovies.sort((a, b) => (Number(b.year || 0)) - (Number(a.year || 0)));
    }

    // =========================================================================
    // 2. PHÂN TRANG ĐỒNG BỘ TUYỆT ĐỐI (GIỮ NGUYÊN SỐ LƯỢNG TRANG 1 & TRANG 2)
    // Đảm bảo cùng một điều kiện lọc và cùng một tập dữ liệu cho cả trang 1 và trang 2+
    // =========================================================================
    totalItems = filteredActorMovies.length;
    totalPages = Math.max(1, Math.ceil(totalItems / PAGE_LIMIT));
    const startIndex = (currentPage - 1) * PAGE_LIMIT;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    movies = filteredActorMovies.slice(startIndex, startIndex + PAGE_LIMIT).map((m: any) => ({
      ...m,
      isActorFilmography: true,
    }));
  } else {
    // 2. TÌM KIẾM THƯỜNG THEO TIÊU ĐỀ PHIM HOẶC DUYỆT THEO DANH MỤC
    const [response, semanticPicks] = await Promise.all([
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
      keyword && currentPage === 1 && keyword.trim().length >= 3
        ? Promise.race([
            searchMoviesBySemantic(keyword, 16, 0.42),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 800)),
          ]).catch(() => [])
        : Promise.resolve([]),
    ]);

    movies = response?.items || [];
    totalPages = response?.pagination?.totalPages || 1;
    totalItems = response?.pagination?.totalItems || movies.length;

    // Hòa trộn Semantic Match cho trang 1 nếu có kết quả chất lượng cao
    if (currentPage === 1 && Array.isArray(semanticPicks) && semanticPicks.length > 0) {
      const seenSlugs = new Set<string>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const combined: any[] = [];
      for (const sp of semanticPicks) {
        if (sp?.id && !seenSlugs.has(sp.id)) {
          seenSlugs.add(sp.id);
          combined.push({
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
          });
        }
      }
      for (const m of movies) {
        if (m?.slug && !seenSlugs.has(m.slug)) {
          seenSlugs.add(m.slug);
          combined.push(m);
        }
      }
      movies = combined;
      totalItems = Math.max(movies.length, response?.pagination?.totalItems || 0);
    }

    // Đánh giá độ phù hợp (Relevance Scoring) cho tìm kiếm theo tiêu đề phim
    if (keyword && movies.length > 0) {
      const normKw = cleanNormalizedForMatch(keyword);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scoredMovies = movies.map((m: any) => {
        const title = cleanNormalizedForMatch(m.name || m.title || "");
        const orig = cleanNormalizedForMatch(m.origin_name || "");
        const slug = cleanNormalizedForMatch(m.slug || "");
        const desc = cleanNormalizedForMatch(m.content || m.description || "");

        let score = 0;
        let matchType: "title" | "actor" | "content" = "title";
        let matchSnippet: string | undefined = undefined;

        if (title === normKw || orig === normKw || slug === normKw.replace(/\s+/g, "-")) {
          score = 100;
          matchType = "title";
        } else if (title.startsWith(normKw) || orig.startsWith(normKw)) {
          score = 85;
          matchType = "title";
        } else if (title.includes(normKw) || orig.includes(normKw)) {
          score = 70;
          matchType = "title";
        } else if (desc && desc.includes(normKw)) {
          score = 30;
          matchType = "content";
          matchSnippet = extractDescriptionSnippet(m.content || m.description || "", keyword);
          if (matchSnippet) hasContentMatches = true;
        } else {
          const kwWords = normKw.split(" ").filter((w) => w.length > 1);
          const titleWords = kwWords.filter((w) => title.includes(w) || orig.includes(w));
          if (titleWords.length > 0) {
            score = 40 + Math.round((titleWords.length / kwWords.length) * 20);
            matchType = "title";
          } else {
            score = 15;
            matchSnippet = extractDescriptionSnippet(m.content || m.description || "", keyword);
            if (matchSnippet) hasContentMatches = true;
          }
        }

        return {
          ...m,
          relevanceScore: score,
          matchType,
          matchSnippet,
        };
      });

      scoredMovies.sort((a, b) => b.relevanceScore - a.relevanceScore);
      movies = scoredMovies;
    }
  }

  const pages = getPagination(currentPage, totalPages);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fallbackMovies: any[] = [];
  if (
    movies.length === 0 &&
    keyword &&
    !actorParam &&
    !isAmbiguousShortActorKeyword(keyword)
  ) {
    const fallbackSynonyms = getActorSynonyms(keyword);
    if (fallbackSynonyms.isMatched) {
      const actorMovies = await queryMoviesByActor(
        fallbackSynonyms.canonicalName,
        fallbackSynonyms.variants,
        fallbackSynonyms.country,
        PAGE_LIMIT
      );
      if (actorMovies.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        movies = actorMovies.map((m: any) => ({ ...m, isActorFilmography: true }));
        totalItems = actorMovies.length;
        totalPages = Math.max(1, Math.ceil(totalItems / PAGE_LIMIT));
        detectedActor = {
          name: fallbackSynonyms.canonicalName,
          country: fallbackSynonyms.country,
        };
      }
    }
  }

  if (movies.length === 0 && (keyword || actorParam)) {
    const fallbackRes = await movieApi.getMovies({ limit: 16, sort: "views" });
    fallbackMovies = fallbackRes?.items || [];
  }

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

  let title = "Phim Mới Cập Nhật";

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
  } else if (sort === "rating") {
    title = "⭐ Phim Có Điểm Đánh Giá Cao Nhất";
  } else if (sort === "views") {
    title = "🔥 Phim Có Lượt Xem & Bình Chọn Nhiều Nhất";
  } else if (type && category) {
    const typeLabel = TYPE_TITLES[type] || type;
    const catLabel = GENRE_NAMES[category] || category;
    title = `${typeLabel} • ${catLabel}`;
  } else if (type && country) {
    const typeLabel = TYPE_TITLES[type] || type;
    const ctryLabel = COUNTRY_NAMES[country] || country;
    title = `${typeLabel} • ${ctryLabel}`;
  } else if (type && TYPE_TITLES[type]) {
    title = TYPE_TITLES[type];
  } else if (category) {
    title = `🎬 Phim ${GENRE_NAMES[category] || category}`;
  } else if (country) {
    title = `🌐 Phim ${COUNTRY_NAMES[country] || country}`;
  } else if (year) {
    title = `📅 Phim Năm ${year}`;
  } else if (category || country || year || type) {
    title = "Kết quả lọc";
  }

  const buildPaginationUrl = (newPage: number) => {
    const query = new URLSearchParams();

    if (actorParam) {
      query.set("actor", actorParam);
    }
    if (keyword) {
      query.set("keyword", keyword);
    }

    if (category) query.set("category", category);
    if (country) query.set("country", country);
    if (year) query.set("year", year);
    if (type) query.set("type", type);
    if (sort) query.set("sort", sort);
    query.set("page", newPage.toString());

    return `?${query.toString()}`;
  };

  // Trả về trực tiếp danh sách phim cho Hero; Hero render ngay bằng thumb_url gốc và nâng cấp TMDB ngầm sau khi mount
  const heroMovies = movies;

  return (
    <div className="page-cinema-container min-h-screen pb-20">
      <Navbar />

      {isPlainHomepage && <HeroFeatured movies={heroMovies} />}

      {/* TIẾP TỤC XEM: Hiển thị ngay trên trang chủ khi có lịch sử */}
      {isPlainHomepage && <ContinueWatchingRow />}

      {/* BỘ LỌC PHIM: Khi không có Hero, có khoảng cách trên tránh header che */}
      {!keyword && !actorParam && (
        <div
          className={`px-4 md:px-8 ${isPlainHomepage ? "mt-8" : "pt-24 sm:pt-28"
            }`}
        >
          <FilterBarClient />
        </div>
      )}

      <div
        className={`px-4 md:px-8 ${keyword || actorParam ? "pt-24 sm:pt-28" : !keyword && !actorParam && !isPlainHomepage ? "pt-6" : "pt-8"
          }`}
      >
        {/* DẢI THẺ LỌC NHANH THỂ LOẠI & QUỐC GIA (Hiển thị cả khi đang tìm kiếm để người dùng lọc theo quốc gia của diễn viên) */}
        <QuickGenreChips />

        {/* HÀNG PHIM DÀNH RIÊNG CHO BẠN (AI PERSONALIZED RECOMMENDATIONS) */}
        {isPlainHomepage && <ForYouPersonalizedRow fallbackMovies={movies} />}

        {/* BẢNG XẾP HẠNG TOP 10 TRENDING DỰA TRÊN LƯỢT XEM THỰC TẾ CỦA CỘNG ĐỒNG */}
        {isPlainHomepage && <CommunityTopTrending />}

        {isPlainHomepage ? (
          <>
            {/* TAB TUYỂN CHỌN PHIM ĐA NĂNG TRÊN TRANG CHỦ (Tối ưu hiệu suất & 100% giữ nguyên hiệu ứng hover) */}
            <CuratedMovieSection
              initialMovies={movies}
              initialTotalItems={totalItems}
            />
          </>
        ) : (
          <>
            <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                  {title}
                </h2>
                <p className="mt-1 text-sm text-gray-400">
                  Khám phá bộ sưu tập phim chất lượng cao do Nana tuyển chọn, cập nhật
                  liên tục.
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <SortSelector />
                <div className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs md:text-sm text-gray-200 backdrop-blur-sm shadow-sm">
                  <Film className="w-3.5 h-3.5 text-netflix-red" />
                  <span>{totalItems.toLocaleString("vi-VN")} phim</span>
                  <span className="text-white/40">•</span>
                  <span>Trang {currentPage}</span>
                </div>
              </div>
            </div>



        {detectedActor && (
          <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-950/80 via-zinc-900 to-zinc-900 border border-red-500/30 flex items-center justify-between gap-3 shadow-xl animate-in fade-in duration-300">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-red-600 to-purple-600 text-white flex items-center justify-center flex-none shadow-md border border-white/20">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-2 flex-wrap">
                  <span>Tuyển Tập Tác Phẩm Của {detectedActor.name}</span>
                  {detectedActor.country && (
                    <span className="text-xs text-rose-300 font-bold px-2.5 py-0.5 rounded-full bg-white/10 border border-white/10">
                      {detectedActor.country}
                    </span>
                  )}
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-red-600/30 to-purple-600/30 text-rose-300 font-bold border border-red-500/40">
                    ✨ Nana AI Nhận Diện
                  </span>
                </h4>
                <p className="text-xs text-gray-300 mt-0.5">
                  Tự động tổng hợp các tác phẩm tiêu biểu & xuất sắc nhất của {detectedActor.name}
                </p>
              </div>
            </div>
          </div>
        )}

        {keyword && !detectedActor && (
          <BrowseAiSearchBanner keyword={keyword} hasContentMatches={hasContentMatches} />
        )}

        {movies.length > 0 ? (
          <>
            <MovieGrid movies={movies} />

            {/* THANH PHÂN TRANG CHUẨN GỌN GÀNG */}
            <div className="flex justify-center items-center gap-1.5 sm:gap-2 mt-8 sm:mt-12 flex-wrap">
              {/* NÚT TRƯỚC */}
              <Link
                href={buildPaginationUrl(Math.max(1, currentPage - 1))}
                prefetch={true}
                className={`px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm rounded-xl font-semibold transition touch-target flex items-center ${currentPage === 1
                    ? "bg-zinc-900 text-zinc-600 pointer-events-none"
                    : "bg-zinc-800 text-white hover:bg-zinc-700 active:scale-95"
                  }`}
              >
                « Trước
              </Link>

              {/* SỐ TRANG — ẩn trên mobile, chỉ hiện từ sm */}
              <div className="hidden sm:flex items-center gap-1.5">
                {pages.map((p, index) => {
                  if (p === "...") {
                    return (
                      <span key={index} className="px-1.5 sm:px-2 text-xs sm:text-sm text-gray-500">
                        ...
                      </span>
                    );
                  }
                  return (
                    <Link
                      key={index}
                      href={buildPaginationUrl(p as number)}
                      prefetch={true}
                      className={`w-8 h-8 sm:w-10 sm:h-10 text-xs sm:text-sm flex items-center justify-center rounded-lg font-semibold transition-colors ${currentPage === p
                          ? "bg-netflix-red text-white shadow-sm"
                          : "bg-zinc-800 text-gray-300 hover:bg-zinc-700 hover:text-white"
                        }`}
                    >
                      {p}
                    </Link>
                  );
                })}
              </div>

              {/* TRANG HIỆN TẠI — chỉ hiện trên mobile */}
              <span className="sm:hidden px-3 py-2 text-xs font-bold text-white bg-netflix-red rounded-xl">
                {currentPage} / {totalPages}
              </span>

              {/* NÚT TIẾP */}
              <Link
                href={buildPaginationUrl(currentPage + 1)}
                prefetch={true}
                className={`px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm rounded-xl font-semibold transition touch-target flex items-center ${currentPage >= totalPages
                    ? "bg-zinc-900 text-zinc-600 pointer-events-none"
                    : "bg-zinc-800 text-white hover:bg-zinc-700 active:scale-95"
                  }`}
              >
                Tiếp »
              </Link>
            </div>
          </>
        ) : (
          <div className="py-12 space-y-10">
            <div className="max-w-xl mx-auto rounded-2xl border border-white/10 bg-zinc-900/80 p-6 md:p-8 text-center backdrop-blur-md shadow-2xl">
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
                  <p className="text-xs sm:text-sm text-gray-400 mt-2 leading-relaxed">
                    Hiện tại kho phim của Nanaflix chưa có sẵn các tác phẩm do <strong>{detectedActor.name}</strong> đóng chính hoặc làm đạo diễn. Hệ thống đang liên tục cập nhật thêm nhiều phim mới mỗi ngày!
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
                    <a
                      href={`https://www.themoviedb.org/search/person?query=${encodeURIComponent(detectedActor.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#01b4e4] hover:bg-[#01b4e4]/80 text-white text-xs font-bold transition shadow-lg shadow-sky-950/40"
                    >
                      <span>Tra cứu &quot;{detectedActor.name}&quot; trên TMDb</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <Link
                      href="/browse"
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white text-xs font-semibold transition"
                    >
                      Khám phá tất cả phim
                    </Link>
                  </div>
                </>
              ) : keyword ? (
                <>
                  <p className="text-xs sm:text-sm text-gray-400 mt-2 leading-relaxed">
                    Hệ thống nguồn phim tìm kiếm trực tiếp theo <strong>tiêu đề phim</strong>. Nếu đây là tên diễn viên hoặc đạo diễn, bạn có thể tra cứu hồ sơ và danh sách phim trên TMDb hoặc thưởng thức các phim đề xuất bên dưới:
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
                    <a
                      href={`https://www.themoviedb.org/search?query=${encodeURIComponent(keyword)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#01b4e4] hover:bg-[#01b4e4]/80 text-white text-xs font-bold transition shadow-lg shadow-sky-950/40"
                    >
                      <span>Tra cứu &quot;{keyword}&quot; trên TMDb</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <Link
                      href="/browse"
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white text-xs font-semibold transition"
                    >
                      Khám phá tất cả phim
                    </Link>
                  </div>
                </>
              ) : (
                <div className="mt-5">
                  <Link
                    href="/browse"
                    className="px-4 py-2 rounded-xl bg-netflix-red hover:bg-red-700 text-white text-xs font-semibold transition"
                  >
                    Về trang chủ
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
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
