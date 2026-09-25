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

interface NotificationSingleton {
  userId: string;
  listeners: Set<(notifications: UserNotification[]) => void>;
  cachedData: UserNotification[] | null;
  inFlightPromise: Promise<UserNotification[]> | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  realtimeChannel: any | null;
  cleanupTimer: NodeJS.Timeout | null;
}

let activeSingleton: NotificationSingleton | null = null;

const CLEANUP_GRACE_PERIOD_MS = 1000;

function broadcastUpdate(userId: string, incoming: UserNotification[]) {
  if (!activeSingleton || activeSingleton.userId !== userId) return;

  const current = activeSingleton.cachedData || getLocalNotifications(userId);
  const merged = mergeNotifications(current, incoming, userId);
  activeSingleton.cachedData = merged;
  saveLocalNotifications(userId, merged);

  for (const listener of activeSingleton.listeners) {
    try {
      listener(merged);
    } catch (e) {
      console.error("Lỗi notification listener:", e);
    }
  }
}

function fetchSingletonNotifications(userId: string): Promise<UserNotification[]> {
  if (!activeSingleton || activeSingleton.userId !== userId) {
    return Promise.resolve([]);
  }

  // Chia sẻ promise đang bay nếu có subscriber khác hoặc request trước đó đang chạy
  if (activeSingleton.inFlightPromise) {
    return activeSingleton.inFlightPromise;
  }

  if (!isSupabaseConfigured()) {
    return Promise.resolve([]);
  }

  const promise = getUserNotificationsSupabase(userId)
    .then((items) => {
      if (!activeSingleton || activeSingleton.userId !== userId) {
        return [];
      }
      activeSingleton.inFlightPromise = null;
      if (Array.isArray(items) && items.length > 0) {
        broadcastUpdate(userId, items);
      }
      return items || [];
    })
    .catch((err) => {
      if (activeSingleton && activeSingleton.userId === userId) {
        activeSingleton.inFlightPromise = null;
      }
      console.warn("Lỗi nạp thông báo người dùng:", err);
      return [];
    });

  activeSingleton.inFlightPromise = promise;
  return promise;
}

function setupSingletonRealtime(userId: string) {
  if (!supabase || !activeSingleton || activeSingleton.userId !== userId) return;

  try {
    const channelName = `realtime_notifs_${userId}`;
    const newChannel = supabase.channel(channelName);
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
          if (activeSingleton && activeSingleton.userId === userId) {
            fetchSingletonNotifications(userId);
          }
        },
      )
      .subscribe();
    activeSingleton.realtimeChannel = newChannel;
  } catch (err) {
    console.warn("Lỗi đăng ký Realtime notifications:", err);
  }
}

function teardownSingleton(singleton: NotificationSingleton) {
  if (singleton.cleanupTimer) {
    clearTimeout(singleton.cleanupTimer);
    singleton.cleanupTimer = null;
  }
  if (singleton.realtimeChannel && supabase) {
    try {
      supabase.removeChannel(singleton.realtimeChannel);
    } catch {}
    singleton.realtimeChannel = null;
  }
  singleton.listeners.clear();
}

if (typeof window !== "undefined") {
  window.addEventListener("nanaflix-notifications-updated", (e: Event) => {
    const customEvt = e as CustomEvent<{ userId: string; items: UserNotification[] }>;
    if (
      customEvt.detail &&
      activeSingleton &&
      activeSingleton.userId === customEvt.detail.userId
    ) {
      activeSingleton.cachedData = customEvt.detail.items;
      for (const listener of activeSingleton.listeners) {
        try {
          listener(customEvt.detail.items);
        } catch {}
      }
    }
  });
}

/**
 * Lắng nghe thông báo thời gian thực từ Supabase theo mô hình Shared Service-Level Singleton
 * - Đúng 1 initial GET /api/notifications cho mỗi user
 * - Đúng 1 Supabase Realtime channel cho mỗi user
 * - Mọi subscriber (Navbar, NavNotifications, DesktopReplyPopup) dùng chung state và event
 */
export function subscribeUserNotifications(
  userId: string,
  callback: (notifications: UserNotification[]) => void,
): () => void {
  if (!userId) {
    callback([]);
    return () => {};
  }

  // 1. Nếu đổi user (logout / switch account), dọn dẹp ngay lập tức singleton của user cũ
  if (activeSingleton && activeSingleton.userId !== userId) {
    teardownSingleton(activeSingleton);
    activeSingleton = null;
  }

  // 2. Nếu singleton của user đã tồn tại (subscriber thứ 2, 3...)
  if (activeSingleton && activeSingleton.userId === userId) {
    // Hủy bộ hẹn giờ cleanup nếu có component vừa unmount trước đó (chống Strict Mode flutter)
    if (activeSingleton.cleanupTimer) {
      clearTimeout(activeSingleton.cleanupTimer);
      activeSingleton.cleanupTimer = null;
    }

    activeSingleton.listeners.add(callback);

    // Gửi ngay dữ liệu RAM nếu đã nạp
    if (activeSingleton.cachedData) {
      callback(activeSingleton.cachedData);
    } else {
      // Nếu RAM chưa có dữ liệu, trả tạm LocalStorage cache (0ms) trong lúc đợi inFlightPromise
      const local = getLocalNotifications(userId);
      if (local.length > 0) {
        callback(local);
      }
    }
  } else {
    // 3. Subscriber đầu tiên của user: khởi tạo Singleton Manager
    const local = getLocalNotifications(userId);
    activeSingleton = {
      userId,
      listeners: new Set([callback]),
      cachedData: local.length > 0 ? local : null,
      inFlightPromise: null,
      realtimeChannel: null,
      cleanupTimer: null,
    };

    // Phục hồi ngay dữ liệu từ LocalStorage (0ms)
    if (local.length > 0) {
      callback(local);
    }

    // Khởi tạo DUY NHẤT 1 Realtime channel
    setupSingletonRealtime(userId);

    // Khởi tạo DUY NHẤT 1 initial fetch
    fetchSingletonNotifications(userId);
  }

  // Trả về hàm cleanup cho subscriber này
  return () => {
    if (!activeSingleton || activeSingleton.userId !== userId) return;

    activeSingleton.listeners.delete(callback);

    // Nếu vẫn còn component khác đang lắng nghe, giữ nguyên kết nối Realtime
    if (activeSingleton.listeners.size > 0) {
      return;
    }

    // Không còn listener nào: hẹn giờ dọn dẹp sau grace period (1000ms)
    // để tránh ngắt kết nối giả khi React Strict Mode remount hoặc chuyển route
    if (activeSingleton.cleanupTimer) {
      clearTimeout(activeSingleton.cleanupTimer);
    }

    activeSingleton.cleanupTimer = setTimeout(() => {
      if (!activeSingleton || activeSingleton.userId !== userId) return;
      if (activeSingleton.listeners.size > 0) return; // Đã có subscriber mới gia nhập

      teardownSingleton(activeSingleton);
      activeSingleton = null;
    }, CLEANUP_GRACE_PERIOD_MS);

    const timerObj = activeSingleton.cleanupTimer as unknown as { unref?: () => void };
    if (typeof timerObj?.unref === "function") {
      timerObj.unref();
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


