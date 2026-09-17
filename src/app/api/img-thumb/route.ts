import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";

// Chỉ cho phép các width tiêu chuẩn để tránh lạm dụng resize tùy ý
const ALLOWED_WIDTHS = new Set([192, 320, 480, 640, 1280]);

// Giới hạn kích thước ảnh tải về tối đa 15MB để tránh OOM / DoS
const MAX_BYTES = 15 * 1024 * 1024;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const rawUrl = searchParams.get("url");
    const rawW = searchParams.get("w");

    if (!rawUrl) {
      return new NextResponse("Missing url parameter", {
        status: 400,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    if (!rawW) {
      return new NextResponse("Missing w parameter", {
        status: 400,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const width = parseInt(rawW, 10);
    if (isNaN(width) || !ALLOWED_WIDTHS.has(width)) {
      return new NextResponse(
        "Invalid width parameter. Allowed values: 192, 320, 480, 640, 1280",
        {
          status: 400,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }
      );
    }

    let targetUrl: URL;
    try {
      targetUrl = new URL(rawUrl);
    } catch {
      return new NextResponse("Invalid URL format", {
        status: 400,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // Bảo mật: Chỉ cho phép giao thức HTTPS
    if (targetUrl.protocol !== "https:") {
      return new NextResponse("Only HTTPS protocol is allowed", {
        status: 400,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // Bảo mật: Strict allowlist hostname, chỉ chấp nhận chính xác phimimg.com
    const hostname = targetUrl.hostname.toLowerCase();
    if (hostname !== "phimimg.com") {
      return new NextResponse("Hostname not allowed. Only phimimg.com is supported", {
        status: 403,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // Bảo mật: Port chuẩn 443 hoặc rỗng
    if (targetUrl.port && targetUrl.port !== "443") {
      return new NextResponse("Invalid port", {
        status: 400,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // Tải ảnh từ upstream với timeout 8s
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    let upstreamRes: Response;
    try {
      upstreamRes = await fetch(targetUrl.toString(), {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
      });
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const isAbort = (err as Error)?.name === "AbortError";
      return new NextResponse(isAbort ? "Upstream timeout" : "Failed to fetch upstream image", {
        status: 504,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!upstreamRes.ok) {
      return new NextResponse(`Upstream returned HTTP ${upstreamRes.status}`, {
        status: upstreamRes.status,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // Kiểm tra redirect bảo mật: Hostname cuối cùng vẫn phải là phimimg.com
    if (upstreamRes.url) {
      try {
        const finalUrl = new URL(upstreamRes.url);
        if (finalUrl.hostname.toLowerCase() !== "phimimg.com") {
          return new NextResponse("Redirect to disallowed host rejected", {
            status: 403,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }
      } catch {
        return new NextResponse("Invalid redirect URL", {
          status: 400,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
    }

    // Kiểm tra Content-Type phải là ảnh
    const contentType = upstreamRes.headers.get("content-type") || "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return new NextResponse("Upstream resource is not an image", {
        status: 400,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // Kiểm tra kích thước header Content-Length
    const contentLength = upstreamRes.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_BYTES) {
      return new NextResponse("Image exceeds 15MB limit", {
        status: 413,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const arrayBuffer = await upstreamRes.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_BYTES) {
      return new NextResponse("Image exceeds 15MB limit", {
        status: 413,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // Xử lý nén & resize bằng sharp: giữ aspect ratio, withoutEnlargement, output webp q80
    const outputBuffer = await sharp(Buffer.from(arrayBuffer))
      .resize({
        width,
        withoutEnlargement: true,
      })
      .webp({
        quality: 80,
        effort: 4,
      })
      .toBuffer();

    return new NextResponse(new Uint8Array(outputBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("[api/img-thumb] Error processing image:", error);
    return new NextResponse("Internal Server Error processing image", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
