import type Hls from "hls.js";

export interface LiveStallRecord {
  id: number;
  timestamp: string;
  durationMs: number;
  currentTime: number;
  readyState: number;
  readyStateText: string;
  forwardBufferSec: number;
  liveLatencySec: number | "N/A";
  seekableStart: number | null;
  seekableEnd: number | null;
  level: number;
  bitrate: string;
}

// Diagnostic helper: tính toán lượng buffer phía trước vị trí phát hiện tại (giây)
export function getForwardBuffer(v: HTMLVideoElement): number {
  try {
    for (let i = 0; i < v.buffered.length; i++) {
      if (v.currentTime >= v.buffered.start(i) && v.currentTime <= v.buffered.end(i)) {
        return +(v.buffered.end(i) - v.currentTime).toFixed(2);
      }
    }
  } catch { }
  return 0;
}

/**
 * Tính toán độ trễ so với Live Edge (giây) an toàn, triệt tiêu số ảo (-9000s, NaN, Infinity)
 * Latency = liveEdge - currentTime
 */
export function calculateLiveLatency(
  v: HTMLVideoElement | null,
  hls: Hls | null,
): { latencySec: number; isLive: boolean } {
  if (!v) return { latencySec: 0, isLive: true };

  const curTime = v.currentTime;
  if (!Number.isFinite(curTime) || curTime < 0) {
    return { latencySec: 0, isLive: true };
  }

  const seekable = v.seekable;
  const hasSeekable = Boolean(seekable && seekable.length > 0);
  const seekableStart = hasSeekable && seekable ? seekable.start(0) : null;
  const seekableEnd =
    hasSeekable && seekable ? seekable.end(seekable.length - 1) : null;

  const livePos = hls?.liveSyncPosition;
  const hasValidLivePos =
    livePos !== undefined &&
    livePos !== null &&
    Number.isFinite(livePos) &&
    livePos > 0;

  // 1. Xác định liveEdge thực tế đáng tin cậy nhất
  let liveEdge: number | null = null;

  if (
    hasSeekable &&
    seekableEnd !== null &&
    Number.isFinite(seekableEnd) &&
    seekableEnd > 0
  ) {
    if (
      hasValidLivePos &&
      seekableStart !== null &&
      livePos >= seekableStart - 1 &&
      livePos <= seekableEnd + 2
    ) {
      liveEdge = livePos;
    } else {
      liveEdge = seekableEnd;
    }
  } else if (hasValidLivePos) {
    liveEdge = livePos;
  }

  // Nếu không có liveEdge hợp lệ -> Mặc định coi là đang ở Live Edge
  if (liveEdge === null || !Number.isFinite(liveEdge)) {
    return { latencySec: 0, isLive: true };
  }

  // 2. Tính toán: liveEdge - currentTime
  const rawLag = liveEdge - curTime;
  if (!Number.isFinite(rawLag)) {
    return { latencySec: 0, isLive: true };
  }

  // 3. Giới hạn cửa sổ trễ tối đa (clamp)
  let maxPossibleLag = 300; // Mặc định 5 phút cho sliding window
  if (hasSeekable && seekableStart !== null && seekableEnd !== null) {
    const windowDuration = seekableEnd - seekableStart;
    if (
      Number.isFinite(windowDuration) &&
      windowDuration > 0 &&
      windowDuration < 1800
    ) {
      maxPossibleLag = windowDuration;
    }
  }

  // Triệt tiêu số âm do jitter timestamp và clamp không vượt quá cửa sổ live
  const clampedLag = Math.max(
    0,
    Math.min(Math.round(rawLag), Math.round(maxPossibleLag)),
  );

  // Độ lệch <= 4 giây là dung sai bình thường của HLS segment -> đang ở Live Edge
  const isLive = clampedLag <= 4;

  return {
    latencySec: isLive ? 0 : clampedLag,
    isLive,
  };
}

export const LIVE_MEDIA_RECOVERY_WINDOW_MS = 12_000;
export const LIVE_MEDIA_RECOVERY_MAX_ATTEMPTS = 3;
export const LIVE_MEDIA_RECOVERY_COOLDOWN_MS = 650;

export interface LiveMediaRecoveryInput {
  now: number;
  recentErrorTimestamps: number[];
  lastRecoveryAt: number;
  lastErrorTimeSec: number | null;
  currentTimeSec: number;
  seekableStartSec: number | null;
  seekableEndSec: number | null;
  liveSyncPositionSec: number | null;
}

export interface LiveMediaRecoveryDecision {
  action: "recover" | "swap_and_recover" | "fallback";
  nextTimestamps: number[];
  delayMs: number;
  seekToSec: number | null;
}

/**
 * Prevents infinite hls.recoverMediaError() loops on live streams with sparse
 * keyframes (e.g., 8s Open-GOP segments lacking IDR/SPS). Caps recovery
 * attempts inside a rolling window, enforces cooldown, advances past broken
 * startup segments when stuck at the same timestamp, and escalates to server
 * fallback when decode recovery fails repeatedly.
 */
export function evaluateLiveMediaErrorRecovery(
  input: LiveMediaRecoveryInput,
): LiveMediaRecoveryDecision {
  const {
    now,
    recentErrorTimestamps,
    lastRecoveryAt,
    lastErrorTimeSec,
    currentTimeSec,
    seekableStartSec,
    seekableEndSec,
    liveSyncPositionSec,
  } = input;

  const activeTimestamps = recentErrorTimestamps.filter(
    (ts) => now - ts <= LIVE_MEDIA_RECOVERY_WINDOW_MS,
  );
  activeTimestamps.push(now);

  if (activeTimestamps.length > LIVE_MEDIA_RECOVERY_MAX_ATTEMPTS) {
    return {
      action: "fallback",
      nextTimestamps: activeTimestamps,
      delayMs: 0,
      seekToSec: null,
    };
  }

  const attempt = activeTimestamps.length;
  const elapsedSinceLast = lastRecoveryAt > 0 ? now - lastRecoveryAt : Infinity;
  const delayMs =
    attempt === 1
      ? 0
      : Math.max(0, LIVE_MEDIA_RECOVERY_COOLDOWN_MS - elapsedSinceLast);

  let seekToSec: number | null = null;
  const isStuckAtSameSpot =
    lastErrorTimeSec !== null &&
    Number.isFinite(currentTimeSec) &&
    Math.abs(currentTimeSec - lastErrorTimeSec) < 3.5;

  if (attempt >= 2 && isStuckAtSameSpot && Number.isFinite(currentTimeSec)) {
    const startBound =
      seekableStartSec !== null && Number.isFinite(seekableStartSec)
        ? seekableStartSec
        : 0;
    const endBound =
      seekableEndSec !== null && Number.isFinite(seekableEndSec)
        ? Math.max(startBound, seekableEndSec - 1.5)
        : null;

    let candidate = Math.max(startBound, currentTimeSec) + 4.5;
    if (
      liveSyncPositionSec !== null &&
      Number.isFinite(liveSyncPositionSec) &&
      liveSyncPositionSec > candidate
    ) {
      candidate = liveSyncPositionSec;
    }
    if (endBound !== null) {
      candidate = Math.min(endBound, candidate);
    }
    if (candidate > currentTimeSec + 1.0) {
      seekToSec = +candidate.toFixed(2);
    }
  }

  return {
    action: attempt >= 3 ? "swap_and_recover" : "recover",
    nextTimestamps: activeTimestamps,
    delayMs,
    seekToSec,
  };
}


