import React, { Suspense } from "react";
import { movieApi } from "@/services/movieApi";
import Link from "next/link";
import {
  buildMovieDescriptionFallback,
  pickBestMovieImage,
  pickBestMoviePoster,
  pickBestMovieThumb,
} from "@/lib/movieMedia";
import { cleanHtmlText } from "@/lib/cleanHtml";

import {
  Calendar,
  BellRing,
  Clock,
  Film,
  Home,
  Compass,
  AlertCircle,
} from "lucide-react";
import { MovieSynopsis } from "@/components/MovieSynopsis";
import { ShareButton } from "@/components/ShareButton";
import { MovieRecommendationsClient, RecommendationSkeleton } from "@/components/MovieRecommendationsClient";
import { Navbar } from "@/components/Navbar";
import { ActorChipClient } from "@/components/ActorChipClient";
import { Footer } from "@/components/Footer";
import TrackHistoryClient from "@/components/TrackHistoryClient";
import { CinemaPlayer } from "@/components/CinemaPlayer";
import { EpisodeList } from "@/components/EpisodeList";
import { ResumeEpisodeBanner } from "@/components/ResumeEpisodeBanner";
import { WatchController } from "@/components/WatchController";
import { ServerSelector } from "@/components/ServerSelector";
import { WatchlistButton } from "@/components/WatchlistButton";
import { AddToCollectionButton } from "@/components/Collections/AddToCollectionButton";
import { ActiveEpisodeBadge, EpisodeCountBadge } from "@/components/ActiveEpisodeBadge";
import { findEpisodeMatch } from "@/lib/formatEpisode";

import { MobileQrModal } from "@/components/MobileQrModal";
import { TrailerModal } from "@/components/TrailerModal";
import { MovieCommentsSection } from "@/components/MovieReviews/MovieCommentsSection";
import { FollowSeriesButton } from "@/components/FollowSeriesButton";
import { ReportIssueModal } from "@/components/ReportIssueModal";


export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://nanaflix.vercel.app").replace(/\/+$/, "");
  try {
    const { slug } = await params;
    const data = await movieApi.getMovieDetail(slug);

    if (!data?.movie) {
      return {
        title: "Không tìm thấy phim | Nanaflix",
        description: "Bộ phim bạn đang tìm kiếm không tồn tại hoặc đã được chuyển sang liên kết mới.",
        alternates: {
          canonical: `${siteUrl}/movies/${slug}`,
        },
      };
    }

    const movie = data.movie;
    const rawTitle = movie.name || movie.title || "Phim";
    const originName = movie.origin_name ? ` (${movie.origin_name})` : "";
    const year = movie.year ? ` - ${movie.year}` : "";
    const description =
      cleanHtmlText(movie.content || movie.description) ||
      `Xem phim ${rawTitle}${originName} chất lượng cao Full HD, Vietsub, Thuyết minh miễn phí tốc độ cao trên Nanaflix.`;
    const image = pickBestMovieImage(movie, "/default-poster.jpg");

    return {
      title: `${rawTitle}${originName}${year} | Nanaflix VIP`,
      description: description.slice(0, 160),
      alternates: {
        canonical: `${siteUrl}/movies/${slug}`,
      },
      openGraph: {
        title: `${rawTitle}${originName} | Nanaflix VIP`,
        description: description.slice(0, 160),
        images: image ? [{ url: image, alt: rawTitle }] : [],
        type: "video.movie",
      },
      twitter: {
        card: "summary_large_image",
        title: `${rawTitle}${originName} | Nanaflix VIP`,
        description: description.slice(0, 160),
        images: image ? [image] : [],
      },
    };
  } catch {
    return {
      title: "Nanaflix - Xem Phim Online Miễn Phí",
      alternates: {
        canonical: `${siteUrl}/movies`,
      },
    };
  }
}

