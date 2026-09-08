"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
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
} from "lucide-react";
import { LiveTvData, TvChannel } from "@/services/liveTvService";
import { useSearchParams } from "next/navigation";

interface LiveTvClientProps {
  initialData: LiveTvData;
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

  // Video Player States
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState<number>(0.9);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [copied, setCopied] = useState(false);

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
    const savedId = typeof window !== "undefined" ? localStorage.getItem("nanaflix_live_channel_id") : null;
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

    if (!selectedChannel) {
      setSelectedChannel(defaultChannel);
    }
  }, [channels, searchParams, defaultChannel]);

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

  // Chọn kênh và cuộn lên + lưu localStorage & URL
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

  // Khởi tạo luồng phát HLS — luôn đi qua proxy /api/live-tv/proxy để tránh CORS & IP block của CDN trên Vercel
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedChannel?.url) return;

    setIsLoading(true);
    setHasError(false);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Luôn dùng proxy Live TV (có Referer đúng theo domain CDN) thay vì direct để tránh bị block trên Vercel
    const proxyUrl = `/api/live-tv/proxy?url=${encodeURIComponent(selectedChannel.url)}`;
    const primaryUrl = proxyUrl;
    // Fallback: thử trực tiếp nếu proxy cũng lỗi (ví dụ khi test local)
    const fallbackUrl = selectedChannel.url;
    let hasTriedFallback = false;

    const startHls = (sourceUrl: string) => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 30,
          manifestLoadingTimeOut: 15000,
          levelLoadingTimeOut: 15000,
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
          video.volume = volume;
          video.muted = isMuted;

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
            if (!hasTriedFallback && fallbackUrl && fallbackUrl !== sourceUrl) {
              hasTriedFallback = true;
              startHls(fallbackUrl);
              return;
            }
            setIsLoading(false);
            setHasError(true);
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = sourceUrl;
        video.volume = volume;
        video.muted = isMuted;

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
  const unmuteSound = () => {
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
  };

  const toggleMute = () => {
    if (isMuted) {
      unmuteSound();
    } else {
      setIsMuted(true);
      if (videoRef.current) videoRef.current.muted = true;
    }
  };

  const handleVolumeChange = (newVol: number) => {
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

  const VolumeIcon =
    isMuted || volume === 0
      ? VolumeX
      : volume < 0.5
      ? Volume1
      : Volume2;

  return (
    <div className="space-y-8">
      {/* 1. KHUNG TRÌNH PHÁT TRUYỀN HÌNH TRỰC TIẾP */}
      {selectedChannel ? (
        <div ref={playerRef} className="scroll-mt-24 space-y-4">
          {/* HEADER KÊNH ĐANG PHÁT */}
          <div className="relative rounded-2xl sm:rounded-3xl border border-white/15 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black p-4 sm:p-5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
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
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-netflix-red/20 border border-netflix-red/40 text-netflix-red text-[11px] font-black animate-pulse">
                    <Radio className="w-3 h-3" />
                    <span>TRỰC TIẾP</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-gray-300 text-[11px] font-bold">
                    {selectedChannel.category}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black uppercase">
                    {selectedChannel.quality}
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
            className="relative w-full aspect-video bg-black rounded-2xl sm:rounded-3xl overflow-hidden border border-white/15 shadow-2xl group select-none"
          >
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              playsInline
              muted={isMuted}
            />

            {/* NÚT BẬT TIẾNG KHI ĐANG MUTE */}
            {isPlaying && isMuted && !isLoading && !hasError && (
              <div
                onClick={unmuteSound}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 animate-bounce cursor-pointer"
              >
                <button
                  type="button"
                  className="flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs sm:text-sm font-black shadow-2xl border-2 border-white/40 backdrop-blur-md transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
                  <span>🔊 BẬT ÂM THANH ({Math.round(volume * 100)}%)</span>
                </button>
              </div>
            )}

            {/* LOADING SPINNER */}
            {isLoading && !hasError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm z-20 pointer-events-none">
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
                  Luồng phát của đài truyền hình có thể đang bảo trì hoặc chuyển đổi đường truyền. Hãy thử kênh khác hoặc bấm Mở bằng VLC.
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
      ) : null}

      {/* 2. DANH MỤC KÊNH & Ô TÌM KIẾM */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <span>Danh sách kênh truyền hình</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-gray-300 font-normal">
              {filteredChannels.length} kênh
            </span>
          </h2>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* LỌC NHANH FHD */}
            <button
              type="button"
              onClick={() => setOnlyFhd((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition border shadow-sm cursor-pointer whitespace-nowrap ${
                onlyFhd
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400 shadow-emerald-950/50 scale-105"
                  : "bg-zinc-900/90 text-gray-300 border-white/10 hover:border-white/20 hover:text-white"
              }`}
            >
              <span>⚡</span>
              <span>Chỉ kênh FHD 1080p</span>
            </button>

            {/* THANH TÌM KIẾM KÊNH */}
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên kênh (VTV3, HTV7, THVL...)"
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-netflix-red transition"
              />
            </div>
          </div>
        </div>

        {/* TABS DANH MỤC TRUYỀN HÌNH */}
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
            className="flex items-center gap-2 overflow-x-auto py-1.5 px-4 sm:px-6 scroll-smooth scrollbar-none [&::-webkit-scrollbar]:hidden"
          >
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border shadow-sm ${
                selectedCategory === "all"
                  ? "bg-white text-black border-white shadow-md font-extrabold scale-105"
                  : "bg-zinc-900/90 text-gray-300 border-white/10 hover:border-white/25 hover:text-white hover:bg-zinc-800"
              }`}
            >
              <span>📺 Tất cả kênh</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
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
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border shadow-sm ${
                    isSelected
                      ? "bg-netflix-red text-white border-netflix-red shadow-lg shadow-red-950/50 scale-105"
                      : "bg-zinc-900/90 text-gray-300 border-white/10 hover:border-white/25 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
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

      {/* 3. LƯỚI DANH SÁCH KÊNH TRUYỀN HÌNH (CHANNEL GRID) */}
      {filteredChannels.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {filteredChannels.map((ch) => {
            const isSelected = selectedChannel?.id === ch.id;
            return (
              <div
                key={ch.id}
                onClick={() => handleSelectChannel(ch)}
                className={`group relative rounded-2xl border p-3.5 cursor-pointer transition-all duration-300 flex flex-col items-center justify-between text-center ${
                  isSelected
                    ? "bg-gradient-to-b from-zinc-900 to-zinc-950 border-netflix-red shadow-xl shadow-red-950/60 ring-2 ring-netflix-red/60 scale-[1.03]"
                    : "bg-zinc-900/80 border-white/10 hover:border-white/35 hover:bg-zinc-850 hover:shadow-lg hover:-translate-y-1"
                }`}
              >
                {/* HUY HIỆU FHD GÓC TRÊN */}
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
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-zinc-950 border border-white/10 p-2 flex items-center justify-center my-2 shadow-inner group-hover:scale-105 transition-transform overflow-hidden">
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
                <h3 className="text-xs sm:text-sm font-extrabold text-white group-hover:text-rose-400 transition line-clamp-1 mt-1 leading-snug w-full">
                  {ch.name}
                </h3>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-zinc-900/50 p-12 text-center text-gray-400">
          Không tìm thấy kênh truyền hình nào phù hợp với bộ lọc.
        </div>
      )}
    </div>
  );
}

export default LiveTvClient;
