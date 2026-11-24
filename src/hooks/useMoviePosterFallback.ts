"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toOptimizedCardPosterUrl, isSlowProviderSourceUrl } from "@/lib/movieMedia";

// =========================================================================
// 1. PERSISTENT GLOBAL CACHE & DEDUPLICATION (Lưu vào localStorage/sessionStorage)
// =========================================================================
const POSTER_CACHE_KEY = "nfx_poster_fallback_cache_v3";
const TRIED_FAILURES_KEY = "nfx_poster_fallback_failures_v4";

function initPersistentPosterCache(): Map<string, string> {
  const map = new Map<string, string>();
  if (typeof window === "undefined") return map;
  try {
    const raw = localStorage.getItem(POSTER_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null) {
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === "string" && v) {
            map.set(k, v);
          }
        }
      }
    }
  } catch {}
  return map;
}

function initPersistentFailures(): Set<string> {
  const set = new Set<string>();
  if (typeof window === "undefined") return set;
  try {
    const raw = sessionStorage.getItem(TRIED_FAILURES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((k) => {
          if (typeof k === "string") set.add(k);
        });
      }
    }
  } catch {}
  return set;
}

export const GLOBAL_POSTER_CACHE = initPersistentPosterCache();
export const GLOBAL_TRIED_FAILURES = initPersistentFailures();

export function persistPosterCacheEntry(key: string, url: string) {
  if (typeof window === "undefined" || !key || !url) return;
  try {
    GLOBAL_POSTER_CACHE.set(key, url);
    const raw = localStorage.getItem(POSTER_CACHE_KEY);
    const obj: Record<string, string> = raw ? JSON.parse(raw) : {};
    obj[key] = url;
    const keys = Object.keys(obj);
    if (keys.length > 500) delete obj[keys[0]];
    localStorage.setItem(POSTER_CACHE_KEY, JSON.stringify(obj));
  } catch {}
}

export function persistFailureEntry(key: string) {
  if (typeof window === "undefined" || !key) return;
  try {
    GLOBAL_TRIED_FAILURES.add(key);
    const raw = sessionStorage.getItem(TRIED_FAILURES_KEY);
    const arr: string[] = raw ? JSON.parse(raw) : [];
    if (!arr.includes(key)) {
      arr.push(key);
      if (arr.length > 500) arr.shift();
      sessionStorage.setItem(TRIED_FAILURES_KEY, JSON.stringify(arr));
    }
  } catch {}
}

// =========================================================================
// 2. LOGIC XÁC MINH CẦN FALLBACK (chỉ khi rỗng hoặc placeholder mặc định)
// =========================================================================
export function isPosterEmptyOrBroken(url?: string | null): boolean {
  if (!url || typeof url !== "string") return true;
  const clean = url.trim();
  if (!clean || clean === "null" || clean === "undefined") return true;
  if (clean.startsWith("/default-") || isSlowProviderSourceUrl(clean)) return true;
  return false;
}

// Backward compatibility alias cho các component gọi tên cũ
export const isPhimimgOrEmpty = isPosterEmptyOrBroken;

export function isPhimimgSourceUrl(url?: string | null): boolean {
  return isSlowProviderSourceUrl(url);
}

// =========================================================================
// 3. CLIENT BATCH FALLBACK QUEUE (Gom 1 request POST duy nhất cho cả trang)
// =========================================================================
export interface FallbackBatchItem {
  slug?: string;
  title?: string;
  origin_name?: string;
  year?: string | number;
  type?: string;
  tmdbId?: string | number;
}

const batchQueue: FallbackBatchItem[] = [];
const batchCallbacks = new Map<string, Set<(url: string) => void>>();
const inFlightKeys = new Set<string>();
let batchTimer: NodeJS.Timeout | null = null;

function getItemKey(item: FallbackBatchItem): string {
  const cleanTmdbId = item.tmdbId ? String(item.tmdbId).trim() : "";
  const cleanType = item.type || "movie";
  return cleanTmdbId
    ? `v3:tmdb:${cleanTmdbId}:${cleanType}`
    : `v3:${item.slug || item.title || ""}|${item.origin_name || ""}|${item.year || ""}|${cleanType}`.toLowerCase();
}

