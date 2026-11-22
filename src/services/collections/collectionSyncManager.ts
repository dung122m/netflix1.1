import { sanitizeSafeText } from "@/lib/security";
import { MovieCollection, CollectionMovieItem } from "@/types/collection";

export const LOCAL_COLLECTIONS_KEY_PREFIX = "nanaflix_collections_";
export const TOMBSTONE_KEY_PREFIX = "nanaflix_col_tombstones_";
export const PENDING_SYNC_KEY_PREFIX = "nanaflix_col_pending_sync_";
export const TOMBSTONE_TTL_MS = 10 * 60 * 1000; // 10 phút
export const MAX_SYNC_ATTEMPTS = 5;

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
          const rawItemType = m.itemType && ["movie", "series", "episode"].includes(String(m.itemType))
            ? (String(m.itemType) as "movie" | "series" | "episode")
            : (slug.includes("__ep__") ? "episode" : undefined);
          const rawSeriesSlug = m.seriesSlug
            ? String(m.seriesSlug).trim()
            : (slug.includes("__ep__") ? slug.split("__ep__")[0] : undefined);
          const rawSeriesTitle = m.seriesTitle ? String(m.seriesTitle).trim() : undefined;
          const rawEpisodeSlug = m.episodeSlug
            ? String(m.episodeSlug).trim()
            : (slug.includes("__ep__") ? slug.split("__ep__")[1] : undefined);
          const rawEpisodeName = m.episodeName ? String(m.episodeName).trim() : undefined;
          const rawSeasonName = m.seasonName ? String(m.seasonName).trim() : undefined;

          movies.push({
            slug,
            title,
            poster: String(m.poster || m.poster_url || m.thumb_url || "/default-poster.jpg"),
            year: m.year !== undefined ? String(m.year) : undefined,
            quality: m.quality ? String(m.quality) : undefined,
            category: m.category ? String(m.category) : undefined,
            addedAt: Number(m.addedAt || m.added_at) || Date.now(),
            itemType: rawItemType,
            seriesSlug: rawSeriesSlug,
            seriesTitle: rawSeriesTitle,
            episodeSlug: rawEpisodeSlug,
            episodeName: rawEpisodeName,
            seasonName: rawSeasonName,
          });
        }
      }
    }
  }

  const now = Date.now();
  const createdAt = Number(d.createdAt ?? d.created_at) || now;
  const updatedAt = Number(d.updatedAt ?? d.updated_at) || createdAt;

  const coverUrl = d.coverUrl ? String(d.coverUrl) : (d.cover_url ? String(d.cover_url) : undefined);
  const colorGradient = d.colorGradient ? String(d.colorGradient) : (d.color_gradient ? String(d.color_gradient) : undefined);

  return {
    id,
    userId,
    creatorName: creatorName || "Thành viên Nanaflix",
    creatorPhoto,
    name,
    description,
    isPublic,
    coverUrl,
    colorGradient,
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
      if (!userId || l.userId === userId || !l.userId) {
        collectionMap.set(l.id, l);
      }
    } else {
      if (l.updatedAt > existingServer.updatedAt) {
        collectionMap.set(l.id, l);
      } else {
        collectionMap.set(l.id, existingServer);
      }
    }
  }

  return Array.from(collectionMap.values()).sort(
    (a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0)
  );
}

export interface SanitizedMovieItem {
  slug: string;
  title: string;
  poster: string;
  year?: string;
  quality?: string;
  category?: string;
  addedAt: number;
  itemType?: "movie" | "series" | "episode";
  seriesSlug?: string;
  seriesTitle?: string;
  episodeSlug?: string;
  episodeName?: string;
  seasonName?: string;
}

/**
 * Chuẩn hóa và loại bỏ phim trùng slug ở cấp độ Server / Service
 */
export function sanitizeAndDeduplicateMovies(rawMovies: unknown): SanitizedMovieItem[] {
  if (!Array.isArray(rawMovies)) return [];

  const seenSlugs = new Set<string>();
  const sanitized: SanitizedMovieItem[] = [];

  for (const item of rawMovies) {
    if (!item || typeof item !== "object") continue;
    const m = item as Record<string, unknown>;

    const slug = String(m.slug || "").trim();
    const title = String(m.title || "").trim();
    if (!slug || !title) continue;

    const normalizedKey = slug.toLowerCase();
    if (seenSlugs.has(normalizedKey)) {
      continue;
    }
    seenSlugs.add(normalizedKey);

    const poster = String(m.poster || m.posterUrl || m.poster_url || m.thumb_url || "/default-poster.jpg").trim();
    const year = m.year !== undefined && m.year !== null ? String(m.year).trim() : undefined;
    const quality = m.quality ? String(m.quality).trim() : undefined;
    const category = m.category ? String(m.category).trim() : undefined;
    const addedAt = Number(m.addedAt ?? m.added_at) || Date.now();

    const itemType = m.itemType && ["movie", "series", "episode"].includes(String(m.itemType))
      ? (String(m.itemType) as "movie" | "series" | "episode")
      : (slug.includes("__ep__") ? "episode" : undefined);
    const seriesSlug = m.seriesSlug
      ? String(m.seriesSlug).trim()
      : (slug.includes("__ep__") ? slug.split("__ep__")[0] : undefined);
    const seriesTitle = m.seriesTitle ? sanitizeSafeText(String(m.seriesTitle), 200) : undefined;
    const episodeSlug = m.episodeSlug
      ? String(m.episodeSlug).trim()
      : (slug.includes("__ep__") ? slug.split("__ep__")[1] : undefined);
    const episodeName = m.episodeName ? sanitizeSafeText(String(m.episodeName), 100) : undefined;
    const seasonName = m.seasonName ? sanitizeSafeText(String(m.seasonName), 100) : undefined;

    sanitized.push({
      slug,
      title: sanitizeSafeText(title, 200),
      poster,
      year: year || undefined,
      quality: quality || undefined,
      category: category || undefined,
      addedAt,
      itemType,
      seriesSlug,
      seriesTitle,
      episodeSlug,
      episodeName,
      seasonName,
    });
  }

  return sanitized;
}
