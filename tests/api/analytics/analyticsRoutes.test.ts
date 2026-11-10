import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET as getStatsRoute } from "@/app/api/analytics/stats/route";
import { GET as getDailyVisitorsRoute } from "@/app/api/analytics/daily-visitors/route";
import { POST as trackRoute } from "@/app/api/analytics/track/route";

test("SECURITY TEST 1 — UNAUTHENTICATED ACCESS BLOCKED", async () => {
  // 1. Stats endpoint without auth token
  const unauthReqStats = new NextRequest("http://localhost:3000/api/analytics/stats?timeframe=today");
  const resStats = await getStatsRoute(unauthReqStats);
  assert.equal(resStats.status, 401, "Unauthenticated access to stats must be 401");
  const dataStats = await resStats.json();
  assert.equal(dataStats.success, false);

  // 2. Daily visitors endpoint without auth token
  const unauthReqDaily = new NextRequest("http://localhost:3000/api/analytics/daily-visitors?date=2026-10-17");
  const resDaily = await getDailyVisitorsRoute(unauthReqDaily);
  assert.equal(resDaily.status, 401, "Unauthenticated access to daily visitors must be 401");
  const dataDaily = await resDaily.json();
  assert.equal(dataDaily.success, false);
});

test("SECURITY TEST 2 — TRACK ENDPOINT PAYLOAD SANITIZATION & EVENT FILTER", async () => {
  // 1. Non site_visit event is ignored
  const ignoreReq = new NextRequest("http://localhost:3000/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventType: "watch_progress", movieSlug: "avatar" }),
  });
  const resIgnore = await trackRoute(ignoreReq);
  const dataIgnore = await resIgnore.json();
  assert.equal(dataIgnore.success, true);
  assert.equal(dataIgnore.ignored, true);

  // 2. Missing eventType returns 400
  const badReq = new NextRequest("http://localhost:3000/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const resBad = await trackRoute(badReq);
  assert.equal(resBad.status, 400);

  // 3. Valid site_visit event
  const visitReq = new NextRequest("http://localhost:3000/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventType: "site_visit",
      movieSlug: "home",
      movieTitle: "/",
      anonymousId: "anon_test_auth_check_123456",
      deviceInfo: {
        deviceType: "desktop",
        os: "Windows",
        browser: "Chrome",
      },
    }),
  });
  const resVisit = await trackRoute(visitReq);
  assert.equal(resVisit.status, 200);
  const dataVisit = await resVisit.json();
  assert.equal(dataVisit.success, true);
});
