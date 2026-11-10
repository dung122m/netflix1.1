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
  Volume2,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
  LayoutGrid,
  List,
  RotateCcw,
  Flame,
  Zap,
} from "lucide-react";
import { LiveTvData, TvChannel } from "@/services/live/tv/service";
import { PlayingEqualizer } from "./PlayingEqualizer";
import { useMediaFullscreen } from "./hooks/useMediaFullscreen";
import { useMediaVolume } from "./hooks/useMediaVolume";
import { VolumeOsdPill } from "./VolumeOsdPill";
import { useSearchParams } from "next/navigation";
import {
  YouTubePlayIcon,
  YouTubePauseIcon,
  YouTubeVolumeHighIcon,
  YouTubeVolumeLowIcon,
  YouTubeVolumeMuteIcon,
  YouTubeSeek10BackIcon,
  YouTubeSeek10ForwardIcon,
  YouTubeFullscreenIcon,
  YouTubeExitFullscreenIcon,
  YouTubeMiniplayerIcon,
} from "@/components/player/PlayerNativeControls";
import { LiveShortcutPopover } from "./LiveShortcutPopover";
import { Tooltip } from "@/components/ui/Tooltip";
import { ChannelSourceSwitcher } from "./ChannelSourceSwitcher";
import { TvChannelLogo, getCategoryEmoji, getPageNumbers } from "./TvChannelLogo";
import { TvChannelDrawer } from "./TvChannelDrawer";
import { TvChannelGrid } from "./TvChannelGrid";

export { TvChannelLogo, getCategoryEmoji, getPageNumbers, TvChannelDrawer, TvChannelGrid };

interface LiveTvClientProps {
  initialData: LiveTvData;
  isActive?: boolean;
}

