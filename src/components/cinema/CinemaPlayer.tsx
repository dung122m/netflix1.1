"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { useWatchController } from "@/components/cinema/WatchController";
import { getWatchProgress } from "@/lib/watchHistory";
import { formatEpisodeName } from "@/lib/formatEpisode";
import { useAuth } from "@/context/AuthContext";
import { updatePlayerSettings } from "@/services/userService";
import { useWatchTimeHeartbeat } from "@/components/cinema/hooks/useWatchTimeHeartbeat";
import {
  type EpisodeItem,
  extractYoutubeEmbedSrc,
  isCinemaEmbedBroken,
  resolveActiveEpisode,
  resolveActiveIframeSrc,
  resolveAdjacentEpisode,
  resolveCinemaM3u8,
  resolveEpisodeStreams,
  resolveTrailerEmbedSrc,
} from "@/components/cinema/cinemaStreamHelpers";
import { useCinemaCoreState } from "@/components/cinema/hooks/useCinemaCoreState";
import { useCinemaOsdAndControls } from "@/components/cinema/hooks/useCinemaOsdAndControls";
import { useCinemaFullscreenAndOrientation } from "@/components/cinema/hooks/useCinemaFullscreenAndOrientation";
import { useCinemaPlayerActions } from "@/components/cinema/hooks/useCinemaPlayerActions";
import { useCinemaHlsEngine } from "@/components/cinema/hooks/useCinemaHlsEngine";
import { useCinemaNextEpisodeAndHandoff } from "@/components/cinema/hooks/useCinemaNextEpisodeAndHandoff";
import { useCinemaVideoEvents } from "@/components/cinema/hooks/useCinemaVideoEvents";
import { useCinemaShortcuts } from "@/components/cinema/hooks/useCinemaShortcuts";
import {
  CinemaFullscreenStyles,
  CinemaIframeOrFallbackStage,
  CinemaNativeVideoStage,
} from "@/components/cinema/CinemaPlayerOverlays";

export interface CinemaPlayerProps {
  embedSrc?: string;
  videoLink?: string;
  m3u8Link?: string;
  trailerUrl?: string | null;
  title: string;
  movieSlug?: string;
  activeEpisodeName?: string;
  activeEpisodeSlug?: string;
  isTrailerOnly: boolean;
  posterUrl: string;
  thumbUrl?: string;
  episodes?: EpisodeItem[];
  initialTime?: number;
}