function processBatchQueue() {
  if (batchQueue.length === 0) return;
  const itemsToProcess = batchQueue.splice(0, 32);
  const itemsForFetch = itemsToProcess.filter((it) => {
    const key = getItemKey(it);
    return !inFlightKeys.has(key) && !GLOBAL_TRIED_FAILURES.has(key);
  });

  if (itemsForFetch.length === 0) return;

  itemsForFetch.forEach((it) => inFlightKeys.add(getItemKey(it)));

  fetch("/api/movie-poster-fallback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: itemsForFetch }),
  })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      const results = data?.results as Record<
        string,
        { posterUrl?: string | null; backdropUrl?: string | null }
      > | undefined;

      if (!results || typeof results !== "object") return;

      for (const it of itemsForFetch) {
        const key = getItemKey(it);
        const legacyKey = it.slug || `${it.title || ""}_${it.year || ""}`.trim();
        const hit = results[key];
        const posterUrl = hit?.posterUrl;

        if (posterUrl && typeof posterUrl === "string" && posterUrl.includes("image.tmdb.org")) {
          persistPosterCacheEntry(key, posterUrl);
          if (it.slug) persistPosterCacheEntry(it.slug, posterUrl);
          if (legacyKey) persistPosterCacheEntry(legacyKey, posterUrl);

          const cbs = batchCallbacks.get(key);
          if (cbs) {
            cbs.forEach((cb) => cb(posterUrl));
          }
          if (it.slug && it.slug !== key) {
            const slugCbs = batchCallbacks.get(it.slug);
            if (slugCbs) slugCbs.forEach((cb) => cb(posterUrl));
          }
        } else {
          persistFailureEntry(key);
          if (it.slug) persistFailureEntry(it.slug);
        }
      }
    })
    .catch(() => {
      // Graceful fallback nếu mạng gián đoạn
    })
    .finally(() => {
      itemsForFetch.forEach((it) => inFlightKeys.delete(getItemKey(it)));
      if (batchQueue.length > 0) {
        batchTimer = setTimeout(processBatchQueue, 200);
      }
    });
}

export function enqueuePosterBatchFallback(
  item: FallbackBatchItem,
  onResolved: (url: string) => void
): void {
  if (typeof window === "undefined" || !item) return;

  const key = getItemKey(item);
  const legacyKey = item.slug || `${item.title || ""}_${item.year || ""}`.trim();

  // 1. Kiểm tra RAM cache trước
  if (GLOBAL_POSTER_CACHE.has(key)) {
    onResolved(GLOBAL_POSTER_CACHE.get(key)!);
    return;
  }
  if (legacyKey && GLOBAL_POSTER_CACHE.has(legacyKey)) {
    onResolved(GLOBAL_POSTER_CACHE.get(legacyKey)!);
    return;
  }

  // 2. Nếu đã từng thử và không có trên TMDb thì không gọi lại
  if (GLOBAL_TRIED_FAILURES.has(key) || (item.slug && GLOBAL_TRIED_FAILURES.has(item.slug))) {
    return;
  }

  // 3. Đăng ký listener
  if (!batchCallbacks.has(key)) {
    batchCallbacks.set(key, new Set());
  }
  batchCallbacks.get(key)!.add(onResolved);

  if (item.slug) {
    if (!batchCallbacks.has(item.slug)) {
      batchCallbacks.set(item.slug, new Set());
    }
    batchCallbacks.get(item.slug)!.add(onResolved);
  }

  // 4. Đưa vào hàng đợi batch (debounce 150ms để gom toàn bộ cards trên màn hình)
  if (!batchQueue.some((q) => getItemKey(q) === key)) {
    batchQueue.push(item);
  }

  if (batchTimer) clearTimeout(batchTimer);
  batchTimer = setTimeout(processBatchQueue, 150);
}

