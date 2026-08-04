#!/usr/bin/env node
/**
 * Cieľová cesta: apps/crm/scripts/check-api-contract.mjs
 *
 * Vynucuje `.cursor/rules/revolis-api.mdc` — sekciu "Povinné importy".
 *
 * Prečo to existuje: pravidlo bolo napísané správne a dodržiavalo ho
 * 3-27 % routes. Z 214 API routes nemalo 207 validáciu, 158 jednotné
 * odpovede a 208 telemetriu. Pravidlo, ktoré nikto nekontroluje, je prianie.
 * Audit: docs/audit/2026-08-02-profit-leak-audit.md
 *
 * RATCHET: existujúce porušenia sú v baseline a CI ich toleruje. Zlyhá len
 * vtedy, keď pribudne NOVÉ. Dlh sa nezvyšuje a nemusí sa splácať naraz.
 * (Poučenie z .github/workflows/schema-governance-guard.yml, kde trvalo
 * červený beh vytrénoval alarm fatigue a workflow sa musel vypnúť.)
 *
 * Použitie:
 *   node apps/crm/scripts/check-api-contract.mjs
 *   node apps/crm/scripts/check-api-contract.mjs --ci
 *   node apps/crm/scripts/check-api-contract.mjs --write-baseline
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const API_ROOT = "apps/crm/src/app/api";
const BASELINE = "apps/crm/scripts/api-contract-baseline.json";

/** Presne to, čo požaduje revolis-api.mdc. */
const CHECKS = [
  {
    id: "validate",
    label: "@/lib/api-validate (validateBody / validateQuery)",
    needle: /@\/lib\/api-validate/,
    // Validácia dáva zmysel len tam, kde je telo požiadavky.
    applies: (t) => /export\s+async\s+function\s+(POST|PUT|PATCH)\b/.test(t),
  },
  {
    id: "response",
    label: "@/lib/api-response (okResponse / errorResponse)",
    needle: /@\/lib\/api-response/,
    applies: () => true,
  },
  {
    id: "telemetry",
    label: "@/lib/usage-metrics (incrementUsageMetric)",
    needle: /@\/lib\/usage-metrics|incrementUsageMetric/,
    applies: () => true,
  },
  {
    id: "ratelimit",
    label: "@/lib/rate-limit — POVINNÉ na verejných endpointoch",
    needle: /@\/lib\/rate-limit/,
    // Verejné = bez kontroly session. Heuristika: nepoužíva auth ani CRON_SECRET.
    applies: (t) =>
      /export\s+async\s+function\s+(POST|PUT|PATCH)\b/.test(t) &&
      !/auth\.getUser|createClient\(\)|CRON_SECRET|checkCapabilityAccess|revolisGuard/.test(t),
  },
];

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (e === "route.ts") out.push(p);
  }
  return out;
}

const routes = walk(API_ROOT).sort();
const findings = [];
for (const p of routes) {
  const t = readFileSync(p, "utf8");
  for (const c of CHECKS) {
    if (!c.applies(t)) continue;
    if (!c.needle.test(t)) findings.push(`${p.replace(/\\/g, "/")}#${c.id}`);
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

console.log(`API routes:                 ${routes.length}`);
for (const c of CHECKS) console.log(`  chýba ${c.id.padEnd(10)} ${String(perCheck[c.id]).padStart(4)}   ${c.label}`);
console.log(`\nPorušení spolu:             ${findings.length}`);
console.log(`V baseline (tolerované):    ${findings.length - nove.length}`);
console.log(`NOVÉ porušenia:             ${nove.length}`);
if (opravene.length) console.log(`Opravené od baseline:       ${opravene.length}  (spusti --write-baseline)`);

if (nove.length) {
  console.log("\nNové porušenia zmluvy API routes:");
  for (const f of nove) {
    const [path, id] = f.split("#");
    const c = CHECKS.find((x) => x.id === id);
    console.log(`  ${path}\n      chýba: ${c.label}`);
  }
  console.log("\nPravidlo: .cursor/rules/revolis-api.mdc — sekcia 'Povinné importy'.");
}

if (args.includes("--ci") && nove.length) process.exit(1);
