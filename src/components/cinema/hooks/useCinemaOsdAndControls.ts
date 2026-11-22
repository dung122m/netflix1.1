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

  // Desktop Playback Visual Feedback (Pause / Play / Rewind / FastForward)
  const [desktopFeedback, setDesktopFeedback] =
    useState<DesktopFeedbackState | null>(null);
  const desktopFeedbackRef = useRef(desktopFeedback);
  useEffect(() => {
    desktopFeedbackRef.current = desktopFeedback;
  }, [desktopFeedback]);

  // Volume OSD and General HUD pills are permanently disabled across the project to maintain clean video playback
  const volumeOsd: VolumeOsdState | null = null;
  const hudNotification: HudNotificationState | null = null;

  const triggerDesktopFeedback = useCallback(
    (
      type: "play" | "pause" | "seek-left" | "seek-right",
      text?: string,
      seconds?: number,
    ) => {
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
    (_newVol: number, _muted: boolean) => {},
    [],
  );

  const showHud = useCallback((_icon?: React.ReactNode, _text?: string) => {}, []);

  const clearControlsTimer = useCallback(() => {
    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
      controlsTimerRef.current = null;
    }
  }, []);

  const resetControlsTimeout = useCallback(() => {
    if (!showControlsRef.current) {
      lastControlsShownTimeRef.current = Date.now();
    }
    setShowControls(true);
    showControlsRef.current = true;
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
    if (!showControlsRef.current) {
      lastControlsShownTimeRef.current = Date.now();
    }
    setShowControls(true);
    showControlsRef.current = true;
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

