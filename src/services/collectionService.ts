import { MovieCollection, CollectionMovieItem } from "@/types/collection";
import {
  getUserCollectionsSupabase,
  getPublicCollectionsSupabase,
} from "./supabaseService";
import { isSupabaseConfigured } from "@/lib/supabase";
import { auth } from "@/lib/firebase";
import { movieApi } from "./movies/service";
import { normalizeMovie } from "@/lib/movieMedia";
import {
  LOCAL_COLLECTIONS_KEY_PREFIX,
  MAX_SYNC_ATTEMPTS,
  PENDING_SYNC_KEY_PREFIX,
  normalizeCollection,
  getPendingSync,
  addPendingSync,
  removePendingSync,
  clearPendingSync,
  getTombstones,
  addTombstone,
  clearTombstone,
  mergeCollections,
  sanitizeAndDeduplicateMovies,
  type PendingSyncItem,
  type SanitizedMovieItem,
} from "./collections/collectionSyncManager";
import {
  SMART_COLLECTIONS,
  getSmartCollectionsList,
  type SmartCollectionConfig,
} from "@/data/collections/smartCollections";

export {
  normalizeCollection,
  getPendingSync,
  addPendingSync,
  removePendingSync,
  clearPendingSync,
  getTombstones,
  addTombstone,
  clearTombstone,
  mergeCollections,
  sanitizeAndDeduplicateMovies,
  SMART_COLLECTIONS,
  getSmartCollectionsList,
};
export type { PendingSyncItem, SanitizedMovieItem, SmartCollectionConfig };

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
 * Lấy danh sách bộ sưu tập từ LocalStorage
 */
export function getLocalCollections(userId: string): MovieCollection[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_COLLECTIONS_KEY_PREFIX}${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeCollection)
      .filter((c: MovieCollection | null): c is MovieCollection => c !== null);
  } catch {
    return [];
  }
}

/**
 * Lưu danh sách bộ sưu tập vào LocalStorage & phát sự kiện đồng bộ
 */
export function saveLocalCollections(userId: string, items: MovieCollection[]): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    const normalizedItems = items
      .map(normalizeCollection)
      .filter((c: MovieCollection | null): c is MovieCollection => c !== null);

    localStorage.setItem(
      `${LOCAL_COLLECTIONS_KEY_PREFIX}${userId}`,
      JSON.stringify(normalizedItems)
    );
    window.dispatchEvent(
      new CustomEvent("collections-updated", { detail: { userId, items: normalizedItems } })
    );
  } catch (e) {
    console.warn("Lỗi lưu localStorage collections:", e);
  }
}

/**
 * Lưu bộ sưu tập qua Server API
 */
export async function syncCollectionToServer(collection: MovieCollection): Promise<boolean> {
  try {
    const headers = await getAuthHeaders();
    if (!headers["Authorization" as keyof typeof headers]) return false;

    const res = await fetch("/api/user/collections", {
      method: "POST",
      headers,
      body: JSON.stringify(collection),
    });
    return res.ok;
  } catch (err) {
    console.warn("Lỗi lưu collection qua API:", err);
    return false;
  }
}

const activeSyncPromises = new Map<string, Promise<void>>();

/**
 * Tiến trình đồng bộ lại các bản ghi đang chờ (Pending Sync) lên Server
 */
export async function processPendingSync(userId: string): Promise<void> {
  if (typeof window === "undefined" || !userId) return;

  const currentUid = auth?.currentUser?.uid;
  if (currentUid && currentUid !== userId) {
    return;
  }

  const existingPromise = activeSyncPromises.get(userId);
  if (existingPromise) {
    return existingPromise;
  }

  const syncPromise = (async () => {
    try {
      const pendingMap = getPendingSync(userId);
      const pendingIds = Object.keys(pendingMap);
      if (pendingIds.length === 0) return;

      const tombstones = getTombstones(userId);
      const localCols = getLocalCollections(userId);
      const now = Date.now();

      for (const colId of pendingIds) {
        const activeUid = auth?.currentUser?.uid;
        if (activeUid && activeUid !== userId) {
          break;
        }

        if (tombstones[colId]) {
          removePendingSync(userId, colId);
          continue;
        }

        const col = localCols.find((c) => c.id === colId);
        if (!col) {
          removePendingSync(userId, colId);
          continue;
        }

        const item = pendingMap[colId];
        if (!item) continue;

        if (item.attempts >= MAX_SYNC_ATTEMPTS) {
          removePendingSync(userId, colId);
          continue;
        }

        const backoffMs = Math.min(1000 * Math.pow(2, item.attempts), 30000);
        if (item.attempts > 0 && now - item.lastAttempt < backoffMs) {
          continue;
        }

        const success = await syncCollectionToServer(col);
        if (success) {
          removePendingSync(userId, colId);
        } else {
          item.attempts += 1;
          item.lastAttempt = Date.now();
          try {
            const current = getPendingSync(userId);
            current[colId] = item;
            localStorage.setItem(`${PENDING_SYNC_KEY_PREFIX}${userId}`, JSON.stringify(current));
          } catch {}
        }
      }
    } catch (e) {
      console.warn("[Collections] Lỗi processPendingSync:", e);
    } finally {
      activeSyncPromises.delete(userId);
    }
  })();

  activeSyncPromises.set(userId, syncPromise);
  return syncPromise;
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    const currentUid = auth?.currentUser?.uid;
    if (currentUid) {
      processPendingSync(currentUid).catch(() => {});
    }
  });
}

