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
        <div className="w-full px-6 sm:px-10 md:px-16 pb-12 sm:pb-16 md:pb-20">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-xl md:max-w-2xl mx-auto sm:mx-0 flex flex-col items-center sm:items-start text-center sm:text-left space-y-3 sm:space-y-4">
              {/* TIÊU ĐỀ PHIM */}
              <h1
                style={{ color: "#ffffff" }}
                className="hero-cinema-title w-full px-1.5 sm:pl-0.5 sm:pr-2 py-0.5 text-2xl sm:text-5xl md:text-[3.4rem] lg:text-[3.85rem] font-extrabold leading-[1.28] sm:leading-[1.24] text-white line-clamp-2 tracking-tight drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)] text-balance"
              >
                {title}
              </h1>

              {/* HÀNG THÔNG TIN & THỂ LOẠI (THOÁNG NHỊP, TÁCH BẠCH MÀU) */}
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2.5 gap-y-1 text-xs sm:text-sm font-medium text-zinc-200/90 leading-normal">
                  {voteText && (
                    <span className="inline-flex items-center gap-1 text-amber-400 font-semibold tabular-nums">
                      <Star
                        size={12}
                        className="fill-amber-400 text-amber-400"
                      />
                      <span>{voteText}</span>
                    </span>
                  )}

                  {featuredMovie?.year && (
                    <>
                      {voteText && (
                        <span className="text-zinc-500 select-none">·</span>
                      )}
                      <span className="tabular-nums">{featuredMovie.year}</span>
                    </>
                  )}

                  {isEpisodeUseful ? (
                    <>
                      <span className="text-zinc-500 select-none">·</span>
                      <span>{rawEpisode}</span>
                    </>
                  ) : cleanDuration ? (
                    <>
                      <span className="text-zinc-500 select-none">·</span>
                      <span>{cleanDuration}</span>
                    </>
                  ) : null}

                  {heroCountry && (
                    <span className="hidden sm:inline-flex items-center gap-x-2.5">
                      <span className="text-zinc-500 select-none">·</span>
                      <span>{heroCountry}</span>
                    </span>
                  )}

                  {featuredMovie?.lang && (
                    <span className="inline-flex items-center gap-x-2.5">
                      <span className="text-zinc-500 select-none">·</span>
                      <span>{featuredMovie.lang}</span>
                    </span>
                  )}

                  {featuredMovie?.quality && (
                    <span className="hidden sm:inline-flex items-center gap-x-2.5">
                      <span className="text-zinc-500 select-none">·</span>
                      <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                        {featuredMovie.quality}
                      </span>
                    </span>
                  )}
                </div>

                {genresList.length > 0 && (
                  <div className="text-xs sm:text-[13px] text-zinc-400 font-medium line-clamp-1">
                    {genresList.slice(0, 3).join(" · ")}
                  </div>
                )}
              </div>

              {/* TÓM TẮT NỘI DUNG (GIỚI HẠN CHUẨN 2 DÒNG TRÊN DESKTOP) */}
              {displaySynopsis ? (
                <p className="hero-cinema-desc hidden sm:line-clamp-2 max-w-[50ch] text-sm md:text-[15px] leading-relaxed text-zinc-300/90 drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]">
                  {displaySynopsis}
                </p>
              ) : null}

              {/* MOBILE SIGNATURE NETFLIX 3-COLUMN ACTION BAR */}
              <div className="flex sm:hidden items-center justify-between w-full max-w-[330px] pt-1 px-2">
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
              <div className="hidden sm:flex flex-wrap items-center gap-3.5 pt-1.5">
                {featuredMovie?.slug && (
                  <Link
                    href={`/movies/${featuredMovie.slug}`}
                    prefetch={false}
                    className="inline-flex items-center gap-2 rounded-lg bg-white hover:bg-zinc-200 text-black px-6 sm:px-7 py-2.5 sm:py-3 text-sm sm:text-[15px] font-bold transition-all duration-200 active:scale-95 shadow-lg shadow-black/50 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  >
                    <Play size={18} fill="black" className="ml-0.5" />
                    <span>{isTrailerOnly ? "Xem Trailer" : "Xem Ngay"}</span>
                  </Link>
                )}

                <button
                  type="button"
                  onClick={onToggleWatchlist}
                  className="inline-flex items-center gap-2 rounded-lg bg-white/15 hover:bg-white/25 text-white px-5 py-2.5 sm:py-3 text-sm font-semibold backdrop-blur-md transition-all duration-200 active:scale-95 cursor-pointer shadow-md shadow-black/40"
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
            </div>
          </div>
        </div>
      </div>

      {/* NÚT ĐIỀU HƯỚNG & DOTS (Đồng bộ chuẩn CarouselNavButton + Progress tích hợp) */}
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

          <div className="absolute bottom-2 sm:bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 sm:gap-1.5">
            {slides.map((_, i) => {
              const isActive = i === index;
              return (
                <button
                  key={i}
                  type="button"
                  aria-label={`Chuyển slide ${i + 1}`}
                  onClick={() => onGoToSlide(i)}
                  className="py-2.5 px-1 sm:p-1.5 flex items-center justify-center cursor-pointer touch-manipulation focus:outline-none"
                >
                  {isActive ? (
                    <span className="relative h-1.5 w-7 sm:w-9 overflow-hidden rounded-full bg-white/25 shadow-sm shadow-black/50 block">
                      <span
                        key={`progress-${index}-${paused ? "pause" : "play"}-${isTrailerDuration ? "trailer" : "normal"}`}
                        style={
                          paused
                            ? { transform: "scaleX(1)", opacity: 0.85 }
                            : {
                                animation: `heroProgressFill ${
                                  (isTrailerDuration
                                    ? AUTO_SLIDE_TRAILER_MS
                                    : AUTO_SLIDE_NORMAL_MS) / 1000
                                }s linear forwards`,
                              }
                        }
                        className="block h-full w-full rounded-full bg-white origin-left transform-gpu"
                      />
                    </span>
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-white/35 hover:bg-white/75 transition-colors duration-200 block" />
                  )}
                </button>
              );
            })}
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

