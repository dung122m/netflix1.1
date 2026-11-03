import { NextRequest, NextResponse } from "next/server";
import { isBlockedStreamUrl } from "@/services/live/shared/streamHealth";
import { isSafePublicUrl } from "@/lib/security";
import {
  enforceRateLimit,
  buildRateLimitResponse,
  resolveStreamingRateLimitPreset,
} from "@/lib/rateLimit";
import {
  generateStreamToken,
  verifyStreamToken,
  computeStreamId,
  DEFAULT_STREAM_TOKEN_TTL_SECONDS,
} from "@/lib/streamToken";

export const dynamic = "force-dynamic";

const SAFE_PUBLIC_SEGMENT_EXTS = [".ts", ".m4s", ".mp4", ".m4a", ".aac", ".vtt"] as const;

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

export function isSafePublicSegment(
  request: NextRequest,
  targetUrl: string,
  contentType: string,
  response: Response,
): boolean {
  try {
    const parsedUrl = new URL(targetUrl);
    const pathname = parsedUrl.pathname.toLowerCase();

    // 1. Tuyệt đối không cache public file khóa giải mã DRM (.key)
    if (
      pathname.endsWith(".key") ||
      pathname.endsWith(".key.bin") ||
      pathname.includes("/key/") ||
      pathname.includes("/keys/")
    ) {
      return false;
    }

    // 2. Client Request Headers: Không cache public nếu client gửi authorization hoặc cookie
    const clientAuth = request.headers.get("authorization");
    const clientCookie = request.headers.get("cookie");
    if (clientAuth || clientCookie) {
      return false;
    }

    // 3. Upstream Response Headers: Không cache public nếu response chứa set-cookie, authorization hoặc Vary theo cookie/auth
    if (response.headers.has("set-cookie") || response.headers.has("authorization")) {
      return false;
    }
    const vary = response.headers.get("vary")?.toLowerCase() || "";
    if (vary.includes("cookie") || vary.includes("authorization")) {
      return false;
    }

    // 4. Query Parameters nhạy cảm: Không cache public nếu URL chứa token, signature, policy, key hoặc expiration
    for (const [paramKey] of parsedUrl.searchParams) {
      if (SENSITIVE_QUERY_PARAMS.has(paramKey.toLowerCase())) {
        return false;
      }
    }

    // 5. B2-01: Extension an toàn trong allowlist là điều kiện BẮT BUỘC
    const hasSafeExt = SAFE_PUBLIC_SEGMENT_EXTS.some((ext) => pathname.endsWith(ext));
    if (!hasSafeExt) {
      return false;
    }

    // 6. Content-Type phải là media hợp lệ
    const ct = contentType.toLowerCase();
    const isSafeMime =
      ct.includes("video/mp2t") ||
      ct.includes("video/mp4") ||
      ct.includes("video/iso.segment") ||
      ct.includes("audio/aac") ||
      ct.includes("audio/mp4") ||
      ct.includes("audio/x-m4a") ||
      ct.includes("text/vtt") ||
      ct.includes("application/octet-stream");

    return isSafeMime;
  } catch {
    return false;
  }
}

export const MAX_SAFE_REDIRECTS = 5;

export interface SafeFetchResult {
  response: Response;
  finalUrl: string;
}

/**
 * Fetch upstream with controlled redirect validation preventing SSRF attacks.
 * Uses redirect: "manual" to inspect each hop, validates the target against isSafePublicUrl,
 * checks for loops, and re-computes origin/referer headers for the destination host.
 */
