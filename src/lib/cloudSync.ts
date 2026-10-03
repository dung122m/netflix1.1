import {
  getWatchHistory,
  setWatchHistoryFromSync,
  WatchHistoryItem,
} from "./watchHistory";
import {
  getWatchlist,
  WatchlistItem,
} from "./watchlist";

const WATCHLIST_STORAGE_KEY = "nanaflix_watchlist_v1";

// Debounce map để hạn chế số lần ghi khi người dùng đang xem phim liên tục
const cloudSaveTimers = new Map<string, NodeJS.Timeout>();

// Lưu lại trạng thái đồng bộ Cloud gần nhất để thực hiện Dirty Check
interface SyncedCloudState {
  progressSeconds: number;
  episodeSlug?: string;
  syncedAt: number;
}
const lastSyncedCloudState = new Map<string, SyncedCloudState>();
const pendingCloudSaveItems = new Map<string, WatchHistoryItem>();

async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  try {
    const { auth } = await import("@/lib/firebase");
    const token = await auth?.currentUser?.getIdToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  } catch {}
  return headers;
}

/**
 * Đồng bộ hai chiều giữa LocalStorage và Supabase Cloud qua Server API
 * Trả về danh sách đã hợp nhất mới nhất
 */
export async function syncWatchHistoryWithCloud(
  userId: string,
): Promise<WatchHistoryItem[]> {
  if (!userId) return getWatchHistory();

  try {
    const headers = await getAuthHeaders();
    if (!headers["Authorization" as keyof typeof headers]) {
      return getWatchHistory();
    }

    const res = await fetch("/api/user/history", {
      method: "GET",
      headers,
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.items)) {
        if (json.items.length > 0) {
          setWatchHistoryFromSync(json.items);
          return getWatchHistory();
        } else {
          // Khi cloud history của user mới rỗng, KHÔNG upload unscoped localList của phiên trước.
          // Đặt local history về rỗng để phân lập hoàn toàn với tài khoản trước.
          setWatchHistoryFromSync([]);
          return [];
        }
      }
    }

    return getWatchHistory();
  } catch (err) {
    console.warn("Lỗi sync watch history với Server API:", err);
    return getWatchHistory();
  }
}

/**
 * Lưu 1 mục lịch sử xem lên Cloud qua Server API (Debounced 15s + Dirty check)
 * - Tăng debounce lên 15000ms đối với tiến trình liên tục
 * - Dirty check: chỉ gửi Cloud update nếu progressSeconds thay đổi >= 10s hoặc đổi tập/buộc lưu (force)
 */
export function saveWatchItemToCloudDebounced(
  userId: string,
  item: WatchHistoryItem,
  delayMs = 15000,
  options?: { force?: boolean },
): void {
  if (!userId || !item.slug) return;

  const key = `${userId}_${item.slug}`;
  const currentProgress = item.progressSeconds ?? 0;
  const lastSynced = lastSyncedCloudState.get(key);

  const isEpisodeChanged = Boolean(lastSynced && item.episodeSlug && lastSynced.episodeSlug !== item.episodeSlug);
  const isProgressSignificant = !lastSynced || Math.abs(currentProgress - lastSynced.progressSeconds) >= 10;
  const shouldSync = options?.force || isEpisodeChanged || isProgressSignificant;

  // Luôn cập nhật thông tin mới nhất vào hàng đợi pending
  pendingCloudSaveItems.set(key, item);

  // Nếu không phải force và tiến trình chưa thay đổi đáng kể (< 10s) trên cùng 1 tập -> bỏ qua
  if (!shouldSync) {
    return;
  }

  // Nếu là sự kiện quan trọng (pause, ended, đổi tập, khởi tạo), gửi ngay lập tức
  if (options?.force) {
    if (cloudSaveTimers.has(key)) {
      clearTimeout(cloudSaveTimers.get(key));
      cloudSaveTimers.delete(key);
    }

    const targetItem = pendingCloudSaveItems.get(key) || item;
    pendingCloudSaveItems.delete(key);

    lastSyncedCloudState.set(key, {
      progressSeconds: targetItem.progressSeconds ?? 0,
      episodeSlug: targetItem.episodeSlug,
      syncedAt: Date.now(),
    });

    (async () => {
      try {
        const headers = await getAuthHeaders();
        if (!headers["Authorization" as keyof typeof headers]) return;

        await fetch("/api/user/history", {
          method: "POST",
          headers,
          body: JSON.stringify({ items: [{ ...targetItem, updatedAt: targetItem.updatedAt || Date.now() }] }),
        });
      } catch (err) {
        console.warn("Lỗi saveWatchItemToCloudDebounced (force):", err);
      }
    })();
    return;
  }

  // Nếu đã có timer 15s đang chạy, giữ nguyên timer để không bị reset vô hạn khi xem phim liên tục
  if (cloudSaveTimers.has(key)) {
    return;
  }

  const timer = setTimeout(async () => {
    cloudSaveTimers.delete(key);
    const targetItem = pendingCloudSaveItems.get(key) || item;
    pendingCloudSaveItems.delete(key);

    lastSyncedCloudState.set(key, {
      progressSeconds: targetItem.progressSeconds ?? 0,
      episodeSlug: targetItem.episodeSlug,
      syncedAt: Date.now(),
    });

    try {
      const headers = await getAuthHeaders();
      if (!headers["Authorization" as keyof typeof headers]) return;

      await fetch("/api/user/history", {
        method: "POST",
        headers,
        body: JSON.stringify({ items: [{ ...targetItem, updatedAt: targetItem.updatedAt || Date.now() }] }),
      });
    } catch (err) {
      console.warn("Lỗi saveWatchItemToCloudDebounced:", err);
    }
  }, delayMs);

  cloudSaveTimers.set(key, timer);
}

