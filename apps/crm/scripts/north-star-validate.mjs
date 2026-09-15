#!/usr/bin/env node
/**
 * north-star-validate.mjs
 * Kontroluje .ai/bus/metrics/north-star-YYYY-MM.jsonl:
 * - žiadny dátum dvakrát
 * - v rozsahu backfill žiadny chýbajúci deň (ak --range FROM,TO)
 *
 * Usage:
 *   node apps/crm/scripts/north-star-validate.mjs
 *   node apps/crm/scripts/north-star-validate.mjs --ci
 *   node apps/crm/scripts/north-star-validate.mjs --range 2026-08-17,2026-09-16
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..", "..");
const METRICS_DIR = join(REPO_ROOT, ".ai", "bus", "metrics");

const args = process.argv.slice(2);
const ci = args.includes("--ci");
const rangeIdx = args.indexOf("--range");
const rangeArg = rangeIdx >= 0 ? args[rangeIdx + 1] : null;

function daysBetween(from, to) {
  const out = [];
  const d = new Date(from + "T00:00:00Z");
  const end = new Date(to + "T00:00:00Z");
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

function loadRows() {
  if (!existsSync(METRICS_DIR)) return [];
  const files = readdirSync(METRICS_DIR).filter((f) => f.startsWith("north-star-") && f.endsWith(".jsonl"));
  const rows = [];
  let unreadable = 0;
  for (const f of files) {
    const text = readFileSync(join(METRICS_DIR, f), "utf8");
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        rows.push(JSON.parse(line));
      } catch {
        unreadable += 1;
      }
    }
  }
  return { rows, unreadable };
}

const { rows, unreadable } = loadRows();
const byDate = new Map();
const dupes = [];
for (const r of rows) {
  const d = r.date;
  if (!d) continue;
  if (byDate.has(d)) dupes.push(d);
  else byDate.set(d, r);
}

let missing = [];
if (rangeArg) {
  const [from, to] = rangeArg.split(",");
  missing = daysBetween(from, to).filter((d) => !byDate.has(d));
}

console.log(`North-star metrics rows:     ${rows.length}`);
console.log(`Unique dates:                ${byDate.size}`);
console.log(`Duplicate dates:             ${dupes.length}`);
console.log(`Unreadable lines:            ${unreadable}`);
if (rangeArg) console.log(`Missing in range:            ${missing.length}`);

let failed = false;
if (dupes.length) {
  failed = true;
  console.log("\nDuplicitné dátumy:");
  for (const d of [...new Set(dupes)].slice(0, 20)) console.log(`  ${d}`);
}
if (unreadable) failed = true;
if (rangeArg && missing.length) {
  failed = true;
  console.log("\nChýbajúce dni:");
  for (const d of missing.slice(0, 20)) console.log(`  ${d}`);
  if (missing.length > 20) console.log(`  ... +${missing.length - 20}`);
}

if (ci && failed) process.exit(1);
if (!failed) console.log("\nOK");
