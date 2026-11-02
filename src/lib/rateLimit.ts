/**
 * Unified Distributed Rate Limiting & Abuse Prevention Engine for Nanaflix
 * - Engine: Upstash Redis Sliding Window Log (ZSET) for accurate distributed enforcement across serverless instances.
 * - Resilience: Ephemeral L1 Blocked Cache (0ms), In-memory fallback for public read.
 * - Security: Dual-Key verification (Verified UID + Salted IP Hash), Zero Raw IP exposure, Strict Fail-Closed policy on sensitive endpoints.
 */

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import crypto from "crypto";

// ============================================================================
// 1. IP RESOLUTION & PSEUDONYMIZATION (ZERO RAW IP STORAGE)
// ============================================================================

const IP_HASH_SALT =
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.ADMIN_SYNC_SECRET ||
  "nanaflix_sec_salt_2026_strict";

export {
  parseIpv4,
  isValidIp,
  isCloudflareIp,
  cleanIpString,
  getClientIp,
  CLOUDFLARE_IPV4_CIDR_STRINGS,
  CLOUDFLARE_IPV4_CIDRS,
  CLOUDFLARE_IPV6_PREFIXES,
} from "./clientIp";
import { getClientIp } from "./clientIp";

/**
 * Irreversible SHA-256 IP fingerprinting
 */
export function hashClientIp(rawIp?: string | null): string {
  if (!rawIp || rawIp === "anonymous-client" || rawIp === "127.0.0.1") {
    return "iph_local_anon";
  }
  return (
    "iph_" +
    crypto
      .createHmac("sha256", IP_HASH_SALT)
      .update(rawIp.trim())
      .digest("hex")
      .slice(0, 16)
  );
}

// ============================================================================
// 2. REDIS CLIENT & FAILOVER CONFIGURATION
// ============================================================================

let cachedRedisClient: Redis | null = null;
let cachedRedisSignature: string | null = null;

export function _resetRedisClientForTesting(): void {
  cachedRedisClient = null;
  cachedRedisSignature = null;
}

/**
 * Resolves the environment prefix for Redis keys to prevent
 * accidental cross-environment quota collisions (development, test, preview, production).
 *
 * Priority order:
 * 1. Test Mode (Safety isolation for tests)
 * 2. Preview Mode (Checked before NODE_ENV=production, as Vercel runs Preview in production mode)
 * 3. Production Mode
 * 4. Development (Default fallback)
 */
export function getRateLimitEnvPrefix(): "development" | "test" | "preview" | "production" {
  if (process.env.APP_ENV === "test" || process.env.NODE_ENV === "test") {
    return "test";
  }
  if (process.env.VERCEL_ENV === "preview" || process.env.APP_ENV === "preview") {
    return "preview";
  }
  if (
    process.env.VERCEL_ENV === "production" ||
    process.env.APP_ENV === "production" ||
    process.env.NODE_ENV === "production"
  ) {
    return "production";
  }
  return "development";
}

export function getRedisInstance(): Redis | null {
  const isTest = process.env.NODE_ENV === "test" || process.env.APP_ENV === "test";

  let url: string | undefined;
  let token: string | undefined;

  if (isTest) {
    url = process.env.TEST_REDIS_URL?.trim();
    token = process.env.TEST_REDIS_TOKEN?.trim();
    const prodUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
    if (url && prodUrl && url.toLowerCase() === prodUrl.toLowerCase()) {
      console.warn("[RateLimit Safety Guard] TEST_REDIS_URL matches UPSTASH_REDIS_REST_URL. Refusing to connect to production Redis during tests.");
      cachedRedisClient = null;
      cachedRedisSignature = null;
      return null;
    }
  } else {
    url = process.env.UPSTASH_REDIS_REST_URL?.trim();
    token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  }

  if (!url || !token) {
    cachedRedisClient = null;
    cachedRedisSignature = null;
    return null;
  }

  const signature = `${url}:::${token}`;
  if (cachedRedisClient && cachedRedisSignature === signature) {
    return cachedRedisClient;
  }

  try {
    cachedRedisClient = new Redis({
      url,
      token,
      keepAlive: true,
      retry: false, // Don't block serverless execution
    });
    cachedRedisSignature = signature;
    return cachedRedisClient;
  } catch (err) {
    console.warn("[RateLimit] Failed to initialize Redis client:", err);
    cachedRedisClient = null;
    cachedRedisSignature = null;
    return null;
  }
}

