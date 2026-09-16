"use client";

import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
} from "react";
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
  isActive?: boolean;
}

const INITIAL_PAGE_SIZE = 24;

function getCategoryEmoji(category: string): string {
  if (category.includes("VTV") && !category.includes("VTVcab")) return "🇻🇳";
  if (category.includes("HTV")) return "🏙️";
  if (category.includes("SCTV")) return "⭐";
  if (category.includes("VTVcab")) return "📺";
  if (category.includes("Vĩnh Long") || category.includes("THVL")) return "🌾";
  if (
    category.includes("Tin Tức") ||
    category.includes("Thời Sự") ||
    category.includes("VTC")
  )
    return "📰";
  if (category.includes("Phim") || category.includes("Cinema")) return "🎬";
  if (category.includes("Địa Phương")) return "📍";
  if (category.includes("Quốc Tế")) return "🌍";
  if (category.includes("Thiếu Nhi")) return "🎈";
  if (category.includes("Âm Nhạc")) return "🎵";
  return "📺";
}

function TvChannelLogo({
  logo,
  name,
}: {
  logo: string;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const [error, setError] = useState(false);

  // Nếu có logo URL và chưa bị lỗi → hiển thị ảnh trực tiếp từ nguồn
  if (logo && !error) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo}
        alt={name}
        className="w-full h-full object-contain filter drop-shadow-md transition-transform duration-200 group-hover:scale-105"
        loading="lazy"
        decoding="async"
        onError={() => setError(true)}
      />
    );
  }

  // Fallback: Badge chữ đơn giản khi không có logo hoặc ảnh lỗi
  const words = name
    .toUpperCase()
    .split(/[\s\-_]+/)
    .filter(Boolean);
  const code = words.slice(0, 2).join(" ").slice(0, 7);
  const sub = words.length > 2 ? words[2].slice(0, 4) : "";

  return (
    <div className="w-full h-full rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950 border border-white/10 flex flex-col items-center justify-center text-white select-none overflow-hidden gap-0.5 p-1">
      <span className="text-[11px] sm:text-xs font-black tracking-tight text-white leading-none font-mono line-clamp-1 text-center w-full px-0.5">
        {code}
      </span>
      {sub && (
        <span className="text-[8px] font-bold text-white/70 leading-none truncate">
          {sub}
        </span>
      )}
    </div>
  );
}

// Bouncing equalizer bars for live channel
function PlayingEqualizer() {
  return (
    <div className="flex items-end gap-0.5 h-3 px-1">
      <span className="w-0.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s] h-3" />
      <span className="w-0.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s] h-2" />
      <span className="w-0.5 bg-emerald-400 rounded-full animate-bounce h-3" />
    </div>
  );
}

