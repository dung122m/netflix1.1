"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useWatchController } from "./WatchController";

interface PlayerScrubBarProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isNativeVideo: boolean;
  knownDuration?: number;
  posterUrl?: string;
  onSeekFeedback?: (text: string) => void;
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
  onSeek?: (time: number) => void;
}

export const formatTime = (secs: number) => {
  if (isNaN(secs) || secs < 0 || !isFinite(secs)) return "00:00";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) {
    return `${h}:${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  }
  return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
};

export const PlayerTimeDisplay: React.FC<{
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isNativeVideo: boolean;
  knownDuration?: number;
}> = React.memo(function PlayerTimeDisplay({ videoRef, isNativeVideo, knownDuration }) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(() => knownDuration || 0);

  useEffect(() => {
    if (knownDuration && knownDuration > 0 && isFinite(knownDuration)) {
      setDuration((prev) => (Math.abs(prev - knownDuration) > 1 ? knownDuration : prev));
    }
  }, [knownDuration]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isNativeVideo) return;

    const getRealDuration = (v: HTMLVideoElement): number => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hlsDur = (v as any).__hlsDuration;
      if (typeof hlsDur === "number" && hlsDur > 0 && isFinite(hlsDur)) return hlsDur;
      if (knownDuration && knownDuration > 0 && isFinite(knownDuration)) return knownDuration;
      if (v.duration && !isNaN(v.duration) && isFinite(v.duration) && v.duration > 0) return v.duration;
      return 0;
    };

    const updateDur = () => {
      const realDur = getRealDuration(video);
      if (realDur > 0 && Math.abs(realDur - duration) > 0.5) {
        setDuration(realDur);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime || 0);
      updateDur();
    };

    updateDur();
    video.addEventListener("timeupdate", handleTimeUpdate, { passive: true });
    video.addEventListener("loadedmetadata", updateDur, { passive: true });
    video.addEventListener("durationchange", updateDur, { passive: true });

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", updateDur);
      video.removeEventListener("durationchange", updateDur);
    };
  }, [videoRef, isNativeVideo, knownDuration, duration]);

  return (
    <div className="flex items-center gap-1 text-[11px] sm:text-xs font-mono text-gray-300 select-none whitespace-nowrap">
      <span className="text-white font-medium">{formatTime(currentTime)}</span>
      <span className="text-white/40 font-normal">/</span>
      <span className="text-gray-400">{formatTime(duration)}</span>
    </div>
  );
});

export const PlayerScrubBar: React.FC<PlayerScrubBarProps> = ({
  videoRef,
  isNativeVideo,
  knownDuration,
  posterUrl: propPosterUrl,
  onSeekFeedback,
  onScrubStart,
  onScrubEnd,
  onSeek,
}) => {
  const watchContext = useWatchController();
  const posterUrl = propPosterUrl || watchContext?.posterUrl;

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(() => knownDuration || 0);
  const [buffered, setBuffered] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<number>(0);
  const [clampedHoverPos, setClampedHoverPos] = useState<number>(0);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const barRef = useRef<HTMLDivElement>(null);
  const durationRef = useRef<number>(duration);
  const isScrubbingRef = useRef<boolean>(false);
  const scrubTargetTimeRef = useRef<number | null>(null);

  // Đồng bộ durationRef
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  // Cập nhật khi knownDuration thay đổi
  useEffect(() => {
    if (knownDuration && knownDuration > 0 && isFinite(knownDuration)) {
      setDuration((prev) => (Math.abs(prev - knownDuration) > 1 ? knownDuration : prev));
    }
  }, [knownDuration]);

  // Lắng nghe trực tiếp video element mà không re-render cha
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isNativeVideo) return;

    const getRealDuration = (v: HTMLVideoElement): number => {
      // 1. Ưu tiên thời lượng chuẩn xác được tính từ M3U8 Playlist (Hls.js LEVEL_LOADED)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hlsDur = (v as any).__hlsDuration;
      if (typeof hlsDur === "number" && hlsDur > 0 && isFinite(hlsDur)) {
        return hlsDur;
      }
      if (knownDuration && knownDuration > 0 && isFinite(knownDuration)) {
        return knownDuration;
      }
      if (v.duration && !isNaN(v.duration) && isFinite(v.duration) && v.duration > 0) {
        return v.duration;
      }
      return 0;
    };

    const updateDur = () => {
      const realDur = getRealDuration(video);
      if (realDur > 0 && Math.abs(realDur - durationRef.current) > 0.5) {
        setDuration(realDur);
      }
    };

    const handleTimeUpdate = () => {
      if (!isScrubbingRef.current) {
        setCurrentTime(video.currentTime || 0);
      }
      updateDur();
    };

    const handleProgress = () => {
      const realDur = getRealDuration(video);
      if (video.buffered.length > 0 && realDur > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };

    const handleLoadedMetadata = () => {
      updateDur();
    };

    // Kiểm tra ngay khi mount
    updateDur();

    video.addEventListener("timeupdate", handleTimeUpdate, { passive: true });
    video.addEventListener("progress", handleProgress, { passive: true });
    video.addEventListener("loadedmetadata", handleLoadedMetadata, { passive: true });
    video.addEventListener("durationchange", handleLoadedMetadata, { passive: true });
    video.addEventListener("canplay", handleLoadedMetadata, { passive: true });

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("progress", handleProgress);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("durationchange", handleLoadedMetadata);
      video.removeEventListener("canplay", handleLoadedMetadata);
    };
  }, [videoRef, isNativeVideo, knownDuration]);

  const getTimeAtClientX = useCallback((clientX: number) => {
    if (!barRef.current || !durationRef.current) return 0;
    const rect = barRef.current.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return pos * durationRef.current;
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    if (e.pointerType === "touch") {
      setIsTouchDevice(true);
    }
    isScrubbingRef.current = true;
    setIsScrubbing(true);
    onScrubStart?.();

    const targetTime = getTimeAtClientX(e.clientX);
    scrubTargetTimeRef.current = targetTime;
    setCurrentTime(targetTime);
    onSeekFeedback?.(formatTime(targetTime));

    const target = e.currentTarget;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {}

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!isScrubbingRef.current) return;
      const nextTime = getTimeAtClientX(moveEvent.clientX);
      scrubTargetTimeRef.current = nextTime;
      setCurrentTime(nextTime);
      onSeekFeedback?.(formatTime(nextTime));
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      isScrubbingRef.current = false;
      setIsScrubbing(false);
      onScrubEnd?.();

      if (scrubTargetTimeRef.current !== null && videoRef.current) {
        const finalTime = scrubTargetTimeRef.current;
        if (onSeek) {
          onSeek(finalTime);
        } else {
          videoRef.current.currentTime = finalTime;
        }
        setCurrentTime(finalTime);
        scrubTargetTimeRef.current = null;
      }

      try {
        target.releasePointerCapture(upEvent.pointerId);
      } catch {}

      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  };

  const handlePointerMoveHover = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") {
      setIsTouchDevice(true);
      return;
    }
    if (!barRef.current || !duration || duration <= 0 || !isFinite(duration)) return;
    const rect = barRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;

    const rawPos = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const posRatio = rawPos / rect.width;

    // Giới hạn an toàn để khung preview không bị tràn lề trái/phải màn hình
    // Khung có độ rộng tối đa 176px (halfWidth = 88px) trên desktop, cộng lề an toàn 6px
    const cardHalfWidth = 88;
    const clampedPos = Math.max(cardHalfWidth + 6, Math.min(rect.width - cardHalfWidth - 6, rawPos));

    setHoverPos(rawPos);
    setClampedHoverPos(clampedPos);
    setHoverTime(posRatio * duration);
  };

  const handleMouseLeave = () => {
    setHoverTime(null);
  };

  const playedPercent = duration ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
  const bufferedPercent = duration ? Math.min(100, Math.max(0, (buffered / duration) * 100)) : 0;

  return (
    <div className="w-full select-none mb-1 sm:mb-2">
      {/* THANH TIẾN TRÌNH: VÙNG CHẠM TOUCH RỘNG, THIẾT KẾ SLIM GỌN GÀNG CHUẨN YOUTUBE / NETFLIX */}
      <div
        ref={barRef}
        tabIndex={0}
        role="slider"
        aria-label="Thanh tiến trình phim"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration) || 100}
        aria-valuenow={Math.round(currentTime)}
        aria-valuetext={`${formatTime(currentTime)} / ${formatTime(duration)}`}
        data-player-control="true"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMoveHover}
        onPointerLeave={handleMouseLeave}
        className="w-full py-2.5 -my-2.5 cursor-pointer relative group/bar touch-none flex items-center outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 transition-all"
      >
        <div className="w-full h-[3px] group-hover/bar:h-[5px] bg-white/20 rounded-full relative transition-all duration-200 pointer-events-none">
          {/* Buffered bar */}
          <div
            className="absolute top-0 left-0 bottom-0 bg-white/30 rounded-full transition-all duration-150"
            style={{ width: `${bufferedPercent}%` }}
          />

          {/* Played bar */}
          <div
            className="absolute top-0 left-0 bottom-0 bg-netflix-red rounded-full flex items-center justify-end"
            style={{ width: `${playedPercent}%` }}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full bg-netflix-red border-2 border-white shadow-[0_0_8px_rgba(229,9,20,0.9)] transition-transform ${
                isScrubbing ? "scale-100" : "scale-0 group-hover/bar:scale-100"
              }`}
            />
          </div>

          {/* NÂNG CẤP TOOLTIP CONTAINER: UI FOUNDATION CHO PREVIEW TRONG TƯƠNG LAI */}
          {hoverTime !== null && !isTouchDevice && (
            <div
              className="absolute bottom-full mb-3 -translate-x-1/2 flex flex-col items-center pointer-events-none z-30 transition-all duration-150 select-none"
              style={{ left: `${clampedHoverPos}px` }}
            >
              {/* Khung Preview chuẩn tỷ lệ 16:9, viền mờ cao cấp chuẩn Netflix/YouTube */}
              <div className="w-36 sm:w-44 p-1 rounded-xl bg-zinc-950/95 border border-white/20 shadow-[0_10px_35px_rgba(0,0,0,0.9)] backdrop-blur-md overflow-hidden flex flex-col items-center">
                <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gradient-to-tr from-zinc-900 via-zinc-800/80 to-zinc-950 border border-white/10 flex items-center justify-center">
                  {posterUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={posterUrl}
                        alt=""
                        className="w-full h-full object-cover opacity-80"
                        loading="lazy"
                        onError={(err) => {
                          (err.currentTarget as HTMLElement).style.display = "none";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1 text-white/30">
                      <div className="w-5 h-5 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
                        <span className="text-[9px] font-bold">▶</span>
                      </div>
                    </div>
                  )}

                  {/* Huy hiệu thời gian tương phản cao đặt tại đáy khung xem trước */}
                  <div className="absolute bottom-1 inset-x-1 flex justify-center pointer-events-none">
                    <span className="px-2 py-0.5 rounded-md bg-black/85 text-[11px] sm:text-xs font-mono font-bold text-white border border-white/20 shadow-md tracking-wider">
                      {formatTime(hoverTime)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Mũi tên định vị (Notch) chỉ chính xác vào tọa độ chuột trên thanh ScrubBar */}
              <div
                className="w-2.5 h-2.5 bg-zinc-950 border-r border-b border-white/20 rotate-45 -mt-1 shadow-sm"
                style={{
                  transform: `translateX(${Math.max(-75, Math.min(75, hoverPos - clampedHoverPos))}px) rotate(45deg)`,
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerScrubBar;
