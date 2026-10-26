import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const OUT_DIR = path.resolve(process.cwd(), "scratch/trending-redesign-candidates");
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function capture() {
  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: "desktop_1440x900", width: 1440, height: 900 },
    { name: "mobile_375x812", width: 375, height: 812 }
  ];

  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    // Scroll to TMDB Trending section
    const tmdbSection = page.locator("section:has-text('Thịnh Hành Trong Tuần')").first();
    if (await tmdbSection.count() > 0) {
      await tmdbSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await tmdbSection.screenshot({
        path: path.join(OUT_DIR, `tmdb_trending_${vp.name}.png`)
      });
    }

    // Scroll to Community Trending section
    const commSection = page.locator("section:has-text('Cộng Đồng Nanaflix')").first();
    if (await commSection.count() > 0) {
      await commSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await commSection.screenshot({
        path: path.join(OUT_DIR, `community_trending_${vp.name}.png`)
      });
    }

    await page.close();
  }

  await browser.close();
  console.log("Screenshots captured to:", OUT_DIR);
}

capture().catch(console.error);
