"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import type { LiveTvData } from "@/services/live/tv/service";
import { useMediaFullscreen } from "./hooks/useMediaFullscreen";
import { useMediaVolume } from "./hooks/useMediaVolume";
import { useControlsAutoHide } from "./hooks/useControlsAutoHide";
import { useDvrSeek } from "./hooks/useDvrSeek";
import { useLiveTvFilters } from "./hooks/useLiveTvFilters";
import { useLiveTvHls } from "./hooks/useLiveTvHls";
import type { LiveActionFeedback } from "./LiveSeekOverlay";
import { LiveTvCinemaPlayer } from "./LiveTvCinemaPlayer";
import { LiveTvChannelBrowser } from "./LiveTvChannelBrowser";
import { TvChannelLogo, getPageNumbers } from "./TvChannelLogo";
import { TvChannelDrawer } from "./TvChannelDrawer";
import { TvChannelGrid } from "./TvChannelGrid";

export { TvChannelLogo, getPageNumbers, TvChannelDrawer, TvChannelGrid };

interface LiveTvClientProps {
  initialData: LiveTvData;
  isActive?: boolean;
}

export function LiveTvClient({
  initialData,
  isActive = true,
}: LiveTvClientProps) {
  const { categories, channels } = initialData;

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const channelGridTopRef = useRef<HTMLDivElement>(null);
  const userPausedRef = useRef<boolean>(false);
  const actionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeTvChannelRef = useRef<HTMLButtonElement | null>(null);
  const drawerListRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [showChannelRail, setShowChannelRail] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isMobileScreen, setIsMobileScreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionFeedback, setActionFeedback] =
    useState<LiveActionFeedback | null>(null);

  const {
    volume,
    setVolume,
    isMuted,
    setIsMuted,
    volumeRef,
    userMutedRef,
    volumeOsd,
    handleVolumeChange,
    triggerVolumeOsd,
  } = useMediaVolume({ videoRef });

  const {
    isFullscreen,
    isPip,
    setIsPip,
    toggleFullscreen,
    togglePip,
  } = useMediaFullscreen({ containerRef, videoRef });

  const { showControls, setShowControls, resetControlsTimeout } =
    useControlsAutoHide({
      isPlaying,
      hideDelayMs: 3500,
      initialShowControls: false,
    });

  const isMutedRef = useRef(isMuted);
  useEffect(() => {
    volumeRef.current = volume;
  }, [volume, volumeRef]);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    setIsMounted(true);
    const updateSize = () => setIsMobileScreen(window.innerWidth < 640);
    updateSize();
    window.addEventListener("resize", updateSize, { passive: true });
    return () => {
      window.removeEventListener("resize", updateSize);
      if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
    };
  }, []);

  const useMobilePortal =
    isMounted && isMobileScreen && !isFullscreen && typeof document !== "undefined";

  const triggerActionFeedback = useCallback(
    (icon: LiveActionFeedback["icon"], text?: string) => {
      if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
      setActionFeedback({ icon, text });
      actionTimeoutRef.current = setTimeout(() => {
        setActionFeedback(null);
      }, 700);
    },
    [],
  );

  const {
    selectedTvChannel,
    setSelectedTvChannel,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    onlyFhd,
    setOnlyFhd,
    viewMode,
    setViewMode,
    popularChannels,
    filteredChannels,
    totalPages,
    safePage,
    displayedChannels,
    hasActiveFilters,
    handlePageChange,
    handleSelectChannel,
    handleSwitchChannel,
    handleResetFilters,
  } = useLiveTvFilters({
    channels,
    playerRef,
    channelGridTopRef,
    onBeforeSelectChannel: () => {
      userPausedRef.current = false;
      if (!userMutedRef.current) {
        setIsMuted(false);
        isMutedRef.current = false;
      }
    },
    onCloseDrawer: () => setShowChannelRail(false),
  });

  const {
    hlsRef,
    isLoading,
    hasError,
    errorMessage,
    isAtLiveEdge,
    setIsAtLiveEdge,
    liveLatency,
    setLiveLatency,
    goToLiveEdge: rawGoToLiveEdge,
    togglePlay,
    retryPlayback,
  } = useLiveTvHls({
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
  });

  const { handleSeek, resetSeekRefs } = useDvrSeek({
    videoRef,
    hlsRef,
    isAtLiveEdge,
    setIsAtLiveEdge,
    setLiveLatency,
    goToLiveEdge: rawGoToLiveEdge,
    triggerActionFeedback,
    requireDvrWindow: false,
    fallbackWindowSec: 40,
    immediateWhenNotRapid: true,
    rapidThresholdMs: 120,
    deltaResetMs: 800,
    targetClearMs: 450,
    requireSameDirectionForDelta: false,
    updateLiveStateOnCommit: false,
  });

  const goToLiveEdge = useCallback(() => {
    resetSeekRefs();
    rawGoToLiveEdge();
  }, [resetSeekRefs, rawGoToLiveEdge]);

  // Cuộn mượt CHỈ bên trong danh sách drawer
  useEffect(() => {
    if (!showChannelRail) return;
    const rafId = requestAnimationFrame(() => {
      const container = drawerListRef.current;
      const activeEl = activeTvChannelRef.current;
      if (!container || !activeEl) return;

      const itemTop = activeEl.offsetTop - container.offsetTop;
      const itemHeight = activeEl.clientHeight;
      const containerHeight = container.clientHeight;
      const currentScrollTop = container.scrollTop;

      if (
        itemTop < currentScrollTop ||
        itemTop + itemHeight > currentScrollTop + containerHeight
      ) {
        container.scrollTo({
          top: Math.max(0, itemTop - containerHeight / 2 + itemHeight / 2),
          behavior: "smooth",
        });
      }
    });
    return () => cancelAnimationFrame(rafId);
  }, [showChannelRail, selectedTvChannel?.id]);

  const unmuteSound = useCallback(() => {
    userMutedRef.current = false;
    const targetVol = volume > 0 ? volume : 0.9;
    setVolume(targetVol);
    setIsMuted(false);
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.volume = targetVol;
      if (!userPausedRef.current && isActive) {
        videoRef.current.play().catch(() => {});
      }
    }
    triggerVolumeOsd(targetVol, false);
    try {
      localStorage.setItem("nanaflix_live_volume", String(targetVol));
    } catch {}
  }, [volume, isActive, triggerVolumeOsd, setIsMuted, setVolume, userMutedRef, userPausedRef]);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      unmuteSound();
    } else {
      userMutedRef.current = true;
      setIsMuted(true);
      if (videoRef.current) videoRef.current.muted = true;
      triggerVolumeOsd(volume, true);
    }
  }, [isMuted, volume, unmuteSound, triggerVolumeOsd, setIsMuted, userMutedRef]);

  const syncVideoVolume = useCallback(
    (v: HTMLVideoElement) => {
      const isActuallyMuted = v.muted || v.volume === 0;
      setIsMuted(isActuallyMuted);
      if (!isActuallyMuted) {
        setVolume(v.volume);
        try {
          localStorage.setItem("nanaflix_live_volume", String(v.volume));
        } catch {}
      }
    },
    [setIsMuted, setVolume],
  );

  // Phím tắt bàn phím dùng chung cho Live TV Player
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tagName =
        typeof target?.tagName === "string" ? target.tagName.toLowerCase() : "";
      if (
        ["input", "textarea", "select"].includes(tagName) ||
        Boolean(target?.isContentEditable) ||
        target?.getAttribute?.("role") === "textbox" ||
        target?.getAttribute?.("role") === "searchbox"
      ) {
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      const active = document.activeElement as HTMLElement | null;
      const activeTagName =
        typeof active?.tagName === "string" ? active.tagName.toLowerCase() : "";
      const isPlayerContainer = Boolean(
        (containerRef.current && active && containerRef.current.contains(active)) ||
          (playerRef.current && active && playerRef.current.contains(active)),
      );

      if (
        !isPlayerContainer &&
        (["input", "textarea", "select"].includes(activeTagName) ||
          (!isFullscreen && (activeTagName === "button" || activeTagName === "a")))
      ) {
        return;
      }

      if (e.code === "Space" || e.key === "Enter") {
        if (
          activeTagName === "button" ||
          activeTagName === "input" ||
          activeTagName === "a"
        ) {
          return;
        }
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleSeek(-10);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleSeek(10);
      } else if (e.key === "ArrowUp") {
        if (isFullscreen) {
          e.preventDefault();
          handleVolumeChange(volume + 0.1);
        }
      } else if (e.key === "ArrowDown") {
        if (isFullscreen) {
          e.preventDefault();
          handleVolumeChange(volume - 0.1);
        }
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleMute();
      } else if (e.key === "n" || e.key === "N" || e.key === "PageDown") {
        e.preventDefault();
        handleSwitchChannel("next");
      } else if (e.key === "p" || e.key === "P" || e.key === "PageUp") {
        e.preventDefault();
        handleSwitchChannel("prev");
      } else if (e.key === "l" || e.key === "L") {
        e.preventDefault();
        goToLiveEdge();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "i" || e.key === "I") {
        e.preventDefault();
        togglePip();
      } else if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        setShowChannelRail((visible) => !visible);
      } else if (e.key === "[" || e.key === "-") {
        e.preventDefault();
        handleVolumeChange(volume - 0.1);
      } else if (e.key === "]" || e.key === "=" || e.key === "+") {
        e.preventDefault();
        handleVolumeChange(volume + 0.1);
      } else if (e.key === "Escape") {
        if (showChannelRail) {
          e.preventDefault();
          setShowChannelRail(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isActive,
    togglePlay,
    toggleMute,
    toggleFullscreen,
    togglePip,
    goToLiveEdge,
    handleVolumeChange,
    handleSwitchChannel,
    handleSeek,
    showChannelRail,
    volume,
    isFullscreen,
  ]);

  const handleCopy = () => {
    if (selectedTvChannel && typeof navigator !== "undefined") {
      navigator.clipboard.writeText(selectedTvChannel.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const channelDrawerMarkup = (
    <TvChannelDrawer
      isOpen={showChannelRail}
      onClose={() => setShowChannelRail(false)}
      useMobilePortal={useMobilePortal}
      selectedChannel={selectedTvChannel}
      channels={filteredChannels}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onSelectChannel={(ch) => handleSelectChannel(ch, false)}
      drawerListRef={drawerListRef}
      activeChannelRef={activeTvChannelRef}
    />
  );

  return (
    <div className="space-y-3 sm:space-y-4">
      {selectedTvChannel ? (
        <LiveTvCinemaPlayer
          selectedTvChannel={selectedTvChannel}
          channels={channels}
          filteredChannels={filteredChannels}
          playerRef={playerRef}
          containerRef={containerRef}
          videoRef={videoRef}
          isPlaying={isPlaying}
          isLoading={isLoading}
          hasError={hasError}
          errorMessage={errorMessage}
          isAtLiveEdge={isAtLiveEdge}
          liveLatency={liveLatency}
          showControls={showControls}
          setShowControls={setShowControls}
          resetControlsTimeout={resetControlsTimeout}
          showChannelRail={showChannelRail}
          onToggleChannelRail={() => setShowChannelRail((prev) => !prev)}
          copied={copied}
          onCopy={handleCopy}
          isMuted={isMuted}
          volume={volume}
          volumeOsd={volumeOsd}
          onVolumeChange={handleVolumeChange}
          onToggleMute={toggleMute}
          onUnmuteSound={unmuteSound}
          onSyncVideoVolume={syncVideoVolume}
          isFullscreen={isFullscreen}
          isPip={isPip}
          onToggleFullscreen={toggleFullscreen}
          onTogglePip={togglePip}
          onTogglePlay={togglePlay}
          onSeek={handleSeek}
          onGoToLiveEdge={goToLiveEdge}
          onSwitchChannel={handleSwitchChannel}
          onRetry={retryPlayback}
          onSetIsPlaying={setIsPlaying}
          actionFeedback={actionFeedback}
          useMobilePortal={useMobilePortal}
          channelDrawerMarkup={channelDrawerMarkup}
        />
      ) : null}

      <LiveTvChannelBrowser
        channels={channels}
        categories={categories}
        popularChannels={popularChannels}
        filteredChannels={filteredChannels}
        displayedChannels={displayedChannels}
        selectedTvChannel={selectedTvChannel}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onlyFhd={onlyFhd}
        onToggleOnlyFhd={() => setOnlyFhd((prev) => !prev)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        isPlaying={isPlaying}
        safePage={safePage}
        totalPages={totalPages}
        hasActiveFilters={hasActiveFilters}
        onSelectChannel={handleSelectChannel}
        onPageChange={handlePageChange}
        onResetFilters={handleResetFilters}
        channelGridTopRef={channelGridTopRef}
      />

      <style>{`
        :fullscreen,
        :-webkit-full-screen {
          width: 100vw !important;
          height: 100dvh !important;
          max-width: 100vw !important;
          max-height: 100dvh !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #000000 !important;
          overflow: hidden !important;
          border-radius: 0 !important;
          border: none !important;
          aspect-ratio: auto !important;
        }
        :fullscreen video,
        :-webkit-full-screen video {
          width: 100% !important;
          height: 100% !important;
          max-height: 100dvh !important;
          aspect-ratio: auto !important;
          object-fit: contain !important;
        }
        :fullscreen iframe,
        :-webkit-full-screen iframe {
          width: 100% !important;
          height: 100% !important;
        }
        :fullscreen [data-live-controls],
        :-webkit-full-screen [data-live-controls] {
          position: absolute !important;
          inset-inline: 0 !important;
          bottom: 0 !important;
          z-index: 50 !important;
          padding-bottom: max(0.75rem, env(safe-area-inset-bottom, 0.75rem)) !important;
          padding-left: max(0.75rem, env(safe-area-inset-left, 0.75rem)) !important;
          padding-right: max(0.75rem, env(safe-area-inset-right, 0.75rem)) !important;
        }
        @media (hover: none), (pointer: coarse), (max-height: 550px), (max-width: 1023px) {
          .live-shortcut-popover {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default LiveTvClient;
