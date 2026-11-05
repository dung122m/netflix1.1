import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isLiveKey, sanitizeKey, cacheService } from "./cache";
import { getSafeRedisCredentials } from "./redisEnvGuard";
import { getEmbeddingCacheKey } from "@/services/aiVectorService";

describe("Nanaflix Dual Redis Multi-Account Architecture", () => {
  it("1. isLiveKey correctly classifies Live sports, matches, TV channels, and athlete profiles", () => {
    // Priority 1 Keys (Live Redis - Account 2)
    assert.equal(isLiveKey("live:football:matches:v1"), true);
    assert.equal(isLiveKey("football:standings:v1:pl"), true);
    assert.equal(isLiveKey("football:fixtures:v1:cl"), true);
    assert.equal(isLiveKey("match:12345"), true);
    assert.equal(isLiveKey("tv:channels:list"), true);
    assert.equal(isLiveKey("football:athlete:252607"), true);
    assert.equal(isLiveKey("football:athlete:125824"), true);

    // Priority 2 Keys (Default Redis - Account 1: Movies, Comments, AI Embeddings)
    assert.equal(isLiveKey("comments:movie:tham-tu-lung-danh-conan"), false);
    assert.equal(isLiveKey("comments:movie:avatar-2"), false);
    assert.equal(isLiveKey("ai:embedding:8f3c4d5e6a7b"), false);
    assert.equal(isLiveKey("wiki:actor:tran_thanh"), false);
    assert.equal(isLiveKey("movie:synopsis:v1:avatar"), false);
    assert.equal(isLiveKey("tmdb:trending:week:20"), false);
    assert.equal(isLiveKey("custom:key:test"), false);
  });

  it("2. sanitizeKey formats keys cleanly", () => {
    assert.equal(sanitizeKey("  live:football:matches  "), "live:football:matches");
    assert.equal(sanitizeKey("wiki actor name"), "wiki_actor_name");
    assert.equal(sanitizeKey("comments:movie:conan "), "comments:movie:conan");
  });

  it("3. getSafeRedisCredentials respects purpose isolation", () => {
    const origEnv = { ...process.env };
    try {
      process.env.APP_ENV = "production";
      process.env.UPSTASH_REDIS_REST_URL = "https://db1-movies.upstash.io";
      process.env.UPSTASH_REDIS_REST_TOKEN = "token_db1";
      process.env.UPSTASH_REDIS_LIVE_REST_URL = "https://db2-live.upstash.io";
      process.env.UPSTASH_REDIS_LIVE_REST_TOKEN = "token_db2";

      // Default purpose -> DB 1
      const defaultCreds = getSafeRedisCredentials({ purpose: "default" });
      assert.notEqual(defaultCreds, null);
      assert.equal(defaultCreds?.url, "https://db1-movies.upstash.io");
      assert.equal(defaultCreds?.token, "token_db1");

      // Live purpose -> DB 2
      const liveCreds = getSafeRedisCredentials({ purpose: "live" });
      assert.notEqual(liveCreds, null);
      assert.equal(liveCreds?.url, "https://db2-live.upstash.io");
      assert.equal(liveCreds?.token, "token_db2");

      // Live purpose without LIVE credentials -> falls back to default DB 1
      delete process.env.UPSTASH_REDIS_LIVE_REST_URL;
      delete process.env.UPSTASH_REDIS_LIVE_REST_TOKEN;
      const fallbackLiveCreds = getSafeRedisCredentials({ purpose: "live" });
      assert.notEqual(fallbackLiveCreds, null);
      assert.equal(fallbackLiveCreds?.url, "https://db1-movies.upstash.io");
    } finally {
      process.env = origEnv;
    }
  });

  it("4. AI Vector Embedding cache key helper generates compact deterministic key", () => {
    const key1 = getEmbeddingCacheKey("Phim hành động kịch tính Mỹ");
    const key2 = getEmbeddingCacheKey("phim hành động kịch tính mỹ");
    const key3 = getEmbeddingCacheKey("Phim tình cảm lãng mạn Hàn Quốc");

    assert.ok(key1.startsWith("ai:embedding:"));
    assert.equal(key1, key2, "Embedding key must be case-insensitive and trimmed");
    assert.notEqual(key1, key3, "Different queries must produce different keys");
    assert.equal(isLiveKey(key1), false, "AI Embedding must route to DB 1 (Default Redis)");
  });

  it("5. cacheService fetchOrSet and delete correctly handle Priority 1 and Priority 2 keys", async () => {
    cacheService.clearL1();

    // Priority 1: Live TV
    let tvCalls = 0;
    const tv1 = await cacheService.fetchOrSet("tv:channels:list", async () => {
      tvCalls++;
      return { updatedAt: "21:00", categories: ["VTV"], channels: [] };
    }, 300);
    const tv2 = await cacheService.fetchOrSet("tv:channels:list", async () => {
      tvCalls++;
      return { updatedAt: "21:01", categories: ["HTV"], channels: [] };
    }, 300);

    assert.equal(tvCalls, 1, "fetchOrSet must hit L1 cache on second call");
    assert.deepEqual(tv1, tv2);

    // Invalidation
    await cacheService.delete("tv:channels:list");
    assert.equal(cacheService.hasL1("tv:channels:list"), false);

    // Priority 2: Comments
    let commentCalls = 0;
    const c1 = await cacheService.fetchOrSet("comments:movie:conan", async () => {
      commentCalls++;
      return [{ id: "c1", content: "Phim hay" }];
    }, 60);
    const c2 = await cacheService.fetchOrSet("comments:movie:conan", async () => {
      commentCalls++;
      return [{ id: "c2", content: "Tập mới" }];
    }, 60);

    assert.equal(commentCalls, 1, "Comments fetchOrSet must hit cache on second call");
    assert.deepEqual(c1, c2);

    // Invalidation on comment mutation
    await cacheService.delete("comments:movie:conan");
    assert.equal(cacheService.hasL1("comments:movie:conan"), false);
  });
});
