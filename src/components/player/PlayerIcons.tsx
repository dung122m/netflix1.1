"use client";

import React from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Volume1,
  VolumeX,
  Settings,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  Tv,
} from "lucide-react";

export const YouTubePlayIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <Play className={className} fill="currentColor" />
);

export const YouTubePauseIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <Pause className={className} fill="currentColor" />
);

export const YouTubePrevIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <SkipBack className={className} fill="currentColor" />
);

export const YouTubeNextIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <SkipForward className={className} fill="currentColor" />
);

export const YouTubeVolumeHighIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <Volume2 className={className} />
);

export const YouTubeVolumeLowIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <Volume1 className={className} />
);

export const YouTubeVolumeMuteIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <VolumeX className={className} />
);

export const YouTubeSettingsIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <Settings className={className} />
);

export const YouTubeMiniplayerIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect width="18" height="14" x="3" y="5" rx="2" />
    <rect width="7" height="5" x="12" y="12" rx="1" fill="currentColor" stroke="none" />
  </svg>
);

export const YouTubeTheaterIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <Tv className={className} />
);

export const YouTubeFullscreenIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <Maximize className={className} />
);

export const YouTubeExitFullscreenIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <Minimize className={className} />
);

export const YouTubeSeek5BackIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <RotateCcw className={className} />
);

export const YouTubeSeek5ForwardIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <RotateCw className={className} />
);

export const YouTubeSeek10BackIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <RotateCcw className={className} />
);

export const YouTubeSeek10ForwardIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <RotateCw className={className} />
);
