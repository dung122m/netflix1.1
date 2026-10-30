"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Film,
  ChevronRight,
  ChevronLeft,
  Check,
  Sliders,
  Scaling,
  Tv,
  Keyboard,
  Gauge,
  Repeat,
  X,
} from "lucide-react";
import { PlayerScrubBar, PlayerTimeDisplay } from "../PlayerScrubBar";
import { Tooltip } from "@/components/ui/Tooltip";

export type VideoFit = "contain" | "cover" | "fill" | "zoom";

const FIT_OPTIONS: Array<{ id: VideoFit; label: string }> = [
  { id: "contain", label: "Vừa khung (16:9)" },
  { id: "cover", label: "Lấp đầy (Cover)" },
  { id: "fill", label: "Kéo giãn (Fill)" },
  { id: "zoom", label: "Phóng to (Zoom)" },
];

const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

// ============================================================================
// BỘ BIỂU TƯỢNG VIDEO CHUYÊN DỤNG CHUẨN YOUTUBE STUDIO (HIGH-PRECISION SVGS)
// ============================================================================

export const YouTubePlayIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M8 5v14l11-7z" />
  </svg>
);

export const YouTubePauseIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);

export const YouTubeNextIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
  </svg>
);

export const YouTubeVolumeHighIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
  </svg>
);

export const YouTubeVolumeLowIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M7 9v6h4l5 5V4L7 9H3zm11.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
  </svg>
);

export const YouTubeVolumeMuteIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
  </svg>
);

export const YouTubeSettingsIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
  </svg>
);

export const YouTubeMiniplayerIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z" />
  </svg>
);

export const YouTubeTheaterIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M19 6H5c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 10H5V8h14v8z" />
  </svg>
);

export const YouTubeFullscreenIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
  </svg>
);

export const YouTubeExitFullscreenIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
  </svg>
);

export const YouTubeSeek5BackIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M11.99 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6s-6-2.69-6-6h-2c0 4.42 3.58 8 8 8s8-3.58 8-8s-3.58-8-8-8z" />
    <text x="12" y="15.5" textAnchor="middle" fontSize="8.5" fontWeight="bold" fontFamily="system-ui, -apple-system, sans-serif">5</text>
  </svg>
);

export const YouTubeSeek5ForwardIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18 13c0 3.31-2.69 6-6 6s-6-2.69-6-6 2.69-6 6-6v4l5-5-5-5v4c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8h-2z" />
    <text x="12" y="15.5" textAnchor="middle" fontSize="8.5" fontWeight="bold" fontFamily="system-ui, -apple-system, sans-serif">5</text>
  </svg>
);

// Backward compatibility aliases
export const YouTubeSeek10BackIcon = YouTubeSeek5BackIcon;
export const YouTubeSeek10ForwardIcon = YouTubeSeek5ForwardIcon;


// ============================================================================
// TYPES
// ============================================================================

interface QualityLevel {
  id: number;
  label: string;
  height: number;
}

interface PlayerNativeControlsProps {
  showControls: boolean;
  isPlaying: boolean;
  isBuffering?: boolean;
  isMuted: boolean;
  volume: number;
  playbackSpeed: number;
  qualityLevels: QualityLevel[];
  currentQualityIndex: number;
  videoFit?: VideoFit;
  isFullscreen: boolean;
  isNativeVideo: boolean;
  knownDuration?: number;
  embedSrc?: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  title?: string;
  activeEpisodeName?: string;
  nextEpisode?: { name?: string; slug?: string } | null;
  onTogglePlayPause: () => void;
  onSeekFeedback: (txt: string) => void;
  onToggleMute: () => void;
  onVolumeChange: (val: number) => void;
  onSpeedChange: (speed: number) => void;
  onQualityChange: (levelIndex: number) => void;
  onVideoFitChange?: (fit: VideoFit) => void;
  onTogglePiP: () => void;
  onUseIframeFallback: () => void;
  isTheaterMode?: boolean;
  onToggleTheaterMode?: () => void;
  onOpenShortcuts?: () => void;
  onToggleFullscreen: () => void;
  onSwitchEpisode?: (slug: string) => void;
  onUserInteraction?: () => void;
  onSeek?: (targetTime: number) => void;
}

