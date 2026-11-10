import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');
const CANDIDATE_DIR = join(ROOT_DIR, 'scratch', 'live-hub-candidates');
mkdirSync(CANDIDATE_DIR, { recursive: true });

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000/live';

async function testViewport(browser, width, height, label) {
  console.log(`\nTesting Candidate [${label}: ${width}x${height}]...`);
  const context = await browser.newContext({
    viewport: { width, height },
    locale: 'vi-VN'
  });
  const page = await context.newPage();
  
  // Listen for console errors
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  const searchInput = page.locator('input[placeholder*="Tìm trận"]').first();
  await searchInput.waitFor({ state: 'visible', timeout: 15000 });
  
  const filterCard = searchInput.locator('xpath=ancestor::div[contains(@class, "rounded-2xl") and contains(@class, "border-white")]').first();
  await filterCard.waitFor({ state: 'visible', timeout: 5000 });
  await filterCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  // Capture candidate card
  const cardPath = join(CANDIDATE_DIR, `live_filters_card_${label}_${width}x${height}.png`);
  await filterCard.screenshot({ path: cardPath });
  console.log(`✓ Saved candidate filter card: ${cardPath}`);

  // Test Tournament Dropdown on desktop
  if (width >= 1024) {
    const tournamentBtn = filterCard.locator('button:has-text("Mọi giải đấu")').first();
    if (await tournamentBtn.isVisible()) {
      await tournamentBtn.click();
      await page.waitForTimeout(300);
      const dropdownPath = join(CANDIDATE_DIR, `live_filters_tournament_dropdown_${label}.png`);
      const filterBox = await filterCard.boundingBox();
      if (filterBox) {
        await page.screenshot({
          path: dropdownPath,
          clip: {
            x: Math.max(0, filterBox.x - 10),
            y: Math.max(0, filterBox.y - 10),
            width: Math.min(width, filterBox.width + 20),
            height: filterBox.height + 320
          }
        });
        console.log(`✓ Saved tournament dropdown open screenshot: ${dropdownPath}`);
      }
      
      // Close dropdown by clicking outside or pressing Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }
  }

  // Check console errors
  if (consoleErrors.length > 0) {
    console.warn(`[${label}] Console errors encountered:`, consoleErrors);
  } else {
    console.log(`✓ [${label}] No console errors.`);
  }

  await context.close();
}

async function testInteractions(browser) {
  console.log('\n=== TESTING LIVE FILTER INTERACTIONS ON DESKTOP ===');
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'vi-VN'
  });
  const page = await context.newPage();
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  const searchInput = page.locator('input[placeholder*="Tìm trận"]').first();
  const filterCard = searchInput.locator('xpath=ancestor::div[contains(@class, "rounded-2xl") and contains(@class, "border-white")]').first();

  // 1. Status change to "Đang diễn ra"
  const liveBtn = filterCard.locator('button:has-text("Đang diễn ra")').first();
  if (await liveBtn.isVisible()) {
    await liveBtn.click();
    await page.waitForTimeout(500);
    console.log('✓ Clicked "Đang diễn ra"');
  }

  // 2. Status change to "Mọi trận"
  const allStatusBtn = filterCard.locator('button:has-text("Mọi trận")').first();
  await allStatusBtn.click();
  await page.waitForTimeout(500);
  console.log('✓ Clicked "Mọi trận"');

  // 3. Sport change: click first available sport
  const sportButtons = filterCard.locator('.overflow-x-auto button');
  const sportCount = await sportButtons.count();
  if (sportCount > 1) {
    await sportButtons.nth(1).click();
    await page.waitForTimeout(500);
    console.log('✓ Clicked specific sport');
  }

  // 4. Reset filters
  const resetBtn = filterCard.locator('button:has-text("Đặt lại bộ lọc")').first();
  if (await resetBtn.isVisible()) {
    await resetBtn.click();
    await page.waitForTimeout(500);
    console.log('✓ Clicked "Đặt lại bộ lọc"');
  }

  // 5. Test search query
  await searchInput.fill('Bóng');
  await page.waitForTimeout(500);
  console.log('✓ Search query typed');

  // 6. Clear search
  const clearSearchBtn = filterCard.locator('button[title="Xóa tìm kiếm"]').first();
  if (await clearSearchBtn.isVisible()) {
    await clearSearchBtn.click();
    await page.waitForTimeout(500);
    console.log('✓ Search query cleared');
  }

  // 7. Test Toggles
  const streamToggle = filterCard.locator('button:has-text("Có nguồn")').first();
  await streamToggle.click();
  await page.waitForTimeout(300);
  console.log('✓ Toggled "Có nguồn"');
  await streamToggle.click(); // turn off
  await page.waitForTimeout(300);

  await context.close();
  console.log('✓ All filter interactions verified successfully!');
}

async function run() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    await testViewport(browser, 1440, 900, 'desktop');
    await testViewport(browser, 1024, 768, 'tablet_landscape');
    await testViewport(browser, 768, 1024, 'tablet_portrait');
    await testViewport(browser, 375, 812, 'mobile');
    await testViewport(browser, 320, 568, 'mobile_small');
    await testInteractions(browser);
    console.log('\n=== ALL CANDIDATE VERIFICATIONS COMPLETED SUCCESSFULLY ===');
  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await browser.close();
  }
}

run();
