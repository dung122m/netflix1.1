import { describe, it } from "node:test";
import assert from "node:assert";
import {
  HISTORICAL_IMAGE_CATALOG,
  PERIOD_IMAGE_CATALOG,
  getEventImage,
  getPeriodImage,
} from "./images";
import { HISTORICAL_PERIODS } from "./periods";
import { CURATED_NANAFLIX_MILESTONES } from "./curatedSeed";
import { FEATURED_HISTORICAL_EVENTS } from "./featuredHistory";
import allHistoryData from "./catalog/allHistory.json";

describe("Historical Image Integration Tests (Phase 4)", () => {
  it("Image Catalog Integrity: All entries have required fields, valid HTTPS URLs and attributions", () => {
    const entries = Object.values(HISTORICAL_IMAGE_CATALOG);
    assert.ok(entries.length >= 35, `Expected at least 35 entries, got ${entries.length}`);

    for (const entry of entries) {
      assert.ok(entry.eventId, "Entry must have an eventId");
      assert.ok(entry.imageUrl, "Entry must have an imageUrl");
      assert.ok(entry.imageUrl.startsWith("https://"), `Image URL must be HTTPS: ${entry.imageUrl}`);
      assert.ok(entry.imageCaption, "Entry must have an imageCaption");
      assert.ok(entry.imageSource, "Entry must have an imageSource");
      assert.ok(entry.referenceUrl, "Entry must have a referenceUrl");
    }
  });

  it("Period Images Integrity: All 11 periods have verified header visuals", () => {
    for (const period of HISTORICAL_PERIODS) {
      const periodImg = getPeriodImage(period.id);
      assert.ok(periodImg, `Period ${period.id} must have a visual image entry`);
      assert.ok(periodImg.imageUrl.startsWith("https://"), `Period image URL must be HTTPS`);
      assert.ok(periodImg.imageCaption, `Period image must have caption`);
      assert.ok(periodImg.imageSource, `Period image must have source credit`);
    }
  });

  it("getEventImage resolver: Matches by ID, exact dates, and handles missing gracefully", () => {
    // 1. Direct ID match
    const voNguyenGiap = getEventImage({ id: "hist-10-04-vo-nguyen-giap-2013" });
    assert.ok(voNguyenGiap, "Should resolve Đại tướng Võ Nguyên Giáp");
    assert.match(voNguyenGiap.imageCaption, /Võ Nguyên Giáp/);

    const anKheAxe = getEventImage({ id: "he-0001-0" });
    assert.ok(anKheAxe, "Should resolve Rìu tay An Khê");

    // 2. Exact date milestone match
    const independenceDay = getEventImage({
      id: "unknown-id",
      date: { day: 2, month: 9, year: 1945 },
    });
    assert.ok(independenceDay, "Should resolve Tuyên ngôn Độc lập by date");
    assert.ok(independenceDay.imageUrl.includes(".webp"), "Image should be a webp from repo");
    assert.ok(independenceDay.imageCaption, "Should have caption");

    const dienBienPhu = getEventImage({
      id: "unknown-id",
      date: { day: 7, month: 5, year: 1954 },
    });
    assert.ok(dienBienPhu, "Should resolve Điện Biên Phủ by date");

    const unificationDay = getEventImage({
      id: "unknown-id",
      date: { day: 30, month: 4, year: 1975 },
    });
    assert.ok(unificationDay, "Should resolve 30/04/1975 by date");

    // 3. Inline fields fallback
    const customEvent = getEventImage({
      id: "custom-1",
      imageUrl: "https://example.com/custom.jpg",
      imageCaption: "Custom photo",
      imageSource: "Custom Source",
    });
    assert.ok(customEvent);
    assert.strictEqual(customEvent.imageUrl, "https://example.com/custom.jpg");

    // 4. Missing image returns undefined without crashing
    const missing = getEventImage({ id: "non-existent-event-id" });
    assert.strictEqual(missing, undefined);
  });

  it("LOCKED DATASET INVARIANTS: allHistory, curatedSeed, and featuredHistory remain intact", () => {
    assert.strictEqual(allHistoryData.length, 3388, "allHistory.json must strictly contain 3,388 events");
    assert.strictEqual(CURATED_NANAFLIX_MILESTONES.length, 35, "curatedSeed.ts must strictly contain 35 events");
    assert.strictEqual(FEATURED_HISTORICAL_EVENTS.length, 265, "featuredHistory.ts must strictly contain 265 events");
  });
});
