"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface UseControlsAutoHideOptions {
  isPlaying: boolean;
  preventHide?: boolean;
  hideDelayMs?: number;
  initialShowControls?: boolean;
}

/**
 * Shared controls visibility and auto-hide timeout manager for live players.
 */
export function useControlsAutoHide({
  isPlaying,
  preventHide = false,
  hideDelayMs = 3000,
  initialShowControls = true,
}: UseControlsAutoHideOptions) {
  const [showControls, setShowControls] = useState(initialShowControls);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }
  }, []);

  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    clearControlsTimeout();
    if (isPlaying && !preventHide) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, hideDelayMs);
    }
  }, [isPlaying, preventHide, hideDelayMs, clearControlsTimeout]);

  useEffect(() => {
    return () => {
      clearControlsTimeout();
    };
  }, [clearControlsTimeout]);

  return {
    showControls,
    setShowControls,
    controlsTimeoutRef,
    resetControlsTimeout,
    clearControlsTimeout,
  };
}
