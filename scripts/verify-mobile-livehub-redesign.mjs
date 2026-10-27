import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const targetUrl = process.env.TARGET_URL || "http://localhost:3000/live";
const outputDir = path.resolve("./artifacts/mobile-redesign-verification");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const viewports = [
  { name: "mobile-320", width: 320, height: 740 },
  { name: "mobile-360", width: 360, height: 780 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-430", width: 430, height: 932 },
  { name: "desktop-1440", width: 1440, height: 900 },
];

async function run() {
  console.log("Starting mobile redesign verification at", targetUrl);
  const browser = await chromium.launch({ headless: true });

  const results = [];

  for (const vp of viewports) {
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });

    try {
      await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(1500);

      // Verify no horizontal overflow in body
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      const hasHorizontalOverflow = scrollWidth > clientWidth;

      // Extract sports pills text content
      const sportsPills = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        return buttons
          .filter((b) => b.textContent && (b.textContent.includes("Bóng") || b.textContent.includes("Tất cả môn")))
          .map((b) => ({
            text: b.textContent.trim().replace(/\s+/g, " "),
            width: b.getBoundingClientRect().width,
            height: b.getBoundingClientRect().height,
          }));
      });

      // Check if any button has pure white background 'rgb(255, 255, 255)' with dark text in the filter area
      const whiteButtons = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        return buttons
          .filter((b) => {
            const style = window.getComputedStyle(b);
            return style.backgroundColor === "rgb(255, 255, 255)";
          })
          .map((b) => b.textContent.trim().replace(/\s+/g, " "));
      });

      // Capture screenshot
      const screenshotPath = path.join(outputDir, `${vp.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      console.log(`[${vp.name}] Width: ${vp.width}px | Overflow: ${hasHorizontalOverflow} | Sports pills:`, sportsPills, `| White buttons:`, whiteButtons);

      results.push({
        viewport: vp.name,
        width: vp.width,
        scrollWidth,
        clientWidth,
        hasHorizontalOverflow,
        sportsPills,
        whiteButtons,
        screenshot: screenshotPath,
      });

      // If mobile-390, also test search toggle interaction
      if (vp.name === "mobile-390") {
        const searchBtn = await page.$("button[title='Tìm kiếm trận đấu']");
        if (searchBtn) {
          await searchBtn.click();
          await page.waitForTimeout(500);
          await page.screenshot({ path: path.join(outputDir, "mobile-390-search-expanded.png"), fullPage: false });
          console.log("[mobile-390] Captured expanded search screenshot!");
        }
      }
    } catch (err) {
      console.error(`Error on ${vp.name}:`, err);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log("Verification finished successfully!");
  fs.writeFileSync(path.join(outputDir, "results.json"), JSON.stringify(results, null, 2));
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
