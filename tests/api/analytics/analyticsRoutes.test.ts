import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST as trackRoute } from "@/app/api/analytics/track/route";

test("SECURITY TEST — TRACK ENDPOINT IS DISABLED FOR PERFORMANCE", async () => {
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
