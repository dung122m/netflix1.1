"use client";

import { ChevronLeft, ChevronRight, Radio } from "lucide-react";
import {
  YouTubePlayIcon,
  YouTubePauseIcon,
} from "@/components/player/PlayerNativeControls";

export interface LiveActionFeedback {
  icon: "play" | "pause" | "volume" | "mute" | "server" | "match" | "seek";
  text?: string;
}

interface LiveSeekOverlayProps {
  actionFeedback: LiveActionFeedback | null;
}

export function LiveSeekOverlay({ actionFeedback }: LiveSeekOverlayProps) {
  if (!actionFeedback) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center z-25 pointer-events-none">
      {actionFeedback.icon === "seek" ? (
        actionFeedback.text?.startsWith("-") ? (
          // CINEMA SEEK LEFT HUD (−10s)
          <div
            key={actionFeedback.text}
            role="status"
            aria-live="polite"
            className="absolute left-6 sm:left-12 top-1/2 -translate-y-1/2 pointer-events-none z-30 animate-in fade-in zoom-in-95 slide-in-from-right-2 duration-150 motion-reduce:animate-none"
          >
            <div className="flex items-center gap-1 text-white font-bold text-xs sm:text-sm md:text-base tracking-tight select-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
              <span>{actionFeedback.text}</span>
            </div>
          </div>
        ) : actionFeedback.text?.startsWith("+") ? (
          // CINEMA SEEK RIGHT HUD (+10s)
          <div
            key={actionFeedback.text}
            role="status"
            aria-live="polite"
            className="absolute right-6 sm:right-12 top-1/2 -translate-y-1/2 pointer-events-none z-30 animate-in fade-in zoom-in-95 slide-in-from-left-2 duration-150 motion-reduce:animate-none"
          >
            <div className="flex items-center gap-1 text-white font-bold text-xs sm:text-sm md:text-base tracking-tight select-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
              <span>{actionFeedback.text}</span>
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            </div>
          </div>
        ) : (
          // Thông báo Live / Không có DVR - Thiết kế tinh tế chuẩn Movie Player
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/80 backdrop-blur-md shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-white">
            <Radio className="w-3.5 h-3.5 text-netflix-red animate-pulse" />
            <span className="text-xs sm:text-sm font-semibold text-zinc-200 tracking-wide">
              {actionFeedback.text || "Đang phát trực tiếp"}
            </span>
          </div>
        )
      ) : actionFeedback.icon === "play" || actionFeedback.icon === "pause" ? (
        <div className="hidden md:flex absolute inset-0 items-center justify-center pointer-events-none z-30">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/60 backdrop-blur-xl text-white flex items-center justify-center shadow-2xl animate-in fade-in zoom-in-75 duration-150">
            {actionFeedback.icon === "play" ? (
              <YouTubePlayIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white ml-0.5" />
            ) : (
              <YouTubePauseIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

