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

test("SECURITY TEST 2 — TRACK ENDPOINT IS DISABLED FOR PERFORMANCE", async () => {
  const req = new NextRequest("http://localhost:3000/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventType: "site_visit" }),
  });
  const res = await trackRoute(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.tracking, "disabled");
});
