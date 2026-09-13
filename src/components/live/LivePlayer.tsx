"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
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
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  List,
} from "lucide-react";
import { FootballMatch, StreamServer } from "@/services/liveFootballService";
import { useMatchReminders } from "@/hooks/useMatchReminders";

// Logo hiển thị trong drawer danh sách kênh & trận đấu
function MatchRailLogo({ option }: { option: FootballMatch }) {
  const [error, setError] = useState(false);
  const logo = option.logo || option.homeLogo;

  if (logo && !error && !logo.includes("tinhlagi.pro/logo.jpg")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo}
        alt={option.title}
        className="w-full h-full object-contain filter drop-shadow-sm"
        loading="lazy"
        decoding="async"
        onError={() => setError(true)}
      />
    );
  }

  if (option.group.includes("FPT")) {
    return (
      <span className="text-[10px] font-black text-orange-400 font-mono">FPT</span>
    );
  }

  if (option.isEvent || option.time === "24/7") {
    return <Tv className="w-4 h-4 text-sky-400" />;
  }

  return <Radio className="w-4 h-4 text-rose-400" />;
}

// Equalizer hoạt ảnh cho kênh đang phát sóng
function PlayingEqualizer() {
  return (
    <div className="flex items-end gap-0.5 h-3 px-1">
      <span className="w-0.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s] h-3" />
      <span className="w-0.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s] h-2" />
      <span className="w-0.5 bg-emerald-400 rounded-full animate-bounce h-3" />
    </div>
  );
}

