"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

interface PlayerScrubBarProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isNativeVideo: boolean;
  knownDuration?: number;
  onSeekFeedback?: (text: string) => void;
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
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
  onSeekFeedback,
  onScrubStart,
  onScrubEnd,
}) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(() => knownDuration || 0);
  const [buffered, setBuffered] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<number>(0);

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
        videoRef.current.currentTime = finalTime;
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
    if (!barRef.current || !duration) return;
    const rect = barRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPos(e.clientX - rect.left);
    setHoverTime(pos * duration);
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
        <div className="w-full h-1 group-hover/bar:h-2 bg-white/20 rounded-full relative transition-all pointer-events-none">
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
              className={`w-3.5 h-3.5 rounded-full bg-white shadow-[0_0_8px_rgba(229,9,20,0.8)] transition-transform ${
                isScrubbing ? "scale-100" : "scale-0 group-hover/bar:scale-100"
              }`}
            />
          </div>

          {/* Hover preview tooltip */}
          {hoverTime !== null && (
            <div
              className="absolute -top-7 -translate-x-1/2 px-1.5 py-0.5 rounded bg-zinc-950/95 text-[10px] font-mono font-bold text-white border border-white/20 shadow-xl backdrop-blur-sm"
              style={{ left: `${hoverPos}px` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerScrubBar;
