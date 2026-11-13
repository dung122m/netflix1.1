import { NextRequest, NextResponse } from "next/server";
import { isR2Configured, checkR2ObjectExists, uploadToR2, getR2PublicUrl } from "@/lib/r2";
import {
  enforceRateLimit,
  buildRateLimitResponse,
  RATE_LIMIT_PRESETS,
} from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 10;

// L1 cache tránh gọi lặp S3 HeadObjectCommand (Class B ops) cho cùng key
const r2ExistsCache = new Map<string, { exists: boolean; expiresAt: number }>();
const R2_EXISTS_TTL_MS = 6 * 60 * 60 * 1000;
const R2_MISS_TTL_MS = 5 * 60 * 1000;
const MAX_R2_EXISTS_CACHE = 3000;

function setR2ExistsCache(key: string, exists: boolean): void {
  if (r2ExistsCache.size >= MAX_R2_EXISTS_CACHE) {
    const firstKey = r2ExistsCache.keys().next().value;
    if (firstKey !== undefined) r2ExistsCache.delete(firstKey);
  }
  r2ExistsCache.set(key, {
    exists,
    expiresAt: Date.now() + (exists ? R2_EXISTS_TTL_MS : R2_MISS_TTL_MS),
  });
}

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
    return NextResponse.redirect(new URL("/default-poster.jpg", req.url), 307);
  }

  const r2Key = sanitizeR2Key(targetUrl);
  if (!r2Key) {
    // Domain không nằm trong danh sách cho phép -> chuyển hướng về ảnh gốc
    return NextResponse.redirect(targetUrl, 302);
  }

  // 1. Kiểm tra xem ảnh này đã được cache trên Cloudflare R2 chưa (ưu tiên RAM L1 cache trước khi gọi S3 HeadObject)
  if (isR2Configured()) {
    const cachedCheck = r2ExistsCache.get(r2Key);
    let exists: boolean | undefined =
      cachedCheck && cachedCheck.expiresAt > Date.now() ? cachedCheck.exists : undefined;

    if (exists === undefined) {
      exists = await checkR2ObjectExists(r2Key);
      setR2ExistsCache(r2Key, exists);
    }

    if (exists) {
      const publicR2Url = getR2PublicUrl(r2Key);
      return NextResponse.redirect(publicR2Url, {
        status: 307,
        headers: {
          "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
          "CDN-Cache-Control": "public, max-age=31536000, immutable",
          "Vercel-CDN-Cache-Control": "public, max-age=31536000, immutable",
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
      // Nguồn ngoài 404 hoặc lỗi -> fallback về default poster
      return NextResponse.redirect(new URL("/default-poster.jpg", req.url), 307);
    }

    const contentType = upstreamRes.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await upstreamRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Tải lên R2 ngầm (không chặn người dùng, phục vụ cho lần truy cập sau)
    if (isR2Configured() && buffer.length > 0) {
      uploadToR2({
        key: r2Key,
        buffer,
        contentType,
        cacheControl: "public, max-age=31536000, immutable",
      })
        .then((uploadedUrl) => {
          if (uploadedUrl) setR2ExistsCache(r2Key, true);
        })
        .catch((uploadErr) => {
          console.warn("[R2 Proxy] Background upload error:", uploadErr);
        });
    }

    // 4. Trả ảnh trực tiếp cho khách xem ngay lập tức
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400",
        "CDN-Cache-Control": "public, max-age=2592000",
        "Vercel-CDN-Cache-Control": "public, s-maxage=2592000, immutable",
        "X-R2-Cache": "MISS-CACHED",
      },
    });
  } catch {
    clearTimeout(timeoutId);
    // Timeout hoặc mạng nhà mạng chặn -> trả về default poster an toàn
    return NextResponse.redirect(new URL("/default-poster.jpg", req.url), 307);
  }
}
