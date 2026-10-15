import { chromium } from "playwright";

async function testFlattening() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Test with and without the 2D jitter parent
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          .arena-with-jitter {
            transform-style: preserve-3d;
            animation: jitter 0.2s infinite;
          }
          @keyframes jitter {
            0% { transform: translateY(0); }
            50% { transform: translateY(-2px); }
            100% { transform: translateY(0); }
          }
          .arena-without-jitter {
            transform-style: preserve-3d;
          }
          .cube {
            width: 50px;
            height: 50px;
            transform-style: preserve-3d;
            animation: spin 1s infinite linear;
          }
          @keyframes spin {
            0% { transform: rotateX(0deg) rotateY(0deg); }
            100% { transform: rotateX(360deg) rotateY(360deg); }
          }
        </style>
      </head>
      <body>
        <div style="perspective: 600px;">
          <div id="test1" class="arena-with-jitter">
            <div id="cube1" class="cube"></div>
          </div>
        </div>
        <div style="perspective: 600px;">
          <div id="test2" class="arena-without-jitter">
            <div id="cube2" class="cube"></div>
          </div>
        </div>
      </body>
    </html>
  `);

  await page.waitForTimeout(200);

  const res = await page.evaluate(() => {
    return {
      cube1Context: window.getComputedStyle(document.getElementById("test1")).transform,
      cube2Context: window.getComputedStyle(document.getElementById("test2")).transform,
    };
  });

  console.log("TEST RESULT:", res);
  await browser.close();
}

testFlattening();
