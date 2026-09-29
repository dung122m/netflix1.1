"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Settings,
  Scaling,
  Check,
  PictureInPicture,
  Tv,
  Maximize2,
  Minimize2,
  SkipForward,
} from "lucide-react";
import { PlayerScrubBar, PlayerTimeDisplay } from "../PlayerScrubBar";

export type VideoFit = "contain" | "cover" | "fill" | "zoom";

const FIT_OPTIONS: Array<{ id: VideoFit; label: string }> = [
  { id: "contain", label: "Vừa khung" },
  { id: "cover", label: "Lấp đầy" },
  { id: "fill", label: "Kéo dãn" },
  { id: "zoom", label: "Zoom" },
];

export const SeekBack10Icon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <text
      x="12"
      y="15.5"
      textAnchor="middle"
      fill="currentColor"
      stroke="none"
      fontSize="8.5"
      fontWeight="900"
      fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    >
      10
    </text>
  </svg>
);

export const SeekForward10Icon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.99 6.57 2.6L21 8" />
    <path d="M21 3v5h-5" />
    <text
      x="12"
      y="15.5"
      textAnchor="middle"
      fill="currentColor"
      stroke="none"
      fontSize="8.5"
      fontWeight="900"
      fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    >
      10
    </text>
  </svg>
);

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
  onToggleFullscreen: () => void;
  onSwitchEpisode?: (slug: string) => void;
  onUserInteraction?: () => void;
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
    onToggleFullscreen,
    onSwitchEpisode,
    onUserInteraction,
  }) {
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [showQualityMenu, setShowQualityMenu] = useState(false);
    const [showFitMenu, setShowFitMenu] = useState(false);

    const speedBtnRef = useRef<HTMLButtonElement>(null);
    const qualityBtnRef = useRef<HTMLButtonElement>(null);
    const fitBtnRef = useRef<HTMLButtonElement>(null);

    // Xử lý phím Escape / Backspace để đóng menu popup và trả focus chuẩn xác về nút trigger
    useEffect(() => {
      if (!showSpeedMenu && !showQualityMenu && !showFitMenu) return;

      const handlePopupKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" || e.key === "Backspace") {
          e.preventDefault();
          e.stopPropagation();
          if (showSpeedMenu) {
            setShowSpeedMenu(false);
            speedBtnRef.current?.focus();
          }
          if (showQualityMenu) {
            setShowQualityMenu(false);
            qualityBtnRef.current?.focus();
          }
          if (showFitMenu) {
            setShowFitMenu(false);
            fitBtnRef.current?.focus();
          }
        }
      };

      window.addEventListener("keydown", handlePopupKeyDown, { capture: true });
      return () => {
        window.removeEventListener("keydown", handlePopupKeyDown, { capture: true });
      };
    }, [showSpeedMenu, showQualityMenu, showFitMenu]);

    const isOverlayVisible = showControls || !isPlaying || showSpeedMenu || showQualityMenu || showFitMenu;

    return (
      <div
        className={`cinema-player-controls-container absolute inset-0 transition-opacity duration-300 z-30 ${
          isOverlayVisible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* 1. TOP HEADER OVERLAY (Netflix Style Title & Episode Info) */}
        <div
          data-player-control="true"
          onClick={(e) => {
            e.stopPropagation();
            onUserInteraction?.();
          }}
          className="absolute top-0 inset-x-0 w-full bg-gradient-to-b from-black/85 via-black/40 to-transparent pt-3 pb-8 px-3 sm:px-5 flex items-center justify-between z-10"
          style={{
            paddingTop: "max(0.75rem, env(safe-area-inset-top, 0.75rem))",
            paddingLeft: "max(0.75rem, env(safe-area-inset-left, 0.75rem))",
            paddingRight: "max(0.75rem, env(safe-area-inset-right, 0.75rem))",
          }}
        >
          {/* Left: Movie Title & Episode Name */}
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <div className="w-1.5 h-4 rounded-full bg-netflix-red flex-shrink-0" />
            <span className="text-white font-bold text-xs sm:text-sm truncate drop-shadow-md">
              {title || "Đang phát"}
            </span>
            {activeEpisodeName && (
              <span className="text-gray-300 text-[11px] sm:text-xs font-normal truncate drop-shadow-md">
                • {activeEpisodeName}
              </span>
            )}
          </div>

          {/* Right: Badges / Info */}
          <div className="flex items-center gap-1.5 shrink-0">
            {currentQualityIndex !== -1 && (
              <span className="px-2 py-0.5 rounded-full bg-white/15 border border-white/10 text-white font-mono font-bold text-[10px] backdrop-blur-sm">
                {qualityLevels.find((q) => q.id === currentQualityIndex)?.label || "HD"}
              </span>
            )}
          </div>
        </div>

        {/* 2. CENTER PLAYBACK CONTROLS CLUSTER / BUFFERING SPINNER (YouTube & Netflix Style) */}
        {isBuffering ? (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none z-10 flex flex-col items-center justify-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-white/20 border-t-netflix-red rounded-full animate-spin shadow-2xl" />
          </div>
        ) : (
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-6 sm:gap-10 pointer-events-none select-none z-10"
          >
            {/* Tua lùi 10s */}
            <button
              type="button"
              data-player-control="true"
              data-control-section="center-controls"
              onClick={(e) => {
                e.stopPropagation();
                if (videoRef.current) {
                  videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
                }
                onSeekFeedback("-10s");
                onUserInteraction?.();
              }}
              title="Tua lùi 10 giây (←)"
              className="pointer-events-auto w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-black/60 hover:bg-black/80 active:scale-90 hover:scale-105 border border-white/20 text-white flex items-center justify-center shadow-xl backdrop-blur-md transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-netflix-red"
            >
              <SeekBack10Icon className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Big Center Play / Pause */}
            <button
              type="button"
              data-player-control="true"
              data-control-section="center-controls"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePlayPause();
                onUserInteraction?.();
              }}
              title={isPlaying ? "Tạm dừng (Space)" : "Phát (Space)"}
              className="pointer-events-auto w-14 h-14 sm:w-18 sm:h-18 rounded-full bg-netflix-red/95 hover:bg-netflix-red active:scale-90 hover:scale-105 border border-white/30 text-white flex items-center justify-center shadow-[0_0_30px_rgba(229,9,20,0.6)] backdrop-blur-md transition-all cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-white/50"
            >
              {isPlaying ? (
                <Pause className="w-7 h-7 sm:w-8 sm:h-8 fill-white" />
              ) : (
                <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-white ml-1" />
              )}
            </button>

            {/* Tua tới 10s */}
            <button
              type="button"
              data-player-control="true"
              data-control-section="center-controls"
              onClick={(e) => {
                e.stopPropagation();
                if (videoRef.current) {
                  videoRef.current.currentTime = (videoRef.current.currentTime || 0) + 10;
                }
                onSeekFeedback("+10s");
                onUserInteraction?.();
              }}
              title="Tua tới 10 giây (→)"
              className="pointer-events-auto w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-black/60 hover:bg-black/80 active:scale-90 hover:scale-105 border border-white/20 text-white flex items-center justify-center shadow-xl backdrop-blur-md transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-netflix-red"
            >
              <SeekForward10Icon className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        )}

        {/* 3. BOTTOM CONTROLS BAR (Sleek, Compact YouTube / Netflix Style) */}
        <div
          data-player-control="true"
          onClick={(e) => {
            e.stopPropagation();
            onUserInteraction?.();
          }}
          onMouseMove={onUserInteraction}
          onPointerMove={onUserInteraction}
          onTouchStart={onUserInteraction}
          className="cinema-player-controls absolute bottom-0 inset-x-0 w-full bg-gradient-to-t from-black/95 via-black/75 to-transparent pt-6 pb-2.5 sm:pb-3 px-3 sm:px-5 z-10"
          style={{
            paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0.75rem))",
            paddingLeft: "max(0.75rem, env(safe-area-inset-left, 0.75rem))",
            paddingRight: "max(0.75rem, env(safe-area-inset-right, 0.75rem))",
          }}
        >
          {/* THANH TIẾN TRÌNH SLIM CÁCH LY RE-RENDER */}
          <PlayerScrubBar
            videoRef={videoRef}
            isNativeVideo={isNativeVideo}
            knownDuration={knownDuration}
            onSeekFeedback={onSeekFeedback}
            onScrubStart={onUserInteraction}
            onScrubEnd={onUserInteraction}
          />

          {/* HÀNG CÁC NÚT ĐIỀU KHIỂN CHÍNH */}
          <div className="flex items-center justify-between text-white text-xs sm:text-sm">
            {/* Cụm Trái: Play/Pause phụ, Âm lượng, Hiển thị thời gian inline */}
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              {/* Play / Pause Nút phụ góc trái */}
              <button
                type="button"
                data-player-control="true"
                data-control-section="main-controls"
                onClick={onTogglePlayPause}
                title={isPlaying ? "Tạm dừng (Space)" : "Phát (Space)"}
                className="p-1.5 sm:p-2 rounded-full hover:bg-white/20 text-white transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:scale-110 focus-visible:bg-white/25"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
                ) : (
                  <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white ml-0.5" />
                )}
              </button>

              {/* Âm lượng */}
              <div className="flex items-center gap-1 group/vol">
                <button
                  type="button"
                  data-player-control="true"
                  data-control-section="main-controls"
                  onClick={onToggleMute}
                  title={isMuted ? "Bật tiếng (M)" : "Tắt tiếng (M)"}
                  className="p-1.5 sm:p-2 rounded-full hover:bg-white/20 text-gray-200 hover:text-white transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:scale-110 focus-visible:bg-white/25"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : volume < 0.5 ? (
                    <Volume1 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                  className="w-14 sm:w-20 accent-netflix-red h-1.5 bg-white/20 rounded-full cursor-pointer hidden sm:inline-block outline-none focus-visible:ring-2 focus-visible:ring-netflix-red"
                />
              </div>

              {/* Hiển thị thời gian inline YouTube Style */}
              <PlayerTimeDisplay
                videoRef={videoRef}
                isNativeVideo={isNativeVideo}
                knownDuration={knownDuration}
              />
            </div>

            {/* Cụm Phải: Tập tiếp theo, Tốc độ, Chất lượng, Tỷ lệ khung hình, PiP, Toàn màn hình */}
            <div className="flex items-center gap-1 sm:gap-1.5 relative">
              {/* Nút Tập tiếp theo nhanh */}
              {nextEpisode?.slug && onSwitchEpisode && (
                <button
                  type="button"
                  data-player-control="true"
                  data-control-section="main-controls"
                  onClick={() => onSwitchEpisode(nextEpisode.slug!)}
                  title={`Tập tiếp: ${nextEpisode.name || ""}`}
                  className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-netflix-red"
                >
                  <SkipForward className="w-3.5 h-3.5 fill-white" />
                  <span className="hidden md:inline">Tập tiếp</span>
                </button>
              )}

              {/* TỐC ĐỘ PHÁT */}
              <div className="relative">
                <button
                  ref={speedBtnRef}
                  type="button"
                  data-player-control="true"
                  data-control-section="main-controls"
                  onClick={() => {
                    setShowSpeedMenu(!showSpeedMenu);
                    setShowQualityMenu(false);
                    setShowFitMenu(false);
                  }}
                  title="Tốc độ phát"
                  className="px-2 py-1 rounded-md hover:bg-white/20 text-gray-200 hover:text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1 outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:scale-105 focus-visible:bg-white/25"
                >
                  <span>{playbackSpeed}x</span>
                </button>
                {showSpeedMenu && (
                  <div
                    data-player-menu="true"
                    className="absolute bottom-full right-0 mb-2 py-1.5 w-24 bg-zinc-900/95 border border-white/15 rounded-xl shadow-2xl backdrop-blur-md z-50 text-xs flex flex-col"
                  >
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        data-player-menu-item="true"
                        tabIndex={0}
                        onClick={() => {
                          onSpeedChange(spd);
                          setShowSpeedMenu(false);
                        }}
                        className={`px-3 py-1.5 text-left hover:bg-white/15 transition cursor-pointer flex items-center justify-between outline-none focus-visible:bg-white/20 focus-visible:text-white ${
                          playbackSpeed === spd ? "text-netflix-red font-bold" : "text-gray-300"
                        }`}
                      >
                        <span>{spd}x</span>
                        {playbackSpeed === spd && <span className="w-1.5 h-1.5 rounded-full bg-netflix-red" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* CHẤT LƯỢNG VIDEO */}
              {qualityLevels.length > 0 && (
                <div className="relative">
                  <button
                    ref={qualityBtnRef}
                    type="button"
                    data-player-control="true"
                    data-control-section="main-controls"
                    onClick={() => {
                      setShowQualityMenu(!showQualityMenu);
                      setShowSpeedMenu(false);
                      setShowFitMenu(false);
                    }}
                    title="Chất lượng video"
                    className="p-1.5 sm:p-2 rounded-full hover:bg-white/20 text-gray-200 hover:text-white transition cursor-pointer flex items-center outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:scale-110 focus-visible:bg-white/25"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  {showQualityMenu && (
                    <div
                      data-player-menu="true"
                      className="absolute bottom-full right-0 mb-2 py-1.5 w-28 bg-zinc-900/95 border border-white/15 rounded-xl shadow-2xl backdrop-blur-md z-50 text-xs flex flex-col"
                    >
                      <button
                        type="button"
                        data-player-menu-item="true"
                        tabIndex={0}
                        onClick={() => {
                          onQualityChange(-1);
                          setShowQualityMenu(false);
                        }}
                        className={`px-3 py-1.5 text-left hover:bg-white/15 transition cursor-pointer flex items-center justify-between outline-none focus-visible:bg-white/20 focus-visible:text-white ${
                          currentQualityIndex === -1 ? "text-netflix-red font-bold" : "text-gray-300"
                        }`}
                      >
                        <span>Tự động</span>
                        {currentQualityIndex === -1 && <span className="w-1.5 h-1.5 rounded-full bg-netflix-red" />}
                      </button>
                      {qualityLevels.map((lvl) => (
                        <button
                          key={lvl.id}
                          type="button"
                          data-player-menu-item="true"
                          tabIndex={0}
                          onClick={() => {
                            onQualityChange(lvl.id);
                            setShowQualityMenu(false);
                          }}
                          className={`px-3 py-1.5 text-left hover:bg-white/15 transition cursor-pointer flex items-center justify-between outline-none focus-visible:bg-white/20 focus-visible:text-white ${
                            currentQualityIndex === lvl.id ? "text-netflix-red font-bold" : "text-gray-300"
                          }`}
                        >
                          <span>{lvl.label}</span>
                          {currentQualityIndex === lvl.id && <span className="w-1.5 h-1.5 rounded-full bg-netflix-red" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TỶ LỆ KHUNG HÌNH (SCREEN FIT) */}
              {isNativeVideo && (
                <div className="relative">
                  <button
                    ref={fitBtnRef}
                    type="button"
                    data-player-control="true"
                    data-control-section="main-controls"
                    onClick={() => {
                      setShowFitMenu(!showFitMenu);
                      setShowSpeedMenu(false);
                      setShowQualityMenu(false);
                    }}
                    title="Tỷ lệ màn hình"
                    className="p-1.5 sm:p-2 rounded-full hover:bg-white/20 text-gray-200 hover:text-white transition cursor-pointer flex items-center outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:scale-110 focus-visible:bg-white/25"
                  >
                    <Scaling className="w-4 h-4" />
                  </button>
                  {showFitMenu && (
                    <div
                      data-player-menu="true"
                      className="absolute bottom-full right-0 mb-2 py-1.5 w-32 bg-zinc-900/95 border border-white/15 rounded-xl shadow-2xl backdrop-blur-md z-50 text-xs flex flex-col"
                    >
                      {FIT_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          data-player-menu-item="true"
                          tabIndex={0}
                          onClick={() => {
                            onVideoFitChange?.(opt.id);
                            setShowFitMenu(false);
                          }}
                          className={`px-3 py-1.5 text-left hover:bg-white/15 transition cursor-pointer flex items-center justify-between outline-none focus-visible:bg-white/20 focus-visible:text-white ${
                            videoFit === opt.id ? "text-netflix-red font-bold" : "text-gray-300"
                          }`}
                        >
                          <span>{opt.label}</span>
                          {videoFit === opt.id && <Check className="w-3.5 h-3.5 text-netflix-red" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PiP */}
              <button
                type="button"
                data-player-control="true"
                data-control-section="main-controls"
                onClick={onTogglePiP}
                title="Hình trong hình (PiP)"
                className="hidden sm:inline-flex p-1.5 sm:p-2 rounded-full hover:bg-white/20 text-gray-200 hover:text-white transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:scale-110 focus-visible:bg-white/25"
              >
                <PictureInPicture className="w-4 h-4" />
              </button>

              {/* Iframe Fallback Toggle */}
              {embedSrc && (
                <button
                  type="button"
                  data-player-control="true"
                  data-control-section="main-controls"
                  onClick={onUseIframeFallback}
                  title="Đổi nguồn phát"
                  className="hidden md:inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-gray-300 text-[11px] font-medium transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:bg-white/25"
                >
                  <Tv className="w-3 h-3" />
                  <span>Iframe</span>
                </button>
              )}

              {/* Fullscreen */}
              <button
                type="button"
                data-player-control="true"
                data-control-section="main-controls"
                onClick={onToggleFullscreen}
                title={isFullscreen ? "Thoát toàn màn hình (F)" : "Toàn màn hình (F)"}
                className="p-1.5 sm:p-2 rounded-full hover:bg-white/20 text-gray-200 hover:text-white transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:scale-110 focus-visible:bg-white/25"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
