"use client";

import React, { useEffect } from "react";
import { Zap } from "lucide-react";
import { saveWatchProgress } from "@/lib/watchHistory";
import { markEpisodeAsWatched } from "@/lib/episodeTracker";
import { type PlayerSettings } from "@/services/userService";
import {
  calculateRewindTargetPastAd,
  calculateSafeAdSkipTarget,
  evaluateAutoAdSkipDecision,
  SAFE_AD_SKIP_OFFSET,
  snapTimePastAdBoundaries,
  type AdBoundary,
} from "@/lib/adBoundaryDetector";
import {
  evaluateBufferProgress,
  evaluateStallRecoveryAttempt,
  evaluateTimeUpdatePlayback,
} from "@/lib/playbackStallController";
import {
  endAdTransition,
  isAdTransitionTimedOut,
  startAdTransition,
  type AdTransitionState,
} from "@/lib/adTransitionController";
import {
  getBufferAhead,
  INITIAL_BUFFER_START_SECONDS,
  type EpisodeItem,
} from "@/components/cinema/cinemaStreamHelpers";
import { type PendingKeyboardSeekRefValue } from "@/components/cinema/hooks/useCinemaOsdAndControls";

interface UseCinemaVideoEventsOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  userId?: string;
  movieSlug?: string;
  contextMovieSlug?: string;
  propMovieSlug?: string;
  activeEpisodeSlug?: string;
  activeEpisodeName?: string;
  effectiveNextEpisode: EpisodeItem | null;
  switchEpisode?: (slug: string) => void;
  title: string;
  posterUrl: string;
  resolvedThumb?: string;
  targetProgress: number;
  isNativeVideo: boolean;
  playerSettings: PlayerSettings;
  isMutedRef: React.RefObject<boolean>;
  isBufferingRef: React.RefObject<boolean>;
  setIsBuffering: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  setIsAdTransitioning: React.Dispatch<React.SetStateAction<boolean>>;
  hasStartedInitialPlaybackRef: React.RefObject<boolean>;
  isStalledRef: React.RefObject<boolean>;
  lastPlayheadTimeRef: React.RefObject<number>;
  stallRecoveryCountRef: React.RefObject<number>;
  lastPlayRequestTimeRef: React.RefObject<number>;
  initialBufferTimeoutRef: React.RefObject<NodeJS.Timeout | null>;
  stallRecoveryTimeoutRef: React.RefObject<NodeJS.Timeout | null>;
  hlsNetworkRetryCountRef: React.RefObject<number>;
  lastProgressSaveRef: React.RefObject<number>;
  lastHandoffSyncRef: React.RefObject<number>;
  adBoundariesRef: React.RefObject<AdBoundary[]>;
  hasSkippedAdRef: React.RefObject<Set<string>>;
  lastAdSkipTimeRef: React.RefObject<number>;
  automatedAdSkipRef: React.RefObject<AdTransitionState | null>;
  isProgrammaticAdSkipRef: React.RefObject<boolean>;
  adPreTriggerRef: React.RefObject<{
    timer: NodeJS.Timeout | null;
    rVfcId: number | null;
  }>;
  pendingKeyboardSeekRef: React.RefObject<PendingKeyboardSeekRefValue>;
  isNextEpDismissedRef: React.RefObject<boolean>;
  nextEpCountdownTimerRef: React.RefObject<NodeJS.Timeout | null>;
  setShowNextEpCountdown: React.Dispatch<React.SetStateAction<boolean>>;
  setNextEpCountdown: React.Dispatch<React.SetStateAction<number>>;
  showHud: (icon?: React.ReactNode, text?: string) => void;
  resetControlsTimeout: () => void;
  forceShowControls: () => void;
  cancelAdPreTrigger: () => void;
  getEffectiveDuration: () => number;
}

