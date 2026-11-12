/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { movieApi } from "@/services/movies/service";
import { normalizeMovie, buildMovieDescriptionFallback } from "@/lib/movieMedia";
import { getPaginationPages } from "@/lib/pagination";
import {
  cacheService,
  _setMockRedisClientForTesting,
  _resetRedisClientsForTesting,
} from "@/lib/cache";

describe("Browse & Catalog Pagination Integrity (Regression Suite)", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    _resetRedisClientsForTesting();
    cacheService.clearL1();
  });

  it("normalizeMovie and buildMovieDescriptionFallback handle string director/country/category without crashing (page=774 bug)", () => {
    const rawNguonCItem = {
      slug: "cuoc-chien-diep-vien",
      name: "Cuộc Chiến Điệp Viên",
      original_name: "Built for War",
      director: "Conor Allyn",
      casts: "Frank Grillo, Conor Allyn",
      category: "Hành Động",
      country: "Âu Mỹ",
      year: 2017,
      time: "95",
      quality: "FHD",
      lang: "Vietsub",
      description: "",
      content: "",
    };

    const normalized = normalizeMovie(rawNguonCItem);
    assert.equal(normalized.slug, "cuoc-chien-diep-vien");
    assert.deepEqual(normalized.director, ["Conor Allyn"]);
    assert.ok(normalized.description.includes("Đạo diễn: Conor Allyn."));

    const fallback = buildMovieDescriptionFallback({
      origin_name: "Built for War",
      year: 2017,
      category: "Hành Động" as unknown as Array<{ name?: string }>,
      country: "Mỹ" as unknown as Array<{ name?: string }>,
      director: "Conor Allyn, Jane Doe" as unknown as string[],
    });
    assert.ok(fallback.includes("Thể loại: Hành Động."));
    assert.ok(fallback.includes("Quốc gia: Mỹ."));
    assert.ok(fallback.includes("Đạo diễn: Conor Allyn, Jane Doe."));
  });

  it("recovers from NguonC 429 rate-limit & sub-page loss on deep page (page=779 bug) and does not poison Redis KV", async () => {
    const kvWrites: string[] = [];
    const mockRedis = {
      get: async () => null,
      set: async (key: string) => {
        kvWrites.push(key);
        return "OK";
      },
      del: async () => 0,
      mget: async () => [],
      pipeline: () => ({ set: () => {}, exec: async () => [] }),
    };
    _setMockRedisClientForTesting(mockRedis as any, "default");
    cacheService.clearL1();

    const makeMovies = (page: number, prefix = "movie") =>
      Array.from({ length: 10 }, (_, idx) => {
        const globalIdx = (page - 1) * 10 + idx + 1;
        return {
          slug: `${prefix}-${page}-${idx}-${globalIdx}`,
          name: `Phim ${globalIdx}`,
          original_name: `Movie ${globalIdx}`,
          thumb_url: `https://image.tmdb.org/t/p/w500/p${globalIdx}.jpg`,
          poster_url: `https://image.tmdb.org/t/p/w1280/b${globalIdx}.jpg`,
          director: "Test Director",
          year: 2022,
          modified: new Date(2023, 0, 1, 0, 0, idx).toISOString(),
        };
      });

    const p1868Hits = { count: 0 };

    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (url.includes("phimapi.com")) {
        return new Response(
          JSON.stringify({
            data: {
              items: [],
              params: { pagination: { totalItems: 17257, totalItemsPerPage: 24, currentPage: 779, totalPages: 720 } },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.includes("films/danh-sach/phim-le")) {
        const pageNum = Number(new URL(url).searchParams.get("page") || "1");
        if (pageNum === 1868) {
          p1868Hits.count++;
          if (p1868Hits.count === 1) {
            return new Response("Rate Limited", { status: 429 });
          }
        }
        return new Response(
          JSON.stringify({
            items: makeMovies(pageNum),
            paginate: { current_page: pageNum, total_page: 1871, total_items: 18702, items_per_page: 10 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response("Not Found", { status: 404 });
    }) as typeof fetch;

    const res = await movieApi.getMovies({
      type: "phim-le",
      page: 779,
      limit: 24,
      posterEnrichmentBudgetMs: 0,
    });

    assert.equal(p1868Hits.count, 2, "Failed NguonC 429 sub-page should retry once");
    assert.equal(res.items.length, 24, "Deep page 779 must render full 24 movies after retry recovery");
    assert.equal(res.pagination.currentPage, 779);
    assert.equal(res.pagination.totalPages, 780);
    assert.equal(kvWrites.length, 0, "Deep page > 50 should not write to KV");
  });

  it("backfills adjacent-page overlap and skips Redis KV write when sub-page permanently fails", async () => {
    const kvWrites: string[] = [];
    const mockRedis = {
      get: async () => null,
      set: async (key: string) => {
        kvWrites.push(key);
        return "OK";
      },
      del: async () => 0,
      mget: async () => [],
      pipeline: () => ({ set: () => {}, exec: async () => [] }),
    };
    _setMockRedisClientForTesting(mockRedis as any, "default");
    cacheService.clearL1();

    // Test low page (page = 5 <= 50) where KV caching normally runs, simulating persistent 500 on one NguonC sub-page
    // Page 5 with limit 24 needs NguonC pages [10, 11, 12] (offsets 96..120)
    const makeItems = (page: number) =>
      Array.from({ length: 10 }, (_, idx) => ({
        slug: `item-${page}-${idx}`,
        name: `Title ${page}-${idx}`,
        thumb_url: `https://image.tmdb.org/t/p/w500/${page}_${idx}.jpg`,
        poster_url: `https://image.tmdb.org/t/p/w1280/${page}_${idx}.jpg`,
        year: 2024,
        category: [{ slug: "tam-ly", name: "Tâm Lý" }],
        modified: new Date(2024, 0, 1, 0, 0, idx).toISOString(),
      }));

    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (url.includes("phimapi.com")) {
        return new Response(
          JSON.stringify({
            data: {
              items: [],
              params: { pagination: { totalItems: 100, totalItemsPerPage: 24, currentPage: 5, totalPages: 4 } },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.includes("phim.nguonc.com")) {
        const pageNum = Number(new URL(url).searchParams.get("page") || "1");
        if (pageNum === 10) {
          return new Response("Server Error", { status: 500 });
        }
        return new Response(
          JSON.stringify({
            items: makeItems(pageNum),
            paginate: { current_page: pageNum, total_page: 200, total_items: 2000, items_per_page: 10 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response("Not Found", { status: 404 });
    }) as typeof fetch;

    const res = await movieApi.getMovies({
      category: "tam-ly",
      page: 5,
      limit: 24,
      posterEnrichmentBudgetMs: 0,
    });

    assert.equal(
      res.items.length,
      24,
      "Even when NguonC page 10 stays 500, backfill from subsequent pages should fill 24 items"
    );
    assert.equal(
      kvWrites.length,
      0,
      "Partially degraded response must NOT be persisted to Redis KV cache"
    );
  });

  it("search cross-page deduplication does not drop page 2 items on subsequent uncached fetches", async () => {
    cacheService.clearL1();

    const makePageItems = (page: number) =>
      Array.from({ length: 24 }, (_, idx) => ({
        slug: `love-p${page}-${idx}`,
        name: `Tình Yêu Tập ${page}-${idx}`,
        origin_name: `Love ${page}-${idx}`,
        thumb_url: `https://image.tmdb.org/t/p/w500/love_${page}_${idx}.jpg`,
        poster_url: `https://image.tmdb.org/t/p/w1280/love_${page}_${idx}.jpg`,
        year: 2024,
        modified: { time: new Date(2024, 0, page, 0, idx).toISOString() },
      }));

    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes("phimapi.com")) {
        const p = Number(new URL(url).searchParams.get("page") || "1");
        return new Response(
          JSON.stringify({
            data: {
              items: makePageItems(p),
              params: { pagination: { totalItems: 100, totalItemsPerPage: 24, currentPage: p, totalPages: 5 } },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.includes("phim.nguonc.com")) {
        return new Response(
          JSON.stringify({
            items: [],
            paginate: { current_page: 1, total_page: 1, total_items: 0, items_per_page: 10 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("Not Found", { status: 404 });
    }) as typeof fetch;

    const p2First = await movieApi.getMovies({
      keyword: "tình yêu",
      page: 2,
      limit: 24,
      skipKvCache: true,
      posterEnrichmentBudgetMs: 0,
    });
    assert.equal(p2First.items.length, 24);

    // Clear L1 cache entry simulating TTL eviction while queryMetadataCache still holds seenSlugsByPage
    cacheService.clearL1();
    const p2Second = await movieApi.getMovies({
      keyword: "tình yêu",
      page: 2,
      limit: 24,
      skipKvCache: true,
      posterEnrichmentBudgetMs: 0,
    });
    assert.equal(p2Second.items.length, 24, "Re-fetching search page 2 must NOT exclude page 2's own slugs");
  });

  it("getPaginationPages clamps invalid, negative, and out-of-range page counts", () => {
    assert.deepEqual(getPaginationPages(1, 0), [1]);
    assert.deepEqual(getPaginationPages(Number.NaN, 10), [1, 2, 3, 4, 5, "...", 10]);
    assert.deepEqual(getPaginationPages(999, 780), [1, "...", 776, 777, 778, 779, 780]);
    assert.deepEqual(getPaginationPages(774, 780), [1, "...", 773, 774, 775, "...", 780]);
  });
});

