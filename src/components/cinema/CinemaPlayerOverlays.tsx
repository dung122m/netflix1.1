"use client";

import React from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Play, Zap } from "lucide-react";
import { CinemaNextEpisodePrompt } from "@/components/cinema/CinemaNextEpisodePrompt";
import {
  PlayerNativeControls,
  VideoFit,
  YouTubePauseIcon,
  YouTubePlayIcon,
  YouTubeVolumeHighIcon,
  YouTubeVolumeLowIcon,
  YouTubeVolumeMuteIcon,
} from "@/components/player/PlayerNativeControls";
import { formatEpisodeName } from "@/lib/formatEpisode";
import { toOptimizedCardBackdropUrl, toFastCdnImageUrl } from "@/lib/movieMedia";
import { type EpisodeItem } from "@/components/cinema/cinemaStreamHelpers";
import {
  type DesktopFeedbackState,
  type HudNotificationState,
  type VolumeOsdState,
} from "@/components/cinema/hooks/useCinemaOsdAndControls";
import { type QualityLevelItem } from "@/components/cinema/hooks/useCinemaHlsEngine";

export interface CinemaNativeVideoStageProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isFullscreen: boolean;
  isPlaying: boolean;
  showControls: boolean;
  videoFit: VideoFit;
  isAdTransitioning: boolean;
  desktopFeedback: DesktopFeedbackState | null;
  volumeOsd: VolumeOsdState | null;
  hudNotification: HudNotificationState | null;
  isBuffering: boolean;
  isMuted: boolean;
  volume: number;
  playbackSpeed: number;
  qualityLevels: QualityLevelItem[];
  currentQualityIndex: number;
  isNativeVideo: boolean;
  knownDuration: number;
  embedSrc?: string;
  title: string;
  activeEpisodeName?: string;
  effectivePrevEpisode: EpisodeItem | null;
  effectiveNextEpisode: EpisodeItem | null;
  isTheaterMode: boolean;
  autoNextEpisode: boolean;
  autoSubtitle: boolean;
  showNextEpCountdown: boolean;
  posterUrl: string;
  nextEpCountdown: number;
  onDoubleClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave: () => void;
  onTogglePlayPause: () => void;
  onSeekFeedback: (txt: string) => void;
  onToggleMute: () => void;
  onVolumeChange: (newVol: number) => void;
  onSpeedChange: (spd: number) => void;
  onQualityChange: (lvl: number) => void;
  onVideoFitChange: (fit: VideoFit) => void;
  onTogglePiP: () => void;
  onUseIframeFallback: () => void;
  onToggleTheaterMode: () => void;
  onToggleFullscreen: () => void;
  onSwitchEpisode: (slug: string) => void;
  onUserInteraction: () => void;
  onSeek: (targetTime: number) => void;
  onToggleAutoNextEpisode: () => void;
  onToggleAutoSubtitle: () => void;
  onPlayNextEpisode: () => void;
  onDismissNextEpisode: () => void;
}

