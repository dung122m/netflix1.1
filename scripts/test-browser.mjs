import { chromium } from 'playwright';

async function run() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
    locale: 'vi-VN',
    extraHTTPHeaders: {
      'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
    }
  });

  const page = await context.newPage();
  console.log('Navigating to https://www.netflix.com/vn/...');
  try {
    const response = await page.goto('https://www.netflix.com/vn/', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    console.log('Status code:', response?.status());
    console.log('Final URL:', page.url());
    console.log('Page Title:', await page.title());
    
    // Take a screenshot to verify
    await page.screenshot({ path: 'test-screenshot.png', fullPage: false });
    console.log('Screenshot saved to test-screenshot.png');
  } catch (error) {
    console.error('Error during navigation:', error);
  } finally {
    await browser.close();
  }
}

run();
