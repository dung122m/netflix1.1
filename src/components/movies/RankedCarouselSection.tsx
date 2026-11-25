"use client";

import React from "react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { CarouselContainer } from "@/components/ui/CarouselContainer";
import { NumberedRankCard } from "@/components/movies/NumberedRankCard";
import { MOVIE_CARD_TOKENS } from "@/lib/cardDimensions";
import { MovieCardSkeleton } from "@/components/ui/MovieCardSkeleton";

export interface RankedMovieData {
  slug: string;
  title: string;
  origin_name?: string;
  poster_url?: string;
  thumb_url?: string;
  year?: string | number;
  quality?: string;
  secondaryTag?: string;
  type?: string;
  tmdbId?: string | number;
}

export interface RankedCarouselSectionProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  iconBadge?: boolean;
  trailingBadge?: React.ReactNode;
  actions?: React.ReactNode;
  items: RankedMovieData[];
  loading?: boolean;
  isFading?: boolean;
  emptyIcon?: React.ReactNode;
  emptyMessage?: string;
  emptySubmessage?: string;
  theme?: "red" | "amber";
  ariaLabel?: string;
  resetTrigger?: unknown;
}

export const RankedCarouselSection: React.FC<RankedCarouselSectionProps> = React.memo(
  function RankedCarouselSection({
    title,
    subtitle,
    icon,
    iconBadge = false,
    trailingBadge,
    actions,
    items,
    loading = false,
    isFading = false,
    emptyIcon,
    emptyMessage = "Chưa có phim phù hợp trong danh mục này.",
    emptySubmessage,
    theme = "red",
    ariaLabel = "Bảng xếp hạng phim",
    resetTrigger,
  }) {
    return (
      <section
        className="relative select-none"
        aria-label={ariaLabel}
      >
        {/* HEADER SECTION */}
        <SectionHeader
          title={title}
          icon={icon}
          iconBadge={iconBadge}
          trailingBadge={trailingBadge}
          subtitle={subtitle}
          actions={actions}
        />

        {/* HORIZONTAL SCROLL CAROUSEL */}
        <CarouselContainer
          resetTrigger={resetTrigger}
          watchTrigger={items}
          cardSelector=".snap-start"
          boundaryThreshold={8}
          navOffsetClass="top-[40%]"
          leftAriaLabel={`Cuộn ${title} sang trái`}
          rightAriaLabel={`Cuộn ${title} sang phải`}
          className="items-center gap-2 sm:gap-3.5 md:gap-4 px-3 sm:px-6 scroll-pl-3 sm:scroll-pl-6 py-4 sm:py-5"
          style={{
            opacity: isFading ? 0.4 : 1,
            transition: "opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {loading && items.length === 0 ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="flex-none flex items-start"
              >
                <div className={`${MOVIE_CARD_TOKENS.ranked.numberCol} shrink-0`} />
                <div className={`${MOVIE_CARD_TOKENS.ranked.posterWidth} shrink-0`}>
                  <MovieCardSkeleton aspect="poster" rounded="xl" />
                </div>
              </div>
            ))
          ) : items.length === 0 ? (
            <div className="w-full py-12 flex flex-col items-center justify-center text-center px-4">
              {emptyIcon}
              <p className="text-sm font-medium text-zinc-400">
                {emptyMessage}
              </p>
              {emptySubmessage && (
                <p className="text-xs text-zinc-400 mt-1">
                  {emptySubmessage}
                </p>
              )}
            </div>
          ) : (
            items.map((movie, index) => (
              <NumberedRankCard
                key={movie.slug || `ranked-card-${index}`}
                rank={index + 1}
                slug={movie.slug}
                title={movie.title}
                origin_name={movie.origin_name}
                poster_url={movie.poster_url}
                thumb_url={movie.thumb_url}
                year={movie.year}
                quality={movie.quality}
                secondaryTag={movie.secondaryTag}
                priority={index < 5}
                theme={theme}
                type={movie.type}
                tmdbId={movie.tmdbId}
              />
            ))
          )}
        </CarouselContainer>
      </section>
    );
  }
);

export default RankedCarouselSection;

