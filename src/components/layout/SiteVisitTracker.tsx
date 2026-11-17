"use client";

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

/**
 * SiteVisitTracker (Disabled)
 * Tracking has been completely disabled to eliminate redundant serverless invocations and Supabase IOPS.
 */
export function SiteVisitTracker() {
  return null;
}
