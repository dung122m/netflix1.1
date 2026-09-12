"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import Hls from "hls.js";
import {
  Maximize2,
  Minimize2,
  Moon,
  Sun,
  SkipBack,
  SkipForward,
  Keyboard,
  X,
  ArrowUpRight,
  Clock,
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Zap,
  Tv,
  Settings,
  PictureInPicture,
  RotateCcw,
  QrCode,
} from "lucide-react";
import { PlayerScrubBar } from "./PlayerScrubBar";
import { useWatchController } from "./WatchController";
import { getWatchProgress, saveWatchProgress } from "@/lib/watchHistory";

// Lazy-load SleepTimerModal & MobileQrModal để giảm bundle ban đầu
const SleepTimerModal = dynamic(
  () => import("./SleepTimerModal").then((mod) => mod.SleepTimerModal),
  { ssr: false }
);
const MobileQrModal = dynamic(
  () => import("./MobileQrModal").then((mod) => mod.MobileQrModal),
  { ssr: false }
);

interface EpisodeItem {
  name?: string;
  slug?: string;
  link_embed?: string;
  link_m3u8?: string;
}

interface CinemaPlayerProps {
  embedSrc?: string;
  videoLink?: string;
  m3u8Link?: string;
  trailerUrl?: string | null;
  title: string;
  activeEpisodeName?: string;
  activeEpisodeSlug?: string;
  isTrailerOnly: boolean;
  posterUrl: string;
  episodes: EpisodeItem[];
}

