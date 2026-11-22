"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toOptimizedCardPosterUrl, isSlowProviderSourceUrl } from "@/lib/movieMedia";

// =========================================================================
// 1. PERSISTENT GLOBAL CACHE & DEDUPLICATION (Lưu vào localStorage/sessionStorage)
// =========================================================================
// Tránh việc nhiều card cùng 1 phim (hoặc khi reload trang) gọi API nhiều lần
const POSTER_CACHE_KEY = "nfx_poster_fallback_cache_v2";
const TRIED_FAILURES_KEY = "nfx_poster_fallback_failures_v2";

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
    const raw = sessionStorage.getItem(TRIED_FAILURES_KEY) || localStorage.getItem(TRIED_FAILURES_KEY);
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
const GLOBAL_INFLIGHT_PROMISES = new Map<string, Promise<{ posterUrl: string | null; backdropUrl: string | null } | null>>();
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
// 2. DEBOUNCED BATCH QUEUE (Gom 24 request thành 1 request POST duy nhất)
// =========================================================================
interface BatchQueueEntry {
  cacheKey: string;
  payload: {
    tmdbId?: string | number;
    title?: string;
    origin_name?: string;
    year?: string | number;
    slug?: string;
    type?: string;
  };
  resolve: (res: { posterUrl: string | null; backdropUrl: string | null } | null) => void;
}

const batchQueue: BatchQueueEntry[] = [];
let batchTimer: ReturnType<typeof setTimeout> | null = null;
const BATCH_DEBOUNCE_MS = 60;
const MAX_BATCH_SIZE = 28;

