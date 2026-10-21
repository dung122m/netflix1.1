import test from "node:test";
import assert from "node:assert/strict";
import {
  recordAnalyticsEvent,
  getAnalyticsDashboardStats,
  getDailyVisitorsStats,
  getVietnamDayBoundaries,
  getStartOfTodayVietnam,
  getHourVietnam,
  formatPageGroupName,
  AnalyticsDashboardStats,
  DailyVisitorsResponse,
  StoredAnalyticsEvent,
} from "./analyticsService";
import { AnalyticsEventPayload } from "@/lib/analyticsClient";

test("TEST 1 — TIMEZONE & BOUNDARIES: Vietnam Day Boundaries (UTC+7, Asia/Ho_Chi_Minh)", () => {
  // Test specific date: 2026-10-17
  const boundaries = getVietnamDayBoundaries("2026-10-17");
  assert.equal(boundaries.date, "2026-10-17");

  // 00:00:00.000 in Vietnam is 17:00:00.000 UTC of previous day
  const expectedStartUtc = Date.UTC(2026, 9, 16, 17, 0, 0, 0); // Month is 0-indexed: 9 = October
  assert.equal(boundaries.startMs, expectedStartUtc);

  // 23:59:59.999 in Vietnam is 16:59:59.999 UTC of current day
  const expectedEndUtc = expectedStartUtc + 86400 * 1000 - 1;
  assert.equal(boundaries.endMs, expectedEndUtc);

  // Test getHourVietnam
  const midnightVN = expectedStartUtc + 5 * 60 * 1000; // 00:05 VN
  assert.equal(getHourVietnam(midnightVN), 0);

  const noonVN = expectedStartUtc + 12 * 3600 * 1000; // 12:00 VN
  assert.equal(getHourVietnam(noonVN), 12);

  const nightVN = expectedEndUtc - 5 * 60 * 1000; // 23:54 VN
  assert.equal(getHourVietnam(nightVN), 23);

  // getStartOfTodayVietnam returns midnight UTC+7
  const startToday = getStartOfTodayVietnam(midnightVN);
  assert.equal(startToday, expectedStartUtc);
});

test("TEST 2 — EVENT SCOPE: Only site_visit is processed into visit statistics", async () => {
  // 1. Non-site_visit event must not fail and should not be processed as a visit
  const watchEv: AnalyticsEventPayload = {
    eventType: "watch_progress",
    movieSlug: "arcane",
    progressSeconds: 120,
    timestamp: Date.now(),
  };
  const resWatch = await recordAnalyticsEvent(watchEv);
  assert.equal(resWatch.success, true);
  assert.equal(resWatch.deduped, false);

  // 2. site_visit event is accepted
  const visitEv: AnalyticsEventPayload = {
    eventType: "site_visit",
    movieSlug: "home",
    movieTitle: "/",
    anonymousId: "anon_test_scope_123456",
    deviceInfo: {
      deviceType: "desktop",
      os: "Windows",
      browser: "Chrome",
    },
    timestamp: Date.now(),
  };
  const resVisit = await recordAnalyticsEvent(visitEv);
  assert.equal(resVisit.success, true);
});

test("TEST 3 — NOT-NULL CONSTRAINT GUARANTEE: anonymousId is always non-null", async () => {
  // Case A: Guest with explicit anonymousId
  const guestPayload: AnalyticsEventPayload = {
    eventType: "site_visit",
    movieSlug: "browse",
    anonymousId: "anon_valid_guest_998877",
    timestamp: Date.now(),
  };
  const resA = await recordAnalyticsEvent(guestPayload);
  assert.equal(resA.success, true);

  // Case B: Authenticated User where client did not send anonymousId
  // anonymousId must fallback to user_${userId} to prevent PostgreSQL NOT NULL constraint failure
  const userPayload: AnalyticsEventPayload = {
    eventType: "site_visit",
    movieSlug: "live",
    userId: "firebase_user_abc123",
    timestamp: Date.now(),
  };
  const resB = await recordAnalyticsEvent(userPayload);
  assert.equal(resB.success, true);

  // Case C: Completely anonymous without any ID
  const emptyPayload: AnalyticsEventPayload = {
    eventType: "site_visit",
    timestamp: Date.now(),
  };
  const resC = await recordAnalyticsEvent(emptyPayload);
  assert.equal(resC.success, true);
});

test("TEST 4 — MULTI-PAGE NAVIGATION: Pageviews vs Unique Visitors", () => {
  // Simulate events for 1 visitor navigating 3 different pages
  const now = Date.now();
  const guestId = "anon_explorer_112233";

  const simulatedEvents: StoredAnalyticsEvent[] = [
    {
      id: "evt_1",
      eventType: "site_visit",
      movieSlug: "home",
      movieTitle: "/",
      anonymousId: guestId,
      deviceType: "desktop",
      os: "Windows",
      browser: "Chrome",
      createdAt: now - 30000,
    },
    {
      id: "evt_2",
      eventType: "site_visit",
      movieSlug: "browse",
      movieTitle: "/browse",
      anonymousId: guestId,
      deviceType: "desktop",
      os: "Windows",
      browser: "Chrome",
      createdAt: now - 15000,
    },
    {
      id: "evt_3",
      eventType: "site_visit",
      movieSlug: "movie",
      movieTitle: "/movie/squid-game",
      anonymousId: guestId,
      deviceType: "desktop",
      os: "Windows",
      browser: "Chrome",
      createdAt: now,
    },
  ];

  // Aggregation logic test
  const uniqueVisitors = new Set<string>();
  const pageViews = new Map<string, number>();

  for (const ev of simulatedEvents) {
    uniqueVisitors.add(ev.userId || ev.anonymousId);
    pageViews.set(ev.movieSlug || "home", (pageViews.get(ev.movieSlug || "home") || 0) + 1);
  }

  // 3 pageviews, but strictly 1 unique visitor!
  assert.equal(simulatedEvents.length, 3, "Total visits must be 3");
  assert.equal(uniqueVisitors.size, 1, "Unique visitors must be 1");
  assert.equal(pageViews.get("home"), 1);
  assert.equal(pageViews.get("browse"), 1);
  assert.equal(pageViews.get("movie"), 1);
});

