import { MovieCollection, CollectionMovieItem } from "@/types/collection";
import {
  getUserCollectionsSupabase,
  saveCollectionSupabase,
  deleteCollectionSupabase,
  getPublicCollectionsSupabase,
} from "./supabaseService";
import { isSupabaseConfigured } from "@/lib/supabase";

const LOCAL_COLLECTIONS_KEY_PREFIX = "nanaflix_collections_";

/**
 * Lấy danh sách bộ sưu tập từ LocalStorage
 */
export function getLocalCollections(userId: string): MovieCollection[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_COLLECTIONS_KEY_PREFIX}${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
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
    localStorage.setItem(
      `${LOCAL_COLLECTIONS_KEY_PREFIX}${userId}`,
      JSON.stringify(items)
    );
    window.dispatchEvent(
      new CustomEvent("collections-updated", { detail: { userId, items } })
    );
  } catch (e) {
    console.warn("Lỗi lưu localStorage collections:", e);
  }
}

/**
 * Lấy danh sách bộ sưu tập của người dùng (Supabase PostgreSQL + LocalStorage Cache)
 */
export async function getUserCollections(userId: string): Promise<MovieCollection[]> {
  if (!userId) return [];
  const localList = getLocalCollections(userId);

  if (isSupabaseConfigured()) {
    try {
      const supaItems = await getUserCollectionsSupabase(userId);
      if (supaItems && supaItems.length > 0) {
        saveLocalCollections(userId, supaItems);
        return supaItems;
      }
    } catch {}
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

  // 1. Trả ngay dữ liệu local trước để không bị trễ giao diện (0ms)
  const initialLocal = getLocalCollections(userId);
  callback(initialLocal);

  // 2. Fetch mới nhất từ Supabase
  if (isSupabaseConfigured()) {
    getUserCollectionsSupabase(userId)
      .then((items) => {
        if (items.length > 0) {
          saveLocalCollections(userId, items);
          callback(items);
        }
      })
      .catch(() => {});
  }

  // 3. Lắng nghe cập nhật local từ cùng tab hoặc các tab khác
  const handleLocalUpdate = (e: Event) => {
    const customEvent = e as CustomEvent<{ userId: string; items: MovieCollection[] }>;
    if (customEvent.detail && customEvent.detail.userId === userId) {
      callback(customEvent.detail.items);
    } else {
      callback(getLocalCollections(userId));
    }
  };

  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === `${LOCAL_COLLECTIONS_KEY_PREFIX}${userId}`) {
      callback(getLocalCollections(userId));
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("collections-updated", handleLocalUpdate);
    window.addEventListener("storage", handleStorageChange);
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("collections-updated", handleLocalUpdate);
      window.removeEventListener("storage", handleStorageChange);
    }
  };
}

/**
 * Tạo bộ sưu tập mới (Lưu ngay vào LocalStorage và đồng bộ lên Supabase)
 */
export async function createCollection(
  userId: string,
  creatorName: string,
  creatorPhoto: string | undefined,
  name: string,
  description: string = "",
  isPublic: boolean = true
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
      movies: [],
      createdAt: now,
      updatedAt: now,
    };

    // 1. Luôn lưu vào LocalStorage trước để đảm bảo tính năng phản hồi 0ms
    const currentLocal = getLocalCollections(userId);
    const updatedLocal = [collectionData, ...currentLocal.filter((c) => c.id !== collectionData.id)];
    saveLocalCollections(userId, updatedLocal);

    // 2. Lưu lên Supabase
    if (isSupabaseConfigured()) {
      saveCollectionSupabase(collectionData).catch((err) => {
        console.warn("Lỗi lưu Supabase collection:", err);
      });
    }

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

  try {
    // 1. Xóa khỏi LocalStorage
    const currentLocal = getLocalCollections(userId);
    const updatedLocal = currentLocal.filter((c) => c.id !== collectionId);
    saveLocalCollections(userId, updatedLocal);

    // 2. Xóa khỏi Supabase
    if (isSupabaseConfigured()) {
      deleteCollectionSupabase(collectionId).catch(() => {});
    }

    return true;
  } catch (err) {
    console.warn("Lỗi xóa bộ sưu tập:", err);
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

    // 1. Cập nhật LocalStorage trước (0ms)
    const currentLocal = getLocalCollections(userId);
    let targetCol = currentLocal.find((c) => c.id === collectionId);
    let updatedMovies: CollectionMovieItem[] = [];

    if (targetCol) {
      const existingMovies = Array.isArray(targetCol.movies) ? targetCol.movies : [];
      if (existingMovies.some((m) => m.slug === movie.slug)) {
        return true; // Phim đã có trong bộ sưu tập
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

      // 2. Cập nhật Supabase
      if (isSupabaseConfigured()) {
        saveCollectionSupabase(targetCol).catch(() => {});
      }
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

    // 1. Cập nhật LocalStorage (0ms)
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

      // 2. Cập nhật Supabase
      if (isSupabaseConfigured()) {
        saveCollectionSupabase(updatedCol).catch(() => {});
      }
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

    // 1. Cập nhật LocalStorage
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

      // 2. Cập nhật Supabase
      if (isSupabaseConfigured()) {
        saveCollectionSupabase(updatedCol).catch(() => {});
      }
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

  // 1. Thử đọc từ Supabase public collections
  if (isSupabaseConfigured()) {
    try {
      const supaCollections = await getPublicCollectionsSupabase();
      const found = supaCollections.find((c) => c.id === collectionId);
      if (found) return found;
    } catch {}
  }

  // 2. Fallback: Nếu người dùng đang mở bộ sưu tập của chính mình trên trình duyệt này
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

  const fetchCollections = async () => {
    if (isUnsubscribed) return;
    if (isSupabaseConfigured()) {
      try {
        const items = await getPublicCollectionsSupabase();
        if (!isUnsubscribed && items) {
          onUpdate(items);
        }
      } catch (err) {
        if (onError && err instanceof Error) onError(err);
      }
    }
  };

  fetchCollections();

  const handleUpdate = () => {
    if (!isUnsubscribed) fetchCollections();
  };

  if (typeof window !== "undefined") {
    window.addEventListener("collections-updated", handleUpdate);
    document.addEventListener("visibilitychange", handleUpdate);
  }

  const interval = setInterval(() => {
    if (!isUnsubscribed && typeof document !== "undefined" && !document.hidden) {
      fetchCollections();
    }
  }, 45000);

  return () => {
    isUnsubscribed = true;
    clearInterval(interval);
    if (typeof window !== "undefined") {
      window.removeEventListener("collections-updated", handleUpdate);
      document.removeEventListener("visibilitychange", handleUpdate);
    }
  };
}

/**
 * Xóa bộ sưu tập công khai (Dành cho Quản trị viên khi phát hiện nội dung spam/vi phạm)
 */
export async function deletePublicCollectionAdmin(collectionId: string): Promise<boolean> {
  if (!collectionId) return false;
  try {
    if (isSupabaseConfigured()) {
      await deleteCollectionSupabase(collectionId);
    }
    return true;
  } catch (err) {
    console.error("Lỗi xóa public_collection:", err);
    return false;
  }
}
