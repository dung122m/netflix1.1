import { auth } from "./firebase";
import {
  saveWatchItemToCloudDebounced,
  removeWatchItemFromCloud,
  clearAllWatchHistoryFromCloud,
} from "./cloudSync";
import { getOrCreateAnonymousId } from "./analyticsClient";

export interface WatchHistoryItem {
  slug: string;
  title: string;
  poster: string;
  thumb?: string;
  episodeName?: string;
  episodeSlug?: string;
  year?: number | string;
  quality?: string;
  category?: string;
  country?: string;
  type?: string;
  actor?: string[];
  updatedAt: number;
  progressSeconds?: number;
  durationSeconds?: number;
}

const HISTORY_KEY = "nanaflix_watch_history";
const EPISODES_PROGRESS_KEY = "nanaflix_episodes_progress";
const MAX_HISTORY_ITEMS = 20;

// Module-level in-memory cache tránh parse JSON lặp lại mỗi khi đọc lịch sử xem
let memoryWatchHistory: WatchHistoryItem[] | null = null;

export function sortWatchHistory(items: WatchHistoryItem[]): WatchHistoryItem[] {
  if (!Array.isArray(items)) return [];
  return [...items].sort((a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0));
}

function updateMemoryWatchHistory(list: WatchHistoryItem[]): void {
  memoryWatchHistory = sortWatchHistory(list);
}

export function invalidateMemoryWatchHistory(): void {
  memoryWatchHistory = null;
}

export function setWatchHistoryFromSync(items: WatchHistoryItem[]): void {
  if (typeof window === "undefined") return;
  const sorted = sortWatchHistory(items).slice(0, MAX_HISTORY_ITEMS);
  updateMemoryWatchHistory(sorted);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(sorted));
  } catch {}
  window.dispatchEvent(new CustomEvent("watch-history-updated"));
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === HISTORY_KEY) {
      invalidateMemoryWatchHistory();
      window.dispatchEvent(new CustomEvent("watch-history-updated"));
    }
  });
}

// Bản đồ lưu tiến trình chi tiết từng tập: { [movieSlug]: { [episodeSlug]: { progressSeconds, durationSeconds, updatedAt } } }
export interface EpisodeProgressMap {
  [movieSlug: string]: {
    [episodeSlug: string]: {
      progressSeconds: number;
      durationSeconds?: number;
      updatedAt: number;
    };
  };
}

export const getAllEpisodeProgress = (): EpisodeProgressMap => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(EPISODES_PROGRESS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

export const saveEpisodeProgress = (
  movieSlug: string,
  episodeSlug: string,
  progressSeconds: number,
  durationSeconds?: number,
): void => {
  if (typeof window === "undefined" || !movieSlug || !episodeSlug) return;
  try {
    const all = getAllEpisodeProgress();
    if (!all[movieSlug]) {
      all[movieSlug] = {};
    }
    all[movieSlug][episodeSlug] = {
      progressSeconds: Math.floor(progressSeconds),
      durationSeconds: durationSeconds && durationSeconds > 0 ? Math.floor(durationSeconds) : undefined,
      updatedAt: Date.now(),
    };
    localStorage.setItem(EPISODES_PROGRESS_KEY, JSON.stringify(all));
  } catch (error) {
    console.error("Lỗi lưu tiến trình tập:", error);
  }
};

export const getEpisodeProgress = (movieSlug: string, episodeSlug: string): number => {
  if (typeof window === "undefined" || !movieSlug || !episodeSlug) return 0;
  try {
    const all = getAllEpisodeProgress();
    const epData = all[movieSlug]?.[episodeSlug];
    return epData?.progressSeconds || 0;
  } catch {
    return 0;
  }
};

export const getWatchHistory = (): WatchHistoryItem[] => {
  if (typeof window === "undefined") return [];
  if (memoryWatchHistory !== null) {
    return memoryWatchHistory;
  }
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) {
      updateMemoryWatchHistory([]);
      return [];
    }
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? sortWatchHistory(parsed) : [];
    updateMemoryWatchHistory(list);
    return list;
  } catch (error) {
    console.error("Lỗi đọc lịch sử xem:", error);
    updateMemoryWatchHistory([]);
    return [];
  }
};

