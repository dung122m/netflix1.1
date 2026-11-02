/**
 * Trusted Client IP Resolution & Cloudflare Edge Verification for Nanaflix
 * - Single Source of Truth for resolving the authentic connecting client IP.
 * - Platform & Runtime Agnostic: Safe for Edge Middleware, Browser, Serverless, and Node.js.
 * - Zero external/native module dependencies (no crypto, no redis).
 */

import { NextRequest } from "next/server";

/**
 * Official Cloudflare IPv4 CIDR blocks
 */
export const CLOUDFLARE_IPV4_CIDR_STRINGS = [
  "173.245.48.0/20",
  "103.21.244.0/22",
  "103.22.200.0/22",
  "103.31.4.0/22",
  "141.101.64.0/18",
  "108.162.192.0/18",
  "190.93.240.0/20",
  "188.114.96.0/20",
  "197.234.240.0/22",
  "198.41.128.0/17",
  "162.158.0.0/15",
  "104.16.0.0/13",
  "104.24.0.0/14",
  "172.64.0.0/13",
  "131.0.72.0/22",
];

/**
 * Parse an IPv4 string into an unsigned 32-bit integer.
 * Returns null if not a valid IPv4 address.
 */
export function parseIpv4(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let num = 0;
  for (let i = 0; i < 4; i++) {
    const rawPart = parts[i];
    if (!/^\d{1,3}$/.test(rawPart)) return null;
    const part = Number(rawPart);
    if (part < 0 || part > 255) return null;
    if (rawPart.length > 1 && rawPart.startsWith("0")) return null;
    num = (num << 8) | part;
  }
  return num >>> 0;
}

export const CLOUDFLARE_IPV4_CIDRS: [number, number][] = CLOUDFLARE_IPV4_CIDR_STRINGS.map((cidr) => {
  const [ipStr, prefixStr] = cidr.split("/");
  const prefixLen = Number(prefixStr);
  const base = parseIpv4(ipStr) ?? 0;
  const mask = prefixLen === 0 ? 0 : (~0 << (32 - prefixLen)) >>> 0;
  return [base, mask];
});

/**
 * Official Cloudflare IPv6 prefixes
 */
export const CLOUDFLARE_IPV6_PREFIXES = [
  "2400:cb00:",
  "2606:4700:",
  "2803:f800:",
  "2405:b500:",
  "2405:8100:",
  "2a06:98c0:",
  "2a06:98c1:",
  "2c0f:f248:",
];

/**
 * Validate whether a string is a well-formed IPv4 or IPv6 address
 */
export function isValidIp(raw: string | null | undefined): boolean {
  if (!raw || typeof raw !== "string") return false;
  const ip = cleanIpString(raw);
  if (ip === "anonymous-client") return false;
  if (parseIpv4(ip) !== null) return true;

  // IPv6 validation: 2 to 8 hex groups separated by colons, or :: shorthand
  const lower = ip.toLowerCase();
  if (/^[0-9a-f:]{2,45}$/.test(lower) && lower.includes(":")) {
    return true;
  }
  return false;
}

/**
 * Checks whether an IP belongs to official Cloudflare edge IP ranges
 */
export function isCloudflareIp(rawIp?: string | null): boolean {
  if (!rawIp) return false;
  const ip = cleanIpString(rawIp);
  const ipv4 = parseIpv4(ip);
  if (ipv4 !== null) {
    for (const [base, mask] of CLOUDFLARE_IPV4_CIDRS) {
      if (((ipv4 & mask) >>> 0) === (base >>> 0)) {
        return true;
      }
    }
    return false;
  }

  const lower = ip.toLowerCase();
  for (const prefix of CLOUDFLARE_IPV6_PREFIXES) {
    if (lower.startsWith(prefix)) return true;
  }
  return false;
}

/**
 * Clean and normalize raw IP string
 * - Strips whitespace
 * - Strips port (:port from IPv4 or [IPv6]:port)
 * - Normalizes IPv4-mapped IPv6 (::ffff:192.0.2.1 -> 192.0.2.1)
 */
