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

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      invalidateMemoryCache();
      window.dispatchEvent(new Event("watchlist-updated"));
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
    window.dispatchEvent(new Event("watchlist-updated"));

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
    window.dispatchEvent(new Event("watchlist-updated"));

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
    window.dispatchEvent(new Event("watchlist-updated"));
  } catch (e) {
    console.error("Lỗi xóa local watchlist:", e);
  }
}
