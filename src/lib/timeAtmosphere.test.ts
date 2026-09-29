import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getCurrentTimePeriod,
  getMsUntilNextTimePeriod,
  TIME_PERIOD_CONFIGS,
} from "./timeAtmosphere";

describe("Nanaflix Everyday Atmosphere - Time States & Transitions", () => {
  it("should classify 05:00 to 09:59 as 'morning'", () => {
    // 05:00
    const d1 = new Date(2026, 8, 29, 5, 0, 0);
    assert.equal(getCurrentTimePeriod(d1), "morning");

    // 07:30
    const d2 = new Date(2026, 8, 29, 7, 30, 0);
    assert.equal(getCurrentTimePeriod(d2), "morning");

    // 09:59
    const d3 = new Date(2026, 8, 29, 9, 59, 59);
    assert.equal(getCurrentTimePeriod(d3), "morning");
  });

  it("should classify 10:00 to 16:59 as 'day'", () => {
    // 10:00
    const d1 = new Date(2026, 8, 29, 10, 0, 0);
    assert.equal(getCurrentTimePeriod(d1), "day");

    // 13:45
    const d2 = new Date(2026, 8, 29, 13, 45, 0);
    assert.equal(getCurrentTimePeriod(d2), "day");

    // 16:59
    const d3 = new Date(2026, 8, 29, 16, 59, 59);
    assert.equal(getCurrentTimePeriod(d3), "day");
  });

  it("should classify 17:00 to 19:59 as 'golden-hour'", () => {
    // 17:00
    const d1 = new Date(2026, 8, 29, 17, 0, 0);
    assert.equal(getCurrentTimePeriod(d1), "golden-hour");

    // 18:30
    const d2 = new Date(2026, 8, 29, 18, 30, 0);
    assert.equal(getCurrentTimePeriod(d2), "golden-hour");

    // 19:59
    const d3 = new Date(2026, 8, 29, 19, 59, 59);
    assert.equal(getCurrentTimePeriod(d3), "golden-hour");
  });

  it("should classify 20:00 to 04:59 as 'night'", () => {
    // 20:00
    const d1 = new Date(2026, 8, 29, 20, 0, 0);
    assert.equal(getCurrentTimePeriod(d1), "night");

    // 23:30
    const d2 = new Date(2026, 8, 29, 23, 30, 0);
    assert.equal(getCurrentTimePeriod(d2), "night");

    // 00:00
    const d3 = new Date(2026, 8, 29, 0, 0, 0);
    assert.equal(getCurrentTimePeriod(d3), "night");

    // 04:59
    const d4 = new Date(2026, 8, 29, 4, 59, 59);
    assert.equal(getCurrentTimePeriod(d4), "night");
  });

  it("should calculate positive ms until next transition boundary without polling", () => {
    const morningDate = new Date(2026, 8, 29, 8, 0, 0);
    const msToDay = getMsUntilNextTimePeriod(morningDate);
    // From 08:00 to 10:00 is 2 hours (7,200,000 ms) + 1000 buffer
    assert.ok(msToDay >= 7200000 && msToDay <= 7202000);

    const goldenHourDate = new Date(2026, 8, 29, 18, 0, 0);
    const msToNight = getMsUntilNextTimePeriod(goldenHourDate);
    // From 18:00 to 20:00 is 2 hours (7,200,000 ms) + 1000 buffer
    assert.ok(msToNight >= 7200000 && msToNight <= 7202000);

    const lateNightDate = new Date(2026, 8, 29, 22, 0, 0);
    const msToMorning = getMsUntilNextTimePeriod(lateNightDate);
    // From 22:00 to 05:00 next day is 7 hours (25,200,000 ms) + 1000 buffer
    assert.ok(msToMorning >= 25200000 && msToMorning <= 25202000);
  });

  it("should have valid theme configurations for all 4 periods", () => {
    const periods = ["morning", "day", "golden-hour", "night"] as const;
    for (const p of periods) {
      assert.ok(TIME_PERIOD_CONFIGS[p]);
      assert.ok(TIME_PERIOD_CONFIGS[p].label);
      assert.ok(TIME_PERIOD_CONFIGS[p].themeColor);
      assert.ok(TIME_PERIOD_CONFIGS[p].ambientHex);
    }
  });
});
