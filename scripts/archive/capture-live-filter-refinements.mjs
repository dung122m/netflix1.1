import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const OUT_DIR = path.resolve(process.cwd(), "scratch/live-hub-refinements");
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
    await page.goto("http://localhost:3000/live", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Find the filter container
    const filterCard = page.locator("div.rounded-2xl.border.border-white\\/10.bg-zinc-950\\/80").first();
    if (await filterCard.count() > 0) {
      await filterCard.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await filterCard.screenshot({
        path: path.join(OUT_DIR, `live_filters_${vp.name}.png`)
      });

      // Also capture with tournament dropdown opened on desktop
      if (vp.name.startsWith("desktop")) {
        const trophyBtn = filterCard.locator("button:has-text('Tất cả giải đấu')").first();
        if (await trophyBtn.count() > 0) {
          await trophyBtn.click();
          await page.waitForTimeout(500);

          const box = await filterCard.boundingBox();
          if (box) {
            await page.screenshot({
              path: path.join(OUT_DIR, `live_filters_dropdown_open_${vp.name}.png`),
              clip: {
                x: Math.max(0, box.x - 10),
                y: Math.max(0, box.y - 10),
                width: box.width + 20,
                height: box.height + 320
              }
            });
          }
        }
      }
    }

    await page.close();
  }

  await browser.close();
  console.log("Live filter refinements captured to:", OUT_DIR);
}

capture().catch(console.error);
