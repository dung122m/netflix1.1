"use client";

import React, { useEffect, useRef } from "react";
import Hls from "hls.js";
import { RotateCcw } from "lucide-react";
import { saveWatchProgress } from "@/lib/watchHistory";
import { decodeStreamUrl } from "@/lib/streamCrypto";
import {
  detectAdBoundaries,
  evaluatePreRollAdDecision,
  parseM3u8PlaylistFragments,
  SAFE_AD_SKIP_OFFSET,
  type AdBoundary,
  type FragmentLike,
} from "@/lib/adBoundaryDetector";
import { evaluateHlsError } from "@/lib/playbackStallController";
import {
  endAdTransition,
  startAdTransition,
  type AdTransitionState,
} from "@/lib/adTransitionController";
import {
  getBufferAhead,
  INITIAL_BUFFER_START_SECONDS,
  m3u8ManifestCache,
} from "@/components/cinema/cinemaStreamHelpers";

export interface QualityLevelItem {
  id: number;
  label: string;
  height: number;
}

interface UseCinemaHlsEngineOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  hlsRef: React.RefObject<Hls | null>;
  loadedSourceKeyRef: React.RefObject<string | null>;
  resolvedM3u8: string;
  embedSrc?: string;
  useIframeFallback: boolean;
  setUseIframeFallback: React.Dispatch<React.SetStateAction<boolean>>;
  activeEpisodeSlug?: string;
  contextMovieSlug?: string;
  currentServerIndex?: number;
  propMovieSlug?: string;
  targetProgress: number;
  initialTime?: number;
  urlParamT: string | null;
  initialTimeUsed: boolean;
  setInitialTimeUsed: React.Dispatch<React.SetStateAction<boolean>>;
  initialEpisodeSlug?: string;
  initialLoadedEpisode?: string;
  title: string;
  posterUrl: string;
  resolvedThumb?: string;
  activeEpisodeName?: string;
  showHud: (icon?: React.ReactNode, text?: string) => void;
  setIsBuffering: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  setIsMuted: React.Dispatch<React.SetStateAction<boolean>>;
  isMutedRef: React.RefObject<boolean>;
  setQualityLevels: React.Dispatch<React.SetStateAction<QualityLevelItem[]>>;
  setKnownDuration: React.Dispatch<React.SetStateAction<number>>;
  setIsAdTransitioning: React.Dispatch<React.SetStateAction<boolean>>;
  hasSeekedInitialRef: React.RefObject<boolean>;
  hasStartedInitialPlaybackRef: React.RefObject<boolean>;
  isStalledRef: React.RefObject<boolean>;
  initialBufferTimeoutRef: React.RefObject<NodeJS.Timeout | null>;
  stallRecoveryTimeoutRef: React.RefObject<NodeJS.Timeout | null>;
  hlsNetworkRetryCountRef: React.RefObject<number>;
  adBoundariesRef: React.RefObject<AdBoundary[]>;
  hasSkippedAdRef: React.RefObject<Set<string>>;
  lastAdSkipTimeRef: React.RefObject<number>;
  automatedAdSkipRef: React.RefObject<AdTransitionState | null>;
  isProgrammaticAdSkipRef: React.RefObject<boolean>;
  hasHandledPreRollRef: React.RefObject<boolean>;
  adPreTriggerRef: React.RefObject<{
    timer: NodeJS.Timeout | null;
    rVfcId: number | null;
  }>;
  requestPlayerSeek: (targetTime: number, isProgrammatic?: boolean) => void;
  getEffectiveDuration: () => number;
}

function playWithMutedFallback(
  video: HTMLVideoElement,
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>,
  setIsMuted: React.Dispatch<React.SetStateAction<boolean>>,
) {
  const playPromise = video.play();
  if (playPromise !== undefined) {
    playPromise
      .then(() => {
        setIsPlaying(true);
      })
      .catch(() => {
        video.muted = true;
        setIsMuted(true);
        video
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      });
  }
}

