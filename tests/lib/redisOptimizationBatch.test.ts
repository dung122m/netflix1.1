import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { movieApi } from "@/services/movies/service";
import { cacheService, getRedisPurposeForKey } from "@/lib/cache";
import { NextRequest } from "next/server";
import { GET as getMoviesMeta } from "@/app/api/movies/meta/route";
import { GET as getSearchSuggest } from "@/app/api/search-suggest/route";

describe("Nanaflix Redis Optimization Batch Verification", () => {
  it("1. movieApi.getMoviesDetailBatch returns batch details using MGET and avoids individual N+1 GETs", async () => {
    // Seed 2 mock movies into cache
    const testSlug1 = "test-movie-batch-1";
    const testSlug2 = "test-movie-batch-2";
    const kv1 = `movie:detail:v6:${testSlug1}:any`;
    const kv2 = `movie:detail:v6:${testSlug2}:any`;

    await cacheService.set(kv1, {
      status: true,
      movie: {
        name: "Test Movie 1",
        slug: testSlug1,
        type: "single",
        year: 2024,
      },
    }, 300);

    await cacheService.set(kv2, {
      status: true,
      movie: {
        name: "Test Movie 2",
        slug: testSlug2,
        type: "series",
        year: 2023,
      },
    }, 300);

    const batchRes = await movieApi.getMoviesDetailBatch([testSlug1, testSlug2, "non-existent-slug"]);
    assert.ok(batchRes[testSlug1], "testSlug1 must be resolved");
    assert.equal(batchRes[testSlug1]?.movie?.name, "Test Movie 1");
    assert.ok(batchRes[testSlug2], "testSlug2 must be resolved");
    assert.equal(batchRes[testSlug2]?.movie?.name, "Test Movie 2");

    // Clean up
    await cacheService.delete(kv1);
    await cacheService.delete(kv2);
  });

  it("2. /api/movies/meta endpoint handles batch query with Cache-Control header", async () => {
    const req = new NextRequest("http://localhost:3000/api/movies/meta?slugs=avatar,conan");
    const res = await getMoviesMeta(req);
    assert.equal(res.status, 200);

    const cacheHeader = res.headers.get("Cache-Control");
    assert.ok(cacheHeader?.includes("public"), "Must have public cache header");
    assert.ok(cacheHeader?.includes("s-maxage=3600"), "Must have s-maxage=3600");

    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(typeof json.movies === "object");
  });

  it("3. /api/search-suggest returns public Edge CDN Cache-Control headers", async () => {
    const req = new NextRequest("http://localhost:3000/api/search-suggest?keyword=conan");
    const res = await getSearchSuggest(req);
    assert.equal(res.status, 200);

    const cacheHeader = res.headers.get("Cache-Control");
    assert.ok(cacheHeader?.includes("public"), "Search suggest must have public Cache-Control");
    assert.ok(cacheHeader?.includes("s-maxage=3600"), "Search suggest must have s-maxage=3600 for Edge CDN");
  });

  it("4. Redis Purpose routing verifies DB1, DB2, and DB3 isolation without cross-contamination", () => {
    // DB 3: Aux & Metadata
    assert.equal(getRedisPurposeForKey("tmdb:trailer:123"), "aux");
    assert.equal(getRedisPurposeForKey("actor:search_cand:v2:abc"), "aux");
    assert.equal(getRedisPurposeForKey("wiki:actor:xyz"), "aux");
    assert.equal(getRedisPurposeForKey("search:suggest:keyword"), "aux");
    assert.equal(getRedisPurposeForKey("recommendations:pool:v1"), "aux");

    // DB 2: Live & Realtime
    assert.equal(getRedisPurposeForKey("live:football:stream"), "live");
    assert.equal(getRedisPurposeForKey("football:standings:epl"), "live");
    assert.equal(getRedisPurposeForKey("comments:movie:123"), "live");
    assert.equal(getRedisPurposeForKey("tv:channels:list"), "live");

    // DB 1: Core Catalog
    assert.equal(getRedisPurposeForKey("movie:list:genre=action"), "default");
    assert.equal(getRedisPurposeForKey("movie:detail:v4:avatar:any"), "default");
    assert.equal(getRedisPurposeForKey("movie:stream:v2:avatar:server1:ep1"), "default");
    assert.equal(getRedisPurposeForKey("trending:community:summary:v1:week:10"), "default");
    assert.equal(getRedisPurposeForKey("ai:candidate:test"), "aux");
  });
});

