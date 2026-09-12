import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MovieCollection, CollectionMovieItem } from "@/types/collection";

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
 * Lấy danh sách bộ sưu tập của người dùng (Ưu tiên LocalStorage kết hợp Cloud Firestore)
 */
export async function getUserCollections(userId: string): Promise<MovieCollection[]> {
  if (!userId) return [];
  const localList = getLocalCollections(userId);

  if (!db) return localList;

  try {
    const colRef = collection(db, "users", userId, "collections");
    const q = query(colRef, orderBy("updatedAt", "desc"));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const cloudItems = snap.docs.map((d) => {
        const data = d.data();
        return {
          ...data,
          id: d.id,
        } as MovieCollection;
      });

      // Lưu lại bản sao mới nhất vào LocalStorage
      saveLocalCollections(userId, cloudItems);
      return cloudItems;
    }
  } catch (err) {
    console.warn("Lỗi đọc Firestore collections (sử dụng bản lưu local):", err);
  }

  return localList;
}

/**
 * Lắng nghe thay đổi real-time danh sách bộ sưu tập (Hybrid: LocalStorage + Firestore)
 */
export function subscribeUserCollections(
  userId: string,
  callback: (collections: MovieCollection[]) => void
): () => void {
  if (!userId) {
    callback([]);
    return () => {};
  }

  // 1. Trả ngay dữ liệu local trước để không bị trễ giao diện
  const initialLocal = getLocalCollections(userId);
  callback(initialLocal);

  // 2. Lắng nghe cập nhật local từ cùng tab hoặc các tab khác
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

  // 3. Nếu có Firestore, lắng nghe onSnapshot
  let unsubFirestore = () => {};
  if (db) {
    try {
      const colRef = collection(db, "users", userId, "collections");
      const q = query(colRef, orderBy("updatedAt", "desc"));

      unsubFirestore = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const items = snapshot.docs.map((d) => {
              const data = d.data();
              return {
                ...data,
                id: d.id,
              } as MovieCollection;
            });
            saveLocalCollections(userId, items);
            callback(items);
          }
        },
        (err) => {
          console.warn("Lưu ý Firestore Rules (bộ sưu tập vẫn hoạt động bình thường qua Local cache):", err);
        }
      );
    } catch {
      // Bỏ qua lỗi Firestore
    }
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("collections-updated", handleLocalUpdate);
      window.removeEventListener("storage", handleStorageChange);
    }
    unsubFirestore();
  };
}

