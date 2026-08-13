import fs from 'fs';
import path from 'path';
import https from 'https';

const SITE_KEY = 'netflix-3f78535a';
const PAGE_KEY = 'vn-d838105b';
const REPORT_PATH = `docs/research/${SITE_KEY}/${PAGE_KEY}/raw_dom_report.json`;
const ASSETS_DIR = `public/sites/${SITE_KEY}/${PAGE_KEY}`;

if (!fs.existsSync(REPORT_PATH)) {
  console.error('Report not found');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf-8'));

async function downloadFile(url, targetPath) {
  return new Promise((resolve, reject) => {
    if (!url || url.startsWith('data:')) {
      console.log(`Skipping invalid URL: ${url}`);
      return resolve();
    }
    
    // Normalize url
    if (url.startsWith('//')) url = 'https:' + url;
    
    console.log(`Downloading ${url} to ${targetPath}`);
    const file = fs.createWriteStream(targetPath);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        return reject(`Failed to download: ${response.statusCode}`);
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(targetPath, () => {});
      reject(err);
    });
  });
}

async function downloadAll() {
  // Images
  const imgDir = path.join(ASSETS_DIR, 'images');
  if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
  
  for (const [i, img] of report.images.entries()) {
    const fileName = `img_${i}.jpg`;
    await downloadFile(img.src, path.join(imgDir, fileName)).catch(console.error);
  }

  // Videos (Note: might need to be careful with URLs here)
  const vidDir = path.join(ASSETS_DIR, 'videos');
  if (!fs.existsSync(vidDir)) fs.mkdirSync(vidDir, { recursive: true });
  
  for (const [i, vid] of report.videos.entries()) {
    const fileName = `vid_${i}.mp4`;
    await downloadFile(vid.src, path.join(vidDir, fileName)).catch(console.error);
  }
}

downloadAll().then(() => console.log('Done downloading assets.'));
