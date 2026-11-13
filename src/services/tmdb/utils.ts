/**
 * TMDb Service Common Utilities & Cache Helpers
 */

export interface CacheEntry<T> {
  data: T;
  expireAt: number;
  staleUntil: number;
}

export function setBoundedMap<K, V>(map: Map<K, V>, key: K, value: V, maxSize = 2000): void {
  if (map.size >= maxSize) {
    const firstKey = map.keys().next().value;
    if (firstKey !== undefined) {
      map.delete(firstKey);
    }
  }
  map.set(key, value);
}

export function normalizeTmdbLookupMediaType(type?: string): "tv" | "movie" {
  const clean = String(type || "").toLowerCase().trim();
  if (
    clean === "tv" ||
    clean === "series" ||
    clean === "phim-bo" ||
    clean === "tv-shows" ||
    clean === "tvshows" ||
    clean === "hoathinh" ||
    clean === "hoat-hinh"
  ) {
    return "tv";
  }
  return "movie";
}

