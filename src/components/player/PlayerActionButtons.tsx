"use client";

import React from "react";
import Link from "next/link";
import {
  Maximize2,
  Minimize2,
  Moon,
  Sun,
  Keyboard,
  SkipBack,
  SkipForward,
} from "lucide-react";

interface EpisodeItem {
  name?: string;
  slug?: string;
  link_embed?: string;
  link_m3u8?: string;
}

interface PlayerActionButtonsProps {
  isTheaterMode: boolean;
  onToggleTheaterMode: () => void;
  isLightsOff: boolean;
  onToggleLightsOff: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenShortcuts: () => void;
  prevEpisode: EpisodeItem | null;
  nextEpisode: EpisodeItem | null;
  onSwitchEpisode?: (slug: string) => void;
  isSticky?: boolean;
}

export const PlayerActionButtons: React.FC<PlayerActionButtonsProps> = React.memo(
  function PlayerActionButtons({
    isTheaterMode,
    onToggleTheaterMode,
    isLightsOff,
    onToggleLightsOff,
    isFullscreen,
    onToggleFullscreen,
    onOpenShortcuts,
    prevEpisode,
    nextEpisode,
    onSwitchEpisode,
    isSticky = false,
  }) {
    const hasEpisodes = Boolean(prevEpisode || nextEpisode);

    return (
      <div
        className={`${
          isSticky
            ? hasEpisodes
              ? "flex items-center justify-between gap-1.5 py-1 px-2 border-t border-white/10 bg-zinc-950/95 text-xs text-gray-300 md:py-2.5 md:px-1 md:gap-2 md:flex-wrap md:bg-transparent md:border-t-0"
              : "hidden md:flex flex-wrap items-center justify-between gap-2 py-2.5 px-1 text-xs text-gray-300"
            : "flex flex-wrap items-center justify-between gap-2 py-2.5 px-1 text-xs text-gray-300"
        }`}
      >
        <div className={isSticky ? "hidden md:flex flex-wrap items-center gap-1.5 sm:gap-2" : "flex flex-wrap items-center gap-1.5 sm:gap-2"}>
          {/* 1. Nút Rạp phim */}
          <button
            type="button"
            data-player-control="true"
            data-control-section="action-buttons"
            onClick={onToggleTheaterMode}
            className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border transition cursor-pointer text-xs outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950 focus-visible:scale-105 ${
              isTheaterMode
                ? "bg-netflix-red/90 text-white border-netflix-red font-medium"
                : "bg-zinc-900/80 hover:bg-zinc-800 text-gray-300 hover:text-white border-white/10"
            }`}
          >
            {isTheaterMode ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Thu nhỏ</span>
                <span className="hidden sm:inline text-white/60">(T)</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Rạp phim</span>
                <span className="hidden sm:inline text-white/60">(T)</span>
              </>
            )}
          </button>

          {/* 2. Nút Tắt đèn */}
          <button
            type="button"
            data-player-control="true"
            data-control-section="action-buttons"
            onClick={onToggleLightsOff}
            className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border transition cursor-pointer text-xs outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950 focus-visible:scale-105 ${
              isLightsOff
                ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/40 font-medium"
                : "bg-zinc-900/80 hover:bg-zinc-800 text-gray-300 hover:text-white border-white/10"
            }`}
          >
            {isLightsOff ? (
              <>
                <Sun className="w-3.5 h-3.5 text-yellow-400" />
                <span>Bật sáng</span>
                <span className="hidden sm:inline text-white/60">(L)</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5" />
                <span>Chế độ Cinema</span>
                <span className="hidden sm:inline text-white/60">(L)</span>
              </>
            )}
          </button>

          {/* 3. Nút Toàn màn hình */}
          <button
            type="button"
            data-player-control="true"
            data-control-section="action-buttons"
            onClick={onToggleFullscreen}
            title="Phóng to toàn màn hình (Phím F)"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-gray-300 hover:text-white border border-white/10 transition cursor-pointer text-xs outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950 focus-visible:scale-105"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Thoát Fullscreen</span>
                <span className="text-white/60">(F)</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Toàn màn hình</span>
                <span className="text-white/60">(F)</span>
              </>
            )}
          </button>

          {/* 4. Nút Danh sách Phím tắt */}
          <button
            type="button"
            data-player-control="true"
            data-control-section="action-buttons"
            onClick={onOpenShortcuts}
            title="Xem danh sách phím tắt (?)"
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-gray-400 hover:text-white border border-white/10 transition cursor-pointer text-xs outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950 focus-visible:scale-105"
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Phím tắt</span>
          </button>
        </div>

        {/* CỤM NÚT ĐIỀU HƯỚNG TẬP: TRƯỚC / SAU */}
        <div className={`flex items-center gap-1.5 ${isSticky ? "w-full justify-between md:w-auto md:justify-start ml-auto md:ml-0" : "ml-auto sm:ml-0"}`}>
          {prevEpisode && (
            <Link
              href={`?ep=${prevEpisode.slug}`}
              scroll={false}
              data-player-control="true"
              data-control-section="action-buttons"
              onClick={(e) => {
                if (onSwitchEpisode && prevEpisode.slug) {
                  e.preventDefault();
                  onSwitchEpisode(prevEpisode.slug);
                }
              }}
              title={`Tập trước: ${prevEpisode.name} (Phím P)`}
              className={`inline-flex items-center gap-1 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-gray-300 hover:text-white transition font-medium border border-white/10 text-xs outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950 focus-visible:scale-105 ${
                isSticky ? "px-2 py-1 text-[11px] md:px-2.5 md:py-1.5 md:text-xs" : "px-2.5 py-1.5"
              }`}
            >
              <SkipBack className="w-3.5 h-3.5" />
              <span>Tập trước</span>
              <span className="hidden md:inline"> ({prevEpisode.name}) [P]</span>
            </Link>
          )}
          {nextEpisode && (
            <Link
              href={`?ep=${nextEpisode.slug}`}
              scroll={false}
              data-player-control="true"
              data-control-section="action-buttons"
              onClick={(e) => {
                if (onSwitchEpisode && nextEpisode.slug) {
                  e.preventDefault();
                  onSwitchEpisode(nextEpisode.slug);
                }
              }}
              title={`Tập tiếp theo: ${nextEpisode.name} (Phím N)`}
              className={`inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 hover:bg-netflix-red text-white transition font-semibold border border-white/10 shadow-md text-xs outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950 focus-visible:scale-105 ${
                isSticky ? "px-2.5 py-1 text-[11px] md:px-3 md:py-1.5 md:text-xs" : "px-3 py-1.5"
              }`}
            >
              <span>Tập tiếp</span>
              <span className="hidden md:inline"> ({nextEpisode.name}) [N]</span>
              <SkipForward className="w-3.5 h-3.5 fill-white" />
            </Link>
          )}
        </div>
      </div>
    );
  }
);
