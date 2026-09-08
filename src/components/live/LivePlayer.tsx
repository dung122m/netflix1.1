"use client";

import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Radio,
  Tv,
} from "lucide-react";
import { StreamServer } from "@/services/liveFootballService";

interface LivePlayerProps {
  title: string;
  servers: StreamServer[];
  blv?: string;
  time?: string;
  group?: string;
}

export function LivePlayer({
  title,
  servers,
  blv,
  time,
  group,
}: LivePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [selectedServerIndex, setSelectedServerIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const currentServer = servers[selectedServerIndex] || servers[0];

  // Tạo URL qua proxy để bypass CORS
  const getStreamUrl = (rawUrl: string, isHls: boolean) => {
    if (!rawUrl) return "";
    if (isHls) {
      return `/api/live-football/proxy?url=${encodeURIComponent(rawUrl)}`;
    }
    return rawUrl;
  };

  const activeUrl = currentServer
    ? getStreamUrl(currentServer.url, currentServer.isHls)
    : "";

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentServer) return;

    setIsLoading(true);
    setHasError(false);
    setErrorMessage("");

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Nếu là luồng FLV
    if (currentServer.format === "flv") {
      setIsLoading(false);
      setHasError(true);
      setErrorMessage(
        "Định dạng FLV không thể phát trực tiếp trên trình duyệt Web. Vui lòng bấm 'Mở bằng VLC' bên dưới hoặc chuyển sang máy chủ HLS!"
      );
      return;
    }

    // Luồng HLS (.m3u8)
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        manifestLoadingTimeOut: 8000,
        levelLoadingTimeOut: 8000,
      });

      hlsRef.current = hls;
      hls.loadSource(activeUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        video.play().catch(() => {
          // Trình duyệt có thể chặn autoplay nếu có tiếng
          setIsMuted(true);
          video.muted = true;
          video.play().catch(() => {});
        });
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setIsLoading(false);
          setHasError(true);
          setErrorMessage(
            "Tín hiệu luồng phát tạm thời gián đoạn hoặc trận đấu chưa bắt đầu. Hãy thử đổi máy chủ khác hoặc mở bằng VLC."
          );
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari HLS Native
      video.src = activeUrl;
      video.addEventListener("loadedmetadata", () => {
        setIsLoading(false);
        video.play().catch(() => {});
      });
      video.addEventListener("error", () => {
        setIsLoading(false);
        setHasError(true);
        setErrorMessage(
          "Không thể tải luồng phát trên Safari. Vui lòng đổi máy chủ hoặc mở bằng VLC."
        );
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [selectedServerIndex, currentServer, activeUrl]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleCopyStream = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard && currentServer) {
      navigator.clipboard.writeText(currentServer.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openInVlc = () => {
    if (!currentServer) return;
    // Thử mở qua custom protocol vlc://
    window.location.href = `vlc://${currentServer.url}`;
  };

  return (
    <div className="space-y-4">
      {/* KHUNG PHÁT VIDEO */}
      <div
        ref={containerRef}
        className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl group select-none"
      >
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          playsInline
          muted={isMuted}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {/* HUY HIỆU LIVE GÓC TRÊN TRÁI */}
        <div className="absolute top-4 left-4 flex items-center gap-2 z-20 pointer-events-none">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-netflix-red/90 text-white text-xs font-bold shadow-lg animate-pulse">
            <Radio className="w-3.5 h-3.5" />
            <span>TRỰC TIẾP</span>
          </span>
          {group && (
            <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-gray-200 text-xs font-semibold">
              {group}
            </span>
          )}
        </div>

        {/* LOADING SPINNER */}
        {isLoading && !hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-20">
            <div className="w-12 h-12 rounded-full border-4 border-netflix-red border-t-transparent animate-spin mb-3" />
            <p className="text-sm font-medium text-gray-300">
              Đang kết nối luồng phát sóng...
            </p>
          </div>
        )}

        {/* THÔNG BÁO LỖI KHI LUỒNG CHƯA PHÁT / LỖI MẠNG */}
        {hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/95 p-6 text-center z-20">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-3">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-white mb-1">
              Chưa nhận được tín hiệu hình ảnh
            </h4>
            <p className="text-xs sm:text-sm text-gray-400 max-w-md mb-5 leading-relaxed">
              {errorMessage ||
                "Luồng phát bóng đá thường chỉ mở trước giờ đá 15-30 phút. Nếu trận đấu đang diễn ra, vui lòng đổi sang Máy Chủ khác hoặc bấm 'Mở Bằng VLC'."}
            </p>
            <div className="flex flex-wrap gap-2.5 justify-center">
              <button
                type="button"
                onClick={() => {
                  setHasError(false);
                  setIsLoading(true);
                  // Reload server
                  const idx = selectedServerIndex;
                  setSelectedServerIndex(-1);
                  setTimeout(() => setSelectedServerIndex(idx), 50);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition border border-white/10"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Thử tải lại</span>
              </button>
              <button
                type="button"
                onClick={openInVlc}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-xs font-bold text-white transition shadow-lg shadow-orange-950/50"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Mở bằng VLC / IPTV</span>
              </button>
            </div>
          </div>
        )}

        {/* THANH ĐIỀU KHIỂN DƯỚI ĐÁY */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={toggleMute}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4" />
              ) : (
                <Maximize className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* THANH CHỌN MÁY CHỦ & TIỆN ÍCH VLC */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            {time && <span>⏰ {time}</span>}
            {blv && (
              <>
                <span>•</span>
                <span className="text-netflix-red font-semibold">🎙️ {blv}</span>
              </>
            )}
            {currentServer?.quality && (
              <>
                <span>•</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black uppercase">
                  {currentServer.quality}
                </span>
              </>
            )}
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white">{title}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* DANH SÁCH MÁY CHỦ */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10">
            <span className="text-[11px] text-gray-400 font-medium px-2 hidden sm:inline">
              Máy chủ:
            </span>
            {servers.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedServerIndex(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  selectedServerIndex === idx
                    ? "bg-netflix-red text-white shadow-md shadow-red-950/50"
                    : "text-gray-300 hover:text-white hover:bg-white/10"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          {/* NÚT MỞ BẰNG VLC */}
          <button
            type="button"
            onClick={openInVlc}
            title="Mở link này trong ứng dụng VLC trên máy tính / điện thoại"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition shadow-md shadow-orange-950/40"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Mở bằng VLC</span>
          </button>

          {/* SAO CHÉP LINK STREAM */}
          <button
            type="button"
            onClick={handleCopyStream}
            title="Sao chép link stream trực tiếp"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition border border-white/10"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LivePlayer;
