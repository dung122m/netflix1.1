/**
 * Unified Device Profile Collector for Nanaflix (Guest + User)
 * Collects client platform, screen, network, preferences, and video codecs.
 * Strictly avoids invasive fingerprinting (No GPS, Camera, Mic, Canvas, Audio, WebGL, Fonts).
 */
import { auth } from "@/lib/firebase";
import { getOrCreateAnonymousId } from "@/lib/analyticsClient";

export interface NetworkProfile {
  effectiveType: "4g" | "3g" | "2g" | "slow-2g" | "unknown";
  downlink?: number;
  rtt?: number;
  saveData: boolean;
}

export interface CodecSupport {
  h264: boolean;
  hevc: boolean;
  av1: boolean;
}

export interface ClientDeviceProfile {
  guestId: string;
  userId?: string | null;

  deviceType: "desktop" | "mobile" | "tablet";
  browser: string;
  os: string;
  platform: string;

  language: string;
  timezone: string;

  screenWidth: number;
  screenHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  pixelRatio: number;

  touch: boolean;
  deviceMemory?: number;
  hardwareConcurrency?: number;

  network: NetworkProfile;
  prefersDark: boolean;
  prefersReducedMotion: boolean;

  codecs: CodecSupport;
}

/**
 * Test video codec capability in the current browser
 */
export function detectCodecSupport(): CodecSupport {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return { h264: true, hevc: false, av1: false };
  }

  let videoEl: HTMLVideoElement | null = null;
  try {
    videoEl = document.createElement("video");
  } catch {
    // Media element not supported
  }

  const checkType = (mime: string): boolean => {
    try {
      if (typeof window.MediaSource !== "undefined" && typeof window.MediaSource.isTypeSupported === "function") {
        if (window.MediaSource.isTypeSupported(mime)) return true;
      }
      if (videoEl && typeof videoEl.canPlayType === "function") {
        const res = videoEl.canPlayType(mime);
        return res === "probably" || res === "maybe";
      }
    } catch {
      // Ignore errors
    }
    return false;
  };

  // AV1 mime types
  const av1 = checkType('video/mp4; codecs="av01.0.08M.10"') || checkType('video/webm; codecs="av01.0.08M.10"');

  // HEVC / H.265 mime types
  const hevc =
    checkType('video/mp4; codecs="hvc1.1.6.L93.B0"') ||
    checkType('video/mp4; codecs="hev1.1.6.L93.B0"') ||
    checkType('video/mp4; codecs="hevc"');

  // H.264 / AVC mime types
  const h264 =
    checkType('video/mp4; codecs="avc1.42E01E, mp4a.40.2"') ||
    checkType('video/mp4; codecs="avc1.640028"') ||
    checkType('video/mp4; codecs="avc1.4D401F"') ||
    Boolean(videoEl?.canPlayType?.("video/mp4"));

  return {
    h264: h264 || true, // Baseline support across modern browsers
    hevc,
    av1,
  };
}

/**
 * Detect client network characteristics via Network Information API (if available)
 */
