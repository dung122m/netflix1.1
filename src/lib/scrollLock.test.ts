import test from "node:test";
import assert from "node:assert/strict";

test("scrollLock reference counting & style preservation", async (t) => {
  // Setup simulated DOM environment
  const originalDoc = globalThis.document;
  const originalWin = globalThis.window;

  const mockBody = {
    style: {
      overflow: "visible",
      paddingRight: "0px",
    },
  };

  const mockDoc = {
    body: mockBody,
    documentElement: {
      clientWidth: 1000,
    },
  };

  const mockWin = {
    innerWidth: 1015, // 15px scrollbar
  };

  // @ts-expect-error test mock
  globalThis.document = mockDoc;
  // @ts-expect-error test mock
  globalThis.window = mockWin;

  // Import after globalThis setup
  const { lockBodyScroll, unlockBodyScroll, getScrollLockCount } = await import("./scrollLock");

  await t.test("Initial state", () => {
    assert.equal(getScrollLockCount(), 0);
  });

  await t.test("Modal 1 opens: locks body and adds scrollbar padding", () => {
    lockBodyScroll();
    assert.equal(getScrollLockCount(), 1);
    assert.equal(mockBody.style.overflow, "hidden");
    assert.equal(mockBody.style.paddingRight, "15px");
  });

  await t.test("Modal 2 opens (Nested): lockCount increments to 2, still locked", () => {
    lockBodyScroll();
    assert.equal(getScrollLockCount(), 2);
    assert.equal(mockBody.style.overflow, "hidden");
    assert.equal(mockBody.style.paddingRight, "15px");
  });

  await t.test("Modal 2 closes: lockCount decrements to 1, body stays locked", () => {
    unlockBodyScroll();
    assert.equal(getScrollLockCount(), 1);
    assert.equal(mockBody.style.overflow, "hidden");
    assert.equal(mockBody.style.paddingRight, "15px");
  });

  await t.test("Modal 1 closes: lockCount decrements to 0, body original styles restored", () => {
    unlockBodyScroll();
    assert.equal(getScrollLockCount(), 0);
    assert.equal(mockBody.style.overflow, "visible");
    assert.equal(mockBody.style.paddingRight, "0px");
  });

  // Teardown
  globalThis.document = originalDoc;
  globalThis.window = originalWin;
});
