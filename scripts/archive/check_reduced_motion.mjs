import { chromium } from "playwright";

async function check() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000/browse");
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("open-ai-roulette")));
  await page.waitForSelector("button:has-text('Bốc Quẻ Suất Chiếu Định Mệnh')");
  await page.click("button:has-text('Bốc Quẻ Suất Chiếu Định Mệnh')");
  await page.waitForSelector(".dice-active-1");

  const p1 = await page.evaluate(() => {
    const el = document.querySelector(".dice-active-1");
    const cs = window.getComputedStyle(el);
    return {
      name: cs.animationName,
      dur: cs.animationDuration,
      play: cs.animationPlayState,
      iter: cs.animationIterationCount,
      transform: cs.transform
    };
  });
  console.log("Reduced motion run 1:", p1);

  await page.waitForSelector("button:has-text('Bốc Quẻ Khác')");
  await page.waitForTimeout(300);
  await page.click("button:has-text('Bốc Quẻ Khác')");
  await page.waitForSelector(".dice-active-1");

  const p2 = await page.evaluate(() => {
    const el = document.querySelector(".dice-active-1");
    const cs = window.getComputedStyle(el);
    return {
      name: cs.animationName,
      dur: cs.animationDuration,
      play: cs.animationPlayState,
      iter: cs.animationIterationCount,
      transform: cs.transform
    };
  });
  console.log("Reduced motion run 2:", p2);

  await page.waitForSelector("button:has-text('Bốc Quẻ Khác')");
  await page.waitForTimeout(300);
  await page.click("button:has-text('Bốc Quẻ Khác')");

  // Đợi 100ms
  await page.waitForTimeout(100);
  const p3 = await page.evaluate(() => {
    const el = document.querySelector(".dice-active-1");
    if (!el) return { found: false };
    const cs = window.getComputedStyle(el);
    return {
      found: true,
      name: cs.animationName,
      dur: cs.animationDuration,
      play: cs.animationPlayState,
      iter: cs.animationIterationCount,
      transform: cs.transform
    };
  });
  console.log("Reduced motion run 3 (at 100ms):", p3);

  // Đợi thêm 150ms
  await page.waitForTimeout(150);
  const p3_2 = await page.evaluate(() => {
    const el = document.querySelector(".dice-active-1");
    if (!el) return { found: false };
    const cs = window.getComputedStyle(el);
    return {
      found: true,
      transform: cs.transform
    };
  });
  console.log("Reduced motion run 3 (at 250ms):", p3_2);

  await browser.close();
}

check().catch(console.error);
