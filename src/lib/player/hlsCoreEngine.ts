import Hls, { type HlsConfig, type Level } from "hls.js";

export interface QualityLevelItem {
  id: number;
  label: string;
  height: number;
}

export interface HlsCoreConfigOptions {
  mode: "live" | "vod";
  lowLatency?: boolean;
  maxBufferLength?: number;
  maxMaxBufferLength?: number;
  maxBufferSize?: number;
  startPosition?: number;
  xhrSetup?: (xhr: XMLHttpRequest, url: string) => void;
}

/**
 * Tạo cấu hình Hls.js chuẩn hóa, chống gián đoạn và tối ưu buffer cho toàn dự án.
 */
export function createResilientHlsConfig(options: HlsCoreConfigOptions): Partial<HlsConfig> {
  const isLive = options.mode === "live";

  if (isLive) {
    return {
      enableWorker: true,
      lowLatencyMode: options.lowLatency ?? true,
      liveSyncDurationCount: 3,
      liveMaxLatencyDurationCount: 6,
      maxLiveSyncPlaybackRate: 1.1,
      backBufferLength: 15,
      maxBufferLength: options.maxBufferLength ?? 12,
      maxMaxBufferLength: options.maxMaxBufferLength ?? 20,
      maxBufferSize: options.maxBufferSize ?? 15 * 1000 * 1000,
      abrEwmaDefaultEstimate: 5_000_000,
      capLevelToPlayerSize: false,
      startLevel: -1,
      manifestLoadingTimeOut: 4500,
      levelLoadingTimeOut: 5000,
      fragLoadingTimeOut: 5000,
      fragLoadingMaxRetry: 2,
      levelLoadingMaxRetry: 2,
      manifestLoadingMaxRetry: 1,
      fragLoadingMaxRetryTimeout: 1000,
      levelLoadingMaxRetryTimeout: 1000,
      xhrSetup: options.xhrSetup || ((xhr) => { xhr.withCredentials = false; }),
    };
  }

  // VOD (Phim)
  return {
    enableWorker: true,
    lowLatencyMode: false,
    backBufferLength: 30,
    maxBufferLength: options.maxBufferLength ?? 30,
    maxMaxBufferLength: options.maxMaxBufferLength ?? 60,
    maxBufferSize: options.maxBufferSize ?? 60 * 1000 * 1000,
    maxBufferHole: 8, // Cho phép Hls.js tự động nhảy qua các khoảng khuyết đệm / audio dropout lên đến 8 giây
    highBufferWatchdogPeriod: 2, // Giám sát kẹt buffer khi phía trước đã có đệm
    nudgeOffset: 0.2, // Bước nhảy khi bị kẹt buffer
    nudgeMaxRetry: 6, // Cho phép thử nhảy tối đa 6 lần
    startLevel: -1,
    startPosition: options.startPosition && options.startPosition > 0 ? options.startPosition : -1,
    fragLoadingTimeOut: 20000,
    manifestLoadingTimeOut: 15000,
    levelLoadingTimeOut: 15000,
    fragLoadingMaxRetry: 4,
    levelLoadingMaxRetry: 4,
    manifestLoadingMaxRetry: 4,
    fragLoadingRetryDelay: 1000,
    levelLoadingRetryDelay: 1000,
    manifestLoadingRetryDelay: 1000,
    xhrSetup: options.xhrSetup || ((xhr) => { xhr.withCredentials = false; }),
  };
}

/**
 * Khởi tạo instance HLS với cấu hình chuẩn hóa.
 */
export function createResilientHls(options: HlsCoreConfigOptions): Hls {
  const config = createResilientHlsConfig(options);
  return new Hls(config);
}

/**
 * Trích xuất danh sách độ phân giải từ manifest HLS (1080p, 720p, 480p, 360p).
 */
export function extractHlsQualityLevels(levels: Level[]): QualityLevelItem[] {
  if (!Array.isArray(levels) || levels.length === 0) return [];

  const seenHeights = new Set<number>();
  const items: QualityLevelItem[] = [];

  levels.forEach((level, index) => {
    const height = level.height || 0;
    if (height > 0 && !seenHeights.has(height)) {
      seenHeights.add(height);
      items.push({
        id: index,
        label: `${height}p`,
        height,
      });
    }
  });

  items.sort((a, b) => b.height - a.height);
  return items;
}

/**
 * Tự động phát với fallback muted khi bị chính sách Autoplay của trình duyệt chặn.
 */
export async function playWithMutedFallback(
  video: HTMLVideoElement,
  onPlaying?: (playing: boolean) => void,
  onMuted?: (muted: boolean) => void
): Promise<boolean> {
  try {
    await video.play();
    onPlaying?.(true);
    return true;
  } catch (err: unknown) {
    const errName = typeof err === "object" && err !== null && "name" in err ? (err as { name?: string }).name : "";
    if (errName === "AbortError") return false;

    // Trình duyệt chặn autoplay có tiếng -> Chuyển sang muted và thử lại
    video.muted = true;
    onMuted?.(true);
    try {
      await video.play();
      onPlaying?.(true);
      return true;
    } catch {
      onPlaying?.(false);
      return false;
    }
  }
}

/**
 * Dọn dẹp an toàn HLS instance và video element để tránh rò rỉ RAM / sockets.
 */
export function teardownHlsAndMedia(video: HTMLVideoElement | null, hls: Hls | null): void {
  if (hls) {
    try {
      hls.stopLoad();
      hls.detachMedia();
      hls.destroy();
    } catch {}
  }
  if (video) {
    try {
      video.pause();
      video.removeAttribute("src");
      video.load();
    } catch {}
  }
}

/**
 * Đo độ lệch Live Edge (Live Latency Drift) cho luồng phát trực tiếp.
 */
export function measureLiveEdgeDrift(
  video: HTMLVideoElement,
  hls: Hls | null
): { drift: number; isAtLiveEdge: boolean } {
  if (hls && hls.liveSyncPosition && Number.isFinite(hls.liveSyncPosition)) {
    const drift = Math.max(0, Math.round(hls.liveSyncPosition - video.currentTime));
    return {
      drift,
      isAtLiveEdge: drift <= 4,
    };
  }
  return {
    drift: 0,
    isAtLiveEdge: true,
  };
}
