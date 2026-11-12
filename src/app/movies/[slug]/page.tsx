import { Suspense } from "react";
import Link from "next/link";
import { Film } from "lucide-react";

/**
 * ISR / Edge Cache: Cache response HTML công khai 5 phút trên Vercel Edge / CDN.
 * Cho phép cập nhật luồng phát mới nhanh chóng mà vẫn bảo vệ máy chủ khỏi bùng nổ lệnh GET.
 */
export const revalidate = 300;

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { WatchPlayerHost } from "@/components/cinema/WatchPlayerHost";
import { EpisodeList } from "@/components/movies/EpisodeList";
import { ResumeEpisodeBanner } from "@/components/movies/ResumeEpisodeBanner";
import { WatchController } from "@/components/cinema/WatchController";
import { WatchStage } from "@/components/cinema/WatchStage";
import { WatchSidebarTabs } from "@/components/cinema/WatchSidebarTabs";
import { ServerSelector } from "@/components/cinema/ServerSelector";
import { EpisodeCountBadge } from "@/components/movies/ActiveEpisodeBadge";
import { MovieReviewsContainer } from "@/components/MovieReviews/MovieReviewsContainer";
import { MovieRecommendationsClient } from "@/components/movies/MovieRecommendationsClient";
import { MovieCastGallery } from "@/components/movies/MovieCastGallery";
import { MobileMovieNav } from "@/components/movies/MobileMovieNav";
import { getTmdbMovieCredits } from "@/services/tmdbService";
import {
  buildMovieMetadata,
  buildMovieDetailPageData,
} from "@/services/movies/detailPageData";
import { MovieNotFoundView } from "@/components/movies/detail/MovieNotFoundView";
import { MovieInfoHeaderAndToolbar } from "@/components/movies/detail/MovieInfoHeaderAndToolbar";
import { MovieSynopsisAndFactsSection } from "@/components/movies/detail/MovieSynopsisAndFactsSection";

// =========================================================================
// BỘ THÀNH PHẦN STREAMING BẤT ĐỒNG BỘ (SUSPENSE NON-BLOCKING CHO TMDB DATA)
// =========================================================================

