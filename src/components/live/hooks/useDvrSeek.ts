"use client";

import { useRef, useCallback, useEffect, type RefObject } from "react";
import type Hls from "hls.js";
import { calculateLiveLatency } from "@/services/live/shared/liveBufferHelper";

export interface UseDvrSeekOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  hlsRef: RefObject<Hls | null>;
  isAtLiveEdge: boolean;
  setIsAtLiveEdge: (val: boolean) => void;
  setLiveLatency?: (val: number) => void;
  goToLiveEdge: () => void | Promise<void>;
  triggerActionFeedback: (
    icon: "play" | "pause" | "volume" | "mute" | "server" | "match" | "seek",
    text?: string,
  ) => void;
  requireDvrWindow?: boolean;
  minBufferOffsetSec?: number;
  maxEdgeOffsetSec?: number;
  snapToLiveThresholdSec?: number;
  liveEdgeThresholdSec?: number;
  fallbackWindowSec?: number;
  immediateWhenNotRapid?: boolean;
  rapidThresholdMs?: number;
  deltaResetMs?: number;
  targetClearMs?: number;
  requireSameDirectionForDelta?: boolean;
  updateLiveStateOnCommit?: boolean;
  onSeekCommitted?: (video: HTMLVideoElement, hls: Hls | null) => void;
}

/**
 * Shared DVR seek hook handling rapid +/- seek delta accumulation,
 * seekable window clamping, live-edge snapping, and debounced/immediate seek commits.
 */
