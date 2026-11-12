"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  clientSynopsisCache,
  fetchMovieSynopsisShared,
} from "@/services/synopsisService";
import {
  extractYoutubeId,
  getYoutubeTrailerEmbedUrl,
  isDesktopWithHover,
  isYoutubeErrorMessage,
  isYoutubePermanentErrorMessage,
  isYoutubePlayingMessage,
  isYoutubeEndedMessage,
} from "@/lib/trailerHelper";
import {
  AUTO_SLIDE_NORMAL_MS,
  AUTO_SLIDE_TRAILER_MS,
  type HeroMovie,
} from "../heroMovieHelpers";

export interface UseHeroTrailerPlayerOptions {
  slides: HeroMovie[];
  index: number;
  setIndex: React.Dispatch<React.SetStateAction<number>>;
  setDirection: React.Dispatch<React.SetStateAction<number>>;
  paused: boolean;
  heroRef: React.RefObject<HTMLElement | null>;
}

/**
 * Manages Hero auto-slide timing, viewport/tab visibility observers, synopsis
 * hydration/fetching, desktop YouTube background trailer lazy-mounting, 8s watchdog,
 * error retries, and mute controls.
 */
export function useHeroTrailerPlayer({
  slides,
  index,
  setIndex,
  setDirection,
  paused,
  heroRef,
}: UseHeroTrailerPlayerOptions) {
  const currentSlug = slides[index]?.slug;

  const [synopsisMap, setSynopsisMap] = useState<Record<string, string>>({});
  const [isDesktop, setIsDesktop] = useState(false);
  const [activeTrailerId, setActiveTrailerId] = useState<string | null>(null);
  const [isTrailerReady, setIsTrailerReady] = useState(false);
  const [isHeroMuted, setIsHeroMuted] = useState(true);
  const [failedTrailerMap, setFailedTrailerMap] = useState<
    Record<string, boolean>
  >({});

  const trailerUrlMapRef = useRef<Record<string, string>>({});
  const failedTrailerMapRef = useRef<Record<string, boolean>>({});
  const trailerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const trailerWatchdogTimerRef = useRef<NodeJS.Timeout | null>(null);
  const heroIframeRef = useRef<HTMLIFrameElement>(null);
  const slideEpochRef = useRef<number>(0);
  const activeTrailerSessionRef = useRef<{
    epoch: number;
    slug: string;
    trailerId: string;
  } | null>(null);
  const retryCountMapRef = useRef<Record<string, number>>({});
  const hasErrorRef = useRef(false);
  const isIframeLoadedRef = useRef(false);
  const isVideoPlayingRef = useRef(false);
  const slideStartTimeRef = useRef<number>(0);
  const isUserActionRef = useRef(false);

  const [isHeroVisible, setIsHeroVisible] = useState(true);
  const [isDocumentVisible, setIsDocumentVisible] = useState(() =>
    typeof document !== "undefined" ? !document.hidden : true,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      const desktop = isDesktopWithHover();
      setIsDesktop((prev) => (prev !== desktop ? desktop : prev));
    };
    handleResize();
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    slideStartTimeRef.current = Date.now();
  }, [index]);

  useEffect(() => {
    const handleVisibility = () => {
      setIsDocumentVisible(
        typeof document !== "undefined" ? !document.hidden : true,
      );
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibility);
    }
    return () => {
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibility);
      }
    };
  }, []);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsHeroVisible(entry.isIntersecting);
      },
      { threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [heroRef]);

  const goPrev = useCallback(() => {
    isUserActionRef.current = true;
    slideStartTimeRef.current = Date.now();
    setDirection(-1);
    setIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length, setDirection, setIndex]);

  const goNext = useCallback(() => {
    isUserActionRef.current = true;
    slideStartTimeRef.current = Date.now();
    setDirection(1);
    setIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length, setDirection, setIndex]);

  const goToSlide = useCallback(
    (targetIndex: number) => {
      isUserActionRef.current = true;
      slideStartTimeRef.current = Date.now();
      setDirection(targetIndex > index ? 1 : -1);
      setIndex(targetIndex);
    },
    [index, setDirection, setIndex],
  );

  // Auto-slide timer (6s normal / 26s desktop trailer), paused when offscreen or tab hidden
  useEffect(() => {
    if (slides.length <= 1 || paused || !isHeroVisible || !isDocumentVisible) {
      return;
    }

    const isTrailerSlide =
      isDesktop && Boolean(currentSlug && !failedTrailerMap[currentSlug]);

    let slideDuration: number;
    if (isTrailerSlide) {
      slideDuration = AUTO_SLIDE_TRAILER_MS;
    } else {
      const elapsed = slideStartTimeRef.current
        ? Date.now() - slideStartTimeRef.current
        : 0;
      slideDuration = Math.max(500, AUTO_SLIDE_NORMAL_MS - elapsed);
    }

    const id = setTimeout(() => {
      isUserActionRef.current = false;
      setDirection(1);
      setIndex((prev) => (prev + 1) % slides.length);
    }, slideDuration);

    return () => clearTimeout(id);
  }, [
    index,
    slides.length,
    paused,
    isHeroVisible,
    isDocumentVisible,
    isDesktop,
    currentSlug,
    failedTrailerMap,
    setDirection,
    setIndex,
  ]);

  // Fetch synopsis tóm tắt nội dung ngay khi slide active
  useEffect(() => {
    if (!currentSlug) return;
    if (clientSynopsisCache.has(currentSlug)) return;

    const currentMovie = slides[index];
    const initialDesc = currentMovie?.content || currentMovie?.description || "";
    if (
      initialDesc &&
      initialDesc.trim().length > 10 &&
      !initialDesc.startsWith("Tên gốc:")
    ) {
      clientSynopsisCache.set(currentSlug, initialDesc);
      return;
    }

    let isCancelled = false;
    fetchMovieSynopsisShared(currentSlug)
      .then((data) => {
        if (isCancelled) return;
        if (data?.content) {
          clientSynopsisCache.set(currentSlug, data.content);
          setSynopsisMap((prev) => ({ ...prev, [currentSlug]: data.content }));
        }
        if (data?.trailer_url) {
          trailerUrlMapRef.current[currentSlug] = data.trailer_url;
        }
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [currentSlug, index, slides]);

  // Quản lý trailer nền desktop (lazy 2s sau khi slide ổn định)
  useEffect(() => {
    slideEpochRef.current += 1;
    const currentEpoch = slideEpochRef.current;
    const targetSlug = currentSlug;

    if (trailerTimerRef.current) {
      clearTimeout(trailerTimerRef.current);
      trailerTimerRef.current = null;
    }
    if (trailerWatchdogTimerRef.current) {
      clearTimeout(trailerWatchdogTimerRef.current);
      trailerWatchdogTimerRef.current = null;
    }

    setActiveTrailerId(null);
    setIsTrailerReady(false);
    activeTrailerSessionRef.current = null;
    hasErrorRef.current = false;
    isIframeLoadedRef.current = false;
    isVideoPlayingRef.current = false;

    if (!isDesktop || !isHeroVisible || !isDocumentVisible || !targetSlug) {
      return;
    }
    if (failedTrailerMapRef.current[targetSlug]) return;
    if ((retryCountMapRef.current[targetSlug] || 0) >= 2) return;

    trailerTimerRef.current = setTimeout(async () => {
      if (slideEpochRef.current !== currentEpoch) return;
      if (failedTrailerMapRef.current[targetSlug]) return;

      const featured = slides[index];
      let rawTrailer =
        featured?.trailer_url || trailerUrlMapRef.current[targetSlug];

      if (!rawTrailer) {
        try {
          const data = await fetchMovieSynopsisShared(targetSlug);
          if (slideEpochRef.current !== currentEpoch) return;
          if (data?.trailer_url) {
            rawTrailer = data.trailer_url;
            trailerUrlMapRef.current[targetSlug] = data.trailer_url;
          }
        } catch {}
      }

      if (slideEpochRef.current !== currentEpoch) return;

      const ytId = rawTrailer ? extractYoutubeId(rawTrailer) : null;
      if (ytId && !failedTrailerMapRef.current[targetSlug]) {
        setActiveTrailerId(ytId);
        setIsTrailerReady(false);
      } else if (rawTrailer && !ytId) {
        failedTrailerMapRef.current[targetSlug] = true;
        setFailedTrailerMap((prev) => ({ ...prev, [targetSlug]: true }));
      }
    }, 2000);

    return () => {
      if (trailerTimerRef.current) {
        clearTimeout(trailerTimerRef.current);
        trailerTimerRef.current = null;
      }
      if (trailerWatchdogTimerRef.current) {
        clearTimeout(trailerWatchdogTimerRef.current);
        trailerWatchdogTimerRef.current = null;
      }
    };
  }, [index, currentSlug, isDesktop, isHeroVisible, isDocumentVisible, slides]);

  // Lắng nghe postMessage từ YouTube iframe + watchdog 8s
  useEffect(() => {
    if (!activeTrailerId) {
      activeTrailerSessionRef.current = null;
      return;
    }

    const sessionEpoch = slideEpochRef.current;
    const sessionSlug = currentSlug;
    const sessionTrailerId = activeTrailerId;

    activeTrailerSessionRef.current = {
      epoch: sessionEpoch,
      slug: sessionSlug || "",
      trailerId: sessionTrailerId,
    };

    if (trailerWatchdogTimerRef.current) {
      clearTimeout(trailerWatchdogTimerRef.current);
      trailerWatchdogTimerRef.current = null;
    }

    trailerWatchdogTimerRef.current = setTimeout(() => {
      const currentSession = activeTrailerSessionRef.current;
      if (
        !currentSession ||
        currentSession.epoch !== sessionEpoch ||
        currentSession.trailerId !== sessionTrailerId ||
        currentSession.slug !== (sessionSlug || "") ||
        slideEpochRef.current !== sessionEpoch
      ) {
        return;
      }

      if (!isVideoPlayingRef.current) {
        if (sessionSlug) {
          retryCountMapRef.current[sessionSlug] =
            (retryCountMapRef.current[sessionSlug] || 0) + 1;
        }
        setActiveTrailerId(null);
        setIsTrailerReady(false);
      }
      trailerWatchdogTimerRef.current = null;
    }, 8000);

    const handleMessage = (e: MessageEvent) => {
      const currentIframe = heroIframeRef.current;
      if (
        !currentIframe ||
        !currentIframe.contentWindow ||
        e.source !== currentIframe.contentWindow
      ) {
        return;
      }
      const origin = e.origin || "";
      if (
        origin &&
        !origin.includes("youtube.com") &&
        !origin.includes("youtube-nocookie.com")
      ) {
        return;
      }

      const currentSession = activeTrailerSessionRef.current;
      if (
        !currentSession ||
        currentSession.epoch !== sessionEpoch ||
        currentSession.trailerId !== sessionTrailerId ||
        currentSession.slug !== (sessionSlug || "") ||
        slideEpochRef.current !== sessionEpoch
      ) {
        return;
      }

      if (isYoutubePlayingMessage(e.data)) {
        isVideoPlayingRef.current = true;
        if (trailerWatchdogTimerRef.current) {
          clearTimeout(trailerWatchdogTimerRef.current);
          trailerWatchdogTimerRef.current = null;
        }
        try {
          currentIframe.contentWindow?.postMessage(
            JSON.stringify({
              event: "command",
              func: "unloadModule",
              args: ["captions"],
            }),
            "*",
          );
          currentIframe.contentWindow?.postMessage(
            JSON.stringify({
              event: "command",
              func: "setOption",
              args: ["captions", "track", {}],
            }),
            "*",
          );
        } catch {}
        setIsTrailerReady(true);
        return;
      }

      if (isYoutubeErrorMessage(e.data)) {
        hasErrorRef.current = true;
        if (trailerWatchdogTimerRef.current) {
          clearTimeout(trailerWatchdogTimerRef.current);
          trailerWatchdogTimerRef.current = null;
        }

        if (isYoutubePermanentErrorMessage(e.data)) {
          if (sessionSlug) {
            failedTrailerMapRef.current[sessionSlug] = true;
            setFailedTrailerMap((prev) => ({ ...prev, [sessionSlug]: true }));
          }
        } else if (sessionSlug) {
          retryCountMapRef.current[sessionSlug] =
            (retryCountMapRef.current[sessionSlug] || 0) + 1;
        }

        setActiveTrailerId(null);
        setIsTrailerReady(false);
        return;
      }

      if (isYoutubeEndedMessage(e.data)) {
        try {
          currentIframe.contentWindow?.postMessage(
            JSON.stringify({
              event: "command",
              func: "seekTo",
              args: [0, true],
            }),
            "*",
          );
          currentIframe.contentWindow?.postMessage(
            JSON.stringify({ event: "command", func: "playVideo", args: "" }),
            "*",
          );
        } catch {}
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      if (trailerWatchdogTimerRef.current) {
        clearTimeout(trailerWatchdogTimerRef.current);
        trailerWatchdogTimerRef.current = null;
      }
    };
  }, [activeTrailerId, currentSlug]);

  const activeTrailerEmbedUrl = useMemo(() => {
    if (!activeTrailerId) return null;
    return getYoutubeTrailerEmbedUrl(activeTrailerId, {
      muted: true,
      controls: false,
      loop: true,
    });
  }, [activeTrailerId]);

  const handleTrailerIframeLoad = useCallback(() => {
    isIframeLoadedRef.current = true;
    try {
      heroIframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "listening" }),
        "*",
      );
      heroIframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({
          event: "command",
          func: "unloadModule",
          args: ["captions"],
        }),
        "*",
      );
      heroIframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({
          event: "command",
          func: "setOption",
          args: ["captions", "track", {}],
        }),
        "*",
      );
    } catch {}
  }, []);

  const handleToggleHeroMute = useCallback(() => {
    setIsHeroMuted((prev) => {
      const nextMuted = !prev;
      try {
        heroIframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({
            event: "command",
            func: nextMuted ? "mute" : "unMute",
            args: "",
          }),
          "*",
        );
      } catch {}
      return nextMuted;
    });
  }, []);

  return {
    synopsisMap,
    isDesktop,
    isHeroVisible,
    activeTrailerId,
    activeTrailerEmbedUrl,
    isTrailerReady,
    isHeroMuted,
    failedTrailerMap,
    heroIframeRef,
    handleTrailerIframeLoad,
    handleToggleHeroMute,
    goPrev,
    goNext,
    goToSlide,
  };
}

