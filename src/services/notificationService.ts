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
  query,
  where,
  limit,
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
 * Lấy mốc thời gian đã đọc hết thông báo từ LocalStorage
 */
export function getLastReadTimestamp(userId: string): number {
  if (typeof window === "undefined" || !userId) return 0;
  try {
    const raw = localStorage.getItem(`nanaflix_notifs_last_read_${userId}`);
    if (raw) return Number(raw) || 0;
  } catch {}
  return 0;
}

/**
 * Lưu mốc thời gian đã đọc hết thông báo vào LocalStorage
 */
export function setLastReadTimestamp(userId: string, ts: number): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.setItem(`nanaflix_notifs_last_read_${userId}`, String(ts));
  } catch {}
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
export function getLocalNotifications(userId: string): UserNotification[] {
  if (typeof window === "undefined" || !userId) return [];
  const lastRead = getLastReadTimestamp(userId);
  try {
    const raw = localStorage.getItem(`nanaflix_notifs_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => ({
          ...item,
          isRead: Boolean(
            item.isRead ||
            (lastRead > 0 && (item.createdAt || 0) <= lastRead),
          ),
        }));
      }
    }
  } catch {}
  return [];
}

/**
 * Lưu danh sách thông báo vào bộ nhớ đệm LocalStorage
 */
export function saveLocalNotifications(userId: string, items: UserNotification[]): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.setItem(`nanaflix_notifs_${userId}`, JSON.stringify(items.slice(0, 50)));
  } catch {}
}

/**
 * Hợp nhất danh sách thông báo mới với danh sách cũ theo id
 */
export function mergeNotifications(
  current: UserNotification[],
  incoming: UserNotification[],
  userId?: string,
): UserNotification[] {
  const lastRead = userId ? getLastReadTimestamp(userId) : 0;
  const map = new Map<string, UserNotification>();
  current.forEach((item) => map.set(item.id, item));
  incoming.forEach((item) => {
    const existing = map.get(item.id);
    const isAutoRead = lastRead > 0 && (item.createdAt || 0) <= lastRead;
    if (existing) {
      map.set(item.id, {
        ...existing,
        ...item,
        isRead: Boolean(existing.isRead || item.isRead || isAutoRead),
      });
    } else {
      map.set(item.id, {
        ...item,
        isRead: Boolean(item.isRead || isAutoRead),
      });
    }
  });
  return Array.from(map.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

/**
 * Lắng nghe thông báo thời gian thực từ Firestore (onSnapshot) + Local Storage Cache + Custom Event
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
  const unsubs: Array<() => void> = [];

  // 1. Phục hồi ngay lập tức thông báo từ LocalStorage (0ms)
  const cached = getLocalNotifications(userId);
  if (cached.length > 0) {
    callback(cached);
  }

  const dispatchUpdate = (incoming: UserNotification[]) => {
    if (isUnsubscribed) return;
    const merged = mergeNotifications(
      getLocalNotifications(userId),
      incoming,
      userId,
    );
    saveLocalNotifications(userId, merged);
    callback(merged);
  };

  // 2. Lắng nghe CustomEvent khi có cập nhật từ component khác
  const handleLocalEvent = (e: Event) => {
    const customEvt = e as CustomEvent<{ userId: string; items: UserNotification[] }>;
    if (customEvt.detail && customEvt.detail.userId === userId && !isUnsubscribed) {
      callback(customEvt.detail.items);
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("nanaflix-notifications-updated", handleLocalEvent);
  }

  // 3. Nạp danh sách thông báo từ Server API và poll ngầm định kỳ
  const fetchServerNotifications = () => {
    if (isUnsubscribed) return;
    fetch(`/api/notifications?userId=${encodeURIComponent(userId)}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.items && Array.isArray(json.items) && !isUnsubscribed) {
          dispatchUpdate(json.items as UserNotification[]);
        }
      })
      .catch(() => {});
  };

  fetchServerNotifications();
  const pollInterval = setInterval(fetchServerNotifications, 8000);

  if (db) {
    try {
      // 4. Kênh 1: Lắng nghe subcollection notifications của user
      const col = collection(db, "users", userId, "notifications");
      const unsub1 = onSnapshot(
        col,
        (snapshot) => {
          if (isUnsubscribed) return;
          const list: UserNotification[] = [];
          snapshot.forEach((d) => {
            const item = { id: d.id, ...d.data() } as UserNotification;
            list.push(item);
          });
          if (list.length > 0) {
            dispatchUpdate(list);
          }
        },
        (error) => {
          console.warn("Lỗi realtime subcollection notifications:", error);
        },
      );
      unsubs.push(unsub1);

      // 5. Kênh 2: Lắng nghe realtime trực tiếp từ movie_comments (khi ai đó reply trực tiếp @userId)
      const qReplies = query(
        collection(db, "movie_comments"),
        where("replyToUserId", "==", userId),
        limit(50),
      );
      const unsub2 = onSnapshot(
        qReplies,
        (snapshot) => {
          if (isUnsubscribed) return;
          const lastRead = getLastReadTimestamp(userId);
          const list: UserNotification[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            if (data.userId === userId) return; // Không tự thông báo cho chính mình
            const cId = d.id;
            const cCreatedAt = Number(data.createdAt) || Date.now();
            const notifItem: UserNotification = {
              id: `reply_direct_${cId}`,
              type: "comment_reply",
              title: `${data.userName || "Thành viên"} đã trả lời bình luận của bạn`,
              message:
                data.content && data.content.length > 80
                  ? data.content.slice(0, 80) + "..."
                  : data.content || "",
              link: `/movies/${data.movieSlug}?highlightComment=${cId}#comment-${cId}`,
              movieSlug: data.movieSlug,
              commentId: cId,
              replierName: data.userName,
              replierAvatar: data.userAvatar,
              isRead: Boolean(lastRead > 0 && cCreatedAt <= lastRead),
              createdAt: cCreatedAt,
            };
            list.push(notifItem);
          });
          if (list.length > 0) {
            dispatchUpdate(list);
          }
        },
        (error) => {
          console.warn("Lỗi realtime replyToUserId movie_comments:", error);
        },
      );
      unsubs.push(unsub2);

      // 6. Kênh 3: Lắng nghe realtime từ movie_comments khi ai đó reply vào bài đánh giá gốc (parentOwnerId == userId)
      const qParentOwner = query(
        collection(db, "movie_comments"),
        where("parentOwnerId", "==", userId),
        limit(50),
      );
      const unsub3 = onSnapshot(
        qParentOwner,
        (snapshot) => {
          if (isUnsubscribed) return;
          const lastRead = getLastReadTimestamp(userId);
          const list: UserNotification[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            if (data.userId === userId) return;
            const cId = d.id;
            const cCreatedAt = Number(data.createdAt) || Date.now();
            const notifItem: UserNotification = {
              id: `reply_root_${cId}`,
              type: "comment_reply",
              title: `${data.userName || "Thành viên"} đã bình luận trong bài đánh giá của bạn`,
              message:
                data.content && data.content.length > 80
                  ? data.content.slice(0, 80) + "..."
                  : data.content || "",
              link: `/movies/${data.movieSlug}?highlightComment=${cId}#comment-${cId}`,
              movieSlug: data.movieSlug,
              commentId: cId,
              replierName: data.userName,
              replierAvatar: data.userAvatar,
              isRead: Boolean(lastRead > 0 && cCreatedAt <= lastRead),
              createdAt: cCreatedAt,
            };
            list.push(notifItem);
          });
          if (list.length > 0) {
            dispatchUpdate(list);
          }
        },
        (error) => {
          console.warn("Lỗi realtime parentOwnerId movie_comments:", error);
        },
      );
      unsubs.push(unsub3);
    } catch (err) {
      console.warn("Lỗi khởi tạo listener thông báo:", err);
    }
  }

  return () => {
    isUnsubscribed = true;
    clearInterval(pollInterval);
    if (typeof window !== "undefined") {
      window.removeEventListener("nanaflix-notifications-updated", handleLocalEvent);
    }
    unsubs.forEach((u) => u());
  };
}

