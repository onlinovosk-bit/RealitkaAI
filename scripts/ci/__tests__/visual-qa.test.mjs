// Syntetická vizuálna regresia. Žiadna produktová cesta, žiadny zákaznícky účet.
// Spustenie: node --test scripts/ci/__tests__/visual-qa.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { resolve } from "node:path";
import { compareRgba } from "../lib/visual-qa.mjs";

function solid(width, height, pixel) {
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) rgba.set(pixel, i * 4);
  return { width, height, rgba };
}

const APPROVED = solid(8, 8, [16, 32, 64, 255]);

function regress(frame) {
  const rgba = new Uint8Array(frame.rgba);
  for (let i = 0; i < 16; i++) {
    rgba[i * 4] = 255;
    rgba[i * 4 + 1] = 255;
    rgba[i * 4 + 2] = 255;
  }
  return { width: frame.width, height: frame.height, rgba };
}

test("zámerne pokazená snímka sa zachytí a schválený fixture ostane", () => {
  const bad = regress(APPROVED);
  const found = compareRgba(APPROVED, bad, { maxChangedRatio: 0.02 });
  assert.equal(found.status, "FAIL");
  assert.equal(found.code, "visual_regression");
  assert.equal(found.changedPixels, 16);
  assert.ok(found.changedRatio > 0.02);

  const still = compareRgba(APPROVED, APPROVED, { maxChangedRatio: 0.02 });
  assert.equal(still.status, "PASS");
  assert.equal(still.changedPixels, 0);
  assert.equal(APPROVED.rgba[0], 16);
  assert.notEqual(bad.rgba[0], APPROVED.rgba[0]);
});

test("jeden pixel pod prahom nie je FAIL za vkus a chýbajúci prah je BLOCKED", () => {
  const slight = solid(8, 8, [16, 32, 64, 255]);
  slight.rgba[0] = 17;
  const under = compareRgba(APPROVED, slight, { maxChangedRatio: 0.02 });
  assert.equal(under.status, "PASS");
  assert.equal(under.code, "within_threshold");

  const noBar = compareRgba(APPROVED, slight, {});
  assert.equal(noBar.status, "BLOCKED");
  assert.equal(noBar.code, "missing_threshold");
});

test("modul neimportuje produktovú aplikáciu", () => {
  const src = readFileSync(resolve(new URL("../lib/visual-qa.mjs", import.meta.url).pathname), "utf8");
  assert.equal(src.includes("apps/crm"), false);
  assert.equal(src.includes("from \"playwright\""), false);
});

function loadCaptured(name) {
  const dir = resolve(new URL("../fixtures/visual-qa/", import.meta.url).pathname);
  const png = readFileSync(resolve(dir, `${name}.png`));
  const raw = readFileSync(resolve(dir, `${name}.rgba`));
  assert.equal(png[0], 0x89);
  assert.equal(png.subarray(1, 4).toString("ascii"), "PNG");
  const width = raw.readUInt32BE(0);
  const height = raw.readUInt32BE(4);
  const rgba = raw.subarray(8);
  assert.equal(rgba.length, width * height * 4);
  return { width, height, rgba };
}

test("uložené Playwright snímky: regresia FAIL, schválená snímka PASS, bez Chromia", () => {
  const approved = loadCaptured("approved");
  const regression = loadCaptured("regression");
  const found = compareRgba(approved, regression, { maxChangedRatio: 0.02 });
  assert.equal(found.status, "FAIL");
  assert.equal(found.code, "visual_regression");
  assert.ok(found.changedRatio > 0.02);
  const same = compareRgba(approved, approved, { maxChangedRatio: 0.02 });
  assert.equal(same.status, "PASS");
  assert.equal(same.changedPixels, 0);
});
