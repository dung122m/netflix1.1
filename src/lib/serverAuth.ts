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

// In-memory micro-cache (TTL 5 minutes) to prevent redundant Google Identity Toolkit calls
const tokenCache = new Map<string, CachedToken>();

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
            tokenCache.set(bearerToken, { result, expiry: now + 5 * 60 * 1000 });
            return result;
          }
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
