import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  generateStreamToken,
  verifyStreamToken,
  computeStreamId,
  computeStreamDirectory,
  STREAM_TOKEN_VERSION,
} from "./streamToken";

describe("Stream Token Security & Cryptographic Invariants", () => {
  const targetUrl = "https://cdn.example.com/live/match-123/chunk-001.ts";
  const now = 1700000000;

  test("1. Generates valid token and verifies successfully", () => {
    const generated = generateStreamToken({
      targetUrl,
      nowEpochSeconds: now,
      ttlSeconds: 120,
    });

    assert.equal(generated.v, STREAM_TOKEN_VERSION);
    assert.equal(generated.exp, now + 120);
    assert.equal(typeof generated.token, "string");
    assert.ok(generated.token.length > 20);

    const result = verifyStreamToken({
      token: generated.token,
      exp: generated.exp,
      sid: generated.sid,
      version: generated.v,
      targetUrl,
      nowEpochSeconds: now + 10, // 10s into playback
    });

    assert.equal(result.valid, true);
    assert.equal(result.status, "VALID");
    assert.equal(result.streamId, generated.sid);
  });

  test("2. Rejects token when signature is tampered (even by 1 bit)", () => {
    const generated = generateStreamToken({
      targetUrl,
      nowEpochSeconds: now,
    });

    const tamperedToken = generated.token.slice(0, -2) + (generated.token.endsWith("a") ? "b" : "a");

    const result = verifyStreamToken({
      token: tamperedToken,
      exp: generated.exp,
      sid: generated.sid,
      version: generated.v,
      targetUrl,
      nowEpochSeconds: now,
    });

    assert.equal(result.valid, false);
    assert.equal(result.status, "INVALID_SIGNATURE");
  });

  test("3. Rejects token when targetUrl is changed (cross-stream attack)", () => {
    const generated = generateStreamToken({
      targetUrl,
      nowEpochSeconds: now,
    });

    // Attacker uses token from match-123 on match-456
    const attackedUrl = "https://cdn.example.com/live/match-456/chunk-001.ts";

    const result = verifyStreamToken({
      token: generated.token,
      exp: generated.exp,
      sid: generated.sid,
      version: generated.v,
      targetUrl: attackedUrl,
      nowEpochSeconds: now,
    });

    assert.equal(result.valid, false);
    assert.equal(result.status, "STREAM_MISMATCH");
  });

  test("4. Rejects token when targetPath is changed within the same stream", () => {
    const generated = generateStreamToken({
      targetUrl,
      nowEpochSeconds: now,
    });

    // Attacker uses chunk-001's token to request chunk-002
    const chunk2Url = "https://cdn.example.com/live/match-123/chunk-002.ts";

    const result = verifyStreamToken({
      token: generated.token,
      exp: generated.exp,
      sid: generated.sid,
      version: generated.v,
      targetUrl: chunk2Url,
      nowEpochSeconds: now,
    });

    assert.equal(result.valid, false);
    assert.equal(result.status, "INVALID_SIGNATURE");
  });

  test("5. Identifies EXPIRED_GRACE when token expired within grace window (e.g. pause stream)", () => {
    const generated = generateStreamToken({
      targetUrl,
      nowEpochSeconds: now,
      ttlSeconds: 120, // Expire at now + 120
    });

    // User paused for 2.6 minutes (160s), current time = now + 160 (40s past expiration, beyond 30s clock skew)
    const result = verifyStreamToken({
      token: generated.token,
      exp: generated.exp,
      sid: generated.sid,
      version: generated.v,
      targetUrl,
      nowEpochSeconds: now + 160,
      graceWindowSeconds: 180,
    });

    assert.equal(result.valid, false);
    assert.equal(result.status, "EXPIRED_GRACE");
    assert.equal(result.streamId, generated.sid);
  });

  test("6. Identifies hard EXPIRED when past grace window", () => {
    const generated = generateStreamToken({
      targetUrl,
      nowEpochSeconds: now,
      ttlSeconds: 120,
    });

    // Current time is 10 minutes later (600s)
    const result = verifyStreamToken({
      token: generated.token,
      exp: generated.exp,
      sid: generated.sid,
      version: generated.v,
      targetUrl,
      nowEpochSeconds: now + 600,
      graceWindowSeconds: 180,
    });

    assert.equal(result.valid, false);
    assert.equal(result.status, "EXPIRED");
  });

  test("7. Tolerates clock skew up to 30 seconds", () => {
    const generated = generateStreamToken({
      targetUrl,
      nowEpochSeconds: now,
      ttlSeconds: 120,
    });

    // Client requests at now + 130 (10s after nominal exp, but within 30s clock skew)
    const result = verifyStreamToken({
      token: generated.token,
      exp: generated.exp,
      sid: generated.sid,
      version: generated.v,
      targetUrl,
      nowEpochSeconds: now + 130,
    });

    assert.equal(result.valid, true);
    assert.equal(result.status, "VALID");
  });

  test("8. StreamId correctly groups all files in the same directory", () => {
    const m3u8Url = "https://fptplay53.net/live/vtv3/index.m3u8";
    const chunkUrl = "https://fptplay53.net/live/vtv3/chunk-001.ts?h=abc";
    const initUrl = "https://fptplay53.net/live/vtv3/init.mp4";
    const keyUrl = "https://fptplay53.net/live/vtv3/enc.key";

    assert.equal(computeStreamDirectory(m3u8Url), "https://fptplay53.net/live/vtv3/");
    assert.equal(computeStreamDirectory(chunkUrl), "https://fptplay53.net/live/vtv3/");
    assert.equal(computeStreamDirectory(initUrl), "https://fptplay53.net/live/vtv3/");
    assert.equal(computeStreamDirectory(keyUrl), "https://fptplay53.net/live/vtv3/");

    const sid1 = computeStreamId(m3u8Url);
    const sid2 = computeStreamId(chunkUrl);
    const sid3 = computeStreamId(initUrl);
    const sid4 = computeStreamId(keyUrl);

    assert.equal(sid1, sid2);
    assert.equal(sid2, sid3);
    assert.equal(sid3, sid4);
  });

  describe("P1-B Canonical URL & Resource Binding Invariants", () => {
    const canonicalBaseUrl = "https://cdn.example.com/hls/football/match-789/seg-100.ts?token=upstream_token_123&quality=1080p";

    test("P1-B.1: Cùng URL: verify thành công", () => {
      const generated = generateStreamToken({ targetUrl: canonicalBaseUrl, nowEpochSeconds: now });
      const res = verifyStreamToken({
        token: generated.token,
        exp: generated.exp,
        sid: generated.sid,
        version: generated.v,
        targetUrl: canonicalBaseUrl,
        nowEpochSeconds: now,
      });
      assert.equal(res.valid, true);
      assert.equal(res.status, "VALID");
    });

    test("P1-B.2: Thay pathname: verify thất bại", () => {
      const generated = generateStreamToken({ targetUrl: canonicalBaseUrl, nowEpochSeconds: now });
      const modifiedUrl = "https://cdn.example.com/hls/football/match-789/seg-101.ts?token=upstream_token_123&quality=1080p";
      const res = verifyStreamToken({
        token: generated.token,
        exp: generated.exp,
        sid: generated.sid,
        version: generated.v,
        targetUrl: modifiedUrl,
        nowEpochSeconds: now,
      });
      assert.equal(res.valid, false);
      assert.equal(res.status, "INVALID_SIGNATURE");
    });

    test("P1-B.3: Thay query value: verify thất bại", () => {
      const generated = generateStreamToken({ targetUrl: canonicalBaseUrl, nowEpochSeconds: now });
      const modifiedUrl = "https://cdn.example.com/hls/football/match-789/seg-100.ts?token=hacked_token_999&quality=1080p";
      const res = verifyStreamToken({
        token: generated.token,
        exp: generated.exp,
        sid: generated.sid,
        version: generated.v,
        targetUrl: modifiedUrl,
        nowEpochSeconds: now,
      });
      assert.equal(res.valid, false);
      assert.equal(res.status, "INVALID_SIGNATURE");
    });

    test("P1-B.4: Thêm query parameter: verify thất bại", () => {
      const generated = generateStreamToken({ targetUrl: canonicalBaseUrl, nowEpochSeconds: now });
      const modifiedUrl = "https://cdn.example.com/hls/football/match-789/seg-100.ts?token=upstream_token_123&quality=1080p&extra=evil";
      const res = verifyStreamToken({
        token: generated.token,
        exp: generated.exp,
        sid: generated.sid,
        version: generated.v,
        targetUrl: modifiedUrl,
        nowEpochSeconds: now,
      });
      assert.equal(res.valid, false);
      assert.equal(res.status, "INVALID_SIGNATURE");
    });

    test("P1-B.5: Thay hostname: verify thất bại", () => {
      const generated = generateStreamToken({ targetUrl: canonicalBaseUrl, nowEpochSeconds: now });
      const modifiedUrl = "https://cdn-attacker.example.com/hls/football/match-789/seg-100.ts?token=upstream_token_123&quality=1080p";
      const res = verifyStreamToken({
        token: generated.token,
        exp: generated.exp,
        sid: generated.sid,
        version: generated.v,
        targetUrl: modifiedUrl,
        nowEpochSeconds: now,
      });
      assert.equal(res.valid, false);
      assert.equal(res.status, "STREAM_MISMATCH");
    });

    test("P1-B.6: Thay scheme hoặc port: verify thất bại", () => {
      const generated = generateStreamToken({ targetUrl: canonicalBaseUrl, nowEpochSeconds: now });
      const modifiedScheme = "http://cdn.example.com/hls/football/match-789/seg-100.ts?token=upstream_token_123&quality=1080p";
      const resScheme = verifyStreamToken({
        token: generated.token,
        exp: generated.exp,
        sid: generated.sid,
        version: generated.v,
        targetUrl: modifiedScheme,
        nowEpochSeconds: now,
      });
      assert.equal(resScheme.valid, false);
      assert.equal(resScheme.status, "STREAM_MISMATCH");

      const urlWithPort = "https://cdn.example.com:8443/hls/football/match-789/seg-100.ts?token=upstream_token_123&quality=1080p";
      const generatedPort = generateStreamToken({ targetUrl: urlWithPort, nowEpochSeconds: now });
      const modifiedPort = "https://cdn.example.com:8080/hls/football/match-789/seg-100.ts?token=upstream_token_123&quality=1080p";
      const resPort = verifyStreamToken({
        token: generatedPort.token,
        exp: generatedPort.exp,
        sid: generatedPort.sid,
        version: generatedPort.v,
        targetUrl: modifiedPort,
        nowEpochSeconds: now,
      });
      assert.equal(resPort.valid, false);
      assert.equal(resPort.status, "STREAM_MISMATCH");
    });

    test("P1-B.7: Query chứa ký tự đặc biệt, encoding và token upstream: ký/xác minh nhất quán", () => {
      const specialUrl = "https://cdn.example.com/stream/segment.ts?auth=abc%2Bxyz%2F123%3D%3D&user=john%20doe&sym=%26%23";
      const generated = generateStreamToken({ targetUrl: specialUrl, nowEpochSeconds: now });
      const res = verifyStreamToken({
        token: generated.token,
        exp: generated.exp,
        sid: generated.sid,
        version: generated.v,
        targetUrl: specialUrl,
        nowEpochSeconds: now,
      });
      assert.equal(res.valid, true);
      assert.equal(res.status, "VALID");
    });

    test("P1-B.8: Query parameter có thứ tự khác: từ chối theo chính sách Exact Query String Preservation", () => {
      const urlOrder1 = "https://cdn.example.com/stream/seg.ts?a=1&b=2";
      const urlOrder2 = "https://cdn.example.com/stream/seg.ts?b=2&a=1";

      const generated = generateStreamToken({ targetUrl: urlOrder1, nowEpochSeconds: now });
      const res = verifyStreamToken({
        token: generated.token,
        exp: generated.exp,
        sid: generated.sid,
        version: generated.v,
        targetUrl: urlOrder2,
        nowEpochSeconds: now,
      });
      assert.equal(res.valid, false);
      assert.equal(res.status, "INVALID_SIGNATURE");
    });
  });
});
