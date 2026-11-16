import { NextRequest, NextResponse, after } from "next/server";
import { isR2Configured, checkR2ObjectExists, uploadToR2, getR2PublicUrl } from "@/lib/r2";
import { validateImageMagicBytes } from "@/lib/fileValidation";
import {
  enforceRateLimit,
  buildRateLimitResponse,
  RATE_LIMIT_PRESETS,
} from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 10;

// Danh sách các domain ảnh nguồn được phép cache qua R2
const ALLOWED_SOURCE_DOMAINS = [
  "phimimg.com",
  "img.phimapi.com",
  "img.ophim.cc",
  "image.tmdb.org",
];

function sanitizeR2Key(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    const domain = parsed.hostname.toLowerCase();
    const isAllowed = ALLOWED_SOURCE_DOMAINS.some((d) => domain.includes(d));
    if (!isAllowed) return null;

    // Chuẩn hóa key lưu trữ: cache/{domain}/{path}
    const cleanPath = parsed.pathname.replace(/^\/+/, "").replace(/[^a-zA-Z0-9_\-\/.]/g, "_");
    return `cache/${domain}/${cleanPath}`;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const rateLimit = await enforceRateLimit(req, RATE_LIMIT_PRESETS.POSTER_FALLBACK_IN_MEMORY);
  if (!rateLimit.allowed) {
    return buildRateLimitResponse(rateLimit);
  }

  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url")?.trim();

  if (!targetUrl) {
    return NextResponse.redirect(new URL("/default-poster.jpg", req.url), {
      status: 308,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  }

  const r2Key = sanitizeR2Key(targetUrl);
  if (!r2Key) {
    // Domain không nằm trong danh sách cho phép -> chuyển hướng về ảnh gốc
    return NextResponse.redirect(targetUrl, {
      status: 308,
      headers: {
        "Cache-Control": "public, max-age=604800, s-maxage=604800",
      },
    });
  }

  // 1. Kiểm tra xem ảnh này đã được cache trên Cloudflare R2 chưa (RAM L1 + Redis L2 DB 3)
  if (isR2Configured()) {
    const exists = await checkR2ObjectExists(r2Key);
    if (exists) {
      const publicR2Url = getR2PublicUrl(r2Key);
      return NextResponse.redirect(publicR2Url, {
        status: 308,
        headers: {
          "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
          "CDN-Cache-Control": "public, max-age=31536000, immutable",
          "Vercel-CDN-Cache-Control": "max-age=31536000, immutable",
          "X-R2-Cache": "HIT",
        },
      });
    }
  }

  // 2. Nếu chưa có trên R2: Tải từ nguồn gốc (timeout 4.5s để chống treo mạng nhà mạng)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4500);

  try {
    const upstreamRes = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Referer: targetUrl,
      },
    });

    clearTimeout(timeoutId);

    if (!upstreamRes.ok) {
      // Nguồn ngoài 404 hoặc lỗi -> fallback về default poster (cache 1h)
      return NextResponse.redirect(new URL("/default-poster.jpg", req.url), {
        status: 308,
        headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" },
      });
    }

    const arrayBuffer = await upstreamRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Xác thực Magic Bytes để đảm bảo upstream không trả về trang HTML lỗi 200 OK
    const validation = validateImageMagicBytes(buffer);
    if (!validation.isValid) {
      return NextResponse.redirect(new URL("/default-poster.jpg", req.url), {
        status: 308,
        headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" },
      });
    }

    const verifiedContentType = validation.mimeType || "image/jpeg";

    // 3. Tải lên R2 ngầm bằng `after()` (Đảm bảo container Vercel không bị đóng băng giữa chừng)
    if (isR2Configured() && buffer.length > 0) {
      after(async () => {
        try {
          await uploadToR2({
            key: r2Key,
            buffer,
            contentType: verifiedContentType,
            cacheControl: "public, max-age=31536000, immutable",
            category: "cache",
          });
        } catch (uploadErr) {
          console.warn("[R2 Proxy] Background upload error:", uploadErr);
        }
      });
    }

    // 4. Trả ảnh trực tiếp cho khách xem ngay lập tức
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": verifiedContentType,
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
        "CDN-Cache-Control": "public, max-age=31536000, immutable",
        "Vercel-CDN-Cache-Control": "max-age=31536000, immutable",
        "X-R2-Cache": "MISS-CACHED",
      },
    });
  } catch {
    clearTimeout(timeoutId);
    // Timeout hoặc mạng nhà mạng chặn -> trả về default poster an toàn (cache 1h)
    return NextResponse.redirect(new URL("/default-poster.jpg", req.url), {
      status: 308,
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" },
    });
  }
}
