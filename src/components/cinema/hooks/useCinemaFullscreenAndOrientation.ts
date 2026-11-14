"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Maximize2, Minimize2, PictureInPicture } from "lucide-react";

interface UseCinemaFullscreenAndOrientationOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isNativeVideo: boolean;
  isPlaying: boolean;
  activeSrc: string;
  m3u8Link?: string;
  showHud: (icon?: React.ReactNode, text?: string) => void;
  resetControlsTimeout: () => void;
}

export function useCinemaFullscreenAndOrientation({
  containerRef,
  videoRef,
  isNativeVideo,
  isPlaying: _isPlaying,
  activeSrc,
  m3u8Link,
  showHud,
  resetControlsTimeout,
}: UseCinemaFullscreenAndOrientationOptions) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isScrolledPast, setIsScrolledPast] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

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

    const isCurrentlyFs = Boolean(
      fullscreenElement || isFullscreen || webkitVideo?.webkitDisplayingFullscreen,
    );

    if (isCurrentlyFs) {
      const exitFS =
        doc.exitFullscreen ||
        doc.webkitExitFullscreen ||
        doc.mozCancelFullScreen ||
        doc.msExitFullscreen;
      if (exitFS && fullscreenElement) {
        exitFS.call(doc).catch(() => {});
      } else if (
        webkitVideo &&
        typeof webkitVideo.webkitExitFullscreen === "function" &&
        webkitVideo.webkitDisplayingFullscreen
      ) {
        try {
          webkitVideo.webkitExitFullscreen();
        } catch {}
      }
      setIsFullscreen(false);
      unlockOrientation();
      showHud(
        React.createElement(Minimize2, { className: "w-5 h-5 text-zinc-300" }),
        "Thoát toàn màn hình",
      );
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
        showHud(
          React.createElement(Maximize2, { className: "w-5 h-5 text-netflix-red" }),
          "Toàn màn hình",
        );
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
        setIsFullscreen(true);
        lockLandscape();
        showHud(
          React.createElement(Maximize2, { className: "w-5 h-5 text-netflix-red" }),
          "Toàn màn hình",
        );
      } else if (
        webkitVideo &&
        typeof webkitVideo.webkitEnterFullscreen === "function" &&
        isNativeVideo
      ) {
        try {
          webkitVideo.webkitEnterFullscreen();
          setIsFullscreen(true);
          lockLandscape();
          showHud(
            React.createElement(Maximize2, { className: "w-5 h-5 text-netflix-red" }),
            "Toàn màn hình (iOS)",
          );
        } catch {
          setIsFullscreen(true);
          lockLandscape();
          showHud(
            React.createElement(Maximize2, { className: "w-5 h-5 text-netflix-red" }),
            "Toàn màn hình",
          );
        }
      } else {
        setIsFullscreen(true);
        lockLandscape();
        showHud(
          React.createElement(Maximize2, { className: "w-5 h-5 text-netflix-red" }),
          "Toàn màn hình",
        );
      }
    }
  }, [
    containerRef,
    videoRef,
    isNativeVideo,
    isFullscreen,
    lockLandscape,
    unlockOrientation,
    showHud,
  ]);

  useEffect(() => {
    const handleFsChange = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc = document as any;
      const isFs = Boolean(
        doc.fullscreenElement ||
          doc.webkitFullscreenElement ||
          doc.mozFullScreenElement ||
          doc.msFullscreenElement,
      );
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
  }, [videoRef, lockLandscape, unlockOrientation, resetControlsTimeout]);

  const togglePiP = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !isNativeVideo) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        showHud(
          React.createElement(PictureInPicture, {
            className: "w-5 h-5 text-zinc-400",
          }),
          "Thoát cửa sổ nổi",
        );
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
        showHud(
          React.createElement(PictureInPicture, {
            className: "w-5 h-5 text-netflix-red",
          }),
          "Cửa sổ nổi (PiP)",
        );
      }
    } catch (err) {
      console.warn("PiP error:", err);
    }
  }, [videoRef, isNativeVideo, showHud]);

  // Mobile touch & sticky detection
  useEffect(() => {
    const checkMobile = () => {
      const isMobileUA =
        typeof navigator !== "undefined" &&
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent,
        );
      const hasTouch =
        isMobileUA ||
        (typeof window !== "undefined" &&
          window.matchMedia &&
          window.matchMedia("(pointer: coarse)").matches) ||
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
        setIsScrolledPast(
          !entry.isIntersecting && entry.boundingClientRect.top < 0,
        );
      },
      { threshold: 0, rootMargin: "-20px 0px 0px 0px" },
    );

    if (sentinelRef.current) observer.observe(sentinelRef.current);

    return () => {
      window.removeEventListener("resize", checkMobile);
      window.removeEventListener("orientationchange", checkMobile);
      observer.disconnect();
    };
  }, []);

  // Sticky player trên mobile: Giữ cố định khi cuộn qua video mà không phụ thuộc vào trạng thái pause/play
  const isMobileStickyActive =
    isMobile &&
    isScrolledPast &&
    !isFullscreen &&
    Boolean(activeSrc || m3u8Link);

  // Đồng bộ cờ playerSticky lên DOM để MobileMovieNav và layout mobile điều chỉnh tọa độ sticky
  useEffect(() => {
    if (isMobileStickyActive) {
      document.documentElement.dataset.playerSticky = "true";
    } else {
      delete document.documentElement.dataset.playerSticky;
    }
    return () => {
      delete document.documentElement.dataset.playerSticky;
    };
  }, [isMobileStickyActive]);

  const scrollToPlayer = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return {
    isFullscreen,
    isMobile,
    sentinelRef,
    isMobileStickyActive,
    toggleFullscreen,
    togglePiP,
    scrollToPlayer,
  };
}
