"use client";

import React, { useRef, useCallback } from "react";
import Hls from "hls.js";
import { Zap } from "lucide-react";
import { updatePlayerSettings } from "@/services/userService";
import {
  updateUserMutePreferenceDuringTransition,
  type AdTransitionState,
} from "@/lib/adTransitionController";
import { type DesktopFeedbackState } from "@/components/cinema/hooks/useCinemaOsdAndControls";
import { type QualityLevelItem } from "@/components/cinema/hooks/useCinemaHlsEngine";

interface UseCinemaPlayerActionsOptions {
  userId?: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  hlsRef: React.RefObject<Hls | null>;
  hasStartedInitialPlaybackRef: React.RefObject<boolean>;
  isStalledRef: React.RefObject<boolean>;
  automatedAdSkipRef: React.RefObject<AdTransitionState | null>;
  showControlsRef: React.RefObject<boolean>;
  lastControlsShownTimeRef: React.RefObject<number>;
  desktopFeedbackRef: React.RefObject<DesktopFeedbackState | null>;
  isNativeVideo: boolean;
  isMobile: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  qualityLevels: QualityLevelItem[];
  setIsMuted: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  setIsBuffering: React.Dispatch<React.SetStateAction<boolean>>;
  setVolume: React.Dispatch<React.SetStateAction<number>>;
  setPlaybackSpeed: React.Dispatch<React.SetStateAction<number>>;
  setCurrentQualityIndex: React.Dispatch<React.SetStateAction<number>>;
  toggleFullscreen: () => void;
  requestPlayerSeek: (targetTime: number, isProgrammatic?: boolean) => void;
  showHud: (icon?: React.ReactNode, text?: string) => void;
  triggerDesktopFeedback: (
    type: "play" | "pause" | "seek-left" | "seek-right",
    text?: string,
    seconds?: number,
  ) => void;
  triggerVolumeOsd: (newVol: number, muted: boolean) => void;
  resetControlsTimeout: () => void;
  hideControlsImmediately: () => void;
  forceShowControls: () => void;
}

