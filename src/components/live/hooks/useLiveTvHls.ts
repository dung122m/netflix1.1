"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type RefObject,
  type MutableRefObject,
} from "react";
import Hls from "hls.js";
import type { TvChannel } from "@/services/live/tv/service";
import {
  TV_STREAM_PROXY_ENDPOINT,
  buildTvCandidateUrls,
} from "@/services/live/tv/streamUrlHelper";
import type { LiveActionFeedback } from "../LiveSeekOverlay";

export interface UseLiveTvHlsOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  userPausedRef: MutableRefObject<boolean>;
  selectedTvChannel: TvChannel | null;
  setSelectedTvChannel: (channel: TvChannel | null) => void;
  isActive: boolean;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
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
}

/**
 * Manages HLS playback lifecycle, candidate/proxy fallback,
 * tab visibility teardown, latency tracking, live-edge jump, and play/pause for Live TV.
 */
export function useLiveTvHls({
  videoRef,
  userPausedRef,
  selectedTvChannel,
  setSelectedTvChannel,
  isActive,
  isPlaying,
  setIsPlaying,
  volumeRef,
  userMutedRef,
  isMutedRef,
  setIsMuted,
  setIsPip,
  setShowControls,
  resetControlsTimeout,
  triggerActionFeedback,
}: UseLiveTvHlsOptions) {
  const hlsRef = useRef<Hls | null>(null);
  const lastLoadedUrlRef = useRef<string>("");
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playbackSessionIdRef = useRef<number>(0);

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isAtLiveEdge, setIsAtLiveEdge] = useState<boolean>(true);
  const [liveLatency, setLiveLatency] = useState<number>(0);

  // Xử lý khi tab thay đổi (isActive true/false) hoặc minimize tab - Cleanup triệt để tránh rò rỉ RAM
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!isActive) {
      video.pause();
      video.removeAttribute("src");
      video.load();
      setIsPlaying(false);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      lastLoadedUrlRef.current = "";
      if (
        typeof document !== "undefined" &&
        document.pictureInPictureElement === video
      ) {
        document.exitPictureInPicture().catch(() => {});
        setIsPip(false);
      }
    }
  }, [isActive, setIsPip, setIsPlaying, videoRef]);

  // Bắt sự kiện timeupdate để phát hiện độ trễ so với Live Edge (throttle 1s + bỏ qua nếu giá trị không đổi)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let lastLatencySyncAt = 0;

    const handleTimeUpdate = () => {
      const now = Date.now();
      if (now - lastLatencySyncAt < 1000) return;
      lastLatencySyncAt = now;

      const hls = hlsRef.current;
      if (
        hls &&
        hls.liveSyncPosition &&
        Number.isFinite(hls.liveSyncPosition)
      ) {
        const drift = Math.max(
          0,
          Math.round(hls.liveSyncPosition - video.currentTime),
        );
        const atEdge = drift <= 4;
        setLiveLatency((prev) => (prev === drift ? prev : drift));
        setIsAtLiveEdge((prev) => (prev === atEdge ? prev : atEdge));
      } else {
        setIsAtLiveEdge((prev) => (prev ? prev : true));
        setLiveLatency((prev) => (prev === 0 ? prev : 0));
      }
    };

    const handleSeeked = () => {
      lastLatencySyncAt = 0;
      handleTimeUpdate();
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("seeked", handleSeeked);
    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("seeked", handleSeeked);
    };
  }, [videoRef]);

  // Khởi tạo luồng phát HLS với Resilient Fallback Engine + Session ID Guard + Clean Teardown
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedTvChannel?.url || !isActive) return;

    const sessionId = ++playbackSessionIdRef.current;

    setIsLoading(true);
    setHasError(false);
    setErrorMessage("");

    const candidateUrls = buildTvCandidateUrls(selectedTvChannel);
    let candidateIndex = 0;

    const stopAndTeardown = () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
      if (hlsRef.current) {
        try {
          hlsRef.current.stopLoad();
          hlsRef.current.detachMedia();
          hlsRef.current.destroy();
        } catch {}
        hlsRef.current = null;
      }
      if (videoRef.current) {
        try {
          videoRef.current.pause();
          videoRef.current.removeAttribute("src");
          videoRef.current.load();
        } catch {}
      }
    };

    const tryNextCandidate = (reason: string) => {
      if (playbackSessionIdRef.current !== sessionId) return;

      candidateIndex += 1;
      if (candidateIndex < candidateUrls.length) {
        console.warn(
          `[LiveTvClient] Switching to candidate source #${candidateIndex + 1} (${reason})`,
        );
        startHls(candidateUrls[candidateIndex]);
      } else {
        stopAndTeardown();
        setIsLoading(false);
        setHasError(true);
        setErrorMessage(
          "Kênh tạm thời gián đoạn hoặc tất cả nguồn phát đang bảo trì. Vui lòng bấm thử lại hoặc chọn kênh khác.",
        );
      }
    };

    const startHls = (sourceUrl: string) => {
      if (!videoRef.current || playbackSessionIdRef.current !== sessionId) return;

      stopAndTeardown();
      lastLoadedUrlRef.current = sourceUrl;

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 5,
          maxLiveSyncPlaybackRate: 1.08,
          backBufferLength: 15,
          maxBufferLength: 12,
          maxMaxBufferLength: 20,
          maxBufferSize: 15 * 1000 * 1000,
          abrEwmaDefaultEstimate: 5_000_000,
          capLevelToPlayerSize: false,
          startLevel: -1,
          manifestLoadingTimeOut: 4000,
          levelLoadingTimeOut: 4000,
          fragLoadingTimeOut: 4500,
          fragLoadingMaxRetry: 2,
          levelLoadingMaxRetry: 2,
          manifestLoadingMaxRetry: 2,
          fragLoadingMaxRetryTimeout: 1000,
          levelLoadingMaxRetryTimeout: 1000,
          xhrSetup: (xhr) => {
            xhr.withCredentials = false;
          },
        });

        hlsRef.current = hls;
        hls.loadSource(sourceUrl);
        hls.attachMedia(video);

        // Đặt timeout 7 giây cho mỗi lần thử nguồn
        loadTimeoutRef.current = setTimeout(() => {
          if (
            playbackSessionIdRef.current !== sessionId ||
            hlsRef.current !== hls
          ) {
            return;
          }
          tryNextCandidate("Timeout 7s without manifest/playback");
        }, 7000);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (playbackSessionIdRef.current !== sessionId) return;
          if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);

          hls.currentLevel = -1;
          hls.loadLevel = -1;
          hls.nextLevel = -1;
          setIsLoading(false);
          setHasError(false);
          video.volume = volumeRef.current || 0.9;
          video.muted = userMutedRef.current;

          if (isActive && !userPausedRef.current) {
            video
              .play()
              .then(() => {
                if (playbackSessionIdRef.current !== sessionId) return;
                setIsPlaying(true);
                setIsMuted(video.muted || video.volume === 0);
              })
              .catch(() => {
                if (playbackSessionIdRef.current !== sessionId) return;
                video.muted = true;
                setIsMuted(true);
                video
                  .play()
                  .then(() => {
                    if (playbackSessionIdRef.current !== sessionId) return;
                    setIsPlaying(true);
                    setIsMuted(true);
                  })
                  .catch(() => {});
              });
          }
        });

        let consecutiveFragErrors = 0;
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (playbackSessionIdRef.current !== sessionId) return;

          if (data.details === Hls.ErrorDetails.FRAG_LOAD_ERROR) {
            const status = (data.response as { code?: number })?.code;
            if (status === 403 || status === 404 || status === 410) {
              consecutiveFragErrors += 1;
              if (consecutiveFragErrors >= 2) {
                tryNextCandidate(`Segment returned HTTP ${status}`);
                return;
              }
            }
          }

          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              const status = (data.response as { code?: number })?.code;
              const isUnrecoverableHttp =
                status === 404 ||
                status === 410 ||
                (status === 403 &&
                  /fptplay\d*\.(?:net|vn)/i.test(sourceUrl) &&
                  !sourceUrl.includes("token="));

              if (
                !isUnrecoverableHttp &&
                !sourceUrl.includes(TV_STREAM_PROXY_ENDPOINT) &&
                sourceUrl.startsWith("https://")
              ) {
                const proxyUrl = `${TV_STREAM_PROXY_ENDPOINT}?url=${encodeURIComponent(sourceUrl)}`;
                if (!candidateUrls.includes(proxyUrl)) {
                  candidateUrls.splice(candidateIndex + 1, 0, proxyUrl);
                }
              }
              tryNextCandidate(
                status ? `Fatal network HTTP ${status}` : "Fatal network error",
              );
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              try {
                hls.recoverMediaError();
              } catch {
                tryNextCandidate("Media decode recovery failed");
              }
            } else {
              tryNextCandidate("Fatal HLS error");
            }
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = sourceUrl;
        video.volume = volumeRef.current;
        video.muted = isMutedRef.current;

        video.addEventListener("loadedmetadata", () => {
          if (playbackSessionIdRef.current !== sessionId) return;
          setIsLoading(false);
          setHasError(false);
          if (isActive && !userPausedRef.current) {
            video
              .play()
              .then(() => {
                if (playbackSessionIdRef.current !== sessionId) return;
                setIsPlaying(true);
              })
              .catch(() => {});
          }
        });

        video.addEventListener("error", () => {
          if (playbackSessionIdRef.current !== sessionId) return;
          tryNextCandidate("Native HLS video error");
        });
      }
    };

    if (candidateUrls.length > 0) {
      startHls(candidateUrls[0]);
    } else {
      setIsLoading(false);
      setHasError(true);
      setErrorMessage("Không tìm thấy đường truyền hợp lệ cho kênh này.");
    }

    return () => {
      playbackSessionIdRef.current += 1;
      stopAndTeardown();
    };
  }, [
    selectedTvChannel,
    isActive,
    setIsMuted,
    setIsPlaying,
    userMutedRef,
    volumeRef,
    videoRef,
    isMutedRef,
    userPausedRef,
  ]);

  const goToLiveEdge = useCallback(() => {
    const video = videoRef.current;
    const hls = hlsRef.current;
    if (!video) return;

    if (hls && hls.liveSyncPosition && Number.isFinite(hls.liveSyncPosition)) {
      video.currentTime = hls.liveSyncPosition;
      setIsAtLiveEdge(true);
      setLiveLatency(0);
      triggerActionFeedback("seek", "🔴 Về live");
      if (video.paused && !userPausedRef.current) {
        video.play().catch(() => {});
      }
    } else if (video.seekable && video.seekable.length > 0) {
      video.currentTime = Math.max(
        0,
        video.seekable.end(video.seekable.length - 1) - 1,
      );
      setIsAtLiveEdge(true);
      setLiveLatency(0);
      triggerActionFeedback("seek", "🔴 Về live");
      if (video.paused && !userPausedRef.current) {
        video.play().catch(() => {});
      }
    }
  }, [triggerActionFeedback, videoRef, userPausedRef]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      userPausedRef.current = true;
      video.pause();
      setIsPlaying(false);
      setShowControls(true);
      triggerActionFeedback("pause");
    } else {
      userPausedRef.current = false;
      const hls = hlsRef.current;
      const livePos = hls?.liveSyncPosition;

      const isOutsideSeekable =
        video.seekable &&
        video.seekable.length > 0 &&
        video.currentTime < video.seekable.start(0);
      const isCriticallyBehind =
        livePos &&
        Number.isFinite(livePos) &&
        livePos > 0 &&
        livePos - video.currentTime > 38;

      if (
        (isOutsideSeekable || isCriticallyBehind) &&
        livePos &&
        Number.isFinite(livePos) &&
        livePos > 0
      ) {
        video.currentTime = livePos;
        setIsAtLiveEdge(true);
        setLiveLatency(0);
      }

      video
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
      triggerActionFeedback("play");
      resetControlsTimeout();
    }
  }, [
    isPlaying,
    resetControlsTimeout,
    setIsPlaying,
    setShowControls,
    triggerActionFeedback,
    videoRef,
    userPausedRef,
  ]);

  const retryPlayback = useCallback(() => {
    setHasError(false);
    setIsLoading(true);
    const ch = selectedTvChannel;
    setSelectedTvChannel(null);
    setTimeout(() => setSelectedTvChannel(ch), 50);
  }, [selectedTvChannel, setSelectedTvChannel]);

  return {
    hlsRef,
    isPlaying,
    setIsPlaying,
    isLoading,
    hasError,
    errorMessage,
    isAtLiveEdge,
    setIsAtLiveEdge,
    liveLatency,
    setLiveLatency,
    goToLiveEdge,
    togglePlay,
    retryPlayback,
  };
}
