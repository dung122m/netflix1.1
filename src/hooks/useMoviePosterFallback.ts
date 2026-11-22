"use client";

import { useState, useEffect, useCallback } from "react";
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
 * Hook phân giải poster siêu tốc:
 * - Thay vì gửi HTTP fetch /api/movie-poster-fallback lặp đi lặp lại ở client,
 *   hook phân giải trực tiếp từ GLOBAL_POSTER_CACHE hoặc trả về ảnh chuẩn hóa ở 0ms.
 * - Triệt tiêu 100% network fallback storm trên client.
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
  const cleanTmdbId = tmdbId ? String(tmdbId).trim() : "";
  const cleanType = type || "movie";
  const cacheKey = cleanTmdbId
    ? `v3:tmdb:${cleanTmdbId}:${cleanType}`
    : `v3:${slug || title || ""}|${origin_name || ""}|${year || ""}|${cleanType}`.toLowerCase();
  const legacyKey = slug || cleanTmdbId || `${title || ""}_${year || ""}`.trim();
  const safeInitial = initialSrc && typeof initialSrc === "string" ? initialSrc.trim() : "";

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

  useEffect(() => {
    setDisplaySrc(resolveCurrent());
  }, [resolveCurrent]);

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
