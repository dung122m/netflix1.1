import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  try {
    const parsedTarget = new URL(targetUrl);
    const origin = parsedTarget.origin;
    const basePath = targetUrl.substring(0, targetUrl.lastIndexOf("/") + 1);

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: origin + "/",
        Origin: origin,
      },
      signal: AbortSignal.timeout(10000),
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
          // Xử lý nếu dòng #EXT-X-KEY chứa URI="..."
          if (trimmed.startsWith("#EXT-X-KEY")) {
            return trimmed.replace(/URI="([^"]+)"/, (_, uri) => {
              let fullUri = uri;
              if (!uri.startsWith("http://") && !uri.startsWith("https://")) {
                fullUri = uri.startsWith("/") ? origin + uri : basePath + uri;
              }
              return `URI="/api/live-football/proxy?url=${encodeURIComponent(
                fullUri
              )}"`;
            });
          }
          return line;
        }

        let fullSegmentUrl = trimmed;
        if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
          fullSegmentUrl = trimmed.startsWith("/")
            ? origin + trimmed
            : basePath + trimmed;
        }

        return `/api/live-football/proxy?url=${encodeURIComponent(
          fullSegmentUrl
        )}`;
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
        "Cache-Control": "public, max-age=86400, immutable",
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
