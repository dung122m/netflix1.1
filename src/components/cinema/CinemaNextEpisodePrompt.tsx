"use client";

import React from "react";
import Image from "next/image";
import { Play, X } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import { toOptimizedCardPosterUrl, toFastCdnImageUrl } from "@/lib/movieMedia";
import { formatEpisodeName } from "@/lib/formatEpisode";

export interface CinemaNextEpisodePromptProps {
  showControls: boolean;
  posterUrl: string;
  nextEpisode: { name?: string; slug?: string };
  countdownSeconds: number;
  onPlayNext: () => void;
  onDismiss: () => void;
}

export const CinemaNextEpisodePrompt: React.FC<CinemaNextEpisodePromptProps> = ({
  showControls,
  posterUrl,
  nextEpisode,
  countdownSeconds,
  onPlayNext,
  onDismiss,
}) => {
  return (
    <div
      className={`absolute right-3 sm:right-6 ${
        showControls ? "bottom-20 sm:bottom-24" : "bottom-5 sm:bottom-6"
      } z-40 max-w-[calc(100vw-24px)] sm:max-w-sm w-full bg-zinc-950/90 hover:bg-zinc-950/95 backdrop-blur-xl rounded-2xl p-3 sm:p-3.5 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-300 text-white transition-all`}
      role="dialog"
      aria-label="Tập tiếp theo"
    >
      {posterUrl && (
        <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 bg-zinc-900">
          <Image
            src={toFastCdnImageUrl(toOptimizedCardPosterUrl(posterUrl, 192) || posterUrl)}
            alt={nextEpisode.name || "Tập tiếp theo"}
            fill
            unoptimized
            sizes="64px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-xs font-black text-white px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-xs shadow">
              {countdownSeconds}s
            </span>
          </div>
        </div>
      )}
      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
          <span>Tập tiếp theo sau</span>
          <span className="text-netflix-red font-bold">{countdownSeconds}s</span>
        </div>
        <div className="text-sm sm:text-base font-bold text-white truncate mt-0.5">
          {formatEpisodeName(nextEpisode.name || "Tập tiếp theo")}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onPlayNext}
          className="px-3 py-1.5 rounded-xl bg-netflix-red hover:brightness-110 active:brightness-95 text-white text-xs sm:text-sm font-bold shadow-md shadow-black/50 transition cursor-pointer flex items-center gap-1.5"
        >
          <Play className="w-3.5 h-3.5 fill-white" />
          <span>Xem ngay</span>
        </button>
        <Tooltip content="Hủy tự chuyển tập" side="top" align="end">
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Hủy tự chuyển tập"
            className="p-1.5 rounded-full hover:bg-white/20 text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
};

