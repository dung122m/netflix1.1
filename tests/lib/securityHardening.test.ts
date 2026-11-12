import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";

import {
  checkRateLimit,
  enforceRateLimit,
  getClientIp,
  hashClientIp,
  cleanIpString,
  isValidIp,
  isCloudflareIp,
  getRateLimitEnvPrefix,
  getRedisInstance,
  _resetRedisClientForTesting,
  _resetMemoryStoreForTesting,
  blockSuspiciousTarget,
  isTargetBlocked,
  RateLimitConfig,
  RATE_LIMIT_PRESETS,
  resolveStreamingRateLimitPreset,
  classifyRedisError,
  isRedisCircuitOpen,
  recordRedisFailure,
  recordRedisSuccess,
  _resetCircuitBreakerForTesting,
  buildRateLimitResponse,
} from "@/lib/rateLimit";

import {
  validateHttpMethod,
  validateContentType,
  validateContentLength,
  safeParseJson,
  detectMaliciousPayload,
  detectContentSpam,
  sanitizeSafeText,
  isDuplicateContent,
  recordRecentContent,
  _resetRecentSubmissionsForTesting,
  executeWithConcurrencyGuard,
  sanitizePagination,
} from "@/lib/securityValidation";

import {
  verifyServerAuth,
  _resetTokenCacheForTesting,
} from "@/lib/serverAuth";

import { generateStreamToken } from "@/lib/streamToken";

import {
  getRequestId,
  logSecurityEvent,
} from "@/lib/securityLogger";

import { proxy, checkOriginProtection } from "@/proxy";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Enforce test execution mode across all imported modules
Object.assign(process.env, { NODE_ENV: "test", APP_ENV: "test" });

export interface TestEnvironmentGuard {
  isConfigured: boolean;
  reason: string;
  supabaseClient?: SupabaseClient;
}

/**
 * Strict Environment Safety Guard:
 * Prevents automated security integration tests from executing write/update/delete operations
 * against live/production databases (Supabase / Upstash Redis / Firebase).
 */
export function verifyTestEnvironmentSafety(): TestEnvironmentGuard {
  const testSupabaseUrl = process.env.TEST_SUPABASE_URL?.trim();
  const testServiceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY?.trim();
  const prodSupabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();

  // 1. Must have dedicated TEST credentials
  if (!testSupabaseUrl || !testServiceRoleKey) {
    return {
      isConfigured: false,
      reason:
        "[SAFETY GUARD BLOCKED] Integration tests require dedicated TEST_SUPABASE_URL and TEST_SUPABASE_SERVICE_ROLE_KEY. " +
        "Refusing to execute write/delete operations against implicit or fallback database.",
    };
  }

  // 2. Must not match known production/shared URL
  if (prodSupabaseUrl && testSupabaseUrl.toLowerCase() === prodSupabaseUrl.toLowerCase()) {
    return {
      isConfigured: false,
      reason:
        `[SAFETY GUARD BLOCKED] TEST_SUPABASE_URL matches production/shared database (${testSupabaseUrl}). ` +
        "Integration tests must run against an isolated test/staging database or local emulator.",
    };
  }

  // 3. Prevent known production project ID collision
  if (testSupabaseUrl.includes("hbrubnilyefrjtglhyap")) {
    return {
      isConfigured: false,
      reason:
        "[SAFETY GUARD BLOCKED] TEST_SUPABASE_URL points to Nanaflix production project (hbrubnilyefrjtglhyap). " +
        "Execution aborted to protect live data.",
    };
  }

  // 4. Redis safety guard if TEST_REDIS_URL is provided
  const testRedisUrl = process.env.TEST_REDIS_URL?.trim();
  const prodRedisUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  if (testRedisUrl && prodRedisUrl && testRedisUrl.toLowerCase() === prodRedisUrl.toLowerCase()) {
    return {
      isConfigured: false,
      reason:
        "[SAFETY GUARD BLOCKED] TEST_REDIS_URL matches production Redis endpoint. " +
        "Integration tests must use a separate Redis database or in-memory runner.",
    };
  }

  try {
    const client = createClient(testSupabaseUrl, testServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return {
      isConfigured: true,
      reason: "Dedicated test database verified.",
      supabaseClient: client,
    };
  } catch (err) {
    return {
      isConfigured: false,
      reason: `[SAFETY GUARD BLOCKED] Failed to initialize test Supabase client: ${(err as Error).message}`,
    };
  }
}

// ============================================================================
// 1. RATE LIMITING ENGINE TESTS
// ============================================================================

function setTestEnv(key: string, value: string | undefined): void {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) {
    delete env[key];
  } else {
    env[key] = value;
  }
}

