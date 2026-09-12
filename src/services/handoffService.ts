import { doc, setDoc, onSnapshot, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
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

/**
 * Cập nhật phiên phát phim hiện tại lên Firestore
 * Lưu tại users/{userId}/active_session/current
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
  if (!db || !userId) return;

  try {
    const sessionRef = doc(db, "users", userId, "active_session", "current");
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

    await setDoc(sessionRef, payload, { merge: true });
  } catch (err) {
    console.warn("Lỗi đồng bộ phiên phát đa thiết bị:", err);
  }
}

/**
 * Lắng nghe phiên phát trực tiếp từ các thiết bị khác
 */
export function subscribeActivePlaybackSession(
  userId: string,
  callback: (session: PlaybackSession | null) => void
): () => void {
  if (!db || !userId) {
    callback(null);
    return () => {};
  }

  const sessionRef = doc(db, "users", userId, "active_session", "current");
  return onSnapshot(
    sessionRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as PlaybackSession);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.warn("Lỗi theo dõi active_session:", error);
      callback(null);
    }
  );
}

/**
 * Lấy thông tin phiên phát hiện tại một lần
 */
export async function getActivePlaybackSession(
  userId: string
): Promise<PlaybackSession | null> {
  if (!db || !userId) return null;

  try {
    const sessionRef = doc(db, "users", userId, "active_session", "current");
    const snap = await getDoc(sessionRef);
    if (snap.exists()) {
      return snap.data() as PlaybackSession;
    }
    return null;
  } catch {
    return null;
  }
}
