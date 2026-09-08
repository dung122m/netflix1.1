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
    // Loại bỏ mục cũ nếu có để đưa lên đầu danh sách
    const filtered = list.filter((i) => i.slug !== item.slug);

    const newItem: WatchHistoryItem = {
      ...item,
      updatedAt: Date.now(),
    };

    const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("watch-history-updated"));
  } catch (error) {
    console.error("Lỗi lưu lịch sử xem:", error);
  }
};

export const removeWatchHistoryItem = (slug: string): void => {
  if (typeof window === "undefined" || !slug) return;
  try {
    const list = getWatchHistory();
    const updated = list.filter((i) => i.slug !== slug);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("watch-history-updated"));
  } catch (error) {
    console.error("Lỗi xoá mục lịch sử:", error);
  }
};

export const clearWatchHistory = (): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(HISTORY_KEY);
    window.dispatchEvent(new CustomEvent("watch-history-updated"));
  } catch (error) {
    console.error("Lỗi xoá toàn bộ lịch sử:", error);
  }
};
