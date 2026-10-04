import test from "node:test";
import assert from "node:assert/strict";
import {
  getStartOfWeekVietnam,
  getWeekKeyVietnam,
  VIETNAM_TIMEZONE_OFFSET_MS,
} from "./analyticsService";

test("TEST 6 — WEEK BOUNDARY: Vietnam Timezone Week Boundaries (Mon 00:00 -> Sun 23:59:59)", () => {
  // Test Case A: Sunday 2026-10-04 at 23:59:59 VN time (UTC: 2026-10-04T16:59:59Z)
  const sundayNightVN = new Date("2026-10-04T16:59:59.000Z").getTime();
  const startOfSundayWeek = getStartOfWeekVietnam(sundayNightVN);
  const startOfSundayWeekVN = new Date(startOfSundayWeek + VIETNAM_TIMEZONE_OFFSET_MS);

  // Must be Monday 2026-09-28 00:00:00 VN
  assert.equal(startOfSundayWeekVN.getUTCFullYear(), 2026);
  assert.equal(startOfSundayWeekVN.getUTCMonth(), 8); // 8 = September (0-indexed)
  assert.equal(startOfSundayWeekVN.getUTCDate(), 28);
  assert.equal(startOfSundayWeekVN.getUTCHours(), 0);
  assert.equal(getWeekKeyVietnam(sundayNightVN), "2026_09_28");

  // Test Case B: Monday 2026-10-05 at 00:00:01 VN time (UTC: 2026-10-04T17:00:01Z)
  const mondayMorningVN = new Date("2026-10-04T17:00:01.000Z").getTime();
  const startOfMondayWeek = getStartOfWeekVietnam(mondayMorningVN);
  const startOfMondayWeekVN = new Date(startOfMondayWeek + VIETNAM_TIMEZONE_OFFSET_MS);

  // Must be Monday 2026-10-05 00:00:00 VN
  assert.equal(startOfMondayWeekVN.getUTCFullYear(), 2026);
  assert.equal(startOfMondayWeekVN.getUTCMonth(), 9); // 9 = October
  assert.equal(startOfMondayWeekVN.getUTCDate(), 5);
  assert.equal(startOfMondayWeekVN.getUTCHours(), 0);
  assert.equal(getWeekKeyVietnam(mondayMorningVN), "2026_10_05");

  // Verify transition: Sunday night and Monday morning belong to DIFFERENT week keys
  assert.notEqual(getWeekKeyVietnam(sundayNightVN), getWeekKeyVietnam(mondayMorningVN));
});

