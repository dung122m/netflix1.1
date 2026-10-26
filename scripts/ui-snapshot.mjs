import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');
const BASELINE_DIR = join(ROOT_DIR, 'scratch', 'ui-baselines');
const CURRENT_STATE_DIR = join(BASELINE_DIR, 'current-state');
const APPROVED_DIR = join(BASELINE_DIR, 'approved');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const VIEWPORTS = {
  mobile: { width: 375, height: 812, isMobile: true, hasTouch: true, label: '375px' },
  tablet: { width: 768, height: 1024, isMobile: true, hasTouch: true, label: '768px' },
  desktop: { width: 1440, height: 900, isMobile: false, hasTouch: false, label: '1440px' }
};

// CSS đóng băng animations & transitions để đảm bảo tính nhất quán của snapshot
const STABILIZATION_CSS = `
  *, *::before, *::after {
    transition-duration: 0.001s !important;
    animation-duration: 0.001s !important;
    animation-play-state: paused !important;
    caret-color: transparent !important;
  }
`;

async function stabilizePage(page) {
  try {
    await page.addStyleTag({ content: STABILIZATION_CSS });
  } catch {}
  
  await page.evaluate(async () => {
    // Chờ font chữ render hoàn chỉnh
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    // Chờ ảnh chính tải xong
    const images = Array.from(document.querySelectorAll('img'));
    await Promise.all(
      images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
          setTimeout(resolve, 2000); // timeout an toàn
        });
      })
    );
  });
  
  // Đệm thêm 500ms ổn định bố cục sau hydration
  await page.waitForTimeout(500);
}

