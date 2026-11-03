/**
 * Two-Tier Playlist Rate Limiting Gate for Live Streaming Proxies (TV & Football)
 * 
 * Objectives:
 * 1. Eliminate 80-95% of Redis commands during normal HLS playlist polling for authentic viewers.
 * 2. In-Memory Burst Gate: Drops rapid local request spikes (> 8 req / 3s) on any single instance (0ms, 0 Redis queries).
 * 3. Distributed Redis Sync: Authenticated clients periodically sync to distributed Redis (every 20s or every 6 requests)
 *    to preserve global multi-instance quotas and prevent abuse across multiple serverless instances.
 * 4. Unauthenticated / Master playlist requests ALWAYS synchronize with Redis (Control Plane protection).
 */

export interface PlaylistGateDecision {
  allowed: boolean;
  syncToRedis: boolean;
  reason?: string;
}

interface ClientTrackingRecord {
  timestamps: number[];
  lastRedisSync: number;
  requestCountSinceSync: number;
}

const LOCAL_BURST_MAX_REQUESTS = 8;
const LOCAL_BURST_WINDOW_MS = 3000;
const REDIS_SYNC_INTERVAL_MS = 20000; // Sync to Redis at most once every 20s for authenticated playlists
const REDIS_SYNC_STRIDE = 6; // Or every 6th request on this instance

const clientTrackingStore = new Map<string, ClientTrackingRecord>();

// Periodic cleanup of stale tracking records every 3 minutes
if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, rec] of clientTrackingStore.entries()) {
      rec.timestamps = rec.timestamps.filter((t) => now - t < LOCAL_BURST_WINDOW_MS);
      if (now - rec.lastRedisSync > 5 * 60 * 1000 && rec.timestamps.length === 0) {
        clientTrackingStore.delete(key);
      }
    }
  }, 3 * 60 * 1000);
  timer.unref?.();
}

export function resetPlaylistGateForTesting(): void {
  clientTrackingStore.clear();
}

/**
 * Evaluates whether an incoming playlist request is allowed and whether it needs distributed Redis synchronization.
 */
export function evaluatePlaylistRefreshGate(options: {
  clientKey: string;
  hasValidToken: boolean;
  now?: number;
}): PlaylistGateDecision {
  const { clientKey, hasValidToken, now = Date.now() } = options;

  // Unauthenticated requests (e.g. Master playlist, initial channel load) must ALWAYS sync with Redis
  if (!hasValidToken) {
    return {
      allowed: true,
      syncToRedis: true,
    };
  }

  let rec = clientTrackingStore.get(clientKey);
  if (!rec) {
    rec = {
      timestamps: [now],
      lastRedisSync: now,
      requestCountSinceSync: 1,
    };
    clientTrackingStore.set(clientKey, rec);
    // First request seen by this instance syncs with Redis to establish distributed presence
    return {
      allowed: true,
      syncToRedis: true,
    };
  }

  // 1. In-Memory Burst / DoS Protection Filter
  rec.timestamps = rec.timestamps.filter((t) => now - t < LOCAL_BURST_WINDOW_MS);
  if (rec.timestamps.length >= LOCAL_BURST_MAX_REQUESTS) {
    return {
      allowed: false,
      syncToRedis: false,
      reason: "Tần suất làm mới playlist quá nhanh trên phiên phát hiện tại.",
    };
  }

  rec.timestamps.push(now);
  rec.requestCountSinceSync += 1;

  // 2. Distributed Synchronization Condition
  const timeSinceLastSync = now - rec.lastRedisSync;
  if (timeSinceLastSync >= REDIS_SYNC_INTERVAL_MS || rec.requestCountSinceSync >= REDIS_SYNC_STRIDE) {
    rec.lastRedisSync = now;
    rec.requestCountSinceSync = 0;
    return {
      allowed: true,
      syncToRedis: true,
    };
  }

  // Authenticated ongoing playback within local limits: Allowed with ZERO Redis commands
  return {
    allowed: true,
    syncToRedis: false,
  };
}

