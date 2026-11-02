import { NextRequest, NextResponse } from "next/server";
import { isBlockedStreamUrl } from "@/services/live/shared/streamHealth";
import { isSafePublicUrl } from "@/lib/security";
import {
  enforceRateLimit,
  buildRateLimitResponse,
  resolveStreamingRateLimitPreset,
} from "@/lib/rateLimit";

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return new NextResponse("Missing url parameter", {
      status: 400,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // 1. Differentiated HLS Streaming Rate Limit (Playlist: 180 req/min vs Segment: 1200 req/min)
  const streamPreset = resolveStreamingRateLimitPreset(targetUrl);
  const rateLimit = await enforceRateLimit(request, streamPreset);
  if (!rateLimit.allowed) {
    return buildRateLimitResponse(rateLimit, "Too many proxy requests. Rate limit exceeded.");
  }

  // 2. Anti-SSRF URL Validation
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

  try {
    const parsedTarget = new URL(targetUrl);
    const origin = parsedTarget.origin;
    const isFptStream = /fptplay(?:53)?\.net/i.test(parsedTarget.hostname);
    const isColaStream = /miekgo\.app|msdht\.app/i.test(parsedTarget.hostname);
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": isFptStream
          ? "Mozilla/5.0 (SMART-TV; LINUX; Tizen 10.0) AppleWebKit/537.36 (KHTML, like Gecko) 130.0.6723.116/10.0 TV Safari/537.36"
          : isColaStream
            ? "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
            : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: origin + "/",
        Origin: origin,
      },
      signal: AbortSignal.timeout(10000),
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

    const toProxyUrl = (value: string) => {
      const absoluteUrl = new URL(value, targetUrl).toString();
      return `/api/live-football/proxy?url=${encodeURIComponent(absoluteUrl)}`;
    };

    // Nếu là file playlist m3u8 -> viết lại URL segment để đi qua proxy
    if (
      targetUrl.includes(".m3u8") ||
      contentType.includes("mpegurl") ||
      contentType.includes("application/x-mpegURL")
    ) {
      const text = await response.text();
      const lines = text.split("\n");
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
    const isSafe = isSafePublicSegment(request, targetUrl, contentType, response);

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
