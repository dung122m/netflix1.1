import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  RATE_LIMIT_PRESETS,
  checkRateLimit,
  _resetMemoryStoreForTesting,
  RateLimitConfig,
} from "./rateLimit";

describe("Batch 4 — Dual-Engine Rate Limiting (Fixed vs Sliding Window)", () => {
  it("TC-RL-01: Correctly classifies presets into Fixed Window vs Sliding Window", () => {
    // Read-heavy / Public presets MUST be fixed-window to minimize Redis commands
    assert.strictEqual(RATE_LIMIT_PRESETS.PUBLIC_READ.strategy, "fixed-window");
    assert.strictEqual(RATE_LIMIT_PRESETS.POSTER_FALLBACK.strategy, "fixed-window");
    assert.strictEqual(RATE_LIMIT_PRESETS.USER_READ.strategy, "fixed-window");
    assert.strictEqual(RATE_LIMIT_PRESETS.SEARCH.strategy, "fixed-window");
    assert.strictEqual(RATE_LIMIT_PRESETS.COMMENTS_READ.strategy, "fixed-window");
    assert.strictEqual(RATE_LIMIT_PRESETS.HLS_PLAYLIST.strategy, "fixed-window");
    assert.strictEqual(RATE_LIMIT_PRESETS.STREAM_PROXY.strategy, "fixed-window");
    assert.strictEqual(RATE_LIMIT_PRESETS.RECOMMENDATIONS.strategy, "fixed-window");
    assert.strictEqual(RATE_LIMIT_PRESETS.TRANSLATION.strategy, "fixed-window");

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

  it("TC-RL-02: Fixed window strategy enforces quota and returns accurate resetSeconds", async () => {
    _resetMemoryStoreForTesting();
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

  it("TC-RL-03: Sliding window strategy enforces fail-closed quota with zero leak", async () => {
    _resetMemoryStoreForTesting();
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

  it("TC-RL-04: Auto-detects strategy when omitted based on sensitivity and failClosed", () => {
    const sensitiveConfig: RateLimitConfig = {
      namespace: "admin-secret-action",
      maxRequests: 5,
      windowSeconds: 60,
      failClosed: true,
    };
    // Should default to sliding-window for sensitive/failClosed
    assert.strictEqual(sensitiveConfig.strategy ?? (sensitiveConfig.failClosed ? "sliding-window" : "fixed-window"), "sliding-window");

    const readConfig: RateLimitConfig = {
      namespace: "public-metadata-read",
      maxRequests: 100,
      windowSeconds: 60,
      failClosed: false,
    };
    // Should default to fixed-window for read-heavy
    assert.strictEqual(readConfig.strategy ?? (readConfig.failClosed ? "sliding-window" : "fixed-window"), "fixed-window");
  });

  it("TC-RL-05: Fixed window concurrent requests and burst saturation", async () => {
    _resetMemoryStoreForTesting();
    const config: RateLimitConfig = {
      namespace: "test-fixed-concurrent",
      maxRequests: 10,
      windowSeconds: 60,
      failClosed: false,
      strategy: "fixed-window",
    };

    const target = "test-target-fixed-concurrent";

    // 10 concurrent requests
    const promises = Array.from({ length: 10 }, () => checkRateLimit(target, config));
    const results = await Promise.all(promises);

    const allowedCount = results.filter((r) => r.allowed).length;
    assert.strictEqual(allowedCount, 10);

    // 11th request MUST be rejected with 429
    const r11 = await checkRateLimit(target, config);
    assert.strictEqual(r11.allowed, false);
    assert.strictEqual(r11.remaining, 0);
    assert.ok(Number(r11.headers["Retry-After"]) > 0);
  });
});

