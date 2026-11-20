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
    if (keys.length > 300) delete obj[keys[0]];
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
      if (arr.length > 300) arr.shift();
      sessionStorage.setItem(TRIED_FAILURES_KEY, JSON.stringify(arr));
    }
  } catch {}
}

// =========================================================================
// 2. CONCURRENCY LIMITER (Giới hạn tối đa 4 request đồng thời)
// =========================================================================
let activeRequests = 0;
const MAX_CONCURRENT = 4;
const requestQueue: Array<() => void> = [];

function dequeue() {
  if (activeRequests < MAX_CONCURRENT && requestQueue.length > 0) {
    const next = requestQueue.shift();
    if (next) {
      activeRequests++;
      next();
    }
  }
}

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const run = () => {
      fn()
        .then(resolve)
        .catch(reject)
        .finally(() => {
          activeRequests--;
          dequeue();
        });
    };
    if (activeRequests < MAX_CONCURRENT) {
      activeRequests++;
      run();
    } else {
      requestQueue.push(run);
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
 * Hook dùng chung cho Watchlist, Lịch sử xem và Bộ sưu tập:
 * - Bảo toàn 100% ảnh gốc hiển thị ngay tức thì (0ms, không nhấp nháy, không trắng ảnh).
 * - KHÔNG gọi đón đầu hàng loạt khi mount nếu ảnh gốc hợp lệ.
 * - Chỉ tra cứu qua /api/movie-poster-fallback khi ảnh gốc thực sự lỗi hoặc được gọi qua triggerFallback().
 * - Chỉ thay ảnh khi đã preload thành công ảnh TMDb/AniList mới.
 * - Nếu không tìm thấy hoặc lỗi, GIỮ NGUYÊN ảnh gốc ban đầu.
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
  upgradePhimimg = false,
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

  const cacheKey = tmdbId ? `tmdb:${tmdbId}` : slug || `${title || ""}_${year || ""}`.trim();
  const safeInitial = initialSrc && typeof initialSrc === "string" ? initialSrc.trim() : "";

  // 1. Kiểm tra cache hit ngay từ đầu
  const [displaySrc, setDisplaySrc] = useState<string>(() => {
    if (cacheKey && GLOBAL_POSTER_CACHE.has(cacheKey)) {
      return GLOBAL_POSTER_CACHE.get(cacheKey)!;
    }
    return safeInitial;
  });

  const [isUpgraded, setIsUpgraded] = useState<boolean>(() => {
    if (cacheKey && GLOBAL_POSTER_CACHE.has(cacheKey)) {
      return true;
    }
    return Boolean(safeInitial && safeInitial.includes("image.tmdb.org"));
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const isCached = Boolean(cacheKey && GLOBAL_POSTER_CACHE.has(cacheKey));
    const shouldLoadForSrc =
      isPosterEmptyOrBroken(safeInitial) || (upgradePhimimg && isPhimimgSourceUrl(safeInitial));
    const shouldLoadEagerly =
      enabled &&
      !isCached &&
      shouldLoadForSrc &&
      Boolean(slug || title) &&
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
      } else {
        setDisplaySrc(safeInitial);
        const shouldLoadForSrc =
          isPosterEmptyOrBroken(safeInitial) || (upgradePhimimg && isPhimimgSourceUrl(safeInitial));
        const shouldLoad =
          (enabled || manuallyTriggered) &&
          (manuallyTriggered || shouldLoadForSrc) &&
          Boolean(slug || title) &&
          !GLOBAL_TRIED_FAILURES.has(cacheKey);
        setIsLoading(shouldLoad);
      }
    }
  }, [safeInitial, cacheKey, isUpgraded, displaySrc, slug, title, enabled, manuallyTriggered, upgradePhimimg]);

  useEffect(() => {
    // Chỉ chạy khi được phép hoặc khi được kích hoạt thủ công do ảnh lỗi
    const isAllowedToFetch = enabled || manuallyTriggered;
    if (!isAllowedToFetch) {
      setIsLoading(false);
      return;
    }

    // Nếu không có thông tin tìm kiếm hoặc đã là TMDb/AniList thì bỏ qua
    if (!cacheKey || (!slug && !title)) {
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

    // Nếu đã thử và thất bại trước đó trong phiên này, không spam API lại
    if (GLOBAL_TRIED_FAILURES.has(cacheKey)) {
      setIsLoading(false);
      return;
    }

    // Chỉ gọi tra cứu khi:
    // a) Được kích hoạt thủ công do ảnh lỗi (manuallyTriggered === true), HOẶC
    // b) Ảnh ban đầu thực sự rỗng / placeholder mặc định khi enabled=true, HOẶC
    // c) upgradePhimimg=true và ảnh hiện tại vẫn đến từ phimimg.com
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
      const params = new URLSearchParams();
      if (tmdbId) params.set("tmdb_id", String(tmdbId));
      if (title) params.set("title", title);
      if (origin_name) params.set("origin_name", origin_name);
      if (year) params.set("year", String(year));
      if (slug) params.set("slug", slug);
      if (type) params.set("type", type);
      params.set("v", "2");

      inFlight = enqueue(async () => {
        try {
          const res = await fetch(`/api/movie-poster-fallback?${params.toString()}`);
          if (!res.ok) return null;
          return await res.json();
        } catch {
          return null;
        }
      });
      GLOBAL_INFLIGHT_PROMISES.set(cacheKey, inFlight);
    }

    inFlight.then((data) => {
      GLOBAL_INFLIGHT_PROMISES.delete(cacheKey);

      if (!isMountedRef.current) return;

      const resolvedRaw = preferBackdrop
        ? (data?.backdropUrl || data?.posterUrl)
        : (data?.posterUrl || data?.backdropUrl);

      // Nếu không tìm thấy ảnh thay thế hoặc ảnh vẫn là nguồn chậm (phimimg/nguonc) -> GIỮ NGUYÊN ẢNH GỐC
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
        setDisplaySrc(candidate);
        setIsUpgraded(true);
        setIsLoading(false);
      };
      preloader.onerror = () => {
        // Ảnh mới bị lỗi mạng/404 -> Giữ nguyên ảnh gốc, không làm hỏng giao diện
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
  }, [cacheKey, slug, title, origin_name, year, type, displaySrc, preferBackdrop, enabled, manuallyTriggered, upgradePhimimg, tmdbId]);

  return { displaySrc, isUpgraded, isLoading, triggerFallback };
}
