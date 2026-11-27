import {
  getWatchHistory,
  getPendingHistoryItemsForUser,
  clearHistoryPendingSlugs,
  setWatchHistoryFromSync,
  registerWatchHistorySyncHandler,
  WatchHistoryItem,
} from "./watchHistory";
import { getWatchedEpisodes } from "./episodeTracker";
import { getFirebaseAuthHeaders } from "./clientAuth";
import {
  getWatchlist,
  getPendingWatchlistForUser,
  setWatchlistFromSync,
  registerWatchlistSyncHandler,
  WatchlistItem,
  mergeWatchlists,
} from "./watchlist";
import {
  getFavoriteActors,
  getPendingFavoriteActorsForUser,
  registerFavoriteActorsSyncHandler,
  FavoriteActorItem,
  mergeFavoriteActors,
  setFavoriteActorsFromSync,
} from "@/services/actor/favoriteActors";

// Debounce map để hạn chế số lần ghi khi người dùng đang xem phim liên tục
const cloudSaveTimers = new Map<string, NodeJS.Timeout>();

// Lưu lại trạng thái đồng bộ Cloud gần nhất để thực hiện Dirty Check
interface SyncedCloudState {
  progressSeconds: number;
  episodeSlug?: string;
  syncedAt: number;
}
const lastSyncedCloudState = new Map<string, SyncedCloudState>();
const pendingCloudSaveItems = new Map<string, { userId: string; item: WatchHistoryItem }>();

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

function mergeHistoryEntry(
  existingCloud: WatchHistoryItem,
  localCandidate: WatchHistoryItem,
  preferOnTie: boolean,
): { merged: WatchHistoryItem; needsUpload: boolean } {
  const localTs = Number(localCandidate.updatedAt) || 0;
  const cloudTs = Number(existingCloud.updatedAt) || 0;
  const mergedWatched = Array.from(
    new Set(
      [
        ...(Array.isArray(existingCloud.watchedEpisodes) ? existingCloud.watchedEpisodes : []),
        ...(Array.isArray(localCandidate.watchedEpisodes) ? localCandidate.watchedEpisodes : []),
      ].filter(Boolean),
    ),
  );

  const isLocalNewer =
    localTs > cloudTs || (preferOnTie && localTs >= cloudTs);

  if (isLocalNewer) {
    const winner: WatchHistoryItem = {
      ...existingCloud,
      ...localCandidate,
      watchedEpisodes: mergedWatched,
    };
    return { merged: winner, needsUpload: true };
  }

  const sameEpisode =
    Boolean(localCandidate.episodeSlug) &&
    localCandidate.episodeSlug === existingCloud.episodeSlug;
  const updatedCloud: WatchHistoryItem = {
    ...existingCloud,
    nextEpisodeSlug: sameEpisode
      ? existingCloud.nextEpisodeSlug || localCandidate.nextEpisodeSlug
      : existingCloud.nextEpisodeSlug,
    nextEpisodeName: sameEpisode
      ? existingCloud.nextEpisodeName || localCandidate.nextEpisodeName
      : existingCloud.nextEpisodeName,
    watchedEpisodes: mergedWatched,
  };
  const watchedGrew =
    mergedWatched.length > (existingCloud.watchedEpisodes?.length || 0);
  return { merged: updatedCloud, needsUpload: watchedGrew };
}

/**
 * Hợp nhất hai chiều lịch sử xem giữa LocalStorage (hoặc Guest vừa đăng nhập) với Cloud.
 * - Các mục đang chờ đồng bộ (`pendingSlugs`) hoặc có `updatedAt` mới hơn luôn được bảo toàn & đẩy lên Cloud.
 * - Không hồi sinh các mục local cũ không nằm trong `pendingSlugs` nếu Cloud không còn (tôn trọng xóa đa thiết bị).
 */
export function mergeWatchHistoryWithCloud(
  cloudItems: WatchHistoryItem[],
  localItems: WatchHistoryItem[],
  pendingSlugs: string[] = [],
  includeAllLocalMissing = false,
): { merged: WatchHistoryItem[]; itemsToUpload: WatchHistoryItem[] } {
  const bySlug = new Map<string, WatchHistoryItem>();
  for (const item of cloudItems) {
    if (item?.slug) bySlug.set(item.slug, item);
  }

  const pendingSet = new Set(pendingSlugs.filter(Boolean));
  const itemsToUpload: WatchHistoryItem[] = [];

  for (const localItem of localItems) {
    if (!localItem?.slug) continue;
    const isPending = includeAllLocalMissing || pendingSet.has(localItem.slug);
    const existingCloud = bySlug.get(localItem.slug);

    if (!existingCloud) {
      if (isPending) {
        bySlug.set(localItem.slug, localItem);
        itemsToUpload.push(localItem);
      }
      continue;
    }

    const { merged, needsUpload } = mergeHistoryEntry(
      existingCloud,
      localItem,
      isPending,
    );
    bySlug.set(localItem.slug, merged);
    if (needsUpload) {
      itemsToUpload.push(merged);
    }
  }

  return {
    merged: Array.from(bySlug.values()).sort(
      (a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0),
    ),
    itemsToUpload,
  };
}

