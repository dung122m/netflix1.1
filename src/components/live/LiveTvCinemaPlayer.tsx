"use client";

import React, { type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import {
  Tv,
  Radio,
  Volume2,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  RotateCcw,
  Zap,
} from "lucide-react";
import {
  YouTubePlayIcon,
  YouTubePauseIcon,
  YouTubeVolumeHighIcon,
  YouTubeVolumeLowIcon,
  YouTubeVolumeMuteIcon,
  YouTubeSeek10BackIcon,
  YouTubeSeek10ForwardIcon,
  YouTubeFullscreenIcon,
  YouTubeExitFullscreenIcon,
  YouTubeMiniplayerIcon,
} from "@/components/player/PlayerNativeControls";
import type { TvChannel } from "@/services/live/tv/service";
import type { VolumeOsdState } from "./hooks/useMediaVolume";
import { PlayingEqualizer } from "./PlayingEqualizer";
import { VolumeOsdPill } from "./VolumeOsdPill";
import { LiveShortcutPopover } from "./LiveShortcutPopover";
import { Tooltip } from "@/components/ui/Tooltip";
import { ChannelSourceSwitcher } from "./ChannelSourceSwitcher";
import { TvChannelLogo } from "./TvChannelLogo";
import { LiveSeekOverlay, type LiveActionFeedback } from "./LiveSeekOverlay";

export interface LiveTvCinemaPlayerProps {
  selectedTvChannel: TvChannel;
  channels: TvChannel[];
  filteredChannels: TvChannel[];
  playerRef: RefObject<HTMLDivElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  isPlaying: boolean;
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string;
  isAtLiveEdge: boolean;
  liveLatency: number;
  showControls: boolean;
  setShowControls: (show: boolean) => void;
  resetControlsTimeout: () => void;
  showChannelRail: boolean;
  onToggleChannelRail: () => void;
  copied: boolean;
  onCopy: () => void;
  isMuted: boolean;
  volume: number;
  volumeOsd: VolumeOsdState | null;
  onVolumeChange: (val: number) => void;
  onToggleMute: () => void;
  onUnmuteSound: () => void;
  onSyncVideoVolume: (video: HTMLVideoElement) => void;
  isFullscreen: boolean;
  isPip: boolean;
  onToggleFullscreen: () => void;
  onTogglePip: () => void;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onGoToLiveEdge: () => void;
  onSwitchChannel: (direction: "next" | "prev") => void;
  onRetry: () => void;
  onSetIsPlaying: (playing: boolean) => void;
  actionFeedback: LiveActionFeedback | null;
  useMobilePortal: boolean;
  channelDrawerMarkup: ReactNode;
}

/**
 * Renders the Live TV cinema header bar, video viewport container,
 * live-edge indicator, seek/play feedback overlay, and playback controls bar.
 */
export function LiveTvCinemaPlayer({
  selectedTvChannel,
  channels,
  filteredChannels,
  playerRef,
  containerRef,
  videoRef,
  isPlaying,
  isLoading,
  hasError,
  errorMessage,
  isAtLiveEdge,
  liveLatency,
  showControls,
  setShowControls,
  resetControlsTimeout,
  showChannelRail,
  onToggleChannelRail,
  copied,
  onCopy,
  isMuted,
  volume,
  volumeOsd,
  onVolumeChange,
  onToggleMute,
  onUnmuteSound,
  onSyncVideoVolume,
  isFullscreen,
  isPip,
  onToggleFullscreen,
  onTogglePip,
  onTogglePlay,
  onSeek,
  onGoToLiveEdge,
  onSwitchChannel,
  onRetry,
  onSetIsPlaying,
  actionFeedback,
  useMobilePortal,
  channelDrawerMarkup,
}: LiveTvCinemaPlayerProps) {
  const activeChannelList =
    filteredChannels.length > 0 ? filteredChannels : channels;
  const activeChannelIndex = activeChannelList.findIndex(
    (c) =>
      c.id === selectedTvChannel.id ||
      c.name.toLowerCase() === selectedTvChannel.name.toLowerCase(),
  );

  return (
    <div ref={playerRef} className="scroll-mt-20 space-y-2 sm:space-y-2.5 w-full min-w-0">
      {/* HEADER KÊNH ĐANG PHÁT - SLIM CINEMA HEADER */}
      <div className="keep-dark-cinema relative rounded-xl sm:rounded-2xl bg-gradient-to-r from-zinc-900/95 via-zinc-950/98 to-zinc-900/95 px-2.5 py-1.5 sm:px-4 sm:py-2 shadow-xl backdrop-blur-xl flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {/* LOGO KÊNH COMPACT */}
          <div className="w-8 h-6 sm:w-9 sm:h-7 rounded-lg bg-zinc-900/90 p-0.5 flex items-center justify-center shadow-md flex-shrink-0 overflow-hidden">
            <TvChannelLogo
              logo={selectedTvChannel.logo}
              name={selectedTvChannel.name}
              size="sm"
            />
          </div>

          {/* TÊN KÊNH & EQUALIZER */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <h2
              className="text-xs sm:text-sm font-black text-white keep-white truncate"
              style={{ color: "#ffffff" }}
              title={selectedTvChannel.name}
            >
              {selectedTvChannel.name}
            </h2>
            {isPlaying && <PlayingEqualizer />}
          </div>

          {/* HUY HIỆU GỌN GÀNG (Trực tiếp, Danh mục, Chất lượng) */}
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-netflix-red/20 text-netflix-red text-[9px] font-black animate-pulse whitespace-nowrap">
              <Radio className="w-2.5 h-2.5" />
              <span>Trực tiếp</span>
            </span>
            <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-zinc-300 text-[9px] font-bold whitespace-nowrap">
              {selectedTvChannel.category}
            </span>
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase whitespace-nowrap">
              <Zap className="w-2 h-2 fill-emerald-400" />
              <span>{selectedTvChannel.quality}</span>
            </span>
          </div>
        </div>

        {/* CỤM NÚT THAO TÁC: MỞ DANH SÁCH KÊNH + SAO CHÉP */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <Tooltip
            content={showChannelRail ? "Đóng danh sách kênh (C)" : "Mở danh sách kênh (C)"}
            side="top"
          >
            <button
              type="button"
              onClick={onToggleChannelRail}
              aria-label={showChannelRail ? "Đóng danh sách kênh" : "Mở danh sách kênh"}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] sm:text-xs font-bold transition cursor-pointer ${
                showChannelRail
                  ? "bg-netflix-red text-white shadow-md shadow-black/50"
                  : "bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white"
              }`}
            >
              <Tv className="w-3 h-3 text-white" />
              <span className="hidden sm:inline">Danh sách kênh</span>
            </button>
          </Tooltip>
          <Tooltip content="Sao chép link stream HLS" side="top" align="end">
            <button
              type="button"
              onClick={onCopy}
              aria-label="Sao chép link stream HLS"
              className="p-1 sm:p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition cursor-pointer"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </Tooltip>
        </div>
      </div>

      {/* KHUNG PHÁT VIDEO PLAYER (TỶ LỆ 16:9 THEO VIEWPORT THỰC TẾ) */}
      <div
        ref={containerRef}
        tabIndex={0}
        onMouseMove={resetControlsTimeout}
        onFocus={() => {
          setShowControls(true);
          resetControlsTimeout();
        }}
        onClick={() => {
          if (!showControls) {
            setShowControls(true);
            resetControlsTimeout();
            return;
          }
          setShowControls(false);
        }}
        onDoubleClick={onToggleFullscreen}
        className={`relative w-full mx-auto bg-black transition-all duration-300 group select-none  outline-none focus:outline-none focus-visible:outline-none contain-paint isolate ${
          isFullscreen
            ? "fixed inset-0 z-50 w-full h-full max-w-none max-h-none rounded-none aspect-auto -none shadow-none p-0 m-0 overflow-hidden flex flex-col justify-center"
            : "aspect-video lg:max-h-[calc(100dvh-172px)] lg:max-w-[calc((100dvh-172px)*16/9)] rounded-2xl sm:rounded-3xl overflow-hidden  shadow-2xl"
        } ${isFullscreen && isPlaying && !showControls ? "cursor-none" : "cursor-default"}`}
      >
        <video
          ref={videoRef}
          className="w-full h-full object-contain pointer-events-none"
          playsInline
          onPlay={() => onSetIsPlaying(true)}
          onPause={() => onSetIsPlaying(false)}
          onVolumeChange={(e) => onSyncVideoVolume(e.currentTarget)}
        />

        {/* HUY HIỆU SIGNAL & LIVE TRÊN TRÁI: BẤM ĐỂ QUAY VỀ LIVE EDGE */}
        <div
          className={`absolute top-3 left-3 sm:top-4 sm:left-4 flex items-center gap-2 z-20 transition-opacity duration-300 ${
            showControls ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        >
          {isAtLiveEdge ? (
            <Tooltip content="Đang phát trực tiếp (Bấm để đồng bộ)" side="bottom">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onGoToLiveEdge();
                }}
                aria-label="Đang phát trực tiếp (Bấm để đồng bộ)"
                className="group flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white text-[11px] font-bold tracking-wider shadow-md shadow-black/50 backdrop-blur-md transition hover:scale-105 active:scale-95 cursor-pointer select-none"
              >
                <span className="inline-flex rounded-full h-2 w-2 bg-white shrink-0" />
                <span>Trực tiếp</span>
              </button>
            </Tooltip>
          ) : (
            <Tooltip
              content={
                liveLatency > 0
                  ? `Đang trễ ~${liveLatency}s so với trực tiếp. Bấm để quay về Live Edge`
                  : "Bấm để quay về Live Edge"
              }
              side="bottom"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onGoToLiveEdge();
                }}
                aria-label="Quay về Live Edge"
                className="group flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-[11px] font-bold tracking-wider shadow-md shadow-black/50 backdrop-blur-md transition hover:scale-105 active:scale-95 cursor-pointer select-none"
              >
                <RotateCcw className="w-3 h-3 group-hover:-rotate-90 transition-transform duration-300" />
                <span>
                  {liveLatency > 0 ? `Về live (-${liveLatency}s)` : "Về live"}
                </span>
              </button>
            </Tooltip>
          )}
        </div>

        {/* DRAWER DANH SÁCH KÊNH TRUYỀN HÌNH (DESKTOP HOẶC FULLSCREEN) */}
        {!useMobilePortal && channelDrawerMarkup}

        {/* NÚT BẬT TIẾNG KHI ĐANG MUTE GÓC TRÊN PHẢI (ẨN KHI KHÔNG TƯƠNG TÁC) */}
        {isPlaying && isMuted && !isLoading && !hasError && (
          <div
            className={`absolute top-3 right-3 sm:top-4 sm:right-4 z-30 transition-opacity duration-300 ${
              showControls ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUnmuteSound();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white text-[11px] sm:text-xs font-black shadow-2xl backdrop-blur-md transition-transform hover:scale-105 active:scale-95 cursor-pointer shadow-black/60"
            >
              <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse" />
              <span>Bật tiếng</span>
            </button>
          </div>
        )}

        {/* PREMIUM YOUTUBE TOP PILL VOLUME OSD (ĐỒNG BỘ 100% VỚI MOVIE PLAYER) */}
        <VolumeOsdPill volumeOsd={volumeOsd} />

        {/* ACTION FEEDBACK OVERLAY (PLAY, PAUSE, CHANNEL SWITCH & CINEMA SEEK HUD) */}
        <LiveSeekOverlay actionFeedback={actionFeedback} />

        {/* LOADING SPINNER - CINEMA STYLE TINH TẾ */}
        {isLoading && !hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-20 pointer-events-none animate-in fade-in duration-150">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-white/20 border-t-netflix-red animate-spin mb-3 shadow-lg" />
            <p className="text-xs sm:text-sm font-medium text-zinc-300 tracking-wide">
              Đang kết nối tín hiệu...
            </p>
          </div>
        )}

        {/* THÔNG BÁO LỖI KHI MẤT TÍN HIỆU */}
        {hasError && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/95 p-4 sm:p-6 text-center z-20"
          >
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h4 className="text-base sm:text-lg font-bold text-white mb-1">
              Kênh tạm thời gián đoạn tín hiệu
            </h4>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md mb-5 leading-relaxed">
              {errorMessage ||
                "Luồng phát của đài truyền hình có thể đang bảo trì hoặc chuyển đổi đường truyền. Hãy thử bấm tải lại hoặc đổi kênh khác."}
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={onRetry}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Thử tải lại</span>
              </button>
            </div>
          </div>
        )}

        {/* 2. CENTER PLAYBACK CONTROLS CHO MOBILE (GỌN GÀNG, DUY NHẤT 1 NÚT PLAY/PAUSE, KHÔNG RÁC ICON) */}
        {showControls && !isLoading && !hasError && (
          <div className="md:hidden absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-20">
            <button
              type="button"
              data-player-control="true"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePlay();
                resetControlsTimeout();
              }}
              aria-label={isPlaying ? "Tạm dừng" : "Phát"}
              className="pointer-events-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/60 hover:bg-black/75 active:scale-95 text-white flex items-center justify-center shadow-2xl backdrop-blur-md transition-transform duration-150 cursor-pointer outline-none touch-manipulation"
            >
              {isPlaying ? (
                <YouTubePauseIcon className="w-7 h-7 sm:w-8 sm:h-8" />
              ) : (
                <YouTubePlayIcon className="w-7 h-7 sm:w-8 sm:h-8 ml-0.5" />
              )}
            </button>
          </div>
        )}

        {/* THANH ĐIỀU KHIỂN DƯỚI ĐÁY */}
        <div
          data-live-controls
          onClick={(e) => e.stopPropagation()}
          className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-2.5 sm:p-4 pt-6 sm:pt-8 flex items-center justify-between gap-1 sm:gap-2 z-30 transition-opacity duration-300 text-white select-none ${
            showControls
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
          style={{
            paddingBottom: isFullscreen ? "max(0.75rem, env(safe-area-inset-bottom, 0.75rem))" : undefined,
            paddingLeft: isFullscreen ? "max(0.75rem, env(safe-area-inset-left, 0.75rem))" : undefined,
            paddingRight: isFullscreen ? "max(0.75rem, env(safe-area-inset-right, 0.75rem))" : undefined,
          }}
        >
          {/* CỤM TRÁI: DESKTOP PLAYBACK (TUA LÙI 10S + PLAY/PAUSE + TUA TỚI 10S) + ÂM LƯỢNG */}
          <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 shrink-0">
            <div className="hidden sm:flex items-center gap-1 sm:gap-1.5">
              <Tooltip content="Tua lùi 10 giây" shortcut="←" side="top">
                <button
                  type="button"
                  data-player-control="true"
                  onClick={() => onSeek(-10)}
                  aria-label="Tua lùi 10 giây"
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/15 active:scale-90 text-zinc-300 hover:text-white flex items-center justify-center transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/40 touch-manipulation"
                >
                  <YouTubeSeek10BackIcon className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                </button>
              </Tooltip>

              <Tooltip content={isPlaying ? "Tạm dừng" : "Phát"} shortcut="Space" side="top">
                <button
                  type="button"
                  data-player-control="true"
                  onClick={onTogglePlay}
                  aria-label={isPlaying ? "Tạm dừng" : "Phát"}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/15 active:scale-90 text-white flex items-center justify-center transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/40 touch-manipulation"
                >
                  {isPlaying ? (
                    <YouTubePauseIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                  ) : (
                    <YouTubePlayIcon className="w-5 h-5 sm:w-6 sm:h-6 ml-0.5" />
                  )}
                </button>
              </Tooltip>

              <Tooltip content="Tua tới 10 giây" shortcut="→" side="top">
                <button
                  type="button"
                  data-player-control="true"
                  onClick={() => onSeek(10)}
                  aria-label="Tua tới 10 giây"
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/15 active:scale-90 text-zinc-300 hover:text-white flex items-center justify-center transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/40 touch-manipulation"
                >
                  <YouTubeSeek10ForwardIcon className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                </button>
              </Tooltip>
            </div>

            {/* CỤM VOLUME TRÊN MOBILE (Chỉ hiện nút Mute nhỏ gọn) */}
            <button
              type="button"
              data-player-control="true"
              onClick={onToggleMute}
              aria-label={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
              className="w-9 h-9 sm:hidden rounded-full hover:bg-white/15 active:scale-90 flex items-center justify-center text-white transition cursor-pointer shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-white/40 touch-manipulation"
            >
              {isMuted || volume === 0 ? (
                <YouTubeVolumeMuteIcon className="w-5 h-5 text-netflix-red" />
              ) : volume < 0.5 ? (
                <YouTubeVolumeLowIcon className="w-5 h-5 text-white" />
              ) : (
                <YouTubeVolumeHighIcon className="w-5 h-5 text-white" />
              )}
            </button>

            {/* CỤM ÂM LƯỢNG YOUTUBE (Hover nở thanh kéo trượt mượt mà chuẩn Movie Player) */}
            <div className="hidden sm:flex items-center group/vol shrink-0">
              <Tooltip content={isMuted ? "Bật âm thanh" : "Tắt âm thanh"} shortcut="M" side="top">
                <button
                  type="button"
                  data-player-control="true"
                  onClick={onToggleMute}
                  aria-label={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/15 active:scale-90 text-white/90 hover:text-white flex items-center justify-center transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/40 touch-manipulation"
                >
                  {isMuted || volume === 0 ? (
                    <YouTubeVolumeMuteIcon className="w-5 h-5 text-netflix-red" />
                  ) : volume < 0.5 ? (
                    <YouTubeVolumeLowIcon className="w-5 h-5 text-white" />
                  ) : (
                    <YouTubeVolumeHighIcon className="w-5 h-5 text-white" />
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
                style={{
                  accentColor: "#ffffff",
                  background: `linear-gradient(to right, #ffffff ${isMuted ? 0 : Math.round(volume * 100)}%, rgba(255, 255, 255, 0.25) ${isMuted ? 0 : Math.round(volume * 100)}%)`,
                }}
                className="w-0 opacity-0 group-hover/vol:w-16 sm:group-hover/vol:w-20 md:group-hover/vol:w-24 group-hover/vol:opacity-100 group-focus-within/vol:w-16 sm:group-focus-within/vol:w-20 md:group-focus-within/vol:w-24 group-focus-within/vol:opacity-100 transition-all duration-200 ease-out accent-white h-1 rounded-full cursor-pointer hidden sm:inline-block outline-none"
              />
            </div>
          </div>

          {/* CỤM PHẢI: BỘ CHỌN KÊNH THỐNG NHẤT + PHÍM TẮT GỢI Ý + PIP + FULLSCREEN */}
          <div className="flex items-center gap-1 sm:gap-2 min-w-0 shrink">
            <ChannelSourceSwitcher
              type="channel"
              currentName={selectedTvChannel?.name || "Chọn kênh"}
              currentIndex={activeChannelIndex}
              totalCount={activeChannelList.length}
              onPrevious={() => onSwitchChannel("prev")}
              onNext={() => onSwitchChannel("next")}
              onOpenList={onToggleChannelRail}
              isListOpen={showChannelRail}
            />

            <LiveShortcutPopover mode="tv" />

            <Tooltip content="Xem thu nhỏ góc màn hình (PiP)" shortcut="I" side="top">
              <button
                type="button"
                data-player-control="true"
                onClick={onTogglePip}
                aria-label="Xem thu nhỏ góc màn hình"
                className={`w-9 h-9 sm:w-10 sm:h-10 hidden sm:flex rounded-full items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                  isPip
                    ? "bg-netflix-red text-white"
                    : "text-zinc-300 hover:text-white hover:bg-white/15"
                }`}
              >
                <YouTubeMiniplayerIcon className="w-5 h-5" />
              </button>
            </Tooltip>

            <Tooltip content={isFullscreen ? "Thu nhỏ" : "Toàn màn hình"} shortcut="F" side="top" align="end">
              <button
                type="button"
                data-player-control="true"
                onClick={onToggleFullscreen}
                aria-label={isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/15 active:scale-90 text-white flex items-center justify-center transition cursor-pointer shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-white/40 touch-manipulation"
              >
                {isFullscreen ? (
                  <YouTubeExitFullscreenIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                ) : (
                  <YouTubeFullscreenIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                )}
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* PORTAL BOTTOM SHEET CHO MOBILE: KHÔNG BỊ CLIPPED BỞI CONTAINER */}
      {useMobilePortal &&
        typeof document !== "undefined" &&
        createPortal(channelDrawerMarkup, document.body)}
    </div>
  );
}

