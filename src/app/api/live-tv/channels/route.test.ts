import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GET } from "./route";

describe("Live TV Channels API Endpoint", () => {
  it("GET /api/live-tv/channels returns 200 with status=true and channels array", async () => {
    const res = await GET();
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.status, true);
    assert.ok(json.data, "Payload data must exist");
    assert.ok(Array.isArray(json.data.channels), "channels must be an array");
    assert.ok(json.data.channels.length > 0, "channels array must not be empty");
    assert.ok(Array.isArray(json.data.categories), "categories must be an array");
    
    // Validate cache headers
    const cacheControl = res.headers.get("Cache-Control");
    assert.ok(cacheControl?.includes("s-maxage=120"), "Cache-Control must contain s-maxage=120");
  });
});

