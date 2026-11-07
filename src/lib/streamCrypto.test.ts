import { test, describe, it } from "node:test";
import assert from "node:assert/strict";
import { encodeStreamUrl, decodeStreamUrl } from "./streamCrypto";

describe("Nanaflix Stream Crypto - Obfuscation & Security", () => {
  it("1. encodeStreamUrl hides source domains with nf_enc_ prefix", () => {
    const rawPhimApi = "https://s1.phimapi.com/20240101/conan/index.m3u8";
    const encoded = encodeStreamUrl(rawPhimApi);

    assert.ok(encoded.startsWith("nf_enc_"), "Must start with nf_enc_ prefix");
    assert.equal(encoded.includes("phimapi.com"), false, "Must NOT contain phimapi.com");
    assert.equal(encoded.includes(".m3u8"), false, "Must NOT contain .m3u8 in plaintext");
  });

  it("2. decodeStreamUrl correctly recovers the original URL byte-for-byte", () => {
    const testCases = [
      "https://s1.phimapi.com/20240101/conan/index.m3u8",
      "https://phim.nguonc.com/embed/ainu-mosir",
      "https://vip.opstream16.com/20221104/vua-mao-hiem/index.m3u8?token=12345&sig=abcdef",
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    ];

    for (const url of testCases) {
      const encoded = encodeStreamUrl(url);
      const decoded = decodeStreamUrl(encoded);
      assert.equal(decoded, url, `Decoded URL must match original for: ${url}`);
    }
  });

  it("3. Backward compatibility: decodeStreamUrl passes plain URLs through untouched", () => {
    const rawPlainUrl = "https://www.youtube.com/embed/dQw4w9WgXcQ";
    const decoded = decodeStreamUrl(rawPlainUrl);
    assert.equal(decoded, rawPlainUrl, "Plain URL must pass through untouched");
  });

  it("4. Idempotency: re-encoding an already encoded token returns the same token", () => {
    const raw = "https://s1.phimapi.com/test.m3u8";
    const encoded1 = encodeStreamUrl(raw);
    const encoded2 = encodeStreamUrl(encoded1);
    assert.equal(encoded2, encoded1, "Re-encoding should be idempotent");
  });

  it("5. Handles empty, null, undefined and invalid inputs safely without throwing", () => {
    assert.equal(encodeStreamUrl(""), "");
    assert.equal(encodeStreamUrl(null), "");
    assert.equal(encodeStreamUrl(undefined), "");

    assert.equal(decodeStreamUrl(""), "");
    assert.equal(decodeStreamUrl(null), "");
    assert.equal(decodeStreamUrl(undefined), "");
    assert.equal(decodeStreamUrl("nf_enc_invalid_base64_???"), "nf_enc_invalid_base64_???");
  });
});

