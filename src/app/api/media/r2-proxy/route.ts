import { NextRequest, NextResponse, after } from "next/server";
import { isR2Configured, checkR2ObjectExists, uploadToR2, getR2PublicUrl } from "@/lib/r2";
import { validateImageMagicBytes } from "@/lib/fileValidation";
import { cacheService } from "@/lib/cache";
import { getTmdbMediaImagesById, searchTmdbPosterByTitle } from "@/services/tmdbService";
import {
  enforceRateLimit,
  buildRateLimitResponse,
  RATE_LIMIT_PRESETS,
} from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 10;

// Danh sách các domain ảnh nguồn được phép cache qua R2
// TUYỆT ĐỐI KHÔNG chứa "image.tmdb.org" vì TMDb đã có mạng CDN toàn cầu riêng siêu nhanh
const ALLOWED_SOURCE_DOMAINS = [
  "phimimg.com",
  "img.phimapi.com",
  "img.ophim.cc",
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
  const slug = searchParams.get("slug")?.trim() || "";
  const tmdbId = searchParams.get("tmdb_id")?.trim() || searchParams.get("tmdbId")?.trim() || "";
  const title = searchParams.get("title")?.trim() || "";
  const year = searchParams.get("year")?.trim() || "";

  if (!targetUrl) {
    return NextResponse.redirect(new URL("/default-poster.jpg", req.url), {
      status: 308,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  }

  // 1. Nếu targetUrl là link TMDb: Chuyển hướng 308 trực tiếp ngay, TUYỆT ĐỐI KHÔNG lưu vào R2
  if (targetUrl.includes("image.tmdb.org")) {
    return NextResponse.redirect(targetUrl, {
      status: 308,
      headers: {
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
        "CDN-Cache-Control": "public, max-age=31536000, immutable",
        "Vercel-CDN-Cache-Control": "max-age=31536000, immutable",
      },
    });
  }

  // 2. CHÍNH SÁCH BẢO VỆ R2: CHỈ LƯU R2 KHI TMDB THỰC SỰ KHÔNG CÓ POSTER
  // Nếu request có thông tin định danh phim (slug, tmdbId, hoặc title), kiểm tra nhanh TMDb trước
  if (tmdbId || slug || title) {
    try {
      // 2.1 Kiểm tra Redis cache trước (0ms L2 cache)
      if (tmdbId) {
        const cachedMovie = await cacheService.get<{ posterUrl: string | null }>(`tmdb:images:v2:movie:${tmdbId}`);
        const cachedTv = !cachedMovie?.posterUrl
          ? await cacheService.get<{ posterUrl: string | null }>(`tmdb:images:v2:tv:${tmdbId}`)
          : null;
        const validTmdbPoster = cachedMovie?.posterUrl || cachedTv?.posterUrl;
        if (validTmdbPoster && validTmdbPoster.includes("image.tmdb.org")) {
          return NextResponse.redirect(validTmdbPoster, {
            status: 308,
            headers: {
              "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
              "CDN-Cache-Control": "public, max-age=31536000, immutable",
              "Vercel-CDN-Cache-Control": "max-age=31536000, immutable",
              "X-Poster-Source": "TMDB-REDIS-CACHE",
            },
          });
        }
      }

      if (slug) {
        const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 100);
        const cachedFallback = await cacheService.get<{ posterUrl: string | null }>(`tmdb:fallback_poster:v2:${cleanSlug}`);
        if (cachedFallback?.posterUrl && cachedFallback.posterUrl.includes("image.tmdb.org")) {
          return NextResponse.redirect(cachedFallback.posterUrl, {
            status: 308,
            headers: {
              "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
              "CDN-Cache-Control": "public, max-age=31536000, immutable",
              "Vercel-CDN-Cache-Control": "max-age=31536000, immutable",
              "X-Poster-Source": "TMDB-SLUG-CACHE",
            },
          });
        }
      }

      // 2.2 Nếu Redis chưa có: Tra cứu nhanh TMDb qua upstream API với timeout 1.5s
      const tmdbController = new AbortController();
      const tmdbTimeout = setTimeout(() => tmdbController.abort(), 1500);

      let foundTmdbUrl: string | null = null;
      if (tmdbId) {
        const res = await getTmdbMediaImagesById(tmdbId, "movie", tmdbController.signal).catch(() => null);
        if (res?.posterUrl && res.posterUrl.includes("image.tmdb.org")) {
          foundTmdbUrl = res.posterUrl;
        } else {
          const resTv = await getTmdbMediaImagesById(tmdbId, "tv", tmdbController.signal).catch(() => null);
          if (resTv?.posterUrl && resTv.posterUrl.includes("image.tmdb.org")) {
            foundTmdbUrl = resTv.posterUrl;
          }
        }
      }

      if (!foundTmdbUrl && (title || slug)) {
        const query = title || slug.replace(/-/g, " ");
        const res = await searchTmdbPosterByTitle(query, year, "movie", tmdbController.signal).catch(() => null);
        if (res?.posterUrl && res.posterUrl.includes("image.tmdb.org")) {
          foundTmdbUrl = res.posterUrl;
        }
      }

      clearTimeout(tmdbTimeout);

      if (foundTmdbUrl) {
        // TMDb ĐÃ CÓ POSTER XỊN -> Chuyển hướng trực tiếp 308 sang TMDb CDN, KHÔNG fetch phimimg, KHÔNG lưu R2!
        return NextResponse.redirect(foundTmdbUrl, {
          status: 308,
          headers: {
            "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
            "CDN-Cache-Control": "public, max-age=31536000, immutable",
            "Vercel-CDN-Cache-Control": "max-age=31536000, immutable",
            "X-Poster-Source": "TMDB-UPSTREAM",
          },
        });
      }
    } catch {
      // Khi tra cứu TMDb lỗi mạng -> Tiếp tục luồng fallback xuống phimimg / R2
    }
  }

  // 3. ĐẾN ĐÂY: TMDB ĐÃ KIỂM TRA VÀ KHÔNG CÓ POSTER (HOẶC PHIM THIẾU TRÊN TMDB)
  // BÂY GIỜ MỚI CHO PHÉP KIỂM TRA VÀ LƯU VÀO CLOUDFLARE R2 TỪ NGUỒN PHIMIMG
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

  // 4. Kiểm tra xem ảnh này đã được cache trên Cloudflare R2 chưa (RAM L1 + Redis L2 DB 3)
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

  // 5. Nếu chưa có trên R2 và TMDb không có: Tải từ nguồn gốc (timeout gọn 2.2s để chống treo CPU)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2200);

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

    // 6. Tải lên R2 ngầm bằng `after()` (kèm timeout trần 2000ms để không giữ container Vercel quá lâu)
    if (isR2Configured() && buffer.length > 0) {
      after(async () => {
        try {
          await Promise.race([
            uploadToR2({
              key: r2Key,
              buffer,
              contentType: verifiedContentType,
              cacheControl: "public, max-age=31536000, immutable",
              category: "cache",
            }),
            new Promise((resolve) => setTimeout(resolve, 2000)),
          ]);
        } catch (uploadErr) {
          console.warn("[R2 Proxy] Background upload error:", uploadErr);
        }
      });
    }

    // 7. Trả ảnh trực tiếp cho khách xem ngay lập tức
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