// ============================================================================
// 3. TYPES & PRESETS
// ============================================================================

export interface RateLimitConfig {
  namespace: string;
  maxRequests: number;
  windowSeconds: number;
  failClosed?: boolean; // True for mutations/AI/upload/admin: reject if Redis fails
  timeoutMs?: number;
  fallbackMaxRequests?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
  target: string;
  isFallback?: boolean;
  reason?: string;
  headers: Record<string, string>;
}

export const RATE_LIMIT_PRESETS = {
  PUBLIC_READ: {
    namespace: "public-read",
    maxRequests: 120,
    windowSeconds: 60,
    failClosed: false,
  },
  POSTER_FALLBACK: {
    namespace: "poster-fallback",
    maxRequests: 300,
    windowSeconds: 60,
    failClosed: false,
  },
  USER_READ: {
    namespace: "user-read",
    maxRequests: 180,
    windowSeconds: 60,
    failClosed: false,
  },
  SEARCH: {
    namespace: "search",
    maxRequests: 30,
    windowSeconds: 60,
    failClosed: false,
  },
  COMMENTS_READ: {
    namespace: "comments-read",
    maxRequests: 60,
    windowSeconds: 60,
    failClosed: false,
  },
  COMMENT_CREATE: {
    namespace: "comment-create",
    maxRequests: 5,
    windowSeconds: 600, // 5 requests / 10 mins / user
    failClosed: true,
  },
  COMMENT_MUTATION: {
    namespace: "comments-mutation",
    maxRequests: 30,
    windowSeconds: 60, // 30 requests / 1 min / user
    failClosed: true,
  },
  COMMENT_DELETE: {
    namespace: "comments-delete",
    maxRequests: 20,
    windowSeconds: 600, // 20 requests / 10 mins / user
    failClosed: true,
  },
  AI_REQUEST: {
    namespace: "ai-request",
    maxRequests: 10,
    windowSeconds: 600, // 10 requests / 10 mins / user
    failClosed: true,
  },
  UPLOAD: {
    namespace: "upload",
    maxRequests: 10,
    windowSeconds: 600, // 10 requests / 10 mins / user
    failClosed: true,
  },
  USER_MUTATION: {
    namespace: "user-mutation",
    maxRequests: 30,
    windowSeconds: 600, // 30 requests / 10 mins / user
    failClosed: true,
  },
  AUTH_SENSITIVE: {
    namespace: "auth-sensitive",
    maxRequests: 10,
    windowSeconds: 900, // 10 requests / 15 mins / IP
    failClosed: true,
  },
  AUTH_ACCOUNT: {
    namespace: "auth-account",
    maxRequests: 5,
    windowSeconds: 300, // 5 requests / 5 mins / target account
    failClosed: true,
  },
  AUTH_VERIFY: {
    namespace: "auth-verify",
    maxRequests: 60,
    windowSeconds: 60, // 60 token verifications / 1 min / IP
    failClosed: true,
  },
  ADMIN_MUTATION: {
    namespace: "admin-mutation",
    maxRequests: 30,
    windowSeconds: 600, // 30 requests / 10 mins / admin
    failClosed: true,
  },
  HLS_PLAYLIST: {
    namespace: "stream-playlist",
    maxRequests: 180,
    windowSeconds: 60, // 180 requests / 60s per IP (allows manifest polling & adaptive bitrate switching)
    failClosed: false,
  },
  HLS_SEGMENT: {
    namespace: "stream-segment",
    maxRequests: 1200,
    windowSeconds: 60, // 1200 requests / 60s per IP (high throughput for 1080p/4K segments + burst buffer)
    failClosed: false,
  },
  STREAM_PROXY: {
    namespace: "stream-proxy",
    maxRequests: 300,
    windowSeconds: 60, // 300 requests / 60s per IP (fallback media proxy)
    failClosed: false,
  },
  RECOMMENDATIONS: {
    namespace: "recommendations",
    maxRequests: 30,
    windowSeconds: 60, // 30 requests / 60s per IP (heavy parallel compute)
    failClosed: false,
  },
  TRANSLATION: {
    namespace: "translation",
    maxRequests: 30,
    windowSeconds: 60, // 30 requests / 60s per IP (outbound translation API)
    failClosed: false,
  },
  ANALYTICS_TRACK: {
    namespace: "analytics-track",
    maxRequests: 60,
    windowSeconds: 60,
    failClosed: false,
  },
} as const;

