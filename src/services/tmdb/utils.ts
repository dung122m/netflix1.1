/**
 * TMDb Service Common Utilities & Cache Helpers
 */
export { setBoundedMap } from "@/lib/boundedMap";

export interface CacheEntry<T> {
  data: T;
  expireAt: number;
  staleUntil: number;
}

export function normalizeTmdbLookupMediaType(type?: string): "tv" | "movie" {
  const clean = String(type || "").toLowerCase().trim();
  if (
    clean === "tv" ||
    clean === "series" ||
    clean === "phim-bo" ||
    clean === "tv-shows" ||
    clean === "tvshows"
  ) {
    return "tv";
  }
  return "movie";
}

