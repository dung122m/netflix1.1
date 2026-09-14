import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
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

// Debounce map để hạn chế số lần ghi Firestore khi người dùng đang xem phim liên tục
const cloudSaveTimers = new Map<string, NodeJS.Timeout>();

// Helper bọc Promise với timeout chống treo khi bị AdBlock chặn Firestore
async function withTimeout<T>(promise: Promise<T>, timeoutMs = 2500): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Firestore sync timeout")), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

// Lọc bỏ các thuộc tính undefined vì Firestore không chấp nhận giá trị undefined
function cleanFirestoreData<T extends object>(data: T): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  Object.entries(data).forEach(([key, val]) => {
    if (val !== undefined) {
      cleaned[key] = val;
    }
  });
  return cleaned;
}

/**
 * Đồng bộ hai chiều giữa LocalStorage và Firestore Cloud
 * Trả về danh sách đã hợp nhất mới nhất
 */
export async function syncWatchHistoryWithCloud(
  userId: string,
): Promise<WatchHistoryItem[]> {
  if (!db || !userId) return getWatchHistory();
  const firestore = db;

  try {
    const historyCol = collection(firestore, "users", userId, "watch_history");
    const snapshot = await withTimeout(getDocs(historyCol), 2500);

    const cloudMap = new Map<string, WatchHistoryItem>();
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as WatchHistoryItem;
      if (data && data.slug) {
        cloudMap.set(data.slug, data);
      }
    });

    // TRƯỜNG HỢP 1: Tài khoản Google này ĐÃ CÓ dữ liệu trên Cloud
    // => Lấy 100% dữ liệu từ Cloud của tài khoản đó đè lên máy tính (không lấy dữ liệu rác của người khác trước đó trên máy)
    if (cloudMap.size > 0) {
      const cloudList = Array.from(cloudMap.values())
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
        .slice(0, MAX_ITEMS);

      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(cloudList));
      window.dispatchEvent(new CustomEvent("watch-history-updated"));
      return cloudList;
    }

    // TRƯỜNG HỢP 2: Tài khoản Google này mới toanh (trên Cloud chưa có phim nào)
    // => Chuyển giao các phim đang xem dở lúc làm khách (local) lên tài khoản mới
    const localList = getWatchHistory();
    if (localList.length > 0) {
      const batch = writeBatch(firestore);
      localList.forEach((localItem) => {
        const ref = doc(firestore, "users", userId, "watch_history", localItem.slug);
        batch.set(ref, cleanFirestoreData(localItem));
      });
      await batch.commit();
    }
    window.dispatchEvent(new CustomEvent("watch-history-updated"));

    return localList;
  } catch (error) {
    console.warn("Lỗi đồng bộ lịch sử xem với Cloud:", error);
    return getWatchHistory();
  }
}

/**
 * Lưu 1 mục lịch sử xem lên Cloud (Debounced để tiết kiệm quota Firestore)
 */
export function saveWatchItemToCloudDebounced(
  userId: string,
  item: WatchHistoryItem,
  delayMs = 4000,
): void {
  if (!db || !userId || !item.slug) return;
  const firestore = db;

  const timerKey = `${userId}_${item.slug}`;
  const existingTimer = cloudSaveTimers.get(timerKey);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const newTimer = setTimeout(async () => {
    try {
      const ref = doc(firestore, "users", userId, "watch_history", item.slug);
      await setDoc(ref, cleanFirestoreData(item), { merge: true });
      cloudSaveTimers.delete(timerKey);
    } catch (err) {
      console.warn("Lỗi lưu Cloud watch item:", err);
    }
  }, delayMs);

  cloudSaveTimers.set(timerKey, newTimer);
}

/**
 * Xoá 1 mục lịch sử trên Cloud
 */
export async function removeWatchItemFromCloud(
  userId: string,
  slug: string,
): Promise<void> {
  if (!db || !userId || !slug) return;
  const firestore = db;
  try {
    const ref = doc(firestore, "users", userId, "watch_history", slug);
    await deleteDoc(ref);
  } catch (err) {
    console.warn("Lỗi xoá mục Cloud watch history:", err);
  }
}

