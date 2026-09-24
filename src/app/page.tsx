import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { FilterBarClient } from "@/components/FilterBarClient";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ContinueWatchingRow } from "@/components/ContinueWatchingRow";
import { QuickGenreChips } from "@/components/QuickGenreChips";
import { movieApi } from "@/services/movieApi";
import { getTmdbRankedMovies } from "@/services/tmdbService";
import { CuratedMovieSection } from "@/components/CuratedMovieSection";
import { TmdbTopTrending } from "@/components/TmdbTopTrending";
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
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      search.set(key, value);
    } else if (Array.isArray(value)) {
      for (const v of value) search.append(key, v);
    }
  }
  const queryString = search.toString();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://nanaflix.vercel.app").replace(/\/+$/, "");

  if (queryString) {
    return {
      alternates: {
        canonical: `${siteUrl}/browse?${queryString}`,
      },
    };
  }

  const title = "Nanaflix - Xem Phim Trực Tuyến Miễn Phí Chất Lượng Cao";
  const description =
    "Xem phim trực tuyến chất lượng cao cùng Trợ lý Nana gợi ý phim thông minh, cập nhật liên tục các siêu phẩm điện ảnh mới nhất.";

  return {
    title,
    description,
    alternates: {
      canonical: `${siteUrl}`,
    },
    openGraph: {
      title,
      description,
      type: "website",
      images: [
        {
          url: `${siteUrl}/default-hero.jpg`,
          secureUrl: `${siteUrl}/default-hero.jpg`,
          width: 1200,
          height: 630,
          alt: title,
          type: "image/jpeg",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${siteUrl}/default-hero.jpg`],
    },
  };
}

// ==========================================
// FEATURED BANNER SCORING
// Chọn lọc phim nổi bật cho banner, không phải đơn thuần mới nhất.
// Hoạt động hoàn toàn trên dữ liệu đã fetch, không gọi thêm API.
// ==========================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMovie = Record<string, any>;

interface FeaturedCacheEntry {
  movies: AnyMovie[];
  expireAt: number;
}
const featuredBannerCache: { current: FeaturedCacheEntry | null } = { current: null };
const FEATURED_CACHE_TTL_MS = 20 * 60 * 1000; // 20 phút

function getFeaturedMoviesWithCache(movies: AnyMovie[]): AnyMovie[] {
  const now = Date.now();
  if (featuredBannerCache.current && featuredBannerCache.current.expireAt > now) {
    return featuredBannerCache.current.movies;
  }
  const heroMovies = selectFeaturedMovies(movies, 7);
  featuredBannerCache.current = { movies: heroMovies, expireAt: now + FEATURED_CACHE_TTL_MS };
  return heroMovies;
}

/**
 * Tính Featured Score (0–100) cho một phim dựa trên dữ liệu có sẵn.
 * Chỉ dùng field đã có trong movie list API, không gọi thêm request.
 */
function computeFeaturedScore(movie: AnyMovie): number {
  let score = 0;
  const currentYear = new Date().getFullYear();

  // 1. TMDB Rating — tiêu chí cốt lõi, chiếm trọng số lớn nhất
  const rating = Number(movie.tmdb?.vote_average || movie.imdb?.vote_average || 0);
  if (rating > 0) {
    if (rating >= 8.5)      score += 35;
    else if (rating >= 7.5) score += 25;
    else if (rating >= 6.5) score += 12;
    else if (rating >= 5.5) score += 0;
    else                    score -= 15;
  }

  // 2. Popularity — TMDB vote_count hoặc NguonC view count
  const voteCount = Number(movie.tmdb?.vote_count || 0);
  const viewCount = Number(movie.view || 0);
  const popularity = Math.max(voteCount, viewCount);
  if (popularity >= 5000)      score += 18;
  else if (popularity >= 2000) score += 14;
  else if (popularity >= 500)  score += 10;
  else if (popularity >= 100)  score += 5;

  // 3. Chất lượng video
  const quality = String(movie.quality || "").toUpperCase();
  if (quality.includes("4K") || quality.includes("2160") || quality.includes("FULLHD") || quality === "FHD") {
    score += 12;
  } else if (quality.includes("1080") || quality === "HD") {
    score += 6;
  }

  // 4. Độ mới
  const movieYear = Number(movie.year || 0);
  if (movieYear === currentYear)          score += 5;
  else if (movieYear === currentYear - 1) score += 3;

  // 5. Trailer bonus
  if (movie.trailer_url && typeof movie.trailer_url === "string" && movie.trailer_url.trim()) {
    score += 3;
  }

  return score;
}

/**
 * Chọn k phim nổi bật từ pool phim đã có với diversity nhẹ.
 */
function selectFeaturedMovies(pool: AnyMovie[], count: number = 7): AnyMovie[] {
  if (!pool || pool.length === 0) return [];

  const withPoster = pool.filter((m) =>
    (m.poster_url && m.poster_url !== "null" && m.poster_url !== "undefined") ||
    (m.thumb_url  && m.thumb_url  !== "null" && m.thumb_url  !== "undefined")
  );
  const afterPoster = withPoster.length >= count ? withPoster : pool;

  const eligible = afterPoster.filter((m) => {
    const r = Number(m.tmdb?.vote_average || m.imdb?.vote_average || 0);
    return r === 0 || r >= 5.5;
  });

  const candidates = eligible.length >= count ? eligible : afterPoster;

  const scored = candidates
    .map((m) => ({ movie: m, score: computeFeaturedScore(m) }))
    .sort((a, b) => b.score - a.score);

  const yearCount: Record<string, number> = {};
  const countryCount: Record<string, number> = {};
  const selected: AnyMovie[] = [];
  const overflow: AnyMovie[] = [];

  for (const { movie } of scored) {
    const year = String(movie.year || "unknown");
    const primaryCountry = Array.isArray(movie.country) && movie.country.length > 0
      ? String(movie.country[0]?.slug || movie.country[0]?.name || "unknown")
      : String(movie.country || "unknown");

    const yearOk    = (yearCount[year] || 0) < 2;
    const countryOk = (countryCount[primaryCountry] || 0) < 2;

    if (yearOk && countryOk) {
      selected.push(movie);
      yearCount[year] = (yearCount[year] || 0) + 1;
      countryCount[primaryCountry] = (countryCount[primaryCountry] || 0) + 1;
    } else {
      overflow.push(movie);
    }

    if (selected.length >= count) break;
  }

  if (selected.length < count) {
    for (const movie of overflow) {
      selected.push(movie);
      if (selected.length >= count) break;
    }
  }

  if (selected.length > 2) {
    const pinned = selected.slice(0, 2);
    const rest   = selected.slice(2);
    const seed = Math.floor(Date.now() / FEATURED_CACHE_TTL_MS);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.abs(seed * (i + 1) * 2654435761) % (i + 1);
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    return [...pinned, ...rest];
  }

  return selected;
}

// ==========================================
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  // TƯƠNG THÍCH NGƯỢC: Nếu có bất kỳ query string nào, redirect sang /browse giữ nguyên toàn bộ params
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      search.set(key, value);
    } else if (Array.isArray(value)) {
      for (const v of value) {
        search.append(key, v);
      }
    }
  }
  const queryString = search.toString();
  if (queryString) {
    redirect(`/browse?${queryString}`);
  }

  // TRANG CHỦ THUẦN TÚY (LANDING PAGE)
  const [response, weekTrending] = await Promise.all([
    movieApi.getMovies({
      page: 1,
      limit: 24,
      sort: "views",
    }),
    getTmdbRankedMovies("week", 8).catch(() => []),
  ]);

  const movies = response?.items || [];
  const totalItems = response?.pagination?.totalItems || movies.length;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trendingWeekRaw: any[] = weekTrending || [];

  // Chọn lọc phim Featured cho banner
  const validTrendingMovies = trendingWeekRaw.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (m: any) =>
      m?.slug &&
      m?.name &&
      ((m.thumb_url && m.thumb_url !== "null" && m.thumb_url !== "undefined") ||
        (m.poster_url && m.poster_url !== "null" && m.poster_url !== "undefined"))
  );
  const heroMovies =
    validTrendingMovies.length >= 3
      ? validTrendingMovies.slice(0, 8)
      : getFeaturedMoviesWithCache(movies);

  return (
    <div className="page-cinema-container min-h-screen pb-20">
      <Navbar />

      <HeroFeatured movies={heroMovies} />

      {/* TIẾP TỤC XEM: Hiển thị ngay trên trang chủ khi có lịch sử */}
      <ContinueWatchingRow />

      {/* BỘ LỌC PHIM CHI TIẾT */}
      <div className="px-4 md:px-8 mt-4 sm:mt-8">
        <FilterBarClient />
      </div>

      <div className="px-4 md:px-8 relative z-10 pt-2 sm:pt-4">
        {/* DẢI THẺ LỌC NHANH THỂ LOẠI & QUỐC GIA */}
        <QuickGenreChips />

        {/* HÀNG PHIM DÀNH RIÊNG CHO BẠN (AI PERSONALIZED RECOMMENDATIONS) */}
        <ForYouPersonalizedRow fallbackMovies={movies} />

        {/* BẢNG XẾP HẠNG PHIM THỊNH HÀNH TRONG TUẦN (TMDB TRENDING MATCHED CATALOG) */}
        <TmdbTopTrending />

        {/* BẢNG XẾP HẠNG TOP 10 TRENDING DỰA TRÊN LƯỢT XEM THỰC TẾ CỦA CỘNG ĐỒNG */}
        <CommunityTopTrending />

        {/* TAB TUYỂN CHỌN PHIM ĐA NĂNG TRÊN TRANG CHỦ */}
        <CuratedMovieSection
          initialMovies={movies}
          initialTotalItems={totalItems}
        />
      </div>
      <Footer />
    </div>
  );
}
