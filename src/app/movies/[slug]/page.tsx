import React, { Suspense } from "react";
import { movieApi } from "@/services/movieApi";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  buildMovieDescriptionFallback,
  pickBestMovieImage,
} from "@/lib/movieMedia";
import { cleanHtmlText } from "@/lib/cleanHtml";

import {
  Calendar,
  BellRing,
  Clock,
} from "lucide-react";
import { MovieSynopsis } from "@/components/MovieSynopsis";
import { ShareButton } from "@/components/ShareButton";
import { RecommendationTabs } from "@/components/RecommendationTabs";
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
import { formatEpisodeName } from "@/lib/formatEpisode";

const MobileQrModal = dynamic(
  () => import("@/components/MobileQrModal").then((mod) => mod.MobileQrModal),
);

const ReportIssueModal = dynamic(
  () => import("@/components/ReportIssueModal").then((mod) => mod.ReportIssueModal),
);

const TrailerModal = dynamic(
  () => import("@/components/TrailerModal").then((mod) => mod.TrailerModal),
);

const SetTitleClient = dynamic(() =>
  import("@/components/SetTitleClient").then((mod) => mod.default),
);

const MovieCommentsSection = dynamic(
  () =>
    import("@/components/MovieReviews/MovieCommentsSection").then(
      (mod) => mod.MovieCommentsSection,
    ),
);


export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  try {
    const { slug } = await params;
    const data = await movieApi.getMovieDetail(slug);

    const rawTitle = data?.movie?.name || data?.movie?.title || "Phim";
    return { title: `Nanaflix - ${rawTitle}` };
  } catch {
    return { title: "Nanaflix - Phim" };
  }
}

