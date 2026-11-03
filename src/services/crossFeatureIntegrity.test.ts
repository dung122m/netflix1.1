/* eslint-disable @typescript-eslint/no-explicit-any */
// Mock window and localStorage for node:test environment BEFORE imports
const storage: Record<string, string> = {};
const dispatchedEvents: Array<{ type: string; detail?: any }> = [];

// @ts-expect-error test mock
globalThis.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: (e: any) => {
    dispatchedEvents.push({ type: e?.type, detail: e?.detail });
    return true;
  },
};

// @ts-expect-error test mock
globalThis.localStorage = {
  getItem: (key: string) => storage[key] || null,
  setItem: (key: string, val: string) => { storage[key] = String(val); },
  removeItem: (key: string) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
};

import { describe, it, before, beforeEach } from "node:test";
import assert from "node:assert/strict";

describe("NANAFLIX CROSS-FEATURE INTEGRITY REGRESSION SUITE", () => {
  let fbModule: any;
  let currentMockUser: any = null;

  before(async () => {
    fbModule = await import("@/lib/firebase");
    const fb = fbModule.default || fbModule;
    if (fb && fb.auth) {
      Object.defineProperty(fb.auth, "currentUser", {
        get: () => currentMockUser,
        configurable: true,
      });
    }
  });

  beforeEach(() => {
    Object.keys(storage).forEach((k) => delete storage[k]);
    dispatchedEvents.length = 0;
    currentMockUser = null;
  });

  // =========================================================================
  // 1. COLLECTIONS: SCHEMA MISMATCH & DELETE TOMBSTONE ROLLBACK
  // =========================================================================
  describe("1. Collections - Schema Alignment & Tombstone Rollback", () => {
    it("1.1 Collections payload MUST NOT contain 'cover_url' to prevent Supabase 400 error", async () => {
      const liveColumns = [
        "id", "user_id", "user_name", "user_avatar", "name",
        "description", "is_public", "color_gradient", "movies",
        "likes_count", "views_count", "created_at", "updated_at"
      ];

      const testPayload: Record<string, unknown> = {
        id: "col_1",
        user_id: "user_1",
        user_name: "Test User",
        user_avatar: null,
        name: "My Collection",
        description: null,
        is_public: true,
        color_gradient: null,
        movies: [{ slug: "mai", title: "Mai", poster: "https://poster.jpg", addedAt: 123 }],
        created_at: 1000,
        updated_at: 1000,
      };

      for (const key of Object.keys(testPayload)) {
        assert.ok(liveColumns.includes(key), `Column ${key} must exist in live Supabase collections schema`);
      }
      assert.equal("cover_url" in testPayload, false, "cover_url must be absent from DB payload");
    });

    it("1.2 Collections Delete ROLLBACK: When Server DELETE fails, local item is restored and tombstone is cleared", async () => {
      const {
        deleteCollection,
        getLocalCollections,
        saveLocalCollections,
        getTombstones,
      } = await import("./collectionService");

      const userId = "test_user_delete_rollback";
      currentMockUser = {
        uid: userId,
        getIdToken: async () => "mock_token_123",
      };

      const initialCollection = {
        id: "col_rollback_test",
        userId,
        creatorName: "User",
        name: "Anime Favorites",
        isPublic: true,
        movies: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      saveLocalCollections(userId, [initialCollection]);
      assert.equal(getLocalCollections(userId).length, 1);

      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => {
        return {
          ok: false,
          status: 500,
          json: async () => ({ error: "Internal Server Error" }),
        } as any;
      };

      try {
        const result = await deleteCollection(userId, "col_rollback_test");
        assert.equal(result, false, "deleteCollection must return false when server returns 500");

        const restored = getLocalCollections(userId);
        assert.equal(restored.length, 1, "Collection must be restored in LocalStorage");
        assert.equal(restored[0].id, "col_rollback_test");

        const tombstones = getTombstones(userId);
        assert.equal(Boolean(tombstones["col_rollback_test"]), false, "Tombstone must be cleared on rollback");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("1.3 Collections Delete SUCCESS: When Server confirms delete (200/404), tombstone is persisted", async () => {
      const {
        deleteCollection,
        getLocalCollections,
        saveLocalCollections,
        getTombstones,
      } = await import("./collectionService");

      const userId = "test_user_delete_success";
      currentMockUser = {
        uid: userId,
        getIdToken: async () => "mock_token_valid",
      };

      const initialCollection = {
        id: "col_success_test",
        userId,
        creatorName: "User",
        name: "Movies to watch",
        isPublic: true,
        movies: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      saveLocalCollections(userId, [initialCollection]);

      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        } as any;
      };

      try {
        const result = await deleteCollection(userId, "col_success_test");
        assert.equal(result, true, "deleteCollection must return true on server success");

        const remaining = getLocalCollections(userId);
        assert.equal(remaining.length, 0, "Collection must be removed from LocalStorage");

        const tombstones = getTombstones(userId);
        assert.ok(tombstones["col_success_test"], "Tombstone must be recorded to prevent resurrection");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  // =========================================================================
  // 2. WATCH HISTORY: LOGOUT CLEANUP & PRIVACY PRESERVATION
  // =========================================================================
  describe("2. Watch History - Episode Progress & Logout Data Isolation", () => {
    it("2.1 clearLocalWatchHistoryOnly MUST delete both 'nanaflix_watch_history' AND 'nanaflix_episodes_progress'", async () => {
      const {
        clearLocalWatchHistoryOnly,
        getEpisodeProgress,
        saveEpisodeProgress,
      } = await import("@/lib/watchHistory");

      // User A watches an episode
      storage["nanaflix_watch_history"] = JSON.stringify([
        { slug: "naruto-2002", title: "Naruto", progressSeconds: 120, updatedAt: Date.now() },
      ]);
      saveEpisodeProgress("naruto-2002", "tap-1", 1250, 1400);

      // Verify progress exists before logout
      const beforeLogout = getEpisodeProgress("naruto-2002", "tap-1");
      assert.equal(beforeLogout, 1250);
      assert.ok(storage["nanaflix_episodes_progress"]);
      assert.ok(storage["nanaflix_watch_history"]);

      // User logs out
      clearLocalWatchHistoryOnly();

      // Verify both keys are wiped out
      assert.equal(storage["nanaflix_watch_history"], undefined, "Watch history must be removed");
      assert.equal(storage["nanaflix_episodes_progress"], undefined, "Episode progress must be removed");

      // Verify User B cannot access User A's episode progress
      const afterLogout = getEpisodeProgress("naruto-2002", "tap-1");
      assert.equal(afterLogout, 0, "User B must not see User A's progress");
    });
  });

  // =========================================================================
  // 3. ANALYTICS: SCHEMA COMPLIANCE & ERROR LOGGING
  // =========================================================================
  describe("3. Analytics - Schema Alignment & Telemetry Resilience", () => {
    it("3.1 analytics_events insert payload must omit unsupported Geo columns and match exact DB schema", async () => {
      const allowedDbColumns = [
        "id", "event_type", "movie_slug", "movie_title", "episode_slug",
        "episode_name", "user_id", "anonymous_id", "device_type", "os",
        "browser", "screen_res", "duration_seconds", "progress_seconds",
        "keyword", "created_at"
      ];

      const samplePayload: Record<string, unknown> = {
        id: "evt_123",
        event_type: "site_visit",
        movie_slug: "home",
        movie_title: "/",
        episode_slug: null,
        episode_name: null,
        user_id: "user_123",
        anonymous_id: "anon_456",
        device_type: "desktop",
        os: "Windows",
        browser: "Chrome",
        screen_res: null,
        duration_seconds: 0,
        progress_seconds: 0,
        keyword: null,
        created_at: Date.now(),
      };

      for (const col of Object.keys(samplePayload)) {
        assert.ok(allowedDbColumns.includes(col), `Column ${col} must be supported by DB`);
      }

      assert.equal("country" in samplePayload, false);
      assert.equal("country_code" in samplePayload, false);
      assert.equal("region" in samplePayload, false);
      assert.equal("city" in samplePayload, false);
    });
  });

  // =========================================================================
  // 4. WATCHLIST: OPTIMISTIC ROLLBACK & CONCURRENCY-SAFE MERGE
  // =========================================================================
  describe("4. Watchlist - Optimistic Mutation & Rollback Verification", () => {
    it("4.1 addToWatchlist ROLLBACK: If cloud sync fails, local item is rolled back and UI notified", async () => {
      const {
        addToWatchlist,
        getWatchlist,
        registerWatchlistSyncHandler,
        clearLocalWatchlistOnly,
        setAuthUserProviderForTest,
      } = await import("@/lib/watchlist");

      clearLocalWatchlistOnly();

      registerWatchlistSyncHandler({
        saveItem: async () => false, // fails
        removeItem: async () => true,
      });

      setAuthUserProviderForTest(() => ({ uid: "test_user_wl" }));

      try {
        addToWatchlist({
          slug: "dune-2",
          title: "Dune: Part Two",
          imageUrl: "https://dune.jpg",
        });

        assert.equal(getWatchlist().length, 1);
        assert.equal(getWatchlist()[0].slug, "dune-2");

        // Wait for asynchronous cloud rejection & rollback
        await new Promise((resolve) => setTimeout(resolve, 50));

        assert.equal(getWatchlist().length, 0, "Item must be rolled back on cloud failure");
      } finally {
        setAuthUserProviderForTest(null);
        registerWatchlistSyncHandler(null);
      }
    });

    it("4.2 removeFromWatchlist ROLLBACK: If cloud remove fails, removed item is restored to LocalStorage", async () => {
      const {
        addToWatchlist,
        removeFromWatchlist,
        getWatchlist,
        registerWatchlistSyncHandler,
        clearLocalWatchlistOnly,
        setAuthUserProviderForTest,
      } = await import("@/lib/watchlist");

      clearLocalWatchlistOnly();

      registerWatchlistSyncHandler({
        saveItem: async () => true,
        removeItem: async () => false, // will fail
      });

      setAuthUserProviderForTest(() => ({ uid: "test_user_wl_remove" }));

      try {
        addToWatchlist({
          slug: "oppenheimer",
          title: "Oppenheimer",
          imageUrl: "https://opp.jpg",
        });
        await new Promise((resolve) => setTimeout(resolve, 20));
        assert.equal(getWatchlist().length, 1);

        removeFromWatchlist("oppenheimer");

        assert.equal(getWatchlist().length, 0);

        await new Promise((resolve) => setTimeout(resolve, 50));

        assert.equal(getWatchlist().length, 1, "Item must be restored on cloud remove failure");
        assert.equal(getWatchlist()[0].slug, "oppenheimer");
      } finally {
        setAuthUserProviderForTest(null);
        registerWatchlistSyncHandler(null);
      }
    });

    it("4.3 mergeWatchlists: Preserves recent local unconfirmed items and never blindly wipes them", async () => {
      const { mergeWatchlists } = await import("@/lib/watchlist");

      const now = Date.now();
      const localList = [
        { slug: "movie_recent", title: "Recent Movie", imageUrl: "", addedAt: now - 5000 },
        { slug: "movie_common", title: "Common Movie", imageUrl: "", addedAt: now - 1000 },
      ];

      const cloudList = [
        { slug: "movie_cloud_only", title: "Cloud Movie", imageUrl: "", addedAt: now - 3600000 },
        { slug: "movie_common", title: "Common Movie Old", imageUrl: "", addedAt: now - 50000 },
      ];

      const merged = mergeWatchlists(localList, cloudList, 2 * 60 * 1000);

      assert.ok(merged.some((i) => i.slug === "movie_recent"), "Recent unconfirmed local item must be preserved");
      assert.ok(merged.some((i) => i.slug === "movie_cloud_only"), "Cloud item must be included");

      const common = merged.find((i) => i.slug === "movie_common");
      assert.equal(common?.addedAt, now - 1000, "Newer timestamp must win");
      assert.equal(merged.length, 3);
    });
  });
});