/**
 * Tạo bộ sưu tập mới (Lưu ngay vào LocalStorage và đồng bộ ngầm lên Firestore)
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
    let collectionId = `col_${now}_${Math.random().toString(36).slice(2, 8)}`;

    if (db) {
      try {
        const colRef = collection(db, "users", userId, "collections");
        collectionId = doc(colRef).id;
      } catch {
        // Fallback dùng id tạo tự động
      }
    }

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

    // 1. Luôn lưu vào LocalStorage trước để đảm bảo tính năng hoạt động 100%
    const currentLocal = getLocalCollections(userId);
    const updatedLocal = [collectionData, ...currentLocal.filter((c) => c.id !== collectionData.id)];
    saveLocalCollections(userId, updatedLocal);

    // 2. Thử lưu lên Firestore nếu có kết nối
    if (db) {
      try {
        const userDocRef = doc(db, "users", userId, "collections", collectionId);
        await setDoc(userDocRef, collectionData);

        if (isPublic) {
          const publicRef = doc(db, "public_collections", collectionId);
          await setDoc(publicRef, collectionData).catch(() => {});
        }
      } catch (cloudErr) {
        console.warn("Lưu ý Firestore Rules (dữ liệu đã được lưu an toàn tại máy của bạn):", cloudErr);
      }
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

    // 2. Thử xóa trên Firestore
    if (db) {
      try {
        const userDocRef = doc(db, "users", userId, "collections", collectionId);
        await deleteDoc(userDocRef).catch(() => {});

        const publicDocRef = doc(db, "public_collections", collectionId);
        await deleteDoc(publicDocRef).catch(() => {});
      } catch (err) {
        console.warn("Lỗi xóa Firestore collection:", err);
      }
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

    // 1. Cập nhật LocalStorage trước
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
    }

    // 2. Cập nhật Firestore nếu có
    if (db) {
      try {
        const userDocRef = doc(db, "users", userId, "collections", collectionId);
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          const data = snap.data() as MovieCollection;
          const currentCloudMovies = Array.isArray(data.movies) ? data.movies : [];
          if (!currentCloudMovies.some((m) => m.slug === movie.slug)) {
            const finalMovies = [newItem, ...currentCloudMovies];
            await setDoc(
              userDocRef,
              { movies: finalMovies, updatedAt: now },
              { merge: true }
            );

            if (data.isPublic) {
              const publicDocRef = doc(db, "public_collections", collectionId);
              await setDoc(
                publicDocRef,
                { movies: finalMovies, updatedAt: now },
                { merge: true }
              ).catch(() => {});
            }
          }
        }
      } catch (err) {
        console.warn("Lỗi thêm phim Firestore (đã lưu local):", err);
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

    // 1. Cập nhật LocalStorage
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
    }

    // 2. Cập nhật Firestore
    if (db) {
      try {
        const userDocRef = doc(db, "users", userId, "collections", collectionId);
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          const data = snap.data() as MovieCollection;
          const currentMovies = Array.isArray(data.movies) ? data.movies : [];
          const updated = currentMovies.filter((m) => m.slug !== movieSlug);
          await setDoc(userDocRef, { movies: updated, updatedAt: now }, { merge: true });

          if (data.isPublic) {
            const publicDocRef = doc(db, "public_collections", collectionId);
            await setDoc(publicDocRef, { movies: updated, updatedAt: now }, { merge: true }).catch(() => {});
          }
        }
      } catch (err) {
        console.warn("Lỗi xóa phim Firestore:", err);
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
    }

    // 2. Cập nhật Firestore
    if (db) {
      try {
        const userDocRef = doc(db, "users", userId, "collections", collectionId);
        await setDoc(userDocRef, { isPublic: makePublic, updatedAt: now }, { merge: true });

        const publicDocRef = doc(db, "public_collections", collectionId);
        if (makePublic && targetCol) {
          await setDoc(publicDocRef, { ...targetCol, isPublic: true, updatedAt: now }).catch(() => {});
        } else {
          await deleteDoc(publicDocRef).catch(() => {});
        }
      } catch (err) {
        console.warn("Lỗi đổi quyền riêng tư Firestore:", err);
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

  // 1. Thử đọc từ Firestore public_collections
  if (db) {
    try {
      const publicDocRef = doc(db, "public_collections", collectionId);
      const snap = await getDoc(publicDocRef);
      if (snap.exists()) {
        const data = snap.data();
        return {
          ...data,
          id: snap.id,
        } as MovieCollection;
      }
    } catch {
      // Firestore public permissions not configured yet
    }
  }

  // 2. Fallback: Nếu có userId truyền kèm trên URL (?u=...)
  if (db && userId) {
    try {
      const userColRef = doc(db, "users", userId, "collections", collectionId);
      const snap = await getDoc(userColRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.isPublic !== false) {
          return {
            ...data,
            id: snap.id,
          } as MovieCollection;
        }
      }
    } catch {
      // User collection not accessible without auth
    }
  }

  // 3. Fallback: Nếu người dùng đang mở bộ sưu tập của chính mình trên trình duyệt này
  if (typeof window !== "undefined") {
    // Tìm trong tất cả các key local collections
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LOCAL_COLLECTIONS_KEY_PREFIX)) {
        try {
          const items: MovieCollection[] = JSON.parse(localStorage.getItem(key) || "[]");
          const found = items.find((c) => c.id === collectionId);
          if (found && found.isPublic !== false) {
            return found;
          }
        } catch {
          // ignore
        }
      }
    }
  }

  return null;
}
