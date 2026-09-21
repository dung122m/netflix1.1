/**
 * Client-side Analytics Module for Nanaflix
 * Minimal, lightweight, privacy-focused, zero-dependency.
 * Supports anonymous guest cookies and logged-in user priority.
 */
import { auth } from "@/lib/firebase";

export interface DeviceInfo {
  deviceType: "desktop" | "mobile" | "tablet";
  os: string;
  browser: string;
  screenRes?: string;
}

export type AnalyticsEventType =
  | "site_visit"
  | "movie_view"
  | "watch_start"
  | "watch_progress"
  | "watch_end"
  | "search";

export interface AnalyticsEventPayload {
  eventType: AnalyticsEventType;
  movieSlug?: string;
  movieTitle?: string;
  episodeSlug?: string;
  episodeName?: string;
  userId?: string;
  anonymousId?: string;
  deviceInfo?: DeviceInfo;
  durationSeconds?: number;
  progressSeconds?: number;
  keyword?: string;
  timestamp?: number;
}

const ANON_COOKIE_NAME = "nanaflix_anon_id";
const COOKIE_MAX_AGE_SECONDS = 31536000; // 1 year

/**
 * Generate a cryptographically strong or random anonymous ID
 */
function generateAnonymousId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return "anon_" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  }
  return "anon_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

/**
 * Get cookie value by name
 */
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^|;\\s*)" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[2]) : null;
}

/**
 * Set cookie value with standard options
 */
