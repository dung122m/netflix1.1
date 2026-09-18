import { Redis } from "@upstash/redis";

/**
 * Cache abstraction layer for Nanaflix.
 * Multi-Tier Cache:
 * - L1: In-Memory RAM (0ms latency, bounded size)
 * - L2: Upstash Redis via Serverless REST API
 * - Single-Flight Mutex: Prevents cache stampede on simultaneous misses
 * - Resilient Fail-safe: Automatic graceful fallback if Redis is unavailable or unconfigured
 */

export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  fetchOrSet<T>(key: string, fetcher: () => Promise<T>, ttlSeconds?: number): Promise<T>;
  clearL1(): void;
  hasL1(key: string): boolean;
}

interface L1CacheEntry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
  expireAt: number;
}

const L1_CACHE = new Map<string, L1CacheEntry>();
const MAX_L1_ENTRIES = 600;

// Single-Flight Mutex: Batches concurrent requests for the same key so fetcher runs only once
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const inFlightRequests = new Map<string, Promise<any>>();

let redisClient: Redis | null = null;
let isRedisInitChecked = false;
let isWarnedUnavailable = false;

function getRedisClient(): Redis | null {
  if (isRedisInitChecked) {
    return redisClient;
  }

  isRedisInitChecked = true;
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    if (!isWarnedUnavailable) {
      console.info("[Cache] Upstash Redis credentials missing. Operating in In-Memory High Performance mode.");
      isWarnedUnavailable = true;
    }
    redisClient = null;
    return null;
  }

  try {
    redisClient = new Redis({
      url,
      token,
    });
    console.info("[Cache] Connected to Upstash Redis (REST mode)");
    return redisClient;
  } catch (err) {
    console.warn("[Cache] Failed to initialize Upstash Redis client:", err instanceof Error ? err.message : err);
    redisClient = null;
    return null;
  }
}

/**
 * Sanitize cache key to prevent invalid characters and excessive length
 */
export function sanitizeKey(key: string): string {
  return key
    .trim()
    .replace(/[\r\n\t]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 512);
}

export const cacheService: CacheService = {
  /**
   * Get item from cache (Checks L1 RAM first, then L2 Upstash Redis)
   */
  async get<T>(rawKey: string): Promise<T | null> {
    const key = sanitizeKey(rawKey);
    const now = Date.now();

    // 1. Check L1 Memory Cache (0ms)
    const mem = L1_CACHE.get(key);
    if (mem) {
      if (mem.expireAt > now) {
        if (process.env.NODE_ENV !== "production") {
          console.debug(`[Cache HIT: L1] key="${key}"`);
        }
        return mem.value as T;
      }
      L1_CACHE.delete(key);
    }

    // 2. Check L2 Upstash Redis
    const redis = getRedisClient();
    if (!redis) {
      return null;
    }

    try {
      const data = await redis.get<T>(key);
      if (data !== null && data !== undefined) {
        if (process.env.NODE_ENV !== "production") {
          console.debug(`[Cache HIT: Redis] key="${key}"`);
        }
        // Repopulate L1 RAM so subsequent requests on this instance take 0ms
        L1_CACHE.set(key, { value: data, expireAt: now + 5 * 60 * 1000 });
        return data;
      }

      if (process.env.NODE_ENV !== "production") {
        console.debug(`[Cache MISS] key="${key}"`);
      }
      return null;
    } catch (err) {
      console.warn(`[Cache ERROR: GET] key="${key}":`, err instanceof Error ? err.message : err);
      // Fail-safe: Treat as cache miss
      return null;
    }
  },

  /**
   * Set item into cache (L1 Memory immediately, L2 Upstash Redis with single SET EX command)
   */
  async set<T>(rawKey: string, value: T, ttlSeconds: number = 86400): Promise<boolean> {
    if (value === undefined || value === null) return false;
    const key = sanitizeKey(rawKey);
    const now = Date.now();
    const safeTtl = Math.max(1, Math.floor(ttlSeconds));

    // 1. Save to L1 Memory Cache
    if (L1_CACHE.size >= MAX_L1_ENTRIES) {
      const oldestKey = L1_CACHE.keys().next().value;
      if (oldestKey) L1_CACHE.delete(oldestKey);
    }
    L1_CACHE.set(key, {
      value,
      expireAt: now + Math.min(safeTtl * 1000, 30 * 60 * 1000), // L1 retained for up to 30 minutes
    });

    // 2. Save to L2 Upstash Redis
    const redis = getRedisClient();
    if (!redis) {
      return true;
    }

    try {
      // Single Redis command: SET key value EX safeTtl (prevents multi-command overhead)
      await redis.set(key, value, { ex: safeTtl });
      if (process.env.NODE_ENV !== "production") {
        console.debug(`[Cache SET] key="${key}" ttl=${safeTtl}s`);
      }
      return true;
    } catch (err) {
      console.warn(`[Cache ERROR: SET] key="${key}":`, err instanceof Error ? err.message : err);
      // Fail-safe: Returns false without breaking flow
      return false;
    }
  },

  /**
   * Delete key from L1 Memory and L2 Upstash Redis
   */
  async delete(rawKey: string): Promise<boolean> {
    const key = sanitizeKey(rawKey);
    L1_CACHE.delete(key);

    const redis = getRedisClient();
    if (!redis) {
      return true;
    }

    try {
      await redis.del(key);
      if (process.env.NODE_ENV !== "production") {
        console.debug(`[Cache DEL] key="${key}"`);
      }
      return true;
    } catch (err) {
      console.warn(`[Cache ERROR: DEL] key="${key}":`, err instanceof Error ? err.message : err);
      return false;
    }
  },

  /**
   * Primary pattern: Try cache first, execute fetcher on MISS and cache result.
   * Single-Flight Mutex: Guarantees that concurrent requests for the same key trigger fetcher only once.
   */
  async fetchOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 86400
  ): Promise<T> {
    // 1. Check cache first
    const cached = await this.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    // 2. Prevent Cache Stampede with Single-Flight Mutex
    const sanitized = sanitizeKey(key);
    const inFlight = inFlightRequests.get(sanitized);
    if (inFlight) {
      return await inFlight;
    }

    // 3. Execute fetcher and set into cache
    const task = (async () => {
      try {
        const freshData = await fetcher();
        if (freshData !== null && freshData !== undefined) {
          await this.set(key, freshData, ttlSeconds);
        }
        return freshData;
      } finally {
        inFlightRequests.delete(sanitized);
      }
    })();

    inFlightRequests.set(sanitized, task);
    return await task;
  },

  /**
   * Clear all L1 RAM memory cache
   */
  clearL1(): void {
    L1_CACHE.clear();
  },

  /**
   * Check if key exists in L1 RAM
   */
  hasL1(rawKey: string): boolean {
    const key = sanitizeKey(rawKey);
    const entry = L1_CACHE.get(key);
    return Boolean(entry && entry.expireAt > Date.now());
  },
};

// Default export for flexibility
export default cacheService;
