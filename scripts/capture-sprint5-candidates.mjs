import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');
const CANDIDATES_DIR = join(ROOT_DIR, 'scratch', 'sprint5-candidates');
mkdirSync(CANDIDATES_DIR, { recursive: true });

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function captureViewport(browser, width, height, label) {
  console.log(`\nCapturing Candidate [${label}: ${width}x${height}]...`);
  const context = await browser.newContext({
    viewport: { width, height },
    locale: 'vi-VN'
  });
  const page = await context.newPage();
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 25000 });
  
  // Wait for TmdbTopTrending section
  const sectionLocator = page.locator('section').filter({ hasText: 'Phim Thịnh Hành Trong Tuần' }).first();
  await sectionLocator.waitFor({ state: 'visible', timeout: 15000 });

  await sectionLocator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(2000);

  // Wait for fonts & images
  await page.evaluate(async () => {
    if (document.fonts) await document.fonts.ready;
    const images = Array.from(document.querySelectorAll('img'));
    await Promise.all(images.map(img => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise(r => {
        img.addEventListener('load', r, { once: true });
        img.addEventListener('error', r, { once: true });
        setTimeout(r, 2000);
      });
    }));
  });
  await page.waitForTimeout(1000);

  // Capture full section
  const sectionPath = join(CANDIDATES_DIR, `tmdb_trending_section_${label}_${width}x${height}.png`);
  await sectionLocator.screenshot({ path: sectionPath });
  console.log(`✓ Saved candidate section screenshot: ${sectionPath}`);

  // Capture first 3 cards close-up
  const firstCard = sectionLocator.locator('div.group\\/row .snap-start').first();
  if (await firstCard.isVisible()) {
    const cardPath = join(CANDIDATES_DIR, `tmdb_trending_card1_${label}.png`);
    await firstCard.screenshot({ path: cardPath });
    console.log(`✓ Saved candidate card 1 screenshot: ${cardPath}`);
  }

  // On desktop, test hover on card 1
  if (width >= 1024) {
    await firstCard.hover();
    await page.waitForTimeout(400);
    const hoverPath = join(CANDIDATES_DIR, `tmdb_trending_card1_hover_${label}.png`);
    await firstCard.screenshot({ path: hoverPath });
    console.log(`✓ Saved candidate card 1 hover screenshot: ${hoverPath}`);
  }

  await context.close();
}

async function run() {
  console.log('=== SPRINT 5: CAPTURING POST-CHANGE CANDIDATES ===');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    await captureViewport(browser, 1440, 900, 'desktop');
    await captureViewport(browser, 768, 1024, 'tablet');
    await captureViewport(browser, 375, 812, 'mobile');
    await captureViewport(browser, 320, 568, 'mobile_small');
    console.log('\n=== ALL CANDIDATE SCREENSHOTS CAPTURED ===');
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    await browser.close();
  }
}

run();