export function useCinemaHlsEngine({
  videoRef,
  hlsRef,
  loadedSourceKeyRef,
  resolvedM3u8,
  embedSrc,
  useIframeFallback,
  setUseIframeFallback,
  activeEpisodeSlug,
  contextMovieSlug,
  currentServerIndex,
  propMovieSlug,
  targetProgress,
  initialTime,
  urlParamT,
  initialTimeUsed,
  setInitialTimeUsed,
  initialEpisodeSlug,
  initialLoadedEpisode,
  title,
  posterUrl,
  resolvedThumb,
  activeEpisodeName,
  showHud,
  setIsBuffering,
  setIsPlaying,
  setIsMuted,
  isMutedRef,
  setQualityLevels,
  setKnownDuration,
  setIsAdTransitioning,
  hasSeekedInitialRef,
  hasStartedInitialPlaybackRef,
  isStalledRef,
  initialBufferTimeoutRef,
  stallRecoveryTimeoutRef,
  hlsNetworkRetryCountRef,
  adBoundariesRef,
  hasSkippedAdRef,
  lastAdSkipTimeRef,
  automatedAdSkipRef,
  isProgrammaticAdSkipRef,
  hasHandledPreRollRef,
  adPreTriggerRef,
  requestPlayerSeek,
  getEffectiveDuration,
}: UseCinemaHlsEngineOptions) {
  const latestRequestSeekRef = useRef(requestPlayerSeek);
  const latestEffectiveDurationRef = useRef(getEffectiveDuration);
  const latestEmbedSrcRef = useRef(embedSrc);
  const latestResolvedThumbRef = useRef(resolvedThumb);

  useEffect(() => {
    latestRequestSeekRef.current = requestPlayerSeek;
    latestEffectiveDurationRef.current = getEffectiveDuration;
    latestEmbedSrcRef.current = embedSrc;
    latestResolvedThumbRef.current = resolvedThumb;
  });

  // Reset per-episode / per-source playback flags before HLS attachment
  useEffect(() => {
    const videoEl = videoRef.current;
    const adPreTrigger = adPreTriggerRef.current;
    hasSeekedInitialRef.current = false;
    hasHandledPreRollRef.current = false;
    if (adPreTrigger.timer) {
      clearTimeout(adPreTrigger.timer);
      adPreTrigger.timer = null;
    }
    if (
      adPreTrigger.rVfcId !== null &&
      videoEl &&
      "cancelVideoFrameCallback" in videoEl
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (videoEl as any).cancelVideoFrameCallback(adPreTrigger.rVfcId);
      adPreTrigger.rVfcId = null;
    }
    adBoundariesRef.current = [];
    hasSkippedAdRef.current.clear();
    lastAdSkipTimeRef.current = 0;
    if (automatedAdSkipRef.current) {
      const { restoredMuted } = endAdTransition(automatedAdSkipRef.current);
      automatedAdSkipRef.current = null;
      setIsAdTransitioning(false);
      if (restoredMuted !== null && videoEl) {
        videoEl.muted = restoredMuted;
      }
    } else {
      automatedAdSkipRef.current = null;
    }
    setUseIframeFallback(false);
    setIsBuffering(true);
    const effectiveInitialSlug = initialEpisodeSlug || initialLoadedEpisode;
    if (
      activeEpisodeSlug &&
      effectiveInitialSlug &&
      activeEpisodeSlug !== effectiveInitialSlug
    ) {
      setInitialTimeUsed(true);
    }
  }, [
    activeEpisodeSlug,
    resolvedM3u8,
    currentServerIndex,
    initialEpisodeSlug,
    initialLoadedEpisode,
    videoRef,
    adPreTriggerRef,
    hasSeekedInitialRef,
    hasHandledPreRollRef,
    adBoundariesRef,
    hasSkippedAdRef,
    lastAdSkipTimeRef,
    automatedAdSkipRef,
    setIsAdTransitioning,
    setUseIframeFallback,
    setIsBuffering,
    setInitialTimeUsed,
  ]);

  // HLS.js + Native iOS/Safari HLS lifecycle
  useEffect(() => {
    const video = videoRef.current;
    const adPreTrigger = adPreTriggerRef.current;
    const hasSkippedAd = hasSkippedAdRef.current;
    if (!video || !resolvedM3u8 || useIframeFallback) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      loadedSourceKeyRef.current = null;
      return;
    }

    const currentMovieSlug = contextMovieSlug || propMovieSlug;
    const currentSrvIdx = currentServerIndex ?? 0;
    const sourceKey = `${currentSrvIdx}__${resolvedM3u8}__${activeEpisodeSlug || ""}`;
    if (
      loadedSourceKeyRef.current === sourceKey &&
      (hlsRef.current || video.src === resolvedM3u8)
    ) {
      // Luồng stream đang tải hoặc hoạt động trên instance này; tránh hủy và tải lại khi các prop phụ re-render
      return;
    }
    loadedSourceKeyRef.current = sourceKey;

    let cleanupMediaListeners: () => void = () => {};

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (initialBufferTimeoutRef.current) {
      clearTimeout(initialBufferTimeoutRef.current);
      initialBufferTimeoutRef.current = null;
    }
    if (stallRecoveryTimeoutRef.current) {
      clearTimeout(stallRecoveryTimeoutRef.current);
      stallRecoveryTimeoutRef.current = null;
    }
    hasStartedInitialPlaybackRef.current = false;
    isStalledRef.current = false;

    setIsBuffering(true);
    video.pause();
    video.currentTime = 0;
    video.removeAttribute("src");
    video.load();

    const trySeekToTarget = () => {
      if (targetProgress <= 0 || hasSeekedInitialRef.current) return;
      hasSeekedInitialRef.current = true;
      latestRequestSeekRef.current(targetProgress, true);
    };

    const applyPreRollTransition = (
      v: HTMLVideoElement,
      maxDuration: number,
      requirePreRollLead: boolean,
    ) => {
      const preRollDecision = evaluatePreRollAdDecision({
        targetProgress,
        hasStartedInitialPlayback: hasStartedInitialPlaybackRef.current,
        boundaries: adBoundariesRef.current,
        safeOffset: SAFE_AD_SKIP_OFFSET,
        maxDuration,
      });
      if (!preRollDecision) return;
      if (requirePreRollLead && v.currentTime >= preRollDecision.targetSeek - 0.5) {
        return;
      }
      hasHandledPreRollRef.current = true;
      hasSeekedInitialRef.current = true;
      hasSkippedAdRef.current.add(preRollDecision.adKey);
      isProgrammaticAdSkipRef.current = true;
      const { transitionState, shouldMuteElement } = startAdTransition({
        targetSeek: preRollDecision.targetSeek,
        adDuration: preRollDecision.adDuration,
        currentUserMuted: isMutedRef.current ?? v.muted,
      });
      automatedAdSkipRef.current = transitionState;
      if (shouldMuteElement) {
        v.muted = true;
      }
      setIsAdTransitioning(true);
      v.currentTime = preRollDecision.targetSeek;
    };

    if (targetProgress > 0) {
      const mins = Math.floor(targetProgress / 60);
      const secs = (Math.floor(targetProgress) % 60).toString().padStart(2, "0");
      showHud(
        React.createElement(RotateCcw, { className: "w-5 h-5 text-netflix-red" }),
        !initialTimeUsed && (initialTime || urlParamT)
          ? `Bắt đầu xem từ mốc: ${mins}:${secs}`
          : `Tiếp tục xem từ ${mins}:${secs}`,
      );
      if (currentMovieSlug && activeEpisodeSlug) {
        saveWatchProgress(
          currentMovieSlug,
          targetProgress,
          video.duration || 0,
          activeEpisodeSlug,
          {
            title,
            poster: posterUrl,
            thumb: latestResolvedThumbRef.current,
            episodeName: activeEpisodeName,
          },
        );
      }
    }

    const seekTimeouts: NodeJS.Timeout[] = [];
    let networkRetryTimeout: NodeJS.Timeout | null = null;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        capLevelToPlayerSize: true,
        maxBufferSize: 25 * 1000 * 1000,
        maxBufferLength: 20,
        maxMaxBufferLength: 40,
        backBufferLength: 20,
        startPosition: targetProgress > 0 ? targetProgress : -1,
        startLevel: -1,
        autoStartLoad: true,
        abrEwmaDefaultEstimate: 1000000,
        fragLoadingTimeOut: 15000,
        fragLoadingMaxRetry: 4,
        fragLoadingRetryDelay: 1000,
        fragLoadingMaxRetryTimeout: 20000,
        manifestLoadingTimeOut: 10000,
        levelLoadingTimeOut: 10000,
      });
      hlsRef.current = hls;
      hls.loadSource(resolvedM3u8);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        setIsBuffering(true);
        if (data.levels && data.levels.length > 1) {
          const lvls = data.levels.map((lvl, index) => ({
            id: index,
            height: lvl.height || 0,
            label: lvl.height
              ? `${lvl.height}p`
              : `${Math.round(lvl.bitrate / 1000)}k`,
          }));
          lvls.sort((a, b) => b.height - a.height);
          setQualityLevels(lvls);
        } else {
          setQualityLevels([]);
        }

        let initialTimeoutFired = false;
        const checkInitialBufferAndStart = () => {
          if (hasStartedInitialPlaybackRef.current) return;
          const v = videoRef.current;
          if (!v) return;

          const bufAhead = getBufferAhead(v);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const dur = (v as any).__hlsDuration || (v.duration && isFinite(v.duration) ? v.duration : 0);
          const isNearEnd = dur > 0 && v.currentTime + bufAhead >= dur - 2;

          // Bắt đầu playback an toàn khi buffer đạt >= 0.5s hoặc readyState >= 3 có đệm >= 0.2s hoặc sắp hết phim,
          // hoặc sau khi timeout dự phòng đã kích hoạt và buffer có ít nhất 0.1s an toàn
          const isBufferReady =
            bufAhead >= INITIAL_BUFFER_START_SECONDS ||
            (v.readyState >= 3 && bufAhead >= 0.2) ||
            isNearEnd ||
            (initialTimeoutFired && bufAhead > 0.1);

          if (isBufferReady) {
            // P0: Đảm bảo nếu có pre-roll thì vị trí currentTime trước khi gọi play() đã ở sau pre-roll
            applyPreRollTransition(v, dur, true);

            hasStartedInitialPlaybackRef.current = true;
            if (initialBufferTimeoutRef.current) {
              clearTimeout(initialBufferTimeoutRef.current);
              initialBufferTimeoutRef.current = null;
            }
            setIsBuffering(false);
            playWithMutedFallback(v, setIsPlaying, setIsMuted);
          }
        };

        hls.on(Hls.Events.FRAG_BUFFERED, checkInitialBufferAndStart);

        const onCanPlayOrLoaded = () => {
          checkInitialBufferAndStart();
        };
        video.addEventListener("canplay", onCanPlayOrLoaded);
        video.addEventListener("loadeddata", onCanPlayOrLoaded);
        cleanupMediaListeners = () => {
          video.removeEventListener("canplay", onCanPlayOrLoaded);
          video.removeEventListener("loadeddata", onCanPlayOrLoaded);
        };
        if (
          video.readyState >= 3 ||
          getBufferAhead(video) >= INITIAL_BUFFER_START_SECONDS
        ) {
          checkInitialBufferAndStart();
        }

        // Fallback timeout dự phòng đảm bảo không bị treo player nếu mạng yếu hoặc stream ngắn
        initialBufferTimeoutRef.current = setTimeout(() => {
          initialTimeoutFired = true;
          if (!hasStartedInitialPlaybackRef.current && videoRef.current) {
            const v = videoRef.current;
            const bufAhead = getBufferAhead(v);
            // Bảo đảm timeout không ép phát nếu chưa có dữ liệu đủ để phát an toàn (cần >= 0.2s buffer hoặc readyState >= 2)
            if (bufAhead >= 0.2 || v.readyState >= 2) {
              applyPreRollTransition(
                v,
                latestEffectiveDurationRef.current(),
                true,
              );

              hasStartedInitialPlaybackRef.current = true;
              setIsBuffering(false);
              playWithMutedFallback(v, setIsPlaying, setIsMuted);
            } else {
              // Chưa có dữ liệu an toàn (< 0.5s): không ép play(), giữ spinner loading chờ FRAG_BUFFERED
              initialBufferTimeoutRef.current = null;
            }
          }
        }, 4500);
      });

      // Reset bộ đếm lỗi mạng khi có bằng chứng tải fragment thành công
      const onFragLoaded = () => {
        hlsNetworkRetryCountRef.current = 0;
      };
      hls.on(Hls.Events.FRAG_LOADED, onFragLoaded);

      const updateHlsDuration = (
        _event: unknown,
        data: { details?: { totalduration?: number; fragments?: FragmentLike[] } },
      ) => {
        if (
          data?.details?.totalduration &&
          data.details.totalduration > 0 &&
          isFinite(data.details.totalduration)
        ) {
          const totalSecs = data.details.totalduration;
          setKnownDuration(totalSecs);
          if (videoRef.current) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (videoRef.current as any).__hlsDuration = totalSecs;
            videoRef.current.dispatchEvent(new Event("durationchange"));
          }
        }
        if (
          data?.details?.fragments &&
          Array.isArray(data.details.fragments)
        ) {
          const detected = detectAdBoundaries(data.details.fragments);
          if (detected.length > 0) {
            adBoundariesRef.current = detected;
            // P0: Pre-roll ad detection trước khi playback bắt đầu
            const preRollDecision = evaluatePreRollAdDecision({
              targetProgress,
              hasStartedInitialPlayback: hasStartedInitialPlaybackRef.current,
              boundaries: detected,
              safeOffset: SAFE_AD_SKIP_OFFSET,
              maxDuration:
                data?.details?.totalduration ||
                latestEffectiveDurationRef.current(),
            });
            if (preRollDecision && !hasHandledPreRollRef.current) {
              hasHandledPreRollRef.current = true;
              hasSeekedInitialRef.current = true;
              hasSkippedAdRef.current.add(preRollDecision.adKey);
              if (videoRef.current) {
                try {
                  isProgrammaticAdSkipRef.current = true;
                  const { transitionState, shouldMuteElement } =
                    startAdTransition({
                      targetSeek: preRollDecision.targetSeek,
                      adDuration: preRollDecision.adDuration,
                      currentUserMuted:
                        isMutedRef.current ?? videoRef.current.muted,
                    });
                  automatedAdSkipRef.current = transitionState;
                  if (shouldMuteElement) {
                    videoRef.current.muted = true;
                  }
                  setIsAdTransitioning(true);
                  videoRef.current.currentTime = preRollDecision.targetSeek;
                } catch {}
              }
            }
          } else if (adBoundariesRef.current.length === 0) {
            adBoundariesRef.current = [];
          }
        }
      };

      hls.on(Hls.Events.LEVEL_LOADED, updateHlsDuration);
      hls.on(Hls.Events.LEVEL_UPDATED, updateHlsDuration);

      // Fallback seek duy nhất sau 1.5s nếu Hls.js startPosition chưa khớp target
      seekTimeouts.push(
        setTimeout(() => {
          if (
            !hasSeekedInitialRef.current &&
            targetProgress > 0 &&
            videoRef.current
          ) {
            if (Math.abs(videoRef.current.currentTime - targetProgress) > 2) {
              trySeekToTarget();
            } else {
              hasSeekedInitialRef.current = true;
            }
          }
        }, 1500),
      );

      const fallbackToIframe = () => {
        if (networkRetryTimeout) {
          clearTimeout(networkRetryTimeout);
          networkRetryTimeout = null;
        }
        const currentEmbed = decodeStreamUrl(latestEmbedSrcRef.current || "");
        // Nếu embedSrc là nguồn streamc, vsmov hoặc player.phimapi.com (chỉ là iframe wrapper hay bị chặn/crash trong iframe),
        // TUYỆT ĐỐI không fallback sang iframe chết, mà giữ lại Native Player và thử startLoad lại
        if (
          !currentEmbed ||
          currentEmbed.includes("streamc") ||
          currentEmbed.includes("vsmov") ||
          currentEmbed.includes("phimapi.com")
        ) {
          if (hlsRef.current === hls) {
            hls.startLoad();
          }
          return;
        }
        hls.destroy();
        setUseIframeFallback(true);
      };

      let mediaRetryCount = 0;
      hls.on(Hls.Events.ERROR, (_event, data) => {
        const hlsErr = evaluateHlsError(data);
        if (!hlsErr.isFatal) {
          if (hlsErr.isBufferStalled) {
            const v = videoRef.current;
            if (v && !v.paused && !v.ended) {
              setIsBuffering(true);
              isStalledRef.current = true;
              if (stallRecoveryTimeoutRef.current) {
                clearTimeout(stallRecoveryTimeoutRef.current);
              }
              stallRecoveryTimeoutRef.current = setTimeout(() => {
                const curV = videoRef.current;
                if (
                  curV &&
                  isStalledRef.current &&
                  !curV.paused &&
                  !curV.ended
                ) {
                  curV.play().catch(() => {});
                }
              }, 3500);
            }
          }
          // Bỏ qua các lỗi non-fatal khác để Hls.js tự retry theo cơ chế nội bộ
          return;
        }

        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            hlsNetworkRetryCountRef.current += 1;
            // Nới số lần thử lại lỗi mạng có thể phục hồi từ 2 lên 5 lần với delay tăng dần chống dập tải
            if (hlsNetworkRetryCountRef.current <= 5) {
              if (networkRetryTimeout) {
                clearTimeout(networkRetryTimeout);
              }
              const delay = Math.min(
                1000 * Math.pow(1.5, hlsNetworkRetryCountRef.current - 1),
                3500,
              );
              networkRetryTimeout = setTimeout(() => {
                if (hlsRef.current === hls) {
                  hls.startLoad();
                }
              }, delay);
            } else {
              fallbackToIframe();
            }
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            // Lỗi media: giữ nguyên tối đa 1 lần phục hồi, không nới số lần retry mạng cho lỗi media/fatal khác
            mediaRetryCount += 1;
            if (mediaRetryCount <= 1) {
              hls.recoverMediaError();
            } else {
              fallbackToIframe();
            }
            break;
          default:
            fallbackToIframe();
            break;
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = resolvedM3u8;

      const nativeFetchAbortController = new AbortController();

      // Phân tích playlist m3u8 để phát hiện ranh giới quảng cáo trên trình duyệt Native Safari / iOS
      if (
        resolvedM3u8 &&
        (resolvedM3u8.startsWith("http://") ||
          resolvedM3u8.startsWith("https://") ||
          resolvedM3u8.startsWith("/"))
      ) {
        const fetchM3u8TextCached = async (url: string): Promise<string> => {
          if (m3u8ManifestCache.has(url)) {
            return m3u8ManifestCache.get(url)!;
          }
          const timeoutSignal = AbortSignal.timeout(4000);
          const combinedSignal =
            typeof AbortSignal !== "undefined" && "any" in AbortSignal
              ? (
                  AbortSignal as unknown as {
                    any: (signals: AbortSignal[]) => AbortSignal;
                  }
                ).any([nativeFetchAbortController.signal, timeoutSignal])
              : nativeFetchAbortController.signal;
          const res = await fetch(url, { signal: combinedSignal });
          if (!res.ok) throw new Error(`m3u8 fetch failed: ${res.status}`);
          const text = await res.text();
          if (m3u8ManifestCache.size > 20) m3u8ManifestCache.clear();
          m3u8ManifestCache.set(url, text);
          return text;
        };

        fetchM3u8TextCached(resolvedM3u8)
          .then(async (m3u8Text) => {
            let text = m3u8Text;
            if (text.includes("#EXT-X-STREAM-INF")) {
              const lines = text.split(/\r?\n/);
              let variantUri = "";
              for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (
                  line.startsWith("#EXT-X-STREAM-INF") &&
                  i + 1 < lines.length
                ) {
                  const nextLine = lines[i + 1].trim();
                  if (nextLine && !nextLine.startsWith("#")) {
                    variantUri = nextLine;
                    break;
                  }
                }
              }
              if (variantUri) {
                const absoluteVariantUrl = new URL(
                  variantUri,
                  resolvedM3u8,
                ).toString();
                text = await fetchM3u8TextCached(absoluteVariantUrl);
              }
            }
            const fragments = parseM3u8PlaylistFragments(text);
            if (fragments.length > 0) {
              const detected = detectAdBoundaries(fragments);
              if (detected.length > 0) {
                adBoundariesRef.current = detected;
                const preRollDecision = evaluatePreRollAdDecision({
                  targetProgress,
                  hasStartedInitialPlayback: hasStartedInitialPlaybackRef.current,
                  boundaries: detected,
                  safeOffset: SAFE_AD_SKIP_OFFSET,
                  maxDuration:
                    videoRef.current?.duration &&
                    isFinite(videoRef.current.duration)
                      ? videoRef.current.duration
                      : latestEffectiveDurationRef.current(),
                });
                if (preRollDecision && !hasHandledPreRollRef.current) {
                  hasHandledPreRollRef.current = true;
                  hasSeekedInitialRef.current = true;
                  hasSkippedAdRef.current.add(preRollDecision.adKey);
                  if (videoRef.current) {
                    try {
                      videoRef.current.currentTime = preRollDecision.targetSeek;
                    } catch {}
                  }
                }
              }
            }
          })
          .catch(() => {
            // Không làm gián đoạn phát video nếu việc fetch playlist phụ trợ gặp sự cố
          });
      }

      let initialNativeTimeoutFired = false;
      const checkNativeInitialBuffer = () => {
        if (hasStartedInitialPlaybackRef.current) return;
        const bufAhead = getBufferAhead(video);
        const dur =
          video.duration && isFinite(video.duration) ? video.duration : 0;
        const isNearEnd = dur > 0 && video.currentTime + bufAhead >= dur - 2;

        const isBufferReady =
          bufAhead >= INITIAL_BUFFER_START_SECONDS ||
          (video.readyState >= 3 && bufAhead >= 0.2) ||
          isNearEnd ||
          (initialNativeTimeoutFired && bufAhead > 0.1);

        if (isBufferReady) {
          hasStartedInitialPlaybackRef.current = true;
          if (initialBufferTimeoutRef.current) {
            clearTimeout(initialBufferTimeoutRef.current);
            initialBufferTimeoutRef.current = null;
          }
          setIsBuffering(false);
          trySeekToTarget();
          playWithMutedFallback(video, setIsPlaying, setIsMuted);
        }
      };

      const onLoaded = () => {
        setIsBuffering(true);
        trySeekToTarget();
        checkNativeInitialBuffer();

        initialBufferTimeoutRef.current = setTimeout(() => {
          initialNativeTimeoutFired = true;
          if (!hasStartedInitialPlaybackRef.current) {
            const bufAhead = getBufferAhead(video);
            if (bufAhead >= 0.2 || video.readyState >= 2) {
              hasStartedInitialPlaybackRef.current = true;
              setIsBuffering(false);
              playWithMutedFallback(video, setIsPlaying, setIsMuted);
            } else {
              initialBufferTimeoutRef.current = null;
            }
          }
        }, 4500);
      };

      const onNativeError = () => {
        setIsBuffering(false);
        setUseIframeFallback(true);
      };

      video.addEventListener("loadedmetadata", onLoaded);
      video.addEventListener("canplay", checkNativeInitialBuffer);
      video.addEventListener("loadeddata", checkNativeInitialBuffer);
      video.addEventListener("progress", checkNativeInitialBuffer);
      video.addEventListener("error", onNativeError);

      // Fallback seek duy nhất cho Native Safari
      seekTimeouts.push(
        setTimeout(() => {
          if (
            !hasSeekedInitialRef.current &&
            targetProgress > 0 &&
            videoRef.current
          ) {
            trySeekToTarget();
          }
        }, 1000),
      );

      return () => {
        nativeFetchAbortController.abort();
        loadedSourceKeyRef.current = null;
        video.removeEventListener("loadedmetadata", onLoaded);
        video.removeEventListener("canplay", checkNativeInitialBuffer);
        video.removeEventListener("loadeddata", checkNativeInitialBuffer);
        video.removeEventListener("progress", checkNativeInitialBuffer);
        video.removeEventListener("error", onNativeError);
        seekTimeouts.forEach((t) => clearTimeout(t));
        if (initialBufferTimeoutRef.current) {
          clearTimeout(initialBufferTimeoutRef.current);
          initialBufferTimeoutRef.current = null;
        }
        if (networkRetryTimeout) {
          clearTimeout(networkRetryTimeout);
          networkRetryTimeout = null;
        }
      };
    }

    return () => {
      cleanupMediaListeners();
      loadedSourceKeyRef.current = null;
      seekTimeouts.forEach((t) => clearTimeout(t));
      if (initialBufferTimeoutRef.current) {
        clearTimeout(initialBufferTimeoutRef.current);
        initialBufferTimeoutRef.current = null;
      }
      if (stallRecoveryTimeoutRef.current) {
        clearTimeout(stallRecoveryTimeoutRef.current);
        stallRecoveryTimeoutRef.current = null;
      }
      if (networkRetryTimeout) {
        clearTimeout(networkRetryTimeout);
        networkRetryTimeout = null;
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      hasHandledPreRollRef.current = false;
      if (adPreTrigger.timer) {
        clearTimeout(adPreTrigger.timer);
        adPreTrigger.timer = null;
      }
      if (
        adPreTrigger.rVfcId !== null &&
        video &&
        "cancelVideoFrameCallback" in video
      ) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (video as any).cancelVideoFrameCallback(adPreTrigger.rVfcId);
        adPreTrigger.rVfcId = null;
      }
      adBoundariesRef.current = [];
      hasSkippedAd.clear();
      lastAdSkipTimeRef.current = 0;
      isProgrammaticAdSkipRef.current = false;
      if (automatedAdSkipRef.current) {
        const { restoredMuted } = endAdTransition(automatedAdSkipRef.current);
        automatedAdSkipRef.current = null;
        setIsAdTransitioning(false);
        if (restoredMuted !== null && video) {
          video.muted = restoredMuted;
        }
      } else {
        automatedAdSkipRef.current = null;
      }
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    resolvedM3u8,
    useIframeFallback,
    activeEpisodeSlug,
    contextMovieSlug,
    currentServerIndex,
    propMovieSlug,
    targetProgress,
    initialTime,
    urlParamT,
    initialTimeUsed,
    showHud,
    activeEpisodeName,
    posterUrl,
    title,
  ]);
}

