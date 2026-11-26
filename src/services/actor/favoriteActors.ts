/**
 * Quản lý danh sách Nghệ sĩ / Diễn viên yêu thích (Favorite Actors Store)
 * - Lưu trữ cục bộ localStorage 0ms phản hồi tức thì
 * - Bộ nhớ đệm In-Memory tránh parse JSON nhiều lần
 * - Custom Event "favorite-actors-updated" đồng bộ real-time giữa các tab & components
 */

import { auth } from "@/lib/firebase";

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

export type FavoriteActorsSyncHandler = {
  saveItem: (uid: string, item: FavoriteActorItem) => Promise<boolean> | boolean | void;
  removeItem: (uid: string, idOrSlug: string) => Promise<boolean> | boolean | void;
  clearAll: (uid: string) => Promise<boolean> | boolean | void;
};

let favoriteActorsSyncHandler: FavoriteActorsSyncHandler | null = null;
let customAuthUserProvider: (() => { uid: string } | null) | null = null;

export function registerFavoriteActorsSyncHandler(handler: FavoriteActorsSyncHandler | null): void {
  favoriteActorsSyncHandler = handler;
}

export function setFavoriteActorsAuthUserProviderForTest(
  provider: (() => { uid: string } | null) | null,
): void {
  customAuthUserProvider = provider;
}

function getCurrentAuthUser(): { uid: string } | null {
  if (customAuthUserProvider) return customAuthUserProvider();
  return auth?.currentUser || null;
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

function findMatchingActor(list: FavoriteActorItem[], targetKey: string): FavoriteActorItem | undefined {
  return list.find(
    (item) => normalizeKey(item.id) === targetKey || normalizeKey(item.slug) === targetKey
  );
}

/**
 * Merges local and cloud favorite actors, preserving newly added unconfirmed local items.
 */
export function mergeFavoriteActors(
  localList: FavoriteActorItem[],
  cloudList: FavoriteActorItem[],
  unconfirmedThresholdMs: number = 2 * 60 * 1000,
): FavoriteActorItem[] {
  const merged = new Map<string, FavoriteActorItem>();
  const now = Date.now();

  for (const item of cloudList) {
    if (item && (item.id || item.slug) && item.name) {
      merged.set(normalizeKey(item.id || item.slug), item);
    }
  }

  for (const localItem of localList) {
    if (!localItem || (!localItem.id && !localItem.slug) || !localItem.name) continue;
    const idKey = normalizeKey(localItem.id || localItem.slug);
    const slugKey = normalizeKey(localItem.slug || localItem.id);

    const matchedEntry = Array.from(merged.entries()).find(
      ([k, v]) => k === idKey || normalizeKey(v.slug) === slugKey || normalizeKey(v.id) === idKey
    );

    if (!matchedEntry) {
      if (now - (localItem.addedAt || 0) < unconfirmedThresholdMs) {
        merged.set(idKey, localItem);
      }
    } else if ((localItem.addedAt || 0) > (matchedEntry[1].addedAt || 0)) {
      merged.set(matchedEntry[0], localItem);
    }
  }

  return Array.from(merged.values()).sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
}

export function setFavoriteActorsFromSync(list: FavoriteActorItem[]): void {
  saveFavoriteActors(list, { action: "clear" });
}

export function clearLocalFavoriteActorsOnly(): void {
  if (typeof window === "undefined") return;
  try {
    updateMemoryCache([]);
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(
      new CustomEvent("favorite-actors-updated", { detail: { action: "clear" } })
    );
  } catch (err) {
    console.error("[FavoriteActors] Error clearing localStorage:", err);
  }
}

let mutationSeq = 0;
const inFlightActorMutations = new Map<string, number>();

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

  const currentUser = getCurrentAuthUser();
  if (currentUser && favoriteActorsSyncHandler) {
    const seq = ++mutationSeq;
    inFlightActorMutations.set(key, seq);
    Promise.resolve(favoriteActorsSyncHandler.saveItem(currentUser.uid, newItem))
      .then((ok) => {
        if (inFlightActorMutations.get(key) === seq) {
          inFlightActorMutations.delete(key);
          if (ok === false) {
            const rolledBack = getFavoriteActors().filter(
              (item) => normalizeKey(item.id) !== key && normalizeKey(item.slug) !== key
            );
            saveFavoriteActors(rolledBack, { actor: newItem, action: "remove" });
          }
        }
      })
      .catch(() => {
        if (inFlightActorMutations.get(key) === seq) {
          inFlightActorMutations.delete(key);
        }
      });
  }
}

export function removeFavoriteActor(idOrSlug: string | number): void {
  const current = getFavoriteActors();
  const targetKey = normalizeKey(idOrSlug);

  const removedItem = findMatchingActor(current, targetKey);
  if (!removedItem) return;

  const updated = current.filter(
    (item) => normalizeKey(item.id) !== targetKey && normalizeKey(item.slug) !== targetKey
  );

  saveFavoriteActors(updated, { actor: removedItem, action: "remove" });

  const currentUser = getCurrentAuthUser();
  if (currentUser && favoriteActorsSyncHandler) {
    const mutationKey = normalizeKey(removedItem.id || removedItem.slug);
    const seq = ++mutationSeq;
    inFlightActorMutations.set(mutationKey, seq);
    Promise.resolve(favoriteActorsSyncHandler.removeItem(currentUser.uid, String(idOrSlug)))
      .then((ok) => {
        if (inFlightActorMutations.get(mutationKey) === seq) {
          inFlightActorMutations.delete(mutationKey);
          if (ok === false) {
            const nowList = getFavoriteActors();
            if (!findMatchingActor(nowList, targetKey)) {
              saveFavoriteActors([removedItem, ...nowList], { actor: removedItem, action: "add" });
            }
          }
        }
      })
      .catch(() => {
        if (inFlightActorMutations.get(mutationKey) === seq) {
          inFlightActorMutations.delete(mutationKey);
        }
      });
  }
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
  const currentUser = getCurrentAuthUser();
  if (currentUser && favoriteActorsSyncHandler) {
    Promise.resolve(favoriteActorsSyncHandler.clearAll(currentUser.uid)).catch(() => {});
  }
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
