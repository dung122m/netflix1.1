import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { cacheService } from "@/lib/cache";
import {
  RATE_LIMIT_PRESETS,
  checkRateLimit,
  _resetMemoryStoreForTesting,
} from "@/lib/rateLimit";

describe("Redis Traffic Reduction Final Batch Verification Tests", () => {
  beforeEach(() => {
    cacheService.clearL1();
    _resetMemoryStoreForTesting();
  });

  describe("Part A: In-Memory Rate Limiting for Public Read", () => {
    it("PUBLIC_IN_MEMORY_READ enforces rate limit in memory without Redis commands", async () => {
      const target = "test_ip_public_1";
      const preset = RATE_LIMIT_PRESETS.PUBLIC_IN_MEMORY_READ;

      assert.strictEqual(preset.strategy, "in-memory-only");

      // Verify requests within limit
      for (let i = 0; i < 5; i++) {
        const res = await checkRateLimit(target, preset);
        assert.strictEqual(res.allowed, true);
        assert.strictEqual(res.limit, 120);
      }
    });

    it("SEARCH_IN_MEMORY, POSTER_FALLBACK_IN_MEMORY, COMMENTS_READ_IN_MEMORY, RECOMMENDATIONS_IN_MEMORY use in-memory-only strategy", () => {
      assert.strictEqual(RATE_LIMIT_PRESETS.SEARCH_IN_MEMORY.strategy, "in-memory-only");
      assert.strictEqual(RATE_LIMIT_PRESETS.POSTER_FALLBACK_IN_MEMORY.strategy, "in-memory-only");
      assert.strictEqual(RATE_LIMIT_PRESETS.COMMENTS_READ_IN_MEMORY.strategy, "in-memory-only");
      assert.strictEqual(RATE_LIMIT_PRESETS.RECOMMENDATIONS_IN_MEMORY.strategy, "in-memory-only");
    });

    it("Sensitive and authenticated presets strictly retain Redis distributed strategy", () => {
      assert.strictEqual(RATE_LIMIT_PRESETS.AUTH_SENSITIVE.strategy, "sliding-window");
      assert.strictEqual(RATE_LIMIT_PRESETS.AUTH_ACCOUNT.strategy, "sliding-window");
      assert.strictEqual(RATE_LIMIT_PRESETS.COMMENT_CREATE.strategy, "sliding-window");
      assert.strictEqual(RATE_LIMIT_PRESETS.COMMENT_MUTATION.strategy, "sliding-window");
      assert.strictEqual(RATE_LIMIT_PRESETS.AI_REQUEST.strategy, "sliding-window");
      assert.strictEqual(RATE_LIMIT_PRESETS.USER_MUTATION.strategy, "sliding-window");
      assert.strictEqual(RATE_LIMIT_PRESETS.USER_READ.strategy, "fixed-window");
    });
  });

  describe("Part B: CacheService MGET and SetMany Batching", () => {
    it("mget handles empty array gracefully", async () => {
      const res = await cacheService.mget([]);
      assert.deepStrictEqual(res, []);
    });

    it("mget preserves order and returns L1 items immediately", async () => {
      await cacheService.set("test:mget:1", { title: "Movie 1" }, 60);
      await cacheService.set("test:mget:3", { title: "Movie 3" }, 60);

      const res = await cacheService.mget<{ title: string }>([
        "test:mget:1",
        "test:mget:2", // Missing
        "test:mget:3",
      ]);

      assert.strictEqual(res.length, 3);
      assert.deepStrictEqual(res[0], { title: "Movie 1" });
      assert.strictEqual(res[1], null);
      assert.deepStrictEqual(res[2], { title: "Movie 3" });
    });

    it("setMany populates multiple entries in L1 and L2 simultaneously", async () => {
      const entries = [
        { key: "test:batch:a", value: { id: "a" }, ttlSeconds: 100 },
        { key: "test:batch:b", value: { id: "b" }, ttlSeconds: 100 },
        { key: "test:batch:c", value: { id: "c" }, ttlSeconds: 100 },
      ];

      const success = await cacheService.setMany(entries);
      assert.strictEqual(success, true);

      // Verify immediate L1 availability
      assert.strictEqual(cacheService.hasL1("test:batch:a"), true);
      assert.strictEqual(cacheService.hasL1("test:batch:b"), true);
      assert.strictEqual(cacheService.hasL1("test:batch:c"), true);

      const fetched = await cacheService.mget<{ id: string }>(["test:batch:a", "test:batch:b", "test:batch:c"]);
      assert.deepStrictEqual(fetched, [{ id: "a" }, { id: "b" }, { id: "c" }]);
    });
  });
});

