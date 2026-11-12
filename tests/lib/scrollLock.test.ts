import test from "node:test";
import assert from "node:assert/strict";

test("scrollLock reference counting & style preservation", async (t) => {
  // Setup simulated DOM environment
  const originalDoc = globalThis.document;
  const originalWin = globalThis.window;

  const mockBody = {
    style: {
      overflow: "visible",
      overscrollBehavior: "auto",
    },
  };

  const mockHtml = {
    clientWidth: 1000,
    style: {
      overflow: "auto",
      overscrollBehavior: "auto",
    },
  };

  const mockDoc = {
    body: mockBody,
    documentElement: mockHtml,
  };

  const mockWin = {
    innerWidth: 1015, // 15px scrollbar
  };

  // @ts-expect-error test mock
  globalThis.document = mockDoc;
  // @ts-expect-error test mock
  globalThis.window = mockWin;

  // Import after globalThis setup
  const { lockBodyScroll, unlockBodyScroll, getScrollLockCount } = await import("@/lib/scrollLock");

  await t.test("Initial state", () => {
    assert.equal(getScrollLockCount(), 0);
  });

  await t.test("Modal 1 opens: locks html & body overflow + overscroll", () => {
    lockBodyScroll();
    assert.equal(getScrollLockCount(), 1);
    assert.equal(mockBody.style.overflow, "hidden");
    assert.equal(mockBody.style.overscrollBehavior, "none");
    assert.equal(mockHtml.style.overflow, "hidden");
    assert.equal(mockHtml.style.overscrollBehavior, "none");
  });

  await t.test("Modal 2 opens (Nested): lockCount increments to 2, still locked", () => {
    lockBodyScroll();
    assert.equal(getScrollLockCount(), 2);
    assert.equal(mockBody.style.overflow, "hidden");
    assert.equal(mockHtml.style.overflow, "hidden");
  });

  await t.test("Modal 2 closes: lockCount decrements to 1, body stays locked", () => {
    unlockBodyScroll();
    assert.equal(getScrollLockCount(), 1);
    assert.equal(mockBody.style.overflow, "hidden");
    assert.equal(mockHtml.style.overflow, "hidden");
  });

  await t.test("Modal 1 closes: lockCount decrements to 0, original styles restored", () => {
    unlockBodyScroll();
    assert.equal(getScrollLockCount(), 0);
    assert.equal(mockBody.style.overflow, "visible");
    assert.equal(mockBody.style.overscrollBehavior, "auto");
    assert.equal(mockHtml.style.overflow, "auto");
    assert.equal(mockHtml.style.overscrollBehavior, "auto");
  });

  // Teardown
  globalThis.document = originalDoc;
  globalThis.window = originalWin;
});
