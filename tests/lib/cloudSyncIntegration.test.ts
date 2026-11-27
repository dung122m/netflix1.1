/* eslint-disable @typescript-eslint/no-explicit-any */
// Mock window and localStorage for node:test environment BEFORE imports
const storage: Record<string, string> = {};
const listeners: Record<string, Array<(...args: any[]) => void>> = {};

// @ts-expect-error test mock
globalThis.window = {
  addEventListener: (event: string, cb: any) => {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(cb);
  },
  removeEventListener: (event: string, cb: any) => {
    if (listeners[event]) {
      listeners[event] = listeners[event].filter((f) => f !== cb);
    }
  },
  dispatchEvent: (event: any) => {
    const type = event.type || event;
    if (listeners[type]) {
      listeners[type].forEach((cb) => cb(event));
    }
    return true;
  },
};

// @ts-expect-error test mock
globalThis.CustomEvent = class CustomEvent {
  type: string;
  detail: any;
  constructor(type: string, params?: { detail?: any }) {
    this.type = type;
    this.detail = params?.detail;
  }
};

// @ts-expect-error test mock
globalThis.Event = class Event {
  type: string;
  constructor(type: string) {
    this.type = type;
  }
};

// @ts-expect-error test mock
globalThis.localStorage = {
  getItem: (key: string) => storage[key] || null,
  setItem: (key: string, val: string) => { storage[key] = String(val); },
  removeItem: (key: string) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
};

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