export function detectNetworkProfile(): NetworkProfile {
  if (typeof navigator === "undefined") {
    return { effectiveType: "unknown", saveData: false };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nav = navigator as any;
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;

  if (!conn) {
    return {
      effectiveType: "unknown",
      saveData: false,
    };
  }

  let effectiveType: NetworkProfile["effectiveType"] = "unknown";
  const rawType = String(conn.effectiveType || "").toLowerCase();
  if (["4g", "3g", "2g", "slow-2g"].includes(rawType)) {
    effectiveType = rawType as NetworkProfile["effectiveType"];
  }

  return {
    effectiveType,
    downlink: typeof conn.downlink === "number" ? conn.downlink : undefined,
    rtt: typeof conn.rtt === "number" ? conn.rtt : undefined,
    saveData: Boolean(conn.saveData),
  };
}

/**
 * Detect primary browser name
 */
export function detectBrowser(ua: string): string {
  if (/Edg\//i.test(ua)) return "Edge";
  if (/OPR\/|Opera/i.test(ua)) return "Opera";
  if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return "Chrome";
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return "Safari";
  if (/Firefox\//i.test(ua)) return "Firefox";
  if (/SamsungBrowser/i.test(ua)) return "Samsung Internet";
  if (/Brave/i.test(ua)) return "Brave";
  return "Other";
}

/**
 * Detect operating system name
 */
export function detectOS(ua: string): string {
  if (/Windows/i.test(ua)) return "Windows";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Mac OS X|Macintosh/i.test(ua)) return "macOS";
  if (/Android/i.test(ua)) return "Android";
  if (/CrOS/i.test(ua)) return "ChromeOS";
  if (/Linux/i.test(ua)) return "Linux";
  return "Other";
}

/**
 * Detect device form factor (desktop / mobile / tablet)
 */
export function detectDeviceType(ua: string, width: number): "desktop" | "mobile" | "tablet" {
  const isTablet = /(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua);
  const isMobile = /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated/i.test(ua);

  if (isTablet || (width >= 600 && width <= 1024 && typeof window !== "undefined" && "ontouchstart" in window)) {
    return "tablet";
  }
  if (isMobile || width < 600) {
    return "mobile";
  }
  return "desktop";
}

/**
 * Build complete ClientDeviceProfile
 */
export function collectUnifiedDeviceProfile(explicitUserId?: string | null): ClientDeviceProfile {
  if (typeof window === "undefined") {
    return {
      guestId: "anon_server",
      userId: explicitUserId || null,
      deviceType: "desktop",
      browser: "Other",
      os: "Other",
      platform: "server",
      language: "vi-VN",
      timezone: "Asia/Ho_Chi_Minh",
      screenWidth: 1920,
      screenHeight: 1080,
      viewportWidth: 1920,
      viewportHeight: 1080,
      pixelRatio: 1,
      touch: false,
      network: { effectiveType: "unknown", saveData: false },
      prefersDark: true,
      prefersReducedMotion: false,
      codecs: { h264: true, hevc: false, av1: false },
    };
  }

  const ua = navigator.userAgent || "";
  const guestId = getOrCreateAnonymousId();
  const screenWidth = window.screen ? window.screen.width : 0;
  const screenHeight = window.screen ? window.screen.height : 0;
  const viewportWidth = window.innerWidth || 0;
  const viewportHeight = window.innerHeight || 0;
  const pixelRatio = window.devicePixelRatio || 1;

  const touch = Boolean(
    "ontouchstart" in window ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 0)
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nav = navigator as any;
  const deviceMemory = typeof nav.deviceMemory === "number" ? nav.deviceMemory : undefined;
  const hardwareConcurrency = typeof nav.hardwareConcurrency === "number" ? nav.hardwareConcurrency : undefined;

  let timezone = "Asia/Ho_Chi_Minh";
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || timezone;
  } catch {}

  const language = navigator.language || "vi-VN";
  const platform = navigator.platform || "unknown";

  const prefersDark = typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : true;

  const prefersReducedMotion = typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  return {
    guestId,
    userId: explicitUserId || (auth?.currentUser ? auth.currentUser.uid : null),
    deviceType: detectDeviceType(ua, viewportWidth || screenWidth),
    browser: detectBrowser(ua),
    os: detectOS(ua),
    platform,
    language,
    timezone,
    screenWidth,
    screenHeight,
    viewportWidth,
    viewportHeight,
    pixelRatio,
    touch,
    deviceMemory,
    hardwareConcurrency,
    network: detectNetworkProfile(),
    prefersDark,
    prefersReducedMotion,
    codecs: detectCodecSupport(),
  };
}

const DEVICE_PROFILE_SYNC_KEY = "nanaflix_last_device_profile_sync";
const SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes throttle

/**
 * Dispatch device profile update to server
 */
export async function syncUnifiedDeviceProfile(force = false): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const lastSync = Number(sessionStorage.getItem(DEVICE_PROFILE_SYNC_KEY) || 0);
    const now = Date.now();

    // Check throttle unless forced (e.g. upon user login)
    if (!force && lastSync > 0 && now - lastSync < SYNC_INTERVAL_MS) {
      return;
    }

    let activeUserId: string | null = null;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (auth) {
      if (!auth.currentUser && typeof auth.authStateReady === "function") {
        await Promise.race([
          auth.authStateReady(),
          new Promise((resolve) => setTimeout(resolve, 1000)),
        ]).catch(() => {});
      }
      if (auth.currentUser) {
        activeUserId = auth.currentUser.uid;
        const idToken = await auth.currentUser.getIdToken().catch(() => null);
        if (idToken) {
          headers["Authorization"] = `Bearer ${idToken}`;
        }
      }
    }

    const profile = collectUnifiedDeviceProfile(activeUserId);

    const res = await fetch("/api/analytics/device-profile", {
      method: "POST",
      headers,
      body: JSON.stringify(profile),
      keepalive: true,
    });

    if (res.ok) {
      sessionStorage.setItem(DEVICE_PROFILE_SYNC_KEY, String(now));
    }
  } catch {
    // Fail silently: Device profile telemetry must never block UI
  }
}
