import { chromium } from "playwright";

async function run() {
  console.log("Launching browser for comprehensive Conan episode verification...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  // Test 1: Load Conan with ?ep=tap-67&server=1 (Server 1: PhimAPI Lồng Tiếng)
  console.log("\n--- TEST 1: Load ?ep=tap-67&server=1 ---");
  await page.goto("http://localhost:3000/movies/tham-tu-lung-danh-conan?ep=tap-67&server=1", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(3000);

  // Check active server and active episode text
  const state1 = await page.evaluate(() => {
    const serverButtons = Array.from(document.querySelectorAll("button, a")).filter((el) =>
      /Lồng Tiếng|Vietsub/i.test(el.textContent || "")
    );
    const activeEpBadge = document.querySelector('[class*="bg-emerald-400"]')?.parentElement?.textContent || "";
    const video = document.querySelector("video");
    const iframe = document.querySelector("iframe");
    return {
      title: document.title,
      activeEpBadge,
      videoSrc: video?.src || "",
      iframeSrc: iframe?.src || "",
      currentUrl: window.location.href,
    };
  });
  console.log("State 1:", JSON.stringify(state1, null, 2));

  // Verify stream is Ep 67, not Ep 1
  const isEp67Stream =
    state1.videoSrc.includes("1sQvwInz") ||
    state1.videoSrc.includes("DE8vXmXC") ||
    state1.activeEpBadge.includes("67");
  console.log("Is Ep 67 correctly loaded?", isEp67Stream ? "YES [PASS]" : "NO [FAIL]");

  // Test 2: Select Episode 2 on Server 1 (?ep=tap-2&server=1)
  console.log("\n--- TEST 2: Navigate to ?ep=tap-2&server=1 (testing tap-2 <-> tap-02) ---");
  await page.goto("http://localhost:3000/movies/tham-tu-lung-danh-conan?ep=tap-2&server=1", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(3000);

  const state2 = await page.evaluate(() => {
    const activeEpBadge = document.querySelector('[class*="bg-emerald-400"]')?.parentElement?.textContent || "";
    const video = document.querySelector("video");
    return {
      activeEpBadge,
      videoSrc: video?.src || "",
      currentUrl: window.location.href,
    };
  });
  console.log("State 2:", JSON.stringify(state2, null, 2));
  const isEp2Loaded = state2.activeEpBadge.includes("02") || state2.activeEpBadge.includes("2");
  console.log("Is Ep 2 correctly loaded (not Ep 1)?", isEp2Loaded ? "YES [PASS]" : "NO [FAIL]");

  // Test 3: Select Episode 1 on Server 1 (?ep=tap-1&server=1)
  console.log("\n--- TEST 3: Navigate to ?ep=tap-1&server=1 ---");
  await page.goto("http://localhost:3000/movies/tham-tu-lung-danh-conan?ep=tap-1&server=1", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(3000);

  const state3 = await page.evaluate(() => {
    const activeEpBadge = document.querySelector('[class*="bg-emerald-400"]')?.parentElement?.textContent || "";
    const video = document.querySelector("video");
    return {
      activeEpBadge,
      videoSrc: video?.src || "",
      currentUrl: window.location.href,
    };
  });
  console.log("State 3:", JSON.stringify(state3, null, 2));

  // Test 4: End episode on Server 1 (?ep=tap-1013&server=1)
  console.log("\n--- TEST 4: Navigate to ?ep=tap-1013&server=1 (End Episode) ---");
  await page.goto("http://localhost:3000/movies/tham-tu-lung-danh-conan?ep=tap-1013&server=1", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(3000);

  const state4 = await page.evaluate(() => {
    const activeEpBadge = document.querySelector('[class*="bg-emerald-400"]')?.parentElement?.textContent || "";
    const video = document.querySelector("video");
    return {
      activeEpBadge,
      videoSrc: video?.src || "",
      currentUrl: window.location.href,
    };
  });
  console.log("State 4:", JSON.stringify(state4, null, 2));
  const isEndEpLoaded = state4.activeEpBadge.includes("1013");
  console.log("Is End Ep (1013) loaded?", isEndEpLoaded ? "YES [PASS]" : "NO [FAIL]");

  // Test 5: Server 0 (PhimAPI Vietsub) with Ep 67 (?ep=tap-67&server=0)
  console.log("\n--- TEST 5: Server 0 (Vietsub) ?ep=tap-67&server=0 ---");
  await page.goto("http://localhost:3000/movies/tham-tu-lung-danh-conan?ep=tap-67&server=0", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(3000);

  const state5 = await page.evaluate(() => {
    const activeEpBadge = document.querySelector('[class*="bg-emerald-400"]')?.parentElement?.textContent || "";
    const video = document.querySelector("video");
    return {
      activeEpBadge,
      videoSrc: video?.src || "",
      currentUrl: window.location.href,
    };
  });
  console.log("State 5:", JSON.stringify(state5, null, 2));
  console.log("Is Server 0 Ep 67 loaded?", state5.activeEpBadge.includes("67") ? "YES [PASS]" : "NO [FAIL]");

  // Test 6: Server 2 (NguonC Lồng Tiếng #1) with Ep 67 (?ep=tap-67&server=2)
  console.log("\n--- TEST 6: Server 2 (NguonC Lồng Tiếng #1) ?ep=tap-67&server=2 ---");
  await page.goto("http://localhost:3000/movies/tham-tu-lung-danh-conan?ep=tap-67&server=2", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(3000);

  const state6 = await page.evaluate(() => {
    const activeEpBadge = document.querySelector('[class*="bg-emerald-400"]')?.parentElement?.textContent || "";
    const iframe = document.querySelector("iframe");
    return {
      activeEpBadge,
      iframeSrc: iframe?.src || "",
      currentUrl: window.location.href,
    };
  });
  console.log("State 6:", JSON.stringify(state6, null, 2));
  console.log("Is Server 2 Ep 67 loaded?", state6.activeEpBadge.includes("67") ? "YES [PASS]" : "NO [FAIL]");

  // Test 7: Server 3 (NguonC Vietsub #1) with Ep 67 (?ep=tap-67&server=3)
  console.log("\n--- TEST 7: Server 3 (NguonC Vietsub #1) ?ep=tap-67&server=3 ---");
  await page.goto("http://localhost:3000/movies/tham-tu-lung-danh-conan?ep=tap-67&server=3", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(3000);

  const state7 = await page.evaluate(() => {
    const activeEpBadge = document.querySelector('[class*="bg-emerald-400"]')?.parentElement?.textContent || "";
    const iframe = document.querySelector("iframe");
    return {
      activeEpBadge,
      iframeSrc: iframe?.src || "",
      currentUrl: window.location.href,
    };
  });
  console.log("State 7:", JSON.stringify(state7, null, 2));
  console.log("Is Server 3 Ep 67 loaded?", state7.activeEpBadge.includes("67") ? "YES [PASS]" : "NO [FAIL]");

  // Test 8: Switching server while on Ep 67 in UI
  console.log("\n--- TEST 8: Switch Server in UI while on Ep 67 ---");
  await page.goto("http://localhost:3000/movies/tham-tu-lung-danh-conan?ep=tap-67&server=1", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(2000);

  // Click on Server 2 (Lồng Tiếng #1)
  const serverSwitched = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const srv2Btn = buttons.find((b) => /Lồng Tiếng #1/i.test(b.textContent || ""));
    if (srv2Btn) {
      srv2Btn.click();
      return true;
    }
    return false;
  });
  console.log("Clicked Server 2 button:", serverSwitched);
  await page.waitForTimeout(2000);

  const state8 = await page.evaluate(() => {
    const activeEpBadge = document.querySelector('[class*="bg-emerald-400"]')?.parentElement?.textContent || "";
    const iframe = document.querySelector("iframe");
    return {
      activeEpBadge,
      iframeSrc: iframe?.src || "",
      currentUrl: window.location.href,
    };
  });
  console.log("State 8 (After Switch):", JSON.stringify(state8, null, 2));
  const preservedEp67 = state8.activeEpBadge.includes("67") && state8.currentUrl.includes("server=2");
  console.log("Is Ep 67 preserved on Server 2 after switch?", preservedEp67 ? "YES [PASS]" : "NO [FAIL]");

  // Test 9: Browser Back button
  console.log("\n--- TEST 9: Browser Back Button ---");
  await page.goBack();
  await page.waitForTimeout(2000);
  const state9 = await page.evaluate(() => {
    const activeEpBadge = document.querySelector('[class*="bg-emerald-400"]')?.parentElement?.textContent || "";
    return {
      activeEpBadge,
      currentUrl: window.location.href,
    };
  });
  console.log("State 9 (After Back):", JSON.stringify(state9, null, 2));

  await browser.close();
  console.log("\n=== ALL PLAYWRIGHT BROWSER CHECKS COMPLETED ===");
  process.exit(0);
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

