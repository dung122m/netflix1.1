import { auth } from "@/lib/firebase";
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
const MAX_ITEMS = 30;

// Debounce map để hạn chế số lần ghi khi người dùng đang xem phim liên tục
const cloudSaveTimers = new Map<string, NodeJS.Timeout>();

async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  try {
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
      if (json.success && Array.isArray(json.items) && json.items.length > 0) {
        setWatchHistoryFromSync(json.items);
        return json.items;
      }
    }

    // Nếu remote chưa có nhưng local có, sync lên server
    const localList = getWatchHistory();
    if (localList.length > 0) {
      await fetch("/api/user/history", {
        method: "POST",
        headers,
        body: JSON.stringify({ items: localList.slice(0, MAX_ITEMS) }),
      });
    }
    return localList;
  } catch (err) {
    console.warn("Lỗi sync watch history với Server API:", err);
    return getWatchHistory();
  }
}

/**
 * Lưu 1 mục lịch sử xem lên Cloud qua Server API (Debounced)
 */
export function saveWatchItemToCloudDebounced(
  userId: string,
  item: WatchHistoryItem,
  delayMs = 2500,
): void {
  if (!userId || !item.slug) return;

  const key = `${userId}_${item.slug}`;
  if (cloudSaveTimers.has(key)) {
    clearTimeout(cloudSaveTimers.get(key));
  }

  const timer = setTimeout(async () => {
    cloudSaveTimers.delete(key);
    try {
      const headers = await getAuthHeaders();
      if (!headers["Authorization" as keyof typeof headers]) return;

      await fetch("/api/user/history", {
        method: "POST",
        headers,
        body: JSON.stringify({ items: [{ ...item, updatedAt: item.updatedAt || Date.now() }] }),
      });
    } catch (err) {
      console.warn("Lỗi saveWatchItemToCloudDebounced:", err);
    }
  }, delayMs);

  cloudSaveTimers.set(key, timer);
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
      if (json.success && Array.isArray(json.items) && json.items.length > 0) {
        localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(json.items));
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("watchlist-updated"));
        }
        return json.items;
      }
    }

    const localList = getWatchlist();
    if (localList.length > 0) {
      await fetch("/api/user/watchlist", {
        method: "POST",
        headers,
        body: JSON.stringify({ items: localList }),
      });
    }
    return localList;
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


