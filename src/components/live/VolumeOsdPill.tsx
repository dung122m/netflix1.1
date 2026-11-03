"use client";

import React from "react";
import {
  YouTubeVolumeHighIcon,
  YouTubeVolumeLowIcon,
  YouTubeVolumeMuteIcon,
} from "@/components/player/PlayerNativeControls";
import { VolumeOsdState } from "./hooks/useMediaVolume";

export interface VolumeOsdPillProps {
  volumeOsd: VolumeOsdState | null;
}

export function VolumeOsdPill({ volumeOsd }: VolumeOsdPillProps) {
  if (!volumeOsd || !volumeOsd.visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute top-5 sm:top-7 left-1/2 -translate-x-1/2 z-30 pointer-events-none max-w-[calc(100%-32px)] animate-in fade-in slide-in-from-top-3 duration-200 motion-reduce:animate-none"
    >
      <div className="flex items-center gap-3 px-4 py-2 sm:px-4.5 sm:py-2.5 rounded-full bg-zinc-950/90 backdrop-blur-2xl text-white shadow-[0_12px_36px_rgba(0,0,0,0.85)]">
        {volumeOsd.isMuted || volumeOsd.volume === 0 ? (
          <YouTubeVolumeMuteIcon className="w-5 h-5 text-netflix-red shrink-0" />
        ) : volumeOsd.volume < 0.5 ? (
          <YouTubeVolumeLowIcon className="w-5 h-5 text-white/90 shrink-0" />
        ) : (
          <YouTubeVolumeHighIcon className="w-5 h-5 text-white/90 shrink-0" />
        )}

        <div className="w-24 sm:w-28 h-1.5 rounded-full bg-white/20 overflow-hidden shrink-0">
          <div
            className="h-full bg-gradient-to-r from-white to-zinc-200 rounded-full transition-all duration-150 ease-out"
            style={{
              width: `${volumeOsd.isMuted ? 0 : Math.round(volumeOsd.volume * 100)}%`,
            }}
          />
        </div>

        <span className="text-xs sm:text-[13px] font-semibold tracking-tight tabular-nums text-white min-w-[34px] text-right">
          {volumeOsd.isMuted ? "Tắt tiếng" : `${Math.round(volumeOsd.volume * 100)}%`}
        </span>
      </div>
    </div>
  );
}

