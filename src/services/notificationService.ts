import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FollowedSeries, UserNotification } from "@/types/notification";

function cleanData<T extends object>(data: T): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  Object.entries(data).forEach(([key, val]) => {
    if (val !== undefined) {
      cleaned[key] = val;
    }
  });
  return cleaned;
}

/**
 * Kiểm tra xem người dùng có đang theo dõi phim bộ này không
 */
export async function isFollowingSeries(
  userId: string,
  slug: string,
): Promise<boolean> {
  if (!db || !userId || !slug) return false;
  try {
    const ref = doc(db, "users", userId, "followed_series", slug);
    const snap = await getDoc(ref);
    return snap.exists();
  } catch (err) {
    console.warn("Lỗi kiểm tra trạng thái theo dõi phim:", err);
    return false;
  }
}

/**
 * Bật/Tắt theo dõi phim bộ để nhận thông báo khi có tập mới
 * Trả về true nếu đã bật theo dõi, false nếu huỷ theo dõi
 */
export async function toggleFollowSeries(
  userId: string,
  series: Omit<FollowedSeries, "followedAt">,
): Promise<boolean> {
  if (!db || !userId || !series.slug) return false;
  try {
    const ref = doc(db, "users", userId, "followed_series", series.slug);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await deleteDoc(ref);
      return false;
    } else {
      const newFollow: FollowedSeries = {
        ...series,
        followedAt: Date.now(),
      };
      await setDoc(ref, cleanData(newFollow));
      return true;
    }
  } catch (err) {
    console.warn("Lỗi cập nhật theo dõi phim:", err);
    return false;
  }
}

/**
 * Lấy danh sách phim bộ người dùng đang theo dõi
 */
export async function getFollowedSeriesList(
  userId: string,
): Promise<FollowedSeries[]> {
  if (!db || !userId) return [];
  try {
    const col = collection(db, "users", userId, "followed_series");
    const snapshot = await getDocs(col);
    const list: FollowedSeries[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as FollowedSeries;
      if (data && data.slug) {
        list.push(data);
      }
    });
    return list.sort((a, b) => (b.followedAt || 0) - (a.followedAt || 0));
  } catch (err) {
    console.warn("Lỗi lấy danh sách phim theo dõi:", err);
    return [];
  }
}

/**
 * Lấy danh sách thông báo từ bộ nhớ đệm LocalStorage
 */
