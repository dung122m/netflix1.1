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

    // KHI KHÔNG CÓ TẬP PHIM (PHIM LẺ): ẨN HOÀN TOÀN TRÊN MOBILE ĐỂ TRÁNH KHOẢNG TRỐNG THỪA
    if (!hasEpisodes) {
      if (isSticky) return null;
      return (
        <div className="hidden sm:flex flex-wrap items-center justify-between gap-2.5 py-2 px-0 text-xs text-zinc-300">
          <div className="flex flex-wrap items-center gap-2">
            {/* 1. Nút Rạp phim */}
            <button
              type="button"
              data-player-control="true"
              onClick={onToggleTheaterMode}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition cursor-pointer text-xs outline-none focus-visible:ring-2 focus-visible:ring-white/40 shadow-xs ${
                isTheaterMode
                  ? "bg-netflix-red text-white border-netflix-red font-medium shadow-sm"
                  : "bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border-white/10 backdrop-blur-md"
              }`}
            >
              {isTheaterMode ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Thu nhỏ</span>
                  <span className="inline text-white/60">(T)</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Rạp phim</span>
                  <span className="inline text-white/60">(T)</span>
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 backdrop-blur-md transition cursor-pointer text-xs outline-none focus-visible:ring-2 focus-visible:ring-white/40 shadow-xs"
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 backdrop-blur-md transition cursor-pointer text-xs outline-none focus-visible:ring-2 focus-visible:ring-white/40 shadow-xs"
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>Phím tắt</span>
              </button>
            </Tooltip>
          </div>
        </div>
      );
    }

    return (
      <>
        {/* ========================================================================= */}
        {/* 1. GIAO DIỆN DÀNH RIÊNG CHO MOBILE (< sm) - CÂN ĐỐI, TINH GỌN, KHÔNG LỆCH */}
        {/* ========================================================================= */}
        {isSticky ? (
          <div className="flex sm:hidden items-center justify-between gap-2 py-1 px-2 border-t border-white/10 bg-zinc-950/95 text-xs text-zinc-300 w-full">
            {prevEpisode && (
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
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/10 text-zinc-300 text-[11px] font-semibold"
              >
                <SkipBack className="w-3 h-3 text-zinc-400" />
                <span>Tập trước</span>
              </Link>
            )}
            {nextEpisode && (
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
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-netflix-red text-white text-[11px] font-bold ml-auto shadow-sm"
              >
                <span>Tập tiếp</span>
                <SkipForward className="w-3 h-3 fill-white" />
              </Link>
            )}
          </div>
        ) : (
          <div className="w-full sm:hidden py-1">
            {prevEpisode && nextEpisode ? (
              <div className="grid grid-cols-2 gap-2 w-full">
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
                  className="flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border border-white/10 active:scale-[0.98] transition font-semibold text-xs shadow-sm min-w-0"
                >
                  <SkipBack className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span className="truncate">Tập trước</span>
                  {prevEpisode.name && (
                    <span className="text-zinc-400 text-[11px] font-normal truncate">({prevEpisode.name})</span>
                  )}
                </Link>

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
                  className="flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-xl bg-gradient-to-r from-netflix-red to-red-600 hover:brightness-110 active:brightness-95 text-white active:scale-[0.98] transition font-bold text-xs shadow-md shadow-netflix-red/25 min-w-0"
                >
                  <span className="truncate">Tập tiếp</span>
                  {nextEpisode.name && (
                    <span className="text-white/90 text-[11px] font-medium truncate">({nextEpisode.name})</span>
                  )}
                  <SkipForward className="w-3.5 h-3.5 fill-white shrink-0" />
                </Link>
              </div>
            ) : nextEpisode ? (
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
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-netflix-red to-red-600 hover:brightness-110 active:brightness-95 text-white active:scale-[0.98] transition font-bold text-xs shadow-md shadow-netflix-red/25"
              >
                <span>Xem tập tiếp theo:</span>
                <span className="font-extrabold underline underline-offset-2">{nextEpisode.name}</span>
                <SkipForward className="w-3.5 h-3.5 fill-white shrink-0" />
              </Link>
            ) : prevEpisode ? (
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
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border border-white/10 active:scale-[0.98] transition font-semibold text-xs shadow-sm"
              >
                <SkipBack className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>Quay lại tập trước:</span>
                <span className="font-bold text-white">{prevEpisode.name}</span>
              </Link>
            ) : null}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. GIAO DIỆN DESKTOP / TABLET (>= sm) - GIỮ NGUYÊN BẢN CHUẨN ĐẦY ĐỦ CÔNG CỤ */}
        {/* ========================================================================= */}
        <div
          className={`hidden sm:flex ${
            isSticky
              ? "flex-wrap items-center justify-between gap-1.5 py-1 px-0 md:py-1.5 md:gap-2 text-xs text-zinc-300"
              : "flex-wrap items-center justify-between gap-2.5 py-2 px-0 text-xs text-zinc-300"
          }`}
        >
          <div className="flex flex-wrap items-center gap-2">
            {/* 1. Nút Rạp phim */}
            <button
              type="button"
              data-player-control="true"
              onClick={onToggleTheaterMode}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition cursor-pointer text-xs outline-none focus-visible:ring-2 focus-visible:ring-white/40 shadow-xs ${
                isTheaterMode
                  ? "bg-netflix-red text-white border-netflix-red font-medium shadow-sm"
                  : "bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border-white/10 backdrop-blur-md"
              }`}
            >
              {isTheaterMode ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Thu nhỏ</span>
                  <span className="inline text-white/60">(T)</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Rạp phim</span>
                  <span className="inline text-white/60">(T)</span>
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 backdrop-blur-md transition cursor-pointer text-xs outline-none focus-visible:ring-2 focus-visible:ring-white/40 shadow-xs"
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 backdrop-blur-md transition cursor-pointer text-xs outline-none focus-visible:ring-2 focus-visible:ring-white/40 shadow-xs"
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>Phím tắt</span>
              </button>
            </Tooltip>
          </div>

          {/* CỤM NÚT ĐIỀU HƯỚNG TẬP DESKTOP: TRƯỚC / SAU */}
          <div className="flex items-center gap-2 ml-auto">
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
                  className={`inline-flex items-center gap-1.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 transition font-medium text-xs outline-none focus-visible:ring-2 focus-visible:ring-white/40 shadow-xs ${
                    isSticky ? "px-2.5 py-1 text-[11px] md:px-3 md:py-1.5 md:text-xs" : "px-3.5 py-1.5"
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
                  className={`inline-flex items-center gap-1.5 rounded-full bg-netflix-red hover:brightness-110 active:brightness-95 text-white transition font-semibold shadow-md text-xs outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                    isSticky ? "px-3 py-1 text-[11px] md:px-3.5 md:py-1.5 md:text-xs" : "px-3.5 py-1.5"
                  }`}
                >
                  <span>Tập tiếp</span>
                  <span className="hidden md:inline text-white/90"> ({nextEpisode.name})</span>
                  <SkipForward className="w-3.5 h-3.5 fill-white" />
                </Link>
              </Tooltip>
            )}
          </div>
        </div>
      </>
    );
  }
);
