/**
 * Client-side Analytics Module for Nanaflix
 * Minimal, lightweight, privacy-focused, zero-dependency.
 * Supports anonymous guest cookies and logged-in user priority.
 */


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
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  timestamp?: number;
}

const ANON_STORAGE_KEY = "nanaflix_anon_id";
const ANON_COOKIE_NAME = "nanaflix_anon_id";
const COOKIE_MAX_AGE_SECONDS = 31536000; // 1 year

let cachedAnonymousId: string | null = null;

/**
 * Validate anonymous ID format: starts with anon_ and has 8-64 alphanumeric chars
 */
export function isValidAnonymousId(id: unknown): id is string {
  return typeof id === "string" && /^anon_[a-zA-Z0-9_-]{8,64}$/.test(id);
}

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
 * Retrieve or generate persistent anonymous ID stored in localStorage and synced to cookie.
 * Ensures stable identity per browser/device across reloads, tab closes, and navigations.
 */
export function getOrCreateAnonymousId(): string {
  if (typeof window === "undefined") return "";

  // 1. Fast in-memory cache for current tab lifecycle
  if (cachedAnonymousId && isValidAnonymousId(cachedAnonymousId)) {
    return cachedAnonymousId;
  }

  let anonId: string | null = null;

  // 2. Read from localStorage (Primary persistent store across sessions/tabs)
  try {
    const stored = localStorage.getItem(ANON_STORAGE_KEY);
    if (isValidAnonymousId(stored)) {
      anonId = stored;
    }
  } catch {
    // localStorage might be unavailable or restricted (e.g. strict private mode)
  }

  // 3. Fallback: Read from Cookie
  if (!anonId) {
    const cookieVal = getCookie(ANON_COOKIE_NAME);
    if (isValidAnonymousId(cookieVal)) {
      anonId = cookieVal;
    }
  }

  // 4. If not found or corrupted, generate a stable anonymous ID once
  if (!anonId) {
    anonId = generateAnonymousId();
  }

  cachedAnonymousId = anonId;

  // 5. Persist to BOTH localStorage and Cookie to maintain synchronization
  try {
    localStorage.setItem(ANON_STORAGE_KEY, anonId);
  } catch {}

  setCookie(ANON_COOKIE_NAME, anonId, COOKIE_MAX_AGE_SECONDS);

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
 * Non-blocking, fail-safe analytics event dispatcher (No-op: Tracking removed per Nanaflix optimization policy)
 */
export async function trackAnalyticsEvent(
  _payload: Omit<AnalyticsEventPayload, "anonymousId" | "deviceInfo" | "timestamp"> & {
    anonymousId?: string;
    deviceInfo?: DeviceInfo;
    timestamp?: number;
  }
): Promise<void> {
  // Zero-cost no-op: analytics event sending eliminated
  return;
}

/**
 * Track movie view (No-op)
 */
export function trackMovieView(_movie: {
  movieSlug: string;
  movieTitle?: string;
  userId?: string;
}): void {
  // No-op
}

/**
 * Track watch start (No-op)
 */
export function trackWatchStart(_watch: {
  movieSlug: string;
  movieTitle?: string;
  episodeSlug?: string;
  episodeName?: string;
  userId?: string;
}): void {
  // No-op
}

/**
 * Track watch progress (No-op)
 */
export function trackWatchProgress(_watch: {
  movieSlug: string;
  movieTitle?: string;
  episodeSlug?: string;
  episodeName?: string;
  userId?: string;
  progressSeconds: number;
  durationSeconds?: number;
}): void {
  // No-op
}

/**
 * Track watch end (No-op)
 */
export function trackWatchEnd(_watch: {
  movieSlug: string;
  movieTitle?: string;
  episodeSlug?: string;
  episodeName?: string;
  userId?: string;
  progressSeconds: number;
  durationSeconds?: number;
}): void {
  // No-op
}

export interface TrackSiteVisitOptions {
  pageGroup?: string;
  pagePath?: string;
  token?: string | null;
}

export const SITE_VISIT_SESSION_KEY = "nanaflix_session_visited";

/**
 * Track site visit (Minimal, non-blocking visit beacon)
 */
export async function trackSiteVisit(options?: TrackSiteVisitOptions): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const pageGroup = options?.pageGroup || "home";
    const pagePath = options?.pagePath || window.location.pathname || "/";
    const anonymousId = getOrCreateAnonymousId();
    const deviceInfo = getMinimalDeviceInfo();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (options?.token) {
      headers["Authorization"] = `Bearer ${options.token}`;
    }

    const payload = {
      eventType: "site_visit",
      movieSlug: pageGroup,
      movieTitle: pagePath,
      anonymousId,
      deviceInfo,
    };

    await fetch("/api/analytics/track", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // Non-blocking fail-safe: never throw or block UI
    });
  } catch {
    // Non-blocking fail-safe
  }
}

/**
 * Track search keyword query (No-op)
 */
export function trackSearchKeyword(_keyword: string, _userId?: string): void {
  // No-op
}

