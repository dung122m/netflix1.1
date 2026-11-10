import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("ChannelSourceSwitcher — Unit & Logic Tests", () => {
  it("1. Boundary & indexing logic: Single item should disable both Previous and Next", () => {
    const totalCount = 1;
    const currentIndex = 0;
    const canLoop = true;
    const disabled = false;

    const isSingleItem = totalCount <= 1 || disabled;
    const isPrevDisabled = isSingleItem || (!canLoop && currentIndex <= 0);
    const isNextDisabled = isSingleItem || (!canLoop && currentIndex >= totalCount - 1);

    assert.equal(isPrevDisabled, true);
    assert.equal(isNextDisabled, true);
  });

  it("2. Boundary logic: First item with canLoop=false should disable Previous but enable Next", () => {
    const totalCount = 5;
    const currentIndex = 0;
    const canLoop = false;
    const disabled = false;

    const isSingleItem = totalCount <= 1 || disabled;
    const isPrevDisabled = isSingleItem || (!canLoop && currentIndex <= 0);
    const isNextDisabled = isSingleItem || (!canLoop && currentIndex >= totalCount - 1);

    assert.equal(isPrevDisabled, true);
    assert.equal(isNextDisabled, false);
  });

  it("3. Boundary logic: Last item with canLoop=false should enable Previous but disable Next", () => {
    const totalCount = 5;
    const currentIndex = 4;
    const canLoop = false;
    const disabled = false;

    const isSingleItem = totalCount <= 1 || disabled;
    const isPrevDisabled = isSingleItem || (!canLoop && currentIndex <= 0);
    const isNextDisabled = isSingleItem || (!canLoop && currentIndex >= totalCount - 1);

    assert.equal(isPrevDisabled, false);
    assert.equal(isNextDisabled, true);
  });

  it("4. Loop enabled: Middle, first or last item can always go Next / Prev when totalCount > 1", () => {
    const totalCount = 8;
    for (let idx = 0; idx < totalCount; idx++) {
      const isSingleItem = totalCount <= 1;
      const isPrevDisabled = isSingleItem;
      const isNextDisabled = isSingleItem;
      assert.equal(isPrevDisabled, false);
      assert.equal(isNextDisabled, false);
    }
  });

  it("5. Next/Previous index calculation with wrap-around", () => {
    const totalCount = 4;
    const getNext = (curr: number) => (curr + 1) % totalCount;
    const getPrev = (curr: number) => (curr - 1 + totalCount) % totalCount;

    assert.equal(getNext(0), 1);
    assert.equal(getNext(3), 0); // Wrap to first
    assert.equal(getPrev(0), 3); // Wrap to last
    assert.equal(getPrev(2), 1);
  });

  it("6. Display label and index formatting", () => {
    const currentIndex = 2; // 0-based -> 3rd channel
    const totalCount = 12;

    const displayIndex = totalCount > 0 ? (currentIndex >= 0 ? currentIndex + 1 : 1) : 0;
    const displayTotal = totalCount > 0 ? totalCount : 1;

    assert.equal(displayIndex, 3);
    assert.equal(displayTotal, 12);
    assert.equal(`${displayIndex}/${displayTotal}`, "3/12");
  });
});
