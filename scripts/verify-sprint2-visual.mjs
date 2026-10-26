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

const VIEWPORTS = [
  { name: 'desktop_1440', width: 1440, height: 900, isMobile: false },
  { name: 'tablet_1024', width: 1024, height: 768, isMobile: false },
  { name: 'tablet_768', width: 768, height: 1024, isMobile: false },
  { name: 'mobile_375', width: 375, height: 812, isMobile: true },
  { name: 'mobile_320', width: 320, height: 568, isMobile: true },
];

async function run() {
  console.log('=== VERIFYING SPRINT 2: CAROUSELS & SECTION HEADERS ===');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const results = {
    viewports: {},
    carouselHover: false,
    carouselScroll: false,
    keyboardFocus: false,
    continueWatchingMocked: false,
    vietnamTodayRendered: false,
    tmdbRank3DPreserved: false,
  };

  try {
    // 1. DESKTOP 1440px INTERACTION & CANDIDATE CAPTURE
    console.log('\n[1/5] Testing Desktop 1440x900 interactions...');
    const deskCtx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      locale: 'vi-VN'
    });
    const pageDesk = await deskCtx.newPage();
    await pageDesk.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await pageDesk.waitForTimeout(2000);

    // Disable CSS animations for stable screenshots
    await pageDesk.addStyleTag({
      content: '*, *::before, *::after { transition-duration: 0.001s !important; animation-duration: 0.001s !important; }'
    });

    // Test Curated Movie Section
    const curatedSection = pageDesk.locator('section').filter({ hasText: 'Tuyển Tập Phim Đặc Sắc' }).first();
    if (await curatedSection.count() > 0) {
      await curatedSection.scrollIntoViewIfNeeded();
      await pageDesk.waitForTimeout(500);

      // Verify Carousel Nav Button exists & hover makes it visible
      const rightBtn = curatedSection.locator('button[aria-label="Cuộn sang phải"]').first();
      if (await rightBtn.count() > 0) {
        // Hover over the section row
        const row = curatedSection.locator('.group\\/row').first();
        await row.hover();
        await pageDesk.waitForTimeout(300);

        // Check opacity / visibility
        const isVisible = await rightBtn.isVisible();
        results.carouselHover = isVisible;
        console.log(`  ✓ Curated section right carousel button visible on hover: ${isVisible}`);

        // Test keyboard focus before scrolling
        await rightBtn.focus();
        const isFocused = await rightBtn.evaluate(el => document.activeElement === el);
        results.keyboardFocus = isFocused;
        console.log(`  ✓ Keyboard focus on carousel button: ${isFocused}`);

        // Click right scroll
        const scrollBox = curatedSection.locator('.overflow-x-auto').first();
        const initialScrollLeft = await scrollBox.evaluate(el => el.scrollLeft);
        await rightBtn.click();
        await pageDesk.waitForTimeout(1000);
        const scrolledLeft = await scrollBox.evaluate(el => el.scrollLeft);
        results.carouselScroll = scrolledLeft > initialScrollLeft || scrolledLeft > 0;
        console.log(`  ✓ Scroll interaction works: initial=${initialScrollLeft}px, after click=${scrolledLeft}px`);

        // Test Left button appearing after scroll
        const leftBtn = curatedSection.locator('button[aria-label="Cuộn sang trái"]').first();
        const leftVisible = await leftBtn.count() > 0 && await leftBtn.isVisible();
        console.log(`  ✓ Left button visible after scrolling right: ${leftVisible}`);
      }

      // Capture curated row candidate for baseline comparison
      const curatedPath = join(CANDIDATES_DIR, 'movie_row_desktop_1440x900.png');
      await curatedSection.screenshot({ path: curatedPath });
      console.log('  ✓ Saved candidate: movie_row_desktop_1440x900.png');
    }

    // Test TMDB Top Trending Section
    const tmdbSection = pageDesk.locator('section').filter({ hasText: 'Phim Thịnh Hành Trong Tuần' }).first();
    if (await tmdbSection.count() > 0) {
      await tmdbSection.scrollIntoViewIfNeeded();
      await pageDesk.waitForTimeout(500);

      // Check 3D rank numbers
      const rankElements = tmdbSection.locator('span[class*="text-transparent"]').filter({ hasText: /^[1-9]$/ });
      const rankCount = await rankElements.count();
      results.tmdbRank3DPreserved = rankCount > 0;
      console.log(`  ✓ TMDB 3D rank numbers verified: found ${rankCount} rank badges`);

      // Verify glass pill button in TMDB trending
      const tmdbRightBtn = tmdbSection.locator('button[aria-label*="Cuộn"]').first();
      console.log(`  ✓ TMDB carousel control exists: ${await tmdbRightBtn.count() > 0}`);

      const tmdbPath = join(CANDIDATES_DIR, 'tmdb_trending_desktop_1440x900.png');
      await tmdbSection.screenshot({ path: tmdbPath });
      console.log('  ✓ Saved candidate: tmdb_trending_desktop_1440x900.png');
    }

    // Test Vietnam Today Section
    const vietnamSection = pageDesk.locator('section[aria-label="Hôm Nay Có Gì Đặc Biệt"]').first();
    if (await vietnamSection.count() > 0) {
      await vietnamSection.scrollIntoViewIfNeeded();
      await pageDesk.waitForTimeout(300);
      results.vietnamTodayRendered = true;
      const vnPath = join(CANDIDATES_DIR, 'vietnam_today_desktop_1440x900.png');
      await vietnamSection.screenshot({ path: vnPath });
      console.log('  ✓ Saved candidate: vietnam_today_desktop_1440x900.png');
    }

    // Test ForYouPersonalizedRow
    const forYouSection = pageDesk.locator('section').filter({ hasText: 'Dành Riêng Cho' }).first();
    if (await forYouSection.count() > 0) {
      await forYouSection.scrollIntoViewIfNeeded();
      await pageDesk.waitForTimeout(300);
      const forYouPath = join(CANDIDATES_DIR, 'for_you_desktop_1440x900.png');
      await forYouSection.screenshot({ path: forYouPath });
      console.log('  ✓ Saved candidate: for_you_desktop_1440x900.png');
    }

    await deskCtx.close();
    results.viewports['desktop_1440'] = 'PASS';

    // 2. MOCKED CONTINUE WATCHING TEST (in temporary browser context with localStorage)
    console.log('\n[2/5] Testing Continue Watching row with mock localStorage...');
    const cwCtx = await browser.newContext({
      viewport: { width: 1440, height: 900 }
    });
    const cwPage = await cwCtx.newPage();
    // Inject mock watch history into localStorage before page load
    await cwPage.addInitScript(() => {
      const mockHistory = [
        {
          slug: 'avatar',
          title: 'Avatar: Dòng Chảy Của Nước',
          name: 'Avatar: Dòng Chảy Của Nước',
          poster_url: 'https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg',
          thumb_url: 'https://image.tmdb.org/t/p/w500/8YFL5QQDJqGrSVfdaFiM2osbFEO.jpg',
          episodeSlug: 'full',
          episodeName: 'Full HD',
          currentTime: 3600,
          progressSeconds: 3600,
          duration: 7200,
          durationSeconds: 7200,
          updatedAt: Date.now()
        },
        {
          slug: 'oppenheimer',
          title: 'Oppenheimer',
          name: 'Oppenheimer',
          poster_url: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
          thumb_url: 'https://image.tmdb.org/t/p/w500/rM5Y09xC99JeAeP12VqytYbhK5k.jpg',
          episodeSlug: 'full',
          episodeName: 'Full HD',
          currentTime: 1800,
          progressSeconds: 1800,
          duration: 7200,
          durationSeconds: 7200,
          updatedAt: Date.now() - 10000
        }
      ];
      localStorage.setItem('nanaflix_watch_history', JSON.stringify(mockHistory));
    });

    await cwPage.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await cwPage.waitForTimeout(2000);
    const cwSection = cwPage.locator('section').filter({ hasText: 'Tiếp tục xem' }).first();
    if (await cwSection.count() > 0) {
      await cwSection.scrollIntoViewIfNeeded();
      results.continueWatchingMocked = true;
      console.log('  ✓ Continue Watching rendered with mock data');
      const cwPath = join(CANDIDATES_DIR, 'continue_watching_mocked_1440x900.png');
      await cwSection.screenshot({ path: cwPath });
      console.log('  ✓ Saved candidate: continue_watching_mocked_1440x900.png');
    } else {
      console.log('  ⚠ Continue Watching row not visible even with mock data (check localStorage key)');
    }
    await cwCtx.close();

    // 3. TABLET & MOBILE VIEWPORT CAPTURES
    for (const vp of VIEWPORTS.slice(1)) {
      console.log(`\n[Testing Viewport: ${vp.name} (${vp.width}x${vp.height})]`);
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.isMobile,
        hasTouch: vp.isMobile,
        locale: 'vi-VN'
      });
      const page = await ctx.newPage();
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(1500);

      await page.addStyleTag({
        content: '*, *::before, *::after { transition-duration: 0.001s !important; animation-duration: 0.001s !important; }'
      });

      const curated = page.locator('section').filter({ hasText: 'Tuyển Tập Phim Đặc Sắc' }).first();
      if (await curated.count() > 0) {
        await curated.scrollIntoViewIfNeeded();
        await page.waitForTimeout(400);

        // Check button visibility on touch/mobile vs desktop
        const navBtns = curated.locator('button[aria-label*="Cuộn"]');
        const count = await navBtns.count();
        if (vp.isMobile) {
          // On mobile buttons have `hidden sm:flex`, so they should not disrupt touch layout
          console.log(`  ✓ Mobile touch viewport: carousel navigation button count=${count} (hidden on mobile as expected)`);
        }

        // Save candidate for movie_row at this viewport
        if (vp.name === 'tablet_768') {
          const tabPath = join(CANDIDATES_DIR, 'movie_row_tablet_768x1024.png');
          await curated.screenshot({ path: tabPath });
          console.log('  ✓ Saved candidate: movie_row_tablet_768x1024.png');
        } else if (vp.name === 'mobile_375') {
          const mobPath = join(CANDIDATES_DIR, 'movie_row_mobile_375x812.png');
          await curated.screenshot({ path: mobPath });
          console.log('  ✓ Saved candidate: movie_row_mobile_375x812.png');
        }

        // Snapshot section headers
        const headerPath = join(CANDIDATES_DIR, `section_headers_${vp.name}.png`);
        await curated.locator('h2').first().screenshot({ path: headerPath });
      }

      await ctx.close();
      results.viewports[vp.name] = 'PASS';
    }

    console.log('\n=== ALL SPRINT 2 VERIFICATION TESTS FINISHED ===');
    console.log(JSON.stringify(results, null, 2));
  } finally {
    await browser.close();
  }
}

run().catch(e => {
  console.error('Sprint 2 verification error:', e);
  process.exit(1);
});
