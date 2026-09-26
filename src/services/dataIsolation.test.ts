/* eslint-disable @typescript-eslint/no-explicit-any */
// Mock window and localStorage for node:test environment BEFORE any imports
const storage: Record<string, string> = {};
// @ts-expect-error test mock
globalThis.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => true,
};
// @ts-expect-error test mock
globalThis.localStorage = {
  getItem: (key: string) => storage[key] || null,
  setItem: (key: string, val: string) => { storage[key] = String(val); },
  removeItem: (key: string) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
};

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

describe("Nanaflix Targeted Patch — User / Admin / Data Isolation Verification", () => {
  let recordUserProfile: any;
  let getCachedUserProfile: any;
  let getAllProfilesSupabase: any;
  let syncWatchHistoryWithCloud: any;
  let syncWatchlistWithCloud: any;
  let getWatchHistory: any;
  let getWatchlist: any;
  let fb: any;
  let currentMockUser: any = null;

  before(async () => {
    const userSvc = await import("./userService");
    recordUserProfile = userSvc.recordUserProfile;
    getCachedUserProfile = userSvc.getCachedUserProfile;

    const supaSvc = await import("./supabaseService");
    getAllProfilesSupabase = supaSvc.getAllProfilesSupabase;

    const cloudSvc = await import("@/lib/cloudSync");
    syncWatchHistoryWithCloud = cloudSvc.syncWatchHistoryWithCloud;
    syncWatchlistWithCloud = cloudSvc.syncWatchlistWithCloud;

    const histSvc = await import("@/lib/watchHistory");
    getWatchHistory = histSvc.getWatchHistory;

    const wlSvc = await import("@/lib/watchlist");
    getWatchlist = wlSvc.getWatchlist;

    fb = await import("@/lib/firebase");
    if (fb.auth) {
      Object.defineProperty(fb.auth, "currentUser", {
        get: () => currentMockUser,
        configurable: true,
      });
    }
  });

  it("TEST A & B (BUG-01): getAllProfilesSupabase returns empty list safely when unauthenticated / no token", async () => {
    currentMockUser = null;
    const result = await getAllProfilesSupabase();
    assert.deepEqual(result, { profiles: [], totalCount: 0 });
  });

  it("TEST D (BUG-02): Cross-user watch time isolation — User B does NOT inherit User A's 336m watch history", async () => {
    // 1. Simulate User A (Admin or previous viewer) leaving 336m in localStorage
    storage["nanaflix_watch_history"] = JSON.stringify([
      { slug: "movie-1", title: "Movie 1", progressSeconds: 10080, durationSeconds: 10800, updatedAt: Date.now() },
      { slug: "movie-2", title: "Movie 2", progressSeconds: 10080, durationSeconds: 10800, updatedAt: Date.now() },
    ]);

    // 2. User B (huyentrang1102@gmail.com) logs in for the first time
    const userB = {
      uid: "user_b_huyentrang_uid",
      email: "huyentrang1102@gmail.com",
      displayName: "Huyền Trang",
      photoURL: "",
    };

    // User B profile cache does not exist yet
    assert.equal(getCachedUserProfile(userB.uid), null);

    // Run recordUserProfile for User B
    await recordUserProfile(userB);

    // Verify User B's cached profile
    const cachedProfile = getCachedUserProfile(userB.uid);
    assert.ok(cachedProfile, "User B profile should be cached");
    assert.equal(
      cachedProfile.watchTimeMinutes,
      0,
      "User B watchTimeMinutes MUST be strictly 0, not polluted with 336 minutes!"
    );
  });

  it("TEST E & F (BUG-03): Cloud history isolation — User B with empty cloud history does NOT upload User A's local history", async () => {
    // 1. Storage still contains User A's local history
    storage["nanaflix_watch_history"] = JSON.stringify([
      { slug: "movie-1", title: "Movie 1", progressSeconds: 10080, durationSeconds: 10800, updatedAt: Date.now() },
    ]);

    // Mock authenticated user B
    currentMockUser = {
      uid: "user_b_huyentrang_uid",
      email: "huyentrang1102@gmail.com",
      getIdToken: async () => "mock_id_token_user_b",
    };

    // Mock fetch for /api/user/history returning empty items for User B
    const originalFetch = globalThis.fetch;
    let postCallCount = 0;
    // @ts-expect-error test mock
    globalThis.fetch = async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("/api/user/history")) {
        if (init?.method === "POST") {
          postCallCount++;
          return { ok: true, json: async () => ({ success: true }) };
        }
        return {
          ok: true,
          json: async () => ({ success: true, items: [] }),
        };
      }
      return { ok: true, json: async () => ({ success: true }) };
    };

    try {
      // User B syncs with cloud
      const syncedHistory = await syncWatchHistoryWithCloud("user_b_huyentrang_uid");
      
      // Verification:
      // 1. Post count should be 0 (no uploading of foreign localList!)
      assert.equal(postCallCount, 0, "syncWatchHistoryWithCloud must NOT post localList to User B's empty cloud account");
      // 2. Synced history for User B must be empty
      assert.deepEqual(syncedHistory, [], "User B synced history must be empty");
      // 3. Local history must be reset to empty for User B
      const currentHistory = getWatchHistory();
      assert.deepEqual(currentHistory, [], "Local history must be cleaned up to empty for User B");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("TEST G: Existing User with cloud history retains their own history and watch time", async () => {
    // User A has 2 movies in cloud
    const userAHistory = [
      { slug: "movie-a", title: "Movie A", updatedAt: 1000 },
      { slug: "movie-b", title: "Movie B", updatedAt: 2000 },
    ];

    currentMockUser = {
      uid: "user_a_uid",
      email: "usera@example.com",
      getIdToken: async () => "mock_id_token_user_a",
    };

    const originalFetch = globalThis.fetch;
    // @ts-expect-error test mock
    globalThis.fetch = async (url: string | URL | Request) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("/api/user/history")) {
        return {
          ok: true,
          json: async () => ({ success: true, items: userAHistory }),
        };
      }
      return { ok: true, json: async () => ({ success: true }) };
    };

    try {
      const result = await syncWatchHistoryWithCloud("user_a_uid");
      assert.equal(result.length, 2, "User A retains their 2 cloud history items");
      assert.equal(result[0].slug, "movie-b"); // sorted by updatedAt desc
      assert.equal(result[1].slug, "movie-a");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("TEST H: Watchlist isolation — User B with empty cloud watchlist does NOT upload User A's local watchlist", async () => {
    storage["nanaflix_watchlist_v1"] = JSON.stringify([
      { slug: "movie-fav-1", title: "Movie Fav 1", addedAt: Date.now() },
    ]);

    currentMockUser = {
      uid: "user_b_huyentrang_uid",
      email: "huyentrang1102@gmail.com",
      getIdToken: async () => "mock_id_token_user_b",
    };

    const originalFetch = globalThis.fetch;
    let postCallCount = 0;
    // @ts-expect-error test mock
    globalThis.fetch = async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("/api/user/watchlist")) {
        if (init?.method === "POST") {
          postCallCount++;
          return { ok: true, json: async () => ({ success: true }) };
        }
        return {
          ok: true,
          json: async () => ({ success: true, items: [] }),
        };
      }
      return { ok: true, json: async () => ({ success: true }) };
    };

    try {
      const syncedWatchlist = await syncWatchlistWithCloud("user_b_huyentrang_uid");
      assert.equal(postCallCount, 0, "syncWatchlistWithCloud must NOT post localList to User B's empty cloud account");
      assert.deepEqual(syncedWatchlist, [], "User B synced watchlist must be empty");
      assert.deepEqual(getWatchlist(), [], "Local watchlist must be reset to empty for User B");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