export interface UseMoviePosterFallbackOptions {
  slug?: string;
  title?: string;
  origin_name?: string;
  year?: string | number;
  type?: string;
  initialSrc?: string;
  preferBackdrop?: boolean;
  enabled?: boolean;
  upgradePhimimg?: boolean;
  tmdbId?: string | number;
}

/**
 * Hook phân giải poster siêu tốc:
 * - Ưu tiên 100% TMDb CDN từ GLOBAL_POSTER_CACHE (0ms).
 * - Nếu chưa có, gom batch 1 request POST duy nhất cho toàn bộ màn hình,
 *   tuyệt đối không bắn lẻ từng request, triệt tiêu bão CPU trên Vercel.
 */
export function useMoviePosterFallback({
  slug,
  title,
  origin_name,
  year,
  type,
  initialSrc,
  tmdbId,
}: UseMoviePosterFallbackOptions): {
  displaySrc: string;
  isUpgraded: boolean;
  isLoading: boolean;
  triggerFallback: () => void;
} {
  const rawTmdbId = tmdbId ? String(tmdbId).trim() : "";
  const isCorrupted =
    (rawTmdbId === "1126166" || rawTmdbId === "893030" || rawTmdbId === "339621") &&
    !String(title || slug || origin_name || "").toLowerCase().includes("flight risk") &&
    !String(title || slug || origin_name || "").toLowerCase().includes("cuoc dao tau tren khong") &&
    !String(title || slug || origin_name || "").toLowerCase().includes("nhung dua tre trong suong");
  const cleanTmdbId = isCorrupted ? "" : rawTmdbId;
  const cleanType = type || "movie";
  const cacheKey = cleanTmdbId
    ? `v3:tmdb:${cleanTmdbId}:${cleanType}`
    : `v3:${slug || title || ""}|${origin_name || ""}|${year || ""}|${cleanType}`.toLowerCase();
  const legacyKey = slug || cleanTmdbId || `${title || ""}_${year || ""}`.trim();
  const safeInitial =
    initialSrc && typeof initialSrc === "string" && !isSlowProviderSourceUrl(initialSrc)
      ? initialSrc.trim()
      : "";

  const resolveCurrent = useCallback((): string => {
    if (cacheKey && GLOBAL_POSTER_CACHE.has(cacheKey)) {
      return GLOBAL_POSTER_CACHE.get(cacheKey)!;
    }
    if (legacyKey && GLOBAL_POSTER_CACHE.has(legacyKey)) {
      return GLOBAL_POSTER_CACHE.get(legacyKey)!;
    }
    return safeInitial ? toOptimizedCardPosterUrl(safeInitial) : "";
  }, [cacheKey, legacyKey, safeInitial]);

  const [displaySrc, setDisplaySrc] = useState<string>(resolveCurrent);
  const prevResolvedRef = useRef(displaySrc);

  useEffect(() => {
    const next = resolveCurrent();
    if (prevResolvedRef.current !== next) {
      prevResolvedRef.current = next;
      setDisplaySrc(next);
    }

    // Nếu chưa có ảnh TMDb CDN chuẩn, kích hoạt batch fallback ngầm (0ms block)
    if (!next || !next.includes("image.tmdb.org")) {
      enqueuePosterBatchFallback(
        { slug, title, origin_name, year, type, tmdbId: cleanTmdbId },
        (resolvedUrl) => {
          if (resolvedUrl && resolvedUrl.includes("image.tmdb.org")) {
            prevResolvedRef.current = resolvedUrl;
            setDisplaySrc(resolvedUrl);
          }
        }
      );
    }
  }, [resolveCurrent, slug, title, origin_name, year, type, cleanTmdbId]);

  const triggerFallback = useCallback(() => {
    if (cacheKey) persistFailureEntry(cacheKey);
  }, [cacheKey]);

  const isUpgraded = Boolean(displaySrc && displaySrc.includes("image.tmdb.org"));

  return {
    displaySrc,
    isUpgraded,
    isLoading: false,
    triggerFallback,
  };
}
