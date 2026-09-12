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

const HISTORY_STORAGE_KEY = "nanaflix_watch_history";
const MAX_ITEMS = 30;

// Debounce map để hạn chế số lần ghi Firestore khi người dùng đang xem phim liên tục
const cloudSaveTimers = new Map<string, NodeJS.Timeout>();

// Lọc bỏ các thuộc tính undefined vì Firestore không chấp nhận giá trị undefined
function cleanFirestoreData(data: WatchHistoryItem): Record<string, unknown> {
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
    const snapshot = await getDocs(historyCol);

    const cloudMap = new Map<string, WatchHistoryItem>();
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as WatchHistoryItem;
      if (data && data.slug) {
        cloudMap.set(data.slug, data);
      }
    });

    const localList = getWatchHistory();
    const mergedMap = new Map<string, WatchHistoryItem>();

    // 1. Đưa cloud items vào
    cloudMap.forEach((item, slug) => {
      mergedMap.set(slug, item);
    });

    // 2. So sánh và hợp nhất với local
    const batch = writeBatch(firestore);
    let hasCloudWrites = false;

    localList.forEach((localItem) => {
      const cloudItem = mergedMap.get(localItem.slug);
      if (!cloudItem) {
        // Có ở local nhưng chưa có trên cloud -> Đẩy lên cloud
        mergedMap.set(localItem.slug, localItem);
        const ref = doc(firestore, "users", userId, "watch_history", localItem.slug);
        batch.set(ref, cleanFirestoreData(localItem));
        hasCloudWrites = true;
      } else {
        // Có ở cả hai: lấy bản ghi có thời gian mới hơn
        if ((localItem.updatedAt || 0) > (cloudItem.updatedAt || 0)) {
          mergedMap.set(localItem.slug, localItem);
          const ref = doc(firestore, "users", userId, "watch_history", localItem.slug);
          batch.set(ref, cleanFirestoreData(localItem));
          hasCloudWrites = true;
        }
      }
    });

    if (hasCloudWrites) {
      await batch.commit();
    }

    // Sắp xếp theo updatedAt giảm dần
    const mergedList = Array.from(mergedMap.values())
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .slice(0, MAX_ITEMS);

    // Cập nhật lại localStorage để đồng bộ offline
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(mergedList));
    window.dispatchEvent(new CustomEvent("watch-history-updated"));

    return mergedList;
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
