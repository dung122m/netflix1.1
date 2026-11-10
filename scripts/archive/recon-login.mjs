import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SITE_KEY = 'netflix-3f78535a';
const PAGE_KEY = 'login-f4e3c2b1'; // Unique key for login

const paths = {
  research: `docs/research/${SITE_KEY}/${PAGE_KEY}`,
  screenshots: `docs/design-references/${SITE_KEY}/${PAGE_KEY}`,
  components: `src/components/sites/${SITE_KEY}/${PAGE_KEY}`
};

// Create directories
Object.values(paths).forEach(p => {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

async function run() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'vi-VN'
  });
  const page = await context.newPage();
  console.log('Navigating to Netflix VN Login...');
  await page.goto('https://www.netflix.com/vn/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Screenshot
  await page.screenshot({ path: path.join(paths.screenshots, 'login-desktop.png'), fullPage: true });

  // Extract DOM
  const domReport = await page.evaluate(() => {
    // Basic extraction of the login form
    const form = document.querySelector('form');
    return {
      tagName: form?.tagName,
      className: form?.className,
      inner: form?.innerHTML.slice(0, 500)
    };
  });
  
  fs.writeFileSync(path.join(paths.research, 'login_dom.json'), JSON.stringify(domReport, null, 2));
  
  await browser.close();
  console.log('Reconnaissance done.');
}
run().catch(console.error);
