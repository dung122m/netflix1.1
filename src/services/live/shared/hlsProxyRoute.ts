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
  verifyUpstreamHeaderHint,
  computeStreamId,
  DEFAULT_STREAM_TOKEN_TTL_SECONDS,
} from "@/lib/streamToken";
import { evaluatePlaylistRefreshGate } from "@/services/live/shared/proxyGate";
import { getClientIp } from "@/lib/clientIp";
import { isSafePublicMediaSegment } from "@/lib/live/proxySegmentCache";

const NO_CACHE_CORS_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "Access-Control-Allow-Origin": "*",
};

export interface HlsUpstreamFetchResult {
  response: Response;
  finalUrl: string;
}

export interface HlsProxyUpstreamHeaders {
  referer?: string;
  userAgent?: string;
}

export interface HlsProxyHandlerOptions {
  proxyBasePath: string;
  fetchUpstream: (
    request: NextRequest,
    targetUrl: string,
    upstreamHeaders?: HlsProxyUpstreamHeaders,
  ) => Promise<HlsUpstreamFetchResult>;
}

/**
 * Shared CORS preflight handler for live HLS proxy endpoints.
 */
export function handleHlsProxyOptions(): NextResponse {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

/**
 * Shared GET handler for live-football and live-tv HLS proxy routes.
 * Enforces SSRF checks, two-tier signed token gating, m3u8 rewriting, and Web Streams segment passthrough.
 */
export async function handleHlsProxyGet(
  request: NextRequest,
  options: HlsProxyHandlerOptions
): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");
  const rawRef = searchParams.get("ref")?.trim() || "";
  const rawUa = searchParams.get("ua")?.trim() || "";
  const rawHsig = searchParams.get("hsig")?.trim() || "";
  const safeRawRef = rawRef && isSafePublicUrl(rawRef) ? rawRef : "";
  const sanitizedRawUa = rawUa ? rawUa.replace(/[\r\n\0-\x1f\x7f]/g, "").slice(0, 256) : "";
  // Only honor custom upstream Referer/UA when cryptographically signed by server M3U parser
  const hasValidHeaderSig = verifyUpstreamHeaderHint(
    safeRawRef || undefined,
    sanitizedRawUa || undefined,
    rawHsig,
  );
  const customRef = hasValidHeaderSig ? safeRawRef : "";
  const customUa = hasValidHeaderSig ? sanitizedRawUa : "";
  const st = searchParams.get("st");
  const exp = searchParams.get("exp");
  const sid = searchParams.get("sid");
  const v = searchParams.get("v");

  if (!targetUrl) {
    return new NextResponse("Missing url parameter", { status: 400, headers: NO_CACHE_CORS_HEADERS });
  }

  if (!isSafePublicUrl(targetUrl)) {
    return new NextResponse("Forbidden target URL", { status: 403, headers: NO_CACHE_CORS_HEADERS });
  }

  if (isBlockedStreamUrl(targetUrl)) {
    return new NextResponse("Stream source is blocked or invalid", { status: 410, headers: NO_CACHE_CORS_HEADERS });
  }

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
    !hasMediaExt &&
    (cleanTargetLower.endsWith(".m3u8") ||
      cleanTargetLower.endsWith("/playlist") ||
      cleanTargetLower.endsWith("/manifest") ||
      cleanTargetLower.endsWith(".mpd") ||
      cleanTargetLower.includes(".m3u8"));

  let shouldBypassRedis = false;

  if (!isPlaylist) {
    if (!st || !exp || !sid) {
      return new NextResponse("Missing required stream token parameters", {
        status: 403,
        headers: NO_CACHE_CORS_HEADERS,
      });
    }

    const verifyResult = verifyStreamToken({ token: st, exp, sid, version: v, targetUrl });

    if (verifyResult.valid) {
      shouldBypassRedis = true;
    } else if (verifyResult.status === "EXPIRED_GRACE") {
      const streamPreset = resolveStreamingRateLimitPreset(targetUrl);
      const rateLimit = await enforceRateLimit(request, streamPreset);
      if (!rateLimit.allowed) {
        return buildRateLimitResponse(rateLimit, "Rate limit exceeded during token renewal grace period.");
      }
      shouldBypassRedis = true;
    } else {
      return new NextResponse("Invalid or expired stream token", {
        status: 403,
        headers: NO_CACHE_CORS_HEADERS,
      });
    }
  } else if (st && exp && sid) {
    const verifyResult = verifyStreamToken({ token: st, exp, sid, version: v, targetUrl });
    if (verifyResult.valid) {
      const clientKey = `${getClientIp(request)}:${sid}`;
      const gateDecision = evaluatePlaylistRefreshGate({ clientKey, hasValidToken: true });
      if (!gateDecision.allowed) {
        return new NextResponse(gateDecision.reason || "Rate limit exceeded", {
          status: 429,
          headers: { ...NO_CACHE_CORS_HEADERS, "Retry-After": "3" },
        });
      }
      if (!gateDecision.syncToRedis) {
        shouldBypassRedis = true;
      }
    }
  }

  if (!shouldBypassRedis) {
    const streamPreset = resolveStreamingRateLimitPreset(targetUrl);
    const rateLimit = await enforceRateLimit(request, streamPreset);
    if (!rateLimit.allowed) {
      return buildRateLimitResponse(rateLimit, "Too many proxy requests. Rate limit exceeded.");
    }
  }

  try {
    let fetchResult: HlsUpstreamFetchResult;
    try {
      fetchResult = await options.fetchUpstream(request, targetUrl, {
        ...(customRef ? { referer: customRef } : {}),
        ...(customUa ? { userAgent: customUa } : {}),
      });
    } catch (fetchErr: unknown) {
      const msg = fetchErr instanceof Error ? fetchErr.message : "Fetch error";
      const isSecurityBlock = msg.includes("SSRF guard blocked") || msg.includes("Stream source is blocked");
      return new NextResponse(msg, {
        status: isSecurityBlock ? 403 : 502,
        headers: NO_CACHE_CORS_HEADERS,
      });
    }

    const { response, finalUrl } = fetchResult;
    if (!response.ok) {
      return new NextResponse(`Upstream returned ${response.status}`, {
        status: response.status,
        headers: NO_CACHE_CORS_HEADERS,
      });
    }

    const contentType = response.headers.get("content-type") || "";
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
          cleanAbs.endsWith(".m3u8") || cleanAbs.includes("playlist") || cleanAbs.includes("manifest");

        if (!isChildPlaylist) {
          const isMediaChunk =
            cleanAbs.endsWith(".ts") ||
            cleanAbs.endsWith(".m4s") ||
            cleanAbs.endsWith(".mp4") ||
            cleanAbs.endsWith(".m4a") ||
            cleanAbs.endsWith(".aac") ||
            cleanAbs.endsWith(".vtt");

          if (isMediaChunk && absoluteUrl.startsWith("https://") && !customRef && !customUa) {
            return absoluteUrl;
          }
        }

        const signed = generateStreamToken({
          targetUrl: absoluteUrl,
          streamId: playlistStreamId,
          ttlSeconds: DEFAULT_STREAM_TOKEN_TTL_SECONDS,
        });
        const extraParams = new URLSearchParams();
        if (hasValidHeaderSig) {
          if (customRef) extraParams.set("ref", customRef);
          if (customUa) extraParams.set("ua", customUa);
          extraParams.set("hsig", rawHsig);
        }
        const extraQuery = extraParams.toString();
        return `${options.proxyBasePath}?url=${encodeURIComponent(absoluteUrl)}&st=${encodeURIComponent(signed.token)}&exp=${signed.exp}&sid=${encodeURIComponent(signed.sid)}&v=${signed.v}${extraQuery ? `&${extraQuery}` : ""}`;
      };

      const rewrittenLines = lines.map((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
          return line.replace(/URI="([^"]+)"/g, (_, uri) => `URI="${toProxyUrl(uri)}"`);
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

    const effectiveUrl = finalUrl || targetUrl;
    const isSafe = isSafePublicMediaSegment(request, effectiveUrl, contentType, response);

    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", contentType || "video/mp2t");
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    if (isSafe) {
      responseHeaders.set(
        "Cache-Control",
        "public, max-age=120, s-maxage=300, stale-while-revalidate=600"
      );
    } else {
      responseHeaders.set(
        "Cache-Control",
        "private, no-cache, no-store, max-age=0, must-revalidate"
      );
    }
    if (isSafe) {
      responseHeaders.set(
        "CDN-Cache-Control",
        "public, s-maxage=300, stale-while-revalidate=600"
      );
      responseHeaders.set(
        "Vercel-CDN-Cache-Control",
        "public, s-maxage=300, stale-while-revalidate=600"
      );
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength) responseHeaders.set("Content-Length", contentLength);

    const contentRange = response.headers.get("content-range");
    if (contentRange) responseHeaders.set("Content-Range", contentRange);

    const acceptRanges = response.headers.get("accept-ranges");
    if (acceptRanges) responseHeaders.set("Accept-Ranges", acceptRanges);

    return new NextResponse(response.body || null, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    return new NextResponse(`Proxy error: ${(error as Error).message}`, {
      status: 502,
      headers: NO_CACHE_CORS_HEADERS,
    });
  }
}
