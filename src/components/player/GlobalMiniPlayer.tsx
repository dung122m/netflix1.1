"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Hls from "hls.js";
import { Play, Pause, X, Maximize2, Volume2, VolumeX } from "lucide-react";
import { useGlobalPlayer } from "@/context/GlobalPlayerContext";
import { SeekBack10Icon, SeekForward10Icon } from "./PlayerNativeControls";

function formatSeconds(secs: number): string {
  if (isNaN(secs) || secs < 0) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export const GlobalMiniPlayer: React.FC = React.memo(function GlobalMiniPlayer() {
  const {
    activePlayback,
    isMiniPlayerOpen,
    isMainPlayerMounted,
    closeMiniPlayer,
    expandToFullPlayer,
    updatePlaybackState,
  } = useGlobalPlayer() || {};

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);

  // Đồng bộ state ban đầu từ activePlayback
  useEffect(() => {
    if (activePlayback) {
      setIsPlaying(activePlayback.isPlaying !== false);
      setIsMuted(Boolean(activePlayback.isMuted));
      setCurrentTime(activePlayback.currentTime || 0);
      setDuration(activePlayback.duration || 0);
    }
  }, [activePlayback]);

  // HLS.js video lifecycle cho Mini Player
  useEffect(() => {
    if (!isMiniPlayerOpen || isMainPlayerMounted || !activePlayback) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      return;
    }

    const video = videoRef.current;
    const m3u8Url = activePlayback.m3u8Link;

    if (!video || !m3u8Url) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const startPos = activePlayback.currentTime > 0 ? activePlayback.currentTime : 0;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferSize: 15 * 1000 * 1000,
        maxBufferLength: 20,
        startPosition: startPos,
        autoStartLoad: true,
      });

      hls.loadSource(m3u8Url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.muted = activePlayback.isMuted || false;
        video.volume = activePlayback.volume ?? 1;
        video.playbackRate = activePlayback.playbackSpeed || 1;
        if (startPos > 0) {
          video.currentTime = startPos;
        }
        if (activePlayback.isPlaying !== false) {
          video.play().catch(() => {
            // Autoplay bị chặn -> tự động mute để play
            video.muted = true;
            setIsMuted(true);
            video.play().catch(() => {});
          });
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // iOS / Safari Native HLS
      video.src = m3u8Url;
      video.muted = activePlayback.isMuted || false;
      video.volume = activePlayback.volume ?? 1;
      video.playbackRate = activePlayback.playbackSpeed || 1;
      if (startPos > 0) {
        video.currentTime = startPos;
      }
      if (activePlayback.isPlaying !== false) {
        video.play().catch(() => {
          video.muted = true;
          setIsMuted(true);
          video.play().catch(() => {});
        });
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [isMiniPlayerOpen, isMainPlayerMounted, activePlayback]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const cur = video.currentTime;
      const dur = video.duration && isFinite(video.duration) ? video.duration : (activePlayback?.duration || 0);
      setCurrentTime(cur);
      if (dur > 0) setDuration(dur);
      updatePlaybackState?.({ currentTime: cur, duration: dur });
    };

    const handlePlay = () => {
      setIsPlaying(true);
      updatePlaybackState?.({ isPlaying: true });
    };

    const handlePause = () => {
      setIsPlaying(false);
      updatePlaybackState?.({ isPlaying: false });
    };

    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => setIsBuffering(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("playing", handlePlaying);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("playing", handlePlaying);
    };
  }, [updatePlaybackState, activePlayback?.duration]);

  const togglePlayPause = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, []);

  const seekDelta = useCallback((delta: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(duration || 99999, video.currentTime + delta));
  }, [duration]);

  const toggleMute = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
    updatePlaybackState?.({ isMuted: video.muted });
  }, [updatePlaybackState]);

  const handleScrub = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    video.currentTime = ratio * duration;
  }, [duration]);

  if (!isMiniPlayerOpen || isMainPlayerMounted || !activePlayback) {
    return null;
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={expandToFullPlayer}
      className="fixed bottom-20 right-3 sm:bottom-6 sm:right-6 z-[90] w-[270px] sm:w-[350px] aspect-video rounded-2xl overflow-hidden bg-zinc-950 border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.85)] select-none group cursor-pointer animate-in fade-in slide-in-from-bottom-5 duration-300 backdrop-blur-md"
      title="Nhấn để phóng to toàn màn hình"
    >
      {/* 1. NATIVE VIDEO HOẶC IFRAME FALLBACK */}
      {activePlayback.isNativeVideo && activePlayback.m3u8Link ? (
        <video
          ref={videoRef}
          className="w-full h-full object-cover bg-black"
          playsInline
          autoPlay
        />
      ) : activePlayback.embedSrc ? (
        <iframe
          src={activePlayback.embedSrc}
          className="w-full h-full pointer-events-none"
          allow="autoplay; encrypted-media; picture-in-picture"
          title={activePlayback.movieTitle}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-xs text-zinc-400">
          Không có luồng phát
        </div>
      )}

      {/* SPINNER BUFFERING */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none z-10">
          <div className="w-7 h-7 border-2 border-netflix-red border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* 2. OVERLAY HEADER: TIÊU ĐỀ & CÁC NÚT ĐIỀU HƯỚNG NHANH */}
      <div
        className={`absolute top-0 inset-x-0 bg-gradient-to-b from-black/90 via-black/50 to-transparent p-2 sm:p-2.5 flex items-center justify-between z-20 transition-opacity duration-200 ${
          isHovered ? "opacity-100" : "opacity-0 sm:opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5 min-w-0 pr-2">
          <span className="w-2 h-2 rounded-full bg-netflix-red animate-pulse flex-shrink-0" />
          <span className="text-white font-bold text-[11px] sm:text-xs truncate drop-shadow">
            {activePlayback.movieTitle}
          </span>
          {activePlayback.episodeName && (
            <span className="text-gray-300 text-[10px] sm:text-[11px] font-normal truncate drop-shadow">
              • {activePlayback.episodeName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Nút Phóng to / Trở lại trang xem phim */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              expandToFullPlayer?.();
            }}
            title="Phóng to / Mở trang xem phim"
            className="p-1 rounded-md bg-white/10 hover:bg-white/25 text-white transition cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {/* Nút Đóng Mini Player */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              closeMiniPlayer?.();
            }}
            title="Đóng mini player"
            className="p-1 rounded-md bg-white/10 hover:bg-rose-600/80 text-white transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. CENTER CONTROLS CLUSTER: TUA -10S / PLAY-PAUSE / TUA +10S */}
      <div
        className={`absolute inset-0 flex items-center justify-center gap-4 sm:gap-6 bg-black/40 z-20 transition-opacity duration-200 ${
          isHovered || !isPlaying ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={(e) => seekDelta(-10, e)}
          title="Tua lùi 10s"
          className="p-1.5 sm:p-2 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 transition active:scale-90 cursor-pointer"
        >
          <SeekBack10Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        <button
          type="button"
          onClick={togglePlayPause}
          title={isPlaying ? "Tạm dừng" : "Phát"}
          className="p-2.5 sm:p-3 rounded-full bg-netflix-red text-white border border-white/30 transition active:scale-90 shadow-[0_0_15px_rgba(229,9,20,0.6)] cursor-pointer"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 sm:w-6 sm:h-6 fill-white" />
          ) : (
            <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-white ml-0.5" />
          )}
        </button>

        <button
          type="button"
          onClick={(e) => seekDelta(10, e)}
          title="Tua tới 10s"
          className="p-1.5 sm:p-2 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 transition active:scale-90 cursor-pointer"
        >
          <SeekForward10Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* 4. BOTTOM BAR: THỜI GIAN & SCRUB BAR */}
      <div
        className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-3 pb-1.5 px-2.5 z-20 transition-opacity duration-200 ${
          isHovered || !isPlaying ? "opacity-100" : "opacity-0 sm:opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between text-[10px] text-gray-300 font-mono mb-1">
          <span>{formatSeconds(currentTime)} / {formatSeconds(duration)}</span>
          <button
            type="button"
            onClick={toggleMute}
            className="p-0.5 hover:text-white transition cursor-pointer"
            title={isMuted ? "Bật âm thanh" : "Tắt tiếng"}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
          </button>
        </div>

        {/* Scrub bar */}
        <div
          onClick={handleScrub}
          className="w-full h-1 bg-white/30 rounded-full overflow-hidden cursor-pointer relative hover:h-1.5 transition-all"
        >
          <div
            className="h-full bg-netflix-red transition-[width] duration-100"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* SLIM PROGRESS LINE KHI CONTROLS ẨN */}
      <div
        className={`absolute bottom-0 inset-x-0 h-0.5 bg-white/20 z-10 transition-opacity duration-200 ${
          isHovered || !isPlaying ? "opacity-0" : "opacity-100"
        }`}
      >
        <div
          className="h-full bg-netflix-red"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
});
