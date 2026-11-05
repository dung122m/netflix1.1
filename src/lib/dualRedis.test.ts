import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isLiveKey, sanitizeKey } from "./cache";
import { getSafeRedisCredentials } from "./redisEnvGuard";

describe("Nanaflix Dual Redis Multi-Account Architecture", () => {
  it("1. isLiveKey correctly classifies Live sports, matches, and TV keys", () => {
    assert.equal(isLiveKey("live:football:matches:v1"), true);
    assert.equal(isLiveKey("football:standings:v1:pl"), true);
    assert.equal(isLiveKey("football:fixtures:v1:cl"), true);
    assert.equal(isLiveKey("match:12345"), true);
    assert.equal(isLiveKey("tv:channels:list"), true);

    // Non-live keys must return false (route to DB 1)
    assert.equal(isLiveKey("wiki:actor:tran_thanh"), false);
    assert.equal(isLiveKey("movie:synopsis:v1:avatar"), false);
    assert.equal(isLiveKey("tmdb:trending:week:20"), false);
    assert.equal(isLiveKey("custom:key:test"), false);
  });

  it("2. sanitizeKey formats keys cleanly", () => {
    assert.equal(sanitizeKey("  live:football:matches  "), "live:football:matches");
    assert.equal(sanitizeKey("wiki actor name"), "wiki_actor_name");
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
});
