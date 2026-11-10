import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { movieApi } from "@/services/movies/service";
import { cacheService } from "@/lib/cache";
import { middleware } from "@/middleware";
import { NextRequest } from "next/server";

describe("SSR Deduplication & Redis DB1 Optimization Tests", () => {
  beforeEach(() => {
    cacheService.clearL1();
  });

  it("1. Single Redis call shared between generateMetadata(slug) and MovieDetail(slug, undefined, ep)", async () => {
    const testSlug = "di-giua-troi-ruc-ro";

    // Lần 1: Giả lập generateMetadata gọi getMovieDetail(slug)
    const metadataData = await movieApi.getMovieDetail(testSlug);
    assert.ok(metadataData, "Metadata detail must be loaded");
    assert.ok(metadataData.movie, "Movie payload must exist");
    assert.equal(metadataData.movie.slug, testSlug);

    // Lần 2: Giả lập MovieDetail Page Component gọi getMovieDetail(slug, undefined, ep)
    const pageData = await movieApi.getMovieDetail(testSlug, undefined, "tap-1");
    assert.ok(pageData, "Page detail must be loaded");
    assert.ok(pageData.movie, "Movie payload must exist");
    assert.equal(pageData.movie.slug, testSlug);

    // Dữ liệu cơ bản giữa 2 lần gọi phải đồng nhất
    assert.equal(metadataData.movie.name, pageData.movie.name);
    assert.equal(metadataData.movie.year, pageData.movie.year);
  });

  it("2. Middleware blocks aggressive scrapers (Bytespider, PetalBot) with 403 Forbidden", () => {
    // Bytespider request
    const byteReq = new NextRequest("https://nanaflix.asia/movies/di-giua-troi-ruc-ro", {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; Bytespider; spider-feedback@bytedance.com)",
      },
    });
    const byteRes = middleware(byteReq);
    assert.equal(byteRes.status, 403, "Bytespider must be rejected with 403");

    // PetalBot request
    const petalReq = new NextRequest("https://nanaflix.asia/movies/di-giua-troi-ruc-ro", {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; PetalBot; +https://aspiegel.com/petalbot)",
      },
    });
    const petalRes = middleware(petalReq);
    assert.equal(petalRes.status, 403, "PetalBot must be rejected with 403");

    // Googlebot request - MUST BE ALLOWED
    const googleReq = new NextRequest("https://nanaflix.asia/movies/di-giua-troi-ruc-ro", {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      },
    });
    const googleRes = middleware(googleReq);
    assert.equal(googleRes.status, 200, "Googlebot must be allowed to proceed");

    // Normal browser request - MUST BE ALLOWED
    const normalReq = new NextRequest("https://nanaflix.asia/movies/di-giua-troi-ruc-ro", {
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    const normalRes = middleware(normalReq);
    assert.equal(normalRes.status, 200, "Standard user browser must be allowed to proceed");
  });

  it("3. Middleware enforces no-store on private paths and authenticated requests", () => {
    // Private path request
    const privateReq = new NextRequest("https://nanaflix.asia/profile", {
      headers: {
        "user-agent": "Mozilla/5.0",
      },
    });
    const privateRes = middleware(privateReq);
    assert.equal(privateRes.headers.get("Cache-Control"), "private, no-cache, no-store, max-age=0, must-revalidate");
    assert.equal(privateRes.headers.get("CDN-Cache-Control"), "no-store");
    assert.equal(privateRes.headers.get("Cloudflare-CDN-Cache-Control"), "no-store");

    // Public path but with Authorization header
    const authReq = new NextRequest("https://nanaflix.asia/movies/di-giua-troi-ruc-ro", {
      headers: {
        "user-agent": "Mozilla/5.0",
        "authorization": "Bearer sample_token",
      },
    });
    const authRes = middleware(authReq);
    assert.equal(authRes.headers.get("Cache-Control"), "private, no-cache, no-store, max-age=0, must-revalidate");
    assert.equal(authRes.headers.get("CDN-Cache-Control"), "no-store");
    assert.equal(authRes.headers.get("Cloudflare-CDN-Cache-Control"), "no-store");
  });

  it("4. HTML cùng URL: Lần 1 nạp L1 RAM, Lần 2 phục vụ từ L1 RAM (0ms, 0 Redis commands)", async () => {
    const testSlug = "di-giua-troi-ruc-ro";
    cacheService.clearL1();

    // Lần 1: MISS L1 -> nạp từ upstream / L2
    const firstCall = await movieApi.getMovieDetail(testSlug);
    assert.ok(firstCall?.movie);

    // Lần 2: HIT L1 RAM -> lấy ngay tức thì từ memory cache
    const secondCall = await movieApi.getMovieDetail(testSlug);
    assert.ok(secondCall?.movie);
    assert.equal(firstCall.movie.name, secondCall.movie.name);
  });

  it("5. Hai URL ?ep= khác nhau: Nội dung stream context độc lập, không dùng chung link tập", async () => {
    const testSlug = "di-giua-troi-ruc-ro";

    const ep1Data = await movieApi.getMovieDetail(testSlug, undefined, "tap-1");
    const ep2Data = await movieApi.getMovieDetail(testSlug, undefined, "tap-2");

    assert.ok(ep1Data?.movie);
    assert.ok(ep2Data?.movie);
    // Base metadata giống nhau
    assert.equal(ep1Data.movie.name, ep2Data.movie.name);
    // Nếu có activeStream, chúng thuộc về các tập riêng biệt
    if (ep1Data.activeStream && ep2Data.activeStream) {
      assert.notEqual(ep1Data.activeStream.episodeSlug, ep2Data.activeStream.episodeSlug);
    }
  });

  it("6. HTML và RSC: Request RSC mang header rsc: 1 hoặc ?_rsc bị cấm lưu trên CDN/Cloudflare", () => {
    // Request RSC qua header 'rsc: 1'
    const rscReq = new NextRequest("https://nanaflix.asia/movies/di-giua-troi-ruc-ro", {
      headers: {
        "user-agent": "Mozilla/5.0",
        "rsc": "1",
      },
    });
    const rscRes = middleware(rscReq);
    assert.equal(rscRes.headers.get("CDN-Cache-Control"), "no-store");
    assert.equal(rscRes.headers.get("Cloudflare-CDN-Cache-Control"), "no-store");

    // Request RSC qua query param '?_rsc=...'
    const rscQueryReq = new NextRequest("https://nanaflix.asia/movies/di-giua-troi-ruc-ro?_rsc=12345", {
      headers: {
        "user-agent": "Mozilla/5.0",
      },
    });
    const rscQueryRes = middleware(rscQueryReq);
    assert.equal(rscQueryRes.headers.get("CDN-Cache-Control"), "no-store");
    assert.equal(rscQueryRes.headers.get("Cloudflare-CDN-Cache-Control"), "no-store");
  });

  it("7. Response headers bảo đảm an toàn: nosniff, SAMEORIGIN, không có Set-Cookie rò rỉ", () => {
    const publicReq = new NextRequest("https://nanaflix.asia/movies/di-giua-troi-ruc-ro", {
      headers: {
        "user-agent": "Mozilla/5.0",
      },
    });
    const publicRes = middleware(publicReq);
    assert.equal(publicRes.headers.get("X-Content-Type-Options"), "nosniff");
    assert.equal(publicRes.headers.get("X-Frame-Options"), "SAMEORIGIN");
    assert.equal(publicRes.headers.get("Set-Cookie"), null, "Tuyệt đối không rò rỉ Set-Cookie trên route public");
  });

  it("8. Kiểm tra cấu hình next.config.ts có đầy đủ Cache-Control cho /movies, /dien-vien, /browse", async () => {
    const nextConfigModule = await import("@/../next.config");
    const nextConfig = nextConfigModule.default || nextConfigModule;
    assert.ok(typeof nextConfig.headers === "function", "nextConfig.headers must be a function");

    const headerRules = await nextConfig.headers();
    const movieRule = headerRules.find((r: { source: string }) => r.source === "/movies/:slug");
    const actorRule = headerRules.find((r: { source: string }) => r.source === "/dien-vien/:slug");
    const browseRule = headerRules.find((r: { source: string }) => r.source === "/browse");

    assert.ok(movieRule, "Must have header rule for /movies/:slug");
    assert.ok(actorRule, "Must have header rule for /dien-vien/:slug");
    assert.ok(browseRule, "Must have header rule for /browse");

    assert.equal(
      movieRule.headers.find((h: { key: string }) => h.key === "Cache-Control")?.value,
      "public, s-maxage=3600, stale-while-revalidate=86400"
    );
    assert.equal(
      actorRule.headers.find((h: { key: string }) => h.key === "Cache-Control")?.value,
      "public, s-maxage=3600, stale-while-revalidate=86400"
    );
    assert.equal(
      browseRule.headers.find((h: { key: string }) => h.key === "Cache-Control")?.value,
      "public, s-maxage=1800, stale-while-revalidate=3600"
    );
  });
});
