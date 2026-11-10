import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { isPosterEmptyOrBroken, isPhimimgOrEmpty } from "@/hooks/useMoviePosterFallback";
import { GET } from "@/app/api/movie-poster-fallback/route";
import { NextRequest } from "next/server";

describe("Batch 2: Movie Poster Fallback Optimization Tests", () => {
  test("1. isPosterEmptyOrBroken identifies genuinely empty / placeholder images", () => {
    assert.equal(isPosterEmptyOrBroken(null), true);
    assert.equal(isPosterEmptyOrBroken(undefined), true);
    assert.equal(isPosterEmptyOrBroken(""), true);
    assert.equal(isPosterEmptyOrBroken("   "), true);
    assert.equal(isPosterEmptyOrBroken("null"), true);
    assert.equal(isPosterEmptyOrBroken("undefined"), true);
    assert.equal(isPosterEmptyOrBroken("/default-poster.jpg"), true);
    assert.equal(isPosterEmptyOrBroken("/default-thumb.jpg"), true);
  });

  test("2. isPosterEmptyOrBroken preserves valid CDNs (phimimg, tmdb, nguonc) and does NOT trigger eager fallback", () => {
    // Valid phimimg.com image must NOT be considered broken
    assert.equal(isPosterEmptyOrBroken("https://phimimg.com/upload/vod/20240101/poster.jpg"), false);
    assert.equal(isPosterEmptyOrBroken("https://image.tmdb.org/t/p/w500/xyz.jpg"), false);
    assert.equal(isPosterEmptyOrBroken("https://img.nguonc.com/poster.jpg"), false);
    assert.equal(isPosterEmptyOrBroken("/images/custom-poster.jpg"), false);
  });

  test("3. isPhimimgOrEmpty backwards compatibility alias preserves valid images", () => {
    assert.equal(isPhimimgOrEmpty("https://phimimg.com/upload/vod/20240101/poster.jpg"), false);
    assert.equal(isPhimimgOrEmpty(null), true);
    assert.equal(isPhimimgOrEmpty("/default-poster.jpg"), true);
  });

  test("4. /api/movie-poster-fallback sets HTTP Cache-Control header on responses", async () => {
    // Missing params -> 400
    const reqEmpty = new NextRequest("http://localhost:3000/api/movie-poster-fallback");
    const resEmpty = await GET(reqEmpty);
    assert.equal(resEmpty.status, 400);

    // Valid query with mocked fetch
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => {
        return new Response(
          JSON.stringify({
            results: [
              {
                poster_path: "/sample_poster.jpg",
                backdrop_path: "/sample_backdrop.jpg",
                vote_count: 500,
                popularity: 15.5,
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      };

      const req = new NextRequest("http://localhost:3000/api/movie-poster-fallback?slug=test-movie-cache&title=Test+Movie");
      const res = await GET(req);
      assert.equal(res.status, 200);

      const cacheControl = res.headers.get("Cache-Control");
      assert.ok(cacheControl, "Response must include Cache-Control header");
      assert.ok(cacheControl.includes("public"), "Cache-Control must be public");
      assert.ok(cacheControl.includes("max-age="), "Cache-Control must specify max-age");

      // Verify L1 cache hit also includes Cache-Control
      const resL1 = await GET(req);
      assert.equal(resL1.status, 200);
      const dataL1 = await resL1.json();
      assert.equal(dataL1.source, "l1-cache");
      assert.ok(resL1.headers.get("Cache-Control")?.includes("public"));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

