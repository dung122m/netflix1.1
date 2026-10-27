"use client";

import React from "react";
import Link from "next/link";
import {
  Maximize2,
  Minimize2,
  Keyboard,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";

interface EpisodeItem {
  name?: string;
  slug?: string;
  link_embed?: string;
  link_m3u8?: string;
}

interface PlayerActionButtonsProps {
  isTheaterMode: boolean;
  onToggleTheaterMode: () => void;
  isLightsOff?: boolean;
  onToggleLightsOff?: () => void;
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
              ? "flex items-center justify-between gap-1.5 py-1 px-2 border-t border-white/10 bg-zinc-950/95 text-xs text-zinc-300 md:py-1.5 md:px-0 md:gap-2 md:flex-wrap md:bg-transparent md:border-t-0"
              : "hidden md:flex flex-wrap items-center justify-end gap-1.5 py-1 px-0 text-xs text-zinc-300"
            : "flex flex-wrap items-center justify-between gap-2 py-1.5 px-0 text-xs text-zinc-300"
        }`}
      >
        <div className={isSticky ? "hidden md:flex flex-wrap items-center gap-1.5" : "flex flex-wrap items-center gap-1.5"}>
          {/* 1. Nút Rạp phim */}
          <button
            type="button"
            data-player-control="true"
            onClick={onToggleTheaterMode}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition cursor-pointer text-xs outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
              isTheaterMode
                ? "bg-netflix-red/90 text-white border-netflix-red font-medium shadow-sm"
                : "bg-zinc-900/60 hover:bg-zinc-800/80 text-zinc-300 hover:text-white border-white/10 backdrop-blur-md"
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

          {/* 2. Nút Toàn màn hình */}
          <Tooltip content={isFullscreen ? "Thoát toàn màn hình" : "Phóng to toàn màn hình"} shortcut="F" side="top">
            <button
              type="button"
              data-player-control="true"
              onClick={onToggleFullscreen}
              aria-label={isFullscreen ? "Thoát toàn màn hình" : "Phóng to toàn màn hình"}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/60 hover:bg-zinc-800/80 text-zinc-300 hover:text-white border border-white/10 backdrop-blur-md transition cursor-pointer text-xs outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Thoát</span>
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
          </Tooltip>

          {/* 3. Nút Danh sách Phím tắt */}
          <Tooltip content="Xem danh sách phím tắt" shortcut="?" side="top">
            <button
              type="button"
              data-player-control="true"
              onClick={onOpenShortcuts}
              aria-label="Xem danh sách phím tắt"
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-900/60 hover:bg-zinc-800/80 text-zinc-400 hover:text-white border border-white/10 backdrop-blur-md transition cursor-pointer text-xs outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Phím tắt</span>
            </button>
          </Tooltip>
        </div>

        {/* CỤM NÚT ĐIỀU HƯỚNG TẬP: TRƯỚC / SAU */}
        <div className={`flex items-center gap-1.5 ${isSticky ? "w-full justify-between md:w-auto md:justify-start ml-auto md:ml-0" : "ml-auto sm:ml-0"}`}>
          {prevEpisode && (
            <Tooltip content={`Tập trước: ${prevEpisode.name || ""}`} shortcut="P" side="top">
              <Link
                href={`?ep=${prevEpisode.slug}`}
                scroll={false}
                data-player-control="true"
                onClick={(e) => {
                  if (onSwitchEpisode && prevEpisode.slug) {
                    e.preventDefault();
                    onSwitchEpisode(prevEpisode.slug);
                  }
                }}
                aria-label={`Tập trước: ${prevEpisode.name || ""}`}
                className={`inline-flex items-center gap-1 rounded-full bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 hover:text-white transition font-medium border border-white/10 text-xs outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                  isSticky ? "px-2.5 py-1 text-[11px] md:px-3 md:py-1 md:text-xs" : "px-3 py-1"
                }`}
              >
                <SkipBack className="w-3.5 h-3.5" />
                <span>Tập trước</span>
                <span className="hidden md:inline text-zinc-400"> ({prevEpisode.name})</span>
              </Link>
            </Tooltip>
          )}
          {nextEpisode && (
            <Tooltip content={`Tập tiếp theo: ${nextEpisode.name || ""}`} shortcut="N" side="top">
              <Link
                href={`?ep=${nextEpisode.slug}`}
                scroll={false}
                data-player-control="true"
                onClick={(e) => {
                  if (onSwitchEpisode && nextEpisode.slug) {
                    e.preventDefault();
                    onSwitchEpisode(nextEpisode.slug);
                  }
                }}
                aria-label={`Tập tiếp theo: ${nextEpisode.name || ""}`}
                className={`inline-flex items-center gap-1.5 rounded-full bg-zinc-900/80 hover:bg-netflix-red text-white transition font-semibold border border-white/15 hover:border-netflix-red shadow-sm text-xs outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                  isSticky ? "px-3 py-1 text-[11px] md:px-3.5 md:py-1 md:text-xs" : "px-3.5 py-1"
                }`}
              >
                <span>Tập tiếp</span>
                <span className="hidden md:inline text-zinc-300"> ({nextEpisode.name})</span>
                <SkipForward className="w-3.5 h-3.5 fill-white" />
              </Link>
            </Tooltip>
          )}
        </div>
      </div>
    );
  }
);