export function cleanIpString(raw: string | null | undefined): string {
  if (!raw) return "anonymous-client";
  let ip = raw.trim();

  // Strip brackets if bracketed IPv6: [2001:db8::1]:8080 or [2001:db8::1]
  if (ip.startsWith("[") && ip.includes("]")) {
    const endBracket = ip.indexOf("]");
    ip = ip.slice(1, endBracket);
  } else if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/.test(ip)) {
    // IPv4 with port: 192.0.2.1:8080 -> 192.0.2.1
    ip = ip.split(":")[0];
  }

  // Normalize IPv4-mapped IPv6 addresses (::ffff:192.0.2.1 -> 192.0.2.1)
  if (ip.toLowerCase().startsWith("::ffff:") && ip.includes(".")) {
    ip = ip.slice(7);
  }

  return ip;
}

/**
 * Extract and verify authentic client IP address
 *
 * SEC-REV-02 Threat Model & Trust Hierarchy:
 * 1. On Vercel:
 *    - `x-vercel-forwarded-for` and `req.ip` are set by Vercel edge infrastructure and CANNOT be forged by client.
 *    - `cf-connecting-ip` is ONLY trusted if the remote IP connecting to Vercel belongs to official Cloudflare IP ranges.
 *    - If an attacker sends `cf-connecting-ip` directly to Vercel (origin bypass), it is REJECTED and the real connecting IP is used.
 * 2. On Local Development / Test runner:
 *    - If no Vercel header is present, accepts `cf-connecting-ip` if valid, or falls back to `x-forwarded-for` / `x-real-ip`.
 * 3. Fallback:
 *    - Deterministic `"anonymous-client"` (never allows arbitrary client-chosen fingerprint).
 */
export function getClientIp(req: NextRequest | Headers): string {
  const headers = "headers" in req ? req.headers : req;

  // 1. Identify connecting IP established by Vercel edge infrastructure
  const vercelForwardedFor = headers.get("x-vercel-forwarded-for");
  const reqIp = "ip" in req && typeof (req as { ip?: unknown }).ip === "string"
    ? (req as { ip: string }).ip
    : null;

  let platformConnectingIp: string | null = null;
  if (vercelForwardedFor) {
    const candidate = cleanIpString(vercelForwardedFor.split(",")[0]);
    if (isValidIp(candidate)) {
      platformConnectingIp = candidate;
    }
  } else if (reqIp) {
    const candidate = cleanIpString(reqIp);
    if (isValidIp(candidate)) {
      platformConnectingIp = candidate;
    }
  }

  // 2. Evaluate cf-connecting-ip with Cloudflare proxy verification
  const cfConnectingIpRaw = headers.get("cf-connecting-ip");
  if (cfConnectingIpRaw) {
    const cleanedCfIp = cleanIpString(cfConnectingIpRaw);
    if (isValidIp(cleanedCfIp)) {
      if (platformConnectingIp) {
        // If connecting IP is a verified Cloudflare edge IP, trust cf-connecting-ip
        if (isCloudflareIp(platformConnectingIp)) {
          return cleanedCfIp;
        }
        // Attacker connected directly to Vercel while spoofing cf-connecting-ip!
        // REJECT cf-connecting-ip and rate limit attacker by their real connecting IP
        return platformConnectingIp;
      }

      // In local development or standalone tests without Vercel edge proxy
      return cleanedCfIp;
    }
  }

  // 3. If no cf-connecting-ip, use platform-verified connecting IP
  if (platformConnectingIp) {
    return platformConnectingIp;
  }

  // 4. Non-Vercel proxy chain fallback (Local dev / custom reverse proxies)
  const xForwardedFor = headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const ips = xForwardedFor.split(",").map((s) => cleanIpString(s));
    for (const candidate of ips) {
      if (isValidIp(candidate)) {
        return candidate;
      }
    }
  }

  const xRealIp = headers.get("x-real-ip");
  if (xRealIp) {
    const candidate = cleanIpString(xRealIp);
    if (isValidIp(candidate)) {
      return candidate;
    }
  }

  return "anonymous-client";
}
