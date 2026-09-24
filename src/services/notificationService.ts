import { UserNotification } from "@/types/notification";
import {
  getUserNotificationsSupabase,
  markNotificationAsReadSupabase,
  markAllNotificationsAsReadSupabase,
  deleteNotificationSupabase,
} from "./supabaseService";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

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
 * Lấy danh sách thông báo từ bộ nhớ đệm LocalStorage (Chỉ giữ comment_reply và comment_reaction)
 */
export function getLocalNotifications(userId: string): UserNotification[] {
  if (typeof window === "undefined" || !userId) return [];
  const lastRead = getLastReadTimestamp(userId);
  try {
    const raw = localStorage.getItem(`nanaflix_notifs_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item) => item && (item.type === "comment_reply" || item.type === "comment_reaction"))
          .map((item) => ({
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
    const filtered = items.filter(
      (item) => item && (item.type === "comment_reply" || item.type === "comment_reaction")
    );
    localStorage.setItem(`nanaflix_notifs_${userId}`, JSON.stringify(filtered.slice(0, 50)));
  } catch {}
}

/**
 * Hợp nhất danh sách thông báo mới với danh sách cũ và khử trùng lặp thông minh (Chỉ giữ comment_reply và comment_reaction)
 */
export function mergeNotifications(
  current: UserNotification[],
  incoming: UserNotification[],
  userId?: string,
): UserNotification[] {
  const lastRead = userId ? getLastReadTimestamp(userId) : 0;
  const combined = [...incoming, ...current];
  const seenExactIds = new Set<string>();
  const seenSemanticKeys = new Set<string>();
  const result: UserNotification[] = [];

  for (const item of combined) {
    if (!item || !item.id) continue;
    if (item.type !== "comment_reply" && item.type !== "comment_reaction") continue;

    const semanticKey = item.commentId && item.type === "comment_reply"
      ? `cmt_${item.commentId}`
      : item.commentId && item.type === "comment_reaction"
      ? `react_${item.commentId}`
      : `${item.type}_${item.id}`;

    if (seenExactIds.has(item.id) || seenSemanticKeys.has(semanticKey)) {
      continue;
    }

    seenExactIds.add(item.id);
    seenSemanticKeys.add(semanticKey);

    const isAutoRead = lastRead > 0 && (item.createdAt || 0) <= lastRead;
    result.push({
      ...item,
      isRead: Boolean(item.isRead || isAutoRead),
    });
  }

  return result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
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
  let lastNotificationFetch = Date.now();
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

  const handleVisibilityOrFocus = () => {
    if (isUnsubscribed) return;
    if (typeof document !== "undefined" && !document.hidden) {
      if (Date.now() - lastNotificationFetch > 25000) {
        lastNotificationFetch = Date.now();
        fetchSupabaseNotifications();
      }
    }
  };

  // Polling dự phòng nhẹ (chỉ mỗi 5 phút và khi tab active) đề phòng trường hợp mất kết nối WebSocket
  const pollInterval = setInterval(() => {
    if (!isUnsubscribed && typeof document !== "undefined" && !document.hidden) {
      if (Date.now() - lastNotificationFetch > 180000) {
        lastNotificationFetch = Date.now();
        fetchSupabaseNotifications();
      }
    }
  }, 300000);

  // 4. Lắng nghe thông báo mới tức thời qua Supabase Realtime WebSocket (< 50ms)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let channel: any = null;
  if (supabase) {
    try {
      const uniqueChannelName = `realtime_notifs_${userId}_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
      const newChannel = supabase.channel(uniqueChannelName);
      newChannel
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            if (!isUnsubscribed) {
              lastNotificationFetch = Date.now();
              fetchSupabaseNotifications();
            }
          }
        )
        .subscribe();
      channel = newChannel;
    } catch (err) {
      console.warn("Lỗi đăng ký Realtime notifications:", err);
    }
  }

  return () => {
    isUnsubscribed = true;
    clearInterval(pollInterval);
    if (channel && supabase) {
      try {
        supabase.removeChannel(channel);
      } catch {}
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("nanaflix-notifications-updated", handleLocalEvent);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
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

  // 2. Cập nhật Server API
  try {
    const { auth } = await import("@/lib/firebase");
    const idToken = await auth?.currentUser?.getIdToken().catch(() => null);
    if (idToken) {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ notifId: notificationId }),
      });
    } else if (isSupabaseConfigured()) {
      markNotificationAsReadSupabase(userId, notificationId).catch(() => {});
    }
  } catch {
    if (isSupabaseConfigured()) {
      markNotificationAsReadSupabase(userId, notificationId).catch(() => {});
    }
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

  // 2. Cập nhật Server API
  try {
    const { auth } = await import("@/lib/firebase");
    const idToken = await auth?.currentUser?.getIdToken().catch(() => null);
    if (idToken) {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ all: true }),
      });
    } else if (isSupabaseConfigured()) {
      markAllNotificationsAsReadSupabase(userId).catch(() => {});
    }
  } catch {
    if (isSupabaseConfigured()) {
      markAllNotificationsAsReadSupabase(userId).catch(() => {});
    }
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

  // 2. Cập nhật Server API
  try {
    const { auth } = await import("@/lib/firebase");
    const idToken = await auth?.currentUser?.getIdToken().catch(() => null);
    if (idToken) {
      await fetch(`/api/notifications?notifId=${encodeURIComponent(notificationId)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
    } else if (isSupabaseConfigured()) {
      deleteNotificationSupabase(userId, notificationId).catch(() => {});
    }
  } catch {
    if (isSupabaseConfigured()) {
      deleteNotificationSupabase(userId, notificationId).catch(() => {});
    }
  }
}