const INITIAL_PAGE_SIZE = 24;


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

  const initialChannel = useMemo(() => {
    const channelParam = searchParams.get("channel");
    if (channelParam) {
      const found = channels.find(
        (c) =>
          c.id === channelParam ||
          c.name.toLowerCase() === channelParam.toLowerCase() ||
          c.name.toLowerCase().includes(channelParam.toLowerCase()),
      );
      if (found) return found;
    }
    return defaultChannel;
  }, [channels, searchParams, defaultChannel]);

  const [selectedTvChannel, setSelectedTvChannel] = useState<TvChannel | null>(initialChannel);

  // Sync with searchParams if external navigation occurs
  useEffect(() => {
    setSelectedTvChannel(initialChannel);
  }, [initialChannel]);

  // Restore saved channel from localStorage ONLY after mount (if no URL parameter was given)
  useEffect(() => {
    const channelParam = searchParams.get("channel");
    if (!channelParam) {
      try {
        const savedId = localStorage.getItem("nanaflix_live_channel_id");
        if (savedId) {
          const found = channels.find(
            (c) =>
              c.id === savedId ||
              c.name.toLowerCase() === savedId.toLowerCase() ||
              c.name.toLowerCase().includes(savedId.toLowerCase()),
          );
          if (found) {
            setSelectedTvChannel(found);
          }
        }
      } catch {}
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [onlyFhd, setOnlyFhd] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const channelGridTopRef = useRef<HTMLDivElement>(null);

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
  const playbackSessionIdRef = useRef<number>(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const {
    volume,
    setVolume,
    isMuted,
    setIsMuted,
    volumeRef,
    userMutedRef,
    volumeOsd,
    handleVolumeChange,
    triggerVolumeOsd,
  } = useMediaVolume({ videoRef });
  const {
    isFullscreen,
    isPip,
    setIsPip,
    toggleFullscreen,
    togglePip,
  } = useMediaFullscreen({ containerRef, videoRef });
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
    icon: "play" | "pause" | "volume" | "mute" | "seek";
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

  const isMutedRef = useRef(isMuted);

  const TV_STREAM_PROXY_ENDPOINT =
    process.env.NEXT_PUBLIC_TV_PROXY_URL?.trim() ||
    process.env.NEXT_PUBLIC_STREAM_PROXY_URL?.trim() ||
    "/api/live-tv/proxy";

  const getStreamUrl = (url: string) => {
    if (!url) return "";
    let cleanUrl = url.trim();
    // Nâng cấp http sang https nếu domain hỗ trợ HTTPS
    if (
      cleanUrl.startsWith("http://") &&
      /fptplay|akamaized|cloudfront|vtv|cdn|vietnam|vnns|losartang|miekgo|msdht|monarch|byteark|fastly|splay|dethich|thvl|xoilac|vebo|tiengruoi|cakhia|mitom|thevang|thapcam|90phut/i.test(cleanUrl)
    ) {
      cleanUrl = cleanUrl.replace(/^http:\/\//i, "https://");
    }

    // Nếu là domain không hỗ trợ CORS cho trình duyệt (như vnns.net, dethich.pw) -> ưu tiên bọc qua proxy luôn để phát mượt mà không bị lỗi CORS
    if (cleanUrl.startsWith("https://") && /vnns\.net|dethich\.pw/i.test(cleanUrl)) {
      return `${TV_STREAM_PROXY_ENDPOINT}?url=${encodeURIComponent(cleanUrl)}`;
    }

    // Nếu là HTTPS -> phát trực tiếp từ trình duyệt để tối ưu độ trễ
    if (cleanUrl.startsWith("https://")) {
      return cleanUrl;
    }

    // Nếu là link HTTP thuần trên trang HTTPS -> Bắt buộc bọc qua Proxy để tránh Mixed Content
    if (cleanUrl.startsWith("http://")) {
      return `${TV_STREAM_PROXY_ENDPOINT}?url=${encodeURIComponent(cleanUrl)}`;
    }
    return cleanUrl;
  };

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume, volumeRef]);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Hiển thị visual feedback overlay tạm thời
  const triggerActionFeedback = useCallback(
    (
      icon: "play" | "pause" | "volume" | "mute" | "seek",
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
    setCurrentPage(1);
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

  const totalPages = Math.max(
    1,
    Math.ceil(filteredChannels.length / INITIAL_PAGE_SIZE),
  );
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const displayedChannels = useMemo(() => {
    const startIndex = (safePage - 1) * INITIAL_PAGE_SIZE;
    return filteredChannels.slice(startIndex, startIndex + INITIAL_PAGE_SIZE);
  }, [filteredChannels, safePage]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    if (channelGridTopRef.current) {
      const topOffset =
        channelGridTopRef.current.getBoundingClientRect().top +
        window.scrollY -
        100;
      window.scrollTo({ top: Math.max(0, topOffset), behavior: "smooth" });
    }
  }, []);

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
          70;
        window.scrollTo({ top: Math.max(0, topOffset), behavior: "smooth" });
      }
    },
    [triggerActionFeedback, setIsMuted, userMutedRef],
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
  }, [isActive, setIsPip]);

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

  // Khởi tạo luồng phát HLS với Resilient Fallback Engine + Session ID Guard + Clean Teardown
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedTvChannel?.url || !isActive) return;

    // Tăng session ID để vô hiệu hóa mọi callback / async handler của kênh cũ
    const sessionId = ++playbackSessionIdRef.current;

    setIsLoading(true);
    setHasError(false);
    setErrorMessage("");

    const channelWithFallback = selectedTvChannel as TvChannel & {
      fallback_url?: string;
      fallbackUrl?: string;
    };
    const fallbackUrl =
      channelWithFallback.fallback_url || channelWithFallback.fallbackUrl;

    // Xây dựng danh sách ứng viên (candidate URLs) theo thứ tự ưu tiên
    const candidateUrls: string[] = [];
    const directPrimary = getStreamUrl(selectedTvChannel.url);
    if (directPrimary) candidateUrls.push(directPrimary);

    // Nếu nguồn chính là direct HTTPS nhưng nghi ngờ CORS (ví dụ vnns.net, dethich.pw), chuẩn bị proxy
    if (
      directPrimary.startsWith("https://") &&
      !directPrimary.includes(TV_STREAM_PROXY_ENDPOINT) &&
      /vnns\.net|dethich\.pw/i.test(directPrimary)
    ) {
      candidateUrls.push(`${TV_STREAM_PROXY_ENDPOINT}?url=${encodeURIComponent(selectedTvChannel.url)}`);
    }

    // Nguồn dự phòng nếu có
    if (fallbackUrl && fallbackUrl !== selectedTvChannel.url) {
      const directFallback = getStreamUrl(fallbackUrl);
      if (directFallback && !candidateUrls.includes(directFallback)) {
        candidateUrls.push(directFallback);
      }
      // Nếu fallback là vnns.net, dethich.pw hoặc domain cần proxy
      if (
        directFallback.startsWith("https://") &&
        !directFallback.includes(TV_STREAM_PROXY_ENDPOINT) &&
        /vnns\.net|dethich\.pw/i.test(directFallback)
      ) {
        const proxyFallback = `${TV_STREAM_PROXY_ENDPOINT}?url=${encodeURIComponent(fallbackUrl)}`;
        if (!candidateUrls.includes(proxyFallback)) {
          candidateUrls.push(proxyFallback);
        }
      }
    }

    let candidateIndex = 0;

    const stopAndTeardown = () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
      if (hlsRef.current) {
        try {
          hlsRef.current.stopLoad();
          hlsRef.current.detachMedia();
          hlsRef.current.destroy();
        } catch {}
        hlsRef.current = null;
      }
      if (videoRef.current) {
        try {
          videoRef.current.pause();
          videoRef.current.removeAttribute("src");
          videoRef.current.load();
        } catch {}
      }
    };

    const tryNextCandidate = (reason: string) => {
      if (playbackSessionIdRef.current !== sessionId) return;

      candidateIndex += 1;
      if (candidateIndex < candidateUrls.length) {
        console.warn(`[LiveTvClient] Switching to candidate source #${candidateIndex + 1} (${reason})`);
        startHls(candidateUrls[candidateIndex]);
      } else {
        // Hết toàn bộ nguồn phát khả dụng
        stopAndTeardown();
        setIsLoading(false);
        setHasError(true);
        setErrorMessage(
          "Kênh tạm thời gián đoạn hoặc tất cả nguồn phát đang bảo trì. Vui lòng bấm thử lại hoặc chọn kênh khác.",
        );
      }
    };

    const startHls = (sourceUrl: string) => {
      if (!videoRef.current || playbackSessionIdRef.current !== sessionId) return;

      stopAndTeardown();
      lastLoadedUrlRef.current = sourceUrl;

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

        // Đặt timeout 7 giây cho mỗi lần thử nguồn
        loadTimeoutRef.current = setTimeout(() => {
          if (playbackSessionIdRef.current !== sessionId || hlsRef.current !== hls) return;
          tryNextCandidate("Timeout 7s without manifest/playback");
        }, 7000);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (playbackSessionIdRef.current !== sessionId) return;
          if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);

          hls.currentLevel = -1;
          hls.loadLevel = -1;
          hls.nextLevel = -1;
          setIsLoading(false);
          setHasError(false);
          video.volume = volumeRef.current || 0.9;
          video.muted = userMutedRef.current;

          if (isActive && !userPausedRef.current) {
            video
              .play()
              .then(() => {
                if (playbackSessionIdRef.current !== sessionId) return;
                setIsPlaying(true);
                setIsMuted(video.muted || video.volume === 0);
              })
              .catch(() => {
                if (playbackSessionIdRef.current !== sessionId) return;
                video.muted = true;
                setIsMuted(true);
                video
                  .play()
                  .then(() => {
                    if (playbackSessionIdRef.current !== sessionId) return;
                    setIsPlaying(true);
                    setIsMuted(true);
                  })
                  .catch(() => {});
              });
          }
        });

        // Theo dõi segment error liên tục
        let consecutiveFragErrors = 0;
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (playbackSessionIdRef.current !== sessionId) return;

          // Bắt lỗi non-fatal segment liên tục (ví dụ: master 200 nhưng segment trả về 403)
          if (data.details === Hls.ErrorDetails.FRAG_LOAD_ERROR) {
            const status = (data.response as { code?: number })?.code;
            if (status === 403 || status === 404 || status === 410) {
              consecutiveFragErrors += 1;
              if (consecutiveFragErrors >= 2) {
                tryNextCandidate(`Segment returned HTTP ${status}`);
                return;
              }
            }
          }

          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              const status = (data.response as { code?: number })?.code;

              // Nếu là fatal network error (kể cả HTTP 401/403/404 hoặc CORS): thử proxy trước khi bỏ cuộc
              if (
                !sourceUrl.includes(TV_STREAM_PROXY_ENDPOINT) &&
                sourceUrl.startsWith("https://")
              ) {
                const proxyUrl = `${TV_STREAM_PROXY_ENDPOINT}?url=${encodeURIComponent(sourceUrl)}`;
                if (!candidateUrls.includes(proxyUrl)) {
                  candidateUrls.splice(candidateIndex + 1, 0, proxyUrl);
                }
              }
              tryNextCandidate(status ? `Fatal network HTTP ${status}` : "Fatal network error");
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              try {
                hls.recoverMediaError();
              } catch {
                tryNextCandidate("Media decode recovery failed");
              }
            } else {
              tryNextCandidate("Fatal HLS error");
            }
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = sourceUrl;
        video.volume = volumeRef.current;
        video.muted = isMutedRef.current;

        video.addEventListener("loadedmetadata", () => {
          if (playbackSessionIdRef.current !== sessionId) return;
          setIsLoading(false);
          setHasError(false);
          if (isActive && !userPausedRef.current) {
            video
              .play()
              .then(() => {
                if (playbackSessionIdRef.current !== sessionId) return;
                setIsPlaying(true);
              })
              .catch(() => {});
          }
        });

        video.addEventListener("error", () => {
          if (playbackSessionIdRef.current !== sessionId) return;
          tryNextCandidate("Native HLS video error");
        });
      }
    };

    if (candidateUrls.length > 0) {
      startHls(candidateUrls[0]);
    } else {
      setIsLoading(false);
      setHasError(true);
      setErrorMessage("Không tìm thấy đường truyền hợp lệ cho kênh này.");
    }

    return () => {
      // Tăng session ID để mọi async callback đang chạy bị bỏ qua ngay lập tức
      playbackSessionIdRef.current += 1;
      stopAndTeardown();
    };
  }, [selectedTvChannel, isActive, setIsMuted, userMutedRef, volumeRef]);

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
      triggerActionFeedback("seek", "🔴 Về live");
      if (video.paused && !userPausedRef.current) {
        video.play().catch(() => {});
      }
    } else if (video.seekable && video.seekable.length > 0) {
      video.currentTime = Math.max(0, video.seekable.end(video.seekable.length - 1) - 1);
      setIsAtLiveEdge(true);
      setLiveLatency(0);
      triggerActionFeedback("seek", "🔴 Về live");
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
    triggerVolumeOsd(targetVol, false);
    try {
      localStorage.setItem("nanaflix_live_volume", String(targetVol));
    } catch {}
  }, [volume, isActive, triggerVolumeOsd, setIsMuted, setVolume, userMutedRef]);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      unmuteSound();
    } else {
      userMutedRef.current = true;
      setIsMuted(true);
      if (videoRef.current) videoRef.current.muted = true;
      triggerVolumeOsd(volume, true);
    }
  }, [isMuted, volume, unmuteSound, triggerVolumeOsd, setIsMuted, userMutedRef]);



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
        totalDelta > 0 ? `+${totalDelta}s` : `${totalDelta}s`,
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

  
  const channelDrawerMarkup = (
    <TvChannelDrawer
      isOpen={showChannelRail}
      onClose={() => setShowChannelRail(false)}
      useMobilePortal={useMobilePortal}
      selectedChannel={selectedTvChannel}
      channels={filteredChannels}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onSelectChannel={(ch) => handleSelectChannel(ch, false)}
      drawerListRef={drawerListRef}
      activeChannelRef={activeTvChannelRef}
    />
  );

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* 1. KHUNG TRÌNH PHÁT TRUYỀN HÌNH TRỰC TIẾP (TV CINEMA MODE) */}
      {selectedTvChannel ? (
        <div ref={playerRef} className="scroll-mt-20 space-y-2 sm:space-y-2.5 w-full min-w-0">
          {/* HEADER KÊNH ĐANG PHÁT - SLIM CINEMA HEADER */}
          <div className="keep-dark-cinema relative rounded-xl sm:rounded-2xl bg-gradient-to-r from-zinc-900/95 via-zinc-950/98 to-zinc-900/95 px-2.5 py-1.5 sm:px-4 sm:py-2 shadow-xl backdrop-blur-xl flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              {/* LOGO KÊNH COMPACT */}
              <div className="w-8 h-6 sm:w-9 sm:h-7 rounded-lg bg-zinc-900/90 p-0.5 flex items-center justify-center shadow-md flex-shrink-0 overflow-hidden">
                <TvChannelLogo
                  logo={selectedTvChannel.logo}
                  name={selectedTvChannel.name}
                  size="sm"
                />
              </div>

              {/* TÊN KÊNH & EQUALIZER */}
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <h2
                  className="text-xs sm:text-sm font-black text-white keep-white truncate"
                  style={{ color: "#ffffff" }}
                  title={selectedTvChannel.name}
                >
                  {selectedTvChannel.name}
                </h2>
                {isPlaying && <PlayingEqualizer />}
              </div>

              {/* HUY HIỆU GỌN GÀNG (Trực tiếp, Danh mục, Chất lượng) */}
              <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-netflix-red/20 text-netflix-red text-[9px] font-black animate-pulse whitespace-nowrap">
                  <Radio className="w-2.5 h-2.5" />
                  <span>Trực tiếp</span>
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-zinc-300 text-[9px] font-bold whitespace-nowrap">
                  {selectedTvChannel.category}
                </span>
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase whitespace-nowrap">
                  <Zap className="w-2 h-2 fill-emerald-400" />
                  <span>{selectedTvChannel.quality}</span>
                </span>
              </div>
            </div>

            {/* CỤM NÚT THAO TÁC: MỞ DANH SÁCH KÊNH + SAO CHÉP */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowChannelRail((prev) => !prev)}
                title={showChannelRail ? "Đóng danh sách kênh (C)" : "Mở danh sách kênh (C)"}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] sm:text-xs font-bold  transition cursor-pointer ${
                  showChannelRail
                    ? "bg-netflix-red text-white shadow-md shadow-black/50"
                    : "bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white "
                }`}
              >
                <Tv className="w-3 h-3 text-white" />
                <span className="hidden sm:inline">Danh sách kênh</span>
              </button>
              <Tooltip content="Sao chép link stream HLS" side="top" align="end">
                <button
                  type="button"
                  onClick={handleCopy}
                  aria-label="Sao chép link stream HLS"
                  className="p-1 sm:p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition cursor-pointer"
                >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                </button>
              </Tooltip>
            </div>
          </div>

          {/* KHUNG PHÁT VIDEO PLAYER (TỶ LỆ 16:9 THEO VIEWPORT THỰC TẾ) */}
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
            className={`relative w-full mx-auto bg-black transition-all duration-300 group select-none  outline-none focus:outline-none focus-visible:outline-none contain-paint isolate ${
              isFullscreen
                ? "fixed inset-0 z-50 w-full h-full max-w-none max-h-none rounded-none aspect-auto -none shadow-none p-0 m-0 overflow-hidden flex flex-col justify-center"
                : "aspect-video lg:max-h-[calc(100vh-172px)] lg:max-w-[calc((100vh-172px)*16/9)] rounded-2xl sm:rounded-3xl overflow-hidden  shadow-2xl"
            } ${isFullscreen && isPlaying && !showControls ? "cursor-none" : "cursor-default"}`}
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
                  className="group flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white text-[11px] font-bold tracking-wider shadow-md shadow-black/50 backdrop-blur-md transition hover:scale-105 active:scale-95 cursor-pointer select-none"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                  </span>
                  <span>Trực tiếp</span>
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
                  className="group flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-[11px] font-bold tracking-wider shadow-md shadow-black/50 backdrop-blur-md transition hover:scale-105 active:scale-95 cursor-pointer animate-pulse select-none"
                >
                  <RotateCcw className="w-3 h-3 group-hover:-rotate-90 transition-transform duration-300" />
                  <span>
                    {liveLatency > 0 ? `Về live (-${liveLatency}s)` : "Về live"}
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
                  className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white text-[11px] sm:text-xs font-black shadow-2xl backdrop-blur-md transition-transform hover:scale-105 active:scale-95 cursor-pointer shadow-black/60"
                >
                  <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse" />
                  <span>Bật tiếng</span>
                </button>
              </div>
            )}

            {/* PREMIUM YOUTUBE TOP PILL VOLUME OSD (ĐỒNG BỘ 100% VỚI MOVIE PLAYER) */}
            <VolumeOsdPill volumeOsd={volumeOsd} />

            {/* ACTION FEEDBACK OVERLAY (PLAY, PAUSE, CHANNEL SWITCH & CINEMA SEEK HUD) */}
            {actionFeedback && (
              <div className="absolute inset-0 flex items-center justify-center z-25 pointer-events-none">
                {actionFeedback.icon === "seek" ? (
                  actionFeedback.text?.startsWith("-") ? (
                    // CINEMA SEEK LEFT HUD (−10s)
                    <div
                      key={actionFeedback.text}
                      role="status"
                      aria-live="polite"
                      className="absolute left-6 sm:left-12 top-1/2 -translate-y-1/2 pointer-events-none z-30 animate-in fade-in zoom-in-95 slide-in-from-right-2 duration-150 motion-reduce:animate-none"
                    >
                      <div className="flex items-center gap-1 text-white font-bold text-xs sm:text-sm md:text-base tracking-tight select-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                        <span>{actionFeedback.text}</span>
                      </div>
                    </div>
                  ) : actionFeedback.text?.startsWith("+") ? (
                    // CINEMA SEEK RIGHT HUD (+10s)
                    <div
                      key={actionFeedback.text}
                      role="status"
                      aria-live="polite"
                      className="absolute right-6 sm:right-12 top-1/2 -translate-y-1/2 pointer-events-none z-30 animate-in fade-in zoom-in-95 slide-in-from-left-2 duration-150 motion-reduce:animate-none"
                    >
                      <div className="flex items-center gap-1 text-white font-bold text-xs sm:text-sm md:text-base tracking-tight select-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                        <span>{actionFeedback.text}</span>
                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                      </div>
                    </div>
                  ) : (
                    // Thông báo Live / Không có DVR - Thiết kế tinh tế chuẩn Movie Player
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/80 backdrop-blur-md shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-white">
                      <Radio className="w-3.5 h-3.5 text-netflix-red animate-pulse" />
                      <span className="text-xs sm:text-sm font-semibold text-zinc-200 tracking-wide">
                        {actionFeedback.text || "Đang phát trực tiếp"}
                      </span>
                    </div>
                  )
                ) : actionFeedback.icon === "play" || actionFeedback.icon === "pause" ? (
                  <div className="hidden md:flex absolute inset-0 items-center justify-center pointer-events-none z-30">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/60 backdrop-blur-xl text-white flex items-center justify-center shadow-2xl animate-in fade-in zoom-in-75 duration-150">
                      {actionFeedback.icon === "play" ? (
                        <YouTubePlayIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white ml-0.5" />
                      ) : (
                        <YouTubePauseIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* LOADING SPINNER - CINEMA STYLE TINH TẾ */}
            {isLoading && !hasError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-20 pointer-events-none animate-in fade-in duration-150">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-white/20 border-t-netflix-red animate-spin mb-3 shadow-lg" />
                <p className="text-xs sm:text-sm font-medium text-zinc-300 tracking-wide">
                  Đang kết nối tín hiệu...
                </p>
              </div>
            )}

            {/* THÔNG BÁO LỖI KHI MẤT TÍN HIỆU */}
            {hasError && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/95 p-4 sm:p-6 text-center z-20"
              >
                <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <h4 className="text-base sm:text-lg font-bold text-white mb-1">
                  Kênh tạm thời gián đoạn tín hiệu
                </h4>
                <p className="text-xs sm:text-sm text-zinc-400 max-w-md mb-5 leading-relaxed">
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
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Thử tải lại</span>
                  </button>
                </div>
              </div>
            )}

            {/* 2. CENTER PLAYBACK CONTROLS CHO MOBILE (GỌN GÀNG, DUY NHẤT 1 NÚT PLAY/PAUSE, KHÔNG RÁC ICON) */}
            {showControls && !isLoading && !hasError && (
              <div className="md:hidden absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-20">
                {/* Play/Pause chính giữa */}
                <button
                  type="button"
                  data-player-control="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                    resetControlsTimeout();
                  }}
                  aria-label={isPlaying ? "Tạm dừng" : "Phát"}
                  className="pointer-events-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/60 hover:bg-black/75 active:scale-95 text-white flex items-center justify-center shadow-2xl backdrop-blur-md transition-transform duration-150 cursor-pointer outline-none touch-manipulation"
                >
                  {isPlaying ? (
                    <YouTubePauseIcon className="w-7 h-7 sm:w-8 sm:h-8" />
                  ) : (
                    <YouTubePlayIcon className="w-7 h-7 sm:w-8 sm:h-8 ml-0.5" />
                  )}
                </button>
              </div>
            )}

            {/* THANH ĐIỀU KHIỂN DƯỚI ĐÁY */}
            <div
              data-live-controls
              onClick={(e) => e.stopPropagation()}
              className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-2.5 sm:p-4 pt-6 sm:pt-8 flex items-center justify-between gap-1 sm:gap-2 z-30 transition-opacity duration-300 text-white select-none ${
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
              {/* CỤM TRÁI: DESKTOP PLAYBACK (TUA LÙI 10S + PLAY/PAUSE + TUA TỚI 10S) + ÂM LƯỢNG */}
              <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 shrink-0">
                {/* Tua & Play/Pause dưới đáy - CHỈ HIỆN TRÊN DESKTOP, TRÁNH TRÙNG LẶP RÁC ICON TRÊN MOBILE */}
                <div className="hidden sm:flex items-center gap-1 sm:gap-1.5">
                  {/* Nút Tua lùi 10s */}
                  <Tooltip content="Tua lùi 10 giây" shortcut="←" side="top">
                    <button
                      type="button"
                      data-player-control="true"
                      onClick={() => handleSeek(-10)}
                      aria-label="Tua lùi 10 giây"
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/15 active:scale-90 text-zinc-300 hover:text-white flex items-center justify-center transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/40 touch-manipulation"
                    >
                      <YouTubeSeek10BackIcon className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                    </button>
                  </Tooltip>

                  {/* Nút Play / Pause trung tâm */}
                  <Tooltip content={isPlaying ? "Tạm dừng" : "Phát"} shortcut="Space" side="top">
                    <button
                      type="button"
                      data-player-control="true"
                      onClick={togglePlay}
                      aria-label={isPlaying ? "Tạm dừng" : "Phát"}
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/15 active:scale-90 text-white flex items-center justify-center transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/40 touch-manipulation"
                    >
                      {isPlaying ? (
                        <YouTubePauseIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                      ) : (
                        <YouTubePlayIcon className="w-5 h-5 sm:w-6 sm:h-6 ml-0.5" />
                      )}
                    </button>
                  </Tooltip>

                  {/* Nút Tua tới 10s */}
                  <Tooltip content="Tua tới 10 giây" shortcut="→" side="top">
                    <button
                      type="button"
                      data-player-control="true"
                      onClick={() => handleSeek(10)}
                      aria-label="Tua tới 10 giây"
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/15 active:scale-90 text-zinc-300 hover:text-white flex items-center justify-center transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/40 touch-manipulation"
                    >
                      <YouTubeSeek10ForwardIcon className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                    </button>
                  </Tooltip>
                </div>

                {/* CỤM VOLUME TRÊN MOBILE (Chỉ hiện nút Mute nhỏ gọn) */}
                <button
                  type="button"
                  data-player-control="true"
                  onClick={toggleMute}
                  aria-label={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
                  className="w-9 h-9 sm:hidden rounded-full hover:bg-white/15 active:scale-90 flex items-center justify-center text-white transition cursor-pointer shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-white/40 touch-manipulation"
                >
                  {isMuted || volume === 0 ? (
                    <YouTubeVolumeMuteIcon className="w-5 h-5 text-netflix-red" />
                  ) : volume < 0.5 ? (
                    <YouTubeVolumeLowIcon className="w-5 h-5 text-white" />
                  ) : (
                    <YouTubeVolumeHighIcon className="w-5 h-5 text-white" />
                  )}
                </button>

                {/* CỤM ÂM LƯỢNG YOUTUBE (Hover nở thanh kéo trượt mượt mà chuẩn Movie Player) */}
                <div className="hidden sm:flex items-center group/vol shrink-0">
                  <Tooltip content={isMuted ? "Bật âm thanh" : "Tắt âm thanh"} shortcut="M" side="top">
                    <button
                      type="button"
                      data-player-control="true"
                      onClick={toggleMute}
                      aria-label={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/15 active:scale-90 text-white/90 hover:text-white flex items-center justify-center transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/40 touch-manipulation"
                    >
                    {isMuted || volume === 0 ? (
                      <YouTubeVolumeMuteIcon className="w-5 h-5 text-netflix-red" />
                    ) : volume < 0.5 ? (
                      <YouTubeVolumeLowIcon className="w-5 h-5 text-white" />
                    ) : (
                      <YouTubeVolumeHighIcon className="w-5 h-5 text-white" />
                    )}
                    </button>
                  </Tooltip>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) =>
                      handleVolumeChange(parseFloat(e.target.value))
                    }
                    aria-label="Âm lượng"
                    style={{
                      accentColor: "#ffffff",
                      background: `linear-gradient(to right, #ffffff ${isMuted ? 0 : Math.round(volume * 100)}%, rgba(255, 255, 255, 0.25) ${isMuted ? 0 : Math.round(volume * 100)}%)`,
                    }}
                    className="w-0 opacity-0 group-hover/vol:w-16 sm:group-hover/vol:w-20 md:group-hover/vol:w-24 group-hover/vol:opacity-100 group-focus-within/vol:w-16 sm:group-focus-within/vol:w-20 md:group-focus-within/vol:w-24 group-focus-within/vol:opacity-100 transition-all duration-200 ease-out accent-white h-1 rounded-full cursor-pointer hidden sm:inline-block outline-none"
                  />
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
                <Tooltip content="Xem thu nhỏ góc màn hình (PiP)" shortcut="I" side="top">
                  <button
                    type="button"
                    data-player-control="true"
                    onClick={togglePip}
                    aria-label="Xem thu nhỏ góc màn hình"
                    className={`w-9 h-9 sm:w-10 sm:h-10 hidden sm:flex rounded-full items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                      isPip
                        ? "bg-netflix-red text-white"
                        : "text-zinc-300 hover:text-white hover:bg-white/15"
                    }`}
                  >
                    <YouTubeMiniplayerIcon className="w-5 h-5" />
                  </button>
                </Tooltip>

                {/* Nút Toàn màn hình */}
                <Tooltip content={isFullscreen ? "Thu nhỏ" : "Toàn màn hình"} shortcut="F" side="top" align="end">
                  <button
                    type="button"
                    data-player-control="true"
                    onClick={toggleFullscreen}
                    aria-label={isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/15 active:scale-90 text-white flex items-center justify-center transition cursor-pointer shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-white/40 touch-manipulation"
                  >
                    {isFullscreen ? (
                      <YouTubeExitFullscreenIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                    ) : (
                      <YouTubeFullscreenIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                    )}
                  </button>
                </Tooltip>
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
          <span className="text-xs font-extrabold text-zinc-300 flex items-center gap-1.5 uppercase tracking-wider">
            <Flame className="w-3.5 h-3.5 text-netflix-red" />
            <span>Kênh Phổ Biến</span>
          </span>
        </div>

        <div className="relative group/popular">
          <button
            type="button"
            onClick={() => scrollPopular("left")}
            className="absolute -left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-zinc-900/95 hover:bg-white text-zinc-300 hover:text-black shadow-lg flex items-center justify-center transition-all opacity-80 hover:opacity-100 backdrop-blur-md cursor-pointer"
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
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl  transition-all flex-none cursor-pointer focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:outline-none ${
                    isSelected
                      ? "bg-netflix-red text-white  shadow-md shadow-black/50 scale-102 font-bold"
                      : "bg-zinc-900/90 text-zinc-300  hover: hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  <div className="w-7 h-5 sm:w-8 sm:h-6 rounded-md bg-zinc-950/90 p-0.5 flex items-center justify-center overflow-hidden flex-shrink-0">
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
            className="absolute -right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-zinc-900/95 hover:bg-white text-zinc-300 hover:text-black shadow-lg flex items-center justify-center transition-all opacity-80 hover:opacity-100 backdrop-blur-md cursor-pointer"
            title="Cuộn phải"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. BỘ CHỌN KÊNH TRUYỀN HÌNH ĐA THIẾT BỊ (RESPONSIVE 2 CỘT CHO DESKTOP + HORIZONTAL TABS CHO MOBILE) */}
      <div className="pt-2">
        {/* MOBILE & TABLET (< lg): THANH CUỘN NGANG TABS DANH MỤC */}
        <div className="lg:hidden space-y-3 mb-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5 min-w-0 shrink">
              <span className="whitespace-nowrap">Đài truyền hình</span>
              <span className="text-[11px] sm:text-xs px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 font-semibold whitespace-nowrap shrink-0">
                {filteredChannels.length} kênh
              </span>
            </h2>
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/* Lọc FHD */}
              <button
                type="button"
                onClick={() => setOnlyFhd((prev) => !prev)}
                className={`flex items-center gap-1 px-2.5 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition  cursor-pointer whitespace-nowrap ${
                  onlyFhd
                    ? "bg-emerald-600 text-white "
                    : "bg-zinc-900 text-zinc-300  hover:text-white"
                }`}
              >
                <Zap className="w-3 h-3 fill-current" />
                <span>FHD</span>
              </button>
              {/* Grid / List */}
              <div className="flex items-center p-0.5 rounded-xl bg-zinc-900 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition ${
                    viewMode === "grid"
                      ? "bg-white text-black shadow-sm"
                      : "text-zinc-400"
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-lg transition ${
                    viewMode === "list"
                      ? "bg-white text-black shadow-sm"
                      : "text-zinc-400"
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Ô tìm kiếm mobile */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên kênh (VTV3, HTV7, THVL...)"
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-zinc-900 text-xs text-white placeholder-zinc-500 focus:outline-none focus:"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Tabs cuộn ngang Mobile */}
          <div className="relative group/carousel">
            <button
              type="button"
              onClick={() => scrollCategories("left")}
              className="absolute -left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-zinc-900/95 hover:bg-white text-zinc-300 hover:text-black shadow-lg flex items-center justify-center transition-all opacity-80 backdrop-blur-md cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <div
              ref={categoryScrollRef}
              className="flex items-center gap-1.5 overflow-x-auto py-1 px-3 scroll-smooth scrollbar-none [&::-webkit-scrollbar]:hidden"
            >
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1  cursor-pointer ${
                  selectedCategory === "all"
                    ? "bg-white text-black  shadow-md font-extrabold"
                    : "bg-zinc-900/90 text-zinc-300  hover:text-white"
                }`}
              >
                <span>📺 Tất cả</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-current font-black">
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1  cursor-pointer ${
                      isSelected
                        ? "bg-netflix-red text-white shadow-md shadow-black/50"
                        : "bg-zinc-900/90 text-zinc-300  hover:text-white"
                    }`}
                  >
                    <span>{emoji}</span>
                    <span>{cat.replace("Kênh ", "")}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/15 text-current font-black">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => scrollCategories("right")}
              className="absolute -right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-zinc-900/95 hover:bg-white text-zinc-300 hover:text-black shadow-lg flex items-center justify-center transition-all opacity-80 backdrop-blur-md cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* CONTAINER CHÍNH: DESKTOP SIDEBAR + LƯỚI KÊNH */}
        <div className="flex flex-col lg:flex-row items-start gap-6">
          {/* DESKTOP SIDEBAR (>= lg) */}
          <aside className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 space-y-3 sticky top-20 rounded-2xl bg-zinc-950/90 p-3.5 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center justify-between pb-2.5 px-1">
              <div className="flex items-center gap-2">
                <Tv className="w-4 h-4 text-netflix-red" />
                <h3 className="text-xs font-black uppercase tracking-wider text-white">
                  Danh mục đài TV
                </h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 font-bold">
                {channels.length} kênh
              </span>
            </div>

            {/* Ô tìm kiếm trong sidebar */}
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kênh theo tên..."
                className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-zinc-900/90 text-xs text-white placeholder-zinc-500 focus:outline-none focus: transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Danh sách danh mục dạng dọc */}
            <div className="space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto pr-1 scrollbar-thin">
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all  text-left cursor-pointer ${
                  selectedCategory === "all"
                    ? "bg-netflix-red text-white shadow-md shadow-black/50"
                    : " text-zinc-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">📺</span>
                  <span>Tất cả kênh</span>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                    selectedCategory === "all"
                      ? "bg-black/30 text-white"
                      : "bg-white/10 text-zinc-400"
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
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all  text-left cursor-pointer ${
                      isSelected
                        ? "bg-netflix-red text-white shadow-md shadow-black/50"
                        : " text-zinc-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="text-sm flex-shrink-0">{emoji}</span>
                      <span className="truncate">{cat.replace("Kênh ", "")}</span>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-black flex-shrink-0 ${
                        isSelected
                          ? "bg-black/30 text-white"
                          : "bg-white/10 text-zinc-400"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* CỘT PHẢI: LƯỚI KÊNH & TOOLBAR */}
          <div ref={channelGridTopRef} className="flex-1 min-w-0 space-y-4 w-full scroll-mt-24">
            {/* Header thanh công cụ Desktop */}
            <div className="hidden lg:flex items-center justify-between pb-3">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>
                    {selectedCategory === "all"
                      ? "📺 Tất cả kênh truyền hình"
                      : `${getCategoryEmoji(selectedCategory)} ${selectedCategory}`}
                  </span>
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-netflix-red/20 text-netflix-red font-bold">
                  {filteredChannels.length} kênh
                </span>
                {totalPages > 1 && (
                  <span className="text-xs text-zinc-400 font-medium">
                    (Trang {safePage}/{totalPages})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* LỌC NHANH FHD */}
                <button
                  type="button"
                  onClick={() => setOnlyFhd((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition  shadow-sm cursor-pointer whitespace-nowrap focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:outline-none ${
                    onlyFhd
                      ? "bg-emerald-600 text-white  shadow-md shadow-black/50"
                      : "bg-zinc-900/90 text-zinc-300  hover: hover:text-white"
                  }`}
                >
                  <Zap className="w-3 h-3 fill-current" />
                  <span>Chỉ FHD</span>
                </button>

                {/* NÚT CHUYỂN CHẾ ĐỘ XEM: GRID HOẶC LIST */}
                <div className="flex items-center p-1 rounded-xl bg-zinc-900">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    title="Xem dạng lưới"
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      viewMode === "grid"
                        ? "bg-white text-black shadow-sm"
                        : "text-zinc-400 hover:text-white"
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
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* DANH SÁCH KÊNH (GRID HOẶC LIST) */}
            <TvChannelGrid
              viewMode={viewMode}
              displayedChannels={displayedChannels}
              filteredChannelsCount={filteredChannels.length}
              selectedTvChannel={selectedTvChannel}
              isPlaying={isPlaying}
              safePage={safePage}
              totalPages={totalPages}
              onSelectChannel={handleSelectChannel}
              onPageChange={handlePageChange}
              hasActiveFilters={hasActiveFilters}
              onResetFilters={handleResetFilters}
            />
          </div>
        </div>
      </div>
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
          -radius: 0 !important;
          : none !important;
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
        @media (hover: none), (pointer: coarse), (max-height: 550px), (max-width: 1023px) {
          .live-shortcut-popover {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default LiveTvClient;
