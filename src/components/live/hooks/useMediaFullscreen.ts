"use client";

import { useState, useCallback, useEffect, RefObject } from "react";

export interface UseMediaFullscreenOptions {
  containerRef: RefObject<HTMLElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

export function useMediaFullscreen({
  containerRef,
  videoRef,
  onFullscreenChange,
}: UseMediaFullscreenOptions) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPip, setIsPip] = useState(false);

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

    // Kiểm tra trạng thái fullscreen hiện tại qua các vendor prefixes
    const isDocFs = Boolean(
      document.fullscreenElement ||
      (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement ||
      (document as unknown as { mozFullScreenElement?: Element }).mozFullScreenElement ||
      (document as unknown as { msFullscreenElement?: Element }).msFullscreenElement,
    );

    // Kiểm tra trạng thái fullscreen riêng của iOS Safari trên video element
    const isVideoFs = Boolean(
      video && (video as unknown as { webkitDisplayingFullscreen?: boolean }).webkitDisplayingFullscreen,
    );

    if (isDocFs || isVideoFs || isFullscreen) {
      // Thoát toàn màn hình
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as unknown as { webkitExitFullscreen?: () => void }).webkitExitFullscreen) {
        (document as unknown as { webkitExitFullscreen: () => void }).webkitExitFullscreen();
      } else if ((document as unknown as { mozCancelFullScreen?: () => void }).mozCancelFullScreen) {
        (document as unknown as { mozCancelFullScreen: () => void }).mozCancelFullScreen();
      } else if ((document as unknown as { msExitFullscreen?: () => void }).msExitFullscreen) {
        (document as unknown as { msExitFullscreen: () => void }).msExitFullscreen();
      }
      setIsFullscreen(false);
      onFullscreenChange?.(false);
      unlockOrientation();
    } else {
      // Bật toàn màn hình
      if (container && container.requestFullscreen) {
        const p = container.requestFullscreen({ navigationUI: "hide" } as FullscreenOptions).catch(() => {
          return container.requestFullscreen().catch(() => {
            // Fallback cho iOS Safari
            if (video && (video as unknown as { webkitEnterFullscreen?: () => void }).webkitEnterFullscreen) {
              (video as unknown as { webkitEnterFullscreen: () => void }).webkitEnterFullscreen();
            }
          });
        });

        if (p && typeof p.then === "function") {
          p.then(lockLandscape).catch(() => {});
        } else {
          lockLandscape();
        }
      } else if (container && (container as unknown as { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen) {
        (container as unknown as { webkitRequestFullscreen: () => void }).webkitRequestFullscreen();
        lockLandscape();
      } else if (container && (container as unknown as { mozRequestFullScreen?: () => void }).mozRequestFullScreen) {
        (container as unknown as { mozRequestFullScreen: () => void }).mozRequestFullScreen();
        lockLandscape();
      } else if (container && (container as unknown as { msRequestFullscreen?: () => void }).msRequestFullscreen) {
        (container as unknown as { msRequestFullscreen: () => void }).msRequestFullscreen();
        lockLandscape();
      } else if (video && (video as unknown as { webkitEnterFullscreen?: () => void }).webkitEnterFullscreen) {
        (video as unknown as { webkitEnterFullscreen: () => void }).webkitEnterFullscreen();
      }
      setIsFullscreen(true);
      onFullscreenChange?.(true);
    }
  }, [containerRef, videoRef, isFullscreen, lockLandscape, unlockOrientation, onFullscreenChange]);

  // Picture-in-Picture (PiP)
  const togglePip = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPip(false);
      } else {
        await video.requestPictureInPicture();
        setIsPip(true);
      }
    } catch {}
  }, [videoRef]);

  // Lắng nghe sự kiện fullscreen từ trình duyệt và thiết bị
  useEffect(() => {
    const handleFsChange = () => {
      const isFs = Boolean(
        document.fullscreenElement ||
        (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement ||
        (document as unknown as { mozFullScreenElement?: Element }).mozFullScreenElement ||
        (document as unknown as { msFullscreenElement?: Element }).msFullscreenElement,
      );
      setIsFullscreen(isFs);
      onFullscreenChange?.(isFs);
      if (isFs) {
        lockLandscape();
      } else {
        unlockOrientation();
      }
    };

    const video = videoRef.current;
    const handleVideoBeginFs = () => {
      setIsFullscreen(true);
      onFullscreenChange?.(true);
      lockLandscape();
    };
    const handleVideoEndFs = () => {
      setIsFullscreen(false);
      onFullscreenChange?.(false);
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
  }, [videoRef, lockLandscape, unlockOrientation, onFullscreenChange]);

  return {
    isFullscreen,
    setIsFullscreen,
    isPip,
    setIsPip,
    toggleFullscreen,
    togglePip,
    lockLandscape,
    unlockOrientation,
  };
}