export function LiveTvClient({
  initialData,
  isActive = true,
}: LiveTvClientProps) {
  const { categories, channels } = initialData;
  const searchParams = useSearchParams();

  const defaultChannel = useMemo(() => {
    return (
      channels.find((c) => c.name.includes("VTV3")) ||
      channels.find((c) => c.name.includes("VTV1")) ||
      channels.find((c) => c.name.includes("HTV7")) ||
      channels[0] ||
      null
    );
  }, [channels]);

  const [selectedChannel, setSelectedChannel] = useState<TvChannel | null>(
    () => {
      if (typeof window !== "undefined") {
        try {
          const channelParam = new URLSearchParams(window.location.search).get(
            "channel",
          );
          const savedId = localStorage.getItem("nanaflix_live_channel_id");
          const target = channelParam || savedId;
          if (target) {
            const found = channels.find(
              (c) =>
                c.id === target ||
                c.name.toLowerCase() === target.toLowerCase() ||
                c.name.toLowerCase().includes(target.toLowerCase()),
            );
            if (found) return found;
          }
        } catch {}
      }
      return defaultChannel;
    },
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
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const actionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userPausedRef = useRef<boolean>(false);
  const lastLoadedUrlRef = useRef<string>("");
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState<number>(0.9);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPip, setIsPip] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showChannelRail, setShowChannelRail] = useState(false);
  const activeTvChannelRef = useRef<HTMLButtonElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    icon: "play" | "pause" | "volume" | "mute" | "channel" | "seek";
    text?: string;
  } | null>(null);

  useEffect(() => {
    if (showChannelRail && activeTvChannelRef.current) {
      activeTvChannelRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [showChannelRail, selectedChannel?.id]);

  const volumeRef = useRef(volume);
  const isMutedRef = useRef(isMuted);
  const userMutedRef = useRef<boolean>(false);

  const getStreamUrl = (url: string) => {
    if (!url) return "";
    let cleanUrl = url.trim();
    // Nâng cấp http sang https nếu domain hỗ trợ HTTPS
    if (
      cleanUrl.startsWith("http://") &&
      /fptplay|akamaized|cloudfront|vtv|cdn|vietnam|vnns/i.test(cleanUrl)
    ) {
      cleanUrl = cleanUrl.replace(/^http:\/\//i, "https://");
    }

    // Nếu là HTTPS -> phát trực tiếp từ trình duyệt để tối ưu độ trễ và tránh bị Vercel Proxy 403
    if (cleanUrl.startsWith("https://")) {
      return cleanUrl;
    }

    // Nếu là link HTTP thuần trên trang HTTPS -> Bắt buộc bọc qua Proxy để tránh Mixed Content
    if (cleanUrl.startsWith("http://")) {
      return `/api/live-tv/proxy?url=${encodeURIComponent(cleanUrl)}`;
    }
    return cleanUrl;
  };

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Hiển thị visual feedback overlay tạm thời
  const triggerActionFeedback = useCallback(
    (
      icon: "play" | "pause" | "volume" | "mute" | "channel" | "seek",
      text?: string,
    ) => {
      if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
      setActionFeedback({ icon, text });
      actionTimeoutRef.current = setTimeout(() => {
        setActionFeedback(null);
      }, 700);
    },
    [],
  );

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
          lower.includes("htv7") ||
          lower.includes("htv9") ||
          lower.includes("sctv1") ||
          lower.includes("thvl1") ||
          lower.includes("thvl2") ||
          lower.includes("qpvn") ||
          lower.includes("antv") ||
          lower.includes("hbo") ||
          lower.includes("cinemax")
        );
      })
      .slice(0, 12);
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
          c.name.toLowerCase().includes(target.toLowerCase()),
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

  const handleSelectChannel = useCallback(
    (channel: TvChannel, keepRailOpen = false) => {
      userPausedRef.current = false;
      if (!userMutedRef.current) {
        setIsMuted(false);
        isMutedRef.current = false;
      }
      setSelectedChannel(channel);
      if (!keepRailOpen) {
        setShowChannelRail(false);
      }
      triggerActionFeedback("channel", channel.name);
      try {
        localStorage.setItem("nanaflix_live_channel_id", channel.id);
        const url = new URL(window.location.href);
        url.searchParams.set("tab", "tv");
        url.searchParams.set("channel", channel.id);
        window.history.replaceState(null, "", url.toString());
      } catch {}

      if (playerRef.current) {
        const topOffset =
          playerRef.current.getBoundingClientRect().top +
          window.scrollY -
          80;
        window.scrollTo({ top: Math.max(0, topOffset), behavior: "smooth" });
      }
    },
    [triggerActionFeedback],
  );

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

  // Tự động ẩn controls sau 3.5s
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

  // Đồng bộ trạng thái tab (khi chuyển tab Bóng Đá <-> TV)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!isActive) {
      video.pause();
      setIsPlaying(false);
      if (hlsRef.current) {
        hlsRef.current.stopLoad();
      }
      if (
        typeof document !== "undefined" &&
        document.pictureInPictureElement === video
      ) {
        document.exitPictureInPicture().catch(() => {});
        setIsPip(false);
      }
    } else {
      if (hlsRef.current) {
        hlsRef.current.startLoad();
      }
      if (!userPausedRef.current) {
        video
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {});
      }
    }
  }, [isActive]);

  // Khởi tạo luồng phát HLS với Proxy + Auto-Fallback + Low Latency Engine
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedChannel?.url) return;

    const primaryUrl = getStreamUrl(selectedChannel.url);

    if (primaryUrl === lastLoadedUrlRef.current && hlsRef.current) {
      return;
    }

    lastLoadedUrlRef.current = primaryUrl;
    setIsLoading(true);
    setHasError(false);
    setErrorMessage("");

    const channelWithFallback = selectedChannel as TvChannel & {
      fallback_url?: string;
      fallbackUrl?: string;
    };
    const fallbackUrl =
      channelWithFallback.fallback_url || channelWithFallback.fallbackUrl;
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
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          maxBufferSize: 60 * 1000 * 1000,
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 8,
          backBufferLength: 30,
          manifestLoadingTimeOut: 10000,
          levelLoadingTimeOut: 10000,
          fragLoadingTimeOut: 10000,
          fragLoadingMaxRetry: 4,
          levelLoadingMaxRetry: 4,
          manifestLoadingMaxRetry: 4,
          capLevelToPlayerSize: false,
          xhrSetup: (xhr) => {
            xhr.withCredentials = false;
          },
        });

        hlsRef.current = hls;
        hls.loadSource(sourceUrl);
        hls.attachMedia(video);
        loadTimeoutRef.current = setTimeout(() => {
          if (hlsRef.current !== hls) return;
          if (!hasTriedFallback && fallbackUrl && fallbackUrl !== sourceUrl) {
            hasTriedFallback = true;
            startHls(getStreamUrl(fallbackUrl));
            return;
          }
          hls.destroy();
          hlsRef.current = null;
          setIsLoading(false);
          setHasError(true);
          setErrorMessage(
            "Kênh chưa phát hoặc không phản hồi sau 12 giây. Hãy thử đổi kênh khác.",
          );
        }, 12000);

        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
          if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
          if (data.levels && data.levels.length > 0) {
            let highestIdx = 0;
            let maxScore = 0;
            data.levels.forEach((lvl, idx) => {
              const score = (lvl.height || 0) * 1000000 + (lvl.bitrate || 0);
              if (score > maxScore) {
                maxScore = score;
                highestIdx = idx;
              }
            });
            hls.currentLevel = highestIdx;
            hls.loadLevel = highestIdx;
            hls.nextLevel = highestIdx;
          }
          setIsLoading(false);
          setHasError(false);
          video.volume = volumeRef.current || 0.9;
          const shouldBeMuted = userMutedRef.current;
          video.muted = shouldBeMuted;

          if (isActive && !userPausedRef.current) {
            video
              .play()
              .then(() => {
                setIsPlaying(true);
                setIsMuted(video.muted || video.volume === 0);
              })
              .catch(() => {
                video.muted = true;
                setIsMuted(true);
                video
                  .play()
                  .then(() => {
                    setIsPlaying(true);
                    setIsMuted(true);
                  })
                  .catch(() => {});
              });
          }
        });

        let hasTriedProxy = sourceUrl.includes("/api/live-tv/proxy");

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              if (!hasTriedProxy && sourceUrl.startsWith("https://")) {
                hasTriedProxy = true;
                startHls(`/api/live-tv/proxy?url=${encodeURIComponent(sourceUrl)}`);
                return;
              }
              if (
                !hasTriedFallback &&
                fallbackUrl &&
                fallbackUrl !== sourceUrl
              ) {
                hasTriedFallback = true;
                startHls(getStreamUrl(fallbackUrl));
                return;
              }
              hls.startLoad();
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError();
            } else {
              if (
                !hasTriedFallback &&
                fallbackUrl &&
                fallbackUrl !== sourceUrl
              ) {
                hasTriedFallback = true;
                startHls(getStreamUrl(fallbackUrl));
                return;
              }
              setIsLoading(false);
              setHasError(true);
              setErrorMessage(
                "Luồng truyền hình đang gián đoạn. Hãy thử đổi kênh khác.",
              );
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
          if (isActive && !userPausedRef.current) {
            video
              .play()
              .then(() => setIsPlaying(true))
              .catch(() => {});
          }
        });
        video.addEventListener("error", () => {
          if (!hasTriedFallback && fallbackUrl && fallbackUrl !== sourceUrl) {
            hasTriedFallback = true;
            video.src = getStreamUrl(fallbackUrl);
            return;
          }
          setIsLoading(false);
          setHasError(true);
          setErrorMessage(
            "Không thể tải luồng trên trình duyệt này. Hãy thử đổi kênh khác.",
          );
        });
      }
    };

    startHls(primaryUrl);

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [selectedChannel, isActive]);

  // Điều khiển Play / Pause
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      userPausedRef.current = true;
      videoRef.current.pause();
      setIsPlaying(false);
      setShowControls(true);
      triggerActionFeedback("pause");
    } else {
      userPausedRef.current = false;
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
      triggerActionFeedback("play");
      resetControlsTimeout();
    }
  }, [isPlaying, resetControlsTimeout, triggerActionFeedback]);

  // Volume & Sound Helpers
  const unmuteSound = useCallback(() => {
    userMutedRef.current = false;
    const targetVol = volume > 0 ? volume : 0.9;
    setVolume(targetVol);
    setIsMuted(false);
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.volume = targetVol;
      if (!userPausedRef.current && isActive) {
        videoRef.current.play().catch(() => {});
      }
    }
    triggerActionFeedback("volume", `${Math.round(targetVol * 100)}%`);
    try {
      localStorage.setItem("nanaflix_live_volume", String(targetVol));
    } catch {}
  }, [volume, isActive, triggerActionFeedback]);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      unmuteSound();
    } else {
      userMutedRef.current = true;
      setIsMuted(true);
      if (videoRef.current) videoRef.current.muted = true;
      triggerActionFeedback("mute", "Tắt tiếng");
    }
  }, [isMuted, unmuteSound, triggerActionFeedback]);

  const handleVolumeChange = useCallback(
    (newVol: number) => {
      const clamped = Math.max(0, Math.min(1, newVol));
      setVolume(clamped);
      const shouldMute = clamped === 0;
      userMutedRef.current = shouldMute;
      setIsMuted(shouldMute);
      if (videoRef.current) {
        videoRef.current.volume = clamped;
        videoRef.current.muted = shouldMute;
      }
      triggerActionFeedback(
        shouldMute ? "mute" : "volume",
        shouldMute ? "Tắt tiếng" : `${Math.round(clamped * 100)}%`,
      );
      try {
        localStorage.setItem("nanaflix_live_volume", String(clamped));
      } catch {}
    },
    [triggerActionFeedback],
  );

  // Khóa hướng màn hình xoay ngang tự động trên thiết bị di động khi phóng to
  const lockLandscape = useCallback(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ori = (screen?.orientation || (screen as any)?.mozOrientation || (screen as any)?.msOrientation) as any;
      if (ori && typeof ori.lock === "function") {
        await ori.lock("landscape").catch(() => {
          return ori.lock("landscape-primary").catch(() => {});
        });
      }
    } catch {}
  }, []);

  // Mở khóa xoay màn hình tự do khi thoát toàn màn hình
  const unlockOrientation = useCallback(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ori = (screen?.orientation || (screen as any)?.mozOrientation || (screen as any)?.msOrientation) as any;
      if (ori && typeof ori.unlock === "function") {
        ori.unlock();
      }
    } catch {}
  }, []);

  // Toàn màn hình hỗ trợ đa nền tảng (Desktop, Android, iOS Safari)
  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    const video = videoRef.current;

    // Kiểm tra trạng thái fullscreen hiện tại
    const isDocFs = Boolean(
      document.fullscreenElement ||
      (document as unknown as { webkitFullscreenElement?: Element })
        .webkitFullscreenElement ||
      (document as unknown as { mozFullScreenElement?: Element })
        .mozFullScreenElement ||
      (document as unknown as { msFullscreenElement?: Element })
        .msFullscreenElement,
    );

    // Kiểm tra trạng thái fullscreen riêng của iOS Safari trên video element
    const isVideoFs = Boolean(
      video &&
      (video as unknown as { webkitDisplayingFullscreen?: boolean })
        .webkitDisplayingFullscreen,
    );

    if (isDocFs || isVideoFs || isFullscreen) {
      // Thoát toàn màn hình
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (
        (document as unknown as { webkitExitFullscreen?: () => void })
          .webkitExitFullscreen
      ) {
        (
          document as unknown as { webkitExitFullscreen: () => void }
        ).webkitExitFullscreen();
      } else if (
        (document as unknown as { mozCancelFullScreen?: () => void })
          .mozCancelFullScreen
      ) {
        (
          document as unknown as { mozCancelFullScreen: () => void }
        ).mozCancelFullScreen();
      } else if (
        (document as unknown as { msExitFullscreen?: () => void })
          .msExitFullscreen
      ) {
        (
          document as unknown as { msExitFullscreen: () => void }
        ).msExitFullscreen();
      }
      setIsFullscreen(false);
      unlockOrientation();
    } else {
      // Bật toàn màn hình
      if (container && container.requestFullscreen) {
        // Thử bật fullscreen với navigationUI ẩn để giảm thiểu thanh điều hướng trình duyệt
        const p = container.requestFullscreen({ navigationUI: "hide" } as FullscreenOptions).catch(() => {
          return container.requestFullscreen().catch(() => {
            // Fallback cho iOS Safari
            if (
              video &&
              (video as unknown as { webkitEnterFullscreen?: () => void })
                .webkitEnterFullscreen
            ) {
              (
                video as unknown as { webkitEnterFullscreen: () => void }
              ).webkitEnterFullscreen();
            }
          });
        });

        if (p && typeof p.then === "function") {
          p.then(lockLandscape).catch(() => {});
        } else {
          lockLandscape();
        }
      } else if (
        container &&
        (container as unknown as { webkitRequestFullscreen?: () => void })
          .webkitRequestFullscreen
      ) {
        (
          container as unknown as { webkitRequestFullscreen: () => void }
        ).webkitRequestFullscreen();
        lockLandscape();
      } else if (
        container &&
        (container as unknown as { mozRequestFullScreen?: () => void })
          .mozRequestFullScreen
      ) {
        (
          container as unknown as { mozRequestFullScreen: () => void }
        ).mozRequestFullScreen();
        lockLandscape();
      } else if (
        container &&
        (container as unknown as { msRequestFullscreen?: () => void })
          .msRequestFullscreen
      ) {
        (
          container as unknown as { msRequestFullscreen: () => void }
        ).msRequestFullscreen();
        lockLandscape();
      } else if (
        video &&
        (video as unknown as { webkitEnterFullscreen?: () => void })
          .webkitEnterFullscreen
      ) {
        // iOS Safari trên iPhone bắt buộc dùng webkitEnterFullscreen trên video element
        (
          video as unknown as { webkitEnterFullscreen: () => void }
        ).webkitEnterFullscreen();
      }
      setIsFullscreen(true);
    }
  }, [isFullscreen, lockLandscape, unlockOrientation]);

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

  useEffect(() => {
    const handleFsChange = () => {
      const isFs = Boolean(
        document.fullscreenElement ||
        (document as unknown as { webkitFullscreenElement?: Element })
          .webkitFullscreenElement ||
        (document as unknown as { mozFullScreenElement?: Element })
          .mozFullScreenElement ||
        (document as unknown as { msFullscreenElement?: Element })
          .msFullscreenElement,
      );
      setIsFullscreen(isFs);
      if (isFs) {
        lockLandscape();
      } else {
        unlockOrientation();
      }
    };

    const video = videoRef.current;
    const handleVideoBeginFs = () => {
      setIsFullscreen(true);
      lockLandscape();
    };
    const handleVideoEndFs = () => {
      setIsFullscreen(false);
      unlockOrientation();
    };

    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    document.addEventListener("mozfullscreenchange", handleFsChange);
    document.addEventListener("MSFullscreenChange", handleFsChange);

    if (video) {
      video.addEventListener("webkitbeginfullscreen", handleVideoBeginFs);
      video.addEventListener("webkitendfullscreen", handleVideoEndFs);
    }

    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
      document.removeEventListener("mozfullscreenchange", handleFsChange);
      document.removeEventListener("MSFullscreenChange", handleFsChange);
      if (video) {
        video.removeEventListener("webkitbeginfullscreen", handleVideoBeginFs);
        video.removeEventListener("webkitendfullscreen", handleVideoEndFs);
      }
    };
  }, [lockLandscape, unlockOrientation]);

  // Chuyển kênh bằng phím mũi tên Trái / Phải hoặc nút trên Player
  const handleSwitchChannel = useCallback(
    (direction: "next" | "prev") => {
      const activeList =
        filteredChannels.length > 0 ? filteredChannels : channels;
      if (activeList.length <= 1 || !selectedChannel) return;

      const currentIdx = activeList.findIndex(
        (c) =>
          c.id === selectedChannel.id ||
          c.name.toLowerCase() === selectedChannel.name.toLowerCase(),
      );

      let targetIdx = 0;
      if (currentIdx !== -1) {
        targetIdx =
          direction === "next"
            ? (currentIdx + 1) % activeList.length
            : (currentIdx - 1 + activeList.length) % activeList.length;
      }

      handleSelectChannel(activeList[targetIdx]);
    },
    [filteredChannels, channels, selectedChannel, handleSelectChannel],
  );

  // Tua thời gian (Seek ±5s)
  const handleSeek = useCallback(
    (seconds: number) => {
      const video = videoRef.current;
      if (!video) return;
      try {
        const newTime = Math.max(0, video.currentTime + seconds);
        video.currentTime = newTime;
        triggerActionFeedback(
          "seek",
          seconds > 0 ? `+${seconds}s ⏩` : `${seconds}s ⏪`,
        );
      } catch (err) {
        console.warn("Seek error:", err);
      }
    },
    [triggerActionFeedback],
  );

  // Keyboard Shortcuts (chỉ kích hoạt khi Tab Truyền hình đang active)
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        ["input", "textarea"].includes(
          (e.target as HTMLElement)?.tagName?.toLowerCase(),
        )
      ) {
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
        handleSwitchChannel("prev");
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        handleSwitchChannel("next");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleSeek(5);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleSeek(-5);
      } else if (e.key === "[" || e.key === "-") {
        e.preventDefault();
        handleVolumeChange(volume - 0.1);
      } else if (e.key === "]" || e.key === "=" || e.key === "+") {
        e.preventDefault();
        handleVolumeChange(volume + 0.1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isActive,
    isPlaying,
    togglePlay,
    toggleMute,
    toggleFullscreen,
    togglePip,
    handleVolumeChange,
    handleSwitchChannel,
    handleSeek,
    volume,
  ]);

  const handleCopy = () => {
    if (selectedChannel && typeof navigator !== "undefined") {
      navigator.clipboard.writeText(selectedChannel.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleResetFilters = () => {
    setSelectedCategory("all");
    setSearchQuery("");
    setOnlyFhd(false);
  };

  const hasActiveFilters =
    selectedCategory !== "all" || searchQuery.trim() !== "" || onlyFhd;

  const VolumeIcon =
    isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className="space-y-6">
      {/* 1. KHUNG TRÌNH PHÁT TRUYỀN HÌNH TRỰC TIẾP */}
      {selectedChannel ? (
        <div ref={playerRef} className="scroll-mt-24 space-y-4">
          {/* HEADER KÊNH ĐANG PHÁT */}
          <div className="keep-dark-cinema relative rounded-2xl sm:rounded-3xl border border-white/15 bg-gradient-to-b from-zinc-900/95 via-zinc-950/98 to-black p-3 sm:p-4 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-3 backdrop-blur-xl">
            <div className="flex items-center gap-3 sm:gap-3.5 w-full md:w-auto">
              {/* LOGO KÊNH */}
              <div className="w-16 h-11 sm:w-20 sm:h-13 rounded-xl bg-zinc-900/90 border-2 border-white/20 p-1.5 flex items-center justify-center shadow-xl flex-shrink-0 overflow-hidden">
                <TvChannelLogo
                  logo={selectedChannel.logo}
                  name={selectedChannel.name}
                />
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-netflix-red/20 border border-netflix-red/40 text-netflix-red text-[10px] font-black animate-pulse">
                    <Radio className="w-2.5 h-2.5" />
                    <span>TRỰC TIẾP</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-gray-300 text-[10px] font-bold">
                    {selectedChannel.category}
                  </span>
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[9.5px] font-black uppercase">
                    <Zap className="w-2.5 h-2.5 fill-emerald-400" />
                    <span>{selectedChannel.quality}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <h2
                    className="text-base sm:text-xl font-black text-white keep-white"
                    style={{ color: "#ffffff" }}
                  >
                    {selectedChannel.name}
                  </h2>
                  {isPlaying && <PlayingEqualizer />}
                </div>
              </div>
            </div>

            {/* CỤM NÚT SAO CHÉP */}
            <div className="flex items-center gap-2 self-end md:self-center">
              <button
                type="button"
                onClick={handleCopy}
                title="Sao chép link stream HLS"
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition border border-white/10 cursor-pointer"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* KHUNG PHÁT VIDEO PLAYER */}
          <div
            ref={containerRef}
            onMouseMove={resetControlsTimeout}
            onClick={() => {
              // Trên màn hình cảm ứng & web: Nếu controls đang ẩn -> chạm để HIỆN lại controls, KHÔNG pause video!
              if (!showControls) {
                setShowControls(true);
                resetControlsTimeout();
                return;
              }
              // Nếu controls đang hiện và bấm vào nền video trống -> ẩn controls
              setShowControls(false);
            }}
            onDoubleClick={toggleFullscreen}
            className={`relative w-full aspect-video lg:max-h-[calc(100vh-210px)] lg:max-w-[calc((100vh-210px)*16/9)] mx-auto bg-black rounded-2xl sm:rounded-3xl overflow-hidden border border-white/15 shadow-2xl group select-none ring-1 ring-white/10 ${
              showControls ? "cursor-default" : "cursor-none"
            }`}
          >
            <video
              ref={videoRef}
              className="w-full h-full object-contain pointer-events-none"
              playsInline
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onVolumeChange={(e) => {
                const v = e.currentTarget;
                const isActuallyMuted = v.muted || v.volume === 0;
                setIsMuted(isActuallyMuted);
                if (!isActuallyMuted) {
                  setVolume(v.volume);
                  try {
                    localStorage.setItem(
                      "nanaflix_live_volume",
                      String(v.volume),
                    );
                  } catch {}
                }
              }}
            />

            {/* HUY HIỆU SIGNAL GÓC TRÊN TRÁI (TỰ ĐỘNG ẨN KHI KHÔNG TƯƠNG TÁC) */}
            <div
              className={`absolute top-3 left-3 sm:top-4 sm:left-4 flex items-center gap-2 z-20 pointer-events-none transition-opacity duration-300 ${
                showControls ? "opacity-100" : "opacity-0"
              }`}
            >
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-netflix-red/90 text-white text-[11px] sm:text-xs font-black shadow-lg animate-pulse backdrop-blur-md">
                <Radio className="w-3.5 h-3.5" />
                <span>NANA TV LIVE</span>
              </span>
              <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-emerald-400 text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Độ trễ thấp • Mượt mà</span>
              </span>
            </div>

            {/* BACKDROP KHI MỞ DRAWER KÊNH TRÊN MOBILE */}
            {showChannelRail && (
              <div
                className="fixed inset-0 sm:absolute sm:inset-0 bg-black/75 sm:bg-black/40 backdrop-blur-sm z-40 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowChannelRail(false);
                }}
              />
            )}

            {/* DRAWER / BOTTOM SHEET DANH SÁCH KÊNH TRUYỀN HÌNH (TỐI ƯU CẢM ỨNG MOBILE) */}
            <aside
              className={`fixed inset-x-0 bottom-0 sm:absolute sm:inset-y-0 sm:right-0 sm:left-auto z-50 w-full sm:w-[380px] max-h-[85vh] sm:max-h-full rounded-t-3xl sm:rounded-none border-t sm:border-t-0 sm:border-l border-white/20 bg-zinc-950/98 sm:bg-zinc-950/95 p-3.5 sm:p-4 shadow-2xl backdrop-blur-2xl transition-transform duration-300 flex flex-col ${
                showChannelRail
                  ? "translate-y-0 sm:translate-x-0 pointer-events-auto"
                  : "translate-y-full sm:translate-y-0 sm:translate-x-full pointer-events-none"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* THANH VUỐT KÉO GỢI Ý TRÊN MOBILE */}
              <div className="w-12 h-1.5 bg-white/30 rounded-full mx-auto mb-2 sm:hidden flex-shrink-0" />

              <div className="mb-2.5 flex items-center justify-between border-b border-white/10 pb-2.5 flex-shrink-0">
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                    <p className="text-[11px] sm:text-[10px] font-black uppercase tracking-[0.18em] text-sky-300">
                      Kênh Truyền Hình Trực Tiếp
                    </p>
                  </div>
                  <p className="mt-0.5 truncate text-xs sm:text-xs font-bold text-white">
                    Đang xem: {selectedChannel.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowChannelRail(false)}
                  className="rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white bg-white/5 transition flex-shrink-0 cursor-pointer"
                  title="Đóng danh sách kênh"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Ô TÌM KIẾM KÊNH TRONG DRAWER */}
              <div className="relative mb-2.5 flex-shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kênh theo tên, đài, danh mục..."
                  className="w-full pl-9 pr-8 py-2 sm:py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-sky-400 transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* DANH SÁCH CUỘN KÊNH (TOUCH-FRIENDLY CHO MOBILE) */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 scrollbar-thin">
                {filteredChannels.length === 0 ? (
                  <div className="py-12 text-center text-xs text-gray-400">
                    Không tìm thấy kênh phù hợp với tìm kiếm.
                  </div>
                ) : (
                  filteredChannels.map((channel) => {
                    const active = selectedChannel.id === channel.id;
                    return (
                      <button
                        key={channel.id}
                        ref={active ? activeTvChannelRef : undefined}
                        type="button"
                        onClick={() => handleSelectChannel(channel, true)}
                        className={`flex w-full items-center gap-3 rounded-2xl border p-2.5 sm:p-2 text-left transition min-h-[56px] active:scale-[0.98] cursor-pointer ${
                          active
                            ? "border-sky-400/90 bg-sky-500/20 text-white shadow-lg shadow-sky-950/50 ring-1 ring-sky-400/50"
                            : "border-white/10 bg-white/[0.04] text-gray-200 hover:border-white/30 hover:bg-white/[0.1] active:bg-white/[0.15]"
                        }`}
                      >
                        <span className="flex h-11 w-14 sm:h-10 sm:w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-900/90 border border-white/15 p-1 shadow-inner">
                          <TvChannelLogo
                            logo={channel.logo}
                            name={channel.name}
                            size="sm"
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-1">
                            <span className="truncate text-xs sm:text-xs font-bold">
                              {channel.name}
                            </span>
                            {active && <PlayingEqualizer />}
                          </span>
                          <span className="flex items-center gap-1.5 mt-0.5">
                            <span className="truncate text-[11px] sm:text-[10px] text-gray-400">
                              {channel.category}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-emerald-400 font-bold uppercase">
                              {channel.quality}
                            </span>
                          </span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            {/* NÚT BẬT TIẾNG KHI ĐANG MUTE GÓC TRÊN PHẢI (ẨN KHI KHÔNG TƯƠNG TÁC) */}
            {isPlaying && isMuted && !isLoading && !hasError && (
              <div
                className={`absolute top-3 right-3 sm:top-4 sm:right-4 z-30 transition-opacity duration-300 ${
                  showControls ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    unmuteSound();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white text-[11px] sm:text-xs font-black shadow-2xl border border-white/40 backdrop-blur-md transition-transform hover:scale-105 active:scale-95 cursor-pointer animate-bounce"
                >
                  <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse" />
                  <span>BẬT TIẾNG</span>
                </button>
              </div>
            )}

            {/* ACTION FEEDBACK OVERLAY (PLAY, PAUSE, VOLUME, CHANNEL SWITCH) */}
            {actionFeedback && (
              <div className="absolute inset-0 flex items-center justify-center z-25 pointer-events-none">
                <div className="flex flex-col items-center justify-center px-6 py-4 rounded-3xl bg-black/75 border border-white/25 backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in duration-200">
                  {actionFeedback.icon === "play" && (
                    <Play className="w-12 h-12 text-white fill-white ml-1" />
                  )}
                  {actionFeedback.icon === "pause" && (
                    <Pause className="w-12 h-12 text-white fill-white" />
                  )}
                  {actionFeedback.icon === "volume" && (
                    <Volume2 className="w-12 h-12 text-white" />
                  )}
                  {actionFeedback.icon === "mute" && (
                    <VolumeX className="w-12 h-12 text-rose-400" />
                  )}
                  {actionFeedback.icon === "channel" && (
                    <Tv className="w-10 h-10 text-sky-400" />
                  )}
                  {actionFeedback.icon === "seek" && (
                    <Zap className="w-10 h-10 text-cyan-400 fill-cyan-400" />
                  )}
                  {actionFeedback.text && (
                    <span className="mt-2 text-xs sm:text-sm font-bold text-white font-mono">
                      {actionFeedback.text}
                    </span>
                  )}
                </div>
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
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/95 p-4 sm:p-6 text-center z-20"
              >
                <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-3">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <h4 className="text-base sm:text-lg font-bold text-white mb-1">
                  Kênh tạm thời gián đoạn tín hiệu
                </h4>
                <p className="text-xs sm:text-sm text-gray-400 max-w-md mb-5 leading-relaxed">
                  {errorMessage ||
                    "Luồng phát của đài truyền hình có thể đang bảo trì hoặc chuyển đổi đường truyền. Hãy thử bấm tải lại hoặc đổi kênh khác."}
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
                </div>
              </div>
            )}

            {/* THANH ĐIỀU KHIỂN DƯỚI ĐÁY */}
            <div
              onClick={(e) => e.stopPropagation()}
              className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-2.5 sm:p-4 flex items-center justify-between gap-2 z-30 transition-opacity duration-300 ${
                showControls
                  ? "opacity-100 pointer-events-auto"
                  : "opacity-0 pointer-events-none"
              }`}
            >
              {/* CỤM TRÁI: PLAY/PAUSE + ĐỔI KÊNH + ÂM LƯỢNG */}
              <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-shrink">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/20 hover:bg-white/30 flex-shrink-0 flex items-center justify-center text-white transition backdrop-blur-md cursor-pointer hover:scale-105 active:scale-95"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  )}
                </button>


                {/* CỤM VOLUME TRÊN MOBILE (Chỉ hiện nút Mute) */}
                <button
                  type="button"
                  onClick={toggleMute}
                  title={isMuted ? "Bật âm thanh (M)" : "Tắt âm thanh (M)"}
                  className="sm:hidden w-8 h-8 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white hover:text-rose-400 transition cursor-pointer flex-shrink-0"
                >
                  <VolumeIcon
                    className={`w-4 h-4 ${
                      isMuted || volume === 0 ? "text-rose-400" : "text-white"
                    }`}
                  />
                </button>

                {/* CỤM VOLUME TRÊN TABLET & DESKTOP (Hiện đầy đủ Slider + % text) */}
                <div className="hidden sm:flex items-center gap-2 bg-black/60 px-3 py-2 rounded-full border border-white/20 backdrop-blur-md">
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
                    onChange={(e) =>
                      handleVolumeChange(parseFloat(e.target.value))
                    }
                    className="w-16 sm:w-24 h-1.5 bg-zinc-700 accent-netflix-red rounded-lg appearance-none cursor-pointer"
                  />

                  <span className="text-[10px] sm:text-[11px] font-mono font-bold text-gray-200 min-w-[36px]">
                    {isMuted ? "Tắt tiếng" : `${Math.round(volume * 100)}%`}
                  </span>
                </div>
              </div>

              {/* CỤM PHẢI: NÚT KÊNH + PIP + FULLSCREEN */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                {/* Nút Mở Danh sách Kênh */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowChannelRail((visible) => !visible);
                  }}
                  title="Mở danh sách kênh"
                  className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full border text-[11px] sm:text-xs font-bold transition backdrop-blur-md cursor-pointer ${
                    showChannelRail
                      ? "bg-gradient-to-r from-sky-600 to-blue-600 text-white border-sky-400 shadow-md shadow-sky-950/60 scale-102"
                      : "bg-white/15 hover:bg-white/25 text-gray-200 hover:text-white border-white/20"
                  }`}
                >
                  <Tv className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-300" />
                  <span className="hidden sm:inline">Danh sách kênh</span>
                  <span className="sm:hidden">Kênh</span>
                </button>

                <span className="hidden lg:inline text-[11px] text-gray-400 bg-black/50 px-2.5 py-1 rounded-full border border-white/10 font-mono">
                  Space: Dừng/Phát • ← / →: Đổi Kênh • F: Fullscreen
                </span>

                {/* Nút Picture in Picture */}
                <button
                  type="button"
                  onClick={togglePip}
                  title="Xem thu nhỏ góc màn hình (PiP - Phím P)"
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition backdrop-blur-md cursor-pointer border border-white/10 flex-shrink-0 ${
                    isPip
                      ? "bg-netflix-red text-white"
                      : "bg-white/20 hover:bg-white/30 text-white"
                  }`}
                >
                  <PictureInPicture2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                {/* Nút Toàn màn hình - Nổi bật và luôn hiển thị trên mobile */}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  title={isFullscreen ? "Thu nhỏ (F)" : "Toàn màn hình (F)"}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-netflix-red sm:bg-white/20 hover:bg-red-700 sm:hover:bg-white/30 flex items-center justify-center text-white transition backdrop-blur-md cursor-pointer flex-shrink-0 shadow-lg border border-white/20 active:scale-95"
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
          <span className="text-[11px] text-gray-500">
            1-chạm để chuyển kênh
          </span>
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
                  <div className="w-7 h-5 sm:w-8 sm:h-6 rounded-md bg-zinc-950/90 border border-white/10 p-0.5 flex items-center justify-center overflow-hidden flex-shrink-0">
                    <TvChannelLogo logo={ch.logo} name={ch.name} size="sm" />
                  </div>
                  <span className="text-xs whitespace-nowrap">
                    {ch.name.split(" ")[0]}
                  </span>
                  {isSelected && <PlayingEqualizer />}
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
              Hiển thị{" "}
              {Math.min(displayedChannels.length, filteredChannels.length)} /{" "}
              {filteredChannels.length} kênh
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
            /* VIEW MODE: LƯỚI THẺ HIỆN ĐẠI (TỐI ƯU 2 CỘT GỌN GÀNG TRÊN ĐIỆN THOẠI) */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2 sm:gap-3.5">
              {displayedChannels.map((ch) => {
                const isSelected = selectedChannel?.id === ch.id;
                return (
                  <div
                    key={ch.id}
                    onClick={() => handleSelectChannel(ch)}
                    className={`live-channel-card group relative rounded-xl sm:rounded-2xl border p-2 sm:p-3.5 cursor-pointer transition-all duration-300 flex flex-col items-center justify-between text-center ${
                      isSelected
                        ? "live-channel-active ring-2 ring-sky-500/60 scale-102"
                        : "hover:shadow-lg hover:-translate-y-0.5"
                    }`}
                  >
                    {/* HUY HIỆU GÓC TRÊN */}
                    <div className="w-full flex items-center justify-between gap-1 mb-1 sm:mb-2">
                      <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 truncate max-w-[55px] sm:max-w-[80px]">
                        {ch.category.replace("Kênh ", "")}
                      </span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {isSelected && isPlaying && <PlayingEqualizer />}
                        <span
                          className={`px-1 sm:px-1.5 py-0.2 rounded text-[8px] sm:text-[9.5px] font-black uppercase tracking-wider border ${
                            ch.quality.includes("FHD")
                              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                              : "bg-sky-500/15 border-sky-500/40 text-sky-400"
                          }`}
                        >
                          {ch.quality
                            .replace(" 1080p", "")
                            .replace(" 720p", "")}
                        </span>
                      </div>
                    </div>

                    {/* LOGO KÊNH */}
                    <div className="live-channel-logo-container w-full h-11 sm:h-16 md:h-20 rounded-lg sm:rounded-xl bg-zinc-950/60 border border-white/10 p-1.5 sm:p-2.5 flex items-center justify-center my-0.5 sm:my-1.5 shadow-inner group-hover:scale-105 transition-transform overflow-hidden">
                      <TvChannelLogo logo={ch.logo} name={ch.name} />
                    </div>

                    {/* TÊN KÊNH */}
                    <h3 className="live-channel-title text-[11px] sm:text-xs md:text-sm font-bold sm:font-extrabold text-white group-hover:text-sky-400 transition line-clamp-1 mt-0.5 sm:mt-1 leading-tight w-full">
                      {ch.name}
                    </h3>
                  </div>
                );
              })}
            </div>
          ) : (
            /* VIEW MODE: DANH SÁCH GỌN (COMPACT LIST) */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
              {displayedChannels.map((ch) => {
                const isSelected = selectedChannel?.id === ch.id;
                return (
                  <div
                    key={ch.id}
                    onClick={() => handleSelectChannel(ch)}
                    className={`group rounded-xl border p-2 sm:p-2.5 cursor-pointer transition-all flex items-center justify-between gap-2.5 sm:gap-3 ${
                      isSelected
                        ? "live-channel-active ring-1 ring-sky-500/60"
                        : "live-channel-card hover:border-white/25"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div className="live-channel-logo-container w-11 h-8 sm:w-14 sm:h-10 rounded-lg sm:rounded-xl bg-zinc-950/60 border border-white/10 p-1 flex items-center justify-center overflow-hidden flex-shrink-0">
                        <TvChannelLogo logo={ch.logo} name={ch.name} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="live-channel-title text-[11px] sm:text-xs font-bold text-white group-hover:text-sky-300 truncate">
                            {ch.name}
                          </h4>
                          {isSelected && isPlaying && <PlayingEqualizer />}
                        </div>
                        <span className="text-[9.5px] sm:text-[10px] text-gray-400">
                          {ch.category.replace("Kênh ", "")}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[8.5px] sm:text-[9.5px] px-1.5 sm:px-2 py-0.5 rounded font-black uppercase flex-shrink-0 border ${
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
                onClick={() =>
                  setVisibleCount((prev) => prev + INITIAL_PAGE_SIZE)
                }
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-black text-xs sm:text-sm border border-white/20 hover:border-white/40 shadow-xl transition-all hover:scale-102 active:scale-98 cursor-pointer"
              >
                <span>Xem thêm các kênh khác</span>
                <span className="px-2 py-0.5 rounded-full bg-white/15 text-[11px] text-gray-200">
                  +
                  {Math.min(
                    INITIAL_PAGE_SIZE,
                    filteredChannels.length - visibleCount,
                  )}{" "}
                  kênh
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>
              <span className="text-[11px] text-gray-400">
                Còn lại {filteredChannels.length - visibleCount} kênh truyền
                hình
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
