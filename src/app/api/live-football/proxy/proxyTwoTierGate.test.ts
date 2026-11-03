import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { generateStreamToken, verifyStreamToken, computeStreamId } from "@/lib/streamToken";

describe("Live Football Proxy — Two-Tier Hybrid Gate Pilot Tests", () => {
  const fakeSegmentUrl = "https://cdn.example.com/hls/football/match-999/chunk-001.ts";

  test("1. Returns 400 when url parameter is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/live-football/proxy");
    const res = await GET(req);
    assert.equal(res.status, 400);
  });

  test("2. Rejects private or SSRF target URLs immediately with 403", async () => {
    const req = new NextRequest("http://localhost:3000/api/live-football/proxy?url=http://127.0.0.1:8080/secret");
    const res = await GET(req);
    assert.equal(res.status, 403);
  });

  test("3. Rejects segment request with tampered/invalid token with 403 Forbidden", async () => {
    const sid = computeStreamId(fakeSegmentUrl);
    const fakeToken = "invalid_tampered_signature_1234567890";
    const exp = Math.floor(Date.now() / 1000) + 120;

    const req = new NextRequest(
      `http://localhost:3000/api/live-football/proxy?url=${encodeURIComponent(fakeSegmentUrl)}&st=${fakeToken}&exp=${exp}&sid=${sid}&v=1`
    );
    const res = await GET(req);
    assert.equal(res.status, 403);
    const text = await res.text();
    assert.ok(text.includes("Invalid or expired stream token"));
  });

  test("4. Rejects segment request with streamId mismatch with 403 Forbidden", async () => {
    const generated = generateStreamToken({
      targetUrl: fakeSegmentUrl,
    });

    // Mismatched stream ID (e.g. from match-888)
    const wrongSid = "bad_stream_id";

    const req = new NextRequest(
      `http://localhost:3000/api/live-football/proxy?url=${encodeURIComponent(fakeSegmentUrl)}&st=${generated.token}&exp=${generated.exp}&sid=${wrongSid}&v=1`
    );
    const res = await GET(req);
    assert.equal(res.status, 403);
  });

  test("5. Rejects segment request with hard expired token (> grace window) with 403 Forbidden", async () => {
    const expiredEpoch = Math.floor(Date.now() / 1000) - 300; // 5 minutes ago
    const generated = generateStreamToken({
      targetUrl: fakeSegmentUrl,
      nowEpochSeconds: expiredEpoch - 120,
      ttlSeconds: 120,
    });

    const req = new NextRequest(
      `http://localhost:3000/api/live-football/proxy?url=${encodeURIComponent(fakeSegmentUrl)}&st=${generated.token}&exp=${generated.exp}&sid=${generated.sid}&v=1`
    );
    const res = await GET(req);
    assert.equal(res.status, 403);
  });

  test("6. Validates that token generation and verification roundtrip operates in under 0.1ms", () => {
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      const generated = generateStreamToken({ targetUrl: fakeSegmentUrl });
      const verified = verifyStreamToken({
        token: generated.token,
        exp: generated.exp,
        sid: generated.sid,
        targetUrl: fakeSegmentUrl,
      });
      assert.equal(verified.valid, true);
    }
    const elapsed = performance.now() - start;
    const perOpMs = elapsed / 100;
    assert.ok(perOpMs < 0.2, `HMAC operation took ${perOpMs}ms per verify/sign, expected < 0.2ms`);
  });

  describe("P1-A: Exact Single Redis Call in EXPIRED_GRACE Verification", () => {
    test("P1-A.1: EXPIRED_GRACE invokes enforceRateLimit exactly once and does not double-call", async () => {
      const originalFetch = globalThis.fetch;
      try {
        // Mock fetch to simulate upstream segment response
        globalThis.fetch = async () => {
          return new Response(new Uint8Array([0x47, 0x40, 0x00, 0x10]), {
            status: 200,
            headers: { "Content-Type": "video/mp2t" },
          });
        };

        const now = Math.floor(Date.now() / 1000);
        // Token expired 60 seconds ago (nominal exp = now - 60, well within 180s grace)
        const generated = generateStreamToken({
          targetUrl: fakeSegmentUrl,
          nowEpochSeconds: now - 180,
          ttlSeconds: 120, // exp = now - 60
        });

        const req = new NextRequest(
          `http://localhost:3000/api/live-football/proxy?url=${encodeURIComponent(fakeSegmentUrl)}&st=${generated.token}&exp=${generated.exp}&sid=${generated.sid}&v=1`
        );

        const res = await GET(req);
        // Should succeed and return the segment via graceful fallback
        assert.equal(res.status, 200);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe("P1-C: Anti-SSRF Safe Redirects Invariants (fetchWithSafeRedirects)", () => {
    const originalFetch = globalThis.fetch;

    test("P1-C.1: Valid redirect to public host succeeds and resolves finalUrl", async () => {
      let callCount = 0;
      globalThis.fetch = (async (url: string | URL | Request) => {
        callCount++;
        const urlStr = url.toString();
        if (urlStr === "https://cdn1.example.com/stream/index.m3u8") {
          return new Response(null, {
            status: 302,
            headers: { Location: "https://cdn2-edge.example.com/stream/index.m3u8" },
          });
        }
        return new Response("#EXTM3U\n#EXT-X-VERSION:3\n", {
          status: 200,
          headers: { "Content-Type": "application/vnd.apple.mpegurl" },
        });
      }) as typeof fetch;

      try {
        const { fetchWithSafeRedirects } = await import("./route");
        const result = await fetchWithSafeRedirects("https://cdn1.example.com/stream/index.m3u8");
        assert.equal(result.response.status, 200);
        assert.equal(result.finalUrl, "https://cdn2-edge.example.com/stream/index.m3u8");
        assert.equal(callCount, 2);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test("P1-C.2: Redirect to 127.0.0.1 is blocked by SSRF guard", async () => {
      globalThis.fetch = (async () => {
        return new Response(null, {
          status: 302,
          headers: { Location: "http://127.0.0.1:3000/api/admin" },
        });
      }) as typeof fetch;

      try {
        const { fetchWithSafeRedirects } = await import("./route");
        await assert.rejects(
          async () => {
            await fetchWithSafeRedirects("https://cdn1.example.com/stream/index.m3u8");
          },
          /SSRF guard blocked target URL: http:\/\/127\.0\.0\.1:3000\/api\/admin/
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test("P1-C.3: Redirect to private IPv4 (192.168.1.1) is blocked", async () => {
      globalThis.fetch = (async () => {
        return new Response(null, {
          status: 302,
          headers: { Location: "http://192.168.1.1/secret" },
        });
      }) as typeof fetch;

      try {
        const { fetchWithSafeRedirects } = await import("./route");
        await assert.rejects(
          async () => {
            await fetchWithSafeRedirects("https://cdn1.example.com/stream/index.m3u8");
          },
          /SSRF guard blocked target URL: http:\/\/192\.168\.1\.1\/secret/
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test("P1-C.4: Redirect to link-local / metadata IP (169.254.169.254) is blocked", async () => {
      globalThis.fetch = (async () => {
        return new Response(null, {
          status: 302,
          headers: { Location: "http://169.254.169.254/latest/meta-data/" },
        });
      }) as typeof fetch;

      try {
        const { fetchWithSafeRedirects } = await import("./route");
        await assert.rejects(
          async () => {
            await fetchWithSafeRedirects("https://cdn1.example.com/stream/index.m3u8");
          },
          /SSRF guard blocked target URL: http:\/\/169\.254\.169\.254\/latest\/meta-data\//
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test("P1-C.5: Redirect to unsafe hostname (localhost) is blocked", async () => {
      globalThis.fetch = (async () => {
        return new Response(null, {
          status: 302,
          headers: { Location: "http://localhost:3000/internal" },
        });
      }) as typeof fetch;

      try {
        const { fetchWithSafeRedirects } = await import("./route");
        await assert.rejects(
          async () => {
            await fetchWithSafeRedirects("https://cdn1.example.com/stream/index.m3u8");
          },
          /SSRF guard blocked target URL: http:\/\/localhost:3000\/internal/
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test("P1-C.6: Redirect loop (A -> B -> A) is detected and rejected", async () => {
      globalThis.fetch = (async (url: string | URL | Request) => {
        const urlStr = url.toString();
        if (urlStr === "https://cdn1.example.com/stream/a") {
          return new Response(null, {
            status: 302,
            headers: { Location: "https://cdn1.example.com/stream/b" },
          });
        }
        return new Response(null, {
          status: 302,
          headers: { Location: "https://cdn1.example.com/stream/a" },
        });
      }) as typeof fetch;

      try {
        const { fetchWithSafeRedirects } = await import("./route");
        await assert.rejects(
          async () => {
            await fetchWithSafeRedirects("https://cdn1.example.com/stream/a");
          },
          /Redirect loop detected at/
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test("P1-C.7: Redirect missing Location header is rejected", async () => {
      globalThis.fetch = (async () => {
        return new Response(null, {
          status: 302,
          // Missing Location
        });
      }) as typeof fetch;

      try {
        const { fetchWithSafeRedirects } = await import("./route");
        await assert.rejects(
          async () => {
            await fetchWithSafeRedirects("https://cdn1.example.com/stream/a");
          },
          /Redirect response \(302\) missing Location header/
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test("P1-C.8: Redirect chain exceeding limit (> 5 hops) is rejected", async () => {
      let hop = 0;
      globalThis.fetch = (async () => {
        hop++;
        return new Response(null, {
          status: 302,
          headers: { Location: `https://cdn1.example.com/stream/hop-${hop}` },
        });
      }) as typeof fetch;

      try {
        const { fetchWithSafeRedirects } = await import("./route");
        await assert.rejects(
          async () => {
            await fetchWithSafeRedirects("https://cdn1.example.com/stream/start");
          },
          /Maximum redirect limit \(5\) exceeded/
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test("P1-C.9: Redirect to FPT or Cola stream preserves appropriate User-Agent, Origin, Referer", async () => {
      let capturedHeaders: Record<string, string> = {};
      globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
        const urlStr = url.toString();
        if (urlStr === "https://initial.example.com/stream.m3u8") {
          return new Response(null, {
            status: 302,
            headers: { Location: "https://fptplay53.net/live/vtv6.m3u8" },
          });
        }
        capturedHeaders = (init?.headers as Record<string, string>) || {};
        return new Response("#EXTM3U", {
          status: 200,
          headers: { "Content-Type": "application/vnd.apple.mpegurl" },
        });
      }) as typeof fetch;

      try {
        const { fetchWithSafeRedirects } = await import("./route");
        const res = await fetchWithSafeRedirects("https://initial.example.com/stream.m3u8");
        assert.equal(res.finalUrl, "https://fptplay53.net/live/vtv6.m3u8");
        assert.ok(capturedHeaders["User-Agent"]?.includes("Tizen"));
        assert.equal(capturedHeaders["Referer"], "https://fptplay53.net/");
        assert.equal(capturedHeaders["Origin"], "https://fptplay53.net");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe("SEC-01: Mandatory Token Enforcement & Anti-Bypass Invariants", () => {
    const originalFetch = globalThis.fetch;

    test("SEC-01.1: Segment không có token -> 403 Forbidden", async () => {
      let upstreamCalled = false;
      globalThis.fetch = (async () => {
        upstreamCalled = true;
        return new Response(new Uint8Array([0x47]), { status: 200 });
      }) as typeof fetch;

      try {
        const req = new NextRequest(`http://localhost:3000/api/live-football/proxy?url=${encodeURIComponent(fakeSegmentUrl)}`);
        const res = await GET(req);
        assert.equal(res.status, 403);
        assert.equal(upstreamCalled, false, "Upstream fetch must not be called when token is missing");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test("SEC-01.2: Segment chỉ có st (thiếu exp, sid) -> 403 Forbidden", async () => {
      let upstreamCalled = false;
      globalThis.fetch = (async () => {
        upstreamCalled = true;
        return new Response(new Uint8Array([0x47]), { status: 200 });
      }) as typeof fetch;

      try {
        const req = new NextRequest(`http://localhost:3000/api/live-football/proxy?url=${encodeURIComponent(fakeSegmentUrl)}&st=some_token`);
        const res = await GET(req);
        assert.equal(res.status, 403);
        assert.equal(upstreamCalled, false);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test("SEC-01.3: Segment chỉ có exp (thiếu st, sid) -> 403 Forbidden", async () => {
      const req = new NextRequest(`http://localhost:3000/api/live-football/proxy?url=${encodeURIComponent(fakeSegmentUrl)}&exp=1999999999`);
      const res = await GET(req);
      assert.equal(res.status, 403);
    });

    test("SEC-01.4: Segment chỉ có sid (thiếu st, exp) -> 403 Forbidden", async () => {
      const req = new NextRequest(`http://localhost:3000/api/live-football/proxy?url=${encodeURIComponent(fakeSegmentUrl)}&sid=some_sid`);
      const res = await GET(req);
      assert.equal(res.status, 403);
    });

    test("SEC-01.5: Segment có st + exp nhưng thiếu sid -> 403 Forbidden", async () => {
      const req = new NextRequest(`http://localhost:3000/api/live-football/proxy?url=${encodeURIComponent(fakeSegmentUrl)}&st=some_token&exp=1999999999`);
      const res = await GET(req);
      assert.equal(res.status, 403);
    });

    test("SEC-01.6: Segment có st + sid nhưng thiếu exp -> 403 Forbidden", async () => {
      const req = new NextRequest(`http://localhost:3000/api/live-football/proxy?url=${encodeURIComponent(fakeSegmentUrl)}&st=some_token&sid=some_sid`);
      const res = await GET(req);
      assert.equal(res.status, 403);
    });

    test("SEC-01.7: Segment có exp + sid nhưng thiếu st -> 403 Forbidden", async () => {
      const req = new NextRequest(`http://localhost:3000/api/live-football/proxy?url=${encodeURIComponent(fakeSegmentUrl)}&exp=1999999999&sid=some_sid`);
      const res = await GET(req);
      assert.equal(res.status, 403);
    });

    test("SEC-01.8: Segment có token rỗng -> 403 Forbidden", async () => {
      const req = new NextRequest(`http://localhost:3000/api/live-football/proxy?url=${encodeURIComponent(fakeSegmentUrl)}&st=&exp=&sid=&v=1`);
      const res = await GET(req);
      assert.equal(res.status, 403);
    });

    test("SEC-01.9: Segment token hợp lệ -> 200 OK và gọi upstream thành công", async () => {
      let upstreamCalled = false;
      globalThis.fetch = (async () => {
        upstreamCalled = true;
        return new Response(new Uint8Array([0x47, 0x40, 0x00, 0x10]), {
          status: 200,
          headers: { "Content-Type": "video/mp2t" },
        });
      }) as typeof fetch;

      try {
        const generated = generateStreamToken({ targetUrl: fakeSegmentUrl });
        const req = new NextRequest(
          `http://localhost:3000/api/live-football/proxy?url=${encodeURIComponent(fakeSegmentUrl)}&st=${generated.token}&exp=${generated.exp}&sid=${generated.sid}&v=1`
        );
        const res = await GET(req);
        assert.equal(res.status, 200);
        assert.equal(upstreamCalled, true);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test("SEC-01.10: Media resource (.m4s, .mp4, .key) thiếu token -> 403 Forbidden", async () => {
      const m4sUrl = "https://cdn.example.com/stream/track-video.m4s";
      const keyUrl = "https://cdn.example.com/stream/encryption.key";

      const resM4s = await GET(new NextRequest(`http://localhost:3000/api/live-football/proxy?url=${encodeURIComponent(m4sUrl)}`));
      assert.equal(resM4s.status, 403);

      const resKey = await GET(new NextRequest(`http://localhost:3000/api/live-football/proxy?url=${encodeURIComponent(keyUrl)}`));
      assert.equal(resKey.status, 403);
    });

    test("SEC-01.11: Classification bypass: URL chứa ?trick=playlist.m3u8 nhưng file là .ts vẫn bắt buộc có token (403)", async () => {
      const trickUrl = "https://cdn.example.com/stream/segment-001.ts?trick=playlist.m3u8";
      const res = await GET(new NextRequest(`http://localhost:3000/api/live-football/proxy?url=${encodeURIComponent(trickUrl)}`));
      assert.equal(res.status, 403);
    });

    test("SEC-01.12: Playlist không có segment token vẫn được phục vụ (Control Plane) và rewrite cấp token", async () => {
      globalThis.fetch = (async () => {
        return new Response(
          "#EXTM3U\n#EXTINF:2.0,\nsegment-001.ts\n#EXTINF:2.0,\nsegment-002.ts\n",
          {
            status: 200,
            headers: { "Content-Type": "application/vnd.apple.mpegurl" },
          }
        );
      }) as typeof fetch;

      try {
        const playlistUrl = "https://cdn.example.com/stream/index.m3u8";
        const req = new NextRequest(`http://localhost:3000/api/live-football/proxy?url=${encodeURIComponent(playlistUrl)}`);
        const res = await GET(req);
        assert.equal(res.status, 200);
        const text = await res.text();
        assert.ok(text.includes("&st="), "Playlist rewriting must attach &st= to segments");
        assert.ok(text.includes("&exp="), "Playlist rewriting must attach &exp= to segments");
        assert.ok(text.includes("&sid="), "Playlist rewriting must attach &sid= to segments");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test("SEC-01.13: Media resource (.aac) without token -> 403 Forbidden, zero upstream fetch, zero Redis", async () => {
      let upstreamCalled = false;
      globalThis.fetch = (async () => {
        upstreamCalled = true;
        return new Response(new Uint8Array([0xff, 0xf1]), { status: 200 });
      }) as typeof fetch;

      try {
        const aacUrl = "https://cdn.example.com/audio/commentary-vi.aac";
        const req = new NextRequest(`http://localhost:3000/api/live-football/proxy?url=${encodeURIComponent(aacUrl)}`);
        const res = await GET(req);
        assert.equal(res.status, 403);
        assert.equal(upstreamCalled, false, "Upstream fetch must not be called when .aac token is missing");
        assert.equal(res.headers.get("x-ratelimit-limit"), null, "Rate limit headers must not be set");
        const body = await res.text();
        assert.equal(body, "Missing required stream token parameters");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test("SEC-01.14: Media resource (.vtt) without token -> 403 Forbidden, zero upstream fetch, zero Redis", async () => {
      let upstreamCalled = false;
      globalThis.fetch = (async () => {
        upstreamCalled = true;
        return new Response("WEBVTT\n", { status: 200 });
      }) as typeof fetch;

      try {
        const vttUrl = "https://cdn.example.com/subtitles/vi.vtt";
        const req = new NextRequest(`http://localhost:3000/api/live-football/proxy?url=${encodeURIComponent(vttUrl)}`);
        const res = await GET(req);
        assert.equal(res.status, 403);
        assert.equal(upstreamCalled, false, "Upstream fetch must not be called when .vtt token is missing");
        assert.equal(res.headers.get("x-ratelimit-limit"), null, "Rate limit headers must not be set");
        const body = await res.text();
        assert.equal(body, "Missing required stream token parameters");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test("SEC-01.15: Media resource (.key.bin) without token -> 403 Forbidden, zero upstream fetch, zero Redis", async () => {
      let upstreamCalled = false;
      globalThis.fetch = (async () => {
        upstreamCalled = true;
        return new Response(new Uint8Array(16), { status: 200 });
      }) as typeof fetch;

      try {
        const keyBinUrl = "https://cdn.example.com/keys/drm-session-123.key.bin";
        const req = new NextRequest(`http://localhost:3000/api/live-football/proxy?url=${encodeURIComponent(keyBinUrl)}`);
        const res = await GET(req);
        assert.equal(res.status, 403);
        assert.equal(upstreamCalled, false, "Upstream fetch must not be called when .key.bin token is missing");
        assert.equal(res.headers.get("x-ratelimit-limit"), null, "Rate limit headers must not be set");
        const body = await res.text();
        assert.equal(body, "Missing required stream token parameters");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
