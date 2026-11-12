"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Hls from "hls.js";
import {
  getPlayerSettings,
  updatePlayerSettings,
  type PlayerSettings,
} from "@/services/userService";
import { type VideoFit } from "@/components/player/PlayerNativeControls";
import {
  type AdBoundary,
  SAFE_AD_SKIP_OFFSET,
  snapTimePastAdBoundaries,
  calculateRewindTargetPastAd,
} from "@/lib/adBoundaryDetector";
import {
  type AdTransitionState,
  startAdTransition,
} from "@/lib/adTransitionController";
import { createInitialKeyboardSeekState } from "@/lib/keyboardSeekManager";
import { type PendingKeyboardSeekRefValue } from "@/components/cinema/hooks/useCinemaOsdAndControls";
import { type QualityLevelItem } from "@/components/cinema/hooks/useCinemaHlsEngine";

interface UseCinemaCoreStateOptions {
  userId?: string;
  contextTheaterMode?: boolean;
  setContextTheaterMode?: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useCinemaCoreState({
  userId,
  contextTheaterMode,
  setContextTheaterMode,
}: UseCinemaCoreStateOptions) {
  const [playerSettings, setPlayerSettings] = useState<PlayerSettings>(() =>
    getPlayerSettings(userId),
  );
  const [localTheaterMode, setLocalTheaterMode] = useState(false);
  const isTheaterMode = contextTheaterMode ?? localTheaterMode;
  const setIsTheaterMode = setContextTheaterMode ?? setLocalTheaterMode;

  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(isMuted);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isBuffering, setIsBuffering] = useState(true);
  const isBufferingRef = useRef(isBuffering);
  useEffect(() => {
    isBufferingRef.current = isBuffering;
  }, [isBuffering]);

  const [useIframeFallback, setUseIframeFallback] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [qualityLevels, setQualityLevels] = useState<QualityLevelItem[]>([]);
  const [currentQualityIndex, setCurrentQualityIndex] = useState<number>(-1);
  const [knownDuration, setKnownDuration] = useState<number>(0);