/**
 * Differentiate HLS streaming traffic into appropriate rate limiting presets:
 * - Playlists (.m3u8): Manifest refresh & adaptation control plane (180 req / 60s)
 * - Media Segments (.ts, .m4s, .mp4, .aac, .key, .vtt): High-throughput video/audio data plane (1200 req / 60s)
 * - General Stream Proxy: Default media relay fallback (300 req / 60s)
 */
export function resolveStreamingRateLimitPreset(targetUrl?: string | null): RateLimitConfig {
  if (!targetUrl || typeof targetUrl !== "string") {
    return RATE_LIMIT_PRESETS.STREAM_PROXY;
  }
  const clean = targetUrl.split("?")[0].toLowerCase();
  if (clean.endsWith(".m3u8") || clean.includes("playlist") || clean.includes("manifest")) {
    return RATE_LIMIT_PRESETS.HLS_PLAYLIST;
  }
  if (
    clean.endsWith(".ts") ||
    clean.endsWith(".m4s") ||
    clean.endsWith(".mp4") ||
    clean.endsWith(".aac") ||
    clean.endsWith(".vtt") ||
    clean.endsWith(".key") ||
    clean.endsWith(".sub") ||
    clean.endsWith(".png") ||
    clean.endsWith(".jpg") ||
    clean.includes("/segment") ||
    clean.includes("/fragment") ||
    clean.includes("/chunk")
  ) {
    return RATE_LIMIT_PRESETS.HLS_SEGMENT;
  }
  return RATE_LIMIT_PRESETS.STREAM_PROXY;
}

// ============================================================================
// 4. MEMORY CACHE & FALLBACK STORES
// ============================================================================

// L1 Ephemeral Blocked Cache (0ms latency, zero Redis queries while blocked)
const localBlockedCache = new Map<string, number>();

// In-Memory Sliding Window Fallback (per serverless instance)
interface MemoryRecord {
  timestamps: number[];
}
const localMemoryStore = new Map<string, MemoryRecord>();

// Periodic memory cleanup every 5 minutes
if (typeof setInterval !== "undefined") {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, exp] of localBlockedCache.entries()) {
      if (exp <= now) localBlockedCache.delete(key);
    }
    for (const [key, rec] of localMemoryStore.entries()) {
      rec.timestamps = rec.timestamps.filter((t) => now - t < 15 * 60 * 1000);
      if (rec.timestamps.length === 0) localMemoryStore.delete(key);
    }
  }, 5 * 60 * 1000);
  cleanupTimer.unref?.();
}

export function _resetMemoryStoreForTesting(): void {
  localBlockedCache.clear();
  localMemoryStore.clear();
}

/**
 * Ephemerally block a suspicious target (IP hash or account ID) across the current runtime
 */
