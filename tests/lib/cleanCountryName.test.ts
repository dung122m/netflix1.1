import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cleanCountryName } from "../../src/lib/stringUtils.js";

describe("cleanCountryName utility", () => {
  it("should strip flag emojis cleanly", () => {
    assert.equal(cleanCountryName("Trung Quốc 🇨🇳"), "Trung Quốc");
    assert.equal(cleanCountryName("Hồng Kông 🇭🇰"), "Hồng Kông");
    assert.equal(cleanCountryName("Việt Nam 🇻🇳"), "Việt Nam");
    assert.equal(cleanCountryName("Hàn Quốc 🇰🇷"), "Hàn Quốc");
    assert.equal(cleanCountryName("Mỹ 🇺🇸"), "Mỹ");
    assert.equal(cleanCountryName("Nhật Bản 🇯🇵"), "Nhật Bản");
  });

  it("should strip Windows fallback country code suffixes (CN, HK, VN, US...)", () => {
    assert.equal(cleanCountryName("Trung Quốc CN"), "Trung Quốc");
    assert.equal(cleanCountryName("Hồng Kông HK"), "Hồng Kông");
    assert.equal(cleanCountryName("Việt Nam VN"), "Việt Nam");
    assert.equal(cleanCountryName("Mỹ US"), "Mỹ");
    assert.equal(cleanCountryName("Hàn Quốc KR"), "Hàn Quốc");
  });

  it("should convert standalone 2-letter raw country codes", () => {
    assert.equal(cleanCountryName("CN"), "Trung Quốc");
    assert.equal(cleanCountryName("HK"), "Hồng Kông");
    assert.equal(cleanCountryName("VN"), "Việt Nam");
    assert.equal(cleanCountryName("US"), "Mỹ");
    assert.equal(cleanCountryName("KR"), "Hàn Quốc");
  });

  it("should handle null, undefined, empty, or whitespace safely", () => {
    assert.equal(cleanCountryName(""), "");
    assert.equal(cleanCountryName(null), "");
    assert.equal(cleanCountryName(undefined), "");
    assert.equal(cleanCountryName("   "), "");
  });
});
