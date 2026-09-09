"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  Radio,
  Tv,
  ChevronDown,
  ChevronUp,
  Bell,
  Sparkles,
  PictureInPicture2,
  Zap,
} from "lucide-react";
import { FootballMatch, StreamServer } from "@/services/liveFootballService";
import { useMatchReminders } from "@/hooks/useMatchReminders";

interface LivePlayerProps {
  match?: FootballMatch;
  title: string;
  servers: StreamServer[];
  blv?: string;
  time?: string;
  group?: string;
  team1?: string;
  team2?: string;
  homeLogo?: string;
  awayLogo?: string;
  logo?: string;
}

export function LivePlayer({
  match,
  title,
  servers,
  blv = match?.blv,
  time = match?.time,
  group = match?.group,
  team1 = match?.team1,
  team2 = match?.team2,
  homeLogo = match?.homeLogo,
  awayLogo = match?.awayLogo,
}: LivePlayerProps) {
  const { isReminded, addReminder, removeReminder } = useMatchReminders();
  const matchId = match?.id;
  const isCurrentlyReminded = matchId ? isReminded(matchId) : false;
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [selectedServerIndex, setSelectedServerIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState<number>(0.9);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPip, setIsPip] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showAllServers, setShowAllServers] = useState(false);

  const INITIAL_SERVER_LIMIT = 8;
  const hasMoreServers = servers.length > INITIAL_SERVER_LIMIT;

  useEffect(() => {
    if (selectedServerIndex >= INITIAL_SERVER_LIMIT) {
      setShowAllServers(true);
    }
  }, [selectedServerIndex]);

  const displayedServers =
    showAllServers || !hasMoreServers
      ? servers
      : servers.slice(0, INITIAL_SERVER_LIMIT);

  const [homeImgError, setHomeImgError] = useState(false);
  const [awayImgError, setAwayImgError] = useState(false);

  const currentServer = servers[selectedServerIndex] || servers[0];
  const volumeRef = useRef(volume);
  const isMutedRef = useRef(isMuted);

  // Khôi phục mức âm lượng đã lưu từ localStorage
  useEffect(() => {
    try {
      const savedVol = localStorage.getItem("nanaflix_live_volume");
      if (savedVol !== null) {
        const val = parseFloat(savedVol);
        if (!isNaN(val) && val > 0 && val <= 1) {
          setVolume(val);
          volumeRef.current = val;
        } else {
          setVolume(0.9);
          volumeRef.current = 0.9;
        }
      } else {
        setVolume(0.9);
        volumeRef.current = 0.9;
      }
    } catch {
      setVolume(0.9);
      volumeRef.current = 0.9;
    }
  }, []);

  // Đồng bộ volume & muted sang video element mà KHÔNG khởi động lại HLS
  useEffect(() => {
    volumeRef.current = volume;
    isMutedRef.current = isMuted;
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Tạo URL qua proxy để bypass CORS & IP restrictions
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

  // Tự động ẩn controls sau 3.5s nếu không di chuyển chuột
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3500);
  }, [isPlaying]);

  // Khởi tạo luồng phát HLS tối ưu độ trễ thấp (Ultra Low Latency)
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

    if (currentServer.format === "flv") {
      setIsLoading(false);
      setHasError(true);
      setErrorMessage(
        "Định dạng FLV không thể phát trực tiếp trên trình duyệt Web. Vui lòng bấm 'Mở bằng VLC' bên dưới hoặc chuyển sang máy chủ HLS!"
      );
      return;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 15,
        maxMaxBufferLength: 30,
        liveSyncDuration: 3,
        liveMaxLatencyDuration: 8,
        backBufferLength: 15,
        manifestLoadingTimeOut: 10000,
        levelLoadingTimeOut: 10000,
        fragLoadingTimeOut: 10000,
        capLevelToPlayerSize: false,
      });

      hlsRef.current = hls;
      hls.loadSource(activeUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        if (data.levels && data.levels.length > 0) {
          hls.currentLevel = data.levels.length - 1;
        }
        setIsLoading(false);
        const curVol = volumeRef.current || 0.9;
        video.volume = curVol;
        video.muted = isMutedRef.current;

        video
          .play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch(() => {
            setIsMuted(true);
            video.muted = true;
            video
              .play()
              .then(() => {
                setIsPlaying(true);
              })
              .catch(() => {});
          });
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setIsLoading(false);
              setHasError(true);
              setErrorMessage(
                "Tín hiệu luồng phát tạm thời gián đoạn hoặc trận đấu chưa bắt đầu. Hãy thử đổi máy chủ khác hoặc mở bằng VLC."
              );
              break;
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = activeUrl;
      const curVol = volumeRef.current || 0.9;
      video.volume = curVol;
      video.muted = isMutedRef.current;

      video.addEventListener("loadedmetadata", () => {
        setIsLoading(false);
        video
          .play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch(() => {
            setIsMuted(true);
            video.muted = true;
            video
              .play()
              .then(() => {
                setIsPlaying(true);
              })
              .catch(() => {});
          });
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

  // Điều khiển Play / Pause
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      setShowControls(true);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      resetControlsTimeout();
    }
  }, [isPlaying, resetControlsTimeout]);

  // Bật tiếng
  const unmuteSound = useCallback(() => {
    const targetVol = volume > 0 ? volume : 0.9;
    setVolume(targetVol);
    setIsMuted(false);
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.volume = targetVol;
      videoRef.current.play().catch(() => {});
    }
    try {
      localStorage.setItem("nanaflix_live_volume", String(targetVol));
    } catch {}
  }, [volume]);

  // Bật / Tắt tiếng
  const toggleMute = useCallback(() => {
    if (isMuted) {
      unmuteSound();
    } else {
      setIsMuted(true);
      if (videoRef.current) {
        videoRef.current.muted = true;
      }
    }
  }, [isMuted, unmuteSound]);

  // Thay đổi âm lượng
  const handleVolumeChange = useCallback((newVolume: number) => {
    const clamped = Math.max(0, Math.min(1, newVolume));
    setVolume(clamped);
    setIsMuted(clamped === 0);

    if (videoRef.current) {
      videoRef.current.volume = clamped;
      videoRef.current.muted = clamped === 0;
    }

    try {
      localStorage.setItem("nanaflix_live_volume", String(clamped));
    } catch {}
  }, []);

  // Toàn màn hình
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  // Picture in Picture (PiP)
  const togglePip = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPip(false);
      } else {
        await videoRef.current.requestPictureInPicture();
        setIsPip(true);
      }
    } catch {
      // Ignore PiP error
    }
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Phím tắt bàn phím tiện ích
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["input", "textarea"].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleMute();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        togglePip();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        handleVolumeChange(volume + 0.1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        handleVolumeChange(volume - 0.1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, toggleMute, toggleFullscreen, togglePip, handleVolumeChange, volume]);

  const handleCopyStream = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard && currentServer) {
      navigator.clipboard.writeText(currentServer.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openInVlc = () => {
    if (!currentServer) return;
    window.location.href = `vlc://${currentServer.url}`;
  };

  // Tự động chuyển máy chủ kế tiếp khi lỗi
  const handleSwitchNextServer = () => {
    if (servers.length > 1) {
      const nextIndex = (selectedServerIndex + 1) % servers.length;
      setSelectedServerIndex(nextIndex);
    }
  };

  const VolumeIcon =
    isMuted || volume === 0
      ? VolumeX
      : volume < 0.5
      ? Volume1
      : Volume2;

  return (
    <div className="space-y-4">
      {/* 1. SCOREBOARD HEADER SÂN CỎ ĐỈNH CAO: AMBIENT GLOW & HUY HIỆU CLB SẮC NÉT */}
      <div className="relative rounded-2xl sm:rounded-3xl border border-white/15 bg-gradient-to-b from-zinc-900/95 via-zinc-950/98 to-black p-4 sm:p-5 shadow-2xl overflow-hidden w-full min-w-0 backdrop-blur-xl">
        {/* Glow hiệu ứng sân vận động 2 bên */}
        <div className="pointer-events-none absolute -top-24 left-1/4 w-96 h-96 bg-red-600/15 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute -top-24 right-1/4 w-96 h-96 bg-sky-600/15 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
          {/* KHU VỰC 2 ĐỘI & HUY HIỆU CLB */}
          <div className="flex-1 w-full flex items-center justify-around sm:justify-center gap-2 sm:gap-6">
            {/* ĐỘI NHÀ (TEAM 1) */}
            <div className="flex flex-col items-center text-center max-w-[120px] sm:max-w-[180px] group">
              <div className="w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-950 border-2 border-white/20 p-2 sm:p-2.5 flex items-center justify-center shadow-xl transition-all duration-300 group-hover:scale-105 group-hover:border-netflix-red/70 group-hover:shadow-red-950/60">
                {!homeImgError && homeLogo && !homeLogo.includes("tinhlagi.pro/logo.jpg") ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={homeLogo}
                    alt={team1 || "Đội nhà"}
                    className="w-full h-full object-contain filter drop-shadow-xl"
                    onError={() => setHomeImgError(true)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-xl sm:text-2xl font-black text-rose-400 tracking-wider">
                      {team1 ? team1.replace(/^CLB\s+/i, "").replace(/^FC\s+/i, "").slice(0, 2).toUpperCase() : "H"}
                    </span>
                    <span className="text-[8px] sm:text-[9px] uppercase tracking-widest text-gray-400 font-bold mt-0.5">
                      CLB
                    </span>
                  </div>
                )}
              </div>
              <h3 className="mt-1.5 sm:mt-2 text-[11px] sm:text-sm font-black text-white line-clamp-2 leading-tight">
                {team1}
              </h3>
            </div>

            {/* TRUNG TÂM VS & THỜI GIAN TRẬN ĐẤU */}
            <div className="flex flex-col items-center flex-shrink-0 px-1 sm:px-3">
              <div className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-0.5 sm:py-1 rounded-full bg-netflix-red/20 border border-netflix-red/40 text-netflix-red text-[10px] sm:text-xs font-black animate-pulse mb-1 sm:mb-2 shadow-sm">
                <Radio className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>TRỰC TIẾP</span>
              </div>

              <div className="px-3 py-1 rounded-xl bg-zinc-800/90 border border-white/15 text-xs sm:text-base font-black text-rose-400 tracking-wider shadow-inner">
                VS
              </div>

              {time && (
                <span className="mt-1 sm:mt-1.5 text-[10px] sm:text-xs text-gray-300 font-semibold bg-white/10 px-2 py-0.5 rounded-full border border-white/10 whitespace-nowrap">
                  ⏰ {time}
                </span>
              )}
            </div>

            {/* ĐỘI KHÁCH (TEAM 2) */}
            <div className="flex flex-col items-center text-center max-w-[120px] sm:max-w-[180px] group">
              <div className="w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-950 border-2 border-white/20 p-2 sm:p-2.5 flex items-center justify-center shadow-xl transition-all duration-300 group-hover:scale-105 group-hover:border-sky-500/70 group-hover:shadow-sky-950/60">
                {!awayImgError && awayLogo && !awayLogo.includes("tinhlagi.pro/logo.jpg") ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={awayLogo}
                    alt={team2 || "Đội khách"}
                    className="w-full h-full object-contain filter drop-shadow-xl"
                    onError={() => setAwayImgError(true)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-xl sm:text-2xl font-black text-sky-400 tracking-wider">
                      {team2 ? team2.replace(/^CLB\s+/i, "").replace(/^FC\s+/i, "").slice(0, 2).toUpperCase() : "A"}
                    </span>
                    <span className="text-[8px] sm:text-[9px] uppercase tracking-widest text-gray-400 font-bold mt-0.5">
                      CLB
                    </span>
                  </div>
                )}
              </div>
              <h3 className="mt-1.5 sm:mt-2 text-[11px] sm:text-sm font-black text-white line-clamp-2 leading-tight">
                {team2 || "Đối thủ"}
              </h3>
            </div>
          </div>

          {/* META INFO BÊN PHẢI (GIẢI ĐẤU, BLV, CHẤT LƯỢNG) */}
          <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-1.5 sm:gap-2 border-t md:border-t-0 border-white/10 pt-2 md:pt-0">
            {group && (
              <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-gray-200 text-xs font-bold shadow-sm">
                🏆 {group}
              </span>
            )}
            {blv && (
              <span className="px-3 py-1 rounded-full bg-netflix-red/20 border border-netflix-red/40 text-rose-300 text-xs font-extrabold shadow-sm">
                🎙️ BLV {blv}
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-black uppercase">
                <Zap className="w-3 h-3 fill-emerald-400" />
                <span>{currentServer?.quality || "FHD 1080p"}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. KHUNG PHÁT VIDEO CHUYÊN NGHIỆP VỚI LOW-LATENCY ENGINE */}
      <div
        ref={containerRef}
        onMouseMove={resetControlsTimeout}
        onClick={() => {
          setShowControls((prev) => !prev);
          resetControlsTimeout();
        }}
        onDoubleClick={toggleFullscreen}
        className="relative w-full aspect-video bg-black rounded-2xl sm:rounded-3xl overflow-hidden border border-white/15 shadow-2xl group select-none cursor-pointer ring-1 ring-white/10"
      >
        <video
          ref={videoRef}
          className="w-full h-full object-contain pointer-events-none"
          playsInline
          muted={isMuted}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {/* HUY HIỆU SIGNAL & LIVE TRÊN TRÁI */}
        <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex items-center gap-2 z-20 pointer-events-none">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-netflix-red/90 text-white text-[11px] sm:text-xs font-black shadow-lg animate-pulse backdrop-blur-md">
            <Radio className="w-3.5 h-3.5" />
            <span>TRỰC TIẾP</span>
          </span>
          <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-emerald-400 text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Độ trễ thấp (Ultra Low Latency)</span>
          </span>
        </div>

        {/* NÚT BẬT ÂM THANH NỔI BẬT (HIỂN THỊ KHI ĐANG MUTE) */}
        {isPlaying && isMuted && !isLoading && !hasError && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              unmuteSound();
            }}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 animate-bounce cursor-pointer"
          >
            <button
              type="button"
              className="flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white text-xs sm:text-sm font-black shadow-2xl border-2 border-white/40 backdrop-blur-md transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
              <span>🔊 BẬT ÂM THANH ({Math.round(volume * 100)}%)</span>
            </button>
          </div>
        )}

        {/* LOADING SPINNER */}
        {isLoading && !hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-20 pointer-events-none">
            <div className="w-12 h-12 rounded-full border-4 border-netflix-red border-t-transparent animate-spin mb-3 shadow-lg" />
            <p className="text-xs sm:text-sm font-bold text-gray-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
              <span>Đang kết nối luồng phát sóng trực tiếp...</span>
            </p>
          </div>
        )}

        {/* THÔNG BÁO LỖI VÀ GỢI Ý CHUYỂN SERVER */}
        {hasError && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/95 p-4 sm:p-6 text-center z-20"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-3">
              <AlertCircle className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <h4 className="text-base sm:text-lg font-bold text-white mb-1">
              Chưa nhận được tín hiệu hình ảnh
            </h4>
            <p className="text-xs sm:text-sm text-gray-400 max-w-md mb-5 leading-relaxed">
              {errorMessage ||
                "Luồng phát bóng đá thường mở trước giờ bóng lăn 15-30 phút. Hãy bấm thử lại hoặc chuyển sang máy chủ khác."}
            </p>
            <div className="flex flex-wrap gap-2.5 justify-center">
              <button
                type="button"
                onClick={() => {
                  setHasError(false);
                  setIsLoading(true);
                  const idx = selectedServerIndex;
                  setSelectedServerIndex(-1);
                  setTimeout(() => setSelectedServerIndex(idx), 50);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition border border-white/10 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Thử tải lại</span>
              </button>

              {servers.length > 1 && (
                <button
                  type="button"
                  onClick={handleSwitchNextServer}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-netflix-red hover:bg-red-700 text-xs font-bold text-white transition shadow-lg shadow-red-950/50 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Đổi Máy Chủ #{((selectedServerIndex + 1) % servers.length) + 1}</span>
                </button>
              )}

              <button
                type="button"
                onClick={openInVlc}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-xs font-bold text-white transition shadow-lg shadow-orange-950/50 cursor-pointer"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Mở bằng VLC</span>
              </button>
            </div>
          </div>
        )}

        {/* THANH ĐIỀU KHIỂN DƯỚI ĐÁY ĐẦY ĐỦ CHỨC NĂNG */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-3 sm:p-5 flex items-center justify-between transition-opacity duration-300 z-30 ${
            showControls || !isPlaying
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          {/* CỤM TRÁI: PLAY/PAUSE + ÂM LƯỢNG */}
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={togglePlay}
              title={isPlaying ? "Tạm dừng (Space)" : "Phát (Space)"}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
              ) : (
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current ml-0.5" />
              )}
            </button>

            <div className="flex items-center gap-2 bg-black/60 px-3 py-2 rounded-full border border-white/20 backdrop-blur-md">
              <button
                type="button"
                onClick={toggleMute}
                title={isMuted ? "Bật âm thanh (M)" : "Tắt âm thanh (M)"}
                className="text-white hover:text-rose-400 transition cursor-pointer p-0.5"
              >
                <VolumeIcon
                  className={`w-4 h-4 sm:w-5 sm:h-5 ${
                    isMuted || volume === 0 ? "text-rose-400" : "text-white"
                  }`}
                />
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                aria-label="Điều chỉnh âm lượng"
                className="w-16 sm:w-24 h-1.5 bg-zinc-700 accent-netflix-red rounded-lg appearance-none cursor-pointer hover:accent-red-500 transition"
              />

              <span
                onClick={toggleMute}
                className="text-[10px] sm:text-[11px] font-mono font-bold text-gray-200 cursor-pointer hover:text-white select-none whitespace-nowrap min-w-[36px]"
              >
                {isMuted ? "Tắt tiếng" : `${Math.round(volume * 100)}%`}
              </span>
            </div>
          </div>

          {/* CỤM PHẢI: PIP + TOÀN MÀN HÌNH */}
          <div className="flex items-center gap-2">
            {/* Phím tắt gợi ý */}
            <span className="hidden lg:inline text-[11px] text-gray-400 bg-black/50 px-2.5 py-1 rounded-full border border-white/10 font-mono">
              Space: Dừng/Phát • F: Fullscreen • P: PiP
            </span>

            {/* Nút Picture in Picture */}
            <button
              type="button"
              onClick={togglePip}
              title="Xem thu nhỏ góc màn hình (PiP - Phím P)"
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md border border-white/10 ${
                isPip
                  ? "bg-netflix-red text-white"
                  : "bg-white/20 hover:bg-white/30 text-white"
              }`}
            >
              <PictureInPicture2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Nút Toàn màn hình */}
            <button
              type="button"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Thu nhỏ (F)" : "Toàn màn hình (F)"}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md"
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 3. THANH THÔNG TIN TRẬN ĐẤU & CHỌN MÁY CHỦ SẮC NÉT */}
      <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-zinc-900/95 p-3.5 sm:p-5 shadow-xl space-y-3 sm:space-y-4 w-full min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-gray-400">
              {time && (
                <span className="font-bold text-gray-200 bg-white/10 px-2 py-0.5 rounded-md text-[11px] sm:text-xs">
                  ⏰ {time}
                </span>
              )}
              {group && (
                <span className="px-2 py-0.5 rounded-md bg-white/10 text-gray-300 font-medium text-[11px] sm:text-xs">
                  🏆 {group}
                </span>
              )}
              {blv && (
                <span className="text-rose-400 font-bold flex items-center gap-1 bg-netflix-red/15 px-2 py-0.5 rounded-md border border-netflix-red/30 text-[11px] sm:text-xs max-w-xs sm:max-w-md truncate">
                  <span>🎙️ BLV</span>
                  <span className="truncate">{blv}</span>
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-xl font-black text-white leading-snug break-words">
              {title}
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-center">
            {match && (
              <button
                type="button"
                onClick={() => {
                  if (isCurrentlyReminded) {
                    removeReminder(match.id);
                  } else {
                    addReminder(match);
                  }
                }}
                title={
                  isCurrentlyReminded
                    ? "Đã hẹn thông báo (Bấm để hủy)"
                    : "Nhận thông báo khi trận đấu bắt đầu"
                }
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer border shadow-sm ${
                  isCurrentlyReminded
                    ? "bg-amber-500/25 text-amber-300 border-amber-500/50 shadow-amber-950/40"
                    : "bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white border-white/10"
                }`}
              >
                <Bell
                  className={`w-3.5 h-3.5 ${
                    isCurrentlyReminded
                      ? "fill-amber-400 text-amber-400 animate-bounce"
                      : ""
                  }`}
                />
                <span className="hidden sm:inline">
                  {isCurrentlyReminded ? "Đã hẹn nhắc" : "Nhắc tôi"}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={openInVlc}
              title="Mở link stream này trong VLC"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-extrabold transition shadow-md shadow-orange-950/40 cursor-pointer whitespace-nowrap"
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Mở bằng VLC</span>
            </button>

            <button
              type="button"
              onClick={handleCopyStream}
              title="Sao chép link stream trực tiếp"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition border border-white/10 cursor-pointer"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* DANH SÁCH MÁY CHỦ PHÁT SÓNG */}
        <div className="space-y-2.5 w-full min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400 font-bold">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-gray-200">
                <span>📡 Chọn Máy Chủ Phát Sóng</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white font-extrabold">
                  {servers.length} nguồn
                </span>
              </span>
              {hasMoreServers && (
                <span className="text-[11px] text-gray-500 font-normal hidden sm:inline">
                  ({showAllServers ? `Đang hiện toàn bộ ${servers.length}` : `Đang hiện 8/${servers.length}`})
                </span>
              )}
            </div>

            {hasMoreServers && (
              <button
                type="button"
                onClick={() => setShowAllServers((prev) => !prev)}
                className="flex items-center gap-1 text-xs font-extrabold text-netflix-red hover:text-red-400 transition cursor-pointer bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg border border-white/10"
              >
                <span>
                  {showAllServers
                    ? "Thu gọn bớt"
                    : `Xem thêm (+${servers.length - INITIAL_SERVER_LIMIT} nguồn)`}
                </span>
                {showAllServers ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full min-w-0 pt-0.5">
            {displayedServers.map((s, idx) => {
              const actualIdx = idx;
              const isSelected = selectedServerIndex === actualIdx;
              return (
                <button
                  key={actualIdx}
                  type="button"
                  onClick={() => setSelectedServerIndex(actualIdx)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border shadow-sm ${
                    isSelected
                      ? "bg-netflix-red text-white border-netflix-red shadow-md shadow-red-950/60 scale-102"
                      : "bg-black/60 text-gray-300 border-white/15 hover:border-white/30 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isSelected ? "bg-white animate-ping" : "bg-emerald-400"
                    }`}
                  />
                  <span>{s.name}</span>
                </button>
              );
            })}

            {hasMoreServers && !showAllServers && (
              <button
                type="button"
                onClick={() => setShowAllServers(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white border border-dashed border-white/30 hover:border-white/60 shadow-sm"
              >
                <span>+ Xem thêm {servers.length - INITIAL_SERVER_LIMIT} nguồn khác</span>
                <ChevronDown className="w-3.5 h-3.5 text-netflix-red" />
              </button>
            )}

            {hasMoreServers && showAllServers && (
              <button
                type="button"
                onClick={() => setShowAllServers(false)}
                className="px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10"
              >
                <span>Thu gọn lại</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LivePlayer;
