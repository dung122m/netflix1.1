"use client";

import React, { useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Volume1,
  VolumeX,
  Settings,
  PictureInPicture,
  QrCode,
  Tv,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { PlayerScrubBar } from "../PlayerScrubBar";

interface QualityLevel {
  id: number;
  label: string;
  height: number;
}

interface PlayerNativeControlsProps {
  showControls: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  playbackSpeed: number;
  qualityLevels: QualityLevel[];
  currentQualityIndex: number;
  isFullscreen: boolean;
  isNativeVideo: boolean;
  knownDuration?: number;
  embedSrc?: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onTogglePlayPause: () => void;
  onSeekFeedback: (txt: string) => void;
  onToggleMute: () => void;
  onVolumeChange: (val: number) => void;
  onSpeedChange: (speed: number) => void;
  onQualityChange: (levelIndex: number) => void;
  onTogglePiP: () => void;
  onOpenQr: () => void;
  onUseIframeFallback: () => void;
  onToggleFullscreen: () => void;
}

export const PlayerNativeControls: React.FC<PlayerNativeControlsProps> = React.memo(
  function PlayerNativeControls({
    showControls,
    isPlaying,
    isMuted,
    volume,
    playbackSpeed,
    qualityLevels,
    currentQualityIndex,
    isFullscreen,
    isNativeVideo,
    knownDuration,
    embedSrc,
    videoRef,
    onTogglePlayPause,
    onSeekFeedback,
    onToggleMute,
    onVolumeChange,
    onSpeedChange,
    onQualityChange,
    onTogglePiP,
    onOpenQr,
    onUseIframeFallback,
    onToggleFullscreen,
  }) {
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [showQualityMenu, setShowQualityMenu] = useState(false);

    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent pt-10 pb-3 px-3 sm:px-5 transition-opacity duration-300 z-30 ${
          showControls || !isPlaying ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* THANH TIẾN TRÌNH CÁCH LY RE-RENDER */}
        <PlayerScrubBar
          videoRef={videoRef}
          isNativeVideo={isNativeVideo}
          knownDuration={knownDuration}
          onSeekFeedback={onSeekFeedback}
        />

        {/* HÀNG CÁC NÚT ĐIỀU KHIỂN CHÍNH */}
        <div className="flex items-center justify-between text-white text-xs sm:text-sm">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Play / Pause */}
            <button
              type="button"
              onClick={onTogglePlayPause}
              title={isPlaying ? "Tạm dừng (Space)" : "Phát (Space)"}
              className="p-2 rounded-full hover:bg-white/20 text-white transition cursor-pointer"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-white" />
              ) : (
                <Play className="w-5 h-5 fill-white ml-0.5" />
              )}
            </button>

            {/* Tua lùi 10s */}
            <button
              type="button"
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
                }
                onSeekFeedback("Tua lùi -10s");
              }}
              title="Tua lùi 10 giây (←)"
              className="p-2 rounded-full hover:bg-white/20 text-gray-200 hover:text-white transition cursor-pointer"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            {/* Tua tới 10s */}
            <button
              type="button"
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = (videoRef.current.currentTime || 0) + 10;
                }
                onSeekFeedback("Tua tới +10s");
              }}
              title="Tua tới 10 giây (→)"
              className="p-2 rounded-full hover:bg-white/20 text-gray-200 hover:text-white transition cursor-pointer"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>

            {/* Âm lượng */}
            <div className="flex items-center gap-1.5 group/vol">
              <button
                type="button"
                onClick={onToggleMute}
                title="Tắt/Bật tiếng (M)"
                className="p-2 rounded-full hover:bg-white/20 text-gray-200 hover:text-white transition cursor-pointer"
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
                className="w-16 sm:w-20 accent-netflix-red h-1.5 bg-white/20 rounded-full cursor-pointer hidden sm:inline-block"
              />
            </div>
          </div>

          {/* Nút Phải: Tốc độ, Chất lượng, PiP, QR, Iframe fallback, Toàn màn hình */}
          <div className="flex items-center gap-1 sm:gap-2 relative">
            {/* TỐC ĐỘ PHÁT */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowSpeedMenu(!showSpeedMenu);
                  setShowQualityMenu(false);
                }}
                title="Tốc độ phát"
                className="px-2 py-1 rounded-md hover:bg-white/20 text-gray-200 hover:text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1"
              >
                <span>{playbackSpeed}x</span>
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-2 py-1.5 w-24 bg-zinc-900/95 border border-white/15 rounded-xl shadow-2xl backdrop-blur-md z-50 text-xs flex flex-col">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => {
                        onSpeedChange(spd);
                        setShowSpeedMenu(false);
                      }}
                      className={`px-3 py-1.5 text-left hover:bg-white/15 transition cursor-pointer flex items-center justify-between ${
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
                  type="button"
                  onClick={() => {
                    setShowQualityMenu(!showQualityMenu);
                    setShowSpeedMenu(false);
                  }}
                  title="Chất lượng video"
                  className="p-2 rounded-full hover:bg-white/20 text-gray-200 hover:text-white transition cursor-pointer flex items-center"
                >
                  <Settings className="w-4 h-4" />
                </button>
                {showQualityMenu && (
                  <div className="absolute bottom-full right-0 mb-2 py-1.5 w-28 bg-zinc-900/95 border border-white/15 rounded-xl shadow-2xl backdrop-blur-md z-50 text-xs flex flex-col">
                    <button
                      type="button"
                      onClick={() => {
                        onQualityChange(-1);
                        setShowQualityMenu(false);
                      }}
                      className={`px-3 py-1.5 text-left hover:bg-white/15 transition cursor-pointer flex items-center justify-between ${
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
                        onClick={() => {
                          onQualityChange(lvl.id);
                          setShowQualityMenu(false);
                        }}
                        className={`px-3 py-1.5 text-left hover:bg-white/15 transition cursor-pointer flex items-center justify-between ${
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

            {/* PiP */}
            <button
              type="button"
              onClick={onTogglePiP}
              title="Cửa sổ nổi (Picture-in-Picture)"
              className="hidden sm:inline-flex p-2 rounded-full hover:bg-white/20 text-gray-200 hover:text-white transition cursor-pointer"
            >
              <PictureInPicture className="w-4 h-4" />
            </button>

            {/* QR Code (Ẩn trên thiết bị di động, chỉ hiển thị từ tablet/desktop) */}
            <button
              type="button"
              onClick={onOpenQr}
              title="Xem tiếp trên điện thoại (Quét mã QR đúng số phút)"
              className="hidden sm:flex items-center gap-1 p-2 rounded-full hover:bg-white/20 text-gray-200 hover:text-white transition cursor-pointer group/qr"
            >
              <QrCode className="w-4 h-4 text-sky-400 group-hover/qr:scale-110 transition-transform" />
              <span className="hidden xl:inline text-[11px] font-semibold text-gray-300">
                Điện thoại
              </span>
            </button>

            {/* Iframe Fallback Toggle */}
            {embedSrc && (
              <button
                type="button"
                onClick={onUseIframeFallback}
                title="Đổi sang trình phát Iframe dự phòng"
                className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-gray-300 text-[11px] font-medium transition cursor-pointer"
              >
                <Tv className="w-3 h-3" />
                <span>Nguồn Iframe</span>
              </button>
            )}

            {/* Fullscreen */}
            <button
              type="button"
              onClick={onToggleFullscreen}
              title="Toàn màn hình (F)"
              className="p-2 rounded-full hover:bg-white/20 text-gray-200 hover:text-white transition cursor-pointer"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }
);
