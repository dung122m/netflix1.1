import { auth } from "./firebase";

export type MovieReaction = "like" | "dislike" | null;

export interface MovieReactionMetadata {
  title?: string;
  poster?: string;
  genre?: string;
  category?: string;
  country?: string;
  type_name?: string;
  type?: string;
  year?: string | number;
}

export interface MovieReactionItem {
  slug: string;
  reaction: "like" | "dislike";
  title?: string;
  poster?: string;
  genre?: string;
  country?: string;
  type_name?: string;
  year?: number;
  updatedAt: number;
}

const STORAGE_KEY = "nanaflix_movie_reactions_v1";

// Bộ nhớ đệm in-memory
let memoryReactions: Record<string, MovieReactionItem> | null = null;

function updateMemoryCache(items: Record<string, MovieReactionItem>): void {
  memoryReactions = items;
}

function invalidateMemoryCache(): void {
  memoryReactions = null;
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      invalidateMemoryCache();
      window.dispatchEvent(new CustomEvent("movie-reaction-updated", { detail: { sync: true } }));
    }
  });
}

function loadFromLocalStorage(): Record<string, MovieReactionItem> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
    // Backward compatibility nếu dạng mảng
    if (Array.isArray(parsed)) {
      const map: Record<string, MovieReactionItem> = {};
      for (const item of parsed) {
        if (item && item.slug && (item.reaction === "like" || item.reaction === "dislike")) {
          map[item.slug] = item;
        }
      }
      return map;
    }
    return {};
  } catch {
    return {};
  }
}

function saveToLocalStorage(map: Record<string, MovieReactionItem>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn("Lỗi lưu reactions vào localStorage:", e);
  }
}

/**
 * Lấy toàn bộ danh sách reactions dưới dạng Record<slug, "like" | "dislike">
 */
export function getMovieReactions(): Record<string, "like" | "dislike"> {
  if (typeof window === "undefined") return {};
  if (memoryReactions === null) {
    memoryReactions = loadFromLocalStorage();
  }
  const result: Record<string, "like" | "dislike"> = {};
  for (const [slug, item] of Object.entries(memoryReactions)) {
    if (item && (item.reaction === "like" || item.reaction === "dislike")) {
      result[slug] = item.reaction;
    }
  }
  return result;
}

/**
 * Lấy danh sách đầy đủ chi tiết của các phản hồi (kèm metadata thể loại, quốc gia...)
 */
export function getAllReactionItems(): MovieReactionItem[] {
  if (typeof window === "undefined") return [];
  if (memoryReactions === null) {
    memoryReactions = loadFromLocalStorage();
  }
  return Object.values(memoryReactions);
}

/**
 * Lấy trạng thái phản hồi của 1 phim cụ thể ("like" | "dislike" | null)
 */
export function getMovieReaction(slug: string): MovieReaction {
  if (!slug || typeof window === "undefined") return null;
  if (memoryReactions === null) {
    memoryReactions = loadFromLocalStorage();
  }
  return memoryReactions[slug]?.reaction || null;
}

/**
 * Lấy auth header bearer token nếu user đã đăng nhập
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  try {
    const token = await auth?.currentUser?.getIdToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  } catch {}
  return headers;
}

/**
 * Thiết lập hoặc hủy phản hồi (like / dislike / null) cho 1 phim
 * Áp dụng Optimistic UI + Rollback nếu Server API lỗi
 */