/**
 * Xóa bộ sưu tập qua Server API
 */
async function deleteCollectionFromServer(collectionId: string): Promise<boolean> {
  try {
    const headers = await getAuthHeaders();
    if (!headers["Authorization" as keyof typeof headers]) return false;

    const res = await fetch(`/api/user/collections?id=${encodeURIComponent(collectionId)}`, {
      method: "DELETE",
      headers,
    });
    return res.ok || res.status === 404;
  } catch (err) {
    console.warn("Lỗi xóa collection qua API:", err);
    return false;
  }
}

/**
 * Lấy danh sách bộ sưu tập của người dùng
 */
export async function getUserCollections(userId: string): Promise<MovieCollection[]> {
  if (!userId) return [];
  const localList = getLocalCollections(userId);
  const tombstones = getTombstones(userId);

  let serverItems: MovieCollection[] | null = null;
  let isReliableServerResponse = false;

  try {
    const headers = await getAuthHeaders();
    if (headers["Authorization" as keyof typeof headers]) {
      const res = await fetch("/api/user/collections", {
        method: "GET",
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.items)) {
          serverItems = data.items
            .map(normalizeCollection)
            .filter((c: MovieCollection | null): c is MovieCollection => c !== null);
          isReliableServerResponse = true;
        }
      } else if (res.status === 401 || res.status === 403) {
        console.warn(`[Collections] API trả về ${res.status}, bảo vệ an toàn LocalStorage.`);
      }
    }
  } catch (err) {
    console.warn("Lỗi fetch /api/user/collections:", err);
  }

  if (!isReliableServerResponse && isSupabaseConfigured()) {
    try {
      const supaResult = await getUserCollectionsSupabase(userId);
      if (supaResult && supaResult.status === "success" && Array.isArray(supaResult.items)) {
        serverItems = supaResult.items
          .map(normalizeCollection)
          .filter((c: MovieCollection | null): c is MovieCollection => c !== null);
        isReliableServerResponse = true;
      }
    } catch (err) {
      console.warn("Lỗi fetch Supabase collections fallback:", err);
    }
  }

  if (isReliableServerResponse && serverItems !== null) {
    const activeUid = auth?.currentUser?.uid;
    if (!activeUid || activeUid === userId) {
      const merged = mergeCollections(localList, serverItems, userId, tombstones);
      saveLocalCollections(userId, merged);
      if (typeof window !== "undefined") {
        processPendingSync(userId).catch(() => {});
      }
      return merged;
    }
  }

  if (typeof window !== "undefined") {
    processPendingSync(userId).catch(() => {});
  }
  return localList;
}

/**
 * Lắng nghe thay đổi real-time danh sách bộ sưu tập (Supabase + LocalStorage)
 */
