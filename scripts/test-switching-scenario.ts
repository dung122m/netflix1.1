import { chromium } from 'playwright';

async function testSwitching() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on('console', msg => {
    const t = msg.text();
    if (t.includes('Cinema') || t.includes('HLS') || t.includes('error') || t.includes('Error')) {
      console.log(`[CONSOLE]`, t);
    }
  });

  console.log("Step 1: Go to Conan on Server 2 (Lồng Tiếng #1, ep 67)");
  await page.goto("https://nanaflix.vercel.app/movies/tham-tu-lung-danh-conan?ep=tap-67&server=2", { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  console.log("Current URL:", page.url());

  const getMediaInfo = async () => {
    return await page.evaluate(() => {
      const v = document.querySelector('video');
      const iframe = document.querySelector('iframe');
      return {
        hasVideo: !!v,
        videoSrc: v?.src,
        currentTime: v?.currentTime,
        hasIframe: !!iframe,
        iframeSrc: iframe?.src,
      };
    });
  };

  console.log("Step 1 Media:", await getMediaInfo());

  console.log("\nStep 2: Switch to Server 1 (Lồng Tiếng 1013 tập)...");
  const srv1Btn = page.locator('button:visible').filter({ hasText: /Lồng Tiếng\s*1013/ });
  await srv1Btn.first().click();
  await page.waitForTimeout(3000);
  console.log("Current URL after switch to Srv 1:", page.url());
  console.log("Step 2 Media:", await getMediaInfo());
  await page.screenshot({ path: 'step2_switch_to_srv1.png' });

  console.log("\nStep 3: Click Episode 2 while on Server 1...");
  // Let's find episode tab for 1 - 25
  const chunk1Btn = page.locator('button:visible').filter({ hasText: /1\s*-\s*25/ });
  if (await chunk1Btn.count() > 0) {
    await chunk1Btn.first().click();
    await page.waitForTimeout(1000);
  }
  const ep2Btn = page.locator('a[href*="ep="]:visible').filter({ hasText: /^2$/ });
  if (await ep2Btn.count() > 0) {
    await ep2Btn.first().click();
    await page.waitForTimeout(4000);
    console.log("Current URL after clicking ep 2:", page.url());
    console.log("Step 3 Media:", await getMediaInfo());
    await page.screenshot({ path: 'step3_click_ep2_on_srv1.png' });
  } else {
    console.log("ep 2 btn not found!");
  }

  console.log("\nStep 4: Switch to Server 0 (Vietsub 1201 tập)...");
  const srv0Btn = page.locator('button:visible').filter({ hasText: /Vietsub\s*120[0-9]/ });
  await srv0Btn.first().click();
  await page.waitForTimeout(4000);
  console.log("Current URL after switch to Srv 0:", page.url());
  console.log("Step 4 Media:", await getMediaInfo());
  await page.screenshot({ path: 'step4_switch_to_srv0.png' });

  await browser.close();
}

testSwitching().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

