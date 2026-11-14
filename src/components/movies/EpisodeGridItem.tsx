"use client";

import React from "react";
import Link from "next/link";
import { Check } from "lucide-react";

export interface EpisodeGridItemProps {
  tapSlug: string;
  tapName: string;
  displayLabel: string;
  itemTitle: string;
  isActive: boolean;
  isWatched: boolean;
  isPartiallyWatched: boolean;
  progressPercent: number;
  isHiddenOnMobile: boolean;
  isSingleEpisode: boolean;
  isFewEpisodes: boolean;
  activeItemRef?: React.Ref<HTMLAnchorElement> | null;
  onSelect?: (slug: string) => void;
}

export const EpisodeGridItem = React.memo(function EpisodeGridItem({
  tapSlug,
  displayLabel,
  itemTitle,
  isActive,
  isWatched,
  isPartiallyWatched,
  progressPercent,
  isHiddenOnMobile,
  isSingleEpisode,
  isFewEpisodes,
  activeItemRef,
  onSelect,
}: EpisodeGridItemProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (onSelect) {
      e.preventDefault();
      onSelect(tapSlug);
    }
  };

  return (
    <Link
      ref={activeItemRef}
      href={`?ep=${tapSlug}`}
      prefetch={false}
      scroll={false}
      tabIndex={0}
      aria-current={isActive ? "page" : undefined}
      aria-label={itemTitle}
      onClick={handleClick}
      className={`relative flex items-center justify-center text-center transition-all duration-200 group rounded-xl cursor-pointer select-none outline-none overflow-hidden focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:scale-[1.02] focus-visible:z-20 ${
        isHiddenOnMobile ? "max-lg:hidden" : ""
      } ${
        isSingleEpisode
          ? "py-2.5 px-3 min-h-[38px] text-xs sm:text-sm font-bold"
          : isFewEpisodes
          ? "py-2 px-2 sm:px-2.5 min-h-[36px] text-xs sm:text-[13px] font-bold"
          : "py-2 px-1.5 min-h-[38px] sm:min-h-[34px] text-xs sm:text-[13px] font-bold"
      } ${
        isActive
          ? "bg-gradient-to-br from-netflix-red to-netflix-red/80 text-white font-black shadow-md shadow-black/50 scale-[1.02] ring-1 ring-white/20 z-10"
          : isWatched
          ? "bg-zinc-950/70 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:scale-[1.02]"
          : "bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 hover:text-white hover:scale-[1.02] active:scale-[0.98] shadow-xs"
      }`}
    >
      <div className="flex items-center justify-center gap-1 sm:gap-1.5 w-full min-w-0 px-1">
        {/* Equalizer 3 cột sóng âm sống động khi tập đang phát */}
        {isActive && (
          <span className="flex items-end gap-[2px] h-3 shrink-0" aria-hidden="true">
            <span className="w-[2px] bg-white rounded-full animate-[pulse_0.7s_ease-in-out_infinite] h-2" />
            <span className="w-[2px] bg-white rounded-full animate-[pulse_1.1s_ease-in-out_infinite_0.2s] h-3" />
            <span className="w-[2px] bg-white rounded-full animate-[pulse_0.9s_ease-in-out_infinite_0.4s] h-2" />
          </span>
        )}

        <span className="truncate tracking-tight font-bold whitespace-nowrap">
          {displayLabel}
        </span>

        {/* Khi chỉ có 1 tập duy nhất và đang phát: tag Đang phát */}
        {isSingleEpisode && isActive && (
          <span className="text-[10px] sm:text-[11px] font-semibold text-white/90 shrink-0 ml-1 px-1.5 py-0.5 rounded-full bg-black/25">
            Đang phát
          </span>
        )}

        {/* Icon Checkmark tinh tế cho tập đã xem */}
        {!isActive && isWatched && (
          <span
            aria-label="Đã xem"
            className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0"
          >
            <Check className="w-2.5 h-2.5 stroke-[2.5]" />
          </span>
        )}
      </div>

      {/* Vạch tiến trình mini 2.5px ở đáy nút cho tập đang xem dở */}
      {isPartiallyWatched && progressPercent > 0 && (
        <div
          className="absolute bottom-0 inset-x-0 h-[2.5px] bg-white/15 overflow-hidden pointer-events-none"
          aria-hidden="true"
        >
          <div
            className="h-full bg-netflix-red rounded-r-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </Link>
  );
});

export default EpisodeGridItem;