export const CinemaPlayer: React.FC<CinemaPlayerProps> = ({
  embedSrc: propEmbedSrc,
  videoLink: propVideoLink,
  m3u8Link: propM3u8Link,
  trailerUrl,
  title: propTitle,
  movieSlug: propMovieSlug,
  activeEpisodeName: propActiveEpisodeName,
  activeEpisodeSlug: propActiveEpisodeSlug,
  isTrailerOnly: propIsTrailerOnly,
  posterUrl,
  thumbUrl: propThumbUrl,
  episodes: propEpisodes,
  initialTime,
}) => {
  const watchContext = useWatchController();
  const resolvedThumb = watchContext?.thumbUrl || propThumbUrl;
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const title = watchContext?.movieTitle || propTitle;
  const movieSlug = watchContext?.movieSlug || propMovieSlug;
  const isTrailerOnly = watchContext?.isTrailerOnly ?? propIsTrailerOnly;
  const episodes = useMemo(
    () => watchContext?.episodes || propEpisodes || [],
    [watchContext?.episodes, propEpisodes],
  );
  const activeEpisodeSlug =
    watchContext?.activeEpisodeSlug || propActiveEpisodeSlug;
  const activeEpisode = resolveActiveEpisode(
    episodes,
    watchContext?.activeEpisode,
    activeEpisodeSlug,
  );
  const activeEpisodeName = activeEpisode?.name || propActiveEpisodeName;

  const { m3u8Link, embedSrc, videoLink } = resolveEpisodeStreams({
    activeEpisode,
    propActiveEpisodeSlug,
    activeEpisodeSlug,
    propM3u8Link,
    propEmbedSrc,
    propVideoLink,
  });

  const switchEpisode = watchContext?.switchEpisode;
  const effectivePrevEpisode = useMemo(
    () =>
      resolveAdjacentEpisode(
        watchContext?.prevEpisode,
        episodes,
        activeEpisodeSlug,
        activeEpisode?.slug,
        -1,
      ),
    [watchContext?.prevEpisode, episodes, activeEpisodeSlug, activeEpisode?.slug],
  );
  const effectiveNextEpisode = useMemo(
    () =>
      resolveAdjacentEpisode(
        watchContext?.nextEpisode,
        episodes,
        activeEpisodeSlug,
        activeEpisode?.slug,
        1,
      ),
    [watchContext?.nextEpisode, episodes, activeEpisodeSlug, activeEpisode?.slug],
  );

  const {
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
  } = useCinemaCoreState({
    userId: user?.uid,
    contextTheaterMode: watchContext?.isTheaterMode,
    setContextTheaterMode: watchContext?.setIsTheaterMode,
  });

  const {
    showControls,
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
    hideControlsImmediately,
    forceShowControls,
  } = useCinemaOsdAndControls({
    videoRef,
    isPlaying,
    pendingKeyboardSeekRef,
  });

  const trailerEmbedSrc = useMemo(
    () => resolveTrailerEmbedSrc(videoLink, trailerUrl),
    [videoLink, trailerUrl],
  );
  const fallbackTrailerEmbedSrc = useMemo(
    () => extractYoutubeEmbedSrc(trailerUrl),
    [trailerUrl],
  );
  const [forceTrailerFallback, setForceTrailerFallback] = useState(false);

  useEffect(() => {
    setForceTrailerFallback(false);
  }, [movieSlug, activeEpisodeSlug, watchContext?.currentServerIndex]);

  const resolvedM3u8 = useMemo(
    () => resolveCinemaM3u8(m3u8Link, embedSrc, videoLink),
    [m3u8Link, embedSrc, videoLink],
  );

  const [initialEpisodeSlug] = useState<string | undefined>(activeEpisodeSlug);
  const [initialTimeUsed, setInitialTimeUsed] = useState<boolean>(false);
  const [initialLoadedEpisode, setInitialLoadedEpisode] = useState<
    string | undefined
  >(activeEpisodeSlug);

  useEffect(() => {
    if (!initialLoadedEpisode && activeEpisodeSlug) {
      setInitialLoadedEpisode(activeEpisodeSlug);
    }
  }, [activeEpisodeSlug, initialLoadedEpisode]);

  const urlParamT = searchParams?.get("t");
  const targetProgress = useMemo(() => {
    const effectiveInitialSlug = initialEpisodeSlug || initialLoadedEpisode;
    const isInitialEpisode =
      !effectiveInitialSlug || activeEpisodeSlug === effectiveInitialSlug;
    if (isInitialEpisode && !initialTimeUsed) {
      if (typeof initialTime === "number" && initialTime > 0) return initialTime;
      if (urlParamT) {
        const parsed = parseFloat(urlParamT);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
      if (typeof window !== "undefined") {
        try {
          const urlObj = new URL(window.location.href);
          const tVal = urlObj.searchParams.get("t");
          if (tVal) {
            const parsed = parseFloat(tVal);
            if (!isNaN(parsed) && parsed > 0) return parsed;
          }
        } catch {}
      }
    }
    const currentMovieSlug = watchContext?.movieSlug || propMovieSlug;
    const savedProgress =
      currentMovieSlug && activeEpisodeSlug
        ? getWatchProgress(currentMovieSlug, activeEpisodeSlug)
        : 0;
    return savedProgress > 3 ? savedProgress : 0;
  }, [
    initialTime,
    urlParamT,
    watchContext?.movieSlug,
    propMovieSlug,
    activeEpisodeSlug,
    initialEpisodeSlug,
    initialLoadedEpisode,
    initialTimeUsed,
  ]);

  const activeSrc = useMemo(() => {
    if (forceTrailerFallback && fallbackTrailerEmbedSrc) {
      return fallbackTrailerEmbedSrc;
    }
    return resolveActiveIframeSrc({
      videoLink,
      embedSrc,
      trailerEmbedSrc,
      targetProgress,
      resolvedM3u8,
    });
  }, [
    forceTrailerFallback,
    fallbackTrailerEmbedSrc,
    videoLink,
    embedSrc,
    trailerEmbedSrc,
    targetProgress,
    resolvedM3u8,
  ]);

  const isEmbedBroken = isCinemaEmbedBroken(embedSrc);
  const isResolvingStream = Boolean(watchContext?.isResolvingStream);
  const isConnectingStream = Boolean(isResolvingStream || resolvedM3u8);
  const isNativeVideo = Boolean(
    resolvedM3u8 && (!useIframeFallback || isEmbedBroken),
  );

  useWatchTimeHeartbeat({
    userId: user?.uid,
    isNativeVideo,
    videoRef,
  });

  const {
    isFullscreen,
    isMobile,
    sentinelRef,
    isMobileStickyActive,
    toggleFullscreen,
    togglePiP,
    scrollToPlayer,
  } = useCinemaFullscreenAndOrientation({
    containerRef,
    videoRef,
    isNativeVideo,
    isPlaying,
    activeSrc,
    m3u8Link,
    showHud,
    resetControlsTimeout,
  });

  const {
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
  } = useCinemaPlayerActions({
    userId: user?.uid,
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
  });

  useCinemaHlsEngine({
    videoRef,
    hlsRef,
    loadedSourceKeyRef,
    resolvedM3u8,
    embedSrc,
    useIframeFallback,
    setUseIframeFallback,
    activeEpisodeSlug,
    contextMovieSlug: watchContext?.movieSlug,
    currentServerIndex: watchContext?.currentServerIndex,
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
  });

  const {
    showNextEpCountdown,
    nextEpCountdown,
    isNextEpDismissedRef,
    nextEpCountdownTimerRef,
    setShowNextEpCountdown,
    setNextEpCountdown,
    handlePlayNextEpisode,
    handleDismissNextEpisode,
  } = useCinemaNextEpisodeAndHandoff({
    videoRef,
    userId: user?.uid,
    movieSlug,
    contextMovieSlug: watchContext?.movieSlug,
    propMovieSlug,
    activeEpisodeSlug,
    activeEpisodeName,
    effectiveNextEpisode,
    switchEpisode,
    title,
    posterUrl,
    resolvedThumb,
    initialTime,
    urlParamT,
    showHud,
    requestPlayerSeek,
  });

  useCinemaVideoEvents({
    videoRef,
    userId: user?.uid,
    movieSlug,
    contextMovieSlug: watchContext?.movieSlug,
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
  });

  useCinemaShortcuts({
    containerRef,
    videoRef,
    pendingKeyboardSeekRef,
    singleTapTimerRef,
    automatedAdSkipRef,
    isNativeVideo,
    isFullscreen,
    volume,
    setIsMuted,
    setIsTheaterMode,
    effectivePrevEpisode,
    effectiveNextEpisode,
    switchEpisode,
    togglePlayPause,
    toggleFullscreen,
    handleVolumeDelta,
    triggerVolumeOsd,
    showHud,
    resetControlsTimeout,
    triggerDesktopFeedback,
    getEffectiveDuration,
    requestPlayerSeek,
  });

  return (
    <>
      {/* Sentinel for sticky intersection */}
      <div ref={sentinelRef} className="w-full h-1 pointer-events-none" />

      {/* STICKY PLACEHOLDER */}
      {isMobileStickyActive && (
        <div className="w-full aspect-video md:hidden" aria-hidden="true" />
      )}

      {/* KHUNG PHÁT VIDEO CHÍNH */}
      <div
        ref={containerRef}
        tabIndex={0}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`w-full mx-auto transition-all duration-300 outline-none focus:outline-none focus-visible:outline-none ${
          isFullscreen
            ? "fixed inset-0 z-[80] w-full h-full max-w-none p-0 m-0 bg-black flex flex-col justify-center overflow-hidden"
            : isMobileStickyActive
            ? "fixed top-[51px] sm:top-[55px] left-0 right-0 z-40 shadow-2xl border-b border-white/[0.08] bg-black md:relative md:top-auto"
            : "relative z-20 bg-transparent"
        } ${
          isTheaterMode && !isFullscreen
            ? "max-w-none px-0 sm:px-0"
            : isFullscreen
            ? ""
            : "max-w-7xl"
        }`}
      >
        {isMobileStickyActive && (
          <div className="md:hidden bg-gradient-to-r from-zinc-950 via-zinc-900 to-black px-3 h-8 flex items-center justify-between border-b border-white/[0.08] text-xs">
            <div className="flex items-center gap-1.5 min-w-0 pr-2">
              <span className="w-2 h-2 rounded-full bg-netflix-red animate-pulse flex-shrink-0" />
              <span className="text-white font-bold text-[11px] truncate">
                {title}{" "}
                {activeEpisodeName
                  ? `• ${formatEpisodeName(activeEpisodeName)}`
                  : ""}
              </span>
            </div>
            <button
              type="button"
              onClick={scrollToPlayer}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 text-zinc-200 hover:text-white text-[10px] font-semibold transition cursor-pointer"
            >
              <ArrowUpRight className="w-3 h-3" />
              <span>Lên đầu</span>
            </button>
          </div>
        )}

        <div className="ambient-cinema-glow opacity-80" aria-hidden="true" />

        <div
          className={`cinema-video-wrapper w-full bg-zinc-950 relative overflow-hidden transition-all duration-300 z-10 mx-auto select-none group ${
            isFullscreen
              ? "w-full h-full max-h-dvh rounded-none border-none shadow-none aspect-auto"
              : isMobileStickyActive
              ? "aspect-video rounded-none max-h-[38dvh] shadow-2xl"
              : isTheaterMode
              ? "aspect-video w-full rounded-xl sm:rounded-2xl md:rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.85)] max-h-[calc(100dvh-185px)]"
              : "aspect-video rounded-xl sm:rounded-2xl md:rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.55)] max-md:landscape:rounded-none max-md:landscape:border-none"
          }`}
        >
          {isNativeVideo ? (
            <CinemaNativeVideoStage
              videoRef={videoRef}
              isFullscreen={isFullscreen}
              isPlaying={isPlaying}
              isMobile={isMobile}
              showControls={showControls}
              videoFit={videoFit}
              isAdTransitioning={isAdTransitioning}
              desktopFeedback={desktopFeedback}
              volumeOsd={volumeOsd}
              hudNotification={hudNotification}
              isBuffering={isBuffering}
              isMuted={isMuted}
              volume={volume}
              playbackSpeed={playbackSpeed}
              qualityLevels={qualityLevels}
              currentQualityIndex={currentQualityIndex}
              isNativeVideo={isNativeVideo}
              knownDuration={knownDuration}
              embedSrc={embedSrc}
              title={title}
              activeEpisodeName={activeEpisodeName}
              effectivePrevEpisode={effectivePrevEpisode}
              effectiveNextEpisode={effectiveNextEpisode}
              isTheaterMode={isTheaterMode}
              autoNextEpisode={playerSettings.autoNextEpisode !== false}
              autoSubtitle={playerSettings.autoSubtitle !== false}
              showNextEpCountdown={showNextEpCountdown}
              posterUrl={posterUrl}
              nextEpCountdown={nextEpCountdown}
              onDoubleClick={handleVideoDoubleClick}
              onClick={handleVideoClick}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onTogglePlayPause={togglePlayPause}
              onSeekFeedback={handleSeekFeedbackControl}
              onToggleMute={handleToggleMuteControl}
              onVolumeChange={handleVolumeChangeControl}
              onSpeedChange={(spd) => {
                handleSpeedChange(spd);
                resetControlsTimeout();
              }}
              onQualityChange={(lvl) => {
                handleQualityChange(lvl);
                resetControlsTimeout();
              }}
              onVideoFitChange={(fit) => {
                handleVideoFitChange(fit);
                resetControlsTimeout();
              }}
              onTogglePiP={togglePiP}
              onUseIframeFallback={() => setUseIframeFallback(true)}
              onToggleTheaterMode={() => {
                setIsTheaterMode((prev) => {
                  const next = !prev;
                  updatePlayerSettings(user?.uid, { defaultTheaterMode: next });
                  return next;
                });
              }}
              onToggleFullscreen={toggleFullscreen}
              onSwitchEpisode={(slug) => {
                if (switchEpisode) switchEpisode(slug);
              }}
              onUserInteraction={resetControlsTimeout}
              onSeek={requestPlayerSeek}
              onToggleAutoNextEpisode={() => {
                const nextVal = playerSettings.autoNextEpisode === false;
                updatePlayerSettings(user?.uid, { autoNextEpisode: nextVal });
              }}
              onToggleAutoSubtitle={() => {
                const nextVal = playerSettings.autoSubtitle === false;
                updatePlayerSettings(user?.uid, { autoSubtitle: nextVal });
              }}
              onPlayNextEpisode={handlePlayNextEpisode}
              onDismissNextEpisode={handleDismissNextEpisode}
            />
          ) : (
            <CinemaIframeOrFallbackStage
              iframeRef={iframeRef}
              activeSrc={activeSrc}
              activeEpisodeSlug={activeEpisodeSlug}
              currentServerIndex={watchContext?.currentServerIndex}
              videoLink={videoLink}
              activeEpisodeName={activeEpisodeName}
              title={title}
              trailerEmbedSrc={trailerEmbedSrc}
              showControls={showControls}
              isPlaying={isPlaying}
              m3u8Link={m3u8Link}
              useIframeFallback={useIframeFallback}
              posterUrl={posterUrl}
              isConnectingStream={isConnectingStream}
              isTrailerOnly={isTrailerOnly}
              canPlayFallbackTrailer={Boolean(fallbackTrailerEmbedSrc)}
              isPlayingTrailer={Boolean(
                (!videoLink && trailerEmbedSrc) ||
                  (forceTrailerFallback && fallbackTrailerEmbedSrc),
              )}
              onPlayFallbackTrailer={() => setForceTrailerFallback(true)}
              onRestoreNativeHls={() => setUseIframeFallback(false)}
            />
          )}
        </div>
      </div>

      <CinemaFullscreenStyles />
    </>
  );
};

export default CinemaPlayer;
