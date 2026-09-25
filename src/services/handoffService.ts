import { PlaybackSession } from "@/types/deviceSession";
import { supabase } from "@/lib/supabase";
import {
  saveDeviceHandoffSupabase,
  getDeviceHandoffSupabase,
} from "@/services/supabaseService";

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let realtimeChannel: any = null;

  try {
    // 1. Phục hồi phiên hiện tại từ LocalStorage
    const raw = localStorage.getItem(`${STORAGE_SESSION_PREFIX}${userId}`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as PlaybackSession;
        if (parsed && Date.now() - parsed.updatedAt < 600000) {
          callback(parsed);
        }
      } catch {}
    }

    // 2. Lấy từ Supabase khi mở máy khác
    getDeviceHandoffSupabase(userId).then((cloudData) => {
      if (cloudData && !isUnsubscribed && Date.now() - cloudData.updatedAt < 600000) {
        callback({
          sessionId: `cloud_${cloudData.updatedAt}`,
          deviceType: (cloudData.deviceName as "Điện thoại" | "Máy tính" | "Tablet") || "Máy tính",
          movieSlug: cloudData.movieSlug,
          movieTitle: cloudData.movieTitle,
          episodeName: cloudData.episodeName || "Tập 1",
          episodeSlug: cloudData.episodeSlug || "tap-1",
          currentTime: cloudData.progressSeconds,
          duration: cloudData.durationSeconds || 0,
          posterUrl: cloudData.poster || "/default-poster.jpg",
          updatedAt: cloudData.updatedAt,
        });
      }
    }).catch(() => {});

    // 3. Lắng nghe qua BroadcastChannel (trong cùng trình duyệt)
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(`nanaflix_handoff_${userId}`);
      channel.onmessage = (event) => {
        if (!isUnsubscribed && event.data) {
          callback(event.data as PlaybackSession);
        }
      };
    }

    // 4. Lắng nghe storage event
    const handleStorage = (e: StorageEvent) => {
      if (e.key === `${STORAGE_SESSION_PREFIX}${userId}` && e.newValue && !isUnsubscribed) {
        try {
          const parsed = JSON.parse(e.newValue) as PlaybackSession;
          callback(parsed);
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);

    // 5. Lắng nghe Supabase Realtime nếu người dùng mở trên thiết bị khác
    if (supabase) {
      realtimeChannel = supabase
        .channel(`realtime-handoff-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "device_handoff",
            filter: `user_id=eq.${userId}`,
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (payload: any) => {
            const newRow = payload.new;
            if (newRow && !isUnsubscribed) {
              callback({
                sessionId: `cloud_${newRow.updated_at}`,
                deviceType: (newRow.device_name as "Điện thoại" | "Máy tính" | "Tablet") || "Thiết bị khác",
                movieSlug: newRow.movie_slug,
                movieTitle: newRow.movie_title,
                episodeName: newRow.episode_name || "Tập 1",
                episodeSlug: newRow.episode_slug || "tap-1",
                currentTime: Number(newRow.progress_seconds) || 0,
                duration: Number(newRow.duration_seconds) || 0,
                posterUrl: newRow.poster || "/default-poster.jpg",
                updatedAt: Number(newRow.updated_at) || Date.now(),
              });
            }
          }
        )
        .subscribe();
    }

    return () => {
      isUnsubscribed = true;
      if (channel) {
        channel.close();
      }
      if (realtimeChannel && supabase) {
        supabase.removeChannel(realtimeChannel);
      }
      window.removeEventListener("storage", handleStorage);
    };
  } catch {
    return () => {};
  }
}

