import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { isSafePublicMediaSegment } from "@/lib/live/proxySegmentCache";

describe("Live proxy segment CDN cache allowlist", () => {
  const segmentUrl = "https://cdn.example.com/hls/live/chunk-100.ts";
  const mediaRes = new Response(new Uint8Array([0x47, 0x40, 0x00]), {
    headers: { "Content-Type": "video/mp2t" },
  });

  it("allows CDN caching when request only carries benign Nanaflix UI/visit cookies", () => {
    const req = new NextRequest(
      `http://localhost/api/live-tv/proxy?url=${encodeURIComponent(segmentUrl)}`,
      {
        headers: {
          cookie:
            "nanaflix_anon_id=anon_12345; nanaflix_has_visited=v1; nanaflix_theme=netflix-red",
        },
      },
    );
    assert.strictEqual(
      isSafePublicMediaSegment(req, segmentUrl, "video/mp2t", mediaRes),
      true,
    );
  });

  it("rejects CDN caching when any non-allowlisted or session cookie is present", () => {
    const req = new NextRequest(
      `http://localhost/api/live-tv/proxy?url=${encodeURIComponent(segmentUrl)}`,
      {
        headers: {
          cookie: "nanaflix_anon_id=anon_12345; session_id=secret_abc",
        },
      },
    );
    assert.strictEqual(
      isSafePublicMediaSegment(req, segmentUrl, "video/mp2t", mediaRes),
      false,
    );
  });

  it("still rejects authorization headers and DRM keys", () => {
    const authReq = new NextRequest(
      `http://localhost/api/live-tv/proxy?url=${encodeURIComponent(segmentUrl)}`,
      { headers: { authorization: "Bearer token" } },
    );
    assert.strictEqual(
      isSafePublicMediaSegment(authReq, segmentUrl, "video/mp2t", mediaRes),
      false,
    );

    const cleanReq = new NextRequest(
      "http://localhost/api/live-tv/proxy?url=https://cdn.example.com/hls/enc.key",
    );
    assert.strictEqual(
      isSafePublicMediaSegment(
        cleanReq,
        "https://cdn.example.com/hls/enc.key",
        "application/octet-stream",
        mediaRes,
      ),
      false,
    );
  });
});

