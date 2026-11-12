import { NextRequest } from "next/server";

const SAFE_PUBLIC_SEGMENT_EXTS = [
  ".ts",
  ".m4s",
  ".mp4",
  ".m4a",
  ".aac",
  ".vtt",
] as const;

const SENSITIVE_QUERY_PARAMS = new Set([
  "token",
  "access_token",
  "auth",
  "signature",
  "sig",
  "expires",
  "key",
  "credential",
  "policy",
  "hmac",
  "secret",
]);

/**
 * Only non-authenticating Nanaflix UI/visit cookies may appear on public media
 * segment requests without disabling Edge caching. Any auth/session/unknown
 * cookie immediately forces private no-store.
 */
const SAFE_PUBLIC_COOKIE_NAMES = new Set([
  "nanaflix_anon_id",
  "nanaflix_has_visited",
  "nanaflix_theme",
]);

function hasOnlySafePublicCookies(cookieHeader: string): boolean {
  const parts = cookieHeader.split(";");
  let hasCookiePair = false;
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eqIndex = trimmed.indexOf("=");
    const cookieName = (eqIndex >= 0 ? trimmed.slice(0, eqIndex) : trimmed)
      .trim()
      .toLowerCase();
    if (!cookieName || !SAFE_PUBLIC_COOKIE_NAMES.has(cookieName)) {
      return false;
    }
    hasCookiePair = true;
  }
  return hasCookiePair;
}

/**
 * Determine whether a proxied media segment response is safe to cache on
 * shared CDNs while preserving strict isolation for DRM keys, auth headers,
 * session cookies, and signed/tokenized upstream URLs.
 */
export function isSafePublicMediaSegment(
  request: NextRequest,
  targetUrl: string,
  contentType: string,
  response: Response,
): boolean {
  try {
    const parsedUrl = new URL(targetUrl);
    const pathname = parsedUrl.pathname.toLowerCase();

    if (
      pathname.endsWith(".key") ||
      pathname.endsWith(".key.bin") ||
      pathname.includes("/key/") ||
      pathname.includes("/keys/")
    ) {
      return false;
    }

    const clientAuth = request.headers.get("authorization");
    if (clientAuth) {
      return false;
    }

    const clientCookie = request.headers.get("cookie")?.trim();
    if (clientCookie && !hasOnlySafePublicCookies(clientCookie)) {
      return false;
    }

    if (response.headers.has("set-cookie") || response.headers.has("authorization")) {
      return false;
    }

    const vary = response.headers.get("vary")?.toLowerCase() || "";
    if (vary.includes("cookie") || vary.includes("authorization")) {
      return false;
    }

    for (const [paramKey] of parsedUrl.searchParams) {
      if (SENSITIVE_QUERY_PARAMS.has(paramKey.toLowerCase())) {
        return false;
      }
    }

    const hasSafeExt = SAFE_PUBLIC_SEGMENT_EXTS.some((ext) =>
      pathname.endsWith(ext),
    );
    if (!hasSafeExt) {
      return false;
    }

    const ct = contentType.toLowerCase();
    return (
      ct.includes("video/mp2t") ||
      ct.includes("video/mp4") ||
      ct.includes("video/iso.segment") ||
      ct.includes("audio/aac") ||
      ct.includes("audio/mp4") ||
      ct.includes("audio/x-m4a") ||
      ct.includes("text/vtt") ||
      ct.includes("application/octet-stream")
    );
  } catch {
    return false;
  }
}
