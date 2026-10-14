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
const TOMBSTONE_KEY_PREFIX = "nanaflix_col_tombstones_";
const PENDING_SYNC_KEY_PREFIX = "nanaflix_col_pending_sync_";
const TOMBSTONE_TTL_MS = 10 * 60 * 1000; // 10 phút
const MAX_SYNC_ATTEMPTS = 5;

/**
 * Chuẩn hóa đối tượng bộ sưu tập từ bất kỳ nguồn nào (Database snake_case hoặc Frontend camelCase)
 */
export function normalizeCollection(raw: unknown): MovieCollection | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;

  const id = String(d.id || "").trim();
  if (!id) return null;

  const userId = String(d.userId || d.user_id || "").trim();
  const creatorName = String(d.creatorName || d.user_name || "Thành viên Nanaflix").trim();
  const creatorPhoto = d.creatorPhoto
    ? String(d.creatorPhoto)
    : (d.user_avatar ? String(d.user_avatar) : undefined);
  const name = String(d.name || "").trim();
  if (!name) return null;

  const description = d.description ? String(d.description).trim() : "";
  const isPublic = Boolean(d.isPublic ?? d.is_public ?? true);

  const movies: CollectionMovieItem[] = [];
  if (Array.isArray(d.movies)) {
    for (const item of d.movies) {
      if (item && typeof item === "object") {
        const m = item as Record<string, unknown>;
        const slug = String(m.slug || "").trim();
        const title = String(m.title || "").trim();
        if (slug && title) {
          movies.push({
            slug,
            title,
            poster: String(m.poster || m.poster_url || m.thumb_url || "/default-poster.jpg"),
            year: m.year !== undefined ? String(m.year) : undefined,
            quality: m.quality ? String(m.quality) : undefined,
            category: m.category ? String(m.category) : undefined,
            addedAt: Number(m.addedAt || m.added_at) || Date.now(),
          });
        }
      }
    }
  }

  const now = Date.now();
  const createdAt = Number(d.createdAt ?? d.created_at) || now;
  const updatedAt = Number(d.updatedAt ?? d.updated_at) || createdAt;

  return {
    id,
    userId,
    creatorName: creatorName || "Thành viên Nanaflix",
    creatorPhoto,
    name,
    description,
    isPublic,
    movies,
    createdAt,
    updatedAt,
  };
}

export interface PendingSyncItem {
  collectionId: string;
  attempts: number;
  lastAttempt: number;
}

