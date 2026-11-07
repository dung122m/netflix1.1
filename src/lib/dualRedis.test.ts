import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isLiveKey, getRedisPurposeForKey, sanitizeKey, cacheService } from "./cache";
import { getSafeRedisCredentials } from "./redisEnvGuard";
import { getEmbeddingCacheKey } from "@/services/aiVectorService";

describe("Nanaflix Triple Redis Multi-Account Architecture", () => {
  it("1. getRedisPurposeForKey correctly routes keys to DB 1 (Catalog), DB 2 (Realtime/Live), and DB 3 (Aux/TMDb)", () => {
    // DB 3: Aux / Metadata (fitting-swift-159224)
    assert.equal(getRedisPurposeForKey("tmdb:trending:week:20"), "aux");
    assert.equal(getRedisPurposeForKey("tmdb:credits:v1:movie:123"), "aux");
    assert.equal(getRedisPurposeForKey("actor:bio:v4:tran_thanh"), "aux");
    assert.equal(getRedisPurposeForKey("wiki:actor:tran_thanh"), "aux");
    assert.equal(getRedisPurposeForKey("foryou:v3:pool"), "aux");
    assert.equal(getRedisPurposeForKey("movie:rec:v13:avatar"), "aux");
    assert.equal(getRedisPurposeForKey("movie:recommendations:v13:123"), "aux");
    assert.equal(getRedisPurposeForKey("recommendations:pool:v1"), "aux");
    assert.equal(getRedisPurposeForKey("rec:avatar"), "aux");
    assert.equal(getRedisPurposeForKey("search:suggest:conan"), "aux");
    assert.equal(getRedisPurposeForKey("movie:synopsis:v1:avatar"), "aux");
    assert.equal(getRedisPurposeForKey("ai:candidate:v2:action"), "aux");
    assert.equal(getRedisPurposeForKey("ai:embedding:test"), "aux");

    // DB 2: Live / Realtime & Community (composed-squid-82374)
    assert.equal(getRedisPurposeForKey("live:football:matches:v1"), "live");
    assert.equal(getRedisPurposeForKey("football:standings:v1:pl"), "live");
    assert.equal(getRedisPurposeForKey("football:fixtures:v1:cl"), "live");
    assert.equal(getRedisPurposeForKey("match:12345"), "live");
    assert.equal(getRedisPurposeForKey("tv:channels:list"), "live");
    assert.equal(getRedisPurposeForKey("football:athlete:252607"), "live");
    assert.equal(getRedisPurposeForKey("athlete:profile:123"), "live");
    assert.equal(getRedisPurposeForKey("comments:movie:tham-tu-lung-danh-conan"), "live");
    assert.equal(getRedisPurposeForKey("comments:movie:avatar-2"), "live");
    assert.equal(getRedisPurposeForKey("user:handoff:user_12345"), "live");
    assert.equal(getRedisPurposeForKey("handoff:device:user_12345"), "live");
    assert.equal(getRedisPurposeForKey("sec:rl:production:user:123"), "live");
    assert.equal(getRedisPurposeForKey("rl:user:123"), "live");

    // DB 1: Core Movie Catalog (finer-ray-284585)
    assert.equal(getRedisPurposeForKey("movie:list:v16:phim-le"), "default");
    assert.equal(getRedisPurposeForKey("movie:detail:v4:avatar"), "default");
    assert.equal(getRedisPurposeForKey("movie:stream:v2:avatar:server:ep1"), "default");
    assert.equal(getRedisPurposeForKey("trending:community:summary:v1:week:10"), "default");
    assert.equal(getRedisPurposeForKey("custom:key:test"), "default");

    // Backward compatibility helper isLiveKey
    assert.equal(isLiveKey("live:football:matches:v1"), true);
    assert.equal(isLiveKey("tmdb:trending:week:20"), true);
    assert.equal(isLiveKey("movie:list:v16:phim-le"), false);
  });

  it("2. sanitizeKey formats keys cleanly", () => {
    assert.equal(sanitizeKey("  live:football:matches  "), "live:football:matches");
    assert.equal(sanitizeKey("wiki actor name"), "wiki_actor_name");
    assert.equal(sanitizeKey("comments:movie:conan "), "comments:movie:conan");
  });

  it("3. getSafeRedisCredentials respects 3-way purpose isolation", () => {
    const origEnv = { ...process.env };
    try {
      process.env.APP_ENV = "production";
      process.env.UPSTASH_REDIS_REST_URL = "https://db1-movies.upstash.io";
      process.env.UPSTASH_REDIS_REST_TOKEN = "token_db1";
      process.env.UPSTASH_REDIS_LIVE_REST_URL = "https://db2-live.upstash.io";
      process.env.UPSTASH_REDIS_LIVE_REST_TOKEN = "token_db2";
      process.env.UPSTASH_REDIS_AUX_REST_URL = "https://db3-aux.upstash.io";
      process.env.UPSTASH_REDIS_AUX_REST_TOKEN = "token_db3";

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

      // Aux purpose -> DB 3
      const auxCreds = getSafeRedisCredentials({ purpose: "aux" });
      assert.notEqual(auxCreds, null);
      assert.equal(auxCreds?.url, "https://db3-aux.upstash.io");
      assert.equal(auxCreds?.token, "token_db3");

      // Aux purpose without AUX credentials -> falls back to default DB 1
      delete process.env.UPSTASH_REDIS_AUX_REST_URL;
      delete process.env.UPSTASH_REDIS_AUX_REST_TOKEN;
      const fallbackAuxCreds = getSafeRedisCredentials({ purpose: "aux" });
      assert.notEqual(fallbackAuxCreds, null);
      assert.equal(fallbackAuxCreds?.url, "https://db1-movies.upstash.io");
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
    assert.equal(getRedisPurposeForKey(key1), "aux", "AI Embedding must route to DB 3 (Aux Redis)");
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