export async function setMovieReaction(
  slug: string,
  reaction: MovieReaction,
  metadata?: MovieReactionMetadata
): Promise<{ success: boolean; reaction: MovieReaction }> {
  if (!slug || typeof window === "undefined") {
    return { success: false, reaction: null };
  }

  if (memoryReactions === null) {
    memoryReactions = loadFromLocalStorage();
  }

  const previousItem = memoryReactions[slug] || null;
  const previousReaction = previousItem?.reaction || null;

  // 1. OPTIMISTIC UPDATE: Cập nhật local state ngay lập tức
  const updatedMap = { ...memoryReactions };
  const now = Date.now();

  if (reaction === "like" || reaction === "dislike") {
    const newItem: MovieReactionItem = {
      slug,
      reaction,
      title: metadata?.title || previousItem?.title,
      poster: metadata?.poster || previousItem?.poster,
      genre: metadata?.genre || metadata?.category || previousItem?.genre,
      country: metadata?.country || previousItem?.country,
      type_name: metadata?.type_name || metadata?.type || previousItem?.type_name,
      year: metadata?.year ? Number(metadata.year) : previousItem?.year,
      updatedAt: now,
    };
    updatedMap[slug] = newItem;
  } else {
    delete updatedMap[slug];
  }

  updateMemoryCache(updatedMap);
  saveToLocalStorage(updatedMap);

  // Dispatch custom event để mọi components (MediaCard, MovieDetail, ForYou) cập nhật realtime
  window.dispatchEvent(
    new CustomEvent("movie-reaction-updated", {
      detail: { slug, reaction, previousReaction },
    })
  );

  // 2. SERVER SYNC: Nếu đang đăng nhập, đồng bộ lên Supabase qua Server API
  if (auth?.currentUser) {
    try {
      const headers = await getAuthHeaders();
      if (headers["Authorization" as keyof typeof headers]) {
        const payload = {
          slug,
          reaction,
          title: metadata?.title || previousItem?.title,
          poster: metadata?.poster || previousItem?.poster,
          genre: metadata?.genre || metadata?.category || previousItem?.genre,
          country: metadata?.country || previousItem?.country,
          type_name: metadata?.type_name || metadata?.type || previousItem?.type_name,
          year: metadata?.year ? Number(metadata.year) : previousItem?.year,
          updatedAt: now,
        };

        const res = await fetch("/api/user/reactions", {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error(`Server returned ${res.status}`);
        }
      }
    } catch (err) {
      console.warn("Lỗi lưu reaction lên server, rollback trạng thái:", err);
      // ROLLBACK LOCAL STATE
      const rollbackMap = { ...loadFromLocalStorage() };
      if (previousItem) {
        rollbackMap[slug] = previousItem;
      } else {
        delete rollbackMap[slug];
      }
      updateMemoryCache(rollbackMap);
      saveToLocalStorage(rollbackMap);
      window.dispatchEvent(
        new CustomEvent("movie-reaction-updated", {
          detail: { slug, reaction: previousReaction, error: true },
        })
      );
      return { success: false, reaction: previousReaction };
    }
  }

  return { success: true, reaction };
}

/**
 * Toggle Like: Nếu đang Like -> hủy (null), nếu chưa -> Like (hủy Dislike nếu có)
 */
export async function toggleLike(
  slug: string,
  metadata?: MovieReactionMetadata
): Promise<MovieReaction> {
  const current = getMovieReaction(slug);
  const target: MovieReaction = current === "like" ? null : "like";
  const res = await setMovieReaction(slug, target, metadata);
  return res.reaction;
}

/**
 * Toggle Dislike: Nếu đang Dislike -> hủy (null), nếu chưa -> Dislike (hủy Like nếu có)
 */
export async function toggleDislike(
  slug: string,
  metadata?: MovieReactionMetadata
): Promise<MovieReaction> {
  const current = getMovieReaction(slug);
  const target: MovieReaction = current === "dislike" ? null : "dislike";
  const res = await setMovieReaction(slug, target, metadata);
  return res.reaction;
}

/**
 * Đồng bộ hai chiều reactions giữa LocalStorage và Supabase khi user đăng nhập
 */
export async function syncReactionsWithCloud(
  userId: string
): Promise<Record<string, "like" | "dislike">> {
  if (!userId || typeof window === "undefined") {
    return getMovieReactions();
  }

  try {
    const headers = await getAuthHeaders();
    if (!headers["Authorization" as keyof typeof headers]) {
      return getMovieReactions();
    }

    const res = await fetch("/api/user/reactions", {
      method: "GET",
      headers,
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.items)) {
        const cloudMap: Record<string, MovieReactionItem> = {};
        for (const item of json.items) {
          if (item && item.slug && (item.reaction === "like" || item.reaction === "dislike")) {
            cloudMap[item.slug] = item;
          }
        }

        // Merge với local items (ưu tiên timestamp mới nhất)
        const localMap = loadFromLocalStorage();
        const mergedMap: Record<string, MovieReactionItem> = { ...cloudMap };

        const localItemsToUpload: MovieReactionItem[] = [];
        for (const [slug, localItem] of Object.entries(localMap)) {
          const cloudItem = cloudMap[slug];
          if (!cloudItem) {
            mergedMap[slug] = localItem;
            localItemsToUpload.push(localItem);
          } else if ((localItem.updatedAt || 0) > (cloudItem.updatedAt || 0)) {
            mergedMap[slug] = localItem;
            localItemsToUpload.push(localItem);
          }
        }

        updateMemoryCache(mergedMap);
        saveToLocalStorage(mergedMap);
        window.dispatchEvent(
          new CustomEvent("movie-reaction-updated", { detail: { sync: true } })
        );

        if (localItemsToUpload.length > 0) {
          fetch("/api/user/reactions", {
            method: "POST",
            headers,
            body: JSON.stringify({ items: localItemsToUpload }),
          }).catch(() => {});
        }

        const result: Record<string, "like" | "dislike"> = {};
        for (const [slug, item] of Object.entries(mergedMap)) {
          result[slug] = item.reaction;
        }
        return result;
      }
    }

    // Nếu remote rỗng nhưng local có, sync local lên server
    const localMap = loadFromLocalStorage();
    const localItems = Object.values(localMap);
    if (localItems.length > 0) {
      await fetch("/api/user/reactions", {
        method: "POST",
        headers,
        body: JSON.stringify({ items: localItems }),
      });
    }

    return getMovieReactions();
  } catch (err) {
    console.warn("Lỗi đồng bộ movie reactions với Cloud:", err);
    return getMovieReactions();
  }
}
