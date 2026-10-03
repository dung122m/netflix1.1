import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getCurrentVietnamTimeSlot, getTonightMoodConfig } from "./dynamicHomeMoods";

describe("dynamicHomeMoods helper", () => {
  it("determines correct morning time slot (08:00 UTC+7)", () => {
    // 08:00 UTC+7 is 01:00 UTC
    const morningDate = new Date("2026-10-03T01:00:00Z");
    const { slot, hour } = getCurrentVietnamTimeSlot(morningDate);
    assert.equal(slot, "morning");
    assert.equal(hour, 8);

    const config = getTonightMoodConfig(morningDate);
    assert.equal(config.slot, "morning");
    assert.ok(config.title.length > 0);
    assert.ok(config.suggestedTags.length > 0);
  });

  it("determines correct afternoon time slot (14:00 UTC+7)", () => {
    // 14:00 UTC+7 is 07:00 UTC
    const afternoonDate = new Date("2026-10-03T07:00:00Z");
    const { slot, hour } = getCurrentVietnamTimeSlot(afternoonDate);
    assert.equal(slot, "afternoon");
    assert.equal(hour, 14);

    const config = getTonightMoodConfig(afternoonDate);
    assert.equal(config.slot, "afternoon");
    assert.ok(config.title.length > 0);
  });

  it("determines correct evening time slot (20:00 UTC+7)", () => {
    // 20:00 UTC+7 is 13:00 UTC
    const eveningDate = new Date("2026-10-03T13:00:00Z");
    const { slot, hour } = getCurrentVietnamTimeSlot(eveningDate);
    assert.equal(slot, "evening");
    assert.equal(hour, 20);

    const config = getTonightMoodConfig(eveningDate);
    assert.equal(config.slot, "evening");
    assert.ok(config.title.includes("Đêm Nay Nanaflix"));
  });

  it("determines correct latenight time slot (23:30 UTC+7)", () => {
    // 23:30 UTC+7 is 16:30 UTC
    const lateNightDate = new Date("2026-10-03T16:30:00Z");
    const { slot, hour } = getCurrentVietnamTimeSlot(lateNightDate);
    assert.equal(slot, "latenight");
    assert.equal(hour, 23);

    const config = getTonightMoodConfig(lateNightDate);
    assert.equal(config.slot, "latenight");
    assert.ok(config.title.includes("Đêm Khuya Nanaflix"));
  });

  it("produces deterministic result for same date (no random reload)", () => {
    const testDate = new Date("2026-10-03T14:15:00Z"); // 21:15 UTC+7
    const config1 = getTonightMoodConfig(testDate);
    const config2 = getTonightMoodConfig(testDate);
    assert.equal(config1.title, config2.title);
    assert.equal(config1.subtitle, config2.subtitle);
  });
});
