import { NextRequest, NextResponse } from "next/server";
import { isBlockedStreamUrl } from "@/services/live/shared/streamHealth";
import { isSafePublicUrl, checkRateLimit, getClientIp } from "@/lib/security";

export const dynamic = "force-dynamic";

// Danh sách các domain cần giả lập Referer riêng để bypass CDN protection
const REFERER_MAP: Record<string, string> = {
  "fptplay53.net": "https://fptplay.vn/",
  "fptplay.net": "https://fptplay.vn/",
  "vips-livecdn.fptplay.net": "https://fptplay.vn/",
  "live-a.fptplay53.net": "https://fptplay.vn/",
  "vnns.net": "https://thvl.vn/",
  "qpvn.vn": "https://qpvn.vn/",
  "vtvprime.vn": "https://vtvgo.vn/",
  "akamaized.net": "https://www.nhk.or.jp/",
  "ntv1.akamaized.net": "https://www.nasa.gov/",
  "rbmn-live.akamaized.net": "https://www.redbull.com/",
};

function getReferer(url: string): string {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    for (const [key, referer] of Object.entries(REFERER_MAP)) {
      if (hostname.includes(key) || hostname === key) {
        return referer;
      }
    }
    return parsed.origin + "/";
  } catch {
    return "https://fptplay.vn/";
  }
}

export async function GET(request: NextRequest) {
  // 1. Rate Limit Protection (Max 300 segments per minute per IP)
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(`livetv_proxy_${clientIp}`, 300, 60);
  if (!rateLimit.allowed) {
    return new NextResponse("Too many proxy requests. Rate limit exceeded.", {
      status: 429,
      headers: { "Retry-After": String(rateLimit.resetSeconds) },
    });
  }

  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  // 2. Anti-SSRF URL Validation (Chống tấn công nội mạng & proxy abuse)
  if (!isSafePublicUrl(targetUrl)) {
    return new NextResponse("Forbidden target URL", { status: 403 });
  }

  if (isBlockedStreamUrl(targetUrl)) {
    return new NextResponse("Stream source is blocked or invalid", {
      status: 410,
    });
  }

  try {
    const referer = getReferer(targetUrl);
    const isFptStream = /fptplay(?:53)?\.net/i.test(
      new URL(targetUrl).hostname,
    );

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": isFptStream
          ? "Mozilla/5.0 (SMART-TV; LINUX; Tizen 10.0) AppleWebKit/537.36 (KHTML, like Gecko) 130.0.6723.116/10.0 TV Safari/537.36"
          : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Referer: referer,
        Origin: new URL(referer).origin,
        Accept: "*/*",
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      return new NextResponse(`Upstream returned ${response.status}`, {
        status: response.status,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const contentType = response.headers.get("content-type") || "";

    const toProxyUrl = (value: string) => {
      const absoluteUrl = new URL(value, targetUrl).toString();
      return `/api/live-tv/proxy?url=${encodeURIComponent(absoluteUrl)}`;
    };

    // Nếu là file playlist m3u8 → viết lại URL segment để đi qua proxy này
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

    // Nếu là video segment (.ts, .m4s, chunk binary)
    const arrayBuffer = await response.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": contentType || "video/mp2t",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    return new NextResponse(`Proxy error: ${(error as Error).message}`, {
      status: 502,
      headers: {
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
