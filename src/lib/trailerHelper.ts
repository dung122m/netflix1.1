/**
 * Thư viện tiện ích thống nhất xử lý Trailer YouTube cho HeroFeatured và MediaCard.
 * Tuân thủ tiêu chuẩn: Poster-first, Lazy-load, Mobile-safe, Fault-tolerant.
 */

export function extractYoutubeId(url?: string | null): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const match = trimmed.match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/i
  );
  return match ? match[1] : null;
}

export interface TrailerEmbedOptions {
  muted?: boolean;
  controls?: boolean;
  loop?: boolean;
}

export function getYoutubeTrailerEmbedUrl(
  urlOrId?: string | null,
  options?: TrailerEmbedOptions
): string | null {
  const videoId = extractYoutubeId(urlOrId);
  if (!videoId) return null;

  const isMuted = options?.muted ?? true;
  const hasControls = options?.controls ?? false;

  const params = new URLSearchParams({
    autoplay: "1",
    mute: isMuted ? "1" : "0",
    controls: hasControls ? "1" : "0",
    playsinline: "1",
    rel: "0",
    iv_load_policy: "3",
    disablekb: "1",
    enablejsapi: "1",
  });

  if (typeof window !== "undefined" && window.location?.origin) {
    params.set("origin", window.location.origin);
  }

  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

export function isDesktopWithHover(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // Màn hình di động nhỏ (< 768px) -> tuyệt đối không kích hoạt trailer iframe
    if (window.innerWidth < 768) return false;
    // Thiết bị thuần cảm ứng (chỉ có touch, không có hover)
    if (window.matchMedia("(hover: none) and (pointer: coarse)").matches) {
      return false;
    }
    return true;
  } catch {
    return typeof window !== "undefined" && window.innerWidth >= 768;
  }
}

/**
 * Kiểm tra xem postMessage từ iframe có phải là thông báo lỗi phát của YouTube hay không
 * (100 = video deleted/private, 101/150 = embedding disabled, 2 = invalid param, 5 = HTML5 error)
 */
export function isYoutubeErrorMessage(data: unknown): boolean {
  if (!data) return false;
  try {
    const parsed = typeof data === "string" ? JSON.parse(data) : data;
    if (parsed && typeof parsed === "object") {
      if (parsed.event === "onError") {
        return true;
      }
      if (typeof parsed.info === "number" && [2, 5, 100, 101, 150].includes(parsed.info)) {
        return true;
      }
      if (
        parsed.event === "infoDelivery" &&
        parsed.info &&
        typeof parsed.info === "object" &&
        typeof parsed.info.errorCode === "number"
      ) {
        return true;
      }
    }
  } catch {
    // Message không phải JSON từ YouTube, bỏ qua
  }
  return false;
}

/**
 * Kiểm tra xem video YouTube đã thực sự PLAYING (state === 1) hay chưa
 * Chỉ khi nhận được tín hiệu này mới fade-in trailer, tránh hiển thị ô đen hoặc màn hình lỗi.
 */
export function isYoutubePlayingMessage(data: unknown): boolean {
  if (!data) return false;
  try {
    const parsed = typeof data === "string" ? JSON.parse(data) : data;
    if (parsed && typeof parsed === "object") {
      // 1. YouTube API event trực tiếp: onStateChange với info === 1 hoặc data === 1 (PLAYING)
      if (parsed.event === "onStateChange" && (parsed.info === 1 || parsed.data === 1)) {
        return true;
      }
      // 2. YouTube infoDelivery packet: playerState === 1 hoặc playbackState === 1
      if (
        parsed.event === "infoDelivery" &&
        parsed.info &&
        typeof parsed.info === "object" &&
        (parsed.info.playerState === 1 || parsed.info.playbackState === 1)
      ) {
        return true;
      }
    }
  } catch {
    // Message không phải JSON từ YouTube, bỏ qua
  }
  return false;
}

/**
 * Các mức chất lượng YouTube được coi là đủ HD (≥ 1080p) để phát trailer banner.
 * YouTube trả về chuỗi như "hd1080", "hd1440", "hd2160".
 */
export const YOUTUBE_HD_QUALITIES = new Set(["hd1080", "hd1440", "hd2160", "highres"]);

/**
 * Kiểm tra xem postMessage có chứa thông tin availableQualityLevels từ YouTube không.
 * YouTube gửi packet infoDelivery chứa mảng availableQualityLevels khi video bắt đầu load.
 */
export function isYoutubeQualityInfoMessage(data: unknown): string[] | null {
  if (!data) return null;
  try {
    const parsed = typeof data === "string" ? JSON.parse(data) : data;
    if (
      parsed &&
      typeof parsed === "object" &&
      parsed.event === "infoDelivery" &&
      parsed.info &&
      typeof parsed.info === "object" &&
      Array.isArray(parsed.info.availableQualityLevels) &&
      parsed.info.availableQualityLevels.length > 0
    ) {
      return parsed.info.availableQualityLevels as string[];
    }
  } catch {
    // Không phải JSON hợp lệ, bỏ qua
  }
  return null;
}

/**
 * Kiểm tra xem danh sách chất lượng có bao gồm ít nhất hd1080 (1080p) trở lên không.
 * Trả về true nếu đủ chất lượng để phát trailer trên banner.
 */
export function hasMinimum1080Quality(qualityLevels: string[]): boolean {
  return qualityLevels.some((q) => YOUTUBE_HD_QUALITIES.has(q));
}

/**
 * Kiểm tra xem video YouTube đã kết thúc (state === 0 - ENDED) hay chưa để tự động loop lại
 */
export function isYoutubeEndedMessage(data: unknown): boolean {
  if (!data) return false;
  try {
    const parsed = typeof data === "string" ? JSON.parse(data) : data;
    if (parsed && typeof parsed === "object") {
      if (parsed.event === "onStateChange" && (parsed.info === 0 || parsed.data === 0)) {
        return true;
      }
      if (
        parsed.event === "infoDelivery" &&
        parsed.info &&
        typeof parsed.info === "object" &&
        (parsed.info.playerState === 0 || parsed.info.playbackState === 0)
      ) {
        return true;
      }
    }
  } catch {
    // Message không phải JSON từ YouTube, bỏ qua
  }
  return false;
}
