import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getGeoLocationFromIp,
  extractGeoLocationFromHeaders,
  isPrivateOrLocalIp,
  getCountryNameFromCode,
  getVietnamProvinceAbbreviation,
  getRegionalBadge,
  EMPTY_GEO_LOCATION,
} from "./geoip";
import { getClientIp } from "./security";

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

  // Test 10: Vietnamese province abbreviations (HCM, HN, BD, HT, DN, etc.)
  it("should map Vietnamese province and city names to concise 2-3 letter badges", () => {
    assert.equal(getVietnamProvinceAbbreviation("Ho Chi Minh City"), "HCM");
    assert.equal(getVietnamProvinceAbbreviation("TP. Hồ Chí Minh"), "HCM");
    assert.equal(getVietnamProvinceAbbreviation("Sài Gòn"), "HCM");
    assert.equal(getVietnamProvinceAbbreviation("Hanoi"), "HN");
    assert.equal(getVietnamProvinceAbbreviation("Hà Nội"), "HN");
    assert.equal(getVietnamProvinceAbbreviation("Bình Dương"), "BD");
    assert.equal(getVietnamProvinceAbbreviation("Hà Tĩnh"), "HT");
    assert.equal(getVietnamProvinceAbbreviation("Đà Nẵng"), "DN");
    assert.equal(getVietnamProvinceAbbreviation("Hải Phòng"), "HP");
    assert.equal(getVietnamProvinceAbbreviation("Cần Thơ"), "CT");
    assert.equal(getVietnamProvinceAbbreviation("Nghệ An"), "NA");
    assert.equal(getVietnamProvinceAbbreviation("Unknown Province"), null);
    assert.equal(getVietnamProvinceAbbreviation(null), null);
  });

  // Test 11: getRegionalBadge overall logic for domestic and international users
  it("should generate appropriate regional badges for logo", () => {
    // Domestic with city
    assert.equal(
      getRegionalBadge({ country: "Vietnam", countryCode: "VN", city: "Ho Chi Minh City", region: "SG", timezone: null }),
      "HCM",
    );
    assert.equal(
      getRegionalBadge({ country: "Vietnam", countryCode: "VN", city: "Hanoi", region: "HN", timezone: null }),
      "HN",
    );
    assert.equal(
      getRegionalBadge({ country: "Vietnam", countryCode: "VN", city: "Binh Duong", region: "BD", timezone: null }),
      "BD",
    );
    assert.equal(
      getRegionalBadge({ country: "Vietnam", countryCode: "VN", city: "Ha Tinh", region: "HT", timezone: null }),
      "HT",
    );
    // Domestic without city/province
    assert.equal(
      getRegionalBadge({ country: "Vietnam", countryCode: "VN", city: null, region: null, timezone: null }),
      "VN",
    );
    // International users (US, JP, KR, SG, AU, UK, FR, etc.)
    assert.equal(
      getRegionalBadge({ country: "United States", countryCode: "US", city: "Los Angeles", region: "CA", timezone: null }),
      "US",
    );
    assert.equal(
      getRegionalBadge({ country: "Japan", countryCode: "JP", city: "Tokyo", region: "13", timezone: null }),
      "JP",
    );
    assert.equal(
      getRegionalBadge({ country: "United Kingdom", countryCode: "GB", city: "London", region: null, timezone: null }),
      "UK",
    );
  });

  // Test 12: getClientIp header prioritization & IP normalization
  it("should extract client IP accurately according to CDN/Proxy priority", () => {
    // 1. Cloudflare cf-connecting-ip has highest priority
    const headersCf = new Headers({
      "cf-connecting-ip": "113.161.72.10",
      "x-forwarded-for": "198.51.100.2, 198.51.100.3",
      "x-real-ip": "198.51.100.4",
    });
    assert.equal(getClientIp(headersCf), "113.161.72.10");

    // 2. Vercel forwarded for
    const headersVercel = new Headers({
      "x-vercel-forwarded-for": "14.232.180.25, 76.76.21.21",
      "x-forwarded-for": "76.76.21.21",
    });
    assert.equal(getClientIp(headersVercel), "14.232.180.25");

    // 3. Port stripping
    const headersPort = new Headers({
      "x-forwarded-for": "27.72.60.10:45678, 10.0.0.1",
    });
    assert.equal(getClientIp(headersPort), "27.72.60.10");

    // 4. IPv4-mapped IPv6 cleanup
    const headersIpv6 = new Headers({
      "x-real-ip": "::ffff:118.69.182.5",
    });
    assert.equal(getClientIp(headersIpv6), "118.69.182.5");
  });
});