describe("Rate Limiting Engine (rateLimit.ts)", () => {
  const testConfig: RateLimitConfig = {
    namespace: "unit-test-rl",
    maxRequests: 3,
    windowSeconds: 5,
    failClosed: false,
  };

  it("extracts client IP prioritizing CDN headers in non-Vercel environments", () => {
    const reqWithCf = new NextRequest("http://localhost/api/test", {
      headers: { "cf-connecting-ip": "203.0.113.195" },
    });
    assert.strictEqual(getClientIp(reqWithCf), "203.0.113.195");

    const reqWithVercel = new NextRequest("http://localhost/api/test", {
      headers: { "x-vercel-forwarded-for": "198.51.100.42, 10.0.0.1" },
    });
    assert.strictEqual(getClientIp(reqWithVercel), "198.51.100.42");

    const reqWithXff = new NextRequest("http://localhost/api/test", {
      headers: { "x-forwarded-for": "192.0.2.1" },
    });
    assert.strictEqual(getClientIp(reqWithXff), "192.0.2.1");
  });

  it("prevents IP spoofing when attacker sends forged cf-connecting-ip directly to Vercel origin", () => {
    // Attacker's real connecting IP to Vercel is 203.0.113.195 (not a Cloudflare IP)
    // Attacker injects a fake cf-connecting-ip header trying to bypass rate limiting
    const forgedReq = new NextRequest("http://localhost/api/test", {
      headers: {
        "x-vercel-forwarded-for": "203.0.113.195",
        "cf-connecting-ip": "10.0.0.99",
        "x-forwarded-for": "1.2.3.4",
      },
    });

    // Must reject 10.0.0.99 and return the real connecting IP 203.0.113.195
    assert.strictEqual(
      getClientIp(forgedReq),
      "203.0.113.195",
      "Must reject forged cf-connecting-ip and return real connecting IP from x-vercel-forwarded-for"
    );
  });

  it("accepts cf-connecting-ip when request arrives through verified Cloudflare proxy", () => {
    // 1. IPv4: Request connects to Vercel from a verified Cloudflare IP (162.158.1.5 in 162.158.0.0/15)
    const legitCfReqV4 = new NextRequest("http://localhost/api/test", {
      headers: {
        "x-vercel-forwarded-for": "162.158.1.5, 76.76.21.21",
        "cf-connecting-ip": "113.161.72.10",
      },
    });
    assert.strictEqual(
      getClientIp(legitCfReqV4),
      "113.161.72.10",
      "Must accept cf-connecting-ip when connecting IP is in Cloudflare IP ranges"
    );

    // 2. IPv6: Request connects to Vercel from a verified Cloudflare IPv6 proxy (2606:4700::1)
    const legitCfReqV6 = new NextRequest("http://localhost/api/test", {
      headers: {
        "x-vercel-forwarded-for": "2606:4700:4700::1111",
        "cf-connecting-ip": "2001:ee0:5207:e4a0::1",
      },
    });
    assert.strictEqual(
      getClientIp(legitCfReqV6),
      "2001:ee0:5207:e4a0::1",
      "Must accept IPv6 cf-connecting-ip when connecting IP is in Cloudflare IPv6 ranges"
    );
  });

  it("handles multi-proxy chains, port stripping, and IPv4-mapped IPv6 normalization", () => {
    // 1. Multi-proxy chain in x-forwarded-for: extracts first valid IP
    const multiProxyReq = new NextRequest("http://localhost/api/test", {
      headers: { "x-forwarded-for": "invalid-garbage, 198.51.100.77, 10.0.0.1" },
    });
    assert.strictEqual(getClientIp(multiProxyReq), "198.51.100.77");

    // 2. IPv4 with port: strips port number
    const portReq = new NextRequest("http://localhost/api/test", {
      headers: { "x-forwarded-for": "198.51.100.88:54321, 10.0.0.1" },
    });
    assert.strictEqual(getClientIp(portReq), "198.51.100.88");

    // 3. Bracketed IPv6 with port: strips brackets and port
    const bracketIpv6Req = new NextRequest("http://localhost/api/test", {
      headers: { "x-forwarded-for": "[2001:db8::1]:8080" },
    });
    assert.strictEqual(getClientIp(bracketIpv6Req), "2001:db8::1");

    // 4. IPv4-mapped IPv6: normalizes ::ffff:x.x.x.x to x.x.x.x
    const mappedIpv6Req = new NextRequest("http://localhost/api/test", {
      headers: { "x-real-ip": "::ffff:198.51.100.99" },
    });
    assert.strictEqual(getClientIp(mappedIpv6Req), "198.51.100.99");
  });

  it("safely falls back when IP headers are missing, empty, or contain malformed injection payloads", () => {
    // 1. Missing / Empty headers
    const emptyReq = new NextRequest("http://localhost/api/test", {
      headers: {},
    });
    assert.strictEqual(getClientIp(emptyReq), "anonymous-client");

    // 2. Malformed / Injection payload in header
    const injectionReq = new NextRequest("http://localhost/api/test", {
      headers: { "cf-connecting-ip": "attacker-choice-payload; DROP TABLE users; --" },
    });
    assert.strictEqual(
      getClientIp(injectionReq),
      "anonymous-client",
      "Must reject malformed strings and return safe fallback"
    );

    // 3. Fallback deterministic fingerprinting
    const hashAnon = hashClientIp(getClientIp(emptyReq));
    assert.strictEqual(hashAnon, "iph_local_anon", "Anonymous clients must receive deterministic safe fingerprint");
    assert.strictEqual(hashClientIp("127.0.0.1"), "iph_local_anon", "Local loopback must receive safe test hash");
  });

  it("validates and identifies Cloudflare CIDR blocks and IP formats", () => {
    // Cloudflare IPv4 & IPv6 detection
    assert.strictEqual(isCloudflareIp("173.245.48.1"), true);
    assert.strictEqual(isCloudflareIp("104.16.1.1"), true);
    assert.strictEqual(isCloudflareIp("162.158.0.1"), true);
    assert.strictEqual(isCloudflareIp("2606:4700::1"), true);
    assert.strictEqual(isCloudflareIp("203.0.113.1"), false);
    assert.strictEqual(isCloudflareIp("127.0.0.1"), false);

    // IP validation
    assert.strictEqual(isValidIp("192.168.1.1"), true);
    assert.strictEqual(isValidIp("2001:db8::1"), true);
    assert.strictEqual(isValidIp("not-an-ip"), false);
    assert.strictEqual(isValidIp("256.1.1.1"), false);
    assert.strictEqual(isValidIp(null), false);

    // Clean IP string
    assert.strictEqual(cleanIpString(" 192.0.2.1:8080 "), "192.0.2.1");
    assert.strictEqual(cleanIpString("::ffff:192.0.2.1"), "192.0.2.1");
    assert.strictEqual(cleanIpString("[2001:db8::1]:443"), "2001:db8::1");
  });

  it("hashes IP securely without raw IP leakage", () => {
    const hash1 = hashClientIp("203.0.113.50");
    const hash2 = hashClientIp("203.0.113.50");
    const hash3 = hashClientIp("203.0.113.51");

    assert.strictEqual(hash1, hash2, "Identical IPs should produce identical hashes");
    assert.notStrictEqual(hash1, hash3, "Different IPs should produce different hashes");
    assert.ok(hash1.startsWith("iph_"), "Hash should start with iph_ prefix");
    assert.ok(!hash1.includes("203.0.113"), "Hash must never leak original IP octets");
  });

  it("allows requests below threshold and counts down remaining quota", async () => {
    const target = `test-user-allow-${Date.now()}`;
    const res1 = await checkRateLimit(target, testConfig);
    assert.strictEqual(res1.allowed, true);
    assert.strictEqual(res1.limit, 3);
    assert.strictEqual(res1.remaining, 2);

    const res2 = await checkRateLimit(target, testConfig);
    assert.strictEqual(res2.allowed, true);
    assert.strictEqual(res2.remaining, 1);

    const res3 = await checkRateLimit(target, testConfig);
    assert.strictEqual(res3.allowed, true);
    assert.strictEqual(res3.remaining, 0);
  });

  it("rejects requests exceeding threshold with status 429 and Retry-After headers", async () => {
    const target = `test-user-block-${Date.now()}`;
    // Exhaust 3 requests
    await checkRateLimit(target, testConfig);
    await checkRateLimit(target, testConfig);
    await checkRateLimit(target, testConfig);

    // 4th request must be blocked
    const resBlocked = await checkRateLimit(target, testConfig);
    assert.strictEqual(resBlocked.allowed, false);
    assert.strictEqual(resBlocked.remaining, 0);
    assert.ok(resBlocked.headers["Retry-After"], "Retry-After header must be present");
    assert.strictEqual(resBlocked.headers["X-RateLimit-Remaining"], "0");
    assert.strictEqual(resBlocked.headers["X-RateLimit-Limit"], "3");
  });

  it("correctly resolves Redis environment prefix across Development, Test, Preview, and Production", () => {
    const origEnv = { ...process.env };
    try {
      // 1. Test Mode (Highest Priority for safety)
      setTestEnv("APP_ENV", "test");
      setTestEnv("VERCEL_ENV", undefined);
      setTestEnv("NODE_ENV", "production");
      assert.strictEqual(getRateLimitEnvPrefix(), "test", "APP_ENV=test must take highest priority");

      setTestEnv("APP_ENV", undefined);
      setTestEnv("NODE_ENV", "test");
      setTestEnv("VERCEL_ENV", "production");
      assert.strictEqual(getRateLimitEnvPrefix(), "test", "NODE_ENV=test must override VERCEL_ENV=production");

      // 2. Preview Mode: Vercel runs Next.js in production mode (NODE_ENV=production) on Preview deployments
      setTestEnv("APP_ENV", undefined);
      setTestEnv("NODE_ENV", "production");
      setTestEnv("VERCEL_ENV", "preview");
      assert.strictEqual(
        getRateLimitEnvPrefix(),
        "preview",
        "VERCEL_ENV=preview must take precedence over NODE_ENV=production"
      );

      setTestEnv("VERCEL_ENV", undefined);
      setTestEnv("APP_ENV", "preview");
      setTestEnv("NODE_ENV", "production");
      assert.strictEqual(getRateLimitEnvPrefix(), "preview", "APP_ENV=preview must resolve to preview");

      // 3. Production Mode
      setTestEnv("APP_ENV", undefined);
      setTestEnv("VERCEL_ENV", "production");
      setTestEnv("NODE_ENV", "production");
      assert.strictEqual(getRateLimitEnvPrefix(), "production", "VERCEL_ENV=production must resolve to production");

      setTestEnv("VERCEL_ENV", undefined);
      setTestEnv("APP_ENV", "production");
      setTestEnv("NODE_ENV", "development");
      assert.strictEqual(getRateLimitEnvPrefix(), "production", "APP_ENV=production must resolve to production");

      setTestEnv("APP_ENV", undefined);
      setTestEnv("VERCEL_ENV", undefined);
      setTestEnv("NODE_ENV", "production");
      assert.strictEqual(getRateLimitEnvPrefix(), "production", "NODE_ENV=production must resolve to production");

      // 4. Development Mode (Default)
      setTestEnv("APP_ENV", undefined);
      setTestEnv("VERCEL_ENV", undefined);
      setTestEnv("NODE_ENV", "development");
      assert.strictEqual(getRateLimitEnvPrefix(), "development", "NODE_ENV=development must resolve to development");

      setTestEnv("NODE_ENV", undefined);
      assert.strictEqual(getRateLimitEnvPrefix(), "development", "Undefined env must fallback to development");
    } finally {
      process.env = origEnv;
      Object.assign(process.env, { NODE_ENV: "test", APP_ENV: "test" });
    }
  });

  it("enforces safety guard in getRedisInstance during test mode", () => {
    const origTestUrl = process.env.TEST_REDIS_URL;
    const origTestToken = process.env.TEST_REDIS_TOKEN;
    const origProdUrl = process.env.UPSTASH_REDIS_REST_URL;

    try {
      _resetRedisClientForTesting();

      // 1. Missing dedicated TEST_REDIS credentials -> returns null (safe in-memory fallback)
      delete process.env.TEST_REDIS_URL;
      delete process.env.TEST_REDIS_TOKEN;
      assert.strictEqual(getRedisInstance(), null, "Must return null when TEST_REDIS credentials are not provided");

      // 2. TEST_REDIS_URL matching production UPSTASH_REDIS_REST_URL -> blocked, returns null
      process.env.UPSTASH_REDIS_REST_URL = "https://safe-prod-redis.upstash.io";
      process.env.TEST_REDIS_URL = "https://safe-prod-redis.upstash.io";
      process.env.TEST_REDIS_TOKEN = "dummy_token";
      _resetRedisClientForTesting();
      assert.strictEqual(getRedisInstance(), null, "Must refuse to connect if TEST_REDIS_URL matches production Redis");
    } finally {
      if (origTestUrl) process.env.TEST_REDIS_URL = origTestUrl;
      else delete process.env.TEST_REDIS_URL;
      if (origTestToken) process.env.TEST_REDIS_TOKEN = origTestToken;
      else delete process.env.TEST_REDIS_TOKEN;
      if (origProdUrl) process.env.UPSTASH_REDIS_REST_URL = origProdUrl;
      else delete process.env.UPSTASH_REDIS_REST_URL;
      _resetRedisClientForTesting();
    }
  });

  it("enforces Fail-Closed policy on sensitive endpoints when Redis is unavailable, capping at fallbackMax", async () => {
    _resetMemoryStoreForTesting();
    const nonce = Date.now();
    const sensitiveConfig: RateLimitConfig = {
      namespace: `test-fail-closed-${nonce}`,
      maxRequests: 4, // fallbackMax = Math.max(1, Math.floor(4 * 0.5)) = 2
      windowSeconds: 60,
      failClosed: true,
    };

    const target = `sensitive-op-${nonce}`;

    // Request 1: Allowed (fallback remaining = 1)
    const res1 = await checkRateLimit(target, sensitiveConfig);
    assert.strictEqual(res1.allowed, true, "First request within fallbackMax must succeed");
    assert.strictEqual(res1.isFallback, true, "Must be flagged as fallback");
    assert.strictEqual(res1.remaining, 1);

    // Request 2: Allowed (fallback remaining = 0)
    const res2 = await checkRateLimit(target, sensitiveConfig);
    assert.strictEqual(res2.allowed, true, "Second request within fallbackMax must succeed");
    assert.strictEqual(res2.isFallback, true);
    assert.strictEqual(res2.remaining, 0);

    // Request 3: Exceeds fallbackMax -> Blocked with 429
    const res3 = await checkRateLimit(target, sensitiveConfig);
    assert.strictEqual(res3.allowed, false, "Request exceeding fallbackMax must be rejected");
    assert.strictEqual(res3.remaining, 0);
    assert.strictEqual(res3.isFallback, true);
    assert.ok(res3.headers["Retry-After"]);
    assert.ok(res3.reason?.includes("Hệ thống bảo vệ phân tán đang bảo trì"));
  });

  it("enforces local memory sliding window on public read endpoints when Redis is unavailable", async () => {
    _resetMemoryStoreForTesting();
    const nonce = Date.now();
    const readConfig: RateLimitConfig = {
      namespace: `test-fail-open-${nonce}`,
      maxRequests: 2,
      windowSeconds: 60,
      failClosed: false,
    };

    const target = `public-read-${nonce}`;

    // Request 1: Allowed
    const res1 = await checkRateLimit(target, readConfig);
    assert.strictEqual(res1.allowed, true);
    assert.strictEqual(res1.remaining, 1);

    // Request 2: Allowed
    const res2 = await checkRateLimit(target, readConfig);
    assert.strictEqual(res2.allowed, true);
    assert.strictEqual(res2.remaining, 0);

    // Request 3: Blocked with 429
    const res3 = await checkRateLimit(target, readConfig);
    assert.strictEqual(res3.allowed, false, "Request exceeding nominal maxRequests must be rejected");
    assert.strictEqual(res3.remaining, 0);
    assert.ok(res3.headers["Retry-After"]);
    assert.ok(res3.reason?.includes("Local Fallback"));
  });

  it("enforces dual-key rate limiting preventing client UID spoofing", async () => {
    const runId = Date.now();
    const req = new NextRequest("http://localhost/api/test", {
      headers: { "cf-connecting-ip": `198.51.100.${runId % 200}` },
    });

    const config: RateLimitConfig = {
      namespace: `dual-key-test-${runId}`,
      maxRequests: 2,
      windowSeconds: 60,
      failClosed: false,
    };

    // Client trying to bypass by passing different verified IDs from same IP
    const verifiedUid1 = `user_victim_${runId}`;
    const res1 = await enforceRateLimit(req, config, verifiedUid1);
    assert.strictEqual(res1.allowed, true);

    const res2 = await enforceRateLimit(req, config, verifiedUid1);
    assert.strictEqual(res2.allowed, true);

    const res3 = await enforceRateLimit(req, config, verifiedUid1);
    assert.strictEqual(res3.allowed, false, "3rd request from same UID must be blocked");
  });

  it("differentiates HLS playlists, segments, and general streaming proxy requests", () => {
    // 1. Playlists (.m3u8, playlist, manifest) -> HLS_PLAYLIST (180 req / 60s)
    const p1 = resolveStreamingRateLimitPreset("https://cdn.example.com/live/stream.m3u8");
    const p2 = resolveStreamingRateLimitPreset("https://cdn.example.com/live/master.m3u8?token=xyz");
    const p3 = resolveStreamingRateLimitPreset("https://cdn.example.com/hls/live-manifest");
    assert.strictEqual(p1.namespace, "stream-playlist");
    assert.strictEqual(p1.maxRequests, 180);
    assert.strictEqual(p2.namespace, "stream-playlist");
    assert.strictEqual(p3.namespace, "stream-playlist");

    // 2. Video & Audio Segments (.ts, .m4s, .mp4, .aac, .key, .vtt) -> HLS_SEGMENT (1200 req / 60s)
    const s1 = resolveStreamingRateLimitPreset("https://cdn.example.com/live/segment_1024.ts");
    const s2 = resolveStreamingRateLimitPreset("https://cdn.example.com/live/audio_48k.aac");
    const s3 = resolveStreamingRateLimitPreset("https://cdn.example.com/live/chunk-0001.m4s");
    const s4 = resolveStreamingRateLimitPreset("https://cdn.example.com/live/enc.key");
    const s5 = resolveStreamingRateLimitPreset("https://cdn.example.com/live/subtitles_vi.vtt");
    assert.strictEqual(s1.namespace, "stream-segment");
    assert.strictEqual(s1.maxRequests, 1200);
    assert.strictEqual(s2.namespace, "stream-segment");
    assert.strictEqual(s3.namespace, "stream-segment");
    assert.strictEqual(s4.namespace, "stream-segment");
    assert.strictEqual(s5.namespace, "stream-segment");

    // 3. Fallback General Stream Proxy (300 req / 60s)
    const fallback1 = resolveStreamingRateLimitPreset("https://cdn.example.com/stream/unknown");
    const fallback2 = resolveStreamingRateLimitPreset(null);
    assert.strictEqual(fallback1.namespace, "stream-proxy");
    assert.strictEqual(fallback1.maxRequests, 300);
    assert.strictEqual(fallback2.namespace, "stream-proxy");
  });

  it("handles high-throughput burst traffic for HLS segments without interrupting live streaming", async () => {
    _resetMemoryStoreForTesting();
    const runId = Date.now();
    const req = new NextRequest("http://localhost/api/live-football/proxy?url=http://cdn.test/seg.ts", {
      headers: { "x-forwarded-for": `198.51.100.${runId % 200}` },
    });

    const segmentPreset = resolveStreamingRateLimitPreset("http://cdn.test/seg.ts");

    // Simulate rapid burst of 25 segments (typical initial jitter buffer fill in HLS.js)
    const results = [];
    for (let i = 0; i < 25; i++) {
      results.push(await enforceRateLimit(req, segmentPreset));
    }

    // Every single segment in the 25-request burst must succeed (no 429 interruption)
    assert.ok(
      results.every((r) => r.allowed),
      "All 25 segment burst requests must succeed without 429 throttling"
    );
    assert.strictEqual(results[0].limit, 1200);
    assert.ok(results[24].remaining > 1100, "Should have plenty of remaining quota left");
  });

  it("ensures HLS segment burst does not starve or collide with HLS playlist quota or user comments quota", async () => {
    _resetMemoryStoreForTesting();
    const runId = Date.now();
    const req = new NextRequest("http://localhost/api/test", {
      headers: { "x-forwarded-for": `198.51.100.${(runId + 1) % 200}` },
    });

    // 1. Client fetches 20 video segments
    const segmentPreset = resolveStreamingRateLimitPreset("http://cdn.test/video.ts");
    for (let i = 0; i < 20; i++) {
      const res = await enforceRateLimit(req, segmentPreset);
      assert.strictEqual(res.allowed, true);
    }

    // 2. Client refreshes playlist manifest (stream-playlist namespace must be fresh)
    const playlistPreset = resolveStreamingRateLimitPreset("http://cdn.test/master.m3u8");
    const plRes = await enforceRateLimit(req, playlistPreset);
    assert.strictEqual(plRes.allowed, true);
    assert.strictEqual(plRes.limit, 180);
    // Remaining playlist quota must not be reduced by the 20 segment requests!
    assert.strictEqual(plRes.remaining, 179, "Playlist quota must be completely isolated from segments");

    // 3. Client reads comments while watching (comments-read namespace must be fresh)
    const cmtReadRes = await enforceRateLimit(req, RATE_LIMIT_PRESETS.COMMENTS_READ);
    assert.strictEqual(cmtReadRes.allowed, true);
    assert.strictEqual(cmtReadRes.limit, 60);
    assert.strictEqual(cmtReadRes.remaining, 59, "Comments read quota must be completely isolated from streaming");
  });

  it("enforces strict rate limits on comment mutations, reactions, and deletions", async () => {
    _resetMemoryStoreForTesting();
    const runId = Date.now();
    const uid = `user_reaction_${runId}`;
    const req = new NextRequest("http://localhost/api/comments", {
      method: "PATCH",
      headers: { "x-forwarded-for": `198.51.100.${(runId + 2) % 200}` },
    });

    // Preset check for comment mutation (reactions / pins / flags)
    assert.strictEqual(RATE_LIMIT_PRESETS.COMMENT_MUTATION.namespace, "comments-mutation");
    assert.strictEqual(RATE_LIMIT_PRESETS.COMMENT_MUTATION.maxRequests, 30);
    assert.strictEqual(RATE_LIMIT_PRESETS.COMMENT_MUTATION.failClosed, true);

    // Preset check for comment deletion
    assert.strictEqual(RATE_LIMIT_PRESETS.COMMENT_DELETE.namespace, "comments-delete");
    assert.strictEqual(RATE_LIMIT_PRESETS.COMMENT_DELETE.maxRequests, 20);
    assert.strictEqual(RATE_LIMIT_PRESETS.COMMENT_DELETE.failClosed, true);

    // Initial reaction request succeeds
    const resMut = await enforceRateLimit(req, RATE_LIMIT_PRESETS.COMMENT_MUTATION, uid);
    assert.strictEqual(resMut.allowed, true);
    assert.strictEqual(resMut.limit, 30);

    // Initial delete request succeeds
    const resDel = await enforceRateLimit(req, RATE_LIMIT_PRESETS.COMMENT_DELETE, uid);
    assert.strictEqual(resDel.allowed, true);
    assert.strictEqual(resDel.limit, 20);
  });

  it("protects costly compute endpoints (recommendations, translation) with dedicated rate limits", () => {
    assert.strictEqual(RATE_LIMIT_PRESETS.RECOMMENDATIONS.namespace, "recommendations");
    assert.strictEqual(RATE_LIMIT_PRESETS.RECOMMENDATIONS.maxRequests, 30);
    assert.strictEqual(RATE_LIMIT_PRESETS.RECOMMENDATIONS.failClosed, false);

    assert.strictEqual(RATE_LIMIT_PRESETS.TRANSLATION.namespace, "translation");
    assert.strictEqual(RATE_LIMIT_PRESETS.TRANSLATION.maxRequests, 30);
    assert.strictEqual(RATE_LIMIT_PRESETS.TRANSLATION.failClosed, false);
  });
});

