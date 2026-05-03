/**
 * Generuje PNG ikony pre PWA z SVG zdroja.
 * Požaduje: npm i -D sharp (ak nie je nainštalovaný, skopíruj SVG manuálne)
 * Spustenie: node scripts/generate-pwa-icons.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, "../public");
const iconsDir = resolve(publicDir, "icons");
mkdirSync(iconsDir, { recursive: true });

const svgPath = resolve(iconsDir, "revolis-icon.svg");
const svgBuffer = readFileSync(svgPath);

let sharp;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.error("sharp nie je nainštalovaný. Spusti: npm i -D sharp");
  process.exit(1);
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
for (const size of sizes) {
  const outPath = resolve(iconsDir, `revolis-${size}.png`);
  await sharp(svgBuffer).resize(size, size).png().toFile(outPath);
  console.log(`  ✓ revolis-${size}.png`);
}

// Badge icon (72px, monochrome pre Android)
const badgePath = resolve(iconsDir, "revolis-badge-72.png");
await sharp(svgBuffer).resize(72, 72).png().toFile(badgePath);
console.log("  ✓ revolis-badge-72.png");

console.log("PWA ikony vygenerované.");