export default async function MovieDetail({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ep?: string; server?: string }>;
}) {
  const { slug } = await params;
  const { ep, server } = await searchParams;

  const data = await movieApi.getMovieDetail(slug);
  if (!data || !data.movie) {
    return (
      <div className="text-white text-center mt-20">
        <h1>Lỗi API rồi! Hãy xem Terminal (màn hình đen) để biết chi tiết.</h1>
        <pre className="text-left bg-gray-900 p-4 mt-4 overflow-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
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

  // Đánh giá IMDb & TMDB
  const imdbScore = movie.imdb?.vote_average ? Number(movie.imdb.vote_average) : undefined;
  const imdbVotes = movie.imdb?.vote_count ? Number(movie.imdb.vote_count) : undefined;
  const imdbId = movie.imdb?.id;
  const tmdbScore = movie.tmdb?.vote_average ? Number(movie.tmdb.vote_average) : undefined;

  // Cờ Chiếu rạp & Độc quyền
  const isChieuRap = Boolean(
    movie.chieurap === true ||
      movie.chieurap === "true" ||
      movie.chieurap === 1 ||
      movie.chieu_rap === true
  );
  const isSubDocQuyen = Boolean(
    movie.sub_docquyen === true ||
      movie.sub_docquyen === "true" ||
      movie.sub_docquyen === 1 ||
      movie.doc_quyen === true
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

  // Trạng thái bản quyền chính thức
  const isCopyright = Boolean(movie.is_copyright);

  const episodeServers = episodes || [];
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
    ? serverData.find((tap: { slug?: string }) => tap.slug === ep)
    : serverData[0];
  const videoLink = activeEpisode?.link_embed || activeEpisode?.link_m3u8;
  const embedSrc = activeEpisode?.link_embed;
  const rawM3u8 = activeEpisode?.link_m3u8
    || (activeEpisode as Record<string, string | undefined>)?.m3u8
    || (activeEpisode as Record<string, string | undefined>)?.file;

  const primaryGenreSlug = movie.category?.[0]?.slug;
  const primaryCountrySlug = movie.country?.[0]?.slug;
  const primaryActor = actorList.length > 0 ? actorList[0] : undefined;

  return (
    <div className="page-cinema-container min-h-screen pb-12">
      <Navbar />
      <SetTitleClient title={title} />
      <TrackHistoryClient
        slug={movie.slug}
        title={title}
        poster={pickBestMovieImage(movie, "/default-hero.jpg")}
        episodeName={activeEpisode?.name}
        episodeSlug={activeEpisode?.slug}
        year={movie.year}
        quality={movie.quality}
        category={movie.category?.[0]?.name}
      />

      <WatchController
        movieSlug={movie.slug}
        movieTitle={title}
        posterUrl={pickBestMovieImage(movie, "/default-hero.jpg")}
        year={movie.year}
        quality={movie.quality}
        category={movie.category?.[0]?.name}
        initialServers={episodeServers}
        initialServerIndex={currentServerIndex}
        initialEpisodeSlug={ep || serverData[0]?.slug}
        isTrailerOnly={isTrailerOnly}
      >
        <div className="w-full pt-[56px] md:pt-[66px] bg-black px-2 sm:px-4 md:px-8">
          {/* BANNER XEM TIẾP NẾU CÓ TẬP XEM DỞ TRƯỚC ĐÓ */}
          <ResumeEpisodeBanner
            movieSlug={movie.slug}
            activeEpisodeSlug={activeEpisode?.slug}
          />

        {/* BREADCRUMB */}
        <div className="max-w-7xl mx-auto py-1.5 flex items-center gap-2 text-xs sm:text-sm text-gray-400">
          <Link href="/browse" className="hover:text-white transition">
            Trang chủ
          </Link>
          <span className="text-gray-600">/</span>
          {primaryGenreSlug && (
            <>
              <Link
                href={`/browse?category=${primaryGenreSlug}`}
                className="hover:text-white transition"
              >
                {movie.category?.[0]?.name || "Thể loại"}
              </Link>
              <span className="text-gray-600">/</span>
            </>
          )}
          <span className="text-gray-200 font-medium truncate max-w-[220px] sm:max-w-none">
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
          episodes={serverData}
        />
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-8 mt-6 sm:mt-8 md:mt-10 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        <div className="lg:col-span-8 space-y-5 sm:space-y-6">
          <div className="rounded-3xl border border-white/15 bg-gradient-to-b from-zinc-900/80 via-zinc-950/85 to-black/90 p-5 sm:p-6 md:p-8 backdrop-blur-xl shadow-2xl">
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold leading-tight">
              <span>{title}</span>{" "}
              {movie.origin_name && movie.origin_name !== title && (
                <span className="text-sm sm:text-lg md:text-2xl text-gray-400 font-normal block sm:inline">
                  ({movie.origin_name})
                </span>
              )}{" "}
              <span className="text-base sm:text-xl md:text-3xl text-gray-400 font-normal">
                {isTrailerOnly
                  ? "• Trailer"
                  : `• ${formatEpisodeName(activeEpisode?.name, "Tập 1")}`}
              </span>
            </h1>

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

            {/* THANH NÚT TÁC VỤ THOÁNG ĐÃNG & RÕ RÀNG (ACTION TOOLBAR) */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-4 sm:mt-5 pt-3.5 border-t border-white/10">
              {/* Nút Xem Trailer */}
              <TrailerModal trailerUrl={movie.trailer_url} title={title} />

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


              {/* Cụm tiện ích phụ tinh gọn: Chia sẻ, Xem trên điện thoại, Báo lỗi */}
              <div className="flex items-center gap-1.5 sm:gap-2 ml-auto sm:ml-0">
                <ShareButton title={title} />
                <MobileQrModal
                  title={title}
                  movieSlug={slug}
                  activeEpisodeSlug={activeEpisode?.slug}
                  activeEpisodeName={activeEpisode?.name}
                />
                <ReportIssueModal movieTitle={title} episodeName={activeEpisode?.name} />
              </div>
            </div>

            {/* TIẾN ĐỘ PHÁT SÓNG (DÀNH CHO PHIM BỘ) */}
            {hasProgress && (
              <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3.5">
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
                    className="bg-gradient-to-r from-netflix-red to-rose-500 h-full rounded-full transition-all duration-500"
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

            <MovieSynopsis
              synopsis={description}
              originName={movie.origin_name}
            />

            {/* TÊN GỌI KHÁC NẾU CÓ TỪ API */}
            {altNames.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center gap-1.5 text-xs text-gray-400">
                <span className="text-gray-500 font-semibold uppercase tracking-wider text-[11px] mr-1">
                  Tên gọi khác:
                </span>
                {altNames.map((name, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-gray-300 font-medium"
                  >
                    {name}
                  </span>
                ))}
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
              <div className="mt-6 pt-5 border-t border-white/10 space-y-2.5 text-xs sm:text-sm">
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
                              ? `/browse?category=${cat.slug}`
                              : `/browse?keyword=${encodeURIComponent(cat.name)}`
                          }
                          className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/15 text-gray-200 hover:text-white text-xs transition border border-white/10 hover:border-white/20"
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
                              ? `/browse?country=${cnt.slug}`
                              : `/browse?keyword=${encodeURIComponent(cnt.name)}`
                          }
                          className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/15 text-gray-200 hover:text-white text-xs transition border border-white/10 hover:border-white/20"
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
                    <div className="flex flex-wrap gap-1.5">
                      {actorList.slice(0, 10).map((a, idx) => (
                        <ActorChipClient key={idx} name={a} isDirector={false} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="rounded-3xl border border-white/15 bg-gradient-to-b from-zinc-900/80 via-zinc-950/85 to-black/90 p-4 sm:p-5 md:p-6 h-fit max-lg:max-h-none max-lg:overflow-visible lg:max-h-[680px] lg:overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-zinc-500 lg:pr-2 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <span>Danh sách tập</span>
              </h3>
              <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-gray-300 font-medium">
                {serverData.length > 0 ? `${serverData.length} tập` : "Trailer"}
              </span>
            </div>

            {/* THANH CHUYỂN SERVER NẾU PHIM CÓ NHIỀU NGUỒN PHÁT (0MS SWITCHING) */}
            <ServerSelector
              servers={episodeServers}
              initialServerIndex={currentServerIndex}
            />

            <EpisodeList
              movieSlug={movie.slug}
              episodes={serverData}
              activeEpisodeSlug={activeEpisode?.slug}
            />
          </div>
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
          <AsyncRecommendations
            currentMovieSlug={movie.slug}
            currentMovieTitle={title}
            primaryGenreSlug={primaryGenreSlug}
            primaryCountrySlug={primaryCountrySlug}
            primaryActor={primaryActor}
            genreName={movie.category?.[0]?.name}
            countryName={movie.country?.[0]?.name}
          />
        </Suspense>
      </div>

      <Footer />
    </div>
  );
}

// Tải ngầm đề xuất phim không làm chậm quá trình nạp Player xem phim
async function AsyncRecommendations({
  currentMovieSlug,
  currentMovieTitle,
  primaryGenreSlug,
  primaryCountrySlug,
  primaryActor,
  genreName,
  countryName,
}: {
  currentMovieSlug: string;
  currentMovieTitle: string;
  primaryGenreSlug?: string;
  primaryCountrySlug?: string;
  primaryActor?: string;
  genreName?: string;
  countryName?: string;
}) {
  const [byGenre, byCountry, byActor] = await Promise.all([
    primaryGenreSlug
      ? movieApi.getMovies({ category: primaryGenreSlug, page: 1, limit: 16 })
      : Promise.resolve(null),
    primaryCountrySlug
      ? movieApi.getMovies({ country: primaryCountrySlug, page: 1, limit: 16 })
      : Promise.resolve(null),
    primaryActor
      ? movieApi.getMovies({ keyword: primaryActor, page: 1, limit: 12 })
      : Promise.resolve(null),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recommendationPool: any[] = [];
  if (byGenre?.items) recommendationPool.push(...byGenre.items);
  if (byCountry?.items) recommendationPool.push(...byCountry.items);
  if (byActor?.items) recommendationPool.push(...byActor.items);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deduped = new Map<string, any>();
  for (const item of recommendationPool) {
    if (!item?.slug || item.slug === currentMovieSlug) continue;
    if (!deduped.has(item.slug)) deduped.set(item.slug, item);
  }
  const recommendedMovies = Array.from(deduped.values()).slice(0, 24);

  return (
    <RecommendationTabs
      currentMovieTitle={currentMovieTitle}
      genreName={genreName}
      countryName={countryName}
      actorName={primaryActor}
      genreMovies={byGenre?.items || []}
      countryMovies={byCountry?.items || []}
      actorMovies={byActor?.items || []}
      allMovies={recommendedMovies}
    />
  );
}

function RecommendationSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex gap-2">
        <div className="h-9 w-28 bg-zinc-800 rounded-full" />
        <div className="h-9 w-28 bg-zinc-900 rounded-full" />
        <div className="h-9 w-28 bg-zinc-900 rounded-full" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-[2/3] bg-zinc-900/80 rounded-2xl border border-white/5" />
        ))}
      </div>
    </div>
  );
}
