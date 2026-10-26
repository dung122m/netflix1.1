import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');
const AUDIT_DIR = join(ROOT_DIR, 'scratch', 'live-hub-audit');
mkdirSync(AUDIT_DIR, { recursive: true });

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000/live';

async function captureViewport(browser, width, height, label) {
  console.log(`Capturing Baseline [${label}: ${width}x${height}]...`);
  const context = await browser.newContext({
    viewport: { width, height },
    locale: 'vi-VN'
  });
  const page = await context.newPage();
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Locate the filter container
  // It has search input and filter buttons
  const searchInput = page.locator('input[placeholder*="Tìm trận"]').first();
  await searchInput.waitFor({ state: 'visible', timeout: 15000 });
  
  // Find the container enclosing the filters
  const filterCard = searchInput.locator('xpath=ancestor::div[contains(@class, "rounded-2xl") and contains(@class, "border-white")]').first();
  await filterCard.waitFor({ state: 'visible', timeout: 5000 });
  await filterCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);

  // Capture the filter box close-up
  const cardPath = join(AUDIT_DIR, `live_filters_card_${label}_${width}x${height}.png`);
  await filterCard.screenshot({ path: cardPath });
  console.log(`✓ Saved filter card: ${cardPath}`);

  // Capture the full live section (filter + top matches)
  const fullPagePath = join(AUDIT_DIR, `live_hub_section_${label}_${width}x${height}.png`);
  await page.screenshot({ path: fullPagePath, clip: { x: 0, y: 0, width, height: Math.min(height, 800) } });
  console.log(`✓ Saved section screenshot: ${fullPagePath}`);

  await context.close();
}

async function run() {
  console.log('=== LIVE HUB FILTERS: CAPTURING BASELINE SCREENSHOTS ===');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    await captureViewport(browser, 1440, 900, 'desktop');
    await captureViewport(browser, 375, 812, 'mobile');
    console.log('=== ALL BASELINES CAPTURED ===');
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    await browser.close();
  }
}

run();
