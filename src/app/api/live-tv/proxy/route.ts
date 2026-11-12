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
import { evaluatePlaylistRefreshGate } from "@/services/live/shared/proxyGate";
import { getClientIp } from "@/lib/clientIp";
import { isSafePublicMediaSegment } from "@/lib/live/proxySegmentCache";

export const dynamic = "force-dynamic";

export function isSafePublicSegment(
  request: NextRequest,
  targetUrl: string,
  contentType: string,
  response: Response,
): boolean {
  return isSafePublicMediaSegment(request, targetUrl, contentType, response);
}

// Danh sách các domain cần giả lập Referer riêng để bypass CDN protection
const REFERER_MAP: Record<string, string> = {
  "ntv1.akamaized.net": "https://www.nasa.gov/",
  "rbmn-live.akamaized.net": "https://www.redbull.com/",
  "akamaized.net": "https://www.nhk.or.jp/",
  "vips-livecdn.fptplay.net": "https://fptplay.vn/",
  "live-a.fptplay53.net": "https://fptplay.vn/",
  "fptplay53.net": "https://fptplay.vn/",
  "fptplay.net": "https://fptplay.vn/",
  "vnns.net": "https://thvl.vn/",
  "qpvn.vn": "https://qpvn.vn/",
  "vtvprime.vn": "https://vtvgo.vn/",
  "vtvdigital.vn": "https://vtvgo.vn/",
  "dethich.pw": "https://dethich.pw/",
};

function getReferer(url: string): string {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    // Sắp xếp theo độ dài giảm dần để match domain con cụ thể trước domain cha (ví dụ ntv1.akamaized.net trước akamaized.net)
    const sortedEntries = Object.entries(REFERER_MAP).sort(
      (a, b) => b[0].length - a[0].length,
    );
    for (const [key, referer] of sortedEntries) {
      if (
        hostname === key ||
        hostname.endsWith("." + key) ||
        hostname.includes(key)
      ) {
        return referer;
      }
    }
    return parsed.origin + "/";
  } catch {
    return "https://fptplay.vn/";
  }
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

  // 1. Anti-SSRF URL Validation (Chống tấn công nội mạng & proxy abuse)
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
    // Data Plane: Every media resource MUST present a valid Signed Stream Token
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
      // Graceful Redis Fallback during token renewal
      const streamPreset = resolveStreamingRateLimitPreset(targetUrl);
      const rateLimit = await enforceRateLimit(request, streamPreset);
      if (!rateLimit.allowed) {
        return buildRateLimitResponse(rateLimit, "Rate limit exceeded during token renewal grace period.");
      }
      shouldBypassRedis = true;
    } else {
      return new NextResponse("Invalid or expired stream token", {
        status: 403,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  } else if (st && exp && sid) {
    // Authenticated Playlist Refresh
    const verifyResult = verifyStreamToken({
      token: st,
      exp,
      sid,
      version: v,
      targetUrl,
    });
    if (verifyResult.valid) {
      const clientKey = `${getClientIp(request)}:${sid}`;
      const gateDecision = evaluatePlaylistRefreshGate({
        clientKey,
        hasValidToken: true,
      });
      if (!gateDecision.allowed) {
        return new NextResponse(gateDecision.reason || "Rate limit exceeded", {
          status: 429,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "Access-Control-Allow-Origin": "*",
            "Retry-After": "3",
          },
        });
      }
      if (!gateDecision.syncToRedis) {
        shouldBypassRedis = true;
      }
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
    const referer = getReferer(targetUrl);
    const isFptStream = /fptplay(?:53)?\.net/i.test(
      new URL(targetUrl).hostname,
    );

    const clientRange = request.headers.get("range");
    const reqHeaders: Record<string, string> = {
      "User-Agent": isFptStream
        ? "Mozilla/5.0 (SMART-TV; LINUX; Tizen 10.0) AppleWebKit/537.36 (KHTML, like Gecko) 130.0.6723.116/10.0 TV Safari/537.36"
        : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      Referer: referer,
      Origin: new URL(referer).origin,
      Accept: "*/*",
      "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
      "Accept-Encoding": "gzip, deflate, br",
      Connection: "keep-alive",
    };
    if (clientRange) {
      reqHeaders["Range"] = clientRange;
    }

    const timeoutSignal = AbortSignal.timeout(9000);
    const combinedSignal = request.signal
      ? AbortSignal.any([request.signal, timeoutSignal])
      : timeoutSignal;

    const response = await fetch(targetUrl, {
      headers: reqHeaders,
      signal: combinedSignal,
    });

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

    // Nếu là file playlist m3u8 → viết lại URL segment kèm Signed Stream Token để đi qua proxy này
    if (
      targetUrl.includes(".m3u8") ||
      contentType.includes("mpegurl") ||
      contentType.includes("application/x-mpegURL")
    ) {
      const text = await response.text();
      const lines = text.split("\n");
      const playlistStreamId = computeStreamId(targetUrl);

      const toProxyUrl = (value: string) => {
        const absoluteUrl = new URL(value, targetUrl).toString();
        const signed = generateStreamToken({
          targetUrl: absoluteUrl,
          streamId: playlistStreamId,
          ttlSeconds: DEFAULT_STREAM_TOKEN_TTL_SECONDS,
        });
        return `/api/live-tv/proxy?url=${encodeURIComponent(absoluteUrl)}&st=${encodeURIComponent(signed.token)}&exp=${signed.exp}&sid=${encodeURIComponent(signed.sid)}&v=${signed.v}`;
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

    // Xử lý media chunk binary (.ts, .m4s, .key, etc.) qua Web Streams trực tiếp (0ms buffer overhead)
    const isSafe = isSafePublicSegment(request, targetUrl, contentType, response);

    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", contentType || "video/mp2t");
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    responseHeaders.set(
      "Cache-Control",
      isSafe
        ? "public, max-age=120, s-maxage=300, stale-while-revalidate=600"
        : "private, no-cache, no-store, max-age=0, must-revalidate"
    );
    responseHeaders.set(
      "CDN-Cache-Control",
      isSafe ? "public, s-maxage=300, stale-while-revalidate=600" : "no-store"
    );

    const contentLength = response.headers.get("content-length");
    if (contentLength) responseHeaders.set("Content-Length", contentLength);

    const contentRange = response.headers.get("content-range");
    if (contentRange) responseHeaders.set("Content-Range", contentRange);

    const acceptRanges = response.headers.get("accept-ranges");
    if (acceptRanges) responseHeaders.set("Accept-Ranges", acceptRanges);

    if (response.body) {
      return new NextResponse(response.body, {
        status: response.status,
        headers: responseHeaders,
      });
    }

    return new NextResponse(null, {
      status: response.status,
      headers: responseHeaders,
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
