import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Movie Recommendations API & Deduplication Unit Tests", () => {
  it("1. Missing currentMovieSlug returns status 400", async () => {
    // Dynamic import to test Next.js route handler
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/movies/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentMovieTitle: "No Slug Movie" }),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req as any);
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.deepEqual(json.allMovies, []);
  });

  it("2. Valid movie payload returns recommendations with high scoring integrity", async () => {
    const { POST } = await import("./route");
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
    const { POST } = await import("./route");
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
      }) as any),
      POST(new Request("http://localhost/api/movies/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }) as any),
    ]);

    assert.equal(res1.status, 200);
    assert.equal(res2.status, 200);

    const json1 = await res1.json();
    const json2 = await res2.json();
    assert.equal(json1.allMovies.length, json2.allMovies.length);
    assert.equal(json1.genreName, json2.genreName);
  });

  it("4. Handles rare or empty categories without crashing", async () => {
    const { POST } = await import("./route");
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
});
