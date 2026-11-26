import {
  getWatchHistory,
  setWatchHistoryFromSync,
  registerWatchHistorySyncHandler,
  WatchHistoryItem,
} from "./watchHistory";
import { getWatchedEpisodes } from "./episodeTracker";
import { getFirebaseAuthHeaders } from "./clientAuth";
import {
  getWatchlist,
  registerWatchlistSyncHandler,
  WatchlistItem,
  mergeWatchlists,
} from "./watchlist";
import {
  getFavoriteActors,
  registerFavoriteActorsSyncHandler,
  FavoriteActorItem,
  mergeFavoriteActors,
  setFavoriteActorsFromSync,
} from "@/services/actor/favoriteActors";

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

export function mergeWatchedEpisodesForCloud(item: WatchHistoryItem): string[] {
  const fromItem = Array.isArray(item.watchedEpisodes) ? item.watchedEpisodes : [];
  const fromLocal =
    typeof window !== "undefined" && item.slug ? getWatchedEpisodes(item.slug) : [];
  return Array.from(new Set([...fromLocal, ...fromItem].filter(Boolean)));
}

async function getAuthHeaders(expectedUserId?: string): Promise<HeadersInit> {
  return getFirebaseAuthHeaders({ expectedUserId });
}

const lastHistorySyncMap = new Map<string, number>();
const lastActorsSyncMap = new Map<string, number>();
const inFlightHistorySync = new Map<string, Promise<WatchHistoryItem[]>>();
const inFlightWatchlistSync = new Map<string, Promise<WatchlistItem[]>>();
const inFlightFavoriteActorsSync = new Map<string, Promise<FavoriteActorItem[]>>();
const HISTORY_SYNC_THROTTLE_MS = 5 * 60 * 1000; // Tối thiểu 5 phút giữa các lần GET /api/user/history tự động theo từng user
const ACTORS_SYNC_THROTTLE_MS = 60 * 1000;

export function cancelPendingCloudSync(): void {
  for (const timer of cloudSaveTimers.values()) {
    clearTimeout(timer);
  }
  cloudSaveTimers.clear();
  pendingCloudSaveItems.clear();
  lastSyncedCloudState.clear();
  lastHistorySyncMap.clear();
  lastActorsSyncMap.clear();
  inFlightHistorySync.clear();
  inFlightWatchlistSync.clear();
  inFlightFavoriteActorsSync.clear();
}

/**
 * Đồng bộ hai chiều giữa LocalStorage và Supabase Cloud qua Server API
 * Trả về danh sách đã hợp nhất mới nhất
 */