/**
 * Hợp nhất lịch sử xem từ phiên khách hiện tại với dữ liệu Cloud khi khách vừa bấm Đăng nhập.
 * Giữ bản ghi mới hơn theo updatedAt và gộp danh sách watchedEpisodes.
 */
export function mergeGuestWatchHistoryWithCloud(
  cloudItems: WatchHistoryItem[],
  guestItems: WatchHistoryItem[],
): { merged: WatchHistoryItem[]; itemsToUpload: WatchHistoryItem[] } {
  return mergeWatchHistoryWithCloud(cloudItems, guestItems, [], true);
}

/**
 * Đồng bộ hai chiều giữa LocalStorage và Supabase Cloud qua Server API
 * Trả về danh sách đã hợp nhất mới nhất
 */
export async function syncWatchHistoryWithCloud(
  userId: string,
  force = false,
  guestItemsToMerge?: WatchHistoryItem[],
): Promise<WatchHistoryItem[]> {
  if (!userId) return getWatchHistory();

  const pendingOwned = getPendingHistoryItemsForUser(userId);
  const guestItems = Array.isArray(guestItemsToMerge) ? guestItemsToMerge : [];
  const hasExtraMerge = guestItems.length > 0 || pendingOwned.length > 0;
  const existingFlight = inFlightHistorySync.get(userId);
  if (existingFlight && guestItems.length === 0) return existingFlight;

  const now = Date.now();
  const lastSync = lastHistorySyncMap.get(userId) || 0;
  if (!force && !hasExtraMerge && lastSync > 0 && now - lastSync < HISTORY_SYNC_THROTTLE_MS) {
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
          const localList = getWatchHistory();
          const combinedBySlug = new Map<string, WatchHistoryItem>();
          for (const item of [...localList, ...pendingOwned, ...guestItems]) {
            if (!item?.slug) continue;
            const prev = combinedBySlug.get(item.slug);
            if (!prev || (Number(item.updatedAt) || 0) > (Number(prev.updatedAt) || 0)) {
              combinedBySlug.set(item.slug, item);
            }
          }
          const allowedPendingSlugs = [
            ...pendingOwned.map((i) => i.slug),
            ...guestItems.map((i) => i.slug),
          ];

          const { merged, itemsToUpload } = mergeWatchHistoryWithCloud(
            json.items,
            Array.from(combinedBySlug.values()),
            allowedPendingSlugs,
          );

          if (itemsToUpload.length > 0) {
            await saveWatchItemsBatchToCloud(userId, itemsToUpload);
          }
          setWatchHistoryFromSync(merged);
          return getWatchHistory();
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

async function postWatchItemsToCloud(
  userId: string,
  items: WatchHistoryItem[],
  useKeepalive = false,
): Promise<boolean> {
  const validItems = items.filter((i) => i && i.slug);
  if (!userId || validItems.length === 0) return false;
  try {
    const headers = await getAuthHeaders(userId);
    if (!headers["Authorization" as keyof typeof headers]) return false;

    const now = Date.now();
    const res = await fetch("/api/user/history", {
      method: "POST",
      headers,
      body: JSON.stringify({
        items: validItems.map((item) => ({
          ...item,
          watchedEpisodes: mergeWatchedEpisodesForCloud(item),
          updatedAt: item.updatedAt || now,
        })),
      }),
      keepalive: useKeepalive,
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      clearHistoryPendingSlugs(
        userId,
        validItems.map((i) => i.slug),
      );
      return true;
    }
    return false;
  } catch (err) {
    console.warn("Lỗi đồng bộ lịch sử lên Server API:", err);
    return false;
  }
}

/**
 * Đẩy ngay toàn bộ hàng đợi lịch sử đang chờ debounce lên Cloud (dùng khi rời trang / ẩn tab).
 */
export function flushPendingCloudHistorySaves(): void {
  if (pendingCloudSaveItems.size === 0) return;

  for (const timer of cloudSaveTimers.values()) {
    clearTimeout(timer);
  }
  cloudSaveTimers.clear();

  const byUser = new Map<string, WatchHistoryItem[]>();
  for (const [key, entry] of pendingCloudSaveItems.entries()) {
    pendingCloudSaveItems.delete(key);
    if (!entry?.userId || !entry.item?.slug) continue;
    lastSyncedCloudState.set(key, {
      progressSeconds: entry.item.progressSeconds ?? 0,
      episodeSlug: entry.item.episodeSlug,
      syncedAt: Date.now(),
    });
    const arr = byUser.get(entry.userId) || [];
    arr.push(entry.item);
    byUser.set(entry.userId, arr);
  }

  for (const [uid, items] of byUser.entries()) {
    void postWatchItemsToCloud(uid, items, true);
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flushPendingCloudHistorySaves);
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        flushPendingCloudHistorySaves();
      }
    });
  }
}