export function getPendingSync(userId: string): Record<string, PendingSyncItem> {
  if (typeof window === "undefined" || !userId) return {};
  try {
    const raw = localStorage.getItem(`${PENDING_SYNC_KEY_PREFIX}${userId}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, PendingSyncItem>;
  } catch {
    return {};
  }
}

export function addPendingSync(userId: string, collectionId: string): void {
  if (typeof window === "undefined" || !userId || !collectionId) return;
  try {
    const current = getPendingSync(userId);
    const existing = current[collectionId];
    current[collectionId] = {
      collectionId,
      attempts: existing ? existing.attempts : 0,
      lastAttempt: Date.now(),
    };
    localStorage.setItem(`${PENDING_SYNC_KEY_PREFIX}${userId}`, JSON.stringify(current));
  } catch {}
}

export function removePendingSync(userId: string, collectionId: string): void {
  if (typeof window === "undefined" || !userId || !collectionId) return;
  try {
    const current = getPendingSync(userId);
    if (current[collectionId]) {
      delete current[collectionId];
      localStorage.setItem(`${PENDING_SYNC_KEY_PREFIX}${userId}`, JSON.stringify(current));
    }
  } catch {}
}

export function clearPendingSync(userId: string): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.removeItem(`${PENDING_SYNC_KEY_PREFIX}${userId}`);
  } catch {}
}

export function getTombstones(userId: string): Record<string, number> {
  if (typeof window === "undefined" || !userId) return {};
  try {
    const raw = localStorage.getItem(`${TOMBSTONE_KEY_PREFIX}${userId}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const now = Date.now();
    const valid: Record<string, number> = {};
    for (const [id, ts] of Object.entries(parsed)) {
      if (typeof ts === "number" && now - ts < TOMBSTONE_TTL_MS) {
        valid[id] = ts;
      }
    }
    return valid;
  } catch {
    return {};
  }
}

export function addTombstone(userId: string, collectionId: string): void {
  if (typeof window === "undefined" || !userId || !collectionId) return;
  try {
    const current = getTombstones(userId);
    current[collectionId] = Date.now();
    localStorage.setItem(`${TOMBSTONE_KEY_PREFIX}${userId}`, JSON.stringify(current));
  } catch {}
}

export function clearTombstone(userId: string, collectionId: string): void {
  if (typeof window === "undefined" || !userId || !collectionId) return;
  try {
    const current = getTombstones(userId);
    if (current[collectionId]) {
      delete current[collectionId];
      localStorage.setItem(`${TOMBSTONE_KEY_PREFIX}${userId}`, JSON.stringify(current));
    }
  } catch {}
}

/**
 * Thuật toán Smart Merge: Hợp nhất danh sách giữa LocalStorage và Server
 * - Ưu tiên bản ghi có `updatedAt` lớn hơn khi cả hai nguồn đều có ID
 * - Giữ các bản ghi cục bộ mới tạo mà server chưa kịp có
 * - Tôn trọng tombstone để tránh hồi sinh bản ghi đã bị xóa
 */
export function mergeCollections(
  localList: MovieCollection[],
  serverList: MovieCollection[],
  userId: string,
  tombstones: Record<string, number> = {}
): MovieCollection[] {
  const collectionMap = new Map<string, MovieCollection>();

  // 1. Nạp server list trước (đã lọc tombstone)
  for (const rawServer of serverList) {
    const s = normalizeCollection(rawServer);
    if (!s) continue;
    if (tombstones[s.id]) continue;
    collectionMap.set(s.id, s);
  }

  // 2. Xét local list
  for (const rawLocal of localList) {
    const l = normalizeCollection(rawLocal);
    if (!l) continue;
    if (tombstones[l.id]) continue;

    const existingServer = collectionMap.get(l.id);
    if (!existingServer) {
      // Local có nhưng server chưa có: giữ lại nếu thuộc về user này
      if (!userId || l.userId === userId || !l.userId) {
        collectionMap.set(l.id, l);
      }
    } else {
      // Cả 2 đều có: so sánh updatedAt
      if (l.updatedAt > existingServer.updatedAt) {
        collectionMap.set(l.id, l);
      } else {
        collectionMap.set(l.id, existingServer);
      }
    }
  }

  // Sắp xếp theo updatedAt giảm dần (mới nhất lên đầu)
  return Array.from(collectionMap.values()).sort(
    (a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0)
  );
}

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
 * Trả về true nếu server xác nhận thành công (status 200..299)
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
 * Tiến trình đồng bộ lại các bản ghi đang chờ (Pending Sync) lên Server:
 * - Chống chạy đồng thời nhiều worker cho cùng 1 user (activeSyncPromises Lock)
 * - Kiểm tra danh tính user trước khi gửi (không sync lẫn lộn tài khoản khi chuyển user/logout)
 * - Tôn trọng Tombstone (không sync dữ liệu đã bị xóa)
 * - Exponential backoff và giới hạn số lần thử (tối đa MAX_SYNC_ATTEMPTS)
 * - Chỉ xóa khỏi hàng đợi khi Server xác nhận HTTP 200/201 hợp lệ
 */
export async function processPendingSync(userId: string): Promise<void> {
  if (typeof window === "undefined" || !userId) return;

  // Bảo vệ cô lập dữ liệu theo tài khoản: Nếu user hiện tại không khớp userId, dừng ngay
  const currentUid = auth?.currentUser?.uid;
  if (currentUid && currentUid !== userId) {
    return;
  }

  // Khóa lock chống chạy đồng thời
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
        // Kiểm tra an toàn trước mỗi item
        const activeUid = auth?.currentUser?.uid;
        if (activeUid && activeUid !== userId) {
          break;
        }

        // 1. Tôn trọng Tombstone
        if (tombstones[colId]) {
          removePendingSync(userId, colId);
          continue;
        }

        // 2. Kiểm tra bản ghi trong LocalStorage
        const col = localCols.find((c) => c.id === colId);
        if (!col) {
          removePendingSync(userId, colId);
          continue;
        }

        const item = pendingMap[colId];
        if (!item) continue;

        // 3. Giới hạn retry
        if (item.attempts >= MAX_SYNC_ATTEMPTS) {
          removePendingSync(userId, colId);
          continue;
        }

        // 4. Exponential backoff (1s, 2s, 4s, 8s, 16s, max 30s)
        const backoffMs = Math.min(1000 * Math.pow(2, item.attempts), 30000);
        if (item.attempts > 0 && now - item.lastAttempt < backoffMs) {
          continue;
        }

        // 5. Thử đồng bộ lên server
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

// Tự động kích hoạt khi mạng phục hồi
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
    return res.ok;
  } catch (err) {
    console.warn("Lỗi xóa collection qua API:", err);
    return false;
  }
}