function getLocalNotifications(userId: string): UserNotification[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = localStorage.getItem(`nanaflix_notifs_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

/**
 * Lưu danh sách thông báo vào bộ nhớ đệm LocalStorage
 */
function saveLocalNotifications(userId: string, items: UserNotification[]): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.setItem(`nanaflix_notifs_${userId}`, JSON.stringify(items.slice(0, 50)));
  } catch {}
}

/**
 * Hợp nhất danh sách thông báo mới với danh sách cũ theo id
 */
function mergeNotifications(
  current: UserNotification[],
  incoming: UserNotification[],
): UserNotification[] {
  const map = new Map<string, UserNotification>();
  current.forEach((item) => map.set(item.id, item));
  incoming.forEach((item) => {
    const existing = map.get(item.id);
    if (existing) {
      map.set(item.id, { ...existing, ...item, isRead: existing.isRead || item.isRead });
    } else {
      map.set(item.id, item);
    }
  });
  return Array.from(map.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

/**
 * Lắng nghe thông báo thời gian thực từ Firestore (onSnapshot) + Local Storage Cache
 */
export function subscribeUserNotifications(
  userId: string,
  callback: (notifications: UserNotification[]) => void,
): () => void {
  if (!userId) {
    callback([]);
    return () => {};
  }

  let isUnsubscribed = false;

  // 1. Phục hồi ngay lập tức thông báo từ LocalStorage (0ms - không lo gián đoạn mạng hay reload trang)
  const cached = getLocalNotifications(userId);
  if (cached.length > 0) {
    callback(cached);
  }

  // 2. Nạp ngay danh sách thông báo từ Server API dự phòng
  fetch(`/api/notifications?userId=${encodeURIComponent(userId)}`)
    .then((res) => res.json())
    .then((json) => {
      if (json.items && Array.isArray(json.items) && !isUnsubscribed) {
        const merged = mergeNotifications(getLocalNotifications(userId), json.items as UserNotification[]);
        saveLocalNotifications(userId, merged);
        callback(merged);
      }
    })
    .catch(() => {});

  if (!db) {
    return () => {
      isUnsubscribed = true;
    };
  }

  try {
    const col = collection(db, "users", userId, "notifications");
    const unsubscribe = onSnapshot(
      col,
      (snapshot) => {
        if (isUnsubscribed) return;
        const list: UserNotification[] = [];
        snapshot.forEach((d) => {
          const item = { id: d.id, ...d.data() } as UserNotification;
          list.push(item);
        });

        if (list.length > 0) {
          const merged = mergeNotifications(getLocalNotifications(userId), list);
          saveLocalNotifications(userId, merged);
          callback(merged);
        } else {
          // Giữ lại cache local nếu snapshot trống (tránh bị reset khi chưa kịp sync)
          const cur = getLocalNotifications(userId);
          if (cur.length > 0) {
            callback(cur);
          } else {
            callback([]);
          }
        }
      },
      (error) => {
        console.warn("Lỗi realtime thông báo người dùng:", error);
      },
    );
    return () => {
      isUnsubscribed = true;
      unsubscribe();
    };
  } catch (err) {
    console.warn("Lỗi khởi tạo lắng nghe thông báo:", err);
    return () => {
      isUnsubscribed = true;
    };
  }
}

/**
 * Đánh dấu thông báo là đã đọc
 */
export async function markNotificationAsRead(
  userId: string,
  notificationId: string,
): Promise<void> {
  if (!userId || !notificationId) return;

  // 1. Cập nhật ngay trong LocalStorage
  const list = getLocalNotifications(userId);
  const updated = list.map((item) => (item.id === notificationId ? { ...item, isRead: true } : item));
  saveLocalNotifications(userId, updated);

  // 2. Cập nhật Firestore
  if (!db) return;
  try {
    const ref = doc(db, "users", userId, "notifications", notificationId);
    await updateDoc(ref, { isRead: true });
  } catch (err) {
    console.warn("Lỗi đánh dấu đã đọc thông báo:", err);
  }
}

/**
 * Đánh dấu toàn bộ thông báo là đã đọc
 */
export async function markAllNotificationsAsRead(
  userId: string,
): Promise<void> {
  if (!userId) return;

  // 1. Cập nhật ngay trong LocalStorage
  const list = getLocalNotifications(userId);
  const updated = list.map((item) => ({ ...item, isRead: true }));
  saveLocalNotifications(userId, updated);

  // 2. Cập nhật Firestore
  if (!db) return;
  try {
    const col = collection(db, "users", userId, "notifications");
    const snapshot = await getDocs(col);
    const batch = writeBatch(db);
    snapshot.forEach((d) => {
      if (!d.data().isRead) {
        batch.update(d.ref, { isRead: true });
      }
    });
    await batch.commit();
  } catch (err) {
    console.warn("Lỗi đánh dấu đã đọc tất cả thông báo:", err);
  }
}

/**
 * Xoá một thông báo
 */
export async function deleteNotification(
  userId: string,
  notificationId: string,
): Promise<void> {
  if (!userId || !notificationId) return;

  const list = getLocalNotifications(userId);
  const updated = list.filter((item) => item.id !== notificationId);
  saveLocalNotifications(userId, updated);

  if (!db) return;
  try {
    const ref = doc(db, "users", userId, "notifications", notificationId);
    await deleteDoc(ref);
  } catch (err) {
    console.warn("Lỗi xoá thông báo:", err);
  }
}

/**
 * Kiểm tra và tạo thông báo nếu phim có tập mới ra mắt
 */
export async function checkAndNotifyNewEpisode(
  userId: string,
  seriesInfo: {
    slug: string;
    title: string;
    poster: string;
    currentEpisodes: number;
    latestEpisodeName: string;
  },
): Promise<boolean> {
  if (!db || !userId || !seriesInfo.slug) return false;
  try {
    const followRef = doc(db, "users", userId, "followed_series", seriesInfo.slug);
    const followSnap = await getDoc(followRef);
    if (!followSnap.exists()) return false;

    const followData = followSnap.data() as FollowedSeries;
    // Nếu số tập hiện tại lớn hơn số tập đã ghi nhận trước đó
    if (seriesInfo.currentEpisodes > (followData.currentEpisodeCount || 0)) {
      const notifId = `ep_${seriesInfo.slug}_${seriesInfo.currentEpisodes}`;
      const notifRef = doc(db, "users", userId, "notifications", notifId);
      const notifSnap = await getDoc(notifRef);

      if (!notifSnap.exists()) {
        const notifData: UserNotification = {
          id: notifId,
          type: "new_episode",
          title: `Tập mới: ${seriesInfo.title}`,
          message: `Phim vừa phát hành ${seriesInfo.latestEpisodeName}. Bấm vào xem ngay!`,
          link: `/movies/${seriesInfo.slug}`,
          image: seriesInfo.poster,
          movieSlug: seriesInfo.slug,
          episodeName: seriesInfo.latestEpisodeName,
          isRead: false,
          createdAt: Date.now(),
        };

        await setDoc(notifRef, cleanData(notifData));
        await updateDoc(followRef, {
          currentEpisodeCount: seriesInfo.currentEpisodes,
          lastNotifiedEpisode: seriesInfo.latestEpisodeName,
          lastNotifiedAt: Date.now(),
        });
        return true;
      }
    }
    return false;
  } catch (err) {
    console.warn("Lỗi kiểm tra tập mới phim:", err);
    return false;
  }
}
