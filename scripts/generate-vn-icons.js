const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// SVG content for high quality Vietnam Flag App & Favicon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="vn-red-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#EA1D24"/>
      <stop offset="100%" stop-color="#DA251D"/>
    </linearGradient>
    <linearGradient id="vn-star-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFF566"/>
      <stop offset="50%" stop-color="#FFDD00"/>
      <stop offset="100%" stop-color="#E5A900"/>
    </linearGradient>
    <filter id="star-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Background: Rounded App Squircle -->
  <rect x="16" y="16" width="480" height="480" rx="108" fill="url(#vn-red-grad)"/>

  <!-- Golden 5-point star of Vietnam (Tâm: 256, 256) -->
  <polygon
    points="
      256, 106
      290.1, 211
      401, 211
      311.2, 276.3
      345.5, 381.8
      256, 316.7
      166.5, 381.8
      200.8, 276.3
      111, 211
      221.9, 211
    "
    fill="url(#vn-star-grad)"
    filter="url(#star-shadow)"
  />
</svg>`;

async function generateIcons() {
  const publicDir = path.resolve(process.cwd(), 'public');
  const appDir = path.resolve(process.cwd(), 'src/app');
  const svgBuffer = Buffer.from(svgContent);

  // 1. Write icon.svg
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent);
  fs.writeFileSync(path.join(appDir, 'icon.svg'), svgContent);
  console.log('Wrote icon.svg');

  // 2. Generate icon-512.png
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon-512.png'));
  console.log('Generated icon-512.png');

  // 3. Generate icon-192.png
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'icon-192.png'));
  console.log('Generated icon-192.png');

  // 4. Generate apple-touch-icon.png (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png');

  // 5. Generate 48x48 PNG for favicon.ico
  const favBuffer = await sharp(svgBuffer)
    .resize(48, 48)
    .png()
    .toBuffer();
  
  // Write PNG as favicon.ico (modern browsers fully support PNG-encoded .ico / direct favicon)
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), favBuffer);
  fs.writeFileSync(path.join(appDir, 'favicon.ico'), favBuffer);
  console.log('Generated favicon.ico');

  console.log('All icons generated successfully!');
}

generateIcons().catch(err => {
  console.error(err);
  process.exit(1);
});
