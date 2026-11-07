import { PlaybackSession } from "@/types/deviceSession";
import { saveDeviceHandoffSupabase } from "@/services/supabaseService";

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

// In-flight Promise deduplication map cho client handoff POST
const inFlightHandoffRequests = new Map<string, Promise<void>>();
let lastHandoffSyncRecord: { key: string; time: number; progress: number } | null = null;

/**
 * Cập nhật phiên phát phim hiện tại (Broadcast Channel + LocalStorage + Supabase)
 * Có cơ chế in-flight Promise deduplication: nếu cùng user và cùng movie đang có
 * request in-flight hoặc gọi trùng lặp trong thời gian ngắn (< 2.5s) cùng tiến độ,
 * sẽ dedup chia sẻ Promise thay vì bắn thêm request POST mới.
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

    const currentSeconds = Math.floor(data.currentTime);
    const dedupKey = `${userId}:${data.movieSlug}`;
    const now = Date.now();

    // 1. Bỏ qua nếu cùng user/session và cùng movie gọi đúp trong thời gian ngắn (< 2.5s) cùng tiến độ
    if (
      lastHandoffSyncRecord &&
      lastHandoffSyncRecord.key === dedupKey &&
      now - lastHandoffSyncRecord.time < 2500 &&
      Math.abs(lastHandoffSyncRecord.progress - currentSeconds) < 2
    ) {
      return;
    }

    // 2. Dedup request in-flight: nếu đang có request POST /api/user/handoff đang bay cùng user & movie
    const existingInFlight = inFlightHandoffRequests.get(dedupKey);
    if (existingInFlight) {
      return await existingInFlight;
    }

    // Đồng bộ lên Supabase qua Server API với in-flight Promise dedup
    const syncPromise = (async () => {
      try {
        lastHandoffSyncRecord = { key: dedupKey, time: Date.now(), progress: currentSeconds };
        const { auth } = await import("@/lib/firebase");
        const token = await auth?.currentUser?.getIdToken();
        if (token) {
          await fetch("/api/user/handoff", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              movieSlug: data.movieSlug,
              movieTitle: data.movieTitle,
              poster: data.posterUrl,
              episodeName: data.episodeName,
              episodeSlug: data.episodeSlug,
              progressSeconds: currentSeconds,
              durationSeconds: Math.floor(data.duration || 0),
              deviceName: detectDeviceType(),
            }),
          });
        } else {
          await saveDeviceHandoffSupabase({
            id: userId,
            userId,
            movieSlug: data.movieSlug,
            movieTitle: data.movieTitle,
            poster: data.posterUrl,
            episodeName: data.episodeName,
            episodeSlug: data.episodeSlug,
            progressSeconds: currentSeconds,
            durationSeconds: Math.floor(data.duration || 0),
            deviceName: detectDeviceType(),
            updatedAt: Date.now(),
          });
        }
      } catch (syncErr) {
        console.warn("Lỗi đồng bộ handoff qua API:", syncErr);
      } finally {
        inFlightHandoffRequests.delete(dedupKey);
      }
    })();

    inFlightHandoffRequests.set(dedupKey, syncPromise);
    await syncPromise;
  } catch (err) {
    console.warn("Lỗi đồng bộ phiên phát đa thiết bị:", err);
  }
}


