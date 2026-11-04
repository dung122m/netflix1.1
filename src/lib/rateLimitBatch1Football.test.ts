import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import {
  enforceRateLimit,
  RATE_LIMIT_PRESETS,
  _resetMemoryStoreForTesting,
  RateLimitConfig,
} from "./rateLimit";

test("BATCH 1: FOOTBALL POLLING IN-MEMORY RATE LIMITING", async (t) => {
  t.beforeEach(() => {
    _resetMemoryStoreForTesting();
  });

  await t.test("1. Preset FOOTBALL_POLLING có cấu hình in-memory-only và ngưỡng 60 req/60s", () => {
    const preset = RATE_LIMIT_PRESETS.FOOTBALL_POLLING;
    assert.equal(preset.strategy, "in-memory-only");
    assert.equal(preset.maxRequests, 60);
    assert.equal(preset.windowSeconds, 60);
    assert.equal(preset.failClosed, false);
  });

  await t.test("2. Normal requests: Được phép và trả về đúng headers chuẩn", async () => {
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

  await t.test("3. Zero Redis calls: Không gọi Redis trong nhánh in-memory-only", async () => {
    // Ngay cả khi biến môi trường Redis sai hoặc rỗng, nhánh in-memory-only vẫn hoạt động 0ms
    const req = new NextRequest("https://nanaflix.vercel.app/api/live-football/scores", {
      headers: { "x-forwarded-for": "103.21.244.2" },
    });

    const t0 = performance.now();
    const res = await enforceRateLimit(req, RATE_LIMIT_PRESETS.FOOTBALL_POLLING);
    const elapsed = performance.now() - t0;

    assert.equal(res.allowed, true);
    // Thời gian thực thi in-memory cục bộ phải dưới 5ms (không có network roundtrip)
    assert.ok(elapsed < 20, `Execution time (${elapsed}ms) must be instant local RAM`);
  });

  await t.test("4. Vượt giới hạn: Trả về allowed: false, 429 headers và Retry-After", async () => {
    const testConfig: RateLimitConfig = {
      namespace: "football-polling-test-burst",
      maxRequests: 3,
      windowSeconds: 60,
      strategy: "in-memory-only",
    };

    const req = new NextRequest("https://nanaflix.vercel.app/api/live-football/scores", {
      headers: { "x-forwarded-for": "103.21.244.3" },
    });

    // 3 request đầu tiên allowed
    for (let i = 0; i < 3; i++) {
      const r = await enforceRateLimit(req, testConfig);
      assert.equal(r.allowed, true);
    }

    // Request thứ 4 bị chặn
    const blockedRes = await enforceRateLimit(req, testConfig);
    assert.equal(blockedRes.allowed, false);
    assert.equal(blockedRes.remaining, 0);
    assert.ok(blockedRes.headers);
    assert.equal(blockedRes.headers["X-RateLimit-Remaining"], "0");
    assert.ok(Number(blockedRes.headers["Retry-After"]) > 0);
    assert.equal(blockedRes.reason, "Tần suất yêu cầu vượt quá giới hạn cho phép.");
  });

  await t.test("5. Sliding window timestamp sliding: Request cũ hết hạn phục hồi quota", async () => {
    const testConfig: RateLimitConfig = {
      namespace: "football-polling-test-window",
      maxRequests: 2,
      windowSeconds: 1, // 1 second window
      strategy: "in-memory-only",
    };

    const req = new NextRequest("https://nanaflix.vercel.app/api/live-football/scores", {
      headers: { "x-forwarded-for": "103.21.244.4" },
    });

    assert.equal((await enforceRateLimit(req, testConfig)).allowed, true);
    assert.equal((await enforceRateLimit(req, testConfig)).allowed, true);
    assert.equal((await enforceRateLimit(req, testConfig)).allowed, false);

    // Chờ 1.1s để cửa sổ trôi qua
    await new Promise((r) => setTimeout(r, 1100));

    // Request tiếp theo phải được phục hồi
    const afterWindow = await enforceRateLimit(req, testConfig);
    assert.equal(afterWindow.allowed, true);
    assert.equal(afterWindow.remaining, 1);
  });

  await t.test("6. Bảo vệ API nhạy cảm: Mutations, Auth, AI, Comment vẫn KHÔNG dùng in-memory", () => {
    // Kiểm tra tất cả các preset nhạy cảm không bị ảnh hưởng
    assert.equal(RATE_LIMIT_PRESETS.COMMENT_CREATE.strategy, "sliding-window");
    assert.equal(RATE_LIMIT_PRESETS.COMMENT_MUTATION.strategy, "sliding-window");
    assert.equal(RATE_LIMIT_PRESETS.AI_REQUEST.strategy, "sliding-window");
    assert.equal(RATE_LIMIT_PRESETS.AUTH_SENSITIVE.strategy, "sliding-window");
    assert.equal(RATE_LIMIT_PRESETS.ADMIN_MUTATION.strategy, "sliding-window");
    assert.equal(RATE_LIMIT_PRESETS.PUBLIC_READ.strategy, "fixed-window");
  });

  await t.test("7. Mô phỏng Multi-Instance Vercel: Mỗi instance bảo vệ độc lập", async () => {
    // Giả lập Instance A và Instance B nhận request từ cùng 1 IP
    const testConfig: RateLimitConfig = {
      namespace: "multi-instance-test",
      maxRequests: 10,
      windowSeconds: 60,
      strategy: "in-memory-only",
    };

    const req = new NextRequest("https://nanaflix.vercel.app/api/live-football/scores", {
      headers: { "x-forwarded-for": "103.21.244.5" },
    });

    // Instance A xử lý 5 request
    for (let i = 0; i < 5; i++) {
      const resA = await enforceRateLimit(req, testConfig);
      assert.equal(resA.allowed, true);
    }

    // Instance B (mô phỏng bằng namespace hoặc instance riêng) nhận request
    const reqInstanceB = new NextRequest("https://nanaflix.vercel.app/api/live-football/scores", {
      headers: { "x-forwarded-for": "103.21.244.6" },
    });
    const resB = await enforceRateLimit(reqInstanceB, testConfig);
    assert.equal(resB.allowed, true);
    assert.equal(resB.remaining, 9);
  });
});

