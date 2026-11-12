"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { RefreshCw, AlertCircle, Loader2, RotateCcw } from "lucide-react";
import { useBodyScrollLock } from "@/lib/scrollLock";
import { FootballMatch, StreamServer } from "@/services/liveFootballService";
import {
  LiveMatchScore,
  NormalizedMatchSummary,
} from "@/services/live/football-score/types";
import {
  resolveMatchDisplayStatus,
  resolveMatchTimeInfo,
} from "@/services/live/football-score/liveStatus";
import { Tooltip } from "@/components/ui/Tooltip";
import { useMediaFullscreen } from "./hooks/useMediaFullscreen";
import { useMediaVolume } from "./hooks/useMediaVolume";
import { useControlsAutoHide } from "./hooks/useControlsAutoHide";
import { useDvrSeek } from "./hooks/useDvrSeek";
import { useLivePlayerShortcuts } from "./hooks/useLivePlayerShortcuts";
import { useLiveFootballHls } from "./hooks/useLiveFootballHls";
import { VolumeOsdPill } from "./VolumeOsdPill";
import { LiveSeekOverlay, type LiveActionFeedback } from "./LiveSeekOverlay";
import { LiveSourceDrawer } from "./LiveSourceDrawer";
import { LiveMatchScoreboard } from "./LiveMatchScoreboard";
import { LivePlayerControlsBar } from "./LivePlayerControlsBar";
import { LiveServerSection } from "./LiveServerSection";
import {
  type GroupedGoalScorer,
  parseGoalScorers,
} from "@/services/live/football-score/goalScorersParser";
import {
  type LiveStallRecord,
  calculateLiveLatency,
} from "@/services/live/shared/liveBufferHelper";
import {
  getSourceQuality,
  getQualityPriorityScore,
  isSourceFailed,
  cleanPlatformName,
  parseServerDisplayLabel,
  findBestInitialServerIndex,
  findNextFallbackServerIndex,
} from "@/services/live/shared/serverSelectionHelper";
import {
  toCanonicalSourceUrl,
  extractStreamHost,
} from "@/services/live/shared/streamUrlHelper";

export type { GroupedGoalScorer, LiveStallRecord };
export {
  parseGoalScorers,
  getSourceQuality,
  getQualityPriorityScore,
  isSourceFailed,
  cleanPlatformName,
  parseServerDisplayLabel,
  findBestInitialServerIndex,
  findNextFallbackServerIndex,
  toCanonicalSourceUrl,
  extractStreamHost,
};

interface LivePlayerProps {
  match?: FootballMatch;
  title: string;
  servers: StreamServer[];
  blv?: string;
  time?: string;
  group?: string;
  team1?: string;
  team2?: string;
  isEvent?: boolean;
  homeLogo?: string;
  awayLogo?: string;
  logo?: string;
  isActive?: boolean;
  matchOptions?: FootballMatch[];
  showMatchRail?: boolean;
  onToggleMatchRail?: () => void;
  onCloseMatchRail?: () => void;
  onSelectMatch?: (match: FootballMatch) => void;
  score?: LiveMatchScore | null;
  summary?: NormalizedMatchSummary | null;
  onVideoHeightChange?: (height: number) => void;
}

