// Zachytí dve syntetické PNG cez Playwright Chromium a porovná ich compareRgba.
// Žiadna produktová routa, žiadny zákaznícky účet. Regresia je len v tejto snímke.
//
// Spustenie: node scripts/ci/visual-qa-capture.mjs
import { mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { compareRgba } from "./lib/visual-qa.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, "fixtures/visual-qa");
const artifactDir = "/opt/cursor/artifacts/visual-qa";

function html(regression) {
  const block = regression
    ? `<div style="position:absolute;left:0;top:0;width:32px;height:32px;background:#ffffff"></div>`
    : "";
  return `<!doctype html><html><head><meta charset="utf-8"></head>
<body style="margin:0;background:#fff">
<div id="frame" style="width:64px;height:64px;background:#102040;position:relative;overflow:hidden">${block}</div>
</body></html>`;
}

async function readPng(page, png) {
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return { width: canvas.width, height: canvas.height, rgba: Array.from(image.data) };
  }, png.toString("base64"));
}

async function shoot(page, name, regression) {
  await page.setContent(html(regression), { waitUntil: "load" });
  const png = await page.locator("#frame").screenshot({
    type: "png",
    animations: "disabled",
    caret: "hide",
    scale: "css",
  });
  const frame = await readPng(page, png);
  const pngPath = resolve(outDir, `${name}.png`);
  const sidePath = resolve(outDir, `${name}.rgba`);
  const header = Buffer.alloc(8);
  header.writeUInt32BE(frame.width, 0);
  header.writeUInt32BE(frame.height, 4);
  writeFileSync(pngPath, png);
  writeFileSync(sidePath, Buffer.concat([header, Buffer.from(frame.rgba)]));
  mkdirSync(artifactDir, { recursive: true });
  copyFileSync(pngPath, resolve(artifactDir, `${name}.png`));
  return { name, pngPath, sidePath, frame, bytes: png.length };
}

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 128, height: 128 },
    deviceScaleFactor: 1,
  });
  mkdirSync(outDir, { recursive: true });
  const approved = await shoot(page, "approved", false);
  const regression = await shoot(page, "regression", true);
  const found = compareRgba(approved.frame, regression.frame, { maxChangedRatio: 0.02 });
  const same = compareRgba(approved.frame, approved.frame, { maxChangedRatio: 0.02 });
  const publicResult = {
    command: "node scripts/ci/visual-qa-capture.mjs",
    exit_expected: 0,
    approved: {
      repo: "scripts/ci/fixtures/visual-qa/approved.png",
      bytes: approved.bytes,
      width: approved.frame.width,
      height: approved.frame.height,
    },
    regression: {
      repo: "scripts/ci/fixtures/visual-qa/regression.png",
      bytes: regression.bytes,
      width: regression.frame.width,
      height: regression.frame.height,
    },
    review_artifacts: [
      "/opt/cursor/artifacts/visual-qa/approved.png",
      "/opt/cursor/artifacts/visual-qa/regression.png",
    ],
    regression_vs_approved: found,
    approved_vs_itself: same,
    product_path_touched: false,
  };
  const resultPath = resolve(outDir, "capture-result.json");
  writeFileSync(resultPath, `${JSON.stringify(publicResult, null, 2)}\n`);
  copyFileSync(resultPath, resolve(artifactDir, "capture-result.json"));
  process.stdout.write(`${JSON.stringify(publicResult, null, 2)}\n`);
  if (found.status !== "FAIL" || found.code !== "visual_regression" || same.status !== "PASS") {
    process.exitCode = 2;
  }
} finally {
  await browser.close();
}