// ============================================================================
// 2. SECURITY VALIDATION & ABUSE GUARDS
// ============================================================================

describe("Security Validation & Abuse Guards (securityValidation.ts)", () => {
  it("enforces allowed HTTP methods (405 Method Not Allowed)", () => {
    const postReq = new NextRequest("http://localhost/api/test", { method: "POST" });
    const deleteReq = new NextRequest("http://localhost/api/test", { method: "DELETE" });

    const allowed = ["GET", "POST"];
    assert.strictEqual(validateHttpMethod(postReq, allowed), null);

    const rejected = validateHttpMethod(deleteReq, allowed);
    assert.ok(rejected !== null);
    assert.strictEqual(rejected?.status, 405);
    assert.strictEqual(rejected?.headers.get("Allow"), "GET, POST");
  });

  it("enforces Content-Type header on mutations (415 Unsupported Media Type)", () => {
    const validReq = new NextRequest("http://localhost/api/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
    });
    assert.strictEqual(validateContentType(validReq), null);

    const textReq = new NextRequest("http://localhost/api/test", {
      method: "POST",
      headers: { "content-type": "text/plain" },
    });
    const rejected = validateContentType(textReq);
    assert.ok(rejected !== null);
    assert.strictEqual(rejected?.status, 415);
  });

  it("rejects oversized payloads (413 Payload Too Large)", async () => {
    // 1. Content-Length header check
    const headerReq = new NextRequest("http://localhost/api/test", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": "200000", // 200KB
      },
    });
    const lengthCheck = validateContentLength(headerReq, 100 * 1024);
    assert.ok(lengthCheck !== null);
    assert.strictEqual(lengthCheck?.status, 413);

    // 2. Safe parse JSON body check
    const bigString = "A".repeat(120 * 1024);
    const bodyReq = new NextRequest("http://localhost/api/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: bigString }),
    });
    const parseResult = await safeParseJson(bodyReq, 50 * 1024);
    assert.strictEqual(parseResult.success, false);
    if (!parseResult.success) {
      assert.strictEqual(parseResult.response.status, 413);
    }
  });

  it("safely handles valid and invalid JSON syntax", async () => {
    const validReq = new NextRequest("http://localhost/api/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "valid json payload" }),
    });
    const validRes = await safeParseJson<{ message: string }>(validReq);
    assert.strictEqual(validRes.success, true);
    if (validRes.success) {
      assert.strictEqual(validRes.data.message, "valid json payload");
    }

    const malformedReq = new NextRequest("http://localhost/api/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{ unclosed_json: true, ",
    });
    const malformedRes = await safeParseJson(malformedReq);
    assert.strictEqual(malformedRes.success, false);
    if (!malformedRes.success) {
      assert.strictEqual(malformedRes.response.status, 400);
    }
  });

  it("detects malicious injection patterns (XSS, SQLi, Path Traversal, Null Byte)", () => {
    // Clean
    assert.strictEqual(detectMaliciousPayload("Phim rất hay, cảm ơn admin").isMalicious, false);

    // XSS
    const xss1 = detectMaliciousPayload("<script>alert(document.cookie)</script>");
    assert.strictEqual(xss1.isMalicious, true);
    assert.strictEqual(xss1.type, "xss");

    const xss2 = detectMaliciousPayload("javascript:void(0)");
    assert.strictEqual(xss2.isMalicious, true);
    assert.strictEqual(xss2.type, "xss");

    // SQLi
    const sqli1 = detectMaliciousPayload("' UNION SELECT 1, 2, password FROM users--");
    assert.strictEqual(sqli1.isMalicious, true);
    assert.strictEqual(sqli1.type, "sqli");

    const sqli2 = detectMaliciousPayload("DROP TABLE movies;");
    assert.strictEqual(sqli2.isMalicious, true);
    assert.strictEqual(sqli2.type, "sqli");

    // Path Traversal
    const pt1 = detectMaliciousPayload("../../../etc/passwd");
    assert.strictEqual(pt1.isMalicious, true);
    assert.strictEqual(pt1.type, "path_traversal");

    // Null byte
    const nb = detectMaliciousPayload("movie\0slug");
    assert.strictEqual(nb.isMalicious, true);
    assert.strictEqual(nb.type, "null_byte");
  });

  it("detects automated spam and link floods in comments", () => {
    // Normal comment
    assert.strictEqual(detectContentSpam("Bộ phim này diễn viên đóng xuất sắc quá.").isSpam, false);

    // Character repetition flood
    assert.strictEqual(detectContentSpam("phim hayyyyyyyyyyyyyyyyyyyyyyyyyyyy").isSpam, true);

    // Link flood (> 1 link)
    assert.strictEqual(
      detectContentSpam("Xem thêm tại https://badsite1.com và https://badsite2.com").isSpam,
      true
    );

    // Gambling / Telegram bot spam
    assert.strictEqual(detectContentSpam("Tham gia t.me/nhacai88 kiếm tiền ngay").isSpam, true);
    assert.strictEqual(detectContentSpam("Kèo nhà cái uy tín nạp rút 1:1").isSpam, true);
  });

  it("sanitizes text removing hazardous tags", () => {
    const raw = "<script>alert(1)</script> Phim <b>cực kỳ</b> cuốn!";
    const sanitized = sanitizeSafeText(raw);
    assert.ok(!sanitized.includes("<script>"));
    assert.ok(!sanitized.includes("alert(1)"));
    assert.strictEqual(sanitized, "Phim <b>cực kỳ</b> cuốn!");
  });
});

// ============================================================================
// 3. OBSERVABILITY & SECURITY LOGGER
// ============================================================================

describe("Security Logger & Data Protection (securityLogger.ts)", () => {
  it("extracts or generates consistent request IDs", () => {
    const reqWithId = new NextRequest("http://localhost/api/test", {
      headers: { "x-request-id": "trace-uuid-12345" },
    });
    assert.strictEqual(getRequestId(reqWithId), "trace-uuid-12345");

    const reqWithoutId = new NextRequest("http://localhost/api/test");
    const autoId = getRequestId(reqWithoutId);
    assert.ok(autoId.startsWith("req_"));
  });

  it("logs security events without throwing and masks sensitive tokens", () => {
    const req = new NextRequest("http://localhost/api/test", {
      headers: {
        authorization: "Bearer firebase_secret_token_abc123",
        cookie: "session_id=super_secret_cookie_999",
      },
    });

    // Logging event with sensitive metadata
    assert.doesNotThrow(() => {
      logSecurityEvent(req, {
        event: "AUTH_FAILURE",
        status: 401,
        reason: "Invalid Firebase token provided",
        metadata: {
          token: "eyJhbGciOi...",
          password: "plain_password_123",
          apiKey: "AIzaSy...",
          safeField: "movie-slug-123",
        },
      });
    });
  });
});

