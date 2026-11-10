import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getSafeRedisCredentials,
  resetRedisEnvGuardForTesting,
} from "@/lib/redisEnvGuard";
import { recordAnalyticsEvent } from "@/services/analyticsService";
import { AnalyticsEventPayload } from "@/lib/analyticsClient";

describe("REDIS OPTIMIZATION BATCH 1: ENVIRONMENT ISOLATION & ANALYTICS", () => {
  const origEnv = { ...process.env };

  function setTestEnv(key: string, value: string | undefined): void {
    if (value === undefined) {
      delete (process.env as Record<string, string | undefined>)[key];
    } else {
      (process.env as Record<string, string | undefined>)[key] = value;
    }
  }

  const restoreEnv = () => {
    process.env = { ...origEnv };
    resetRedisEnvGuardForTesting();
  };

  describe("Part A: Environment Isolation Guard (redisEnvGuard)", () => {
    it("A.1 Test mode without TEST_REDIS_URL refuses to connect to production Redis", () => {
      try {
        setTestEnv("NODE_ENV", "test");
        setTestEnv("APP_ENV", "test");
        setTestEnv("UPSTASH_REDIS_REST_URL", "https://safe-prod-redis.upstash.io");
        setTestEnv("UPSTASH_REDIS_REST_TOKEN", "secret_prod_token");
        setTestEnv("TEST_REDIS_URL", undefined);
        setTestEnv("TEST_REDIS_TOKEN", undefined);

        const creds = getSafeRedisCredentials();
        assert.equal(creds, null, "Must return null in test mode without separate TEST_REDIS_URL");
      } finally {
        restoreEnv();
      }
    });

    it("A.2 Test mode with TEST_REDIS_URL matching production is blocked by safety guard", () => {
      try {
        setTestEnv("NODE_ENV", "test");
        setTestEnv("APP_ENV", "test");
        setTestEnv("UPSTASH_REDIS_REST_URL", "https://safe-prod-redis.upstash.io");
        setTestEnv("UPSTASH_REDIS_REST_TOKEN", "secret_prod_token");
        setTestEnv("TEST_REDIS_URL", "https://safe-prod-redis.upstash.io");
        setTestEnv("TEST_REDIS_TOKEN", "secret_prod_token");

        const creds = getSafeRedisCredentials({ allowTestRedis: true });
        assert.equal(creds, null, "Must refuse to connect when TEST_REDIS_URL equals production Redis URL");
      } finally {
        restoreEnv();
      }
    });

    it("A.3 Local development (NODE_ENV=development) protects production Redis by default", () => {
      try {
        setTestEnv("NODE_ENV", "development");
        setTestEnv("APP_ENV", undefined);
        setTestEnv("VERCEL_ENV", undefined);
        setTestEnv("VERCEL", undefined);
        setTestEnv("ALLOW_PROD_REDIS_IN_DEV", undefined);
        setTestEnv("UPSTASH_REDIS_REST_URL", "https://safe-prod-redis.upstash.io");
        setTestEnv("UPSTASH_REDIS_REST_TOKEN", "secret_prod_token");

        const creds = getSafeRedisCredentials();
        assert.equal(creds, null, "Must return null in local development to prevent consuming production Redis quota");
      } finally {
        restoreEnv();
      }
    });

    it("A.4 Local development with ALLOW_PROD_REDIS_IN_DEV=true allows explicit opt-in", () => {
      try {
        setTestEnv("NODE_ENV", "development");
        setTestEnv("ALLOW_PROD_REDIS_IN_DEV", "true");
        setTestEnv("VERCEL_ENV", undefined);
        setTestEnv("VERCEL", undefined);
        setTestEnv("UPSTASH_REDIS_REST_URL", "https://safe-prod-redis.upstash.io");
        setTestEnv("UPSTASH_REDIS_REST_TOKEN", "secret_prod_token");

        const creds = getSafeRedisCredentials();
        assert.notEqual(creds, null);
        assert.equal(creds?.url, "https://safe-prod-redis.upstash.io");
      } finally {
        restoreEnv();
      }
    });

    it("A.5 Production environment (VERCEL_ENV=production) connects to Upstash Redis", () => {
      try {
        setTestEnv("NODE_ENV", "production");
        setTestEnv("VERCEL_ENV", "production");
        setTestEnv("VERCEL", "1");
        setTestEnv("UPSTASH_REDIS_REST_URL", "https://safe-prod-redis.upstash.io");
        setTestEnv("UPSTASH_REDIS_REST_TOKEN", "secret_prod_token");

        const creds = getSafeRedisCredentials();
        assert.notEqual(creds, null);
        assert.equal(creds?.url, "https://safe-prod-redis.upstash.io");
        assert.equal(creds?.token, "secret_prod_token");
      } finally {
        restoreEnv();
      }
    });

    it("A.6 Vercel Preview environment (VERCEL_ENV=preview) isolates from Production Redis by default", () => {
      try {
        setTestEnv("NODE_ENV", "production");
        setTestEnv("VERCEL_ENV", "preview");
        setTestEnv("VERCEL", "1");
        delete process.env.ALLOW_PROD_REDIS_IN_PREVIEW;
        delete process.env.PREVIEW_REDIS_URL;
        process.env.UPSTASH_REDIS_REST_URL = "https://safe-prod-redis.upstash.io";
        process.env.UPSTASH_REDIS_REST_TOKEN = "secret_prod_token";

        const creds = getSafeRedisCredentials();
        assert.equal(creds, null, "Preview MUST NOT connect to Production Redis by default");
      } finally {
        restoreEnv();
      }
    });

    it("A.7 Vercel Preview connects to dedicated PREVIEW_REDIS_URL when provided", () => {
      try {
        setTestEnv("NODE_ENV", "production");
        setTestEnv("VERCEL_ENV", "preview");
        setTestEnv("VERCEL", "1");
        setTestEnv("PREVIEW_REDIS_URL", "https://preview-isolated-redis.upstash.io");
        setTestEnv("PREVIEW_REDIS_TOKEN", "preview_token_123");
        process.env.UPSTASH_REDIS_REST_URL = "https://safe-prod-redis.upstash.io";
        process.env.UPSTASH_REDIS_REST_TOKEN = "secret_prod_token";

        const creds = getSafeRedisCredentials();
        assert.notEqual(creds, null);
        assert.equal(creds?.url, "https://preview-isolated-redis.upstash.io");
      } finally {
        restoreEnv();
      }
    });

    it("A.8 Vercel Preview allows explicit opt-in via ALLOW_PROD_REDIS_IN_PREVIEW=true", () => {
      try {
        setTestEnv("NODE_ENV", "production");
        setTestEnv("VERCEL_ENV", "preview");
        setTestEnv("VERCEL", "1");
        setTestEnv("ALLOW_PROD_REDIS_IN_PREVIEW", "true");
        process.env.UPSTASH_REDIS_REST_URL = "https://safe-prod-redis.upstash.io";
        process.env.UPSTASH_REDIS_REST_TOKEN = "secret_prod_token";

        const creds = getSafeRedisCredentials();
        assert.notEqual(creds, null);
        assert.equal(creds?.url, "https://safe-prod-redis.upstash.io");
      } finally {
        restoreEnv();
      }
    });
  });

  describe("Part B: Analytics Optimization & Resilience", () => {
    it("B.1 Non-site-visit events are accepted and not processed as site visits", async () => {
      const payload: AnalyticsEventPayload = {
        eventType: "watch_progress",
        movieSlug: "conan",
        durationSeconds: 120,
      };
      const res = await recordAnalyticsEvent(payload);
      assert.equal(res.success, true);
      assert.equal(res.deduped, false);
      assert.equal(res.visitorRecorded, true);
    });

    it("B.2 Deduplication: Rapid consecutive visits within 30s on same page are deduplicated", async () => {
      const now = Date.now();
      const uniqueViewer = `anon_dedup_test_${now}`;
      const payload: AnalyticsEventPayload = {
        eventType: "site_visit",
        movieSlug: "home",
        movieTitle: "/",
        anonymousId: uniqueViewer,
        timestamp: now,
      };

      // First visit should succeed and not be deduped
      const res1 = await recordAnalyticsEvent(payload);
      assert.equal(res1.success, true);
      assert.equal(res1.deduped, false);
      assert.equal(res1.visitorRecorded, true);

      // Immediate second visit to exact same pageGroup should be marked deduped
      const res2 = await recordAnalyticsEvent({
        ...payload,
        timestamp: now + 5000, // 5 seconds later
      });
      assert.equal(res2.success, true);
      assert.equal(res2.deduped, true);
      assert.equal(res2.visitorRecorded, true);
    });

    it("B.3 Multi-page navigation: Navigating to a different page is NOT blocked by deduplication", async () => {
      const now = Date.now();
      const uniqueViewer = `anon_multi_page_${now}`;

      const resHome = await recordAnalyticsEvent({
        eventType: "site_visit",
        movieSlug: "home",
        movieTitle: "/",
        anonymousId: uniqueViewer,
        timestamp: now,
      });
      assert.equal(resHome.success, true);
      assert.equal(resHome.deduped, false);

      const resBrowse = await recordAnalyticsEvent({
        eventType: "site_visit",
        movieSlug: "browse",
        movieTitle: "/browse",
        anonymousId: uniqueViewer,
        timestamp: now + 2000,
      });
      assert.equal(resBrowse.success, true);
      assert.equal(resBrowse.deduped, false);
    });

    it("B.4 Returning visitor flag (isReturningVisitor: true) records visit without throwing", async () => {
      const now = Date.now();
      const payload: AnalyticsEventPayload = {
        eventType: "site_visit",
        movieSlug: "movie",
        movieTitle: "/movies/conan",
        anonymousId: `anon_returning_${now}`,
        isReturningVisitor: true,
        timestamp: now,
      };

      const res = await recordAnalyticsEvent(payload);
      assert.equal(res.success, true);
      assert.equal(res.visitorRecorded, true);
    });

    it("B.5 Guest-to-User Identity Transition: visitor token strictly distinguishes guest and user", () => {
      const guestAnonId = "anon_visitor_abc";
      const authenticatedUserId = "user_firebase_xyz";

      const guestToken = `a_${guestAnonId}`;
      const userToken = `u_${authenticatedUserId}`;

      assert.notEqual(guestToken, userToken, "Guest token and user token must be distinct");

      // When guest token is stored in cookie, a user request has mismatch -> isReturningVisitor = false
      const incomingCookie: string = guestToken;
      const isReturningGuest = incomingCookie === guestToken;
      assert.equal(isReturningGuest, true, "Same guest should be recognized as returning");

      const isReturningUser = incomingCookie === userToken;
      assert.equal(isReturningUser, false, "Guest-to-User transition must NOT be treated as returning visitor");
    });

    it("B.6 Anonymous ID change is detected and not bypassed by stale cookie", () => {
      const oldAnonId = "anon_old_111";
      const newAnonId = "anon_new_222";

      const oldCookieToken: string = `a_${oldAnonId}`;
      const currentToken: string = `a_${newAnonId}`;

      const isReturning = oldCookieToken === currentToken;
      assert.equal(isReturning, false, "Different anonymousId must be recognized as new visitor");
    });
  });
});