export function blockSuspiciousTarget(target: string, durationSeconds: number = 600): void {
  const envPrefix = getRateLimitEnvPrefix();
  const key = `sec:blocked:${envPrefix}:${target}`;
  localBlockedCache.set(key, Date.now() + durationSeconds * 1000);
}

/**
 * Check if a target is actively blocked ephemerally
 */
export function isTargetBlocked(target: string): boolean {
  const envPrefix = getRateLimitEnvPrefix();
  const key = `sec:blocked:${envPrefix}:${target}`;
  const exp = localBlockedCache.get(key);
  if (!exp) return false;
  if (exp <= Date.now()) {
    localBlockedCache.delete(key);
    return false;
  }
  return true;
}

// ============================================================================
// REDIS HEALTH MONITOR & CIRCUIT BREAKER
// ============================================================================

export type RedisErrorKind = "timeout" | "connection" | "command";

export interface ClassifiedRedisError {
  kind: RedisErrorKind;
  message: string;
}

/**
 * Classifies Redis errors into timeout, connection, or command errors,
 * and strips any potential secrets/tokens from the message.
 */
export function classifyRedisError(err: unknown): ClassifiedRedisError {
  if (!err) {
    return { kind: "command", message: "Unknown error" };
  }
  const rawMsg = err instanceof Error ? err.message : String(err);
  const sanitizedMsg = rawMsg
    .replace(/https?:\/\/[^\s/@]+@/gi, "http://***@")
    .replace(/bearer\s+[a-zA-Z0-9._-]+/gi, "Bearer ***")
    .replace(/token=[a-zA-Z0-9._-]+/gi, "token=***");

  const lower = sanitizedMsg.toLowerCase();

  if (
    lower.includes("timeout") ||
    lower.includes("abort") ||
    lower.includes("timed out")
  ) {
    return { kind: "timeout", message: sanitizedMsg };
  }

  if (
    lower.includes("fetch failed") ||
    lower.includes("econnrefused") ||
    lower.includes("econnreset") ||
    lower.includes("enotfound") ||
    lower.includes("network") ||
    lower.includes("socket") ||
    lower.includes("dns") ||
    lower.includes("ehostunreach")
  ) {
    return { kind: "connection", message: sanitizedMsg };
  }

  return { kind: "command", message: sanitizedMsg };
}

interface CircuitBreakerState {
  consecutiveFailures: number;
  openUntil: number;
  lastLoggedAt: number;
}

const redisCircuitBreaker: CircuitBreakerState = {
  consecutiveFailures: 0,
  openUntil: 0,
  lastLoggedAt: 0,
};

export function _resetCircuitBreakerForTesting(): void {
  redisCircuitBreaker.consecutiveFailures = 0;
  redisCircuitBreaker.openUntil = 0;
  redisCircuitBreaker.lastLoggedAt = 0;
}

export function isRedisCircuitOpen(now: number = Date.now()): boolean {
  return redisCircuitBreaker.openUntil > now;
}

export function recordRedisSuccess(): void {
  if (redisCircuitBreaker.consecutiveFailures > 0 || redisCircuitBreaker.openUntil > 0) {
    redisCircuitBreaker.consecutiveFailures = 0;
    redisCircuitBreaker.openUntil = 0;
  }
}

export function recordRedisFailure(kind: RedisErrorKind, now: number = Date.now()): void {
  // Command errors (e.g. key syntax) are application issues, not network/service outages
  if (kind === "command") return;

  redisCircuitBreaker.consecutiveFailures += 1;

  // If 2 or more consecutive network/timeout errors, trip breaker for 2.5s (up to 5s max)
  if (redisCircuitBreaker.consecutiveFailures >= 2) {
    const cooldownMs = Math.min(5000, 2500 * (redisCircuitBreaker.consecutiveFailures - 1));
    redisCircuitBreaker.openUntil = now + cooldownMs;

    if (now - redisCircuitBreaker.lastLoggedAt > 5000) {
      console.warn(
        `[RateLimit:CircuitBreaker] Redis experiencing consecutive ${kind}s (${redisCircuitBreaker.consecutiveFailures}). Circuit breaker opened for ${cooldownMs}ms; using local fallback.`
      );
      redisCircuitBreaker.lastLoggedAt = now;
    }
  }
}