export const CinemaPlayer: React.FC<CinemaPlayerProps> = ({
  embedSrc: propEmbedSrc,
  videoLink: propVideoLink,
  m3u8Link: propM3u8Link,
  trailerUrl,
  title: propTitle,
  activeEpisodeName: propActiveEpisodeName,
  activeEpisodeSlug: propActiveEpisodeSlug,
  isTrailerOnly: propIsTrailerOnly,
  posterUrl,
  episodes: propEpisodes,
}) => {
  const watchContext = useWatchController();

  const title = watchContext?.movieTitle || propTitle;
  const isTrailerOnly = watchContext?.isTrailerOnly ?? propIsTrailerOnly;
  const episodes = watchContext?.episodes || propEpisodes;
  const activeEpisodeSlug = watchContext?.activeEpisodeSlug || propActiveEpisodeSlug;
  const activeEpisode = watchContext?.activeEpisode || episodes.find((e) => e.slug === activeEpisodeSlug) || episodes[0];
  const activeEpisodeName = activeEpisode?.name || propActiveEpisodeName;

  const videoLink = activeEpisode?.link_embed || activeEpisode?.link_m3u8 || propVideoLink;
  const embedSrc = activeEpisode?.link_embed || propEmbedSrc;
  const m3u8Link = activeEpisode?.link_m3u8
    || (activeEpisode as Record<string, string | undefined>)?.m3u8
    || (activeEpisode as Record<string, string | undefined>)?.file
    || propM3u8Link;

  const prevEpisode = watchContext?.prevEpisode ?? null;
  const nextEpisode = watchContext?.nextEpisode ?? null;
  const switchEpisode = watchContext?.switchEpisode;

  // Player UI states
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isLightsOff, setIsLightsOff] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(1);
  const [isBuffering, setIsBuffering] = useState(false);
  const [useIframeFallback, setUseIframeFallback] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showShortcutModal, setShowShortcutModal] = useState(false);
  const [showSleepTimerModal, setShowSleepTimerModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrTime, setQrTime] = useState(0);
  const [qrDuration, setQrDuration] = useState(0);
  const [bigCenterIcon, setBigCenterIcon] = useState<"play" | "pause" | null>(null);

  // Tốc độ phát & Chất lượng video HLS
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [qualityLevels, setQualityLevels] = useState<Array<{ id: number; label: string; height: number }>>([]);
  const [currentQualityIndex, setCurrentQualityIndex] = useState<number>(-1); // -1: Tự động (Auto)
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  // HUD feedback
  const [hudState, setHudState] = useState<{ icon: React.ReactNode; text: string } | null>(null);
  const hudTimerRef = useRef<NodeJS.Timeout | null>(null);
  const centerIconTimerRef = useRef<NodeJS.Timeout | null>(null);
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const lastProgressSaveRef = useRef<number>(0);

  // Mobile Sticky State
  const [isMobile, setIsMobile] = useState(false);
  const [isScrolledPast, setIsScrolledPast] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Ref giữ trạng thái mới nhất cho event handlers chống re-bind
  const stateRef = useRef({
    isPlaying,
    isMuted,
    volume,
    isTheaterMode,
    isLightsOff,
    showShortcutModal,
    showSleepTimerModal,
  });

  useEffect(() => {
    stateRef.current = {
      isPlaying,
      isMuted,
      volume,
      isTheaterMode,
      isLightsOff,
      showShortcutModal,
      showSleepTimerModal,
    };
  }, [
    isPlaying,
    isMuted,
    volume,
    isTheaterMode,
    isLightsOff,
    showShortcutModal,
    showSleepTimerModal,
  ]);

  const showHud = useCallback((icon: React.ReactNode, text: string) => {
    if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    setHudState({ icon, text });
    hudTimerRef.current = setTimeout(() => {
      setHudState(null);
    }, 1200);
  }, []);

  const triggerCenterAnimation = useCallback((type: "play" | "pause") => {
    if (centerIconTimerRef.current) clearTimeout(centerIconTimerRef.current);
    setBigCenterIcon(type);
    centerIconTimerRef.current = setTimeout(() => {
      setBigCenterIcon(null);
    }, 500);
  }, []);

  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (stateRef.current.isPlaying) {
        setShowControls(false);
        setShowSpeedMenu(false);
        setShowQualityMenu(false);
      }
    }, 3200);
  }, []);

  // Tạo embed trailer nếu không có videoLink nhưng có trailerUrl
  const trailerEmbedSrc = useMemo(() => {
    if (videoLink || !trailerUrl) return null;
    const match = trailerUrl.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
    );
    return match
      ? `https://www.youtube-nocookie.com/embed/${match[1]}?autoplay=1&mute=0&controls=1&rel=0`
      : null;
  }, [videoLink, trailerUrl]);

  const activeSrc = useMemo(() => {
    let src = videoLink ? embedSrc : trailerEmbedSrc;
    if (!src) return "";
    if (!src.includes("autoplay=")) {
      src += (src.includes("?") ? "&" : "?") + "autoplay=1";
    }
    return src;
  }, [videoLink, embedSrc, trailerEmbedSrc]);

  // Giải mã m3u8 thực tế
  const resolvedM3u8 = useMemo(() => {
    if (m3u8Link && m3u8Link.trim() && (m3u8Link.includes(".m3u8") || !m3u8Link.includes("<iframe"))) {
      return m3u8Link.trim();
    }
    const src = embedSrc || videoLink;
    if (src) {
      try {
        const parsed = new URL(src, "https://dummy.com");
        const u =
          parsed.searchParams.get("url") ||
          parsed.searchParams.get("link") ||
          parsed.searchParams.get("src") ||
          parsed.searchParams.get("file");
        if (u && (u.includes(".m3u8") || u.includes("/hls/"))) {
          return decodeURIComponent(u.trim());
        }
      } catch {}

      const match = src.match(/https?(?::%2F%2F|:\/\/)[^&\s"']+\.m3u8[^&\s"']*/i);
      if (match) {
        try {
          return decodeURIComponent(match[0]);
        } catch {
          return match[0];
        }
      }
    }
    return m3u8Link || "";
  }, [m3u8Link, embedSrc, videoLink]);

  // Reset fallback khi đổi tập
  useEffect(() => {
    setUseIframeFallback(false);
  }, [activeEpisodeSlug, resolvedM3u8]);

  const isNativeVideo = Boolean(resolvedM3u8 && !useIframeFallback);

  // Điều khiển Iframe fallback
  const sendPlayerCommand = useCallback((cmd: string, val?: string | number | boolean) => {
    if (!iframeRef.current?.contentWindow) return;
    try {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: cmd, args: val !== undefined ? [val] : [] }),
        "*"
      );
      iframeRef.current.contentWindow.postMessage({ method: cmd, value: val, action: cmd, type: cmd }, "*");
      iframeRef.current.contentWindow.postMessage(JSON.stringify({ method: cmd, value: val }), "*");
    } catch {}
  }, []);

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
      showHud(<Maximize2 className="w-5 h-5 text-netflix-red" />, "Toàn màn hình");
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
      showHud(<Minimize2 className="w-5 h-5 text-gray-300" />, "Thoát toàn màn hình");
    }
  }, [showHud]);

  // Picture-in-Picture (Tiết kiệm 100% băng thông, chạy phần cứng)
  const togglePiP = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !isNativeVideo) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        showHud(<PictureInPicture className="w-5 h-5 text-gray-400" />, "Thoát cửa sổ nổi");
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
        showHud(<PictureInPicture className="w-5 h-5 text-netflix-red" />, "Cửa sổ nổi (PiP)");
      }
    } catch (err) {
      console.warn("PiP error:", err);
    }
  }, [isNativeVideo, showHud]);

  // Toggle Play / Pause
  const togglePlayPause = useCallback(() => {
    if (isNativeVideo && videoRef.current) {
      const v = videoRef.current;
      if (v.paused) {
        if (v.muted && isMuted) {
          v.muted = false;
          setIsMuted(false);
        }
        v.play().catch(() => {});
        setIsPlaying(true);
        triggerCenterAnimation("play");
        showHud(<Play className="w-5 h-5 text-emerald-400 fill-current" />, "Đang phát");
      } else {
        v.pause();
        setIsPlaying(false);
        triggerCenterAnimation("pause");
        showHud(<Pause className="w-5 h-5 text-amber-400 fill-current" />, "Tạm dừng");
      }
    } else {
      setIsPlaying((prev) => {
        const next = !prev;
        if (next) {
          sendPlayerCommand("playVideo");
          sendPlayerCommand("play");
          triggerCenterAnimation("play");
          showHud(<Play className="w-5 h-5 text-emerald-400 fill-current" />, "Đang phát");
        } else {
          sendPlayerCommand("pauseVideo");
          sendPlayerCommand("pause");
          triggerCenterAnimation("pause");
          showHud(<Pause className="w-5 h-5 text-amber-400 fill-current" />, "Tạm dừng");
        }
        return next;
      });
    }
    resetControlsTimeout();
  }, [isNativeVideo, isMuted, sendPlayerCommand, showHud, triggerCenterAnimation, resetControlsTimeout]);

  // Chuyển chất lượng HLS
  const handleQualityChange = useCallback((levelIndex: number) => {
    if (!hlsRef.current) return;
    hlsRef.current.currentLevel = levelIndex;
    setCurrentQualityIndex(levelIndex);
    setShowQualityMenu(false);
    const label = levelIndex === -1 ? "Tự động (Auto)" : qualityLevels.find((q) => q.id === levelIndex)?.label || "Đã đổi";
    showHud(<Settings className="w-5 h-5 text-sky-400" />, `Chất lượng: ${label}`);
  }, [qualityLevels, showHud]);

  // Đổi tốc độ phát
  const handleSpeedChange = useCallback((spd: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = spd;
      setPlaybackSpeed(spd);
      setShowSpeedMenu(false);
      showHud(<Zap className="w-5 h-5 text-amber-400" />, `Tốc độ: ${spd}x`);
    }
  }, [showHud]);

  // KHỞI TẠO NATIVE HLS VỚI BUFFER VÀ RESOURCE TỐI ƯU HOÁ CAO CẤP
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !resolvedM3u8 || useIframeFallback) {
      // Dọn dẹp HLS nếu chuyển sang iframe fallback
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      return;
    }

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setIsBuffering(true);

    // Dọn dẹp src cũ
    video.pause();
    video.removeAttribute("src");
    video.load();

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        capLevelToPlayerSize: true,      // Tự động khớp mức phân giải với kích thước player để tiết kiệm RAM/GPU
        maxBufferSize: 60 * 1000 * 1000, // Tối đa 60MB bộ đệm chống tràn RAM
        maxBufferLength: 25,             // Giữ buffer 25 giây cho độ phản hồi nhanh
        maxMaxBufferLength: 50,
        backBufferLength: 60,
        startLevel: -1,
        autoStartLoad: true,
        abrEwmaDefaultEstimate: 5000000, // Ước lượng 5Mbps ban đầu để tránh phát 240p
      });
      hlsRef.current = hls;
      hls.loadSource(resolvedM3u8);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        setIsBuffering(false);

        // Lấy danh sách chất lượng video nếu có nhiều mức
        if (data.levels && data.levels.length > 1) {
          const lvls = data.levels.map((lvl, index) => ({
            id: index,
            height: lvl.height || 0,
            label: lvl.height ? `${lvl.height}p` : `${Math.round(lvl.bitrate / 1000)}k`,
          }));
          lvls.sort((a, b) => b.height - a.height);
          setQualityLevels(lvls);
        } else {
          setQualityLevels([]);
        }

        // Tự động phục hồi mốc thời gian xem dở hoặc mốc thời gian từ mã QR trên điện thoại (?t=...)
        const urlParams = new URLSearchParams(window.location.search);
        const urlTime = parseFloat(urlParams.get("t") || "0");
        const movieSlug = watchContext?.movieSlug;
        const savedProgress = movieSlug && activeEpisodeSlug ? getWatchProgress(movieSlug, activeEpisodeSlug) : 0;
        const targetProgress = urlTime > 0 ? urlTime : (savedProgress > 15 ? savedProgress : 0);

        if (targetProgress > 0) {
          video.currentTime = targetProgress;
          const mins = Math.floor(targetProgress / 60);
          const secs = (Math.floor(targetProgress) % 60).toString().padStart(2, "0");
          showHud(
            <RotateCcw className="w-5 h-5 text-netflix-red" />,
            urlTime > 0
              ? `Xem tiếp từ điện thoại: ${mins}:${secs}`
              : `Tiếp tục xem từ ${mins}:${secs}`
          );
          if (movieSlug && activeEpisodeSlug) {
            saveWatchProgress(movieSlug, targetProgress, video.duration || 0, activeEpisodeSlug);
          }
        }

        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsPlaying(true))
            .catch(() => {
              video.muted = true;
              setIsMuted(true);
              video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
            });
        }
      });

      let retryCount = 0;
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              retryCount += 1;
              if (retryCount <= 2) {
                hls.startLoad();
              } else {
                hls.recoverMediaError();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              setUseIframeFallback(true);
              break;
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari Native HLS
      video.src = resolvedM3u8;
      const onLoaded = () => {
        setIsBuffering(false);
        const urlParams = new URLSearchParams(window.location.search);
        const urlTime = parseFloat(urlParams.get("t") || "0");
        const movieSlug = watchContext?.movieSlug;
        const savedProgress = movieSlug && activeEpisodeSlug ? getWatchProgress(movieSlug, activeEpisodeSlug) : 0;
        const targetProgress = urlTime > 0 ? urlTime : (savedProgress > 15 ? savedProgress : 0);

        if (targetProgress > 0) {
          video.currentTime = targetProgress;
          const mins = Math.floor(targetProgress / 60);
          const secs = (Math.floor(targetProgress) % 60).toString().padStart(2, "0");
          showHud(
            <RotateCcw className="w-5 h-5 text-netflix-red" />,
            urlTime > 0
              ? `Xem tiếp từ điện thoại: ${mins}:${secs}`
              : `Tiếp tục xem từ ${mins}:${secs}`
          );
          if (movieSlug && activeEpisodeSlug) {
            saveWatchProgress(movieSlug, targetProgress, video.duration || 0, activeEpisodeSlug);
          }
        }
        video
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            video.muted = true;
            setIsMuted(true);
            video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
          });
      };
      video.addEventListener("loadedmetadata", onLoaded);
      return () => video.removeEventListener("loadedmetadata", onLoaded);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [resolvedM3u8, useIframeFallback, activeEpisodeSlug, watchContext?.movieSlug, showHud]);

  // LẮNG NGHE SỰ KIỆN VIDEO (BUFFERING, AUTO-NEXT, LƯU TIẾN TRÌNH)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const movieSlug = watchContext?.movieSlug;

    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => {
      setIsBuffering(false);
      setIsPlaying(true);
    };
    const handlePause = () => {
      setIsPlaying(false);
      if (movieSlug && activeEpisodeSlug && video.currentTime > 5) {
        saveWatchProgress(movieSlug, video.currentTime, video.duration, activeEpisodeSlug);
      }
    };

    // Lưu tiến độ định kỳ mỗi 5s
    const handleTimeUpdateThrottled = () => {
      const now = Date.now();
      if (now - lastProgressSaveRef.current > 5000) {
        lastProgressSaveRef.current = now;
        if (movieSlug && activeEpisodeSlug && video.currentTime > 5) {
          saveWatchProgress(movieSlug, video.currentTime, video.duration, activeEpisodeSlug);
        }
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (nextEpisode?.slug) {
        if (switchEpisode) {
          switchEpisode(nextEpisode.slug);
        }
      }
    };

    video.addEventListener("waiting", handleWaiting, { passive: true });
    video.addEventListener("playing", handlePlaying, { passive: true });
    video.addEventListener("pause", handlePause, { passive: true });
    video.addEventListener("timeupdate", handleTimeUpdateThrottled, { passive: true });
    video.addEventListener("ended", handleEnded, { passive: true });

    return () => {
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("timeupdate", handleTimeUpdateThrottled);
      video.removeEventListener("ended", handleEnded);
    };
  }, [nextEpisode, switchEpisode, watchContext?.movieSlug, activeEpisodeSlug]);

  // Fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Mobile Sticky Scroll
  useEffect(() => {
    if (!activeSrc && !m3u8Link) return;

    const handleScroll = () => {
      if (!sentinelRef.current) return;
      const rect = sentinelRef.current.getBoundingClientRect();
      setIsScrolledPast(rect.top < -50);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [activeSrc, m3u8Link]);

  // =========================================================================
  // TOÀN BỘ HỆ THỐNG PHÍM TẮT: SPACE, F, M, ←, →, ↑, ↓, T, L, P, N, ESC, ?
  // =========================================================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      // 1. Phím Space: Play / Pause
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        togglePlayPause();
        return;
      }

      // 2. Phím F: Toàn màn hình
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
        return;
      }

      // 3. Phím M: Tắt / Bật tiếng
      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        if (isNativeVideo && videoRef.current) {
          const v = videoRef.current;
          v.muted = !v.muted;
          setIsMuted(v.muted);
          showHud(
            v.muted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />,
            v.muted ? "Đã tắt tiếng" : "Đã bật tiếng"
          );
        } else {
          setIsMuted((prev) => {
            const next = !prev;
            if (next) {
              sendPlayerCommand("mute");
              showHud(<VolumeX className="w-5 h-5 text-rose-400" />, "Đã tắt tiếng");
            } else {
              sendPlayerCommand("unMute");
              showHud(<Volume2 className="w-5 h-5 text-emerald-400" />, "Đã bật tiếng");
            }
            return next;
          });
        }
        resetControlsTimeout();
        return;
      }

      // 4. Mũi tên Phải: Tua tới 10 giây
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (isNativeVideo && videoRef.current) {
          const v = videoRef.current;
          v.currentTime = Math.min(v.duration || 999999, v.currentTime + 10);
          showHud(<SkipForward className="w-5 h-5 text-netflix-red fill-current" />, "Tua tới +10s");
        } else {
          sendPlayerCommand("seekTo", "+10");
          sendPlayerCommand("seek", 10);
          showHud(<SkipForward className="w-5 h-5 text-netflix-red fill-current" />, "Tua tới +10s");
        }
        resetControlsTimeout();
        return;
      }

      // 5. Mũi tên Trái: Tua lùi 10 giây
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (isNativeVideo && videoRef.current) {
          const v = videoRef.current;
          v.currentTime = Math.max(0, v.currentTime - 10);
          showHud(<SkipBack className="w-5 h-5 text-netflix-red fill-current" />, "Tua lùi -10s");
        } else {
          sendPlayerCommand("seekTo", "-10");
          sendPlayerCommand("seek", -10);
          showHud(<SkipBack className="w-5 h-5 text-netflix-red fill-current" />, "Tua lùi -10s");
        }
        resetControlsTimeout();
        return;
      }

      // 6. Mũi tên Lên: Tăng âm lượng
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (isNativeVideo && videoRef.current) {
          const v = videoRef.current;
          const nextVol = Math.min(1, Math.round((v.volume + 0.1) * 10) / 10);
          v.volume = nextVol;
          v.muted = false;
          setIsMuted(false);
          setVolume(nextVol);
          showHud(<Volume2 className="w-5 h-5 text-emerald-400" />, `Âm lượng: ${Math.round(nextVol * 100)}%`);
        } else {
          sendPlayerCommand("setVolume", 100);
          showHud(<Volume2 className="w-5 h-5 text-emerald-400" />, "Tăng âm lượng");
        }
        resetControlsTimeout();
        return;
      }

      // 7. Mũi tên Xuống: Giảm âm lượng
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (isNativeVideo && videoRef.current) {
          const v = videoRef.current;
          const nextVol = Math.max(0, Math.round((v.volume - 0.1) * 10) / 10);
          v.volume = nextVol;
          setVolume(nextVol);
          if (nextVol === 0) {
            v.muted = true;
            setIsMuted(true);
          }
          showHud(<Volume1 className="w-5 h-5 text-amber-400" />, `Âm lượng: ${Math.round(nextVol * 100)}%`);
        } else {
          sendPlayerCommand("setVolume", 50);
          showHud(<Volume1 className="w-5 h-5 text-amber-400" />, "Giảm âm lượng");
        }
        resetControlsTimeout();
        return;
      }

      // 8. Phím Escape
      if (e.key === "Escape") {
        if (stateRef.current.showShortcutModal) setShowShortcutModal(false);
        else if (stateRef.current.showSleepTimerModal) setShowSleepTimerModal(false);
        else if (stateRef.current.isLightsOff) setIsLightsOff(false);
        else if (stateRef.current.isTheaterMode) setIsTheaterMode(false);
        return;
      }

      // 9. Phím T: Rạp phim
      if (e.key === "t" || e.key === "T") {
        setIsTheaterMode((prev) => {
          const next = !prev;
          showHud(<Maximize2 className="w-5 h-5 text-netflix-red" />, next ? "Chế độ Rạp phim" : "Chế độ Mặc định");
          return next;
        });
        return;
      }

      // 10. Phím L: Tắt / Bật đèn
      if (e.key === "l" || e.key === "L") {
        setIsLightsOff((prev) => {
          const next = !prev;
          showHud(next ? <Moon className="w-5 h-5 text-yellow-300" /> : <Sun className="w-5 h-5 text-yellow-400" />, next ? "Đã tắt đèn" : "Đã bật đèn");
          return next;
        });
        return;
      }

      // 11. Phím P: Tập trước
      if ((e.key === "p" || e.key === "P") && prevEpisode?.slug) {
        showHud(<SkipBack className="w-5 h-5 text-netflix-red" />, `Chuyển về ${prevEpisode.name}`);
        if (switchEpisode) switchEpisode(prevEpisode.slug);
        return;
      }

      // 12. Phím N: Tập kế tiếp
      if ((e.key === "n" || e.key === "N") && nextEpisode?.slug) {
        showHud(<SkipForward className="w-5 h-5 text-netflix-red" />, `Chuyển sang ${nextEpisode.name}`);
        if (switchEpisode) switchEpisode(nextEpisode.slug);
        return;
      }

      // 13. Phím ? hoặc /: Bật modal phím tắt
      if (e.key === "?" || (e.key === "/" && !e.shiftKey)) {
        setShowShortcutModal((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isNativeVideo,
    prevEpisode,
    nextEpisode,
    switchEpisode,
    togglePlayPause,
    toggleFullscreen,
    sendPlayerCommand,
    showHud,
    resetControlsTimeout,
  ]);

  const scrollToPlayer = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const isMobileStickyActive = isMobile && isScrolledPast && Boolean(activeSrc || m3u8Link);

  return (
    <>
      {/* LỚP NỀN TẮT ĐÈN (LIGHTS OFF OVERLAY) */}
      {isLightsOff && (
        <div
          onClick={() => setIsLightsOff(false)}
          className="fixed inset-0 bg-black/95 z-40 transition-opacity duration-300 cursor-pointer flex items-start justify-center pt-24"
        >
          <div className="text-white/60 text-xs bg-zinc-900/80 border border-white/10 px-3.5 py-2 rounded-full backdrop-blur-sm pointer-events-none shadow-xl">
            💡 Nhấn phím <span className="text-white font-bold">L</span> hoặc <span className="text-white font-bold">Escape</span> để bật đèn lại
          </div>
        </div>
      )}

      {/* Điểm neo cuộn trang (Sentinel) */}
      <div ref={sentinelRef} className="w-full h-0 pointer-events-none" />

      {/* PLACEHOLDER KHI PLAYER STICKY TRÊN MOBILE */}
      {isMobileStickyActive && (
        <div className="w-full aspect-video md:hidden" aria-hidden="true" />
      )}

      {/* CONTAINER KHUNG PHÁT VIDEO CHÍNH */}
      <div
        ref={containerRef}
        onMouseMove={resetControlsTimeout}
        className={`w-full mx-auto transition-all duration-300 bg-black ${
          isMobileStickyActive
            ? "fixed top-0 left-0 right-0 z-50 shadow-2xl border-b border-white/25 md:relative md:top-auto"
            : "relative z-30"
        } ${isTheaterMode ? "max-w-none px-0 sm:px-0" : "max-w-7xl"} ${
          isLightsOff ? "z-50" : ""
        }`}
      >
        {/* Thanh tiêu đề nhỏ gọn khi đang Ghim Cố Định trên Mobile */}
        {isMobileStickyActive && (
          <div className="md:hidden bg-gradient-to-r from-zinc-950 via-zinc-900 to-black px-3 py-1.5 flex items-center justify-between border-b border-white/10 text-xs">
            <div className="flex items-center gap-1.5 min-w-0 pr-2">
              <span className="w-2 h-2 rounded-full bg-netflix-red animate-pulse flex-shrink-0" />
              <span className="text-white font-bold text-[11px] truncate">
                {title} {activeEpisodeName ? `• Tập ${activeEpisodeName}` : ""}
              </span>
            </div>
            <button
              type="button"
              onClick={scrollToPlayer}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 text-gray-200 hover:text-white text-[10px] font-semibold transition cursor-pointer"
            >
              <ArrowUpRight className="w-3 h-3" />
              <span>Lên đầu</span>
            </button>
          </div>
        )}

        {/* Cinema Ambient Backlight */}
        <div className="ambient-cinema-glow opacity-80" aria-hidden="true" />

        {/* KHUNG VIDEO CHÍNH */}
        <div
          className={`w-full aspect-video bg-zinc-950 relative overflow-hidden transition-all duration-300 z-10 mx-auto shadow-2xl select-none group ${
            isMobileStickyActive
              ? "rounded-none max-h-[38vh]"
              : isTheaterMode
              ? "rounded-none border-y border-white/20 shadow-[0_30px_90px_rgba(0,0,0,0.85)] sm:max-h-[calc(100vh-90px)]"
              : "rounded-none sm:rounded-2xl md:rounded-3xl border-b sm:border border-white/15 shadow-[0_25px_70px_rgba(0,0,0,0.55)]"
          }`}
        >
          {isNativeVideo ? (
            // ==========================================
            // NATIVE HTML5 VIDEO PLAYER (HLS 0MS LATENCY)
            // ==========================================
            <div
              className={`w-full h-full relative ${
                showControls || !isPlaying ? "cursor-pointer" : "cursor-none"
              }`}
              onClick={togglePlayPause}
              onDoubleClick={toggleFullscreen}
            >
              <video
                ref={videoRef}
                className="w-full h-full object-contain bg-black"
                playsInline
                autoPlay
                preload="auto"
              />

              {/* SPINNER BUFFERING */}
              {isBuffering && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/40 z-20">
                  <div className="w-12 h-12 border-4 border-netflix-red border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {/* ICON HIỆU ỨNG TRUNG TÂM KHI BẤM PLAY / PAUSE */}
              {bigCenterIcon && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 animate-out fade-out zoom-out-125 duration-300">
                  <div className="p-5 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-white shadow-2xl">
                    {bigCenterIcon === "play" ? (
                      <Play className="w-10 h-10 text-emerald-400 fill-current ml-1" />
                    ) : (
                      <Pause className="w-10 h-10 text-amber-400 fill-current" />
                    )}
                  </div>
                </div>
              )}

              {/* THANH ĐIỀU KHIỂN NATIVE NETFLIX CONTROLS */}
              <div
                onClick={(e) => e.stopPropagation()}
                className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent pt-10 pb-3 px-3 sm:px-5 transition-opacity duration-300 z-30 ${
                  showControls || !isPlaying ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                }`}
              >
                {/* THANH TIẾN TRÌNH CÁCH LY RE-RENDER (0% CPU IDLE) */}
                <PlayerScrubBar
                  videoRef={videoRef}
                  isNativeVideo={isNativeVideo}
                  onSeekFeedback={(txt) => {
                    showHud(<SkipForward className="w-5 h-5 text-netflix-red fill-current" />, `Đến ${txt}`);
                  }}
                />

                {/* HÀNG CÁC NÚT ĐIỀU KHIỂN CHÍNH */}
                <div className="flex items-center justify-between text-white text-xs sm:text-sm">
                  <div className="flex items-center gap-2 sm:gap-3">
                    {/* Play / Pause */}
                    <button
                      type="button"
                      onClick={togglePlayPause}
                      title={isPlaying ? "Tạm dừng (Space)" : "Phát (Space)"}
                      className="p-2 rounded-full hover:bg-white/20 text-white transition cursor-pointer"
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5 fill-white" />
                      ) : (
                        <Play className="w-5 h-5 fill-white ml-0.5" />
                      )}
                    </button>

                    {/* Tua lùi 10s */}
                    <button
                      type="button"
                      onClick={() => {
                        if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
                        showHud(<SkipBack className="w-5 h-5 text-netflix-red fill-current" />, "Tua lùi -10s");
                      }}
                      title="Tua lùi 10 giây (←)"
                      className="p-2 rounded-full hover:bg-white/20 text-gray-200 hover:text-white transition cursor-pointer"
                    >
                      <SkipBack className="w-4 h-4 fill-current" />
                    </button>

                    {/* Tua tới 10s */}
                    <button
                      type="button"
                      onClick={() => {
                        if (videoRef.current) videoRef.current.currentTime = (videoRef.current.currentTime || 0) + 10;
                        showHud(<SkipForward className="w-5 h-5 text-netflix-red fill-current" />, "Tua tới +10s");
                      }}
                      title="Tua tới 10 giây (→)"
                      className="p-2 rounded-full hover:bg-white/20 text-gray-200 hover:text-white transition cursor-pointer"
                    >
                      <SkipForward className="w-4 h-4 fill-current" />
                    </button>

                    {/* Âm lượng */}
                    <div className="flex items-center gap-1.5 group/vol">
                      <button
                        type="button"
                        onClick={() => {
                          if (videoRef.current) {
                            videoRef.current.muted = !videoRef.current.muted;
                            setIsMuted(videoRef.current.muted);
                          }
                        }}
                        title="Tắt/Bật tiếng (M)"
                        className="p-2 rounded-full hover:bg-white/20 text-gray-200 hover:text-white transition cursor-pointer"
                      >
                        {isMuted || volume === 0 ? (
                          <VolumeX className="w-4 h-4 text-rose-400" />
                        ) : volume < 0.5 ? (
                          <Volume1 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Volume2 className="w-4 h-4 text-emerald-400" />
                        )}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={isMuted ? 0 : volume}
                        onChange={(e) => {
                          const newVol = parseFloat(e.target.value);
                          setVolume(newVol);
                          if (videoRef.current) {
                            videoRef.current.volume = newVol;
                            videoRef.current.muted = newVol === 0;
                            setIsMuted(newVol === 0);
                          }
                        }}
                        className="w-16 sm:w-20 accent-netflix-red h-1.5 bg-white/20 rounded-full cursor-pointer hidden sm:inline-block"
                      />
                    </div>
                  </div>

                  {/* Nút Phải: Tốc độ, Chất lượng, PiP, Iframe fallback, Toàn màn hình */}
                  <div className="flex items-center gap-1 sm:gap-2 relative">
                    {/* CHỌN TỐC ĐỘ PHÁT (Speed) */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setShowSpeedMenu(!showSpeedMenu);
                          setShowQualityMenu(false);
                        }}
                        title="Tốc độ phát"
                        className="px-2 py-1 rounded-md hover:bg-white/20 text-gray-200 hover:text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                      >
                        <span>{playbackSpeed}x</span>
                      </button>
                      {showSpeedMenu && (
                        <div className="absolute bottom-full right-0 mb-2 py-1.5 w-24 bg-zinc-900/95 border border-white/15 rounded-xl shadow-2xl backdrop-blur-md z-50 text-xs flex flex-col">
                          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((spd) => (
                            <button
                              key={spd}
                              type="button"
                              onClick={() => handleSpeedChange(spd)}
                              className={`px-3 py-1.5 text-left hover:bg-white/15 transition cursor-pointer flex items-center justify-between ${
                                playbackSpeed === spd ? "text-netflix-red font-bold" : "text-gray-300"
                              }`}
                            >
                              <span>{spd}x</span>
                              {playbackSpeed === spd && <span className="w-1.5 h-1.5 rounded-full bg-netflix-red" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* CHỌN CHẤT LƯỢNG (Quality - HLS multi-rendition) */}
                    {qualityLevels.length > 0 && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setShowQualityMenu(!showQualityMenu);
                            setShowSpeedMenu(false);
                          }}
                          title="Chất lượng video"
                          className="p-2 rounded-full hover:bg-white/20 text-gray-200 hover:text-white transition cursor-pointer flex items-center"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        {showQualityMenu && (
                          <div className="absolute bottom-full right-0 mb-2 py-1.5 w-28 bg-zinc-900/95 border border-white/15 rounded-xl shadow-2xl backdrop-blur-md z-50 text-xs flex flex-col">
                            <button
                              type="button"
                              onClick={() => handleQualityChange(-1)}
                              className={`px-3 py-1.5 text-left hover:bg-white/15 transition cursor-pointer flex items-center justify-between ${
                                currentQualityIndex === -1 ? "text-netflix-red font-bold" : "text-gray-300"
                              }`}
                            >
                              <span>Tự động</span>
                              {currentQualityIndex === -1 && <span className="w-1.5 h-1.5 rounded-full bg-netflix-red" />}
                            </button>
                            {qualityLevels.map((lvl) => (
                              <button
                                key={lvl.id}
                                type="button"
                                onClick={() => handleQualityChange(lvl.id)}
                                className={`px-3 py-1.5 text-left hover:bg-white/15 transition cursor-pointer flex items-center justify-between ${
                                  currentQualityIndex === lvl.id ? "text-netflix-red font-bold" : "text-gray-300"
                                }`}
                              >
                                <span>{lvl.label}</span>
                                {currentQualityIndex === lvl.id && <span className="w-1.5 h-1.5 rounded-full bg-netflix-red" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Nút Picture-in-Picture (PiP) */}
                    <button
                      type="button"
                      onClick={togglePiP}
                      title="Cửa sổ nổi (Picture-in-Picture)"
                      className="hidden sm:inline-flex p-2 rounded-full hover:bg-white/20 text-gray-200 hover:text-white transition cursor-pointer"
                    >
                      <PictureInPicture className="w-4 h-4" />
                    </button>

                    {/* Nút Xem tiếp trên điện thoại (QR Code đúng số phút) */}
                    <button
                      type="button"
                      onClick={() => {
                        setQrTime(videoRef.current?.currentTime || 0);
                        setQrDuration(videoRef.current?.duration || 0);
                        setShowQrModal(true);
                        if (videoRef.current && isPlaying) {
                          videoRef.current.pause();
                          setIsPlaying(false);
                        }
                      }}
                      title="Xem tiếp trên điện thoại (Quét mã QR đúng số phút đang xem)"
                      className="p-2 rounded-full hover:bg-white/20 text-gray-200 hover:text-white transition cursor-pointer flex items-center gap-1 group/qr"
                    >
                      <QrCode className="w-4 h-4 text-sky-400 group-hover/qr:scale-110 transition-transform" />
                      <span className="hidden xl:inline text-[11px] font-semibold text-gray-300">
                        Điện thoại
                      </span>
                    </button>

                    {/* Nguồn Iframe fallback nếu muốn */}
                    {embedSrc && (
                      <button
                        type="button"
                        onClick={() => setUseIframeFallback(true)}
                        title="Đổi sang trình phát Iframe dự phòng"
                        className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-gray-300 text-[11px] font-medium transition cursor-pointer"
                      >
                        <Tv className="w-3 h-3" />
                        <span>Nguồn Iframe</span>
                      </button>
                    )}

                    {/* Toàn màn hình */}
                    <button
                      type="button"
                      onClick={toggleFullscreen}
                      title="Toàn màn hình (F)"
                      className="p-2 rounded-full hover:bg-white/20 text-gray-200 hover:text-white transition cursor-pointer"
                    >
                      {isFullscreen ? (
                        <Minimize2 className="w-4 h-4" />
                      ) : (
                        <Maximize2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : activeSrc ? (
            // ==========================================
            // IFRAME PLAYER FALLBACK (KHI KHÔNG CÓ M3U8 HOẶC LÀ TRAILER)
            // ==========================================
            <>
              <iframe
                ref={iframeRef}
                src={activeSrc}
                className="w-full h-full absolute inset-0 border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                title={videoLink ? `Đang phát ${activeEpisodeName || "phim"}` : `Trailer: ${title}`}
              />
              {!videoLink && trailerEmbedSrc && (
                <div
                  className={`absolute top-3 left-3 z-20 pointer-events-none inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-netflix-red/90 text-white text-xs font-bold shadow-lg backdrop-blur-md transition-opacity duration-300 ${
                    showControls || !isPlaying ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span>Đang phát Trailer</span>
                </div>
              )}
              {m3u8Link && useIframeFallback && (
                <button
                  type="button"
                  onClick={() => setUseIframeFallback(false)}
                  className={`absolute top-3 right-3 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-bold shadow-lg backdrop-blur-md transition-opacity duration-300 cursor-pointer ${
                    showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 fill-white" />
                  <span>Đổi sang Native HLS</span>
                </button>
              )}
            </>
          ) : (
            // ==========================================
            // PLACEHOLDER KHI PHIM CHƯA CÓ NGUỒN
            // ==========================================
            <div className="w-full h-full flex flex-col items-center justify-center border border-white/10 relative">
              <Image
                src={posterUrl}
                alt={title}
                fill
                quality={80}
                className="object-cover opacity-35"
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-black/55" />
              <div className="relative z-10 text-center px-6">
                <p className="text-white text-lg md:text-2xl font-semibold">
                  {isTrailerOnly
                    ? "Phim đang ở trạng thái trailer/sắp chiếu"
                    : "Video chưa được cập nhật"}
                </p>
                <p className="text-gray-300 mt-2 text-sm md:text-base">
                  {isTrailerOnly
                    ? "Hiện chưa có tập phát chính thức. Vui lòng quay lại sau."
                    : "Nguồn phát hiện chưa sẵn sàng."}
                </p>
              </div>
            </div>
          )}

          {/* ON-SCREEN HUD OVERLAY KHI BẤM PHÍM TẮT */}
          {hudState && (
            <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-black/85 backdrop-blur-md border border-white/20 text-white font-bold text-sm sm:text-base shadow-2xl">
                {hudState.icon}
                <span>{hudState.text}</span>
              </div>
            </div>
          )}
        </div>

        {/* THANH ĐIỀU KHIỂN RẠP PHIM & TẮT ĐÈN & PHÍM TẮT */}
        <div className="flex flex-wrap items-center justify-between gap-2 py-2.5 px-1 text-xs text-gray-300">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* 1. Nút Rạp phim */}
            <button
              type="button"
              onClick={() => setIsTheaterMode(!isTheaterMode)}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border transition cursor-pointer text-xs ${
                isTheaterMode
                  ? "bg-netflix-red/90 text-white border-netflix-red font-medium"
                  : "bg-zinc-900/80 hover:bg-zinc-800 text-gray-300 hover:text-white border-white/10"
              }`}
            >
              {isTheaterMode ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Thu nhỏ</span>
                  <span className="hidden sm:inline text-white/60">(T)</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Rạp phim</span>
                  <span className="hidden sm:inline text-white/60">(T)</span>
                </>
              )}
            </button>

            {/* 2. Nút Tắt đèn */}
            <button
              type="button"
              onClick={() => setIsLightsOff(!isLightsOff)}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border transition cursor-pointer text-xs ${
                isLightsOff
                  ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/40 font-medium"
                  : "bg-zinc-900/80 hover:bg-zinc-800 text-gray-300 hover:text-white border-white/10"
              }`}
            >
              {isLightsOff ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Bật đèn</span>
                  <span className="hidden sm:inline text-white/60">(L)</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5" />
                  <span>Tắt đèn</span>
                  <span className="hidden sm:inline text-white/60">(L)</span>
                </>
              )}
            </button>

            {/* 3. Nút Toàn màn hình */}
            <button
              type="button"
              onClick={toggleFullscreen}
              title="Phóng to toàn màn hình (Phím F)"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-gray-300 hover:text-white border border-white/10 transition cursor-pointer text-xs"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Thoát Fullscreen</span>
                  <span className="text-white/60">(F)</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Toàn màn hình</span>
                  <span className="text-white/60">(F)</span>
                </>
              )}
            </button>

            {/* 4. Nút Hẹn giờ tắt */}
            <button
              type="button"
              onClick={() => setShowSleepTimerModal(true)}
              title="Hẹn giờ tắt phim thông minh"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-amber-400/90 hover:text-amber-300 border border-amber-500/20 hover:border-amber-500/40 transition cursor-pointer text-xs"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Hẹn giờ</span>
            </button>

            {/* 5. Nút Danh sách Phím tắt */}
            <button
              type="button"
              onClick={() => setShowShortcutModal(true)}
              title="Xem danh sách phím tắt (?)"
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-gray-400 hover:text-white border border-white/10 transition cursor-pointer text-xs"
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Phím tắt</span>
            </button>
          </div>

          {/* CỤM NÚT ĐIỀU HƯỚNG TẬP: TRƯỚC / SAU (CHUYỂN TỨC THÌ 0MS) */}
          <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
            {prevEpisode && (
              <Link
                href={`?ep=${prevEpisode.slug}`}
                scroll={false}
                onClick={(e) => {
                  if (switchEpisode && prevEpisode.slug) {
                    e.preventDefault();
                    switchEpisode(prevEpisode.slug);
                  }
                }}
                title={`Tập trước: ${prevEpisode.name} (Phím P)`}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-gray-300 hover:text-white transition font-medium border border-white/10 text-xs"
              >
                <SkipBack className="w-3.5 h-3.5" />
                <span>Tập trước</span>
                <span className="hidden md:inline"> ({prevEpisode.name}) [P]</span>
              </Link>
            )}
            {nextEpisode && (
              <Link
                href={`?ep=${nextEpisode.slug}`}
                scroll={false}
                onClick={(e) => {
                  if (switchEpisode && nextEpisode.slug) {
                    e.preventDefault();
                    switchEpisode(nextEpisode.slug);
                  }
                }}
                title={`Tập tiếp theo: ${nextEpisode.name} (Phím N)`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-netflix-red text-white transition font-semibold border border-white/10 shadow-md text-xs"
              >
                <span>Tập tiếp</span>
                <span className="hidden md:inline"> ({nextEpisode.name}) [N]</span>
                <SkipForward className="w-3.5 h-3.5 fill-white" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* MODAL DANH SÁCH PHÍM TẮT ĐẦY ĐỦ */}
      {showShortcutModal && (
        <div
          onClick={() => setShowShortcutModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-white/15 bg-zinc-950 p-6 shadow-2xl animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-2 font-bold text-base text-white">
                <Keyboard className="w-5 h-5 text-netflix-red" />
                <span>Phím tắt xem phim chuyên nghiệp</span>
              </div>
              <button
                type="button"
                onClick={() => setShowShortcutModal(false)}
                className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs sm:text-sm">
              {[
                { label: "Phát / Tạm dừng", key: "Space" },
                { label: "Toàn màn hình", key: "F" },
                { label: "Tua tới 10 giây", key: "→" },
                { label: "Tua lùi 10 giây", key: "←" },
                { label: "Tắt / Bật âm thanh", key: "M" },
                { label: "Tăng / Giảm âm lượng", key: "↑ / ↓" },
                { label: "Chế độ Rạp phim", key: "T" },
                { label: "Tắt / Bật đèn xung quanh", key: "L" },
                { label: "Chuyển về tập trước", key: "P" },
                { label: "Chuyển sang tập kế tiếp", key: "N" },
                { label: "Thoát chế độ / Đóng", key: "Esc" },
                { label: "Bật / Tắt bảng phím tắt", key: "?" },
              ].map(({ label, key }) => (
                <div key={key} className="flex items-center justify-between p-2 rounded-xl bg-zinc-900 border border-white/5">
                  <span className="text-gray-300">{label}</span>
                  <kbd className="px-2 py-0.5 rounded bg-zinc-800 border border-white/20 text-xs font-mono font-bold text-amber-300">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-3 border-t border-white/10 text-center">
              <button
                type="button"
                onClick={() => setShowShortcutModal(false)}
                className="w-full py-2.5 rounded-xl bg-netflix-red text-white text-xs sm:text-sm font-bold hover:bg-red-700 transition cursor-pointer shadow-lg"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HẸN GIỜ TẮT (SLEEP TIMER - LAZY LOADED) */}
      {showSleepTimerModal && (
        <SleepTimerModal
          isOpen={showSleepTimerModal}
          onClose={() => setShowSleepTimerModal(false)}
          hideTrigger={true}
        />
      )}

      {/* MODAL MÃ QR XEM TIẾP TRÊN ĐIỆN THOẠI ĐÚNG SỐ PHÚT (LAZY LOADED) */}
      {showQrModal && (
        <MobileQrModal
          isOpen={showQrModal}
          onClose={() => setShowQrModal(false)}
          triggerButton={false}
          title={title}
          movieSlug={watchContext?.movieSlug}
          activeEpisodeSlug={activeEpisodeSlug}
          activeEpisodeName={activeEpisodeName}
          currentTime={qrTime}
          duration={qrDuration}
        />
      )}
    </>
  );
};

export default CinemaPlayer;