/**
 * Đánh dấu 1 thông báo là đã đọc
 */
export async function markNotificationAsRead(
  userId: string,
  notificationId: string,
): Promise<void> {
  if (!userId || !notificationId) return;

  // 1. Cập nhật ngay trong LocalStorage & Broadcast 0ms
  const list = getLocalNotifications(userId);
  const updated = list.map((item) =>
    item.id === notificationId ? { ...item, isRead: true } : item,
  );
  saveLocalNotifications(userId, updated);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("nanaflix-notifications-updated", {
        detail: { userId, items: updated },
      }),
    );
  }

  // 2. Cập nhật Firestore (dùng setDoc merge để tạo doc nếu chưa có)
  const firestore = db;
  if (firestore) {
    try {
      const ref = doc(firestore, "users", userId, "notifications", notificationId);
      await setDoc(ref, { isRead: true }, { merge: true });
    } catch (err) {
      console.warn("Lỗi đánh dấu đã đọc thông báo qua Firestore:", err);
    }
  }

  // 3. Fallback Server API PATCH
  try {
    fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, notifId: notificationId }),
    }).catch(() => {});
  } catch {}
}

/**
 * Đánh dấu toàn bộ thông báo là đã đọc
 */
export async function markAllNotificationsAsRead(
  userId: string,
): Promise<void> {
  if (!userId) return;

  const now = Date.now();
  setLastReadTimestamp(userId, now);

  // 1. Cập nhật ngay trong LocalStorage & Broadcast 0ms
  const list = getLocalNotifications(userId);
  const updated = list.map((item) => ({ ...item, isRead: true }));
  saveLocalNotifications(userId, updated);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("nanaflix-notifications-updated", {
        detail: { userId, items: updated },
      }),
    );
  }

  // 2. Cập nhật Firestore (Cập nhật cả user doc lastReadNotificationsAt và các doc con)
  const firestore = db;
  if (firestore) {
    try {
      // Cập nhật timestamp trên user profile
      const userRef = doc(firestore, "users", userId);
      await setDoc(userRef, { lastReadNotificationsAt: now }, { merge: true });

      // Cập nhật tất cả docs trong notifications
      const col = collection(firestore, "users", userId, "notifications");
      const snapshot = await getDocs(col);
      if (!snapshot.empty) {
        const batch = writeBatch(firestore);
        snapshot.forEach((d) => {
          if (!d.data().isRead) {
            batch.set(d.ref, { isRead: true }, { merge: true });
          }
        });
        await batch.commit();
      }

      // Lưu lại trạng thái đã đọc cho các thông báo hiện có trong list
      if (updated.length > 0) {
        const batch2 = writeBatch(firestore);
        updated.forEach((item) => {
          const itemRef = doc(firestore, "users", userId, "notifications", item.id);
          batch2.set(itemRef, { isRead: true }, { merge: true });
        });
        await batch2.commit().catch(() => {});
      }
    } catch (err) {
      console.warn("Lỗi đánh dấu đã đọc tất cả thông báo qua Firestore:", err);
    }
  }

  // 3. Fallback Server API PATCH
  try {
    fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, all: true, timestamp: now }),
    }).catch(() => {});
  } catch {}
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

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("nanaflix-notifications-updated", {
        detail: { userId, items: updated },
      }),
    );
  }

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
