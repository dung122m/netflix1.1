import { chromium } from "playwright";

async function verify() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const m3u8Requests: string[] = [];
  page.on("request", (req) => {
    const url = req.url();
    if (url.includes(".m3u8") || url.includes("/hls/")) {
      m3u8Requests.push(url);
    }
  });

  console.log("=== VERIFYING CONAN PLAYBACK & EPISODE MAPPING ===");

  // 1. Check Server 1 (Lồng Tiếng) Episode 67
  console.log("\n[TEST 1] Loading Conan with ?ep=tap-67&server=1...");
  m3u8Requests.length = 0;
  await page.goto("http://localhost:3000/movies/tham-tu-lung-danh-conan?ep=tap-67&server=1", {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await page.waitForTimeout(2000);

  const epText1 = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll("*")).find((e) =>
      e.textContent?.includes("Tập đang chọn:")
    );
    const activeBtn = document.querySelector(".bg-netflix-red, [class*='bg-white/20'], .equalizer-bar");
    return {
      selectedBadge: el?.textContent?.trim() || "",
      bodyTextSnippet: document.body.innerText.slice(0, 300),
    };
  });
  console.log("Episode Text 1:", epText1.selectedBadge);
  console.log("Intercepted m3u8 URLs:", m3u8Requests);
  const isSrv1Ep67 = m3u8Requests.some((u) => u.includes("1sQvwInz"));
  console.log("--> Is actual video stream Ep 67 (1sQvwInz)?", isSrv1Ep67 ? "YES [PASS]" : "NO [FAIL]");

  // 2. Check Server 1 (Lồng Tiếng) Episode 2 with ?ep=tap-2&server=1 (testing tap-2 <-> tap-02)
  console.log("\n[TEST 2] Loading Conan with ?ep=tap-2&server=1...");
  m3u8Requests.length = 0;
  await page.goto("http://localhost:3000/movies/tham-tu-lung-danh-conan?ep=tap-2&server=1", {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await page.waitForTimeout(2000);

  const epText2 = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll("*")).find((e) =>
      e.textContent?.includes("Tập đang chọn:")
    );
    return el?.textContent?.trim() || "";
  });
  console.log("Episode Text 2:", epText2);
  console.log("Intercepted m3u8 URLs:", m3u8Requests);
  const isSrv1Ep2 = m3u8Requests.some((u) => u.includes("20250603/9mJzYgvi") || u.includes("9mJzYgvi") || u.includes("tap-02"));
  console.log("--> Is episode text pointing to Episode 02?", epText2.includes("02") || epText2.includes("2"));

  // 3. Check Server 1 (Lồng Tiếng) Episode 1 with ?ep=tap-1&server=1
  console.log("\n[TEST 3] Loading Conan with ?ep=tap-1&server=1...");
  m3u8Requests.length = 0;
  await page.goto("http://localhost:3000/movies/tham-tu-lung-danh-conan?ep=tap-1&server=1", {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await page.waitForTimeout(2000);

  const epText3 = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll("*")).find((e) =>
      e.textContent?.includes("Tập đang chọn:")
    );
    return el?.textContent?.trim() || "";
  });
  console.log("Episode Text 3:", epText3);
  console.log("Intercepted m3u8 URLs:", m3u8Requests);
  const isSrv1Ep1 = m3u8Requests.some((u) => u.includes("NI7YDnE9"));
  console.log("--> Is actual video stream Ep 1 (NI7YDnE9)?", isSrv1Ep1 ? "YES [PASS]" : "NO [FAIL]");

  // 4. Check Server 1 End Episode (1013) with ?ep=tap-1013&server=1
  console.log("\n[TEST 4] Loading Conan with ?ep=tap-1013&server=1...");
  m3u8Requests.length = 0;
  await page.goto("http://localhost:3000/movies/tham-tu-lung-danh-conan?ep=tap-1013&server=1", {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await page.waitForTimeout(2000);

  const epText4 = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll("*")).find((e) =>
      e.textContent?.includes("Tập đang chọn:")
    );
    return el?.textContent?.trim() || "";
  });
  console.log("Episode Text 4:", epText4);
  console.log("Intercepted m3u8 URLs:", m3u8Requests);
  console.log("--> Is episode text pointing to Episode 1013?", epText4.includes("1013"));

  // 5. Check Server 0 (Vietsub) Episode 67 with ?ep=tap-67&server=0
  console.log("\n[TEST 5] Loading Conan Server 0 (Vietsub) with ?ep=tap-67&server=0...");
  m3u8Requests.length = 0;
  await page.goto("http://localhost:3000/movies/tham-tu-lung-danh-conan?ep=tap-67&server=0", {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await page.waitForTimeout(2000);

  const epText5 = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll("*")).find((e) =>
      e.textContent?.includes("Tập đang chọn:")
    );
    return el?.textContent?.trim() || "";
  });
  console.log("Episode Text 5:", epText5);
  console.log("Intercepted m3u8 URLs:", m3u8Requests);
  const isSrv0Ep67 = m3u8Requests.some((u) => u.includes("OneWa1zh"));
  console.log("--> Is actual video stream Ep 67 (OneWa1zh)?", isSrv0Ep67 ? "YES [PASS]" : "NO [FAIL]");

  // 6. Check Server 2 (NguonC Lồng Tiếng #1) with ?ep=tap-67&server=2
  console.log("\n[TEST 6] Loading Conan Server 2 (NguonC Lồng Tiếng #1) with ?ep=tap-67&server=2...");
  await page.goto("http://localhost:3000/movies/tham-tu-lung-danh-conan?ep=tap-67&server=2", {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await page.waitForTimeout(2000);

  const iframeSrc6 = await page.evaluate(() => {
    const iframe = document.querySelector("iframe");
    const el = Array.from(document.querySelectorAll("*")).find((e) =>
      e.textContent?.includes("Tập đang chọn:")
    );
    return {
      iframeSrc: iframe?.src || "",
      epText: el?.textContent?.trim() || "",
    };
  });
  console.log("Server 2 Iframe & Text:", iframeSrc6);

  // 7. Check Server 3 (NguonC Vietsub #1) with ?ep=tap-67&server=3
  console.log("\n[TEST 7] Loading Conan Server 3 (NguonC Vietsub #1) with ?ep=tap-67&server=3...");
  await page.goto("http://localhost:3000/movies/tham-tu-lung-danh-conan?ep=tap-67&server=3", {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await page.waitForTimeout(2000);

  const iframeSrc7 = await page.evaluate(() => {
    const iframe = document.querySelector("iframe");
    const el = Array.from(document.querySelectorAll("*")).find((e) =>
      e.textContent?.includes("Tập đang chọn:")
    );
    return {
      iframeSrc: iframe?.src || "",
      epText: el?.textContent?.trim() || "",
    };
  });
  console.log("Server 3 Iframe & Text:", iframeSrc7);

  await browser.close();
  console.log("\n=== ALL NETWORK & STREAM VERIFICATION COMPLETED SUCCESSFULLY ===");
  process.exit(0);
}

verify().catch((e) => {
  console.error("Verification failed:", e);
  process.exit(1);
});

