"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { SITE_VISIT_SESSION_KEY, trackSiteVisit } from "@/lib/analyticsClient";

export interface RouteClassification {
  pageGroup: string;
  pagePath: string;
  shouldTrack: boolean;
}

/**
 * Deterministically classify route pathname into page groups:
 * 'home' | 'browse' | 'movie' | 'live' | 'live-tv' | 'search'
 * Filters out admin, api routes, static assets, and internal Next.js paths.
 */
export function classifyRoute(pathname: string | null | undefined): RouteClassification {
  if (!pathname) {
    return { pageGroup: "home", pagePath: "/", shouldTrack: false };
  }

  // Normalize pathname: remove trailing slash except for root '/'
  const cleanPath = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

  // 1. Exclude routes that must NOT be tracked
  if (
    cleanPath.startsWith("/admin") ||
    cleanPath.startsWith("/api") ||
    cleanPath.startsWith("/_next") ||
    cleanPath.includes(".") // Static assets e.g. favicon.ico, images, manifests
  ) {
    return { pageGroup: "ignore", pagePath: cleanPath, shouldTrack: false };
  }

  // 2. Core route classification
  if (cleanPath === "/") {
    return { pageGroup: "home", pagePath: "/", shouldTrack: true };
  }

  if (cleanPath.startsWith("/movies")) {
    return { pageGroup: "movie", pagePath: cleanPath, shouldTrack: true };
  }

  if (cleanPath.startsWith("/live-tv")) {
    return { pageGroup: "live-tv", pagePath: cleanPath, shouldTrack: true };
  }

  if (cleanPath.startsWith("/live")) {
    return { pageGroup: "live", pagePath: cleanPath, shouldTrack: true };
  }

  if (cleanPath.startsWith("/search")) {
    return { pageGroup: "search", pagePath: cleanPath, shouldTrack: true };
  }

  if (
    cleanPath.startsWith("/browse") ||
    cleanPath.startsWith("/collection") ||
    cleanPath.startsWith("/dien-vien") ||
    cleanPath.startsWith("/my-list")
  ) {
    return { pageGroup: "browse", pagePath: cleanPath, shouldTrack: true };
  }

  // 3. Fallback for other content/informational pages (about, faq, privacy, terms)
  return { pageGroup: "browse", pagePath: cleanPath, shouldTrack: true };
}

// Module-level timestamp guard against React 18/19 StrictMode double-mount within 2000ms
let lastTrackedPathname: string | null = null;
let lastTrackedTimestamp: number = 0;
const PAGE_GROUP_COOLDOWN_MS = 5 * 60 * 1000;

function shouldSkipSessionGroup(sessionKey: string, now: number): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(SITE_VISIT_SESSION_KEY);
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    const prev = Number(map[sessionKey] || 0);
    if (prev > 0 && now - prev < PAGE_GROUP_COOLDOWN_MS) {
      return true;
    }
    map[sessionKey] = now;
    const entries = Object.entries(map);
    if (entries.length > 20) {
      entries.sort((a, b) => b[1] - a[1]);
      sessionStorage.setItem(SITE_VISIT_SESSION_KEY, JSON.stringify(Object.fromEntries(entries.slice(0, 20))));
    } else {
      sessionStorage.setItem(SITE_VISIT_SESSION_KEY, JSON.stringify(map));
    }
  } catch {}
  return false;
}

export function SiteVisitTracker() {
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    // Đợi Firebase Auth khởi tạo xong phiên đăng nhập để tránh gửi nhầm beacon "Khách" trước khi nhận diện User
    if (!pathname || authLoading) return;

    const { pageGroup, pagePath, shouldTrack } = classifyRoute(pathname);
    if (!shouldTrack) return;

    const now = Date.now();

    // Guard against React StrictMode double invocation or rapid remount on exact same path
    if (
      (lastPathRef.current === pagePath || lastTrackedPathname === pagePath) &&
      now - lastTrackedTimestamp < 2000
    ) {
      return;
    }

    // Cooldown 5 phút theo từng pageGroup + trạng thái đăng nhập trong sessionStorage để tránh ghi trùng vào Supabase
    const sessionGroupKey = `${user?.uid ? "u" : "g"}:${pageGroup}`;
    if (shouldSkipSessionGroup(sessionGroupKey, now)) {
      return;
    }

    lastPathRef.current = pagePath;
    lastTrackedPathname = pagePath;
    lastTrackedTimestamp = now;

    // Dispatch non-blocking visit beacon
    const sendVisit = async () => {
      try {
        let token: string | null = null;
        if (user) {
          try {
            token = await user.getIdToken();
          } catch {
            // If token retrieval fails, proceed as unauthenticated guest without error
          }
        }

        await trackSiteVisit({
          pageGroup,
          pagePath,
          token,
        });
      } catch {
        // Fail-safe: never throw or block rendering/navigation
      }
    };

    sendVisit();
  }, [pathname, user, authLoading]);

  return null;
}