function LivePlayerInner({
  match,
  title,
  servers,
  blv = match?.blv,
  time = match?.time,
  team1 = match?.team1,
  team2 = match?.team2,
  isEvent = match?.isEvent,
  homeLogo = match?.homeLogo,
  awayLogo = match?.awayLogo,
  isActive = true,
  showMatchRail = false,
  onToggleMatchRail,
  onCloseMatchRail,
  score,
  summary,
  onVideoHeightChange,
}: LivePlayerProps) {
  const currentScore = score || match?.score || null;
  const displayStatus = useMemo(
    () =>
      resolveMatchDisplayStatus({
        timestamp: match?.timestamp,
        score: currentScore,
        sourceStatus: match?.sourceStatus,
      }),
    [match?.timestamp, currentScore, match?.sourceStatus],
  );

  const isConfirmedLive = displayStatus.isConfirmedLive;
  const isFinished = displayStatus.statusType === "finished";
  const specialStatusLabel =
    displayStatus.statusType === "postponed" ||
    displayStatus.statusType === "canceled" ||
    displayStatus.statusType === "suspended"
      ? displayStatus.badgeLabel
      : null;

  const kickoffTime =
    currentScore?.kickoffTime ||
    displayStatus.kickoffTime ||
    (time && time !== "Trực tiếp" && time !== "24/7" ? time : null);

  const timeInfo = useMemo(() => {
    return resolveMatchTimeInfo({
      score: currentScore,
      displayStatus,
      kickoffTime,
      isConfirmedLive,
      isFinished,
      specialStatusLabel,
      summaryClock: summary?.displayClock,
    });
  }, [
    currentScore,
    displayStatus,
    kickoffTime,
    isConfirmedLive,
    isFinished,
    specialStatusLabel,
    summary?.displayClock,
  ]);

  const homeDisplayName =
    summary?.homeTeam?.displayName || summary?.homeTeam?.name || team1;
  const awayDisplayName =
    summary?.awayTeam?.displayName || summary?.awayTeam?.name || team2;
  const venueName = summary?.gameInfo?.venue?.name;
  const refereeName = summary?.gameInfo?.referee;

  const homeGoalScorers = useMemo(() => {
    return parseGoalScorers(
      summary?.events,
      "home",
      summary?.homeTeam?.name,
      summary?.homeTeam?.displayName,
      summary?.awayTeam?.name,
      summary?.awayTeam?.displayName,
    );
  }, [
    summary?.events,
    summary?.homeTeam?.name,
    summary?.homeTeam?.displayName,
    summary?.awayTeam?.name,
    summary?.awayTeam?.displayName,
  ]);

  const awayGoalScorers = useMemo(() => {
    return parseGoalScorers(
      summary?.events,
      "away",
      summary?.awayTeam?.name,
      summary?.awayTeam?.displayName,
      summary?.homeTeam?.name,
      summary?.homeTeam?.displayName,
    );
  }, [
    summary?.events,
    summary?.awayTeam?.name,
    summary?.awayTeam?.displayName,
    summary?.homeTeam?.name,
    summary?.homeTeam?.displayName,
  ]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const actionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeOptionRef = useRef<HTMLButtonElement | null>(null);
  const drawerListRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [internalMatchRail, setInternalMatchRail] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isMobileScreen, setIsMobileScreen] = useState(false);
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

  const { isFullscreen, isPip, setIsPip, toggleFullscreen, togglePip } =
    useMediaFullscreen({ containerRef, videoRef });

  const isRailVisible =
    showMatchRail !== undefined ? showMatchRail : internalMatchRail;

  const { showControls, setShowControls, resetControlsTimeout } =
    useControlsAutoHide({
      isPlaying,
      preventHide: isRailVisible,
      hideDelayMs: 2500,
      initialShowControls: false,
    });

  const isMutedRef = useRef(isMuted);

  // Đồng bộ chiều cao video container sang Side Panel trên desktop
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !onVideoHeightChange) return;

    const handleResize = () => {
      if (typeof window !== "undefined" && window.innerWidth >= 1024) {
        onVideoHeightChange(el.offsetHeight);
      }
    };

    handleResize();
    const ro = new ResizeObserver(handleResize);
    ro.observe(el);
    window.addEventListener("resize", handleResize);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [onVideoHeightChange, match?.id]);

  const scrollToPlayer = useCallback(() => {
    if (typeof window === "undefined") return;
    const headerEl = document.getElementById("live-player-header");
    const target = headerEl || containerRef.current;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    if (rect.top < 56) {
      const offset = headerEl
        ? window.innerWidth >= 640
          ? 64
          : 58
        : window.innerWidth >= 640
          ? 76
          : 68;
      const targetY = window.scrollY + rect.top - offset;
      window.scrollTo({
        top: Math.max(0, targetY),
        behavior: "smooth",
      });
    }
  }, []);

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

  const toggleRail = useCallback(() => {
    if (onToggleMatchRail) {
      onToggleMatchRail();
    } else {
      setInternalMatchRail((prev) => !prev);
    }
  }, [onToggleMatchRail]);

  const closeRail = useCallback(() => {
    if (onCloseMatchRail) {
      onCloseMatchRail();
    } else {
      setInternalMatchRail(false);
    }
  }, [onCloseMatchRail]);

  useEffect(() => {
    if (!isRailVisible) return;
    const rafId = requestAnimationFrame(() => {
      const container = drawerListRef.current;
      const activeEl = activeOptionRef.current;
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
  }, [isRailVisible, match?.id]);

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

  // Chặn các lỗi Unhandled Rejection do browser extensions tiêm vào
  useEffect(() => {
    const isExtensionError = (err: unknown, reason: unknown) => {
      const errObj =
        typeof err === "object" && err !== null
          ? (err as { stack?: string; message?: string })
          : null;
      const reasonObj =
        typeof reason === "object" && reason !== null
          ? (reason as { stack?: string; message?: string })
          : null;
      const reasonStr = typeof reason === "string" ? reason : "";
      const str = `${errObj?.stack || errObj?.message || ""} ${reasonObj?.stack || reasonObj?.message || reasonStr}`;
      return (
        str.includes("chrome-extension://") ||
        str.includes("moz-extension://") ||
        str.includes("safari-extension://") ||
        str.includes("M_ID")
      );
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isExtensionError(event.reason, event.reason)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    const handleError = (event: ErrorEvent) => {
      if (
        isExtensionError(event.error, event.message) ||
        (event.filename && event.filename.includes("-extension://"))
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    window.addEventListener(
      "unhandledrejection",
      handleUnhandledRejection,
      true,
    );
    window.addEventListener("error", handleError, true);

    return () => {
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
        true,
      );
      window.removeEventListener("error", handleError, true);
    };
  }, []);

  // Đồng bộ volume & muted sang video element
  useEffect(() => {
    volumeRef.current = volume;
    isMutedRef.current = isMuted;
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted, volumeRef]);

  const {
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
    goToLiveEdge: rawGoToLiveEdge,
    togglePlay,
    handleSwitchServer,
    handleSelectServerOption,
  } = useLiveFootballHls({
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
  });

  const { handleSeek, resetSeekRefs } = useDvrSeek({
    videoRef,
    hlsRef,
    isAtLiveEdge,
    setIsAtLiveEdge,
    setLiveLatency,
    goToLiveEdge: rawGoToLiveEdge,
    triggerActionFeedback,
    requireDvrWindow: true,
    minBufferOffsetSec: 1.5,
    maxEdgeOffsetSec: 1.0,
    snapToLiveThresholdSec: 2,
    liveEdgeThresholdSec: 4,
    deltaResetMs: 1100,
    targetClearMs: 500,
  });

  const goToLiveEdge = useCallback(() => {
    resetSeekRefs();
    rawGoToLiveEdge();
  }, [resetSeekRefs, rawGoToLiveEdge]);

  const unmuteSound = useCallback(() => {
    userMutedRef.current = false;
    const targetVol = volume > 0 ? volume : 0.9;
    setVolume(targetVol);
    setIsMuted(false);
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.volume = targetVol;
      if (!userPausedRef.current && isActive) {
        safePlay();
      }
    }
    triggerVolumeOsd(targetVol, false);
    try {
      localStorage.setItem("nanaflix_live_volume", String(targetVol));
    } catch {}
  }, [
    volume,
    isActive,
    safePlay,
    triggerVolumeOsd,
    setIsMuted,
    setVolume,
    userMutedRef,
    userPausedRef,
  ]);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      const targetVol = volume > 0 ? volume : 0.9;
      unmuteSound();
      triggerVolumeOsd(targetVol, false);
    } else {
      userMutedRef.current = true;
      setIsMuted(true);
      if (videoRef.current) {
        videoRef.current.muted = true;
      }
      triggerVolumeOsd(volume, true);
    }
  }, [isMuted, volume, unmuteSound, triggerVolumeOsd, setIsMuted, userMutedRef]);

  useLivePlayerShortcuts({
    isActive,
    containerRef,
    isFullscreen,
    volume,
    isRailVisible,
    togglePlay,
    toggleMute,
    toggleFullscreen,
    togglePip,
    goToLiveEdge,
    handleVolumeChange,
    handleSwitchServer,
    handleSeek,
    toggleRail,
    closeRail,
  });

  const handleCopyStream = useCallback(() => {
    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      currentServer
    ) {
      navigator.clipboard.writeText(currentServer.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [currentServer]);

  const isPreKickoff = useMemo(() => {
    const ts = match?.timestamp;
    const hasValidTimestamp =
      typeof ts === "number" && ts > 0 && ts !== Number.MAX_SAFE_INTEGER;
    if (hasValidTimestamp) {
      return Date.now() < ts;
    }
    return match?.timeline === "upcoming";
  }, [match?.timestamp, match?.timeline]);

  useBodyScrollLock(Boolean(isRailVisible && useMobilePortal));

  const sourceDrawerMarkup = (
    <LiveSourceDrawer
      serversCount={servers?.length || 0}
      sortedAvailableServers={sortedAvailableServers}
      currentServer={currentServer}
      isRailVisible={isRailVisible}
      useMobilePortal={useMobilePortal}
      title={title}
      isPlaying={isPlaying}
      isLoading={isLoading}
      hasError={hasError}
      drawerListRef={drawerListRef}
      activeOptionRef={activeOptionRef}
      onCloseRail={closeRail}
      onRetry={handleRetry}
      onSelectServer={(s, displayLabel, quality) =>
        handleSelectServerOption(s, {
          feedbackText: `${quality ? `[${quality}] ` : ""}${displayLabel}`,
          onDone: closeRail,
        })
      }
    />
  );

  return (
    <div className="space-y-2.5 sm:space-y-3">
      {/* 1. KHUNG PHÁT VIDEO CHÍNH */}
      <div
        ref={containerRef}
        tabIndex={0}
        onMouseMove={resetControlsTimeout}
        onFocus={() => {
          setShowControls(true);
          resetControlsTimeout();
        }}
        onClick={() => {
          if (!showControls) {
            setShowControls(true);
            resetControlsTimeout();
            return;
          }
          setShowControls(false);
        }}
        onDoubleClick={toggleFullscreen}
        className={`relative w-full mx-auto bg-black transition-all duration-300 group select-none outline-none focus:outline-none focus-visible:outline-none contain-paint isolate ${
          isFullscreen
            ? "fixed inset-0 z-50 w-full h-full max-w-none max-h-none rounded-none aspect-auto -none shadow-none p-0 m-0 overflow-hidden flex flex-col justify-center"
            : "aspect-video lg:max-h-[calc(100dvh-210px)] lg:max-w-[calc((100dvh-210px)*16/9)] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl"
        } ${isFullscreen && isPlaying && !showControls ? "cursor-none" : "cursor-default"}`}
      >
        {isIframe ? (
          <iframe
            src={currentServer?.url}
            title={title}
            className="w-full h-full object-contain bg-black"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : (
          <video
            ref={videoRef}
            className="w-full h-full object-contain pointer-events-none bg-black transform-gpu will-change-transform"
            playsInline
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              const hls = hlsRef.current;
              const { latencySec, isLive } = calculateLiveLatency(v, hls);
              setLiveLatency(latencySec);
              setIsAtLiveEdge(isLive);
            }}
            onVolumeChange={(e) => {
              const v = e.currentTarget;
              const isActuallyMuted = v.muted || v.volume === 0;
              setIsMuted(isActuallyMuted);
              if (!isActuallyMuted) {
                setVolume(v.volume);
                try {
                  localStorage.setItem(
                    "nanaflix_live_volume",
                    String(v.volume),
                  );
                } catch {}
              }
            }}
          />
        )}

        {/* HUY HIỆU SIGNAL & LIVE TRÊN TRÁI */}
        <div
          className={`absolute top-3 left-3 sm:top-4 sm:left-4 flex items-center gap-2 z-20 transition-opacity duration-300 ${
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          {isAtLiveEdge ? (
            <Tooltip content="Đang phát trực tiếp (Bấm để đồng bộ)" side="bottom">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goToLiveEdge();
                }}
                aria-label="Đang phát trực tiếp (Bấm để đồng bộ)"
                className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white/95 text-[11px] font-medium tracking-wide shadow-lg backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer select-none"
              >
                <span className="inline-flex rounded-full h-2 w-2 bg-netflix-red shrink-0" />
                <span className="font-semibold tracking-wider text-[10px] sm:text-[11px]">
                  Trực tiếp
                </span>
              </button>
            </Tooltip>
          ) : (
            <Tooltip content="Quay về phát trực tiếp" side="bottom">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goToLiveEdge();
                }}
                aria-label="Quay về phát trực tiếp"
                className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 hover:bg-black/85 text-amber-300 text-[10px] sm:text-[11px] font-medium tracking-wide shadow-lg backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer select-none"
              >
                <RotateCcw className="w-3 h-3 group-hover:-rotate-90 transition-transform duration-300 text-amber-400" />
                <span>Về live</span>
              </button>
            </Tooltip>
          )}
        </div>

        {!useMobilePortal && sourceDrawerMarkup}

        <VolumeOsdPill volumeOsd={volumeOsd} />

        <LiveSeekOverlay actionFeedback={actionFeedback} />

        {/* LOADING BADGE */}
        {isLoading && !hasError && (
          <div className="absolute top-4 right-4 z-20 pointer-events-none animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-black/75 backdrop-blur-md shadow-xl">
              <Loader2 className="w-4 h-4 text-netflix-red animate-spin flex-shrink-0" />
              <p className="text-xs sm:text-sm font-semibold text-zinc-200 whitespace-nowrap">
                Đang kết nối...
              </p>
            </div>
          </div>
        )}

        {/* THÔNG BÁO LỖI VÀ GỢI Ý CHUYỂN SERVER */}
        {hasError && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/95 p-4 sm:p-6 text-center z-20"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
              <AlertCircle className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <h4 className="text-base sm:text-lg font-bold text-white mb-1">
              {errorMessage === "Chưa có tín hiệu phát" || isPreKickoff
                ? "Chưa có tín hiệu phát"
                : "Chưa nhận được tín hiệu hình ảnh"}
            </h4>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md mb-5 leading-relaxed">
              {errorMessage && errorMessage !== "Chưa có tín hiệu phát"
                ? errorMessage
                : isPreKickoff
                  ? "Trận đấu chưa bắt đầu hoặc luồng phát pre-match chưa mở. Vui lòng bấm Thử lại sát giờ thi đấu."
                  : "Luồng phát bóng đá thường mở trước giờ bóng lăn 15-30 phút. Hãy bấm thử lại hoặc chuyển sang máy chủ khác."}
            </p>
            <div className="flex flex-wrap gap-2.5 justify-center">
              <button
                type="button"
                onClick={handleRetry}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Thử lại</span>
              </button>

              {servers.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleSwitchServer("next")}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-netflix-red hover:brightness-110 active:brightness-95 text-xs font-bold text-white transition shadow-md shadow-black/50 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>
                    Đổi Máy Chủ #
                    {((selectedServerIndex + 1) % servers.length) + 1}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        <LivePlayerControlsBar
          showControls={showControls}
          isLoading={isLoading}
          hasError={hasError}
          isPlaying={isPlaying}
          isMuted={isMuted}
          volume={volume}
          isFullscreen={isFullscreen}
          isPip={isPip}
          serversCount={servers?.length || 0}
          availableServersCount={availableServers.length}
          currentServerName={
            currentServer
              ? parseServerDisplayLabel(
                  currentServer,
                  currentAvailableIdx !== -1
                    ? currentAvailableIdx
                    : selectedServerIndex,
                )
              : "Chọn nguồn"
          }
          currentAvailableIndex={
            currentAvailableIdx !== -1 ? currentAvailableIdx : 0
          }
          isRailVisible={isRailVisible}
          onTogglePlay={togglePlay}
          onResetControlsTimeout={resetControlsTimeout}
          onSeek={handleSeek}
          onToggleMute={toggleMute}
          onVolumeChange={handleVolumeChange}
          onSwitchServer={handleSwitchServer}
          onToggleRail={toggleRail}
          onTogglePip={togglePip}
          onToggleFullscreen={toggleFullscreen}
        />
      </div>

      {/* PORTAL BOTTOM SHEET CHO MOBILE */}
      {useMobilePortal &&
        typeof document !== "undefined" &&
        createPortal(sourceDrawerMarkup, document.body)}

      {/* 2. SCOREBOARD SÂN CỎ */}
      <LiveMatchScoreboard
        match={match}
        title={title}
        blv={blv}
        time={time}
        team1={team1}
        team2={team2}
        isEvent={isEvent}
        homeLogo={homeLogo}
        awayLogo={awayLogo}
        currentScore={currentScore}
        summary={summary}
        timeInfo={timeInfo}
        isFinished={isFinished}
        kickoffTime={kickoffTime}
        homeDisplayName={homeDisplayName}
        awayDisplayName={awayDisplayName}
        venueName={venueName}
        refereeName={refereeName}
        homeGoalScorers={homeGoalScorers}
        awayGoalScorers={awayGoalScorers}
        currentServer={currentServer}
        currentAvailableIdx={currentAvailableIdx}
        selectedServerIndex={selectedServerIndex}
      />

      {/* 3. DANH SÁCH MÁY CHỦ PHÁT SÓNG */}
      <LiveServerSection
        key={activeMatchId}
        availableServers={availableServers}
        currentServer={currentServer}
        selectedServerIndex={selectedServerIndex}
        copied={copied}
        onCopyStream={handleCopyStream}
        onSelectServer={(s) =>
          handleSelectServerOption(s, { bumpRetryNonce: true })
        }
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

export const LivePlayer = React.memo(LivePlayerInner);
export default LivePlayer;