export function useCinemaPlayerActions({
  userId,
  videoRef,
  iframeRef,
  hlsRef,
  hasStartedInitialPlaybackRef,
  isStalledRef,
  automatedAdSkipRef,
  showControlsRef,
  lastControlsShownTimeRef,
  desktopFeedbackRef,
  isNativeVideo,
  isMobile,
  isPlaying,
  isMuted,
  volume,
  qualityLevels,
  setIsMuted,
  setIsPlaying,
  setIsBuffering,
  setVolume,
  setPlaybackSpeed,
  setCurrentQualityIndex,
  toggleFullscreen,
  requestPlayerSeek,
  showHud,
  triggerDesktopFeedback,
  triggerVolumeOsd,
  resetControlsTimeout,
  hideControlsImmediately,
  forceShowControls,
}: UseCinemaPlayerActionsOptions) {
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const singleTapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const singleTapExecutedTimeRef = useRef<number>(0);
  const lastFullscreenToggleTimeRef = useRef<number>(0);

  const sendPlayerCommand = useCallback(
    (cmd: string, val?: string | number | boolean) => {
      if (!iframeRef.current?.contentWindow) return;
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: "command",
            func: cmd,
            args: val !== undefined ? [val] : [],
          }),
          "*",
        );
        iframeRef.current.contentWindow.postMessage(
          { method: cmd, value: val, action: cmd, type: cmd },
          "*",
        );
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ method: cmd, value: val }),
          "*",
        );
      } catch {}
    },
    [iframeRef],
  );

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
        forceShowControls();
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
          forceShowControls();
        }
        return next;
      });
    }
  }, [
    isNativeVideo,
    videoRef,
    isMuted,
    setIsMuted,
    hasStartedInitialPlaybackRef,
    isStalledRef,
    setIsBuffering,
    setIsPlaying,
    sendPlayerCommand,
    resetControlsTimeout,
    triggerDesktopFeedback,
    forceShowControls,
  ]);

  const handleQualityChange = useCallback(
    (levelIndex: number) => {
      if (!hlsRef.current) return;
      hlsRef.current.currentLevel = levelIndex;
      setCurrentQualityIndex(levelIndex);
      const label =
        levelIndex === -1
          ? "Tự động (Auto)"
          : qualityLevels.find((q) => q.id === levelIndex)?.label || "Đã đổi";
      showHud(
        React.createElement(Zap, { className: "w-5 h-5 text-sky-400" }),
        `Chất lượng: ${label}`,
      );
    },
    [hlsRef, qualityLevels, setCurrentQualityIndex, showHud],
  );

  const handleSpeedChange = useCallback(
    (spd: number) => {
      if (videoRef.current) {
        videoRef.current.playbackRate = spd;
        setPlaybackSpeed(spd);
        showHud(
          React.createElement(Zap, { className: "w-5 h-5 text-amber-400" }),
          `Tốc độ: ${spd}x`,
        );
        updatePlayerSettings(userId, { playbackSpeed: spd });
      }
    },
    [videoRef, setPlaybackSpeed, showHud, userId],
  );

  const handleVolumeDelta = useCallback(
    (delta: number) => {
      setVolume((prevVol) => {
        let current = prevVol;
        let nextMuted = isMuted;
        if (delta > 0 && isMuted) {
          if (videoRef.current) {
            videoRef.current.muted = false;
          }
          setIsMuted(false);
          nextMuted = false;
          current = Math.max(0.05, prevVol);
        }
        const newVol = Math.max(
          0,
          Math.min(1, Math.round((current + delta) * 100) / 100),
        );
        if (videoRef.current) {
          videoRef.current.volume = newVol;
          videoRef.current.muted = newVol === 0;
        }
        const finalMuted = newVol === 0 ? true : nextMuted;
        setIsMuted(finalMuted);
        if (automatedAdSkipRef.current && automatedAdSkipRef.current.active) {
          automatedAdSkipRef.current = updateUserMutePreferenceDuringTransition(
            automatedAdSkipRef.current,
            finalMuted,
          );
        }
        triggerVolumeOsd(newVol, finalMuted);
        updatePlayerSettings(userId, { volume: newVol, isMuted: finalMuted });
        return newVol;
      });
    },
    [
      setVolume,
      isMuted,
      videoRef,
      setIsMuted,
      automatedAdSkipRef,
      triggerVolumeOsd,
      userId,
    ],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if ((e.nativeEvent as PointerEvent)?.pointerType === "touch") return;
      resetControlsTimeout();
    },
    [resetControlsTimeout],
  );

  const handleMouseLeave = useCallback(() => {
    if (isMobile) return;
    const isPaused = videoRef.current ? videoRef.current.paused : !isPlaying;
    if (!isPaused) {
      hideControlsImmediately();
    }
  }, [isMobile, videoRef, isPlaying, hideControlsImmediately]);

  const handleVideoDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-player-control="true"]')) return;

      // Bỏ qua hoàn toàn trên màn hình cảm ứng: trên mobile chỉ chạm đúp để tua, TUYỆT ĐỐI không bật/tắt toàn màn hình
      const isTouch =
        (e.nativeEvent as PointerEvent)?.pointerType === "touch" ||
        (typeof window !== "undefined" &&
          window.matchMedia &&
          window.matchMedia("(pointer: coarse)").matches) ||
        isMobile;
      if (isTouch) return;

      const now = Date.now();
      if (now - lastFullscreenToggleTimeRef.current > 400) {
        lastFullscreenToggleTimeRef.current = now;
        if (now - singleTapExecutedTimeRef.current < 400) {
          togglePlayPause();
          singleTapExecutedTimeRef.current = 0;
        }
        if (singleTapTimerRef.current) {
          clearTimeout(singleTapTimerRef.current);
          singleTapTimerRef.current = null;
        }
        toggleFullscreen();
        resetControlsTimeout();
      }
    },
    [isMobile, togglePlayPause, toggleFullscreen, resetControlsTimeout],
  );

  const handleVideoClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
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
        (typeof window !== "undefined" &&
          window.matchMedia &&
          window.matchMedia("(pointer: coarse)").matches) ||
        isMobile;

      if (!isTouch) {
        // DESKTOP: BẤM ĐÚP CHUỘT BẤT KỲ ĐÂU TRÊN MÀN HÌNH -> TOÀN MÀN HÌNH
        const isDoubleClick =
          (lastTap &&
            now - lastTap.time < 380 &&
            Math.abs(e.clientX - lastTap.x) < 120) ||
          e.detail === 2;

        if (isDoubleClick) {
          if (singleTapTimerRef.current) {
            clearTimeout(singleTapTimerRef.current);
            singleTapTimerRef.current = null;
          }
          if (now - singleTapExecutedTimeRef.current < 380) {
            togglePlayPause();
            singleTapExecutedTimeRef.current = 0;
          }
          lastTapRef.current = null;
          lastFullscreenToggleTimeRef.current = now;
          toggleFullscreen();
          resetControlsTimeout();
          return;
        }

        // Single Click trên Desktop: Play/Pause với độ trễ 260ms để phân biệt double click
        lastTapRef.current = { time: now, x: e.clientX, y: e.clientY };
        if (singleTapTimerRef.current) {
          clearTimeout(singleTapTimerRef.current);
          singleTapTimerRef.current = null;
        }
        if (!showControlsRef.current) {
          resetControlsTimeout();
        }
        singleTapTimerRef.current = setTimeout(() => {
          singleTapTimerRef.current = null;
          singleTapExecutedTimeRef.current = Date.now();
          togglePlayPause();
        }, 260);
        resetControlsTimeout();
        return;
      }

      // MOBILE / TOUCH DEVICES (CHẠM ĐÚP ĐỂ TUA NHANH ±10S - YOUTUBE STYLE, CÂN CHỈNH ĐỘ NHẠY CAO 450MS)
      if (
        lastTap &&
        now - lastTap.time < 450 &&
        Math.abs(e.clientX - lastTap.x) < 130 &&
        Math.abs(e.clientY - lastTap.y) < 130
      ) {
        if (singleTapTimerRef.current) {
          clearTimeout(singleTapTimerRef.current);
          singleTapTimerRef.current = null;
        }
        lastTapRef.current = null;

        const SEEK_STEP = 10;
        if (xPct < 0.5) {
          if (videoRef.current) {
            requestPlayerSeek(
              Math.max(0, (videoRef.current.currentTime || 0) - SEEK_STEP),
              false,
            );
          }
          const cur = desktopFeedbackRef.current;
          const prevSec = cur && cur.type === "seek-left" ? cur.seconds || 0 : 0;
          const nextSec = prevSec + SEEK_STEP;
          triggerDesktopFeedback("seek-left", `−${nextSec}s`, nextSec);
        } else {
          if (videoRef.current) {
            requestPlayerSeek(
              (videoRef.current.currentTime || 0) + SEEK_STEP,
              false,
            );
          }
          const cur = desktopFeedbackRef.current;
          const prevSec = cur && cur.type === "seek-right" ? cur.seconds || 0 : 0;
          const nextSec = prevSec + SEEK_STEP;
          triggerDesktopFeedback("seek-right", `+${nextSec}s`, nextSec);
        }
        resetControlsTimeout();
      } else {
        lastTapRef.current = { time: now, x: e.clientX, y: e.clientY };
        if (singleTapTimerRef.current) {
          clearTimeout(singleTapTimerRef.current);
          singleTapTimerRef.current = null;
        }

        if (!showControlsRef.current) {
          resetControlsTimeout();
        } else {
          if (now - lastControlsShownTimeRef.current < 350) {
            resetControlsTimeout();
            return;
          }
          hideControlsImmediately();
        }
      }
    },
    [
      isMobile,
      togglePlayPause,
      toggleFullscreen,
      resetControlsTimeout,
      requestPlayerSeek,
      triggerDesktopFeedback,
      hideControlsImmediately,
      showControlsRef,
      lastControlsShownTimeRef,
      desktopFeedbackRef,
      videoRef,
    ],
  );

  const handleToggleMuteControl = useCallback(() => {
    if (videoRef.current) {
      const nextMuted = !videoRef.current.muted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
      if (automatedAdSkipRef.current && automatedAdSkipRef.current.active) {
        automatedAdSkipRef.current = updateUserMutePreferenceDuringTransition(
          automatedAdSkipRef.current,
          nextMuted,
        );
      }
      triggerVolumeOsd(volume, nextMuted);
      updatePlayerSettings(userId, { isMuted: nextMuted });
    }
    resetControlsTimeout();
  }, [
    videoRef,
    setIsMuted,
    automatedAdSkipRef,
    volume,
    userId,
    triggerVolumeOsd,
    resetControlsTimeout,
  ]);

  const handleVolumeChangeControl = useCallback(
    (newVol: number) => {
      setVolume(newVol);
      if (videoRef.current) {
        videoRef.current.volume = newVol;
        videoRef.current.muted = newVol === 0;
        setIsMuted(newVol === 0);
        if (automatedAdSkipRef.current && automatedAdSkipRef.current.active) {
          automatedAdSkipRef.current = updateUserMutePreferenceDuringTransition(
            automatedAdSkipRef.current,
            newVol === 0,
          );
        }
      }
      triggerVolumeOsd(newVol, newVol === 0);
      updatePlayerSettings(userId, {
        volume: newVol,
        isMuted: newVol === 0,
      });
      resetControlsTimeout();
    },
    [
      setVolume,
      videoRef,
      setIsMuted,
      automatedAdSkipRef,
      userId,
      triggerVolumeOsd,
      resetControlsTimeout,
    ],
  );

  const handleSeekFeedbackControl = useCallback(
    (txt: string) => {
      resetControlsTimeout();
      const clean = txt.replace(/[^0-9]/g, "");
      const num = clean ? parseInt(clean, 10) : 5;
      if (txt.includes("-")) {
        triggerDesktopFeedback("seek-left", `−${num}s`, num);
      } else if (txt.includes("+")) {
        triggerDesktopFeedback("seek-right", `+${num}s`, num);
      }
    },
    [resetControlsTimeout, triggerDesktopFeedback],
  );

  return {
    singleTapTimerRef,
    togglePlayPause,
    handleQualityChange,
    handleSpeedChange,
    handleVolumeDelta,
    handleMouseMove,
    handleMouseLeave,
    handleVideoDoubleClick,
    handleVideoClick,
    handleToggleMuteControl,
    handleVolumeChangeControl,
    handleSeekFeedbackControl,
  };
}