/**
 * Lấy danh sách bộ sưu tập của người dùng (Server API + Supabase PostgreSQL + LocalStorage Cache)
 * Áp dụng Smart Merge, không bao giờ để response rỗng hoặc lỗi tạm thời xóa trắng LocalStorage
 */
export async function getUserCollections(userId: string): Promise<MovieCollection[]> {
  if (!userId) return [];
  const localList = getLocalCollections(userId);
  const tombstones = getTombstones(userId);

  let serverItems: MovieCollection[] | null = null;

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
        }
      }
    }
  } catch (err) {
    console.warn("Lỗi fetch /api/user/collections:", err);
  }

  // Supabase fallback nếu API không phản hồi
  if (serverItems === null && isSupabaseConfigured()) {
    try {
      const supaItems = await getUserCollectionsSupabase(userId);
      if (Array.isArray(supaItems)) {
        serverItems = supaItems
          .map(normalizeCollection)
          .filter((c: MovieCollection | null): c is MovieCollection => c !== null);
      }
    } catch (err) {
      console.warn("Lỗi fetch Supabase collections fallback:", err);
    }
  }

  // Nếu lấy được dữ liệu từ Server/Supabase: Áp dụng Smart Merge
  if (serverItems !== null) {
    const merged = mergeCollections(localList, serverItems, userId, tombstones);
    saveLocalCollections(userId, merged);
    if (typeof window !== "undefined") {
      processPendingSync(userId).catch(() => {});
    }
    return merged;
  }

  // Trường hợp mạng lỗi, timeout hoặc chưa xác thực: Giữ nguyên dữ liệu LocalStorage an toàn
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

  // 1. Trả ngay dữ liệu local trước để không bị trễ giao diện (0ms)
  const initialLocal = getLocalCollections(userId);
  callback(initialLocal);

  // 2. Fetch mới nhất từ Server API / Supabase và Smart Merge
  getUserCollections(userId)
    .then((items) => {
      callback(items);
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

    // Đảm bảo id mới không bị vướng tombstone
    clearTombstone(userId, collectionId);

    // 1. Luôn lưu vào LocalStorage trước để đảm bảo tính năng phản hồi 0ms
    const currentLocal = getLocalCollections(userId);
    const updatedLocal = [collectionData, ...currentLocal.filter((c) => c.id !== collectionData.id)];
    saveLocalCollections(userId, updatedLocal);

    // 2. Đưa vào pending queue và đồng bộ qua Server API
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

  try {
    // 1. Đánh dấu tombstone để tránh server response cũ làm hồi sinh
    addTombstone(userId, collectionId);

    // 2. Hủy các yêu cầu pending sync của collection này
    removePendingSync(userId, collectionId);

    // 3. Xóa khỏi LocalStorage
    const currentLocal = getLocalCollections(userId);
    const updatedLocal = currentLocal.filter((c) => c.id !== collectionId);
    saveLocalCollections(userId, updatedLocal);

    // 4. Xóa qua Server API
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

      // 2. Đưa vào pending queue và đồng bộ qua Server API
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

      // 2. Đưa vào pending queue và đồng bộ qua Server API
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

      // 2. Đưa vào pending queue và đồng bộ qua Server API
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
  }, 45000);

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