export function useCinemaVideoEvents({
  videoRef,
  userId,
  movieSlug,
  contextMovieSlug,
  propMovieSlug,
  activeEpisodeSlug,
  activeEpisodeName,
  effectiveNextEpisode,
  switchEpisode,
  title,
  posterUrl,
  resolvedThumb,
  targetProgress,
  isNativeVideo,
  playerSettings,
  isMutedRef,
  isBufferingRef,
  setIsBuffering,
  setIsPlaying,
  setIsAdTransitioning,
  hasStartedInitialPlaybackRef,
  isStalledRef,
  lastPlayheadTimeRef,
  stallRecoveryCountRef,
  lastPlayRequestTimeRef,
  initialBufferTimeoutRef,
  stallRecoveryTimeoutRef,
  hlsNetworkRetryCountRef,
  lastProgressSaveRef,
  lastHandoffSyncRef,
  adBoundariesRef,
  hasSkippedAdRef,
  lastAdSkipTimeRef,
  automatedAdSkipRef,
  isProgrammaticAdSkipRef,
  adPreTriggerRef,
  pendingKeyboardSeekRef,
  isNextEpDismissedRef,
  nextEpCountdownTimerRef,
  setShowNextEpCountdown,
  setNextEpCountdown,
  showHud,
  resetControlsTimeout,
  forceShowControls,
  cancelAdPreTrigger,
  getEffectiveDuration,
}: UseCinemaVideoEventsOptions) {

  // Video element events: buffering, stall recovery, ad-skip, progress sync, visibility save
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isNativeVideo) return;

    const triggerAdSkip = (
      targetSeek: number,
      adDuration: number,
      adKey: string,
    ) => {
      const v = videoRef.current;
      if (!v || v.ended || v.seeking) return;
      // Tránh re-trigger nếu đang chuyển tiếp tới cùng mốc target
      if (
        automatedAdSkipRef.current?.active &&
        Math.abs(automatedAdSkipRef.current.targetSeek - targetSeek) < 0.25
      ) {
        return;
      }
      hasSkippedAdRef.current.add(adKey);
      lastAdSkipTimeRef.current = Date.now();
      cancelAdPreTrigger();

      const { transitionState, shouldMuteElement } = startAdTransition({
        targetSeek,
        adDuration,
        currentUserMuted: isMutedRef.current ?? v.muted,
      });
      automatedAdSkipRef.current = transitionState;
      isProgrammaticAdSkipRef.current = true;
      if (shouldMuteElement) {
        v.muted = true;
      }
      setIsAdTransitioning(true);
      v.currentTime = targetSeek;
    };

    const checkAndCompleteAdTransition = () => {
      const adSkip = automatedAdSkipRef.current;
      if (!adSkip || !adSkip.active) return;
      const v = videoRef.current;
      if (!v) return;

      const currentCt = v.currentTime;
      const isStillInAd = adBoundariesRef.current.some(
        (b) => currentCt >= b.start && currentCt < (b.nextStart ?? b.end),
      );
      // Playhead phải thực sự đạt tới hoặc vượt qua targetSeek (không trừ 0.15s để triệt tiêu việc un-mute sớm dính audio quảng cáo)
      const isPastTarget = currentCt >= adSkip.targetSeek;
      const isTimedOut = isAdTransitionTimedOut(adSkip);

      // Chỉ khôi phục âm thanh và tắt transition khi xác nhận playhead đã ra ngoài vùng quảng cáo và không còn seeking, hoặc timeout
      if ((!isStillInAd && isPastTarget && !v.seeking) || isTimedOut) {
        const durationText =
          adSkip.adDuration > 0 ? ` (${adSkip.adDuration}s)` : "";
        const { restoredMuted } = endAdTransition(adSkip);
        automatedAdSkipRef.current = null;
        isProgrammaticAdSkipRef.current = false;
        setIsAdTransitioning(false);
        if (restoredMuted !== null && videoRef.current) {
          videoRef.current.muted = restoredMuted;
        }
        showHud(
          React.createElement(Zap, { className: "w-5 h-5 text-netflix-red" }),
          `Đã tự động bỏ qua quảng cáo${durationText}`,
        );
      }
    };

    const scheduleStallRecovery = () => {
      if (stallRecoveryTimeoutRef.current) {
        clearTimeout(stallRecoveryTimeoutRef.current);
      }
      stallRecoveryTimeoutRef.current = setTimeout(() => {
        const v = videoRef.current;
        if (!v || v.paused || v.ended) {
          isStalledRef.current = false;
          return;
        }

        if (isStalledRef.current) {
          const bufAhead = getBufferAhead(v);
          const recovery = evaluateStallRecoveryAttempt(
            stallRecoveryCountRef.current,
            bufAhead,
          );
          stallRecoveryCountRef.current += 1;
          isBufferingRef.current = recovery.shouldKeepBuffering;
          setIsBuffering(recovery.shouldKeepBuffering);

          if (recovery.canRetry) {
            if (recovery.shouldNudge) {
              const dur = getEffectiveDuration();
              v.currentTime = Math.min(
                v.currentTime + recovery.nudgeDelta,
                dur > 0 ? dur : v.currentTime + 1,
              );
            }
            if (recovery.shouldRequestPlay) {
              v.play().catch(() => {});
            }
            scheduleStallRecovery();
          } else {
            isStalledRef.current = false;
          }
        }
      }, 3500);
    };

    const checkBufferRecovery = () => {
      const v = videoRef.current;
      if (!v) return;

      const bufAhead = getBufferAhead(v);
      const dur = getEffectiveDuration();
      const isNearEnd = dur > 0 && v.currentTime + bufAhead >= dur - 2;

      if (!hasStartedInitialPlaybackRef.current) {
        if (
          bufAhead >= INITIAL_BUFFER_START_SECONDS ||
          (v.readyState >= 3 && bufAhead >= 0.2) ||
          isNearEnd
        ) {
          hasStartedInitialPlaybackRef.current = true;
          if (initialBufferTimeoutRef.current) {
            clearTimeout(initialBufferTimeoutRef.current);
            initialBufferTimeoutRef.current = null;
          }
          isBufferingRef.current = false;
          setIsBuffering(false);
          v.play().catch(() => {});
        }
        return;
      }

      // Fast Resume riêng cho thao tác tự động bỏ qua quảng cáo (TC-AD-SKIP-06)
      const adSkip = automatedAdSkipRef.current;
      if (adSkip && adSkip.active) {
        // Hết hạn ưu tiên sau 4s nếu mạng chậm để không cản trở fallback mặc định
        if (isAdTransitionTimedOut(adSkip)) {
          checkAndCompleteAdTransition();
        } else {
          // Chỉ cần có dữ liệu giải mã an toàn (readyState >= 3: HAVE_FUTURE_DATA hoặc bufAhead >= 1.5s)
          const hasDecodableData =
            v.readyState >= 3 || bufAhead >= 1.5 || isNearEnd;
          if (hasDecodableData) {
            isStalledRef.current = false;
            if (stallRecoveryTimeoutRef.current) {
              clearTimeout(stallRecoveryTimeoutRef.current);
              stallRecoveryTimeoutRef.current = null;
            }
            isBufferingRef.current = false;
            setIsBuffering(false);
            v.play().catch(() => {});
            return;
          }
          return;
        }
      }

      if (isStalledRef.current) {
        // TC-PLAYBACK-STABILITY-03 Patch 1: evaluateBufferProgress đảm bảo KHÔNG tự tắt isBuffering (spinner)
        // chỉ vì có buffer chunk tải về khi playhead vẫn đứng yên.
        const decision = evaluateBufferProgress({
          currentTime: v.currentTime,
          lastPlayheadTime: lastPlayheadTimeRef.current,
          isStalled: isStalledRef.current,
          isBuffering: isBufferingRef.current,
          bufAhead,
          readyState: v.readyState,
          isNearEnd,
          isPaused: v.paused,
          isEnded: v.ended,
          hasStartedInitialPlayback: hasStartedInitialPlaybackRef.current,
        });

        if (decision.shouldRequestPlay) {
          const now = Date.now();
          if (now - lastPlayRequestTimeRef.current > 1000) {
            lastPlayRequestTimeRef.current = now;
            v.play().catch(() => {});
          }
        }
      }
    };

    const persistWatchProgress = (
      currentTimeSeconds: number,
      durationSeconds: number,
      forceSync: boolean,
    ) => {
      if (movieSlug && activeEpisodeSlug) {
        saveWatchProgress(
          movieSlug,
          currentTimeSeconds,
          durationSeconds,
          activeEpisodeSlug,
          {
            title,
            poster: posterUrl,
            thumb: resolvedThumb,
            episodeName: activeEpisodeName,
          },
          forceSync,
        );
      }
    };

    void lastHandoffSyncRef;

    const handleWaiting = () => {
      const v = videoRef.current;
      if (!v || v.paused || v.ended) return;
      isBufferingRef.current = true;
      setIsBuffering(true);
      isStalledRef.current = true;
      scheduleStallRecovery();
    };

    const handleStalled = () => {
      const v = videoRef.current;
      if (!v || v.paused || v.ended) return;
      isBufferingRef.current = true;
      setIsBuffering(true);
      isStalledRef.current = true;
      scheduleStallRecovery();
    };

    const handlePlaying = () => {
      isBufferingRef.current = false;
      setIsBuffering(false);
      isStalledRef.current = false;
      stallRecoveryCountRef.current = 0;
      hlsNetworkRetryCountRef.current = 0;
      if (stallRecoveryTimeoutRef.current) {
        clearTimeout(stallRecoveryTimeoutRef.current);
        stallRecoveryTimeoutRef.current = null;
      }
      if (videoRef.current) {
        lastPlayheadTimeRef.current = videoRef.current.currentTime;
      }
      hasStartedInitialPlaybackRef.current = true;
      setIsPlaying(true);
      resetControlsTimeout();

      // Dọn dẹp cờ ad skip, khôi phục âm thanh và hiển thị Toast khi video ĐÃ THỰC SỰ PHÁT TIẾP và ra khỏi quảng cáo
      checkAndCompleteAdTransition();
    };

    const handlePause = () => {
      cancelAdPreTrigger();
      isProgrammaticAdSkipRef.current = false;
      if (automatedAdSkipRef.current) {
        const { restoredMuted } = endAdTransition(automatedAdSkipRef.current);
        automatedAdSkipRef.current = null;
        setIsAdTransitioning(false);
        if (restoredMuted !== null && videoRef.current) {
          videoRef.current.muted = restoredMuted;
        }
      } else {
        automatedAdSkipRef.current = null;
      }
      setIsPlaying(false);
      isStalledRef.current = false;
      isBufferingRef.current = false;
      setIsBuffering(false);
      stallRecoveryCountRef.current = 0;
      if (stallRecoveryTimeoutRef.current) {
        clearTimeout(stallRecoveryTimeoutRef.current);
        stallRecoveryTimeoutRef.current = null;
      }
      forceShowControls();

      const currentEffectiveDuration = getEffectiveDuration();
      if (video.currentTime > 5) {
        persistWatchProgress(video.currentTime, currentEffectiveDuration, true);
      }
    };

    const handleTimeUpdateThrottled = () => {
      checkAndCompleteAdTransition();
      const v = videoRef.current;
      if (v) {
        const ct = v.currentTime;
        const update = evaluateTimeUpdatePlayback({
          currentTime: ct,
          lastPlayheadTime: lastPlayheadTimeRef.current,
          isStalled: isStalledRef.current,
          isBuffering: isBufferingRef.current,
          bufAhead: getBufferAhead(v),
          readyState: v.readyState,
          isNearEnd: false,
          isPaused: v.paused,
          isEnded: v.ended,
          hasStartedInitialPlayback: hasStartedInitialPlaybackRef.current,
        });

        if (update.hasAdvanced) {
          lastPlayheadTimeRef.current = update.newPlayheadTime;
          if (isStalledRef.current || isBufferingRef.current) {
            isStalledRef.current = false;
            isBufferingRef.current = false;
            setIsBuffering(false);
            stallRecoveryCountRef.current = 0;
            if (stallRecoveryTimeoutRef.current) {
              clearTimeout(stallRecoveryTimeoutRef.current);
              stallRecoveryTimeoutRef.current = null;
            }
          }
        }
      }

      checkBufferRecovery();

      // Tự động bỏ qua đoạn quảng cáo đã xác minh ranh giới (Verified Ad-Boundary Skip Controller — Zero-Flash)
      if (isNativeVideo) {
        const effectiveDur = getEffectiveDuration();
        const ct = video.currentTime;

        if (!video.seeking) {
          lastPlayheadTimeRef.current = ct;
        }

        // 1. Đánh giá skip với leadTime = 0.35s và safeOffset (kích hoạt an toàn trước ranh giới)
        const adDecision = evaluateAutoAdSkipDecision({
          currentTime: video.currentTime,
          boundaries: adBoundariesRef.current,
          hasSkippedSet: hasSkippedAdRef.current,
          lastSkipTime: lastAdSkipTimeRef.current,
          now: Date.now(),
          isPaused: video.paused,
          isEnded: video.ended,
          isSeeking: video.seeking,
          leadTime: 0.35,
          safeOffset: SAFE_AD_SKIP_OFFSET,
          maxDuration: effectiveDur,
        });

        if (adDecision && adDecision.shouldSeek) {
          if (pendingKeyboardSeekRef.current.timer) {
            clearTimeout(pendingKeyboardSeekRef.current.timer);
            pendingKeyboardSeekRef.current.timer = null;
            pendingKeyboardSeekRef.current.state.isDebouncePending = false;
          }
          triggerAdSkip(
            adDecision.targetSeek,
            adDecision.adDuration,
            adDecision.adKey,
          );
        } else if (!automatedAdSkipRef.current?.active && !video.seeking) {
          // Fallback an toàn: Nếu playhead đang nằm bên trong một ad boundary mà chưa thoát ra ngoài
          const inAd = adBoundariesRef.current.find(
            (b) => ct >= b.start && ct < (b.nextStart ?? b.end) - 0.25,
          );
          if (inAd) {
            const adKey = `${inAd.start}_${inAd.end}`;
            const targetSeek = calculateSafeAdSkipTarget(
              inAd.end,
              adBoundariesRef.current,
              effectiveDur,
              SAFE_AD_SKIP_OFFSET,
            );
            triggerAdSkip(targetSeek, Math.round(inAd.duration), adKey);
          } else if (
            !video.paused &&
            !video.ended &&
            adBoundariesRef.current.length > 0
          ) {
            // 2. Pre-emptive monitoring: Nếu playhead đang tiến sát ranh giới quảng cáo kế tiếp (trong 1.5s)
            const curPlayhead = video.currentTime;
            const nextUpcomingAd = adBoundariesRef.current.find(
              (b) =>
                b.start > curPlayhead &&
                b.start - curPlayhead <= 1.5 &&
                !hasSkippedAdRef.current.has(`${b.start}_${b.end}`),
            );

            if (
              nextUpcomingAd &&
              adPreTriggerRef.current.timer === null &&
              adPreTriggerRef.current.rVfcId === null
            ) {
              const leadThreshold = 0.3; // 300ms trước ranh giới quảng cáo
              const targetSeek = calculateSafeAdSkipTarget(
                nextUpcomingAd.end,
                adBoundariesRef.current,
                effectiveDur,
                SAFE_AD_SKIP_OFFSET,
              );
              const adDuration = Math.round(nextUpcomingAd.duration);
              const adKey = `${nextUpcomingAd.start}_${nextUpcomingAd.end}`;

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              if (typeof (video as any).requestVideoFrameCallback === "function") {
                const onFrame = () => {
                  const curV = videoRef.current;
                  if (!curV || curV.paused || curV.seeking || curV.ended) {
                    adPreTriggerRef.current.rVfcId = null;
                    return;
                  }
                  const curCt = curV.currentTime;
                  const nextAdEnd =
                    nextUpcomingAd.nextStart ?? nextUpcomingAd.end;
                  if (
                    curCt >= nextUpcomingAd.start - leadThreshold &&
                    curCt < nextAdEnd - 0.25
                  ) {
                    adPreTriggerRef.current.rVfcId = null;
                    triggerAdSkip(targetSeek, adDuration, adKey);
                    return;
                  }
                  if (
                    curCt < nextUpcomingAd.start - 1.5 ||
                    curCt >= nextAdEnd
                  ) {
                    adPreTriggerRef.current.rVfcId = null;
                    return;
                  }
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  adPreTriggerRef.current.rVfcId = (curV as any).requestVideoFrameCallback(onFrame);
                };
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                adPreTriggerRef.current.rVfcId = (video as any).requestVideoFrameCallback(onFrame);
              } else {
                // Fallback one-shot timer cho trình duyệt không hỗ trợ rVFC
                const rate =
                  video.playbackRate && video.playbackRate > 0
                    ? video.playbackRate
                    : 1;
                const delayMs = Math.max(
                  10,
                  Math.round(
                    ((nextUpcomingAd.start - leadThreshold - curPlayhead) /
                      rate) *
                      1000,
                  ),
                );
                adPreTriggerRef.current.timer = setTimeout(() => {
                  adPreTriggerRef.current.timer = null;
                  const curV = videoRef.current;
                  if (curV && !curV.paused && !curV.seeking && !curV.ended) {
                    const nextAdEnd =
                      nextUpcomingAd.nextStart ?? nextUpcomingAd.end;
                    if (
                      curV.currentTime >= nextUpcomingAd.start - 0.35 &&
                      curV.currentTime < nextAdEnd - 0.25
                    ) {
                      triggerAdSkip(targetSeek, adDuration, adKey);
                    }
                  }
                }, delayMs);
              }
            }
          }
        }
      }

      // Check countdown condition on timeupdate
      if (
        effectiveNextEpisode?.slug &&
        !isNextEpDismissedRef.current &&
        playerSettings.autoNextEpisode !== false
      ) {
        const currentEffectiveDuration = getEffectiveDuration();
        const currentTime = video.currentTime;
        if (currentEffectiveDuration > 30) {
          const remaining = currentEffectiveDuration - currentTime;
          if (
            remaining <= 12 &&
            remaining > 0.5 &&
            !video.paused &&
            !video.ended
          ) {
            setShowNextEpCountdown((prev) => (!prev ? true : prev));
          } else if (remaining > 18) {
            setShowNextEpCountdown((prev) => {
              if (prev) {
                setNextEpCountdown(10);
                return false;
              }
              return prev;
            });
          }
          if (remaining > 25) {
            isNextEpDismissedRef.current = false;
          }
        }
      }

      const now = Date.now();
      if (now - lastProgressSaveRef.current > 3000) {
        lastProgressSaveRef.current = now;
        const currentEffectiveDuration = getEffectiveDuration();
        if (video.currentTime > 0) {
          persistWatchProgress(
            video.currentTime,
            currentEffectiveDuration,
            false,
          );
        }
      }
      // Tự động đánh dấu đã xem khi xem đạt >= 90% thời lượng hợp lệ
      if (movieSlug && activeEpisodeSlug) {
        const currentEffectiveDuration = getEffectiveDuration();
        if (
          Number.isFinite(currentEffectiveDuration) &&
          currentEffectiveDuration > 0 &&
          video.currentTime / currentEffectiveDuration >= 0.9
        ) {
          markEpisodeAsWatched(movieSlug, activeEpisodeSlug);
        }
      }
    };

    const handleEnded = () => {
      cancelAdPreTrigger();
      setIsPlaying(false);
      isStalledRef.current = false;
      forceShowControls();
      if (nextEpCountdownTimerRef.current) {
        clearInterval(nextEpCountdownTimerRef.current);
        nextEpCountdownTimerRef.current = null;
      }
      setShowNextEpCountdown(false);
      const currentEffectiveDuration = getEffectiveDuration();
      if (movieSlug && activeEpisodeSlug) {
        markEpisodeAsWatched(movieSlug, activeEpisodeSlug);
        persistWatchProgress(
          currentEffectiveDuration > 0
            ? currentEffectiveDuration
            : video.currentTime,
          currentEffectiveDuration,
          true,
        );
      }
      if (
        playerSettings.autoNextEpisode !== false &&
        effectiveNextEpisode?.slug &&
        switchEpisode &&
        !isNextEpDismissedRef.current
      ) {
        switchEpisode(effectiveNextEpisode.slug);
      }
    };

    const handleCanPlay = () => {
      if (!isStalledRef.current && hasStartedInitialPlaybackRef.current) {
        setIsBuffering(false);
      } else {
        checkBufferRecovery();
      }
    };

    const handleProgress = () => checkBufferRecovery();

    const handleSeeking = () => {
      cancelAdPreTrigger();
      setIsBuffering(true);
      isStalledRef.current = true;

      // 1. Nếu là lệnh seek do hệ thống chủ động bỏ qua quảng cáo (programmatic auto-skip), bảo vệ transition
      if (isProgrammaticAdSkipRef.current) {
        return;
      }

      // 2. Bảo vệ quá trình chuyển tiếp quảng cáo: không can thiệp hay phát lệnh seek trùng lặp khi đang transition
      const adSkip = automatedAdSkipRef.current;
      if (adSkip && adSkip.active) {
        return;
      }

      // 3. Fallback bảo vệ cho seek phát sinh ngoài requestPlayerSeek (native browser controls / Picture-in-Picture):
      const v = videoRef.current;
      if (v && adBoundariesRef.current.length > 0) {
        const ct = v.currentTime;
        const prevCt = lastPlayheadTimeRef.current;
        const dur = getEffectiveDuration();

        // Nếu là tua lùi rơi vào vùng quảng cáo -> tua lùi an toàn qua quảng cáo
        if (ct < prevCt) {
          const rewindSnap = calculateRewindTargetPastAd(
            ct,
            prevCt,
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

        const snap = snapTimePastAdBoundaries(
          ct,
          adBoundariesRef.current,
          dur,
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
    };

    const handleSeeked = () => {
      if (videoRef.current) {
        lastPlayheadTimeRef.current = videoRef.current.currentTime;
      }
      isProgrammaticAdSkipRef.current = false;
      checkBufferRecovery();
      // Nếu đang trong quá trình chuyển tiếp ad skip, không un-mute tại handleSeeked
      // để tránh rò rỉ buffer âm thanh cũ của quảng cáo; chỉ un-mute khi video thực sự play lại (handlePlaying)
      if (!automatedAdSkipRef.current?.active) {
        checkAndCompleteAdTransition();
      }
    };

    const handleLoadStart = () => {
      isBufferingRef.current = true;
      setIsBuffering(true);
    };
    const handleLoadedData = () => checkBufferRecovery();

    video.addEventListener("waiting", handleWaiting, { passive: true });
    video.addEventListener("stalled", handleStalled, { passive: true });
    video.addEventListener("playing", handlePlaying, { passive: true });
    video.addEventListener("pause", handlePause, { passive: true });
    video.addEventListener("timeupdate", handleTimeUpdateThrottled, {
      passive: true,
    });
    video.addEventListener("ended", handleEnded, { passive: true });
    video.addEventListener("canplay", handleCanPlay, { passive: true });
    video.addEventListener("progress", handleProgress, { passive: true });
    video.addEventListener("seeking", handleSeeking, { passive: true });
    video.addEventListener("seeked", handleSeeked, { passive: true });
    video.addEventListener("loadstart", handleLoadStart, { passive: true });
    video.addEventListener("loadeddata", handleLoadedData, { passive: true });

    const saveCurrentPlaybackState = () => {
      if (video.currentTime > 3 && movieSlug && activeEpisodeSlug) {
        persistWatchProgress(video.currentTime, getEffectiveDuration(), true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveCurrentPlaybackState();
      }
    };

    const handlePageHide = () => {
      saveCurrentPlaybackState();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", saveCurrentPlaybackState);

    return () => {
      cancelAdPreTrigger();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", saveCurrentPlaybackState);
      saveCurrentPlaybackState();
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("stalled", handleStalled);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("timeupdate", handleTimeUpdateThrottled);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("progress", handleProgress);
      video.removeEventListener("seeking", handleSeeking);
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("loadstart", handleLoadStart);
      video.removeEventListener("loadeddata", handleLoadedData);
      if (stallRecoveryTimeoutRef.current) {
        clearTimeout(stallRecoveryTimeoutRef.current);
        stallRecoveryTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isNativeVideo,
    effectiveNextEpisode,
    switchEpisode,
    contextMovieSlug,
    propMovieSlug,
    activeEpisodeSlug,
    userId,
    title,
    activeEpisodeName,
    posterUrl,
    targetProgress,
    getEffectiveDuration,
    playerSettings.autoNextEpisode,
    resetControlsTimeout,
    cancelAdPreTrigger,
  ]);
}
