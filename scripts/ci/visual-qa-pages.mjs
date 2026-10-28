// Snímky Revolis UI v už bežiacom lokálnom serveri. Nie je to syntetický RGBA test.
//
//   node scripts/ci/visual-qa-pages.mjs
//
// Server sa nespúšťa. Ak http://127.0.0.1:3000 neodpovedá, príkaz skončí chybou.
import { execSync } from "node:child_process";
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const base = process.env.VISUAL_QA_BASE_URL || "http://127.0.0.1:3000";
const routes = ["/proof", "/landing", "/login", "/dashboard", "/forecast", "/team", "/settings", "/import/universal"];
const repoDir = resolve("scripts/ci/fixtures/visual-qa/pages");
const artifactDir = "/opt/cursor/artifacts/visual-qa/pages";
const storeDir = "/cursor/stores/self/media/visual-qa";

function sha() {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

const browser = await chromium.launch({ headless: true });
const shots = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  mkdirSync(repoDir, { recursive: true });
  mkdirSync(artifactDir, { recursive: true });
  mkdirSync(storeDir, { recursive: true });
  for (const route of routes) {
    const name = route === "/" ? "root" : route.replace(/^\//, "").replaceAll("/", "-");
    const response = await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(500);
    const png = resolve(repoDir, `${name}.png`);
    await page.screenshot({ path: png, fullPage: true, animations: "disabled" });
    copyFileSync(png, resolve(artifactDir, `${name}.png`));
    copyFileSync(png, resolve(storeDir, `${name}.png`));
    shots.push({
      route,
      requested_url: `${base}${route}`,
      final_url: page.url(),
      status: response?.status() ?? null,
      png: `scripts/ci/fixtures/visual-qa/pages/${name}.png`,
      bytes: (await import("node:fs")).statSync(png).size,
    });
  }
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const proof = await mobile.goto(`${base}/proof`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await mobile.waitForTimeout(500);
  const proofText = await mobile.locator("body").innerText();
  const mobilePng = resolve(repoDir, "proof-mobile.png");
  await mobile.screenshot({ path: mobilePng, fullPage: true, animations: "disabled" });
  copyFileSync(mobilePng, resolve(artifactDir, "proof-mobile.png"));
  copyFileSync(mobilePng, resolve(storeDir, "proof-mobile.png"));
  shots.push({
    route: "/proof",
    viewport: "390x844",
    requested_url: `${base}/proof`,
    final_url: mobile.url(),
    status: proof?.status() ?? null,
    png: "scripts/ci/fixtures/visual-qa/pages/proof-mobile.png",
    bytes: (await import("node:fs")).statSync(mobilePng).size,
    body_has_proof_of_value: /proof of value/i.test(proofText),
  });
} finally {
  await browser.close();
}

const result = {
  command: "node scripts/ci/visual-qa-pages.mjs",
  base,
  head_at_capture: sha(),
  browser: "playwright chromium",
  shots,
  store_dir: storeDir,
  artifact_dir: artifactDir,
  note: "Syntetický compareRgba test nie je táto snímka.",
};
const manifest = resolve(repoDir, "pages-manifest.json");
writeFileSync(manifest, `${JSON.stringify(result, null, 2)}\n`);
copyFileSync(manifest, resolve(artifactDir, "pages-manifest.json"));
copyFileSync(manifest, resolve(storeDir, "pages-manifest.json"));
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!shots.length || shots.some((shot) => !shot.bytes)) process.exitCode = 1;