function setCookie(name: string, val: string, maxAgeSec: number): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(val)}; max-age=${maxAgeSec}; path=/; SameSite=Lax`;
}

/**
 * Retrieve or generate persistent anonymous ID stored in cookie
 */
export function getOrCreateAnonymousId(): string {
  if (typeof window === "undefined") return "";

  let anonId = getCookie(ANON_COOKIE_NAME);
  if (!anonId || !anonId.startsWith("anon_")) {
    anonId = generateAnonymousId();
    setCookie(ANON_COOKIE_NAME, anonId, COOKIE_MAX_AGE_SECONDS);
  }
  return anonId;
}

/**
 * Detect minimal device information without deep fingerprinting
 */
export function getMinimalDeviceInfo(): DeviceInfo {
  if (typeof window === "undefined") {
    return {
      deviceType: "desktop",
      os: "Unknown",
      browser: "Other",
    };
  }

  const ua = navigator.userAgent || "";
  const width = window.innerWidth || 0;

  // 1. Device Type
  let deviceType: "desktop" | "mobile" | "tablet" = "desktop";
  const isTablet = /(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua);
  const isMobile = /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated/i.test(ua);

  if (isTablet || (width >= 600 && width <= 1024 && "ontouchstart" in window)) {
    deviceType = "tablet";
  } else if (isMobile || width < 600) {
    deviceType = "mobile";
  }

  // 2. OS detection
  let os = "Other";
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Mac OS X|Macintosh/i.test(ua)) os = "macOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/CrOS/i.test(ua)) os = "ChromeOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  // 3. Browser detection
  let browser = "Other";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = "Chrome";
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = "Safari";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";

  return {
    deviceType,
    os,
    browser,
  };
}

/**
 * Non-blocking, fail-safe analytics event dispatcher
 */
export async function trackAnalyticsEvent(
  payload: Omit<AnalyticsEventPayload, "anonymousId" | "deviceInfo" | "timestamp"> & {
    anonymousId?: string;
    deviceInfo?: DeviceInfo;
    timestamp?: number;
  }
): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const anonymousId = payload.anonymousId || getOrCreateAnonymousId();
    const deviceInfo = payload.deviceInfo || getMinimalDeviceInfo();
    const timestamp = payload.timestamp || Date.now();

    let activeUserId = payload.userId;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (auth) {
      if (!auth.currentUser && typeof auth.authStateReady === "function") {
        await auth.authStateReady().catch(() => {});
      }
      if (auth.currentUser) {
        activeUserId = activeUserId || auth.currentUser.uid;
        const idToken = await auth.currentUser.getIdToken().catch(() => null);
        if (idToken) {
          headers["Authorization"] = `Bearer ${idToken}`;
        }
      }
    }

    const fullPayload: AnalyticsEventPayload = {
      ...payload,
      userId: activeUserId,
      anonymousId,
      deviceInfo,
      timestamp,
    };

    const bodyString = JSON.stringify(fullPayload);

    await fetch("/api/analytics/track", {
      method: "POST",
      headers,
      body: bodyString,
      keepalive: true,
    });
  } catch {
    // Fail silently: Analytics failures MUST NEVER disrupt user experience or playback
  }
}

/**
 * Track movie view (subject to 30-minute deduplication on server)
 */
export function trackMovieView(movie: {
  movieSlug: string;
  movieTitle?: string;
  userId?: string;
}): void {
  trackAnalyticsEvent({
    eventType: "movie_view",
    movieSlug: movie.movieSlug,
    movieTitle: movie.movieTitle,
    userId: movie.userId,
  });
}

/**
 * Track watch start
 */
export function trackWatchStart(watch: {
  movieSlug: string;
  movieTitle?: string;
  episodeSlug?: string;
  episodeName?: string;
  userId?: string;
}): void {
  trackAnalyticsEvent({
    eventType: "watch_start",
    movieSlug: watch.movieSlug,
    movieTitle: watch.movieTitle,
    episodeSlug: watch.episodeSlug,
    episodeName: watch.episodeName,
    userId: watch.userId,
  });
}

/**
 * Track watch progress (periodically throttled, e.g. 45-60s or pause)
 */
export function trackWatchProgress(watch: {
  movieSlug: string;
  movieTitle?: string;
  episodeSlug?: string;
  episodeName?: string;
  userId?: string;
  progressSeconds: number;
  durationSeconds?: number;
}): void {
  trackAnalyticsEvent({
    eventType: "watch_progress",
    movieSlug: watch.movieSlug,
    movieTitle: watch.movieTitle,
    episodeSlug: watch.episodeSlug,
    episodeName: watch.episodeName,
    userId: watch.userId,
    progressSeconds: Math.round(watch.progressSeconds),
    durationSeconds: Math.round(watch.durationSeconds || 0),
  });
}

/**
 * Track watch end (when completed or leaving player)
 */
export function trackWatchEnd(watch: {
  movieSlug: string;
  movieTitle?: string;
  episodeSlug?: string;
  episodeName?: string;
  userId?: string;
  progressSeconds: number;
  durationSeconds?: number;
}): void {
  trackAnalyticsEvent({
    eventType: "watch_end",
    movieSlug: watch.movieSlug,
    movieTitle: watch.movieTitle,
    episodeSlug: watch.episodeSlug,
    episodeName: watch.episodeName,
    userId: watch.userId,
    progressSeconds: Math.round(watch.progressSeconds),
    durationSeconds: Math.round(watch.durationSeconds || 0),
  });
}

/**
 * Track site visit — once per browser tab session (sessionStorage guard).
 * Call this from GlobalVisitorTracker only.
 */
export const SITE_VISIT_SESSION_KEY = "nanaflix_session_visited";

export function trackSiteVisit(): void {
  if (typeof window === "undefined" || typeof sessionStorage === "undefined") return;
  if (sessionStorage.getItem(SITE_VISIT_SESSION_KEY)) return;
  sessionStorage.setItem(SITE_VISIT_SESSION_KEY, "1");
  trackAnalyticsEvent({ eventType: "site_visit" });
}

/**
 * Track search keyword query
 */
export function trackSearchKeyword(keyword: string, userId?: string): void {
  const clean = (keyword || "").trim();
  if (!clean || clean.length < 2) return;

  // Filter out potential sensitive contents (passwords, emails, tokens)
  if (/@|token=|bearer |password/i.test(clean)) return;

  trackAnalyticsEvent({
    eventType: "search",
    keyword: clean.slice(0, 100),
    userId,
  });
}
