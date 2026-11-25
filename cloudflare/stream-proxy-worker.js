/**
 * Nanaflix - Cloudflare Edge Stream Proxy Worker
 *
 * Đồng bộ hoàn toàn đặc tả bảo mật & caching với `src/services/live/shared/hlsProxyRoute.ts`,
 * `src/lib/streamToken.ts`, `src/lib/live/proxySegmentCache.ts` và `src/app/api/live-football/proxy/route.ts`.
 *
 * Tính năng:
 * - Xác thực chữ ký HMAC-SHA256 Base64URL (`st`, `exp`, `sid`, `v=1`, grace window 180s)
 * - Xác thực chữ ký header nguồn phát `hsig` (tránh giả mạo `ref`/`ua` tuỳ ý để bypass hotlink/cache)
 * - SSRF Guard trên cả URL gốc lẫn mọi hop redirect (`redirect: "manual"`, tối đa 5 hop)
 * - Chặn các host stream độc hại/hỏng (`BLOCKED_STREAM_HOSTS`)
 * - Rewrite playlist `.m3u8`: phân luồng direct cho chunk HTTPS sạch (khi không cần custom header)
 * - Cache-Control an toàn: `no-cache, no-store` cho playlist; `private, no-store` cho `.key`/token URL/Set-Cookie
 */

const DEFAULT_SECRET = "nanaflix_hls_stream_token_secret_2026_strict_vault";
const STREAM_TOKEN_VERSION = 1;
const DEFAULT_STREAM_TOKEN_TTL_SECONDS = 120;
const MAX_STREAM_TOKEN_GRACE_SECONDS = 180;
const CLOCK_SKEW_TOLERANCE_SECONDS = 30;
const TOKEN_TIME_STEP_SECONDS = 30;
const MAX_SAFE_REDIRECTS = 5;

const NO_CACHE_CORS_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "Access-Control-Allow-Origin": "*",
};

const PRIVATE_IP_REGEX =
  /^(?:127\.|10\.|192\.168\.|172\.(?:1[6-9]|2[0-9]|3[01])\.|169\.254\.|0\.|::1|fe80:|fc00:|fd00:)/i;
const BLOCKED_HOSTS = new Set([
  "localhost",
  "metadata.google.internal",
  "instance-data",
]);
const BLOCKED_STREAM_HOSTS = new Set([
  "fmvttv.dpdns.org",
  "live05.msdht.app",
  "pro2cdnlive.com",
]);

const SAFE_PUBLIC_SEGMENT_EXTS = [".ts", ".m4s", ".mp4", ".m4a", ".aac", ".vtt"];
const SENSITIVE_QUERY_PARAMS = new Set([
  "token",
  "access_token",
  "auth",
  "signature",
  "sig",
  "expires",
  "key",
  "credential",
  "policy",
  "hmac",
  "secret",
]);
const SAFE_PUBLIC_COOKIE_NAMES = new Set([
  "nanaflix_anon_id",
  "nanaflix_has_visited",
  "nanaflix_theme",
]);

function isSafePublicUrl(urlStr) {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const hostname = parsed.hostname.toLowerCase();
    if (!hostname) return false;
    if (BLOCKED_HOSTS.has(hostname)) return false;
    if (hostname.endsWith(".local") || hostname.endsWith(".internal")) return false;
    if (PRIVATE_IP_REGEX.test(hostname)) return false;
    if (/^\d+$/.test(hostname) || hostname.startsWith("0x")) return false;
    return true;
  } catch {
    return false;
  }
}

function isBlockedStreamUrl(streamUrl) {
  try {
    const hostname = new URL(streamUrl).hostname.toLowerCase();
    return (
      BLOCKED_STREAM_HOSTS.has(hostname) ||
      hostname.endsWith(".dpdns.org") ||
      hostname.endsWith(".msdht.app") ||
      hostname.endsWith(".pro2cdnlive.com") ||
      hostname === "pro2cdnlive.com"
    );
  } catch {
    return true;
  }
}

