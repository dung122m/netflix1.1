import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Movie Recommendations API & Deduplication Unit Tests", () => {
  it("1. Missing currentMovieSlug returns status 400", async () => {
    // Dynamic import to test Next.js route handler
    const { POST } = await import("@/app/api/movies/recommendations/route");
    const req = new Request("http://localhost/api/movies/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentMovieTitle: "No Slug Movie" }),
    });

    const res = await POST(req as unknown as import("next/server").NextRequest);
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.deepEqual(json.allMovies, []);
  });

  it("2. Valid movie payload returns recommendations with high scoring integrity", async () => {
    const { POST } = await import("@/app/api/movies/recommendations/route");
    const payload = {
      currentMovieSlug: "lat-mat-7-mot-dieu-uoc",
      currentMovieTitle: "Lật Mặt 7: Một Điều Ước",
      categories: [{ name: "Gia Đình", slug: "gia-dinh" }, { name: "Hài Hước", slug: "hai-huoc" }],
      countries: [{ name: "Việt Nam", slug: "viet-nam" }],
      primaryActor: "Quách Ngọc Tuyên",
      year: 2024,
      type: "single",
      tmdbId: 111111,
    };

    const req = new Request("http://localhost/api/movies/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req as any);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.allMovies));
    assert.ok(json.allMovies.length > 0 && json.allMovies.length <= 24);
    assert.equal(json.genreName, "Gia Đình");
    assert.equal(json.countryName, "Việt Nam");

    // All movies must not include current movie slug
    for (const m of json.allMovies) {
      assert.notEqual(m.slug, "lat-mat-7-mot-dieu-uoc", "Current movie must not appear in recommendations");
    }
  });

  it("3. In-flight concurrent requests for the same movie slug resolve consistently", async () => {
    const { POST } = await import("@/app/api/movies/recommendations/route");
    const payload = {
      currentMovieSlug: "dao-pho-va-piano",
      currentMovieTitle: "Đào, Phở và Piano",
      categories: [{ name: "Chiến Tranh", slug: "chien-tranh" }],
      countries: [{ name: "Việt Nam", slug: "viet-nam" }],
      year: 2024,
      type: "single",
    };

    const [res1, res2] = await Promise.all([
      POST(new Request("http://localhost/api/movies/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }) as unknown as import("next/server").NextRequest),
      POST(new Request("http://localhost/api/movies/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }) as unknown as import("next/server").NextRequest),
    ]);

    assert.equal(res1.status, 200);
    assert.equal(res2.status, 200);

    const json1 = await res1.json();
    const json2 = await res2.json();
    assert.equal(json1.allMovies.length, json2.allMovies.length);
    assert.equal(json1.genreName, json2.genreName);
  });

  it("4. Handles rare or empty categories without crashing", async () => {
    const { POST } = await import("@/app/api/movies/recommendations/route");
    const payload = {
      currentMovieSlug: "strange-unknown-movie-12345",
      currentMovieTitle: "Phim Kỳ Lạ Không Thể Loại",
      categories: [],
      countries: [],
      year: 1999,
    };

    const req = new Request("http://localhost/api/movies/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req as any);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.allMovies));
  });

  it("5. GET without slug returns status 400 with no-store", async () => {
    const { GET } = await import("@/app/api/movies/recommendations/route");
    const req = new Request("http://localhost/api/movies/recommendations", {
      method: "GET",
    });

    const res = await GET(req as unknown as import("next/server").NextRequest);
    assert.equal(res.status, 400);
    assert.ok(res.headers.get("Cache-Control")?.includes("no-store"));
  });

  it("6. GET with valid query returns 200 Edge-cacheable headers and matches POST canonical cache key", async () => {
    const { GET } = await import("@/app/api/movies/recommendations/route");
    const { getCanonicalRecommendationsCacheKey, parseRecommendationsQuery } = await import("@/services/movies/recommendations");

    const params = new URLSearchParams({
      slug: "lat-mat-7-mot-dieu-uoc",
      title: "Lật Mặt 7: Một Điều Ước",
      cats: "gia-dinh~Gia Đình,hai-huoc~Hài Hước",
      ctrs: "viet-nam~Việt Nam",
      actor: "Quách Ngọc Tuyên",
      year: "2024",
      type: "single",
      tmdbId: "111111",
    });

    const req = new Request(`http://localhost/api/movies/recommendations?${params.toString()}`, {
      method: "GET",
    });
    const res = await GET(req as unknown as import("next/server").NextRequest);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("Cache-Control"), "public, s-maxage=3600, stale-while-revalidate=86400");

    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.allMovies));
    assert.ok(json.allMovies.length > 0 && json.allMovies.length <= 24);

    const parsed = parseRecommendationsQuery(params);
    assert.equal(
      getCanonicalRecommendationsCacheKey(parsed),
      getCanonicalRecommendationsCacheKey({
        currentMovieSlug: "lat-mat-7-mot-dieu-uoc",
        currentMovieTitle: "Lật Mặt 7: Một Điều Ước",
        categories: [{ name: "Gia Đình", slug: "gia-dinh" }, { name: "Hài Hước", slug: "hai-huoc" }],
        countries: [{ name: "Việt Nam", slug: "viet-nam" }],
        primaryActor: "Quách Ngọc Tuyên",
        year: 2024,
        type: "single",
        tmdbId: 111111,
      })
    );
  });
});