/**
 * Evaluates in-memory sliding window fallback when Redis is unavailable, slow, or circuit is open.
 * Protects against multi-instance quota multiplication by bounding local quotas.
 */
function evaluateMemoryFallback(
  key: string,
  target: string,
  config: RateLimitConfig,
  now: number,
  windowMs: number
): RateLimitResult {
  let rec = localMemoryStore.get(key);
  if (!rec) {
    rec = { timestamps: [] };
    localMemoryStore.set(key, rec);
  }
  rec.timestamps = rec.timestamps.filter((t) => now - t < windowMs);

  if (config.failClosed) {
    // For sensitive endpoints (AI, Mutations, Upload, Admin), Fail-Closed when Redis is down
    // Allow very small local burst to prevent total bricking, but block rapid automated requests
    // Strict local threshold: 50% of nominal or at least 1 request
    const fallbackMax = Math.max(1, Math.floor(config.maxRequests * 0.5));
    if (rec.timestamps.length >= fallbackMax) {
      return {
        allowed: false,
        limit: config.maxRequests,
        remaining: 0,
        resetSeconds: config.windowSeconds,
        target,
        isFallback: true,
        reason: "Hệ thống bảo vệ phân tán đang bảo trì. Thao tác tạm dừng để đảm bảo an toàn.",
        headers: {
          "X-RateLimit-Limit": String(config.maxRequests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(config.windowSeconds),
          "Retry-After": String(config.windowSeconds),
        },
      };
    }

    rec.timestamps.push(now);
    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: Math.max(0, fallbackMax - rec.timestamps.length),
      resetSeconds: config.windowSeconds,
      target,
      isFallback: true,
      headers: {
        "X-RateLimit-Limit": String(config.maxRequests),
        "X-RateLimit-Remaining": String(fallbackMax - rec.timestamps.length),
        "X-RateLimit-Reset": String(config.windowSeconds),
      },
    };
  }

  // For public read endpoints: local in-memory sliding window fallback (Fail-Open)
  // Multi-instance quota protection: bound each serverless instance to a conservative partition
  // (e.g. 50% for high-volume endpoints, never exceeding config.maxRequests).
  const fallbackMax = config.fallbackMaxRequests ?? (
    config.maxRequests > 10
      ? Math.max(5, Math.min(config.maxRequests, Math.floor(config.maxRequests * 0.5)))
      : config.maxRequests
  );

  if (rec.timestamps.length >= fallbackMax) {
    const resetSeconds = config.windowSeconds;
    return {
      allowed: false,
      limit: config.maxRequests,
      remaining: 0,
      resetSeconds,
      target,
      isFallback: true,
      reason: "Tần suất yêu cầu vượt quá giới hạn (Local Fallback).",
      headers: {
        "X-RateLimit-Limit": String(config.maxRequests),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(resetSeconds),
        "Retry-After": String(resetSeconds),
      },
    };
  }

  rec.timestamps.push(now);
  const remaining = Math.max(0, config.maxRequests - rec.timestamps.length);
  return {
    allowed: true,
    limit: config.maxRequests,
    remaining,
    resetSeconds: config.windowSeconds,
    target,
    isFallback: true,
    headers: {
      "X-RateLimit-Limit": String(config.maxRequests),
      "X-RateLimit-Remaining": String(remaining),
      "X-RateLimit-Reset": String(config.windowSeconds),
    },
  };
}

// ============================================================================
// 5. CORE SLIDING WINDOW ENFORCEMENT
// ============================================================================