interface LivePlayerProps {
  match?: FootballMatch;
  title: string;
  servers: StreamServer[];
  blv?: string;
  time?: string;
  group?: string;
  team1?: string;
  team2?: string;
  isEvent?: boolean;
  homeLogo?: string;
  awayLogo?: string;
  logo?: string;
  isActive?: boolean;
  matchOptions?: FootballMatch[];
  showMatchRail?: boolean;
  onToggleMatchRail?: () => void;
  onCloseMatchRail?: () => void;
  onSelectMatch?: (match: FootballMatch) => void;
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
  isEvent = match?.isEvent,
  homeLogo = match?.homeLogo,
  awayLogo = match?.awayLogo,
  isActive = true,
  matchOptions = [],
  showMatchRail = false,
  onToggleMatchRail,
  onCloseMatchRail,
  onSelectMatch,
}: LivePlayerProps) {
  const { isReminded, addReminder, removeReminder } = useMatchReminders();
  const matchId = match?.id;
  const isCurrentlyReminded = matchId ? isReminded(matchId) : false;
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const actionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userPausedRef = useRef<boolean>(false);
  const lastLoadedUrlRef = useRef<string>("");
  const retryCountRef = useRef<number>(0);
  const fallbackCountRef = useRef<number>(0);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
  const [showControls, setShowControls] = useState(false);
  const [showAllServers, setShowAllServers] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    icon: "play" | "pause" | "volume" | "mute" | "server" | "match" | "seek";
    text?: string;
  } | null>(null);

  // Trạng thái drawer danh sách kênh & trận đấu (như bên Truyền hình)
  const [internalMatchRail, setInternalMatchRail] = useState(false);
  const [railSearch, setRailSearch] = useState("");
  const [railFilter, setRailFilter] = useState<"all" | "live" | "fpt">("all");

  const isRailVisible =
    showMatchRail !== undefined ? showMatchRail : internalMatchRail;

  const toggleRail = useCallback(() => {
    if (onToggleMatchRail) {
      onToggleMatchRail();
    } else {
      setInternalMatchRail((prev) => !prev);
    }
  }, [onToggleMatchRail]);

  const closeRail = useCallback(() => {
    if (onCloseMatchRail) {
      onCloseMatchRail();
    } else {
      setInternalMatchRail(false);
    }
  }, [onCloseMatchRail]);

  const liveOptionsCount = useMemo(() => {
    return matchOptions.filter((m) => m.timeline === "live").length;
  }, [matchOptions]);

  const filteredRailOptions = useMemo(() => {
    let list = matchOptions;
    if (railFilter === "live") {
      list = list.filter((m) => m.timeline === "live");
    } else if (railFilter === "fpt") {
      list = list.filter(
        (m) =>
          m.group.includes("FPT") ||
          m.servers.some((s) => s.url.includes("fptplay")),
      );
    }
    if (railSearch.trim()) {
      const q = railSearch.toLowerCase().trim();
      list = list.filter((m) => {
        const inTitle = m.title.toLowerCase().includes(q);
        const inTeam1 = m.team1.toLowerCase().includes(q);
        const inTeam2 = m.team2.toLowerCase().includes(q);
        const inBlv = m.blv?.toLowerCase().includes(q);
        const inGroup = m.group.toLowerCase().includes(q);
        return inTitle || inTeam1 || inTeam2 || inBlv || inGroup;
      });
    }
    return list;
  }, [matchOptions, railFilter, railSearch]);

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
  const userMutedRef = useRef<boolean>(false);

  // Hiển thị visual feedback overlay tạm thời
  const triggerActionFeedback = useCallback(
    (
      icon: "play" | "pause" | "volume" | "mute" | "server" | "match" | "seek",
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

  // Tự động chuyển đổi link FLV sang HLS nếu nhà đài hỗ trợ
  const toPlayableHlsUrl = (url: string): string => {
    if (!url) return "";
    if (url.includes("lauthaitv.cc") && url.includes(".flv")) {
      return url
        .replace("flv.lauthaitv.cc", "hls.lauthaitv.cc")
        .replace(/\.flv(\?.*)?$/i, "/index.m3u8$1");
    }
    if (url.includes(".flv")) {
      return url.replace(/\.flv(\?.*)?$/i, ".m3u8$1");
    }
    return url;
  };

  // Tạo URL tối ưu: Direct-first cho HTTPS (tránh bị 403 Vercel Proxy) & Proxy cho HTTP (tránh Mixed Content)
  const getStreamUrl = (rawUrl: string, isHls: boolean) => {
    if (!rawUrl) return "";
    const playableUrl = toPlayableHlsUrl(rawUrl).trim();
    let finalUrl = playableUrl;
    // Nâng cấp http sang https nếu domain hỗ trợ HTTPS
    if (
      finalUrl.startsWith("http://") &&
      /fptplay|akamaized|cloudfront|vtv|cdn|vietnam/i.test(finalUrl)
    ) {
      finalUrl = finalUrl.replace(/^http:\/\//i, "https://");
    }

    const finalIsHls = isHls || finalUrl.includes(".m3u8");
    if (finalIsHls) {
      // Ưu tiên phát trực tiếp từ trình duyệt cho các link HTTPS
      if (finalUrl.startsWith("https://")) {
        return finalUrl;
      }
      // Link HTTP thuần cần qua Proxy để không bị chặn Mixed Content trên trang HTTPS
      if (finalUrl.startsWith("http://")) {
        return `/api/live-football/proxy?url=${encodeURIComponent(finalUrl)}`;
      }
    }
    return finalUrl;
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

  // Xử lý khi tab thay đổi (isActive true/false) hoặc minimize tab
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

  // Khởi tạo luồng phát HLS tối ưu độ trễ thấp (Ultra Low Latency) + Auto Recovery
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentServer) return;

    if (activeUrl === lastLoadedUrlRef.current && hlsRef.current) {
      return;
    }

    lastLoadedUrlRef.current = activeUrl;
    userPausedRef.current = false;
    retryCountRef.current = 0;
    setIsLoading(true);
    setHasError(false);
    setErrorMessage("");

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const effectiveUrl = toPlayableHlsUrl(currentServer.url);
    const isEffectiveHls =
      currentServer.isHls || effectiveUrl.includes(".m3u8");

    if (!isEffectiveHls && currentServer.format === "flv") {
      const nextHlsIdx = servers.findIndex(
        (s, idx) =>
          idx !== selectedServerIndex &&
          (s.isHls || toPlayableHlsUrl(s.url).includes(".m3u8")),
      );
      if (nextHlsIdx !== -1) {
        setSelectedServerIndex(nextHlsIdx);
        return;
      }

      setIsLoading(false);
      setHasError(true);
      setErrorMessage(
        "Định dạng này cần mở bằng ứng dụng ngoài (VLC/PotPlayer). Hãy chọn máy chủ HLS khác để xem trực tiếp trên Web!",
      );
      return;
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
      });

      hlsRef.current = hls;
      hls.loadSource(activeUrl);
      hls.attachMedia(video);
      loadTimeoutRef.current = setTimeout(() => {
        if (hlsRef.current !== hls) return;
        if (fallbackCountRef.current < servers.length - 1) {
          const nextServerIndex = servers.findIndex(
            (_, index) => index > selectedServerIndex,
          );
          if (nextServerIndex !== -1) {
            fallbackCountRef.current += 1;
            setSelectedServerIndex(nextServerIndex);
            return;
          }
        }
        hls.destroy();
        hlsRef.current = null;
        setIsLoading(false);
        setHasError(true);
        setErrorMessage(
          "Nguồn chưa phát hoặc không phản hồi sau 12 giây. Hãy thử đổi máy chủ khác.",
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
        const curVol = volumeRef.current || 0.9;
        video.volume = curVol;
        video.muted = userMutedRef.current;

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

      let hasTriedProxy = activeUrl.includes("/api/live-football/proxy");

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              retryCountRef.current += 1;
              if (retryCountRef.current <= 2) {
                hls.startLoad();
              } else if (
                !hasTriedProxy &&
                activeUrl.startsWith("https://") &&
                !/fptplay(?:53)?\.net/i.test(activeUrl)
              ) {
                hasTriedProxy = true;
                hls.loadSource(`/api/live-football/proxy?url=${encodeURIComponent(activeUrl)}`);
                hls.startLoad();
              } else if (fallbackCountRef.current < servers.length - 1) {
                const nextServerIndex = servers.findIndex(
                  (_, index) => index > selectedServerIndex,
                );
                if (nextServerIndex !== -1) {
                  fallbackCountRef.current += 1;
                  setSelectedServerIndex(nextServerIndex);
                  return;
                }
                setIsLoading(false);
                setHasError(true);
                setErrorMessage(
                  "Không còn máy chủ phát khả dụng cho trận này. Hãy thử lại sau.",
                );
              } else {
                setIsLoading(false);
                setHasError(true);
                setErrorMessage(
                  "Tín hiệu gián đoạn hoặc trận đấu chưa bắt đầu. Hãy thử chuyển sang máy chủ khác.",
                );
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              if (fallbackCountRef.current < servers.length - 1) {
                const nextServerIndex = servers.findIndex(
                  (_, index) => index > selectedServerIndex,
                );
                if (nextServerIndex !== -1) {
                  fallbackCountRef.current += 1;
                  setSelectedServerIndex(nextServerIndex);
                  return;
                }
              }
              setIsLoading(false);
              setHasError(true);
              setErrorMessage(
                "Tín hiệu luồng phát tạm thời gián đoạn. Hãy thử đổi máy chủ khác hoặc mở bằng VLC.",
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
        if (isActive && !userPausedRef.current) {
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
        }
      });
      video.addEventListener("error", () => {
        setIsLoading(false);
        setHasError(true);
        setErrorMessage(
          "Không thể tải luồng phát trên trình duyệt này. Vui lòng đổi máy chủ hoặc mở bằng VLC.",
        );
      });
    }

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
  }, [selectedServerIndex, currentServer, activeUrl, isActive, servers]);

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

  // Bật tiếng
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

  // Bật / Tắt tiếng
  const toggleMute = useCallback(() => {
    if (isMuted) {
      unmuteSound();
    } else {
      userMutedRef.current = true;
      setIsMuted(true);
      if (videoRef.current) {
        videoRef.current.muted = true;
      }
      triggerActionFeedback("mute", "Tắt tiếng");
    }
  }, [isMuted, unmuteSound, triggerActionFeedback]);

  // Thay đổi âm lượng
  const handleVolumeChange = useCallback(
    (newVolume: number) => {
      const clamped = Math.max(0, Math.min(1, newVolume));
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
    } else {
      // Bật toàn màn hình
      if (container && container.requestFullscreen) {
        container.requestFullscreen().catch(() => {
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
      } else if (
        container &&
        (container as unknown as { webkitRequestFullscreen?: () => void })
          .webkitRequestFullscreen
      ) {
        (
          container as unknown as { webkitRequestFullscreen: () => void }
        ).webkitRequestFullscreen();
      } else if (
        container &&
        (container as unknown as { mozRequestFullScreen?: () => void })
          .mozRequestFullScreen
      ) {
        (
          container as unknown as { mozRequestFullScreen: () => void }
        ).mozRequestFullScreen();
      } else if (
        container &&
        (container as unknown as { msRequestFullscreen?: () => void })
          .msRequestFullscreen
      ) {
        (
          container as unknown as { msRequestFullscreen: () => void }
        ).msRequestFullscreen();
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
  }, [isFullscreen]);

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
    };

    const video = videoRef.current;
    const handleVideoBeginFs = () => setIsFullscreen(true);
    const handleVideoEndFs = () => setIsFullscreen(false);

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
  }, []);

  // Chuyển sang máy chủ tiếp theo / trước đó
  const handleSwitchServer = useCallback(
    (direction: "next" | "prev") => {
      if (servers.length <= 1) return;
      const targetIdx =
        direction === "next"
          ? (selectedServerIndex + 1) % servers.length
          : (selectedServerIndex - 1 + servers.length) % servers.length;
      setSelectedServerIndex(targetIdx);
      triggerActionFeedback(
        "server",
        `Máy chủ #${targetIdx + 1}: ${servers[targetIdx]?.name || ""}`,
      );
    },
    [servers, selectedServerIndex, triggerActionFeedback],
  );

  // Chuyển sang trận đấu / sự kiện thể thao tiếp theo hoặc trước đó
  const handleSwitchMatch = useCallback(
    (direction: "next" | "prev") => {
      if (!matchOptions || matchOptions.length <= 1 || !match) {
        handleSwitchServer(direction);
        return;
      }
      const currentIdx = matchOptions.findIndex(
        (m) =>
          m.id === match.id ||
          m.title.toLowerCase() === match.title.toLowerCase(),
      );
      let targetIdx = 0;
      if (currentIdx !== -1) {
        targetIdx =
          direction === "next"
            ? (currentIdx + 1) % matchOptions.length
            : (currentIdx - 1 + matchOptions.length) % matchOptions.length;
      }
      if (onSelectMatch && matchOptions[targetIdx]) {
        onSelectMatch(matchOptions[targetIdx]);
        triggerActionFeedback("match", matchOptions[targetIdx].title);
      }
    },
    [matchOptions, match, onSelectMatch, handleSwitchServer, triggerActionFeedback],
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

  // Phím tắt bàn phím (chỉ kích hoạt khi LivePlayer đang active)
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
        handleSwitchMatch("prev");
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        handleSwitchMatch("next");
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
      } else if (e.key === "l" || e.key === "L") {
        e.preventDefault();
        toggleRail();
      } else if (e.key === "Escape") {
        closeRail();
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
    handleVolumeChange,
    handleSwitchMatch,
    handleSeek,
    toggleRail,
    closeRail,
    volume,
  ]);

  const handleCopyStream = () => {
    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      currentServer
    ) {
      navigator.clipboard.writeText(currentServer.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openInVlc = () => {
    if (!currentServer) return;
    window.location.href = `vlc://${currentServer.url}`;
  };

  const VolumeIcon =
    isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className="space-y-4">
      {/* 1. SCOREBOARD HEADER SÂN CỎ ĐỈNH CAO: AMBIENT GLOW & HUY HIỆU CLB SẮC NÉT */}
      <div className="relative rounded-2xl sm:rounded-3xl border border-white/15 bg-gradient-to-b from-zinc-900/95 via-zinc-950/98 to-black p-3 sm:p-4 shadow-2xl overflow-hidden w-full min-w-0 backdrop-blur-xl">
        {/* Glow hiệu ứng sân vận động 2 bên */}
        <div className="pointer-events-none absolute -top-24 left-1/4 w-96 h-96 bg-red-600/15 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute -top-24 right-1/4 w-96 h-96 bg-sky-600/15 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
          {isEvent ? (
            <div className="flex-1 w-full flex flex-col items-center justify-center text-center py-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 rounded-full">
                  Kênh / Sự kiện
                </span>
                {time && time !== "Trực tiếp" && (
                  <span className="text-[10px] sm:text-xs font-bold text-gray-300 bg-white/10 px-2 py-0.5 rounded-full border border-white/10">
                    ⏰ {time}
                  </span>
                )}
              </div>
              <h2 className="mt-1 text-lg sm:text-2xl font-black text-white tracking-wide">
                {title}
              </h2>
            </div>
          ) : (
            <>
              {/* KHU VỰC 2 ĐỘI & HUY HIỆU CLB */}
              <div className="flex-1 w-full flex items-center justify-around sm:justify-center gap-2 sm:gap-4">
                {/* ĐỘI NHÀ (TEAM 1) */}
                <div className="flex flex-col items-center text-center max-w-[110px] sm:max-w-[150px] group">
                  <div className="w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-950 border-2 border-white/20 p-1.5 sm:p-2 flex items-center justify-center shadow-xl transition-all duration-300 group-hover:scale-105 group-hover:border-netflix-red/70 group-hover:shadow-red-950/60">
                    {!homeImgError &&
                    homeLogo &&
                    !homeLogo.includes("tinhlagi.pro/logo.jpg") ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={homeLogo}
                        alt={team1 || "Đội nhà"}
                        className="w-full h-full object-contain filter drop-shadow-xl"
                        onError={() => setHomeImgError(true)}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-base sm:text-xl font-black text-rose-400 tracking-wider">
                          {team1
                            ? team1
                                .replace(/^CLB\s+/i, "")
                                .replace(/^FC\s+/i, "")
                                .slice(0, 2)
                                .toUpperCase()
                            : "H"}
                        </span>
                        <span className="text-[7px] sm:text-[8px] uppercase tracking-widest text-gray-400 font-bold">
                          CLB
                        </span>
                      </div>
                    )}
                  </div>
                  <h3 className="mt-1 text-[11px] sm:text-xs font-black text-white line-clamp-1 leading-tight">
                    {team1}
                  </h3>
                </div>

                {/* TRUNG TÂM VS & THỜI GIAN TRẬN ĐẤU */}
                <div className="flex flex-col items-center flex-shrink-0 px-1 sm:px-2">
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-netflix-red/20 border border-netflix-red/40 text-netflix-red text-[9px] sm:text-[10px] font-black animate-pulse mb-0.5 sm:mb-1 shadow-sm">
                    <Radio className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span>TRỰC TIẾP</span>
                  </div>

                  <div className="px-2.5 py-0.5 rounded-lg bg-zinc-800/90 border border-white/15 text-xs sm:text-sm font-black text-rose-400 tracking-wider shadow-inner">
                    VS
                  </div>

                  {time && (
                    <span className="mt-1 text-[9px] sm:text-[10px] text-gray-300 font-semibold bg-white/10 px-1.5 py-0.5 rounded-full border border-white/10 whitespace-nowrap">
                      ⏰ {time}
                    </span>
                  )}
                </div>

                {/* ĐỘI KHÁCH (TEAM 2) */}
                <div className="flex flex-col items-center text-center max-w-[110px] sm:max-w-[150px] group">
                  <div className="w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-950 border-2 border-white/20 p-1.5 sm:p-2 flex items-center justify-center shadow-xl transition-all duration-300 group-hover:scale-105 group-hover:border-sky-500/70 group-hover:shadow-sky-950/60">
                    {!awayImgError &&
                    awayLogo &&
                    !awayLogo.includes("tinhlagi.pro/logo.jpg") ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={awayLogo}
                        alt={team2 || "Đội khách"}
                        className="w-full h-full object-contain filter drop-shadow-xl"
                        onError={() => setAwayImgError(true)}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-base sm:text-xl font-black text-sky-400 tracking-wider">
                          {team2
                            ? team2
                                .replace(/^CLB\s+/i, "")
                                .replace(/^FC\s+/i, "")
                                .slice(0, 2)
                                .toUpperCase()
                            : "A"}
                        </span>
                        <span className="text-[7px] sm:text-[8px] uppercase tracking-widest text-gray-400 font-bold">
                          CLB
                        </span>
                      </div>
                    )}
                  </div>
                  <h3 className="mt-1 text-[11px] sm:text-xs font-black text-white line-clamp-1 leading-tight">
                    {team2 || "Đối thủ"}
                  </h3>
                </div>
              </div>
            </>
          )}

          {/* META INFO BÊN PHẢI (GIẢI ĐẤU, BLV, CHẤT LƯỢNG) */}
          <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-1 sm:gap-1.5 border-t md:border-t-0 border-white/10 pt-1.5 md:pt-0">
            {group && (
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-gray-200 text-[11px] font-bold shadow-sm">
                🏆 {group}
              </span>
            )}
            {blv && (
              <span className="px-2.5 py-0.5 rounded-full bg-netflix-red/20 border border-netflix-red/40 text-rose-300 text-[11px] font-extrabold shadow-sm">
                🎙️ BLV {blv}
              </span>
            )}
            <div className="flex items-center gap-1">
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black uppercase">
                <Zap className="w-2.5 h-2.5 fill-emerald-400" />
                <span>{currentServer?.quality || "FHD 1080p"}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
      <div
        ref={containerRef}
        onMouseMove={resetControlsTimeout}
        onClick={(e) => {
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
        className={`relative w-full aspect-video sm:max-h-[calc(100vh-210px)] sm:max-w-[calc((100vh-210px)*16/9)] mx-auto bg-black rounded-2xl sm:rounded-3xl overflow-hidden border border-white/15 shadow-2xl group select-none ring-1 ring-white/10 ${
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
                localStorage.setItem("nanaflix_live_volume", String(v.volume));
              } catch {}
            }
          }}
        />

        {/* HUY HIỆU SIGNAL & LIVE TRÊN TRÁI (TỰ ĐỘNG ẨN KHI KHÔNG TƯƠNG TÁC) */}
        <div
          className={`absolute top-3 left-3 sm:top-4 sm:left-4 flex items-center gap-2 z-20 pointer-events-none transition-opacity duration-300 ${
            showControls ? "opacity-100" : "opacity-0"
          }`}
        >
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-netflix-red/90 text-white text-[11px] sm:text-xs font-black shadow-lg animate-pulse backdrop-blur-md">
            <Radio className="w-3.5 h-3.5" />
            <span>TRỰC TIẾP</span>
          </span>
          <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-emerald-400 text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Ultra Low Latency • Tốc độ cao</span>
          </span>
        </div>

        {matchOptions.length > 0 && (
          <>
            {/* NÚT MỞ DANH SÁCH KÊNH Ở CẠNH PHẢI CỦA PLAYER - Chỉ hiện trên tablet/desktop */}
            <div
              className={`hidden sm:block absolute top-1/2 right-0 z-30 -translate-y-1/2 transition-all duration-300 ${
                showControls || isRailVisible
                  ? "translate-x-0 opacity-100"
                  : "translate-x-3 opacity-0 pointer-events-none"
              }`}
            >
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleRail();
                }}
                className="rounded-l-xl border border-white/20 border-r-0 bg-black/85 hover:bg-black/95 px-2.5 py-3 text-[10px] font-black text-white shadow-2xl backdrop-blur-md flex flex-col items-center gap-1.5 cursor-pointer transition-transform hover:scale-105 active:scale-95 group/railbtn ring-1 ring-white/10"
                title="Mở danh sách kênh & trận đấu (Phím L)"
              >
                <Tv className="w-3.5 h-3.5 text-rose-400 group-hover/railbtn:animate-pulse" />
                <span className="[writing-mode:vertical-lr] tracking-widest text-[9.5px] font-mono text-rose-300 font-black">
                  KÊNH
                </span>
              </button>
            </div>

            {/* BACKDROP KHI MỞ DRAWER TRÊN MOBILE & DESKTOP */}
            {isRailVisible && (
              <div
                className="fixed inset-0 sm:absolute sm:inset-0 bg-black/75 sm:bg-black/40 backdrop-blur-sm z-40 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  closeRail();
                }}
              />
            )}

            {/* DRAWER / BOTTOM SHEET DANH SÁCH KÊNH & TRẬN ĐẤU (TỐI ƯU CẢM ỨNG MOBILE) */}
            <aside
              className={`fixed inset-x-0 bottom-0 sm:absolute sm:inset-y-0 sm:right-0 sm:left-auto z-50 w-full sm:w-[380px] max-h-[85vh] sm:max-h-full rounded-t-3xl sm:rounded-none border-t sm:border-t-0 sm:border-l border-white/20 bg-zinc-950/98 sm:bg-zinc-950/95 p-3.5 sm:p-4 shadow-2xl backdrop-blur-2xl transition-transform duration-300 flex flex-col ${
                isRailVisible
                  ? "translate-y-0 sm:translate-x-0 pointer-events-auto"
                  : "translate-y-full sm:translate-y-0 sm:translate-x-full pointer-events-none"
              }`}
              onClick={(event) => event.stopPropagation()}
            >
              {/* THANH VUỐT KÉO GỢI Ý TRÊN MOBILE */}
              <div className="w-12 h-1.5 bg-white/30 rounded-full mx-auto mb-2 sm:hidden flex-shrink-0" />

              <div className="mb-2.5 flex items-center justify-between border-b border-white/10 pb-2.5 flex-shrink-0">
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    <p className="text-[11px] sm:text-[10px] font-black uppercase tracking-[0.18em] text-rose-400">
                      Kênh & Trận trực tiếp
                    </p>
                  </div>
                  <p className="mt-0.5 truncate text-xs sm:text-xs font-bold text-white">
                    Đang xem: {title}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeRail}
                  className="rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white bg-white/5 transition flex-shrink-0 cursor-pointer"
                  title="Đóng danh sách"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Ô TÌM KIẾM TRONG DRAWER */}
              <div className="relative mb-2.5 flex-shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={railSearch}
                  onChange={(e) => setRailSearch(e.target.value)}
                  placeholder="Tìm kênh, giải đấu, đội, BLV..."
                  className="w-full pl-9 pr-8 py-2 sm:py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-netflix-red transition"
                />
                {railSearch && (
                  <button
                    type="button"
                    onClick={() => setRailSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* TABS BỘ LỌC TRONG DRAWER */}
              <div className="flex items-center gap-1.5 mb-2.5 overflow-x-auto scrollbar-none flex-shrink-0 pb-1">
                <button
                  type="button"
                  onClick={() => setRailFilter("all")}
                  className={`px-3 py-1.5 rounded-xl text-[11px] sm:text-[10px] font-bold whitespace-nowrap transition cursor-pointer ${
                    railFilter === "all"
                      ? "bg-white text-black font-extrabold shadow-sm"
                      : "bg-white/10 text-gray-300 hover:bg-white/20"
                  }`}
                >
                  Tất cả ({matchOptions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRailFilter("live")}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] sm:text-[10px] font-bold whitespace-nowrap transition cursor-pointer ${
                    railFilter === "live"
                      ? "bg-netflix-red text-white font-extrabold shadow-md shadow-red-950/60"
                      : "bg-white/10 text-rose-300 hover:bg-white/20"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  <span>Đang đá ({liveOptionsCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRailFilter("fpt")}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] sm:text-[10px] font-bold whitespace-nowrap transition cursor-pointer ${
                    railFilter === "fpt"
                      ? "bg-orange-600 text-white font-extrabold"
                      : "bg-white/10 text-orange-300 hover:bg-white/20"
                  }`}
                >
                  <span>⚡ FPT Play</span>
                </button>
              </div>

              {/* DANH SÁCH CUỘN TRẬN ĐẤU & KÊNH (TOUCH-FRIENDLY CHO MOBILE) */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 scrollbar-thin">
                {filteredRailOptions.length === 0 ? (
                  <div className="py-12 text-center text-xs text-gray-400">
                    Không tìm thấy trận hoặc kênh phù hợp.
                  </div>
                ) : (
                  filteredRailOptions.map((option) => {
                    const isCurrent = option.id === match?.id;
                    const isOptionLive = option.timeline === "live";
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          onSelectMatch?.(option);
                          closeRail();
                        }}
                        className={`w-full rounded-2xl border p-2.5 sm:p-2 text-left transition flex items-center gap-3 cursor-pointer min-h-[56px] active:scale-[0.98] ${
                          isCurrent
                            ? "border-netflix-red/90 bg-red-500/20 text-white shadow-lg shadow-red-950/50 ring-1 ring-netflix-red/50"
                            : "border-white/10 bg-white/[0.04] text-gray-200 hover:border-white/30 hover:bg-white/[0.1] active:bg-white/[0.15]"
                        }`}
                      >
                        {/* Thumbnail / Logo */}
                        <div className="w-11 h-11 sm:w-10 sm:h-10 rounded-xl bg-zinc-900/90 border border-white/15 p-1 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-inner">
                          <MatchRailLogo option={option} />
                        </div>

                        {/* Thông tin */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="truncate text-xs sm:text-xs font-bold leading-tight">
                              {option.isEvent
                                ? option.title
                                : `${option.team1}${option.team2 ? ` vs ${option.team2}` : ""}`}
                            </span>
                            {isCurrent && <PlayingEqualizer />}
                          </div>

                          <div className="flex items-center gap-1.5 mt-1 text-[11px] sm:text-[10px] text-gray-400">
                            {isOptionLive ? (
                              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                <span>TRỰC TIẾP</span>
                              </span>
                            ) : (
                              <span className="text-sky-300 font-semibold font-mono">
                                ⏰ {option.time}
                              </span>
                            )}
                            <span>•</span>
                            <span className="truncate text-gray-300">
                              {option.group}
                            </span>
                            {option.blv && (
                              <>
                                <span>•</span>
                                <span className="text-rose-300 truncate font-semibold">
                                  🎙️ {option.blv}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>
          </>
        )}

        {/* NÚT BẬT ÂM THANH NỔI BẬT KHI ĐANG MUTE Ở GÓC TRÊN PHẢI (ẨN KHI KHÔNG TƯƠNG TÁC) */}
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

        {/* ACTION FEEDBACK OVERLAY (PLAY, PAUSE, VOLUME, SERVER SWITCH) */}
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
              {actionFeedback.icon === "server" && (
                <Sparkles className="w-10 h-10 text-amber-400" />
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
                  onClick={() => handleSwitchServer("next")}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-netflix-red hover:bg-red-700 text-xs font-bold text-white transition shadow-lg shadow-red-950/50 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    Đổi Máy Chủ #
                    {((selectedServerIndex + 1) % servers.length) + 1}
                  </span>
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

        {/* CONTROLS OVERLAY BOTTOM BAR */}
        <div
          className={`absolute inset-x-0 bottom-0 z-30 transition-opacity duration-300 ${
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-gradient-to-t from-black/95 via-black/80 to-transparent p-3 sm:p-4 pt-8 flex items-center justify-between gap-2 sm:gap-4 select-none"
          >
            {/* CỤM TRÁI: PLAY/PAUSE + ĐỔI TRẬN NHANH + ÂM LƯỢNG */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
              <button
                type="button"
                onClick={togglePlay}
                title={isPlaying ? "Tạm dừng (Space)" : "Phát (Space)"}
                className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/20 hover:bg-white/30 flex-shrink-0 flex items-center justify-center text-white transition hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                ) : (
                  <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current ml-0.5" />
                )}
              </button>

              {/* NÚT ĐỔI TRẬN / ĐỔI KÊNH NHANH TRÊN THANH CONTROL */}
              <div className="flex items-center bg-black/60 rounded-full border border-white/15 p-0.5 backdrop-blur-md flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleSwitchMatch("prev")}
                  title="Trận trước (Phím ←)"
                  className="p-1 sm:p-1.5 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition cursor-pointer"
                >
                  <ChevronLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
                <span className="text-[9px] sm:text-[10px] font-mono font-bold px-1.5 sm:px-2 text-amber-300 whitespace-nowrap">
                  {matchOptions && matchOptions.length > 1
                    ? "Đổi trận"
                    : `SV ${selectedServerIndex + 1}/${servers.length}`}
                </span>
                <button
                  type="button"
                  onClick={() => handleSwitchMatch("next")}
                  title="Trận kế tiếp (Phím →)"
                  className="p-1 sm:p-1.5 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition cursor-pointer"
                >
                  <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              </div>

              {/* CỤM VOLUME TRÊN MOBILE (Chỉ hiện nút Mute nhỏ gọn) */}
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
              <div className="hidden sm:flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-full border border-white/20 backdrop-blur-md">
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

            {/* CỤM PHẢI: NÚT KÊNH + PHÍM TẮT GỢI Ý + PIP + TOÀN MÀN HÌNH */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              {/* Nút Mở Danh sách Kênh / Trận đấu */}
              {matchOptions && matchOptions.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleRail();
                  }}
                  title="Mở danh sách kênh & trận đấu (Phím L)"
                  className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full border text-[11px] sm:text-xs font-bold transition backdrop-blur-md cursor-pointer ${
                    isRailVisible
                      ? "bg-gradient-to-r from-red-600 to-rose-600 text-white border-red-400 shadow-md shadow-red-950/60 scale-102"
                      : "bg-white/15 hover:bg-white/25 text-gray-200 hover:text-white border-white/20"
                  }`}
                >
                  <List className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-300" />
                  <span className="hidden sm:inline">Danh sách kênh</span>
                  <span className="sm:hidden">Kênh</span>
                </button>
              )}

              <span className="hidden lg:inline text-[11px] text-gray-400 bg-black/50 px-2.5 py-1 rounded-full border border-white/10 font-mono">
                Space: Dừng/Phát • ← / →: Đổi Server • L: Kênh
              </span>

              {/* Nút Picture in Picture - Chỉ hiện trên tablet/desktop */}
              <button
                type="button"
                onClick={togglePip}
                title="Xem thu nhỏ góc màn hình (PiP - Phím P)"
                className={`hidden sm:flex w-8 h-8 sm:w-10 sm:h-10 rounded-full items-center justify-center transition hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md border border-white/10 flex-shrink-0 ${
                  isPip
                    ? "bg-netflix-red text-white"
                    : "bg-white/20 hover:bg-white/30 text-white"
                }`}
              >
                <PictureInPicture2 className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
              </button>

              {/* Nút Toàn màn hình */}
              <button
                type="button"
                onClick={toggleFullscreen}
                title={isFullscreen ? "Thu nhỏ (F)" : "Toàn màn hình (F)"}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-netflix-red hover:bg-red-700 flex items-center justify-center text-white transition hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md flex-shrink-0 shadow-lg border border-white/20"
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
      </div>

      {/* 3. THANH THÔNG TIN TRẬN ĐẤU & CHỌN MÁY CHỦ SẮC NÉT */}
      <div className="keep-dark-cinema rounded-2xl sm:rounded-3xl border border-white/10 bg-zinc-900/95 p-3.5 sm:p-5 shadow-xl space-y-3 sm:space-y-4 w-full min-w-0">
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
            <h2
              className="text-base sm:text-xl font-black text-white leading-snug break-words keep-white"
              style={{ color: "#ffffff" }}
            >
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
                  (
                  {showAllServers
                    ? `Đang hiện toàn bộ ${servers.length}`
                    : `Đang hiện 8/${servers.length}`}
                  )
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
                <span>
                  + Xem thêm {servers.length - INITIAL_SERVER_LIMIT} nguồn khác
                </span>
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
