"use client";

import React from "react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { CarouselNavButton } from "@/components/ui/CarouselNavButton";
import { NumberedRankCard } from "@/components/movies/NumberedRankCard";
import { useCarouselScroll } from "@/components/ui/useCarouselScroll";
import { MOVIE_CARD_TOKENS } from "@/lib/cardDimensions";

export interface RankedMovieData {
  slug: string;
  title: string;
  origin_name?: string;
  poster_url?: string;
  thumb_url?: string;
  year?: string | number;
  quality?: string;
  secondaryTag?: string;
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
    const {
      scrollRef,
      canScrollLeft,
      canScrollRight,
      checkScroll,
      handleScroll,
    } = useCarouselScroll<HTMLDivElement>({
      resetTrigger,
      watchTrigger: items,
      cardSelector: ".snap-start",
      boundaryThreshold: 8,
    });

    return (
      <section
        className="relative my-8 sm:my-12 select-none"
        aria-label={ariaLabel}
        style={{
          contentVisibility: "auto",
          containIntrinsicSize: "auto 480px",
        }}
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
        <div className="relative group/row">
          {/* NÚT CUỘN TRÁI / PHẢI: FLOATING GLASS CHUẨN ĐỒNG BỘ */}
          <CarouselNavButton
            direction="left"
            onClick={() => handleScroll("left")}
            visible={canScrollLeft}
            ariaLabel={`Cuộn ${title} sang trái`}
            topOffsetClass="top-[40%]"
          />

          <CarouselNavButton
            direction="right"
            onClick={() => handleScroll("right")}
            visible={canScrollRight}
            ariaLabel={`Cuộn ${title} sang phải`}
            topOffsetClass="top-[40%]"
          />

          {/* MOBILE SUBTLE GRADIENT FADE AFFORDANCE */}
          {canScrollLeft && (
            <div
              className="sm:hidden absolute left-0 top-4 bottom-4 w-6 bg-gradient-to-r from-black via-black/60 to-transparent pointer-events-none z-20 transition-opacity duration-200"
              aria-hidden="true"
            />
          )}
          {canScrollRight && (
            <div
              className="sm:hidden absolute right-0 top-4 bottom-4 w-8 bg-gradient-to-l from-black via-black/60 to-transparent pointer-events-none z-20 transition-opacity duration-200"
              aria-hidden="true"
            />
          )}

          <div
            ref={scrollRef}
            onScroll={checkScroll}
            className="flex items-center gap-2 sm:gap-3.5 md:gap-4 overflow-x-auto overflow-y-hidden px-3 sm:px-6 scroll-pl-3 sm:scroll-pl-6 py-4 sm:py-5 scrollbar-none snap-x snap-mandatory scroll-smooth"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
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
                  <div className={`${MOVIE_CARD_TOKENS.ranked.posterWidth} flex flex-col gap-2 shrink-0`}>
                    <div className="aspect-[2/3] rounded-xl bg-zinc-900/80 animate-pulse" />
                    <div className="h-4 bg-zinc-900/80 rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-zinc-900/60 rounded animate-pulse w-1/2" />
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
                  <p className="text-xs text-zinc-600 mt-1">
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
                />
              ))
            )}
          </div>
        </div>
      </section>
    );
  }
);

export default RankedCarouselSection;