export default async function MovieDetail({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ep?: string; server?: string; t?: string }>;
}) {
  const { slug } = await params;
  const { ep, server, t } = await searchParams;

  const data = await movieApi.getMovieDetail(slug);
  if (!data || !data.movie) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col justify-between selection:bg-netflix-red selection:text-white">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 py-20">
          <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
            {/* Glow Icon */}
            <div className="relative mx-auto w-20 h-20 rounded-3xl bg-netflix-red/10 border border-netflix-red/30 flex items-center justify-center text-rose-500 shadow-2xl shadow-rose-950/50">
              <div className="absolute inset-0 bg-rose-500/20 rounded-3xl blur-xl" />
              <Film className="w-10 h-10 relative z-10" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-gray-400">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>Không tìm thấy phim</span>
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Nội dung tạm thời chưa khả dụng
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed max-w-sm mx-auto">
                Bộ phim bạn đang tìm kiếm có thể đã được đổi tên hoặc đang trong quá trình cập nhật nguồn phát mới.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-netflix-red hover:bg-rose-700 text-white font-bold text-xs transition shadow-lg shadow-rose-950/60 active:scale-95 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Về Trang Chủ</span>
              </Link>
              <Link
                href="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs transition active:scale-95 cursor-pointer"
              >
                <Compass className="w-4 h-4" />
                <span>Khám Phá Phim Mới</span>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const { movie, episodes } = data;
  const title = movie.name || movie.title;
  const description =
    cleanHtmlText(movie.content || movie.description) ||
    buildMovieDescriptionFallback({
      origin_name: movie.origin_name,
      year: movie.year,
      time: movie.time,
      lang: movie.lang,
      quality: movie.quality,
      category: movie.category,
      country: movie.country,
      director: movie.director,
    }) ||
    "";

  // Danh sách diễn viên dạng mảng (lọc bỏ null/đang cập nhật)
  const actorList: string[] = (
    Array.isArray(movie.actor)
      ? movie.actor.map(String).map((s: string) => s.trim()).filter(Boolean)
      : typeof movie.actor === "string" && movie.actor
        ? movie.actor.split(",").map((s: string) => s.trim()).filter(Boolean)
        : []
  ).filter((a: string) => !a.toLowerCase().includes("cập nhật") && !a.toLowerCase().includes("updating"));

  // Danh sách đạo diễn dạng mảng (lọc bỏ null/đang cập nhật)
  const directorList: string[] = (
    Array.isArray(movie.director)
      ? movie.director.map(String).map((s: string) => s.trim()).filter(Boolean)
      : typeof movie.director === "string" && movie.director
        ? movie.director.split(",").map((s: string) => s.trim()).filter(Boolean)
        : []
  ).filter((d: string) => !d.toLowerCase().includes("cập nhật") && !d.toLowerCase().includes("updating"));

  // Danh sách thể loại
  const categoryList: Array<{ name: string; slug?: string }> = (
    Array.isArray(movie.category)
      ? (movie.category as Array<{ name: string; slug?: string }>)
      : typeof movie.genre === "string"
        ? movie.genre.split(",").map((g: string) => ({ name: g.trim(), slug: undefined }))
        : []
  ).filter((c: { name: string; slug?: string }) => c?.name && !c.name.toLowerCase().includes("cập nhật"));

  // Danh sách quốc gia
  const countryList: Array<{ name: string; slug?: string }> = (
    Array.isArray(movie.country)
      ? (movie.country as Array<{ name: string; slug?: string }>)
      : []
  ).filter((c: { name: string; slug?: string }) => c?.name && !c.name.toLowerCase().includes("cập nhật"));

  // Đánh giá IMDb
  const imdbScore = movie.imdb?.vote_average ? Number(movie.imdb.vote_average) : undefined;

  // Cờ Chiếu rạp
  const isChieuRap = Boolean(
    movie.chieurap === true ||
    movie.chieurap === "true" ||
    movie.chieurap === 1 ||
    movie.chieu_rap === true
  );

  // Tên gọi khác (tên tiếng Trung/Anh/phụ)
  const altNames: string[] = Array.isArray(movie.alternative_names)
    ? movie.alternative_names.map(String).map((s: string) => s.trim()).filter(Boolean)
    : typeof movie.alternative_names === "string" && movie.alternative_names
      ? movie.alternative_names.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];

  // Lượt xem tích lũy từ API
  const viewCount =
    typeof movie.view === "number" && movie.view > 0 ? movie.view : undefined;

  // Thời gian cập nhật gần nhất
  const modifiedTime = movie.modified?.time ? new Date(movie.modified.time) : null;
  const formattedModified =
    modifiedTime && !isNaN(modifiedTime.getTime())
      ? modifiedTime.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      : null;

  // Chuẩn hóa và làm sạch cấu trúc episodeServers: chỉ giữ các trường thực sự cần thiết cho playback
  // và chuyển tập (name, slug, link_embed, link_m3u8), loại bỏ triệt để các thuộc tính nặng như filename
  // để giảm tối đa kích thước RSC payload HTML ban đầu.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const episodeServers = (episodes || []).map((srv: any, sIdx: number) => ({
    server_name: srv.server_name || `Server #${sIdx + 1}`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    server_data: (srv.server_data || []).map((ep: any) => ({
      name: ep.name || "",
      slug: ep.slug || "",
      link_embed: ep.link_embed || "",
      link_m3u8: ep.link_m3u8 || "",
    })),
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serverSummaries = episodeServers.map((s: any) => ({
    server_name: s.server_name,
    count: s.server_data?.length || 0,
  }));

  const currentServerIndex = Math.min(
    Math.max(0, parseInt(server || "0", 10)),
    Math.max(0, episodeServers.length - 1)
  );
  const currentServer = episodeServers[currentServerIndex] || episodeServers[0];
  const serverData = currentServer?.server_data || [];
  const isTrailerOnly =
    movie.status === "trailer" ||
    serverData.length === 0 ||
    movie.episode_current === "Trailer";

  // Định dạng thời lượng phim chuẩn xác chống lỗi lặp 'phút phút'
  const cleanDuration = (() => {
    if (!movie.time) return "";
    const raw = String(movie.time).trim();
    if (raw.toLowerCase().includes("phút") || raw.toLowerCase().includes("min")) {
      return raw;
    }
    return `${raw} phút`;
  })();

  // Phân tích chính xác số tập hiện tại và tổng số tập (tránh lỗi 13/13 bị nối thành 1313)
  const parseEpisodeNumbers = () => {
    const currentStr = String(movie.episode_current || "").trim();
    const totalStr = String(movie.episode_total || "").trim();
    const serverCount = serverData.length;

    let current = 0;
    let total =
      typeof movie.episode_total === "number" ? movie.episode_total : 0;

    // 1. Kiểm tra dạng "Tập 13/13" hoặc "13/13" hoặc "Hoàn tất (16/16)"
    const slashMatch = currentStr.match(/(\d+)\s*[\/|\\]\s*(\d+)/);
    if (slashMatch) {
      current = parseInt(slashMatch[1], 10);
      if (!total) {
        total = parseInt(slashMatch[2], 10);
      }
    } else {
      // 2. Tìm số đơn lẻ trong episode_current (vd: "Tập 12" -> 12, "12" -> 12)
      const numMatch = currentStr.match(/(\d+)/);
      if (numMatch) {
        current = parseInt(numMatch[1], 10);
      } else {
        current = serverCount;
      }

      if (!total) {
        const totalMatch = totalStr.match(/(\d+)/);
        if (totalMatch) {
          total = parseInt(totalMatch[1], 10);
        }
      }
    }

    if (!total || total < current) {
      total = Math.max(total || 0, serverCount, current);
    }

    if (total > 0 && current > total) {
      current = total;
    }

    return { current, total };
  };

  const { current: currentEpNum, total: totalEpNum } = parseEpisodeNumbers();
  const isCompleted =
    movie.status === "completed" ||
    (totalEpNum > 0 && currentEpNum >= totalEpNum);
  const hasProgress = totalEpNum > 1 && currentEpNum > 0;
  const progressPercent = hasProgress
    ? Math.min(100, Math.round((currentEpNum / totalEpNum) * 100))
    : 0;

  const activeEpisode = ep
    ? findEpisodeMatch(serverData, ep) || serverData[0]
    : serverData[0];
  const videoLink = activeEpisode?.link_embed || activeEpisode?.link_m3u8;
  const embedSrc = activeEpisode?.link_embed;
  const rawM3u8 = activeEpisode?.link_m3u8
    || (activeEpisode as Record<string, string | undefined>)?.m3u8
    || (activeEpisode as Record<string, string | undefined>)?.file;

  const primaryGenreSlug = movie.category?.[0]?.slug;

  // JSON-LD Structured Data for Google Search Rich Results (SEO)
  const isSeries = movie.type === "series" || (episodes && episodes.length > 1);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": isSeries ? "TVSeries" : "Movie",
    name: title,
    alternateName: movie.origin_name || undefined,
    image: pickBestMovieImage(movie, "https://nanaflix.vercel.app/default-poster.jpg"),
    description:
      cleanHtmlText(movie.content || movie.description) ||
      `Xem phim ${title} chất lượng cao Full HD, Vietsub trên Nanaflix.`,
    datePublished: movie.year ? `${movie.year}` : undefined,
    genre: movie.category?.map((c: { name: string }) => c.name) || [],
    actor: actorList.slice(0, 10).map((actorName: string) => ({
      "@type": "Person",
      name: actorName,
    })),
    director: directorList.slice(0, 5).map((directorName: string) => ({
      "@type": "Person",
      name: directorName,
    })),
    ...(movie.tmdb?.vote_average
      ? {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: movie.tmdb.vote_average,
          bestRating: "10",
          ratingCount: movie.tmdb.vote_count || 50,
        },
      }
      : {}),
  };

  return (
    <div className="page-cinema-container min-h-screen pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pb-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <TrackHistoryClient
        slug={movie.slug}
        title={title}
        poster={pickBestMoviePoster(movie, "/default-poster.jpg")}
        thumb={pickBestMovieThumb(movie, "/default-hero.jpg")}
        episodeName={activeEpisode?.name}
        episodeSlug={activeEpisode?.slug}
        year={movie.year}
        quality={movie.quality}
        category={movie.category?.map((c: { name?: string }) => c.name).filter(Boolean).join(", ") || movie.category?.[0]?.name}
        country={movie.country?.[0]?.name}
        type={movie.type}
      />

      <WatchController
        movieSlug={movie.slug}
        movieTitle={title}
        posterUrl={pickBestMoviePoster(movie, "/default-poster.jpg")}
        thumbUrl={pickBestMovieThumb(movie, "/default-hero.jpg")}
        year={movie.year}
        quality={movie.quality}
        category={movie.category?.map((c: { name?: string }) => c.name).filter(Boolean).join(", ") || movie.category?.[0]?.name}
        country={movie.country?.[0]?.name}
        type={movie.type}
        initialServers={episodeServers}
        initialServerIndex={currentServerIndex}
        initialEpisodeSlug={activeEpisode?.slug || serverData[0]?.slug}
        isTrailerOnly={isTrailerOnly}
      >
        <div className="w-full pt-[56px] md:pt-[66px] bg-black px-0 sm:px-2 md:px-6">
          {/* BANNER XEM TIẾP NẾU CÓ TẬP XEM DỞ TRƯỚC ĐÓ */}
          <ResumeEpisodeBanner
            movieSlug={movie.slug}
            activeEpisodeSlug={activeEpisode?.slug}
          />

          {/* BREADCRUMB */}
          <div className="max-w-7xl mx-auto py-1.5 px-3 sm:px-4 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-400 overflow-hidden">
            <Link href="/" className="hover:text-white transition">
              Trang chủ
            </Link>
            <span className="text-gray-600">/</span>
            {primaryGenreSlug && (
              <>
                <Link
                  href={`/?category=${primaryGenreSlug}`}
                  className="hover:text-white transition"
                >
                  {movie.category?.[0]?.name || "Thể loại"}
                </Link>
                <span className="text-gray-600">/</span>
              </>
            )}
            <span className="text-gray-200 font-medium truncate max-w-[150px] xs:max-w-[200px] sm:max-w-none">
              {title}
            </span>
          </div>

          <CinemaPlayer
            embedSrc={embedSrc}
            videoLink={videoLink}
            m3u8Link={rawM3u8}
            trailerUrl={movie.trailer_url}
            title={title}
            movieSlug={movie.slug}
            activeEpisodeName={activeEpisode?.name}
            activeEpisodeSlug={activeEpisode?.slug}
            isTrailerOnly={isTrailerOnly}
            posterUrl={pickBestMovieImage(movie, "/default-hero.jpg")}
            initialTime={t ? parseFloat(t) : undefined}
          />
        </div>

        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-8 mt-4 sm:mt-6 md:mt-10 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          {/* KHỐI 1: THÔNG TIN PHIM CHÍNH & THANH CÔNG CỤ (Mobile: Order 1, Desktop: Hàng 1 Cột trái 8 phần) */}
          <div className="lg:col-span-8 order-1 rounded-2xl sm:rounded-3xl border border-white/15 bg-gradient-to-b from-zinc-900/80 via-zinc-950/85 to-black/90 p-4 sm:p-6 md:p-8 backdrop-blur-xl shadow-2xl space-y-4 sm:space-y-5">
            {/* TIÊU ĐỀ PHIM & TÊN GỐC TÁCH BIỆT RÕ RÀNG */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                  {title}
                </h1>
                <ActiveEpisodeBadge
                  initialEpisodeName={activeEpisode?.name}
                  isTrailerOnly={isTrailerOnly}
                />
              </div>

              {movie.origin_name && movie.origin_name !== title && (
                <p className="text-xs sm:text-sm md:text-base text-gray-400 font-medium italic">
                  {movie.origin_name}
                </p>
              )}
            </div>

            {/* THÔNG TIN PHIM TINH GỌN (METADATA LINE - NETFLIX STANDARD) */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 mt-3 sm:mt-4 text-xs text-gray-300 font-medium">
              <span className="rounded border border-white/40 px-1.5 py-0.5 text-[11px] font-bold text-white uppercase tracking-wider">
                {movie.quality || "HD"}
              </span>
              {movie.year && (
                <span className="text-gray-200">{movie.year}</span>
              )}
              {cleanDuration && (
                <>
                  <span className="text-gray-600">•</span>
                  <span className="text-gray-200">{cleanDuration}</span>
                </>
              )}
              {movie.lang && (
                <>
                  <span className="text-gray-600">•</span>
                  <span className="text-gray-300">{movie.lang}</span>
                </>
              )}
              {imdbScore && imdbScore > 0 ? (
                <>
                  <span className="text-gray-600">•</span>
                  <span className="inline-flex items-center gap-1 font-bold text-amber-400">
                    <span className="bg-[#f5c518] text-black px-1 py-0.2 rounded text-[10px] font-black leading-tight">
                      IMDb
                    </span>
                    <span>{imdbScore.toFixed(1)}</span>
                  </span>
                </>
              ) : null}
              {isChieuRap && (
                <>
                  <span className="text-gray-600">•</span>
                  <span className="text-amber-300 font-semibold flex items-center gap-1">
                    🎬 Chiếu Rạp
                  </span>
                </>
              )}
              {isCompleted && (
                <>
                  <span className="text-gray-600">•</span>
                  <span className="text-emerald-400 font-semibold">
                    Trọn bộ
                  </span>
                </>
              )}
              {viewCount !== undefined && viewCount > 500 && (
                <>
                  <span className="text-gray-600">•</span>
                  <span className="text-gray-400 text-[11px]">
                    {viewCount >= 1000 ? `${(viewCount / 1000).toFixed(1)}k` : viewCount} lượt xem
                  </span>
                </>
              )}
            </div>

            {/* THANH NÚT TÁC VỤ (ACTION TOOLBAR) - TỐI ƯU GỌN GÀNG CHO MOBILE 390PX VÀ DESKTOP */}
            <div className="mt-4 sm:mt-5 pt-3.5 border-t border-white/10">
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none pb-0.5 -mx-1 px-1 touch-pan-x">
                {/* Nút Xem Trailer */}
                <TrailerModal trailerUrl={movie.trailer_url} title={title} />

                {/* Divider */}
                <div className="h-6 w-px bg-white/10 mx-0.5 flex-shrink-0" />

                {/* Nút Danh sách yêu thích */}
                <WatchlistButton
                  movie={{
                    slug: movie.slug,
                    title,
                    poster: pickBestMovieImage(movie, "/default-poster.jpg"),
                    year: movie.year,
                    quality: movie.quality,
                    category: movie.category?.[0]?.name,
                  }}
                />

                {/* Nút Thêm vào Bộ sưu tập */}
                <AddToCollectionButton
                  movie={{
                    slug: movie.slug,
                    title,
                    poster: pickBestMovieImage(movie, "/default-poster.jpg"),
                    year: movie.year,
                    quality: movie.quality,
                    category: movie.category?.[0]?.name,
                  }}
                />

                {/* Nút Theo dõi phim bộ / cập nhật tập mới */}
                <FollowSeriesButton
                  movieSlug={movie.slug}
                  movieTitle={title}
                  posterUrl={pickBestMovieImage(movie, "/default-poster.jpg")}
                  isSeries={isSeries}
                />

                {/* Nút Báo lỗi */}
                <ReportIssueModal
                  movieTitle={title}
                  movieSlug={movie.slug}
                  episodeName={activeEpisode?.name}
                  episodeSlug={activeEpisode?.slug}
                  serverName={currentServer?.server_name}
                />

                {/* Divider đẩy cụm chia sẻ sang phải trên desktop */}
                <div className="h-6 w-px bg-white/10 mx-0.5 flex-shrink-0 ml-auto hidden sm:block" />

                {/* Cụm tiện ích: Chia sẻ, Xem trên điện thoại */}
                <ShareButton title={title} />
                <MobileQrModal
                  title={title}
                  movieSlug={slug}
                  activeEpisodeSlug={activeEpisode?.slug}
                  activeEpisodeName={activeEpisode?.name}
                />
              </div>
            </div>

            {/* TIẾN ĐỘ PHÁT SÓNG (DÀNH CHO PHIM BỘ) */}
            {hasProgress && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-zinc-900/60 p-4 backdrop-blur-md">
                <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
                  <span className="text-gray-300 font-medium">
                    {isCompleted ? "Trọn bộ phát hành:" : "Tiến độ phát sóng:"}
                  </span>
                  <span className="text-white font-bold">
                    {currentEpNum} / {totalEpNum} tập{" "}
                    {isCompleted ? "(Hoàn tất)" : `(${progressPercent}%)`}
                  </span>
                </div>
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-netflix-red to-rose-500 h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(229,9,20,0.5)]"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* LỊCH CHIẾU & THÔNG BÁO TỪ BIÊN TẬP VIÊN */}
            {(movie.showtimes || movie.notify) && (
              <div className="mt-4 space-y-2">
                {movie.showtimes && (
                  <div className="flex items-center gap-2.5 rounded-xl border border-sky-500/30 bg-sky-950/30 px-4 py-2.5 text-xs sm:text-sm text-sky-200">
                    <Calendar className="w-4 h-4 text-sky-400 flex-shrink-0" />
                    <span>
                      <strong className="text-sky-300">Lịch phát sóng:</strong>{" "}
                      {movie.showtimes}
                    </span>
                  </div>
                )}
                {movie.notify && (
                  <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-950/30 px-4 py-2.5 text-xs sm:text-sm text-amber-200">
                    <BellRing className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>
                      <strong className="text-amber-300">Thông báo:</strong>{" "}
                      {movie.notify}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* KHỐI 2: DANH SÁCH TẬP PHIM & NGUỒN PHÁT (Mobile: Order 2 hiển thị ngay sau Info chính, Desktop: Cột phải 4 phần kéo dài 2 hàng) */}
          <div className="lg:col-span-4 order-2 lg:order-none lg:row-span-2">
            <div className="rounded-2xl sm:rounded-3xl border border-white/15 bg-gradient-to-b from-zinc-900/80 via-zinc-950/85 to-black/90 p-4 sm:p-5 md:p-6 h-fit max-lg:max-h-none max-lg:overflow-visible lg:max-h-[680px] lg:overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-zinc-500 lg:pr-2 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold flex items-center gap-2.5 text-white">
                  <Film className="w-5 h-5 text-red-500 shrink-0" />
                  <span>Danh sách tập</span>
                </h3>
                <EpisodeCountBadge initialCount={serverData.length} isTrailerOnly={isTrailerOnly} />
              </div>

              {/* THANH CHUYỂN SERVER NẾU PHIM CÓ NHIỀU NGUỒN PHÁT (0MS SWITCHING) */}
              <ServerSelector
                servers={serverSummaries}
                initialServerIndex={currentServerIndex}
              />

              <EpisodeList
                movieSlug={movie.slug}
                activeEpisodeSlug={activeEpisode?.slug}
              />
            </div>
          </div>

          {/* KHỐI 3: TÓM TẮT CỐT TRUYỆN, DIỄN VIÊN & THÔNG TIN CHI TIẾT (Mobile: Order 3 sau EpisodeList, Desktop: Hàng 2 Cột trái 8 phần) */}
          <div className="lg:col-span-8 order-3 lg:order-none rounded-2xl sm:rounded-3xl border border-white/15 bg-gradient-to-b from-zinc-900/80 via-zinc-950/85 to-black/90 p-4 sm:p-6 md:p-8 backdrop-blur-xl shadow-2xl space-y-4 sm:space-y-5">
            <MovieSynopsis
              synopsis={description}
              originName={movie.origin_name}
            />

            {/* TÊN GỌI KHÁC NẾU CÓ TỪ API (HIỂN THỊ DẠNG CHỮ GỌN GÀNG, KHÔNG RỐI MẮT) */}
            {altNames.length > 0 && (
              <div className="mt-4 pt-3.5 border-t border-white/10 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                <span className="text-gray-500 font-semibold uppercase tracking-wider text-[11px] flex-shrink-0">
                  Tên gọi khác:
                </span>
                <span className="text-gray-300 font-medium leading-relaxed">
                  {altNames.slice(0, 3).join(" • ")}
                  {altNames.length > 3 && (
                    <span className="text-gray-500 text-[11px] ml-1.5 font-normal">
                      (+{altNames.length - 3} tên khác)
                    </span>
                  )}
                </span>
              </div>
            )}

            {/* THỜI GIAN CẬP NHẬT GẦN NHẤT */}
            {formattedModified && (
              <div className="mt-2.5 text-xs text-gray-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-500" />
                <span>Cập nhật gần nhất: {formattedModified}</span>
              </div>
            )}

            {/* BẢNG THÔNG TIN CHI TIẾT TINH GỌN (STREAMLINED METADATA) */}
            {(categoryList.length > 0 || countryList.length > 0 || directorList.length > 0 || actorList.length > 0) && (
              <div className="mt-6 pt-5 border-t border-white/10 space-y-3 text-xs sm:text-sm">
                {/* THỂ LOẠI */}
                {categoryList.length > 0 && (
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-gray-400 font-medium min-w-[75px] flex-shrink-0 text-xs uppercase tracking-wider">
                      Thể loại:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {categoryList.map((cat, idx) => (
                        <Link
                          key={cat.slug || idx}
                          href={
                            cat.slug
                              ? `/?category=${cat.slug}`
                              : `/?keyword=${encodeURIComponent(cat.name)}`
                          }
                          className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/15 text-gray-200 hover:text-white text-xs transition border border-white/10 hover:border-white/25"
                        >
                          {cat.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* QUỐC GIA */}
                {countryList.length > 0 && (
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-gray-400 font-medium min-w-[75px] flex-shrink-0 text-xs uppercase tracking-wider">
                      Quốc gia:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {countryList.map((cnt, idx) => (
                        <Link
                          key={cnt.slug || idx}
                          href={
                            cnt.slug
                              ? `/?country=${cnt.slug}`
                              : `/?keyword=${encodeURIComponent(cnt.name)}`
                          }
                          className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/15 text-gray-200 hover:text-white text-xs transition border border-white/10 hover:border-white/25"
                        >
                          {cnt.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* ĐẠO DIỄN */}
                {directorList.length > 0 && (
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-gray-400 font-medium min-w-[75px] flex-shrink-0 text-xs uppercase tracking-wider">
                      Đạo diễn:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {directorList.slice(0, 4).map((d, idx) => (
                        <ActorChipClient key={idx} name={d} isDirector={true} />
                      ))}
                    </div>
                  </div>
                )}

                {/* DIỄN VIÊN */}
                {actorList.length > 0 && (
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-gray-400 font-medium min-w-[75px] flex-shrink-0 text-xs uppercase tracking-wider">
                      Diễn viên:
                    </span>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {actorList.slice(0, 8).map((a, idx) => (
                        <ActorChipClient key={idx} name={a} isDirector={false} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </WatchController>

      {/* ĐÁNH GIÁ & BÌNH LUẬN CỘNG ĐỒNG */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-10">
        <MovieCommentsSection
          movieSlug={movie.slug}
          movieTitle={title}
          currentEpisodeSlug={activeEpisode?.slug}
          currentEpisodeName={activeEpisode?.name}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-10">
        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold flex items-center gap-2">
              <span>Nana Gợi Ý Cho Bạn</span>
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Nana đã chọn lọc những bộ phim cùng thể loại và quốc gia phù hợp nhất với gu xem của bạn.
            </p>
          </div>
        </div>

        <Suspense fallback={<RecommendationSkeleton />}>
          <MovieRecommendationsClient
            currentMovieSlug={movie.slug}
            currentMovieTitle={title}
            categories={categoryList}
            countries={countryList}
            primaryActor={actorList.length > 0 ? actorList[0] : undefined}
            primaryDirector={directorList.length > 0 ? directorList[0] : undefined}
            year={movie.year}
            type={movie.type}
            contentText={movie.content || ""}
          />
        </Suspense>
      </div>

      <Footer />
    </div>
  );
}