async function MovieCastSectionAsync({
  tmdbId,
  tmdbType,
  actorList,
}: {
  tmdbId?: string | number | null;
  tmdbType?: string;
  actorList: string[];
}) {
  const cast = tmdbId
    ? await getTmdbMovieCredits(tmdbId, tmdbType).catch(() => [])
    : [];
  return <MovieCastGallery cast={cast} fallbackActors={actorList} />;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return buildMovieMetadata(slug);
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

  const pageData = await buildMovieDetailPageData(slug, { ep, server });
  if (!pageData) {
    return <MovieNotFoundView />;
  }

  const {
    movie,
    title,
    description,
    actorList,
    directorList,
    categoryList,
    countryList,
    altNames,
    arrayCategories,
    arrayCountries,
    tmdbScore,
    tmdbVotesText,
    imdbScore,
    imdbVotesText,
    effectivePosterUrl,
    effectiveThumbUrl,
    effectiveTrailerUrl,
    bestImagePoster,
    bestImageHero,
    tmdbId,
    tmdbType,
    isChieuRap,
    viewCount,
    formattedModified,
    episodeServers,
    serverSummaries,
    currentServerIndex,
    serverData,
    isTrailerOnly,
    isSingleEpisode,
    cleanDuration,
    currentEpNum,
    totalEpNum,
    isCompleted,
    hasProgress,
    progressPercent,
    activeEpisode,
    videoLink,
    embedSrc,
    rawM3u8,
    primaryGenreSlug,
    primaryGenreName,
    isSeries,
    jsonLd,
  } = pageData;

  const castSlot =
    actorList.length > 0 || tmdbId ? (
      <Suspense fallback={<MovieCastGallery cast={[]} fallbackActors={actorList} />}>
        <MovieCastSectionAsync
          tmdbId={tmdbId}
          tmdbType={tmdbType}
          actorList={actorList}
        />
      </Suspense>
    ) : undefined;

  return (
    <div className="page-cinema-container min-h-dvh pb-0 lg:pb-0 w-full max-w-full overflow-x-clip">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />

      <WatchController
        movieSlug={movie.slug}
        movieTitle={title}
        posterUrl={effectivePosterUrl}
        thumbUrl={effectiveThumbUrl}
        year={movie.year}
        quality={movie.quality}
        category={
          categoryList.map((c) => c.name).filter(Boolean).join(", ") ||
          (arrayCategories[0]?.name ?? "")
        }
        country={
          countryList.map((c) => c.name).filter(Boolean).join(", ") ||
          (arrayCountries[0]?.name ?? "")
        }
        type={movie.type}
        actor={actorList.slice(0, 10)}
        initialServers={episodeServers}
        initialServerIndex={currentServerIndex}
        initialEpisodeSlug={activeEpisode?.slug || serverData[0]?.slug}
        tmdbId={tmdbId}
        isSeries={isSeries}
        isTrailerOnly={isTrailerOnly}
      >
        <div className="max-w-[1700px] mx-auto px-2 sm:px-4 md:px-6 lg:px-8 pt-[56px] md:pt-[66px]">
          {/* BREADCRUMB */}
          <div className="py-2 px-0 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-zinc-500 overflow-hidden">
            <Link href="/" className="hover:text-zinc-300 transition">
              Trang chủ
            </Link>
            <span className="text-zinc-700 select-none">/</span>
            {primaryGenreSlug && (
              <>
                <Link
                  href={`/browse?category=${encodeURIComponent(primaryGenreSlug)}`}
                  prefetch={false}
                  className="hover:text-zinc-300 transition"
                >
                  {primaryGenreName}
                </Link>
                <span className="text-zinc-700 select-none">/</span>
              </>
            )}
            <span className="text-zinc-300 font-medium truncate min-w-0 flex-1 sm:flex-initial sm:max-w-none">
              {title}
            </span>
          </div>

          {/* DYNAMIC WATCH STAGE: SUPPORTS YOUTUBE 2-COLUMN & FULL-WIDTH THEATER MODE */}
          <div className="mt-1">
            <WatchStage
              player={
                <div className="space-y-2.5 sm:space-y-3">
                  {/* BANNER XEM TIẾP NẾU CÓ TẬP XEM DỞ TRƯỚC ĐÓ */}
                  <ResumeEpisodeBanner
                    movieSlug={movie.slug}
                    activeEpisodeSlug={activeEpisode?.slug}
                  />

                  {/* 1. CINEMA PLAYER & MULTI-SERVER HOST */}
                  <div className="w-full">
                    <WatchPlayerHost
                      embedSrc={embedSrc}
                      videoLink={videoLink}
                      m3u8Link={rawM3u8}
                      trailerUrl={effectiveTrailerUrl || movie.trailer_url}
                      title={title}
                      movieSlug={movie.slug}
                      activeEpisodeName={activeEpisode?.name}
                      activeEpisodeSlug={activeEpisode?.slug}
                      isTrailerOnly={isTrailerOnly}
                      posterUrl={bestImageHero}
                      initialTime={t ? parseFloat(t) : undefined}
                      tmdbId={movie.tmdb?.id}
                      isSeries={isSeries}
                    />
                  </div>
                </div>
              }
              mainContent={
                <>
                  {/* 2. MOVIE HEADER & ACTION TOOLBAR */}
                  <MovieInfoHeaderAndToolbar
                    movieSlug={movie.slug}
                    title={title}
                    originName={movie.origin_name}
                    activeEpisodeName={activeEpisode?.name}
                    isTrailerOnly={isTrailerOnly}
                    quality={movie.quality}
                    year={movie.year}
                    cleanDuration={cleanDuration}
                    lang={movie.lang}
                    tmdbScore={tmdbScore}
                    tmdbVotesText={tmdbVotesText}
                    imdbScore={imdbScore}
                    imdbVotesText={imdbVotesText}
                    isChieuRap={isChieuRap}
                    isCompleted={isCompleted}
                    viewCount={viewCount}
                    effectiveTrailerUrl={effectiveTrailerUrl}
                    bestImagePoster={bestImagePoster}
                    primaryCategoryName={arrayCategories[0]?.name}
                    isSeries={isSeries}
                    hasProgress={hasProgress}
                    currentEpNum={currentEpNum}
                    totalEpNum={totalEpNum}
                    progressPercent={progressPercent}
                    showtimes={movie.showtimes}
                    notify={movie.notify}
                  />

                  {/* MOBILE NAVIGATION BAR (TẬP PHIM · THÔNG TIN · BÌNH LUẬN · ĐỀ XUẤT) */}
                  <MobileMovieNav isSeries={!isSingleEpisode} />

                  {/* 3. MOBILE-FIRST NGUỒN PHÁT & DANH SÁCH TẬP PHIM (< 1024px) */}
                  <div
                    id="section-episodes"
                    className="scroll-mt-[116px] sm:scroll-mt-[124px] lg:hidden py-4 border-b border-white/[0.08] space-y-3"
                  >
                    <ServerSelector
                      servers={serverSummaries}
                      initialServerIndex={currentServerIndex}
                    />

                    {!isSingleEpisode && (
                      <div className="pt-3 border-t border-white/[0.08] space-y-3">
                        <div className="flex items-center justify-between pb-1">
                          <h3 className="text-base font-bold flex items-center gap-2 text-white">
                            <Film className="w-4 h-4 text-red-500 shrink-0" />
                            <span>Danh sách tập</span>
                          </h3>
                          <EpisodeCountBadge
                            initialCount={serverData.length}
                            isTrailerOnly={isTrailerOnly}
                          />
                        </div>

                        <EpisodeList
                          movieSlug={movie.slug}
                          activeEpisodeSlug={activeEpisode?.slug}
                        />
                      </div>
                    )}
                  </div>

                  {/* 4. TÓM TẮT CỐT TRUYỆN, DIỄN VIÊN & THÔNG TIN CHI TIẾT */}
                  <MovieSynopsisAndFactsSection
                    description={description}
                    originName={movie.origin_name}
                    altNames={altNames}
                    formattedModified={formattedModified}
                    categoryList={categoryList}
                    countryList={countryList}
                    directorList={directorList}
                    actorCount={actorList.length}
                    castSlot={castSlot}
                  />

                  {/* 5. BÌNH LUẬN & ĐÁNH GIÁ (NẰM Ở CUỐI CỘT TRÁI THEO FLOW YOUTUBE CHUẨN) */}
                  <div
                    id="section-reviews"
                    className="scroll-mt-[116px] sm:scroll-mt-[124px] pt-2"
                  >
                    <MovieReviewsContainer
                      movieSlug={movie.slug}
                      movieTitle={title}
                      currentEpisodeSlug={activeEpisode?.slug}
                      currentEpisodeName={activeEpisode?.name}
                      tmdbId={movie.tmdb?.id}
                      tmdbType={movie.tmdb?.type || movie.type}
                    />
                  </div>

                  {/* 6. MOBILE-ONLY RECOMMENDATIONS (< 1024px) */}
                  <div
                    id="section-recommendations"
                    className="scroll-mt-[116px] sm:scroll-mt-[124px] lg:hidden mt-6"
                  >
                    <MovieRecommendationsClient
                      currentMovieSlug={movie.slug}
                      currentMovieTitle={title}
                      categories={categoryList}
                      countries={countryList}
                      primaryActor={actorList[0]}
                      primaryDirector={directorList[0]}
                      year={movie.year}
                      type={movie.type}
                      tmdbId={tmdbId}
                      tmdbType={tmdbType}
                      contentText={movie.content || movie.description || ""}
                      variant="grid"
                    />
                  </div>
                </>
              }
              sidebar={
                <WatchSidebarTabs
                  isSingleEpisode={isSingleEpisode}
                  serverSelector={
                    <ServerSelector
                      servers={serverSummaries}
                      initialServerIndex={currentServerIndex}
                    />
                  }
                  episodeCountBadge={
                    <EpisodeCountBadge
                      initialCount={serverData.length}
                      isTrailerOnly={isTrailerOnly}
                    />
                  }
                  episodeList={
                    <EpisodeList
                      movieSlug={movie.slug}
                      activeEpisodeSlug={activeEpisode?.slug}
                      movieTitle={title}
                      moviePoster={bestImagePoster}
                      movieYear={movie.year}
                      movieQuality={movie.quality}
                      movieCategory={arrayCategories[0]?.name}
                    />
                  }
                  recommendations={
                    <MovieRecommendationsClient
                      currentMovieSlug={movie.slug}
                      currentMovieTitle={title}
                      categories={categoryList}
                      countries={countryList}
                      primaryActor={actorList[0]}
                      primaryDirector={directorList[0]}
                      year={movie.year}
                      type={movie.type}
                      tmdbId={tmdbId}
                      tmdbType={tmdbType}
                      contentText={movie.content || movie.description || ""}
                      variant="sidebar"
                    />
                  }
                />
              }
            />
          </div>
        </div>
      </WatchController>

      <Footer />
    </div>
  );
}
