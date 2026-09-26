import { auth } from "./firebase";
import {
  saveWatchlistItemToCloud,
  removeWatchlistItemFromCloud,
} from "./cloudSync";

export interface WatchlistItem {
  slug: string;
  title: string;
  imageUrl: string;
  poster?: string;
  year?: string | number;
  genre?: string;
  category?: string;
  quality?: string;
  time?: string;
  country?: string;
  type_name?: string;
  addedAt: number;
}

const STORAGE_KEY = "nanaflix_watchlist_v1";

// Bộ nhớ đệm in-memory tránh parse JSON lặp lại 60 lần khi mỗi MediaCard lắng nghe sự kiện watchlist-updated
let memoryWatchlist: WatchlistItem[] | null = null;
let memoryWatchlistSlugs: Set<string> | null = null;

function updateMemoryCache(list: WatchlistItem[]): void {
  memoryWatchlist = list;
  memoryWatchlistSlugs = new Set(list.map((item) => item.slug));
}

function invalidateMemoryCache(): void {
  memoryWatchlist = null;
  memoryWatchlistSlugs = null;
}

// Shared registry for MediaCard subscribers: single window listener instead of 45 separate listeners
const subscribers = new Set<{ slug: string; callback: (inList: boolean) => void }>();
let isSharedListenerAttached = false;

function ensureSharedListener(): void {
  if (typeof window === "undefined" || isSharedListenerAttached) return;
  isSharedListenerAttached = true;
  window.addEventListener("watchlist-updated", (e: Event) => {
    invalidateMemoryCache();
    const customEvt = e as CustomEvent<{ slug?: string }>;
    const targetSlug = customEvt?.detail?.slug;
    subscribers.forEach(({ slug, callback }) => {
      // If a specific movie was updated, only notify matching cards; if full sync, notify all
      if (!targetSlug || targetSlug === slug) {
        callback(isInWatchlist(slug));
      }
    });
  });
}

export function subscribeToWatchlist(slug: string, callback: (inList: boolean) => void): () => void {
  ensureSharedListener();
  const entry = { slug, callback };
  subscribers.add(entry);
  return () => {
    subscribers.delete(entry);
  };
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      invalidateMemoryCache();
      window.dispatchEvent(new CustomEvent("watchlist-updated"));
    }
  });
}

export function getWatchlist(): WatchlistItem[] {
  if (typeof window === "undefined") return [];
  if (memoryWatchlist !== null) {
    return memoryWatchlist;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      updateMemoryCache([]);
      return [];
    }
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : [];
    updateMemoryCache(list);
    return list;
  } catch {
    updateMemoryCache([]);
    return [];
  }
}

export function isInWatchlist(slug: string): boolean {
  if (!slug || typeof window === "undefined") return false;
  if (memoryWatchlistSlugs === null) {
    getWatchlist();
  }
  return memoryWatchlistSlugs?.has(slug) ?? false;
}

export function addToWatchlist(item: Omit<WatchlistItem, "addedAt">): void {
  if (typeof window === "undefined" || !item.slug) return;
  try {
    const list = getWatchlist();
    if (memoryWatchlistSlugs?.has(item.slug)) return;
    const itemWithAddedAt: WatchlistItem = { ...item, addedAt: Date.now() };
    const updated = [itemWithAddedAt, ...list];
    updateMemoryCache(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("watchlist-updated", { detail: { slug: item.slug } }));

    // Tự động lưu lên Supabase Cloud nếu đang đăng nhập
    if (auth?.currentUser) {
      saveWatchlistItemToCloud(auth.currentUser.uid, itemWithAddedAt);
    }
  } catch (e) {
    console.error("Lỗi lưu danh sách:", e);
  }
}

export function removeFromWatchlist(slug: string): void {
  if (typeof window === "undefined" || !slug) return;
  try {
    const list = getWatchlist();
    const updated = list.filter((i) => i.slug !== slug);
    updateMemoryCache(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("watchlist-updated", { detail: { slug } }));

    // Tự động xóa khỏi Supabase Cloud nếu đang đăng nhập
    if (auth?.currentUser) {
      removeWatchlistItemFromCloud(auth.currentUser.uid, slug);
    }
  } catch (e) {
    console.error("Lỗi xóa khỏi danh sách:", e);
  }
}

export function toggleWatchlist(item: Omit<WatchlistItem, "addedAt">): boolean {
  if (isInWatchlist(item.slug)) {
    removeFromWatchlist(item.slug);
    return false;
  } else {
    addToWatchlist(item);
    return true;
  }
}

/**
 * Xóa danh sách yêu thích trên máy tính này khi đăng xuất để trả máy về trạng thái sạch
 */
export function clearLocalWatchlistOnly(): void {
  if (typeof window === "undefined") return;
  try {
    updateMemoryCache([]);
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("watchlist-updated"));
  } catch (e) {
    console.error("Lỗi xóa local watchlist:", e);
  }
}

// Cờ chống gọi autoHydrate lặp lại trong cùng 1 phiên
let isHydratingWatchlist = false;

/**
 * Tự động bù đắp thông tin (Tiêu đề, Poster/Image) cho các phim xem sau cũ bị thiếu
 */
export async function autoHydrateWatchlist(): Promise<void> {
  if (typeof window === "undefined" || isHydratingWatchlist) return;
  const list = getWatchlist();
  const needHydration = list.filter(
    (item) =>
      !item.title ||
      item.title === item.slug ||
      !item.imageUrl ||
      item.imageUrl.includes("default-")
  );

  if (needHydration.length === 0) return;

  isHydratingWatchlist = true;
  try {
    const slugsToFetch = needHydration.map((i) => i.slug).join(",");
    const res = await fetch(`/api/movies/meta?slugs=${encodeURIComponent(slugsToFetch)}`);
    if (!res.ok) return;

    const data = await res.json();
    if (!data.success || !data.movies) return;

    let hasChanges = false;
    const currentList = getWatchlist();
    const updatedList = currentList.map((item) => {
      const meta = data.movies[item.slug];
      if (!meta) return item;

      let changed = false;
      const updatedItem = { ...item };

      if (meta.title && (!item.title || item.title === item.slug)) {
        updatedItem.title = meta.title;
        changed = true;
      }
      const bestImg = meta.thumb || meta.poster;
      if (bestImg && (!item.imageUrl || item.imageUrl.includes("default-"))) {
        updatedItem.imageUrl = bestImg;
        changed = true;
      }
      if (meta.poster && !item.poster) {
        updatedItem.poster = meta.poster;
        changed = true;
      }
      if (meta.year && !item.year) {
        updatedItem.year = meta.year;
        changed = true;
      }
      if (meta.quality && (!item.quality || item.quality === "HD")) {
        updatedItem.quality = meta.quality;
        changed = true;
      }
      if (meta.category && !item.category && !item.genre) {
        updatedItem.category = meta.category;
        changed = true;
      }

      if (changed) {
        hasChanges = true;
        // Đẩy metadata cập nhật lên Cloud nếu có auth
        if (auth?.currentUser) {
          saveWatchlistItemToCloud(auth.currentUser.uid, updatedItem);
        }
      }

      return updatedItem;
    });

    if (hasChanges) {
      updateMemoryCache(updatedList);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
      window.dispatchEvent(new CustomEvent("watchlist-updated"));
    }
  } catch (err) {
    console.warn("Lỗi autoHydrateWatchlist:", err);
  } finally {
    isHydratingWatchlist = false;
  }
}