export const CinemaNativeVideoStage: React.FC<CinemaNativeVideoStageProps> = ({
  videoRef,
  isFullscreen,
  isPlaying,
  showControls,
  videoFit,
  isAdTransitioning,
  desktopFeedback,
  volumeOsd,
  hudNotification,
  isBuffering,
  isMuted,
  volume,
  playbackSpeed,
  qualityLevels,
  currentQualityIndex,
  isNativeVideo,
  knownDuration,
  embedSrc,
  title,
  activeEpisodeName,
  effectivePrevEpisode,
  effectiveNextEpisode,
  isTheaterMode,
  autoNextEpisode,
  autoSubtitle,
  showNextEpCountdown,
  posterUrl,
  nextEpCountdown,
  onDoubleClick,
  onClick,
  onMouseMove,
  onMouseLeave,
  onTogglePlayPause,
  onSeekFeedback,
  onToggleMute,
  onVolumeChange,
  onSpeedChange,
  onQualityChange,
  onVideoFitChange,
  onTogglePiP,
  onUseIframeFallback,
  onToggleTheaterMode,
  onToggleFullscreen,
  onSwitchEpisode,
  onUserInteraction,
  onSeek,
  onToggleAutoNextEpisode,
  onToggleAutoSubtitle,
  onPlayNextEpisode,
  onDismissNextEpisode,
}) => {
  return (
    <div
      className={`w-full h-full relative ${
        isFullscreen && isPlaying && !showControls ? "cursor-none" : "cursor-pointer"
      }`}
      onDoubleClick={onDoubleClick}
      onClick={onClick}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <video
        ref={videoRef}
        className={`w-full h-full bg-black transition-transform duration-200 ${
          videoFit === "cover"
            ? "object-cover"
            : videoFit === "fill"
            ? "object-fill"
            : "object-contain"
        }`}
        style={{
          transform: videoFit === "zoom" ? "scale(1.18)" : "none",
        }}
        playsInline
        autoPlay
        preload="auto"
      />

      {/* AUTO-SKIP SMOOTH TRANSITION OVERLAY (TC-AD-SKIP-ZERO-FLASH) */}
      {isAdTransitioning && (
        <div className="absolute inset-0 bg-black pointer-events-none z-20" />
      )}

      {/* DESKTOP PLAYBACK FEEDBACK ICONS (PAUSE / PLAY) - Chỉ hiện trên desktop, tránh chồng lấn nút center trên mobile */}
      {desktopFeedback &&
        (desktopFeedback.type === "play" || desktopFeedback.type === "pause") && (
          <div
            key={desktopFeedback.id}
            className="hidden md:flex absolute inset-0 items-center justify-center pointer-events-none z-20"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/60 backdrop-blur-xl text-white flex items-center justify-center shadow-2xl animate-in fade-in zoom-in-75 duration-150">
              {desktopFeedback.type === "play" ? (
                <YouTubePlayIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white ml-0.5" />
              ) : (
                <YouTubePauseIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              )}
            </div>
          </div>
        )}

      {/* SEEK FEEDBACK (MINIMALIST YOUTUBE STYLE: < -5s HOẶC +5s >) */}
      {desktopFeedback && desktopFeedback.type === "seek-left" && (
        <div
          key={desktopFeedback.id}
          role="status"
          aria-live="polite"
          className="absolute left-6 sm:left-12 top-1/2 -translate-y-1/2 pointer-events-none z-30 animate-in fade-in zoom-in-95 slide-in-from-right-2 duration-150 motion-reduce:animate-none"
        >
          <div className="flex items-center gap-1 text-white font-bold text-xs sm:text-sm md:text-base tracking-tight select-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            <span>−{desktopFeedback.seconds || 5}s</span>
          </div>
        </div>
      )}

      {desktopFeedback && desktopFeedback.type === "seek-right" && (
        <div
          key={desktopFeedback.id}
          role="status"
          aria-live="polite"
          className="absolute right-6 sm:right-12 top-1/2 -translate-y-1/2 pointer-events-none z-30 animate-in fade-in zoom-in-95 slide-in-from-left-2 duration-150 motion-reduce:animate-none"
        >
          <div className="flex items-center gap-1 text-white font-bold text-xs sm:text-sm md:text-base tracking-tight select-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
            <span>+{desktopFeedback.seconds || 5}s</span>
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
          </div>
        </div>
      )}

      {/* PREMIUM YOUTUBE TOP PILL VOLUME OSD */}
      {volumeOsd && volumeOsd.visible && (
        <div
          role="status"
          aria-live="polite"
          className={`absolute left-1/2 -translate-x-1/2 z-40 pointer-events-none max-w-[calc(100%-24px)] sm:max-w-[calc(100%-32px)] transition-all duration-200 animate-in fade-in slide-in-from-top-3 motion-reduce:animate-none ${
            showControls
              ? "top-11 min-[380px]:top-12 sm:top-14"
              : "top-3.5 sm:top-7"
          }`}
        >
          <div className="flex items-center gap-2.5 sm:gap-3 px-3 py-1.5 sm:px-4.5 sm:py-2.5 rounded-full bg-zinc-950/90 backdrop-blur-2xl text-white shadow-[0_12px_36px_rgba(0,0,0,0.85)]">
            {volumeOsd.isMuted || volumeOsd.volume === 0 ? (
              <YouTubeVolumeMuteIcon className="w-4 h-4 sm:w-5 sm:h-5 text-netflix-red shrink-0" />
            ) : volumeOsd.volume < 0.5 ? (
              <YouTubeVolumeLowIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white/90 shrink-0" />
            ) : (
              <YouTubeVolumeHighIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white/90 shrink-0" />
            )}

            <div className="w-20 sm:w-28 h-1.5 rounded-full bg-white/20 overflow-hidden shrink-0">
              <div
                className="h-full bg-gradient-to-r from-white to-zinc-200 rounded-full transition-all duration-150 ease-out"
                style={{
                  width: `${
                    volumeOsd.isMuted ? 0 : Math.round(volumeOsd.volume * 100)
                  }%`,
                }}
              />
            </div>

            <span className="text-[11px] sm:text-[13px] font-semibold tracking-tight tabular-nums text-white min-w-[30px] sm:min-w-[34px] text-right">
              {volumeOsd.isMuted
                ? "Tắt tiếng"
                : `${Math.round(volumeOsd.volume * 100)}%`}
            </span>
          </div>
        </div>
      )}

      {/* GENERAL HUD PILL (SPEED, QUALITY, PIP, EPISODE) */}
      {(!volumeOsd || !volumeOsd.visible) && hudNotification && (
        <div
          role="status"
          aria-live="polite"
          className={`absolute left-1/2 -translate-x-1/2 z-40 pointer-events-none max-w-[calc(100%-24px)] sm:max-w-[calc(100%-32px)] transition-all duration-200 animate-in fade-in slide-in-from-top-3 motion-reduce:animate-none ${
            showControls
              ? "top-11 min-[380px]:top-12 sm:top-14"
              : "top-3.5 sm:top-7"
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-2.5 px-3 py-1 sm:px-4 sm:py-2 rounded-full bg-zinc-950/90 backdrop-blur-2xl text-white text-[11px] sm:text-[13px] font-semibold tracking-tight shadow-[0_12px_36px_rgba(0,0,0,0.85)] whitespace-nowrap">
            {hudNotification.icon}
            <span className="truncate max-w-[220px] sm:max-w-none">
              {hudNotification.text}
            </span>
          </div>
        </div>
      )}

      {/* ISOLATED NATIVE CONTROLS OVERLAY (NETFLIX & YOUTUBE STYLE) */}
      <PlayerNativeControls
        showControls={showControls}
        isPlaying={isPlaying}
        isBuffering={isBuffering}
        isMuted={isMuted}
        volume={volume}
        playbackSpeed={playbackSpeed}
        qualityLevels={qualityLevels}
        currentQualityIndex={currentQualityIndex}
        videoFit={videoFit}
        isFullscreen={isFullscreen}
        isNativeVideo={isNativeVideo}
        knownDuration={knownDuration}
        embedSrc={embedSrc}
        videoRef={videoRef}
        title={title}
        activeEpisodeName={
          activeEpisodeName ? formatEpisodeName(activeEpisodeName) : undefined
        }
        prevEpisode={effectivePrevEpisode}
        nextEpisode={effectiveNextEpisode}
        onTogglePlayPause={onTogglePlayPause}
        onSeekFeedback={onSeekFeedback}
        onToggleMute={onToggleMute}
        onVolumeChange={onVolumeChange}
        onSpeedChange={onSpeedChange}
        onQualityChange={onQualityChange}
        onVideoFitChange={onVideoFitChange}
        onTogglePiP={onTogglePiP}
        onUseIframeFallback={onUseIframeFallback}
        isTheaterMode={isTheaterMode}
        onToggleTheaterMode={onToggleTheaterMode}
        onToggleFullscreen={onToggleFullscreen}
        onSwitchEpisode={onSwitchEpisode}
        onUserInteraction={onUserInteraction}
        onSeek={onSeek}
        autoNextEpisode={autoNextEpisode}
        onToggleAutoNextEpisode={onToggleAutoNextEpisode}
        autoSubtitle={autoSubtitle}
        onToggleAutoSubtitle={onToggleAutoSubtitle}
      />

      {/* NEXT EPISODE COUNTDOWN OVERLAY */}
      {showNextEpCountdown && effectiveNextEpisode?.slug && (
        <CinemaNextEpisodePrompt
          showControls={showControls}
          posterUrl={posterUrl}
          nextEpisode={effectiveNextEpisode}
          countdownSeconds={nextEpCountdown}
          onPlayNext={onPlayNextEpisode}
          onDismiss={onDismissNextEpisode}
        />
      )}
    </div>
  );
};

export interface CinemaIframeOrFallbackStageProps {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  activeSrc: string;
  activeEpisodeSlug?: string;
  currentServerIndex?: number;
  videoLink?: string;
  activeEpisodeName?: string;
  title: string;
  trailerEmbedSrc: string | null;
  showControls: boolean;
  isPlaying: boolean;
  m3u8Link?: string;
  useIframeFallback: boolean;
  posterUrl: string;
  isConnectingStream: boolean;
  isTrailerOnly: boolean;
  canPlayFallbackTrailer?: boolean;
  isPlayingTrailer?: boolean;
  onPlayFallbackTrailer?: () => void;
  onRestoreNativeHls: () => void;
}

export const CinemaIframeOrFallbackStage: React.FC<
  CinemaIframeOrFallbackStageProps
> = ({
  iframeRef,
  activeSrc,
  activeEpisodeSlug,
  currentServerIndex,
  videoLink,
  activeEpisodeName,
  title,
  trailerEmbedSrc,
  showControls,
  isPlaying,
  m3u8Link,
  useIframeFallback,
  posterUrl,
  isConnectingStream,
  isTrailerOnly,
  canPlayFallbackTrailer = false,
  isPlayingTrailer = false,
  onPlayFallbackTrailer,
  onRestoreNativeHls,
}) => {
  if (activeSrc) {
    return (
      <>
        <iframe
          key={`iframe_${activeEpisodeSlug || "ep"}_${currentServerIndex ?? 0}_${activeSrc}`}
          ref={iframeRef}
          src={activeSrc}
          className="w-full h-full absolute inset-0 border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          title={
            !isPlayingTrailer && videoLink
              ? `Đang phát ${activeEpisodeName || "phim"}`
              : `Trailer: ${title}`
          }
        />
        {(isPlayingTrailer || (!videoLink && trailerEmbedSrc)) && (
          <div
            className={`absolute top-3 left-3 z-20 pointer-events-none inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-netflix-red/90 text-white text-xs font-bold shadow-lg backdrop-blur-md transition-opacity duration-300 ${
              showControls || !isPlaying ? "opacity-100" : "opacity-0"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-white" />
            <span>Đang phát Trailer</span>
          </div>
        )}
        {m3u8Link && useIframeFallback && (
          <button
            type="button"
            onClick={onRestoreNativeHls}
            className={`absolute top-3 right-3 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-bold shadow-lg backdrop-blur-md transition-opacity duration-300 cursor-pointer ${
              showControls || !isPlaying
                ? "opacity-100"
                : "opacity-0 pointer-events-none"
            }`}
          >
            <Zap className="w-3.5 h-3.5 fill-white" />
            <span>Đổi sang Native HLS</span>
          </button>
        )}
      </>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative">
      <Image
        src={toFastCdnImageUrl(toOptimizedCardBackdropUrl(posterUrl, 640) || posterUrl)}
        alt={title}
        fill
        unoptimized
        quality={80}
        className="object-cover opacity-35"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-black/55" />
      <div className="relative z-10 text-center px-6 flex flex-col items-center">
        {isConnectingStream ? (
          <>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-white/10 border-t-netflix-red animate-spin mb-3" />
            <p className="text-white text-base md:text-xl font-semibold">
              Đang kết nối luồng phát chất lượng cao...
            </p>
            <p className="text-zinc-400 mt-1.5 text-xs md:text-sm">
              Trình phát đang tự động chuyển sang luồng Full HD trực tiếp
            </p>
          </>
        ) : (
          <>
            <p className="text-white text-lg md:text-2xl font-semibold">
              {isTrailerOnly
                ? "Phim đang ở trạng thái trailer/sắp chiếu"
                : "Nguồn phát đang được Nanaflix cập nhật"}
            </p>
            <p className="text-zinc-300 mt-2 text-sm md:text-base max-w-md">
              {isTrailerOnly
                ? "Hiện chưa có tập phát chính thức. Vui lòng quay lại sau."
                : "Máy chủ nguồn phim này tạm thời chưa phản hồi luồng phát. Bạn vui lòng quay lại sau ít phút nhé!"}
            </p>
            {canPlayFallbackTrailer && onPlayFallbackTrailer && (
              <button
                type="button"
                onClick={onPlayFallbackTrailer}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-netflix-red hover:bg-rose-700 text-white text-xs sm:text-sm font-bold shadow-lg transition active:scale-95 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Xem Trailer</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export const CinemaFullscreenStyles: React.FC = () => (
  <style>{`
    :fullscreen,
    :-webkit-full-screen {
      width: 100vw !important;
      height: 100dvh !important;
      max-width: 100vw !important;
      max-height: 100dvh !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #000000 !important;
      overflow: hidden !important;
    }
    :fullscreen .cinema-video-wrapper,
    :-webkit-full-screen .cinema-video-wrapper {
      width: 100% !important;
      height: 100% !important;
      max-height: 100dvh !important;
      aspect-ratio: auto !important;
      border-radius: 0 !important;
      border: none !important;
      box-shadow: none !important;
    }
    :fullscreen .cinema-player-controls,
    :-webkit-full-screen .cinema-player-controls {
      position: absolute !important;
      inset-inline: 0 !important;
      bottom: 0 !important;
      z-index: 50 !important;
      padding-bottom: max(0.75rem, env(safe-area-inset-bottom, 0.75rem)) !important;
      padding-left: max(0.75rem, env(safe-area-inset-left, 0.75rem)) !important;
      padding-right: max(0.75rem, env(safe-area-inset-right, 0.75rem)) !important;
    }
    :fullscreen .cinema-action-buttons,
    :-webkit-full-screen .cinema-action-buttons {
      display: none !important;
    }
  `}</style>
);

