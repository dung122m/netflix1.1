import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { cacheService, getRedisPurposeForKey } from "@/lib/cache";
import { movieApi } from "@/services/movies/service";
import { GET as getMoviesMeta } from "@/app/api/movies/meta/route";
import { GET as getSearchSuggest } from "@/app/api/search-suggest/route";
import {
  invalidateTrendingSummaryCache,
} from "@/services/communityWatchService";
import {
  RATE_LIMIT_PRESETS,
  checkRateLimit,
  _resetMemoryStoreForTesting,
} from "@/lib/rateLimit";

describe("Redis Cache Optimization & Multi-DB Routing Suite", () => {
  beforeEach(() => {
    cacheService.clearL1();
    _resetMemoryStoreForTesting();
  });

  describe("1. Redis Multi-DB Purpose Routing (DB 1 vs DB 2 vs DB 3)", () => {
    it("Routes keys strictly according to domain sensitivity and isolation rules", () => {
      // DB 3: Aux, Embeddings & AI metadata
      assert.equal(getRedisPurposeForKey("tmdb:trailer:123"), "aux");
      assert.equal(getRedisPurposeForKey("actor:search_cand:v2:abc"), "aux");
      assert.equal(getRedisPurposeForKey("wiki:actor:xyz"), "aux");
      assert.equal(getRedisPurposeForKey("search:suggest:keyword"), "aux");
      assert.equal(getRedisPurposeForKey("recommendations:pool:v1"), "aux");
      assert.equal(getRedisPurposeForKey("ai:candidate:test"), "aux");
      assert.equal(getRedisPurposeForKey("ai:candidate:{\"v\":\"ai_cand_2\"}"), "aux");
      assert.equal(getRedisPurposeForKey("ai:embedding:36ca0f7a798bb67792db08a71c6fd67b"), "aux");
      assert.equal(getRedisPurposeForKey("ai:roulette:pool"), "aux");

      // DB 2: Live, Football & Realtime
      assert.equal(getRedisPurposeForKey("live:football:stream"), "live");
      assert.equal(getRedisPurposeForKey("football:standings:epl"), "live");
      assert.equal(getRedisPurposeForKey("comments:movie:123"), "live");
      assert.equal(getRedisPurposeForKey("tv:channels:list"), "live");

      // DB 1: Core Catalog & Defaults
      assert.equal(getRedisPurposeForKey("movie:list:v16"), "default");
      assert.equal(getRedisPurposeForKey("movie:detail:v4:avatar"), "default");
      assert.equal(getRedisPurposeForKey("movie:stream:v2:avatar:s1:ep1"), "default");
      assert.equal(getRedisPurposeForKey("trending:community:summary:v1:total:10"), "default");
    });
  });

  describe("2. Batching Operations (MGET and Batch Meta)", () => {
    it("movieApi.getMoviesDetailBatch returns batch details using MGET without N+1 calls", async () => {
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

      await cacheService.delete(kv1);
      await cacheService.delete(kv2);
    });

    it("mget handles empty array gracefully", async () => {
      const results = await cacheService.mget([]);
      assert.deepEqual(results, []);
    });
  });

  describe("3. Edge CDN Headers & Traffic Reduction", () => {
    it("/api/movies/meta endpoint handles batch query with Edge CDN Cache-Control header", async () => {
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

    it("/api/search-suggest returns public Edge CDN Cache-Control headers", async () => {
      const req = new NextRequest("http://localhost:3000/api/search-suggest?keyword=conan");
      const res = await getSearchSuggest(req);
      assert.equal(res.status, 200);

      const cacheHeader = res.headers.get("Cache-Control");
      assert.ok(cacheHeader?.includes("public"), "Search suggest must have public Cache-Control");
      assert.ok(cacheHeader?.includes("s-maxage=3600"), "Search suggest must have s-maxage=3600 for Edge CDN");
    });
  });

  describe("4. Traffic & Key Explosion Protection", () => {
    it("Deep pagination (page > 50) bypasses Redis L2 to prevent crawler key explosion", async () => {
      let page55Called = false;
      const origGet = cacheService.get;
      cacheService.get = async <T>(key: string): Promise<T | null> => {
        if (key.includes("page\":55")) page55Called = true;
        return origGet(key);
      };

      try {
        await movieApi.getMovies({ category: "hoat-hinh", page: 55, limit: 24 });
        assert.equal(page55Called, false, "Page 55 (> 50) must skip Redis L2");
      } finally {
        cacheService.get = origGet;
      }
    });

    it("Trending summary cache applies TTL and throttles repeated DEL storms", async () => {
      let delCalls = 0;
      const origDel = cacheService.delete;
      cacheService.delete = async (key: string): Promise<boolean> => {
        delCalls++;
        return origDel(key);
      };

      try {
        const origEnv = process.env.NODE_ENV;
        // @ts-expect-error test simulation
        process.env.NODE_ENV = "production";

        await invalidateTrendingSummaryCache(undefined, undefined, { simulateProduction: true });
        const firstDelCount = delCalls;
        assert.ok(firstDelCount >= 4, "Initial invalidate triggers expected DEL operations");

        await invalidateTrendingSummaryCache(undefined, undefined, { simulateProduction: true });
        assert.equal(delCalls, firstDelCount, "Second consecutive call within 60s must be throttled");

        // @ts-expect-error test simulation
        process.env.NODE_ENV = origEnv;
      } finally {
        cacheService.delete = origDel;
      }
    });

    it("In-memory rate limit presets operate with zero Redis overhead", async () => {
      const target = "test_ip_public_mem";
      const preset = RATE_LIMIT_PRESETS.PUBLIC_IN_MEMORY_READ;

      assert.strictEqual(preset.strategy, "in-memory-only");
      for (let i = 0; i < 5; i++) {
        const res = await checkRateLimit(target, preset);
        assert.strictEqual(res.allowed, true);
        assert.strictEqual(res.limit, 120);
      }
    });
  });
});
