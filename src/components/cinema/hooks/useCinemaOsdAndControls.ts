"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  createInitialKeyboardSeekState,
  type KeyboardSeekState,
} from "@/lib/keyboardSeekManager";

export interface DesktopFeedbackState {
  type: "play" | "pause" | "seek-left" | "seek-right";
  text?: string;
  seconds?: number;
  id: number;
}

export interface VolumeOsdState {
  volume: number;
  isMuted: boolean;
  visible: boolean;
}

export interface HudNotificationState {
  icon: React.ReactNode;
  text: string;
  id: number;
}

export interface PendingKeyboardSeekRefValue {
  state: KeyboardSeekState;
  timer: NodeJS.Timeout | null;
  resetTimer: NodeJS.Timeout | null;
}

interface UseCinemaOsdAndControlsOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isPlaying: boolean;
  pendingKeyboardSeekRef: React.RefObject<PendingKeyboardSeekRefValue>;
}

export function useCinemaOsdAndControls({
  videoRef,
  isPlaying,
  pendingKeyboardSeekRef,
}: UseCinemaOsdAndControlsOptions) {
  const [showControls, setShowControls] = useState(true);
  const showControlsRef = useRef(showControls);
  useEffect(() => {
    showControlsRef.current = showControls;
  }, [showControls]);

  const lastControlsShownTimeRef = useRef<number>(0);
  const desktopFeedbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const volumeOsdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hudTimerRef = useRef<NodeJS.Timeout | null>(null);

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
      if (volumeOsdTimerRef.current) {
        clearTimeout(volumeOsdTimerRef.current);
        volumeOsdTimerRef.current = null;
      }
      if (hudTimerRef.current) {
        clearTimeout(hudTimerRef.current);
        hudTimerRef.current = null;
      }
    };
  }, []);

  // Desktop Playback Visual Feedback (Pause / Play / Rewind / FastForward)
  const [desktopFeedback, setDesktopFeedback] =
    useState<DesktopFeedbackState | null>(null);
  const desktopFeedbackRef = useRef(desktopFeedback);
  useEffect(() => {
    desktopFeedbackRef.current = desktopFeedback;
  }, [desktopFeedback]);

  // Premium Volume OSD & General HUD (YouTube Top Pill Style)
  const [volumeOsd, setVolumeOsd] = useState<VolumeOsdState | null>(null);
  const [hudNotification, setHudNotification] =
    useState<HudNotificationState | null>(null);

  const triggerDesktopFeedback = useCallback(
    (
      type: "play" | "pause" | "seek-left" | "seek-right",
      text?: string,
      seconds?: number,
    ) => {
      if (volumeOsdTimerRef.current) {
        clearTimeout(volumeOsdTimerRef.current);
        volumeOsdTimerRef.current = null;
      }
      setVolumeOsd((prev) => (prev ? { ...prev, visible: false } : null));

      if (desktopFeedbackTimerRef.current) {
        clearTimeout(desktopFeedbackTimerRef.current);
      }
      setDesktopFeedback({
        type,
        text,
        seconds,
        id: Date.now(),
      });

      // Nếu chuyển sang play/pause feedback, kết thúc chu kỳ seek indicator ngay lập tức
      if (type === "play" || type === "pause") {
        const s = pendingKeyboardSeekRef.current;
        if (s.resetTimer) {
          clearTimeout(s.resetTimer);
          s.resetTimer = null;
        }
        s.state = createInitialKeyboardSeekState();
      }

      // Tua video: tự ẩn sau 800ms (chuẩn 700-900ms). Play/pause: 550ms.
      const timeoutMs =
        type === "seek-left" || type === "seek-right" ? 800 : 550;
      desktopFeedbackTimerRef.current = setTimeout(() => {
        setDesktopFeedback(null);
        desktopFeedbackTimerRef.current = null;
      }, timeoutMs);
    },
    [pendingKeyboardSeekRef],
  );

  const triggerVolumeOsd = useCallback(
    (newVol: number, muted: boolean) => {
      // Khi chỉnh âm lượng, ẩn feedback tua/play/pause để tránh chồng lấn
      if (desktopFeedbackTimerRef.current) {
        clearTimeout(desktopFeedbackTimerRef.current);
        desktopFeedbackTimerRef.current = null;
      }
      setDesktopFeedback(null);

      // Reset chu kỳ seek indicator khi volume OSD hiển thị đè lên
      const s = pendingKeyboardSeekRef.current;
      if (s.resetTimer) {
        clearTimeout(s.resetTimer);
        s.resetTimer = null;
      }
      s.state = createInitialKeyboardSeekState();

      if (hudTimerRef.current) {
        clearTimeout(hudTimerRef.current);
        hudTimerRef.current = null;
      }
      setHudNotification(null);

      setVolumeOsd({
        volume: newVol,
        isMuted: muted,
        visible: true,
      });

      if (volumeOsdTimerRef.current) {
        clearTimeout(volumeOsdTimerRef.current);
      }
      volumeOsdTimerRef.current = setTimeout(() => {
        setVolumeOsd((prev) => (prev ? { ...prev, visible: false } : null));
        volumeOsdTimerRef.current = null;
      }, 1200);
    },
    [pendingKeyboardSeekRef],
  );

  const showHud = useCallback((icon?: React.ReactNode, text?: string) => {
    if (!text && !icon) return;
    if (hudTimerRef.current) {
      clearTimeout(hudTimerRef.current);
    }
    setHudNotification({
      icon: icon || null,
      text: text || "",
      id: Date.now(),
    });
    hudTimerRef.current = setTimeout(() => {
      setHudNotification(null);
      hudTimerRef.current = null;
    }, 1200);
  }, []);

  const clearControlsTimer = useCallback(() => {
    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
      controlsTimerRef.current = null;
    }
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
        const isStillPaused = videoRef.current
          ? videoRef.current.paused
          : !isPlaying;
        if (!isStillPaused) {
          setShowControls(false);
          showControlsRef.current = false;
        }
      }, 2500);
    }
  }, [isPlaying, videoRef]);

  const hideControlsImmediately = useCallback(() => {
    setShowControls(false);
    showControlsRef.current = false;
    clearControlsTimer();
  }, [clearControlsTimer]);

  const forceShowControls = useCallback(() => {
    setShowControls(true);
    clearControlsTimer();
  }, [clearControlsTimer]);

  return {
    showControls,
    setShowControls,
    showControlsRef,
    lastControlsShownTimeRef,
    desktopFeedback,
    desktopFeedbackRef,
    volumeOsd,
    hudNotification,
    triggerDesktopFeedback,
    triggerVolumeOsd,
    showHud,
    resetControlsTimeout,
    clearControlsTimer,
    hideControlsImmediately,
    forceShowControls,
  };
}

