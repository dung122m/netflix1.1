import { PlaybackSession } from "@/types/deviceSession";

/**
 * Tạo hoặc lấy Tab Session ID duy nhất cho tab trình duyệt này
 */
export function getTabSessionId(): string {
  if (typeof window === "undefined") return "server-session";
  try {
    let id = sessionStorage.getItem("nanaflix_tab_session_id");
    if (!id) {
      id = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem("nanaflix_tab_session_id", id);
    }
    return id;
  } catch {
    return `sess_${Date.now()}`;
  }
}

/**
 * Nhận diện loại thiết bị đang phát
 */
export function detectDeviceType(): "Điện thoại" | "Máy tính" | "Tablet" {
  if (typeof window === "undefined") return "Máy tính";
  const ua = navigator.userAgent.toLowerCase();
  if (/(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/.test(ua)) {
    return "Tablet";
  }
  if (/(mobi|ipod|phone|blackberry|opera mini|fennec|minimo|symbian|psp|nintendo)/.test(ua)) {
    return "Điện thoại";
  }
  return "Máy tính";
}

const STORAGE_SESSION_PREFIX = "nanaflix_active_playback_session_";

/**
 * Cập nhật phiên phát phim hiện tại (Broadcast Channel + LocalStorage)
 */
export async function updateActivePlaybackSession(
  userId: string,
  data: {
    movieSlug: string;
    movieTitle: string;
    episodeName?: string;
    episodeSlug?: string;
    currentTime: number;
    duration: number;
    posterUrl?: string;
  }
): Promise<void> {
  if (!userId || typeof window === "undefined") return;

  try {
    const payload: PlaybackSession = {
      sessionId: getTabSessionId(),
      deviceType: detectDeviceType(),
      movieSlug: data.movieSlug,
      movieTitle: data.movieTitle,
      episodeName: data.episodeName || "Tập 1",
      episodeSlug: data.episodeSlug || "tap-1",
      currentTime: Math.floor(data.currentTime),
      duration: Math.floor(data.duration || 0),
      posterUrl: data.posterUrl || "/default-poster.jpg",
      updatedAt: Date.now(),
    };

    localStorage.setItem(
      `${STORAGE_SESSION_PREFIX}${userId}`,
      JSON.stringify(payload)
    );

    if (typeof BroadcastChannel !== "undefined") {
      try {
        const channel = new BroadcastChannel(`nanaflix_handoff_${userId}`);
        channel.postMessage(payload);
        channel.close();
      } catch {}
    }
  } catch (err) {
    console.warn("Lỗi đồng bộ phiên phát đa thiết bị:", err);
  }
}

/**
 * Lắng nghe phiên phát trực tiếp từ các tab/thiết bị khác
 */
export function subscribeActivePlaybackSession(
  userId: string,
  callback: (session: PlaybackSession | null) => void
): () => void {
  if (!userId || typeof window === "undefined") {
    callback(null);
    return () => {};
  }

  let isUnsubscribed = false;
  let channel: BroadcastChannel | null = null;

  try {
    // 1. Phục hồi phiên hiện tại từ LocalStorage
    const raw = localStorage.getItem(`${STORAGE_SESSION_PREFIX}${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw) as PlaybackSession;
      if (parsed && Date.now() - parsed.updatedAt < 600000) {
        callback(parsed);
      }
    }

    // 2. Lắng nghe qua BroadcastChannel
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(`nanaflix_handoff_${userId}`);
      channel.onmessage = (event) => {
        if (!isUnsubscribed && event.data) {
          callback(event.data as PlaybackSession);
        }
      };
    }

    // 3. Lắng nghe storage event
    const handleStorage = (e: StorageEvent) => {
      if (e.key === `${STORAGE_SESSION_PREFIX}${userId}` && e.newValue && !isUnsubscribed) {
        try {
          const parsed = JSON.parse(e.newValue) as PlaybackSession;
          callback(parsed);
        } catch {}
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      isUnsubscribed = true;
      if (channel) {
        channel.close();
      }
      window.removeEventListener("storage", handleStorage);
    };
  } catch {
    return () => {};
  }
}
