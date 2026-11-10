#!/usr/bin/env node

/**
 * NANAFLIX VISUAL DIFF ENGINE — compare-snapshots.mjs
 * 
 * So sánh 2 ảnh PNG pixel-by-pixel, báo cáo số pixel khác biệt,
 * tỷ lệ phần trăm chênh lệch, và xuất ảnh diff trực quan.
 * Sử dụng thư viện `sharp` đã có sẵn trong node_modules của dự án (Zero new dependency).
 * 
 * Cách dùng:
 *   node scripts/compare-snapshots.mjs <fileA.png> <fileB.png> [--output <diff.png>] [--threshold <number>]
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname, basename, join } from 'node:path';
import sharp from 'sharp';

// Ngưỡng dung sai màu sắc (delta RGB 0-765) để lọc bớt nhiễu subpixel/antialiasing
const DEFAULT_COLOR_THRESHOLD = 18;

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    fileA: null,
    fileB: null,
    output: null,
    threshold: DEFAULT_COLOR_THRESHOLD,
    json: false,
  };

  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--output' || arg === '-o') {
      options.output = args[++i];
    } else if (arg === '--threshold' || arg === '-t') {
      options.threshold = parseInt(args[++i], 10) || DEFAULT_COLOR_THRESHOLD;
    } else if (arg === '--json') {
      options.json = true;
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
  }

  options.fileA = positional[0] || null;
  options.fileB = positional[1] || null;
  return options;
}

export async function compareImages(fileAPath, fileBPath, options = {}) {
  const threshold = options.threshold ?? DEFAULT_COLOR_THRESHOLD;
  const customOutputPath = options.output ?? null;

  // 1. Kiểm tra tồn tại file
  if (!fileAPath || !existsSync(fileAPath)) {
    throw new Error(`[ERR_FILE_NOT_FOUND] File A không tồn tại: "${fileAPath}"`);
  }
  if (!fileBPath || !existsSync(fileBPath)) {
    throw new Error(`[ERR_FILE_NOT_FOUND] File B không tồn tại: "${fileBPath}"`);
  }

  // 2. Đọc metadata và chuyển đổi sang raw pixel RGBA
  const [sharpA, sharpB] = [sharp(fileAPath), sharp(fileBPath)];
  const [imgA, imgB] = await Promise.all([
    sharpA.ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharpB.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  ]);

  const { width: wA, height: hA } = imgA.info;
  const { width: wB, height: hB } = imgB.info;

  // 3. Kiểm tra kích thước hình ảnh
  if (wA !== wB || hA !== hB) {
    const error = new Error(`[ERR_DIMENSION_MISMATCH] Kích thước ảnh không khớp: File A (${wA}x${hA}) vs File B (${wB}x${hB})`);
    error.code = 'ERR_DIMENSION_MISMATCH';
    error.details = {
      fileA: { path: fileAPath, width: wA, height: hA },
      fileB: { path: fileBPath, width: wB, height: hB }
    };
    throw error;
  }

  const width = wA;
  const height = hA;
  const totalPixels = width * height;
  let diffPixels = 0;
  let maxDelta = 0;
  let totalDelta = 0;

  // Buffer chứa ảnh diff kết quả (RGBA)
  const diffBuffer = Buffer.alloc(totalPixels * 4);

  // 4. So sánh từng pixel
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const r1 = imgA.data[idx];
    const g1 = imgA.data[idx + 1];
    const b1 = imgA.data[idx + 2];
    const a1 = imgA.data[idx + 3];

    const r2 = imgB.data[idx];
    const g2 = imgB.data[idx + 1];
    const b2 = imgB.data[idx + 2];
    const a2 = imgB.data[idx + 3];

    const delta = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2) + Math.abs(a1 - a2);
    if (delta > maxDelta) maxDelta = delta;
    totalDelta += delta;

    if (delta > threshold) {
      diffPixels++;
      // Pixel khác biệt: Đánh dấu màu ĐỎ NEON (#ff0055) nổi bật
      diffBuffer[idx] = 255;      // R
      diffBuffer[idx + 1] = 0;    // G
      diffBuffer[idx + 2] = 85;   // B
      diffBuffer[idx + 3] = 255;  // A
    } else {
      // Pixel giống nhau: Chuyển sang Grayscale mờ (30% độ sáng) để làm phông nền ngữ cảnh
      const gray = Math.round(0.299 * r1 + 0.587 * g1 + 0.114 * b1);
      const dimmed = Math.round(gray * 0.3);
      diffBuffer[idx] = dimmed;
      diffBuffer[idx + 1] = dimmed;
      diffBuffer[idx + 2] = dimmed;
      diffBuffer[idx + 3] = 255;
    }
  }

  const diffPercentage = totalPixels > 0 ? (diffPixels / totalPixels) * 100 : 0;
  const isMatch = diffPixels === 0;

  // 5. Xác định đường dẫn lưu ảnh diff
  let outputPath = customOutputPath;
  if (!outputPath) {
    const diffDir = resolve(dirname(fileBPath), '..', 'diffs');
    mkdirSync(diffDir, { recursive: true });
    const nameA = basename(fileAPath, '.png');
    const nameB = basename(fileBPath, '.png');
    outputPath = join(diffDir, `diff_${nameA}__vs__${nameB}.png`);
  } else {
    mkdirSync(dirname(resolve(outputPath)), { recursive: true });
  }

  // 6. Ghi ảnh diff PNG ra đĩa qua sharp
  await sharp(diffBuffer, {
    raw: {
      width,
      height,
      channels: 4
    }
  })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);

  return {
    isMatch,
    dimensions: { width, height },
    totalPixels,
    diffPixels,
    diffPercentage: Number(diffPercentage.toFixed(3)),
    maxDelta,
    meanDeltaPerPixel: Number((totalDelta / totalPixels).toFixed(2)),
    threshold,
    files: {
      fileA: resolve(fileAPath),
      fileB: resolve(fileBPath),
      diffImage: resolve(outputPath)
    }
  };
}

// Chạy trực tiếp từ CLI
const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));

if (isMain || process.argv[1]?.endsWith('compare-snapshots.mjs')) {
  const options = parseArgs();

  if (!options.fileA || !options.fileB) {
    console.error('Lỗi cú pháp: Thiếu đường dẫn 2 ảnh cần so sánh.');
    console.error('Cú pháp: node scripts/compare-snapshots.mjs <fileA.png> <fileB.png> [--output <diff.png>] [--threshold <number>]');
    process.exit(1);
  }

  compareImages(options.fileA, options.fileB, options)
    .then(result => {
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log('====================================================');
        console.log('       NANAFLIX VISUAL DIFF INSPECTION RESULT        ');
        console.log('====================================================');
        console.log(`File A (Reference): ${result.files.fileA}`);
        console.log(`File B (Candidate): ${result.files.fileB}`);
        console.log(`Diff Image Output:  ${result.files.diffImage}`);
        console.log('----------------------------------------------------');
        console.log(`Kích thước:        ${result.dimensions.width} x ${result.dimensions.height} px`);
        console.log(`Tổng số pixel:     ${result.totalPixels.toLocaleString()}`);
        console.log(`Pixel sai khác:    ${result.diffPixels.toLocaleString()} px`);
        console.log(`Tỷ lệ sai khác:    ${result.diffPercentage}%`);
        console.log(`Độ chênh lệch tb:  ${result.meanDeltaPerPixel} / 765`);
        console.log(`Kết luận:          ${result.isMatch ? '✅ HOÀN TOÀN KHỚP (IDENTICAL)' : '⚠️ PHÁT HIỆN SAI KHÁC THỊ GIÁC'}`);
        console.log('====================================================');
      }
      process.exit(result.isMatch ? 0 : 2);
    })
    .catch(err => {
      console.error(`\n[LỖI SO SÁNH]: ${err.message}`);
      if (err.details) {
        console.error('Chi tiết:', JSON.stringify(err.details, null, 2));
      }
      process.exit(1);
    });
}
