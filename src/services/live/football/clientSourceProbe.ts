"use client";

import { StreamServer, FootballMatch } from "./service";
import { isBlockedStreamUrl } from "@/services/live/shared/streamHealth";

export type ProbeStatus = "alive" | "dead" | "unknown";

interface CacheEntry {
  status: ProbeStatus;
  expiresAt: number;
}

// In-memory probe cache in browser session (TTL 5 mins for alive, 90s for dead)
const probeCache = new Map<string, CacheEntry>();

// Active probing promises to avoid duplicate requests for the same URL
const activeProbes = new Map<string, Promise<boolean>>();

/**
 * Kiểm tra xem stream URL có hợp lệ và phát được không (HLS Master + Media segment check)
 * Chỉ fetch trực tiếp từ browser với timeout ngắn 1.8s, tuyệt đối KHÔNG fallback qua proxy.
 */
export async function probeStreamUrl(url: string, timeoutMs = 1800): Promise<boolean> {
  if (!url || isBlockedStreamUrl(url)) {
    return false;
  }

  const cached = probeCache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.status === "alive";
  }

  // Deduplicate inflight probe
  const existing = activeProbes.get(url);
  if (existing) {
    return existing;
  }

  const probePromise = (async () => {
    try {
      const isAlive = await fetchAndValidateHls(url, timeoutMs);
      const ttl = isAlive ? 5 * 60 * 1000 : 90 * 1000;
      probeCache.set(url, {
        status: isAlive ? "alive" : "dead",
        expiresAt: Date.now() + ttl,
      });
      return isAlive;
    } catch {
      // Lỗi CORS / timeout / network -> đánh dấu dead 90s, không retry qua proxy
      probeCache.set(url, {
        status: "dead",
        expiresAt: Date.now() + 90 * 1000,
      });
      return false;
    } finally {
      activeProbes.delete(url);
    }
  })();

  activeProbes.set(url, probePromise);
  return probePromise;
}

/**
 * Tải manifest HLS và kiểm tra tính hợp lệ của playlist / segment
 */
async function fetchAndValidateHls(url: string, timeoutMs: number): Promise<boolean> {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "*/*",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) return false;

  const text = await res.text();
  if (!text || text.length < 10) return false;

  // Nếu trả về trang HTML lỗi (404/403 trả về 200 HTML page) -> Dead
  const trimmed = text.trim();
  if (
    trimmed.startsWith("<!DOCTYPE") ||
    trimmed.startsWith("<html") ||
    trimmed.includes("Cloudflare") ||
    trimmed.includes("Access Denied")
  ) {
    return false;
  }

  // HLS Manifest chuẩn phải chứa #EXTM3U hoặc các tag HLS
  const isHlsManifest =
    trimmed.includes("#EXTM3U") ||
    trimmed.includes("#EXT-X-STREAM-INF") ||
    trimmed.includes("#EXTINF") ||
    trimmed.includes("#EXT-X-TARGETDURATION");

  if (!isHlsManifest) {
    return res.status === 200;
  }

  return true;
}

/**
 * Lấy trạng thái hiện tại của server từ cache (synchronous, 0ms)
 */
export function getServerProbeStatus(url: string): ProbeStatus {
  if (!url || isBlockedStreamUrl(url)) return "dead";
  const cached = probeCache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.status;
  }
  return "unknown";
}

/**
 * Lọc danh sách servers của trận đấu, loại bỏ các server đã xác nhận DEAD
 */
export function filterWorkingServers(servers: StreamServer[]): StreamServer[] {
  if (!servers || servers.length === 0) return [];
  const working = servers.filter((s) => getServerProbeStatus(s.url) !== "dead");
  return working.length > 0 ? working : servers; // Nếu tất cả đều dead thì giữ nguyên để hiển thị thông báo
}

/**
 * Background Probing Queue với Concurrency Control (4–6 requests)
 */
let isProbeQueueRunning = false;
const probeQueue: string[] = [];
const queueCallbacks = new Set<() => void>();

export function subscribeToProbeUpdates(callback: () => void): () => void {
  queueCallbacks.add(callback);
  return () => {
    queueCallbacks.delete(callback);
  };
}

function notifyProbeListeners() {
  queueCallbacks.forEach((cb) => {
    try {
      cb();
    } catch {}
  });
}

export function clearProbeQueue() {
  probeQueue.length = 0;
}

export function queueMatchesForProbing(matches: FootballMatch[]) {
  const now = Date.now();
  const urlsToQueue: string[] = [];

  // Sắp xếp ưu tiên: LIVE -> Sắp đá trong 2h -> Các trận khác
  const live = matches.filter((m) => m.timeline === "live");
  const upcoming2h = matches.filter(
    (m) => m.timeline === "upcoming" && m.timestamp <= now + 2 * 3600 * 1000,
  );
  const others = matches.filter(
    (m) =>
      m.timeline !== "live" &&
      !(m.timeline === "upcoming" && m.timestamp <= now + 2 * 3600 * 1000),
  );

  const orderedMatches = [...live, ...upcoming2h, ...others];

  for (const m of orderedMatches) {
    for (const s of m.servers) {
      if (s.url && getServerProbeStatus(s.url) === "unknown") {
        if (!urlsToQueue.includes(s.url) && !probeQueue.includes(s.url)) {
          urlsToQueue.push(s.url);
        }
      }
    }
  }

  if (urlsToQueue.length === 0) return;

  probeQueue.push(...urlsToQueue);
  processProbeQueue();
}

async function processProbeQueue(concurrency = 3) {
  if (isProbeQueueRunning) return;
  isProbeQueueRunning = true;

  const workers = Array.from({ length: concurrency }).map(async () => {
    while (probeQueue.length > 0) {
      const url = probeQueue.shift();
      if (!url) continue;
      try {
        await probeStreamUrl(url, 1800);
        notifyProbeListeners();
      } catch {
        // Error isolated to single stream probe
      }
    }
  });

  await Promise.allSettled(workers);
  isProbeQueueRunning = false;
  notifyProbeListeners();
}
