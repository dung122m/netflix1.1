import { auth } from "./firebase";
import {
  saveWatchlistItemToCloud,
  removeWatchlistItemFromCloud,
} from "./cloudSync";

export interface WatchlistItem {
  slug: string;
  title: string;
  imageUrl: string;
  year?: string | number;
  genre?: string;
  time?: string;
  country?: string;
  type_name?: string;
  addedAt: number;
}

const STORAGE_KEY = "nanaflix_watchlist_v1";

export function getWatchlist(): WatchlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function isInWatchlist(slug: string): boolean {
  if (!slug) return false;
  const list = getWatchlist();
  return list.some((item) => item.slug === slug);
}

export function addToWatchlist(item: Omit<WatchlistItem, "addedAt">): void {
  if (typeof window === "undefined" || !item.slug) return;
  try {
    const list = getWatchlist();
    if (list.some((i) => i.slug === item.slug)) return;
    const itemWithAddedAt: WatchlistItem = { ...item, addedAt: Date.now() };
    const updated = [itemWithAddedAt, ...list];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("watchlist-updated"));

    // Tự động lưu lên Firebase Cloud Firestore nếu đang đăng nhập
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("watchlist-updated"));

    // Tự động xóa khỏi Firebase Cloud Firestore nếu đang đăng nhập
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
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("watchlist-updated"));
  } catch (e) {
    console.error("Lỗi xóa local watchlist:", e);
  }
}
