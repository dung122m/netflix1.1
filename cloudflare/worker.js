/**
 * CLOUDFLARE WORKER: NANAFLIX STATIC MEDIA CDN (R2 + EDGE CACHE)
 * Domain: media.nanaflix.asia
 * R2 Binding: MEDIA_BUCKET -> nanaflix-media
 *
 * Luồng hoạt động:
 * 1. Phục vụ asset tĩnh từ R2 (`avatars/`, `tv-channels/`, `teams/`, `players/`, `actors/`, `banners/`, `tournaments/`...).
 * 2. Tận dụng Cloudflare Edge Cache (`caches.default`) để giảm R2 Class B reads và giảm độ trễ xuống <10ms.
 * 3. Đã ngừng nhánh proxy `/cache/{domain}/...` (trả 410 Gone, không kéo hay ghi ảnh nguồn ngoài vào R2 nữa).
 */

const IMMUTABLE_CACHE_HEADER = "public, max-age=31536000, s-maxage=31536000, immutable";
const GONE_CACHE_HEADER = "public, max-age=86400";

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const url = new URL(request.url);
    const pathname = url.pathname.replace(/^\/+/, "");

    if (!pathname) {
      return new Response("Not Found", { status: 404 });
    }

    // Đã khai tử luồng proxy ảnh nguồn ngoài /cache/{domain}/{path}
    if (pathname.startsWith("cache/")) {
      return new Response("Legacy cache proxy disabled", {
        status: 410,
        headers: {
          "Cache-Control": GONE_CACHE_HEADER,
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // 1. Kiểm tra Cloudflare Edge Cache trước khi gọi vào R2 bucket
    const cache = caches.default;
    const cacheKey = new Request(url.origin + "/" + pathname, { method: "GET" });
    const edgeHit = await cache.match(cacheKey);
    if (edgeHit) {
      const hitHeaders = new Headers(edgeHit.headers);
      hitHeaders.set("X-Nanaflix-Cache", "HIT-EDGE");
      return new Response(request.method === "HEAD" ? null : edgeHit.body, {
        status: edgeHit.status,
        headers: hitHeaders,
      });
    }

    // 2. Miss Edge Cache -> đọc từ R2 binding và lưu ngược lại Edge Cache
    const object = await env.MEDIA_BUCKET.get(pathname);
    if (!object) {
      return new Response("Not Found", { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("Cache-Control", IMMUTABLE_CACHE_HEADER);
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("X-Nanaflix-Cache", "HIT-R2");

    const response = new Response(object.body, {
      status: 200,
      headers,
    });

    // Chỉ put GET full body vào caches.default
    if (ctx && typeof ctx.waitUntil === "function") {
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
    }

    if (request.method === "HEAD") {
      return new Response(null, { status: 200, headers });
    }

    return response;
  },
};
