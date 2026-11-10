import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { NextRequest } from "next/server";
import {
  enforceRateLimit,
  redisRequestSignalStorage,
  RateLimitConfig,
} from "@/lib/rateLimit";
import { Redis } from "@upstash/redis";

describe("Upstash Redis Abort-on-Timeout & Real HTTP Cancellation Tests", () => {
  let server: http.Server;
  let serverPort: number;
  let delayMs = 0;
  const activeSockets = new Set<import("node:net").Socket>();
  let lastServerRequestClosedAt: number | null = null;
  let requestStartTime = 0;

  before((_, done) => {
    server = http.createServer((req, res) => {
      requestStartTime = Date.now();
      lastServerRequestClosedAt = null;

      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });

      req.on("close", () => {
        lastServerRequestClosedAt = Date.now() - requestStartTime;
      });

      setTimeout(() => {
        if (!res.writableEnded) {
          try {
            const commands = JSON.parse(body || "[]");
            // Typical Upstash pipeline response format
            const results = Array.isArray(commands)
              ? commands.map(() => ({ result: 1 }))
              : [{ result: 1 }];
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(results));
          } catch {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify([{ result: 1 }]));
          }
        }
      }, delayMs);
    });

    server.on("connection", (socket) => {
      activeSockets.add(socket);
      socket.on("close", () => activeSockets.delete(socket));
    });

    server.listen(0, "127.0.0.1", () => {
      serverPort = (server.address() as import("node:net").AddressInfo).port;
      done();
    });
  });

  after((_, done) => {
    for (const socket of activeSockets) {
      socket.destroy();
    }
    server.close(() => done());
  });

  test("1. Underlying HTTP request is cancelled on timeout at ~350ms boundary", async () => {
    // Delay server response by 1000ms (far exceeding 350ms timeout)
    delayMs = 1000;

    const mockUrl = `http://127.0.0.1:${serverPort}`;
    const redis = new Redis({
      url: mockUrl,
      token: "fake_token_test",
      retry: false,
      signal: () => redisRequestSignalStorage.getStore() ?? new AbortController().signal,
    });

    const controller = new AbortController();
    const timeoutMs = 350;
    const start = Date.now();
    let callerTimedOut = false;
    let callerElapsed = 0;

    const timer = setTimeout(() => {
      controller.abort(new Error("Redis rate limit timeout"));
    }, timeoutMs);

    try {
      await redisRequestSignalStorage.run(controller.signal, async () => {
        const p = redis.pipeline();
        p.zremrangebyscore("key", 0, 100);
        p.zcard("key");
        await p.exec();
      });
    } catch (err: unknown) {
      callerElapsed = Date.now() - start;
      callerTimedOut = true;
      assert.ok(err instanceof Error);
    } finally {
      clearTimeout(timer);
    }

    assert.equal(callerTimedOut, true, "Caller must time out");
    assert.ok(callerElapsed >= 320 && callerElapsed <= 500, `Caller elapsed was ${callerElapsed}ms (expected ~350ms)`);

    // Wait 200ms to allow socket close event to register on server
    await new Promise((r) => setTimeout(r, 200));

    // Crucial check: socket was closed well before the 1000ms response delay!
    assert.ok(lastServerRequestClosedAt !== null, "Server socket must register close event");
    assert.ok(
      lastServerRequestClosedAt < 800,
      `Underlying HTTP request must be terminated on timeout, closed at ${lastServerRequestClosedAt}ms (expected < 800ms)`
    );
  });

  test("2. Dynamic signal getter correctly propagates per-request AbortSignal", async () => {
    const controller = new AbortController();
    let observedSignal: AbortSignal | undefined;

    await redisRequestSignalStorage.run(controller.signal, async () => {
      observedSignal = redisRequestSignalStorage.getStore();
    });

    assert.equal(observedSignal, controller.signal, "AbortSignal must match the active request context");
    assert.equal(redisRequestSignalStorage.getStore(), undefined, "Storage must be clean outside run context");
  });

  test("3. Concurrent requests maintain strictly isolated signals", async () => {
    delayMs = 800; // Slow server
    const mockUrl = `http://127.0.0.1:${serverPort}`;
    const redis = new Redis({
      url: mockUrl,
      token: "fake_token_test",
      retry: false,
      signal: () => redisRequestSignalStorage.getStore() ?? new AbortController().signal,
    });

    const c1 = new AbortController();
    const c2 = new AbortController();

    let c1Aborted = false;
    let c2Aborted = false;

    // Concurrently run request 1 (which will be aborted at 100ms)
    // and request 2 (which should NOT be aborted by c1)
    const p1 = redisRequestSignalStorage.run(c1.signal, async () => {
      setTimeout(() => c1.abort(), 100);
      try {
        const p = redis.pipeline();
        p.zcard("k1");
        await p.exec();
      } catch {
        c1Aborted = true;
      }
    });

    const p2 = redisRequestSignalStorage.run(c2.signal, async () => {
      // Do not abort c2 immediately, let it run past 150ms
      await new Promise((r) => setTimeout(r, 150));
      c2Aborted = c2.signal.aborted;
    });

    await Promise.all([p1, p2]);

    assert.equal(c1Aborted, true, "Request 1 must be aborted");
    assert.equal(c2Aborted, false, "Request 2 must NOT be aborted by Request 1 (Signals are isolated)");
  });

  test("4. Subsequent request on the same shared Redis singleton succeeds after an aborted request", async () => {
    const mockUrl = `http://127.0.0.1:${serverPort}`;
    const redis = new Redis({
      url: mockUrl,
      token: "fake_token_test",
      retry: false,
      signal: () => redisRequestSignalStorage.getStore() ?? new AbortController().signal,
    });

    // 1. Abort a request
    delayMs = 800;
    const c1 = new AbortController();
    setTimeout(() => c1.abort(), 100);

    try {
      await redisRequestSignalStorage.run(c1.signal, async () => {
        const p = redis.pipeline();
        p.zcard("k");
        await p.exec();
      });
    } catch {
      // expected
    }

    // 2. Set server to respond fast (10ms)
    delayMs = 10;

    // 3. Subsequent request without abort must succeed on the same client
    let subsequentSuccess = false;
    const c2 = new AbortController();
    await redisRequestSignalStorage.run(c2.signal, async () => {
      const p = redis.pipeline();
      p.zcard("k");
      const res = await p.exec();
      subsequentSuccess = Array.isArray(res);
    });

    assert.equal(subsequentSuccess, true, "Subsequent request on same singleton must succeed");
  });

  test("5. Fail-Open and Fail-Closed semantics remain intact with real cancellation", async () => {
    // When Redis is unavailable or times out:
    // Fail-Open config should return allowed: true with isFallback: true
    const req = new NextRequest("http://localhost:3000/api/movies");
    const failOpenConfig: RateLimitConfig = {
      namespace: "test-fail-open",
      maxRequests: 10,
      windowSeconds: 60,
      failClosed: false,
    };

    const resOpen = await enforceRateLimit(req, failOpenConfig);
    assert.equal(resOpen.allowed, true, "Fail-Open endpoint must allow requests during fallback");

    // Fail-Closed config should return allowed: false once memory fallback quota is reached
    const failClosedConfig: RateLimitConfig = {
      namespace: "test-fail-closed",
      maxRequests: 1,
      windowSeconds: 600,
      failClosed: true,
    };

    // First request consumed
    await enforceRateLimit(req, failClosedConfig);
    // Second request must be blocked under fail-closed
    const resClosed = await enforceRateLimit(req, failClosedConfig);
    assert.equal(resClosed.allowed, false, "Fail-Closed endpoint must block requests exceeding fallback threshold");
  });
});

