import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/live-tv/proxy/route";
import { generateStreamToken, computeStreamId } from "@/lib/streamToken";
import {
  evaluatePlaylistRefreshGate,
  resetPlaylistGateForTesting,
} from "@/services/live/shared/proxyGate";

describe("Live TV Proxy — Two-Tier Token & Rate Gate Tests", () => {
  const fakeTvSegmentUrl = "https://cdn.example.com/hls/tv/vtv3/segment-001.ts";
  const fakeTvPlaylistUrl = "https://cdn.example.com/hls/tv/vtv3/index.m3u8";

  test("1. Returns 400 when url parameter is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/live-tv/proxy");
    const res = await GET(req);
    assert.equal(res.status, 400);
  });

  test("2. Rejects SSRF target URL with 403 Forbidden", async () => {
    const req = new NextRequest("http://localhost:3000/api/live-tv/proxy?url=http://127.0.0.1:3000/admin");
    const res = await GET(req);
    assert.equal(res.status, 403);
  });

  test("3. Media segment (.ts) without token returns 403 Forbidden immediately", async () => {
    const req = new NextRequest(`http://localhost:3000/api/live-tv/proxy?url=${encodeURIComponent(fakeTvSegmentUrl)}`);
    const res = await GET(req);
    assert.equal(res.status, 403);
    const text = await res.text();
    assert.ok(text.includes("Missing required stream token parameters"));
  });

  test("4. Media segment with tampered token returns 403 Forbidden", async () => {
    const sid = computeStreamId(fakeTvSegmentUrl);
    const req = new NextRequest(
      `http://localhost:3000/api/live-tv/proxy?url=${encodeURIComponent(fakeTvSegmentUrl)}&st=tampered_signature&exp=9999999999&sid=${sid}&v=1`
    );
    const res = await GET(req);
    assert.equal(res.status, 403);
    const text = await res.text();
    assert.ok(text.includes("Invalid or expired stream token"));
  });

  test("5. Media segment with valid token succeeds and serves content", async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => {
        return new Response(new Uint8Array([0x47, 0x40, 0x00, 0x10]), {
          status: 200,
          headers: { "Content-Type": "video/mp2t" },
        });
      };

      const signed = generateStreamToken({
        targetUrl: fakeTvSegmentUrl,
        ttlSeconds: 120,
      });

      const req = new NextRequest(
        `http://localhost:3000/api/live-tv/proxy?url=${encodeURIComponent(fakeTvSegmentUrl)}&st=${encodeURIComponent(signed.token)}&exp=${signed.exp}&sid=${encodeURIComponent(signed.sid)}&v=${signed.v}`
      );
      const res = await GET(req);
      assert.equal(res.status, 200);
      assert.equal(res.headers.get("Content-Type"), "video/mp2t");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("6. Playlist request rewrites child URLs and attaches Signed Stream Tokens", async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => {
        const manifest = [
          "#EXTM3U",
          "#EXT-X-VERSION:3",
          "#EXT-X-TARGETDURATION:2",
          "#EXTINF:2.0,",
          "segment-001.ts",
          "#EXTINF:2.0,",
          "segment-002.ts",
        ].join("\n");
        return new Response(manifest, {
          status: 200,
          headers: { "Content-Type": "application/vnd.apple.mpegurl" },
        });
      };

      const req = new NextRequest(`http://localhost:3000/api/live-tv/proxy?url=${encodeURIComponent(fakeTvPlaylistUrl)}`);
      const res = await GET(req);
      assert.equal(res.status, 200);

      const body = await res.text();
      assert.ok(body.includes("/api/live-tv/proxy?url="));
      assert.ok(body.includes("&st="));
      assert.ok(body.includes("&exp="));
      assert.ok(body.includes("&sid="));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  describe("evaluatePlaylistRefreshGate: In-Memory Two-Tier Verification", () => {
    test("7. Unauthenticated request always requests Redis sync", () => {
      const decision = evaluatePlaylistRefreshGate({
        clientKey: "client_unauth",
        hasValidToken: false,
      });
      assert.equal(decision.allowed, true);
      assert.equal(decision.syncToRedis, true);
    });

    test("8. Authenticated request: 1st syncs with Redis, 2nd-5th bypass Redis (0 Redis calls)", () => {
      resetPlaylistGateForTesting();
      const clientKey = "client_auth_test";
      const baseNow = 100000;

      // 1st request -> establishes distributed tracking
      const d1 = evaluatePlaylistRefreshGate({ clientKey, hasValidToken: true, now: baseNow });
      assert.equal(d1.allowed, true);
      assert.equal(d1.syncToRedis, true);

      // 2nd request (2 seconds later) -> In-memory allowed, BYPASSES Redis!
      const d2 = evaluatePlaylistRefreshGate({ clientKey, hasValidToken: true, now: baseNow + 2000 });
      assert.equal(d2.allowed, true);
      assert.equal(d2.syncToRedis, false);

      // 3rd request (4 seconds later) -> In-memory allowed, BYPASSES Redis!
      const d3 = evaluatePlaylistRefreshGate({ clientKey, hasValidToken: true, now: baseNow + 4000 });
      assert.equal(d3.allowed, true);
      assert.equal(d3.syncToRedis, false);

      // 4th request (6 seconds later) -> In-memory allowed, BYPASSES Redis!
      const d4 = evaluatePlaylistRefreshGate({ clientKey, hasValidToken: true, now: baseNow + 6000 });
      assert.equal(d4.allowed, true);
      assert.equal(d4.syncToRedis, false);

      // 5th request (8 seconds later) -> In-memory allowed, BYPASSES Redis!
      const d5 = evaluatePlaylistRefreshGate({ clientKey, hasValidToken: true, now: baseNow + 8000 });
      assert.equal(d5.allowed, true);
      assert.equal(d5.syncToRedis, false);
    });

    test("9. Authenticated request triggers Redis sync after interval or stride", () => {
      resetPlaylistGateForTesting();
      const clientKey = "client_sync_test";
      const baseNow = 200000;

      // Request 1: sync
      evaluatePlaylistRefreshGate({ clientKey, hasValidToken: true, now: baseNow });

      // Request 2-5: bypass
      for (let i = 1; i < 5; i++) {
        const res = evaluatePlaylistRefreshGate({ clientKey, hasValidToken: true, now: baseNow + i * 2000 });
        assert.equal(res.syncToRedis, false);
      }

      // Request 6: reaches STRIDE (6th request) -> syncToRedis = true
      const d6 = evaluatePlaylistRefreshGate({ clientKey, hasValidToken: true, now: baseNow + 10000 });
      assert.equal(d6.allowed, true);
      assert.equal(d6.syncToRedis, true);
    });

    test("10. Local burst abuse (> 8 requests in 3s) is blocked locally with 429", () => {
      resetPlaylistGateForTesting();
      const spammerKey = "spammer_ip";
      const baseNow = 300000;

      // Send 8 requests rapidly
      for (let i = 0; i < 8; i++) {
        const res = evaluatePlaylistRefreshGate({ clientKey: spammerKey, hasValidToken: true, now: baseNow + i * 100 });
        assert.equal(res.allowed, true);
      }

      // 9th request in under 3s -> rejected locally
      const d9 = evaluatePlaylistRefreshGate({ clientKey: spammerKey, hasValidToken: true, now: baseNow + 1000 });
      assert.equal(d9.allowed, false);
      assert.equal(d9.syncToRedis, false);
      assert.ok(d9.reason?.includes("Tần suất làm mới playlist quá nhanh"));
    });
  });
});

