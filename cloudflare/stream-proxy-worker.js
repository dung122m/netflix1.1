/**
 * Nanaflix - Cloudflare Edge Stream Proxy Worker
 * 
 * Offloads 100% of HLS video bandwidth and serverless invocations from Vercel to Cloudflare Edge.
 * - Unlimited Egress Bandwidth (Cloudflare 0$ egress)
 * - Sub-millisecond HMAC-SHA256 Token Verification using native Web Crypto
 * - SSRF Protection against internal / loopback / cloud metadata IP targets
 * - Dynamic Playlist (.m3u8) Rewriting with 30s Quantized Stream Tokens
 * - Custom Host Referer & User-Agent Spoofing (FPT Play, Akamaized, Cola, etc.)
 */

// Secret key for HMAC-SHA256 token signing (Must match STREAM_TOKEN_SECRET on Vercel)
const DEFAULT_SECRET = "nanaflix_hls_stream_token_secret_2026_strict_vault";
const STREAM_TOKEN_VERSION = 1;
const DEFAULT_STREAM_TOKEN_TTL_SECONDS = 120;
const MAX_STREAM_TOKEN_GRACE_SECONDS = 180;
const TOKEN_TIME_STEP_SECONDS = 30;

// SSRF Guard - Private & Link-Local IP ranges to block
const PRIVATE_IP_REGEX = /^(?:127\.|10\.|192\.168\.|172\.(?:1[6-9]|2[0-9]|3[01])\.|169\.254\.|::1|fe80:|fc00:|fd00:)/i;
const BLOCKED_HOSTS = new Set(["localhost", "metadata.google.internal", "instance-data"]);

