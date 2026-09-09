"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Hls from "hls.js";
import {
  Search,
  Tv,
  Radio,
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
  ChevronLeft,
  ChevronRight,
  X,
  LayoutGrid,
  List,
  ChevronDown,
  RotateCcw,
  Sparkles,
  PictureInPicture2,
  Zap,
} from "lucide-react";
import { LiveTvData, TvChannel } from "@/services/liveTvService";
import { useSearchParams } from "next/navigation";

interface LiveTvClientProps {
  initialData: LiveTvData;
}

const INITIAL_PAGE_SIZE = 24;

function getCategoryEmoji(category: string): string {
  if (category.includes("Thể Thao")) return "⚽";
  if (category.includes("VTV")) return "🇻🇳";
  if (category.includes("HTV")) return "🏙️";
  if (category.includes("Vĩnh Long")) return "🌾";
  if (category.includes("VTC") || category.includes("Tin Tức")) return "📰";
  if (category.includes("Quốc Tế")) return "🌍";
  if (category.includes("Địa Phương")) return "📍";
  return "📺";
}

export function LiveTvClient({ initialData }: LiveTvClientProps) {
  const { categories, channels } = initialData;
  const searchParams = useSearchParams();

  const defaultChannel = useMemo(() => {
    return (
      channels.find((c) => c.category === "Kênh Thể Thao") ||
      channels.find((c) => c.name.includes("VTV3")) ||
      channels[0] ||
      null
    );
  }, [channels]);

  const [selectedChannel, setSelectedChannel] = useState<TvChannel | null>(
    () => {
      if (typeof window !== "undefined") {
        try {
          const channelParam = new URLSearchParams(window.location.search).get("channel");
          const savedId = localStorage.getItem("nanaflix_live_channel_id");
          const target = channelParam || savedId;
          if (target) {
            const found = channels.find(
              (c) =>
                c.id === target ||
                c.name.toLowerCase() === target.toLowerCase() ||
                c.name.toLowerCase().includes(target.toLowerCase())
            );
            if (found) return found;
          }
        } catch {}
      }
      return defaultChannel;
    }
  );

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [onlyFhd, setOnlyFhd] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_PAGE_SIZE);

  // Video Player States
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const popularScrollRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState<number>(0.9);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPip, setIsPip] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [copied, setCopied] = useState(false);

  const volumeRef = useRef(volume);
  const isMutedRef = useRef(isMuted);
  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Dải kênh phổ biến xem nhiều nhất (Quick Access Bar)
  const popularChannels = useMemo(() => {
    return channels
      .filter((ch) => {
        const lower = (ch.name + " " + ch.id).toLowerCase();
        return (
          lower.includes("vtv1") ||
          lower.includes("vtv3") ||
          lower.includes("vtv5") ||
          lower.includes("vtv6") ||
          lower.includes("htv the thao") ||
          lower.includes("htv thể thao") ||
          lower.includes("htv7") ||
          lower.includes("htv9") ||
          lower.includes("thvl2") ||
          lower.includes("qpvn") ||
          lower.includes("red bull")
        );
      })
      .slice(0, 10);
  }, [channels]);

  // Khôi phục volume từ localStorage
  useEffect(() => {
    try {
      const savedVol = localStorage.getItem("nanaflix_live_volume");
      if (savedVol !== null) {
        const val = parseFloat(savedVol);
        if (!isNaN(val) && val > 0 && val <= 1) {
          setVolume(val);
        }
      }
    } catch {}
  }, []);

  // Đồng bộ khi channels hoặc URL thay đổi
  useEffect(() => {
    if (channels.length === 0) return;
    const channelParam = searchParams.get("channel");
    const savedId =
      typeof window !== "undefined"
        ? localStorage.getItem("nanaflix_live_channel_id")
        : null;
    const target = channelParam || savedId;

    if (target) {
      const found = channels.find(
        (c) =>
          c.id === target ||
          c.name.toLowerCase() === target.toLowerCase() ||
          c.name.toLowerCase().includes(target.toLowerCase())
      );
      if (found) {
        setSelectedChannel(found);
        return;
      }
    }

    setSelectedChannel((prev) => prev || defaultChannel);
  }, [channels, searchParams, defaultChannel]);

  // Reset phân trang khi đổi bộ lọc
  useEffect(() => {
    setVisibleCount(INITIAL_PAGE_SIZE);
  }, [selectedCategory, searchQuery, onlyFhd]);

  // Lọc danh sách kênh
  const filteredChannels = useMemo(() => {
    return channels.filter((ch) => {
      if (selectedCategory !== "all" && ch.category !== selectedCategory) {
        return false;
      }
      if (onlyFhd && !ch.quality.includes("FHD")) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inName = ch.name.toLowerCase().includes(q);
        const inCat = ch.category.toLowerCase().includes(q);
        if (!inName && !inCat) return false;
      }
      return true;
    });
  }, [channels, selectedCategory, searchQuery, onlyFhd]);

  const displayedChannels = useMemo(() => {
    return filteredChannels.slice(0, visibleCount);
  }, [filteredChannels, visibleCount]);

  const handleSelectChannel = (channel: TvChannel) => {
    setSelectedChannel(channel);
    try {
      localStorage.setItem("nanaflix_live_channel_id", channel.id);
      const url = new URL(window.location.href);
      url.searchParams.set("tab", "tv");
      url.searchParams.set("channel", channel.id);
      window.history.replaceState(null, "", url.toString());
    } catch {}

    if (playerRef.current) {
      playerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const scrollCategories = (direction: "left" | "right") => {
    if (categoryScrollRef.current) {
      const offset = direction === "left" ? -280 : 280;
      categoryScrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  const scrollPopular = (direction: "left" | "right") => {
    if (popularScrollRef.current) {
      const offset = direction === "left" ? -260 : 260;
      popularScrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  // Khởi tạo luồng phát HLS với Proxy + Auto-Fallback + Low Latency Engine
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedChannel?.url) return;

    setIsLoading(true);
    setHasError(false);

    const primaryUrl = selectedChannel.url;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fallbackUrl = (selectedChannel as any)?.fallback_url || (selectedChannel as any)?.fallbackUrl;
    let hasTriedFallback = false;

    const startHls = (sourceUrl: string) => {
      if (!videoRef.current) return;

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
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
          xhrSetup: (xhr) => {
            xhr.withCredentials = false;
          },
        });

        hlsRef.current = hls;
        hls.loadSource(sourceUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
          if (data.levels && data.levels.length > 0) {
            hls.currentLevel = data.levels.length - 1;
          }
          setIsLoading(false);
          setHasError(false);
          video.volume = volumeRef.current;
          video.muted = isMutedRef.current;

          video
            .play()
            .then(() => setIsPlaying(true))
            .catch(() => {
              setIsMuted(true);
              video.muted = true;
              video
                .play()
                .then(() => setIsPlaying(true))
                .catch(() => {});
            });
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              if (!hasTriedFallback && fallbackUrl && fallbackUrl !== sourceUrl) {
                hasTriedFallback = true;
                startHls(fallbackUrl);
                return;
              }
              hls.startLoad();
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError();
            } else {
              setIsLoading(false);
              setHasError(true);
            }
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = sourceUrl;
        video.volume = volumeRef.current;
        video.muted = isMutedRef.current;

        video.addEventListener("loadedmetadata", () => {
          setIsLoading(false);
          setHasError(false);
          video.play().then(() => setIsPlaying(true)).catch(() => {});
        });
        video.addEventListener("error", () => {
          if (!hasTriedFallback && fallbackUrl && fallbackUrl !== sourceUrl) {
            hasTriedFallback = true;
            video.src = fallbackUrl;
            return;
          }
          setIsLoading(false);
          setHasError(true);
        });
      }
    };

    startHls(primaryUrl);

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [selectedChannel]);

  // Volume & Sound Helpers
  const unmuteSound = useCallback(() => {
    const targetVol = volume > 0 ? volume : 0.9;
    setVolume(targetVol);
    setIsMuted(false);
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.volume = targetVol;
    }
    try {
      localStorage.setItem("nanaflix_live_volume", String(targetVol));
    } catch {}
  }, [volume]);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      unmuteSound();
    } else {
      setIsMuted(true);
      if (videoRef.current) videoRef.current.muted = true;
    }
  }, [isMuted, unmuteSound]);

  const handleVolumeChange = useCallback((newVol: number) => {
    const clamped = Math.max(0, Math.min(1, newVol));
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
    } catch {}
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["input", "textarea"].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        if (videoRef.current) {
          if (isPlaying) {
            videoRef.current.pause();
            setIsPlaying(false);
          } else {
            videoRef.current.play().catch(() => {});
            setIsPlaying(true);
          }
        }
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
  }, [isPlaying, toggleMute, toggleFullscreen, togglePip, handleVolumeChange, volume]);

  const handleCopy = () => {
    if (selectedChannel && typeof navigator !== "undefined") {
      navigator.clipboard.writeText(selectedChannel.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openInVlc = () => {
    if (!selectedChannel) return;
    window.location.href = `vlc://${selectedChannel.url}`;
  };

  const handleResetFilters = () => {
    setSelectedCategory("all");
    setSearchQuery("");
    setOnlyFhd(false);
  };

  const hasActiveFilters =
    selectedCategory !== "all" || searchQuery.trim() !== "" || onlyFhd;

  const VolumeIcon =
    isMuted || volume === 0
      ? VolumeX
      : volume < 0.5
      ? Volume1
      : Volume2;

  return (
    <div className="space-y-6">
      {/* 1. KHUNG TRÌNH PHÁT TRUYỀN HÌNH TRỰC TIẾP */}
      {selectedChannel ? (
        <div ref={playerRef} className="scroll-mt-24 space-y-4">
          {/* HEADER KÊNH ĐANG PHÁT */}
          <div className="relative rounded-2xl sm:rounded-3xl border border-white/15 bg-gradient-to-b from-zinc-900/95 via-zinc-950/98 to-black p-4 sm:p-5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-xl">
            <div className="flex items-center gap-3.5 sm:gap-4 w-full md:w-auto">
              {/* LOGO KÊNH */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-zinc-900 border-2 border-white/20 p-2 flex items-center justify-center shadow-xl flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedChannel.logo}
                  alt={selectedChannel.name}
                  className="w-full h-full object-contain filter drop-shadow-md"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-netflix-red/20 border border-netflix-red/40 text-netflix-red text-[11px] font-black animate-pulse">
                    <Radio className="w-3 h-3" />
                    <span>TRỰC TIẾP</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-gray-300 text-[11px] font-bold">
                    {selectedChannel.category}
                  </span>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black uppercase">
                    <Zap className="w-3 h-3 fill-emerald-400" />
                    <span>{selectedChannel.quality}</span>
                  </span>
                </div>
                <h2 className="text-lg sm:text-2xl font-black text-white">
                  {selectedChannel.name}
                </h2>
              </div>
            </div>

            {/* CỤM NÚT VLC & SAO CHÉP */}
            <div className="flex items-center gap-2 self-end md:self-center">
              <button
                type="button"
                onClick={openInVlc}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-extrabold transition shadow-md shadow-orange-950/40 cursor-pointer"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Mở bằng VLC</span>
              </button>

              <button
                type="button"
                onClick={handleCopy}
                title="Sao chép link stream HLS"
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

          {/* KHUNG PHÁT VIDEO PLAYER */}
          <div
            ref={containerRef}
            className="relative w-full aspect-video bg-black rounded-2xl sm:rounded-3xl overflow-hidden border border-white/15 shadow-2xl group select-none ring-1 ring-white/10"
          >
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              playsInline
              muted={isMuted}
            />

            {/* HUY HIỆU SIGNAL GÓC TRÊN TRÁI */}
            <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex items-center gap-2 z-20 pointer-events-none">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-netflix-red/90 text-white text-[11px] sm:text-xs font-black shadow-lg animate-pulse backdrop-blur-md">
                <Radio className="w-3.5 h-3.5" />
                <span>TV LIVE</span>
              </span>
              <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-emerald-400 text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Độ trễ thấp • Mượt mà</span>
              </span>
            </div>

            {/* NÚT BẬT TIẾNG KHI ĐANG MUTE */}
            {isPlaying && isMuted && !isLoading && !hasError && (
              <div
                onClick={unmuteSound}
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
                <p className="text-xs sm:text-sm font-bold text-gray-200">
                  Đang kết nối tín hiệu truyền hình {selectedChannel.name}...
                </p>
              </div>
            )}

            {/* THÔNG BÁO LỖI KHI MẤT TÍN HIỆU */}
            {hasError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/95 p-4 sm:p-6 text-center z-20">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-3">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <h4 className="text-base sm:text-lg font-bold text-white mb-1">
                  Kênh tạm thời gián đoạn tín hiệu
                </h4>
                <p className="text-xs sm:text-sm text-gray-400 max-w-md mb-5 leading-relaxed">
                  Luồng phát của đài truyền hình có thể đang bảo trì hoặc chuyển đổi đường truyền. Hãy thử tải lại hoặc bấm Mở bằng VLC.
                </p>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setHasError(false);
                      setIsLoading(true);
                      const ch = selectedChannel;
                      setSelectedChannel(null);
                      setTimeout(() => setSelectedChannel(ch), 50);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition border border-white/10 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Thử tải lại</span>
                  </button>
                  <button
                    type="button"
                    onClick={openInVlc}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-xs font-bold text-white transition shadow-md shadow-orange-950/50 cursor-pointer"
                  >
                    <Tv className="w-3.5 h-3.5" />
                    <span>Mở bằng VLC</span>
                  </button>
                </div>
              </div>
            )}

            {/* THANH ĐIỀU KHIỂN DƯỚI ĐÁY */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-3 sm:p-4 flex items-center justify-between z-30">
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (videoRef.current) {
                      if (isPlaying) {
                        videoRef.current.pause();
                        setIsPlaying(false);
                      } else {
                        videoRef.current.play().catch(() => {});
                        setIsPlaying(true);
                      }
                    }
                  }}
                  className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition backdrop-blur-md cursor-pointer"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  )}
                </button>

                <div className="flex items-center gap-2 bg-black/60 px-3 py-2 rounded-full border border-white/20 backdrop-blur-md">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="text-white hover:text-rose-400 transition cursor-pointer p-0.5"
                  >
                    <VolumeIcon
                      className={`w-4 h-4 ${
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
                    className="w-16 sm:w-24 h-1.5 bg-zinc-700 accent-netflix-red rounded-lg appearance-none cursor-pointer"
                  />

                  <span className="text-[10px] sm:text-[11px] font-mono font-bold text-gray-200 min-w-[36px]">
                    {isMuted ? "Tắt tiếng" : `${Math.round(volume * 100)}%`}
                  </span>
                </div>
              </div>

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
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition backdrop-blur-md cursor-pointer border border-white/10 ${
                    isPip
                      ? "bg-netflix-red text-white"
                      : "bg-white/20 hover:bg-white/30 text-white"
                  }`}
                >
                  <PictureInPicture2 className="w-4 h-4" />
                </button>

                {/* Nút Toàn màn hình */}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition backdrop-blur-md cursor-pointer"
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
        </div>
      ) : null}

      {/* 2. DẢI "⭐ KÊNH PHỔ BIẾN / XEM NHIỀU NHẤT" (QUICK ACCESS ROW) */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-gray-300 flex items-center gap-1.5 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Kênh Phổ Biến (Xem nhiều)</span>
          </span>
          <span className="text-[11px] text-gray-500">1-chạm để chuyển kênh</span>
        </div>

        <div className="relative group/popular">
          <button
            type="button"
            onClick={() => scrollPopular("left")}
            className="absolute -left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-zinc-900/95 hover:bg-white text-gray-300 hover:text-black border border-white/20 shadow-lg flex items-center justify-center transition-all opacity-80 hover:opacity-100 backdrop-blur-md cursor-pointer"
            title="Cuộn trái"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <div
            ref={popularScrollRef}
            className="flex items-center gap-2 overflow-x-auto py-1 px-3 scrollbar-none [&::-webkit-scrollbar]:hidden scroll-smooth"
          >
            {popularChannels.map((ch) => {
              const isSelected = selectedChannel?.id === ch.id;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => handleSelectChannel(ch)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all flex-none cursor-pointer ${
                    isSelected
                      ? "bg-netflix-red text-white border-netflix-red shadow-lg shadow-red-950/60 scale-102 font-bold"
                      : "bg-zinc-900/90 text-gray-300 border-white/10 hover:border-white/25 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  <div className="w-5 h-5 rounded-md bg-zinc-950 border border-white/10 p-0.5 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ch.logo}
                      alt={ch.name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  </div>
                  <span className="text-xs whitespace-nowrap">{ch.name.split(" ")[0]}</span>
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded font-black uppercase ${
                      isSelected
                        ? "bg-black/30 text-white"
                        : "bg-emerald-500/15 text-emerald-400"
                    }`}
                  >
                    FHD
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => scrollPopular("right")}
            className="absolute -right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-zinc-900/95 hover:bg-white text-gray-300 hover:text-black border border-white/20 shadow-lg flex items-center justify-center transition-all opacity-80 hover:opacity-100 backdrop-blur-md cursor-pointer"
            title="Cuộn phải"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. DANH MỤC KÊNH & THANH TÌM KIẾM */}
      <div className="space-y-4 pt-2 border-t border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
              <span>Danh mục truyền hình</span>
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-gray-300 font-semibold">
              Hiển thị {Math.min(displayedChannels.length, filteredChannels.length)} / {filteredChannels.length} kênh
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* LỌC NHANH FHD */}
            <button
              type="button"
              onClick={() => setOnlyFhd((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition border shadow-sm cursor-pointer whitespace-nowrap ${
                onlyFhd
                  ? "bg-emerald-600 text-white border-emerald-400 shadow-emerald-950/50 scale-102"
                  : "bg-zinc-900/90 text-gray-300 border-white/10 hover:border-white/20 hover:text-white"
              }`}
            >
              <Zap className="w-3 h-3 fill-current" />
              <span>Chỉ FHD</span>
            </button>

            {/* NÚT CHUYỂN CHẾ ĐỘ XEM: GRID HOẶC LIST */}
            <div className="flex items-center p-1 rounded-xl bg-zinc-900 border border-white/10">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                title="Xem dạng lưới"
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-white text-black shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                title="Xem dạng danh sách gọn"
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === "list"
                    ? "bg-white text-black shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* THANH TÌM KIẾM KÊNH */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên kênh (VTV3, HTV7, THVL...)"
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-netflix-red transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition p-0.5 cursor-pointer"
                  title="Xóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* TABS DANH MỤC TRUYỀN HÌNH (CAROUSEL) */}
        <div className="relative group/carousel">
          <button
            type="button"
            onClick={() => scrollCategories("left")}
            className="absolute -left-2 sm:-left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-zinc-900/90 hover:bg-white text-gray-300 hover:text-black border border-white/20 shadow-xl flex items-center justify-center transition-all opacity-80 hover:opacity-100 backdrop-blur-md cursor-pointer"
            title="Cuộn sang trái"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div
            ref={categoryScrollRef}
            className="flex items-center gap-2 overflow-x-auto py-1 px-4 sm:px-6 scroll-smooth scrollbar-none [&::-webkit-scrollbar]:hidden"
          >
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border shadow-sm cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-white text-black border-white shadow-md font-extrabold scale-102"
                  : "bg-zinc-900/90 text-gray-300 border-white/10 hover:border-white/25 hover:text-white hover:bg-zinc-800"
              }`}
            >
              <span>📺 Tất cả kênh</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  selectedCategory === "all"
                    ? "bg-black text-white"
                    : "bg-white/10 text-gray-300"
                }`}
              >
                {channels.length}
              </span>
            </button>

            {categories.map((cat) => {
              const count = channels.filter((c) => c.category === cat).length;
              const isSelected = selectedCategory === cat;
              const emoji = getCategoryEmoji(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border shadow-sm cursor-pointer ${
                    isSelected
                      ? "bg-sky-600 text-white border-sky-500 shadow-lg shadow-sky-950/50 scale-102"
                      : "bg-zinc-900/90 text-gray-300 border-white/10 hover:border-white/25 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  <span>{emoji}</span>
                  <span>{cat.replace("Kênh ", "")}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      isSelected
                        ? "bg-black/40 text-white"
                        : "bg-white/10 text-gray-300"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => scrollCategories("right")}
            className="absolute -right-2 sm:-right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-zinc-900/90 hover:bg-white text-gray-300 hover:text-black border border-white/20 shadow-xl flex items-center justify-center transition-all opacity-80 hover:opacity-100 backdrop-blur-md cursor-pointer"
            title="Cuộn sang phải"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4. DANH SÁCH KÊNH TRUYỀN HÌNH (GRID HOẶC COMPACT LIST) */}
      {displayedChannels.length > 0 ? (
        <div className="space-y-6">
          {viewMode === "grid" ? (
            /* VIEW MODE: LƯỚI THẺ HIỆN ĐẠI */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {displayedChannels.map((ch) => {
                const isSelected = selectedChannel?.id === ch.id;
                return (
                  <div
                    key={ch.id}
                    onClick={() => handleSelectChannel(ch)}
                    className={`group relative rounded-2xl border p-3.5 cursor-pointer transition-all duration-300 flex flex-col items-center justify-between text-center ${
                      isSelected
                        ? "bg-gradient-to-b from-zinc-900 to-zinc-950 border-sky-500 shadow-xl shadow-sky-950/60 ring-2 ring-sky-500/60 scale-102"
                        : "bg-zinc-900/80 border-white/10 hover:border-white/35 hover:bg-zinc-850 hover:shadow-lg hover:-translate-y-0.5"
                    }`}
                  >
                    {/* HUY HIỆU GÓC TRÊN */}
                    <div className="w-full flex items-center justify-between gap-1 mb-2">
                      <span className="text-[10px] font-bold text-gray-400 truncate max-w-[80px]">
                        {ch.category.replace("Kênh ", "")}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9.5px] font-black uppercase tracking-wider border ${
                          ch.quality.includes("FHD")
                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                            : "bg-sky-500/15 border-sky-500/40 text-sky-400"
                        }`}
                      >
                        {ch.quality.replace(" 1080p", "").replace(" 720p", "")}
                      </span>
                    </div>

                    {/* LOGO KÊNH */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-zinc-950 border border-white/10 p-2 flex items-center justify-center my-1.5 shadow-inner group-hover:scale-105 transition-transform overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={ch.logo}
                        alt={ch.name}
                        className="w-full h-full object-contain filter drop-shadow-md"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    </div>

                    {/* TÊN KÊNH */}
                    <h3 className="text-xs sm:text-sm font-extrabold text-white group-hover:text-sky-400 transition line-clamp-1 mt-1 leading-snug w-full">
                      {ch.name}
                    </h3>
                  </div>
                );
              })}
            </div>
          ) : (
            /* VIEW MODE: DANH SÁCH GỌN (COMPACT LIST) */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {displayedChannels.map((ch) => {
                const isSelected = selectedChannel?.id === ch.id;
                return (
                  <div
                    key={ch.id}
                    onClick={() => handleSelectChannel(ch)}
                    className={`group rounded-xl border p-2.5 cursor-pointer transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-zinc-850 border-sky-500 shadow-md ring-1 ring-sky-500/60"
                        : "bg-zinc-900/80 border-white/10 hover:border-white/25 hover:bg-zinc-850"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-white/10 p-1.5 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={ch.logo}
                          alt={ch.name}
                          className="w-full h-full object-contain"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white group-hover:text-sky-300 truncate">
                          {ch.name}
                        </h4>
                        <span className="text-[10px] text-gray-400">
                          {ch.category.replace("Kênh ", "")}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[9.5px] px-2 py-0.5 rounded font-black uppercase flex-shrink-0 border ${
                        ch.quality.includes("FHD")
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                          : "bg-sky-500/15 border-sky-500/40 text-sky-400"
                      }`}
                    >
                      {ch.quality.replace(" 1080p", "").replace(" 720p", "")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* NÚT XEM THÊM KÊNH (PAGINATION LOAD MORE CHỐNG NGỢP) */}
          {filteredChannels.length > visibleCount && (
            <div className="flex flex-col items-center justify-center pt-4 pb-2 space-y-2">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + INITIAL_PAGE_SIZE)}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-black text-xs sm:text-sm border border-white/20 hover:border-white/40 shadow-xl transition-all hover:scale-102 active:scale-98 cursor-pointer"
              >
                <span>Xem thêm các kênh khác</span>
                <span className="px-2 py-0.5 rounded-full bg-white/15 text-[11px] text-gray-200">
                  +{Math.min(INITIAL_PAGE_SIZE, filteredChannels.length - visibleCount)} kênh
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>
              <span className="text-[11px] text-gray-400">
                Còn lại {filteredChannels.length - visibleCount} kênh truyền hình
              </span>
            </div>
          )}

          {/* Nút thu gọn nếu đã xem nhiều */}
          {visibleCount > INITIAL_PAGE_SIZE && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setVisibleCount(INITIAL_PAGE_SIZE);
                  if (playerRef.current) {
                    playerRef.current.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                className="text-xs text-gray-400 hover:text-white transition underline cursor-pointer"
              >
                Thu gọn danh sách về 24 kênh đầu ↑
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-zinc-900/50 p-12 text-center text-gray-400 space-y-3">
          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-400">
            <Search className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-gray-300">
            Không tìm thấy kênh truyền hình nào phù hợp với bộ lọc.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition shadow-lg shadow-sky-950/50 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Xóa bộ lọc để xem tất cả {channels.length} kênh</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default LiveTvClient;