describe("Nanaflix Wave 2 — Cloud Sync, Watch History & Watchlist Integration Invariants", async () => {
  // Dynamic import to guarantee fresh module execution
  const { auth } = await import("@/lib/firebase");
  const {
    saveWatchHistory,
    getWatchHistory,
    setWatchHistoryFromSync,
    removeWatchHistoryItem,
    clearWatchHistory,
    invalidateMemoryWatchHistory,
    registerWatchHistorySyncHandler,
  } = await import("@/lib/watchHistory");

  const {
    addToWatchlist,
    removeFromWatchlist,
    getWatchlist,
    getGuestOwnedWatchlistItems,
    clearLocalWatchlistOnly,
    registerWatchlistSyncHandler,
  } = await import("@/lib/watchlist");

  const {
    syncWatchHistoryWithCloud,
    syncWatchlistWithCloud,
    mergeWatchHistoryWithCloud,
    _resetCloudSyncStateForTest,
  } = await import("@/lib/cloudSync");

  let mockUser: { uid: string; getIdToken: () => Promise<string> } | null = null;
  if (auth) {
    Object.defineProperty(auth, "currentUser", {
      get: () => mockUser,
      configurable: true,
    });
  }

  beforeEach(() => {
    Object.keys(storage).forEach((k) => delete storage[k]);
    invalidateMemoryWatchHistory();
    mockUser = null;
  });

  it("1. Thêm lịch sử xem mới khi đã đăng nhập: phát tín hiệu đồng bộ qua syncHandler", () => {
    mockUser = { uid: "test_user_123", getIdToken: async () => "token" };

    let calledItem: any = null;
    registerWatchHistorySyncHandler({
      saveItem: (uid, item, delayMs, opts) => {
        calledItem = { uid, item, delayMs, opts };
      },
      saveItemsBatch: () => {},
      removeItem: () => {},
      clearAll: () => {},
    });

    saveWatchHistory({
      slug: "lat-mat-7",
      title: "Lật Mặt 7",
      poster: "lat-mat-7.jpg",
      progressSeconds: 120,
      durationSeconds: 7200,
      updatedAt: Date.now(),
    });

    assert.ok(calledItem, "syncHandler.saveItem must be called");
    assert.equal(calledItem.uid, "test_user_123");
    assert.equal(calledItem.item.slug, "lat-mat-7");
    assert.equal(calledItem.delayMs, 30000);
  });

  it("2. Cập nhật và xóa lịch sử xem: gọi chính xác các phương thức removeItem và clearAll", () => {
    mockUser = { uid: "test_user_123", getIdToken: async () => "token" };

    let removedSlug = "";
    let clearedUid = "";

    registerWatchHistorySyncHandler({
      saveItem: () => {},
      saveItemsBatch: () => {},
      removeItem: (uid, slug) => { removedSlug = slug; },
      clearAll: (uid) => { clearedUid = uid; },
    });

    removeWatchHistoryItem("lat-mat-7");
    assert.equal(removedSlug, "lat-mat-7", "Must trigger removeItem with slug");

    clearWatchHistory();
    assert.equal(clearedUid, "test_user_123", "Must trigger clearAll with uid");
  });

  it("3. Thêm và xóa mục trong Watchlist: gọi chính xác watchlistSyncHandler", () => {
    mockUser = { uid: "test_user_123", getIdToken: async () => "token" };

    let savedItem: any = null;
    let removedSlug = "";

    registerWatchlistSyncHandler({
      saveItem: (uid, item) => { savedItem = { uid, item }; },
      removeItem: (uid, slug) => { removedSlug = slug; },
    });

    addToWatchlist({
      slug: "dao-pho-va-piano",
      title: "Đào, Phở và Piano",
      imageUrl: "piano.jpg",
    });

    assert.ok(savedItem, "watchlistSyncHandler.saveItem must be called");
    assert.equal(savedItem.item.slug, "dao-pho-va-piano");

    removeFromWatchlist("dao-pho-va-piano");
    assert.equal(removedSlug, "dao-pho-va-piano", "watchlistSyncHandler.removeItem must be called");
  });

  it("4. Áp dụng dữ liệu Cloud về local: KHÔNG kích hoạt ngược lại syncHandler (Không vòng lặp vô hạn)", () => {
    mockUser = { uid: "test_user_123", getIdToken: async () => "token" };

    let loopTriggered = false;
    registerWatchHistorySyncHandler({
      saveItem: () => { loopTriggered = true; },
      saveItemsBatch: () => { loopTriggered = true; },
      removeItem: () => { loopTriggered = true; },
      clearAll: () => { loopTriggered = true; },
    });

    // Cloud trả về danh sách lịch sử
    setWatchHistoryFromSync([
      {
        slug: "mai-2024",
        title: "Mai",
        poster: "mai.jpg",
        updatedAt: Date.now(),
        progressSeconds: 500,
      },
    ]);

    assert.equal(loopTriggered, false, "setWatchHistoryFromSync must NOT invoke syncHandler to avoid infinite loop");
    const history = getWatchHistory();
    assert.equal(history.length, 1);
    assert.equal(history[0].slug, "mai-2024");
  });

  it("5. Đồng bộ Cloud khi chưa đăng nhập: Fallback an toàn về LocalStorage không ném ngoại lệ", async () => {
    mockUser = null;

    storage["nanaflix_watch_history"] = JSON.stringify([
      { slug: "offline-movie", title: "Offline Movie", poster: "p.jpg", updatedAt: 1000 },
    ]);
    invalidateMemoryWatchHistory();

    const historyResult = await syncWatchHistoryWithCloud("");
    assert.equal(historyResult.length, 1);
    assert.equal(historyResult[0].slug, "offline-movie");

    // Thêm trực tiếp vào watchlist qua API chính thống
    addToWatchlist({
      slug: "offline-wl",
      title: "Offline WL",
      imageUrl: "w.jpg",
    });

    const watchlistResult = await syncWatchlistWithCloud("");
    assert.equal(watchlistResult.length, 1);
    assert.equal(watchlistResult[0].slug, "offline-wl");
  });

  it("6. Khách lưu phim vào Watchlist rồi đăng nhập: bảo toàn và đẩy lên Cloud kể cả khi Cloud rỗng", async () => {
    clearLocalWatchlistOnly();
    mockUser = null;

    addToWatchlist({
      slug: "guest-dune-2",
      title: "Dune: Part Two",
      imageUrl: "dune.jpg",
    });

    const guestSnapshot = getGuestOwnedWatchlistItems();
    assert.equal(guestSnapshot.length, 1);
    assert.equal(guestSnapshot[0].slug, "guest-dune-2");

    mockUser = { uid: "user_new_wl", getIdToken: async () => "token_new_wl" };
    let uploadedItems: any[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("/api/user/watchlist")) {
        if (init?.method === "POST") {
          const parsed = JSON.parse(String(init.body || "{}"));
          uploadedItems = parsed.items || [];
          return { ok: true, json: async () => ({ success: true }) } as any;
        }
        return { ok: true, json: async () => ({ success: true, items: [] }) } as any;
      }
      return { ok: true, json: async () => ({ success: true }) } as any;
    };

    try {
      const synced = await syncWatchlistWithCloud("user_new_wl", guestSnapshot);
      assert.equal(synced.length, 1);
      assert.equal(synced[0].slug, "guest-dune-2");
      assert.equal(uploadedItems.length, 1);
      assert.equal(uploadedItems[0].slug, "guest-dune-2");
      assert.equal(getWatchlist().length, 1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("7. Reload khi auth.currentUser chưa hydrate nhưng có cached session: đợi authStateReady trước khi sync Watchlist", async () => {
    clearLocalWatchlistOnly();
    mockUser = null;
    storage["nanaflix_cached_auth_user"] = JSON.stringify({
      uid: "user_cold_reload",
      email: "user@example.com",
    });

    if (auth) {
      Object.defineProperty(auth, "authStateReady", {
        value: async () => {
          await new Promise((r) => setTimeout(r, 10));
          mockUser = { uid: "user_cold_reload", getIdToken: async () => "tok" };
        },
        configurable: true,
      });
    }

    let syncedUid: string | null = null;
    registerWatchlistSyncHandler({
      saveItem: (uid) => {
        syncedUid = uid;
        return true;
      },
      removeItem: () => true,
    });

    addToWatchlist({
      slug: "cold-reload-movie",
      title: "Cold Reload Movie",
      imageUrl: "cold.jpg",
    });

    await new Promise((r) => setTimeout(r, 30));
    assert.equal(syncedUid, "user_cold_reload");
  });

  it("8. Đồng bộ Cloud KHÔNG được ghi đè mất phim mới xem ở local chưa kịp đẩy lên Cloud", async () => {
    _resetCloudSyncStateForTest();
    mockUser = { uid: "user_history_preserve", getIdToken: async () => "token_hist" };

    const nowTs = Date.now();
    // Người dùng vừa xem một tập phim mới ở local (lưu qua saveWatchHistory, chưa kịp flush lên Cloud)
    saveWatchHistory({
      slug: "series-newly-watched",
      title: "Phim Bộ Mới Xem",
      poster: "poster.jpg",
      episodeSlug: "tap-77",
      episodeName: "Tập 77",
      progressSeconds: 420,
      durationSeconds: 1400,
      updatedAt: nowTs,
    });

    let uploadedSlugs: string[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("/api/user/history")) {
        if (init?.method === "POST") {
          const parsed = JSON.parse(String(init.body || "{}"));
          uploadedSlugs = (parsed.items || []).map((i: any) => i.slug);
          return { ok: true, json: async () => ({ success: true }) } as any;
        }
        // Cloud trả về danh sách cũ KHÔNG có phim vừa xem và có 1 phim cũ khác
        return {
          ok: true,
          json: async () => ({
            success: true,
            items: [
              {
                slug: "old-cloud-movie",
                title: "Phim Cũ Trên Cloud",
                poster: "old.jpg",
                progressSeconds: 100,
                durationSeconds: 3000,
                updatedAt: nowTs - 100000,
              },
            ],
          }),
        } as any;
      }
      return { ok: true, json: async () => ({ success: true }) } as any;
    };

    try {
      const synced = await syncWatchHistoryWithCloud("user_history_preserve", true);
      assert.equal(synced.length, 2, "Phải giữ lại cả phim mới xem ở local lẫn phim trên Cloud");
      assert.equal(synced[0].slug, "series-newly-watched", "Phim mới xem phải đứng đầu theo updatedAt");
      assert.ok(
        uploadedSlugs.includes("series-newly-watched"),
        "Phim mới xem ở local phải được đẩy bù lên Cloud khi sync",
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("9. mergeWatchHistoryWithCloud không hồi sinh mục local cũ đã xóa trên Cloud nếu không nằm trong pendingSlugs", () => {
    const cloud = [
      { slug: "kept-movie", title: "Kept", poster: "k.jpg", updatedAt: 5000 },
    ];
    const local = [
      { slug: "kept-movie", title: "Kept", poster: "k.jpg", updatedAt: 4000 },
      { slug: "deleted-elsewhere", title: "Deleted", poster: "d.jpg", updatedAt: 3000 },
    ];

    const { merged, itemsToUpload } = mergeWatchHistoryWithCloud(cloud, local, []);
    assert.deepEqual(merged.map((i) => i.slug), ["kept-movie"]);
    assert.equal(itemsToUpload.length, 0);
  });
});
