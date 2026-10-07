"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import Hls from "hls.js";
import {
  Maximize2,
  Minimize2,
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
  X,
} from "lucide-react";
import { useWatchController } from "./WatchController";
import { getWatchProgress, saveWatchProgress } from "@/lib/watchHistory";
import { formatEpisodeName } from "@/lib/formatEpisode";
import { useAuth } from "@/context/AuthContext";
import { updateActivePlaybackSession } from "@/services/handoffService";
import { incrementUserWatchTime, getPlayerSettings, PlayerSettings } from "@/services/userService";
import { PlayerNativeControls, SeekBack10Icon, SeekForward10Icon, VideoFit } from "./player/PlayerNativeControls";
import { PlayerActionButtons } from "./player/PlayerActionButtons";
import { PlayerShortcutModal } from "./player/PlayerShortcutModal";
import { trackWatchStart, trackWatchProgress, trackWatchEnd } from "@/lib/analyticsClient";

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
  const episodes = useMemo(() => watchContext?.episodes || propEpisodes || [], [watchContext?.episodes, propEpisodes]);
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
  const rawNextEpisode = watchContext?.nextEpisode ?? null;
  const switchEpisode = watchContext?.switchEpisode;

  const effectiveNextEpisode = useMemo(() => {
    if (rawNextEpisode) return rawNextEpisode;
    if (!episodes || episodes.length <= 1 || !activeEpisodeSlug) return null;
    const idx = episodes.findIndex((e) => e.slug === activeEpisodeSlug);
    if (idx >= 0 && idx < episodes.length - 1) {
      return episodes[idx + 1];
    }
    return null;
  }, [rawNextEpisode, episodes, activeEpisodeSlug]);

  // Next Episode Countdown States
  const [showNextEpCountdown, setShowNextEpCountdown] = useState(false);
  const [nextEpCountdown, setNextEpCountdown] = useState(10);
  const isNextEpDismissedRef = useRef(false);
  const nextEpCountdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setShowNextEpCountdown(false);
    setNextEpCountdown(10);
    isNextEpDismissedRef.current = false;
    if (nextEpCountdownTimerRef.current) {
      clearInterval(nextEpCountdownTimerRef.current);
      nextEpCountdownTimerRef.current = null;
    }
  }, [activeEpisodeSlug]);

  useEffect(() => {
    return () => {
      if (nextEpCountdownTimerRef.current) {
        clearInterval(nextEpCountdownTimerRef.current);
        nextEpCountdownTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (showNextEpCountdown && effectiveNextEpisode?.slug) {
      setNextEpCountdown(10);
      if (nextEpCountdownTimerRef.current) {
        clearInterval(nextEpCountdownTimerRef.current);
      }
      nextEpCountdownTimerRef.current = setInterval(() => {
        setNextEpCountdown((prev) => {
          if (prev <= 1) {
            if (nextEpCountdownTimerRef.current) {
              clearInterval(nextEpCountdownTimerRef.current);
              nextEpCountdownTimerRef.current = null;
            }
            setShowNextEpCountdown(false);
            if (switchEpisode && effectiveNextEpisode?.slug) {
              switchEpisode(effectiveNextEpisode.slug);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (nextEpCountdownTimerRef.current) {
          clearInterval(nextEpCountdownTimerRef.current);
          nextEpCountdownTimerRef.current = null;
        }
      };
    } else {
      if (nextEpCountdownTimerRef.current) {
        clearInterval(nextEpCountdownTimerRef.current);
        nextEpCountdownTimerRef.current = null;
      }
    }
  }, [showNextEpCountdown, effectiveNextEpisode?.slug, switchEpisode]);

  // Player UI states
  const [playerSettings, setPlayerSettings] = useState<PlayerSettings>(() => getPlayerSettings(user?.uid));
  const [localTheaterMode, setLocalTheaterMode] = useState(false);

  const isTheaterMode = watchContext?.isTheaterMode ?? localTheaterMode;
  const setIsTheaterMode = watchContext?.setIsTheaterMode ?? setLocalTheaterMode;

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isBuffering, setIsBuffering] = useState(true);
  const [useIframeFallback, setUseIframeFallback] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const showControlsRef = useRef(showControls);
  const [showShortcutModal, setShowShortcutModal] = useState(false);

  useEffect(() => {
    showControlsRef.current = showControls;
  }, [showControls]);

  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [qualityLevels, setQualityLevels] = useState<Array<{ id: number; label: string; height: number }>>([]);
  const [currentQualityIndex, setCurrentQualityIndex] = useState<number>(-1);
  const [knownDuration, setKnownDuration] = useState<number>(0);

  const [videoFit, setVideoFit] = useState<VideoFit>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("nana_player_video_fit");
        if (saved === "contain" || saved === "cover" || saved === "fill" || saved === "zoom") {
          return saved;
        }
      } catch {}
    }
    return "contain";
  });

  const handleVideoFitChange = useCallback((mode: VideoFit) => {
    setVideoFit(mode);
    try {
      localStorage.setItem("nana_player_video_fit", mode);
    } catch {}
  }, []);

  // Double-tap on mobile seek state & timer
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const lastControlsShownTimeRef = useRef<number>(0);
  const singleTapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [doubleTapFeedback, setDoubleTapFeedback] = useState<{
    side: "left" | "right";
    delta: number;
  } | null>(null);
  const doubleTapFeedbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const desktopFeedbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const current = getPlayerSettings(user?.uid);
    setPlayerSettings(current);
    if (current.defaultTheaterMode && typeof window !== "undefined" && window.innerWidth >= 1024) {
      setIsTheaterMode(true);
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
  }, [user?.uid, setIsTheaterMode]);

  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
        controlsTimerRef.current = null;
      }
      if (desktopFeedbackTimerRef.current) {
        clearTimeout(desktopFeedbackTimerRef.current);
        desktopFeedbackTimerRef.current = null;
      }
    };
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const lastProgressSaveRef = useRef<number>(0);
  const hasTrackedWatchStartRef = useRef<string | null>(null);
  const lastAnalyticsProgressRef = useRef<number>(0);
  const hasStartedInitialPlaybackRef = useRef(false);
  const isStalledRef = useRef(false);
  const initialBufferTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stallRecoveryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getBufferAhead = useCallback((v: HTMLVideoElement | null): number => {
    if (!v || !v.buffered || v.buffered.length === 0) return 0;
    const ct = v.currentTime;
    for (let i = 0; i < v.buffered.length; i++) {
      const start = v.buffered.start(i);
      const end = v.buffered.end(i);
      if (ct >= start - 0.5 && ct <= end + 0.1) {
        return Math.max(0, end - ct);
      }
    }
    return 0;
  }, []);
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

  // Desktop Playback Visual Feedback (Pause / Play / Rewind / FastForward)
  const [desktopFeedback, setDesktopFeedback] = useState<{
    type: "play" | "pause" | "seek-left" | "seek-right";
    text?: string;
    id: number;
  } | null>(null);

  const triggerDesktopFeedback = useCallback(
    (type: "play" | "pause" | "seek-left" | "seek-right", text?: string) => {
      if (isMobile) return;
      if (desktopFeedbackTimerRef.current) {
        clearTimeout(desktopFeedbackTimerRef.current);
      }
      setDesktopFeedback({
        type,
        text,
        id: Date.now(),
      });
      desktopFeedbackTimerRef.current = setTimeout(() => {
        setDesktopFeedback(null);
        desktopFeedbackTimerRef.current = null;
      }, 550);
    },
    [isMobile]
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const showHud = useCallback((_icon?: React.ReactNode, _text?: string) => {
    // Disabled HUD overlay to match YouTube & Netflix clean UI experience
  }, []);


  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    showControlsRef.current = true;
    lastControlsShownTimeRef.current = Date.now();
    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
      controlsTimerRef.current = null;
    }
    const isPaused = videoRef.current ? videoRef.current.paused : !isPlaying;
    if (!isPaused) {
      controlsTimerRef.current = setTimeout(() => {
        const isStillPaused = videoRef.current ? videoRef.current.paused : !isPlaying;
        if (!isStillPaused) {
          setShowControls(false);
          showControlsRef.current = false;
        }
      }, 3000);
    }
  }, [isPlaying]);

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
    setIsBuffering(true);
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
    const userId = user?.uid;
    if (!userId) return;
    const initialTimer = setTimeout(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        if (isNativeVideo && videoRef.current && (videoRef.current.paused || videoRef.current.ended)) return;
        incrementUserWatchTime(userId, 1);
      }
    }, 15000);

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      if (isNativeVideo && videoRef.current && (videoRef.current.paused || videoRef.current.ended)) return;
      incrementUserWatchTime(userId, 1);
    }, 60000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [user?.uid, isNativeVideo]);

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
    const doc = document as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const elem = container as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const webkitVideo = video as any;

    const fullscreenElement =
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement;

    const isCurrentlyFs = Boolean(fullscreenElement || isFullscreen || webkitVideo?.webkitDisplayingFullscreen);

    if (isCurrentlyFs) {
      const exitFS = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;
      if (exitFS && fullscreenElement) {
        exitFS.call(doc).catch(() => {});
      } else if (webkitVideo && typeof webkitVideo.webkitExitFullscreen === "function" && webkitVideo.webkitDisplayingFullscreen) {
        try {
          webkitVideo.webkitExitFullscreen();
        } catch {}
      }
      setIsFullscreen(false);
      unlockOrientation();
      showHud(<Minimize2 className="w-5 h-5 text-gray-300" />, "Thoát toàn màn hình");
    } else {
      if (elem.requestFullscreen) {
        elem
          .requestFullscreen({ navigationUI: "hide" } as FullscreenOptions)
          .then(lockLandscape)
          .catch(() => {
            if (elem.requestFullscreen) {
              elem.requestFullscreen().then(lockLandscape).catch(() => {});
            }
          });
        setIsFullscreen(true);
        showHud(<Maximize2 className="w-5 h-5 text-netflix-red" />, "Toàn màn hình");
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
        setIsFullscreen(true);
        lockLandscape();
        showHud(<Maximize2 className="w-5 h-5 text-netflix-red" />, "Toàn màn hình");
      } else if (webkitVideo && typeof webkitVideo.webkitEnterFullscreen === "function" && isNativeVideo) {
        try {
          webkitVideo.webkitEnterFullscreen();
          setIsFullscreen(true);
          lockLandscape();
          showHud(<Maximize2 className="w-5 h-5 text-netflix-red" />, "Toàn màn hình (iOS)");
        } catch {
          setIsFullscreen(true);
          lockLandscape();
          showHud(<Maximize2 className="w-5 h-5 text-netflix-red" />, "Toàn màn hình");
        }
      } else {
        setIsFullscreen(true);
        lockLandscape();
        showHud(<Maximize2 className="w-5 h-5 text-netflix-red" />, "Toàn màn hình");
      }
    }
  }, [isNativeVideo, isFullscreen, lockLandscape, unlockOrientation, showHud]);

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
      resetControlsTimeout();
    };

    const video = videoRef.current;
    const handleVideoBeginFs = () => {
      setIsFullscreen(true);
      lockLandscape();
      resetControlsTimeout();
    };
    const handleVideoEndFs = () => {
      setIsFullscreen(false);
      unlockOrientation();
      resetControlsTimeout();
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
  }, [lockLandscape, unlockOrientation, resetControlsTimeout]);

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
        hasStartedInitialPlaybackRef.current = true;
        isStalledRef.current = false;
        setIsBuffering(false);
        v.play().catch(() => {});
        setIsPlaying(true);
        triggerDesktopFeedback("play");
        resetControlsTimeout();
      } else {
        v.pause();
        isStalledRef.current = false;
        setIsPlaying(false);
        triggerDesktopFeedback("pause");
        setShowControls(true);
        if (controlsTimerRef.current) {
          clearTimeout(controlsTimerRef.current);
          controlsTimerRef.current = null;
        }
      }
    } else {
      setIsPlaying((prev) => {
        const next = !prev;
        if (next) {
          sendPlayerCommand("playVideo");
          sendPlayerCommand("play");
          triggerDesktopFeedback("play");
          resetControlsTimeout();
        } else {
          sendPlayerCommand("pauseVideo");
          sendPlayerCommand("pause");
          triggerDesktopFeedback("pause");
          setShowControls(true);
          if (controlsTimerRef.current) {
            clearTimeout(controlsTimerRef.current);
            controlsTimerRef.current = null;
          }
        }
        return next;
      });
    }
  }, [isNativeVideo, isMuted, sendPlayerCommand, resetControlsTimeout, triggerDesktopFeedback]);

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

    if (initialBufferTimeoutRef.current) {
      clearTimeout(initialBufferTimeoutRef.current);
      initialBufferTimeoutRef.current = null;
    }
    if (stallRecoveryTimeoutRef.current) {
      clearTimeout(stallRecoveryTimeoutRef.current);
      stallRecoveryTimeoutRef.current = null;
    }
    hasStartedInitialPlaybackRef.current = false;
    isStalledRef.current = false;

    setIsBuffering(true);
    video.pause();
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
        saveWatchProgress(currentMovieSlug, targetProgress, video.duration || 0, activeEpisodeSlug, {
          title,
          poster: posterUrl,
          episodeName: activeEpisodeName,
        });
      }
    }

    const seekTimeouts: NodeJS.Timeout[] = [];

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        capLevelToPlayerSize: true,
        maxBufferSize: 30 * 1000 * 1000,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        backBufferLength: 30,
        startPosition: targetProgress > 0 ? targetProgress : -1,
        startLevel: -1,
        autoStartLoad: true,
        abrEwmaDefaultEstimate: 5000000,
      });
      hlsRef.current = hls;
      hls.loadSource(resolvedM3u8);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        setIsBuffering(true);
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

        const checkInitialBufferAndStart = () => {
          if (hasStartedInitialPlaybackRef.current) return;
          const v = videoRef.current;
          if (!v) return;

          const bufAhead = getBufferAhead(v);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const dur = (v as any).__hlsDuration || (v.duration && isFinite(v.duration) ? v.duration : 0);
          const isNearEnd = dur > 0 && (v.currentTime + bufAhead >= dur - 2);

          // Bắt đầu playback an toàn khi buffer đạt >= 8s hoặc sắp hết phim
          if (bufAhead >= 8 || isNearEnd) {
            hasStartedInitialPlaybackRef.current = true;
            if (initialBufferTimeoutRef.current) {
              clearTimeout(initialBufferTimeoutRef.current);
              initialBufferTimeoutRef.current = null;
            }
            setIsBuffering(false);
            const playPromise = v.play();
            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  setIsPlaying(true);
                })
                .catch(() => {
                  v.muted = true;
                  setIsMuted(true);
                  v.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
                });
            }
          }
        };

        hls.on(Hls.Events.FRAG_BUFFERED, checkInitialBufferAndStart);

        // Fallback timeout sau 5s đảm bảo không bị treo player nếu mạng yếu hoặc stream ngắn
        initialBufferTimeoutRef.current = setTimeout(() => {
          if (!hasStartedInitialPlaybackRef.current && videoRef.current) {
            hasStartedInitialPlaybackRef.current = true;
            setIsBuffering(false);
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  setIsPlaying(true);
                })
                .catch(() => {
                  if (videoRef.current) {
                    videoRef.current.muted = true;
                    setIsMuted(true);
                    videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
                  }
                });
            }
          }
        }, 5000);
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

      // Fallback seek duy nhất sau 1.5s nếu Hls.js startPosition chưa khớp target
      seekTimeouts.push(
        setTimeout(() => {
          if (!hasSeekedInitialRef.current && targetProgress > 0 && videoRef.current) {
            if (Math.abs(videoRef.current.currentTime - targetProgress) > 2) {
              trySeekToTarget();
            } else {
              hasSeekedInitialRef.current = true;
            }
          }
        }, 1500)
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

      const checkNativeInitialBuffer = () => {
        if (hasStartedInitialPlaybackRef.current) return;
        const bufAhead = getBufferAhead(video);
        const dur = video.duration && isFinite(video.duration) ? video.duration : 0;
        const isNearEnd = dur > 0 && (video.currentTime + bufAhead >= dur - 2);

        if (bufAhead >= 8 || isNearEnd) {
          hasStartedInitialPlaybackRef.current = true;
          if (initialBufferTimeoutRef.current) {
            clearTimeout(initialBufferTimeoutRef.current);
            initialBufferTimeoutRef.current = null;
          }
          setIsBuffering(false);
          trySeekToTarget();
          video
            .play()
            .then(() => setIsPlaying(true))
            .catch(() => {
              video.muted = true;
              setIsMuted(true);
              video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
            });
        }
      };

      const onLoaded = () => {
        setIsBuffering(true);
        trySeekToTarget();
        checkNativeInitialBuffer();

        initialBufferTimeoutRef.current = setTimeout(() => {
          if (!hasStartedInitialPlaybackRef.current) {
            hasStartedInitialPlaybackRef.current = true;
            setIsBuffering(false);
            video
              .play()
              .then(() => setIsPlaying(true))
              .catch(() => {
                video.muted = true;
                setIsMuted(true);
                video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
              });
          }
        }, 5000);
      };

      const onNativeError = () => {
        setIsBuffering(false);
        setUseIframeFallback(true);
      };

      video.addEventListener("loadedmetadata", onLoaded);
      video.addEventListener("progress", checkNativeInitialBuffer);
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
        video.removeEventListener("progress", checkNativeInitialBuffer);
        video.removeEventListener("error", onNativeError);
        seekTimeouts.forEach((t) => clearTimeout(t));
        if (initialBufferTimeoutRef.current) {
          clearTimeout(initialBufferTimeoutRef.current);
          initialBufferTimeoutRef.current = null;
        }
      };
    }

    return () => {
      seekTimeouts.forEach((t) => clearTimeout(t));
      if (initialBufferTimeoutRef.current) {
        clearTimeout(initialBufferTimeoutRef.current);
        initialBufferTimeoutRef.current = null;
      }
      if (stallRecoveryTimeoutRef.current) {
        clearTimeout(stallRecoveryTimeoutRef.current);
        stallRecoveryTimeoutRef.current = null;
      }
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
    activeEpisodeName,
    posterUrl,
    title,
    getBufferAhead,
  ]);

  // Video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const movieSlug = watchContext?.movieSlug || propMovieSlug;

    const checkBufferRecovery = () => {
      const v = videoRef.current;
      if (!v) return;

      const bufAhead = getBufferAhead(v);
      const dur = getEffectiveDuration();
      const isNearEnd = dur > 0 && (v.currentTime + bufAhead >= dur - 2);

      if (!hasStartedInitialPlaybackRef.current) {
        if (bufAhead >= 8 || isNearEnd) {
          hasStartedInitialPlaybackRef.current = true;
          if (initialBufferTimeoutRef.current) {
            clearTimeout(initialBufferTimeoutRef.current);
            initialBufferTimeoutRef.current = null;
          }
          setIsBuffering(false);
          v.play().catch(() => {});
        }
        return;
      }

      if (isStalledRef.current) {
        // Khi bị stall (waiting), chỉ resume khi đã gom đủ ít nhất 8s buffer an toàn hoặc gần hết video
        if (bufAhead >= 8 || isNearEnd) {
          isStalledRef.current = false;
          if (stallRecoveryTimeoutRef.current) {
            clearTimeout(stallRecoveryTimeoutRef.current);
            stallRecoveryTimeoutRef.current = null;
          }
          setIsBuffering(false);
          v.play().catch(() => {});
        }
      }
    };

    const handleWaiting = () => {
      setIsBuffering(true);
      isStalledRef.current = true;
      if (stallRecoveryTimeoutRef.current) {
        clearTimeout(stallRecoveryTimeoutRef.current);
      }
      // Fallback timeout 5s: nếu mạng cực chậm và không gom đủ 8s, vẫn cố gắng phát sau 5s thay vì kẹt vô hạn
      stallRecoveryTimeoutRef.current = setTimeout(() => {
        const v = videoRef.current;
        if (v && isStalledRef.current) {
          isStalledRef.current = false;
          setIsBuffering(false);
          v.play().catch(() => {});
        }
      }, 5000);
    };

    const handlePlaying = () => {
      setIsBuffering(false);
      isStalledRef.current = false;
      hasStartedInitialPlaybackRef.current = true;
      setIsPlaying(true);
      resetControlsTimeout();
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
      isStalledRef.current = false;
      setShowControls(true);
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
        controlsTimerRef.current = null;
      }
      const currentEffectiveDuration = getEffectiveDuration();
      if (movieSlug && activeEpisodeSlug && video.currentTime > 5) {
        saveWatchProgress(
          movieSlug,
          video.currentTime,
          currentEffectiveDuration,
          activeEpisodeSlug,
          {
            title,
            poster: posterUrl,
            episodeName: activeEpisodeName,
          },
          true // forceSync khi pause
        );
      }
      if (user?.uid && movieSlug && video.currentTime > 5) {
        lastHandoffSyncRef.current = Date.now();
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
      checkBufferRecovery();

      // Check countdown condition on timeupdate
      if (effectiveNextEpisode?.slug && !isNextEpDismissedRef.current && playerSettings.autoNextEpisode !== false) {
        const currentEffectiveDuration = getEffectiveDuration();
        const currentTime = video.currentTime;
        if (currentEffectiveDuration > 30) {
          const remaining = currentEffectiveDuration - currentTime;
          if (remaining <= 12 && remaining > 0.5 && !video.paused && !video.ended) {
            setShowNextEpCountdown((prev) => (!prev ? true : prev));
          } else if (remaining > 18) {
            setShowNextEpCountdown((prev) => {
              if (prev) {
                setNextEpCountdown(10);
                return false;
              }
              return prev;
            });
          }
          if (remaining > 25) {
            isNextEpDismissedRef.current = false;
          }
        }
      }

      const now = Date.now();
      if (now - lastProgressSaveRef.current > 3000) {
        lastProgressSaveRef.current = now;
        const currentEffectiveDuration = getEffectiveDuration();
        if (movieSlug && activeEpisodeSlug && video.currentTime > 0) {
          saveWatchProgress(movieSlug, video.currentTime, currentEffectiveDuration, activeEpisodeSlug, {
            title,
            poster: posterUrl,
            episodeName: activeEpisodeName,
          });
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
      isStalledRef.current = false;
      setShowControls(true);
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
        controlsTimerRef.current = null;
      }
      if (nextEpCountdownTimerRef.current) {
        clearInterval(nextEpCountdownTimerRef.current);
        nextEpCountdownTimerRef.current = null;
      }
      setShowNextEpCountdown(false);
      const currentEffectiveDuration = getEffectiveDuration();
      if (movieSlug && activeEpisodeSlug) {
        saveWatchProgress(
          movieSlug,
          currentEffectiveDuration > 0 ? currentEffectiveDuration : video.currentTime,
          currentEffectiveDuration,
          activeEpisodeSlug,
          {
            title,
            poster: posterUrl,
            episodeName: activeEpisodeName,
          },
          true // forceSync khi kết thúc video
        );
      }
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
      if (playerSettings.autoNextEpisode !== false && effectiveNextEpisode?.slug && switchEpisode && !isNextEpDismissedRef.current) {
        switchEpisode(effectiveNextEpisode.slug);
      }
    };

    const handleCanPlay = () => {
      if (!isStalledRef.current && hasStartedInitialPlaybackRef.current) {
        setIsBuffering(false);
      } else {
        checkBufferRecovery();
      }
    };
    const handleProgress = () => checkBufferRecovery();
    const handleSeeking = () => {
      setIsBuffering(true);
      isStalledRef.current = true;
    };
    const handleSeeked = () => checkBufferRecovery();
    const handleLoadStart = () => setIsBuffering(true);
    const handleLoadedData = () => checkBufferRecovery();

    video.addEventListener("waiting", handleWaiting, { passive: true });
    video.addEventListener("playing", handlePlaying, { passive: true });
    video.addEventListener("pause", handlePause, { passive: true });
    video.addEventListener("timeupdate", handleTimeUpdateThrottled, { passive: true });
    video.addEventListener("ended", handleEnded, { passive: true });
    video.addEventListener("canplay", handleCanPlay, { passive: true });
    video.addEventListener("progress", handleProgress, { passive: true });
    video.addEventListener("seeking", handleSeeking, { passive: true });
    video.addEventListener("seeked", handleSeeked, { passive: true });
    video.addEventListener("loadstart", handleLoadStart, { passive: true });
    video.addEventListener("loadeddata", handleLoadedData, { passive: true });

    return () => {
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("timeupdate", handleTimeUpdateThrottled);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("progress", handleProgress);
      video.removeEventListener("seeking", handleSeeking);
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("loadstart", handleLoadStart);
      video.removeEventListener("loadeddata", handleLoadedData);
      if (stallRecoveryTimeoutRef.current) {
        clearTimeout(stallRecoveryTimeoutRef.current);
        stallRecoveryTimeoutRef.current = null;
      }
    };
  }, [
    effectiveNextEpisode,
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
    resetControlsTimeout,
    getBufferAhead,
  ]);

  // Mobile touch & sticky detection
  useEffect(() => {
    const checkMobile = () => {
      const hasTouch =
        (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(pointer: coarse)").matches) ||
        (typeof window !== "undefined" && "ontouchstart" in window) ||
        (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0) ||
        (typeof window !== "undefined" && window.innerWidth < 768);
      setIsMobile(Boolean(hasTouch));
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    window.addEventListener("orientationchange", checkMobile);

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsScrolledPast(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0, rootMargin: "-20px 0px 0px 0px" }
    );

    if (sentinelRef.current) observer.observe(sentinelRef.current);

    return () => {
      window.removeEventListener("resize", checkMobile);
      window.removeEventListener("orientationchange", checkMobile);
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

      // Bỏ qua nếu người dùng đang dùng tổ hợp phím hệ thống (Ctrl + C, Cmd + C, Ctrl + V, Alt + ...)
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      // Reset controls timeout on any player shortcut key
      resetControlsTimeout();

      // 1. Phím Escape: Đóng modal / Thoát toàn màn hình
      if (e.key === "Escape") {
        if (showShortcutModal) {
          e.preventDefault();
          setShowShortcutModal(false);
          return;
        }

        if (isFullscreen) {
          e.preventDefault();
          toggleFullscreen();
          return;
        }
      }

      // 2. Phím Space / K: Phát / Tạm dừng
      if (e.code === "Space" || e.key === " " || e.key === "k" || e.key === "K") {
        const active = document.activeElement as HTMLElement | null;
        if (active && (active.tagName === "BUTTON" || active.tagName === "A")) {
          return;
        }
        e.preventDefault();
        togglePlayPause();
        return;
      }

      // 3. Phím tắt chức năng (F, M, T, L, P, N, ?)
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
      if ((e.key === "p" || e.key === "P") && prevEpisode?.slug && switchEpisode) {
        showHud(<SkipBack className="w-5 h-5 text-netflix-red" />, `Chuyển về ${prevEpisode.name}`);
        switchEpisode(prevEpisode.slug);
        return;
      }
      if ((e.key === "n" || e.key === "N") && effectiveNextEpisode?.slug && switchEpisode) {
        showHud(<SkipForward className="w-5 h-5 text-netflix-red" />, `Chuyển sang ${effectiveNextEpisode.name}`);
        switchEpisode(effectiveNextEpisode.slug);
        return;
      }
      if (e.key === "?" || (e.key === "/" && !e.shiftKey)) {
        setShowShortcutModal((prev) => !prev);
        return;
      }

      // 4. Phím Tua video (← / →)
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const active = document.activeElement as HTMLElement | null;
        if (active && active.tagName === "INPUT" && active.getAttribute("type") === "range") {
          return;
        }
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
            triggerDesktopFeedback("seek-right", `+${newTotalDelta}s`);
          } else {
            triggerDesktopFeedback("seek-left", `${newTotalDelta}s`);
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

      // 5. Phím Tăng/Giảm âm lượng (↑ / ↓)
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        const active = document.activeElement as HTMLElement | null;
        if (active && active.tagName === "INPUT" && active.getAttribute("type") === "range") {
          return;
        }

        // Điều hướng menu item nếu menu đang mở
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

        e.preventDefault();
        handleVolumeDelta(e.key === "ArrowUp" ? 0.05 : -0.05);
        resetControlsTimeout();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      if (pendingSeek.timer) {
        clearTimeout(pendingSeek.timer);
      }
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
      }
      if (doubleTapFeedbackTimerRef.current) {
        clearTimeout(doubleTapFeedbackTimerRef.current);
      }
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    isNativeVideo,
    prevEpisode,
    effectiveNextEpisode,
    switchEpisode,
    togglePlayPause,
    toggleFullscreen,
    handleVolumeDelta,
    showHud,
    getEffectiveDuration,
    showShortcutModal,
    isFullscreen,
    resetControlsTimeout,
    triggerDesktopFeedback,
    setIsTheaterMode,
  ]);


  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if ((e.nativeEvent as PointerEvent)?.pointerType === "touch") return;
    if (
      typeof window !== "undefined" &&
      ((window.matchMedia && window.matchMedia("(pointer: coarse)").matches) ||
        "ontouchstart" in window ||
        isMobile)
    ) {
      return;
    }
    resetControlsTimeout();
  }, [resetControlsTimeout, isMobile]);

  const handleMouseLeave = useCallback(() => {
    if (isMobile) return;
    const isPaused = videoRef.current ? videoRef.current.paused : !isPlaying;
    if (!isPaused) {
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
        controlsTimerRef.current = null;
      }
      setShowControls(false);
      showControlsRef.current = false;
    }
  }, [isMobile, isPlaying]);

  const scrollToPlayer = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const isMobileStickyActive =
    isMobile &&
    isScrolledPast &&
    isPlaying &&
    !isFullscreen &&
    Boolean(activeSrc || m3u8Link);

  return (
    <>
      {/* Sentinel for sticky intersection */}
      <div ref={sentinelRef} className="w-full h-1 pointer-events-none" />

      {/* STICKY PLACEHOLDER */}
      {isMobileStickyActive && (
        <div className="w-full aspect-video md:hidden" aria-hidden="true" />
      )}

      {/* KHUNG PHÁT VIDEO CHÍNH */}
      <div
        ref={containerRef}
        tabIndex={0}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`w-full mx-auto transition-all duration-300 bg-black outline-none focus:outline-none focus-visible:outline-none ${
          isFullscreen
            ? "fixed inset-0 z-[80] w-full h-full max-w-none p-0 m-0 bg-black flex flex-col justify-center overflow-hidden"
            : isMobileStickyActive
            ? "fixed top-[56px] left-0 right-0 z-40 shadow-2xl border-b border-white/25 md:relative md:top-auto"
            : "relative z-30"
        } ${isTheaterMode && !isFullscreen ? "max-w-none px-0 sm:px-0" : isFullscreen ? "" : "max-w-7xl"}`}
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
          className={`cinema-video-wrapper w-full bg-zinc-950 relative overflow-hidden transition-all duration-300 z-10 mx-auto select-none group ${
            isFullscreen
              ? "w-full h-full max-h-screen rounded-none border-none shadow-none aspect-auto"
              : isMobileStickyActive
              ? "aspect-video rounded-none max-h-[38vh] shadow-2xl"
              : isTheaterMode
              ? "aspect-video w-full rounded-xl sm:rounded-2xl md:rounded-3xl border border-white/20 shadow-[0_30px_90px_rgba(0,0,0,0.85)] max-h-[calc(100vh-185px)]"
              : "aspect-video rounded-xl sm:rounded-2xl md:rounded-3xl border border-white/15 shadow-[0_25px_70px_rgba(0,0,0,0.55)]"
          }`}
        >
          {isNativeVideo ? (
            <div
              className={`w-full h-full relative ${
                showControls || !isPlaying ? "cursor-pointer" : "cursor-none"
              }`}
              onClick={(e) => {
                // If click is inside controls, do nothing
                const target = e.target as HTMLElement | null;
                if (target?.closest('[data-player-control="true"]')) {
                  return;
                }

                const now = Date.now();
                const rect = e.currentTarget.getBoundingClientRect();
                if (rect.width <= 0 || rect.height <= 0) return;

                const x = e.clientX - rect.left;
                const xPct = x / rect.width;
                const lastTap = lastTapRef.current;

                const isTouch =
                  (e.nativeEvent as PointerEvent)?.pointerType === "touch" ||
                  (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(pointer: coarse)").matches) ||
                  isMobile;

                // Check if double tap: within 320ms and within 90px
                if (lastTap && now - lastTap.time < 320 && Math.abs(e.clientX - lastTap.x) < 90) {
                  // DOUBLE TAP DETECTED
                  if (singleTapTimerRef.current) {
                    clearTimeout(singleTapTimerRef.current);
                    singleTapTimerRef.current = null;
                  }
                  lastTapRef.current = null;

                  if (xPct <= 0.38) {
                    // TUA LÙI 10 GIÂY
                    if (videoRef.current) {
                      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
                    }
                    showHud(<SeekBack10Icon className="w-5 h-5 text-netflix-red" />, "Tua lùi -10s");
                    setDoubleTapFeedback({ side: "left", delta: -10 });
                    if (doubleTapFeedbackTimerRef.current) clearTimeout(doubleTapFeedbackTimerRef.current);
                    doubleTapFeedbackTimerRef.current = setTimeout(() => {
                      setDoubleTapFeedback(null);
                    }, 650);
                  } else if (xPct >= 0.62) {
                    // TUA TỚI 10 GIÂY
                    if (videoRef.current) {
                      const effectiveDuration = getEffectiveDuration();
                      videoRef.current.currentTime =
                        effectiveDuration > 0
                          ? Math.min(effectiveDuration, (videoRef.current.currentTime || 0) + 10)
                          : (videoRef.current.currentTime || 0) + 10;
                    }
                    showHud(<SeekForward10Icon className="w-5 h-5 text-netflix-red" />, "Tua tới +10s");
                    setDoubleTapFeedback({ side: "right", delta: 10 });
                    if (doubleTapFeedbackTimerRef.current) clearTimeout(doubleTapFeedbackTimerRef.current);
                    doubleTapFeedbackTimerRef.current = setTimeout(() => {
                      setDoubleTapFeedback(null);
                    }, 650);
                  } else {
                    // Chạm đúp ở giữa (center) -> Toggle fullscreen
                    toggleFullscreen();
                  }
                  resetControlsTimeout();
                } else {
                  // FIRST TAP / SINGLE CLICK
                  lastTapRef.current = { time: now, x: e.clientX, y: e.clientY };
                  if (singleTapTimerRef.current) {
                    clearTimeout(singleTapTimerRef.current);
                    singleTapTimerRef.current = null;
                  }

                  if (isTouch) {
                    // MOBILE TOUCH LOGIC (YOUTUBE / NETFLIX STYLE):
                    if (!showControlsRef.current) {
                      // Nếu controls đang ẩn -> Chạm 1 lần hiện controls và bắt đầu đếm 3s bình thường
                      resetControlsTimeout();
                    } else {
                      // Nếu vừa mới mở controls trong 350ms, bỏ qua để tránh sự kiện chạm kép gây ẩn tức thì
                      if (now - lastControlsShownTimeRef.current < 350) {
                        resetControlsTimeout();
                        return;
                      }
                      // Người dùng chủ động chạm vào khoảng trống màn hình -> Ẩn controls
                      setShowControls(false);
                      showControlsRef.current = false;
                      if (controlsTimerRef.current) {
                        clearTimeout(controlsTimerRef.current);
                        controlsTimerRef.current = null;
                      }
                    }
                  } else {
                    // DESKTOP CLICK LOGIC:
                    if (!showControlsRef.current) {
                      resetControlsTimeout();
                    }
                    singleTapTimerRef.current = setTimeout(() => {
                      singleTapTimerRef.current = null;
                      togglePlayPause();
                    }, 250);
                    resetControlsTimeout();
                  }
                }
              }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <video
                ref={videoRef}
                className={`w-full h-full bg-black transition-transform duration-200 ${
                  videoFit === "cover"
                    ? "object-cover"
                    : videoFit === "fill"
                    ? "object-fill"
                    : "object-contain"
                }`}
                style={{
                  transform: videoFit === "zoom" ? "scale(1.18)" : "none",
                }}
                playsInline
                autoPlay
                preload="auto"
              />

              {/* DOUBLE TAP RIPPLE EFFECT (YOUTUBE / NETFLIX STYLE) */}
              {doubleTapFeedback && doubleTapFeedback.side === "left" && (
                <div className="absolute inset-y-0 left-0 w-[35%] flex flex-col items-center justify-center bg-white/5 rounded-r-full pointer-events-none z-30 animate-in fade-in zoom-in-95 duration-200 backdrop-blur-[1px]">
                  <div className="p-2.5 rounded-full bg-black/65 border border-white/15 text-white shadow-xl flex flex-col items-center animate-pulse">
                    <SeekBack10Icon className="w-5 h-5 text-white" />
                    <span className="text-[10px] font-bold tracking-wider text-white mt-0.5">-10s</span>
                  </div>
                </div>
              )}
              {doubleTapFeedback && doubleTapFeedback.side === "right" && (
                <div className="absolute inset-y-0 right-0 w-[35%] flex flex-col items-center justify-center bg-white/5 rounded-l-full pointer-events-none z-30 animate-in fade-in zoom-in-95 duration-200 backdrop-blur-[1px]">
                  <div className="p-2.5 rounded-full bg-black/65 border border-white/15 text-white shadow-xl flex flex-col items-center animate-pulse">
                    <SeekForward10Icon className="w-5 h-5 text-white" />
                    <span className="text-[10px] font-bold tracking-wider text-white mt-0.5">+10s</span>
                  </div>
                </div>
              )}

              {/* DESKTOP PLAYBACK FEEDBACK ICONS (PAUSE / PLAY / REWIND / FAST-FORWARD) */}
              {desktopFeedback && (desktopFeedback.type === "play" || desktopFeedback.type === "pause") && (
                <div
                  key={desktopFeedback.id}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 text-white flex items-center justify-center shadow-2xl animate-in fade-in zoom-in-75 duration-200">
                    {desktopFeedback.type === "play" ? (
                      <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-white text-white ml-1" />
                    ) : (
                      <Pause className="w-7 h-7 sm:w-8 sm:h-8 fill-white text-white" />
                    )}
                  </div>
                </div>
              )}
              {desktopFeedback && desktopFeedback.type === "seek-left" && (
                <div
                  key={desktopFeedback.id}
                  className="absolute inset-y-0 left-6 sm:left-12 flex items-center pointer-events-none z-20"
                >
                  <div className="px-3.5 py-2.5 rounded-2xl bg-black/65 backdrop-blur-sm border border-white/20 text-white flex items-center gap-2 shadow-2xl animate-in fade-in zoom-in-90 duration-200">
                    <SeekBack10Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    <span className="text-xs sm:text-sm font-bold tracking-wide text-white">
                      {desktopFeedback.text || "-10s"}
                    </span>
                  </div>
                </div>
              )}
              {desktopFeedback && desktopFeedback.type === "seek-right" && (
                <div
                  key={desktopFeedback.id}
                  className="absolute inset-y-0 right-6 sm:right-12 flex items-center pointer-events-none z-20"
                >
                  <div className="px-3.5 py-2.5 rounded-2xl bg-black/65 backdrop-blur-sm border border-white/20 text-white flex items-center gap-2 shadow-2xl animate-in fade-in zoom-in-90 duration-200">
                    <span className="text-xs sm:text-sm font-bold tracking-wide text-white">
                      {desktopFeedback.text || "+10s"}
                    </span>
                    <SeekForward10Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
              )}

              {/* ISOLATED NATIVE CONTROLS OVERLAY (NETFLIX & YOUTUBE STYLE) */}
              <PlayerNativeControls
                showControls={showControls}
                isPlaying={isPlaying}
                isBuffering={isBuffering}
                isMuted={isMuted}
                volume={volume}
                playbackSpeed={playbackSpeed}
                qualityLevels={qualityLevels}
                currentQualityIndex={currentQualityIndex}
                videoFit={videoFit}
                isFullscreen={isFullscreen}
                isNativeVideo={isNativeVideo}
                knownDuration={knownDuration}
                embedSrc={embedSrc}
                videoRef={videoRef}
                title={title}
                activeEpisodeName={activeEpisodeName ? formatEpisodeName(activeEpisodeName) : undefined}
                nextEpisode={effectiveNextEpisode}
                onTogglePlayPause={togglePlayPause}
                onSeekFeedback={(txt) => {
                  resetControlsTimeout();
                  if (txt.includes("-")) {
                    triggerDesktopFeedback("seek-left", txt);
                  } else if (txt.includes("+")) {
                    triggerDesktopFeedback("seek-right", txt);
                  }
                }}
                onToggleMute={() => {
                  if (videoRef.current) {
                    videoRef.current.muted = !videoRef.current.muted;
                    setIsMuted(videoRef.current.muted);
                  }
                  resetControlsTimeout();
                }}
                onVolumeChange={(newVol) => {
                  setVolume(newVol);
                  if (videoRef.current) {
                    videoRef.current.volume = newVol;
                    videoRef.current.muted = newVol === 0;
                    setIsMuted(newVol === 0);
                  }
                  resetControlsTimeout();
                }}
                onSpeedChange={(spd) => {
                  handleSpeedChange(spd);
                  resetControlsTimeout();
                }}
                onQualityChange={(lvl) => {
                  handleQualityChange(lvl);
                  resetControlsTimeout();
                }}
                onVideoFitChange={(fit) => {
                  handleVideoFitChange(fit);
                  resetControlsTimeout();
                }}
                onTogglePiP={togglePiP}
                onUseIframeFallback={() => setUseIframeFallback(true)}
                onToggleFullscreen={toggleFullscreen}
                onSwitchEpisode={(slug) => {
                  if (switchEpisode) switchEpisode(slug);
                }}
                onUserInteraction={resetControlsTimeout}
              />

              {/* NEXT EPISODE COUNTDOWN OVERLAY */}
              {showNextEpCountdown && effectiveNextEpisode?.slug && (
                <div
                  className={`absolute right-3 sm:right-6 ${
                    showControls ? "bottom-20 sm:bottom-24" : "bottom-5 sm:bottom-6"
                  } z-40 max-w-[calc(100vw-24px)] sm:max-w-sm w-full bg-zinc-950/90 hover:bg-zinc-950/95 border border-white/20 backdrop-blur-xl rounded-2xl p-3 sm:p-3.5 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-300 text-white transition-all`}
                  role="dialog"
                  aria-label="Tập tiếp theo"
                >
                  {posterUrl && (
                    <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 bg-zinc-900 border border-white/10">
                      <Image
                        src={posterUrl}
                        alt={effectiveNextEpisode.name || "Tập tiếp theo"}
                        fill
                        unoptimized
                        sizes="64px"
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-xs font-black text-white px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-xs shadow">
                          {nextEpCountdown}s
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
                      <span>Tập tiếp theo sau</span>
                      <span className="text-netflix-red font-bold">{nextEpCountdown}s</span>
                    </div>
                    <div className="text-sm sm:text-base font-bold text-white truncate mt-0.5">
                      {formatEpisodeName(effectiveNextEpisode.name || "Tập tiếp theo")}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (switchEpisode && effectiveNextEpisode.slug) {
                          switchEpisode(effectiveNextEpisode.slug);
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-netflix-red hover:bg-red-700 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-lg shadow-red-950/50 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Xem ngay</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        isNextEpDismissedRef.current = true;
                        setShowNextEpCountdown(false);
                      }}
                      title="Hủy tự chuyển tập"
                      aria-label="Hủy tự chuyển tập"
                      className="p-1.5 rounded-full hover:bg-white/20 text-gray-400 hover:text-white transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
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
        </div>
      </div>

      {/* ISOLATED ACTION BUTTONS BAR */}
      {!isFullscreen && (
        <div
          className={`cinema-action-buttons w-full mx-auto relative z-20 ${
            isTheaterMode ? "max-w-none px-0 sm:px-0" : "max-w-7xl"
          }`}
        >
          <PlayerActionButtons
            isTheaterMode={isTheaterMode}
            onToggleTheaterMode={() => setIsTheaterMode((prev) => !prev)}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
            onOpenShortcuts={() => setShowShortcutModal(true)}
            prevEpisode={prevEpisode}
            nextEpisode={effectiveNextEpisode}
            onSwitchEpisode={switchEpisode}
            isSticky={false}
          />
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
        }
        :fullscreen .cinema-video-wrapper,
        :-webkit-full-screen .cinema-video-wrapper {
          width: 100% !important;
          height: 100% !important;
          max-height: 100vh !important;
          aspect-ratio: auto !important;
          border-radius: 0 !important;
          border: none !important;
          box-shadow: none !important;
        }
        :fullscreen .cinema-player-controls,
        :-webkit-full-screen .cinema-player-controls {
          position: absolute !important;
          inset-inline: 0 !important;
          bottom: 0 !important;
          z-index: 50 !important;
          padding-bottom: max(0.75rem, env(safe-area-inset-bottom, 0.75rem)) !important;
          padding-left: max(0.75rem, env(safe-area-inset-left, 0.75rem)) !important;
          padding-right: max(0.75rem, env(safe-area-inset-right, 0.75rem)) !important;
        }
        :fullscreen .cinema-action-buttons,
        :-webkit-full-screen .cinema-action-buttons {
          display: none !important;
        }
      `}</style>

      {/* MODALS */}
      <PlayerShortcutModal
        isOpen={showShortcutModal}
        onClose={() => setShowShortcutModal(false)}
      />
    </>
  );
};

export default CinemaPlayer;
