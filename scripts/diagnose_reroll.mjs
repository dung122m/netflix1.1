import { chromium } from "playwright";
import fs from "fs";

async function diagnoseReroll() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  await page.goto("http://localhost:3000/browse", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  await page.evaluate(() => window.dispatchEvent(new CustomEvent("open-ai-roulette")));
  await page.waitForSelector("div.fixed.inset-0.z-\\[120\\]");

  const spinBtn = page.locator("button:has-text('Bốc Quẻ Suất Chiếu Định Mệnh')").first();
  await spinBtn.click();
  await page.waitForSelector("button:has-text('Bốc Quẻ Khác'):not([disabled])", { timeout: 15000 });

  console.log("=== BẮT ĐẦU TEST BẤM 'BỐC QUẺ KHÁC' ===");
  const rerollBtn = page.locator("button:has-text('Bốc Quẻ Khác')").first();

  // Bấm nút Khác
  await rerollBtn.click();

  // Ngay sau khi bấm (50ms, 150ms, 250ms, 350ms, 450ms, 550ms)
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(100);
    const data = await page.evaluate(() => {
      const overlay = document.querySelector(".backdrop-blur-md");
      const d1 = document.querySelector(".dice-rolling-1");
      const d2 = document.querySelector(".dice-rolling-2");
      return {
        hasOverlay: !!overlay,
        overlayOpacity: overlay ? window.getComputedStyle(overlay).opacity : null,
        d1Anim: d1 ? window.getComputedStyle(d1).animation : null,
        d1Transform: d1 ? window.getComputedStyle(d1).transform : null,
        d2Transform: d2 ? window.getComputedStyle(d2).transform : null,
      };
    });
    console.log(`Step ${i} (${(i+1)*100}ms):`, data);

    const modalBox = page.locator("div.fixed.inset-0.z-\\[120\\] > div.relative").first();
    const buf = await modalBox.screenshot();
    fs.writeFileSync(`reroll_frame_${i}.png`, buf);
  }

  await browser.close();
}

diagnoseReroll();
