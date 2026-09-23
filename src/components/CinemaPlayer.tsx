"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import Hls from "hls.js";
import {
  Maximize2,
  Minimize2,
  Moon,
  Sun,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  ArrowUpRight,
  PictureInPicture,
  RotateCcw,
  Zap,
  VolumeX,
  Volume1,
  Volume2,
} from "lucide-react";
import { useWatchController } from "./WatchController";
import { getWatchProgress, saveWatchProgress } from "@/lib/watchHistory";
import { formatEpisodeName } from "@/lib/formatEpisode";
import { useAuth } from "@/context/AuthContext";
import { updateActivePlaybackSession } from "@/services/handoffService";
import { incrementUserWatchTime, getPlayerSettings, PlayerSettings } from "@/services/userService";
import { PlayerNativeControls } from "./player/PlayerNativeControls";
import { PlayerActionButtons } from "./player/PlayerActionButtons";
import { PlayerShortcutModal } from "./player/PlayerShortcutModal";
import { trackWatchStart, trackWatchProgress, trackWatchEnd } from "@/lib/analyticsClient";

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
  movieSlug?: string;
  activeEpisodeName?: string;
  activeEpisodeSlug?: string;
  isTrailerOnly: boolean;
  posterUrl: string;
  episodes?: EpisodeItem[];
  initialTime?: number;
}

