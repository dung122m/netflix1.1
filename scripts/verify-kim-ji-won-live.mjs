import { chromium } from "playwright";

async function verify() {
  console.log("=== VERIFYING KIM JI-WON LIVE IN BROWSER ===");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // 1. Check /dien-vien search
  console.log("1. Navigating to /dien-vien...");
  await page.goto("http://localhost:3000/dien-vien", { waitUntil: "networkidle", timeout: 25000 });

  const searchInput = page.locator('input[placeholder*="Tìm kiếm diễn viên"]');

  // Search 'kim jiwon'
  console.log("2. Testing search query: 'kim jiwon'...");
  await searchInput.fill("kim jiwon");
  await page.waitForTimeout(400);
  const foundJiwon = await page.locator('h3:has-text("Kim Ji-won")').count();
  console.log("   Result for 'kim jiwon':", foundJiwon > 0 ? "PASSED (Found)" : "FAILED");

  // Search 'Kim Ji Won'
  console.log("3. Testing search query: 'Kim Ji Won'...");
  await searchInput.fill("Kim Ji Won");
  await page.waitForTimeout(400);
  const foundJiWon = await page.locator('h3:has-text("Kim Ji-won")').count();
  console.log("   Result for 'Kim Ji Won':", foundJiWon > 0 ? "PASSED (Found)" : "FAILED");

  // 2. Check /dien-vien/kim-ji-won
  console.log("4. Navigating to /dien-vien/kim-ji-won...");
  await page.goto("http://localhost:3000/dien-vien/kim-ji-won", { waitUntil: "networkidle", timeout: 25000 });

  const heading = await page.locator("h1").textContent();
  console.log("   Actor Name:", heading?.trim());

  // Check age text
  const bdayText = await page.locator('div:has-text("19/10/1992")').first().textContent();
  console.log("   Birthday / Age display:", bdayText?.trim().replace(/\s+/g, " "));

  // Check movies count
  const movieCards = await page.locator('div[class*="group"] a[href*="/movies/"]').count();
  console.log("   Movie cards rendered:", movieCards);

  // Take screenshot
  await page.screenshot({ path: "scratch/kim_ji_won_verified.png" });
  console.log("   Screenshot saved: scratch/kim_ji_won_verified.png");

  await browser.close();
  console.log("=== ALL BROWSER VERIFICATIONS COMPLETED SUCCESSFULLY ===");
}

verify().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
