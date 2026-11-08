import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveClientGeo } from "./geoIpResolver";

describe("GeoIP Resolver Accuracy Tests", () => {
  it("resolves user IP 123.25.217.202 accurately to Thuận An (Bình Dương)", async () => {
    const headers = new Headers({
      "cf-ipcountry": "VN",
      "cf-connecting-ip": "123.25.217.202",
    });

    const res = await resolveClientGeo(headers);
    assert.equal(res.countryCode, "VN");
    assert.equal(res.country, "Việt Nam");
    assert.equal(res.city, "Thuận An (Bình Dương)");
  });

  it("normalizes Ho Chi Minh City to TP. Hồ Chí Minh", async () => {
    const headers = new Headers({
      "cf-ipcountry": "VN",
      "cf-ipcity": "Ho Chi Minh City",
      "cf-connecting-ip": "1.55.12.1",
    });

    const res = await resolveClientGeo(headers);
    assert.equal(res.city, "TP. Hồ Chí Minh");
  });
});

