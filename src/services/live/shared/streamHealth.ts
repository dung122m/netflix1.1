const BLOCKED_STREAM_HOSTS = new Set([
  "fmvttv.dpdns.org",
  "live05.msdht.app",
  "freem3u.xyz",
]);
const healthCache = new Map<string, { ok: boolean; expiresAt: number }>();

export function isBlockedStreamUrl(streamUrl: string): boolean {
  try {
    const hostname = new URL(streamUrl).hostname.toLowerCase();
    return (
      BLOCKED_STREAM_HOSTS.has(hostname) ||
      hostname.endsWith(".dpdns.org") ||
      hostname.endsWith(".msdht.app")
    );
  } catch {
    return true;
  }
}

function getStreamHeaders(streamUrl: string): HeadersInit {
  const origin = new URL(streamUrl).origin;
  return {
    Accept: "*/*",
    Referer: `${origin}/`,
    Origin: origin,
    "User-Agent": "Mozilla/5.0",
  };
}

async function checkHlsManifest(
  streamUrl: string,
  depth: number,
): Promise<boolean> {
  const response = await fetch(streamUrl, {
    headers: getStreamHeaders(streamUrl),
    cache: "no-store",
    signal: AbortSignal.timeout(4500),
  });
  if (!response.ok) return false;

  const contentType = response.headers.get("content-type") || "";
  if (!streamUrl.includes(".m3u8") && !contentType.includes("mpegurl"))
    return true;

  const firstMediaUrl = (await response.text())
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#"));
  if (!firstMediaUrl) return true;

  const childUrl = new URL(firstMediaUrl, streamUrl).toString();
  if (depth < 1) {
    return checkHlsManifest(childUrl, depth + 1);
  }

  const segmentResponse = await fetch(childUrl, {
    headers: getStreamHeaders(childUrl),
    cache: "no-store",
    signal: AbortSignal.timeout(4500),
  });
  return segmentResponse.ok;
}

export async function isStreamReachable(streamUrl: string): Promise<boolean> {
  if (isBlockedStreamUrl(streamUrl)) return false;
  const cached = healthCache.get(streamUrl);
  if (cached && cached.expiresAt > Date.now()) return cached.ok;

  try {
    const ok = streamUrl.toLowerCase().includes(".m3u8")
      ? await checkHlsManifest(streamUrl, 0)
      : (
          await fetch(streamUrl, {
            headers: getStreamHeaders(streamUrl),
            cache: "no-store",
            signal: AbortSignal.timeout(4500),
          })
        ).ok;
    healthCache.set(streamUrl, { ok, expiresAt: Date.now() + 120_000 });
    return ok;
  } catch {
    healthCache.set(streamUrl, { ok: false, expiresAt: Date.now() + 30_000 });
    return false;
  }
}

export async function filterReachableStreams<T extends { url: string }>(
  streams: T[],
  concurrency = 10,
): Promise<T[]> {
  const valid: T[] = [];
  let cursor = 0;
  const worker = async () => {
    while (cursor < streams.length) {
      const index = cursor++;
      if (await isStreamReachable(streams[index].url))
        valid.push(streams[index]);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, streams.length) }, worker),
  );
  return valid;
}
