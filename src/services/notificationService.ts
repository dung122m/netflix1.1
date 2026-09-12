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
 * Lắng nghe thông báo thời gian thực từ Firestore (onSnapshot)
 */
export function subscribeUserNotifications(
  userId: string,
  callback: (notifications: UserNotification[]) => void,
): () => void {
  if (!db || !userId) {
    callback([]);
    return () => {};
  }

  try {
    const col = collection(db, "users", userId, "notifications");
    const unsubscribe = onSnapshot(
      col,
      (snapshot) => {
        const list: UserNotification[] = [];
        snapshot.forEach((d) => {
          const item = { id: d.id, ...d.data() } as UserNotification;
          list.push(item);
        });
        // Sắp xếp giảm dần theo thời gian tạo trong bộ nhớ (tránh composite index)
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        callback(list);
      },
      (error) => {
        console.warn("Lỗi realtime thông báo người dùng:", error);
      },
    );
    return unsubscribe;
  } catch (err) {
    console.warn("Lỗi khởi tạo lắng nghe thông báo:", err);
    return () => {};
  }
}

/**
 * Đánh dấu thông báo là đã đọc
 */
export async function markNotificationAsRead(
  userId: string,
  notificationId: string,
): Promise<void> {
  if (!db || !userId || !notificationId) return;
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
  if (!db || !userId) return;
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
  if (!db || !userId || !notificationId) return;
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
