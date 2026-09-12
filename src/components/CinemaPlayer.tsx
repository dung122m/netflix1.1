"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  RotateCcw,
  Sparkles,
  Zap,
  Radio,
  Tv,
} from "lucide-react";
import { SleepTimerModal } from "./SleepTimerModal";

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
  embedSrc,
  videoLink,
  m3u8Link,
  trailerUrl,
  title,
  activeEpisodeName,
  activeEpisodeSlug,
  isTrailerOnly,
  posterUrl,
  episodes,
}) => {
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isLightsOff, setIsLightsOff] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [useIframeFallback, setUseIframeFallback] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showShortcutModal, setShowShortcutModal] = useState(false);
  const [showSleepTimerModal, setShowSleepTimerModal] = useState(false);
  const [bigCenterIcon, setBigCenterIcon] = useState<"play" | "pause" | null>(null);

  // HUD feedback khi bấm phím tắt
  const [hudState, setHudState] = useState<{ icon: React.ReactNode; text: string } | null>(null);
  const hudTimerRef = useRef<NodeJS.Timeout | null>(null);
  const centerIconTimerRef = useRef<NodeJS.Timeout | null>(null);
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const router = useRouter();

  // Floating Mini-Player States
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);
  const [dismissedMini, setDismissedMini] = useState(false);
  const [miniPlayerLoaded, setMiniPlayerLoaded] = useState(false);

  // Mobile Sticky State
  const [isMobile, setIsMobile] = useState(false);
  const [isScrolledPast, setIsScrolledPast] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const showHud = useCallback((icon: React.ReactNode, text: string) => {
    if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    setHudState({ icon, text });
    hudTimerRef.current = setTimeout(() => {
      setHudState(null);
    }, 1000);
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
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3200);
  }, [isPlaying]);

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

  // Tìm tập hiện tại, tập trước và tập kế tiếp
  const currentIndex = episodes.findIndex((ep) => ep.slug === activeEpisodeSlug);
  const prevEpisode = currentIndex > 0 ? episodes[currentIndex - 1] : null;
  const nextEpisode =
    currentIndex !== -1 && currentIndex < episodes.length - 1
      ? episodes[currentIndex + 1]
      : null;

  // Xác định xem có phát trực tiếp qua HTML5 Video Native HLS không
  const isNativeVideo = Boolean(m3u8Link && !useIframeFallback && videoLink);

  // Gửi lệnh điều khiển đến iframe player (dùng cho trường hợp fallback iframe)
  const sendPlayerCommand = useCallback((cmd: string, val?: any) => {
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

  // Bật/Tắt Toàn Màn Hình
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

  // TOGGLE PLAY / PAUSE CHUẨN XÁC (DÙNG ĐƯỢC NGAY CẢ KHI VỪA VÀO TRANG KHÔNG CẦN CLICK)
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

  // KHỞI TẠO NATIVE HLS VIDEO PLAYER & AUTOPLAY NGAY KHI VÀO TRANG
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !m3u8Link || useIframeFallback) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setIsBuffering(true);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
      });
      hlsRef.current = hls;
      hls.loadSource(m3u8Link);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsBuffering(false);
        // Tự động phát ngay lập tức khi người dùng chọn phim/tập
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
            })
            .catch(() => {
              // Nếu trình duyệt chặn âm thanh khi vào trực tiếp, tự động phát ở chế độ tắt tiếng
              video.muted = true;
              setIsMuted(true);
              video
                .play()
                .then(() => setIsPlaying(true))
                .catch(() => setIsPlaying(false));
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
              console.warn("HLS fatal error -> fallback to iframe embed:", data);
              setUseIframeFallback(true);
              break;
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari iOS / macOS Native HLS
      video.src = m3u8Link;
      const onLoaded = () => {
        setIsBuffering(false);
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
    } else {
      setUseIframeFallback(true);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [m3u8Link, useIframeFallback]);

  // LẮNG NGHE SỰ KIỆN VIDEO (TIẾN TRÌNH, ÂM LƯỢNG, BUFFER, KẾT THÚC)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.duration && !isNaN(video.duration)) {
        setDuration(video.duration);
      }
    };

    const handleProgress = () => {
      if (video.buffered.length > 0 && video.duration) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };

    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => {
      setIsBuffering(false);
      setIsPlaying(true);
    };
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      if (nextEpisode?.slug) {
        router.push(`?ep=${nextEpisode.slug}`, { scroll: false });
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("progress", handleProgress);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("progress", handleProgress);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
    };
  }, [nextEpisode, router]);

  // LẮNG NGHE THAY ĐỔI FULLSCREEN TỪ BROWSER
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // PHÁT HIỆN MÀN HÌNH MOBILE
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // LẮNG NGHE SCROLL ĐỂ GHIM CỐ ĐỊNH TRÊN MOBILE
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

  // DESKTOP MINI PLAYER OBSERVER
  useEffect(() => {
    if ((!activeSrc && !m3u8Link) || !containerRef.current) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        const isOutOfView = !entry.isIntersecting;
        setShowMiniPlayer(isOutOfView);
        if (!isOutOfView) {
          setDismissedMini(false);
        }
        if (isOutOfView && !miniPlayerLoaded) {
          setMiniPlayerLoaded(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: "-100px 0px 0px 0px",
      }
    );

    observerRef.current.observe(containerRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [videoLink, activeSrc, m3u8Link, miniPlayerLoaded]);

  // =========================================================================
  // TOÀN BỘ HỆ THỐNG PHÍM TẮT: SPACE, F, M, ←, →, ↑, ↓, T, L, P, N, ESC, ?
  // HOẠT ĐỘNG NGAY LẬP TỨC TỪ CẤP WINDOW (KHÔNG BẮT BUỘC PHẢI CLICK VÀO TRÌNH PHÁT)
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
        if (showShortcutModal) setShowShortcutModal(false);
        else if (showSleepTimerModal) setShowSleepTimerModal(false);
        else if (isLightsOff) setIsLightsOff(false);
        else if (isTheaterMode) setIsTheaterMode(false);
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
        router.push(`?ep=${prevEpisode.slug}`, { scroll: false });
        return;
      }

      // 12. Phím N: Tập kế tiếp
      if ((e.key === "n" || e.key === "N") && nextEpisode?.slug) {
        showHud(<SkipForward className="w-5 h-5 text-netflix-red" />, `Chuyển sang ${nextEpisode.name}`);
        router.push(`?ep=${nextEpisode.slug}`, { scroll: false });
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
    isMuted,
    isLightsOff,
    isTheaterMode,
    showShortcutModal,
    showSleepTimerModal,
    prevEpisode,
    nextEpisode,
    router,
    togglePlayPause,
    toggleFullscreen,
    sendPlayerCommand,
    showHud,
    resetControlsTimeout,
  ]);

  const scrollToPlayer = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Xử lý kéo thanh tiến trình (Scrub Bar)
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !videoRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    videoRef.current.currentTime = pos * duration;
    setCurrentTime(pos * duration);
  };

  // Format thời lượng hiển thị
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "00:00";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
    }
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

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

      {/* Điểm neo để phát hiện cuộn trang (Sentinel) */}
      <div ref={sentinelRef} className="w-full h-0 pointer-events-none" />

      {/* PLACEHOLDER KHI PLAYER ĐANG Ở CHẾ ĐỘ FIXED TOP TRÊN MOBILE */}
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

              {/* THANH ĐIỀU KHIỂN NATIVE NETFLIX HOVER CONTROLS (TỰ ĐỘNG ẨN HOÀN TOÀN KHI KHÔNG TƯƠNG TÁC) */}
              <div
                onClick={(e) => e.stopPropagation()}
                className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent pt-10 pb-3 px-3 sm:px-5 transition-opacity duration-300 z-30 ${
                  showControls || !isPlaying ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                }`}
              >
                {/* THANH TIẾN TRÌNH SCRUB BAR */}
                <div
                  ref={progressBarRef}
                  onClick={handleSeek}
                  className="w-full h-1.5 hover:h-2.5 bg-white/20 rounded-full cursor-pointer relative transition-all mb-3 group/bar"
                >
                  {/* Buffered */}
                  <div
                    className="absolute top-0 left-0 bottom-0 bg-white/30 rounded-full"
                    style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }}
                  />
                  {/* Played */}
                  <div
                    className="absolute top-0 left-0 bottom-0 bg-netflix-red rounded-full flex items-center justify-end"
                    style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                  >
                    <div className="w-3.5 h-3.5 rounded-full bg-white shadow-md scale-0 group-hover/bar:scale-100 transition-transform" />
                  </div>
                </div>

                {/* HÀNG CÁC NÚT ĐIỀU KHIỂN CHÍNH */}
                <div className="flex items-center justify-between text-white text-xs sm:text-sm">
                  <div className="flex items-center gap-2 sm:gap-4">
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
                        if (videoRef.current) videoRef.current.currentTime = Math.min(duration || 999999, videoRef.current.currentTime + 10);
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

                    {/* Thời lượng */}
                    <span className="text-[11px] sm:text-xs text-gray-300 font-mono">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  {/* Nút Phải */}
                  <div className="flex items-center gap-1.5 sm:gap-3">
                    {/* Chuyển qua Iframe Embed nếu muốn */}
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

          {/* CỤM NÚT ĐIỀU HƯỚNG TẬP: TRƯỚC / SAU */}
          <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
            {prevEpisode && (
              <Link
                href={`?ep=${prevEpisode.slug}`}
                scroll={false}
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

      {/* FLOATING MINI-PLAYER (DESKTOP ONLY) */}
      {videoLink && showMiniPlayer && !dismissedMini && !isTheaterMode && !isFullscreen && (
        <div className="hidden sm:block sm:fixed sm:bottom-6 sm:right-6 z-50 sm:w-80 md:w-96 aspect-video bg-zinc-950 sm:rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.95)] border border-white/20 animate-in slide-in-from-bottom-5 duration-200">
          <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/90 via-black/60 to-transparent p-2 sm:p-2.5 flex items-center justify-between z-20">
            <div className="flex items-center gap-1.5 min-w-0 pr-2">
              <span className="w-2 h-2 rounded-full bg-netflix-red animate-pulse flex-shrink-0" />
              <span className="text-white text-xs font-bold truncate drop-shadow-md">
                {title} {activeEpisodeName ? `• Tập ${activeEpisodeName}` : ""}
              </span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={scrollToPlayer}
                title="Quay lại khung lớn"
                className="p-1.5 rounded-full bg-black/70 text-gray-200 hover:text-white hover:bg-black/90 transition cursor-pointer backdrop-blur-md"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setDismissedMini(true)}
                title="Đóng trình phát góc"
                className="p-1.5 rounded-full bg-black/70 text-gray-200 hover:text-white hover:bg-black/90 transition cursor-pointer backdrop-blur-md"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {miniPlayerLoaded && (
            <iframe
              src={embedSrc}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              title={`Mini ${title}`}
              loading="lazy"
            />
          )}
        </div>
      )}

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

      {/* MODAL HẸN GIỜ TẮT (SLEEP TIMER) */}
      <SleepTimerModal
        isOpen={showSleepTimerModal}
        onClose={() => setShowSleepTimerModal(false)}
        hideTrigger={true}
      />
    </>
  );
};

export default CinemaPlayer;
