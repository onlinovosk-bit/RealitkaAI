#!/usr/bin/env node
/**
 * Cieľová cesta: apps/crm/scripts/find-dead-exports.mjs
 *
 * Hľadá exportované funkcie, ktoré nikto v aplikácii nevolá.
 *
 * Prečo to existuje: `spendCredits()` bol napísaný, otestovaný, mal SQL RPC,
 * ledger, granty aj Stripe webhook — a nemal ani jeden call site. Kreditový
 * systém bol kompletný a mŕtvy. Únik 9 100 € ročne pri dvoch zákazníkoch.
 * Audit: docs/audit/2026-08-02-profit-leak-audit.md — nález A1.
 *
 * Toto je najlacnejšia kontrola, ktorá tú triedu chýb chytí.
 *
 * Použitie:
 *   node apps/crm/scripts/find-dead-exports.mjs                 # report
 *   node apps/crm/scripts/find-dead-exports.mjs --ci            # exit 1 pri NOVOM mŕtvom exporte
 *   node apps/crm/scripts/find-dead-exports.mjs --write-baseline # zapíše aktuálny stav ako baseline
 *
 * Ratchet: existujúcich ~295 nálezov sa NERIEŠI naraz. Baseline ich zmrazí
 * a CI zlyhá len vtedy, keď pribudne nový. Dlh sa tak nezvyšuje.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = "apps/crm/src";
const BASELINE = "apps/crm/scripts/dead-exports-baseline.json";

/** Next.js / React mená, ktoré volá framework, nie náš kód. */
const FRAMEWORK = new Set([
  "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD",
  "generateMetadata", "generateStaticParams", "generateViewport",
  "middleware", "Page", "Layout", "loading", "error", "not-found",
]);

const isTest = (p) => /(__tests__|[/\\]tests[/\\]|\.test\.|\.spec\.)/.test(p);

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(p)) out.push(p);
  }
  return out;
}

const files = walk(ROOT);
const blobs = new Map(files.map((p) => [p, readFileSync(p, "utf8")]));

// 1. definície exportovaných funkcií (mimo testov)
const exports = new Map(); // meno -> cesta
for (const [p, t] of blobs) {
  if (isTest(p)) continue;
  for (const m of t.matchAll(/^export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)) {
    if (!exports.has(m[1])) exports.set(m[1], p);
  }
}

// 2. tokeny v každom neteštovom súbore
const tokens = new Map();
for (const [p, t] of blobs) {
  if (isTest(p)) continue;
  tokens.set(p, new Set(t.match(/[A-Za-z_$][\w$]*/g) ?? []));
}

// 3. export bez JEDINÉHO použitia — ani v cudzom súbore, ani vo vlastnom
//
// Pozor na rozdiel: helper exportovaný kvôli testom, ktorý sa používa vnútri
// svojho modulu, NIE je mŕtvy kód — je to normálny vnútorný pomocník.
// spendCredits() bol iný prípad: nevolal ho nikto, vrátane vlastného súboru.
// Preto sa počíta aj výskyt v definičnom súbore, ale bez samotnej deklarácie.
const DECL = (n) => new RegExp(`export\\s+(?:async\\s+)?function\\s+${n}\\b`, "g");
const dead = [];
for (const [name, defPath] of exports) {
  if (FRAMEWORK.has(name)) continue;

  let used = false;
  for (const [p, toks] of tokens) {
    if (p !== defPath && toks.has(name)) { used = true; break; }
  }

  if (!used) {
    // Použitie vo vlastnom súbore mimo deklarácie sa počíta ako použitie.
    const own = (blobs.get(defPath) ?? "").replace(DECL(name), "");
    const hits = own.match(new RegExp(`\\b${name}\\b`, "g"));
    if (hits && hits.length > 0) used = true;
  }

  if (!used) dead.push(`${relative(ROOT, defPath).replace(/\\/g, "/")}#${name}`);
}
dead.sort();

const args = process.argv.slice(2);

if (args.includes("--write-baseline")) {
  writeFileSync(BASELINE, JSON.stringify({ generated: "manual", entries: dead }, null, 2) + "\n");
  console.log(`Baseline zapísaný: ${dead.length} položiek -> ${BASELINE}`);
  process.exit(0);
}

const base = existsSync(BASELINE)
  ? new Set(JSON.parse(readFileSync(BASELINE, "utf8")).entries)
  : new Set();
const noveMrtve = dead.filter((d) => !base.has(d));
const opravene = [...base].filter((d) => !dead.includes(d));

console.log(`Exportovaných funkcií:        ${exports.size}`);
console.log(`Bez použitia v aplikácii:     ${dead.length}`);
console.log(`Z toho v baseline (tolerované): ${dead.length - noveMrtve.length}`);
console.log(`NOVÉ mŕtve exporty:           ${noveMrtve.length}`);
if (opravene.length) console.log(`Opravené od baseline:         ${opravene.length}  (spusti --write-baseline)`);

if (noveMrtve.length) {
  console.log("\nNové mŕtve exporty:");
  for (const d of noveMrtve) console.log(`  ${d}`);
  console.log(
    "\nAk je to zámer (feature flag, budúce použitie), pridaj do baseline\n" +
    "cez --write-baseline a napíš dôvod do PR popisu.",
  );
}

console.log(
  "\nPozn.: heuristika je textová. Falošné pozitíva vznikajú pri dynamickom\n" +
  "importe, re-exporte cez index barrel a pri stringových referenciách.\n" +
  "Preto ratchet, nie tvrdý zákaz.",
);

if (args.includes("--ci") && noveMrtve.length) process.exit(1);