export const saveWatchHistory = (
  item: Omit<WatchHistoryItem, "updatedAt"> & { updatedAt?: number },
): void => {
  if (typeof window === "undefined" || !item.slug) return;
  try {
    const list = getWatchHistory();
    // Loại bỏ mục cũ nếu có để đưa lên đầu danh sách, nhưng giữ lại progressSeconds/thumb nếu chưa truyền mới
    const existing = list.find((i) => i.slug === item.slug);
    const filtered = list.filter((i) => i.slug !== item.slug);

    const newItem: WatchHistoryItem = {
      ...existing,
      ...item,
      thumb: item.thumb || existing?.thumb,
      actor: item.actor || existing?.actor,
      country: item.country || existing?.country,
      category: item.category || existing?.category,
      type: item.type || existing?.type,
      progressSeconds: item.progressSeconds ?? existing?.progressSeconds,
      durationSeconds: item.durationSeconds ?? existing?.durationSeconds,
      updatedAt: item.updatedAt || Date.now(),
    };

    const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    updateMemoryWatchHistory(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("watch-history-updated"));

    // Tự động đẩy lên Cloud nếu người dùng đã đăng nhập Google
    if (auth?.currentUser) {
      saveWatchItemToCloudDebounced(auth.currentUser.uid, newItem, 2000);
    }

    // Ghi nhận lượt xem vào Database để tính Top Trending (debounced 1 lần mỗi phiên xem)
    try {
      const sessionKey = `view_recorded_${newItem.slug}`;
      if (!sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(sessionKey, "1");
        const anonymousId = getOrCreateAnonymousId();
        fetch("/api/record-view", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: newItem.slug,
            title: newItem.title,
            poster: newItem.poster,
            year: newItem.year,
            quality: newItem.quality,
            category: newItem.category,
            anonymousId,
          }),
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // Ignore
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
    const now = Date.now();
    let targetItem: WatchHistoryItem;

    if (existing) {
      existing.progressSeconds = Math.floor(progressSeconds);
      if (durationSeconds && durationSeconds > 0) {
        existing.durationSeconds = Math.floor(durationSeconds);
      }
      if (episodeSlug) {
        existing.episodeSlug = episodeSlug;
      }
      existing.updatedAt = now;
      targetItem = existing;
    } else {
      targetItem = {
        slug,
        title: slug,
        poster: "/default-poster.jpg",
        episodeSlug,
        progressSeconds: Math.floor(progressSeconds),
        durationSeconds: durationSeconds && durationSeconds > 0 ? Math.floor(durationSeconds) : undefined,
        updatedAt: now,
      };
    }

    // Đưa phim vừa xem lên đầu danh sách
    const filtered = list.filter((i) => i.slug !== slug);
    const updated = [targetItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    updateMemoryWatchHistory(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));

    // Luôn lưu tiến trình riêng biệt cho tập đó (độc lập với các tập khác)
    if (episodeSlug) {
      saveEpisodeProgress(slug, episodeSlug, progressSeconds, durationSeconds);
    }

    // Phát sự kiện realtime cho toàn bộ trang
    window.dispatchEvent(
      new CustomEvent("watch-progress-updated", {
        detail: { slug, episodeSlug, progressSeconds: Math.floor(progressSeconds) },
      })
    );
    window.dispatchEvent(new CustomEvent("watch-history-updated"));

    // Tự động đồng bộ số phút lên Cloud nếu đã đăng nhập Google
    if (auth?.currentUser) {
      saveWatchItemToCloudDebounced(auth.currentUser.uid, targetItem, 4000);
    }
  } catch (error) {
    console.error("Lỗi lưu tiến trình xem:", error);
  }
};

export const getWatchProgress = (slug: string, episodeSlug?: string): number => {
  if (typeof window === "undefined" || !slug) return 0;
  try {
    // 1. Kiểm tra tiến trình lưu riêng của tập này trước
    if (episodeSlug) {
      const epProg = getEpisodeProgress(slug, episodeSlug);
      if (epProg > 0) return epProg;
    }
    // 2. Fallback sang mục lịch sử tổng của phim nếu khớp tập
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
    updateMemoryWatchHistory(updated);
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
    updateMemoryWatchHistory([]);
    localStorage.removeItem(HISTORY_KEY);
    window.dispatchEvent(new CustomEvent("watch-history-updated"));
  } catch (error) {
    console.error("Lỗi xoá lịch sử local:", error);
  }
};

export const clearWatchHistory = (): void => {
  if (typeof window === "undefined") return;
  try {
    updateMemoryWatchHistory([]);
    localStorage.removeItem(HISTORY_KEY);
    window.dispatchEvent(new CustomEvent("watch-history-updated"));

    if (auth?.currentUser) {
      clearAllWatchHistoryFromCloud(auth.currentUser.uid);
    }
  } catch (error) {
    console.error("Lỗi xoá toàn bộ lịch sử:", error);
  }
};