function timingSafeEqualStr(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function toBase64Url(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function toHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function computeStreamId(urlStr) {
  try {
    const u = new URL(urlStr);
    const lastSlash = u.pathname.lastIndexOf("/");
    const basePath = lastSlash >= 0 ? u.pathname.slice(0, lastSlash + 1) : "/";
    const dir = `${u.protocol}//${u.host}${basePath}`;
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(dir));
    return toHex(new Uint8Array(digest)).slice(0, 12);
  } catch {
    return "000000000000";
  }
}

function extractCanonicalTargetResource(targetUrl) {
  try {
    const u = new URL(targetUrl);
    return `${u.protocol}//${u.host}${u.pathname}${u.search}`;
  } catch {
    return String(targetUrl || "").trim();
  }
}

async function hmacSha256Base64Url(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return toBase64Url(new Uint8Array(signature));
}

function getSecrets(env) {
  const primary =
    env?.STREAM_TOKEN_SECRET?.trim() ||
    env?.UPSTASH_REDIS_REST_TOKEN?.trim() ||
    env?.ADMIN_SYNC_SECRET?.trim() ||
    DEFAULT_SECRET;
  const secondary = env?.STREAM_TOKEN_SECRET_SECONDARY?.trim() || "";
  return { primary, secondary };
}

async function generateToken(targetUrl, streamId, primarySecret) {
  const now = Math.floor(Date.now() / 1000);
  const quantizedNow = Math.floor(now / TOKEN_TIME_STEP_SECONDS) * TOKEN_TIME_STEP_SECONDS;
  const exp = quantizedNow + DEFAULT_STREAM_TOKEN_TTL_SECONDS;
  const canonicalResource = extractCanonicalTargetResource(targetUrl);
  const canonicalString = `${STREAM_TOKEN_VERSION}:${streamId}:${exp}:${canonicalResource}`;
  const token = await hmacSha256Base64Url(primarySecret, canonicalString);
  return { token, exp, sid: streamId, v: STREAM_TOKEN_VERSION };
}

async function verifyToken(targetUrl, token, expStr, sid, versionStr, secrets) {
  if (!token || !expStr || !sid || !targetUrl) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp <= 0) return false;
  const version = versionStr ? Number(versionStr) : STREAM_TOKEN_VERSION;
  if (version !== STREAM_TOKEN_VERSION) return false;

  const expectedSid = await computeStreamId(targetUrl);
  if (sid !== expectedSid) return false;

  const canonicalResource = extractCanonicalTargetResource(targetUrl);
  const canonicalString = `${STREAM_TOKEN_VERSION}:${sid}:${exp}:${canonicalResource}`;

  const expectedPrimary = await hmacSha256Base64Url(secrets.primary, canonicalString);
  let sigOk = timingSafeEqualStr(expectedPrimary, token);
  if (!sigOk && secrets.secondary) {
    const expectedSecondary = await hmacSha256Base64Url(secrets.secondary, canonicalString);
    sigOk = timingSafeEqualStr(expectedSecondary, token);
  }
  if (!sigOk) return false;

  const now = Math.floor(Date.now() / 1000);
  // Bao gồm clock skew 30s + grace window 180s tương thích `streamToken.ts`
  return now <= exp + Math.max(CLOCK_SKEW_TOLERANCE_SECONDS, MAX_STREAM_TOKEN_GRACE_SECONDS);
}

async function verifyUpstreamHeaderHint(referer, userAgent, sig, secrets) {
  const cleanRef = (referer || "").trim();
  const cleanUa = (userAgent || "").trim();
  if ((!cleanRef && !cleanUa) || !sig) return false;

  const payload = `hdr:${cleanRef}\n${cleanUa}`;
  const expectedPrimary = (await hmacSha256Base64Url(secrets.primary, payload)).slice(0, 22);
  if (timingSafeEqualStr(expectedPrimary, sig)) return true;

  if (secrets.secondary) {
    const expectedSecondary = (await hmacSha256Base64Url(secrets.secondary, payload)).slice(0, 22);
    if (timingSafeEqualStr(expectedSecondary, sig)) return true;
  }
  return false;
}

