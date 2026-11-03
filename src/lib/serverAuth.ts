import { NextRequest } from "next/server";
import { isUserAdmin } from "./adminConfig";

export interface ServerAuthResult {
  isAuthenticated: boolean;
  isAdmin: boolean;
  userId?: string;
  email?: string;
  displayName?: string;
  photoUrl?: string;
}

interface CachedToken {
  result: ServerAuthResult;
  expiry: number;
}

// In-memory micro-cache (TTL 5 minutes for valid, 1 minute for invalid) to prevent redundant Google Identity Toolkit calls
const tokenCache = new Map<string, CachedToken>();
const MAX_TOKEN_CACHE_ENTRIES = 1000;

function setCachedToken(token: string, entry: CachedToken): void {
  if (tokenCache.size >= MAX_TOKEN_CACHE_ENTRIES) {
    const now = Date.now();
    for (const [key, val] of tokenCache.entries()) {
      if (val.expiry <= now) {
        tokenCache.delete(key);
      }
    }
    if (tokenCache.size >= MAX_TOKEN_CACHE_ENTRIES) {
      const oldestKey = tokenCache.keys().next().value;
      if (oldestKey) tokenCache.delete(oldestKey);
    }
  }
  Map.prototype.set.call(tokenCache, token, entry);
}

export function _resetTokenCacheForTesting(): void {
  tokenCache.clear();
}

// Firebase ID tokens are standard JWTs (3 segments separated by '.')
const FIREBASE_JWT_REGEX = /^[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}$/;

export async function verifyServerAuth(req: NextRequest): Promise<ServerAuthResult> {
  const secretHeader = req.headers.get("x-admin-secret")?.trim();
  const authHeader = req.headers.get("authorization")?.trim();
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  // 1. Verify ADMIN_SYNC_SECRET (Server-side bypass for automated admin tasks)
  const envSecret = process.env.ADMIN_SYNC_SECRET?.trim();
  if (envSecret && (secretHeader === envSecret || bearerToken === envSecret)) {
    return {
      isAuthenticated: true,
      isAdmin: true,
      userId: "admin_system",
      email: "admin@system",
      displayName: "Admin System",
      photoUrl: "",
    };
  }

  // 2. Verify Firebase ID Token
  if (bearerToken && bearerToken !== envSecret) {
    const now = Date.now();
    const cached = tokenCache.get(bearerToken);
    if (cached && cached.expiry > now) {
      return cached.result;
    }

    // Pre-flight check: Reject malformed tokens without calling Google Identity Toolkit
    if (!FIREBASE_JWT_REGEX.test(bearerToken)) {
      const negativeResult: ServerAuthResult = { isAuthenticated: false, isAdmin: false };
      setCachedToken(bearerToken, { result: negativeResult, expiry: now + 60 * 1000 });
      return negativeResult;
    }

    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
    if (apiKey) {
      try {
        const verifyRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken: bearerToken }),
            signal: AbortSignal.timeout(5000),
          }
        );

        if (verifyRes.ok) {
          const verifyData = await verifyRes.json();
          const user = verifyData.users?.[0];
          if (user) {
            const userId = user.localId;
            const email = user.email || "";
            const displayName = user.displayName || "";
            const photoUrl = user.photoUrl || "";
            const isAdmin = Boolean(email && isUserAdmin(email));

            const result: ServerAuthResult = {
              isAuthenticated: true,
              isAdmin,
              userId,
              email,
              displayName,
              photoUrl,
            };

            // Cache token result for 5 minutes
            setCachedToken(bearerToken, { result, expiry: now + 5 * 60 * 1000 });
            return result;
          }
        } else {
          // Negative cache for invalid/expired tokens (1 minute) to throttle repeated attacker calls
          setCachedToken(bearerToken, {
            result: { isAuthenticated: false, isAdmin: false },
            expiry: now + 60 * 1000,
          });
        }
      } catch (err) {
        console.warn("[serverAuth] Failed to verify Firebase token:", err);
      }
    }
  }

  return {
    isAuthenticated: false,
    isAdmin: false,
  };
}

/**
 * Trích xuất userId mục tiêu cho các endpoint người dùng (/api/user/*).
 * Nếu caller là Admin và truyền query parameter ?userId=..., trả về userId được yêu cầu;
 * ngược lại trả về userId của chính người dùng đã xác thực.
 */
export function getEffectiveTargetUserId(auth: ServerAuthResult, req: NextRequest): string | null {
  if (!auth.isAuthenticated || !auth.userId) return null;
  const { searchParams } = new URL(req.url);
  const requested = searchParams.get("userId")?.trim();
  if (auth.isAdmin && requested) {
    return requested;
  }
  return auth.userId;
}
