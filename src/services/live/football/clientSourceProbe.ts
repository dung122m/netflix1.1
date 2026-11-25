"use client";

import type { StreamServer, FootballMatch } from "./service";
import { isBlockedStreamUrl } from "@/services/live/shared/streamHealth";
import { getFootballStreamUrl, toPlayableHlsUrl } from "./streamUrlHelper";

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
async function fetchAndValidateHls(
  url: string,
  timeoutMs: number,
  externalSignal?: AbortSignal,
): Promise<boolean> {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal = externalSignal
    ? AbortSignal.any([externalSignal, timeoutSignal])
    : timeoutSignal;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "*/*",
    },
    cache: "no-store",
    signal,
  });

  if (!res.ok) return false;

  const ct = (res.headers.get("content-type") || "").toLowerCase();
  if (
    ct.includes("video/x-flv") ||
    ct.includes("video/mp2t") ||
    ct.includes("application/octet-stream")
  ) {
    return false;
  }

  // Chỉ đọc tối đa 8 KB đầu tiên để kiểm tra #EXTM3U, tránh treo RAM nếu upstream trả stream liên tục
  let text = "";
  if (res.body && typeof res.body.getReader === "function") {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let totalBytes = 0;
    try {
      while (totalBytes < 8192) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.byteLength;
          text += decoder.decode(value, { stream: true });
        }
      }
    } finally {
      reader.cancel().catch(() => {});
    }
    text += decoder.decode();
  } else {
    text = (await res.text()).slice(0, 8192);
  }
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

export interface RacePlayableServerResult {
  index: number;
  needsProxy: boolean;
  deadUrls: string[];
}

/**
 * Races all servers of a match in parallel (~200-500ms for healthy CDNs) so
 * LivePlayer starts directly on a working stream instead of waiting sequentially
 * through multiple dead/timeout servers.
 */
export async function racePlayableServer(
  servers: StreamServer[],
  externalSignal?: AbortSignal,
): Promise<RacePlayableServerResult | null> {
  if (!servers || servers.length === 0) return null;

  // 1. Instant hit if any server is already verified alive in session probeCache
  for (let i = 0; i < servers.length; i++) {
    const s = servers[i];
    if (!s?.url || isBlockedStreamUrl(s.url)) continue;
    const playable = toPlayableHlsUrl(s.url);
    if (getServerProbeStatus(playable) === "alive") {
      return { index: i, needsProxy: false, deadUrls: [] };
    }
    if (s.referer) {
      const proxyUrl = getFootballStreamUrl(
        playable,
        true,
        true,
        s.referer,
        s.userAgent,
        s.headerSig,
      );
      if (getServerProbeStatus(proxyUrl) === "alive") {
        return { index: i, needsProxy: true, deadUrls: [] };
      }
    }
  }

  const deadUrls: string[] = [];
  const raceController = new AbortController();
  const abortAll = () => raceController.abort();
  externalSignal?.addEventListener("abort", abortAll, { once: true });

  const candidates = servers
    .map((s, index) => ({
      server: s,
      index,
      directUrl: getFootballStreamUrl(toPlayableHlsUrl(s?.url || ""), Boolean(s?.isHls), false),
    }))
    .filter((c) => Boolean(c.directUrl) && !isBlockedStreamUrl(c.directUrl))
    .slice(0, 8);

  if (candidates.length === 0) {
    externalSignal?.removeEventListener("abort", abortAll);
    return null;
  }

  const tryDirectRace = () =>
    new Promise<RacePlayableServerResult | null>((resolve) => {
      let remaining = candidates.length;
      let resolved = false;

      for (const candidate of candidates) {
        if (getServerProbeStatus(candidate.directUrl) === "dead") {
          deadUrls.push(candidate.server.url);
          remaining -= 1;
          if (remaining === 0 && !resolved) resolve(null);
          continue;
        }

        const isHttpsDirect = candidate.directUrl.startsWith("https://");
        const isProxyUrl = candidate.directUrl.startsWith("/");

        fetchAndValidateHls(candidate.directUrl, 2200, raceController.signal)
          .then((ok) => {
            if (resolved) return;
            if (ok) {
              resolved = true;
              probeCache.set(candidate.directUrl, {
                status: "alive",
                expiresAt: Date.now() + 5 * 60 * 1000,
              });
              raceController.abort();
              resolve({
                index: candidate.index,
                needsProxy: isProxyUrl,
                deadUrls,
              });
              return;
            }
            if (isHttpsDirect && !candidate.server.referer) {
              probeCache.set(candidate.directUrl, {
                status: "dead",
                expiresAt: Date.now() + 90 * 1000,
              });
              deadUrls.push(candidate.server.url);
            }
          })
          .catch(() => {
            if (!resolved && isHttpsDirect && !candidate.server.referer && !raceController.signal.aborted) {
              deadUrls.push(candidate.server.url);
            }
          })
          .finally(() => {
            remaining -= 1;
            if (remaining === 0 && !resolved) {
              resolve(null);
            }
          });
      }
    });

  const directWinner = await tryDirectRace();
  if (directWinner || externalSignal?.aborted) {
    externalSignal?.removeEventListener("abort", abortAll);
    return directWinner;
  }

  // 2. Fallback race via Proxy ONLY for Referer-protected servers (e.g. EXTVLCOPT) when no direct stream responded
  const proxyCandidates = candidates
    .filter((c) => Boolean(c.server.referer) && c.directUrl.startsWith("https://"))
    .slice(0, 4);

  if (proxyCandidates.length === 0) {
    externalSignal?.removeEventListener("abort", abortAll);
    return null;
  }

  const proxyController = new AbortController();
  const abortProxy = () => proxyController.abort();
  externalSignal?.addEventListener("abort", abortProxy, { once: true });

  const proxyWinner = await new Promise<RacePlayableServerResult | null>((resolve) => {
    let remaining = proxyCandidates.length;
    let resolved = false;

    for (const candidate of proxyCandidates) {
      const proxyUrl = getFootballStreamUrl(
        toPlayableHlsUrl(candidate.server.url),
        Boolean(candidate.server.isHls),
        true,
        candidate.server.referer,
        candidate.server.userAgent,
        candidate.server.headerSig,
      );

      fetchAndValidateHls(proxyUrl, 3000, proxyController.signal)
        .then((ok) => {
          if (resolved) return;
          if (ok) {
            resolved = true;
            probeCache.set(proxyUrl, {
              status: "alive",
              expiresAt: Date.now() + 5 * 60 * 1000,
            });
            proxyController.abort();
            resolve({
              index: candidate.index,
              needsProxy: true,
              deadUrls,
            });
            return;
          }
          deadUrls.push(candidate.server.url);
        })
        .catch(() => {
          if (!resolved && !proxyController.signal.aborted) {
            deadUrls.push(candidate.server.url);
          }
        })
        .finally(() => {
          remaining -= 1;
          if (remaining === 0 && !resolved) {
            resolve(null);
          }
        });
    }
  });

  externalSignal?.removeEventListener("abort", abortAll);
  externalSignal?.removeEventListener("abort", abortProxy);
  return proxyWinner;
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