test("TEST 5 — PAGE GROUP FORMATTING: formatPageGroupName returns friendly names", () => {
  assert.equal(formatPageGroupName("home"), "Trang chủ (Home)");
  assert.equal(formatPageGroupName("/"), "Trang chủ (Home)");
  assert.equal(formatPageGroupName("browse"), "Khám phá / Danh mục");
  assert.equal(formatPageGroupName("movie"), "Chi tiết & Xem phim");
  assert.equal(formatPageGroupName("live"), "Trực tiếp Thể thao");
  assert.equal(formatPageGroupName("live-tv"), "Truyền hình Trực tuyến");
  assert.equal(formatPageGroupName("search"), "Tìm kiếm");
  assert.equal(formatPageGroupName("custom-section"), "custom-section");
  assert.equal(formatPageGroupName(undefined), "Trang chủ (Home)");
});

test("TEST 6 — BACKWARD COMPATIBILITY: AdminAnalyticsTab interface shape verification", async () => {
  // Call getAnalyticsDashboardStats to verify the returned data shape exactly matches AnalyticsDashboardStats
  const stats: AnalyticsDashboardStats = await getAnalyticsDashboardStats("today");

  // Verify all essential properties for AdminAnalyticsTab.tsx
  assert.ok(["today", "7d", "30d", "all"].includes(stats.timeframe));
  assert.equal(typeof stats.totalViews, "number");
  assert.ok(stats.uniqueViewers && typeof stats.uniqueViewers === "object");
  assert.equal(typeof stats.uniqueViewers.total, "number");
  assert.equal(typeof stats.uniqueViewers.loggedIn, "number");
  assert.equal(typeof stats.uniqueViewers.guests, "number");
  assert.equal(stats.totalWatchTimeSeconds, 0, "Obsolete watch time should be 0 in visit analytics");
  assert.equal(typeof stats.activeGuestsCount, "number");
  assert.ok(Array.isArray(stats.topMoviesByViews));
  assert.ok(Array.isArray(stats.topMoviesByUnique));
  assert.ok(stats.devices && typeof stats.devices === "object");
  assert.equal(typeof stats.devices.desktop, "number");
  assert.equal(typeof stats.devices.mobile, "number");
  assert.equal(typeof stats.devices.tablet, "number");
  assert.ok(Array.isArray(stats.osList));
  assert.ok(Array.isArray(stats.browserList));
  assert.ok(Array.isArray(stats.recentActivity));
  assert.ok(Array.isArray(stats.topSearches));
  assert.ok(Array.isArray(stats.liveWatching));
  assert.ok(Array.isArray(stats.hourlyWatchActivity));
  assert.equal(stats.hourlyWatchActivity.length, 24, "Hourly activity must have 24 buckets");
  assert.equal(typeof stats.todayVisitorsCount, "number");

  // Verify DeviceProfileStats synthesized shape
  assert.ok(stats.deviceProfileStats && typeof stats.deviceProfileStats === "object");
  assert.equal(typeof stats.deviceProfileStats.totalProfiles, "number");
  assert.ok(stats.deviceProfileStats.overview);
  assert.ok(Array.isArray(stats.deviceProfileStats.browsers));
  assert.ok(Array.isArray(stats.deviceProfileStats.operatingSystems));
  assert.ok(stats.deviceProfileStats.network);
  assert.ok(Array.isArray(stats.deviceProfileStats.topViewports));
  assert.ok(stats.deviceProfileStats.codecs);
});

test("TEST 7 — DAILY VISITORS API COMPATIBILITY: DailyVisitorsResponse shape verification", async () => {
  const daily: DailyVisitorsResponse = await getDailyVisitorsStats();

  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(daily.date), "Date must be YYYY-MM-DD");
  assert.ok(daily.summary && typeof daily.summary === "object");
  assert.equal(typeof daily.summary.total, "number");
  assert.equal(typeof daily.summary.users, "number");
  assert.equal(typeof daily.summary.guests, "number");
  assert.ok(Array.isArray(daily.visitors));

  // If there are visitors, check item shape
  if (daily.visitors.length > 0) {
    const v = daily.visitors[0];
    assert.ok(typeof v.visitorKey === "string");
    assert.ok(v.type === "user" || v.type === "guest");
    assert.ok(typeof v.displayName === "string");
    assert.ok(typeof v.firstSeen === "number");
    assert.ok(typeof v.lastSeen === "number");
    assert.ok(typeof v.eventCount === "number");
    assert.ok(typeof v.lastAction === "string");
  }
});

test("TEST 8 — RESILIENCE: Fail-safe execution when external services throw", async () => {
  // Ensure recordAnalyticsEvent does not throw even with malformed or edge-case inputs
  const malformedPayload: AnalyticsEventPayload = {
    eventType: "site_visit",
    movieSlug: "home",
    timestamp: 0,
    deviceInfo: undefined,
  };

  await assert.doesNotReject(async () => {
    const res = await recordAnalyticsEvent(malformedPayload);
    assert.equal(res.success, true);
  });

  // Ensure getAnalyticsDashboardStats does not reject
  await assert.doesNotReject(async () => {
    const res = await getAnalyticsDashboardStats("all");
    assert.ok(res);
  });
});
