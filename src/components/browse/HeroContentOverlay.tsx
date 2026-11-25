"use client";

import React from "react";
import Link from "next/link";
import {
  Check,
  Info,
  Play,
  Plus,
  Star,
  Volume2,
  VolumeX,
} from "lucide-react";
import { CarouselNavButton } from "@/components/ui/CarouselNavButton";
import TrailerModal from "@/components/modals/TrailerModal";
import {
  AUTO_SLIDE_NORMAL_MS,
  AUTO_SLIDE_TRAILER_MS,
  type HeroMovie,
  type HeroMovieMeta,
} from "./heroMovieHelpers";

export interface HeroContentOverlayProps {
  slides: HeroMovie[];
  index: number;
  hasSlid: boolean;
  paused: boolean;
  featuredMovie: HeroMovie | undefined;
  currentSlug: string | undefined;
  meta: HeroMovieMeta;
  inWatchlist: boolean;
  isDesktop: boolean;
  failedTrailerMap: Record<string, boolean>;
  activeTrailerEmbedUrl: string | null;
  isTrailerReady: boolean;
  isHeroMuted: boolean;
  onToggleWatchlist: (e: React.MouseEvent) => void;
  onGoPrev: () => void;
  onGoNext: () => void;
  onGoToSlide: (targetIndex: number) => void;
  onToggleHeroMute: () => void;
}

/**
 * Renders Hero slide typography, metadata badges, mobile 3-column and desktop CTA buttons,
 * slide progress indicator, left/right navigation arrows, dots, and desktop trailer mute button.
 */