export function subscribeUserCollections(
  userId: string,
  callback: (collections: MovieCollection[]) => void
): () => void {
  if (!userId) {
    callback([]);
    return () => {};
  }

  let isSubscribed = true;

  const initialLocal = getLocalCollections(userId);
  callback(initialLocal);

  getUserCollections(userId)
    .then((items) => {
      if (!isSubscribed) return;
      const activeUid = auth?.currentUser?.uid;
      if (activeUid && activeUid !== userId) return;
      callback(items);
    })
    .catch(() => {});

  const handleLocalUpdate = (e: Event) => {
    if (!isSubscribed) return;
    const customEvent = e as CustomEvent<{ userId: string; items: MovieCollection[] }>;
    if (customEvent.detail && customEvent.detail.userId === userId) {
      callback(customEvent.detail.items);
    } else if (!customEvent.detail || customEvent.detail.userId === userId) {
      callback(getLocalCollections(userId));
    }
  };

  const handleStorageChange = (e: StorageEvent) => {
    if (!isSubscribed) return;
    if (e.key === `${LOCAL_COLLECTIONS_KEY_PREFIX}${userId}`) {
      callback(getLocalCollections(userId));
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("collections-updated", handleLocalUpdate);
    window.addEventListener("storage", handleStorageChange);
  }

  return () => {
    isSubscribed = false;
    if (typeof window !== "undefined") {
      window.removeEventListener("collections-updated", handleLocalUpdate);
      window.removeEventListener("storage", handleStorageChange);
    }
  };
}

/**
 * Tạo bộ sưu tập mới
 */
export async function createCollection(
  userId: string,
  creatorName: string,
  creatorPhoto: string | undefined,
  name: string,
  description: string = "",
  isPublic: boolean = true,
  coverUrl?: string,
  colorGradient?: string
): Promise<MovieCollection | null> {
  if (!userId) return null;

  try {
    const now = Date.now();
    const collectionId = `col_${now}_${Math.random().toString(36).slice(2, 8)}`;

    const collectionData: MovieCollection = {
      id: collectionId,
      userId,
      creatorName: creatorName || "Thành viên Nanaflix",
      creatorPhoto: creatorPhoto || "",
      name: name.trim(),
      description: description.trim(),
      isPublic,
      coverUrl: coverUrl?.trim() || undefined,
      colorGradient: colorGradient?.trim() || undefined,
      movies: [],
      createdAt: now,
      updatedAt: now,
    };

    clearTombstone(userId, collectionId);

    const currentLocal = getLocalCollections(userId);
    const updatedLocal = [collectionData, ...currentLocal.filter((c) => c.id !== collectionData.id)];
    saveLocalCollections(userId, updatedLocal);

    addPendingSync(userId, collectionId);
    syncCollectionToServer(collectionData)
      .then((success) => {
        if (success) {
          removePendingSync(userId, collectionId);
        }
      })
      .catch((err) => {
        console.warn("Lỗi lưu API collection:", err);
      });

    return collectionData;
  } catch (err) {
    console.error("Lỗi tạo bộ sưu tập:", err);
    return null;
  }
}

/**
 * Xóa bộ sưu tập
 */
export async function deleteCollection(
  userId: string,
  collectionId: string
): Promise<boolean> {
  if (!userId || !collectionId) return false;

  const currentLocal = getLocalCollections(userId);
  const snapshot = currentLocal.find((c) => c.id === collectionId);
  const updatedLocal = currentLocal.filter((c) => c.id !== collectionId);

  saveLocalCollections(userId, updatedLocal);
  removePendingSync(userId, collectionId);

  try {
    const serverOk = await deleteCollectionFromServer(collectionId);
    if (!serverOk) {
      throw new Error("Server xóa thất bại hoặc lỗi mạng");
    }

    addTombstone(userId, collectionId);
    return true;
  } catch (err) {
    console.warn("Lỗi xóa bộ sưu tập, tiến hành rollback:", err);
    clearTombstone(userId, collectionId);
    if (snapshot) {
      const restored = [snapshot, ...getLocalCollections(userId).filter((c) => c.id !== collectionId)];
      saveLocalCollections(userId, restored);
    }
    return false;
  }
}

/**
 * Thêm phim vào bộ sưu tập
 */
export async function addMovieToCollection(
  userId: string,
  collectionId: string,
  movie: Omit<CollectionMovieItem, "addedAt">
): Promise<boolean> {
  if (!userId || !collectionId) return false;

  try {
    const now = Date.now();
    const newItem: CollectionMovieItem = {
      ...movie,
      addedAt: now,
    };

    const currentLocal = getLocalCollections(userId);
    let targetCol = currentLocal.find((c) => c.id === collectionId);
    let updatedMovies: CollectionMovieItem[] = [];

    if (targetCol) {
      const existingMovies = Array.isArray(targetCol.movies) ? targetCol.movies : [];
      if (existingMovies.some((m) => m.slug === movie.slug)) {
        return true;
      }
      updatedMovies = [newItem, ...existingMovies];
      targetCol = {
        ...targetCol,
        movies: updatedMovies,
        updatedAt: now,
      };
      saveLocalCollections(
        userId,
        currentLocal.map((c) => (c.id === collectionId ? targetCol! : c))
      );

      addPendingSync(userId, collectionId);
      syncCollectionToServer(targetCol)
        .then((success) => {
          if (success) {
            removePendingSync(userId, collectionId);
          }
        })
        .catch(() => {});
    }

    return true;
  } catch (err) {
    console.error("Lỗi thêm phim vào bộ sưu tập:", err);
    return false;
  }
}

/**
 * Xóa phim khỏi bộ sưu tập
 */
export async function removeMovieFromCollection(
  userId: string,
  collectionId: string,
  movieSlug: string
): Promise<boolean> {
  if (!userId || !collectionId) return false;

  try {
    const now = Date.now();

    const currentLocal = getLocalCollections(userId);
    const targetCol = currentLocal.find((c) => c.id === collectionId);
    if (targetCol) {
      const updatedMovies = (targetCol.movies || []).filter((m) => m.slug !== movieSlug);
      const updatedCol = {
        ...targetCol,
        movies: updatedMovies,
        updatedAt: now,
      };
      saveLocalCollections(
        userId,
        currentLocal.map((c) => (c.id === collectionId ? updatedCol : c))
      );

      addPendingSync(userId, collectionId);
      syncCollectionToServer(updatedCol)
        .then((success) => {
          if (success) {
            removePendingSync(userId, collectionId);
          }
        })
        .catch(() => {});
    }

    return true;
  } catch (err) {
    console.error("Lỗi xóa phim khỏi bộ sưu tập:", err);
    return false;
  }
}

/**
 * Bật/Tắt chế độ công khai cho bộ sưu tập
 */
export async function toggleCollectionPrivacy(
  userId: string,
  collectionId: string,
  makePublic: boolean
): Promise<boolean> {
  if (!userId || !collectionId) return false;

  try {
    const now = Date.now();

    const currentLocal = getLocalCollections(userId);
    const targetCol = currentLocal.find((c) => c.id === collectionId);
    if (targetCol) {
      const updatedCol = {
        ...targetCol,
        isPublic: makePublic,
        updatedAt: now,
      };
      saveLocalCollections(
        userId,
        currentLocal.map((c) => (c.id === collectionId ? updatedCol : c))
      );

      addPendingSync(userId, collectionId);
      syncCollectionToServer(updatedCol)
        .then((success) => {
          if (success) {
            removePendingSync(userId, collectionId);
          }
        })
        .catch(() => {});
    }

    return true;
  } catch (err) {
    console.warn("Lỗi thay đổi trạng thái công khai bộ sưu tập:", err);
    return false;
  }
}

/**
 * Lấy bộ sưu tập công khai theo ID để bất kỳ ai có link đều xem được
 */
export async function getPublicCollection(
  collectionId: string,
  userId?: string | null
): Promise<MovieCollection | null> {
  if (!collectionId) return null;

  const smartConfig = SMART_COLLECTIONS.find((s) => s.id === collectionId);
  if (smartConfig) {
    try {
      const res = await movieApi.getMovies(smartConfig.query);
      const rawItems = res?.items || [];
      const movies: CollectionMovieItem[] = rawItems.map((raw: Parameters<typeof normalizeMovie>[0]) => {
        const norm = normalizeMovie(raw);
        return {
          slug: norm.slug,
          title: norm.title,
          poster: norm.posterUrl || norm.imageUrl || norm.thumbUrl || "/default-poster.jpg",
          year: norm.year,
          quality: norm.quality || "FHD",
          category: norm.genre || norm.categories?.[0]?.name || "Tuyển tập",
          addedAt: Date.now(),
        };
      });

      return {
        id: smartConfig.id,
        userId: "nanaflix_system",
        creatorName: "Nanaflix Editorial",
        creatorPhoto: "/icon.svg",
        name: smartConfig.name,
        description: smartConfig.description,
        isPublic: true,
        movies,
        createdAt: 1704067200000,
        updatedAt: Date.now(),
      };
    } catch (err) {
      console.warn("Lỗi tải Smart Collection:", err);
    }
  }

  if (typeof window === "undefined") {
    try {
      const { cacheService } = await import("@/lib/cache");
      const cached = await cacheService.get<MovieCollection>(`collection:public:${collectionId}`);
      if (cached) {
        if (cached.isPublic || (userId && cached.userId === userId)) {
          return cached;
        }
      }

      const { getSupabaseAdmin } = await import("@/lib/supabaseAdmin");
      const supabase = getSupabaseAdmin();
      if (supabase) {
        const { data, error } = await supabase
          .from("collections")
          .select("id, user_id, user_name, user_avatar, name, description, is_public, movies, created_at, updated_at")
          .eq("id", collectionId)
          .maybeSingle();

        if (!error && data) {
          const isPublic = Boolean(data.is_public ?? true);
          const ownerId = String(data.user_id || "");

          if (isPublic || (userId && ownerId === userId)) {
            const formatted: MovieCollection = {
              id: String(data.id),
              userId: ownerId,
              creatorName: String(data.user_name || "Thành viên Nanaflix"),
              creatorPhoto: data.user_avatar ? String(data.user_avatar) : undefined,
              name: String(data.name || ""),
              description: String(data.description || ""),
              isPublic,
              movies: Array.isArray(data.movies) ? (data.movies as CollectionMovieItem[]) : [],
              createdAt: Number(data.created_at) || Date.now(),
              updatedAt: Number(data.updated_at) || Date.now(),
            };

            if (isPublic) {
              await cacheService.set(`collection:public:${collectionId}`, formatted, 180).catch(() => false);
            }
            return formatted;
          }
        }
      }
    } catch (err) {
      console.warn("Lỗi server getPublicCollection:", err);
    }
  }

  if (typeof window !== "undefined") {
    try {
      const res = await fetch(`/api/user/collections?id=${encodeURIComponent(collectionId)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.item) {
          const item = json.item;
          const isPublic = Boolean(item.is_public ?? item.isPublic ?? true);
          const ownerId = String(item.user_id || item.userId || "");
          if (isPublic || (userId && ownerId === userId)) {
            return {
              id: String(item.id),
              userId: ownerId,
              creatorName: String(item.user_name || item.creatorName || "Thành viên Nanaflix"),
              creatorPhoto: item.user_avatar ? String(item.user_avatar) : (item.creatorPhoto ? String(item.creatorPhoto) : undefined),
              name: String(item.name || ""),
              description: String(item.description || ""),
              isPublic,
              movies: Array.isArray(item.movies) ? item.movies : [],
              createdAt: Number(item.created_at || item.createdAt) || Date.now(),
              updatedAt: Number(item.updated_at || item.updatedAt) || Date.now(),
            };
          }
        }
      }
    } catch {}
  }

  if (typeof window !== "undefined") {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LOCAL_COLLECTIONS_KEY_PREFIX)) {
        try {
          const items: MovieCollection[] = JSON.parse(localStorage.getItem(key) || "[]");
          const found = items.find((c) => c.id === collectionId);
          if (found && (found.isPublic !== false || (userId && found.userId === userId))) {
            return found;
          }
        } catch {}
      }
    }
  }

  return null;
}

/**
 * Lắng nghe toàn bộ bộ sưu tập công khai theo thời gian thực (Dành cho Quản Trị Viên)
 */
export function subscribeAllPublicCollections(
  onUpdate: (collections: MovieCollection[]) => void,
  onError?: (err: Error) => void
): () => void {
  let isUnsubscribed = false;
  let isFetching = false;

  const fetchCollections = async () => {
    if (isUnsubscribed || isFetching) return;
    if (isSupabaseConfigured()) {
      isFetching = true;
      try {
        const items = await getPublicCollectionsSupabase();
        if (!isUnsubscribed && items) {
          onUpdate(items);
        }
      } catch (err) {
        if (onError && err instanceof Error) onError(err);
      } finally {
        isFetching = false;
      }
    }
  };

  fetchCollections();

  const handleUpdate = () => {
    if (!isUnsubscribed) fetchCollections();
  };

  const handleVisibilityChange = () => {
    if (!isUnsubscribed && typeof document !== "undefined" && !document.hidden) {
      fetchCollections();
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("collections-updated", handleUpdate);
    document.addEventListener("visibilitychange", handleVisibilityChange);
  }

  const interval = setInterval(() => {
    if (!isUnsubscribed && typeof document !== "undefined" && !document.hidden) {
      fetchCollections();
    }
  }, 300000);

  return () => {
    isUnsubscribed = true;
    clearInterval(interval);
    if (typeof window !== "undefined") {
      window.removeEventListener("collections-updated", handleUpdate);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    }
  };
}

/**
 * Xóa bộ sưu tập công khai (Dành cho Quản trị viên)
 */
export async function deletePublicCollectionAdmin(collectionId: string): Promise<boolean> {
  if (!collectionId) return false;
  try {
    return await deleteCollectionFromServer(collectionId);
  } catch (err) {
    console.error("Lỗi xóa public_collection:", err);
    return false;
  }
}
