const path = require('path');
const { chromium } = require('playwright-core');

(async () => {
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1200px;
    height: 630px;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background: #000000;
    color: #ffffff;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    user-select: none;
  }

  /* Luxurious subtle cinema ambient glow */
  .glow {
    position: absolute;
    width: 900px;
    height: 500px;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: radial-gradient(ellipse at center, rgba(229, 9, 20, 0.22) 0%, rgba(229, 9, 20, 0.06) 45%, transparent 70%);
    pointer-events: none;
    z-index: 1;
  }

  /* Subtle bottom vignette */
  .vignette {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 50% 50%, transparent 60%, rgba(0, 0, 0, 0.7) 100%);
    pointer-events: none;
    z-index: 2;
  }

  /* Main content container */
  .content {
    position: relative;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  /* Official Logo Row */
  .logo-row {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 24px;
    filter: drop-shadow(0 14px 35px rgba(229, 9, 20, 0.45));
  }

  /* Vietnam Flag Pill */
  .flag-pill {
    width: 110px;
    height: 78px;
    border-radius: 23px;
    background: linear-gradient(180deg, #EA1D24 0%, #DA251D 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 24px;
    box-shadow: 0 12px 32px rgba(218, 37, 29, 0.6), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.45);
  }

  .flag-pill svg {
    width: 58px;
    height: 58px;
  }

  /* "Nanaflix" Wordmark */
  .logo-text {
    font-size: 104px;
    font-weight: 800;
    color: #ffffff;
    letter-spacing: -3.5px;
    line-height: 1;
    text-shadow: 0 4px 24px rgba(0, 0, 0, 0.8);
  }

  /* "VN" badge */
  .logo-vn {
    font-size: 36px;
    font-weight: 700;
    color: #94A3B8;
    margin-left: 14px;
    align-self: flex-start;
    margin-top: 4px;
    letter-spacing: 1px;
  }

  /* Primary Tagline */
  .tagline {
    font-size: 26px;
    font-weight: 700;
    color: #f1f5f9;
    letter-spacing: 4px;
    text-transform: uppercase;
    margin-bottom: 20px;
    text-shadow: 0 2px 12px rgba(0, 0, 0, 0.9);
  }

  .tagline span {
    color: #e50914;
    margin: 0 10px;
  }

  /* Subtitle line */
  .sub-line {
    font-size: 17px;
    font-weight: 400;
    color: #94a3b8;
    letter-spacing: 1px;
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #64748b;
  }
</style>
</head>
<body>
  <div class="glow"></div>
  <div class="vignette"></div>

  <div class="content">
    <!-- Official Logo -->
    <div class="logo-row">
      <div class="flag-pill">
        <svg viewBox="0 0 24 24" fill="none">
          <polygon points="12,2 14.8,8.2 21.6,8.4 16.2,12.7 18.2,19.3 12,15.2 5.8,19.3 7.8,12.7 2.4,8.4 9.2,8.2" fill="url(#star-gold)" />
          <defs>
            <linearGradient id="star-gold" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#FFF200" />
              <stop offset="100%" stop-color="#FFDE00" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div class="logo-text">Nanaflix</div>
      <div class="logo-vn">VN</div>
    </div>

    <!-- Tagline -->
    <div class="tagline">
      Thế Giới Điện Ảnh <span>&bull;</span> Thể Thao Đỉnh Cao
    </div>

    <!-- Clean sub categories -->
    <div class="sub-line">
      <span>Kho Phim Chiếu Rạp 4K</span>
      <div class="dot"></div>
      <span>Trực Tiếp Bóng Đá</span>
      <div class="dot"></div>
      <span>Anime Vietsub</span>
      <div class="dot"></div>
      <span>Hoàn Toàn Miễn Phí</span>
    </div>
  </div>
</body>
</html>`;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(html);
  await page.waitForTimeout(300);

  const outputPath = 'C:/Users/a0326/.gemini/antigravity/brain/6c2aeab9-a6ff-446d-a0eb-f67876200396/scratch/nanaflix_simple_clean.jpg';
  await page.screenshot({ path: outputPath, type: 'jpeg', quality: 95 });
  
  // Update web assets directly
  await page.screenshot({ path: path.resolve('public/default-hero.jpg'), type: 'jpeg', quality: 95 });
  await page.screenshot({ path: path.resolve('public/og-banner.jpg'), type: 'jpeg', quality: 95 });
  await page.screenshot({ path: path.resolve('src/app/opengraph-image.jpg'), type: 'jpeg', quality: 95 });

  await browser.close();
  console.log('Successfully generated clean simple banner and updated all web assets!');
})();
