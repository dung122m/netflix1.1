"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type RefObject,
  type MutableRefObject,
} from "react";
import Hls from "hls.js";
import type { FootballMatch, StreamServer } from "@/services/liveFootballService";
import {
  type LiveStallRecord,
  getForwardBuffer,
  calculateLiveLatency,
} from "@/services/live/shared/liveBufferHelper";
import {
  getSourceQuality,
  parseServerDisplayLabel,
  findBestInitialServerIndex,
  findNextFallbackServerIndex,
} from "@/services/live/shared/serverSelectionHelper";
import {
  toCanonicalSourceUrl,
  extractStreamHost,
} from "@/services/live/shared/streamUrlHelper";
import {
  FOOTBALL_STREAM_PROXY_ENDPOINT,
  toPlayableHlsUrl,
  getFootballStreamUrl,
  isIframeStreamUrl,
} from "@/services/live/football/streamUrlHelper";
import type { LiveActionFeedback } from "../LiveSeekOverlay";

declare global {
  interface Window {
    __liveStalls?: LiveStallRecord[];
  }
}

export interface UseLiveFootballHlsOptions {
  match?: FootballMatch;
  servers: StreamServer[];
  isActive: boolean;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  videoRef: RefObject<HTMLVideoElement | null>;
  volumeRef: MutableRefObject<number>;
  userMutedRef: MutableRefObject<boolean>;
  isMutedRef: MutableRefObject<boolean>;
  setIsMuted: (muted: boolean) => void;
  setIsPip: (pip: boolean) => void;
  setShowControls: (show: boolean) => void;
  resetControlsTimeout: () => void;
  triggerActionFeedback: (
    icon: LiveActionFeedback["icon"],
    text?: string,
  ) => void;
  scrollToPlayer: () => void;
}

/**
 * Manages live football HLS playback, proxy/server fallback, adaptive watchdog,
 * failed-source tracking, DVR live-edge synchronization, and transport actions.
 */
