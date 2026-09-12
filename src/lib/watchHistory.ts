import { auth } from "./firebase";
import {
  saveWatchItemToCloudDebounced,
  removeWatchItemFromCloud,
  clearAllWatchHistoryFromCloud,
} from "./cloudSync";

export interface WatchHistoryItem {
  slug: string;
  title: string;
  poster: string;
  episodeName?: string;
  episodeSlug?: string;
  year?: number | string;
  quality?: string;
  category?: string;
  updatedAt: number;
  progressSeconds?: number;
  durationSeconds?: number;
}

const HISTORY_KEY = "nanaflix_watch_history";
const MAX_HISTORY_ITEMS = 20;

export const getWatchHistory = (): WatchHistoryItem[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (error) {
    console.error("Lỗi đọc lịch sử xem:", error);
    return [];
  }
};

export const saveWatchHistory = (
  item: Omit<WatchHistoryItem, "updatedAt">,
): void => {
  if (typeof window === "undefined" || !item.slug) return;
  try {
    const list = getWatchHistory();
    // Loại bỏ mục cũ nếu có để đưa lên đầu danh sách, nhưng giữ lại progressSeconds nếu chưa truyền mới
    const existing = list.find((i) => i.slug === item.slug);
    const filtered = list.filter((i) => i.slug !== item.slug);

    const newItem: WatchHistoryItem = {
      ...item,
      progressSeconds: item.progressSeconds ?? existing?.progressSeconds,
      durationSeconds: item.durationSeconds ?? existing?.durationSeconds,
      updatedAt: Date.now(),
    };

    const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("watch-history-updated"));

    // Tự động đẩy lên Cloud nếu người dùng đã đăng nhập Google
    if (auth?.currentUser) {
      saveWatchItemToCloudDebounced(auth.currentUser.uid, newItem, 2000);
    }
  } catch (error) {
    console.error("Lỗi lưu lịch sử xem:", error);
  }
};

export const saveWatchProgress = (
  slug: string,
  progressSeconds: number,
  durationSeconds?: number,
  episodeSlug?: string,
): void => {
  if (typeof window === "undefined" || !slug) return;
  try {
    const list = getWatchHistory();
    const existing = list.find((i) => i.slug === slug);
    if (!existing) return;

    existing.progressSeconds = Math.floor(progressSeconds);
    if (durationSeconds && durationSeconds > 0) {
      existing.durationSeconds = Math.floor(durationSeconds);
    }
    if (episodeSlug) {
      existing.episodeSlug = episodeSlug;
    }
    existing.updatedAt = Date.now();

    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));

    // Tự động đồng bộ số phút lên Cloud nếu đã đăng nhập Google
    if (auth?.currentUser) {
      saveWatchItemToCloudDebounced(auth.currentUser.uid, existing, 4000);
    }
  } catch (error) {
    console.error("Lỗi lưu tiến trình xem:", error);
  }
};

export const getWatchProgress = (slug: string, episodeSlug?: string): number => {
  if (typeof window === "undefined" || !slug) return 0;
  try {
    const list = getWatchHistory();
    const existing = list.find((i) => i.slug === slug);
    if (!existing) return 0;
    if (episodeSlug && existing.episodeSlug && existing.episodeSlug !== episodeSlug) {
      return 0;
    }
    return existing.progressSeconds || 0;
  } catch {
    return 0;
  }
};

export const removeWatchHistoryItem = (slug: string): void => {
  if (typeof window === "undefined" || !slug) return;
  try {
    const list = getWatchHistory();
    const updated = list.filter((i) => i.slug !== slug);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("watch-history-updated"));

    if (auth?.currentUser) {
      removeWatchItemFromCloud(auth.currentUser.uid, slug);
    }
  } catch (error) {
    console.error("Lỗi xoá mục lịch sử:", error);
  }
};

export const clearLocalWatchHistoryOnly = (): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(HISTORY_KEY);
    window.dispatchEvent(new CustomEvent("watch-history-updated"));
  } catch (error) {
    console.error("Lỗi xoá lịch sử local:", error);
  }
};

export const clearWatchHistory = (): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(HISTORY_KEY);
    window.dispatchEvent(new CustomEvent("watch-history-updated"));

    if (auth?.currentUser) {
      clearAllWatchHistoryFromCloud(auth.currentUser.uid);
    }
  } catch (error) {
    console.error("Lỗi xoá toàn bộ lịch sử:", error);
  }
};
