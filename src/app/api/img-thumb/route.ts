import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";

// Chỉ cho phép các width tiêu chuẩn để tránh lạm dụng resize tùy ý
const ALLOWED_WIDTHS = new Set([192, 320, 480, 640, 1280]);

// Giới hạn kích thước ảnh tải về tối đa 15MB để tránh OOM / DoS
const MAX_BYTES = 15 * 1024 * 1024;

// ==========================================
// IN-MEMORY IMAGE CACHE (không cần Redis/KV)
// Key = "url|width", Value = processed webp Buffer
// Max 500 entries, TTL 60 phút — tránh fetch + sharp mỗi request
// ==========================================
interface ImgCacheEntry {
  buf: Buffer;
  expireAt: number;
}
const imgCache = new Map<string, ImgCacheEntry>();
const IMG_CACHE_TTL_MS = 60 * 60 * 1000; // 60 phút
const IMG_CACHE_MAX = 500;

function imgCacheGet(key: string): Buffer | null {
  const entry = imgCache.get(key);
  if (!entry) return null;
  if (entry.expireAt < Date.now()) {
    imgCache.delete(key);
    return null;
  }
  return entry.buf;
}

function imgCacheSet(key: string, buf: Buffer) {
  // Evict oldest khi quá giới hạn
  if (imgCache.size >= IMG_CACHE_MAX) {
    const firstKey = imgCache.keys().next().value;
    if (firstKey !== undefined) imgCache.delete(firstKey);
  }
  imgCache.set(key, { buf, expireAt: Date.now() + IMG_CACHE_TTL_MS });
}

export async function GET(req: NextRequest) {
  const t0 = Date.now();
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

  // ── Cache hit: trả về ngay, không fetch/resize (0ms) ──
  const cacheKey = `${rawUrl}|${width}`;
  const cached = imgCacheGet(cacheKey);
  if (cached) {
    return new NextResponse(new Uint8Array(cached), {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
        "X-Cache": "HIT",
        "Server-Timing": "cache;dur=0",
      },
    });
  }

  // Tải ảnh từ upstream với timeout CỨNG 3.5s bao phủ toàn bộ quá trình fetch + body download
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  let upstreamRes: Response;
  let arrayBuffer: ArrayBuffer;
  let tFetch = 0;

  try {
    upstreamRes = await fetch(targetUrl.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });

    if (!upstreamRes.ok) {
      clearTimeout(timeoutId);
      // Graceful fallback: Redirect trực tiếp sang URL gốc để browser tự tải
      return NextResponse.redirect(rawUrl, { status: 307 });
    }

    // Kiểm tra redirect bảo mật: Hostname cuối cùng vẫn phải là phimimg.com
    if (upstreamRes.url) {
      try {
        const finalUrl = new URL(upstreamRes.url);
        if (finalUrl.hostname.toLowerCase() !== "phimimg.com") {
          clearTimeout(timeoutId);
          return new NextResponse("Redirect to disallowed host rejected", {
            status: 403,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }
      } catch {
        clearTimeout(timeoutId);
        return new NextResponse("Invalid redirect URL", {
          status: 400,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
    }

    // Kiểm tra Content-Type phải là ảnh
    const contentType = upstreamRes.headers.get("content-type") || "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      clearTimeout(timeoutId);
      return NextResponse.redirect(rawUrl, { status: 307 });
    }

    // Kiểm tra kích thước header Content-Length
    const contentLength = upstreamRes.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_BYTES) {
      clearTimeout(timeoutId);
      return NextResponse.redirect(rawUrl, { status: 307 });
    }

    // Download body với timeout vẫn đang được kích hoạt
    arrayBuffer = await upstreamRes.arrayBuffer();
    tFetch = Date.now() - t0;
    clearTimeout(timeoutId);

    if (arrayBuffer.byteLength > MAX_BYTES) {
      return NextResponse.redirect(rawUrl, { status: 307 });
    }
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    console.warn(`[api/img-thumb] Upstream fetch timeout/fail (${Date.now() - t0}ms) for ${rawUrl}:`, (err as Error)?.message || err);
    // Graceful fallback: Redirect trực tiếp sang ảnh gốc, không bao giờ để serverless bị treo 20-30s
    return NextResponse.redirect(rawUrl, { status: 307 });
  }

  // Xử lý nén & resize bằng Sharp (effort: 2 để xử lý siêu tốc ~10ms, tiết kiệm CPU)
  try {
    const tSharpStart = Date.now();
    const outputBuffer = await sharp(Buffer.from(arrayBuffer))
      .resize({
        width,
        withoutEnlargement: true,
      })
      .webp({
        quality: 80,
        effort: 2,
      })
      .toBuffer();
    const tSharp = Date.now() - tSharpStart;
    const tTotal = Date.now() - t0;

    // ── Cache miss: lưu kết quả vào memory cache ──
    imgCacheSet(cacheKey, outputBuffer);

    return new NextResponse(new Uint8Array(outputBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
        "X-Cache": "MISS",
        "Server-Timing": `fetch;dur=${tFetch}, sharp;dur=${tSharp}, total;dur=${tTotal}`,
        "X-Response-Time": `${tTotal}ms`,
      },
    });
  } catch (sharpError) {
    console.warn(`[api/img-thumb] Sharp error for ${rawUrl}:`, sharpError);
    // Graceful fallback: Redirect sang ảnh gốc
    return NextResponse.redirect(rawUrl, { status: 307 });
  }
}