function hasOnlySafePublicCookies(cookieHeader) {
  const parts = cookieHeader.split(";");
  let hasCookiePair = false;
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eqIndex = trimmed.indexOf("=");
    const cookieName = (eqIndex >= 0 ? trimmed.slice(0, eqIndex) : trimmed).trim().toLowerCase();
    if (!cookieName || !SAFE_PUBLIC_COOKIE_NAMES.has(cookieName)) return false;
    hasCookiePair = true;
  }
  return hasCookiePair;
}

function isSafePublicMediaSegment(request, targetUrl, contentType, response) {
  try {
    const parsedUrl = new URL(targetUrl);
    const pathname = parsedUrl.pathname.toLowerCase();

    if (
      pathname.endsWith(".key") ||
      pathname.endsWith(".key.bin") ||
      pathname.includes("/key/") ||
      pathname.includes("/keys/")
    ) {
      return false;
    }

    if (request.headers.get("authorization")) return false;

    const clientCookie = request.headers.get("cookie")?.trim();
    if (clientCookie && !hasOnlySafePublicCookies(clientCookie)) return false;

    if (response.headers.has("set-cookie") || response.headers.has("authorization")) return false;

    const vary = (response.headers.get("vary") || "").toLowerCase();
    if (vary.includes("cookie") || vary.includes("authorization")) return false;

    for (const [paramKey] of parsedUrl.searchParams) {
      if (SENSITIVE_QUERY_PARAMS.has(paramKey.toLowerCase())) return false;
    }

    const hasSafeExt = SAFE_PUBLIC_SEGMENT_EXTS.some((ext) => pathname.endsWith(ext));
    if (!hasSafeExt) return false;

    const ct = (contentType || "").toLowerCase();
    return (
      ct.includes("video/mp2t") ||
      ct.includes("video/mp4") ||
      ct.includes("video/iso.segment") ||
      ct.includes("audio/aac") ||
      ct.includes("audio/mp4") ||
      ct.includes("audio/x-m4a") ||
      ct.includes("text/vtt") ||
      ct.includes("application/octet-stream")
    );
  } catch {
    return false;
  }
}

