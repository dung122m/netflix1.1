import { chromium } from "playwright";

async function inspectDiceDom() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.goto("http://localhost:3000/browse", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  await page.evaluate(() => window.dispatchEvent(new CustomEvent("open-ai-roulette")));
  await page.waitForSelector("div.fixed.inset-0.z-\\[120\\]");

  const spinBtn = page.locator("button:has-text('Bốc Quẻ Suất Chiếu Định Mệnh')").first();
  await spinBtn.click();
  await page.waitForTimeout(150);

  const fullTree = await page.evaluate(() => {
    const d1 = document.querySelector(".dice-rolling-1");
    if (!d1) return { error: "Không tìm thấy .dice-rolling-1" };

    // Inspect d1 and all its child faces
    const faces = Array.from(d1.children).map((face, idx) => {
      const cs = window.getComputedStyle(face);
      const r = face.getBoundingClientRect();
      return {
        faceIndex: idx,
        className: face.className,
        styleTransform: (face).style.transform,
        computedTransform: cs.transform,
        backfaceVisibility: cs.backfaceVisibility,
        zIndex: cs.zIndex,
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        pipCount: face.querySelectorAll(".rounded-full").length,
      };
    });

    // Inspect parent chain
    const parentChain = [];
    let curr = d1.parentElement;
    while (curr && curr !== document.body) {
      const cs = window.getComputedStyle(curr);
      parentChain.push({
        tag: curr.tagName,
        className: curr.className,
        overflow: cs.overflow,
        backdropFilter: (cs).backdropFilter,
        filter: cs.filter,
        transformStyle: cs.transformStyle,
        perspective: cs.perspective,
        contain: cs.contain,
      });
      curr = curr.parentElement;
    }

    return { faces, parentChain };
  });

  console.log("FACES:", JSON.stringify(fullTree.faces, null, 2));
  console.log("\nPARENT CHAIN:", JSON.stringify(fullTree.parentChain, null, 2));

  await browser.close();
}

inspectDiceDom();
