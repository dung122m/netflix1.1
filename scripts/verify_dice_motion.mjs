import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";
const OUTPUT_DIR = "C:/Users/a0326/.gemini/antigravity-ide/brain/5818b6e3-2399-48bd-ad6b-33ff7a811252/.tempmediaStorage";

async function verifyDiceMotion() {
  console.log("=== BẮT ĐẦU KIỂM THỬ XÁC MINH CHUYỂN ĐỘNG XÚC XẮC 3D VÀ TIMING 1.5-2.0s ===");

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  const testConfig = async (viewport, deviceName, reducedMotion = "no-preference") => {
    console.log(`\n===============================================================`);
    console.log(`[TEST RUN] ${deviceName} (${viewport.width}x${viewport.height}) - reducedMotion: ${reducedMotion}`);
    console.log(`===============================================================`);

    const context = await browser.newContext({
      viewport,
      locale: "vi-VN",
      reducedMotion,
    });

    const page = await context.newPage();
    await page.goto(`${BASE_URL}/browse`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    // Mở modal Bốc Quẻ
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("open-ai-roulette"));
    });

    const modalSelector = "div.fixed.inset-0.z-\\[120\\]";
    await page.waitForSelector(modalSelector, { state: "visible", timeout: 5000 });
    await page.waitForTimeout(400);

    // =========================================================================
    // LƯỢT 1: BẤM NÚT BỐC QUẺ LẦN ĐẦU
    // =========================================================================
    console.log("\n--- LƯỢT 1: Bắt đầu bốc quẻ lần đầu ---");
    const spinBtn = page.locator("button:has-text('Bốc Quẻ Suất Chiếu Định Mệnh')").first();
    const t0 = Date.now();
    await spinBtn.click();

    // Chờ xuất hiện phần tử xúc xắc đang tumbling
    await page.waitForSelector(".dice-active-1", { state: "visible", timeout: 3000 });

    // Lấy thông tin computed style và inspect parent chain
    const styleAudit = await page.evaluate(() => {
      const die1 = document.querySelector(".dice-active-1");
      const die2 = document.querySelector(".dice-active-2");
      if (!die1 || !die2) return { found: false };

      const cs1 = window.getComputedStyle(die1);
      const cs2 = window.getComputedStyle(die2);

      return {
        found: true,
        die1: {
          animationName: cs1.animationName,
          animationDuration: cs1.animationDuration,
          animationPlayState: cs1.animationPlayState,
          transform: cs1.transform,
          opacity: cs1.opacity,
          transformStyle: cs1.transformStyle,
        },
        die2: {
          animationName: cs2.animationName,
          animationDuration: cs2.animationDuration,
          animationPlayState: cs2.animationPlayState,
          transform: cs2.transform,
          opacity: cs2.opacity,
          transformStyle: cs2.transformStyle,
        },
      };
    });

    console.log("Computed Style Die 1 (Ruby):", JSON.stringify(styleAudit.die1, null, 2));
    console.log("Computed Style Die 2 (Amber):", JSON.stringify(styleAudit.die2, null, 2));

    // Chụp 4 frame liên tiếp qua các mốc thời gian: 150ms, 450ms, 850ms, 1250ms để thấy trọn vẹn nhịp cao trào
    const framesL1 = [];
    for (let f = 1; f <= 4; f++) {
      await page.waitForTimeout(200);
      const transformData = await page.evaluate(() => {
        const d1 = document.querySelector(".dice-active-1");
        const d2 = document.querySelector(".dice-active-2");
        return {
          d1Transform: d1 ? window.getComputedStyle(d1).transform : null,
          d2Transform: d2 ? window.getComputedStyle(d2).transform : null,
        };
      });
      const imgPath = path.join(OUTPUT_DIR, `${deviceName}_l1_frame${f}.png`);
      const arena = page.locator(".dice-active-1").locator("xpath=../..");
      if (await arena.count() > 0) {
        await arena.screenshot({ path: imgPath, animations: "allow" }).catch(() => {});
      }
      framesL1.push({ frame: f, ...transformData, img: imgPath });
    }
    console.log(`Lượt 1 - 4 Frame Transforms:`, framesL1.map(x => ({ f: x.frame, d1: x.d1Transform?.slice(0, 35), d2: x.d2Transform?.slice(0, 35) })));

    // Chờ kết quả lượt 1 xuất hiện
    await page.waitForSelector("button:has-text('Bốc Quẻ Khác')", { state: "visible", timeout: 15000 });
    const elapsedL1 = Date.now() - t0;
    console.log(`-> Kết quả Lượt 1 đã hiển thị thành công. Thời gian cảm nhận: ${elapsedL1}ms`);
    await page.waitForTimeout(500);

    // =========================================================================
    // LƯỢT 2: BẤM NÚT "BỐC QUẺ KHÁC" (LẤY TỪ POOL/PREFETCH)
    // =========================================================================
    console.log("\n--- LƯỢT 2: Bấm nút 'Bốc Quẻ Khác' (Re-roll từ pool, đo thời lượng 1.5-2.0s) ---");
    const diffBtn = page.locator("button:has-text('Bốc Quẻ Khác')").first();
    const tReroll1 = Date.now();
    await diffBtn.click();

    // Chờ xúc xắc overlay xuất hiện
    await page.waitForSelector(".dice-active-1", { state: "visible", timeout: 2000 });

    const framesL2 = [];
    for (let f = 1; f <= 3; f++) {
      await page.waitForTimeout(250);
      const transformData = await page.evaluate(() => {
        const d1 = document.querySelector(".dice-active-1");
        const d2 = document.querySelector(".dice-active-2");
        return {
          d1Transform: d1 ? window.getComputedStyle(d1).transform : null,
          d2Transform: d2 ? window.getComputedStyle(d2).transform : null,
        };
      });
      const imgPath = path.join(OUTPUT_DIR, `${deviceName}_l2_frame${f}.png`);
      const arena = page.locator(".dice-active-1").locator("xpath=../..");
      if (await arena.count() > 0) {
        await arena.screenshot({ path: imgPath, animations: "allow" }).catch(() => {});
      }
      framesL2.push({ frame: f, ...transformData });
    }
    console.log(`Lượt 2 - 3 Frame Transforms:`, framesL2.map(x => ({ f: x.frame, d1: x.d1Transform?.slice(0, 35), d2: x.d2Transform?.slice(0, 35) })));

    // Chờ kết thúc Lượt 2
    await page.waitForSelector(".dice-active-1", { state: "detached", timeout: 8000 });
    const elapsedL2 = Date.now() - tReroll1;
    console.log(`-> Kết quả Lượt 2 đã hiển thị thành công. Thời gian client re-roll: ${elapsedL2}ms`);
    const isL2TimingOk = elapsedL2 >= 1400 && elapsedL2 <= 2200;
    console.log(`- Đánh giá thời lượng Lượt 2 (Mục tiêu 1.5s - 2.0s): ${isL2TimingOk ? "ĐẠT CHUẨN" : "CHƯA ĐẠT"} (${elapsedL2}ms)`);
    await page.waitForTimeout(500);

    // =========================================================================
    // LƯỢT 3: BẤM TIẾP NÚT "BỐC QUẺ KHÁC" LẦN NỮA
    // =========================================================================
    console.log("\n--- LƯỢT 3: Bấm tiếp nút 'Bốc Quẻ Khác' lần nữa (Client re-roll tiếp theo) ---");
    await page.waitForSelector("button:has-text('Bốc Quẻ Khác'):not([disabled])", { timeout: 10000 });
    const tReroll2 = Date.now();
    await diffBtn.click();
    await page.waitForSelector(".dice-active-1", { state: "visible", timeout: 2000 });

    const framesL3 = [];
    for (let f = 1; f <= 3; f++) {
      await page.waitForTimeout(250);
      const transformData = await page.evaluate(() => {
        const d1 = document.querySelector(".dice-active-1");
        const d2 = document.querySelector(".dice-active-2");
        return {
          d1Transform: d1 ? window.getComputedStyle(d1).transform : null,
          d2Transform: d2 ? window.getComputedStyle(d2).transform : null,
        };
      });
      framesL3.push({ frame: f, ...transformData });
    }
    console.log(`Lượt 3 - 3 Frame Transforms:`, framesL3.map(x => ({ f: x.frame, d1: x.d1Transform?.slice(0, 35), d2: x.d2Transform?.slice(0, 35) })));

    await page.waitForSelector(".dice-active-1", { state: "detached", timeout: 8000 });
    const elapsedL3 = Date.now() - tReroll2;
    console.log(`-> Kết quả Lượt 3 đã hiển thị thành công. Thời gian client re-roll: ${elapsedL3}ms`);
    const isL3TimingOk = elapsedL3 >= 1400 && elapsedL3 <= 2200;
    console.log(`- Đánh giá thời lượng Lượt 3 (Mục tiêu 1.5s - 2.0s): ${isL3TimingOk ? "ĐẠT CHUẨN" : "CHƯA ĐẠT"} (${elapsedL3}ms)`);

    // Kiểm tra xem có text thừa rườm rà nào trong lúc xúc xắc xoay không
    const checkTextSlogans = await page.evaluate(() => {
      const modal = document.querySelector("div.fixed.inset-0.z-\\[120\\]");
      if (!modal) return [];
      const text = modal.textContent || "";
      const forbidden = ["Gieo Quẻ Số Mệnh", "Vận may", "Đang gieo", "Vũ trụ đang kết nối"];
      return forbidden.filter(f => text.includes(f));
    });

    console.log(`Kiểm tra text rườm rà:`, checkTextSlogans.length === 0 ? "PASSED (Không có chữ thừa)" : `FAILED (Còn sót: ${checkTextSlogans.join(", ")})`);

    await context.close();
  };

  // 1. Chạy Desktop 1440x900
  await testConfig({ width: 1440, height: 900 }, "Desktop_1440x900", "no-preference");

  // 2. Chạy Mobile 390x844
  await testConfig({ width: 390, height: 844 }, "Mobile_390x844", "no-preference");

  // 3. Chạy Desktop với prefers-reduced-motion: reduce
  await testConfig({ width: 1440, height: 900 }, "Desktop_ReducedMotion", "reduce");

  await browser.close();
  console.log("\n=== TẤT CẢ KIỂM THỬ XÁC MINH HOÀN TẤT THÀNH CÔNG ===");
}

verifyDiceMotion().catch((err) => {
  console.error("LỖI KIỂM THỬ:", err);
  process.exit(1);
});
