/**
 * CLOUDFLARE WORKER: SMART EDGE CACHING FOR NANAFLIX MEDIA
 * Domain: media.nanaflix.asia
 * R2 Binding: MEDIA_BUCKET -> nanaflix-media
 * 
 * Luồng hoạt động:
 * 1. Khách truy cập: https://media.nanaflix.asia/cache/{domain}/{path}
 * 2. Worker kiểm tra R2 Bucket qua internal binding (độ trễ 0-5ms, không tốn egress).
 * 3. Nếu ĐÃ CÓ: Trả về trực tiếp với cache vĩnh viễn (immutable).
 * 4. Nếu CHƯA CÓ: Kéo từ nguồn gốc (phimimg.com, tmdb, v.v.), lưu vào R2 ngầm và trả ngay cho khách.
 * 5. Vercel hoàn toàn đứng ngoài: 0% CPU, 0 MB Băng thông Vercel.
 */

// Danh sách domain cho phép proxy để chống lợi dụng làm open proxy
const ALLOWED_UPSTREAMS = [
  "phimimg.com",
  "img.phimapi.com",
  "img.ophim.cc",
  "image.tmdb.org",
];

const IMMUTABLE_CACHE_HEADER = "public, max-age=31536000, s-maxage=31536000, immutable";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/^\/+/, "");

    // 1. Chỉ xử lý các đường dẫn cache: cache/{domain}/{path...}
    if (!pathname.startsWith("cache/")) {
      // Đối với các assets tĩnh khác (avatars/, tv-channels/, covers/), lấy trực tiếp từ R2
      const object = await env.MEDIA_BUCKET.get(pathname);
      if (!object) {
        return new Response("Not Found", { status: 404 });
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);
      headers.set("Cache-Control", IMMUTABLE_CACHE_HEADER);
      headers.set("Access-Control-Allow-Origin", "*");

      return new Response(object.body, { headers });
    }

    // 2. Kiểm tra xem file đã được cache trong R2 chưa
    const cachedObject = await env.MEDIA_BUCKET.get(pathname);
    if (cachedObject) {
      const headers = new Headers();
      cachedObject.writeHttpMetadata(headers);
      headers.set("etag", cachedObject.httpEtag);
      headers.set("Cache-Control", IMMUTABLE_CACHE_HEADER);
      headers.set("Access-Control-Allow-Origin", "*");
      headers.set("X-Nanaflix-Cache", "HIT-R2-EDGE");

      return new Response(cachedObject.body, { headers });
    }

    // 3. Nếu chưa có: Trích xuất upstream domain và path gốc
    // Đường dẫn có dạng: cache/phimimg.com/upload/vod/...
    const segments = pathname.split("/");
    if (segments.length < 3) {
      return new Response("Invalid Cache URL Path", { status: 400 });
    }

    const targetDomain = segments[1].toLowerCase();
    const isAllowedDomain = ALLOWED_UPSTREAMS.some((d) => targetDomain.includes(d));
    if (!isAllowedDomain) {
      return new Response("Forbidden Upstream Domain", { status: 403 });
    }

    const upstreamPath = segments.slice(2).join("/");
    const upstreamUrl = `https://${targetDomain}/${upstreamPath}${url.search}`;

    try {
      const upstreamRes = await fetch(upstreamUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 NanaflixWorker/1.0",
          Referer: upstreamUrl,
        },
      });

      if (!upstreamRes.ok) {
        return new Response("Upstream Error", { status: upstreamRes.status });
      }

      const contentType = upstreamRes.headers.get("content-type") || "image/jpeg";

      // Đọc arrayBuffer để vừa trả cho khách vừa ghi vào R2
      const imageBytes = await upstreamRes.arrayBuffer();

      // Ghi vào Cloudflare R2 bucket ngầm (tại Edge)
      await env.MEDIA_BUCKET.put(pathname, imageBytes, {
        httpMetadata: {
          contentType,
          cacheControl: IMMUTABLE_CACHE_HEADER,
        },
      });

      const responseHeaders = new Headers();
      responseHeaders.set("Content-Type", contentType);
      responseHeaders.set("Cache-Control", IMMUTABLE_CACHE_HEADER);
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      responseHeaders.set("X-Nanaflix-Cache", "MISS-FETCHED-AND-CACHED");

      return new Response(imageBytes, {
        status: 200,
        headers: responseHeaders,
      });
    } catch (err) {
      return new Response(`Worker Fetch Error: ${err.message}`, { status: 502 });
    }
  },
};