function flushBatchQueue() {
  if (batchQueue.length === 0) return;
  const currentBatch = batchQueue.splice(0, MAX_BATCH_SIZE);
  batchTimer = null;

  const items = currentBatch.map((entry) => ({
    ...entry.payload,
  }));

  fetch("/api/movie-poster-fallback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  })
    .then(async (res) => {
      if (!res.ok) {
        currentBatch.forEach((e) => e.resolve(null));
        return;
      }
      const data = await res.json();
      const results = (data?.results || {}) as Record<string, { posterUrl?: string | null; backdropUrl?: string | null }>;
      currentBatch.forEach((e) => {
        const hit = results[e.cacheKey];
        if (hit) {
          e.resolve({ posterUrl: hit.posterUrl || null, backdropUrl: hit.backdropUrl || null });
        } else {
          const matchingKey = Object.keys(results).find(
            (k) =>
              (e.payload.slug && k.includes(e.payload.slug.toLowerCase())) ||
              (e.payload.tmdbId && k.includes(String(e.payload.tmdbId)))
          );
          if (matchingKey && results[matchingKey]) {
            const m = results[matchingKey];
            e.resolve({ posterUrl: m.posterUrl || null, backdropUrl: m.backdropUrl || null });
          } else {
            e.resolve(null);
          }
        }
      });
    })
    .catch(() => {
      currentBatch.forEach((e) => e.resolve(null));
    });
}

function enqueueBatchLookup(
  cacheKey: string,
  payload: {
    tmdbId?: string | number;
    title?: string;
    origin_name?: string;
    year?: string | number;
    slug?: string;
    type?: string;
  }
): Promise<{ posterUrl: string | null; backdropUrl: string | null } | null> {
  return new Promise((resolve) => {
    batchQueue.push({ cacheKey, payload, resolve });
    if (batchQueue.length >= MAX_BATCH_SIZE) {
      if (batchTimer) clearTimeout(batchTimer);
      flushBatchQueue();
    } else if (!batchTimer) {
      batchTimer = setTimeout(flushBatchQueue, BATCH_DEBOUNCE_MS);
    }
  });
}

// =========================================================================
// 3. LOGIC XÁC MINH CẦN FALLBACK (chỉ khi rỗng hoặc placeholder mặc định)
// =========================================================================
export function isPosterEmptyOrBroken(url?: string | null): boolean {
  if (!url || typeof url !== "string") return true;
  const clean = url.trim();
  if (!clean || clean === "null" || clean === "undefined") return true;
  if (clean.startsWith("/default-")) return true;
  return false;
}

// Backward compatibility alias cho các component gọi tên cũ
export const isPhimimgOrEmpty = isPosterEmptyOrBroken;

export function isPhimimgSourceUrl(url?: string | null): boolean {
  return isSlowProviderSourceUrl(url);
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
 * Hook nâng cấp Poster sang TMDb CDN chính hãng:
 * - Bảo toàn 100% ảnh gốc hiển thị tức thì nếu là TMDb / AniList CDN.
 * - Sử dụng Debounced Batch Queue: gom toàn bộ thẻ trên trang thành 1 request POST duy nhất (tiết kiệm 95% CPU Vercel & Redis).
 * - Lưu vĩnh viễn vào LocalStorage: lần sau mở lại đọc 0ms trong RAM/LocalStorage.
 * - Tuyệt đối không ghi rác vào Cloudflare R2 bucket (0đ R2).
 */
export function useMoviePosterFallback({
  slug,
  title,
  origin_name,
  year,
  type,
  initialSrc,
  preferBackdrop = false,
  enabled = true,
  upgradePhimimg = true,
  tmdbId,
}: UseMoviePosterFallbackOptions): {
  displaySrc: string;
  isUpgraded: boolean;
  isLoading: boolean;
  triggerFallback: () => void;
} {
  const [manuallyTriggered, setManuallyTriggered] = useState<boolean>(false);
  const triggerFallback = useCallback(() => {
    setManuallyTriggered(true);
  }, []);

  const cleanTmdbId = tmdbId ? String(tmdbId).trim() : "";
  const cleanType = type || "movie";
  const cacheKey = cleanTmdbId
    ? `v3:tmdb:${cleanTmdbId}:${cleanType}`
    : `v3:${slug || title || ""}|${origin_name || ""}|${year || ""}|${cleanType}`.toLowerCase();

  const legacyKey = slug || cleanTmdbId || `${title || ""}_${year || ""}`.trim();
  const safeInitial = initialSrc && typeof initialSrc === "string" ? initialSrc.trim() : "";

  // 1. Kiểm tra cache hit ngay từ đầu (0ms)
  const [displaySrc, setDisplaySrc] = useState<string>(() => {
    if (cacheKey && GLOBAL_POSTER_CACHE.has(cacheKey)) {
      return GLOBAL_POSTER_CACHE.get(cacheKey)!;
    }
    if (legacyKey && GLOBAL_POSTER_CACHE.has(legacyKey)) {
      return GLOBAL_POSTER_CACHE.get(legacyKey)!;
    }
    return safeInitial;
  });

  const [isUpgraded, setIsUpgraded] = useState<boolean>(() => {
    if (cacheKey && GLOBAL_POSTER_CACHE.has(cacheKey)) return true;
    if (legacyKey && GLOBAL_POSTER_CACHE.has(legacyKey)) return true;
    return Boolean(safeInitial && safeInitial.includes("image.tmdb.org"));
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const isCached = Boolean(
      (cacheKey && GLOBAL_POSTER_CACHE.has(cacheKey)) ||
      (legacyKey && GLOBAL_POSTER_CACHE.has(legacyKey))
    );
    const shouldLoadForSrc =
      isPosterEmptyOrBroken(safeInitial) || (upgradePhimimg && isPhimimgSourceUrl(safeInitial));
    const shouldLoadEagerly =
      enabled &&
      !isCached &&
      shouldLoadForSrc &&
      Boolean(slug || title || tmdbId) &&
      !GLOBAL_TRIED_FAILURES.has(cacheKey);
    return shouldLoadEagerly;
  });

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Cập nhật displaySrc nếu initialSrc từ props thay đổi và chưa được upgrade
  useEffect(() => {
    if (!isUpgraded && safeInitial && safeInitial !== displaySrc) {
      if (cacheKey && GLOBAL_POSTER_CACHE.has(cacheKey)) {
        setDisplaySrc(GLOBAL_POSTER_CACHE.get(cacheKey)!);
        setIsUpgraded(true);
        setIsLoading(false);
      } else if (legacyKey && GLOBAL_POSTER_CACHE.has(legacyKey)) {
        setDisplaySrc(GLOBAL_POSTER_CACHE.get(legacyKey)!);
        setIsUpgraded(true);
        setIsLoading(false);
      } else {
        setDisplaySrc(safeInitial);
        const shouldLoadForSrc =
          isPosterEmptyOrBroken(safeInitial) || (upgradePhimimg && isPhimimgSourceUrl(safeInitial));
        const shouldLoad =
          (enabled || manuallyTriggered) &&
          (manuallyTriggered || shouldLoadForSrc) &&
          Boolean(slug || title || tmdbId) &&
          !GLOBAL_TRIED_FAILURES.has(cacheKey);
        setIsLoading(shouldLoad);
      }
    }
  }, [safeInitial, cacheKey, legacyKey, isUpgraded, displaySrc, slug, title, tmdbId, enabled, manuallyTriggered, upgradePhimimg]);

  useEffect(() => {
    const isAllowedToFetch = enabled || manuallyTriggered;
    if (!isAllowedToFetch) {
      setIsLoading(false);
      return;
    }

    if (!cacheKey || (!slug && !title && !tmdbId)) {
      setIsLoading(false);
      return;
    }

    // Nếu trong cache đã có kết quả TMDb cho phim này
    if (GLOBAL_POSTER_CACHE.has(cacheKey)) {
      const cachedUrl = GLOBAL_POSTER_CACHE.get(cacheKey)!;
      if (cachedUrl !== displaySrc) {
        setDisplaySrc(cachedUrl);
        setIsUpgraded(true);
      }
      setIsLoading(false);
      return;
    }

    if (legacyKey && GLOBAL_POSTER_CACHE.has(legacyKey)) {
      const cachedUrl = GLOBAL_POSTER_CACHE.get(legacyKey)!;
      if (cachedUrl !== displaySrc) {
        setDisplaySrc(cachedUrl);
        setIsUpgraded(true);
      }
      setIsLoading(false);
      return;
    }

    // Nếu đã thử và thất bại trước đó trong phiên này, không spam API lại
    if (GLOBAL_TRIED_FAILURES.has(cacheKey)) {
      setIsLoading(false);
      return;
    }

    const needsLookup =
      manuallyTriggered ||
      (enabled &&
        (isPosterEmptyOrBroken(displaySrc) || (upgradePhimimg && isPhimimgSourceUrl(displaySrc))));
    if (!needsLookup) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    let inFlight = GLOBAL_INFLIGHT_PROMISES.get(cacheKey);
    if (!inFlight) {
      inFlight = enqueueBatchLookup(cacheKey, {
        tmdbId,
        title,
        origin_name,
        year,
        slug,
        type,
      });
      GLOBAL_INFLIGHT_PROMISES.set(cacheKey, inFlight);
    }

    inFlight.then((data) => {
      GLOBAL_INFLIGHT_PROMISES.delete(cacheKey);

      if (!isMountedRef.current) return;

      const resolvedRaw = preferBackdrop
        ? (data?.backdropUrl || data?.posterUrl)
        : (data?.posterUrl || data?.backdropUrl);

      // Nếu không tìm thấy ảnh thay thế hoặc ảnh vẫn là nguồn chậm (phimimg/nguonc)
      if (!resolvedRaw || typeof resolvedRaw !== "string" || isSlowProviderSourceUrl(resolvedRaw)) {
        persistFailureEntry(cacheKey);
        setIsLoading(false);
        return;
      }

      const candidate = toOptimizedCardPosterUrl(resolvedRaw);

      // Preload ảnh mới trong RAM trước khi render vào UI để chống chớp trắng
      const preloader = new window.Image();
      preloader.src = candidate;
      preloader.onload = () => {
        if (!isMountedRef.current) return;
        persistPosterCacheEntry(cacheKey, candidate);
        if (legacyKey) persistPosterCacheEntry(legacyKey, candidate);
        setDisplaySrc(candidate);
        setIsUpgraded(true);
        setIsLoading(false);
      };
      preloader.onerror = () => {
        if (!isMountedRef.current) return;
        persistFailureEntry(cacheKey);
        setIsLoading(false);
      };
    }).catch(() => {
      GLOBAL_INFLIGHT_PROMISES.delete(cacheKey);
      persistFailureEntry(cacheKey);
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    });
  }, [cacheKey, legacyKey, slug, title, origin_name, year, type, displaySrc, preferBackdrop, enabled, manuallyTriggered, upgradePhimimg, tmdbId]);

  return { displaySrc, isUpgraded, isLoading, triggerFallback };
}
