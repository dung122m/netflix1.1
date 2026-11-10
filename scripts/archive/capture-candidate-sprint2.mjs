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
  console.log('=== CAPTURING SPRINT 2 CANDIDATE SNAPSHOTS ===');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // 1. DESKTOP VIEWPORT (1440x900)
    console.log('\n[Desktop: 1440x900] Loading homepage...');
    const contextDesk = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      locale: 'vi-VN'
    });
    const pageDesk = await contextDesk.newPage();
    await pageDesk.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await pageDesk.waitForSelector('section.hero-cinema-section', { timeout: 15000 });
    await pageDesk.addStyleTag({ content: '*, *::before, *::after { transition-duration: 0.001s !important; animation-duration: 0.001s !important; }' });

    // Wait for fonts & hero image
    await pageDesk.evaluate(async () => {
      if (document.fonts) await document.fonts.ready;
      const heroImg = document.querySelector('section.hero-cinema-section img');
      if (heroImg && !heroImg.complete) {
        await new Promise(r => {
          heroImg.addEventListener('load', r, { once: true });
          heroImg.addEventListener('error', r, { once: true });
          setTimeout(r, 4000);
        });
      }
    });
    await pageDesk.waitForTimeout(800);

    // A. HeroFeatured Desktop candidate
    const heroDesk = pageDesk.locator('section.hero-cinema-section').first();
    const heroDeskPath = join(CANDIDATES_DIR, 'hero_featured_desktop_1440x900.png');
    await heroDesk.screenshot({ path: heroDeskPath });
    console.log('✓ Captured: hero_featured_desktop_1440x900.png');

    // B. HomeGenreExploreBar Desktop (Default with fade edge)
    const genreSection = pageDesk.locator('section[aria-label="Khám phá theo thể loại"]').first();
    if (await genreSection.count() > 0) {
      const genreDeskPath = join(CANDIDATES_DIR, 'genre_explore_bar_default_desktop_1440px.png');
      await genreSection.screenshot({ path: genreDeskPath });
      console.log('✓ Captured: genre_explore_bar_default_desktop_1440px.png');

      // Scroll to end to test fade edge disappears
      const scrollDiv = genreSection.locator('div[class*="overflow-x-auto"]').first();
      await scrollDiv.evaluate(el => el.scrollTo({ left: el.scrollWidth, behavior: 'instant' }));
      await pageDesk.waitForTimeout(300);

      const genreScrolledPath = join(CANDIDATES_DIR, 'genre_explore_bar_scrolled_desktop_1440px.png');
      await genreSection.screenshot({ path: genreScrolledPath });
      console.log('✓ Captured: genre_explore_bar_scrolled_desktop_1440px.png (scrolled to end)');
    }
    await contextDesk.close();

    // 2. MOBILE VIEWPORT (375x812)
    console.log('\n[Mobile: 375x812] Loading homepage...');
    const contextMob = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
      locale: 'vi-VN'
    });
    const pageMob = await contextMob.newPage();
    await pageMob.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await pageMob.waitForSelector('section.hero-cinema-section', { timeout: 15000 });
    await pageMob.addStyleTag({ content: '*, *::before, *::after { transition-duration: 0.001s !important; animation-duration: 0.001s !important; }' });

    await pageMob.evaluate(async () => {
      if (document.fonts) await document.fonts.ready;
      const heroImg = document.querySelector('section.hero-cinema-section img');
      if (heroImg && !heroImg.complete) {
        await new Promise(r => {
          heroImg.addEventListener('load', r, { once: true });
          heroImg.addEventListener('error', r, { once: true });
          setTimeout(r, 4000);
        });
      }
    });
    await pageMob.waitForTimeout(800);

    // A. HeroFeatured Mobile candidate
    const heroMob = pageMob.locator('section.hero-cinema-section').first();
    const heroMobPath = join(CANDIDATES_DIR, 'hero_featured_mobile_375x812.png');
    await heroMob.screenshot({ path: heroMobPath });
    console.log('✓ Captured: hero_featured_mobile_375x812.png');

    // B. HomeGenreExploreBar Mobile
    const genreSectionMob = pageMob.locator('section[aria-label="Khám phá theo thể loại"]').first();
    if (await genreSectionMob.count() > 0) {
      const genreMobPath = join(CANDIDATES_DIR, 'genre_explore_bar_mobile_375px.png');
      await genreSectionMob.screenshot({ path: genreMobPath });
      console.log('✓ Captured: genre_explore_bar_mobile_375px.png');
    }

    await contextMob.close();
    console.log('\n=== SPRINT 2 CANDIDATE CAPTURE COMPLETE ===');
  } finally {
    await browser.close();
  }
}

run().catch(e => {
  console.error('Candidate capture error:', e);
  process.exit(1);
});
