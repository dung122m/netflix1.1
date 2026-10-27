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
  } = await import("./watchHistory");

  const {
    addToWatchlist,
    removeFromWatchlist,
    registerWatchlistSyncHandler,
  } = await import("./watchlist");

  const {
    syncWatchHistoryWithCloud,
    syncWatchlistWithCloud,
  } = await import("./cloudSync");

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
    assert.equal(calledItem.opts.force, true);
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
});
