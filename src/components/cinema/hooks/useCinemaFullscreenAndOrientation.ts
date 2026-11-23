"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Maximize2, Minimize2, PictureInPicture } from "lucide-react";

interface UseCinemaFullscreenAndOrientationOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isNativeVideo: boolean;
  isPlaying: boolean;
  hasStream?: boolean;
  activeSrc?: string;
  m3u8Link?: string;
  showHud: (icon?: React.ReactNode, text?: string) => void;
  resetControlsTimeout: () => void;
}

export function useCinemaFullscreenAndOrientation({
  containerRef,
  videoRef,
  isNativeVideo,
  isPlaying: _isPlaying,
  hasStream = false,
  activeSrc,
  m3u8Link,
  showHud,
  resetControlsTimeout,
}: UseCinemaFullscreenAndOrientationOptions) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const isMobileUA =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );
    const hasTouch =
      isMobileUA ||
      window.matchMedia?.("(pointer: coarse)").matches ||
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0;
    return Boolean(hasTouch && window.innerWidth < 1024);
  });
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
          window.matchMedia?.("(pointer: coarse)").matches) ||
        (typeof window !== "undefined" && "ontouchstart" in window) ||
        (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0);
      setIsMobile(Boolean(hasTouch && window.innerWidth < 1024));
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    window.addEventListener("orientationchange", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
      window.removeEventListener("orientationchange", checkMobile);
    };
  }, []);

  // Sticky detection: Sử dụng scroll listener kết hợp IntersectionObserver với hysteresis để chạy 100% mượt và chuẩn xác
  useEffect(() => {
    if (!isMobile) {
      setIsScrolledPast(false);
      return;
    }

    let rafId: number | null = null;
    const evaluateScroll = () => {
      const sentinel = sentinelRef.current;
      if (!sentinel) return;

      const rect = sentinel.getBoundingClientRect();
      const navbarHeight =
        (typeof window !== "undefined" &&
          parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue(
              "--navbar-height",
            ),
          )) ||
        56;

      // Hysteresis chống chớp giật:
      // - Khi chưa sticky: Kích hoạt khi đỉnh player trôi qua mép dưới navbar - 25px
      // - Khi đang sticky: Trả về bình thường khi vị trí gốc tụt xuống dưới mép navbar + 15px
      setIsScrolledPast((prev) => {
        if (!prev) {
          return rect.top <= navbarHeight - 25;
        } else {
          return rect.top < navbarHeight + 15;
        }
      });
    };

    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        evaluateScroll();
      });
    };

    const observer =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            () => {
              evaluateScroll();
            },
            { threshold: [0, 1] },
          )
        : null;

    if (sentinelRef.current && observer) {
      observer.observe(sentinelRef.current);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    evaluateScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (observer) observer.disconnect();
    };
  }, [isMobile]);

  // Sticky player trên mobile: Giữ cố định khi cuộn qua video mà không phụ thuộc vào trạng thái pause/play
  const canBeSticky = Boolean(hasStream || activeSrc || m3u8Link);
  const isMobileStickyActive =
    isMobile &&
    isScrolledPast &&
    !isFullscreen &&
    canBeSticky;

  // Đồng bộ cờ playerSticky và đo lường chính xác chiều cao sticky player lên DOM
  useEffect(() => {
    if (!isMobileStickyActive) {
      delete document.documentElement.dataset.playerSticky;
      document.documentElement.style.removeProperty("--sticky-player-height");
      return;
    }

    document.documentElement.dataset.playerSticky = "true";

    const updateStickyHeight = () => {
      const container = containerRef.current;
      if (!container) return;
      const height = container.offsetHeight || container.getBoundingClientRect().height;
      if (height > 0) {
        document.documentElement.style.setProperty(
          "--sticky-player-height",
          `${Math.round(height)}px`
        );
      }
    };

    updateStickyHeight();

    // Đồng bộ theo ResizeObserver để bắt kịp mọi thay đổi kích thước tức thì (xoay màn hình, safe-area...)
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        updateStickyHeight();
      });
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener("resize", updateStickyHeight, { passive: true });
    window.addEventListener("orientationchange", updateStickyHeight, { passive: true });

    return () => {
      delete document.documentElement.dataset.playerSticky;
      document.documentElement.style.removeProperty("--sticky-player-height");
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener("resize", updateStickyHeight);
      window.removeEventListener("orientationchange", updateStickyHeight);
    };
  }, [isMobileStickyActive, containerRef]);

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