export async function syncWatchHistoryWithCloud(
  userId: string,
  force = false,
): Promise<WatchHistoryItem[]> {
  if (!userId) return getWatchHistory();

  const existingFlight = inFlightHistorySync.get(userId);
  if (existingFlight) return existingFlight;

  const now = Date.now();
  const lastSync = lastHistorySyncMap.get(userId) || 0;
  if (!force && lastSync > 0 && now - lastSync < HISTORY_SYNC_THROTTLE_MS) {
    return getWatchHistory();
  }

  const syncPromise = (async () => {
    try {
      const headers = await getAuthHeaders(userId);
      if (!headers["Authorization" as keyof typeof headers]) {
        return getWatchHistory();
      }

      const res = await fetch("/api/user/history", {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        lastHistorySyncMap.set(userId, Date.now());
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
    } finally {
      inFlightHistorySync.delete(userId);
    }
  })();

  inFlightHistorySync.set(userId, syncPromise);
  return syncPromise;
}

/**
 * Lưu 1 mục lịch sử xem lên Cloud qua Server API (Debounced 60s-120s + Dirty check)
 * - Tối ưu debounce đối với tiến trình liên tục, tiết kiệm 85%+ request Vercel
 * - Chỉ gửi Cloud update ngay nếu kết thúc phim, đổi tập, hoặc force cách lần trước >= 45s
 */
export function saveWatchItemToCloudDebounced(
  userId: string,
  item: WatchHistoryItem,
  delayMs = 120000,
  options?: { force?: boolean; isEnded?: boolean },
): void {
  if (!userId || !item.slug) return;

  const key = `${userId}_${item.slug}`;
  const currentProgress = item.progressSeconds ?? 0;
  const lastSynced = lastSyncedCloudState.get(key);

  const isEpisodeChanged = Boolean(lastSynced && item.episodeSlug && lastSynced.episodeSlug !== item.episodeSlug);
  const isProgressSignificant = !lastSynced || Math.abs(currentProgress - lastSynced.progressSeconds) >= 15;
  const now = Date.now();
  const timeSinceLastSync = lastSynced ? now - lastSynced.syncedAt : Infinity;

  // Cơ chế chống trùng lặp (dedupe): bỏ qua request đồng bộ nếu vị trí thời gian xem (currentTime)
  // chênh lệch dưới 5 giây so với lần sync thành công gần nhất (trừ sự kiện Ended hết tập hoặc đổi tập)
  if (lastSynced && !isEpisodeChanged && !options?.isEnded) {
    if (Math.abs(currentProgress - lastSynced.progressSeconds) < 5) {
      return;
    }
  }

  // Luôn cập nhật thông tin mới nhất vào hàng đợi pending
  pendingCloudSaveItems.set(key, item);

  // Chỉ gửi Cloud ngay lập tức nếu:
  // 1. Phim/tập đã kết thúc (isEnded = true)
  // 2. Chuyển sang tập mới (isEpisodeChanged = true)
  // 3. Được yêu cầu force VÀ đã qua tối thiểu 45 giây kể từ lần sync Cloud gần nhất
  const shouldImmediateSync = options?.isEnded || isEpisodeChanged || (options?.force && timeSinceLastSync >= 45000);

  if (shouldImmediateSync) {
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
        const headers = await getAuthHeaders(userId);
        if (!headers["Authorization" as keyof typeof headers]) return;

        const itemToSync = {
          ...targetItem,
          watchedEpisodes: mergeWatchedEpisodesForCloud(targetItem),
          updatedAt: targetItem.updatedAt || Date.now(),
        };

        await fetch("/api/user/history", {
          method: "POST",
          headers,
          body: JSON.stringify({ items: [itemToSync] }),
          keepalive: true,
          signal: AbortSignal.timeout(8000),
        });
      } catch (err) {
        console.warn("Lỗi saveWatchItemToCloudDebounced (force):", err);
      }
    })();
    return;
  }

  // Nếu không phải immediate sync, và tiến trình chưa thay đổi đáng kể và không đổi tập -> bỏ qua
  if (!isProgressSignificant && !isEpisodeChanged && !options?.force) {
    return;
  }

  // Nếu đã có timer đang chạy, giữ nguyên timer để không bị reset vô hạn khi xem phim liên tục
  if (cloudSaveTimers.has(key)) {
    return;
  }

  const effectiveDelay = Math.max(delayMs, 60000); // Tối thiểu 60 giây debounce khi xem
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
      const headers = await getAuthHeaders(userId);
      if (!headers["Authorization" as keyof typeof headers]) return;

      const itemToSync = {
        ...targetItem,
        watchedEpisodes: mergeWatchedEpisodesForCloud(targetItem),
        updatedAt: targetItem.updatedAt || Date.now(),
      };

      await fetch("/api/user/history", {
        method: "POST",
        headers,
        body: JSON.stringify({ items: [itemToSync] }),
        keepalive: true,
        signal: AbortSignal.timeout(8000),
      });
    } catch (err) {
      console.warn("Lỗi saveWatchItemToCloudDebounced:", err);
    }
  }, effectiveDelay);

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
          watchedEpisodes: mergeWatchedEpisodesForCloud(item),
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

  const existingFlight = inFlightWatchlistSync.get(userId);
  if (existingFlight) return existingFlight;

  const syncPromise = (async () => {
    try {
      const headers = await getAuthHeaders(userId);
      if (!headers["Authorization" as keyof typeof headers]) {
        return getWatchlist();
      }

      const res = await fetch("/api/user/watchlist", {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.items)) {
          if (json.items.length > 0) {
            const localList = getWatchlist();
            const merged = mergeWatchlists(localList, json.items);
            localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(merged));
            if (typeof window !== "undefined") {
              window.dispatchEvent(new Event("watchlist-updated"));
            }
            return merged;
          } else {
            // Khi cloud watchlist của user mới rỗng, KHÔNG upload unscoped localList của phiên trước.
            // Đặt local watchlist về rỗng để phân lập hoàn toàn với tài khoản trước.
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
    } finally {
      inFlightWatchlistSync.delete(userId);
    }
  })();

  inFlightWatchlistSync.set(userId, syncPromise);
  return syncPromise;
}

/**
 * Lưu 1 phim yêu thích lên Cloud qua Server API ngay lập tức
 */
export async function saveWatchlistItemToCloud(
  userId: string,
  item: WatchlistItem,
): Promise<boolean> {
  if (!userId || !item.slug) return false;
  try {
    const headers = await getAuthHeaders();
    if (!headers["Authorization" as keyof typeof headers]) return false;

    const res = await fetch("/api/user/watchlist", {
      method: "POST",
      headers,
      body: JSON.stringify({ items: [item] }),
    });
    return res.ok;
  } catch (err) {
    console.warn("Lỗi saveWatchlistItemToCloud:", err);
    return false;
  }
}

/**
 * Xoá 1 phim khỏi Danh sách yêu thích trên Cloud qua Server API
 */
