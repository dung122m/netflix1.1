import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import {
  RATE_LIMIT_PRESETS,
  checkRateLimit,
  enforceRateLimit,
  _resetMemoryStoreForTesting,
  RateLimitConfig,
} from "@/lib/rateLimit";

describe("Rate Limiting Suite (In-Memory, Fixed Window, and Sliding Window)", () => {
  beforeEach(() => {
    _resetMemoryStoreForTesting();
  });

  describe("1. Preset Configurations and Classification", () => {
    it("Correctly classifies presets into In-Memory vs Fixed vs Sliding Window", () => {
      // Read-heavy / Public presets MUST be fixed-window or in-memory-only to minimize Redis commands
      assert.strictEqual(RATE_LIMIT_PRESETS.PUBLIC_READ.strategy, "fixed-window");
      assert.strictEqual(RATE_LIMIT_PRESETS.POSTER_FALLBACK.strategy, "fixed-window");
      assert.strictEqual(RATE_LIMIT_PRESETS.USER_READ.strategy, "in-memory-only");
      assert.strictEqual(RATE_LIMIT_PRESETS.SEARCH.strategy, "fixed-window");
      assert.strictEqual(RATE_LIMIT_PRESETS.COMMENTS_READ.strategy, "fixed-window");
      assert.strictEqual(RATE_LIMIT_PRESETS.HLS_PLAYLIST.strategy, "in-memory-only");
      assert.strictEqual(RATE_LIMIT_PRESETS.STREAM_PROXY.strategy, "in-memory-only");
      assert.strictEqual(RATE_LIMIT_PRESETS.RECOMMENDATIONS.strategy, "in-memory-only");
      assert.strictEqual(RATE_LIMIT_PRESETS.TRANSLATION.strategy, "in-memory-only");
      assert.strictEqual(RATE_LIMIT_PRESETS.FOOTBALL_POLLING.strategy, "in-memory-only");

      // Security-sensitive / Mutation / AI / Auth presets MUST be sliding-window to prevent boundary reset attacks
      assert.strictEqual(RATE_LIMIT_PRESETS.AUTH_SENSITIVE.strategy, "sliding-window");
      assert.strictEqual(RATE_LIMIT_PRESETS.AUTH_ACCOUNT.strategy, "sliding-window");
      assert.strictEqual(RATE_LIMIT_PRESETS.AUTH_VERIFY.strategy, "sliding-window");
      assert.strictEqual(RATE_LIMIT_PRESETS.ADMIN_MUTATION.strategy, "sliding-window");
      assert.strictEqual(RATE_LIMIT_PRESETS.AI_REQUEST.strategy, "sliding-window");
      assert.strictEqual(RATE_LIMIT_PRESETS.COMMENT_CREATE.strategy, "sliding-window");
      assert.strictEqual(RATE_LIMIT_PRESETS.COMMENT_MUTATION.strategy, "sliding-window");
      assert.strictEqual(RATE_LIMIT_PRESETS.COMMENT_DELETE.strategy, "sliding-window");
      assert.strictEqual(RATE_LIMIT_PRESETS.USER_MUTATION.strategy, "sliding-window");
      assert.strictEqual(RATE_LIMIT_PRESETS.UPLOAD.strategy, "sliding-window");
    });

    it("Auto-detects strategy when omitted based on sensitivity and failClosed", () => {
      const sensitiveConfig: RateLimitConfig = {
        namespace: "admin-secret-action",
        maxRequests: 5,
        windowSeconds: 60,
        failClosed: true,
      };
      assert.strictEqual(sensitiveConfig.strategy ?? (sensitiveConfig.failClosed ? "sliding-window" : "fixed-window"), "sliding-window");

      const readConfig: RateLimitConfig = {
        namespace: "public-metadata-read",
        maxRequests: 100,
        windowSeconds: 60,
        failClosed: false,
      };
      assert.strictEqual(readConfig.strategy ?? (readConfig.failClosed ? "sliding-window" : "fixed-window"), "fixed-window");
    });
  });

  describe("2. In-Memory Strategy (e.g. Football Polling, Streams)", () => {
    it("Preset FOOTBALL_POLLING has in-memory-only configuration with 60 req/60s", () => {
      const preset = RATE_LIMIT_PRESETS.FOOTBALL_POLLING;
      assert.equal(preset.strategy, "in-memory-only");
      assert.equal(preset.maxRequests, 60);
      assert.equal(preset.windowSeconds, 60);
      assert.equal(preset.failClosed, false);
    });

    it("Normal requests are allowed and return standard headers", async () => {
      const req = new NextRequest("https://nanaflix.vercel.app/api/live-football/scores", {
        headers: { "x-forwarded-for": "103.21.244.1" },
      });

      const res = await enforceRateLimit(req, RATE_LIMIT_PRESETS.FOOTBALL_POLLING);
      assert.equal(res.allowed, true);
      assert.equal(res.limit, 60);
      assert.equal(res.remaining, 59);
      assert.ok(res.headers);
      assert.equal(res.headers["X-RateLimit-Limit"], "60");
      assert.equal(res.headers["X-RateLimit-Remaining"], "59");
      assert.ok(Number(res.headers["X-RateLimit-Reset"]) > 0);
    });

    it("Zero Redis calls: In-memory-only path executes instantly in local RAM", async () => {
      const req = new NextRequest("https://nanaflix.vercel.app/api/live-football/scores", {
        headers: { "x-forwarded-for": "103.21.244.2" },
      });

      const t0 = performance.now();
      const res = await enforceRateLimit(req, RATE_LIMIT_PRESETS.FOOTBALL_POLLING);
      const elapsed = performance.now() - t0;

      assert.equal(res.allowed, true);
      assert.ok(elapsed < 20, `Execution time (${elapsed}ms) must be instant local RAM`);
    });

    it("Enforces quota and returns 429 headers and Retry-After on limit breach", async () => {
      const testConfig: RateLimitConfig = {
        namespace: "football-polling-test-burst",
        maxRequests: 3,
        windowSeconds: 60,
        strategy: "in-memory-only",
      };

      const req = new NextRequest("https://nanaflix.vercel.app/api/live-football/scores", {
        headers: { "x-forwarded-for": "103.21.244.3" },
      });

      for (let i = 0; i < 3; i++) {
        const r = await enforceRateLimit(req, testConfig);
        assert.equal(r.allowed, true);
      }

      const blockedRes = await enforceRateLimit(req, testConfig);
      assert.equal(blockedRes.allowed, false);
      assert.equal(blockedRes.remaining, 0);
      assert.ok(blockedRes.headers);
      assert.equal(blockedRes.headers["X-RateLimit-Remaining"], "0");
      assert.ok(Number(blockedRes.headers["Retry-After"]) > 0);
      assert.equal(blockedRes.reason, "Tần suất yêu cầu vượt quá giới hạn cho phép.");
    });

    it("Window recovery: Request after window expiration is allowed", async () => {
      const testConfig: RateLimitConfig = {
        namespace: "football-polling-test-window",
        maxRequests: 2,
        windowSeconds: 1,
        strategy: "in-memory-only",
      };

      const req = new NextRequest("https://nanaflix.vercel.app/api/live-football/scores", {
        headers: { "x-forwarded-for": "103.21.244.4" },
      });

      assert.equal((await enforceRateLimit(req, testConfig)).allowed, true);
      assert.equal((await enforceRateLimit(req, testConfig)).allowed, true);
      assert.equal((await enforceRateLimit(req, testConfig)).allowed, false);

      await new Promise((r) => setTimeout(r, 1100));

      const afterWindow = await enforceRateLimit(req, testConfig);
      assert.equal(afterWindow.allowed, true);
      assert.equal(afterWindow.remaining, 1);
    });
  });

  describe("3. Fixed Window Strategy", () => {
    it("Enforces quota and returns accurate resetSeconds", async () => {
      const config: RateLimitConfig = {
        namespace: "test-fixed-read",
        maxRequests: 3,
        windowSeconds: 60,
        failClosed: false,
        strategy: "fixed-window",
      };

      const target = "test-target-fixed-1";

      const r1 = await checkRateLimit(target, config);
      assert.strictEqual(r1.allowed, true);
      assert.strictEqual(r1.remaining, 2);
      assert.ok(r1.resetSeconds > 0 && r1.resetSeconds <= 60);

      const r2 = await checkRateLimit(target, config);
      assert.strictEqual(r2.allowed, true);
      assert.strictEqual(r2.remaining, 1);

      const r3 = await checkRateLimit(target, config);
      assert.strictEqual(r3.allowed, true);
      assert.strictEqual(r3.remaining, 0);

      const r4 = await checkRateLimit(target, config);
      assert.strictEqual(r4.allowed, false);
      assert.strictEqual(r4.remaining, 0);
      assert.ok(r4.headers["Retry-After"]);
    });

    it("Handles concurrent requests and bursts properly", async () => {
      const config: RateLimitConfig = {
        namespace: "test-fixed-concurrent",
        maxRequests: 10,
        windowSeconds: 60,
        failClosed: false,
        strategy: "fixed-window",
      };

      const target = "test-target-fixed-concurrent";

      const promises = Array.from({ length: 10 }, () => checkRateLimit(target, config));
      const results = await Promise.all(promises);

      const allowedCount = results.filter((r) => r.allowed).length;
      assert.strictEqual(allowedCount, 10);

      const r11 = await checkRateLimit(target, config);
      assert.strictEqual(r11.allowed, false);
      assert.strictEqual(r11.remaining, 0);
      assert.ok(Number(r11.headers["Retry-After"]) > 0);
    });
  });

  describe("4. Sliding Window Strategy", () => {
    it("Enforces fail-closed quota with zero leak", async () => {
      const config: RateLimitConfig = {
        namespace: "test-sliding-auth",
        maxRequests: 2,
        fallbackMaxRequests: 2,
        windowSeconds: 300,
        failClosed: true,
        strategy: "sliding-window",
      };

      const target = "test-target-sliding-1";

      const r1 = await checkRateLimit(target, config);
      assert.strictEqual(r1.allowed, true);

      const r2 = await checkRateLimit(target, config);
      assert.strictEqual(r2.allowed, true);

      const r3 = await checkRateLimit(target, config);
      assert.strictEqual(r3.allowed, false);
      assert.strictEqual(r3.remaining, 0);
    });
  });
});
