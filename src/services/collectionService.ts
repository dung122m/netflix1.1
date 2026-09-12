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

/**
 * Lấy danh sách bộ sưu tập của người dùng
 */
export async function getUserCollections(userId: string): Promise<MovieCollection[]> {
  if (!db || !userId) return [];

  try {
    const colRef = collection(db, "users", userId, "collections");
    const q = query(colRef, orderBy("updatedAt", "desc"));
    const snap = await getDocs(q);

    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as MovieCollection[];
  } catch (err) {
    console.warn("Lỗi lấy danh sách bộ sưu tập:", err);
    return [];
  }
}

/**
 * Lắng nghe thay đổi real-time danh sách bộ sưu tập
 */
export function subscribeUserCollections(
  userId: string,
  callback: (collections: MovieCollection[]) => void
): () => void {
  if (!db || !userId) {
    callback([]);
    return () => {};
  }

  const colRef = collection(db, "users", userId, "collections");
  const q = query(colRef, orderBy("updatedAt", "desc"));

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as MovieCollection[];
      callback(items);
    },
    (err) => {
      console.warn("Lỗi lắng nghe bộ sưu tập:", err);
      callback([]);
    }
  );
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
  isPublic: boolean = true
): Promise<MovieCollection | null> {
  if (!db || !userId) return null;

  try {
    const colRef = collection(db, "users", userId, "collections");
    const newDocRef = doc(colRef);
    const now = Date.now();

    const collectionData: MovieCollection = {
      id: newDocRef.id,
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

    await setDoc(newDocRef, collectionData);

    // Nếu công khai, ghi thêm vào public_collections/{id} để chia sẻ
    if (isPublic) {
      const publicRef = doc(db, "public_collections", newDocRef.id);
      await setDoc(publicRef, collectionData);
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
  if (!db || !userId || !collectionId) return false;

  try {
    const userDocRef = doc(db, "users", userId, "collections", collectionId);
    await deleteDoc(userDocRef);

    // Xóa khỏi public nếu có
    const publicDocRef = doc(db, "public_collections", collectionId);
    await deleteDoc(publicDocRef).catch(() => {});

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
  if (!db || !userId || !collectionId) return false;

  try {
    const userDocRef = doc(db, "users", userId, "collections", collectionId);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) return false;

    const data = snap.data() as MovieCollection;
    const currentMovies = Array.isArray(data.movies) ? data.movies : [];

    // Kiểm tra xem phim đã có trong bộ sưu tập chưa
    if (currentMovies.some((m) => m.slug === movie.slug)) {
      return true; // Đã có sẵn
    }

    const newItem: CollectionMovieItem = {
      ...movie,
      addedAt: Date.now(),
    };

    const updatedMovies = [newItem, ...currentMovies];
    const now = Date.now();

    await setDoc(
      userDocRef,
      {
        movies: updatedMovies,
        updatedAt: now,
      },
      { merge: true }
    );

    if (data.isPublic) {
      const publicDocRef = doc(db, "public_collections", collectionId);
      await setDoc(
        publicDocRef,
        {
          movies: updatedMovies,
          updatedAt: now,
        },
        { merge: true }
      ).catch(() => {});
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
  if (!db || !userId || !collectionId) return false;

  try {
    const userDocRef = doc(db, "users", userId, "collections", collectionId);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) return false;

    const data = snap.data() as MovieCollection;
    const currentMovies = Array.isArray(data.movies) ? data.movies : [];
    const updatedMovies = currentMovies.filter((m) => m.slug !== movieSlug);
    const now = Date.now();

    await setDoc(
      userDocRef,
      {
        movies: updatedMovies,
        updatedAt: now,
      },
      { merge: true }
    );

    if (data.isPublic) {
      const publicDocRef = doc(db, "public_collections", collectionId);
      await setDoc(
        publicDocRef,
        {
          movies: updatedMovies,
          updatedAt: now,
        },
        { merge: true }
      ).catch(() => {});
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
  if (!db || !userId || !collectionId) return false;

  try {
    const userDocRef = doc(db, "users", userId, "collections", collectionId);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) return false;

    const data = snap.data() as MovieCollection;
    const now = Date.now();

    await setDoc(
      userDocRef,
      {
        isPublic: makePublic,
        updatedAt: now,
      },
      { merge: true }
    );

    const publicDocRef = doc(db, "public_collections", collectionId);
    if (makePublic) {
      await setDoc(publicDocRef, {
        ...data,
        isPublic: true,
        updatedAt: now,
      });
    } else {
      await deleteDoc(publicDocRef).catch(() => {});
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
  collectionId: string
): Promise<MovieCollection | null> {
  if (!db || !collectionId) return null;

  try {
    const publicDocRef = doc(db, "public_collections", collectionId);
    const snap = await getDoc(publicDocRef);
    if (snap.exists()) {
      return {
        id: snap.id,
        ...snap.data(),
      } as MovieCollection;
    }
    return null;
  } catch (err) {
    console.warn("Lỗi đọc bộ sưu tập công khai:", err);
    return null;
  }
}
