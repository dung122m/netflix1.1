"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

interface PlayerScrubBarProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isNativeVideo: boolean;
  knownDuration?: number;
  onSeekFeedback?: (text: string) => void;
}

const formatTime = (secs: number) => {
  if (isNaN(secs) || secs < 0 || !isFinite(secs)) return "00:00";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) {
    return `${h}:${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  }
  return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
};

export const PlayerScrubBar: React.FC<PlayerScrubBarProps> = ({
  videoRef,
  isNativeVideo,
  knownDuration,
  onSeekFeedback,
}) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(() => knownDuration || 0);
  const [buffered, setBuffered] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<number>(0);

  const barRef = useRef<HTMLDivElement>(null);
  const durationRef = useRef<number>(duration);

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
      if (!isScrubbing) {
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
  }, [videoRef, isNativeVideo, isScrubbing, knownDuration]);

  const seekToPosition = useCallback(
    (clientX: number) => {
      if (!barRef.current || !videoRef.current || !duration) return;
      const rect = barRef.current.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const targetTime = pos * duration;
      videoRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
      onSeekFeedback?.(formatTime(targetTime));
    },
    [duration, onSeekFeedback, videoRef]
  );

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsScrubbing(true);
    seekToPosition(e.clientX);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      seekToPosition(moveEvent.clientX);
    };

    const handleMouseUp = () => {
      setIsScrubbing(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMoveHover = (e: React.MouseEvent<HTMLDivElement>) => {
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
    <div className="w-full select-none mb-2">
      {/* THANH TIẾN TRÌNH */}
      <div
        ref={barRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMoveHover}
        onMouseLeave={handleMouseLeave}
        className="w-full h-1.5 hover:h-2.5 bg-white/20 rounded-full cursor-pointer relative transition-all group/bar"
      >
        {/* Buffered bar */}
        <div
          className="absolute top-0 left-0 bottom-0 bg-white/30 rounded-full transition-all duration-150 pointer-events-none"
          style={{ width: `${bufferedPercent}%` }}
        />

        {/* Played bar */}
        <div
          className="absolute top-0 left-0 bottom-0 bg-netflix-red rounded-full flex items-center justify-end pointer-events-none"
          style={{ width: `${playedPercent}%` }}
        >
          <div className="w-3.5 h-3.5 rounded-full bg-white shadow-md scale-0 group-hover/bar:scale-100 transition-transform" />
        </div>

        {/* Hover preview tooltip */}
        {hoverTime !== null && (
          <div
            className="absolute -top-7 -translate-x-1/2 px-1.5 py-0.5 rounded bg-black/90 text-[10px] font-mono font-bold text-white border border-white/20 shadow-md pointer-events-none"
            style={{ left: `${hoverPos}px` }}
          >
            {formatTime(hoverTime)}
          </div>
        )}
      </div>

      {/* HIỂN THỊ THỜI GIAN HIỆN TẠI VÀ TỔNG THỜI LƯỢNG */}
      <div className="flex justify-between items-center text-[11px] sm:text-xs text-gray-300 font-mono mt-1 px-0.5">
        <span className="text-white font-medium">{formatTime(currentTime)}</span>
        <span className="text-gray-400">{formatTime(duration)}</span>
      </div>
    </div>
  );
};

export default PlayerScrubBar;
