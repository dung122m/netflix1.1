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
const OWNER_META_KEY = "nanaflix_favorite_actors_owner_v1";
const CACHED_AUTH_USER_KEY = "nanaflix_cached_auth_user";

interface FavoriteActorsOwnerMeta {
  uid: string;
  pendingKeys: string[];
}

function getCachedAuthUid(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHED_AUTH_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { uid?: unknown };
    return typeof parsed?.uid === "string" && parsed.uid ? parsed.uid : null;
  } catch {
    return null;
  }
}

function readOwnerMeta(): FavoriteActorsOwnerMeta | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(OWNER_META_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FavoriteActorsOwnerMeta>;
    if (typeof parsed?.uid === "string" && Array.isArray(parsed.pendingKeys)) {
      return {
        uid: parsed.uid,
        pendingKeys: parsed.pendingKeys.filter((k): k is string => typeof k === "string" && k.length > 0),
      };
    }
  } catch {}
  return null;
}

function writeOwnerMeta(meta: FavoriteActorsOwnerMeta | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!meta) {
      localStorage.removeItem(OWNER_META_KEY);
    } else {
      localStorage.setItem(OWNER_META_KEY, JSON.stringify(meta));
    }
  } catch {}
}

function markActorPendingForSession(key: string, explicitUid?: string | null): void {
  const uid = explicitUid || getCurrentAuthUser()?.uid || getCachedAuthUid() || "guest";
  const current = readOwnerMeta();
  const baseKeys = current && current.uid === uid ? current.pendingKeys : [];
  const nextKeys = Array.from(new Set([key, ...baseKeys]));
  writeOwnerMeta({ uid, pendingKeys: nextKeys });
}

function unmarkActorPending(idOrSlug: string | number): void {
  const target = normalizeKey(idOrSlug);
  const current = readOwnerMeta();
  if (!current) return;
  const remaining = current.pendingKeys.filter((k) => k !== target);
  if (remaining.length === 0) {
    writeOwnerMeta(null);
  } else {
    writeOwnerMeta({ uid: current.uid, pendingKeys: remaining });
  }
}

/**
 * Lấy danh sách diễn viên đang chờ đồng bộ cho chính userId (tránh mất dữ liệu khi offline/auth trễ).
 */
export function getPendingFavoriteActorsForUser(userId: string): FavoriteActorItem[] {
  if (!userId) return [];
  const meta = readOwnerMeta();
  if (!meta || meta.uid !== userId || meta.pendingKeys.length === 0) return [];
  const pendingSet = new Set(meta.pendingKeys);
  return getFavoriteActors().filter(
    (item) =>
      (item.id && pendingSet.has(normalizeKey(item.id))) ||
      (item.slug && pendingSet.has(normalizeKey(item.slug)))
  );
}

/**
 * Lấy danh sách diễn viên được thêm trong phiên khách sạch để gộp khi khách bấm Đăng nhập.
 */
export function getGuestOwnedFavoriteActors(): FavoriteActorItem[] {
  const meta = readOwnerMeta();
  if (!meta || meta.uid !== "guest" || meta.pendingKeys.length === 0) return [];
  const pendingSet = new Set(meta.pendingKeys);
  return getFavoriteActors().filter(
    (item) =>
      (item.id && pendingSet.has(normalizeKey(item.id))) ||
      (item.slug && pendingSet.has(normalizeKey(item.slug)))
  );
}

async function resolveAuthenticatedUser(): Promise<{ uid: string } | null> {
  const syncUser = getCurrentAuthUser();
  if (syncUser) return syncUser;
  if (customAuthUserProvider) return null;
  if (!getCachedAuthUid()) return null;
  if (auth && typeof auth.authStateReady === "function") {
    await Promise.race([
      auth.authStateReady(),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]).catch(() => {});
  }
  return auth?.currentUser || null;
}

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

export function setFavoriteActorsFromSync(list: FavoriteActorItem[], syncedUserId?: string): void {
  saveFavoriteActors(list, { action: "clear" });
  if (syncedUserId) {
    const meta = readOwnerMeta();
    if (!meta || meta.uid === syncedUserId || meta.uid === "guest") {
      writeOwnerMeta(null);
    }
  } else {
    writeOwnerMeta(null);
  }
}

export function clearLocalFavoriteActorsOnly(): void {
  if (typeof window === "undefined") return;
  try {
    updateMemoryCache([]);
    localStorage.removeItem(STORAGE_KEY);
    writeOwnerMeta(null);
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
  const syncUser = getCurrentAuthUser();
  markActorPendingForSession(key, syncUser?.uid);
  saveFavoriteActors(updated, { actor: newItem, action: "add" });

  if (favoriteActorsSyncHandler) {
    const syncToCloud = (uid: string) => {
      const seq = ++mutationSeq;
      inFlightActorMutations.set(key, seq);
      Promise.resolve(favoriteActorsSyncHandler!.saveItem(uid, newItem))
        .then((ok) => {
          if (inFlightActorMutations.get(key) === seq) {
            inFlightActorMutations.delete(key);
            if (ok === true) {
              unmarkActorPending(key);
              if (newItem.slug) unmarkActorPending(newItem.slug);
            }
          }
        })
        .catch(() => {
          if (inFlightActorMutations.get(key) === seq) {
            inFlightActorMutations.delete(key);
          }
        });
    };

    if (syncUser) {
      syncToCloud(syncUser.uid);
    } else if (getCachedAuthUid()) {
      void resolveAuthenticatedUser().then((readyUser) => {
        if (readyUser?.uid) {
          markActorPendingForSession(key, readyUser.uid);
          syncToCloud(readyUser.uid);
        }
      });
    }
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

  unmarkActorPending(removedItem.id || removedItem.slug);
  if (removedItem.slug) unmarkActorPending(removedItem.slug);
  saveFavoriteActors(updated, { actor: removedItem, action: "remove" });

  if (favoriteActorsSyncHandler) {
    const syncRemoveToCloud = (uid: string) => {
      const mutationKey = normalizeKey(removedItem.id || removedItem.slug);
      const seq = ++mutationSeq;
      inFlightActorMutations.set(mutationKey, seq);
      Promise.resolve(favoriteActorsSyncHandler!.removeItem(uid, String(idOrSlug)))
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
    };

    const syncUser = getCurrentAuthUser();
    if (syncUser) {
      syncRemoveToCloud(syncUser.uid);
    } else if (getCachedAuthUid()) {
      void resolveAuthenticatedUser().then((readyUser) => {
        if (readyUser?.uid) syncRemoveToCloud(readyUser.uid);
      });
    }
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
  writeOwnerMeta(null);
  saveFavoriteActors([], { action: "clear" });
  void resolveAuthenticatedUser()
    .then((currentUser) => {
      if (currentUser && favoriteActorsSyncHandler) {
        return favoriteActorsSyncHandler.clearAll(currentUser.uid);
      }
      return undefined;
    })
    .catch(() => {});
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
