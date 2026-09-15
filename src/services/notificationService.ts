import { FollowedSeries, UserNotification } from "@/types/notification";
import {
  getUserNotificationsSupabase,
  markNotificationAsReadSupabase,
  markAllNotificationsAsReadSupabase,
  createNotificationSupabase,
} from "./supabaseService";
import { isSupabaseConfigured } from "@/lib/supabase";

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

const FOLLOWED_SERIES_PREFIX = "nanaflix_followed_series_";

/**
 * Kiểm tra xem người dùng có đang theo dõi phim bộ này không
 */
export async function isFollowingSeries(
  userId: string,
  slug: string,
): Promise<boolean> {
  if (!userId || !slug) return false;
  try {
    const list = await getFollowedSeriesList(userId);
    return list.some((item) => item.slug === slug);
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
  if (!userId || !series.slug) return false;
  try {
    const list = await getFollowedSeriesList(userId);
    const existingIndex = list.findIndex((item) => item.slug === series.slug);
    let isNowFollowing = false;
    let updatedList: FollowedSeries[];

    if (existingIndex >= 0) {
      updatedList = list.filter((item) => item.slug !== series.slug);
      isNowFollowing = false;
    } else {
      const newFollow: FollowedSeries = {
        ...series,
        followedAt: Date.now(),
      };
      updatedList = [newFollow, ...list];
      isNowFollowing = true;
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(
        `${FOLLOWED_SERIES_PREFIX}${userId}`,
        JSON.stringify(updatedList),
      );
      window.dispatchEvent(new Event("nanaflix-followed-series-updated"));
    }

    return isNowFollowing;
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
  if (!userId || typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${FOLLOWED_SERIES_PREFIX}${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) => (b.followedAt || 0) - (a.followedAt || 0));
      }
    }
  } catch (err) {
    console.warn("Lỗi lấy danh sách phim theo dõi:", err);
  }
  return [];
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
 * Lắng nghe thông báo thời gian thực từ Supabase + Local Storage Cache + Custom Event
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

  // 3. Nạp danh sách thông báo từ Supabase lúc khởi tạo
  const fetchSupabaseNotifications = () => {
    if (isSupabaseConfigured()) {
      getUserNotificationsSupabase(userId)
        .then((items) => {
          if (items && items.length > 0 && !isUnsubscribed) {
            dispatchUpdate(items);
          }
        })
        .catch(() => {});
    }
  };

  fetchSupabaseNotifications();

  // Polling định kỳ mỗi 8s để đồng bộ thông báo mới từ Supabase
  const pollInterval = setInterval(() => {
    if (!isUnsubscribed && typeof document !== "undefined" && !document.hidden) {
      fetchSupabaseNotifications();
    }
  }, 8000);

  return () => {
    isUnsubscribed = true;
    clearInterval(pollInterval);
    if (typeof window !== "undefined") {
      window.removeEventListener("nanaflix-notifications-updated", handleLocalEvent);
    }
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

  // 2. Cập nhật Supabase
  if (isSupabaseConfigured()) {
    markNotificationAsReadSupabase(userId, notificationId).catch(() => {});
  }
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

  // 2. Cập nhật Supabase
  if (isSupabaseConfigured()) {
    markAllNotificationsAsReadSupabase(userId).catch(() => {});
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

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("nanaflix-notifications-updated", {
        detail: { userId, items: updated },
      }),
    );
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
  if (!userId || !seriesInfo.slug) return false;
  try {
    const list = await getFollowedSeriesList(userId);
    const followed = list.find((item) => item.slug === seriesInfo.slug);
    if (!followed) return false;

    // Nếu số tập hiện tại lớn hơn số tập đã ghi nhận trước đó
    if (seriesInfo.currentEpisodes > (followed.currentEpisodeCount || 0)) {
      const notifId = `ep_${seriesInfo.slug}_${seriesInfo.currentEpisodes}`;
      const notifData: UserNotification = {
        id: notifId,
        type: "new_episode",
        title: `Tập mới: ${seriesInfo.title}`,
        message: `Phim vừa phát hành ${seriesInfo.latestEpisodeName}. Bấm vào xem ngay!`,
        link: `/movies/${seriesInfo.slug}`,
        movieSlug: seriesInfo.slug,
        isRead: false,
        createdAt: Date.now(),
      };

      if (isSupabaseConfigured()) {
        await createNotificationSupabase({ ...notifData, userId });
      }

      // Cập nhật lại số tập đã lưu
      const updatedList = list.map((item) =>
        item.slug === seriesInfo.slug
          ? {
              ...item,
              currentEpisodeCount: seriesInfo.currentEpisodes,
              lastNotifiedEpisode: seriesInfo.latestEpisodeName,
              lastNotifiedAt: Date.now(),
            }
          : item,
      );

      if (typeof window !== "undefined") {
        localStorage.setItem(
          `${FOLLOWED_SERIES_PREFIX}${userId}`,
          JSON.stringify(updatedList),
        );
      }

      return true;
    }
    return false;
  } catch (err) {
    console.warn("Lỗi kiểm tra tập mới phim:", err);
    return false;
  }
}