export function useLiveFootballHls({
  match,
  servers,
  isActive,
  isPlaying,
  setIsPlaying,
  videoRef,
  volumeRef,
  userMutedRef,
  isMutedRef,
  setIsMuted,
  setIsPip,
  setShowControls,
  resetControlsTimeout,
  triggerActionFeedback,
  scrollToPlayer,
}: UseLiveFootballHlsOptions) {
  const hlsRef = useRef<Hls | null>(null);
  const userPausedRef = useRef<boolean>(false);
  const lastLoadedUrlRef = useRef<string>("");
  const retryCountRef = useRef<number>(0);
  const fallbackCountRef = useRef<number>(0);
  const watchdogTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptIdRef = useRef<number>(0);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  const failedServersRef = useRef<Set<number>>(new Set());
  const failedSourcesByMatchRef = useRef<Record<string, Set<string>>>({});
  const prevMatchIdRef = useRef<string | undefined>(match?.id);
  const serversRef = useRef(servers);
  const isStoppedRef = useRef<boolean>(false);
  const useProxyFallbackRef = useRef<boolean>(false);
  const userSelectedServerRef = useRef<boolean>(false);

  const [failedSourcesByMatch, setFailedSourcesByMatch] = useState<
    Record<string, Set<string>>
  >({});
  const [retryNonce, setRetryNonce] = useState<number>(0);
  const [selectedServerIndex, setSelectedServerIndex] = useState(() => {
    return findBestInitialServerIndex(servers);
  });
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [useProxyFallback, setUseProxyFallback] = useState<boolean>(false);
  const [isAtLiveEdge, setIsAtLiveEdge] = useState<boolean>(true);
  const [, setLiveLatency] = useState<number>(0);

  useEffect(() => {
    serversRef.current = servers;
  }, [servers]);

  const activeMatchId = match?.id || "default";

  const currentMatchFailedUrls = useMemo(() => {
    return failedSourcesByMatch[activeMatchId] || new Set<string>();
  }, [failedSourcesByMatch, activeMatchId]);

  const markSourceFailed = useCallback(
    (rawUrl?: string | null, serverIndex?: number) => {
      if (serverIndex !== undefined && serverIndex >= 0) {
        failedServersRef.current.add(serverIndex);
      }
      const canonical = toCanonicalSourceUrl(rawUrl);
      if (!canonical) return;

      const currentSet =
        failedSourcesByMatchRef.current[activeMatchId] || new Set<string>();

      const host = extractStreamHost(rawUrl);
      const nextSet = new Set(currentSet);
      nextSet.add(canonical);
      if (host) {
        nextSet.add(`host:${host}`);
      }

      failedSourcesByMatchRef.current[activeMatchId] = nextSet;

      setFailedSourcesByMatch((prev) => ({
        ...prev,
        [activeMatchId]: nextSet,
      }));
    },
    [activeMatchId],
  );

  // Reset trạng thái server & player khi chuyển sang trận đấu khác
  useEffect(() => {
    if (prevMatchIdRef.current !== match?.id) {
      prevMatchIdRef.current = match?.id;
      const newMatchId = match?.id || "default";

      failedServersRef.current.clear();
      delete failedSourcesByMatchRef.current[newMatchId];
      setFailedSourcesByMatch((prev) => {
        const next = { ...prev };
        delete next[newMatchId];
        return next;
      });

      isStoppedRef.current = false;
      useProxyFallbackRef.current = false;
      setUseProxyFallback(false);
      fallbackCountRef.current = 0;
      userPausedRef.current = false;
      setHasError(false);
      setErrorMessage("");
      setIsLoading(true);

      const initialBestIdx = findBestInitialServerIndex(serversRef.current);
      setSelectedServerIndex(initialBestIdx);
      setRetryNonce((prev) => prev + 1);
    }
  }, [match?.id]);

  // Reset proxy fallback khi chuyển đổi server
  useEffect(() => {
    useProxyFallbackRef.current = false;
    setUseProxyFallback(false);
  }, [selectedServerIndex]);

  const availableServers = useMemo(() => {
    return servers.filter((s) => {
      if (!s.url) return false;
      const canonical = toCanonicalSourceUrl(s.url);
      return !currentMatchFailedUrls.has(canonical);
    });
  }, [servers, currentMatchFailedUrls]);

  const sortedAvailableServers = useMemo(() => {
    return [...availableServers].sort((a, b) => {
      return (
        (getSourceQuality(b) === "FHD" ? 3 : getSourceQuality(b) === "HD" ? 2 : 1) -
        (getSourceQuality(a) === "FHD" ? 3 : getSourceQuality(a) === "HD" ? 2 : 1)
      );
    });
  }, [availableServers]);

  const currentServer = useMemo<StreamServer | null>(() => {
    const chosen = servers[selectedServerIndex];
    if (
      chosen &&
      chosen.url &&
      !currentMatchFailedUrls.has(toCanonicalSourceUrl(chosen.url))
    ) {
      return chosen;
    }
    if (availableServers.length > 0) {
      const sorted = [...availableServers].sort((a, b) => {
        const score = (srv: StreamServer) => {
          const q = getSourceQuality(srv);
          return q === "FHD" ? 3 : q === "HD" ? 2 : 1;
        };
        return score(b) - score(a);
      });
      return sorted[0];
    }
    return null;
  }, [servers, selectedServerIndex, currentMatchFailedUrls, availableServers]);

  const currentAvailableIdx = useMemo(() => {
    return availableServers.findIndex(
      (s) =>
        toCanonicalSourceUrl(s.url) === toCanonicalSourceUrl(currentServer?.url),
    );
  }, [availableServers, currentServer?.url]);

  const isIframe = useMemo(
    () => isIframeStreamUrl(currentServer?.url),
    [currentServer?.url],
  );

  const activeUrl = currentServer
    ? getFootballStreamUrl(
        currentServer.url,
        Boolean(currentServer.isHls),
        useProxyFallback,
      )
    : "";

  const destroyHlsInstance = useCallback(() => {
    if (hlsRef.current) {
      try {
        hlsRef.current.stopLoad();
        hlsRef.current.detachMedia();
        hlsRef.current.destroy();
      } catch {}
      hlsRef.current = null;
    }
  }, []);

  const resetMediaElement = useCallback((video: HTMLVideoElement | null) => {
    if (!video) return;
    try {
      video.pause();
    } catch {}
    try {
      video.removeAttribute("src");
      video.src = "";
      if ("srcObject" in video && video.srcObject) {
        video.srcObject = null;
      }
      video.load();
    } catch {}
  }, []);

  const safePause = useCallback(() => {
    userPausedRef.current = true;
    isPlayingRef.current = false;
    setIsPlaying(false);

    const video = videoRef.current;
    if (!video) return;

    if (playPromiseRef.current) {
      playPromiseRef.current
        .catch(() => {})
        .finally(() => {
          if (userPausedRef.current && videoRef.current) {
            try {
              videoRef.current.pause();
            } catch {}
          }
        });
    } else {
      try {
        video.pause();
      } catch {}
    }
  }, [setIsPlaying, videoRef]);

  const safePlay = useCallback(
    (expectedAttemptId?: number) => {
      const video = videoRef.current;
      if (!video) return;

      if (userPausedRef.current || !isActive || isStoppedRef.current) {
        return;
      }
      if (
        expectedAttemptId !== undefined &&
        expectedAttemptId !== attemptIdRef.current
      ) {
        return;
      }

      const promise = video.play();
      if (promise !== undefined) {
        playPromiseRef.current = promise;
        promise
          .then(() => {
            if (
              expectedAttemptId !== undefined &&
              expectedAttemptId !== attemptIdRef.current
            ) {
              video.pause();
              return;
            }
            if (userPausedRef.current || !isActive) {
              video.pause();
              return;
            }
            isPlayingRef.current = true;
            setIsPlaying(true);
            setIsMuted(video.muted || video.volume === 0);
          })
          .catch((err: unknown) => {
            const errName =
              typeof err === "object" && err !== null && "name" in err
                ? (err as { name?: string }).name
                : "";

            if (errName === "AbortError") {
              return;
            }

            if (
              errName === "NotAllowedError" &&
              !userPausedRef.current &&
              isActive
            ) {
              if (
                expectedAttemptId !== undefined &&
                expectedAttemptId !== attemptIdRef.current
              ) {
                return;
              }
              video.muted = true;
              setIsMuted(true);
              const retryPromise = video.play();
              if (retryPromise !== undefined) {
                playPromiseRef.current = retryPromise;
                retryPromise
                  .then(() => {
                    if (
                      expectedAttemptId !== undefined &&
                      expectedAttemptId !== attemptIdRef.current
                    ) {
                      video.pause();
                      return;
                    }
                    if (userPausedRef.current || !isActive) {
                      video.pause();
                      return;
                    }
                    isPlayingRef.current = true;
                    setIsPlaying(true);
                    setIsMuted(true);
                  })
                  .catch(() => {});
              }
            }
          })
          .finally(() => {
            if (playPromiseRef.current === promise) {
              playPromiseRef.current = null;
            }
          });
      }
    },
    [isActive, setIsMuted, setIsPlaying, videoRef],
  );

  // Xử lý khi tab thay đổi (isActive true/false) - Cleanup tránh rò rỉ RAM
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!isActive) {
      safePause();
      resetMediaElement(video);
      destroyHlsInstance();
      lastLoadedUrlRef.current = "";
      if (
        typeof document !== "undefined" &&
        document.pictureInPictureElement === video
      ) {
        document.exitPictureInPicture().catch(() => {});
        setIsPip(false);
      }
    }
  }, [isActive, safePause, resetMediaElement, destroyHlsInstance, setIsPip, videoRef]);

  const executeServerFallback = useCallback(
    (customReason?: string) => {
      if (isStoppedRef.current) return;

      const failedUrl = lastLoadedUrlRef.current;
      const isProxyAttempt = failedUrl
        ? failedUrl.includes("/proxy") ||
          failedUrl.includes(FOOTBALL_STREAM_PROXY_ENDPOINT)
        : useProxyFallbackRef.current;

      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }
      attemptIdRef.current++;
      destroyHlsInstance();
      resetMediaElement(videoRef.current);
      lastLoadedUrlRef.current = "";

      const currentUrl = currentServer?.url || "";
      const isHttpsDirect =
        currentUrl.startsWith("https://") ||
        (currentUrl.startsWith("http://") &&
          /fptplay|akamaized|cloudfront|vtv|cdn|vietnam/i.test(currentUrl));

      const isPreKickoffNow = Boolean(
        (match?.timestamp &&
          match.timestamp > 0 &&
          match.timestamp !== Number.MAX_SAFE_INTEGER &&
          Date.now() < match.timestamp) ||
          match?.timeline === "upcoming",
      );

      const isFatalNotFound =
        customReason?.includes("404") ||
        customReason?.includes("không tồn tại");

      if (isPreKickoffNow) {
        failedServersRef.current.add(selectedServerIndex);
        if (currentUrl) {
          markSourceFailed(currentUrl, selectedServerIndex);
        }
        useProxyFallbackRef.current = false;
        setUseProxyFallback(false);

        const currentFailed =
          failedSourcesByMatchRef.current[activeMatchId] || new Set<string>();
        const nextIndex = findNextFallbackServerIndex(
          servers,
          currentFailed,
          selectedServerIndex,
        );

        if (nextIndex !== -1) {
          fallbackCountRef.current += 1;
          const toastText = `Máy chủ #${selectedServerIndex + 1} chưa có tín hiệu, đang thử máy chủ #${nextIndex + 1}...`;
          triggerActionFeedback("server", toastText);
          setIsLoading(true);
          setHasError(false);
          setErrorMessage("");
          setSelectedServerIndex(nextIndex);
          return;
        }

        isStoppedRef.current = true;
        setIsLoading(false);
        setHasError(true);
        setErrorMessage("Chưa có tín hiệu phát");
        return;
      }

      if (isHttpsDirect && !isProxyAttempt && !isFatalNotFound) {
        useProxyFallbackRef.current = true;
        setUseProxyFallback(true);
        const toastText = `Máy chủ #${selectedServerIndex + 1} ${customReason || "kết nối trực tiếp thất bại"}, đang thử qua cổng dự phòng (Proxy)...`;
        triggerActionFeedback("server", toastText);
        setIsLoading(true);
        setHasError(false);
        setErrorMessage("");
        return;
      }

      failedServersRef.current.add(selectedServerIndex);
      if (currentUrl) {
        markSourceFailed(currentUrl, selectedServerIndex);
      }
      useProxyFallbackRef.current = false;
      setUseProxyFallback(false);

      const currentFailed =
        failedSourcesByMatchRef.current[activeMatchId] || new Set<string>();
      const nextIndex = findNextFallbackServerIndex(
        servers,
        currentFailed,
        selectedServerIndex,
      );

      if (nextIndex !== -1) {
        fallbackCountRef.current += 1;
        const nextQuality = getSourceQuality(servers[nextIndex]);
        const qualityTag = nextQuality ? ` [${nextQuality}]` : "";
        const toastText = `Máy chủ #${selectedServerIndex + 1} ${customReason || "không phản hồi"}, đang chuyển sang máy chủ #${nextIndex + 1}${qualityTag}...`;
        triggerActionFeedback("server", toastText);
        setIsLoading(true);
        setHasError(false);
        setErrorMessage("");
        setSelectedServerIndex(nextIndex);
        return;
      }

      isStoppedRef.current = true;
      setIsLoading(false);
      setHasError(true);
      setErrorMessage("Không có nguồn phát khả dụng");
    },
    [
      servers,
      selectedServerIndex,
      currentServer?.url,
      match?.timestamp,
      match?.timeline,
      triggerActionFeedback,
      markSourceFailed,
      activeMatchId,
      destroyHlsInstance,
      resetMediaElement,
      videoRef,
    ],
  );

  const executeServerFallbackRef = useRef(executeServerFallback);
  const markSourceFailedRef = useRef(markSourceFailed);

  useEffect(() => {
    executeServerFallbackRef.current = executeServerFallback;
    markSourceFailedRef.current = markSourceFailed;
  }, [executeServerFallback, markSourceFailed]);

  // Khởi tạo luồng phát HLS tối ưu độ trễ thấp + Auto ABR + Watchdog
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentServer || !isActive) return;

    if (isStoppedRef.current) {
      return;
    }

    if (isIframe) {
      setIsLoading(false);
      setHasError(false);
      setIsPlaying(true);
      return;
    }

    if (activeUrl === lastLoadedUrlRef.current && hlsRef.current) {
      return;
    }

    lastLoadedUrlRef.current = activeUrl;
    userPausedRef.current = false;
    retryCountRef.current = 0;
    setIsLoading(true);
    setHasError(false);
    setErrorMessage("");

    destroyHlsInstance();
    resetMediaElement(video);

    const effectiveUrl = toPlayableHlsUrl(currentServer.url);
    const isEffectiveHls =
      currentServer.isHls || effectiveUrl.includes(".m3u8");

    if (!isEffectiveHls && currentServer.format === "flv") {
      failedServersRef.current.add(selectedServerIndex);
      if (currentServer.url) {
        markSourceFailedRef.current(currentServer.url, selectedServerIndex);
      }

      const nextHlsIdx = servers.findIndex(
        (s, idx) =>
          !failedServersRef.current.has(idx) &&
          (s.isHls || toPlayableHlsUrl(s.url).includes(".m3u8")),
      );
      if (nextHlsIdx !== -1) {
        fallbackCountRef.current += 1;
        setSelectedServerIndex(nextHlsIdx);
        return;
      }

      isStoppedRef.current = true;
      setIsLoading(false);
      setHasError(true);
      setErrorMessage(
        "Định dạng này chưa được hỗ trợ trên trình duyệt này. Hãy chọn máy chủ HLS khác để xem trực tiếp!",
      );
      return;
    }

    const currentAttemptId = ++attemptIdRef.current;
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }

    let lastMediaProgressTime = Date.now();
    const watchdogStartTime = Date.now();

    const recordMediaProgress = () => {
      lastMediaProgressTime = Date.now();
    };

    const scheduleWatchdogCheck = (delayMs: number) => {
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }

      watchdogTimerRef.current = setTimeout(() => {
        if (currentAttemptId !== attemptIdRef.current) return;
        if (isStoppedRef.current) return;
        const v = videoRef.current;
        const isActuallyPlaying =
          v && !v.paused && (v.currentTime > 0.05 || v.readyState >= 3);
        if (isActuallyPlaying) {
          if (watchdogTimerRef.current) {
            clearTimeout(watchdogTimerRef.current);
            watchdogTimerRef.current = null;
          }
          setIsLoading(false);
          return;
        }

        const now = Date.now();
        const timeSinceProgress = now - lastMediaProgressTime;
        const totalElapsed = now - watchdogStartTime;

        if (timeSinceProgress < 4000 && totalElapsed < 15000) {
          scheduleWatchdogCheck(3000);
          return;
        }

        executeServerFallbackRef.current("không phản hồi");
      }, delayMs);
    };

    scheduleWatchdogCheck(8000);

    const onPlaybackConfirmed = () => {
      if (currentAttemptId !== attemptIdRef.current) return;
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }
      setIsLoading(false);
      setHasError(false);
      if (!userPausedRef.current) {
        isPlayingRef.current = true;
        setIsPlaying(true);
      }
      if (userSelectedServerRef.current) {
        userSelectedServerRef.current = false;
        scrollToPlayer();
      }
    };

    const onTimeUpdateCheck = () => {
      const v = videoRef.current;
      if (v && v.currentTime > 0.05) {
        onPlaybackConfirmed();
      }
    };

    video.addEventListener("playing", onPlaybackConfirmed);
    video.addEventListener("timeupdate", onTimeUpdateCheck);
    video.addEventListener("progress", recordMediaProgress);

    let cleanupDiagnosticListeners = () => {};
    let onNativeLoadedMetadata: (() => void) | null = null;
    let onNativeError: (() => void) | null = null;
    let stallNudgeTimer: ReturnType<typeof setTimeout> | null = null;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: Infinity,
        maxLiveSyncPlaybackRate: 1.0,
        backBufferLength: 60,
        maxBufferLength: 12,
        maxMaxBufferLength: 20,
        maxBufferSize: 20 * 1000 * 1000,
        maxBufferHole: 0.5,
        highBufferWatchdogPeriod: 2,
        nudgeOffset: 0.1,
        nudgeMaxRetry: 5,
        abrEwmaDefaultEstimate: 1_000_000,
        capLevelToPlayerSize: true,
        startLevel: -1,
        manifestLoadingTimeOut: 5000,
        manifestLoadingMaxRetry: 2,
        manifestLoadingRetryDelay: 800,
        levelLoadingTimeOut: 5000,
        levelLoadingMaxRetry: 2,
        levelLoadingRetryDelay: 800,
        fragLoadingTimeOut: 8000,
        fragLoadingMaxRetry: 3,
        fragLoadingRetryDelay: 800,
      });

      hlsRef.current = hls;
      hls.loadSource(activeUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.FRAG_LOADING, recordMediaProgress);
      hls.on(Hls.Events.FRAG_LOADED, recordMediaProgress);
      hls.on(Hls.Events.FRAG_BUFFERED, recordMediaProgress);
      hls.on(Hls.Events.LEVEL_LOADED, recordMediaProgress);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (currentAttemptId !== attemptIdRef.current) return;
        hls.currentLevel = -1;
        hls.loadLevel = -1;
        hls.nextLevel = -1;
        const curVol = volumeRef.current || 0.9;
        video.volume = curVol;
        video.muted = userMutedRef.current;

        if (isActive && !userPausedRef.current) {
          safePlay(currentAttemptId);
        }
      });

      let pendingStallSnapshot: {
        startTime: number;
        currentTime: number;
        readyState: number;
        readyStateText: string;
        forwardBufferSec: number;
        liveLatencySec: number | "N/A";
        seekableStart: number | null;
        seekableEnd: number | null;
        level: number;
        bitrate: string;
      } | null = null;

      const readyStateMap = [
        "HAVE_NOTHING",
        "HAVE_METADATA",
        "HAVE_CURRENT_DATA",
        "HAVE_FUTURE_DATA",
        "HAVE_ENOUGH_DATA",
      ];

      const onWaiting = () => {
        const v = videoRef.current;
        if (!v) return;
        const now = performance.now();
        const forwardBuf = getForwardBuffer(v);
        const latency = calculateLiveLatency(v, hls).latencySec;
        const sStart =
          v.seekable && v.seekable.length > 0
            ? +v.seekable.start(0).toFixed(2)
            : null;
        const sEnd =
          v.seekable && v.seekable.length > 0
            ? +v.seekable.end(v.seekable.length - 1).toFixed(2)
            : null;
        const curLvl = hls.currentLevel;
        const lvlData = curLvl >= 0 ? hls.levels[curLvl] : null;
        const bitrate = lvlData
          ? `${((lvlData.bitrate || 0) / 1000000).toFixed(2)} Mbps`
          : "Auto";

        pendingStallSnapshot = {
          startTime: now,
          currentTime: +v.currentTime.toFixed(2),
          readyState: v.readyState,
          readyStateText: readyStateMap[v.readyState] || String(v.readyState),
          forwardBufferSec: forwardBuf,
          liveLatencySec: latency,
          seekableStart: sStart,
          seekableEnd: sEnd,
          level: curLvl,
          bitrate,
        };

        if (stallNudgeTimer) clearTimeout(stallNudgeTimer);
        stallNudgeTimer = setTimeout(() => {
          const currentV = videoRef.current;
          if (!currentV || (!currentV.paused && currentV.readyState >= 3)) return;
          const currentForward = getForwardBuffer(currentV);
          if (currentForward > 0.1 && currentForward < 30) {
            currentV.currentTime += 0.1;
          } else if (
            hls &&
            hls.liveSyncPosition &&
            Number.isFinite(hls.liveSyncPosition) &&
            hls.liveSyncPosition > 0
          ) {
            const isOutsideSeekable =
              currentV.seekable &&
              currentV.seekable.length > 0 &&
              currentV.currentTime < currentV.seekable.start(0);
            const isAheadOfLiveEdge =
              currentV.currentTime > hls.liveSyncPosition + 2;

            if (isOutsideSeekable || isAheadOfLiveEdge) {
              currentV.currentTime = hls.liveSyncPosition;
              setIsAtLiveEdge(true);
              setLiveLatency(0);
              hls.startLoad();
            } else {
              hls.startLoad();
            }
          }
        }, 1800);
      };

      const onPlayingDiagnostic = () => {
        if (stallNudgeTimer) {
          clearTimeout(stallNudgeTimer);
          stallNudgeTimer = null;
        }
        if (pendingStallSnapshot) {
          const durationMs = Math.round(
            performance.now() - pendingStallSnapshot.startTime,
          );
          const snap = pendingStallSnapshot;
          pendingStallSnapshot = null;

          if (durationMs >= 100 && typeof window !== "undefined") {
            window.__liveStalls = window.__liveStalls || [];
            const recId = window.__liveStalls.length + 1;
            const record: LiveStallRecord = {
              id: recId,
              timestamp: new Date().toLocaleTimeString(),
              durationMs,
              currentTime: snap.currentTime,
              readyState: snap.readyState,
              readyStateText: snap.readyStateText,
              forwardBufferSec: snap.forwardBufferSec,
              liveLatencySec: snap.liveLatencySec,
              seekableStart: snap.seekableStart,
              seekableEnd: snap.seekableEnd,
              level: snap.level,
              bitrate: snap.bitrate,
            };

            window.__liveStalls.push(record);
            if (window.__liveStalls.length > 20) {
              window.__liveStalls.shift();
            }
          }
        }
      };

      video.addEventListener("waiting", onWaiting);
      video.addEventListener("playing", onPlayingDiagnostic);
      cleanupDiagnosticListeners = () => {
        video.removeEventListener("waiting", onWaiting);
        video.removeEventListener("playing", onPlayingDiagnostic);
        if (stallNudgeTimer) {
          clearTimeout(stallNudgeTimer);
          stallNudgeTimer = null;
        }
        pendingStallSnapshot = null;
      };

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (isStoppedRef.current) return;

        if (
          data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR ||
          data.details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT ||
          data.details === Hls.ErrorDetails.MANIFEST_PARSING_ERROR
        ) {
          const httpStatus = data.response?.code;
          const reason = httpStatus
            ? `lỗi HTTP ${httpStatus}`
            : "không tải được luồng phát (m3u8)";
          executeServerFallbackRef.current(reason);
          return;
        }

        const httpStatus = data.response?.code;
        if (
          typeof httpStatus === "number" &&
          (httpStatus === 404 || httpStatus === 403 || httpStatus >= 500) &&
          (data.fatal || data.details === Hls.ErrorDetails.LEVEL_LOAD_ERROR)
        ) {
          executeServerFallbackRef.current(`lỗi HTTP ${httpStatus}`);
          return;
        }

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              const isOutsideSeekable =
                videoRef.current &&
                videoRef.current.seekable &&
                videoRef.current.seekable.length > 0 &&
                videoRef.current.currentTime <
                  videoRef.current.seekable.start(0);

              if (
                videoRef.current &&
                hls.liveSyncPosition &&
                Number.isFinite(hls.liveSyncPosition) &&
                isOutsideSeekable
              ) {
                videoRef.current.currentTime = hls.liveSyncPosition;
                setIsAtLiveEdge(true);
                setLiveLatency(0);
                hls.startLoad();
                return;
              }

              if (retryCountRef.current < 2) {
                retryCountRef.current++;
                console.warn(
                  `[LivePlayer] Transient network error, recovering with startLoad() (attempt ${retryCountRef.current}/2)...`,
                );
                hls.startLoad();
                return;
              }

              executeServerFallbackRef.current("bị gián đoạn kết nối");
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn(
                "[LivePlayer] Media error encountered, recovering media error...",
              );
              hls.recoverMediaError();
              break;
            default:
              executeServerFallbackRef.current("gặp sự cố luồng phát");
              break;
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = activeUrl;
      const curVol = volumeRef.current || 0.9;
      video.volume = curVol;
      video.muted = isMutedRef.current;

      onNativeLoadedMetadata = () => {
        if (currentAttemptId !== attemptIdRef.current) return;
        if (isActive && !userPausedRef.current) {
          safePlay(currentAttemptId);
        }
      };

      onNativeError = () => {
        if (currentAttemptId !== attemptIdRef.current) return;
        if (isStoppedRef.current) return;
        executeServerFallbackRef.current("không thể phát trên thiết bị này");
      };

      video.addEventListener("loadedmetadata", onNativeLoadedMetadata);
      video.addEventListener("error", onNativeError);
    }

    return () => {
      cleanupDiagnosticListeners();
      if (stallNudgeTimer) {
        clearTimeout(stallNudgeTimer);
        stallNudgeTimer = null;
      }
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }
      destroyHlsInstance();
      video.removeEventListener("playing", onPlaybackConfirmed);
      video.removeEventListener("timeupdate", onTimeUpdateCheck);
      video.removeEventListener("progress", recordMediaProgress);
      if (onNativeLoadedMetadata) {
        video.removeEventListener("loadedmetadata", onNativeLoadedMetadata);
      }
      if (onNativeError) {
        video.removeEventListener("error", onNativeError);
      }
      if (video) {
        resetMediaElement(video);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- servers and fallbacks are ref-stabilized to prevent destroying playback on parent polling
  }, [
    selectedServerIndex,
    currentServer?.url,
    activeUrl,
    isActive,
    isIframe,
    retryNonce,
  ]);

  const handleRetry = useCallback(() => {
    isStoppedRef.current = false;
    failedServersRef.current.clear();
    fallbackCountRef.current = 0;
    useProxyFallbackRef.current = false;
    setUseProxyFallback(false);
    lastLoadedUrlRef.current = "";
    userPausedRef.current = false;
    setHasError(false);
    setErrorMessage("");
    setIsLoading(true);
    const bestIdx = findBestInitialServerIndex(servers, currentMatchFailedUrls);
    setSelectedServerIndex(bestIdx);
    setRetryNonce((prev) => prev + 1);
    triggerActionFeedback("server", "Đang thử kết nối lại...");
  }, [servers, currentMatchFailedUrls, triggerActionFeedback]);

  const goToLiveEdge = useCallback(() => {
    const video = videoRef.current;
    const hls = hlsRef.current;
    if (!video) return;
    const livePos = hls?.liveSyncPosition;
    if (livePos && Number.isFinite(livePos) && livePos > 0) {
      video.currentTime = livePos;
    } else if (video.seekable && video.seekable.length > 0) {
      video.currentTime = Math.max(
        0,
        video.seekable.end(video.seekable.length - 1) - 1,
      );
    } else if (
      video.duration &&
      Number.isFinite(video.duration) &&
      video.duration > 0 &&
      video.duration < 1800
    ) {
      video.currentTime = Math.max(0, video.duration - 1);
    }
    setIsAtLiveEdge(true);
    setLiveLatency(0);
    triggerActionFeedback("seek", "🔴 Về live");
  }, [triggerActionFeedback, videoRef]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      safePause();
      setShowControls(true);
      triggerActionFeedback("pause");
    } else {
      userPausedRef.current = false;
      const video = videoRef.current;
      const hls = hlsRef.current;
      const livePos = hls?.liveSyncPosition;

      const isOutsideSeekable =
        video.seekable &&
        video.seekable.length > 0 &&
        video.currentTime < video.seekable.start(0);

      if (
        isOutsideSeekable &&
        livePos &&
        Number.isFinite(livePos) &&
        livePos > 0
      ) {
        video.currentTime = livePos;
        setIsAtLiveEdge(true);
        setLiveLatency(0);
      }

      safePlay();
      triggerActionFeedback("play");
      resetControlsTimeout();
    }
  }, [
    isPlaying,
    safePause,
    safePlay,
    resetControlsTimeout,
    setShowControls,
    triggerActionFeedback,
    videoRef,
  ]);

  const handleSwitchServer = useCallback(
    (direction: "next" | "prev") => {
      if (availableServers.length <= 1) return;
      fallbackCountRef.current = 0;
      const currentIdx = availableServers.findIndex(
        (s) =>
          toCanonicalSourceUrl(s.url) ===
          toCanonicalSourceUrl(currentServer?.url),
      );
      let targetAvailableIdx = 0;
      if (currentIdx !== -1) {
        targetAvailableIdx =
          direction === "next"
            ? (currentIdx + 1) % availableServers.length
            : (currentIdx - 1 + availableServers.length) %
              availableServers.length;
      } else {
        targetAvailableIdx =
          direction === "next" ? 0 : availableServers.length - 1;
      }
      const targetServer = availableServers[targetAvailableIdx];
      if (!targetServer) return;

      const targetIdx = servers.findIndex(
        (s) =>
          toCanonicalSourceUrl(s.url) ===
          toCanonicalSourceUrl(targetServer.url),
      );
      if (targetIdx === -1) return;

      isStoppedRef.current = false;
      useProxyFallbackRef.current = false;
      setUseProxyFallback(false);
      lastLoadedUrlRef.current = "";
      setHasError(false);
      setErrorMessage("");
      setIsLoading(true);
      setSelectedServerIndex(targetIdx);
      setRetryNonce((prev) => prev + 1);
      const q = getSourceQuality(targetServer);
      const qBadge = q ? ` [${q}]` : "";
      const displayLabel = parseServerDisplayLabel(targetServer, targetIdx);
      triggerActionFeedback("server", `${displayLabel}${qBadge}`);
    },
    [availableServers, currentServer?.url, servers, triggerActionFeedback],
  );

  const handleSelectServerOption = useCallback(
    (
      server: StreamServer,
      options?: {
        feedbackText?: string;
        bumpRetryNonce?: boolean;
        onDone?: () => void;
      },
    ) => {
      const isSelected =
        toCanonicalSourceUrl(currentServer?.url) ===
        toCanonicalSourceUrl(server.url);
      if (isSelected && isPlayingRef.current && !hasError) {
        scrollToPlayer();
        options?.onDone?.();
        return;
      }
      const origIdx = servers.findIndex(
        (srv) =>
          toCanonicalSourceUrl(srv.url) === toCanonicalSourceUrl(server.url),
      );
      const targetIdx = origIdx !== -1 ? origIdx : 0;
      userSelectedServerRef.current = true;
      fallbackCountRef.current = 0;
      isStoppedRef.current = false;
      useProxyFallbackRef.current = false;
      setUseProxyFallback(false);
      lastLoadedUrlRef.current = "";
      setHasError(false);
      setErrorMessage("");
      setIsLoading(true);
      setSelectedServerIndex(targetIdx);
      if (options?.bumpRetryNonce) {
        setRetryNonce((prev) => prev + 1);
      }
      if (options?.feedbackText) {
        triggerActionFeedback("server", options.feedbackText);
      }
      options?.onDone?.();
    },
    [currentServer?.url, hasError, scrollToPlayer, servers, triggerActionFeedback],
  );

  return {
    hlsRef,
    userPausedRef,
    activeMatchId,
    selectedServerIndex,
    isLoading,
    hasError,
    errorMessage,
    isIframe,
    isAtLiveEdge,
    setIsAtLiveEdge,
    setLiveLatency,
    availableServers,
    sortedAvailableServers,
    currentServer,
    currentAvailableIdx,
    safePlay,
    handleRetry,
    goToLiveEdge,
    togglePlay,
    handleSwitchServer,
    handleSelectServerOption,
  };
}

