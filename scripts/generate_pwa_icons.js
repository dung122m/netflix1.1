const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(12 + len);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const typeAndData = buf.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

function createPng(width, height, pixelFn) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = makeChunk('IHDR', ihdrData);

  // Scanlines with filter byte 0x00
  const scanlineSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * scanlineSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineSize;
    rawData[rowOffset] = 0; // filter None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = pixelFn(x, y, width, height);
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData, { level: 9 });
  const idat = makeChunk('IDAT', deflated);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

// Hàm vẽ biểu tượng Nanaflix / Netflix (N đỏ trên nền đen bo góc)
function renderNanaflixPixel(x, y, width, height) {
  const nx = x / width; // 0 to 1
  const ny = y / height; // 0 to 1

  // Background: Deep dark gradient
  let bgR = 18, bgG = 18, bgB = 20, bgA = 255;
  const distFromCenter = Math.hypot(nx - 0.5, ny - 0.5);
  if (distFromCenter < 0.45) {
    const vignette = 1 - distFromCenter / 0.45;
    bgR = Math.min(255, Math.floor(bgR + vignette * 15));
  }

  // Draw Letter "N"
  // Margin: left 0.28, right 0.72, top 0.20, bottom 0.80
  const nLeft = 0.28;
  const nRight = 0.72;
  const nTop = 0.20;
  const nBottom = 0.80;
  const colW = 0.13;

  let isN = false;
  let r = bgR, g = bgG, b = bgB, a = bgA;

  if (ny >= nTop && ny <= nBottom) {
    // Left column
    if (nx >= nLeft && nx <= nLeft + colW) {
      isN = true;
      r = 229; g = 9; b = 20; // #e50914 (Netflix Red)
    }

    // Right column
    if (nx >= nRight - colW && nx <= nRight) {
      isN = true;
      r = 229; g = 9; b = 20;
    }

    // Diagonal stroke (from top-left of col1 to bottom-right of col2)
    // Line equation: y fraction in [nTop, nBottom] matches x fraction in [nLeft, nRight]
    const yFrac = (ny - nTop) / (nBottom - nTop);
    const diagX = nLeft + yFrac * (nRight - colW - nLeft);
    if (nx >= diagX && nx <= diagX + colW) {
      isN = true;
      // Gradient darker red with drop shadow for 3D ribbon look
      const shadowFactor = 0.75 + 0.25 * yFrac;
      r = Math.floor(180 * shadowFactor);
      g = 0;
      b = 8;
    }
  }

  // Subtle red glow around the N
  if (!isN) {
    // Check distance to N
    if (nx >= nLeft - 0.04 && nx <= nRight + 0.04 && ny >= nTop - 0.04 && ny <= nBottom + 0.04) {
      r = Math.min(255, r + 25);
    }
  }

  return [r, g, b, a];
}

const publicDir = path.resolve(__dirname, '..', 'public');

// Generate 192x192
const png192 = createPng(192, 192, renderNanaflixPixel);
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), png192);
console.log('Generated icon-192.png');

// Generate 512x512
const png512 = createPng(512, 512, renderNanaflixPixel);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), png512);
console.log('Generated icon-512.png');

// Generate apple-touch-icon.png (180x180)
const pngApple = createPng(180, 180, renderNanaflixPixel);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), pngApple);
console.log('Generated apple-touch-icon.png');
