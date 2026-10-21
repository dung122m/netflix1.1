import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatTime } from "./PlayerScrubBar";

describe("TC-SCRUB-PREVIEW-02: PlayerScrubBar UI Foundation & Clamping Calculations", () => {
  it("TC-01: formatTime handles various valid and invalid timestamps accurately", () => {
    assert.strictEqual(formatTime(0), "00:00");
    assert.strictEqual(formatTime(9), "00:09");
    assert.strictEqual(formatTime(59), "00:59");
    assert.strictEqual(formatTime(60), "01:00");
    assert.strictEqual(formatTime(65), "01:05");
    assert.strictEqual(formatTime(3599), "59:59");
    assert.strictEqual(formatTime(3600), "1:00:00");
    assert.strictEqual(formatTime(3665), "1:01:05");
    assert.strictEqual(formatTime(7200), "2:00:00");

    // Guard cases
    assert.strictEqual(formatTime(-1), "00:00");
    assert.strictEqual(formatTime(NaN), "00:00");
    assert.strictEqual(formatTime(Infinity), "00:00");
    assert.strictEqual(formatTime(-Infinity), "00:00");
  });

  it("TC-02: Preview Card boundary clamping prevents left and right viewport clipping", () => {
    const cardHalfWidth = 88;
    const safetyMargin = 6;
    const barWidth = 800;

    function computeClampedPosition(rawPos: number, width: number) {
      const minCenter = cardHalfWidth + safetyMargin;
      const maxCenter = width - cardHalfWidth - safetyMargin;
      return Math.max(minCenter, Math.min(maxCenter, rawPos));
    }

    // Extreme left edge (e.g. mouse at x = 0 or x = 10px)
    const leftClamped = computeClampedPosition(10, barWidth);
    assert.strictEqual(leftClamped, 94); // 88 + 6 = 94
    assert.ok(leftClamped - cardHalfWidth >= safetyMargin, "Left edge must not clip");

    // Extreme right edge (e.g. mouse at x = 795px)
    const rightClamped = computeClampedPosition(795, barWidth);
    assert.strictEqual(rightClamped, 706); // 800 - 88 - 6 = 706
    assert.ok(rightClamped + cardHalfWidth <= barWidth - safetyMargin, "Right edge must not clip");

    // Middle position (e.g. mouse at x = 400px)
    const midClamped = computeClampedPosition(400, barWidth);
    assert.strictEqual(midClamped, 400, "Middle position should track mouse exactly");

    // Arrow notch offset calculation
    const leftNotchOffset = 10 - leftClamped; // 10 - 94 = -84px (capped at -75px by UI clamp)
    assert.strictEqual(leftNotchOffset, -84);

    const midNotchOffset = 400 - midClamped; // 0px
    assert.strictEqual(midNotchOffset, 0);

    const rightNotchOffset = 795 - rightClamped; // 795 - 706 = +89px
    assert.strictEqual(rightNotchOffset, 89);
  });

  it("TC-03: Positional ratio maps cleanly to duration without jitter", () => {
    const duration = 1200; // 20 minutes
    const barWidth = 1000;

    function calculateHoverTime(clientX: number, left: number, width: number, dur: number) {
      if (width <= 0 || dur <= 0 || !isFinite(dur)) return null;
      const rawPos = Math.max(0, Math.min(width, clientX - left));
      const ratio = rawPos / width;
      return ratio * dur;
    }

    assert.strictEqual(calculateHoverTime(0, 0, barWidth, duration), 0);
    assert.strictEqual(calculateHoverTime(500, 0, barWidth, duration), 600);
    assert.strictEqual(calculateHoverTime(1000, 0, barWidth, duration), 1200);

    // Beyond boundaries should clamp between 0 and duration
    assert.strictEqual(calculateHoverTime(-50, 0, barWidth, duration), 0);
    assert.strictEqual(calculateHoverTime(1050, 0, barWidth, duration), 1200);

    // Invalid duration guards
    assert.strictEqual(calculateHoverTime(500, 0, barWidth, 0), null);
    assert.strictEqual(calculateHoverTime(500, 0, barWidth, -10), null);
    assert.strictEqual(calculateHoverTime(500, 0, barWidth, NaN), null);
  });
});
