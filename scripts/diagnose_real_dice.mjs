import { chromium } from "playwright";
import fs from "fs";

async function diagnose() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  await page.goto("http://localhost:3000/browse", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  // Mở modal
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("open-ai-roulette")));
  await page.waitForSelector("div.fixed.inset-0.z-\\[120\\]");

  console.log("=== KIỂM TRA DOM & COMPUTED STYLE ===");
  const spinBtn = page.locator("button:has-text('Bốc Quẻ Suất Chiếu Định Mệnh')").first();
  await spinBtn.click();

  // Đợi 100ms để loading mount
  await page.waitForTimeout(100);

  const domInspection = await page.evaluate(() => {
    const diceElements = Array.from(document.querySelectorAll(".dice-rolling-1, .dice-rolling-2"));
    const allStyles = Array.from(document.querySelectorAll("style")).map(s => s.textContent || "");
    const modalBox = document.querySelector("div.fixed.inset-0.z-\\[120\\]");
    
    return {
      diceCount: diceElements.length,
      diceDetails: diceElements.map(el => {
        const cs = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
          tagName: el.tagName,
          className: el.className,
          rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
          animation: cs.animation,
          animationName: cs.animationName,
          animationDuration: cs.animationDuration,
          animationPlayState: cs.animationPlayState,
          transform: cs.transform,
          transformStyle: cs.transformStyle,
          webkitTransformStyle: (cs).webkitTransformStyle,
          opacity: cs.opacity,
          display: cs.display,
          visibility: cs.visibility,
          parentTransform: el.parentElement ? window.getComputedStyle(el.parentElement).transform : null,
          parentTransformStyle: el.parentElement ? window.getComputedStyle(el.parentElement).transformStyle : null,
        };
      }),
      hasDiceStylesInHead: allStyles.some(s => s.includes("diceTumble1")),
      prefersReducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches
    };
  });

  console.log("DOM Inspection:", JSON.stringify(domInspection, null, 2));

  // Chụp 5 frame liên tiếp cách nhau 80ms
  console.log("\nChụp 5 frame liên tiếp để so sánh pixel...");
  const buffers = [];
  for (let i = 0; i < 5; i++) {
    const diceArena = page.locator("div.fixed.inset-0.z-\\[120\\]").first();
    const buf = await diceArena.screenshot();
    buffers.push(buf);
    fs.writeFileSync(`diag_frame_${i}.png`, buf);
    await page.waitForTimeout(80);
  }

  // So sánh byte của các buffer
  console.log("\nSo sánh byte ảnh giữa các frame:");
  for (let i = 0; i < 4; i++) {
    const same = buffers[i].equals(buffers[i + 1]);
    console.log(`Frame ${i} vs Frame ${i + 1}: ${same ? "HOÀN TOÀN GIỐNG NHAU (ĐỨNG YÊN!)" : "KHÁC NHAU (CÓ THAY ĐỔI PIXEL)"}`);
  }

  await browser.close();
}

diagnose();