  const [videoFit, setVideoFit] = useState<VideoFit>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("nana_player_video_fit");
        if (
          saved === "contain" ||
          saved === "cover" ||
          saved === "fill" ||
          saved === "zoom"
        ) {
          return saved;
        }
      } catch {}
    }
    return "contain";
  });

  const handleVideoFitChange = useCallback(
    (mode: VideoFit) => {
      setVideoFit(mode);
      try {
        localStorage.setItem("nana_player_video_fit", mode);
      } catch {}
      updatePlayerSettings(userId, { videoFit: mode });
    },
    [userId],
  );

  // Core DOM / HLS / Playback / Ad-skip refs
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const loadedSourceKeyRef = useRef<string | null>(null);
  const lastProgressSaveRef = useRef<number>(0);
  const lastHandoffSyncRef = useRef<number>(0);
  const hasStartedInitialPlaybackRef = useRef(false);
  const isStalledRef = useRef(false);
  const lastPlayheadTimeRef = useRef<number>(0);
  const stallRecoveryCountRef = useRef<number>(0);
  const lastPlayRequestTimeRef = useRef<number>(0);
  const initialBufferTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stallRecoveryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hlsNetworkRetryCountRef = useRef<number>(0);
  const adBoundariesRef = useRef<AdBoundary[]>([]);
  const hasSkippedAdRef = useRef<Set<string>>(new Set());
  const lastAdSkipTimeRef = useRef<number>(0);
  const automatedAdSkipRef = useRef<AdTransitionState | null>(null);
  const isProgrammaticAdSkipRef = useRef<boolean>(false);
  const [isAdTransitioning, setIsAdTransitioning] = useState<boolean>(false);
  const hasHandledPreRollRef = useRef<boolean>(false);
  const adPreTriggerRef = useRef<{
    timer: NodeJS.Timeout | null;
    rVfcId: number | null;
  }>({ timer: null, rVfcId: null });
  const hasSeekedInitialRef = useRef<boolean>(false);
  const pendingKeyboardSeekRef = useRef<PendingKeyboardSeekRefValue>({
    state: createInitialKeyboardSeekState(),
    timer: null,
    resetTimer: null,
  });

  // Sync saved user player settings and cross-tab updates
  useEffect(() => {
    const current = getPlayerSettings(userId);
    setPlayerSettings(current);
    if (
      current.defaultTheaterMode &&
      typeof window !== "undefined" &&
      window.innerWidth >= 1024
    ) {
      setIsTheaterMode(true);
    }
    if (current.playbackSpeed && current.playbackSpeed !== 1) {
      setPlaybackSpeed(current.playbackSpeed);
      if (videoRef.current) {
        videoRef.current.playbackRate = current.playbackSpeed;
      }
    }
    if (typeof current.volume === "number") {
      setVolume(current.volume);
      if (videoRef.current) {
        videoRef.current.volume = current.volume;
      }
    }
    if (typeof current.isMuted === "boolean") {
      setIsMuted(current.isMuted);
      if (videoRef.current) {
        videoRef.current.muted = current.isMuted;
      }
    }
    if (current.videoFit) {
      setVideoFit(current.videoFit);
    }

    const handleUpdate = (e: Event) => {
      const customEv = e as CustomEvent<{ settings?: PlayerSettings }>;
      const newSettings = customEv.detail?.settings || getPlayerSettings(userId);
      setPlayerSettings(newSettings);
      if (newSettings.playbackSpeed && videoRef.current) {
        videoRef.current.playbackRate = newSettings.playbackSpeed;
        setPlaybackSpeed(newSettings.playbackSpeed);
      }
      if (typeof newSettings.volume === "number") {
        setVolume(newSettings.volume);
        if (videoRef.current) videoRef.current.volume = newSettings.volume;
      }
      if (typeof newSettings.isMuted === "boolean") {
        setIsMuted(newSettings.isMuted);
        if (videoRef.current) videoRef.current.muted = newSettings.isMuted;
      }
      if (newSettings.videoFit) {
        setVideoFit(newSettings.videoFit);
      }
    };

    window.addEventListener("player-settings-updated", handleUpdate);
    return () =>
      window.removeEventListener("player-settings-updated", handleUpdate);
  }, [userId, setIsTheaterMode]);

  const getEffectiveDuration = useCallback(() => {
    const v = videoRef.current;
    if (!v) return 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return knownDuration || (v as any).__hlsDuration || (v.duration && isFinite(v.duration) ? v.duration : 0);
  }, [knownDuration]);

  const cancelAdPreTrigger = useCallback(() => {
    if (adPreTriggerRef.current.timer) {
      clearTimeout(adPreTriggerRef.current.timer);
      adPreTriggerRef.current.timer = null;
    }
    if (
      adPreTriggerRef.current.rVfcId !== null &&
      videoRef.current &&
      "cancelVideoFrameCallback" in videoRef.current
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (videoRef.current as any).cancelVideoFrameCallback(adPreTriggerRef.current.rVfcId);
      adPreTriggerRef.current.rVfcId = null;
    }
  }, []);

  const requestPlayerSeek = useCallback(
    (targetTime: number, isProgrammatic: boolean = false) => {
      const v = videoRef.current;
      if (!v) return;

      cancelAdPreTrigger();
      const effectiveDur = getEffectiveDuration();
      const boundedTime = Math.max(
        0,
        effectiveDur > 0 ? Math.min(effectiveDur, targetTime) : targetTime,
      );
      const currentPlayhead = v.currentTime;

      // 1. Phục hồi quyền skip nếu người dùng tua lùi về trước mốc quảng cáo
      if (adBoundariesRef.current.length > 0) {
        for (const ad of adBoundariesRef.current) {
          if (boundedTime < ad.start) {
            hasSkippedAdRef.current.delete(`${ad.start}_${ad.end}`);
          }
        }

        // Xử lý tua lùi (backward seek): nếu điểm đích rơi vào vùng quảng cáo, tua lùi an toàn vượt qua quảng cáo
        if (boundedTime < currentPlayhead) {
          const rewindSnap = calculateRewindTargetPastAd(
            boundedTime,
            currentPlayhead,
            adBoundariesRef.current,
          );
          if (rewindSnap.jumpedPastAd) {
            if (rewindSnap.adKey) {
              hasSkippedAdRef.current.delete(rewindSnap.adKey);
            }
            isProgrammaticAdSkipRef.current = false;
            v.currentTime = rewindSnap.adjustedTime;
            lastPlayheadTimeRef.current = rewindSnap.adjustedTime;
            return;
          }
        }

        // 2. Kiểm tra nếu điểm đích nằm trong vùng [ad.start, ad.end] (cho tua tiến hoặc scrub tới)
        const snap = snapTimePastAdBoundaries(
          boundedTime,
          adBoundariesRef.current,
          effectiveDur,
          SAFE_AD_SKIP_OFFSET,
        );
        if (snap.snapped && snap.adKey) {
          hasSkippedAdRef.current.add(snap.adKey);
          lastAdSkipTimeRef.current = Date.now();
          isProgrammaticAdSkipRef.current = true;
          const { transitionState, shouldMuteElement } = startAdTransition({
            targetSeek: snap.adjustedTime,
            adDuration: snap.adDuration,
            currentUserMuted: isMutedRef.current ?? v.muted,
          });
          automatedAdSkipRef.current = transitionState;
          if (shouldMuteElement) {
            v.muted = true;
          }
          setIsAdTransitioning(true);
          v.currentTime = snap.adjustedTime;
          lastPlayheadTimeRef.current = snap.adjustedTime;
          return;
        }
      }

      // 3. Nếu là seek bình thường (ngoài quảng cáo)
      isProgrammaticAdSkipRef.current = isProgrammatic;
      v.currentTime = boundedTime;
      lastPlayheadTimeRef.current = boundedTime;
    },
    [cancelAdPreTrigger, getEffectiveDuration],
  );

  return {
    playerSettings,
    isTheaterMode,
    setIsTheaterMode,
    isMuted,
    setIsMuted,
    isMutedRef,
    isPlaying,
    setIsPlaying,
    volume,
    setVolume,
    isBuffering,
    setIsBuffering,
    isBufferingRef,
    useIframeFallback,
    setUseIframeFallback,
    playbackSpeed,
    setPlaybackSpeed,
    qualityLevels,
    setQualityLevels,
    currentQualityIndex,
    setCurrentQualityIndex,
    knownDuration,
    setKnownDuration,
    videoFit,
    handleVideoFitChange,
    containerRef,
    videoRef,
    iframeRef,
    hlsRef,
    loadedSourceKeyRef,
    lastProgressSaveRef,
    lastHandoffSyncRef,
    hasStartedInitialPlaybackRef,
    isStalledRef,
    lastPlayheadTimeRef,
    stallRecoveryCountRef,
    lastPlayRequestTimeRef,
    initialBufferTimeoutRef,
    stallRecoveryTimeoutRef,
    hlsNetworkRetryCountRef,
    adBoundariesRef,
    hasSkippedAdRef,
    lastAdSkipTimeRef,
    automatedAdSkipRef,
    isProgrammaticAdSkipRef,
    isAdTransitioning,
    setIsAdTransitioning,
    hasHandledPreRollRef,
    adPreTriggerRef,
    hasSeekedInitialRef,
    pendingKeyboardSeekRef,
    getEffectiveDuration,
    cancelAdPreTrigger,
    requestPlayerSeek,
  };
}

