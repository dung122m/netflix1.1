/**
 * Quản lý danh sách Nghệ sĩ / Diễn viên yêu thích (Favorite Actors Store)
 * - Lưu trữ cục bộ localStorage 0ms phản hồi tức thì
 * - Bộ nhớ đệm In-Memory tránh parse JSON nhiều lần
 * - Custom Event "favorite-actors-updated" đồng bộ real-time giữa các tab & components
 */

export interface FavoriteActorItem {
  id: string | number;
  name: string;
  slug: string;
  avatarUrl?: string | null;
  country?: string;
  roles?: string;
  totalMovies?: number;
  addedAt: number;
}

const STORAGE_KEY = "nanaflix_favorite_actors_v1";

let memoryFavoriteActors: FavoriteActorItem[] | null = null;
let memoryActorKeys: Set<string> | null = null;

function normalizeKey(idOrSlug: string | number): string {
  return String(idOrSlug).trim().toLowerCase();
}

function updateMemoryCache(list: FavoriteActorItem[]): void {
  memoryFavoriteActors = list;
  const keys = new Set<string>();
  for (const item of list) {
    if (item.id) keys.add(normalizeKey(item.id));
    if (item.slug) keys.add(normalizeKey(item.slug));
  }
  memoryActorKeys = keys;
}

export function invalidateFavoriteActorsCache(): void {
  memoryFavoriteActors = null;
  memoryActorKeys = null;
}

export function getFavoriteActors(): FavoriteActorItem[] {
  if (typeof window === "undefined") return [];

  if (memoryFavoriteActors !== null) {
    return memoryFavoriteActors;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      updateMemoryCache([]);
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const valid = parsed.filter(
        (item): item is FavoriteActorItem =>
          Boolean(item && (item.id || item.slug) && item.name)
      );
      updateMemoryCache(valid);
      return valid;
    }
  } catch (err) {
    console.error("[FavoriteActors] Error parsing localStorage:", err);
  }

  updateMemoryCache([]);
  return [];
}

export function isFavoriteActor(idOrSlug?: string | number | null): boolean {
  if (!idOrSlug) return false;
  const key = normalizeKey(idOrSlug);

  if (memoryActorKeys === null) {
    getFavoriteActors();
  }

  return memoryActorKeys?.has(key) ?? false;
}

function saveFavoriteActors(list: FavoriteActorItem[], notifyDetail?: { actor?: FavoriteActorItem; action: "add" | "remove" | "clear" }): void {
  updateMemoryCache(list);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (err) {
      console.error("[FavoriteActors] Error writing to localStorage:", err);
    }
    window.dispatchEvent(
      new CustomEvent("favorite-actors-updated", {
        detail: notifyDetail,
      })
    );
  }
}

export function addFavoriteActor(actor: Omit<FavoriteActorItem, "addedAt">): void {
  const current = getFavoriteActors();
  const key = normalizeKey(actor.id || actor.slug);

  if (isFavoriteActor(key)) {
    return;
  }

  const newItem: FavoriteActorItem = {
    ...actor,
    addedAt: Date.now(),
  };

  const updated = [newItem, ...current];
  saveFavoriteActors(updated, { actor: newItem, action: "add" });
}

export function removeFavoriteActor(idOrSlug: string | number): void {
  const current = getFavoriteActors();
  const targetKey = normalizeKey(idOrSlug);

  const removedItem = current.find(
    (item) => normalizeKey(item.id) === targetKey || normalizeKey(item.slug) === targetKey
  );

  const updated = current.filter(
    (item) => normalizeKey(item.id) !== targetKey && normalizeKey(item.slug) !== targetKey
  );

  saveFavoriteActors(updated, { actor: removedItem, action: "remove" });
}

export function toggleFavoriteActor(actor: Omit<FavoriteActorItem, "addedAt">): boolean {
  const idKey = actor.id ? normalizeKey(actor.id) : "";
  const slugKey = actor.slug ? normalizeKey(actor.slug) : "";

  const currentlyIn = (idKey && isFavoriteActor(idKey)) || (slugKey && isFavoriteActor(slugKey));

  if (currentlyIn) {
    removeFavoriteActor(actor.id || actor.slug);
    return false;
  } else {
    addFavoriteActor(actor);
    return true;
  }
}

export function clearFavoriteActors(): void {
  saveFavoriteActors([], { action: "clear" });
}

export function subscribeToFavoriteActors(
  callback: (actors: FavoriteActorItem[]) => void
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = () => {
    callback(getFavoriteActors());
  };

  window.addEventListener("favorite-actors-updated", handler);
  return () => {
    window.removeEventListener("favorite-actors-updated", handler);
  };
}
