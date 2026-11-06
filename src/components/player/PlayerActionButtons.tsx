"use client";

import React from "react";
import Link from "next/link";
import {
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
  isTheaterMode?: boolean;
  onToggleTheaterMode?: () => void;
  isLightsOff?: boolean;
  onToggleLightsOff?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onOpenShortcuts?: () => void;
  prevEpisode: EpisodeItem | null;
  nextEpisode: EpisodeItem | null;
  onSwitchEpisode?: (slug: string) => void;
  isSticky?: boolean;
}

export const PlayerActionButtons: React.FC<PlayerActionButtonsProps> = React.memo(
  function PlayerActionButtons({
    onOpenShortcuts,
    prevEpisode,
    nextEpisode,
    onSwitchEpisode,
    isSticky = false,
  }) {
    const hasEpisodes = Boolean(prevEpisode || nextEpisode);

    // KHI KHÔNG CÓ TẬP PHIM (PHIM LẺ): ẨN HOÀN TOÀN ĐỂ TRÁNH TRÙNG LẶP NÚT TRÊN PLAYER
    if (!hasEpisodes || isSticky) {
      return null;
    }

    // TRÊN MOBILE: ẨN TOÀN BỘ CỤM NÚT NÀY VÌ TRÊN PLAYER ĐÃ CÓ ĐẦY ĐỦ NÚT "TẬP TRƯỚC" VÀ "TẬP TIẾP"
    // TRÊN DESKTOP: CHỈ HIỂN THỊ NÚT PHÍM TẮT BÊN TRÁI VÀ CỤM CHUYỂN TẬP GỌN GÀNG BÊN PHẢI
    return (
      <div className="hidden sm:flex flex-wrap items-center justify-between gap-2.5 py-2 px-0 text-xs text-zinc-300">
        <div className="flex items-center gap-2">
          {onOpenShortcuts && (
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
          )}
        </div>

        {/* CỤM NÚT ĐIỀU HƯỚNG TẬP DESKTOP: TRƯỚC / SAU */}
        <div className="flex items-center gap-2 ml-auto">
          {prevEpisode?.slug && (
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
                className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 transition font-medium text-xs outline-none focus-visible:ring-2 focus-visible:ring-white/40 shadow-xs px-3.5 py-1.5"
              >
                <SkipBack className="w-3.5 h-3.5" />
                <span>Tập trước</span>
                {prevEpisode.name && (
                  <span className="hidden md:inline text-zinc-400"> ({prevEpisode.name})</span>
                )}
              </Link>
            </Tooltip>
          )}
          {nextEpisode?.slug && (
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
                className="inline-flex items-center gap-1.5 rounded-full bg-netflix-red hover:brightness-110 active:brightness-95 text-white transition font-semibold shadow-md text-xs outline-none focus-visible:ring-2 focus-visible:ring-white/40 px-3.5 py-1.5"
              >
                <span>Tập tiếp</span>
                {nextEpisode.name && (
                  <span className="hidden md:inline text-white/90"> ({nextEpisode.name})</span>
                )}
                <SkipForward className="w-3.5 h-3.5 fill-white" />
              </Link>
            </Tooltip>
          )}
        </div>
      </div>
    );
  }
);