/**
 * Xoá toàn bộ lịch sử trên Cloud
 */
export async function clearAllWatchHistoryFromCloud(
  userId: string,
): Promise<void> {
  if (!db || !userId) return;
  const firestore = db;
  try {
    const historyCol = collection(firestore, "users", userId, "watch_history");
    const snapshot = await getDocs(historyCol);
    const batch = writeBatch(firestore);
    snapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  } catch (err) {
    console.warn("Lỗi xoá toàn bộ Cloud watch history:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ĐỒNG BỘ DANH SÁCH YÊU THÍCH (WATCHLIST) VỚI CLOUD FIRESTORE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Đồng bộ hai chiều Danh sách yêu thích giữa LocalStorage và Firestore Cloud
 */
export async function syncWatchlistWithCloud(
  userId: string,
): Promise<WatchlistItem[]> {
  if (!db || !userId) return getWatchlist();
  const firestore = db;

  try {
    const watchlistCol = collection(firestore, "users", userId, "watchlist");
    const snapshot = await withTimeout(getDocs(watchlistCol), 2500);

    const cloudMap = new Map<string, WatchlistItem>();
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as WatchlistItem;
      if (data && data.slug) {
        cloudMap.set(data.slug, data);
      }
    });

    // TRƯỜNG HỢP 1: Tài khoản Google ĐÃ CÓ phim yêu thích trên Cloud
    // => Lấy dữ liệu trên Cloud đè lên LocalStorage
    if (cloudMap.size > 0) {
      const cloudList = Array.from(cloudMap.values()).sort(
        (a, b) => (b.addedAt || 0) - (a.addedAt || 0),
      );

      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(cloudList));
      window.dispatchEvent(new Event("watchlist-updated"));
      return cloudList;
    }

    // TRƯỜNG HỢP 2: Tài khoản Google mới toanh (trên Cloud chưa có danh sách yêu thích)
    // => Tải các phim yêu thích lúc làm khách (local) lên tài khoản mới
    const localList = getWatchlist();
    if (localList.length > 0) {
      const batch = writeBatch(firestore);
      localList.forEach((item) => {
        const ref = doc(firestore, "users", userId, "watchlist", item.slug);
        batch.set(ref, cleanFirestoreData(item as unknown as Record<string, unknown>));
      });
      await batch.commit();
    }
    window.dispatchEvent(new Event("watchlist-updated"));

    return localList;
  } catch (error) {
    console.warn("Lỗi đồng bộ Danh sách yêu thích với Cloud:", error);
    return getWatchlist();
  }
}

/**
 * Lưu 1 phim yêu thích lên Cloud ngay lập tức
 */
export async function saveWatchlistItemToCloud(
  userId: string,
  item: WatchlistItem,
): Promise<void> {
  if (!db || !userId || !item.slug) return;
  const firestore = db;
  try {
    const ref = doc(firestore, "users", userId, "watchlist", item.slug);
    await setDoc(ref, cleanFirestoreData(item as unknown as Record<string, unknown>), {
      merge: true,
    });
  } catch (err) {
    console.warn("Lỗi lưu Cloud watchlist item:", err);
  }
}

/**
 * Xoá 1 phim yêu thích trên Cloud
 */
export async function removeWatchlistItemFromCloud(
  userId: string,
  slug: string,
): Promise<void> {
  if (!db || !userId || !slug) return;
  const firestore = db;
  try {
    const ref = doc(firestore, "users", userId, "watchlist", slug);
    await deleteDoc(ref);
  } catch (err) {
    console.warn("Lỗi xoá mục Cloud watchlist:", err);
  }
}

/**
 * Xoá toàn bộ danh sách yêu thích trên Cloud
 */
export async function clearAllWatchlistFromCloud(
  userId: string,
): Promise<void> {
  if (!db || !userId) return;
  const firestore = db;
  try {
    const col = collection(firestore, "users", userId, "watchlist");
    const snapshot = await getDocs(col);
    const batch = writeBatch(firestore);
    snapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  } catch (err) {
    console.warn("Lỗi xoá toàn bộ Cloud watchlist:", err);
  }
}

