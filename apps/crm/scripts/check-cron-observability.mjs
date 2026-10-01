#!/usr/bin/env node
/**
 * Cieľová cesta: apps/crm/scripts/check-cron-observability.mjs
 *
 * Vynucuje, aby každý cron zo `vercel.json` po sebe nechal stopu v `cron_runs`.
 *
 * Prečo to existuje: 2026-09-30 sa v jedno ráno ukázalo, že beh cronu sa
 * nedá vyšetriť. `/api/cron/recompute-bri` nezapísal ani jedno skóre a o osem
 * hodín neskôr sa už nedalo zistiť prečo — runtime logy Vercelu tu prežijú asi
 * hodinu a route vracala `{ ok: true, computed: 0 }` rovnako pri „nebolo čo
 * počítať" ako pri „všetko zlyhalo". To isté sa vzápätí našlo pri
 * `/api/cron/morning-brief` (`{ sent: 0 }` pri „nikto to nemá zapnuté" aj pri
 * „všetkým zlyhalo doručenie").
 *
 * Tretí výskyt toho istého vzoru je dôvod túto kontrolu napísať. Opravovať to
 * spätne pri každom ďalšom cron-e je drahšie než nepustiť ďalší bez denníka.
 *
 * RATCHET: existujúce crony bez denníka sú v baseline a CI ich toleruje. Job
 * zlyhá len vtedy, keď pribudne NOVÝ cron bez `recordCronRun`, alebo keď sa
 * cron zo `vercel.json` odvoláva na route, ktorá neexistuje.
 * (Poučenie z .github/workflows/schema-governance-guard.yml, kde trvalo
 * červený beh vytrénoval alarm fatigue a workflow sa musel vypnúť.)
 *
 * Použitie:
 *   node apps/crm/scripts/check-cron-observability.mjs
 *   node apps/crm/scripts/check-cron-observability.mjs --ci
 *   node apps/crm/scripts/check-cron-observability.mjs --write-baseline
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const VERCEL_JSON = "apps/crm/vercel.json";
const BASELINE = "apps/crm/scripts/cron-observability-baseline.json";

/** `/api/cron/pulse` -> `apps/crm/src/app/api/cron/pulse/route.ts` */
function routeFileFor(cronPath) {
  return `apps/crm/src/app${cronPath}/route.ts`;
}

const CHECKS = [
  {
    id: "missing-route",
    label: "route.ts, na ktorý cron ukazuje, neexistuje",
    // Cron bez route je 404 každý deň, potichu. Toto nie je štýl, je to chyba.
    failing: (text) => text === null,
  },
  {
    id: "observe",
    label: "recordCronRun z @/lib/ops/cron-run (beh nenechá stopu)",
    failing: (text) => text !== null && !/recordCronRun/.test(text),
  },
];

const vercel = JSON.parse(readFileSync(VERCEL_JSON, "utf8"));
const crons = Array.isArray(vercel.crons) ? vercel.crons : [];

// `dashboard-insights` je vo vercel.json dvakrát (06:00 a 13:00) — tá istá
// route, dva rozvrhy. Kontrolujeme route, nie rozvrh, takže deduplikujeme.
const paths = [...new Set(crons.map((c) => c.path))].sort();

const findings = [];
for (const p of paths) {
  const file = routeFileFor(p);
  const text = existsSync(file) ? readFileSync(file, "utf8") : null;
  for (const c of CHECKS) {
    if (c.failing(text)) findings.push(`${p}#${c.id}`);
  }
}
findings.sort();

const args = process.argv.slice(2);
if (args.includes("--write-baseline")) {
  writeFileSync(BASELINE, JSON.stringify({ entries: findings }, null, 2) + "\n");
  console.log(`Baseline zapísaný: ${findings.length} položiek -> ${BASELINE}`);
  process.exit(0);
}

const base = existsSync(BASELINE)
  ? new Set(JSON.parse(readFileSync(BASELINE, "utf8")).entries)
  : new Set();
const nove = findings.filter((f) => !base.has(f));
const opravene = [...base].filter((f) => !findings.includes(f));

const perCheck = Object.fromEntries(CHECKS.map((c) => [c.id, 0]));
for (const f of findings) perCheck[f.split("#")[1]]++;

console.log(`Cronov vo vercel.json:      ${crons.length}  (${paths.length} rôznych routes)`);
console.log(`S denníkom cron_runs:        ${paths.length - perCheck["observe"] - perCheck["missing-route"]}`);
for (const c of CHECKS) {
  console.log(`  ${c.id.padEnd(14)} ${String(perCheck[c.id]).padStart(3)}   ${c.label}`);
}
console.log(`\nPorušení spolu:             ${findings.length}`);
console.log(`V baseline (tolerované):    ${findings.length - nove.length}`);
console.log(`NOVÉ porušenia:             ${nove.length}`);
if (opravene.length) {
  console.log(`Opravené od baseline:       ${opravene.length}  (spusti --write-baseline)`);
}

if (nove.length) {
  console.log("\nNové crony bez stopy po behu:");
  for (const f of nove) {
    const [p, id] = f.split("#");
    const c = CHECKS.find((x) => x.id === id);
    console.log(`  ${p}\n      ${c.label}\n      ${routeFileFor(p)}`);
  }
  console.log(
    "\nPravidlo: každý cron zapíše jeden riadok do `cron_runs` cez recordCronRun()\n" +
    "z @/lib/ops/cron-run — scanned / eligible / written / failed / prvá chyba.\n" +
    "Vzor: apps/crm/src/app/api/cron/recompute-bri/route.ts\n" +
    "Dôvod: logy Vercelu tu prežijú asi hodinu; beh bez stopy sa nedá vyšetriť."
  );
}

if (args.includes("--ci") && nove.length) process.exit(1);
