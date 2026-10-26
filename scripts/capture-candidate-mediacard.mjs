import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');
const CANDIDATES_DIR = join(ROOT_DIR, 'scratch', 'ui-baselines', 'candidates');
mkdirSync(CANDIDATES_DIR, { recursive: true });

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function run() {
  console.log('=== CAPTURING CANDIDATE SNAPSHOTS (SPRINT 1) ===');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // 1. DESKTOP MEDIACARD (Default, Hover, Tooltip)
    console.log('\n[Desktop: 1440px] Navigating to /browse...');
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      locale: 'vi-VN'
    });
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/browse`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForSelector('div.group\\/card img', { timeout: 15000 });
    await page.addStyleTag({ content: '*, *::before, *::after { transition-duration: 0.001s !important; animation-duration: 0.001s !important; }' });

    // Wait for card image to be fully loaded and visible
    await page.waitForSelector('div.group\\/card img.opacity-100', { timeout: 10000 }).catch(() => {});
    await page.evaluate(async () => {
      if (document.fonts) await document.fonts.ready;
      const images = Array.from(document.querySelectorAll('img'));
      await Promise.all(images.map(img => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise(r => {
          img.addEventListener('load', r, { once: true });
          img.addEventListener('error', r, { once: true });
          setTimeout(r, 3000);
        });
      }));
    });
    await page.waitForTimeout(1000);

    const card = page.locator('div.group\\/card').first();

    // A. Candidate Default Desktop
    const candDefault = join(CANDIDATES_DIR, 'mediacard_default_desktop_1440px.png');
    await card.screenshot({ path: candDefault });
    console.log('✓ Captured Candidate: mediacard_default_desktop_1440px.png');

    // B. Candidate Hover Desktop
    await card.hover();
    await page.waitForTimeout(350);
    const candHover = join(CANDIDATES_DIR, 'mediacard_hover_desktop_1440px.png');
    await card.screenshot({ path: candHover });
    console.log('✓ Captured Candidate: mediacard_hover_desktop_1440px.png');

    // C. Candidate Tooltip Desktop (Hover Folder Button at bottom-right)
    const folderBtn = card.locator('button[aria-label*="bộ sưu tập"]:visible').first();
    if (await folderBtn.count() > 0) {
      await folderBtn.hover();
      await page.waitForTimeout(350);
      const candTooltip = join(CANDIDATES_DIR, 'mediacard_tooltip_collection_desktop_1440px.png');
      await card.screenshot({ path: candTooltip });
      console.log('✓ Captured Candidate: mediacard_tooltip_collection_desktop_1440px.png');
    }

    await context.close();

    // 2. MOBILE MEDIACARD (Touch button with 44px hitbox)
    console.log('\n[Mobile: 375px] Navigating to /browse...');
    const mobContext = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
      locale: 'vi-VN'
    });
    const mobPage = await mobContext.newPage();
    await mobPage.goto(`${BASE_URL}/browse`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await mobPage.waitForSelector('div.group\\/card img', { timeout: 15000 });
    await mobPage.addStyleTag({ content: '*, *::before, *::after { transition-duration: 0.001s !important; animation-duration: 0.001s !important; }' });

    await mobPage.evaluate(async () => {
      if (document.fonts) await document.fonts.ready;
      const img = document.querySelector('div.group\\/card img');
      if (img && !img.complete) {
        await new Promise(r => {
          img.addEventListener('load', r, { once: true });
          img.addEventListener('error', r, { once: true });
          setTimeout(r, 4000);
        });
      }
    });
    await mobPage.waitForTimeout(600);

    const mobCard = mobPage.locator('div.group\\/card').first();
    const candMobile = join(CANDIDATES_DIR, 'mediacard_default_mobile_375px.png');
    await mobCard.screenshot({ path: candMobile });
    console.log('✓ Captured Candidate: mediacard_default_mobile_375px.png');

    // Verify touch button behavior on mobile: clicking folder button does NOT navigate
    console.log('\n[Mobile Interaction Verification] Testing tap on collection button...');
    const mobFolderBtn = mobCard.locator('button[aria-label*="bộ sưu tập"]').first();
    await mobFolderBtn.click();
    await mobPage.waitForTimeout(500);

    const currentUrl = mobPage.url();
    console.log(`Current URL after tap: ${currentUrl}`);
    const isNavigationTriggered = currentUrl.includes('/movies/');
    console.log(`Navigation prevented successfully: ${!isNavigationTriggered}`);

    await mobContext.close();
    console.log('\n=== CANDIDATE CAPTURE & INTERACTION TESTS COMPLETE ===');
  } finally {
    await browser.close();
  }
}

run().catch(e => {
  console.error('Candidate capture error:', e);
  process.exit(1);
});