async function capture() {
  console.log('====================================================');
  console.log('   NANAFLIX P0 VISUAL QA — SNAPSHOT CAPTURE RUNNER   ');
  console.log('====================================================');
  console.log(`Target URL: ${BASE_URL}`);
  console.log(`Output Directory: ${CURRENT_STATE_DIR}\n`);

  mkdirSync(CURRENT_STATE_DIR, { recursive: true });
  mkdirSync(APPROVED_DIR, { recursive: true });

  const manifest = {
    capturedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    classification: 'current-state (UNAPPROVED)',
    viewports: VIEWPORTS,
    snapshots: []
  };

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    // ---------------------------------------------------------
    // 1. TRANG CHỦ & HERO FEATURED & MOVIE ROW (3 Viewports)
    // ---------------------------------------------------------
    for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
      console.log(`\n[Viewport: ${vpName.toUpperCase()} (${vp.label})] Capturing Homepage & Core Sections...`);
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.isMobile,
        hasTouch: vp.hasTouch,
        locale: 'vi-VN'
      });
      const page = await context.newPage();

      try {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForSelector('section.hero-cinema-section', { timeout: 15000 });
        await stabilizePage(page);

        // A. Viewport Snapshot (Trang chủ đầu trang)
        const homeFilename = `home_viewport_${vpName}_${vp.width}x${vp.height}.png`;
        const homePath = join(CURRENT_STATE_DIR, homeFilename);
        await page.screenshot({ path: homePath, fullPage: false });
        console.log(`  ✓ Saved: ${homeFilename}`);
        manifest.snapshots.push({
          name: homeFilename,
          component: 'Homepage (Above the fold)',
          scope: 'viewport',
          viewport: vpName,
          resolution: `${vp.width}x${vp.height}`
        });

        // B. HeroFeatured Element Snapshot
        const heroLocator = page.locator('section.hero-cinema-section').first();
        if (await heroLocator.count() > 0) {
          const heroFilename = `hero_featured_${vpName}_${vp.width}x${vp.height}.png`;
          const heroPath = join(CURRENT_STATE_DIR, heroFilename);
          await heroLocator.screenshot({ path: heroPath });
          console.log(`  ✓ Saved: ${heroFilename}`);
          manifest.snapshots.push({
            name: heroFilename,
            component: 'HeroFeatured',
            scope: 'element',
            viewport: vpName,
            resolution: `${vp.width}x${vp.height}`
          });
        }

        // C. Movie Row Element Snapshot (Hàng phim trang chủ)
        const rowLocator = page.locator('div.page-cinema-container div[class*="px-4"]').filter({
          has: page.locator('a[href*="/movies/"]')
        }).first();

        if (await rowLocator.count() > 0) {
          const rowFilename = `movie_row_${vpName}_${vp.width}x${vp.height}.png`;
          const rowPath = join(CURRENT_STATE_DIR, rowFilename);
          await rowLocator.screenshot({ path: rowPath });
          console.log(`  ✓ Saved: ${rowFilename}`);
          manifest.snapshots.push({
            name: rowFilename,
            component: 'MovieRow (Home Section)',
            scope: 'element',
            viewport: vpName,
            resolution: `${vp.width}x${vp.height}`
          });
        }
      } catch (err) {
        console.error(`  ✗ Error capturing homepage at ${vpName}:`, err.message);
      } finally {
        await context.close();
      }
    }

    // ---------------------------------------------------------
    // 2. MEDIACARD (Isolated Component - Desktop Default & Hover & Tooltip)
    // ---------------------------------------------------------
    console.log(`\n[Component: MediaCard] Capturing isolated card & hover states on Desktop...`);
    {
      const deskContext = await browser.newContext({
        viewport: { width: VIEWPORTS.desktop.width, height: VIEWPORTS.desktop.height },
        locale: 'vi-VN'
      });
      const deskPage = await deskContext.newPage();
      try {
        await deskPage.goto(`${BASE_URL}/browse`, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await deskPage.waitForSelector('div.group\\/card', { timeout: 15000 });
        await stabilizePage(deskPage);

        const cardLocator = deskPage.locator('div.group\\/card').first();
        if (await cardLocator.count() > 0) {
          // A. Trạng thái Default
          const cardDefaultName = `mediacard_default_desktop_1440px.png`;
          await cardLocator.screenshot({ path: join(CURRENT_STATE_DIR, cardDefaultName) });
          console.log(`  ✓ Saved: ${cardDefaultName}`);
          manifest.snapshots.push({
            name: cardDefaultName,
            component: 'MediaCard',
            scope: 'element',
            state: 'default',
            viewport: 'desktop',
            resolution: '1440px'
          });

          // B. Trạng thái Hover (card zoom nhẹ, xuất hiện cluster nút action)
          await cardLocator.hover();
          await deskPage.waitForTimeout(300);
          const cardHoverName = `mediacard_hover_desktop_1440px.png`;
          await cardLocator.screenshot({ path: join(CURRENT_STATE_DIR, cardHoverName) });
          console.log(`  ✓ Saved: ${cardHoverName}`);
          manifest.snapshots.push({
            name: cardHoverName,
            component: 'MediaCard',
            scope: 'element',
            state: 'hover',
            viewport: 'desktop',
            resolution: '1440px'
          });

          // C. Hover nút Thêm vào bộ sưu tập desktop (hiện Glass Tooltip)
          const desktopFolderBtn = cardLocator.locator('.hidden.sm\\:flex button[aria-label*="bộ sưu tập"]').first();
          if (await desktopFolderBtn.count() > 0) {
            await desktopFolderBtn.hover();
            await deskPage.waitForTimeout(300);
            const tooltipName = `mediacard_tooltip_collection_desktop_1440px.png`;
            await cardLocator.screenshot({ path: join(CURRENT_STATE_DIR, tooltipName) });
            console.log(`  ✓ Saved: ${tooltipName}`);
            manifest.snapshots.push({
              name: tooltipName,
              component: 'MediaCard (Tooltip Collection)',
              scope: 'element',
              state: 'hover-button',
              viewport: 'desktop',
              resolution: '1440px'
            });
          }
        }
      } catch (err) {
        console.error(`  ✗ Error capturing desktop MediaCard:`, err.message);
      } finally {
        await deskContext.close();
      }

      // Mobile MediaCard (Kiểm tra nút bấm cảm ứng trực tiếp, không phụ thuộc hover)
      console.log(`\n[Component: MediaCard] Capturing touch controls on Mobile...`);
      const mobContext = await browser.newContext({
        viewport: { width: VIEWPORTS.mobile.width, height: VIEWPORTS.mobile.height },
        isMobile: true,
        hasTouch: true,
        locale: 'vi-VN'
      });
      const mobPage = await mobContext.newPage();
      try {
        await mobPage.goto(`${BASE_URL}/browse`, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await mobPage.waitForSelector('div.group\\/card', { timeout: 15000 });
        await stabilizePage(mobPage);

        const mobCardLocator = mobPage.locator('div.group\\/card').first();
        if (await mobCardLocator.count() > 0) {
          const mobCardName = `mediacard_default_mobile_375px.png`;
          await mobCardLocator.screenshot({ path: join(CURRENT_STATE_DIR, mobCardName) });
          console.log(`  ✓ Saved: ${mobCardName}`);
          manifest.snapshots.push({
            name: mobCardName,
            component: 'MediaCard (Mobile Touch Controls)',
            scope: 'element',
            state: 'default',
            viewport: 'mobile',
            resolution: '375px'
          });
        }
      } catch (err) {
        console.error(`  ✗ Error capturing mobile MediaCard:`, err.message);
      } finally {
        await mobContext.close();
      }
    }

    // ---------------------------------------------------------
    // 3. POPUP XEM TRƯỚC PHIM / TRAILER MODAL
    // ---------------------------------------------------------
    console.log(`\n[Component: Trailer Modal / Preview Popup] Testing modal trigger...`);
    {
      const modalContext = await browser.newContext({
        viewport: { width: VIEWPORTS.desktop.width, height: VIEWPORTS.desktop.height },
        locale: 'vi-VN'
      });
      const modalPage = await modalContext.newPage();
      try {
        await modalPage.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await modalPage.waitForSelector('section.hero-cinema-section', { timeout: 15000 });
        await stabilizePage(modalPage);

        // Tìm nút Trailer có sẵn trên trang
        const trailerBtn = modalPage.locator('button:has-text("Xem Trailer"), button:has-text("Trailer")').first();
        if (await trailerBtn.count() > 0 && await trailerBtn.isVisible()) {
          await trailerBtn.click();
          await modalPage.waitForTimeout(1000); // chờ portal render
          
          const modalDialog = modalPage.locator('div[role="dialog"]').first();
          if (await modalDialog.count() > 0) {
            const modalName = `trailer_modal_preview_desktop_1440px.png`;
            await modalPage.screenshot({ path: join(CURRENT_STATE_DIR, modalName), fullPage: false });
            console.log(`  ✓ Saved: ${modalName}`);
            manifest.snapshots.push({
              name: modalName,
              component: 'TrailerModal (Preview Popup)',
              scope: 'viewport-modal',
              state: 'open',
              viewport: 'desktop',
              resolution: '1440px'
            });
          }
        } else {
          console.log(`  ℹ Trailer button not present on current hero slide, testing via direct route...`);
          // Thử tìm phim đầu tiên trên /browse để click vào trang chi tiết và mở trailer
          await modalPage.goto(`${BASE_URL}/browse`, { waitUntil: 'domcontentloaded', timeout: 20000 });
          await modalPage.waitForSelector('div.group\\/card a[href*="/movies/"]', { timeout: 15000 });
          const firstMovieLink = modalPage.locator('div.group\\/card a[href*="/movies/"]').first();
          const movieHref = await firstMovieLink.getAttribute('href');
          if (movieHref) {
            await modalPage.goto(`${BASE_URL}${movieHref}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
            await stabilizePage(modalPage);
            const detailTrailerBtn = modalPage.locator('button:has-text("Xem Trailer"), button:has-text("Trailer")').first();
            if (await detailTrailerBtn.count() > 0 && await detailTrailerBtn.isVisible()) {
              await detailTrailerBtn.click();
              await modalPage.waitForTimeout(1000);
              const modalName = `trailer_modal_preview_desktop_1440px.png`;
              await modalPage.screenshot({ path: join(CURRENT_STATE_DIR, modalName), fullPage: false });
              console.log(`  ✓ Saved: ${modalName}`);
              manifest.snapshots.push({
                name: modalName,
                component: 'TrailerModal (Detail Page Preview)',
                scope: 'viewport-modal',
                state: 'open',
                viewport: 'desktop',
                resolution: '1440px'
              });
            }
          }
        }
      } catch (err) {
        console.log(`  ℹ Trailer modal note:`, err.message);
      } finally {
        await modalContext.close();
      }
    }

    // Ghi manifest
    const manifestPath = join(CURRENT_STATE_DIR, 'snapshot_manifest.json');
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    console.log(`\n[Manifest] Snapshot manifest saved to: ${manifestPath}`);
    console.log(`Total snapshots captured: ${manifest.snapshots.length}`);

  } finally {
    await browser.close();
    console.log('Browser closed cleanly.');
  }
}

capture().catch(e => {
  console.error('Fatal snapshot runner error:', e);
  process.exit(1);
});
