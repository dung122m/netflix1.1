"use client";

import React from "react";
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
import { Tooltip } from "@/components/ui/Tooltip";
import { ChannelSourceSwitcher } from "./ChannelSourceSwitcher";
import { LiveShortcutPopover } from "./LiveShortcutPopover";

export interface LivePlayerControlsBarProps {
  showControls: boolean;
  isLoading: boolean;
  hasError: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  isFullscreen: boolean;
  isPip: boolean;
  serversCount: number;
  availableServersCount: number;
  currentServerName: string;
  currentAvailableIndex: number;
  isRailVisible: boolean;
  onTogglePlay: () => void;
  onResetControlsTimeout: () => void;
  onSeek: (seconds: number) => void;
  onToggleMute: () => void;
  onVolumeChange: (val: number) => void;
  onSwitchServer: (direction: "next" | "prev") => void;
  onToggleRail: () => void;
  onTogglePip: () => void;
  onToggleFullscreen: () => void;
}

/**
 * Renders the mobile centered Play/Pause trigger and bottom transport bar
 * for LivePlayer.
 */
export function LivePlayerControlsBar({
  showControls,
  isLoading,
  hasError,
  isPlaying,
  isMuted,
  volume,
  isFullscreen,
  isPip,
  serversCount,
  availableServersCount,
  currentServerName,
  currentAvailableIndex,
  isRailVisible,
  onTogglePlay,
  onResetControlsTimeout,
  onSeek,
  onToggleMute,
  onVolumeChange,
  onSwitchServer,
  onToggleRail,
  onTogglePip,
  onToggleFullscreen,
}: LivePlayerControlsBarProps) {
  const [hasTouch, setHasTouch] = React.useState(false);
  React.useEffect(() => {
    const checkTouch = () => {
      const isMobileUA =
        typeof navigator !== "undefined" &&
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent,
        );
      const isTouch =
        isMobileUA ||
        (typeof window !== "undefined" &&
          window.matchMedia &&
          window.matchMedia("(pointer: coarse)").matches) ||
        (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0) ||
        (typeof window !== "undefined" && "ontouchstart" in window);
      setHasTouch(Boolean(isTouch));
    };
    checkTouch();
  }, []);

  return (
    <>
      {/* 2. CENTER PLAYBACK CONTROLS CHO MOBILE (GỌN GÀNG, DUY NHẤT 1 NÚT PLAY/PAUSE, LUÔN HIỂN THỊ KHI TRÌNH ĐIỀU KHIỂN BẬT) */}
      {showControls && !isLoading && !hasError && (
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-20 ${
            hasTouch ? "flex" : "hidden"
          }`}
        >
          <button
            type="button"
            data-player-control="true"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePlay();
              onResetControlsTimeout();
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

      {/* CONTROLS OVERLAY BOTTOM BAR */}
      <div
        data-live-controls
        onClick={(e) => e.stopPropagation()}
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/85 to-transparent px-2.5 py-2 sm:px-4 sm:py-3 pt-6 sm:pt-8 z-30 transition-opacity duration-300 select-none ${
          showControls
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        style={{
          paddingBottom: isFullscreen
            ? "max(0.75rem, env(safe-area-inset-bottom, 0.75rem))"
            : undefined,
          paddingLeft: isFullscreen
            ? "max(0.75rem, env(safe-area-inset-left, 0.75rem))"
            : undefined,
          paddingRight: isFullscreen
            ? "max(0.75rem, env(safe-area-inset-right, 0.75rem))"
            : undefined,
        }}
      >
        <div className="flex items-center justify-between gap-1 sm:gap-2 text-white">
          {/* CỤM TRÁI: DESKTOP PLAYBACK + ÂM LƯỢNG */}
          <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 shrink-0">
            {!hasTouch && (
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
            )}

            {/* CỤM ÂM LƯỢNG (Mobile: chỉ nút Mute gọn; Desktop: có thanh trượt hover) */}
            {hasTouch ? (
              <button
                type="button"
                data-player-control="true"
                onClick={onToggleMute}
                aria-label={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
                className="w-9 h-9 rounded-full hover:bg-white/15 active:scale-90 flex items-center justify-center text-white transition cursor-pointer shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-white/40 touch-manipulation"
              >
                {isMuted || volume === 0 ? (
                  <YouTubeVolumeMuteIcon className="w-5 h-5 text-netflix-red" />
                ) : volume < 0.5 ? (
                  <YouTubeVolumeLowIcon className="w-5 h-5 text-white" />
                ) : (
                  <YouTubeVolumeHighIcon className="w-5 h-5 text-white" />
                )}
              </button>
            ) : (
              <div className="flex items-center group/vol shrink-0">
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
            )}
          </div>

          {/* CỤM PHẢI */}
          <div className="flex items-center gap-1 sm:gap-2 min-w-0 shrink">
            {serversCount > 0 && (
              <ChannelSourceSwitcher
                type="source"
                currentName={currentServerName}
                currentIndex={currentAvailableIndex}
                totalCount={availableServersCount || serversCount}
                onPrevious={() => onSwitchServer("prev")}
                onNext={() => onSwitchServer("next")}
                onOpenList={onToggleRail}
                isListOpen={isRailVisible}
                disabled={availableServersCount <= 1}
              />
            )}

            <LiveShortcutPopover mode="football" />

            {!hasTouch && (
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
            )}

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
    </>
  );
}

