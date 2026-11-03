"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toOptimizedCardPosterUrl } from "@/lib/movieMedia";

// =========================================================================
// 1. IN-MEMORY GLOBAL CACHE & DEDUPLICATION (Lưu trong RAM toàn bộ phiên)
// =========================================================================
// Tránh việc nhiều card cùng 1 phim (hoặc khi navigate qua lại) gọi API nhiều lần
const GLOBAL_POSTER_CACHE = new Map<string, string>();
const GLOBAL_INFLIGHT_PROMISES = new Map<string, Promise<{ posterUrl: string | null; backdropUrl: string | null } | null>>();
const GLOBAL_TRIED_FAILURES = new Set<string>();

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

export interface UseMoviePosterFallbackOptions {
  slug?: string;
  title?: string;
  origin_name?: string;
  year?: string | number;
  initialSrc?: string;
  preferBackdrop?: boolean;
  enabled?: boolean;
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
  initialSrc,
  preferBackdrop = false,
  enabled = true,
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

  const cacheKey = slug || `${title || ""}_${year || ""}`.trim();
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
    const shouldLoadEagerly =
      enabled &&
      !isCached &&
      isPosterEmptyOrBroken(safeInitial) &&
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
        const shouldLoad =
          (enabled || manuallyTriggered) &&
          (manuallyTriggered || isPosterEmptyOrBroken(safeInitial)) &&
          Boolean(slug || title) &&
          !GLOBAL_TRIED_FAILURES.has(cacheKey);
        setIsLoading(shouldLoad);
      }
    }
  }, [safeInitial, cacheKey, isUpgraded, displaySrc, slug, title, enabled, manuallyTriggered]);

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
    // b) Ảnh ban đầu thực sự rỗng hoặc là placeholder mặc định
    const needsLookup = manuallyTriggered || isPosterEmptyOrBroken(displaySrc);
    if (!needsLookup) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    let inFlight = GLOBAL_INFLIGHT_PROMISES.get(cacheKey);
    if (!inFlight) {
      const params = new URLSearchParams();
      if (title) params.set("title", title);
      if (origin_name) params.set("origin_name", origin_name);
      if (year) params.set("year", String(year));
      if (slug) params.set("slug", slug);

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

      // Nếu không tìm thấy ảnh thay thế hoặc ảnh vẫn là phimimg -> GIỮ NGUYÊN ẢNH GỐC
      if (!resolvedRaw || typeof resolvedRaw !== "string" || resolvedRaw.includes("phimimg.com") || resolvedRaw.includes("/api/img-thumb")) {
        GLOBAL_TRIED_FAILURES.add(cacheKey);
        setIsLoading(false);
        return;
      }

      const candidate = toOptimizedCardPosterUrl(resolvedRaw);

      // Preload ảnh mới trong RAM trước khi render vào UI để chống chớp trắng
      const preloader = new window.Image();
      preloader.src = candidate;
      preloader.onload = () => {
        if (!isMountedRef.current) return;
        GLOBAL_POSTER_CACHE.set(cacheKey, candidate);
        setDisplaySrc(candidate);
        setIsUpgraded(true);
        setIsLoading(false);
      };
      preloader.onerror = () => {
        // Ảnh mới bị lỗi mạng/404 -> Giữ nguyên ảnh gốc, không làm hỏng giao diện
        if (!isMountedRef.current) return;
        GLOBAL_TRIED_FAILURES.add(cacheKey);
        setIsLoading(false);
      };
    }).catch(() => {
      GLOBAL_INFLIGHT_PROMISES.delete(cacheKey);
      GLOBAL_TRIED_FAILURES.add(cacheKey);
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    });
  }, [cacheKey, slug, title, origin_name, year, displaySrc, preferBackdrop, enabled, manuallyTriggered]);

  return { displaySrc, isUpgraded, isLoading, triggerFallback };
}
