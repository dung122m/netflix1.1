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
      "--mute-audio"
    ]
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

  const context1 = await browser.newContext({
    serviceWorkers: "block" // Ngăn Service Worker chặn / làm sai lệch route matching
  });
  const page1 = await context1.newPage();

  let t1Direct403 = 0;
  let t1ProxyManifest = 0;
  let t1ProxySegments = 0;

  // Intercept matches API để cô lập trận đấu chỉ có đúng 1 server duy nhất
  await page1.route(/\/api\/live-football\/matches/, async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    const matches = json.data?.matches || [];
    
    const djokovic = matches.find(m => m.id.includes("novakdjokovic") || m.id.includes("vacherot"));
    if (djokovic) {
      djokovic.servers = [djokovic.servers[0]]; // Chỉ giữ 1 máy chủ duy nhất!
      console.log(`  [Data Intercept] Đã cô lập trận "${djokovic.title}" chỉ còn 1 server duy nhất: ${djokovic.servers[0].name}`);
    }

    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(json)
    });
  });

  // Chặn kết nối Direct CDN của Server 1 -> Trả về HTTP 403 Forbidden
  await page1.route(/pzhgifbkllliv\.vcdn\.cloud/, (route) => {
    const url = route.request().url();
    // Chỉ chặn Direct request, không chặn khi đi qua proxy
    if (!url.includes("/api/live-football/proxy")) {
      t1Direct403++;
      console.log(`  [Direct Intercept] Bắt kết nối trực tiếp CDN -> Trả về HTTP 403 Forbidden (#${t1Direct403})`);
      route.fulfill({
        status: 403,
        statusText: "Forbidden",
        contentType: "text/plain",
        body: "403 Forbidden - Direct Browser Referer Blocked by Upstream CDN"
      });
      return;
    }
    route.continue();
  });

  // Giám sát các lượt nạp qua Proxy nội bộ
  page1.on("request", (req) => {
    const url = req.url();
    if (url.includes("/api/live-football/proxy")) {
      if (url.includes(".m3u8")) {
        t1ProxyManifest++;
        console.log(`  [Proxy Manifest] Trình duyệt nạp M3U8 qua Proxy nội bộ (#${t1ProxyManifest})`);
      } else if (url.includes(".ts") || url.includes("segment")) {
        t1ProxySegments++;
        if (t1ProxySegments <= 3) {
          console.log(`  [Proxy Segment] Trình duyệt nạp media segment qua Proxy (#${t1ProxySegments})`);
        }
      }
    }
  });

  console.log("  Mở trang /live trong trình duyệt...");
  await page1.goto("http://localhost:3000/live", { waitUntil: "networkidle", timeout: 25000 });

  const cardSelector = "#match-card-tennis_senior_men_novakdjokovic_valentinevacherot_19300311";
  await page1.waitForSelector(cardSelector, { timeout: 10000 });
  console.log("  Đã tìm thấy thẻ trận đấu. Click để bắt đầu phát...");
  await page1.click(cardSelector);

  console.log("  Chờ video nạp luồng Proxy và xác minh thời gian phát...");
  // Chờ video element xuất hiện
  await page1.waitForSelector("video", { timeout: 10000 });

  // Đợi để HLS.js chuyển sang proxy, nạp manifest và nạp các segments
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
      currentSrc: video.currentSrc
    };
  });

  console.log("\n--- THỐNG KÊ CHI TIẾT TEST CASE 1 TRÊN TRÌNH DUYỆT ---");
  console.log(`  - Số lần bắt Direct 403:         ${t1Direct403} lần`);
  console.log(`  - Số lần gọi Proxy Manifest:     ${t1ProxyManifest} lần`);
  console.log(`  - Số video segments tải qua Proxy: ${t1ProxySegments} segments`);
  console.log(`  - Trạng thái Video Paused:        ${videoMetrics.paused ? "YES (Bị dừng)" : "NO (Đang phát mượt mà)"}`);
  console.log(`  - Trạng thái ReadyState:          ${videoMetrics.readyState} (>= 3: Đủ dữ liệu phát)`);
  console.log(`  - Thời gian video tăng (Delta):   ${videoMetrics.tStart.toFixed(2)}s -> ${videoMetrics.tEnd.toFixed(2)}s (+${videoMetrics.delta.toFixed(2)}s)`);

  const test1Pass =
    t1Direct403 > 0 &&
    t1ProxyManifest > 0 &&
    t1ProxySegments > 0 &&
    !videoMetrics.paused &&
    videoMetrics.readyState >= 3 &&
    videoMetrics.delta > 0.5;

  console.log(`\n>>> KẾT QUẢ TEST CASE 1: ${test1Pass ? "✅ THÀNH CÔNG (PASS)" : "❌ THẤT BẠI (FAIL)"}\n`);

  await context1.close();

  // ============================================================================
  // TEST CASE 2: PROXY CŨNG 403 -> CHUYỂN NGUỒN TIẾP THEO, KHÔNG LOOP
  // - Trận đấu có 3 máy chủ (Server 1, Server 2, Server 3).
  // - Server 1: Direct 403 -> Proxy 403.
  // - Chuyển sang Server 2: Direct 403 -> Proxy 403.
  // - Chuyển sang Server 3: Direct 403 -> Proxy 403.
  // - Dừng an toàn khi hết nguồn (không loop vô hạn).
  // ============================================================================
  console.log("================================================================================");
  console.log(">>> [BƯỚC 2] TEST CASE 2: Proxy cũng 403 -> Chuyển nguồn tuần tự, không loop");
  console.log("    Thiết lập: Trận đấu có 3 máy chủ; cả Direct và Proxy của cả 3 đều bị 403.");
  console.log("    Kỳ vọng: S1 Direct 403 -> S1 Proxy 403 -> S2 Direct 403 -> S2 Proxy 403 -> S3 Direct 403 -> S3 Proxy 403 -> Dừng an toàn, không loop.\n");

  const context2 = await browser.newContext({
    serviceWorkers: "block"
  });
  const page2 = await context2.newPage();

  let s1Direct = 0, s1Proxy = 0;
  let s2Direct = 0, s2Proxy = 0;
  let s3Direct = 0, s3Proxy = 0;

  // Server 1 (vcdn.cloud): Direct 403
  await page2.route(/pzhgifbkllliv\.vcdn\.cloud/, (route) => {
    if (!route.request().url().includes("/api/live-football/proxy")) {
      s1Direct++;
      console.log(`  [Server 1 Direct] Trả về 403 Forbidden (#${s1Direct})`);
      route.fulfill({ status: 403, body: "S1 Direct 403" });
      return;
    }
    route.continue();
  });

  // Server 2 (live2.jorvakstreamcache.com): Direct 403
  await page2.route(/live2\.jorvakstreamcache\.com/, (route) => {
    if (!route.request().url().includes("/api/live-football/proxy")) {
      s2Direct++;
      console.log(`  [Server 2 Direct] Trả về 403 Forbidden (#${s2Direct})`);
      route.fulfill({ status: 403, body: "S2 Direct 403" });
      return;
    }
    route.continue();
  });

  // Server 3 (live2.domaincdn.cc): Direct 403
  await page2.route(/live2\.domaincdn\.cc/, (route) => {
    if (!route.request().url().includes("/api/live-football/proxy")) {
      s3Direct++;
      console.log(`  [Server 3 Direct] Trả về 403 Forbidden (#${s3Direct})`);
      route.fulfill({ status: 403, body: "S3 Direct 403" });
      return;
    }
    route.continue();
  });

  // Proxy route: Bắt cả 3 máy chủ khi fallback sang Proxy -> Trả về HTTP 403 Forbidden
  await page2.route(/\/api\/live-football\/proxy/, (route) => {
    const rawUrl = route.request().url();
    if (rawUrl.includes("vcdn.cloud")) {
      s1Proxy++;
      console.log(`  [Server 1 Proxy Fallback] Trả về 403 Forbidden (#${s1Proxy})`);
      route.fulfill({ status: 403, body: "S1 Proxy 403" });
    } else if (rawUrl.includes("jorvakstreamcache")) {
      s2Proxy++;
      console.log(`  [Server 2 Proxy Fallback] Trả về 403 Forbidden (#${s2Proxy})`);
      route.fulfill({ status: 403, body: "S2 Proxy 403" });
    } else if (rawUrl.includes("domaincdn")) {
      s3Proxy++;
      console.log(`  [Server 3 Proxy Fallback] Trả về 403 Forbidden (#${s3Proxy})`);
      route.fulfill({ status: 403, body: "S3 Proxy 403" });
    } else {
      route.continue();
    }
  });

  console.log("  Mở trang /live trong trình duyệt...");
  await page2.goto("http://localhost:3000/live", { waitUntil: "networkidle", timeout: 25000 });

  await page2.waitForSelector(cardSelector, { timeout: 10000 });
  console.log("  Click chọn trận đấu để kích hoạt chuỗi fallback 3 server...");
  await page2.click(cardSelector);

  console.log("  Theo dõi quá trình chuyển tiếp tự động trong 7 giây...");
  await page2.waitForTimeout(7000);

  console.log("\n--- THỐNG KÊ LƯỢT GỌI MẠNG TEST CASE 2 ---");
  console.log(`  - Server #1: Direct = ${s1Direct} lần, Proxy = ${s1Proxy} lần`);
  console.log(`  - Server #2: Direct = ${s2Direct} lần, Proxy = ${s2Proxy} lần`);
  console.log(`  - Server #3: Direct = ${s3Direct} lần, Proxy = ${s3Proxy} lần`);

  const switchedToS2 = s2Direct > 0 || s2Proxy > 0;
  const switchedToS3 = s3Direct > 0 || s3Proxy > 0;
  const noInfiniteLoop =
    s1Direct <= 3 && s1Proxy <= 3 &&
    s2Direct <= 3 && s2Proxy <= 3 &&
    s3Direct <= 3 && s3Proxy <= 3;

  const test2Pass = s1Direct > 0 && s1Proxy > 0 && switchedToS2 && switchedToS3 && noInfiniteLoop;

  console.log("\n>>> KẾT QUẢ TEST CASE 2:");
  console.log(`  1. Server 1 Direct 403 -> Proxy 403:   ${s1Direct > 0 && s1Proxy > 0 ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  2. Tự động chuyển tiếp sang Server 2: ${switchedToS2 ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  3. Tự động chuyển tiếp sang Server 3: ${switchedToS3 ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  4. Chống lặp vô hạn (No Loop):        ${noInfiniteLoop ? "✅ PASS" : "❌ FAIL"}`);
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