export async function fetchWithSafeRedirects(
  initialUrl: string,
  timeoutMs: number = 10000,
  maxRedirects: number = MAX_SAFE_REDIRECTS
): Promise<SafeFetchResult> {
  let currentUrl = initialUrl;
  const visitedUrls = new Set<string>();

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount++) {
    // 1. SSRF & Safety validation before making network call
    if (!isSafePublicUrl(currentUrl)) {
      throw new Error(`SSRF guard blocked target URL: ${currentUrl}`);
    }

    if (isBlockedStreamUrl(currentUrl)) {
      throw new Error(`Stream source is blocked or invalid: ${currentUrl}`);
    }

    // 2. Loop detection
    if (visitedUrls.has(currentUrl)) {
      throw new Error(`Redirect loop detected at ${currentUrl}`);
    }
    visitedUrls.add(currentUrl);

    // 3. Compute request headers specific to the destination host
    const parsedCurrent = new URL(currentUrl);
    const origin = parsedCurrent.origin;
    const isFptStream = /fptplay(?:53)?\.net/i.test(parsedCurrent.hostname);
    const isColaStream = /miekgo\.app|msdht\.app/i.test(parsedCurrent.hostname);

    const stepHeaders: Record<string, string> = {
      "User-Agent": isFptStream
        ? "Mozilla/5.0 (SMART-TV; LINUX; Tizen 10.0) AppleWebKit/537.36 (KHTML, like Gecko) 130.0.6723.116/10.0 TV Safari/537.36"
        : isColaStream
          ? "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
          : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Referer: origin + "/",
      Origin: origin,
    };

    const response = await fetch(currentUrl, {
      method: "GET",
      headers: stepHeaders,
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });

    const isRedirect = [301, 302, 303, 307, 308].includes(response.status);
    if (!isRedirect) {
      return { response, finalUrl: currentUrl };
    }

    if (redirectCount >= maxRedirects) {
      throw new Error(`Maximum redirect limit (${maxRedirects}) exceeded`);
    }

    const location = response.headers.get("location");
    if (!location) {
      throw new Error(`Redirect response (${response.status}) missing Location header`);
    }

    try {
      currentUrl = new URL(location, currentUrl).toString();
    } catch {
      throw new Error(`Malformed Location header in redirect: ${location}`);
    }
  }

  throw new Error(`Maximum redirect limit (${maxRedirects}) exceeded`);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");
  const st = searchParams.get("st");
  const exp = searchParams.get("exp");
  const sid = searchParams.get("sid");
  const v = searchParams.get("v");

  if (!targetUrl) {
    return new NextResponse("Missing url parameter", {
      status: 400,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // 1. Anti-SSRF URL Validation (Enforced first before any processing)
  if (!isSafePublicUrl(targetUrl)) {
    return new NextResponse("Forbidden target URL", {
      status: 403,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  if (isBlockedStreamUrl(targetUrl)) {
    return new NextResponse("Stream source is blocked or invalid", {
      status: 410,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // 2. Two-Tier Gate Evaluation
  const cleanTargetLower = targetUrl.split("?")[0].toLowerCase();
  const hasMediaExt =
    cleanTargetLower.endsWith(".ts") ||
    cleanTargetLower.endsWith(".m4s") ||
    cleanTargetLower.endsWith(".mp4") ||
    cleanTargetLower.endsWith(".m4a") ||
    cleanTargetLower.endsWith(".aac") ||
    cleanTargetLower.endsWith(".vtt") ||
    cleanTargetLower.endsWith(".key") ||
    cleanTargetLower.endsWith(".key.bin");

  const isPlaylist =
    !hasMediaExt && (
      cleanTargetLower.endsWith(".m3u8") ||
      cleanTargetLower.endsWith("/playlist") ||
      cleanTargetLower.endsWith("/manifest") ||
      cleanTargetLower.endsWith(".mpd") ||
      cleanTargetLower.includes(".m3u8")
    );

  let shouldBypassRedis = false;

  if (!isPlaylist) {
    // Data Plane: Every media resource MUST present a valid Signed Stream Token (SEC-01 P0 Fix)
    if (!st || !exp || !sid) {
      return new NextResponse("Missing required stream token parameters", {
        status: 403,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const verifyResult = verifyStreamToken({
      token: st,
      exp,
      sid,
      version: v,
      targetUrl,
    });

    if (verifyResult.valid) {
      // Token is 100% authentic and active: Bypass Upstash Redis (0ms latency, 0 Redis queries)
      shouldBypassRedis = true;
    } else if (verifyResult.status === "EXPIRED_GRACE") {
      // Token was authentic but expired (e.g. user paused stream):
      // Graceful Redis Fallback: Rate-limit via Redis to rescue playback while player refreshes playlist
      const streamPreset = resolveStreamingRateLimitPreset(targetUrl);
      const rateLimit = await enforceRateLimit(request, streamPreset);
      if (!rateLimit.allowed) {
        return buildRateLimitResponse(rateLimit, "Rate limit exceeded during token renewal grace period.");
      }
      // P1-A FIX: Mark as handled so the post-block `if (!shouldBypassRedis)` does not call Redis a second time
      shouldBypassRedis = true;
    } else {
      // Signature tampered, streamId mismatch, or hard expired beyond grace window: REJECT IMMEDIATELY
      return new NextResponse("Invalid or expired stream token", {
        status: 403,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  }

  if (!shouldBypassRedis) {
    // Control Plane (Playlist) OR direct/fallback segment: Enforce distributed Redis rate limit
    const streamPreset = resolveStreamingRateLimitPreset(targetUrl);
    const rateLimit = await enforceRateLimit(request, streamPreset);
    if (!rateLimit.allowed) {
      return buildRateLimitResponse(rateLimit, "Too many proxy requests. Rate limit exceeded.");
    }
  }

  try {
    let fetchResult: SafeFetchResult;
    try {
      fetchResult = await fetchWithSafeRedirects(targetUrl);
    } catch (fetchErr: unknown) {
      const msg = fetchErr instanceof Error ? fetchErr.message : "Fetch error";
      const isSecurityBlock = msg.includes("SSRF guard blocked") || msg.includes("Stream source is blocked");
      return new NextResponse(msg, {
        status: isSecurityBlock ? 403 : 502,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const { response, finalUrl } = fetchResult;

    if (!response.ok) {
      return new NextResponse(`Upstream returned ${response.status}`, {
        status: response.status,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const contentType = response.headers.get("content-type") || "";

    // Nếu là file playlist m3u8 -> viết lại URL segment kèm Signed Stream Token để đi qua proxy
    if (
      targetUrl.includes(".m3u8") ||
      finalUrl.includes(".m3u8") ||
      contentType.includes("mpegurl") ||
      contentType.includes("application/x-mpegURL")
    ) {
      const text = await response.text();
      const lines = text.split("\n");
      const effectiveBaseUrl = finalUrl || targetUrl;
      const playlistStreamId = computeStreamId(effectiveBaseUrl);

      const toProxyUrl = (value: string) => {
        const absoluteUrl = new URL(value, effectiveBaseUrl).toString();
        const cleanAbs = absoluteUrl.split("?")[0].toLowerCase();
        const isChildPlaylist =
          cleanAbs.endsWith(".m3u8") ||
          cleanAbs.includes("playlist") ||
          cleanAbs.includes("manifest");

        if (isChildPlaylist) {
          // Variant/sub-playlist: routes through proxy control plane
          return `/api/live-football/proxy?url=${encodeURIComponent(absoluteUrl)}`;
        }

        // Media segment, key, init mp4, or subtitle chunk: generate Signed Stream Token
        const signed = generateStreamToken({
          targetUrl: absoluteUrl,
          streamId: playlistStreamId,
          ttlSeconds: DEFAULT_STREAM_TOKEN_TTL_SECONDS,
        });

        return `/api/live-football/proxy?url=${encodeURIComponent(absoluteUrl)}&st=${encodeURIComponent(signed.token)}&exp=${signed.exp}&sid=${encodeURIComponent(signed.sid)}&v=${signed.v}`;
      };

      const rewrittenLines = lines.map((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
          return line.replace(
            /URI="([^"]+)"/g,
            (_, uri) => `URI="${toProxyUrl(uri)}"`,
          );
        }

        return toProxyUrl(trimmed);
      });

      return new NextResponse(rewrittenLines.join("\n"), {
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    // Xử lý media chunk binary (.ts, .m4s, .key, etc.)
    const arrayBuffer = await response.arrayBuffer();
    const isSafe = isSafePublicSegment(request, finalUrl || targetUrl, contentType, response);

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": contentType || "video/mp2t",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Cache-Control": isSafe
          ? "public, max-age=120, s-maxage=300, stale-while-revalidate=600"
          : "private, no-cache, no-store, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    return new NextResponse(`Proxy error: ${(error as Error).message}`, {
      status: 502,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
