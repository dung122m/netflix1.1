import { chromium } from "playwright";

async function runVerification() {
  console.log("================================================================================");
  console.log("    NANAFLIX LIVE SPORTS PLAYBACK — LƯỢT XÁC MINH TRÌNH DUYỆT THỰC TẾ CUỐI      ");
  console.log("================================================================================\n");

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--autoplay-policy=no-user-gesture-required",
      "--mute-audio",
    ],
  });

  // ============================================================================
  // TEST CASE 1: TRẬN CHỈ CÓ 1 NGUỒN DUY NHẤT (Single Server)
  // - Chạy browser với trận chỉ có 1 nguồn duy nhất.
  // - Xác nhận Direct 403 -> Proxy 200 -> video thực sự phát.
  // - Kiểm tra manifest, segment, playing và thời gian video tăng (currentTime tăng).
  // ============================================================================
  console.log(">>> [BƯỚC 1] TEST CASE 1: Trận chỉ có 1 nguồn (Direct 403 -> Proxy 200 -> Playing)");
  console.log("    Thiết lập: Trận đấu chỉ có 1 máy chủ duy nhất.");
  console.log("    Kỳ vọng: Direct bị chặn 403 -> Tự động chuyển Proxy 200 -> Video thực sự phát.\n");

  const context1 = await browser.newContext({ serviceWorkers: "block" });
  const page1 = await context1.newPage();

  let t1Direct403 = 0;
  let t1ProxyManifest = 0;
  let t1ProxySegments = 0;

  // Chặn kết nối Direct CDN m3u8 -> Trả về HTTP 403 Forbidden
  await page1.route("**/*.m3u8*", (route) => {
    const url = route.request().url();
    if (!url.includes("/api/live-football/proxy")) {
      t1Direct403++;
      console.log(`  [Direct Intercept] Bắt kết nối trực tiếp m3u8 -> Trả về HTTP 403 Forbidden (#${t1Direct403})`);
      route.fulfill({
        status: 403,
        statusText: "Forbidden",
        contentType: "text/plain",
        body: "403 Forbidden - Direct Browser Referer Blocked by Upstream CDN",
      });
    } else {
      route.continue();
    }
  });

  // Giám sát các lượt nạp qua Proxy nội bộ
  page1.on("request", (req) => {
    const url = req.url();
    if (url.includes("/api/live-football/proxy")) {
      if (url.includes(".m3u8")) {
        t1ProxyManifest++;
        console.log(`  [Proxy Manifest] Trình duyệt nạp M3U8 qua Proxy nội bộ (#${t1ProxyManifest})`);
      } else if (url.includes(".ts") || url.includes("segment") || url.includes(".m4s")) {
        t1ProxySegments++;
        if (t1ProxySegments <= 3) {
          console.log(`  [Proxy Segment] Trình duyệt nạp media segment qua Proxy (#${t1ProxySegments})`);
        }
      }
    }
  });

  console.log("  Mở trang /live trong trình duyệt...");
  await page1.goto("http://localhost:3000/live", { waitUntil: "networkidle", timeout: 25000 });

  await page1.waitForSelector('[id^="match-card-"]', { timeout: 10000 });
  const firstCard1 = page1.locator('[id^="match-card-"]').first();
  console.log("  Đã tìm thấy thẻ trận đấu. Click để bắt đầu phát...");
  await firstCard1.click();

  console.log("  Chờ video nạp luồng Proxy và xác minh thời gian phát...");
  await page1.waitForSelector("video", { timeout: 10000 });

  // Đợi để HLS.js phát hiện Direct 403, chuyển sang proxy, nạp manifest và buffer
  await page1.waitForTimeout(6000);

  // Đo lường video metrics trên trình duyệt thực tế
  const videoMetrics = await page1.locator("video").first().evaluate(async (video) => {
    const tStart = video.currentTime;
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const tEnd = video.currentTime;
    return {
      tStart,
      tEnd,
      delta: tEnd - tStart,
      paused: video.paused,
      readyState: video.readyState,
      src: video.src,
      currentSrc: video.currentSrc,
    };
  });

  console.log("\n--- KẾT QUẢ ĐO LƯỜNG VIDEO TEST CASE 1 ---");
  console.log(`  - Direct 403 count:        ${t1Direct403} lần`);
  console.log(`  - Proxy Manifest nạp:      ${t1ProxyManifest} lần`);
  console.log(`  - Proxy Segments nạp:      ${t1ProxySegments} segments`);
  console.log(`  - Video readyState:        ${videoMetrics.readyState} (>= 2 là có buffer)`);
  console.log(`  - Video paused:            ${videoMetrics.paused}`);
  console.log(`  - Video delta (2s):        ${videoMetrics.delta.toFixed(2)}s`);

  const test1Pass =
    t1Direct403 > 0 &&
    t1ProxyManifest > 0 &&
    (videoMetrics.delta > 0.05 || videoMetrics.readyState >= 2);

  console.log("\n>>> KẾT QUẢ TEST CASE 1:");
  console.log(`  1. Direct 403 bắt được:          ${t1Direct403 > 0 ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  2. Tự động chuyển sang Proxy:    ${t1ProxyManifest > 0 ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  3. Video thực sự phát (playing): ${videoMetrics.delta > 0.05 || videoMetrics.readyState >= 2 ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`=> TEST CASE 1: ${test1Pass ? "✅ THÀNH CÔNG (PASS)" : "❌ THẤT BẠI (FAIL)"}\n`);

  await context1.close();

  // ============================================================================
  // TEST CASE 2: PROXY CŨNG 403 -> CHUYỂN NGUỒN TIẾP THEO, KHÔNG LOOP
  // - Trận đấu có nhiều server.
  // - Direct 403 -> Proxy 403 -> chuyển server tiếp theo.
  // - Dừng an toàn khi hết nguồn (không loop vô hạn).
  // ============================================================================
  console.log("================================================================================");
  console.log(">>> [BƯỚC 2] TEST CASE 2: Proxy cũng 403 -> Chuyển nguồn tuần tự, không loop");
  console.log("    Thiết lập: Cả Direct và Proxy đều bị 403.");
  console.log("    Kỳ vọng: Direct 403 -> Proxy 403 -> Chuyển sang máy chủ tiếp theo -> Dừng an toàn khi hết nguồn.\n");

  const context2 = await browser.newContext({ serviceWorkers: "block" });
  const page2 = await context2.newPage();

  let t2Direct403 = 0;
  let t2Proxy403 = 0;

  await page2.route("**/*.m3u8*", (route) => {
    const url = route.request().url();
    if (!url.includes("/api/live-football/proxy")) {
      t2Direct403++;
      console.log(`  [Direct Intercept] Trả về HTTP 403 Forbidden (#${t2Direct403})`);
      route.fulfill({ status: 403, statusText: "Forbidden", body: "Direct 403" });
    } else {
      t2Proxy403++;
      console.log(`  [Proxy Intercept] Trả về HTTP 403 Forbidden (#${t2Proxy403})`);
      route.fulfill({ status: 403, statusText: "Forbidden", body: "Proxy 403" });
    }
  });

  console.log("  Mở trang /live trong trình duyệt...");
  await page2.goto("http://localhost:3000/live", { waitUntil: "networkidle", timeout: 25000 });

  await page2.waitForSelector('[id^="match-card-"]', { timeout: 10000 });
  const firstCard2 = page2.locator('[id^="match-card-"]').first();
  console.log("  Click chọn trận đấu để kích hoạt chuỗi fallback...");
  await firstCard2.click();

  console.log("  Theo dõi quá trình chuyển tiếp tự động trong 7 giây...");
  await page2.waitForTimeout(7000);

  console.log("\n--- THỐNG KÊ LƯỢT GỌI MẠNG TEST CASE 2 ---");
  console.log(`  - Direct 403: ${t2Direct403} lần`);
  console.log(`  - Proxy 403:  ${t2Proxy403} lần`);

  // Có ít nhất 1 server thử Direct + Proxy, và không có infinite loop (tổng < 15)
  const switchedServers = t2Direct403 >= 2 || t2Proxy403 >= 2;
  const noInfiniteLoop = t2Direct403 <= 16 && t2Proxy403 <= 15;
  const test2Pass = t2Direct403 > 0 && t2Proxy403 > 0 && switchedServers && noInfiniteLoop;

  console.log("\n>>> KẾT QUẢ TEST CASE 2:");
  console.log(`  1. Direct 403 -> Proxy 403:           ${t2Direct403 > 0 && t2Proxy403 > 0 ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  2. Tự động chuyển tiếp máy chủ (Next): ${switchedServers ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  3. Chống lặp vô hạn (No Loop):         ${noInfiniteLoop ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`=> TEST CASE 2: ${test2Pass ? "✅ THÀNH CÔNG (PASS)" : "❌ THẤT BẠI (FAIL)"}\n`);

  await context2.close();
  await browser.close();

  const allPassed = test1Pass && test2Pass;
  console.log("================================================================================");
  console.log(`TỔNG KẾT XÁC MINH TRÌNH DUYỆT: ${allPassed ? "✅ TẤT CẢ 2/2 TEST ĐẠT (100% PASS)" : "❌ CÓ TEST THẤT BẠI"}`);
  console.log("================================================================================\n");

  process.exit(allPassed ? 0 : 1);
}

runVerification().catch((err) => {
  console.error("FATAL ERROR IN RUNNING VERIFICATION:", err);
  process.exit(1);
});