export function useDvrSeek({
  videoRef,
  hlsRef,
  isAtLiveEdge,
  setIsAtLiveEdge,
  setLiveLatency,
  goToLiveEdge,
  triggerActionFeedback,
  requireDvrWindow = false,
  minBufferOffsetSec = 0,
  maxEdgeOffsetSec = 0,
  snapToLiveThresholdSec,
  liveEdgeThresholdSec = 4,
  fallbackWindowSec = 40,
  immediateWhenNotRapid = false,
  rapidThresholdMs = 120,
  deltaResetMs = 1100,
  targetClearMs = 500,
  requireSameDirectionForDelta = true,
  updateLiveStateOnCommit = true,
  onSeekCommitted,
}: UseDvrSeekOptions) {
  const lastTargetTimeRef = useRef<number | null>(null);
  const seekThrottleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSeekTimestampRef = useRef<number>(0);
  const lastDeltaTimestampRef = useRef<number>(0);
  const accumulatedSeekDeltaRef = useRef<number>(0);
  const seekDeltaResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const targetClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetSeekRefs = useCallback(() => {
    lastTargetTimeRef.current = null;
    accumulatedSeekDeltaRef.current = 0;
    if (seekThrottleTimerRef.current) {
      clearTimeout(seekThrottleTimerRef.current);
      seekThrottleTimerRef.current = null;
    }
    if (seekDeltaResetTimerRef.current) {
      clearTimeout(seekDeltaResetTimerRef.current);
      seekDeltaResetTimerRef.current = null;
    }
    if (targetClearTimerRef.current) {
      clearTimeout(targetClearTimerRef.current);
      targetClearTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      resetSeekRefs();
    };
  }, [resetSeekRefs]);

  const handleSeek = useCallback(
    (seconds: number) => {
      const v = videoRef.current;
      if (!v) return;

      const hls = hlsRef.current;
      const hasSeekableRange = Boolean(v.seekable && v.seekable.length > 0);

      if (requireDvrWindow) {
        const seekableStart = hasSeekableRange ? v.seekable.start(0) : 0;
        const seekableEnd = hasSeekableRange
          ? v.seekable.end(v.seekable.length - 1)
          : Number.isFinite(v.duration)
            ? v.duration
            : v.currentTime;
        const seekableWindow = seekableEnd - seekableStart;

        if (!hasSeekableRange || seekableWindow < 8) {
          accumulatedSeekDeltaRef.current = 0;
          if (seekDeltaResetTimerRef.current) {
            clearTimeout(seekDeltaResetTimerRef.current);
            seekDeltaResetTimerRef.current = null;
          }
          if (seconds < 0) {
            triggerActionFeedback("seek", "Luồng trực tiếp (Không có DVR)");
          } else if (isAtLiveEdge) {
            triggerActionFeedback("seek", "Đang ở thời gian thực");
          } else {
            void goToLiveEdge();
          }
          return;
        }
      }

      // Accumulate continuous seek taps within deltaResetMs
      const nowWall = Date.now();
      const sameDirection =
        !requireSameDirectionForDelta ||
        (accumulatedSeekDeltaRef.current !== 0 &&
          Math.sign(accumulatedSeekDeltaRef.current) === Math.sign(seconds));
      const nextDelta = requireSameDirectionForDelta
        ? nowWall - lastDeltaTimestampRef.current < deltaResetMs && sameDirection
          ? accumulatedSeekDeltaRef.current + seconds
          : seconds
        : accumulatedSeekDeltaRef.current + seconds;

      accumulatedSeekDeltaRef.current = nextDelta;
      lastDeltaTimestampRef.current = nowWall;
      triggerActionFeedback("seek", `${nextDelta > 0 ? `+${nextDelta}` : nextDelta}s`);

      if (seekDeltaResetTimerRef.current) {
        clearTimeout(seekDeltaResetTimerRef.current);
      }
      seekDeltaResetTimerRef.current = setTimeout(() => {
        accumulatedSeekDeltaRef.current = 0;
      }, deltaResetMs);

      let minSeek = 0;
      let maxSeek = v.currentTime || 0;
      const livePos = hls?.liveSyncPosition;

      if (hasSeekableRange) {
        minSeek = v.seekable.start(0) + minBufferOffsetSec;
        const seekableEnd = v.seekable.end(v.seekable.length - 1);
        maxSeek =
          livePos && Number.isFinite(livePos) && livePos > 0
            ? Math.max(minSeek, Math.min(seekableEnd, livePos) - maxEdgeOffsetSec)
            : Math.max(minSeek, seekableEnd - maxEdgeOffsetSec);
      } else if (livePos && Number.isFinite(livePos) && livePos > 0) {
        minSeek = Math.max(0, livePos - fallbackWindowSec);
        maxSeek = Math.max(minSeek, livePos - maxEdgeOffsetSec);
      } else {
        minSeek = Math.max(0, maxSeek - fallbackWindowSec);
      }

      const liveEdgeRef =
        livePos && Number.isFinite(livePos) && livePos > 0
          ? hasSeekableRange
            ? Math.min(v.seekable.end(v.seekable.length - 1), livePos)
            : livePos
          : maxSeek;

      const baseTime =
        lastTargetTimeRef.current !== null
          ? lastTargetTimeRef.current
          : v.currentTime || 0;
      let target = Math.max(minSeek, Math.min(maxSeek, baseTime + seconds));
      const snappedToLive =
        snapToLiveThresholdSec !== undefined &&
        maxSeek - target <= snapToLiveThresholdSec &&
        seconds > 0;

      if (snappedToLive) {
        target = liveEdgeRef;
      }

      lastTargetTimeRef.current = target;

      if (targetClearTimerRef.current) {
        clearTimeout(targetClearTimerRef.current);
      }
      targetClearTimerRef.current = setTimeout(() => {
        lastTargetTimeRef.current = null;
      }, targetClearMs);

      const commitSeek = () => {
        const currentVideo = videoRef.current;
        if (!currentVideo) return;
        const commitTarget = lastTargetTimeRef.current ?? target;
        try {
          currentVideo.currentTime = commitTarget;
        } catch {}
        const currentHls = hlsRef.current;
        if (updateLiveStateOnCommit) {
          if (snappedToLive) {
            setIsAtLiveEdge(true);
          } else {
            setIsAtLiveEdge(
              Math.abs(liveEdgeRef - commitTarget) <= liveEdgeThresholdSec,
            );
          }
          if (setLiveLatency) {
            setLiveLatency(calculateLiveLatency(currentVideo, currentHls).latencySec);
          }
          currentHls?.startLoad();
        }
        onSeekCommitted?.(currentVideo, currentHls);
        if (seekThrottleTimerRef.current) {
          clearTimeout(seekThrottleTimerRef.current);
          seekThrottleTimerRef.current = null;
        }
      };

      const nowPerf =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const isRapid = nowPerf - lastSeekTimestampRef.current < rapidThresholdMs;
      lastSeekTimestampRef.current = nowPerf;

      if (immediateWhenNotRapid && !isRapid) {
        commitSeek();
      } else {
        if (seekThrottleTimerRef.current) {
          clearTimeout(seekThrottleTimerRef.current);
        }
        seekThrottleTimerRef.current = setTimeout(commitSeek, 80);
      }
    },
    [
      videoRef,
      hlsRef,
      requireDvrWindow,
      isAtLiveEdge,
      goToLiveEdge,
      triggerActionFeedback,
      requireSameDirectionForDelta,
      deltaResetMs,
      minBufferOffsetSec,
      maxEdgeOffsetSec,
      fallbackWindowSec,
      snapToLiveThresholdSec,
      targetClearMs,
      rapidThresholdMs,
      immediateWhenNotRapid,
      updateLiveStateOnCommit,
      setIsAtLiveEdge,
      liveEdgeThresholdSec,
      setLiveLatency,
      onSeekCommitted,
    ],
  );

  return {
    handleSeek,
    lastTargetTimeRef,
    resetSeekRefs,
  };
}