type SettingsView = "main" | "speed" | "quality" | "fit" | "server";

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const PlayerNativeControls: React.FC<PlayerNativeControlsProps> = React.memo(
  function PlayerNativeControls({
    showControls,
    isPlaying,
    isBuffering = false,
    isMuted,
    volume,
    playbackSpeed,
    qualityLevels,
    currentQualityIndex,
    videoFit = "contain",
    isFullscreen,
    isNativeVideo,
    knownDuration,
    embedSrc,
    videoRef,
    title,
    activeEpisodeName,
    nextEpisode,
    onTogglePlayPause,
    onSeekFeedback,
    onToggleMute,
    onVolumeChange,
    onSpeedChange,
    onQualityChange,
    onVideoFitChange,
    onTogglePiP,
    onUseIframeFallback,
    isTheaterMode = false,
    onToggleTheaterMode,
    onOpenShortcuts,
    onToggleFullscreen,
    onSwitchEpisode,
    onUserInteraction,
    onSeek,
  }) {
    // Menu Cài đặt YouTube Flyout
    const [showSettings, setShowSettings] = useState(false);
    const [settingsView, setSettingsView] = useState<SettingsView>("main");
    const [loopVideo, setLoopVideo] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [isMobileScreen, setIsMobileScreen] = useState(false);
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

    const settingsBtnRef = useRef<HTMLButtonElement>(null);
    const settingsPanelRef = useRef<HTMLDivElement>(null);

    // Nhận diện màn hình di động/cảm ứng để chuyển sang Bottom Sheet thay vì popup bị tràn
    useEffect(() => {
      setMounted(true);
      const checkMobile = () => {
        setIsMobileScreen(
          typeof window !== "undefined" &&
          (window.innerWidth < 640 ||
            (Boolean(window.matchMedia && window.matchMedia("(pointer: coarse)").matches) && window.innerWidth < 1024))
        );
      };
      checkMobile();
      window.addEventListener("resize", checkMobile);
      return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // Nhận diện mục tiêu render Portal (document.fullscreenElement nếu đang toàn màn hình hoặc document.body)
    useEffect(() => {
      if (typeof document === "undefined") return;
      const resolveTarget = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = document as any;
        const fsElem = (doc.fullscreenElement ||
          doc.webkitFullscreenElement ||
          doc.mozFullScreenElement ||
          doc.msFullscreenElement) as HTMLElement | null;
        setPortalTarget(fsElem || document.body);
      };
      resolveTarget();
      document.addEventListener("fullscreenchange", resolveTarget);
      document.addEventListener("webkitfullscreenchange", resolveTarget);
      return () => {
        document.removeEventListener("fullscreenchange", resolveTarget);
        document.removeEventListener("webkitfullscreenchange", resolveTarget);
      };
    }, []);

    // Kích hoạt lặp lại video
    useEffect(() => {
      if (videoRef.current) {
        videoRef.current.loop = loopVideo;
      }
    }, [loopVideo, videoRef]);

    // Xử lý đóng menu khi click ra ngoài
    useEffect(() => {
      if (!showSettings) return;

      const handleClickOutside = (e: MouseEvent) => {
        if (isMobileScreen) return;
        if (
          settingsPanelRef.current &&
          !settingsPanelRef.current.contains(e.target as Node) &&
          settingsBtnRef.current &&
          !settingsBtnRef.current.contains(e.target as Node)
        ) {
          setShowSettings(false);
          setSettingsView("main");
        }
      };

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape" || e.key === "Backspace") {
          e.preventDefault();
          if (settingsView !== "main") {
            setSettingsView("main");
          } else {
            setShowSettings(false);
            settingsBtnRef.current?.focus();
          }
        }
      };

      window.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("keydown", handleEscape, { capture: true });
      return () => {
        window.removeEventListener("mousedown", handleClickOutside);
        window.removeEventListener("keydown", handleEscape, { capture: true });
      };
    }, [showSettings, settingsView, isMobileScreen]);

    // Controls hiển thị khi showControls=true hoặc khi đang mở bảng cài đặt
    const isOverlayVisible = showControls || showSettings;

    // Tua lùi 5s
    const handleSeekBack = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        if (videoRef.current) {
          const target = Math.max(0, (videoRef.current.currentTime || 0) - 5);
          if (onSeek) onSeek(target);
          else videoRef.current.currentTime = target;
        }
        onSeekFeedback("-5s");
        onUserInteraction?.();
      },
      [videoRef, onSeek, onSeekFeedback, onUserInteraction]
    );

    // Tua tới 5s
    const handleSeekForward = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        if (videoRef.current) {
          const target = (videoRef.current.currentTime || 0) + 5;
          if (onSeek) onSeek(target);
          else videoRef.current.currentTime = target;
        }
        onSeekFeedback("+5s");
        onUserInteraction?.();
      },
      [videoRef, onSeek, onSeekFeedback, onUserInteraction]
    );

    // Nhãn chất lượng hiện tại
    const currentQualityLabel =
      currentQualityIndex === -1
        ? ""
        : qualityLevels.find((q) => q.id === currentQualityIndex)?.label || "HD";

    // Nhãn tỷ lệ màn hình hiện tại
    const currentFitLabel =
      FIT_OPTIONS.find((f) => f.id === videoFit)?.label || "Vừa khung (16:9)";

    const renderSettingsInner = (isMobileLayout: boolean) => (
      <>
        {/* VIEW: MAIN MENU */}
        {settingsView === "main" && (
          <div className="py-1 flex flex-col">
            {!isMobileLayout && (
              <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between text-xs font-semibold text-zinc-400">
                <span>Cài đặt trình phát</span>
                <span className="text-[10px] font-mono uppercase bg-white/10 px-1.5 py-0.5 rounded text-zinc-300">
                  Nanaflix
                </span>
              </div>
            )}

            {/* Mục: Tốc độ phát */}
            <button
              type="button"
              onClick={() => setSettingsView("speed")}
              className={`flex items-center justify-between hover:bg-white/10 transition cursor-pointer text-left group ${
                isMobileLayout ? "px-4 py-3 text-sm rounded-xl" : "px-3.5 py-2.5 text-xs sm:text-sm"
              }`}
            >
              <div className="flex items-center gap-3 text-zinc-200 group-hover:text-white">
                <Gauge className={`${isMobileLayout ? "w-5 h-5" : "w-4 h-4"} text-zinc-400 group-hover:text-white`} />
                <span className="font-medium">Tốc độ phát</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-400 group-hover:text-zinc-200 text-xs sm:text-sm">
                <span>{playbackSpeed === 1 ? "Chuẩn" : `${playbackSpeed}x`}</span>
                <ChevronRight className="w-4 h-4 text-zinc-500" />
              </div>
            </button>

            {/* Mục: Chất lượng video */}
            {qualityLevels.length > 0 && (
              <button
                type="button"
                onClick={() => setSettingsView("quality")}
                className={`flex items-center justify-between hover:bg-white/10 transition cursor-pointer text-left group ${
                  isMobileLayout ? "px-4 py-3 text-sm rounded-xl" : "px-3.5 py-2.5 text-xs sm:text-sm"
                }`}
              >
                <div className="flex items-center gap-3 text-zinc-200 group-hover:text-white">
                  <Sliders className={`${isMobileLayout ? "w-5 h-5" : "w-4 h-4"} text-zinc-400 group-hover:text-white`} />
                  <span className="font-medium">Chất lượng</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400 group-hover:text-zinc-200 text-xs sm:text-sm">
                  <span>{currentQualityLabel}</span>
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                </div>
              </button>
            )}

            {/* Mục: Tỉ lệ màn hình */}
            {isNativeVideo && (
              <button
                type="button"
                onClick={() => setSettingsView("fit")}
                className={`flex items-center justify-between hover:bg-white/10 transition cursor-pointer text-left group ${
                  isMobileLayout ? "px-4 py-3 text-sm rounded-xl" : "px-3.5 py-2.5 text-xs sm:text-sm"
                }`}
              >
                <div className="flex items-center gap-3 text-zinc-200 group-hover:text-white">
                  <Scaling className={`${isMobileLayout ? "w-5 h-5" : "w-4 h-4"} text-zinc-400 group-hover:text-white`} />
                  <span className="font-medium">Tỉ lệ màn hình</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400 group-hover:text-zinc-200 text-xs sm:text-sm">
                  <span className="truncate max-w-[120px]">{currentFitLabel.split(" ")[0]}</span>
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                </div>
              </button>
            )}

            {/* Mục: Nguồn phát */}
            {embedSrc && (
              <button
                type="button"
                onClick={() => setSettingsView("server")}
                className={`flex items-center justify-between hover:bg-white/10 transition cursor-pointer text-left group ${
                  isMobileLayout ? "px-4 py-3 text-sm rounded-xl" : "px-3.5 py-2.5 text-xs sm:text-sm"
                }`}
              >
                <div className="flex items-center gap-3 text-zinc-200 group-hover:text-white">
                  <Tv className={`${isMobileLayout ? "w-5 h-5" : "w-4 h-4"} text-zinc-400 group-hover:text-white`} />
                  <span className="font-medium">Nguồn phát</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400 group-hover:text-zinc-200 text-xs sm:text-sm">
                  <span>Chính (HLS)</span>
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                </div>
              </button>
            )}

            {/* Mục: Lặp lại video */}
            <button
              type="button"
              onClick={() => setLoopVideo(!loopVideo)}
              className={`flex items-center justify-between hover:bg-white/10 transition cursor-pointer text-left group ${
                isMobileLayout ? "px-4 py-3 text-sm rounded-xl" : "px-3.5 py-2.5 text-xs sm:text-sm"
              }`}
            >
              <div className="flex items-center gap-3 text-zinc-200 group-hover:text-white">
                <Repeat className={`${isMobileLayout ? "w-5 h-5" : "w-4 h-4"} text-zinc-400 group-hover:text-white`} />
                <span className="font-medium">Lặp lại video</span>
              </div>
              <div
                className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 flex items-center ${
                  loopVideo ? "bg-netflix-red justify-end" : "bg-white/20 justify-start"
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
              </div>
            </button>

            {/* Mục: Phím tắt điều khiển (Chỉ hiện trên desktop) */}
            {!isMobileLayout && onOpenShortcuts && (
              <button
                type="button"
                onClick={() => {
                  setShowSettings(false);
                  onOpenShortcuts();
                }}
                className="flex items-center justify-between px-3.5 py-2.5 hover:bg-white/10 transition cursor-pointer text-xs sm:text-sm text-left group border-t border-white/10 mt-1"
              >
                <div className="flex items-center gap-2.5 text-zinc-200 group-hover:text-white">
                  <Keyboard className="w-4 h-4 text-zinc-400 group-hover:text-white" />
                  <span>Phím tắt điều khiển</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-400 bg-white/10 px-1.5 py-0.5 rounded">
                  ?
                </span>
              </button>
            )}
          </div>
        )}

        {/* VIEW: SPEED SUBMENU */}
        {settingsView === "speed" && (
          <div className="py-1 flex flex-col">
            {!isMobileLayout && (
              <button
                type="button"
                onClick={() => setSettingsView("main")}
                className="flex items-center gap-2 px-3 py-2 border-b border-white/10 text-xs font-semibold text-white hover:bg-white/10 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-zinc-400" />
                <span>Tốc độ phát</span>
              </button>
            )}
            <div className={`${isMobileLayout ? "max-h-[60vh]" : "max-h-56"} overflow-y-auto py-1`}>
              {SPEED_OPTIONS.map((spd) => {
                const isSelected = playbackSpeed === spd;
                return (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => {
                      onSpeedChange(spd);
                      setShowSettings(false);
                      setSettingsView("main");
                    }}
                    className={`w-full flex items-center justify-between hover:bg-white/10 transition cursor-pointer ${
                      isMobileLayout ? "px-4 py-3 text-sm rounded-xl" : "px-4 py-2 text-xs sm:text-[13px]"
                    } ${isSelected ? "text-netflix-red font-bold" : "text-zinc-200"}`}
                  >
                    <span>{spd === 1 ? "Chuẩn (1x)" : `${spd}x`}</span>
                    {isSelected && <Check className="w-4 h-4 text-netflix-red" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW: QUALITY SUBMENU */}
        {settingsView === "quality" && (
          <div className="py-1 flex flex-col">
            {!isMobileLayout && (
              <button
                type="button"
                onClick={() => setSettingsView("main")}
                className="flex items-center gap-2 px-3 py-2 border-b border-white/10 text-xs font-semibold text-white hover:bg-white/10 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-zinc-400" />
                <span>Chất lượng video</span>
              </button>
            )}
            <div className={`${isMobileLayout ? "max-h-[60vh]" : "max-h-56"} overflow-y-auto py-1`}>
              <button
                type="button"
                onClick={() => {
                  onQualityChange(-1);
                  setShowSettings(false);
                  setSettingsView("main");
                }}
                className={`w-full flex items-center justify-between hover:bg-white/10 transition cursor-pointer ${
                  isMobileLayout ? "px-4 py-3 text-sm rounded-xl" : "px-4 py-2 text-xs sm:text-[13px]"
                } ${currentQualityIndex === -1 ? "text-netflix-red font-bold" : "text-zinc-200"}`}
              >
                <div className="flex flex-col text-left">
                  <span>Tự động</span>
                  <span className="text-[10px] text-zinc-400 font-normal">Tối ưu theo đường truyền</span>
                </div>
                {currentQualityIndex === -1 && <Check className="w-4 h-4 text-netflix-red" />}
              </button>
              {qualityLevels.map((lvl) => {
                const isSelected = currentQualityIndex === lvl.id;
                return (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => {
                      onQualityChange(lvl.id);
                      setShowSettings(false);
                      setSettingsView("main");
                    }}
                    className={`w-full flex items-center justify-between hover:bg-white/10 transition cursor-pointer ${
                      isMobileLayout ? "px-4 py-3 text-sm rounded-xl" : "px-4 py-2 text-xs sm:text-[13px]"
                    } ${isSelected ? "text-netflix-red font-bold" : "text-zinc-200"}`}
                  >
                    <span>{lvl.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-netflix-red" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW: FIT SUBMENU */}
        {settingsView === "fit" && (
          <div className="py-1 flex flex-col">
            {!isMobileLayout && (
              <button
                type="button"
                onClick={() => setSettingsView("main")}
                className="flex items-center gap-2 px-3 py-2 border-b border-white/10 text-xs font-semibold text-white hover:bg-white/10 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-zinc-400" />
                <span>Tỉ lệ màn hình</span>
              </button>
            )}
            <div className="py-1">
              {FIT_OPTIONS.map((opt) => {
                const isSelected = videoFit === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onVideoFitChange?.(opt.id);
                      setShowSettings(false);
                      setSettingsView("main");
                    }}
                    className={`w-full flex items-center justify-between hover:bg-white/10 transition cursor-pointer ${
                      isMobileLayout ? "px-4 py-3 text-sm rounded-xl" : "px-4 py-2 text-xs sm:text-[13px]"
                    } ${isSelected ? "text-netflix-red font-bold" : "text-zinc-200"}`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-netflix-red" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW: SERVER SUBMENU */}
        {settingsView === "server" && (
          <div className="py-1 flex flex-col">
            {!isMobileLayout && (
              <button
                type="button"
                onClick={() => setSettingsView("main")}
                className="flex items-center gap-2 px-3 py-2 border-b border-white/10 text-xs font-semibold text-white hover:bg-white/10 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-zinc-400" />
                <span>Nguồn phát / Máy chủ</span>
              </button>
            )}
            <div className="py-1">
              <button
                type="button"
                onClick={() => {
                  setShowSettings(false);
                  setSettingsView("main");
                }}
                className={`w-full flex items-center justify-between text-netflix-red font-bold hover:bg-white/10 transition cursor-pointer ${
                  isMobileLayout ? "px-4 py-3 text-sm rounded-xl" : "px-4 py-2 text-xs sm:text-[13px]"
                }`}
              >
                <div className="flex flex-col text-left">
                  <span>Nguồn HLS (Chính)</span>
                  <span className="text-[10px] text-zinc-400 font-normal">Tốc độ cao, mượt mà</span>
                </div>
                <Check className="w-4 h-4 text-netflix-red" />
              </button>
              {embedSrc && (
                <button
                  type="button"
                  onClick={() => {
                    setShowSettings(false);
                    setSettingsView("main");
                    onUseIframeFallback();
                  }}
                  className={`w-full flex items-center justify-between text-zinc-200 hover:bg-white/10 transition cursor-pointer ${
                    isMobileLayout ? "px-4 py-3 text-sm rounded-xl" : "px-4 py-2 text-xs sm:text-[13px]"
                  }`}
                >
                  <div className="flex flex-col text-left">
                    <span>Nguồn dự phòng (Embed)</span>
                    <span className="text-[10px] text-zinc-400 font-normal">Dùng khi server chính gặp sự cố</span>
                  </div>
                </button>
              )}
            </div>
          </div>
        )}
      </>
    );

    return (
      <div
        className={`cinema-player-controls-container absolute inset-0 transition-opacity duration-300 z-30 pointer-events-none select-none ${
          isOverlayVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* =================================================================== */}
        {/* 1. TOP HEADER OVERLAY (YOUTUBE CINEMA TITLE & BADGES)                */}
        {/* =================================================================== */}
        <div
          data-player-control="true"
          onClick={(e) => {
            e.stopPropagation();
            onUserInteraction?.();
          }}
          className="pointer-events-auto absolute top-0 inset-x-0 w-full bg-gradient-to-b from-black/80 via-black/40 to-transparent pt-2.5 pb-8 px-3.5 sm:px-6 flex items-center justify-between z-10 transition-all"
          style={{
            paddingTop: "max(0.75rem, env(safe-area-inset-top, 0.75rem))",
            paddingLeft: "max(1rem, env(safe-area-inset-left, 1rem))",
            paddingRight: "max(1rem, env(safe-area-inset-right, 1rem))",
          }}
        >
          {/* Tên phim & Tập phim (co giãn thông minh trên điện thoại đứng & ngang) */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 pr-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/10 text-white/90 border border-white/10 shrink-0 shadow-sm">
              <Film className="w-3.5 h-3.5" />
            </span>
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-white font-semibold text-xs sm:text-sm md:text-base tracking-tight truncate max-w-[170px] xs:max-w-[240px] sm:max-w-md drop-shadow-md">
                {title || "Đang phát"}
              </h2>
              {activeEpisodeName && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-zinc-200 text-[11px] sm:text-xs font-medium tracking-tight shrink-0 drop-shadow-sm">
                  {activeEpisodeName}
                </span>
              )}
            </div>
          </div>

          {/* Huy hiệu độ phân giải - ĐÃ LOẠI BỎ CHỮ "TỰ ĐỘNG", chỉ hiện khi người dùng chọn độ phân giải thủ công */}
          {currentQualityIndex !== -1 && currentQualityLabel && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-white/90 font-bold text-[11px] tracking-wider uppercase backdrop-blur-md shadow-sm">
                {currentQualityLabel}
              </span>
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* 2. CENTER PLAYBACK CONTROLS (CHUẨN YOUTUBE MOBILE TỐI GIẢN & ĐẸP)   */}
        {/* =================================================================== */}
        {isBuffering ? (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none z-10 flex flex-col items-center justify-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 border-[3px] border-white/20 border-t-white rounded-full animate-spin shadow-2xl" />
          </div>
        ) : (
          <div className="md:hidden absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-6 sm:gap-10 pointer-events-none z-10">
            {/* Tua lùi 5s */}
            <button
              type="button"
              data-player-control="true"
              onClick={handleSeekBack}
              aria-label="Tua lùi 5 giây"
              className="pointer-events-auto w-11 h-11 rounded-full bg-black/45 hover:bg-black/65 active:scale-90 border border-white/10 text-white/95 flex items-center justify-center shadow-lg backdrop-blur-md transition-all cursor-pointer outline-none"
            >
              <YouTubeSeek5BackIcon className="w-5 h-5" />
            </button>

            {/* Play/Pause chính giữa - phong cách YouTube: viền mờ tinh tế, không chói đỏ */}
            <button
              type="button"
              data-player-control="true"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePlayPause();
                onUserInteraction?.();
              }}
              aria-label={isPlaying ? "Tạm dừng" : "Phát"}
              className="pointer-events-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/50 hover:bg-black/70 active:scale-95 text-white flex items-center justify-center shadow-2xl backdrop-blur-md border border-white/15 transition-transform duration-150 cursor-pointer outline-none"
            >
              {isPlaying ? (
                <YouTubePauseIcon className="w-7 h-7 sm:w-8 sm:h-8" />
              ) : (
                <YouTubePlayIcon className="w-7 h-7 sm:w-8 sm:h-8 ml-0.5" />
              )}
            </button>

            {/* Tua tới 5s */}
            <button
              type="button"
              data-player-control="true"
              onClick={handleSeekForward}
              aria-label="Tua tới 5 giây"
              className="pointer-events-auto w-11 h-11 rounded-full bg-black/45 hover:bg-black/65 active:scale-90 border border-white/10 text-white/95 flex items-center justify-center shadow-lg backdrop-blur-md transition-all cursor-pointer outline-none"
            >
              <YouTubeSeek5ForwardIcon className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* =================================================================== */}
        {/* 3. BOTTOM CONTROLS BAR (CHUẨN YOUTUBE 1:1 VỚI BÁNH RĂNG CÀI ĐẶT ⚙️) */}
        {/* =================================================================== */}
        <div
          data-player-control="true"
          onClick={(e) => {
            e.stopPropagation();
            onUserInteraction?.();
          }}
          onMouseMove={onUserInteraction}
          onPointerMove={onUserInteraction}
          onTouchStart={onUserInteraction}
          className="pointer-events-auto cinema-player-controls absolute bottom-0 inset-x-0 w-full bg-gradient-to-t from-black/85 via-black/45 to-transparent pt-6 pb-2 sm:pb-3 px-3 sm:px-5 z-20 transition-all"
          style={{
            paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0.5rem))",
            paddingLeft: "max(0.75rem, env(safe-area-inset-left, 0.75rem))",
            paddingRight: "max(0.75rem, env(safe-area-inset-right, 0.75rem))",
          }}
        >
          {/* THANH TIẾN TRÌNH SLIM YOUTUBE STYLE */}
          <PlayerScrubBar
            videoRef={videoRef}
            isNativeVideo={isNativeVideo}
            knownDuration={knownDuration}
            onSeekFeedback={onSeekFeedback}
            onScrubStart={onUserInteraction}
            onScrubEnd={onUserInteraction}
            onSeek={onSeek}
          />

          {/* HÀNG NÚT ĐIỀU KHIỂN CHÍNH */}
          <div className="flex items-center justify-between text-white mt-1">
            {/* CỤM TRÁI: PLAY/PAUSE, TẬP TIẾP, TUA 10S, ÂM LƯỢNG, THỜI GIAN TABULAR */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Nút Play / Pause */}
              <Tooltip content={isPlaying ? "Tạm dừng" : "Phát"} shortcut="Space" side="top" align="start">
                <button
                  type="button"
                  data-player-control="true"
                  onClick={onTogglePlayPause}
                  aria-label={isPlaying ? "Tạm dừng" : "Phát"}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/15 active:scale-90 text-white flex items-center justify-center transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  {isPlaying ? (
                    <YouTubePauseIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                  ) : (
                    <YouTubePlayIcon className="w-5 h-5 sm:w-6 sm:h-6 ml-0.5" />
                  )}
                </button>
              </Tooltip>

              {/* Nút Tập Tiếp Theo (YouTube Skip Track Icon) */}
              {nextEpisode?.slug && onSwitchEpisode && (
                <Tooltip content={`Tập tiếp: ${nextEpisode.name || ""}`} shortcut="Shift+N" side="top">
                  <button
                    type="button"
                    data-player-control="true"
                    onClick={() => onSwitchEpisode(nextEpisode.slug!)}
                    aria-label={`Tập tiếp: ${nextEpisode.name || ""}`}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/15 active:scale-90 text-white/90 hover:text-white flex items-center justify-center transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  >
                    <YouTubeNextIcon className="w-5 h-5" />
                  </button>
                </Tooltip>
              )}

              {/* Tua lùi 5s (Ẩn trên mobile để thanh dưới thoáng rộng) */}
              <Tooltip content="Tua lùi 5 giây" shortcut="J / ←" side="top">
                <button
                  type="button"
                  data-player-control="true"
                  onClick={handleSeekBack}
                  aria-label="Tua lùi 5 giây"
                  className="hidden sm:inline-flex w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/15 active:scale-90 text-zinc-300 hover:text-white items-center justify-center transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  <YouTubeSeek5BackIcon className="w-4.5 h-4.5" />
                </button>
              </Tooltip>

              {/* Tua tới 5s (Ẩn trên mobile) */}
              <Tooltip content="Tua tới 5 giây" shortcut="L / →" side="top">
                <button
                  type="button"
                  data-player-control="true"
                  onClick={handleSeekForward}
                  aria-label="Tua tới 5 giây"
                  className="hidden sm:inline-flex w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/15 active:scale-90 text-zinc-300 hover:text-white items-center justify-center transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  <YouTubeSeek5ForwardIcon className="w-4.5 h-4.5" />
                </button>
              </Tooltip>

              {/* Cụm Âm Lượng YouTube (Hover nở thanh kéo trượt) */}
              <div className="flex items-center group/vol">
                <Tooltip content={isMuted ? "Bật tiếng" : "Tắt tiếng"} shortcut="M" side="top">
                  <button
                    type="button"
                    data-player-control="true"
                    onClick={onToggleMute}
                    aria-label={isMuted ? "Bật tiếng" : "Tắt tiếng"}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/15 active:scale-90 text-white/90 hover:text-white flex items-center justify-center transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  >
                    {isMuted || volume === 0 ? (
                      <YouTubeVolumeMuteIcon className="w-5 h-5 text-netflix-red" />
                    ) : volume < 0.5 ? (
                      <YouTubeVolumeLowIcon className="w-5 h-5" />
                    ) : (
                      <YouTubeVolumeHighIcon className="w-5 h-5" />
                    )}
                  </button>
                </Tooltip>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                  aria-label="Âm lượng"
                  className="w-0 opacity-0 group-hover/vol:w-16 sm:group-hover/vol:w-20 group-hover/vol:opacity-100 group-focus-within/vol:w-16 sm:group-focus-within/vol:w-20 group-focus-within/vol:opacity-100 transition-all duration-200 ease-out accent-netflix-red h-1 bg-white/25 rounded-full cursor-pointer hidden sm:inline-block outline-none"
                />
              </div>

              {/* Thời gian phát Tabular Nums chuẩn YouTube */}
              <PlayerTimeDisplay
                videoRef={videoRef}
                isNativeVideo={isNativeVideo}
                knownDuration={knownDuration}
              />
            </div>

            {/* CỤM PHẢI: BÁNH RĂNG CÀI ĐẶT (SETTINGS), PIP, THEATER, FULLSCREEN */}
            <div className="flex items-center gap-0.5 sm:gap-1.5 relative">
              {/* ============================================================= */}
              {/* BÁNH RĂNG CÀI ĐẶT ⚙️ (YOUTUBE SETTINGS COMMAND CENTER)         */}
              {/* ============================================================= */}
              <div className="relative">
                <Tooltip content="Cài đặt" side="top">
                  <button
                    ref={settingsBtnRef}
                    type="button"
                    data-player-control="true"
                    onClick={() => {
                      setShowSettings(!showSettings);
                      setSettingsView("main");
                    }}
                    aria-label="Cài đặt trình phát"
                    aria-expanded={showSettings}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/15 active:scale-90 flex items-center justify-center transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                      showSettings ? "bg-white/20 text-white rotate-45" : "text-white/90 hover:text-white"
                    }`}
                  >
                    <YouTubeSettingsIcon className="w-5 h-5 transition-transform duration-300" />
                  </button>
                </Tooltip>

                {/* DESKTOP SETTINGS FLYOUT MENU */}
                {showSettings && !isMobileScreen && (
                  <div
                    ref={settingsPanelRef}
                    role="dialog"
                    aria-label="Cài đặt trình phát"
                    className="pointer-events-auto absolute bottom-full right-0 mb-3 w-[270px] sm:w-[290px] max-h-[min(380px,calc(100vh-100px))] bg-zinc-950/98 border border-white/15 rounded-2xl shadow-2xl backdrop-blur-2xl text-white overflow-y-auto z-50 animate-in fade-in zoom-in-95 duration-150"
                  >
                    {renderSettingsInner(false)}
                  </div>
                )}
              </div>

              {/* HÌNH TRONG HÌNH (MINIPLAYER / PIP) */}
              <Tooltip content="Hình trong hình (PiP)" shortcut="P" side="top">
                <button
                  type="button"
                  data-player-control="true"
                  onClick={onTogglePiP}
                  aria-label="Hình trong hình (PiP)"
                  className="hidden sm:inline-flex w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/15 active:scale-90 text-white/90 hover:text-white items-center justify-center transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  <YouTubeMiniplayerIcon className="w-5 h-5" />
                </button>
              </Tooltip>

              {/* CHẾ ĐỘ RẠP PHIM (THEATER MODE) */}
              {onToggleTheaterMode && !isFullscreen && (
                <Tooltip content={isTheaterMode ? "Thu nhỏ chế độ rạp phim" : "Chế độ rạp phim"} shortcut="T" side="top">
                  <button
                    type="button"
                    data-player-control="true"
                    onClick={onToggleTheaterMode}
                    aria-label={isTheaterMode ? "Thu nhỏ chế độ rạp phim" : "Chế độ rạp phim"}
                    className={`hidden sm:inline-flex w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/15 active:scale-90 items-center justify-center transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                      isTheaterMode ? "text-netflix-red" : "text-white/90 hover:text-white"
                    }`}
                  >
                    <YouTubeTheaterIcon className="w-5 h-5" />
                  </button>
                </Tooltip>
              )}

              {/* TOÀN MÀN HÌNH (FULLSCREEN) */}
              <Tooltip content={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"} shortcut="F" side="top" align="end">
                <button
                  type="button"
                  data-player-control="true"
                  onClick={onToggleFullscreen}
                  aria-label={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/15 active:scale-90 text-white/90 hover:text-white flex items-center justify-center transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  {isFullscreen ? (
                    <YouTubeExitFullscreenIcon className="w-5 h-5" />
                  ) : (
                    <YouTubeFullscreenIcon className="w-5 h-5" />
                  )}
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* MOBILE BOTTOM SHEET PORTAL */}
        {showSettings && isMobileScreen && mounted && portalTarget && createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Cài đặt trình phát"
            className="fixed inset-0 z-[9999999] pointer-events-auto flex flex-col justify-end select-none"
            onClick={() => {
              setShowSettings(false);
              setSettingsView("main");
            }}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200" />

            {/* Bottom Sheet Drawer */}
            <div
              ref={settingsPanelRef}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg mx-auto bg-zinc-950/98 border-t border-white/20 rounded-t-3xl shadow-[0_-15px_45px_rgba(0,0,0,0.95)] backdrop-blur-2xl text-white p-4 pb-8 max-h-[82vh] overflow-y-auto animate-in slide-in-from-bottom duration-250 transform-gpu will-change-transform"
            >
              {/* Drag Pill Indicator */}
              <div className="w-10 h-1 bg-white/25 rounded-full mx-auto mb-3" />

              {/* Header with back or title & close button */}
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  {settingsView !== "main" ? (
                    <button
                      type="button"
                      onClick={() => setSettingsView("main")}
                      className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-zinc-200 hover:text-white p-1 -ml-1 rounded-lg active:bg-white/10"
                    >
                      <ChevronLeft className="w-5 h-5 text-amber-400" />
                      <span>
                        {settingsView === "speed"
                          ? "Tốc độ phát"
                          : settingsView === "quality"
                          ? "Chất lượng video"
                          : settingsView === "fit"
                          ? "Tỉ lệ màn hình"
                          : "Nguồn phát"}
                      </span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">Cài đặt trình phát</span>
                      <span className="text-[10px] font-mono uppercase bg-netflix-red/20 border border-netflix-red/30 px-1.5 py-0.5 rounded text-rose-300 font-semibold">
                        Nanaflix
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowSettings(false);
                    setSettingsView("main");
                  }}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-400 hover:text-white transition active:scale-90"
                  aria-label="Đóng cài đặt"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {renderSettingsInner(true)}
            </div>
          </div>,
          portalTarget
        )}
      </div>
    );
  }
);

export default PlayerNativeControls;