// ============================================================================
// 4. EDGE MIDDLEWARE & SCANNER BLOCKING
// ============================================================================

describe("Edge Proxy Security Controls (src/proxy.ts)", () => {
  it("blocks malicious vulnerability scanners by User-Agent (403 Forbidden)", () => {
    const scannerUas = [
      "sqlmap/1.6#stable",
      "Mozilla/5.0 (Nikto 2.1.6)",
      "WPScan v3.8.22",
      "gobuster/3.1.0",
      "DirBuster-1.0-RC1",
      "Masscan/1.3.2",
    ];

    for (const ua of scannerUas) {
      const req = new NextRequest("http://localhost/api/movies", {
        headers: { "user-agent": ua },
      });
      const res = proxy(req);
      assert.strictEqual(res.status, 403, `User-Agent '${ua}' must be blocked with 403`);
    }
  });

  it("blocks sensitive probe and exploit paths (404 Not Found)", () => {
    const probePaths = [
      "http://localhost/.env",
      "http://localhost/.git/config",
      "http://localhost/wp-admin",
      "http://localhost/phpmyadmin/index.php",
      "http://localhost/xmlrpc.php",
      "http://localhost/actuator/health",
      "http://localhost/.DS_Store",
    ];

    for (const path of probePaths) {
      const req = new NextRequest(path);
      const res = proxy(req);
      assert.strictEqual(res.status, 404, `Probe path '${path}' must be blocked with 404`);
    }
  });

  it("blocks HTTP TRACE and TRACK methods (405 Method Not Allowed)", () => {
    const traceReq = new NextRequest("http://localhost/api/movies", { method: "POST" });
    Object.defineProperty(traceReq, "method", { value: "TRACE" });
    const res = proxy(traceReq);
    assert.strictEqual(res.status, 405);
  });

  it("injects global security headers on valid requests", () => {
    const req = new NextRequest("http://localhost/api/movies", {
      headers: { "user-agent": "Mozilla/5.0 Chrome/120.0.0.0" },
    });
    const res = proxy(req);
    assert.strictEqual(res.headers.get("X-Content-Type-Options"), "nosniff");
    assert.strictEqual(res.headers.get("X-Frame-Options"), "SAMEORIGIN");
    assert.strictEqual(res.headers.get("Referrer-Policy"), "strict-origin-when-cross-origin");
  });

  it("enforces private no-cache headers for private APIs preventing CDN cache leaks", () => {
    const privatePaths = [
      "http://localhost/api/notifications",
      "http://localhost/api/user/profile",
      "http://localhost/api/user/history",
      "http://localhost/api/admin/sync-embeddings",
    ];

    for (const path of privatePaths) {
      const req = new NextRequest(path, {
        headers: { "user-agent": "Mozilla/5.0" },
      });
      const res = proxy(req);
      const cacheControl = res.headers.get("Cache-Control");
      assert.ok(
        cacheControl?.includes("private") &&
        cacheControl?.includes("no-cache") &&
        cacheControl?.includes("no-store"),
        `Private path '${path}' must have private no-store Cache-Control. Received: ${cacheControl}`
      );
    }
  });
});

// ============================================================================
// 5. COMMENT FLAGGING SECURITY & ANTI-CENSORSHIP (SEC-REV-01)
// ============================================================================