function isSafePublicUrl(urlStr) {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const hostname = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTS.has(hostname)) return false;
    if (hostname.endsWith(".local") || hostname.endsWith(".internal")) return false;
    if (PRIVATE_IP_REGEX.test(hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

function computeStreamId(urlStr) {
  try {
    const u = new URL(urlStr);
    const lastSlash = u.pathname.lastIndexOf("/");
    const basePath = lastSlash >= 0 ? u.pathname.slice(0, lastSlash + 1) : "/";
    const dir = `${u.protocol}//${u.host}${basePath}`;
    // Simple fast 12-char hash for stream grouping
    let hash = 0;
    for (let i = 0; i < dir.length; i++) {
      hash = ((hash << 5) - hash) + dir.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(12, "0").slice(0, 12);
  } catch {
    return "000000000000";
  }
}

async function hmacSha256(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  const hex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex;
}

async function generateToken(targetUrl, streamId, secret, ttl = DEFAULT_STREAM_TOKEN_TTL_SECONDS) {
  const now = Math.floor(Date.now() / 1000);
  const quantizedNow = Math.floor(now / TOKEN_TIME_STEP_SECONDS) * TOKEN_TIME_STEP_SECONDS;
  const exp = quantizedNow + ttl;
  const canonicalString = `${STREAM_TOKEN_VERSION}:${streamId}:${exp}:${targetUrl}`;
  const token = await hmacSha256(secret, canonicalString);
  return { token, exp, sid: streamId, v: STREAM_TOKEN_VERSION };
}

async function verifyToken(targetUrl, token, expStr, sid, secret) {
  const exp = parseInt(expStr, 10);
  if (isNaN(exp)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (now > exp + MAX_STREAM_TOKEN_GRACE_SECONDS) return false;
  const canonicalString = `${STREAM_TOKEN_VERSION}:${sid}:${exp}:${targetUrl}`;
  const expected = await hmacSha256(secret, canonicalString);
  return expected === token;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get("url");
    const st = url.searchParams.get("st");
    const exp = url.searchParams.get("exp");
    const sid = url.searchParams.get("sid");

    const secret = env?.STREAM_TOKEN_SECRET || DEFAULT_SECRET;

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Access-Control-Allow-Headers": "Range, Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    if (!targetUrl) {
      return new Response("Missing url parameter", { status: 400 });
    }

    if (!isSafePublicUrl(targetUrl)) {
      return new Response("Forbidden target URL (SSRF Guard)", { status: 403 });
    }

    const cleanTargetLower = targetUrl.split("?")[0].toLowerCase();
    const isPlaylist =
      cleanTargetLower.endsWith(".m3u8") ||
      cleanTargetLower.includes("playlist") ||
      cleanTargetLower.includes("manifest");

    // Token verification for binary chunks (.ts, .m4s, etc.)
    if (!isPlaylist) {
      if (!st || !exp || !sid) {
        return new Response("Missing required stream token parameters", { status: 403 });
      }
      const isValid = await verifyToken(targetUrl, st, exp, sid, secret);
      if (!isValid) {
        return new Response("Invalid or expired stream token", { status: 403 });
      }
    }

    // Prepare Upstream Headers
    const targetParsed = new URL(targetUrl);
    const origin = targetParsed.origin;
    const isFpt = /fptplay(?:53)?\.net/i.test(targetParsed.hostname);
    const isCola = /miekgo\.app|msdht\.app/i.test(targetParsed.hostname);

    const upstreamHeaders = {
      "User-Agent": isFpt
        ? "Mozilla/5.0 (SMART-TV; LINUX; Tizen 10.0) AppleWebKit/537.36 (KHTML, like Gecko) 130.0.6723.116/10.0 TV Safari/537.36"
        : isCola
        ? "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
        : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Origin: origin,
      Referer: origin + "/",
    };

    const clientRange = request.headers.get("Range");
    if (clientRange) {
      upstreamHeaders["Range"] = clientRange;
    }

    try {
      const upstreamRes = await fetch(targetUrl, {
        method: "GET",
        headers: upstreamHeaders,
        redirect: "follow",
      });

      if (!upstreamRes.ok) {
        return new Response(`Upstream returned ${upstreamRes.status}`, { status: upstreamRes.status });
      }

      const contentType = upstreamRes.headers.get("content-type") || "";

      // Playlist rewriting (.m3u8)
      if (
        isPlaylist ||
        contentType.includes("mpegurl") ||
        contentType.includes("application/x-mpegURL")
      ) {
        const text = await upstreamRes.text();
        const lines = text.split("\n");
        const playlistStreamId = computeStreamId(targetUrl);

        const rewrittenLines = await Promise.all(
          lines.map(async (line) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#")) {
              if (line.includes('URI="')) {
                // Key or subtitle URI rewrite
                const match = line.match(/URI="([^"]+)"/);
                if (match) {
                  const abs = new URL(match[1], targetUrl).toString();
                  const signed = await generateToken(abs, playlistStreamId, secret);
                  const proxyUrl = `${url.pathname}?url=${encodeURIComponent(abs)}&st=${encodeURIComponent(signed.token)}&exp=${signed.exp}&sid=${encodeURIComponent(signed.sid)}&v=${signed.v}`;
                  return line.replace(/URI="[^"]+"/, `URI="${proxyUrl}"`);
                }
              }
              return line;
            }

            const abs = new URL(trimmed, targetUrl).toString();
            const signed = await generateToken(abs, playlistStreamId, secret);
            return `${url.pathname}?url=${encodeURIComponent(abs)}&st=${encodeURIComponent(signed.token)}&exp=${signed.exp}&sid=${encodeURIComponent(signed.sid)}&v=${signed.v}`;
          })
        );

        return new Response(rewrittenLines.join("\n"), {
          headers: {
            "Content-Type": "application/vnd.apple.mpegurl",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        });
      }

      // Binary media chunk streaming (.ts, .m4s)
      const resHeaders = new Headers();
      resHeaders.set("Content-Type", contentType || "video/mp2t");
      resHeaders.set("Access-Control-Allow-Origin", "*");
      resHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      resHeaders.set("Cache-Control", "public, max-age=120, s-maxage=300, stale-while-revalidate=600");

      const cl = upstreamRes.headers.get("content-length");
      if (cl) resHeaders.set("Content-Length", cl);

      const cr = upstreamRes.headers.get("content-range");
      if (cr) resHeaders.set("Content-Range", cr);

      const ar = upstreamRes.headers.get("accept-ranges");
      if (ar) resHeaders.set("Accept-Ranges", ar);

      return new Response(upstreamRes.body, {
        status: upstreamRes.status,
        headers: resHeaders,
      });
    } catch (err) {
      return new Response(`Worker proxy error: ${err?.message || err}`, { status: 502 });
    }
  },
};
