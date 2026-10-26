import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ARTIFACT_DIR = "C:/Users/a0326/.gemini/antigravity-ide/brain/852991a4-c03e-40db-91d5-b0e07daf7314";

async function run() {
  console.log("=== BẮT ĐẦU KIỂM THỬ BROWSER WATCH HISTORY ===");
  const browser = await chromium.launch({ headless: true });

  const consoleErrors = [];

  // Tạo dataset giả lập 50 phim trong isolated context
  // 45 phim đang xem dở (tiến độ 10% - 60%)
  // 5 phim đã xem xong (tiến độ 96% - 99%)
  const mockHistory = [];
  const now = Date.now();
  for (let i = 1; i <= 50; i++) {
    const isCompleted = i <= 5; // 5 phim đầu tiên xem >= 95%
    const durationSeconds = 3600;
    const progressSeconds = isCompleted ? 3480 : 1200; // 3480/3600 = 96.6% (> 95%)
    mockHistory.push({
      slug: `phim-test-${i}`,
      title: `Phim Thử Nghiệm ${i}`,
      poster: "https://phimimg.com/upload/vod/20231201-1/b9bfbda8d01150cce89aee8ecf16751c.jpg",
      thumb: "https://phimimg.com/upload/vod/20231201-1/b9bfbda8d01150cce89aee8ecf16751c.jpg",
      progressSeconds,
      durationSeconds,
      episodeSlug: `tap-${(i % 5) + 1}`,
      episodeName: `Tập ${(i % 5) + 1}`,
      updatedAt: now - (50 - i) * 60000,
    });
  }

  // 1. KIỂM THỬ DESKTOP
  console.log("--- 1. Kiểm thử Desktop (1280x800) ---");
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const desktopPage = await desktopContext.newPage();
  desktopPage.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(`[Desktop Console Error] ${msg.text()}`);
    }
  });

  // Nạp mock data vào localStorage trước khi load trang
  await desktopPage.addInitScript((items) => {
    localStorage.setItem("nanaflix_watch_history", JSON.stringify(items));
  }, mockHistory);

  // A. Truy cập Trang chủ kiểm tra Hàng Tiếp tục xem
  await desktopPage.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await desktopPage.waitForTimeout(1000);

  // Kiểm tra section Tiếp tục xem
  const continueWatchingSection = desktopPage.locator("section:has-text('Tiếp tục xem')");
  const isSectionVisible = await continueWatchingSection.isVisible();
  console.log("Hàng Tiếp tục xem hiển thị:", isSectionVisible);

  // Đếm số card rendered trong hàng Tiếp tục xem
  const continueCards = desktopPage.locator("section:has-text('Tiếp tục xem') .group.relative.flex-none");
  const continueCardCount = await continueCards.count();
  console.log("Số card render trong hàng Tiếp tục xem:", continueCardCount);
  if (continueCardCount > 15) {
    throw new Error(`FAIL: Hàng Tiếp tục xem render ${continueCardCount} card (vượt quá 15)!`);
  }

  // Chụp ảnh hàng Tiếp tục xem trên trang chủ
  const shotHomeDesktop = path.join(ARTIFACT_DIR, "continue_watching_home_desktop.png");
  await continueWatchingSection.screenshot({ path: shotHomeDesktop });
  console.log("Saved screenshot:", shotHomeDesktop);

  // B. Truy cập trang /my-list?tab=history
  console.log("--- 2. Kiểm thử Trang /my-list?tab=history (Desktop) ---");
  await desktopPage.goto("http://localhost:3000/my-list?tab=history", { waitUntil: "networkidle" });
  await desktopPage.waitForTimeout(1000);

  // Kiểm tra header badge
  const headerCountBadge = await desktopPage.locator("text=50 phim đã xem").isVisible();
  console.log("Header badge '50 phim đã xem' hiển thị:", headerCountBadge);

  const tabBadge = await desktopPage.locator("button:has-text('Lịch sử xem (50)')").isVisible();
  console.log("Tab badge 'Lịch sử xem (50)' hiển thị:", tabBadge);

  // Đếm card ban đầu trong History grid
  const initialCards = desktopPage.locator(".grid.grid-cols-2 a[href*='/movies/phim-test-']");
  const initialCount = await initialCards.count();
  console.log("Số card render ban đầu trong History grid:", initialCount);
  if (initialCount !== 20) {
    throw new Error(`FAIL: Ban đầu mong đợi 20 card, thực tế render ${initialCount}`);
  }

  // Chụp ảnh state ban đầu 20 card + nút 'Xem thêm 20 phim'
  const shotHistory20 = path.join(ARTIFACT_DIR, "history_grid_20_desktop.png");
  await desktopPage.screenshot({ path: shotHistory20, fullPage: false });
  console.log("Saved screenshot:", shotHistory20);

  // Kiểm tra nút 'Xem thêm 20 phim'
  const loadMoreBtn = desktopPage.locator("button:has-text('Xem thêm 20 phim')");
  const isLoadMoreVisible = await loadMoreBtn.isVisible();
  console.log("Nút 'Xem thêm 20 phim' hiển thị:", isLoadMoreVisible);
  if (!isLoadMoreVisible) {
    throw new Error("FAIL: Nút 'Xem thêm 20 phim' không hiển thị khi tổng phim = 50!");
  }

  // Click 'Xem thêm 20 phim' lần 1 -> 40 card
  await loadMoreBtn.click();
  await desktopPage.waitForTimeout(500);
  const countAfter1 = await initialCards.count();
  console.log("Số card render sau click 1:", countAfter1);
  if (countAfter1 !== 40) {
    throw new Error(`FAIL: Sau click 1 mong đợi 40 card, thực tế render ${countAfter1}`);
  }

  // Click 'Xem thêm 20 phim' lần 2 -> 50 card (toàn bộ)
  await loadMoreBtn.click();
  await desktopPage.waitForTimeout(500);
  const countAfter2 = await initialCards.count();
  console.log("Số card render sau click 2:", countAfter2);
  if (countAfter2 !== 50) {
    throw new Error(`FAIL: Sau click 2 mong đợi 50 card, thực tế render ${countAfter2}`);
  }

  // Kiểm tra nút 'Xem thêm 20 phim' biến mất khi đã render đủ 50 phim
  const isBtnHidden = !(await loadMoreBtn.isVisible());
  console.log("Nút 'Xem thêm 20 phim' biến mất khi đã render đủ:", isBtnHidden);
  if (!isBtnHidden) {
    throw new Error("FAIL: Nút 'Xem thêm 20 phim' vẫn hiển thị dù đã render toàn bộ 50 card!");
  }

  const shotHistory50 = path.join(ARTIFACT_DIR, "history_grid_50_desktop.png");
  await desktopPage.screenshot({ path: shotHistory50, fullPage: false });
  console.log("Saved screenshot:", shotHistory50);

  // 3. KIỂM THỬ MOBILE VIEWPORT (390x844)
  console.log("--- 3. Kiểm thử Mobile Viewport (390x844) ---");
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const mobilePage = await mobileContext.newPage();
  mobilePage.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(`[Mobile Console Error] ${msg.text()}`);
    }
  });

  await mobilePage.addInitScript((items) => {
    localStorage.setItem("nanaflix_watch_history", JSON.stringify(items));
  }, mockHistory);

  await mobilePage.goto("http://localhost:3000/my-list?tab=history", { waitUntil: "networkidle" });
  await mobilePage.waitForTimeout(1000);

  // Kiểm tra mobile không bị vỡ layout
  const mobileInitialCards = await mobilePage.locator(".grid.grid-cols-2 a[href*='/movies/phim-test-']").count();
  console.log("Mobile grid card count ban đầu:", mobileInitialCards);
  if (mobileInitialCards !== 20) {
    throw new Error(`FAIL: Mobile mong đợi 20 card ban đầu, thực tế ${mobileInitialCards}`);
  }

  const shotHistoryMobile = path.join(ARTIFACT_DIR, "history_grid_mobile.png");
  await mobilePage.screenshot({ path: shotHistoryMobile, fullPage: false });
  console.log("Saved screenshot:", shotHistoryMobile);

  await browser.close();

  console.log("=== HOÀN TẤT KIỂM THỬ BROWSER ===");
  console.log("Console errors:", consoleErrors.length === 0 ? "0 lỗi (PASS)" : consoleErrors);
}

run().catch((err) => {
  console.error("Test Browser thất bại:", err);
  process.exit(1);
});
