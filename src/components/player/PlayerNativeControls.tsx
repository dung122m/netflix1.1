"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Film } from "lucide-react";
import { PlayerScrubBar, PlayerTimeDisplay } from "./PlayerScrubBar";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  YouTubePlayIcon,
  YouTubePauseIcon,
  YouTubePrevIcon,
  YouTubeNextIcon,
  YouTubeVolumeHighIcon,
  YouTubeVolumeLowIcon,
  YouTubeVolumeMuteIcon,
  YouTubeSettingsIcon,
  YouTubeMiniplayerIcon,
  YouTubeTheaterIcon,
  YouTubeFullscreenIcon,
  YouTubeExitFullscreenIcon,
  YouTubeSeek5BackIcon,
  YouTubeSeek5ForwardIcon,
  YouTubeSeek10BackIcon,
  YouTubeSeek10ForwardIcon,
} from "./PlayerIcons";
import { PlayerSettingsMenu, QualityLevel, VideoFit } from "./PlayerSettingsMenu";

// Re-export biểu tượng & types để không làm vỡ import hiện tại của CinemaPlayer, LivePlayer, LiveTvClient, VolumeOsdPill
export {
  YouTubePlayIcon,
  YouTubePauseIcon,
  YouTubePrevIcon,
  YouTubeNextIcon,
  YouTubeVolumeHighIcon,
  YouTubeVolumeLowIcon,
  YouTubeVolumeMuteIcon,
  YouTubeSettingsIcon,
  YouTubeMiniplayerIcon,
  YouTubeTheaterIcon,
  YouTubeFullscreenIcon,
  YouTubeExitFullscreenIcon,
  YouTubeSeek5BackIcon,
  YouTubeSeek5ForwardIcon,
  YouTubeSeek10BackIcon,
  YouTubeSeek10ForwardIcon,
};
export type { VideoFit };

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
  prevEpisode?: { name?: string; slug?: string } | null;
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
  onToggleFullscreen: () => void;
  onSwitchEpisode?: (slug: string) => void;
  onUserInteraction?: () => void;
  onSeek?: (targetTime: number) => void;
  autoNextEpisode?: boolean;
  onToggleAutoNextEpisode?: () => void;
  autoSubtitle?: boolean;
  onToggleAutoSubtitle?: () => void;
}

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
    prevEpisode,
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
    onToggleFullscreen,
    onSwitchEpisode,
    onUserInteraction,
    onSeek,
    autoNextEpisode = true,
    onToggleAutoNextEpisode,
    autoSubtitle = true,
    onToggleAutoSubtitle,
  }) {
    const [showSettings, setShowSettings] = useState(false);
    const [loopVideo, setLoopVideo] = useState(false);
    const settingsBtnRef = useRef<HTMLButtonElement>(null);

    // Kích hoạt lặp lại video
    useEffect(() => {
      if (videoRef.current) {
        videoRef.current.loop = loopVideo;
      }
    }, [loopVideo, videoRef]);

    const handleCloseSettings = useCallback(() => {
      setShowSettings(false);
    }, []);

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

    return (
      <div
        className={`cinema-player-controls-container absolute inset-0 transition-opacity duration-300 z-30 pointer-events-none select-none ${
          isOverlayVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* 1. TOP HEADER OVERLAY (YOUTUBE CINEMA TITLE & BADGES) */}
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
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 pr-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/10 text-white/90 shrink-0 shadow-sm">
              <Film className="w-3.5 h-3.5" />
            </span>
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-white font-semibold text-xs sm:text-sm md:text-base tracking-tight truncate max-w-[160px] min-[380px]:max-w-[220px] sm:max-w-md drop-shadow-md">
                {title || "Đang phát"}
              </h2>
              {activeEpisodeName && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/10 text-zinc-200 text-[11px] sm:text-xs font-medium tracking-tight shrink-0 drop-shadow-sm">
                  {activeEpisodeName}
                </span>
              )}
            </div>
          </div>

          {currentQualityIndex !== -1 && currentQualityLabel && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-2 py-0.5 rounded-md bg-white/10 text-white/90 font-bold text-[11px] tracking-wider uppercase backdrop-blur-md shadow-sm">
                {currentQualityLabel}
              </span>
            </div>
          )}
        </div>

        {/* 2. CENTER PLAYBACK CONTROLS (CHUẨN MOBILE TỐI GIẢN: CHỈ DUY NHẤT 1 NÚT PLAY/PAUSE - KHÔNG HIỂN THỊ NÚT TUA) */}
        {isBuffering ? (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none z-10 flex flex-col items-center justify-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 border-[3px] border-white/20 border-t-white rounded-full animate-spin shadow-2xl" />
          </div>
        ) : (
          <div className="md:hidden absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-10">
            {/* Nút Play / Pause to rõ ở giữa */}
            <button
              type="button"
              data-player-control="true"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePlayPause();
                onUserInteraction?.();
              }}
              aria-label={isPlaying ? "Tạm dừng" : "Phát"}
              className="pointer-events-auto w-14 h-14 min-[380px]:w-16 min-[380px]:h-16 rounded-full bg-black/60 hover:bg-black/80 active:scale-95 text-white flex items-center justify-center shadow-2xl backdrop-blur-md transition-transform duration-150 cursor-pointer outline-none ring-1 ring-white/20"
            >
              {isPlaying ? (
                <YouTubePauseIcon className="w-8 h-8 min-[380px]:w-9 min-[380px]:h-9" />
              ) : (
                <YouTubePlayIcon className="w-8 h-8 min-[380px]:w-9 min-[380px]:h-9 ml-0.5" />
              )}
            </button>
          </div>
        )}

        {/* 3. BOTTOM CONTROLS BAR */}
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
          <PlayerScrubBar
            videoRef={videoRef}
            isNativeVideo={isNativeVideo}
            knownDuration={knownDuration}
            onSeekFeedback={onSeekFeedback}
            onScrubStart={onUserInteraction}
            onScrubEnd={onUserInteraction}
            onSeek={onSeek}
          />

          <div className="flex items-center justify-between text-white mt-1">
            {/* CỤM TRÁI: PLAY/PAUSE, TẬP TRƯỚC/TIẾP, TUA 5S, ÂM LƯỢNG, THỜI GIAN */}
            <div className="flex items-center gap-1 sm:gap-2">
              {prevEpisode?.slug && onSwitchEpisode && (
                <Tooltip content={`Tập trước: ${prevEpisode.name || ""}`} shortcut="P" side="top">
                  <button
                    type="button"
                    data-player-control="true"
                    onClick={() => onSwitchEpisode(prevEpisode.slug!)}
                    aria-label={`Tập trước: ${prevEpisode.name || ""}`}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/15 active:scale-90 text-white/90 hover:text-white flex items-center justify-center transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  >
                    <YouTubePrevIcon className="w-5 h-5" />
                  </button>
                </Tooltip>
              )}

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

              {nextEpisode?.slug && onSwitchEpisode && (
                <Tooltip content={`Tập tiếp: ${nextEpisode.name || ""}`} shortcut="N" side="top">
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

              <PlayerTimeDisplay
                videoRef={videoRef}
                isNativeVideo={isNativeVideo}
                knownDuration={knownDuration}
              />
            </div>

            {/* CỤM PHẢI: CÀI ĐẶT, PIP, THEATER, FULLSCREEN */}
            <div className="flex items-center gap-0.5 sm:gap-1.5 relative">
              <div className="relative">
                <Tooltip content="Cài đặt" side="top">
                  <button
                    ref={settingsBtnRef}
                    type="button"
                    data-player-control="true"
                    onClick={() => setShowSettings((prev) => !prev)}
                    aria-label="Cài đặt trình phát"
                    aria-expanded={showSettings}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/15 active:scale-90 flex items-center justify-center transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                      showSettings ? "bg-white/20 text-white rotate-45" : "text-white/90 hover:text-white"
                    }`}
                  >
                    <YouTubeSettingsIcon className="w-5 h-5 transition-transform duration-300" />
                  </button>
                </Tooltip>

                <PlayerSettingsMenu
                  isOpen={showSettings}
                  onClose={handleCloseSettings}
                  anchorRef={settingsBtnRef}
                  playbackSpeed={playbackSpeed}
                  qualityLevels={qualityLevels}
                  currentQualityIndex={currentQualityIndex}
                  currentQualityLabel={currentQualityLabel}
                  videoFit={videoFit}
                  isNativeVideo={isNativeVideo}
                  embedSrc={embedSrc}
                  loopVideo={loopVideo}
                  onToggleLoop={() => setLoopVideo((prev) => !prev)}
                  onSpeedChange={onSpeedChange}
                  onQualityChange={onQualityChange}
                  onVideoFitChange={onVideoFitChange}
                  onUseIframeFallback={onUseIframeFallback}
                  autoNextEpisode={autoNextEpisode}
                  onToggleAutoNextEpisode={onToggleAutoNextEpisode}
                  autoSubtitle={autoSubtitle}
                  onToggleAutoSubtitle={onToggleAutoSubtitle}
                />
              </div>

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
      </div>
    );
  }
);

export default PlayerNativeControls;