/**
 * Execute distributed sliding window rate limit using Redis Sorted Set (ZSET)
 */
export async function checkRateLimit(
  target: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const windowStart = now - windowMs;
  const envPrefix = getRateLimitEnvPrefix();
  const key = `sec:rl:${envPrefix}:${config.namespace}:${target}`;

  // Calibrated timeout budget:
  // - Explicit config.timeoutMs takes highest priority.
  // - Otherwise: 500ms for sensitive fail-closed endpoints (AUTH, AI, MUTATION) to ensure distributed consistency.
  // - 350ms for fail-open public endpoints (PUBLIC_READ, SEARCH, STREAMING) to absorb cold TLS handshakes (~200-240ms) without false timeouts, while failing open quickly.
  const defaultTimeoutMs = config.failClosed ? 500 : 350;
  const timeoutMs = config.timeoutMs ?? defaultTimeoutMs;

  // 0. Check Ephemeral Suspicious Target Block (Anti-Abuse / Brute-force Lockout)
  const suspiciousBlockedKey = `sec:blocked:${envPrefix}:${target}`;
  const targetBlockedUntil = localBlockedCache.get(suspiciousBlockedKey);
  if (targetBlockedUntil && targetBlockedUntil > now) {
    const resetSeconds = Math.max(1, Math.ceil((targetBlockedUntil - now) / 1000));
    return {
      allowed: false,
      limit: config.maxRequests,
      remaining: 0,
      resetSeconds,
      target,
      reason: "Hệ thống phát hiện dấu hiệu bất thường và đang tạm khóa truy cập. Vui lòng thử lại sau.",
      headers: {
        "X-RateLimit-Limit": String(config.maxRequests),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(resetSeconds),
        "Retry-After": String(resetSeconds),
      },
    };
  }

  // 1. Check L1 Ephemeral Blocked Cache
  const blockedUntil = localBlockedCache.get(key);
  if (blockedUntil && blockedUntil > now) {
    const resetSeconds = Math.max(1, Math.ceil((blockedUntil - now) / 1000));
    return {
      allowed: false,
      limit: config.maxRequests,
      remaining: 0,
      resetSeconds,
      target,
      reason: "Tần suất yêu cầu vượt quá giới hạn cho phép.",
      headers: {
        "X-RateLimit-Limit": String(config.maxRequests),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(resetSeconds),
        "Retry-After": String(resetSeconds),
      },
    };
  }

  // 1.2. Check Redis Circuit Breaker (Avoid stalling requests if Redis is having an active outage)
  const circuitOpen = isRedisCircuitOpen(now);
  if (circuitOpen) {
    return evaluateMemoryFallback(key, target, config, now, windowMs);
  }

  const redis = getRedisInstance();

  // 2. Distributed Sliding Window via Upstash Redis ZSET Pipeline
  if (redis) {
    let timeoutTimer: NodeJS.Timeout | undefined;
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutTimer = setTimeout(() => {
          reject(new Error("Redis rate limit timeout"));
        }, timeoutMs);
      });

      const uniqueMember = `${now}:${Math.random().toString(36).slice(2, 9)}`;

      const pipelinePromise = (async () => {
        const p = redis.pipeline();
        p.zremrangebyscore(key, 0, windowStart);
        p.zcard(key);
        p.zadd(key, { score: now, member: uniqueMember });
        p.expire(key, config.windowSeconds + 15);
        const results = await p.exec<[number, number, number, number]>();
        return results[1]; // Result of zcard before adding new request
      })();

      const currentCount = await Promise.race([pipelinePromise, timeoutPromise]);
      clearTimeout(timeoutTimer);
      recordRedisSuccess();

      const totalCount = typeof currentCount === "number" ? currentCount + 1 : 1;

      if (totalCount > config.maxRequests) {
        const resetSeconds = config.windowSeconds;
        localBlockedCache.set(key, now + resetSeconds * 1000);
        return {
          allowed: false,
          limit: config.maxRequests,
          remaining: 0,
          resetSeconds,
          target,
          reason: "Tần suất yêu cầu vượt quá giới hạn cho phép.",
          headers: {
            "X-RateLimit-Limit": String(config.maxRequests),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(resetSeconds),
            "Retry-After": String(resetSeconds),
          },
        };
      }

      const remaining = Math.max(0, config.maxRequests - totalCount);
      return {
        allowed: true,
        limit: config.maxRequests,
        remaining,
        resetSeconds: config.windowSeconds,
        target,
        headers: {
          "X-RateLimit-Limit": String(config.maxRequests),
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": String(config.windowSeconds),
        },
      };
    } catch (err) {
      clearTimeout(timeoutTimer);
      const { kind, message } = classifyRedisError(err);
      recordRedisFailure(kind, now);

      // Safe logging: avoid logging raw IPs, tokens, or URL secrets
      const safeTarget = target.startsWith("ip:iph_")
        ? target
        : target.replace(/^ip:(.+)$/, "ip:sanitized");

      if (kind === "timeout") {
        console.warn(
          `[RateLimit:Timeout] Redis timeout on ${config.namespace}:${safeTarget} (threshold ${timeoutMs}ms): ${message}`
        );
      } else if (kind === "connection") {
        console.warn(
          `[RateLimit:ConnectionError] Redis connection failure on ${config.namespace}:${safeTarget}: ${message}`
        );
      } else {
        console.warn(
          `[RateLimit:CommandError] Redis command error on ${config.namespace}:${safeTarget}: ${message}`
        );
      }
      // Redis unavailable: proceed to Fallback Evaluation below
    }
  }

  // 3. Fallback Evaluation
  return evaluateMemoryFallback(key, target, config, now, windowMs);
}

