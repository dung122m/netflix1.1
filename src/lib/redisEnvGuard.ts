/**
 * Unified Redis Environment Guard for Nanaflix
 *
 * Enforces strict environment boundaries to protect Production Redis:
 * - Production: Connects to Upstash Redis using UPSTASH_REDIS_REST_URL.
 * - Vercel Preview: Connects using UPSTASH_REDIS_REST_URL with environment isolation.
 * - Local Development (NODE_ENV=development):
 *   REFUSES to connect to Production Redis by default to prevent polluting
 *   production analytics, caches, and consuming account quota.
 *   Services gracefully operate in In-Memory High Performance mode (0 commands, 0 quota).
 *   Developers can opt in via ALLOW_PROD_REDIS_IN_DEV=true or provide a local DEV_REDIS_URL.
 * - Test Mode (NODE_ENV=test or APP_ENV=test):
 *   REFUSES to connect to Production Redis (even if credentials exist in .env.local).
 *   Only connects if a distinct TEST_REDIS_URL is provided (which must not match production).
 *
 * SECURITY: Never logs or reveals Redis tokens or secret credentials.
 */

let hasLoggedDevNotice = false;

export function resetRedisEnvGuardForTesting(): void {
  hasLoggedDevNotice = false;
}

export interface SafeRedisCredentials {
  url: string;
  token: string;
}

export function getSafeRedisCredentials(options?: {
  allowTestRedis?: boolean;
}): SafeRedisCredentials | null {
  const isTest = process.env.NODE_ENV === "test" || process.env.APP_ENV === "test";
  const isDev = process.env.NODE_ENV === "development";
  const isVercelProd = process.env.VERCEL_ENV === "production";
  const isVercelPreview = process.env.VERCEL_ENV === "preview";
  const isAppProd = process.env.APP_ENV === "production";
  const isNodeProd = process.env.NODE_ENV === "production";
  const isVercelRuntime = Boolean(process.env.VERCEL === "1");

  const prodUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const prodToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  // 1. TEST MODE
  if (isTest) {
    if (options?.allowTestRedis !== false) {
      const testUrl = process.env.TEST_REDIS_URL?.trim();
      const testToken = process.env.TEST_REDIS_TOKEN?.trim();

      if (testUrl && testToken) {
        if (prodUrl && testUrl.toLowerCase() === prodUrl.toLowerCase()) {
          console.warn(
            "[Redis Safety Guard] TEST_REDIS_URL matches UPSTASH_REDIS_REST_URL. Refusing to connect to production Redis during tests."
          );
          return null;
        }
        return { url: testUrl, token: testToken };
      }
    }
    // In test mode without explicit separate TEST_REDIS_URL, stay in safe in-memory mode
    return null;
  }

  // 2. VERCEL PREVIEW ENVIRONMENT (Strict Isolation)
  // By default, Vercel Preview environments MUST NOT write to Production Redis.
  if (isVercelPreview || process.env.APP_ENV === "preview") {
    const previewUrl = process.env.PREVIEW_REDIS_URL?.trim();
    const previewToken = process.env.PREVIEW_REDIS_TOKEN?.trim();
    if (previewUrl && previewToken) {
      return { url: previewUrl, token: previewToken };
    }
    // Explicit opt-in for Preview environments to connect to Production Redis
    if (process.env.ALLOW_PROD_REDIS_IN_PREVIEW === "true") {
      if (!prodUrl || !prodToken) return null;
      return { url: prodUrl, token: prodToken };
    }
    // Default: Safe in-memory fallback protecting production Upstash Redis from Preview branches
    return null;
  }

  // 3. PRODUCTION ENVIRONMENT (Vercel Production or Explicit Cloud Production)
  if (isVercelProd || isAppProd || (isNodeProd && isVercelRuntime)) {
    if (!prodUrl || !prodToken) return null;
    return { url: prodUrl, token: prodToken };
  }

  // 4. LOCAL DEVELOPMENT (NODE_ENV === "development" or non-Vercel local node process)
  if (isDev || !isNodeProd) {
    // Explicit opt-in for local development against production Redis
    if (process.env.ALLOW_PROD_REDIS_IN_DEV === "true") {
      if (!prodUrl || !prodToken) return null;
      return { url: prodUrl, token: prodToken };
    }

    // Dedicated local Redis instance (e.g. local Docker or emulator)
    const devUrl = process.env.DEV_REDIS_URL?.trim();
    const devToken = process.env.DEV_REDIS_TOKEN?.trim();
    if (devUrl && devToken) {
      return { url: devUrl, token: devToken };
    }

    // Default: Safe in-memory fallback protecting production Upstash Redis
    if (!hasLoggedDevNotice) {
      console.info(
        "[Redis Safety Guard] Local development environment detected. Production Upstash Redis is protected. Operating in In-Memory High Performance mode."
      );
      hasLoggedDevNotice = true;
    }
    return null;
  }

  // Fallback for standalone production builds running on external servers (e.g. Docker container with APP_ENV/NODE_ENV=production)
  if (isNodeProd) {
    if (process.env.ALLOW_PROD_REDIS_IN_DEV === "true" || process.env.ENABLE_STANDALONE_REDIS === "true") {
      if (!prodUrl || !prodToken) return null;
      return { url: prodUrl, token: prodToken };
    }
    // If running `npm run start` locally without explicit standalone flag, protect production Redis
    return null;
  }

  return null;
}

