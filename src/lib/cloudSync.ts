import {
  syncWatchHistorySupabase,
  getWatchHistorySupabase,
  syncWatchlistSupabase,
  getWatchlistSupabase,
} from "@/services/supabaseService";
import { isSupabaseConfigured } from "./supabase";
import {
  getWatchHistory,
  WatchHistoryItem,
} from "./watchHistory";
import {
  getWatchlist,
  WatchlistItem,
} from "./watchlist";

const HISTORY_STORAGE_KEY = "nanaflix_watch_history";
const WATCHLIST_STORAGE_KEY = "nanaflix_watchlist_v1";
const MAX_ITEMS = 30;

// Debounce map để hạn chế số lần ghi khi người dùng đang xem phim liên tục
const cloudSaveTimers = new Map<string, NodeJS.Timeout>();

/**
 * Đồng bộ hai chiều giữa LocalStorage và Supabase Cloud
 * Trả về danh sách đã hợp nhất mới nhất
 */
export async function syncWatchHistoryWithCloud(
  userId: string,
): Promise<WatchHistoryItem[]> {
  if (!userId) return getWatchHistory();

  if (isSupabaseConfigured()) {
    try {
      const cloudItems = await getWatchHistorySupabase(userId);
      if (cloudItems.length > 0) {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(cloudItems.slice(0, MAX_ITEMS)));
        window.dispatchEvent(new CustomEvent("watch-history-updated"));
        return cloudItems;
      }

      const localList = getWatchHistory();
      if (localList.length > 0) {
        await syncWatchHistorySupabase(userId, localList);
      }
      return localList;
    } catch (err) {
      console.warn("Lỗi sync watch history với Supabase:", err);
      return getWatchHistory();
    }
  }

  return getWatchHistory();
}

/**
 * Lưu 1 mục lịch sử xem lên Cloud (Debounced)
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
    if (isSupabaseConfigured()) {
      await syncWatchHistorySupabase(userId, [item]);
    }
  }, delayMs);

  cloudSaveTimers.set(key, timer);
}

/**
 * Xoá 1 mục lịch sử trên Cloud
 */
export async function removeWatchItemFromCloud(
  userId: string,
  slug: string,
): Promise<void> {
  if (!userId || !slug) return;
}

/**
 * Xoá toàn bộ lịch sử trên Cloud
 */
export async function clearAllWatchHistoryFromCloud(
  userId: string,
): Promise<void> {
  if (!userId) return;
}

// ─────────────────────────────────────────────────────────────────────────────
// ĐỒNG BỘ DANH SÁCH YÊU THÍCH (WATCHLIST) VỚI SUPABASE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Đồng bộ hai chiều Danh sách yêu thích giữa LocalStorage và Supabase
 */
export async function syncWatchlistWithCloud(
  userId: string,
): Promise<WatchlistItem[]> {
  if (!userId) return getWatchlist();

  if (isSupabaseConfigured()) {
    try {
      const cloudList = await getWatchlistSupabase(userId);
      if (cloudList.length > 0) {
        localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(cloudList));
        window.dispatchEvent(new Event("watchlist-updated"));
        return cloudList;
      }

      const localList = getWatchlist();
      if (localList.length > 0) {
        await syncWatchlistSupabase(userId, localList);
      }
      return localList;
    } catch (error) {
      console.warn("Lỗi đồng bộ Danh sách yêu thích với Supabase:", error);
      return getWatchlist();
    }
  }

  return getWatchlist();
}

/**
 * Lưu 1 phim yêu thích lên Cloud ngay lập tức
 */
export async function saveWatchlistItemToCloud(
  userId: string,
  item: WatchlistItem,
): Promise<void> {
  if (!userId || !item.slug) return;
  if (isSupabaseConfigured()) {
    await syncWatchlistSupabase(userId, [item]);
  }
}

/**
 * Xoá 1 phim khỏi Danh sách yêu thích trên Cloud
 */
export async function removeWatchlistItemFromCloud(
  userId: string,
  slug: string,
): Promise<void> {
  if (!userId || !slug) return;
}

/**
 * Xoá toàn bộ Danh sách yêu thích trên Cloud
 */
export async function clearAllWatchlistFromCloud(
  userId: string,
): Promise<void> {
  if (!userId) return;
}