// ============================================================================
// 6. REQUEST GUARDS & DUAL-KEY HELPERS
// ============================================================================

/**
 * Enforce rate limit for an HTTP request
 * - If verifiedUserId is provided, limits by `user:${verifiedUserId}` AND enforces IP burst protection.
 * - If anonymous, limits by `ip:${ipHash}`.
 */
export async function enforceRateLimit(
  req: NextRequest,
  config: RateLimitConfig,
  verifiedUserId?: string | null
): Promise<RateLimitResult> {
  const rawIp = getClientIp(req);
  const ipHash = hashClientIp(rawIp);

  if (verifiedUserId) {
    // 1. User level quota
    const userResult = await checkRateLimit(`user:${verifiedUserId}`, config);
    if (!userResult.allowed) return userResult;

    // 2. IP burst protection (Max 60 req/min/IP regardless of account)
    const ipBurstConfig: RateLimitConfig = {
      namespace: `${config.namespace}:ip-burst`,
      maxRequests: Math.max(30, config.maxRequests * 2),
      windowSeconds: 60,
      failClosed: config.failClosed,
    };
    const ipResult = await checkRateLimit(`ip:${ipHash}`, ipBurstConfig);
    if (!ipResult.allowed) {
      return {
        ...ipResult,
        reason: "Phát hiện tần suất truy cập bất thường từ thiết bị của bạn. Vui lòng chờ giây lát.",
      };
    }

    return userResult;
  }

  // Anonymous: limit by salted IP hash
  return checkRateLimit(`ip:${ipHash}`, config);
}

/**
 * Standard HTTP 429 Response builder
 */
export function buildRateLimitResponse(
  result: RateLimitResult,
  customMessage?: string
): NextResponse {
  return NextResponse.json(
    {
      error:
        customMessage ||
        result.reason ||
        "Bạn đang thao tác quá nhanh. Vui lòng chờ một chút trước khi thử lại.",
      retryAfter: result.resetSeconds,
    },
    {
      status: 429,
      headers: {
        ...result.headers,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
