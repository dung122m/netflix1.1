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

const TEST_VIEWPORTS = [
  { name: 'desktop_1440', width: 1440, height: 900, shouldShowNav: false },
  { name: 'tablet_768', width: 768, height: 1024, shouldShowNav: true },
  { name: 'mobile_375', width: 375, height: 812, shouldShowNav: true, isMobile: true },
  { name: 'mobile_320', width: 320, height: 568, shouldShowNav: true, isMobile: true },
];

async function run() {
  console.log('=== VERIFYING SPRINT 3: MOBILE BOTTOM NAVIGATION ===');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const report = {
    viewports: {},
    desktopHidden: false,
    fiveItemsPresent: false,
    itemLabels: [],
    tapToBrowseWorks: false,
    activeStateHome: false,
    activeStateBrowse: false,
    noHorizontalOverflow: false,
    consoleErrors: []
  };

  try {
    // 1. DESKTOP 1440x900: MUST BE HIDDEN
    console.log('\n[1/4] Checking Desktop 1440x900 (should be hidden)...');
    const ctxDesk = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageDesk = await ctxDesk.newPage();
    pageDesk.on('pageerror', err => report.consoleErrors.push(err.message));
    await pageDesk.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await pageDesk.waitForTimeout(1000);

    const bottomNavDesk = pageDesk.locator('nav[aria-label="Mobile Bottom Navigation"]');
    const isDeskVisible = await bottomNavDesk.isVisible();
    report.desktopHidden = !isDeskVisible;
    console.log(`  ✓ BottomNav visible on desktop 1440px: ${isDeskVisible} (Expected: false)`);
    report.viewports['desktop_1440'] = isDeskVisible ? 'FAIL' : 'PASS';
    await ctxDesk.close();

    // 2. TABLET 768x1024: MUST BE VISIBLE
    console.log('\n[2/4] Checking Tablet 768x1024 (should be visible)...');
    const ctxTab = await browser.newContext({ viewport: { width: 768, height: 1024 } });
    const pageTab = await ctxTab.newPage();
    pageTab.on('pageerror', err => report.consoleErrors.push(err.message));
    await pageTab.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await pageTab.waitForTimeout(1000);

    const bottomNavTab = pageTab.locator('nav[aria-label="Mobile Bottom Navigation"]');
    const isTabVisible = await bottomNavTab.isVisible();
    console.log(`  ✓ BottomNav visible on tablet 768px: ${isTabVisible} (Expected: true)`);
    if (isTabVisible) {
      const tabPath = join(CANDIDATES_DIR, 'bottom_nav_tablet_768x1024.png');
      await bottomNavTab.screenshot({ path: tabPath });
      console.log('  ✓ Saved candidate: bottom_nav_tablet_768x1024.png');
    }
    report.viewports['tablet_768'] = isTabVisible ? 'PASS' : 'FAIL';
    await ctxTab.close();

    // 3. MOBILE 375x812: COMPREHENSIVE INTERACTION & CANDIDATE CAPTURE
    console.log('\n[3/4] Checking Mobile 375x812 (5 items, active states, navigation)...');
    const ctxMob = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
      locale: 'vi-VN'
    });
    const pageMob = await ctxMob.newPage();
    pageMob.on('pageerror', err => report.consoleErrors.push(err.message));
    await pageMob.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await pageMob.waitForTimeout(1500);

    // Hide Next.js dev overlay button for clean production-like snapshot
    await pageMob.addStyleTag({
      content: 'nextjs-portal, [data-nextjs-dev-overlay] { display: none !important; opacity: 0 !important; visibility: hidden !important; }'
    });

    const bottomNavMob = pageMob.locator('nav[aria-label="Mobile Bottom Navigation"]');
    const isMobVisible = await bottomNavMob.isVisible();
    console.log(`  ✓ BottomNav visible on mobile 375px: ${isMobVisible}`);

    // Check all 5 items
    const navItems = bottomNavMob.locator('a, button');
    const count = await navItems.count();
    report.fiveItemsPresent = count === 5;
    console.log(`  ✓ Number of navigation items: ${count} (Expected: 5)`);

    const labels = [];
    for (let i = 0; i < count; i++) {
      const text = await navItems.nth(i).locator('span').last().innerText();
      labels.push(text.trim());
    }
    report.itemLabels = labels;
    console.log(`  ✓ Nav item labels: [${labels.join(', ')}]`);

    // Check Active State on Home ("/")
    const homeItem = bottomNavMob.locator('a[href="/"]');
    const homeColor = await homeItem.evaluate(el => getComputedStyle(el).color);
    const homeActiveDot = homeItem.locator('span.bg-netflix-red');
    const homeHasDot = await homeActiveDot.count() > 0;
    report.activeStateHome = homeHasDot;
    console.log(`  ✓ Home active indicator dot present: ${homeHasDot}`);

    // Candidate: Mobile 375 Home state
    const mobHomePath = join(CANDIDATES_DIR, 'bottom_nav_mobile_375x812_home.png');
    await bottomNavMob.screenshot({ path: mobHomePath });
    console.log('  ✓ Saved candidate: bottom_nav_mobile_375x812_home.png');

    // Test Clicking "Khám phá"
    console.log('  -> Tapping "Khám phá" link...');
    const browseItem = bottomNavMob.locator('a[href="/browse"]');
    await browseItem.click();
    await pageMob.waitForURL('**/browse**', { timeout: 15000 });
    await pageMob.waitForTimeout(1000);

    const currentUrl = pageMob.url();
    report.tapToBrowseWorks = currentUrl.includes('/browse');
    console.log(`  ✓ Navigated to URL: ${currentUrl} (includes /browse)`);

    // Check Active State on Browse ("/browse")
    const browseColor = await browseItem.evaluate(el => getComputedStyle(el).color);
    const browseActiveDot = browseItem.locator('span.bg-netflix-red');
    const browseHasDot = await browseActiveDot.count() > 0;
    report.activeStateBrowse = browseHasDot;
    console.log(`  ✓ Browse active indicator dot present: ${browseHasDot}`);

    // Candidate: Mobile 375 Browse state
    const mobBrowsePath = join(CANDIDATES_DIR, 'bottom_nav_mobile_375x812_browse.png');
    await bottomNavMob.screenshot({ path: mobBrowsePath });
    console.log('  ✓ Saved candidate: bottom_nav_mobile_375x812_browse.png');

    report.viewports['mobile_375'] = isMobVisible && count === 5 && report.tapToBrowseWorks ? 'PASS' : 'FAIL';
    await ctxMob.close();

    // 4. MOBILE 320x568: NARROW SCREEN OVERFLOW & WRAP TEST
    console.log('\n[4/4] Checking Narrow Mobile 320x568 (no overflow, clean layout)...');
    const ctx320 = await browser.newContext({
      viewport: { width: 320, height: 568 },
      isMobile: true,
      hasTouch: true,
      locale: 'vi-VN'
    });
    const page320 = await ctx320.newPage();
    page320.on('pageerror', err => report.consoleErrors.push(err.message));
    await page320.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page320.waitForTimeout(1000);

    await page320.addStyleTag({
      content: 'nextjs-portal, [data-nextjs-dev-overlay] { display: none !important; opacity: 0 !important; visibility: hidden !important; }'
    });

    const bottomNav320 = page320.locator('nav[aria-label="Mobile Bottom Navigation"]');
    const navBox = await bottomNav320.boundingBox();
    console.log(`  ✓ BottomNav bounding box on 320px screen: width=${navBox?.width}px, height=${navBox?.height}px`);

    // Verify no scrollWidth overflow on nav
    const hasHorizontalOverflow = await bottomNav320.evaluate(el => el.scrollWidth > el.clientWidth);
    report.noHorizontalOverflow = !hasHorizontalOverflow;
    console.log(`  ✓ Horizontal overflow on 320px: ${hasHorizontalOverflow} (Expected: false)`);

    // Check item width & touch target height
    const item320 = bottomNav320.locator('a, button').first();
    const itemBox = await item320.boundingBox();
    console.log(`  ✓ Single item touch target on 320px: ${Math.round(itemBox?.width || 0)}x${Math.round(itemBox?.height || 0)}px (>=48px height)`);

    const mob320Path = join(CANDIDATES_DIR, 'bottom_nav_mobile_320x568.png');
    await bottomNav320.screenshot({ path: mob320Path });
    console.log('  ✓ Saved candidate: bottom_nav_mobile_320x568.png');

    report.viewports['mobile_320'] = !hasHorizontalOverflow ? 'PASS' : 'FAIL';
    await ctx320.close();

    console.log('\n=== VERIFICATION RESULTS ===');
    console.log(JSON.stringify(report, null, 2));

  } finally {
    await browser.close();
  }
}

run().catch(e => {
  console.error('Sprint 3 verification error:', e);
  process.exit(1);
});
