import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getGeoLocationFromIp,
  extractGeoLocationFromHeaders,
  isPrivateOrLocalIp,
  getCountryNameFromCode,
  EMPTY_GEO_LOCATION,
} from "./geoip";

describe("Server-Side GeoIP & Location Determination", () => {
  // Test 1 & 6: Vietnam Edge Headers
  it("should extract approximate location from Vercel edge headers (Vietnam)", async () => {
    const headers = new Headers({
      "x-vercel-ip-country": "VN",
      "x-vercel-ip-country-region": "HN",
      "x-vercel-ip-city": "Hanoi",
      "x-vercel-ip-timezone": "Asia/Ho_Chi_Minh",
    });

    const geo = extractGeoLocationFromHeaders(headers);
    assert.ok(geo);
    assert.equal(geo.countryCode, "VN");
    assert.equal(geo.country, "Vietnam");
    assert.equal(geo.region, "HN");
    assert.equal(geo.city, "Hanoi");
    assert.equal(geo.timezone, "Asia/Ho_Chi_Minh");
  });

  // Test 7: Foreign Edge Headers (US / California / Los Angeles)
  it("should extract approximate location from Vercel edge headers (United States)", async () => {
    const headers = new Headers({
      "x-vercel-ip-country": "US",
      "x-vercel-ip-country-region": "CA",
      "x-vercel-ip-city": "Los%20Angeles",
      "x-vercel-ip-timezone": "America/Los_Angeles",
    });

    const geo = extractGeoLocationFromHeaders(headers);
    assert.ok(geo);
    assert.equal(geo.countryCode, "US");
    assert.equal(geo.country, "United States");
    assert.equal(geo.region, "CA");
    assert.equal(geo.city, "Los Angeles");
    assert.equal(geo.timezone, "America/Los_Angeles");
  });

  // Test 4: Localhost & Private IPs
  it("should detect private and local IPs and return empty geo info without network calls", async () => {
    const privateIps = [
      "127.0.0.1",
      "::1",
      "localhost",
      "10.0.0.1",
      "192.168.1.100",
      "172.16.0.1",
      "169.254.1.1",
      "anonymous-client",
      "",
    ];

    for (const ip of privateIps) {
      assert.equal(isPrivateOrLocalIp(ip), true, `Failed for IP: ${ip}`);
      const geo = await getGeoLocationFromIp(ip);
      assert.deepEqual(geo, EMPTY_GEO_LOCATION, `Failed empty return for IP: ${ip}`);
    }
  });

  // Test 3: Invalid IP strings
  it("should return empty geo info for invalid IP strings", async () => {
    const invalidIps = ["not-an-ip", "999.999.999.999", "abc.def.ghi.jkl"];
    for (const ip of invalidIps) {
      const geo = await getGeoLocationFromIp(ip);
      assert.equal(typeof geo, "object");
      assert.equal(geo.country, null);
      assert.equal(geo.countryCode, null);
    }
  });

  // Test 5: Fallback Fail-Open Guarantee (Never throw on network errors)
  it("should never throw an exception and fail open with nulls on failure", async () => {
    try {
      // Non-routable bogus public IP
      const geo = await getGeoLocationFromIp("198.51.100.1");
      assert.equal(typeof geo, "object");
      assert.ok("country" in geo);
      assert.ok("countryCode" in geo);
      assert.ok("region" in geo);
      assert.ok("city" in geo);
      assert.ok("timezone" in geo);
    } catch (err) {
      assert.fail(`getGeoLocationFromIp threw an error: ${err}`);
    }
  });

  // Test 8: ISO Country Code to Name mapping
  it("should map ISO country codes accurately", () => {
    assert.equal(getCountryNameFromCode("VN"), "Vietnam");
    assert.equal(getCountryNameFromCode("US"), "United States");
    assert.equal(getCountryNameFromCode("JP"), "Japan");
    assert.equal(getCountryNameFromCode("KR"), "South Korea");
    assert.equal(getCountryNameFromCode("GB"), "United Kingdom");
    assert.equal(getCountryNameFromCode(null), null);
    assert.equal(getCountryNameFromCode("INVALID"), null);
  });

  // Test 9: Request-based resolution with Edge headers takes priority
  it("should prioritize edge headers when NextRequest is provided", async () => {
    const headers = new Headers({
      "x-vercel-ip-country": "JP",
      "x-vercel-ip-country-region": "13",
      "x-vercel-ip-city": "Tokyo",
      "x-vercel-ip-timezone": "Asia/Tokyo",
    });

    const geo = await getGeoLocationFromIp("1.2.3.4", headers);
    assert.equal(geo.countryCode, "JP");
    assert.equal(geo.country, "Japan");
    assert.equal(geo.city, "Tokyo");
    assert.equal(geo.timezone, "Asia/Tokyo");
  });
});