/**
 * Lưu 1 mục lịch sử xem lên Cloud qua Server API (Debounced + Dirty check + Flush khi rời tab)
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

  if (lastSynced && !isEpisodeChanged && !options?.isEnded) {
    if (Math.abs(currentProgress - lastSynced.progressSeconds) < 5) {
      return;
    }
  }

  pendingCloudSaveItems.set(key, { userId, item });

  const shouldImmediateSync =
    options?.isEnded || isEpisodeChanged || (options?.force && timeSinceLastSync >= 45000);

  if (shouldImmediateSync) {
    if (cloudSaveTimers.has(key)) {
      clearTimeout(cloudSaveTimers.get(key));
      cloudSaveTimers.delete(key);
    }

    const pending = pendingCloudSaveItems.get(key);
    const targetItem = pending?.item || item;
    pendingCloudSaveItems.delete(key);

    lastSyncedCloudState.set(key, {
      progressSeconds: targetItem.progressSeconds ?? 0,
      episodeSlug: targetItem.episodeSlug,
      syncedAt: Date.now(),
    });

    void postWatchItemsToCloud(userId, [targetItem], true);
    return;
  }

  if (!isProgressSignificant && !isEpisodeChanged && !options?.force) {
    return;
  }

  if (cloudSaveTimers.has(key)) {
    return;
  }

  const effectiveDelay = Math.max(delayMs, 15000);
  const timer = setTimeout(() => {
    cloudSaveTimers.delete(key);
    const pending = pendingCloudSaveItems.get(key);
    const targetItem = pending?.item || item;
    pendingCloudSaveItems.delete(key);

    lastSyncedCloudState.set(key, {
      progressSeconds: targetItem.progressSeconds ?? 0,
      episodeSlug: targetItem.episodeSlug,
      syncedAt: Date.now(),
    });

    void postWatchItemsToCloud(userId, [targetItem], true);
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

  await postWatchItemsToCloud(userId, validItems, false);
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
    const headers = await getAuthHeaders(userId);
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
    const headers = await getAuthHeaders(userId);
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
  guestWatchlistToMerge?: WatchlistItem[],
): Promise<WatchlistItem[]> {
  if (!userId) return getWatchlist();

  const pendingOwned = getPendingWatchlistForUser(userId);
  const extraOwned = [
    ...(Array.isArray(guestWatchlistToMerge) ? guestWatchlistToMerge : []),
    ...pendingOwned,
  ].filter((item) => Boolean(item && item.slug));
  const hasExtraMerge = extraOwned.length > 0;

  const existingFlight = inFlightWatchlistSync.get(userId);
  if (existingFlight && !hasExtraMerge) return existingFlight;

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
          const cloudItems = json.items as WatchlistItem[];
          if (cloudItems.length > 0 || hasExtraMerge) {
            const localList = getWatchlist();
            const withRecentLocal =
              cloudItems.length > 0 ? mergeWatchlists(localList, cloudItems) : [];
            const merged = hasExtraMerge
              ? mergeWatchlists(extraOwned, withRecentLocal, Number.MAX_SAFE_INTEGER)
              : withRecentLocal;

            const cloudSlugs = new Set(cloudItems.map((c) => c.slug).filter(Boolean));
            const missingFromCloud = merged.filter(
              (item) => item.slug && !cloudSlugs.has(item.slug),
            );
            if (missingFromCloud.length > 0) {
              await saveWatchlistBatchToCloud(userId, missingFromCloud);
            }

            setWatchlistFromSync(merged, userId);
            return merged;
          } else {
            // Khi cloud watchlist của user mới rỗng, KHÔNG upload unscoped localList của phiên trước.
            // Đặt local watchlist về rỗng để phân lập hoàn toàn với tài khoản trước.
            setWatchlistFromSync([], userId);
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
 * Lưu nhiều phim yêu thích lên Cloud qua Server API
 */
