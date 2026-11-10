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