describe("Comment Flagging Security & Anti-Censorship (SEC-REV-01)", () => {
  it("rejects unauthenticated flag requests with 401 Unauthorized", async () => {
    const { PATCH } = await import("@/app/api/comments/route");
    const req = new NextRequest("http://localhost/api/comments", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "flag",
        commentId: "cmt_test_victim",
        reason: "spam content",
      }),
    });

    const res = await PATCH(req);
    assert.strictEqual(res.status, 401, "Unauthenticated flag requests must be rejected with 401");
    const data = await res.json();
    assert.ok(data.error.includes("Unauthorized"), "Response must indicate unauthorized error");
  });

  it("rejects flag requests with invalid Firebase token with 401 Unauthorized", async () => {
    const { PATCH } = await import("@/app/api/comments/route");
    const req = new NextRequest("http://localhost/api/comments", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer eyJhbGciOi_forged_invalid_token",
      },
      body: JSON.stringify({
        action: "flag",
        commentId: "cmt_test_victim",
        reason: "spam content",
      }),
    });

    const res = await PATCH(req);
    assert.strictEqual(res.status, 401, "Invalid token flag requests must be rejected with 401");
  });

  it("rejects authenticated flag requests with empty or missing reason with 400 Bad Request", async () => {
    const { PATCH } = await import("@/app/api/comments/route");
    const testSecret = "nanaflix_admin_secret_dev_2026";
    const originalSecret = process.env.ADMIN_SYNC_SECRET;
    process.env.ADMIN_SYNC_SECRET = process.env.ADMIN_SYNC_SECRET || testSecret;

    try {
      const req = new NextRequest("http://localhost/api/comments", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-admin-secret": process.env.ADMIN_SYNC_SECRET,
        },
        body: JSON.stringify({
          action: "flag",
          commentId: "cmt_test_victim",
          reason: "   ",
        }),
      });

      const res = await PATCH(req);
      assert.strictEqual(res.status, 400, "Empty reason must be rejected with 400");
      const data = await res.json();
      assert.ok(data.error.includes("không được để trống"), "Must report missing reason");
    } finally {
      if (originalSecret) process.env.ADMIN_SYNC_SECRET = originalSecret;
      else delete process.env.ADMIN_SYNC_SECRET;
    }
  });

  it("enforces Environment Safety Guard preventing integration tests from touching production database", () => {
    const originalTestUrl = process.env.TEST_SUPABASE_URL;
    const originalTestKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
    try {
      // 1. Missing test credentials -> Blocked
      delete process.env.TEST_SUPABASE_URL;
      delete process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
      const guard1 = verifyTestEnvironmentSafety();
      assert.strictEqual(guard1.isConfigured, false);
      assert.ok(guard1.reason.includes("require dedicated TEST_SUPABASE_URL"));
      assert.strictEqual(getSupabaseAdmin(), null, "getSupabaseAdmin() must return null in test mode without TEST credentials");

      // 2. Pointing to production project ID -> Blocked
      process.env.TEST_SUPABASE_URL = "https://hbrubnilyefrjtglhyap.supabase.co";
      process.env.TEST_SUPABASE_SERVICE_ROLE_KEY = "test_key_dummy";
      const guard2 = verifyTestEnvironmentSafety();
      assert.strictEqual(guard2.isConfigured, false);
      assert.ok(guard2.reason.includes("[SAFETY GUARD BLOCKED]"), "Must block production database URL");

      // 3. Dedicated isolated test database -> Allowed & Configured safely
      process.env.TEST_SUPABASE_URL = "https://isolated-test-project.supabase.co";
      process.env.TEST_SUPABASE_SERVICE_ROLE_KEY = "dummy_safe_test_key";
      const guard3 = verifyTestEnvironmentSafety();
      assert.strictEqual(guard3.isConfigured, true, "Dedicated test DB must be permitted");
      assert.ok(guard3.supabaseClient, "Must create test client for isolated DB");
    } finally {
      if (originalTestUrl) process.env.TEST_SUPABASE_URL = originalTestUrl;
      else delete process.env.TEST_SUPABASE_URL;
      if (originalTestKey) process.env.TEST_SUPABASE_SERVICE_ROLE_KEY = originalTestKey;
      else delete process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
    }
  });

  it("returns 404 Not Found when attempting to flag a non-existent comment", async (t) => {
    const safety = verifyTestEnvironmentSafety();
    if (!safety.isConfigured) {
      t.skip(`Skipping DB integration test: ${safety.reason}`);
      return;
    }
    const { PATCH } = await import("@/app/api/comments/route");
    const adminSecret = process.env.ADMIN_SYNC_SECRET || "nanaflix_admin_secret_dev_2026";
    const req = new NextRequest("http://localhost/api/comments", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "x-admin-secret": adminSecret,
      },
      body: JSON.stringify({
        action: "flag",
        commentId: "cmt_non_existent_99999999",
        reason: "Nội dung vi phạm tiêu chuẩn",
      }),
    });

    const res = await PATCH(req);
    assert.strictEqual(res.status, 404, "Non-existent comment must return 404");
  });

  it("verifies full user report lifecycle, anti-censorship invariant, and admin moderation authority", async (t) => {
    const safety = verifyTestEnvironmentSafety();
    if (!safety.isConfigured) {
      t.skip(`Skipping DB integration test: ${safety.reason}`);
      return;
    }
    const supabaseAdmin = safety.supabaseClient!;

    const testNonce = Date.now();
    const testMovieSlug = `test-sec-rev-${testNonce}`;
    const testCommentId = `cmt_sec_rev_${testNonce}`;
    const testUserUid = `usr_reporter_${testNonce}`;
    const testUserToken = `firebase_token_${testNonce}`;
    const reportId = `rep_${testCommentId}_${testUserUid}`;
    const subCommentIds: string[] = [];
    let spamUserUid = `usr_spammer_${testNonce}`;

    // 1. Tạo bình luận mẫu trên Supabase để kiểm thử
    const { error: seedErr } = await supabaseAdmin.from("movie_comments").insert({
      id: testCommentId,
      movie_slug: testMovieSlug,
      movie_title: "Test Security Movie",
      user_id: "usr_comment_author_1",
      user_name: "Tác Giả Mẫu",
      content: "Bình luận thử nghiệm an ninh SEC-REV-01",
      is_flagged: false,
      is_approved: true,
      likes: 0,
      liked_by: [],
      created_at: testNonce,
      updated_at: testNonce,
    });
    assert.ifError(seedErr);

    // Mock Google Identity Toolkit để xác thực Firebase token cho testUserUid (User thường)
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
      if (url.includes("identitytoolkit.googleapis.com")) {
        const bodyStr = init?.body ? String(init.body) : "";
        if (bodyStr.includes(testUserToken)) {
          return new Response(
            JSON.stringify({
              users: [
                {
                  localId: testUserUid,
                  email: `tester_${testNonce}@test.local`,
                  displayName: `Tester ${testNonce}`,
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
      }
      return originalFetch(input, init);
    };

    try {
      const { PATCH, GET } = await import("@/app/api/comments/route");

      // 2. User thường gửi báo cáo vi phạm
      const reportReq = new NextRequest("http://localhost/api/comments", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${testUserToken}`,
        },
        body: JSON.stringify({
          action: "flag",
          commentId: testCommentId,
          reason: "Bình luận có ngôn từ gây tranh cãi",
        }),
      });

      const reportRes = await PATCH(reportReq);
      assert.strictEqual(reportRes.status, 200, "Valid report request must return HTTP 200");
      const reportData = await reportRes.json();
      assert.strictEqual(reportData.success, true);
      assert.strictEqual(reportData.reported, true);

      // 3. Xác minh trên Database: error_reports đã được tạo đúng 1 bản ghi
      const { data: dbReport, error: repErr } = await supabaseAdmin
        .from("error_reports")
        .select("*")
        .eq("id", reportId)
        .single();
      assert.ifError(repErr);
      assert.ok(dbReport, "error_reports record must exist in database");
      assert.strictEqual(dbReport.movie_slug, testMovieSlug);
      assert.strictEqual(dbReport.issue_type, "comment_violation");
      assert.strictEqual(dbReport.status, "pending");

      // 4. BẢO VỆ CHỐNG CENSORSHIP: movie_comments.is_flagged TUYỆT ĐỐI KHÔNG BỊ ĐỔI THÀNH TRUE
      const { data: commentAfterReport } = await supabaseAdmin
        .from("movie_comments")
        .select("is_flagged")
        .eq("id", testCommentId)
        .single();
      assert.strictEqual(
        commentAfterReport?.is_flagged,
        false,
        "User report MUST NOT change movie_comments.is_flagged to true"
      );

      // 5. GET /api/comments vẫn trả về bình luận đã báo cáo
      const getReq = new NextRequest(`http://localhost/api/comments?movieSlug=${testMovieSlug}`);
      const getRes = await GET(getReq);
      assert.strictEqual(getRes.status, 200);
      const getCommentsData = await getRes.json();
      const commentInList = (getCommentsData.items || []).find((c: { id: string }) => c.id === testCommentId);
      assert.ok(commentInList, "Reported comment MUST still be returned by GET /api/comments for public viewers");

      // 6. Duplicate report không tạo thêm bản ghi, trả về alreadyReported: true
      const dupReq = new NextRequest("http://localhost/api/comments", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${testUserToken}`,
        },
        body: JSON.stringify({
          action: "flag",
          commentId: testCommentId,
          reason: "Báo cáo lần 2 cho cùng bình luận",
        }),
      });

      const dupRes = await PATCH(dupReq);
      assert.strictEqual(dupRes.status, 200);
      const dupData = await dupRes.json();
      assert.strictEqual(dupData.alreadyReported, true, "Duplicate report must be acknowledged without duplicate insert");

      const { count: reportCount } = await supabaseAdmin
        .from("error_reports")
        .select("id", { count: "exact", head: true })
        .eq("id", reportId);
      assert.strictEqual(reportCount, 1, "Only one record must exist in error_reports for user report");

      // 7. Admin flag thành công (đặt is_flagged = true)
      const adminSecret = process.env.ADMIN_SYNC_SECRET || "nanaflix_admin_secret_dev_2026";
      const adminFlagReq = new NextRequest("http://localhost/api/comments", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-admin-secret": adminSecret,
        },
        body: JSON.stringify({
          action: "flag",
          commentId: testCommentId,
          reason: "Kiểm duyệt viên xác nhận vi phạm và ẩn bình luận",
        }),
      });

      const adminFlagRes = await PATCH(adminFlagReq);
      assert.strictEqual(adminFlagRes.status, 200);
      const adminFlagData = await adminFlagRes.json();
      assert.strictEqual(adminFlagData.action, "flagged_by_admin");
      assert.strictEqual(adminFlagData.isFlagged, true);

      const { data: commentAfterAdminFlag } = await supabaseAdmin
        .from("movie_comments")
        .select("is_flagged")
        .eq("id", testCommentId)
        .single();
      assert.strictEqual(commentAfterAdminFlag?.is_flagged, true, "Admin must be able to flag and hide comment");

      // 8. Admin unflag thành công (gỡ cờ, is_flagged = false)
      const adminUnflagReq = new NextRequest("http://localhost/api/comments", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-admin-secret": adminSecret,
        },
        body: JSON.stringify({
          action: "unflag",
          commentId: testCommentId,
        }),
      });

      const adminUnflagRes = await PATCH(adminUnflagReq);
      assert.strictEqual(adminUnflagRes.status, 200);
      const { data: commentAfterAdminUnflag } = await supabaseAdmin
        .from("movie_comments")
        .select("is_flagged")
        .eq("id", testCommentId)
        .single();
      assert.strictEqual(commentAfterAdminUnflag?.is_flagged, false, "Admin unflag must restore comment visibility");

      // 9. Rate Limit: Giới hạn tối đa 5 reports / 10 phút / user
      spamUserUid = `usr_spammer_${testNonce}`;
      const spamUserToken = `token_spammer_${testNonce}`;

      // Tạo thêm 5 comments phụ để gửi 5 reports khác nhau
      for (let i = 1; i <= 6; i++) {
        const subId = `cmt_sub_${testNonce}_${i}`;
        subCommentIds.push(subId);
        await supabaseAdmin.from("movie_comments").insert({
          id: subId,
          movie_slug: testMovieSlug,
          movie_title: "Test Rate Limit Movie",
          user_id: "usr_comment_author_1",
          content: `Bình luận phụ ${i}`,
          is_flagged: false,
          is_approved: true,
          created_at: testNonce,
          updated_at: testNonce,
        });
      }

      // Đăng ký spamUserToken vào mock fetch
      const currentFetch = globalThis.fetch;
      globalThis.fetch = async (input, init) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
        if (url.includes("identitytoolkit.googleapis.com")) {
          const bodyStr = init?.body ? String(init.body) : "";
          if (bodyStr.includes(spamUserToken)) {
            return new Response(
              JSON.stringify({
                users: [{ localId: spamUserUid, email: `spammer_${testNonce}@test.local` }],
              }),
              { status: 200, headers: { "Content-Type": "application/json" } }
            );
          }
        }
        return currentFetch(input, init);
      };

      // Gửi 5 reports đầu tiên -> Được phép
      for (let i = 0; i < 5; i++) {
        const req = new NextRequest("http://localhost/api/comments", {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${spamUserToken}`,
          },
          body: JSON.stringify({
            action: "flag",
            commentId: subCommentIds[i],
            reason: `Lý do báo cáo spam ${i}`,
          }),
        });
        const res = await PATCH(req);
        assert.strictEqual(res.status, 200, `Report ${i + 1} within quota must succeed`);
      }

      // Gửi report thứ 6 -> Bị chặn với HTTP 429
      const req6 = new NextRequest("http://localhost/api/comments", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${spamUserToken}`,
        },
        body: JSON.stringify({
          action: "flag",
          commentId: subCommentIds[5],
          reason: "Báo cáo vượt quá giới hạn",
        }),
      });
      const res6 = await PATCH(req6);
      assert.strictEqual(res6.status, 429, "6th report must be rate-limited with HTTP 429");
      assert.ok(res6.headers.get("retry-after"), "Rate-limited response must include Retry-After header");
    } finally {
      // Khôi phục fetch
      globalThis.fetch = originalFetch;

      // Dọn dẹp dữ liệu kiểm thử an toàn tuyệt đối, chỉ xóa đúng các ID do test sinh ra
      for (const subId of subCommentIds) {
        try {
          await supabaseAdmin.from("movie_comments").delete().eq("id", subId);
          await supabaseAdmin.from("error_reports").delete().eq("id", `rep_${subId}_${spamUserUid}`);
        } catch {
          // ignore cleanup errors on test teardown
        }
      }
      try {
        await supabaseAdmin.from("movie_comments").delete().eq("id", testCommentId);
        await supabaseAdmin.from("error_reports").delete().eq("id", reportId);
      } catch {
        // ignore cleanup errors on test teardown
      }
    }
  });
});

describe("Anti-Bot, Anti-Spam & API Abuse Hardening (Fix 1.4)", () => {
  it("detects invisible unicode zero-width characters and excessive links in comments", () => {
    // 1. Zero-width spaces / invisible payload flood
    const zeroWidthContent = "Phim xem cũng được\u200B\u200Cđoạn kết bất ngờ";
    const zwCheck = detectContentSpam(zeroWidthContent);
    assert.strictEqual(zwCheck.isSpam, true, "Zero-width characters must be flagged as spam");
    assert.ok(zwCheck.reason?.includes("ký tự ẩn"), "Reason must mention hidden/invisible characters");

    // 2. Link flood (2 or more external links)
    const linkFloodContent = "Xem full tại https://site-a.com và https://site-b.com nhé mọi người";
    const lfCheck = detectContentSpam(linkFloodContent);
    assert.strictEqual(lfCheck.isSpam, true, "Multiple external links must be flagged as spam");
    assert.ok(lfCheck.reason?.includes("quá nhiều liên kết"), "Reason must mention excessive links");

    // 3. Legitimate comment with normal text and punctuation
    const legitContent = "Phim hành động kịch tính, kỹ xảo đỉnh cao! Đáng xem 10/10.";
    const legitCheck = detectContentSpam(legitContent);
    assert.strictEqual(legitCheck.isSpam, false, "Legitimate comment must not be flagged as spam");
  });

  it("detects duplicate comment submissions across short time windows", () => {
    _resetRecentSubmissionsForTesting();
    const userUid = "user_test_anti_spam_1";
    const commentText = "Phim này hay quá các bạn ơi!";

    // Lần đầu kiểm tra: chưa có nội dung trùng
    assert.strictEqual(isDuplicateContent(userUid, commentText, 60), false);

    // Ghi nhận nội dung
    recordRecentContent(userUid, commentText);

    // Lần hai gửi lại cùng nội dung: phát hiện trùng lặp
    assert.strictEqual(isDuplicateContent(userUid, commentText, 60), true);

    // Gửi nội dung khác: cho phép
    assert.strictEqual(isDuplicateContent(userUid, "Phim khác cũng tạm được", 60), false);

    // Người dùng khác gửi cùng nội dung: cho phép (không bị chặn nhầm chéo)
    assert.strictEqual(isDuplicateContent("user_test_anti_spam_2", commentText, 60), false);
  });

  it("prevents double-execution on concurrent in-flight requests with concurrency guard", async () => {
    let executionCounter = 0;
    const slowTask = async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
      executionCounter++;
      return "task_done";
    };

    // Bắn 3 request song song cùng 1 khóa lockKey
    const results = await Promise.all([
      executeWithConcurrencyGuard("lock_user_123", slowTask),
      executeWithConcurrencyGuard("lock_user_123", slowTask),
      executeWithConcurrencyGuard("lock_user_123", slowTask),
    ]);

    assert.strictEqual(executionCounter, 1, "Underlying task must only execute once across parallel calls");
    assert.deepStrictEqual(results, ["task_done", "task_done", "task_done"]);

    // Sau khi task hoàn thành, lần gọi tiếp theo được phép thực thi
    const secondResult = await executeWithConcurrencyGuard("lock_user_123", slowTask);
    assert.strictEqual(executionCounter, 2, "Subsequent execution after lock release must succeed");
    assert.strictEqual(secondResult, "task_done");
  });

  it("ephemerally blocks suspicious targets and rejects requests with HTTP 429", async () => {
    _resetMemoryStoreForTesting();
    const suspiciousTarget = "iph_suspicious_bot_01";

    assert.strictEqual(isTargetBlocked(suspiciousTarget), false);

    // Kích hoạt ephemeral block cho bot
    blockSuspiciousTarget(suspiciousTarget, 10);
    assert.strictEqual(isTargetBlocked(suspiciousTarget), true);

    // checkRateLimit phải trả về allowed: false ngay lập tức
    const rlResult = await checkRateLimit(suspiciousTarget, RATE_LIMIT_PRESETS.PUBLIC_READ);
    assert.strictEqual(rlResult.allowed, false);
    assert.strictEqual(rlResult.remaining, 0);
    assert.ok(rlResult.reason?.includes("tạm khóa truy cập"), "Must provide lockout explanation");
    assert.strictEqual(rlResult.headers["Retry-After"], "10");
  });

  it("sanitizes and bounds pagination parameters preventing pagination abuse & crawler scraping", () => {
    // 1. Normal pagination
    const normal = sanitizePagination(2, 20);
    assert.strictEqual(normal.page, 2);
    assert.strictEqual(normal.limit, 20);

    // 2. Out-of-bounds large values (anti-crawling / memory overflow)
    const large = sanitizePagination(999999, 10000);
    assert.strictEqual(large.page, 50, "Page must be capped at maxPage (50)");
    assert.strictEqual(large.limit, 50, "Limit must be capped at maxLimit (50)");

    // 3. Negative & zero values
    const negative = sanitizePagination(-5, 0);
    assert.strictEqual(negative.page, 1, "Negative page must fallback to 1");
    assert.strictEqual(negative.limit, 1, "Zero limit must fallback to at least 1");

    // 4. Malformed string injections
    const injection = sanitizePagination("' OR 1=1 --", "<script>");
    assert.strictEqual(injection.page, 1, "Malformed page string must fallback to 1");
    assert.strictEqual(injection.limit, 20, "Malformed limit string must fallback to defaultLimit (20)");
  });

  it("verifies Firebase ID Token pre-flight validation rejects malformed tokens without external calls", async () => {
    _resetTokenCacheForTesting();

    // 1. Malformed non-JWT tokens (e.g. SQLi / random probe)
    const malformedReq = new NextRequest("http://localhost/api/user/profile", {
      headers: {
        authorization: "Bearer invalid_token_not_jwt",
      },
    });

    const malformedResult = await verifyServerAuth(malformedReq);
    assert.strictEqual(malformedResult.isAuthenticated, false);
    assert.strictEqual(malformedResult.isAdmin, false);

    // 2. Negative cache test: repeated request with the same invalid token resolves immediately from negative cache
    const secondResult = await verifyServerAuth(malformedReq);
    assert.strictEqual(secondResult.isAuthenticated, false);
  });
});

describe("Cloudflare Edge & Vercel Origin Protection (Fix 1.5)", () => {
  const originalEnv = { ...process.env };

  it("fails open cleanly when EDGE_ORIGIN_SECRET is not configured", () => {
    delete process.env.EDGE_ORIGIN_SECRET;

    const req = new NextRequest("http://nanaflix.tv/browse", {
      headers: { host: "nanaflix.tv" },
    });
    const result = checkOriginProtection(req);
    assert.strictEqual(result, null, "Must fail open when secret is unconfigured");
  });

  it("bypasses origin protection in development and test environments by default", () => {
    process.env.EDGE_ORIGIN_SECRET = "super_secret_edge_token_123456789";
    process.env.CUSTOM_DOMAIN = "nanaflix.tv";

    // Local dev request to localhost
    const localReq = new NextRequest("http://localhost:3000/api/movies/meta", {
      headers: { host: "localhost:3000" },
    });
    const result = checkOriginProtection(localReq);
    assert.strictEqual(result, null, "Must bypass for localhost");
  });

  it("enforces origin protection rejecting direct *.vercel.app API bypass with HTTP 403", () => {
    process.env.EDGE_ORIGIN_SECRET = "super_secret_edge_token_123456789";
    process.env.CUSTOM_DOMAIN = "nanaflix.tv";

    // Simulated attack directly calling *.vercel.app origin
    const directApiReq = new NextRequest("http://nanaflix.vercel.app/api/comments", {
      method: "POST",
      headers: {
        host: "nanaflix.vercel.app",
        "x-test-enforce-origin-protection": "true",
      },
    });

    const result = checkOriginProtection(directApiReq);
    assert.ok(result, "Direct API call to *.vercel.app must be blocked");
    assert.strictEqual(result.status, 403, "Must return HTTP 403 Forbidden");
  });

  it("redirects browser GET requests on *.vercel.app to the official custom domain (308 Permanent Redirect)", () => {
    process.env.EDGE_ORIGIN_SECRET = "super_secret_edge_token_123456789";
    process.env.CUSTOM_DOMAIN = "nanaflix.tv";

    const browserReq = new NextRequest("http://nanaflix.vercel.app/browse?category=action", {
      method: "GET",
      headers: {
        host: "nanaflix.vercel.app",
        "x-test-enforce-origin-protection": "true",
      },
    });

    const result = checkOriginProtection(browserReq);
    assert.ok(result, "Browser navigation to *.vercel.app must be redirected");
    assert.strictEqual(result.status, 308, "Must return 308 Permanent Redirect");
    assert.strictEqual(
      result.headers.get("location"),
      "https://nanaflix.tv/browse?category=action",
      "Must redirect to official custom domain maintaining path and search parameters"
    );
  });

  it("rejects requests arriving without valid X-Nanaflix-Edge-Secret with HTTP 403", () => {
    process.env.EDGE_ORIGIN_SECRET = "super_secret_edge_token_123456789";
    process.env.CUSTOM_DOMAIN = "nanaflix.tv";

    // Request to custom domain but missing secret (e.g. direct IP attack or forged request)
    const missingSecretReq = new NextRequest("http://nanaflix.tv/api/user/profile", {
      headers: {
        host: "nanaflix.tv",
        "x-test-enforce-origin-protection": "true",
      },
    });
    const missingResult = checkOriginProtection(missingSecretReq);
    assert.ok(missingResult);
    assert.strictEqual(missingResult.status, 403);

    // Request with wrong secret
    const wrongSecretReq = new NextRequest("http://nanaflix.tv/api/user/profile", {
      headers: {
        host: "nanaflix.tv",
        "x-nanaflix-edge-secret": "wrong_attacker_secret",
        "x-test-enforce-origin-protection": "true",
      },
    });
    const wrongResult = checkOriginProtection(wrongSecretReq);
    assert.ok(wrongResult);
    assert.strictEqual(wrongResult.status, 403);
  });

  it("permits requests arriving through Cloudflare Edge proxy with valid X-Nanaflix-Edge-Secret", () => {
    process.env.EDGE_ORIGIN_SECRET = "super_secret_edge_token_123456789";
    process.env.CUSTOM_DOMAIN = "nanaflix.tv";

    // Legitimate request through Cloudflare proxy with matching secret
    const legitReq = new NextRequest("http://nanaflix.tv/api/comments", {
      headers: {
        host: "nanaflix.tv",
        "x-nanaflix-edge-secret": "super_secret_edge_token_123456789",
        "x-test-enforce-origin-protection": "true",
      },
    });

    const result = checkOriginProtection(legitReq);
    assert.strictEqual(result, null, "Legitimate request with verified secret must pass through");

    // Clean up env
    Object.assign(process.env, originalEnv);
  });

  it("handles hostname with explicit port (e.g., :443) and redirects *.vercel.app correctly", () => {
    process.env.EDGE_ORIGIN_SECRET = "super_secret_edge_token_123456789";
    process.env.CUSTOM_DOMAIN = "nanaflix.tv:443";

    const browserReqWithPort = new NextRequest("http://nanaflix.vercel.app:443/movies/avatar", {
      method: "GET",
      headers: {
        host: "nanaflix.vercel.app:443",
        "x-test-enforce-origin-protection": "true",
      },
    });

    const result = checkOriginProtection(browserReqWithPort);
    assert.ok(result, "Host with port on *.vercel.app must still be recognized");
    assert.strictEqual(result.status, 308);
    assert.strictEqual(result.headers.get("location"), "https://nanaflix.tv/movies/avatar");

    Object.assign(process.env, originalEnv);
  });

  it("allows www subdomain arriving through Cloudflare with valid secret", () => {
    process.env.EDGE_ORIGIN_SECRET = "super_secret_edge_token_123456789";
    process.env.CUSTOM_DOMAIN = "nanaflix.tv";

    const wwwReq = new NextRequest("http://www.nanaflix.tv/browse", {
      headers: {
        host: "www.nanaflix.tv",
        "x-nanaflix-edge-secret": "super_secret_edge_token_123456789",
        "x-test-enforce-origin-protection": "true",
      },
    });

    const result = checkOriginProtection(wwwReq);
    assert.strictEqual(result, null, "www subdomain with valid secret must pass through");

    Object.assign(process.env, originalEnv);
  });

  it("safely bypasses origin protection in Vercel Preview environments", () => {
    setTestEnv("EDGE_ORIGIN_SECRET", "super_secret_edge_token_123456789");
    setTestEnv("CUSTOM_DOMAIN", "nanaflix.tv");
    setTestEnv("VERCEL_ENV", "preview");
    setTestEnv("NODE_ENV", "production");

    // Request on a Vercel preview deployment without edge secret
    const previewReq = new NextRequest("https://nanaflix-git-feat-preview.vercel.app/api/movies/meta", {
      headers: {
        host: "nanaflix-git-feat-preview.vercel.app",
      },
    });

    const result = checkOriginProtection(previewReq);
    assert.strictEqual(result, null, "Vercel Preview must not be blocked by origin protection");

    Object.assign(process.env, originalEnv);
  });
});

describe("Redis Rate Limit Timeout & Resilience (Fix 1.6)", () => {
  it("1. classifies Redis errors into timeout, connection, and command and sanitizes tokens", () => {
    // 1A. Timeout error
    const timeoutErr = new Error("Redis rate limit timeout");
    const cTimeout = classifyRedisError(timeoutErr);
    assert.strictEqual(cTimeout.kind, "timeout");
    assert.ok(cTimeout.message.includes("timeout"));

    // 1B. Connection error with potential token in URL
    const connErr = new Error("fetch failed: connect ECONNREFUSED https://default:secret_token_12345@upstash.io:443");
    const cConn = classifyRedisError(connErr);
    assert.strictEqual(cConn.kind, "connection");
    assert.ok(!cConn.message.includes("secret_token_12345"), "Must strip secrets from error log");
    assert.ok(cConn.message.includes("***@upstash.io"), "Must replace credentials with ***");

    // 1C. Command error with Bearer token in message
    const cmdErr = new Error("ERR unknown command 'FOO' with Bearer eyJhbGciOi...");
    const cCmd = classifyRedisError(cmdErr);
    assert.strictEqual(cCmd.kind, "command");
    assert.ok(!cCmd.message.includes("eyJhbGciOi"), "Must strip bearer tokens from error log");
  });

  it("2. circuit breaker trips after consecutive failures and recovers on success", () => {
    _resetCircuitBreakerForTesting();
    const now = Date.now();

    assert.strictEqual(isRedisCircuitOpen(now), false, "Initial breaker must be closed");

    // 1 failure: not yet tripped
    recordRedisFailure("timeout", now);
    assert.strictEqual(isRedisCircuitOpen(now), false, "1 failure must not trip breaker");

    // 2 consecutive failures: trips breaker for 2500ms
    recordRedisFailure("timeout", now);
    assert.strictEqual(isRedisCircuitOpen(now), true, "2 consecutive failures must trip breaker");
    assert.strictEqual(isRedisCircuitOpen(now + 2400), true, "Breaker must remain open during cooldown");
    assert.strictEqual(isRedisCircuitOpen(now + 2600), false, "Breaker must close after cooldown");

    // Recovery
    recordRedisSuccess();
    assert.strictEqual(isRedisCircuitOpen(now), false, "Success must reset breaker immediately");
  });

  it("3. circuit breaker allows PUBLIC_READ to fail open immediately without stalling", async () => {
    _resetCircuitBreakerForTesting();
    _resetMemoryStoreForTesting();
    const now = Date.now();

    // Simulate tripped circuit breaker (e.g. from prior timeout)
    recordRedisFailure("timeout", now);
    recordRedisFailure("timeout", now);
    assert.strictEqual(isRedisCircuitOpen(now), true);

    const nonce = Date.now();
    const target = `iph_user_circuit_${nonce}`;

    // checkRateLimit must return allowed: true with isFallback: true immediately
    const res = await checkRateLimit(target, RATE_LIMIT_PRESETS.PUBLIC_READ);
    assert.strictEqual(res.allowed, true, "Must fail open for public read during outage");
    assert.strictEqual(res.isFallback, true, "Must indicate fallback mode");
    assert.strictEqual(res.limit, RATE_LIMIT_PRESETS.PUBLIC_READ.maxRequests);

    _resetCircuitBreakerForTesting();
  });

  it("4. in-memory fallback protects against multi-instance quota multiplication", async () => {
    _resetMemoryStoreForTesting();
    const nonce = Date.now();
    const target = `iph_multi_inst_${nonce}`;

    // PUBLIC_READ max is 120. In fallback, each serverless instance caps at 50% (60 requests)
    const customConfig: RateLimitConfig = {
      namespace: `test-multi-inst-${nonce}`,
      maxRequests: 20, // fallbackMax = Math.max(10, Math.floor(20 * 0.5)) = 10
      windowSeconds: 60,
      failClosed: false,
    };

    // First 10 requests allowed
    for (let i = 0; i < 10; i++) {
      const res = await checkRateLimit(target, customConfig);
      assert.strictEqual(res.allowed, true, `Request ${i + 1} within fallback quota must be allowed`);
      assert.strictEqual(res.isFallback, true);
    }

    // 11th request must be throttled with 429
    const blockedRes = await checkRateLimit(target, customConfig);
    assert.strictEqual(blockedRes.allowed, false, "Request exceeding local fallback quota must be throttled");
    assert.strictEqual(blockedRes.remaining, 0);
    assert.ok(blockedRes.reason?.includes("Local Fallback"));
  });

  it("5. handles burst concurrent requests under fallback without throwing or dropping quota accuracy", async () => {
    _resetMemoryStoreForTesting();
    const nonce = Date.now();
    const target = `iph_burst_${nonce}`;

    const burstConfig: RateLimitConfig = {
      namespace: `test-burst-${nonce}`,
      maxRequests: 30, // fallbackMax = 15
      windowSeconds: 60,
      failClosed: false,
    };

    // Fire 10 concurrent requests simultaneously
    const promises = Array.from({ length: 10 }, () => checkRateLimit(target, burstConfig));
    const results = await Promise.all(promises);

    const allowedCount = results.filter((r) => r.allowed).length;
    assert.strictEqual(allowedCount, 10, "All 10 burst requests must succeed within quota");
    results.forEach((r) => assert.strictEqual(r.isFallback, true));
  });

  it("6. verifies environment prefix separation between local, preview, and production", () => {
    const origEnv = { ...process.env };
    try {
      // Test mode
      setTestEnv("NODE_ENV", "test");
      setTestEnv("APP_ENV", "test");
      assert.strictEqual(getRateLimitEnvPrefix(), "test");

      // Vercel Preview
      setTestEnv("NODE_ENV", "production");
      setTestEnv("APP_ENV", "production");
      setTestEnv("VERCEL_ENV", "preview");
      assert.strictEqual(getRateLimitEnvPrefix(), "preview", "Preview must take precedence over NODE_ENV=production");

      // Production
      setTestEnv("VERCEL_ENV", undefined);
      assert.strictEqual(getRateLimitEnvPrefix(), "production");

      // Local development
      setTestEnv("NODE_ENV", "development");
      setTestEnv("APP_ENV", "development");
      assert.strictEqual(getRateLimitEnvPrefix(), "development");
    } finally {
      process.env = origEnv;
    }
  });
});

describe("Remediation Acceptance Suite (B1, B2, B3, B4)", () => {
  // --------------------------------------------------------------------------
  // B1: L1 Stream Rate Limit & Quota Amplification
  // --------------------------------------------------------------------------
  describe("B1: L1 Stream Rate Limit & Quota Amplification", () => {
    it("B1.1: When Redis Circuit Breaker is OPEN, requests evaluate memory fallback directly with zero reliance on multi-instance bypass", async () => {
      _resetMemoryStoreForTesting();
      _resetCircuitBreakerForTesting();

      // Trip the circuit breaker by recording failures
      const now = Date.now();
      for (let i = 0; i < 5; i++) {
        recordRedisFailure("timeout", now);
      }
      assert.strictEqual(isRedisCircuitOpen(now), true, "Circuit breaker must be open");

      const target = "ip:iph_b1_test_cb";
      const config: RateLimitConfig = {
        namespace: "stream-segment",
        maxRequests: 5,
        windowSeconds: 60,
        failClosed: false,
      };

      // Requests must gracefully succeed under memory fallback without hanging
      const res = await checkRateLimit(target, config);
      assert.strictEqual(res.allowed, true);
      assert.strictEqual(res.isFallback, true);
    });

    it("B1.2: Local blocked cache immediately short-circuits blocked targets with HTTP 429", async () => {
      _resetMemoryStoreForTesting();
      const target = "ip:iph_b1_blocked";
      blockSuspiciousTarget(target, 60);

      const config: RateLimitConfig = {
        namespace: "stream-segment",
        maxRequests: 100,
        windowSeconds: 60,
      };

      const res = await checkRateLimit(target, config);
      assert.strictEqual(res.allowed, false);
      assert.strictEqual(res.remaining, 0);
      assert.strictEqual(res.headers["X-RateLimit-Remaining"], "0");
      assert.ok(res.headers["Retry-After"]);
    });

    it("B1.3: Quota amplification across simulated instances is strictly 1.0x (no multi-instance quota multiplication)", async () => {
      _resetMemoryStoreForTesting();
      const runId = Date.now();
      const target = `ip:iph_b1_multi_inst_${runId}`;
      const quota = 10;
      const config: RateLimitConfig = {
        namespace: `test-amplification-${runId}`,
        maxRequests: quota,
        windowSeconds: 60,
        failClosed: false,
      };

      // Simulate 5 separate requests simulating different serverless invocations for same target
      let allowedCount = 0;
      for (let i = 0; i < quota + 5; i++) {
        const res = await checkRateLimit(target, config);
        if (res.allowed) allowedCount++;
      }

      // Must be capped strictly at quota (10), NOT multiplied by instance count!
      assert.strictEqual(allowedCount, quota, `Allowed count (${allowedCount}) must exactly equal quota (${quota})`);
    });

    it("B1.4: Concurrent requests from the same IP share the exact sliding window counter without quota drift", async () => {
      _resetMemoryStoreForTesting();
      const runId = Date.now();
      const target = `ip:iph_b1_concurrent_${runId}`;
      const quota = 8;
      const config: RateLimitConfig = {
        namespace: `test-concurrent-${runId}`,
        maxRequests: quota,
        windowSeconds: 60,
        failClosed: false,
      };

      // Send 15 concurrent requests
      const promises = Array.from({ length: 15 }, () => checkRateLimit(target, config));
      const results = await Promise.all(promises);

      const allowed = results.filter((r) => r.allowed);
      const blocked = results.filter((r) => !r.allowed);

      assert.strictEqual(allowed.length, quota, "Exactly quota requests must be allowed");
      assert.strictEqual(blocked.length, 7, "Remaining requests must be rejected with 429");
    });

    it("B1.5: buildRateLimitResponse includes Cache-Control: no-store, no-cache, must-revalidate", () => {
      const mockResult = {
        allowed: false,
        limit: 10,
        remaining: 0,
        resetSeconds: 30,
        target: "ip:test",
        headers: {
          "X-RateLimit-Limit": "10",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": "30",
          "Retry-After": "30",
        },
      };

      const res = buildRateLimitResponse(mockResult);
      assert.strictEqual(res.status, 429);
      assert.strictEqual(res.headers.get("Cache-Control"), "no-store, no-cache, must-revalidate");
      assert.strictEqual(res.headers.get("Retry-After"), "30");
    });
  });

  // --------------------------------------------------------------------------
  // B2 & B3: Media Cache Classification & Error Responses on Stream Proxies
  // --------------------------------------------------------------------------
  describe("B2 & B3: Media Cache Classification & Upstream Error Caching", () => {
    const makeSignedUrl = (baseProxyPath: string, targetUrl: string) => {
      const token = generateStreamToken({ targetUrl });
      const u = new URL(baseProxyPath, "http://localhost");
      u.searchParams.set("url", targetUrl);
      u.searchParams.set("st", token.token);
      u.searchParams.set("exp", String(token.exp));
      u.searchParams.set("sid", token.sid);
      u.searchParams.set("v", "1");
      return u.toString();
    };

    it("B2.1 & B3.1: Missing url parameter returns 400 with no-store, no-cache, must-revalidate", async () => {
      const { GET } = await import("@/app/api/live-football/proxy/route");
      const req = new NextRequest("http://localhost/api/live-football/proxy");
      const res = await GET(req);

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.headers.get("Cache-Control"), "no-store, no-cache, must-revalidate");
    });

    it("B2.2 & B3.2: SSRF target URL returns 403 with no-store, no-cache, must-revalidate", async () => {
      const { GET } = await import("@/app/api/live-football/proxy/route");
      const req = new NextRequest("http://localhost/api/live-football/proxy?url=http://127.0.0.1:8080/secret");
      const res = await GET(req);

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.headers.get("Cache-Control"), "no-store, no-cache, must-revalidate");
    });

    it("B2.3 & B3.3: Upstream HTTP error returns upstream status with no-store, no-cache, must-revalidate", async () => {
      const origFetch = globalThis.fetch;
      try {
        globalThis.fetch = async () =>
          new Response("Not Found", {
            status: 404,
            statusText: "Not Found",
          });

        const { GET } = await import("@/app/api/live-football/proxy/route");
        const signedUrl = makeSignedUrl("/api/live-football/proxy", "https://cdn.example.com/live/segment-999.ts");
        const req = new NextRequest(signedUrl);
        const res = await GET(req);

        assert.strictEqual(res.status, 404);
        assert.strictEqual(res.headers.get("Cache-Control"), "no-store, no-cache, must-revalidate");
      } finally {
        globalThis.fetch = origFetch;
      }
    });

    it("B2.4: Video segment (.ts, .m4s, .mp4, .aac, .vtt) returns public CDN cache header", async () => {
      const origFetch = globalThis.fetch;
      try {
        globalThis.fetch = async () =>
          new Response(new Uint8Array([0x00, 0x01, 0x02]), {
            status: 200,
            headers: { "Content-Type": "video/mp2t" },
          });

        const { GET } = await import("@/app/api/live-football/proxy/route");
        const signedUrl = makeSignedUrl("/api/live-football/proxy", "https://cdn.example.com/live/segment-1024.ts");
        const req = new NextRequest(signedUrl);
        const res = await GET(req);

        assert.strictEqual(res.status, 200);
        assert.strictEqual(
          res.headers.get("Cache-Control"),
          "public, max-age=120, s-maxage=300, stale-while-revalidate=600"
        );
      } finally {
        globalThis.fetch = origFetch;
      }
    });

    it("B2.5: DRM encryption key (.key) returns strictly private, no-store (AES-128 protection)", async () => {
      const origFetch = globalThis.fetch;
      try {
        globalThis.fetch = async () =>
          new Response(new Uint8Array([0xde, 0xad, 0xbe, 0xef]), {
            status: 200,
            headers: { "Content-Type": "application/octet-stream" },
          });

        const { GET } = await import("@/app/api/live-football/proxy/route");
        const signedUrl = makeSignedUrl("/api/live-football/proxy", "https://cdn.example.com/live/enc.key");
        const req = new NextRequest(signedUrl);
        const res = await GET(req);

        assert.strictEqual(res.status, 200);
        assert.strictEqual(
          res.headers.get("Cache-Control"),
          "private, no-cache, no-store, max-age=0, must-revalidate"
        );
      } finally {
        globalThis.fetch = origFetch;
      }
    });

    it("B2.6: Unknown or unverified extension returns private, no-store", async () => {
      const origFetch = globalThis.fetch;
      try {
        globalThis.fetch = async () =>
          new Response(new Uint8Array([0x01]), {
            status: 200,
            headers: { "Content-Type": "application/octet-stream" },
          });

        const { GET } = await import("@/app/api/live-tv/proxy/route");
        const signedUrl = makeSignedUrl("/api/live-tv/proxy", "https://cdn.example.com/live/payload.unknown");
        const req = new NextRequest(signedUrl);
        const res = await GET(req);

        assert.strictEqual(res.status, 200);
        assert.strictEqual(
          res.headers.get("Cache-Control"),
          "private, no-cache, no-store, max-age=0, must-revalidate"
        );
      } finally {
        globalThis.fetch = origFetch;
      }
    });

    it("B2.7: Response with Set-Cookie header is never cached publicly", async () => {
      const origFetch = globalThis.fetch;
      try {
        globalThis.fetch = async () =>
          new Response(new Uint8Array([0x01]), {
            status: 200,
            headers: {
              "Content-Type": "video/mp2t",
              "Set-Cookie": "session_id=attacker_leak; Path=/",
            },
          });

        const { GET } = await import("@/app/api/live-football/proxy/route");
        const signedUrl = makeSignedUrl("/api/live-football/proxy", "https://cdn.example.com/live/seg.ts");
        const req = new NextRequest(signedUrl);
        const res = await GET(req);

        assert.strictEqual(res.status, 200);
        assert.strictEqual(
          res.headers.get("Cache-Control"),
          "private, no-cache, no-store, max-age=0, must-revalidate"
        );
      } finally {
        globalThis.fetch = origFetch;
      }
    });

    it("B2.8: HLS playlist (.m3u8) retains short TTL no-cache, no-store, must-revalidate", async () => {
      const origFetch = globalThis.fetch;
      try {
        globalThis.fetch = async () =>
          new Response("#EXTM3U\n#EXT-X-VERSION:3\n#EXTINF:6.0,\nseg1.ts\n", {
            status: 200,
            headers: { "Content-Type": "application/vnd.apple.mpegurl" },
          });

        const { GET } = await import("@/app/api/live-football/proxy/route");
        const req = new NextRequest("http://localhost/api/live-football/proxy?url=https://cdn.example.com/live/master.m3u8");
        const res = await GET(req);

        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.headers.get("Cache-Control"), "no-cache, no-store, must-revalidate");
      } finally {
        globalThis.fetch = origFetch;
      }
    });

    it("B3.5: Upstream fetch network exception / timeout returns 502 with no-store, no-cache, must-revalidate", async () => {
      const origFetch = globalThis.fetch;
      try {
        globalThis.fetch = async () => {
          throw new Error("Connection timed out to upstream CDN");
        };

        const { GET } = await import("@/app/api/live-tv/proxy/route");
        const signedUrl = makeSignedUrl("/api/live-tv/proxy", "https://cdn.example.com/live/stream.ts");
        const req = new NextRequest(signedUrl);
        const res = await GET(req);

        assert.strictEqual(res.status, 502);
        assert.strictEqual(res.headers.get("Cache-Control"), "no-store, no-cache, must-revalidate");
      } finally {
        globalThis.fetch = origFetch;
      }
    });
  });

  // --------------------------------------------------------------------------
  // B4: Movie Recommendations POST Cache & Contract
  // --------------------------------------------------------------------------
  describe("B4: Movie Recommendations POST Cache", () => {
    it("B4.1: Missing slug returns 400 with no-store, no-cache, must-revalidate", async () => {
      const { POST } = await import("@/app/api/movies/recommendations/route");
      const req = new NextRequest("http://localhost/api/movies/recommendations", {
        method: "POST",
        body: JSON.stringify({ currentMovieTitle: "Missing Slug" }),
      });

      const res = await POST(req);
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.headers.get("Cache-Control"), "no-store, no-cache, must-revalidate");
    });

    it("B4.2: Valid POST returns recommendations with private, no-cache, no-store, max-age=0, must-revalidate", async () => {
      const origFetch = globalThis.fetch;
      try {
        globalThis.fetch = async () =>
          new Response(
            JSON.stringify({
              status: "success",
              data: {
                items: [
                  {
                    name: "Phim Tương Tự 1",
                    slug: "phim-tuong-tu-1",
                    origin_name: "Similar Movie 1",
                    thumb_url: "https://image.test/thumb.jpg",
                    poster_url: "https://image.test/poster.jpg",
                    year: 2024,
                  },
                ],
                params: { pagination: { totalItems: 1 } },
              },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );

        const { POST } = await import("@/app/api/movies/recommendations/route");
        const createReq = () =>
          new NextRequest("http://localhost/api/movies/recommendations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              currentMovieSlug: "b4-test-movie-slug",
              currentMovieTitle: "B4 Test Movie",
              categories: [{ name: "Hành Động", slug: "hanh-dong" }],
              countries: [{ name: "Việt Nam", slug: "viet-nam" }],
            }),
          });

        const res = await POST(createReq());
        assert.strictEqual(res.status, 200);
        assert.strictEqual(
          res.headers.get("Cache-Control"),
          "private, no-cache, no-store, max-age=0, must-revalidate"
        );
        assert.ok(res.headers.has("X-Cache"), "Must indicate X-Cache status (MISS/HIT/STALE)");

        // Second immediate call must hit RAM cache (HIT)
        const res2 = await POST(createReq());
        assert.strictEqual(res2.status, 200);
        assert.strictEqual(
          res2.headers.get("Cache-Control"),
          "private, no-cache, no-store, max-age=0, must-revalidate"
        );
        assert.strictEqual(res2.headers.get("X-Cache"), "HIT");
      } finally {
        globalThis.fetch = origFetch;
      }
    });

    it("ROUND 3 - B2-01: Disallows public cache for unallowed extensions regardless of media MIME", async () => {
      const { isSafePublicSegment } = await import("@/app/api/live-football/proxy/route");
      const req = new NextRequest("http://localhost/api/live-football/proxy?url=https://stream.example/seg.unknown");
      const dummyRes = new Response(new Uint8Array([1, 2, 3]), {
        headers: { "Content-Type": "video/mp4" },
      });

      // .unknown with video/mp4 -> MUST BE FALSE
      assert.strictEqual(
        isSafePublicSegment(req, "https://stream.example/seg.unknown", "video/mp4", dummyRes),
        false
      );

      // .bin with video/mp2t -> MUST BE FALSE
      assert.strictEqual(
        isSafePublicSegment(req, "https://stream.example/seg.bin", "video/mp2t", dummyRes),
        false
      );

      // .json with video/mp4 -> MUST BE FALSE
      assert.strictEqual(
        isSafePublicSegment(req, "https://stream.example/seg.json", "video/mp4", dummyRes),
        false
      );

      // no extension with video/mp4 -> MUST BE FALSE
      assert.strictEqual(
        isSafePublicSegment(req, "https://stream.example/segment_chunk", "video/mp4", dummyRes),
        false
      );

      // .ts with video/mp2t -> MUST BE TRUE
      assert.strictEqual(
        isSafePublicSegment(req, "https://stream.example/segment_100.ts", "video/mp2t", dummyRes),
        true
      );
    });

    it("ROUND 3 - B2-02: Enforces private no-store when request or response contains auth/cookie headers", async () => {
      const { isSafePublicSegment } = await import("@/app/api/live-football/proxy/route");
      const dummyRes = new Response(new Uint8Array([1, 2, 3]), {
        headers: { "Content-Type": "video/mp2t" },
      });

      // Client request with Authorization header -> FALSE
      const reqWithAuth = new NextRequest("http://localhost/api/live-football/proxy?url=https://stream.example/seg.ts", {
        headers: { authorization: "Bearer secret-jwt-token" },
      });
      assert.strictEqual(
        isSafePublicSegment(reqWithAuth, "https://stream.example/seg.ts", "video/mp2t", dummyRes),
        false
      );

      // Client request with Cookie header -> FALSE
      const reqWithCookie = new NextRequest("http://localhost/api/live-football/proxy?url=https://stream.example/seg.ts", {
        headers: { cookie: "session_id=12345" },
      });
      assert.strictEqual(
        isSafePublicSegment(reqWithCookie, "https://stream.example/seg.ts", "video/mp2t", dummyRes),
        false
      );

      // Clean request
      const cleanReq = new NextRequest("http://localhost/api/live-football/proxy?url=https://stream.example/seg.ts");

      // Upstream response with Set-Cookie -> FALSE
      const resWithCookie = new Response(new Uint8Array([1, 2, 3]), {
        headers: { "Content-Type": "video/mp2t", "set-cookie": "token=abc; Path=/" },
      });
      assert.strictEqual(
        isSafePublicSegment(cleanReq, "https://stream.example/seg.ts", "video/mp2t", resWithCookie),
        false
      );

      // Upstream response with Vary: Cookie -> FALSE
      const resWithVary = new Response(new Uint8Array([1, 2, 3]), {
        headers: { "Content-Type": "video/mp2t", vary: "Cookie, User-Agent" },
      });
      assert.strictEqual(
        isSafePublicSegment(cleanReq, "https://stream.example/seg.ts", "video/mp2t", resWithVary),
        false
      );
    });

    it("ROUND 3 - B2-03: Enforces private no-store for sensitive tokens or signatures in query params", async () => {
      const { isSafePublicSegment } = await import("@/app/api/live-football/proxy/route");
      const cleanReq = new NextRequest("http://localhost/api/live-football/proxy");
      const dummyRes = new Response(new Uint8Array([1, 2, 3]), {
        headers: { "Content-Type": "video/mp2t" },
      });

      const sensitiveUrls = [
        "https://stream.example/seg.ts?token=xyz123",
        "https://stream.example/seg.ts?access_token=xyz123",
        "https://stream.example/seg.ts?signature=sig456",
        "https://stream.example/seg.ts?sig=sig456",
        "https://stream.example/seg.ts?expires=1730000000",
        "https://stream.example/seg.ts?policy=eyJyZXNvdXJjZSI",
        "https://stream.example/seg.ts?key=secretkey",
      ];

      for (const url of sensitiveUrls) {
        assert.strictEqual(
          isSafePublicSegment(cleanReq, url, "video/mp2t", dummyRes),
          false,
          `Failed for sensitive URL: ${url}`
        );
      }

      // Safe query params (e.g., standard track or bitrate params)
      const safeUrl = "https://stream.example/seg.ts?bitrate=1500&track=video";
      assert.strictEqual(
        isSafePublicSegment(cleanReq, safeUrl, "video/mp2t", dummyRes),
        true
      );
    });

    it("ROUND 3 - B4-01: Recommendations canonical cache key eliminates cross-user collision", async () => {
      const { getCanonicalRecommendationsCacheKey } = await import("@/app/api/movies/recommendations/route");

      const baseReq = {
        currentMovieSlug: "oppenheimer-2023",
        tmdbId: "872585",
        categories: [{ name: "Lịch Sử", slug: "lich-su" }, { name: "Chính Kịch", slug: "chinh-kich" }],
        countries: [{ name: "Âu Mỹ", slug: "au-my" }],
        primaryActor: "Cillian Murphy",
        primaryDirector: "Christopher Nolan",
        year: 2023,
      };

      const keyBase = getCanonicalRecommendationsCacheKey(baseReq);

      // 1. Different genre -> must have completely different cache key
      const keyDiffGenre = getCanonicalRecommendationsCacheKey({
        ...baseReq,
        categories: [{ name: "Hành Động", slug: "hanh-dong" }],
      });
      assert.notStrictEqual(keyBase, keyDiffGenre);

      // 2. Different actor -> must have completely different cache key
      const keyDiffActor = getCanonicalRecommendationsCacheKey({
        ...baseReq,
        primaryActor: "Robert Downey Jr.",
      });
      assert.notStrictEqual(keyBase, keyDiffActor);

      // 3. Different country -> must have completely different cache key
      const keyDiffCountry = getCanonicalRecommendationsCacheKey({
        ...baseReq,
        countries: [{ name: "Hàn Quốc", slug: "han-quoc" }],
      });
      assert.notStrictEqual(keyBase, keyDiffCountry);

      // 4. Same fields but categories in reversed order -> canonical key MUST MATCH (order independent)
      const keyReversedCategories = getCanonicalRecommendationsCacheKey({
        ...baseReq,
        categories: [{ name: "Chính Kịch", slug: "chinh-kich" }, { name: "Lịch Sử", slug: "lich-su" }],
      });
      assert.strictEqual(keyBase, keyReversedCategories);
    });
  });
});