/**
 * Lưu nhiều mục lịch sử xem lên Cloud trong 1 request duy nhất (Batch POST)
 */
export async function saveWatchItemsBatchToCloud(
  userId: string,
  items: WatchHistoryItem[],
): Promise<void> {
  if (!userId || !Array.isArray(items) || items.length === 0) return;

  const validItems = items.filter((i) => i && i.slug);
  if (validItems.length === 0) return;

  const now = Date.now();
  for (const item of validItems) {
    const key = `${userId}_${item.slug}`;
    lastSyncedCloudState.set(key, {
      progressSeconds: item.progressSeconds ?? 0,
      episodeSlug: item.episodeSlug,
      syncedAt: now,
    });
  }

  try {
    const headers = await getAuthHeaders();
    if (!headers["Authorization" as keyof typeof headers]) return;

    await fetch("/api/user/history", {
      method: "POST",
      headers,
      body: JSON.stringify({
        items: validItems.map((item) => ({
          ...item,
          updatedAt: item.updatedAt || now,
        })),
      }),
    });
  } catch (err) {
    console.warn("Lỗi saveWatchItemsBatchToCloud:", err);
  }
}

/**
 * Xoá 1 mục lịch sử trên Cloud qua Server API
 */
export async function removeWatchItemFromCloud(
  userId: string,
  slug: string,
): Promise<void> {
  if (!userId || !slug) return;
  try {
    const headers = await getAuthHeaders();
    if (!headers["Authorization" as keyof typeof headers]) return;

    await fetch(`/api/user/history?slug=${encodeURIComponent(slug)}`, {
      method: "DELETE",
      headers,
    });
  } catch (err) {
    console.warn("Lỗi removeWatchItemFromCloud:", err);
  }
}

/**
 * Xoá toàn bộ lịch sử trên Cloud qua Server API
 */
export async function clearAllWatchHistoryFromCloud(
  userId: string,
): Promise<void> {
  if (!userId) return;
  try {
    const headers = await getAuthHeaders();
    if (!headers["Authorization" as keyof typeof headers]) return;

    await fetch("/api/user/history?all=true", {
      method: "DELETE",
      headers,
    });
  } catch (err) {
    console.warn("Lỗi clearAllWatchHistoryFromCloud:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ĐỒNG BỘ DANH SÁCH YÊU THÍCH (WATCHLIST) VỚI SERVER API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Đồng bộ hai chiều Danh sách yêu thích giữa LocalStorage và Supabase qua Server API
 */
export async function syncWatchlistWithCloud(
  userId: string,
): Promise<WatchlistItem[]> {
  if (!userId) return getWatchlist();

  try {
    const headers = await getAuthHeaders();
    if (!headers["Authorization" as keyof typeof headers]) {
      return getWatchlist();
    }

    const res = await fetch("/api/user/watchlist", {
      method: "GET",
      headers,
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.items)) {
        if (json.items.length > 0) {
          localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(json.items));
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("watchlist-updated"));
          }
          return json.items;
        } else {
          // Khi cloud watchlist của user mới rỗng, KHÔNG upload unscoped localList của phiên trước.
          localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify([]));
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("watchlist-updated"));
          }
          return [];
        }
      }
    }

    return getWatchlist();
  } catch (error) {
    console.warn("Lỗi đồng bộ Danh sách yêu thích với Server API:", error);
    return getWatchlist();
  }
}

/**
 * Lưu 1 phim yêu thích lên Cloud qua Server API ngay lập tức
 */
export async function saveWatchlistItemToCloud(
  userId: string,
  item: WatchlistItem,
): Promise<void> {
  if (!userId || !item.slug) return;
  try {
    const headers = await getAuthHeaders();
    if (!headers["Authorization" as keyof typeof headers]) return;

    await fetch("/api/user/watchlist", {
      method: "POST",
      headers,
      body: JSON.stringify({ items: [item] }),
    });
  } catch (err) {
    console.warn("Lỗi saveWatchlistItemToCloud:", err);
  }
}

/**
 * Xoá 1 phim khỏi Danh sách yêu thích trên Cloud qua Server API
 */
export async function removeWatchlistItemFromCloud(
  userId: string,
  slug: string,
): Promise<void> {
  if (!userId || !slug) return;
  try {
    const headers = await getAuthHeaders();
    if (!headers["Authorization" as keyof typeof headers]) return;

    await fetch(`/api/user/watchlist?slug=${encodeURIComponent(slug)}`, {
      method: "DELETE",
      headers,
    });
  } catch (err) {
    console.warn("Lỗi removeWatchlistItemFromCloud:", err);
  }
}

/**
 * Xoá toàn bộ Danh sách yêu thích trên Cloud qua Server API
 */
export async function clearAllWatchlistFromCloud(
  userId: string,
): Promise<void> {
  if (!userId) return;
  try {
    const headers = await getAuthHeaders();
    if (!headers["Authorization" as keyof typeof headers]) return;

    await fetch("/api/user/watchlist?all=true", {
      method: "DELETE",
      headers,
    });
  } catch (err) {
    console.warn("Lỗi clearAllWatchlistFromCloud:", err);
  }
}