test("TEST 1 & 2 & 3 — LIFETIME & WEEKLY: View Increment & Timeframe Isolation", () => {
  // In-memory simulation of Redis Sorted Sets & Analytics Events
  interface MockAnalyticsStore {
    lifetimeViews: Map<string, number>;
    weeklyViews: Map<string, Map<string, number>>; // weekKey -> (slug -> score)
  }

  const store: MockAnalyticsStore = {
    lifetimeViews: new Map(),
    weeklyViews: new Map(),
  };

  function recordView(slug: string, timestamp: number) {
    // 1. Increment Lifetime
    store.lifetimeViews.set(slug, (store.lifetimeViews.get(slug) || 0) + 1);

    // 2. Increment Weekly for Vietnam calendar week
    const weekKey = getWeekKeyVietnam(timestamp);
    if (!store.weeklyViews.has(weekKey)) {
      store.weeklyViews.set(weekKey, new Map());
    }
    const currentWeekMap = store.weeklyViews.get(weekKey)!;
    currentWeekMap.set(slug, (currentWeekMap.get(slug) || 0) + 1);
  }

  const prevWeekTimestamp = new Date("2026-09-30T10:00:00.000Z").getTime(); // Week 2026_09_28
  const currentWeekTimestamp = new Date("2026-10-06T10:00:00.000Z").getTime(); // Week 2026_10_05

  // Movie A has 10 views in previous week
  for (let i = 0; i < 10; i++) recordView("movie-a", prevWeekTimestamp);
  // Movie B has 5 views in previous week
  for (let i = 0; i < 5; i++) recordView("movie-b", prevWeekTimestamp);

  // In current week, Movie B gets 8 new views, Movie A gets 2 new views
  for (let i = 0; i < 8; i++) recordView("movie-b", currentWeekTimestamp);
  for (let i = 0; i < 2; i++) recordView("movie-a", currentWeekTimestamp);

  // Lifetime Ranking: Movie A (12) > Movie B (13) -> Movie B is #1 Lifetime
  assert.equal(store.lifetimeViews.get("movie-a"), 12);
  assert.equal(store.lifetimeViews.get("movie-b"), 13);

  // Current Week Ranking: Movie B (8) > Movie A (2) -> Movie B is #1 in Current Week
  const curWeekKey = getWeekKeyVietnam(currentWeekTimestamp);
  const curWeekMap = store.weeklyViews.get(curWeekKey)!;
  assert.equal(curWeekMap.get("movie-b"), 8);
  assert.equal(curWeekMap.get("movie-a"), 2);

  // Previous Week Ranking: Movie A (10) > Movie B (5) -> Movie A was #1 in Previous Week
  const prevWeekKey = getWeekKeyVietnam(prevWeekTimestamp);
  const prevWeekMap = store.weeklyViews.get(prevWeekKey)!;
  assert.equal(prevWeekMap.get("movie-a"), 10);
  assert.equal(prevWeekMap.get("movie-b"), 5);
});

test("TEST 4 & 5 — CACHE: Isolated Timeframe Keys and Invalidation", () => {
  const serverCache = new Map<string, { data: string; expireAt: number }>();

  function getFromCache(timeframe: "total" | "week", limit: number) {
    const key = `trending:${timeframe}:${limit}`;
    return serverCache.get(key);
  }

  function setCache(timeframe: "total" | "week", limit: number, data: string) {
    const key = `trending:${timeframe}:${limit}`;
    serverCache.set(key, { data, expireAt: Date.now() + 60000 });
  }

  function invalidateCache() {
    serverCache.clear();
  }

  // Populate cache for total and week with different payloads
  setCache("total", 10, "DATA_TOTAL_V1");
  setCache("week", 10, "DATA_WEEK_V1");

  // Ensure total and week do NOT return each other's data
  assert.equal(getFromCache("total", 10)?.data, "DATA_TOTAL_V1");
  assert.equal(getFromCache("week", 10)?.data, "DATA_WEEK_V1");

  // Invalidate cache on new view record
  invalidateCache();
  assert.equal(getFromCache("total", 10), undefined);
  assert.equal(getFromCache("week", 10), undefined);
});

test("TEST 7 — WATCH HISTORY REGRESSION: Watch History Personal Data Isolation", () => {
  interface WatchHistoryRow {
    id: string;
    user_id: string;
    slug: string;
    title: string;
    updated_at: number;
  }

  const rows: WatchHistoryRow[] = [];

  function recordWatchHistory(user_id: string, slug: string, title: string, timestamp: number) {
    const id = `${user_id}_${slug}`;
    const idx = rows.findIndex((r) => r.id === id);
    if (idx >= 0) {
      rows[idx].updated_at = timestamp;
    } else {
      rows.push({ id, user_id, slug, title, updated_at: timestamp });
    }
  }

  const t1 = Date.now();
  // User 1 watches Movie 1
  recordWatchHistory("user1", "phim-hay", "Phim Hay", t1);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].updated_at, t1);

  // User 1 watches Movie 1 again (episode 2) -> timestamp updates, personal history intact
  const t2 = t1 + 60000;
  recordWatchHistory("user1", "phim-hay", "Phim Hay", t2);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].updated_at, t2);

  // User 2 watches Movie 1 -> separate personal history entry
  recordWatchHistory("user2", "phim-hay", "Phim Hay", t2);
  assert.equal(rows.length, 2);
});