export const CinemaPlayer: React.FC<CinemaPlayerProps> = ({
  embedSrc: propEmbedSrc,
  videoLink: propVideoLink,
  m3u8Link: propM3u8Link,
  trailerUrl,
  title: propTitle,
  movieSlug: propMovieSlug,
  activeEpisodeName: propActiveEpisodeName,
  activeEpisodeSlug: propActiveEpisodeSlug,
  isTrailerOnly: propIsTrailerOnly,
  posterUrl,
  episodes: propEpisodes,
  initialTime,
}) => {
  const watchContext = useWatchController();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const lastHandoffSyncRef = useRef<number>(0);

  const title = watchContext?.movieTitle || propTitle;
  const isTrailerOnly = watchContext?.isTrailerOnly ?? propIsTrailerOnly;
  const episodes = watchContext?.episodes || propEpisodes || [];
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
  const [playerSettings, setPlayerSettings] = useState<PlayerSettings>(() => getPlayerSettings(user?.uid));
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isLightsOff, setIsLightsOff] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
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

  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [qualityLevels, setQualityLevels] = useState<Array<{ id: number; label: string; height: number }>>([]);
  const [currentQualityIndex, setCurrentQualityIndex] = useState<number>(-1);
  const [knownDuration, setKnownDuration] = useState<number>(0);

  useEffect(() => {
    const current = getPlayerSettings(user?.uid);
    setPlayerSettings(current);
    if (current.defaultTheaterMode && typeof window !== "undefined" && window.innerWidth >= 1024) {
      setIsTheaterMode(true);
    }
    if (current.defaultLightsOff) {
      setIsLightsOff(true);
    }
    if (current.playbackSpeed && current.playbackSpeed !== 1) {
      setPlaybackSpeed(current.playbackSpeed);
    }

    const handleUpdate = (e: Event) => {
      const customEv = e as CustomEvent<{ settings?: PlayerSettings }>;
      if (customEv.detail?.settings) {
        setPlayerSettings(customEv.detail.settings);
      } else {
        setPlayerSettings(getPlayerSettings(user?.uid));
      }
    };

    window.addEventListener("player-settings-updated", handleUpdate);
    return () => window.removeEventListener("player-settings-updated", handleUpdate);
  }, [user?.uid]);

  const [hudState, setHudState] = useState<{ icon: React.ReactNode; text: string } | null>(null);
  const hudTimerRef = useRef<NodeJS.Timeout | null>(null);
  const centerIconTimerRef = useRef<NodeJS.Timeout | null>(null);
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const lastProgressSaveRef = useRef<number>(0);
  const hasTrackedWatchStartRef = useRef<string | null>(null);
  const lastAnalyticsProgressRef = useRef<number>(0);
  const pendingKeyboardSeekRef = useRef<{
    targetTime: number;
    totalDelta: number;
    timer: NodeJS.Timeout | null;
  }>({
    targetTime: 0,
    totalDelta: 0,
    timer: null,
  });

  const [isMobile, setIsMobile] = useState(false);
  const [isScrolledPast, setIsScrolledPast] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

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
      // Nếu có bất kỳ control nào bên trong player đang được focus, giữ hiển thị controls
      const active = document.activeElement;
      if (active && containerRef.current && containerRef.current.contains(active)) {
        return;
      }
      if (!videoRef.current || !videoRef.current.paused) {
        setShowControls(false);
      }
    }, 3200);
  }, []);

  const trailerEmbedSrc = useMemo(() => {
    if (videoLink || !trailerUrl) return null;
    const match = trailerUrl.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
    );
    return match
      ? `https://www.youtube-nocookie.com/embed/${match[1]}?autoplay=1&mute=0&controls=1&rel=0`
      : null;
  }, [videoLink, trailerUrl]);

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

  const [initialEpisodeSlug] = useState<string | undefined>(activeEpisodeSlug);
  const [initialTimeUsed, setInitialTimeUsed] = useState<boolean>(false);

  const urlParamT = searchParams?.get("t");
  const targetProgress = useMemo(() => {
    const isInitialEpisode = !initialEpisodeSlug || activeEpisodeSlug === initialEpisodeSlug;
    if (isInitialEpisode && !initialTimeUsed) {
      if (typeof initialTime === "number" && initialTime > 0) return initialTime;
      if (urlParamT) {
        const parsed = parseFloat(urlParamT);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
      if (typeof window !== "undefined") {
        try {
          const urlObj = new URL(window.location.href);
          const tVal = urlObj.searchParams.get("t");
          if (tVal) {
            const parsed = parseFloat(tVal);
            if (!isNaN(parsed) && parsed > 0) return parsed;
          }
        } catch {}
      }
    }
    const currentMovieSlug = watchContext?.movieSlug || propMovieSlug;
    const savedProgress = currentMovieSlug && activeEpisodeSlug ? getWatchProgress(currentMovieSlug, activeEpisodeSlug) : 0;
    return savedProgress > 3 ? savedProgress : 0;
  }, [initialTime, urlParamT, watchContext?.movieSlug, propMovieSlug, activeEpisodeSlug, initialEpisodeSlug, initialTimeUsed]);

  const hasSeekedInitialRef = useRef<boolean>(false);
  useEffect(() => {
    hasSeekedInitialRef.current = false;
    setUseIframeFallback(false);
    if (activeEpisodeSlug && initialEpisodeSlug && activeEpisodeSlug !== initialEpisodeSlug) {
      setInitialTimeUsed(true);
    }
  }, [activeEpisodeSlug, resolvedM3u8, initialEpisodeSlug]);

  const activeSrc = useMemo(() => {
    let src = videoLink ? embedSrc : trailerEmbedSrc;
    if (!src) return "";
    if (!src.includes("autoplay=")) {
      src += (src.includes("?") ? "&" : "?") + "autoplay=1";
    }
    if (targetProgress > 0 && !src.includes("t=") && !src.includes("time=")) {
      src += `&t=${Math.floor(targetProgress)}`;
    }
    return src;
  }, [videoLink, embedSrc, trailerEmbedSrc, targetProgress]);

  const isNativeVideo = Boolean(resolvedM3u8 && !useIframeFallback);

  const getEffectiveDuration = useCallback(() => {
    const v = videoRef.current;
    if (!v) return 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return knownDuration || (v as any).__hlsDuration || (v.duration && isFinite(v.duration) ? v.duration : 0);
  }, [knownDuration]);

  // Watch time heartbeat
  useEffect(() => {
    if (!user?.uid) return;
    const initialTimer = setTimeout(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        if (isNativeVideo && videoRef.current && (videoRef.current.paused || videoRef.current.ended)) return;
        incrementUserWatchTime(user.uid, 1);
      }
    }, 15000);

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      if (isNativeVideo && videoRef.current && (videoRef.current.paused || videoRef.current.ended)) return;
      incrementUserWatchTime(user.uid, 1);
    }, 60000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [user, isNativeVideo]);

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

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const webkitVideo = video as any;
    if (webkitVideo && typeof webkitVideo.webkitEnterFullscreen === "function" && isNativeVideo) {
      try {
        webkitVideo.webkitEnterFullscreen();
        setIsFullscreen(true);
        lockLandscape();
        showHud(<Maximize2 className="w-5 h-5 text-netflix-red" />, "Toàn màn hình (iOS)");
        return;
      } catch (e) {
        console.warn("iOS fullscreen fallback:", e);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = document as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const elem = container as any;
    const fullscreenElement = doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement;

    if (!fullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen({ navigationUI: "hide" } as FullscreenOptions).then(lockLandscape).catch(() => {
          if (elem.requestFullscreen) {
            elem.requestFullscreen().then(lockLandscape).catch(() => {});
          }
        });
        setIsFullscreen(true);
        showHud(<Maximize2 className="w-5 h-5 text-netflix-red" />, "Toàn màn hình");
      } else {
        const requestFS = elem.webkitRequestFullscreen || elem.mozRequestFullScreen || elem.msRequestFullscreen;
        if (requestFS) {
          requestFS.call(elem);
          setIsFullscreen(true);
          lockLandscape();
          showHud(<Maximize2 className="w-5 h-5 text-netflix-red" />, "Toàn màn hình");
        }
      }
    } else {
      const exitFS = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;
      if (exitFS) {
        exitFS.call(doc).catch(() => {});
        setIsFullscreen(false);
        unlockOrientation();
        showHud(<Minimize2 className="w-5 h-5 text-gray-300" />, "Thoát toàn màn hình");
      }
    }
  }, [isNativeVideo, lockLandscape, unlockOrientation, showHud]);

  useEffect(() => {
    const handleFsChange = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc = document as any;
      const isFs = Boolean(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);
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

  const handleQualityChange = useCallback((levelIndex: number) => {
    if (!hlsRef.current) return;
    hlsRef.current.currentLevel = levelIndex;
    setCurrentQualityIndex(levelIndex);
    const label = levelIndex === -1 ? "Tự động (Auto)" : qualityLevels.find((q) => q.id === levelIndex)?.label || "Đã đổi";
    showHud(<Zap className="w-5 h-5 text-sky-400" />, `Chất lượng: ${label}`);
  }, [qualityLevels, showHud]);

  const handleSpeedChange = useCallback((spd: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = spd;
      setPlaybackSpeed(spd);
      showHud(<Zap className="w-5 h-5 text-amber-400" />, `Tốc độ: ${spd}x`);
    }
  }, [showHud]);

  const handleVolumeDelta = useCallback((delta: number) => {
    setVolume((prevVol) => {
      let current = prevVol;
      if (delta > 0 && isMuted) {
        if (videoRef.current) {
          videoRef.current.muted = false;
        }
        setIsMuted(false);
        current = Math.max(0.1, prevVol);
      }
      const newVol = Math.max(0, Math.min(1, Math.round((current + delta) * 100) / 100));
      if (videoRef.current) {
        videoRef.current.volume = newVol;
        videoRef.current.muted = newVol === 0;
      }
      setIsMuted(newVol === 0);
      const percent = Math.round(newVol * 100);
      if (newVol === 0) {
        showHud(<VolumeX className="w-5 h-5 text-rose-400" />, "Âm lượng: 0% (Tắt tiếng)");
      } else if (newVol < 0.5) {
        showHud(<Volume1 className="w-5 h-5 text-emerald-400" />, `Âm lượng: ${percent}%`);
      } else {
        showHud(<Volume2 className="w-5 h-5 text-emerald-400" />, `Âm lượng: ${percent}%`);
      }
      return newVol;
    });
  }, [isMuted, showHud]);

  // HLS lifecycle
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !resolvedM3u8 || useIframeFallback) {
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
    video.pause();
    try {
      video.currentTime = targetProgress > 0 ? targetProgress : 0;
    } catch {}
    video.removeAttribute("src");
    video.load();

    const currentMovieSlug = watchContext?.movieSlug || propMovieSlug;

    const trySeekToTarget = () => {
      if (targetProgress <= 0 || hasSeekedInitialRef.current) return;
      hasSeekedInitialRef.current = true;
      const v = videoRef.current;
      if (!v) return;
      try {
        v.currentTime = targetProgress;
      } catch {}
    };

    if (targetProgress > 0) {
      const mins = Math.floor(targetProgress / 60);
      const secs = (Math.floor(targetProgress) % 60).toString().padStart(2, "0");
      showHud(
        <RotateCcw className="w-5 h-5 text-netflix-red" />,
        (!initialTimeUsed && (initialTime || urlParamT))
          ? `Bắt đầu xem từ mốc: ${mins}:${secs}`
          : `Tiếp tục xem từ ${mins}:${secs}`
      );
      if (currentMovieSlug && activeEpisodeSlug) {
        saveWatchProgress(currentMovieSlug, targetProgress, video.duration || 0, activeEpisodeSlug);
      }
    }

    const seekTimeouts: NodeJS.Timeout[] = [];

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        capLevelToPlayerSize: true,
        maxBufferSize: 60 * 1000 * 1000,
        maxBufferLength: 60,
        maxMaxBufferLength: 90,
        backBufferLength: 60,
        startPosition: targetProgress > 0 ? targetProgress : -1,
        startLevel: -1,
        autoStartLoad: true,
        abrEwmaDefaultEstimate: 5000000,
      });
      hlsRef.current = hls;
      hls.loadSource(resolvedM3u8);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        setIsBuffering(false);
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

        trySeekToTarget();

        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
            })
            .catch(() => {
              video.muted = true;
              setIsMuted(true);
              video
                .play()
                .then(() => {
                  setIsPlaying(true);
                })
                .catch(() => setIsPlaying(false));
            });
        }
      });

      const updateHlsDuration = (_event: unknown, data: { details?: { totalduration?: number } }) => {
        if (data?.details?.totalduration && data.details.totalduration > 0 && isFinite(data.details.totalduration)) {
          const totalSecs = data.details.totalduration;
          setKnownDuration(totalSecs);
          if (videoRef.current) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (videoRef.current as any).__hlsDuration = totalSecs;
            videoRef.current.dispatchEvent(new Event("durationchange"));
          }
        }
      };

      hls.on(Hls.Events.LEVEL_LOADED, updateHlsDuration);
      hls.on(Hls.Events.LEVEL_UPDATED, updateHlsDuration);

      const onCanPlay = () => trySeekToTarget();
      video.addEventListener("canplay", onCanPlay, { once: true });

      // Fallback seek duy nhất sau khi player đã sẵn sàng nếu startPosition chưa khớp
      seekTimeouts.push(
        setTimeout(() => {
          if (!hasSeekedInitialRef.current && targetProgress > 0 && videoRef.current) {
            trySeekToTarget();
          }
        }, 1200)
      );

      const fallbackToIframe = () => {
        hls.destroy();
        setUseIframeFallback(true);
      };

      let retryCount = 0;
      let mediaRetryCount = 0;
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              retryCount += 1;
              if (retryCount <= 2) {
                hls.startLoad();
              } else {
                fallbackToIframe();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              mediaRetryCount += 1;
              if (mediaRetryCount <= 1) {
                hls.recoverMediaError();
              } else {
                fallbackToIframe();
              }
              break;
            default:
              fallbackToIframe();
            break;
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = resolvedM3u8;
      const onLoaded = () => {
        setIsBuffering(false);
        trySeekToTarget();
        video
          .play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch(() => {
            video.muted = true;
            setIsMuted(true);
            video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
          });
      };
      const onNativeError = () => {
        setIsBuffering(false);
        setUseIframeFallback(true);
      };
      video.addEventListener("loadedmetadata", onLoaded);
      video.addEventListener("error", onNativeError);

      // Fallback seek duy nhất cho Native Safari
      seekTimeouts.push(
        setTimeout(() => {
          if (!hasSeekedInitialRef.current && targetProgress > 0 && videoRef.current) {
            trySeekToTarget();
          }
        }, 1000)
      );

      return () => {
        video.removeEventListener("loadedmetadata", onLoaded);
        video.removeEventListener("error", onNativeError);
        seekTimeouts.forEach((t) => clearTimeout(t));
      };
    }

    return () => {
      seekTimeouts.forEach((t) => clearTimeout(t));
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [
    resolvedM3u8,
    useIframeFallback,
    activeEpisodeSlug,
    watchContext?.movieSlug,
    propMovieSlug,
    targetProgress,
    initialTime,
    urlParamT,
    initialTimeUsed,
    showHud,
  ]);

  // Video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const movieSlug = watchContext?.movieSlug || propMovieSlug;

    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => {
      setIsBuffering(false);
      setIsPlaying(true);
      const epKey = `${movieSlug || "movie"}:${activeEpisodeSlug || "ep"}`;
      if (movieSlug && hasTrackedWatchStartRef.current !== epKey) {
        hasTrackedWatchStartRef.current = epKey;
        trackWatchStart({
          movieSlug,
          movieTitle: title,
          episodeSlug: activeEpisodeSlug,
          episodeName: activeEpisodeName,
          userId: user?.uid,
        });
      }
    };
    const handlePause = () => {
      setIsPlaying(false);
      const currentEffectiveDuration = getEffectiveDuration();
      if (movieSlug && activeEpisodeSlug && video.currentTime > 5) {
        saveWatchProgress(movieSlug, video.currentTime, currentEffectiveDuration, activeEpisodeSlug);
      }
      if (user?.uid && movieSlug && video.currentTime > 5) {
        updateActivePlaybackSession(user.uid, {
          movieSlug,
          movieTitle: title,
          episodeName: activeEpisodeName,
          episodeSlug: activeEpisodeSlug,
          currentTime: video.currentTime,
          duration: currentEffectiveDuration,
          posterUrl,
        });
      }
      if (movieSlug && video.currentTime > 5) {
        trackWatchProgress({
          movieSlug,
          movieTitle: title,
          episodeSlug: activeEpisodeSlug,
          episodeName: activeEpisodeName,
          userId: user?.uid,
          progressSeconds: video.currentTime,
          durationSeconds: currentEffectiveDuration,
        });
      }
    };

    const handleTimeUpdateThrottled = () => {
      const now = Date.now();
      if (now - lastProgressSaveRef.current > 3000) {
        lastProgressSaveRef.current = now;
        const currentEffectiveDuration = getEffectiveDuration();
        if (movieSlug && activeEpisodeSlug && video.currentTime > 0) {
          saveWatchProgress(movieSlug, video.currentTime, currentEffectiveDuration, activeEpisodeSlug);
        }
      }
      if (user?.uid && now - lastHandoffSyncRef.current > 8000 && movieSlug && video.currentTime > 5) {
        lastHandoffSyncRef.current = now;
        const currentEffectiveDuration = getEffectiveDuration();
        updateActivePlaybackSession(user.uid, {
          movieSlug,
          movieTitle: title,
          episodeName: activeEpisodeName,
          episodeSlug: activeEpisodeSlug,
          currentTime: video.currentTime,
          duration: currentEffectiveDuration,
          posterUrl,
        });
      }
      // Throttled watch progress analytics (every 45-60s)
      if (movieSlug && now - lastAnalyticsProgressRef.current > 45000 && video.currentTime > 5) {
        lastAnalyticsProgressRef.current = now;
        const currentEffectiveDuration = getEffectiveDuration();
        trackWatchProgress({
          movieSlug,
          movieTitle: title,
          episodeSlug: activeEpisodeSlug,
          episodeName: activeEpisodeName,
          userId: user?.uid,
          progressSeconds: video.currentTime,
          durationSeconds: currentEffectiveDuration,
        });
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      const currentEffectiveDuration = getEffectiveDuration();
      if (movieSlug) {
        trackWatchEnd({
          movieSlug,
          movieTitle: title,
          episodeSlug: activeEpisodeSlug,
          episodeName: activeEpisodeName,
          userId: user?.uid,
          progressSeconds: video.currentTime,
          durationSeconds: currentEffectiveDuration,
        });
      }
      if (playerSettings.autoNextEpisode !== false && nextEpisode?.slug && switchEpisode) {
        switchEpisode(nextEpisode.slug);
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
  }, [
    nextEpisode,
    switchEpisode,
    watchContext?.movieSlug,
    propMovieSlug,
    activeEpisodeSlug,
    user?.uid,
    title,
    activeEpisodeName,
    posterUrl,
    targetProgress,
    getEffectiveDuration,
    playerSettings.autoNextEpisode,
  ]);

  // Mobile sticky detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsScrolledPast(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 }
    );

    if (sentinelRef.current) observer.observe(sentinelRef.current);

    return () => {
      window.removeEventListener("resize", checkMobile);
      observer.disconnect();
    };
  }, []);

  // Global Keyboard shortcuts & TV Player Focus Navigation (YouTube Style Direct Playback & 4-Tier Control Navigation)
  useEffect(() => {
    const pendingSeek = pendingKeyboardSeekRef.current;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target &&
        ((target.tagName === "INPUT" && target.getAttribute("type") !== "range") ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if (isInput) return;

      const active = document.activeElement as HTMLElement | null;
      const isPlayerContainer = Boolean(
        containerRef.current &&
        active &&
        (containerRef.current === active || containerRef.current.contains(active))
      );

      const isEpisodeFocused = Boolean(active && active.hasAttribute("data-tv-episode"));
      const isPlayerControlFocused = Boolean(active && active.hasAttribute("data-player-control"));
      const isMenuFocused = Boolean(
        containerRef.current?.querySelector('[data-player-menu-item="true"]') &&
        active?.hasAttribute("data-player-menu-item")
      );
      const isActionButtonFocused = Boolean(active && active.getAttribute("data-control-section") === "action-buttons");
      const isMainControlFocused = Boolean(active && active.getAttribute("data-control-section") === "main-controls");
      const isScrubBarFocused = Boolean(active && active.getAttribute("data-control-id") === "scrub-bar");

      const isPlayerFocused = Boolean(isPlayerContainer || isEpisodeFocused || isPlayerControlFocused || isMenuFocused || isFullscreen);

      // Nếu focus đang ở ngoài player (ví dụ trên Navbar, MediaCard, Comment...) -> CinemaPlayer hoàn toàn nhường quyền cho TvNavigationHandler
      const isExternalFocused = Boolean(
        active &&
          (active.hasAttribute("data-tv-card") ||
            active.hasAttribute("data-tv-nav") ||
            active.hasAttribute("data-tv-hero") ||
            active.hasAttribute("data-tv-filter") ||
            active.hasAttribute("data-tv-filter-chip") ||
            active.hasAttribute("data-tv-recommendation") ||
            active.hasAttribute("data-tv-live") ||
            active.hasAttribute("data-tv-pagination") ||
            active.closest("nav") ||
            active.closest(".nanaflix-navbar") ||
            active.closest("footer"))
      );
      if (isExternalFocused) return;

      // Phân biệt Direct Playback Mode vs Control Navigation
      const isSpecificControlFocused = Boolean(
        isScrubBarFocused ||
        isMainControlFocused ||
        isActionButtonFocused ||
        isEpisodeFocused ||
        isMenuFocused
      );
      const isDirectPlaybackMode = isPlayerFocused && !isSpecificControlFocused;

      // ============================================================
      // 1. PHÍM ESCAPE & BACKSPACE: ĐÓNG MODAL / THOÁT FOCUS
      // ============================================================
      if (e.key === "Escape" || e.key === "Backspace") {
        // A. Đóng modals trình phát
        if (showShortcutModal || showSleepTimerModal || showQrModal) {
          e.preventDefault();
          setShowShortcutModal(false);
          setShowSleepTimerModal(false);
          setShowQrModal(false);
          return;
        }

        // B. Bật đèn lại nếu đang tắt
        if (isLightsOff) {
          e.preventDefault();
          setIsLightsOff(false);
          return;
        }

        // C. Thoát toàn màn hình nếu đang fullscreen
        if (isFullscreen) {
          e.preventDefault();
          toggleFullscreen();
          return;
        }

        // D. Thoát focus sub-control và trở về Direct Playback Mode
        if (isSpecificControlFocused && active) {
          e.preventDefault();
          containerRef.current?.focus();
          if (isPlaying) {
            setShowControls(false);
          }
          return;
        }

        // E. Đóng overlay controls nếu đang mở khi đang phát
        if (showControls && isPlaying) {
          e.preventDefault();
          setShowControls(false);
          return;
        }

        // Ngăn trình duyệt tự ý history.back() khi người dùng đang ở trong ngữ cảnh player
        if (e.key === "Backspace" && isPlayerFocused) {
          e.preventDefault();
          return;
        }
      }

      // ============================================================
      // 2. PHÍM SPACE / ENTER / K: PHÁT / TẠM DỪNG (DIRECT PLAYBACK)
      // ============================================================
      if (
        e.code === "Space" ||
        e.key === " " ||
        e.key === "Enter" ||
        e.key === "k" ||
        e.key === "K"
      ) {
        // Khi ở Direct Playback Mode (focus tại player container / video, không focus nút con cụ thể)
        if (isDirectPlaybackMode) {
          e.preventDefault();
          e.stopPropagation();
          togglePlayPause();
          return;
        }

        // Nếu focus đang ở control con cụ thể:
        // - Với phím Enter / Space trên button: để native button tự kích hoạt onClick
        if (active && (active.tagName === "BUTTON" || active.tagName === "A")) {
          return;
        }

        // Fallback cho Space/k
        if (e.code === "Space" || e.key === " " || e.key === "k" || e.key === "K") {
          e.preventDefault();
          togglePlayPause();
          return;
        }
      }

      // ============================================================
      // 3. CÁC PHÍM TẮT CHỨC NĂNG (F, M, T, L, P, N, ?)
      // ============================================================
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
        return;
      }
      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        if (isNativeVideo && videoRef.current) {
          videoRef.current.muted = !videoRef.current.muted;
          setIsMuted(videoRef.current.muted);
          showHud(<Zap className="w-5 h-5 text-rose-400" />, videoRef.current.muted ? "Đã tắt âm" : "Đã bật âm");
        }
        return;
      }
      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        setIsTheaterMode((prev) => !prev);
        return;
      }
      if (e.key === "l" || e.key === "L") {
        e.preventDefault();
        setIsLightsOff((prev) => {
          const next = !prev;
          showHud(next ? <Moon className="w-5 h-5 text-yellow-300" /> : <Sun className="w-5 h-5 text-yellow-400" />, next ? "Đã tắt đèn" : "Đã bật đèn");
          return next;
        });
        return;
      }
      if ((e.key === "p" || e.key === "P") && prevEpisode?.slug && switchEpisode) {
        showHud(<SkipBack className="w-5 h-5 text-netflix-red" />, `Chuyển về ${prevEpisode.name}`);
        switchEpisode(prevEpisode.slug);
        return;
      }
      if ((e.key === "n" || e.key === "N") && nextEpisode?.slug && switchEpisode) {
        showHud(<SkipForward className="w-5 h-5 text-netflix-red" />, `Chuyển sang ${nextEpisode.name}`);
        switchEpisode(nextEpisode.slug);
        return;
      }
      if (e.key === "?" || (e.key === "/" && !e.shiftKey)) {
        setShowShortcutModal((prev) => !prev);
        return;
      }

      // ============================================================
      // 4. DIRECT PLAYBACK MODE: D-PAD TUA VIDEO (← / →) & ÂM LƯỢNG (↑ / ↓)
      // Chuẩn YouTube TV: Không yêu cầu focus vào ScrubBar hay volume button
      // ============================================================
      if (isDirectPlaybackMode) {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          e.stopPropagation();
          if (isNativeVideo && videoRef.current) {
            const delta = e.key === "ArrowRight" ? 10 : -10;
            const v = videoRef.current;
            const effectiveDuration = getEffectiveDuration();

            const baseTime =
              pendingKeyboardSeekRef.current.timer !== null
                ? pendingKeyboardSeekRef.current.targetTime
                : v.currentTime || 0;

            const newTarget = Math.max(
              0,
              effectiveDuration > 0 ? Math.min(effectiveDuration, baseTime + delta) : baseTime + delta
            );
            const newTotalDelta =
              (pendingKeyboardSeekRef.current.timer !== null
                ? pendingKeyboardSeekRef.current.totalDelta
                : 0) + delta;

            pendingKeyboardSeekRef.current.targetTime = newTarget;
            pendingKeyboardSeekRef.current.totalDelta = newTotalDelta;

            if (newTotalDelta > 0) {
              showHud(<SkipForward className="w-5 h-5 text-netflix-red fill-current" />, `Tua tới +${newTotalDelta}s`);
            } else {
              showHud(<SkipBack className="w-5 h-5 text-netflix-red fill-current" />, `Tua lùi ${newTotalDelta}s`);
            }

            if (pendingKeyboardSeekRef.current.timer) {
              clearTimeout(pendingKeyboardSeekRef.current.timer);
            }

            pendingKeyboardSeekRef.current.timer = setTimeout(() => {
              if (videoRef.current) {
                videoRef.current.currentTime = pendingKeyboardSeekRef.current.targetTime;
              }
              pendingKeyboardSeekRef.current.timer = null;
              pendingKeyboardSeekRef.current.totalDelta = 0;
            }, 250);
          }
          resetControlsTimeout();
          return;
        }

        if (e.key === "ArrowUp") {
          e.preventDefault();
          e.stopPropagation();
          handleVolumeDelta(0.05);
          resetControlsTimeout();
          return;
        }

        if (e.key === "ArrowDown") {
          e.preventDefault();
          e.stopPropagation();
          handleVolumeDelta(-0.05);
          resetControlsTimeout();
          return;
        }
      }

      // ============================================================
      // 5. CONTROL NAVIGATION MODE (TV FOCUS NAVIGATION 4 TẦNG)
      // Khi người dùng chủ động focus vào một sub-control (ScrubBar, Main Controls, Action Buttons, EpisodeList)
      // ============================================================
      if (
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight" ||
        e.key === "ArrowUp" ||
        e.key === "ArrowDown"
      ) {
        // Helper: Focus và cuộn mượt episode vào viewport
        const focusEpisodeItem = (el: HTMLElement) => {
          el.focus({ preventScroll: true });
          el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
        };

        // A. Menu popup (Tốc độ / Chất lượng) đang mở
        const menuItems = containerRef.current
          ? Array.from(containerRef.current.querySelectorAll<HTMLElement>('[data-player-menu-item="true"]'))
          : [];
        if (menuItems.length > 0) {
          const currentMenuIdx = menuItems.findIndex((el) => el === active);
          if (e.key === "ArrowDown") {
            e.preventDefault();
            const nextIdx = currentMenuIdx < menuItems.length - 1 ? currentMenuIdx + 1 : 0;
            menuItems[nextIdx]?.focus();
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            const prevIdx = currentMenuIdx > 0 ? currentMenuIdx - 1 : menuItems.length - 1;
            menuItems[prevIdx]?.focus();
            return;
          }
        }

        // B. TẦNG 3: Focus đang ở EpisodeList (Danh sách tập phim)
        if (isEpisodeFocused && active) {
          const allEpisodes = Array.from(
            document.querySelectorAll<HTMLElement>('[data-tv-episode="true"]')
          ).filter((el) => el.offsetParent !== null);

          const currentEpIdx = allEpisodes.findIndex((el) => el === active);

          if (e.key === "ArrowRight" && currentEpIdx < allEpisodes.length - 1) {
            e.preventDefault();
            focusEpisodeItem(allEpisodes[currentEpIdx + 1]);
            return;
          }
          if (e.key === "ArrowLeft" && currentEpIdx > 0) {
            e.preventDefault();
            focusEpisodeItem(allEpisodes[currentEpIdx - 1]);
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            const currentRect = active.getBoundingClientRect();
            const below = allEpisodes.filter((el) => el.getBoundingClientRect().top >= currentRect.bottom - 5);
            if (below.length > 0) {
              const currentX = currentRect.left + currentRect.width / 2;
              below.sort((a, b) => {
                const ra = a.getBoundingClientRect();
                const rb = b.getBoundingClientRect();
                return Math.abs(ra.left + ra.width / 2 - currentX) - Math.abs(rb.left + rb.width / 2 - currentX);
              });
              focusEpisodeItem(below[0]);
            } else {
              // Hàng cuối cùng của EpisodeList -> Boundary exit xuống Content bên dưới
              const recControls = Array.from(
                document.querySelectorAll<HTMLElement>('[data-tv-recommendation="true"]')
              ).filter((el) => el.offsetParent !== null);
              if (recControls.length > 0) {
                recControls[0].focus({ preventScroll: true });
                recControls[0].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
              } else {
                const cards = Array.from(
                  document.querySelectorAll<HTMLElement>('[data-tv-card="true"]')
                ).filter((el) => el.offsetParent !== null);
                if (cards.length > 0) {
                  cards[0].focus({ preventScroll: true });
                  cards[0].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
                }
              }
            }
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            const currentRect = active.getBoundingClientRect();
            const above = allEpisodes.filter((el) => el.getBoundingClientRect().bottom <= currentRect.top + 5);
            if (above.length > 0) {
              const currentX = currentRect.left + currentRect.width / 2;
              above.sort((a, b) => {
                const ra = a.getBoundingClientRect();
                const rb = b.getBoundingClientRect();
                return Math.abs(ra.left + ra.width / 2 - currentX) - Math.abs(rb.left + rb.width / 2 - currentX);
              });
              focusEpisodeItem(above[0]);
            } else {
              // Hàng trên cùng của EpisodeList -> Chuyển lên TẦNG 2 (PlayerActionButtons)
              const actionBtns = Array.from(
                document.querySelectorAll<HTMLElement>('[data-control-section="action-buttons"]')
              ).filter((el) => el.offsetParent !== null);

              if (actionBtns.length > 0) {
                actionBtns[0]?.focus();
              } else {
                // Nếu không có action buttons -> Chuyển lên TẦNG 1 (Main Controls)
                const playBtn = containerRef.current?.querySelector<HTMLElement>(
                  '[data-control-section="main-controls"]'
                );
                playBtn?.focus();
                setShowControls(true);
                resetControlsTimeout();
              }
            }
            return;
          }
        }

        // C. TẦNG 2: Focus đang ở PlayerActionButtons (Rạp phim, Tắt đèn, Hẹn giờ, Phím tắt, Tập trước/sau...)
        if (isActionButtonFocused) {
          const allActionBtns = Array.from(
            document.querySelectorAll<HTMLElement>('[data-control-section="action-buttons"]')
          ).filter((el) => el.offsetParent !== null);

          const currentIdx = allActionBtns.findIndex((el) => el === active);

          if (e.key === "ArrowRight") {
            e.preventDefault();
            const nextIdx = currentIdx < allActionBtns.length - 1 ? currentIdx + 1 : 0;
            allActionBtns[nextIdx]?.focus();
            return;
          }
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            const prevIdx = currentIdx > 0 ? currentIdx - 1 : allActionBtns.length - 1;
            allActionBtns[prevIdx]?.focus();
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            // Chuyển lên TẦNG 1 (Main Controls)
            const mainCtrls = Array.from(
              containerRef.current?.querySelectorAll<HTMLElement>('[data-control-section="main-controls"]') || []
            ).filter((el) => el.offsetParent !== null);

            if (mainCtrls.length > 0) {
              mainCtrls[0]?.focus();
              setShowControls(true);
              resetControlsTimeout();
            }
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            // Chuyển xuống TẦNG 3 (EpisodeList)
            const targetEp =
              (activeEpisodeSlug && document.querySelector<HTMLElement>(`[data-tv-episode="true"][data-episode-slug="${activeEpisodeSlug}"]`)) ||
              document.querySelector<HTMLElement>('[data-tv-episode="true"]');
            if (targetEp) {
              focusEpisodeItem(targetEp);
            } else {
              const recControls = Array.from(
                document.querySelectorAll<HTMLElement>('[data-tv-recommendation="true"]')
              ).filter((el) => el.offsetParent !== null);
              if (recControls.length > 0) {
                recControls[0].focus({ preventScroll: true });
                recControls[0].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
              } else {
                const cards = Array.from(
                  document.querySelectorAll<HTMLElement>('[data-tv-card="true"]')
                ).filter((el) => el.offsetParent !== null);
                if (cards.length > 0) {
                  cards[0].focus({ preventScroll: true });
                  cards[0].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
                }
              }
            }
            return;
          }
        }

        // D. TẦNG 1: Focus đang ở Main Controls (Play, Tua, Vol, Tốc độ, Chất lượng, PiP, Fullscreen...)
        if (isMainControlFocused) {
          const mainCtrls = Array.from(
            containerRef.current?.querySelectorAll<HTMLElement>('[data-control-section="main-controls"]') || []
          ).filter((el) => el.offsetParent !== null);

          const currentIdx = mainCtrls.findIndex((el) => el === active);

          if (e.key === "ArrowRight") {
            e.preventDefault();
            const nextIdx = currentIdx < mainCtrls.length - 1 ? currentIdx + 1 : 0;
            mainCtrls[nextIdx]?.focus();
            resetControlsTimeout();
            return;
          }
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            const prevIdx = currentIdx > 0 ? currentIdx - 1 : mainCtrls.length - 1;
            mainCtrls[prevIdx]?.focus();
            resetControlsTimeout();
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            // Chuyển lên TẦNG 0 (Scrub Bar) hoặc Header/Navbar
            const scrubBar = containerRef.current?.querySelector<HTMLElement>('[data-control-id="scrub-bar"]');
            if (scrubBar) {
              scrubBar.focus();
              resetControlsTimeout();
            } else {
              const navItem =
                document.querySelector<HTMLElement>('nav a[data-tv-nav="true"].light-nav-active') ||
                document.querySelector<HTMLElement>('[data-tv-nav="true"]');
              if (navItem) {
                navItem.focus();
                window.scrollTo({ top: 0, behavior: "smooth" });
                if (isPlaying) {
                  setShowControls(false);
                }
              }
            }
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            // Chuyển xuống TẦNG 2 (PlayerActionButtons)
            const actionBtns = Array.from(
              document.querySelectorAll<HTMLElement>('[data-control-section="action-buttons"]')
            ).filter((el) => el.offsetParent !== null);

            if (actionBtns.length > 0) {
              actionBtns[0]?.focus();
            } else {
              const targetEp =
                (activeEpisodeSlug && document.querySelector<HTMLElement>(`[data-tv-episode="true"][data-episode-slug="${activeEpisodeSlug}"]`)) ||
                document.querySelector<HTMLElement>('[data-tv-episode="true"]');
              if (targetEp) {
                focusEpisodeItem(targetEp);
              } else {
                const cards = Array.from(
                  document.querySelectorAll<HTMLElement>('[data-tv-card="true"]')
                ).filter((el) => el.offsetParent !== null);
                if (cards.length > 0) {
                  cards[0].focus({ preventScroll: true });
                  cards[0].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
                }
              }
            }
            return;
          }
        }

        // E. TẦNG 0: Focus đang ở Scrub Bar (Thanh tiến trình)
        if (isScrubBarFocused) {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            // Chuyển xuống TẦNG 1 (Main Controls)
            const playBtn = containerRef.current?.querySelector<HTMLElement>('[data-control-section="main-controls"]');
            if (playBtn) {
              playBtn.focus();
              resetControlsTimeout();
            }
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            // Boundary exit: Chuyển lên Header / Navbar
            const navItem =
              document.querySelector<HTMLElement>('nav a[data-tv-nav="true"].light-nav-active') ||
              document.querySelector<HTMLElement>('[data-tv-nav="true"]');
            if (navItem) {
              navItem.focus();
              window.scrollTo({ top: 0, behavior: "smooth" });
              if (isPlaying) {
                setShowControls(false);
              }
            }
            return;
          }
          // ArrowLeft / ArrowRight trên scrub bar tua video
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            if (isNativeVideo && videoRef.current) {
              const delta = e.key === "ArrowRight" ? 10 : -10;
              const v = videoRef.current;
              const effectiveDuration = getEffectiveDuration();

              const baseTime =
                pendingKeyboardSeekRef.current.timer !== null
                  ? pendingKeyboardSeekRef.current.targetTime
                  : v.currentTime || 0;

              const newTarget = Math.max(
                0,
                effectiveDuration > 0 ? Math.min(effectiveDuration, baseTime + delta) : baseTime + delta
              );
              const newTotalDelta =
                (pendingKeyboardSeekRef.current.timer !== null
                  ? pendingKeyboardSeekRef.current.totalDelta
                  : 0) + delta;

              pendingKeyboardSeekRef.current.targetTime = newTarget;
              pendingKeyboardSeekRef.current.totalDelta = newTotalDelta;

              if (newTotalDelta > 0) {
                showHud(<SkipForward className="w-5 h-5 text-netflix-red fill-current" />, `Tua tới +${newTotalDelta}s`);
              } else {
                showHud(<SkipBack className="w-5 h-5 text-netflix-red fill-current" />, `Tua lùi ${newTotalDelta}s`);
              }

              if (pendingKeyboardSeekRef.current.timer) {
                clearTimeout(pendingKeyboardSeekRef.current.timer);
              }

              pendingKeyboardSeekRef.current.timer = setTimeout(() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = pendingKeyboardSeekRef.current.targetTime;
                }
                pendingKeyboardSeekRef.current.timer = null;
                pendingKeyboardSeekRef.current.totalDelta = 0;
              }, 250);
            }
            resetControlsTimeout();
            return;
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      if (pendingSeek.timer) {
        clearTimeout(pendingSeek.timer);
      }
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    isNativeVideo,
    prevEpisode,
    nextEpisode,
    activeEpisodeSlug,
    switchEpisode,
    togglePlayPause,
    toggleFullscreen,
    handleVolumeDelta,
    showHud,
    getEffectiveDuration,
    showShortcutModal,
    showSleepTimerModal,
    showQrModal,
    isLightsOff,
    isPlaying,
    isFullscreen,
    showControls,
    resetControlsTimeout,
  ]);


  const scrollToPlayer = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const isMobileStickyActive =
    isMobile &&
    isScrolledPast &&
    isPlaying &&
    Boolean(activeSrc || m3u8Link);

  return (
    <>
      {/* LỚP NỀN TẮT ĐÈN */}
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

      {/* Sentinel for sticky intersection */}
      <div ref={sentinelRef} className="w-full h-0 pointer-events-none" />

      {/* STICKY PLACEHOLDER */}
      {isMobileStickyActive && (
        <div className="w-full aspect-video md:hidden" aria-hidden="true" />
      )}

      {/* KHUNG PHÁT VIDEO CHÍNH */}
      <div
        ref={containerRef}
        data-cinema-player="true"
        tabIndex={0}
        onMouseMove={resetControlsTimeout}
        className={`w-full mx-auto transition-all duration-300 bg-black outline-none focus:outline-none focus-visible:outline-none ${
          isMobileStickyActive
            ? "fixed top-[56px] left-0 right-0 z-40 shadow-2xl border-b border-white/25 md:relative md:top-auto"
            : "relative z-30"
        } ${isTheaterMode ? "max-w-none px-0 sm:px-0" : "max-w-7xl"} ${
          isLightsOff ? "z-50" : ""
        }`}
      >
        {isMobileStickyActive && (
          <div className="md:hidden bg-gradient-to-r from-zinc-950 via-zinc-900 to-black px-3 py-1.5 flex items-center justify-between border-b border-white/10 text-xs">
            <div className="flex items-center gap-1.5 min-w-0 pr-2">
              <span className="w-2 h-2 rounded-full bg-netflix-red animate-pulse flex-shrink-0" />
              <span className="text-white font-bold text-[11px] truncate">
                {title} {activeEpisodeName ? `• ${formatEpisodeName(activeEpisodeName)}` : ""}
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

        <div className="ambient-cinema-glow opacity-80" aria-hidden="true" />

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
            <div
              className={`w-full h-full relative ${
                showControls || !isPlaying ? "cursor-pointer" : "cursor-none"
              }`}
              onClick={() => {
                if (!showControls && isPlaying) {
                  setShowControls(true);
                  resetControlsTimeout();
                  return;
                }
                togglePlayPause();
              }}
              onDoubleClick={toggleFullscreen}
            >
              <video
                ref={videoRef}
                className="w-full h-full object-contain bg-black"
                playsInline
                autoPlay
                preload="auto"
              />

              {/* SPINNER */}
              {isBuffering && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/40 z-20">
                  <div className="w-12 h-12 border-4 border-netflix-red border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {/* CENTER PLAY/PAUSE ICON */}
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

              {/* ISOLATED NATIVE CONTROLS OVERLAY */}
              <PlayerNativeControls
                showControls={showControls}
                isPlaying={isPlaying}
                isMuted={isMuted}
                volume={volume}
                playbackSpeed={playbackSpeed}
                qualityLevels={qualityLevels}
                currentQualityIndex={currentQualityIndex}
                isFullscreen={isFullscreen}
                isNativeVideo={isNativeVideo}
                knownDuration={knownDuration}
                embedSrc={embedSrc}
                videoRef={videoRef}
                onTogglePlayPause={togglePlayPause}
                onSeekFeedback={(txt) => {
                  showHud(<SkipForward className="w-5 h-5 text-netflix-red fill-current" />, `Đến ${txt}`);
                }}
                onToggleMute={() => {
                  if (videoRef.current) {
                    videoRef.current.muted = !videoRef.current.muted;
                    setIsMuted(videoRef.current.muted);
                  }
                }}
                onVolumeChange={(newVol) => {
                  setVolume(newVol);
                  if (videoRef.current) {
                    videoRef.current.volume = newVol;
                    videoRef.current.muted = newVol === 0;
                    setIsMuted(newVol === 0);
                  }
                }}
                onSpeedChange={handleSpeedChange}
                onQualityChange={handleQualityChange}
                onTogglePiP={togglePiP}
                onOpenQr={() => {
                  setQrTime(videoRef.current?.currentTime || 0);
                  setQrDuration(videoRef.current?.duration || 0);
                  setShowQrModal(true);
                  if (videoRef.current && isPlaying) {
                    videoRef.current.pause();
                    setIsPlaying(false);
                  }
                }}
                onUseIframeFallback={() => setUseIframeFallback(true)}
                onToggleFullscreen={toggleFullscreen}
              />
            </div>
          ) : activeSrc ? (
            <>
              <iframe
                key={activeEpisodeSlug || activeSrc}
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
            <div className="w-full h-full flex flex-col items-center justify-center border border-white/10 relative">
              <Image
                src={posterUrl}
                alt={title}
                fill
                unoptimized
                quality={80}
                className="object-cover opacity-35"
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-black/55" />
              <div className="relative z-10 text-center px-6">
                <p className="text-white text-lg md:text-2xl font-semibold">
                  {isTrailerOnly
                    ? "Phim đang ở trạng thái trailer/sắp chiếu"
                    : "Nguồn phát đang được Nanaflix cập nhật"}
                </p>
                <p className="text-gray-300 mt-2 text-sm md:text-base">
                  {isTrailerOnly
                    ? "Hiện chưa có tập phát chính thức. Vui lòng quay lại sau."
                    : "Bạn vui lòng quay lại sau ít phút nhé!"}
                </p>
              </div>
            </div>
          )}

          {/* HUD OVERLAY */}
          {hudState && (
            <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-black/85 backdrop-blur-md border border-white/20 text-white font-bold text-sm sm:text-base shadow-2xl">
                {hudState.icon}
                <span>{hudState.text}</span>
              </div>
            </div>
          )}
        </div>

        {/* ISOLATED ACTION BUTTONS BAR */}
        <PlayerActionButtons
          isTheaterMode={isTheaterMode}
          onToggleTheaterMode={() => setIsTheaterMode(!isTheaterMode)}
          isLightsOff={isLightsOff}
          onToggleLightsOff={() => setIsLightsOff(!isLightsOff)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          onOpenSleepTimer={() => setShowSleepTimerModal(true)}
          onOpenShortcuts={() => setShowShortcutModal(true)}
          prevEpisode={prevEpisode}
          nextEpisode={nextEpisode}
          onSwitchEpisode={switchEpisode}
          isSticky={isMobileStickyActive}
        />
      </div>

      {/* MODALS */}
      <PlayerShortcutModal
        isOpen={showShortcutModal}
        onClose={() => setShowShortcutModal(false)}
      />

      {showSleepTimerModal && (
        <SleepTimerModal
          isOpen={showSleepTimerModal}
          onClose={() => setShowSleepTimerModal(false)}
          hideTrigger={true}
        />
      )}

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
