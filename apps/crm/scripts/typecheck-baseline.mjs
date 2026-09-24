#!/usr/bin/env node
/**
 * Cieľová cesta: apps/crm/scripts/typecheck-baseline.mjs
 *
 * Ratchet na typové chyby — rovnaký vzor ako check-api-contract.mjs.
 *
 * Prečo to existuje: `next.config.js` má `typescript.ignoreBuildErrors: true`
 * a v CI nie je `tsc --noEmit`, takže typové chyby nikto nevidí. Na main ich
 * bolo 10. 9. 2026 presne 69 — vrátane `lead_assignment_rules.agency_id`,
 * ktorý selectuje neexistujúci stĺpec.
 *
 * Prepnúť `ignoreBuildErrors` na false by dnes rozbilo build. Preto ratchet:
 * existujúce chyby sa tolerujú, zlyhá len NOVÁ. Dlh sa nezvyšuje.
 * (To isté poučenie ako pri schema-governance-guard.yml, ktorý trvalo červený
 * beh vytrénoval vypnúť.)
 *
 * Použitie:
 *   node apps/crm/scripts/typecheck-baseline.mjs
 *   node apps/crm/scripts/typecheck-baseline.mjs --write-baseline
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Resolved from this file, not from the cwd. The path used to be the literal
// "apps/crm/scripts/typecheck-baseline.json", which only resolves when the
// script is run from the repo root — and CI runs it with
// `working-directory: apps/crm`. So in CI the committed baseline was never
// read at all and the gate silently fell back to DEFAULT_BASELINE, while
// `--write-baseline` would have created a nested apps/crm/apps/crm/... file.
const BASELINE_FILE = join(dirname(fileURLToPath(import.meta.url)), "typecheck-baseline.json");

// Only used if the file above is missing. It is deliberately the ORIGINAL 69
// rather than the current number: if the baseline file ever disappears, the
// gate should fail open to the historical ceiling instead of silently
// tightening to a value nobody committed.
const DEFAULT_BASELINE = 69; // 2026-09-10, origin/main @ 97655763

const args = process.argv.slice(2);

let out = "";
try {
  out = execSync("npx tsc --noEmit -p tsconfig.json", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    cwd: process.cwd().endsWith("apps/crm") ? "." : "apps/crm",
  });
} catch (err) {
  out = `${err.stdout ?? ""}${err.stderr ?? ""}`;
}

const errors = out.match(/error TS\d+/g) ?? [];
const count = errors.length;

const baseline = existsSync(BASELINE_FILE)
  ? Number(JSON.parse(readFileSync(BASELINE_FILE, "utf8")).count)
  : DEFAULT_BASELINE;

if (args.includes("--write-baseline")) {
  writeFileSync(
    BASELINE_FILE,
    JSON.stringify({ count, measured_at: new Date().toISOString() }, null, 2) + "\n",
  );
  console.log(`Baseline zapisany: ${count} -> ${BASELINE_FILE}`);
  process.exit(0);
}

const byCode = {};
for (const e of errors) byCode[e] = (byCode[e] ?? 0) + 1;

console.log(`Typovych chyb:  ${count}`);
console.log(`Baseline:       ${baseline}`);
for (const [code, n] of Object.entries(byCode).sort((a, b) => b[1] - a[1]).slice(0, 5)) {
  console.log(`  ${code.padEnd(14)} ${n}`);
}

if (count > baseline) {
  console.error(`::error::Pribudlo ${count - baseline} novych typovych chyb.`);
  process.exit(1);
}
if (count < baseline) {
  console.log(`Ubudlo ${baseline - count}. Spusti --write-baseline a zniz strop na ${count}.`);
}
process.exit(0);
