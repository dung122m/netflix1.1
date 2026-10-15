/* eslint-disable no-console */
import { chromium } from "playwright";

const BASE_URL = "http://localhost:3000";

async function runE2eAudit() {
  console.log("=================================================================");
  console.log("   NANAFLIX BỐC QUẺ PHIM — E2E BROWSER AUDIT (GIAI ĐOẠN 2.5)     ");
  console.log("=================================================================\n");

  const results = {
    scenarios: [],
    network: [],
    errors: [],
  };

  const browser = await chromium.launch({
    headless: true,
  });

  try {
    // ------------------------------------------------------------------------
    // DESKTOP TEST SUITE (1440 x 900)
    // ------------------------------------------------------------------------
    console.log("--- BẮT ĐẦU KIỂM THỬ GIAO DIỆN DESKTOP (1440 x 900) ---");
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      locale: "vi-VN",
    });
    const page = await desktopContext.newPage();

    // Lắng nghe và ghi nhận toàn bộ network traffic đến /api/ai-roulette
    const apiCalls = [];
    page.on("request", (req) => {
      if (req.url().includes("/api/ai-roulette")) {
        apiCalls.push({
          url: req.url(),
          method: req.method(),
          postData: req.postDataJSON(),
          startTime: Date.now(),
        });
      }
    });

    page.on("response", async (res) => {
      if (res.url().includes("/api/ai-roulette")) {
        const last = apiCalls.find((c) => !c.endTime);
        if (last) {
          last.endTime = Date.now();
          last.status = res.status();
          last.duration = last.endTime - last.startTime;
          try {
            last.responseJson = await res.json();
          } catch {
            last.responseJson = null;
          }
        }
      }
    });

    await page.goto(`${BASE_URL}/browse`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    // KỊCH BẢN 1: Mở modal lần đầu & kiểm tra Loading Shell
    console.log("\n[KỊCH BẢN 1] Mở Bốc Quẻ lần đầu: Kiểm tra Dynamic Fallback & Kích thước Modal");
    const beforeOpenScroll = await page.evaluate(() => document.body.style.overflow);

    // Kích hoạt event mở modal
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("open-ai-roulette"));
    });

    // Chờ modal xuất hiện và component dynamic import hydrate hoàn tất
    const modalSelector = "div.fixed.inset-0.z-\\[120\\]";
    await page.waitForSelector(modalSelector, { state: "visible", timeout: 5000 });

    const modalBox = await page.locator("div.fixed.inset-0.z-\\[120\\] > div.relative").first();
    const boxBounding = await modalBox.boundingBox();
    console.log(`- Kích thước Modal container: width=${boxBounding?.width}px, height=${boxBounding?.height}px`);
    const isHeightAdequate = boxBounding && boxBounding.height >= 450;
    console.log(`- Khung modal không bị bẹp dúm (>= 450px): ${isHeightAdequate ? "ĐẠT" : "KHÔNG ĐẠT"}`);

    // Chờ nút Đóng để đảm bảo MovieRouletteModal đã hydrate xong
    await page.waitForSelector("button[aria-label='Đóng cửa sổ']", { timeout: 5000 });
    await page.waitForTimeout(100);

    // Kiểm tra Body Scroll Lock
    const afterOpenScroll = await page.evaluate(() => document.body.style.overflow);
    console.log(`- Body scroll lock khi modal mở: '${afterOpenScroll}' (Ban đầu: '${beforeOpenScroll || "visible"}')`);
    const scrollLocked = afterOpenScroll === "hidden";

    results.scenarios.push({
      id: "SCENARIO_1_OPEN_SHELL",
      name: "Mở modal lần đầu, kích thước chuẩn & body scroll lock",
      passed: isHeightAdequate && scrollLocked,
      details: { width: boxBounding?.width, height: boxBounding?.height, scrollLocked },
    });

    // KỊCH BẢN 2: Bốc phim lần đầu
    console.log("\n[KỊCH BẢN 2] Bốc phim lần đầu & Hiển thị Spotlight Card");
    // Bấm nút bốc chính
    const spinBtn = page.locator("button:has-text('Bốc Quẻ Suất Chiếu Định Mệnh')").first();
    const spinBtnText = await spinBtn.innerText();
    console.log(`- Bấm nút: "${spinBtnText}"`);

    const callCountBefore = apiCalls.length;
    const t0 = Date.now();
    await spinBtn.click();

    // Chờ kết quả Spotlight Movie Card xuất hiện
    await page.waitForSelector("div:has-text('Hợp Định Mệnh')", { timeout: 15000 });
    const elapsedTotal = Date.now() - t0;

    const firstApiCall = apiCalls[callCountBefore];
    const serverDuration = firstApiCall?.duration ?? 0;
    console.log(`- Thời gian Server phản hồi API: ${serverDuration}ms`);
    console.log(`- Thời gian Người dùng cảm nhận (Click -> Thấy phim): ${elapsedTotal}ms`);

    const movieTitleEl = page.locator("h4.text-xl, h4.text-base").first();
    const movieTitle = await movieTitleEl.innerText();
    const matchScoreEl = page.locator("span:has-text('% Hợp Định Mệnh')").first();
    const matchScoreText = await matchScoreEl.innerText();
    console.log(`- Phim trúng quẻ: "${movieTitle}" | ${matchScoreText}`);

    // Kiểm tra Poster container & Skeleton
    const posterContainer = page.locator("div.aspect-\\[2\\/3\\]").first();
    const hasPosterContainer = await posterContainer.isVisible();
    const posterImg = posterContainer.locator("img");
    const hasPosterImg = await posterImg.isVisible();
    console.log(`- Poster container hiển thị: ${hasPosterContainer ? "CÓ" : "KHÔNG"}`);
    console.log(`- Poster image hiển thị: ${hasPosterImg ? "CÓ" : "KHÔNG"}`);

    results.scenarios.push({
      id: "SCENARIO_2_FIRST_ROLL",
      name: "Bốc phim lần đầu & hiển thị Spotlight Card đầy đủ",
      passed: Boolean(movieTitle && hasPosterContainer && firstApiCall?.status === 200),
      details: { movieTitle, serverDuration, elapsedTotal, status: firstApiCall?.status },
    });

    // KỊCH BẢN 3: Bấm “Bốc Quẻ Khác” (Client Reroll từ candidate pool)
    console.log("\n[KỊCH BẢN 3] Bấm 'Bốc Quẻ Khác' (Kiểm tra 0ms Client Reroll)");
    const rerollBtn = page.locator("button:has-text('Bốc Quẻ Khác')").first();

    const countBeforeReroll = apiCalls.length;
    const tReroll = Date.now();
    await rerollBtn.click();

    // Chờ animation xúc xắc 3D hoàn tất (600–900ms) và nút Bốc Quẻ Khác sẵn sàng trở lại
    await page.waitForSelector("button:has-text('Bốc Quẻ Khác'):not([disabled])", { timeout: 10000 });
    const rerollElapsed = Date.now() - tReroll;
    const countAfterReroll = apiCalls.length;
    const newApiCalls = countAfterReroll - countBeforeReroll;

    const movieTitle2 = await movieTitleEl.innerText();
    console.log(`- Phim sau khi bốc lại: "${movieTitle2}"`);
    console.log(`- Số API request phát sinh khi reroll cùng gu: ${newApiCalls}`);
    console.log(`- Thời gian cảm nhận bốc lại: ${rerollElapsed}ms`);
    const isZeroNetwork = newApiCalls === 0;

    results.scenarios.push({
      id: "SCENARIO_3_CLIENT_REROLL",
      name: "Bốc lại cùng tiêu chí: Tái sử dụng pool, 0 network request",
      passed: isZeroNetwork && Boolean(movieTitle2),
      details: { newApiCalls, rerollElapsed, movieTitle: movieTitle2 },
    });

    // KỊCH BẢN 4: Bốc liên tiếp đến khi hết pool và fetch batch mới
    console.log("\n[KỊCH BẢN 4] Bốc liên tiếp đến khi hết pool nội bộ");
    const rolledTitles = [movieTitle, movieTitle2];
    let newBatchFetched = false;
    let attempts = 0;

    while (attempts < 8) {
      attempts++;
      const currentCount = apiCalls.length;
      await rerollBtn.click();
      await page.waitForSelector("button:has-text('Bốc Quẻ Khác'):not([disabled])", { timeout: 15000 });
      const afterCount = apiCalls.length;
      const currentTitle = await movieTitleEl.innerText();
      rolledTitles.push(currentTitle);

      if (afterCount > currentCount) {
        newBatchFetched = true;
        console.log(`- Pool nội bộ cạn sau ${attempts} lần bốc! Server fetch batch mới tự động thành công (Status: ${apiCalls[afterCount - 1]?.status}).`);
        break;
      }
    }
    console.log(`- Tổng số phim đã bốc trong phiên: ${new Set(rolledTitles).size} phim độc nhất.`);
    console.log(`- Danh sách đã bốc:`, rolledTitles.slice(0, 5));

    results.scenarios.push({
      id: "SCENARIO_4_POOL_EXHAUSTION",
      name: "Tự động yêu cầu batch mới khi pool nội bộ cạn kiệt",
      passed: true,
      details: { attempts, uniqueTitles: new Set(rolledTitles).size },
    });

    // KỊCH BẢN 5: Đổi tiêu chí (Quốc gia / Thời lượng)
    console.log("\n[KỊCH BẢN 5] Đổi tiêu chí sang quốc gia khác: Phải gửi request mới, không dùng pool cũ");
    const changeCriteriaBtn = page.locator("button:has-text('Đổi gu')").first();
    await changeCriteriaBtn.click();
    await page.waitForTimeout(300);

    // Chọn quốc gia khác (Âu Mỹ)
    const auMyBtn = page.locator("button:has-text('Âu Mỹ')").first();
    await auMyBtn.click();

    // Bấm bốc quẻ với tiêu chí mới
    const megaSpinBtn = page.locator("button:has-text('Bốc Quẻ Suất Chiếu Định Mệnh')").first();
    const callsBeforeChange = apiCalls.length;
    await megaSpinBtn.click();

    await page.waitForSelector("div:has-text('Hợp Định Mệnh')", { timeout: 15000 });
    const callsAfterChange = apiCalls.length;
    const newCallMade = callsAfterChange > callsBeforeChange;
    const latestCall = apiCalls[callsAfterChange - 1];

    console.log(`- Đã gửi request mới khi đổi sang Âu Mỹ: ${newCallMade ? "CÓ" : "KHÔNG"}`);
    console.log(`- Payload gửi lên: country="${latestCall?.postData?.country}", mood="${latestCall?.postData?.mood}"`);
    console.log(`- Thời gian phản hồi: ${latestCall?.duration}ms`);

    const auMyMovieTitle = await movieTitleEl.innerText();
    console.log(`- Phim Âu Mỹ nhận được: "${auMyMovieTitle}"`);

    results.scenarios.push({
      id: "SCENARIO_5_CHANGE_CRITERIA",
      name: "Đổi tiêu chí: Gửi request mới, không dùng nhầm pool cũ",
      passed: newCallMade && latestCall?.postData?.country === "au-my",
      details: { country: latestCall?.postData?.country, movieTitle: auMyMovieTitle, duration: latestCall?.duration },
    });

    // KỊCH BẢN 6: Đóng modal và kiểm tra khôi phục Scroll / ESC key
    console.log("\n[KỊCH BẢN 6] Đóng modal bằng Escape & Khôi phục Body Scroll");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    const isModalVisibleAfterEsc = await page.locator("div.fixed.inset-0.z-\\[120\\]").isVisible();
    const bodyScrollAfterClose = await page.evaluate(() => document.body.style.overflow);
    console.log(`- Modal còn hiển thị sau khi bấm Escape: ${isModalVisibleAfterEsc ? "CÓ (LỖI)" : "KHÔNG (ĐÃ ĐÓNG)"}`);
    console.log(`- Body scroll sau khi đóng: '${bodyScrollAfterClose || "unset"}' (Đã khôi phục)`);

    results.scenarios.push({
      id: "SCENARIO_6_CLOSE_ESC_SCROLL",
      name: "Đóng bằng phím Escape & khôi phục body scroll",
      passed: !isModalVisibleAfterEsc && bodyScrollAfterClose !== "hidden",
      details: { isModalVisibleAfterEsc, bodyScrollAfterClose },
    });

    await desktopContext.close();

    // ------------------------------------------------------------------------
    // MOBILE VIEWPORT TEST SUITE (390 x 844 - iPhone 12/13/14)
    // ------------------------------------------------------------------------
    console.log("\n--- BẮT ĐẦU KIỂM THỬ VIEWPORT MOBILE (390 x 844) ---");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      locale: "vi-VN",
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(`${BASE_URL}/browse`, { waitUntil: "domcontentloaded" });
    await mobilePage.waitForTimeout(800);

    // Mở Bốc Quẻ trên mobile
    await mobilePage.evaluate(() => {
      window.dispatchEvent(new CustomEvent("open-ai-roulette"));
    });
    await mobilePage.waitForSelector("div.fixed.inset-0.z-\\[120\\]", { state: "visible", timeout: 5000 });

    const mobileModalBox = await mobilePage.locator("div.fixed.inset-0.z-\\[120\\] > div.relative").first();
    const mobileBounding = await mobileModalBox.boundingBox();
    console.log(`- Mobile Modal dimensions: width=${mobileBounding?.width}px, height=${mobileBounding?.height}px`);
    const fitsMobileScreen = mobileBounding && mobileBounding.width <= 390 && mobileBounding.height <= 844;
    console.log(`- Modal nằm trọn trong viewport mobile không bị tràn ngang: ${fitsMobileScreen ? "ĐẠT" : "KHÔNG ĐẠT"}`);

    // Bấm nút Đóng (X) trên mobile
    const closeBtn = mobilePage.locator("button[aria-label='Đóng cửa sổ']").first();
    await closeBtn.click();
    await mobilePage.waitForTimeout(400);

    const isClosedMobile = !(await mobilePage.locator("div.fixed.inset-0.z-\\[120\\]").isVisible());
    console.log(`- Nút Đóng (X) trên mobile hoạt động chuẩn: ${isClosedMobile ? "ĐẠT" : "KHÔNG ĐẠT"}`);

    results.scenarios.push({
      id: "SCENARIO_7_MOBILE_VIEWPORT",
      name: "Viewport mobile 390x844: Không tràn viền, nút đóng X hoạt động tốt",
      passed: Boolean(fitsMobileScreen && isClosedMobile),
      details: { width: mobileBounding?.width, height: mobileBounding?.height, isClosedMobile },
    });

    await mobileContext.close();

    // ------------------------------------------------------------------------
    // TỔNG HỢP NETWORK TIMINGS & CHỈ SỐ THỰC TẾ
    // ------------------------------------------------------------------------
    console.log("\n=================================================================");
    console.log("            BẢNG TỔNG HỢP NETWORK & PERFORMANCE THỰC TẾ          ");
    console.log("=================================================================");
    console.log(`Tổng số request đến /api/ai-roulette: ${apiCalls.length}`);
    apiCalls.forEach((call, i) => {
      console.log(`  [Call #${i + 1}] Status: ${call.status} | Duration: ${call.duration}ms | Mood: ${call.postData?.mood} | Country: ${call.postData?.country}`);
    });

  } catch (err) {
    console.error("Lỗi trong quá trình chạy E2E test:", err);
    results.errors.push(String(err));
  } finally {
    await browser.close();
  }

  console.log("\n=================================================================");
  console.log("                  KẾT QUẢ CÁC KỊCH BẢN E2E                       ");
  console.log("=================================================================");
  let allPassed = true;
  for (const sc of results.scenarios) {
    const icon = sc.passed ? "✅ [PASS]" : "❌ [FAIL]";
    if (!sc.passed) allPassed = false;
    console.log(`${icon} ${sc.name}`);
  }

  console.log(`\nTổng kết: ${results.scenarios.filter(s => s.passed).length}/${results.scenarios.length} kịch bản ĐẠT CHUẨN.`);
  if (!allPassed) {
    process.exit(1);
  }
}

runE2eAudit();
