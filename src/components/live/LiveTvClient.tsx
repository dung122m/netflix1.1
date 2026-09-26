"use client";

import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
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
import { LiveShortcutPopover } from "./LiveShortcutPopover";
import { ChannelSourceSwitcher } from "./ChannelSourceSwitcher";

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
  if (category.includes("Bóng Đá") || category.includes("Thể Thao")) return "⚽";
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

  const [selectedTvChannel, setSelectedTvChannel] = useState<TvChannel | null>(
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
  const drawerListRef = useRef<HTMLDivElement | null>(null);

  const [isMounted, setIsMounted] = useState(false);
  const [isMobileScreen, setIsMobileScreen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const updateSize = () => setIsMobileScreen(window.innerWidth < 640);
    updateSize();
    window.addEventListener("resize", updateSize, { passive: true });
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const useMobilePortal =
    isMounted && isMobileScreen && !isFullscreen && typeof document !== "undefined";
  const [copied, setCopied] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    icon: "play" | "pause" | "volume" | "mute" | "channel" | "seek";
    text?: string;
  } | null>(null);

  // Trạng thái đồng bộ Live Edge & Tua thời gian (Seek)
  const [isAtLiveEdge, setIsAtLiveEdge] = useState<boolean>(true);
  const [liveLatency, setLiveLatency] = useState<number>(0);
  const lastTargetTimeRef = useRef<number | null>(null);
  const seekThrottleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSeekTimestampRef = useRef<number>(0);
  const accumulatedSeekDeltaRef = useRef<number>(0);
  const seekDeltaResetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const targetClearTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cuộn mượt CHỈ bên trong danh sách drawer, tuyệt đối không gọi element.scrollIntoView() gây giật/dịch ngang trang
  useEffect(() => {
    if (!showChannelRail) return;
    const rafId = requestAnimationFrame(() => {
      const container = drawerListRef.current;
      const activeEl = activeTvChannelRef.current;
      if (!container || !activeEl) return;

      const itemTop = activeEl.offsetTop - container.offsetTop;
      const itemHeight = activeEl.clientHeight;
      const containerHeight = container.clientHeight;
      const currentScrollTop = container.scrollTop;

      if (
        itemTop < currentScrollTop ||
        itemTop + itemHeight > currentScrollTop + containerHeight
      ) {
        container.scrollTo({
          top: Math.max(0, itemTop - containerHeight / 2 + itemHeight / 2),
          behavior: "smooth",
        });
      }
    });
    return () => cancelAnimationFrame(rafId);
  }, [showChannelRail, selectedTvChannel?.id]);

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
        setSelectedTvChannel(found);
        return;
      }
    }

    setSelectedTvChannel((prev) => prev || defaultChannel);
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
      setSelectedTvChannel(channel);
      if (!keepRailOpen) {
        setShowChannelRail(false);
      }
      triggerActionFeedback("channel", channel.name);
      try {
        localStorage.setItem("nanaflix_live_channel_id", channel.id);
        const url = new URL(window.location.href);
        url.searchParams.set("tab", "tv");
        url.searchParams.set("channel", channel.id);
        // Dọn sạch các query params riêng của bóng đá
        url.searchParams.delete("match");
        url.searchParams.delete("tournament");
        url.searchParams.delete("group");
        url.searchParams.delete("fhd");
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

  // Xử lý khi tab thay đổi (isActive true/false) hoặc minimize tab - Cleanup triệt để tránh rò rỉ RAM
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!isActive) {
      video.pause();
      video.removeAttribute("src");
      video.load();
      setIsPlaying(false);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      lastLoadedUrlRef.current = "";
      if (
        typeof document !== "undefined" &&
        document.pictureInPictureElement === video
      ) {
        document.exitPictureInPicture().catch(() => {});
        setIsPip(false);
      }
    }
  }, [isActive]);

  // Bắt sự kiện timeupdate để phát hiện độ trễ so với Live Edge
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const hls = hlsRef.current;
      if (
        hls &&
        hls.liveSyncPosition &&
        Number.isFinite(hls.liveSyncPosition)
      ) {
        const drift = Math.max(
          0,
          Math.round(hls.liveSyncPosition - video.currentTime),
        );
        setLiveLatency(drift);
        setIsAtLiveEdge(drift <= 4);
      } else {
        setIsAtLiveEdge(true);
        setLiveLatency(0);
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, []);

  // Khởi tạo luồng phát HLS với Proxy + Auto-Fallback + Low Latency Engine + Auto ABR
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedTvChannel?.url || !isActive) return;

    const primaryUrl = getStreamUrl(selectedTvChannel.url);

    if (primaryUrl === lastLoadedUrlRef.current && hlsRef.current) {
      return;
    }

    lastLoadedUrlRef.current = primaryUrl;
    setIsLoading(true);
    setHasError(false);
    setErrorMessage("");

    const channelWithFallback = selectedTvChannel as TvChannel & {
      fallback_url?: string;
      fallbackUrl?: string;
    };
    const fallbackUrl =
      channelWithFallback.fallback_url || channelWithFallback.fallbackUrl;
    let hasTriedFallback = false;

    const startHls = (sourceUrl: string) => {
      if (!videoRef.current) return;

      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute("src");
        videoRef.current.load();
      }

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 5,
          maxLiveSyncPlaybackRate: 1.08,
          backBufferLength: 15,
          maxBufferLength: 12,
          maxMaxBufferLength: 20,
          maxBufferSize: 15 * 1000 * 1000,
          abrEwmaDefaultEstimate: 5_000_000,
          capLevelToPlayerSize: false,
          startLevel: -1,
          manifestLoadingTimeOut: 4000,
          levelLoadingTimeOut: 4000,
          fragLoadingTimeOut: 4500,
          fragLoadingMaxRetry: 2,
          levelLoadingMaxRetry: 2,
          manifestLoadingMaxRetry: 2,
          fragLoadingMaxRetryTimeout: 1000,
          levelLoadingMaxRetryTimeout: 1000,
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

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
          // Cho phép hls.js tự chọn chất lượng ABR thích ứng, không khóa cứng level cao nhất
          hls.currentLevel = -1;
          hls.loadLevel = -1;
          hls.nextLevel = -1;
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
        let networkRetryCount = 0;

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              // Chỉ tự động recover về live edge khi vị trí phát thực sự rơi ra ngoài seekable window hoặc trễ quá sâu (>38s)
              const isOutsideSeekable =
                videoRef.current &&
                videoRef.current.seekable &&
                videoRef.current.seekable.length > 0 &&
                videoRef.current.currentTime < videoRef.current.seekable.start(0);
              const isCriticallyBehind =
                videoRef.current &&
                hls.liveSyncPosition &&
                Number.isFinite(hls.liveSyncPosition) &&
                hls.liveSyncPosition - videoRef.current.currentTime > 38;

              if (
                videoRef.current &&
                hls.liveSyncPosition &&
                Number.isFinite(hls.liveSyncPosition) &&
                (isOutsideSeekable || isCriticallyBehind)
              ) {
                videoRef.current.currentTime = hls.liveSyncPosition;
                setIsAtLiveEdge(true);
                setLiveLatency(0);
                hls.startLoad();
                return;
              }

              networkRetryCount += 1;
              if (networkRetryCount <= 2) {
                hls.startLoad();
                return;
              }

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
      if (video) {
        video.pause();
        video.removeAttribute("src");
        video.load();
      }
    };
  }, [selectedTvChannel, isActive]);

  // Hành động nhảy về Live Edge (một lần click)
  const goToLiveEdge = useCallback(() => {
    const video = videoRef.current;
    const hls = hlsRef.current;
    if (!video) return;

    lastTargetTimeRef.current = null;
    if (hls && hls.liveSyncPosition && Number.isFinite(hls.liveSyncPosition)) {
      video.currentTime = hls.liveSyncPosition;
      setIsAtLiveEdge(true);
      setLiveLatency(0);
      triggerActionFeedback("seek", "🔴 VỀ LIVE");
      if (video.paused && !userPausedRef.current) {
        video.play().catch(() => {});
      }
    } else if (video.seekable && video.seekable.length > 0) {
      video.currentTime = Math.max(0, video.seekable.end(video.seekable.length - 1) - 1);
      setIsAtLiveEdge(true);
      setLiveLatency(0);
      triggerActionFeedback("seek", "🔴 VỀ LIVE");
      if (video.paused && !userPausedRef.current) {
        video.play().catch(() => {});
      }
    }
  }, [triggerActionFeedback]);

  // Điều khiển Play / Pause - Chỉ bắt Live Edge khi unpause nếu stream đã rơi ra ngoài seekable window
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
      const video = videoRef.current;
      const hls = hlsRef.current;
      const livePos = hls?.liveSyncPosition;

      // Chỉ đưa về live edge khi unpause nếu vị trí hiện tại đã trôi ra ngoài seekable window hoặc trễ quá 38s
      const isOutsideSeekable =
        video.seekable &&
        video.seekable.length > 0 &&
        video.currentTime < video.seekable.start(0);
      const isCriticallyBehind =
        livePos &&
        Number.isFinite(livePos) &&
        livePos > 0 &&
        livePos - video.currentTime > 38;

      if (
        (isOutsideSeekable || isCriticallyBehind) &&
        livePos &&
        Number.isFinite(livePos) &&
        livePos > 0
      ) {
        video.currentTime = livePos;
        setIsAtLiveEdge(true);
        setLiveLatency(0);
      }

      video
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

  // Chuyển kênh bằng phím N/P, PageDown/PageUp hoặc nút trên Player
  const handleSwitchChannel = useCallback(
    (direction: "next" | "prev") => {
      const activeList =
        filteredChannels.length > 0 ? filteredChannels : channels;
      if (activeList.length <= 1 || !selectedTvChannel) return;

      const currentIdx = activeList.findIndex(
        (c) =>
          c.id === selectedTvChannel.id ||
          c.name.toLowerCase() === selectedTvChannel.name.toLowerCase(),
      );

      let targetIdx = 0;
      if (currentIdx !== -1) {
        targetIdx =
          direction === "next"
            ? (currentIdx + 1) % activeList.length
            : (currentIdx - 1 + activeList.length) % activeList.length;
      }

      const nextCh = activeList[targetIdx];
      handleSelectChannel(nextCh);
      triggerActionFeedback("channel", nextCh.name);
    },
    [filteredChannels, channels, selectedTvChannel, handleSelectChannel, triggerActionFeedback],
  );

  // Tua thời gian (Seek ±10s) - Phản hồi tức thì (0ms), gom nhóm nếu nhấn liên tục và clamp chuẩn theo seekable window
  const handleSeek = useCallback(
    (seconds: number) => {
      const video = videoRef.current;
      if (!video) return;

      // 1. Tích lũy delta để hiển thị visual feedback overlay (+10s, +20s, -20s...)
      if (seekDeltaResetTimerRef.current) {
        clearTimeout(seekDeltaResetTimerRef.current);
      }
      accumulatedSeekDeltaRef.current += seconds;
      const totalDelta = accumulatedSeekDeltaRef.current;
      triggerActionFeedback(
        "seek",
        totalDelta > 0 ? `+${totalDelta}s ⏩` : `${totalDelta}s ⏪`,
      );
      seekDeltaResetTimerRef.current = setTimeout(() => {
        accumulatedSeekDeltaRef.current = 0;
      }, 800);

      // 2. Xác định giới hạn tua an toàn dựa trên video.seekable (không dùng duration/Infinity)
      const seekable = video.seekable;
      const hls = hlsRef.current;
      const livePos = hls?.liveSyncPosition;

      let minSeek = 0;
      let maxSeek = video.currentTime;

      if (seekable && seekable.length > 0) {
        minSeek = seekable.start(0);
        maxSeek = seekable.end(seekable.length - 1);
      } else if (livePos && Number.isFinite(livePos) && livePos > 0) {
        maxSeek = livePos;
        minSeek = Math.max(0, livePos - 40);
      }

      // Giới hạn maxSeek không vượt quá Live Edge để tránh đụng đầu live chưa có segment
      if (livePos && Number.isFinite(livePos) && livePos > 0) {
        maxSeek = Math.min(maxSeek, livePos);
      }

      // 3. Tính toán target từ mốc hiện tại hoặc mốc đang dồn dập seek
      const baseTime =
        lastTargetTimeRef.current !== null
          ? lastTargetTimeRef.current
          : video.currentTime || 0;

      let target = baseTime + seconds;
      if (target < minSeek) {
        target = minSeek;
      } else if (target > maxSeek) {
        target = maxSeek;
      }

      lastTargetTimeRef.current = target;

      // 4. Cơ chế thực thi seek: Ngay lập tức cho 1 lần bấm, hoãn nhẹ nếu spam phím siêu nhanh (<120ms)
      const now = performance.now();
      const isRapid = now - lastSeekTimestampRef.current < 120;
      lastSeekTimestampRef.current = now;

      const commitSeek = () => {
        if (videoRef.current) {
          try {
            videoRef.current.currentTime = target;
          } catch {}
        }
        if (seekThrottleTimerRef.current) {
          clearTimeout(seekThrottleTimerRef.current);
          seekThrottleTimerRef.current = null;
        }
      };

      if (!isRapid) {
        // Lần bấm đầu tiên hoặc bấm cách quãng: seek NGAY LẬP TỨC (0ms delay)
        commitSeek();
      } else {
        // Bấm dồn dập liên tiếp: hoãn nhẹ 80ms để tránh spam decoder trình duyệt
        if (seekThrottleTimerRef.current) {
          clearTimeout(seekThrottleTimerRef.current);
        }
        seekThrottleTimerRef.current = setTimeout(commitSeek, 80);
      }

      // Đặt timer giải phóng target reference sau khi ngừng bấm 450ms
      if (targetClearTimerRef.current) {
        clearTimeout(targetClearTimerRef.current);
      }
      targetClearTimerRef.current = setTimeout(() => {
        lastTargetTimeRef.current = null;
      }, 450);
    },
    [triggerActionFeedback],
  );

  // Phím tắt bàn phím dùng chung cho Live TV Player
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tagName = typeof target?.tagName === "string" ? target.tagName.toLowerCase() : "";
      if (
        ["input", "textarea", "select"].includes(tagName) ||
        Boolean(target?.isContentEditable) ||
        target?.getAttribute?.("role") === "textbox" ||
        target?.getAttribute?.("role") === "searchbox"
      ) {
        return;
      }

      // Bỏ qua nếu người dùng đang dùng tổ hợp phím hệ thống (Ctrl + C copy, Cmd + C, Ctrl + V, Alt + ...)
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      // Chỉ xử lý shortcut khi focus thực sự nằm trong vùng Live TV Player
      const active = document.activeElement as HTMLElement | null;
      const activeTagName = typeof active?.tagName === "string" ? active.tagName.toLowerCase() : "";
      const isPlayerContainer = Boolean(
        (containerRef.current && active && containerRef.current.contains(active)) ||
        (playerRef.current && active && playerRef.current.contains(active))
      );

      // Nếu focus đang ở ngoài player trên các input, form, textarea hoặc thẻ nút danh sách -> nhường quyền TV navigation
      if (!isPlayerContainer && (["input", "textarea", "select"].includes(activeTagName) || (!isFullscreen && (activeTagName === "button" || activeTagName === "a")))) {
        return;
      }

      if (e.code === "Space" || e.key === "Enter") {
        if (activeTagName === "button" || activeTagName === "input" || activeTagName === "a") {
          return;
        }
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleSeek(-10);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleSeek(10);
      } else if (e.key === "ArrowUp") {
        if (isFullscreen) {
          e.preventDefault();
          handleVolumeChange(volume + 0.1);
        }
      } else if (e.key === "ArrowDown") {
        if (isFullscreen) {
          e.preventDefault();
          handleVolumeChange(volume - 0.1);
        }
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleMute();
      } else if (e.key === "n" || e.key === "N" || e.key === "PageDown") {
        e.preventDefault();
        handleSwitchChannel("next");
      } else if (e.key === "p" || e.key === "P" || e.key === "PageUp") {
        e.preventDefault();
        handleSwitchChannel("prev");
      } else if (e.key === "l" || e.key === "L") {
        e.preventDefault();
        goToLiveEdge();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "i" || e.key === "I") {
        e.preventDefault();
        togglePip();
      } else if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        setShowChannelRail((visible) => !visible);
      } else if (e.key === "[" || e.key === "-") {
        e.preventDefault();
        handleVolumeChange(volume - 0.1);
      } else if (e.key === "]" || e.key === "=" || e.key === "+") {
        e.preventDefault();
        handleVolumeChange(volume + 0.1);
      } else if (e.key === "Escape") {
        if (showChannelRail) {
          e.preventDefault();
          setShowChannelRail(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isActive,
    togglePlay,
    toggleMute,
    toggleFullscreen,
    togglePip,
    goToLiveEdge,
    handleVolumeChange,
    handleSwitchChannel,
    handleSeek,
    showChannelRail,
    volume,
    isFullscreen,
  ]);

  const handleCopy = () => {
    if (selectedTvChannel && typeof navigator !== "undefined") {
      navigator.clipboard.writeText(selectedTvChannel.url);
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

  const channelDrawerMarkup = selectedTvChannel ? (
    <>
      {/* BACKDROP KHI MỞ DRAWER KÊNH TRÊN MOBILE & DESKTOP */}
      <div
        className={`${
          useMobilePortal
            ? "fixed inset-0 z-[9998] bg-black/80"
            : "fixed inset-0 sm:absolute sm:inset-0 z-40 bg-black/75 sm:bg-black/40"
        } backdrop-blur-sm transition-all duration-300 ${
          showChannelRail
            ? "opacity-100 pointer-events-auto visible"
            : "opacity-0 pointer-events-none invisible"
        }`}
        onClick={(e) => {
          e.stopPropagation();
          setShowChannelRail(false);
        }}
      />

      {/* DRAWER / BOTTOM SHEET DANH SÁCH KÊNH TRUYỀN HÌNH (TỐI ƯU CẢM ỨNG MOBILE) */}
      <aside
        className={`${
          useMobilePortal
            ? "fixed inset-x-0 bottom-0 z-[9999] w-full max-h-[85vh] rounded-t-3xl border-t border-white/20 bg-zinc-950/98 p-3.5 pb-6 shadow-2xl backdrop-blur-2xl"
            : "fixed inset-x-0 bottom-0 sm:absolute sm:inset-y-0 sm:right-0 sm:left-auto z-50 w-full sm:w-[380px] max-h-[85vh] sm:max-h-full rounded-t-3xl sm:rounded-none border-t sm:border-t-0 sm:border-l border-white/20 bg-zinc-950/98 sm:bg-zinc-950/95 p-3.5 sm:p-4 shadow-2xl backdrop-blur-2xl"
        } transition-all duration-300 flex flex-col ${
          showChannelRail
            ? "translate-y-0 sm:translate-x-0 opacity-100 pointer-events-auto visible"
            : "translate-y-full sm:translate-y-0 sm:translate-x-full opacity-0 pointer-events-none invisible"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* THANH VUỐT KÉO GỢI Ý TRÊN MOBILE */}
        <div className="w-12 h-1.5 bg-white/30 rounded-full mx-auto mb-2 sm:hidden shrink-0" />

        <div className="mb-2.5 flex items-center justify-between border-b border-white/10 pb-2.5 shrink-0">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
              <p className="text-[11px] sm:text-[10px] font-black uppercase tracking-[0.18em] text-sky-300">
                Kênh Truyền Hình Trực Tiếp
              </p>
            </div>
            <p className="mt-0.5 truncate text-xs sm:text-xs font-bold text-white">
              Đang xem: {selectedTvChannel.name}
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowChannelRail(false);
            }}
            className="rounded-full p-2 text-white hover:bg-white/20 active:scale-95 bg-white/10 transition shrink-0 cursor-pointer min-w-[38px] min-h-[38px] flex items-center justify-center border border-white/15 shadow-sm"
            title="Đóng danh sách kênh"
            aria-label="Đóng"
          >
            <X className="h-4 w-4 text-white" />
          </button>
        </div>

        {/* Ô TÌM KIẾM KÊNH TRONG DRAWER */}
        <div className="relative mb-2.5 shrink-0">
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
        <div
          ref={drawerListRef}
          className="flex-1 overflow-y-auto space-y-2 pr-0.5 scrollbar-thin overscroll-contain"
        >
          {filteredChannels.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">
              Không tìm thấy kênh phù hợp với tìm kiếm.
            </div>
          ) : (
            filteredChannels.map((channel) => {
              const active = selectedTvChannel.id === channel.id;
              return (
                <button
                  key={channel.id}
                  ref={active ? activeTvChannelRef : undefined}
                  type="button"
                  onClick={() => handleSelectChannel(channel, false)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-2.5 sm:p-2 text-left transition min-h-[56px] active:scale-[0.98] cursor-pointer touch-manipulation ${
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

        {/* NÚT ĐÓNG TO RÕ Ở CUỐI DRAWER DÀNH RIÊNG CHO MOBILE */}
        <div className="pt-2.5 mt-2 border-t border-white/10 shrink-0 sm:hidden">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowChannelRail(false);
            }}
            className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-[0.99] text-white font-semibold text-xs transition cursor-pointer border border-white/10"
          >
            Đóng danh sách kênh
          </button>
        </div>
      </aside>
    </>
  ) : null;

  return (
    <div className="space-y-6">
      {/* 1. KHUNG TRÌNH PHÁT TRUYỀN HÌNH TRỰC TIẾP */}
      {selectedTvChannel ? (
        <div ref={playerRef} className="scroll-mt-24 space-y-4 w-full min-w-0">
          {/* HEADER KÊNH ĐANG PHÁT */}
          <div className="keep-dark-cinema relative rounded-2xl sm:rounded-3xl border border-white/15 bg-gradient-to-b from-zinc-900/95 via-zinc-950/98 to-black p-3 sm:p-4 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-3 backdrop-blur-xl">
            <div className="flex items-center gap-3 sm:gap-3.5 w-full md:w-auto">
              {/* LOGO KÊNH */}
              <div className="w-16 h-11 sm:w-20 sm:h-13 rounded-xl bg-zinc-900/90 border-2 border-white/20 p-1.5 flex items-center justify-center shadow-xl flex-shrink-0 overflow-hidden">
                <TvChannelLogo
                  logo={selectedTvChannel.logo}
                  name={selectedTvChannel.name}
                />
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-netflix-red/20 border border-netflix-red/40 text-netflix-red text-[10px] font-black animate-pulse">
                    <Radio className="w-2.5 h-2.5" />
                    <span>TRỰC TIẾP</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-gray-300 text-[10px] font-bold">
                    {selectedTvChannel.category}
                  </span>
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[9.5px] font-black uppercase">
                    <Zap className="w-2.5 h-2.5 fill-emerald-400" />
                    <span>{selectedTvChannel.quality}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <h2
                    className="text-base sm:text-xl font-black text-white keep-white"
                    style={{ color: "#ffffff" }}
                  >
                    {selectedTvChannel.name}
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
            tabIndex={0}
            onMouseMove={resetControlsTimeout}
            onFocus={() => {
              setShowControls(true);
              resetControlsTimeout();
            }}
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
            className={`relative w-full mx-auto bg-black transition-all duration-300 group select-none ring-1 ring-white/10 outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black contain-paint isolate ${
              isFullscreen
                ? "fixed inset-0 z-50 w-full h-full max-w-none max-h-none rounded-none aspect-auto border-none shadow-none p-0 m-0 overflow-hidden flex flex-col justify-center"
                : "aspect-video lg:max-h-[calc(100vh-210px)] lg:max-w-[calc((100vh-210px)*16/9)] rounded-2xl sm:rounded-3xl overflow-hidden border border-white/15 shadow-2xl"
            } ${showControls ? "cursor-default" : "cursor-none"}`}
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

            {/* HUY HIỆU SIGNAL & LIVE TRÊN TRÁI: BẤM ĐỂ QUAY VỀ LIVE EDGE */}
            <div
              className={`absolute top-3 left-3 sm:top-4 sm:left-4 flex items-center gap-2 z-20 transition-opacity duration-300 ${
                showControls ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
              }`}
            >
              {isAtLiveEdge ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToLiveEdge();
                  }}
                  title="Đang phát trực tiếp (Bấm để đồng bộ)"
                  className="group flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white text-[10px] sm:text-[11px] font-black uppercase tracking-wider shadow-[0_2px_12px_rgba(229,9,20,0.5)] border border-red-400/40 backdrop-blur-md transition hover:scale-105 active:scale-95 cursor-pointer select-none"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                  </span>
                  <span>TRỰC TIẾP</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToLiveEdge();
                  }}
                  title={
                    liveLatency > 0
                      ? `Đang trễ ~${liveLatency}s so với trực tiếp. Bấm để quay về Live Edge`
                      : "Bấm để quay về Live Edge"
                  }
                  className="group flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-[10px] sm:text-[11px] font-black uppercase tracking-wider shadow-[0_2px_12px_rgba(245,158,11,0.5)] border border-amber-300/60 backdrop-blur-md transition hover:scale-105 active:scale-95 cursor-pointer animate-pulse select-none"
                >
                  <RotateCcw className="w-3 h-3 group-hover:-rotate-90 transition-transform duration-300" />
                  <span>
                    {liveLatency > 0 ? `VỀ LIVE (-${liveLatency}s)` : "VỀ LIVE"}
                  </span>
                </button>
              )}
            </div>

            {/* DRAWER DANH SÁCH KÊNH TRUYỀN HÌNH (DESKTOP HOẶC FULLSCREEN) */}
            {!useMobilePortal && channelDrawerMarkup}

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
                  Đang kết nối tín hiệu truyền hình {selectedTvChannel.name}...
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
                      const ch = selectedTvChannel;
                      setSelectedTvChannel(null);
                      setTimeout(() => setSelectedTvChannel(ch), 50);
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
              data-live-controls
              onClick={(e) => e.stopPropagation()}
              className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-1.5 sm:p-4 pt-4 sm:pt-8 flex items-center justify-between gap-1 sm:gap-2 z-30 transition-opacity duration-300 ${
                showControls
                  ? "opacity-100 pointer-events-auto"
                  : "opacity-0 pointer-events-none"
              }`}
              style={{
                paddingBottom: isFullscreen ? "max(0.75rem, env(safe-area-inset-bottom, 0.75rem))" : undefined,
                paddingLeft: isFullscreen ? "max(0.75rem, env(safe-area-inset-left, 0.75rem))" : undefined,
                paddingRight: isFullscreen ? "max(0.75rem, env(safe-area-inset-right, 0.75rem))" : undefined,
              }}
            >
              {/* CỤM TRÁI: PLAY/PAUSE + ÂM LƯỢNG */}
              <div className="flex items-center gap-1 sm:gap-2.5 min-w-0 shrink-0">
                <button
                  type="button"
                  onClick={togglePlay}
                  title={isPlaying ? "Tạm dừng (Space)" : "Phát (Space)"}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 hover:bg-white/30 flex-shrink-0 flex items-center justify-center text-white transition backdrop-blur-md cursor-pointer hover:scale-105 active:scale-95"
                >
                  {isPlaying ? (
                    <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                  ) : (
                    <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current ml-0.5" />
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

              {/* CỤM PHẢI: BỘ CHỌN KÊNH THỐNG NHẤT + PHÍM TẮT GỢI Ý + PIP + FULLSCREEN */}
              <div className="flex items-center gap-1 sm:gap-2 min-w-0 shrink">
                {/* BỘ CHỌN KÊNH ĐỒNG BỘ: ‹ [TÊN KÊNH • KÊNH 3/12] ▾ › */}
                <ChannelSourceSwitcher
                  type="channel"
                  currentName={selectedTvChannel?.name || "Chọn kênh"}
                  currentIndex={
                    selectedTvChannel
                      ? (filteredChannels.length > 0 ? filteredChannels : channels).findIndex(
                          (c) =>
                            c.id === selectedTvChannel.id ||
                            c.name.toLowerCase() === selectedTvChannel.name.toLowerCase(),
                        )
                      : -1
                  }
                  totalCount={
                    (filteredChannels.length > 0 ? filteredChannels : channels).length
                  }
                  onPrevious={() => handleSwitchChannel("prev")}
                  onNext={() => handleSwitchChannel("next")}
                  onOpenList={() => setShowChannelRail((visible) => !visible)}
                  isListOpen={showChannelRail}
                />

                {/* Hướng dẫn phím tắt dạng popover overlay góc dưới phải */}
                <LiveShortcutPopover mode="tv" />

                {/* Nút Picture in Picture */}
                <button
                  type="button"
                  onClick={togglePip}
                  title="Xem thu nhỏ góc màn hình (PiP - Phím I)"
                  className={`hidden sm:flex w-8 h-8 sm:w-10 sm:h-10 rounded-full items-center justify-center transition backdrop-blur-md cursor-pointer border border-white/10 flex-shrink-0 ${
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
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-netflix-red sm:bg-white/20 hover:bg-red-700 sm:hover:bg-white/30 flex items-center justify-center text-white transition backdrop-blur-md cursor-pointer flex-shrink-0 shadow-lg border border-white/20 active:scale-95"
                >
                  {isFullscreen ? (
                    <Minimize className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  ) : (
                    <Maximize className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* PORTAL BOTTOM SHEET CHO MOBILE: KHÔNG BỊ CLIPPED BỞI CONTAINER */}
          {useMobilePortal &&
            typeof document !== "undefined" &&
            createPortal(channelDrawerMarkup, document.body)}
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
              const isSelected = selectedTvChannel?.id === ch.id;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => handleSelectChannel(ch)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all flex-none cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none ${
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
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition border shadow-sm cursor-pointer whitespace-nowrap focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none ${
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
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border shadow-sm cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none ${
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
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border shadow-sm cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none ${
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
                const isSelected = selectedTvChannel?.id === ch.id;
                return (
                  <div
                    key={ch.id}
                    tabIndex={0}
                    onClick={() => handleSelectChannel(ch)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelectChannel(ch);
                      }
                    }}
                    className={`live-channel-card group relative rounded-xl sm:rounded-2xl border p-2 sm:p-3.5 cursor-pointer transition-all duration-300 flex flex-col items-center justify-between text-center focus-visible:scale-105 focus-visible:ring-4 focus-visible:ring-sky-400 focus-visible:outline-none ${
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
                const isSelected = selectedTvChannel?.id === ch.id;
                return (
                  <div
                    key={ch.id}
                    tabIndex={0}
                    onClick={() => handleSelectChannel(ch)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelectChannel(ch);
                      }
                    }}
                    className={`group rounded-xl border p-2 sm:p-2.5 cursor-pointer transition-all flex items-center justify-between gap-2.5 sm:gap-3 live-channel-card focus-visible:scale-102 focus-visible:ring-4 focus-visible:ring-sky-400 focus-visible:outline-none ${
                      isSelected
                        ? "live-channel-active ring-1 ring-sky-500/60"
                        : "hover:border-white/25"
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
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-black text-xs sm:text-sm border border-white/20 hover:border-white/40 shadow-xl transition-all hover:scale-102 active:scale-98 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
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
      <style>{`
        :fullscreen,
        :-webkit-full-screen {
          width: 100vw !important;
          height: 100vh !important;
          max-width: 100vw !important;
          max-height: 100vh !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #000000 !important;
          overflow: hidden !important;
          border-radius: 0 !important;
          border: none !important;
          aspect-ratio: auto !important;
        }
        :fullscreen video,
        :-webkit-full-screen video {
          width: 100% !important;
          height: 100% !important;
          max-height: 100vh !important;
          aspect-ratio: auto !important;
          object-fit: contain !important;
        }
        :fullscreen iframe,
        :-webkit-full-screen iframe {
          width: 100% !important;
          height: 100% !important;
        }
        :fullscreen [data-live-controls],
        :-webkit-full-screen [data-live-controls] {
          position: absolute !important;
          inset-inline: 0 !important;
          bottom: 0 !important;
          z-index: 50 !important;
          padding-bottom: max(0.75rem, env(safe-area-inset-bottom, 0.75rem)) !important;
          padding-left: max(0.75rem, env(safe-area-inset-left, 0.75rem)) !important;
          padding-right: max(0.75rem, env(safe-area-inset-right, 0.75rem)) !important;
        }
      `}</style>
    </div>
  );
}

export default LiveTvClient;