export function HeroContentOverlay({
  slides,
  index,
  hasSlid,
  paused,
  featuredMovie,
  currentSlug,
  meta,
  inWatchlist,
  isDesktop,
  failedTrailerMap,
  activeTrailerEmbedUrl,
  isTrailerReady,
  isHeroMuted,
  onToggleWatchlist,
  onGoPrev,
  onGoNext,
  onGoToSlide,
  onToggleHeroMute,
}: HeroContentOverlayProps) {
  const {
    title,
    isTrailerOnly,
    genresList,
    rawEpisode,
    isEpisodeUseful,
    cleanDuration,
    displaySynopsis,
    heroCountry,
    heroType,
    voteText,
  } = meta;

  const isTrailerDuration =
    isDesktop && Boolean(currentSlug && !failedTrailerMap[currentSlug]);

  return (
    <>
      {/* NỘI DUNG CHÍNH (TYPOGRAPHY, BADGES & CTA BUTTONS) */}
      <div
        key={`content-${index}`}
        className={`relative z-10 flex h-full items-end ${
          hasSlid ? "hero-content-enter" : ""
        }`}
      >
        <div className="w-full px-4 sm:px-8 md:px-16 pb-8 sm:pb-16 md:pb-20">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl md:max-w-3xl mx-auto sm:mx-0 flex flex-col items-center sm:items-start text-center sm:text-left space-y-3 sm:space-y-4">
              {/* PHÂN LOẠI PHIM TINH GỌN */}
              {heroType && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-zinc-300">
                    {heroType}
                  </span>
                </div>
              )}

              {/* TIÊU ĐỀ PHIM */}
              <h1
                style={{ color: "#ffffff" }}
                className="hero-cinema-title text-2xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-tight text-white line-clamp-2 tracking-tight drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)] text-balance"
              >
                {title}
              </h1>

              {/* HÀNG THÔNG TIN */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2.5 gap-y-1 text-xs sm:text-sm font-medium text-zinc-300 leading-normal">
                {voteText && (
                  <span className="inline-flex items-center gap-1 text-amber-400/90 font-semibold tabular-nums">
                    <Star
                      size={12}
                      className="fill-amber-400/90 text-amber-400/90"
                    />
                    <span>{voteText}</span>
                  </span>
                )}

                {featuredMovie?.year && (
                  <>
                    <span className="text-zinc-500 select-none">•</span>
                    <span className="text-zinc-300 tabular-nums">
                      {featuredMovie.year}
                    </span>
                  </>
                )}

                {isEpisodeUseful ? (
                  <>
                    <span className="text-zinc-500 select-none">•</span>
                    <span className="text-emerald-400/95 font-medium">
                      {rawEpisode}
                    </span>
                  </>
                ) : cleanDuration ? (
                  <>
                    <span className="text-zinc-500 select-none">•</span>
                    <span className="text-zinc-300">{cleanDuration}</span>
                  </>
                ) : null}

                {featuredMovie?.quality && (
                  <>
                    <span className="text-zinc-500 select-none">•</span>
                    <span className="px-1.5 py-0.5 rounded-[4px] bg-white/5 text-[11px] font-bold text-zinc-200 uppercase tracking-wider backdrop-blur-sm">
                      {featuredMovie.quality}
                    </span>
                  </>
                )}

                {featuredMovie?.lang && (
                  <>
                    <span className="text-zinc-500 select-none">•</span>
                    <span className="text-zinc-300 font-medium">
                      {featuredMovie.lang}
                    </span>
                  </>
                )}

                {heroCountry && (
                  <span className="hidden sm:inline-flex items-center gap-x-2">
                    <span className="text-zinc-500 select-none">•</span>
                    <span className="text-zinc-300">{heroCountry}</span>
                  </span>
                )}
              </div>

              {/* THỂ LOẠI */}
              {genresList.length > 0 && (
                <p className="text-xs sm:text-sm text-zinc-400 font-medium line-clamp-1">
                  {genresList.slice(0, 4).join("  •  ")}
                </p>
              )}

              {/* TÓM TẮT NỘI DUNG */}
              {displaySynopsis ? (
                <p className="hero-cinema-desc hidden sm:block max-w-[50ch] text-xs sm:text-sm md:text-[15px] leading-relaxed text-zinc-300 line-clamp-2 md:line-clamp-3 drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
                  {displaySynopsis}
                </p>
              ) : null}

              {/* MOBILE SIGNATURE NETFLIX 3-COLUMN ACTION BAR */}
              <div className="flex sm:hidden items-center justify-between w-full max-w-[340px] pt-2 px-2">
                <button
                  type="button"
                  onClick={onToggleWatchlist}
                  className="flex flex-col items-center justify-center gap-1 text-white active:scale-90 transition-transform cursor-pointer min-w-[64px]"
                >
                  {inWatchlist ? (
                    <Check size={22} className="text-netflix-red" />
                  ) : (
                    <Plus size={22} className="text-white" />
                  )}
                  <span className="text-xs font-semibold text-zinc-200">
                    {inWatchlist ? "Đã lưu" : "Danh sách"}
                  </span>
                </button>

                {featuredMovie?.slug && (
                  <Link
                    href={`/movies/${featuredMovie.slug}`}
                    prefetch={false}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-white hover:bg-zinc-200 text-black px-8 py-2.5 min-h-[44px] text-sm font-black transition-all active:scale-95 shadow-lg shadow-black/40 cursor-pointer"
                  >
                    <Play size={18} fill="black" className="ml-0.5" />
                    <span>{isTrailerOnly ? "Trailer" : "Phát"}</span>
                  </Link>
                )}

                {featuredMovie?.slug && (
                  <Link
                    href={`/movies/${featuredMovie.slug}`}
                    prefetch={false}
                    className="flex flex-col items-center justify-center gap-1 text-white active:scale-90 transition-transform cursor-pointer min-w-[64px]"
                  >
                    <Info size={22} className="text-white" />
                    <span className="text-xs font-semibold text-zinc-200">
                      Chi tiết
                    </span>
                  </Link>
                )}
              </div>

              {/* DESKTOP CTA BUTTONS */}
              <div className="hidden sm:flex flex-wrap items-center gap-3 pt-2">
                {featuredMovie?.slug && (
                  <Link
                    href={`/movies/${featuredMovie.slug}`}
                    prefetch={false}
                    className="inline-flex items-center gap-2.5 rounded-2xl bg-netflix-red hover:brightness-110 text-white px-7 sm:px-9 py-3.5 sm:py-4 text-xs sm:text-sm md:text-base font-black transition-all duration-200 hover:scale-[1.02] hover:-translate-y-0.5 active:scale-95 shadow-xl shadow-black/60 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  >
                    <Play size={19} fill="white" className="ml-0.5" />
                    <span>{isTrailerOnly ? "Xem Trailer" : "Xem Ngay"}</span>
                  </Link>
                )}

                <button
                  type="button"
                  onClick={onToggleWatchlist}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white px-5 py-3.5 sm:py-4 text-xs sm:text-sm font-bold backdrop-blur-md transition-all duration-200 hover:scale-[1.02] hover:-translate-y-0.5 active:scale-95 cursor-pointer shadow-md shadow-black/40"
                >
                  {inWatchlist ? (
                    <>
                      <Check size={18} className="text-netflix-red" />
                      <span>Đã lưu vào danh sách</span>
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      <span>Danh sách của tôi</span>
                    </>
                  )}
                </button>

                {featuredMovie?.trailer_url && (
                  <TrailerModal
                    trailerUrl={featuredMovie.trailer_url}
                    title={title}
                  />
                )}
              </div>

              {/* THANH TIẾN TRÌNH AUTO-SLIDE (DESKTOP ONLY - GPU COMPOSITED SCALE-X, 0 LAYOUT REFLOW) */}
              {slides.length > 1 && (
                <div className="hidden sm:block pt-3 max-w-sm w-full">
                  <div className="h-1 w-full overflow-hidden rounded-full bg-white/15">
                    <div
                      key={`progress-${index}-${paused ? "pause" : "play"}-${isTrailerDuration ? "trailer" : "normal"}`}
                      style={
                        paused
                          ? { transform: "scaleX(0)" }
                          : {
                              animation: `heroProgressFill ${
                                (isTrailerDuration
                                  ? AUTO_SLIDE_TRAILER_MS
                                  : AUTO_SLIDE_NORMAL_MS) / 1000
                              }s linear forwards`,
                            }
                      }
                      className="h-full w-full rounded-full bg-netflix-red origin-left transform-gpu"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* NÚT ĐIỀU HƯỚNG & DOTS (Đồng bộ chuẩn CarouselNavButton với các hàng phim bên dưới) */}
      {slides.length > 1 && (
        <>
          <CarouselNavButton
            direction="left"
            onClick={onGoPrev}
            ariaLabel="Banner trước"
            topOffsetClass="top-1/2"
            className="left-4 md:left-8 z-20"
            visible={true}
          />
          <CarouselNavButton
            direction="right"
            onClick={onGoNext}
            ariaLabel="Banner tiếp theo"
            topOffsetClass="top-1/2"
            className="right-4 md:right-8 z-20"
            visible={true}
          />

          <div className="absolute bottom-1 sm:bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-0.5 sm:gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Chuyển slide ${i + 1}`}
                onClick={() => onGoToSlide(i)}
                className="py-2.5 px-1 sm:p-2 flex items-center justify-center cursor-pointer touch-manipulation focus:outline-none"
              >
                <span
                  className={`h-1 sm:h-1.5 rounded-full transition-all duration-300 block ${
                    i === index
                      ? "w-6 sm:w-8 bg-netflix-red shadow-sm shadow-black/50"
                      : "w-1.5 sm:w-2 bg-white/30 hover:bg-white/70"
                  }`}
                />
              </button>
            ))}
          </div>

          {isDesktop && activeTrailerEmbedUrl && isTrailerReady && (
            <button
              type="button"
              onClick={onToggleHeroMute}
              aria-label={
                isHeroMuted ? "Bật âm thanh trailer" : "Tắt âm thanh trailer"
              }
              className="absolute bottom-6 right-6 sm:bottom-8 sm:right-8 z-20 hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/75 hover:bg-black text-white text-xs font-bold backdrop-blur-xl transition-all shadow-2xl hover:scale-105 active:scale-95 cursor-pointer"
            >
              {isHeroMuted ? (
                <>
                  <VolumeX size={15} className="text-zinc-300" />
                  <span>Bật tiếng</span>
                </>
              ) : (
                <>
                  <Volume2 size={15} className="text-netflix-red animate-pulse" />
                  <span>Tắt tiếng</span>
                </>
              )}
            </button>
          )}
        </>
      )}
    </>
  );
}

