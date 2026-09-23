import { MovieCollection, CollectionMovieItem } from "@/types/collection";
import {
  getUserCollectionsSupabase,
  getPublicCollectionsSupabase,
} from "./supabaseService";
import { isSupabaseConfigured } from "@/lib/supabase";
import { auth } from "@/lib/firebase";
import { movieApi } from "./movieApi";
import { normalizeMovie } from "@/lib/movieMedia";

const LOCAL_COLLECTIONS_KEY_PREFIX = "nanaflix_collections_";

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
 * Lưu bộ sưu tập qua Server API
 */
async function syncCollectionToServer(collection: MovieCollection): Promise<void> {
  try {
    const headers = await getAuthHeaders();
    if (!headers["Authorization" as keyof typeof headers]) return;

    await fetch("/api/user/collections", {
      method: "POST",
      headers,
      body: JSON.stringify(collection),
    });
  } catch (err) {
    console.warn("Lỗi lưu collection qua API:", err);
  }
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
    return res.ok;
  } catch (err) {
    console.warn("Lỗi xóa collection qua API:", err);
    return false;
  }
}

/**
 * Lấy danh sách bộ sưu tập của người dùng (Server API + Supabase PostgreSQL + LocalStorage Cache)
 */
export async function getUserCollections(userId: string): Promise<MovieCollection[]> {
  if (!userId) return [];
  const localList = getLocalCollections(userId);

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
          saveLocalCollections(userId, data.items);
          return data.items;
        }
      }
    }
  } catch {}

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

  // 2. Fetch mới nhất từ Server API / Supabase
  getUserCollections(userId)
    .then((items) => {
      if (items.length > 0) {
        saveLocalCollections(userId, items);
        callback(items);
      }
    })
    .catch(() => {});

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
 * Tạo bộ sưu tập mới (Lưu ngay vào LocalStorage và đồng bộ qua Server API)
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

    // 2. Lưu qua Server API
    syncCollectionToServer(collectionData).catch((err) => {
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

  try {
    // 1. Xóa khỏi LocalStorage
    const currentLocal = getLocalCollections(userId);
    const updatedLocal = currentLocal.filter((c) => c.id !== collectionId);
    saveLocalCollections(userId, updatedLocal);

    // 2. Xóa qua Server API
    deleteCollectionFromServer(collectionId).catch(() => {});

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

      // 2. Cập nhật Server API
      syncCollectionToServer(targetCol).catch(() => {});
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

      // 2. Cập nhật Server API
      syncCollectionToServer(updatedCol).catch(() => {});
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

      // 2. Cập nhật Server API
      syncCollectionToServer(updatedCol).catch(() => {});
    }

    return true;
  } catch (err) {
    console.warn("Lỗi thay đổi trạng thái công khai bộ sưu tập:", err);
    return false;
  }
}

export interface SmartCollectionConfig {
  id: string;
  name: string;
  description: string;
  emoji: string;
  badge: string;
  query: {
    category?: string;
    country?: string;
    type?: string;
    sort?: "views" | "rating" | "latest";
    limit?: number;
    page?: number;
  };
}

export const SMART_COLLECTIONS: SmartCollectionConfig[] = [
  {
    id: "weekend-picks",
    name: "🔥 Xem Cuối Tuần",
    description: "Tuyển chọn các siêu phẩm giải trí và bom tấn điện ảnh hấp dẫn nhất cho những ngày nghỉ trọn vẹn.",
    emoji: "🔥",
    badge: "Cuối Tuần",
    query: { sort: "views", limit: 24, page: 1 },
  },
  {
    id: "martial-arts-legends",
    name: "🥋 Võ Thuật & Hành Động",
    description: "Những pha hành động nghẹt thở, kungfu kinh điển và các màn đọ sức đỉnh cao của điện ảnh châu Á và thế giới.",
    emoji: "🥋",
    badge: "Hành Động",
    query: { category: "vo-thuat", sort: "views", limit: 24, page: 1 },
  },
  {
    id: "deep-drama",
    name: "🎭 Tâm Lý Đáng Xem",
    description: "Những tác phẩm chính kịch sâu sắc, chạm đến tầng sâu cảm xúc và suy ngẫm của người xem.",
    emoji: "🎭",
    badge: "Tâm Lý",
    query: { category: "tam-ly", sort: "rating", limit: 24, page: 1 },
  },
  {
    id: "k-drama-wave",
    name: "🇰🇷 Làn Sóng K-Drama",
    description: "Những bộ phim truyền hình Hàn Quốc đình đám với dàn diễn viên xuất sắc và kịch bản cuốn hút.",
    emoji: "🇰🇷",
    badge: "K-Drama",
    query: { country: "han-quoc", type: "phim-bo", sort: "views", limit: 24, page: 1 },
  },
  {
    id: "most-watched",
    name: "⭐ Phim Được Xem Nhiều Nhất",
    description: "Bảng xếp hạng những bộ phim được cộng đồng người xem Nanaflix đón nhận và theo dõi nhiều nhất.",
    emoji: "⭐",
    badge: "Top Views",
    query: { sort: "views", limit: 24, page: 1 },
  },
  {
    id: "cinema-blockbusters",
    name: "🎬 Phim Điện Ảnh Nổi Bật",
    description: "Tuyển tập những siêu phẩm chiếu rạp chất lượng cao với kỹ xảo và âm thanh đỉnh cao.",
    emoji: "🎬",
    badge: "Chiếu Rạp",
    query: { type: "phim-le", sort: "rating", limit: 24, page: 1 },
  },
  {
    id: "sci-fi-mysteries",
    name: "🔮 Khoa Học & Viễn Tưởng",
    description: "Khám phá những chiều không gian bí ẩn, tương lai công nghệ và những giả thuyết khoa học kỳ vĩ.",
    emoji: "🔮",
    badge: "Viễn Tưởng",
    query: { category: "vien-tuong", sort: "views", limit: 24, page: 1 },
  },
  {
    id: "anime-hits",
    name: "🌸 Anime & Hoạt Hình Hot",
    description: "Thế giới anime Nhật Bản và phim hoạt hình đặc sắc với hình ảnh tuyệt mỹ và cốt truyện lay động.",
    emoji: "🌸",
    badge: "Anime",
    query: { type: "hoat-hinh", sort: "views", limit: 24, page: 1 },
  },
];

/**
 * Lấy danh sách tóm tắt tất cả các Tuyển tập thông minh (Smart Collections)
 */
export function getSmartCollectionsList(): SmartCollectionConfig[] {
  return SMART_COLLECTIONS;
}

/**
 * Lấy bộ sưu tập công khai theo ID để bất kỳ ai có link đều xem được (Bao gồm Smart Collections)
 */
export async function getPublicCollection(
  collectionId: string,
  userId?: string | null
): Promise<MovieCollection | null> {
  if (!collectionId) return null;

  // 1. Kiểm tra nếu là Tuyển tập thông minh (Smart Collection) được định nghĩa sẵn
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

  // 2. Thử đọc từ Supabase public collections
  if (isSupabaseConfigured()) {
    try {
      const supaCollections = await getPublicCollectionsSupabase();
      const found = supaCollections.find((c) => c.id === collectionId);
      if (found) return found;
    } catch {}
  }

  // 3. Fallback: Nếu người dùng đang mở bộ sưu tập của chính mình trên trình duyệt này
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
    return await deleteCollectionFromServer(collectionId);
  } catch (err) {
    console.error("Lỗi xóa public_collection:", err);
    return false;
  }
}