export async function saveWatchlistBatchToCloud(
  userId: string,
  items: WatchlistItem[],
): Promise<boolean> {
  if (!userId || !Array.isArray(items) || items.length === 0) return false;
  const validItems = items.filter((item) => item && item.slug);
  if (validItems.length === 0) return false;
  try {
    const headers = await getAuthHeaders(userId);
    if (!headers["Authorization" as keyof typeof headers]) return false;

    const res = await fetch("/api/user/watchlist", {
      method: "POST",
      headers,
      body: JSON.stringify({ items: validItems }),
    });
    return res.ok;
  } catch (err) {
    console.warn("Lỗi saveWatchlistBatchToCloud:", err);
    return false;
  }
}

/**
 * Lưu 1 phim yêu thích lên Cloud qua Server API ngay lập tức
 */
export async function saveWatchlistItemToCloud(
  userId: string,
  item: WatchlistItem,
): Promise<boolean> {
  if (!userId || !item.slug) return false;
  return saveWatchlistBatchToCloud(userId, [item]);
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
    const headers = await getAuthHeaders(userId);
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
    const headers = await getAuthHeaders(userId);
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
  guestActorsToMerge?: FavoriteActorItem[],
): Promise<FavoriteActorItem[]> {
  if (!userId) return getFavoriteActors();

  const pendingOwned = getPendingFavoriteActorsForUser(userId);
  const extraOwned = [
    ...(Array.isArray(guestActorsToMerge) ? guestActorsToMerge : []),
    ...pendingOwned,
  ].filter((item) => Boolean(item && (item.id || item.slug) && item.name));
  const hasExtraMerge = extraOwned.length > 0;

  const existingFlight = inFlightFavoriteActorsSync.get(userId);
  if (existingFlight && !hasExtraMerge) return existingFlight;

  const now = Date.now();
  const lastSync = lastActorsSyncMap.get(userId) || 0;
  if (!force && !hasExtraMerge && lastSync > 0 && now - lastSync < ACTORS_SYNC_THROTTLE_MS) {
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
          const cloudItems = json.items as FavoriteActorItem[];
          if (cloudItems.length > 0 || hasExtraMerge) {
            const localList = getFavoriteActors();
            const withRecentLocal =
              cloudItems.length > 0 ? mergeFavoriteActors(localList, cloudItems) : [];
            const merged = hasExtraMerge
              ? mergeFavoriteActors(extraOwned, withRecentLocal, Number.MAX_SAFE_INTEGER)
              : withRecentLocal;

            const cloudKeys = new Set<string>();
            for (const c of cloudItems) {
              if (c.id) cloudKeys.add(String(c.id).trim().toLowerCase());
              if (c.slug) cloudKeys.add(String(c.slug).trim().toLowerCase());
            }
            const missingFromCloud = merged.filter((item) => {
              const idKey = item.id ? String(item.id).trim().toLowerCase() : "";
              const slugKey = item.slug ? String(item.slug).trim().toLowerCase() : "";
              return !((idKey && cloudKeys.has(idKey)) || (slugKey && cloudKeys.has(slugKey)));
            });

            if (missingFromCloud.length > 0) {
              await saveFavoriteActorsBatchToCloud(userId, missingFromCloud);
            }

            setFavoriteActorsFromSync(merged, userId);
            return merged;
          } else {
            setFavoriteActorsFromSync([], userId);
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

export async function saveFavoriteActorsBatchToCloud(
  userId: string,
  items: FavoriteActorItem[],
): Promise<boolean> {
  if (!userId || !Array.isArray(items) || items.length === 0) return false;
  const validItems = items.filter((item) => item && (item.id || item.slug));
  if (validItems.length === 0) return false;
  try {
    const headers = await getAuthHeaders(userId);
    if (!headers["Authorization" as keyof typeof headers]) return false;

    const res = await fetch("/api/user/favorite-actors", {
      method: "POST",
      headers,
      body: JSON.stringify({ items: validItems }),
    });
    return res.ok;
  } catch (err) {
    console.warn("Lỗi saveFavoriteActorsBatchToCloud:", err);
    return false;
  }
}

export async function saveFavoriteActorToCloud(
  userId: string,
  item: FavoriteActorItem,
): Promise<boolean> {
  if (!userId || (!item.id && !item.slug)) return false;
  return saveFavoriteActorsBatchToCloud(userId, [item]);
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