async function fetchWithSafeRedirects(initialUrl, request, customRef, customUa) {
  let currentUrl = initialUrl;
  const visited = new Set();

  for (let i = 0; i <= MAX_SAFE_REDIRECTS; i++) {
    if (!isSafePublicUrl(currentUrl)) {
      throw new Error(`SSRF guard blocked target URL: ${currentUrl}`);
    }
    if (isBlockedStreamUrl(currentUrl)) {
      throw new Error(`Stream source is blocked or invalid: ${currentUrl}`);
    }
    if (visited.has(currentUrl)) {
      throw new Error(`Redirect loop detected at ${currentUrl}`);
    }
    visited.add(currentUrl);

    const parsedCurrent = new URL(currentUrl);
    const origin = parsedCurrent.origin;
    const isFpt = /fptplay(?:53)?\.net/i.test(parsedCurrent.hostname);
    const isCola = /miekgo\.app|msdht\.app/i.test(parsedCurrent.hostname);

    const effectiveReferer = customRef && isSafePublicUrl(customRef) ? customRef : origin + "/";
    const effectiveOrigin = customRef && isSafePublicUrl(customRef) ? new URL(customRef).origin : origin;

    const upstreamHeaders = {
      "User-Agent": customUa
        ? customUa
        : isFpt
          ? "Mozilla/5.0 (SMART-TV; LINUX; Tizen 10.0) AppleWebKit/537.36 (KHTML, like Gecko) 130.0.6723.116/10.0 TV Safari/537.36"
          : isCola
            ? "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
            : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Referer: effectiveReferer,
      Origin: effectiveOrigin,
    };

    const clientRange = request.headers.get("Range");
    if (clientRange) {
      upstreamHeaders["Range"] = clientRange;
    }

    const response = await fetch(currentUrl, {
      method: "GET",
      headers: upstreamHeaders,
      redirect: "manual",
    });

    const isRedirect = [301, 302, 303, 307, 308].includes(response.status);
    if (!isRedirect) {
      return { response, finalUrl: currentUrl };
    }

    const location = response.headers.get("location");
    if (!location) {
      return { response, finalUrl: currentUrl };
    }
    currentUrl = new URL(location, currentUrl).toString();
  }

  throw new Error(`Exceeded maximum safe redirects (${MAX_SAFE_REDIRECTS})`);
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    if (request.method !== "GET") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: NO_CACHE_CORS_HEADERS,
      });
    }

    const url = new URL(request.url);
    const { searchParams } = url;
    const targetUrl = searchParams.get("url");
    const rawRef = searchParams.get("ref")?.trim() || "";
    const rawUa = searchParams.get("ua")?.trim() || "";
    const rawHsig = searchParams.get("hsig")?.trim() || "";
    const st = searchParams.get("st");
    const exp = searchParams.get("exp");
    const sid = searchParams.get("sid");
    const v = searchParams.get("v");

    if (!targetUrl) {
      return new Response("Missing url parameter", { status: 400, headers: NO_CACHE_CORS_HEADERS });
    }

    if (!isSafePublicUrl(targetUrl)) {
      return new Response("Forbidden target URL", { status: 403, headers: NO_CACHE_CORS_HEADERS });
    }

    if (isBlockedStreamUrl(targetUrl)) {
      return new Response("Stream source is blocked or invalid", { status: 410, headers: NO_CACHE_CORS_HEADERS });
    }

    const secrets = getSecrets(env);
    const safeRawRef = rawRef && isSafePublicUrl(rawRef) ? rawRef : "";
    const sanitizedRawUa = rawUa ? rawUa.replace(/[\r\n\0-\x1f\x7f]/g, "").slice(0, 256) : "";
    const hasValidHeaderSig = await verifyUpstreamHeaderHint(
      safeRawRef || undefined,
      sanitizedRawUa || undefined,
      rawHsig,
      secrets
    );
    const customRef = hasValidHeaderSig ? safeRawRef : "";
    const customUa = hasValidHeaderSig ? sanitizedRawUa : "";

    const cleanTargetLower = targetUrl.split("?")[0].toLowerCase();
    const hasMediaExt =
      cleanTargetLower.endsWith(".ts") ||
      cleanTargetLower.endsWith(".m4s") ||
      cleanTargetLower.endsWith(".mp4") ||
      cleanTargetLower.endsWith(".m4a") ||
      cleanTargetLower.endsWith(".aac") ||
      cleanTargetLower.endsWith(".vtt") ||
      cleanTargetLower.endsWith(".key") ||
      cleanTargetLower.endsWith(".key.bin");

    const isPlaylist =
      !hasMediaExt &&
      (cleanTargetLower.endsWith(".m3u8") ||
        cleanTargetLower.endsWith("/playlist") ||
        cleanTargetLower.endsWith("/manifest") ||
        cleanTargetLower.endsWith(".mpd") ||
        cleanTargetLower.includes(".m3u8"));

    if (!isPlaylist) {
      const isValid = await verifyToken(targetUrl, st, exp, sid, v, secrets);
      if (!isValid) {
        return new Response("Invalid or expired stream token", {
          status: 403,
          headers: NO_CACHE_CORS_HEADERS,
        });
      }
    }

    try {
      const { response: upstreamRes, finalUrl } = await fetchWithSafeRedirects(
        targetUrl,
        request,
        customRef,
        customUa
      );

      if (!upstreamRes.ok) {
        return new Response(`Upstream returned ${upstreamRes.status}`, {
          status: upstreamRes.status,
          headers: NO_CACHE_CORS_HEADERS,
        });
      }

      const contentType = upstreamRes.headers.get("content-type") || "";
      if (
        targetUrl.includes(".m3u8") ||
        finalUrl.includes(".m3u8") ||
        contentType.includes("mpegurl") ||
        contentType.includes("application/x-mpegURL")
      ) {
        const text = await upstreamRes.text();
        const lines = text.split("\n");
        const effectiveBaseUrl = finalUrl || targetUrl;
        const playlistStreamId = await computeStreamId(effectiveBaseUrl);

        const toProxyUrl = async (value) => {
          const absoluteUrl = new URL(value, effectiveBaseUrl).toString();
          const cleanAbs = absoluteUrl.split("?")[0].toLowerCase();
          const isChildPlaylist =
            cleanAbs.endsWith(".m3u8") || cleanAbs.includes("playlist") || cleanAbs.includes("manifest");

          if (!isChildPlaylist) {
            const isMediaChunk =
              cleanAbs.endsWith(".ts") ||
              cleanAbs.endsWith(".m4s") ||
              cleanAbs.endsWith(".mp4") ||
              cleanAbs.endsWith(".m4a") ||
              cleanAbs.endsWith(".aac") ||
              cleanAbs.endsWith(".vtt");

            if (isMediaChunk && absoluteUrl.startsWith("https://") && !customRef && !customUa) {
              return absoluteUrl;
            }
          }

          const signed = await generateToken(absoluteUrl, playlistStreamId, secrets.primary);
          const extraParams = new URLSearchParams();
          if (hasValidHeaderSig) {
            if (customRef) extraParams.set("ref", customRef);
            if (customUa) extraParams.set("ua", customUa);
            extraParams.set("hsig", rawHsig);
          }
          const extraQuery = extraParams.toString();
          return `${url.pathname}?url=${encodeURIComponent(absoluteUrl)}&st=${encodeURIComponent(signed.token)}&exp=${signed.exp}&sid=${encodeURIComponent(signed.sid)}&v=${signed.v}${extraQuery ? `&${extraQuery}` : ""}`;
        };

        const rewrittenLines = await Promise.all(
          lines.map(async (line) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#")) {
              const matches = [...line.matchAll(/URI="([^"]+)"/g)];
              if (matches.length === 0) return line;
              let updatedLine = line;
              for (const m of matches) {
                const rewritten = await toProxyUrl(m[1]);
                updatedLine = updatedLine.replace(m[0], `URI="${rewritten}"`);
              }
              return updatedLine;
            }
            return toProxyUrl(trimmed);
          })
        );

        return new Response(rewrittenLines.join("\n"), {
          headers: {
            "Content-Type": "application/vnd.apple.mpegurl",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        });
      }

      const effectiveUrl = finalUrl || targetUrl;
      const isSafe = isSafePublicMediaSegment(request, effectiveUrl, contentType, upstreamRes);

      const resHeaders = new Headers();
      resHeaders.set("Content-Type", contentType || "video/mp2t");
      resHeaders.set("Access-Control-Allow-Origin", "*");
      resHeaders.set("Access-Control-Allow-Methods", "GET, OPTIONS");
      if (isSafe) {
        resHeaders.set("Cache-Control", "public, max-age=120, s-maxage=300, stale-while-revalidate=600");
        resHeaders.set("CDN-Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
      } else {
        resHeaders.set("Cache-Control", "private, no-cache, no-store, max-age=0, must-revalidate");
      }

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
      const msg = err?.message || String(err);
      const isSecurityBlock = msg.includes("SSRF guard blocked") || msg.includes("Stream source is blocked");
      return new Response(`Worker proxy error: ${msg}`, {
        status: isSecurityBlock ? 403 : 502,
        headers: NO_CACHE_CORS_HEADERS,
      });
    }
  },
};
