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
// Testovateľnosť: s TYPECHECK_INPUT_FILE sa tsc nespúšťa a výstup sa prečíta
// zo súboru. Používa to scripts/ci/__tests__/typecheck-baseline.test.mjs, ktorý
// existuje kvôli tomu, že prvá verzia ERROR_LINE zahadzovala route groups —
// trieda chyby, ktorú sa dá zafixovať jedine fixture, nie behom nad repom.
if (process.env.TYPECHECK_INPUT_FILE) {
  out = readFileSync(process.env.TYPECHECK_INPUT_FILE, "utf8");
} else
try {
  out = execSync("npx tsc --noEmit -p tsconfig.json", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    cwd: process.cwd().endsWith("apps/crm") ? "." : "apps/crm",
  });
} catch (err) {
  out = `${err.stdout ?? ""}${err.stderr ?? ""}`;
}

// Počítame CHYBY V ZDROJI, nie v `.next/types/**`.
//
// Pôvodná verzia matchovala /error TS\d+/ nad celým výstupom, teda aj nad
// generovanými typmi v `.next/`. V CI to nikdy nebolo vidieť, pretože tam
// `.next` pri tomto kroku ešte neexistuje (Typecheck beží PRED Build) — ale
// lokálne, v strome po builde, ratchet hlásil o 12 chýb viac než CI a padal
// na artefaktoch odkazujúcich na súbory, ktoré už neexistujú (`.next/types/
// app/api/bsm-reforma/lead`, zmazané v #708).
//
// To nie je kozmetika. Brána, ktorá lokálne padá bez príčiny, sa prestane
// spúšťať — presne to, na čo tento súbor vyššie sám varuje pri
// schema-governance-guard.yml. A lokálna brána pred pushom je to jediné, čo
// stojí medzi chybou a 27 % červených behov CI.
//
// Pokrytie sa tým nemení: CI túto triedu chýb nevidelo nikdy, pretože pri
// jeho behu `.next` nie je. Vylúčenie iba zrovnáva lokálne číslo s tým, ktoré
// rozhoduje. Koľko sa vylúčilo, sa vypíše — nič sa nestráca mlčky.
// `.*?` a nie `[^(]*`: cesty Next.js obsahujú route groups, teda zátvorky —
// `.next/types/app/(dashboard)/x.ts(14,13): error TS2344`. Vzor, ktorý sa
// zastaví na prvej `(`, takýto riadok nezmatchuje VÔBEC a chyba zmizne
// z počtu. Prvá verzia tohto regexu to robila a ticho zahadzovala 4 chyby;
// v tomto strome boli všetky v .next/, ale `src/app/(dashboard)/**` má
// zátvorku rovnako, takže by zmizla aj reálna chyba v zdroji.
const ERROR_LINE = /^(\S.*?)\((\d+),(\d+)\): (error TS\d+)/;
const allErrors = [];
for (const line of out.split(/\r?\n/)) {
  const m = line.match(ERROR_LINE);
  if (m) allErrors.push({ file: m[1], code: m[4] });
}
const generated = allErrors.filter((e) => e.file.startsWith(".next/"));
const errors = allErrors.filter((e) => !e.file.startsWith(".next/")).map((e) => e.code);
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

console.log(`Typovych chyb:  ${count}   (v zdroji, mimo .next/)`);
console.log(`Baseline:       ${baseline}`);
if (generated.length > 0) {
  console.log(
    `Vylucene:       ${generated.length} v .next/types/** - generovane artefakty po builde, CI ich pri tomto kroku nema`,
  );
}
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
