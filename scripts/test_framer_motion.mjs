import { chromium } from "playwright";

async function testFramer() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Test by rendering a page with framer motion bundle or checking the live app
  await page.goto("http://localhost:3000/browse", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);

  const hasFramer = await page.evaluate(() => {
    return typeof window !== "undefined";
  });
  console.log("Page loaded:", hasFramer);
  await browser.close();
}

testFramer();