export async function removeWatchlistItemFromCloud(
  userId: string,
  slug: string,
): Promise<boolean> {
  if (!userId || !slug) return false;
  try {
    const headers = await getAuthHeaders();
    if (!headers["Authorization" as keyof typeof headers]) return false;

    const res = await fetch(`/api/user/watchlist?slug=${encodeURIComponent(slug)}`, {
      method: "DELETE",
      headers,
    });
    return res.ok || res.status === 404;
  } catch (err) {
    console.warn("Lỗi removeWatchlistItemFromCloud:", err);
    return false;
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

// Tự động liên kết các hàm đồng bộ Cloud với Local Stores (phá vỡ Circular Dependencies)
registerWatchHistorySyncHandler({
  saveItem: saveWatchItemToCloudDebounced,
  saveItemsBatch: saveWatchItemsBatchToCloud,
  removeItem: removeWatchItemFromCloud,
  clearAll: clearAllWatchHistoryFromCloud,
});

registerWatchlistSyncHandler({
  saveItem: saveWatchlistItemToCloud,
  removeItem: removeWatchlistItemFromCloud,
});

// ─────────────────────────────────────────────────────────────────────────────
// ĐỒNG BỘ DIỄN VIÊN YÊU THÍCH (FAVORITE ACTORS) VỚI SERVER API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Đồng bộ hai chiều Danh sách Diễn viên yêu thích giữa LocalStorage và Supabase Cloud.
 */
export async function syncFavoriteActorsWithCloud(
  userId: string,
  force = false,
): Promise<FavoriteActorItem[]> {
  if (!userId) return getFavoriteActors();

  const existingFlight = inFlightFavoriteActorsSync.get(userId);
  if (existingFlight) return existingFlight;

  const now = Date.now();
  const lastSync = lastActorsSyncMap.get(userId) || 0;
  if (!force && lastSync > 0 && now - lastSync < ACTORS_SYNC_THROTTLE_MS) {
    return getFavoriteActors();
  }

  const syncPromise = (async () => {
    try {
      const headers = await getAuthHeaders(userId);
      if (!headers["Authorization" as keyof typeof headers]) {
        return getFavoriteActors();
      }

      const res = await fetch("/api/user/favorite-actors", {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        lastActorsSyncMap.set(userId, Date.now());
        const json = await res.json();
        if (json.success && Array.isArray(json.items)) {
          if (json.items.length > 0) {
            const localList = getFavoriteActors();
            const merged = mergeFavoriteActors(localList, json.items);
            setFavoriteActorsFromSync(merged);
            return merged;
          } else {
            setFavoriteActorsFromSync([]);
            return [];
          }
        }
      }

      return getFavoriteActors();
    } catch (error) {
      console.warn("Lỗi đồng bộ Diễn viên yêu thích với Server API:", error);
      return getFavoriteActors();
    } finally {
      inFlightFavoriteActorsSync.delete(userId);
    }
  })();

  inFlightFavoriteActorsSync.set(userId, syncPromise);
  return syncPromise;
}

export async function saveFavoriteActorToCloud(
  userId: string,
  item: FavoriteActorItem,
): Promise<boolean> {
  if (!userId || (!item.id && !item.slug)) return false;
  try {
    const headers = await getAuthHeaders(userId);
    if (!headers["Authorization" as keyof typeof headers]) return false;

    const res = await fetch("/api/user/favorite-actors", {
      method: "POST",
      headers,
      body: JSON.stringify({ items: [item] }),
    });
    return res.ok;
  } catch (err) {
    console.warn("Lỗi saveFavoriteActorToCloud:", err);
    return false;
  }
}

export async function removeFavoriteActorFromCloud(
  userId: string,
  idOrSlug: string,
): Promise<boolean> {
  if (!userId || !idOrSlug) return false;
  try {
    const headers = await getAuthHeaders(userId);
    if (!headers["Authorization" as keyof typeof headers]) return false;

    const res = await fetch(
      `/api/user/favorite-actors?key=${encodeURIComponent(idOrSlug)}`,
      {
        method: "DELETE",
        headers,
      },
    );
    return res.ok || res.status === 404;
  } catch (err) {
    console.warn("Lỗi removeFavoriteActorFromCloud:", err);
    return false;
  }
}

export async function clearAllFavoriteActorsFromCloud(
  userId: string,
): Promise<boolean> {
  if (!userId) return false;
  try {
    const headers = await getAuthHeaders(userId);
    if (!headers["Authorization" as keyof typeof headers]) return false;

    const res = await fetch("/api/user/favorite-actors?all=true", {
      method: "DELETE",
      headers,
    });
    return res.ok;
  } catch (err) {
    console.warn("Lỗi clearAllFavoriteActorsFromCloud:", err);
    return false;
  }
}

registerFavoriteActorsSyncHandler({
  saveItem: saveFavoriteActorToCloud,
  removeItem: removeFavoriteActorFromCloud,
  clearAll: clearAllFavoriteActorsFromCloud,
});

export function _resetCloudSyncStateForTest(): void {
  lastHistorySyncMap.clear();
  lastActorsSyncMap.clear();
  lastSyncedCloudState.clear();
  pendingCloudSaveItems.clear();
}


