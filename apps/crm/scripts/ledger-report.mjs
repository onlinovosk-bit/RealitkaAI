#!/usr/bin/env node
/**
 * Ledger report — reads .ai/bus/ledger/*.jsonl (append-only) and prints a table.
 * Never mutates ledger files. Skips damaged lines and counts them.
 *
 * Usage:
 *   node apps/crm/scripts/ledger-report.mjs
 *   node apps/crm/scripts/ledger-report.mjs --json
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..", "..");
const LEDGER_DIR = join(REPO_ROOT, ".ai", "bus", "ledger");

function loadRuns() {
  const runs = [];
  let unreadable = 0;
  if (!existsSync(LEDGER_DIR)) {
    return { runs, unreadable };
  }
  const files = readdirSync(LEDGER_DIR).filter((f) => f.endsWith(".jsonl")).sort();
  for (const file of files) {
    const text = readFileSync(join(LEDGER_DIR, file), "utf8");
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        runs.push(JSON.parse(line));
      } catch {
        unreadable += 1;
      }
    }
  }
  return { runs, unreadable };
}

function aggregate(runs) {
  /** @type {Map<string, object[]>} */
  const byTask = new Map();
  for (const r of runs) {
    const tid = r.task_id || "?";
    if (!byTask.has(tid)) byTask.set(tid, []);
    byTask.get(tid).push(r);
  }

  const rows = [];
  for (const [taskId, list] of [...byTask.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    list.sort((a, b) => String(a.finished_at || a.started_at || "").localeCompare(String(b.finished_at || b.started_at || "")));
    const last = list[list.length - 1];
    const cost = list.reduce((s, x) => s + (Number(x.cost_usd) || 0), 0);
    rows.push({
      task_id: taskId,
      runs: list.length,
      verdict: last.verdict ?? "?",
      cost_usd: cost,
      last_run: last.finished_at || last.started_at || "?",
      production_effect_null: list.filter((x) => x.production_effect == null).length,
    });
  }
  return rows;
}

const { runs, unreadable } = loadRuns();
const rows = aggregate(runs);

const byVerdict = {};
let totalCost = 0;
let prodNull = 0;
for (const r of runs) {
  const v = r.verdict || "?";
  byVerdict[v] = (byVerdict[v] || 0) + 1;
  totalCost += Number(r.cost_usd) || 0;
  if (r.production_effect == null) prodNull += 1;
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ runs: runs.length, unreadable, byVerdict, totalCost, prodNull, rows }, null, 2));
  process.exit(0);
}

console.log(`Ledger report — ${runs.length} runs, necitutelne: ${unreadable}\n`);
console.log("TASK_ID".padEnd(16) + "│ RUNOV ".padEnd(8) + "│ VERDIKT (posledný)".padEnd(22) + "│ COST_USD ".padEnd(12) + "│ POSLEDNÝ BEH");
console.log("─".repeat(78));
for (const r of rows) {
  console.log(
    String(r.task_id).padEnd(16) +
    "│ " + String(r.runs).padEnd(6) +
    "│ " + String(r.verdict).padEnd(20) +
    "│ " + String(r.cost_usd).padEnd(10) +
    "│ " + r.last_run
  );
}
console.log("\nSúhrn:");
console.log(`  behy podľa verdiktu: ${JSON.stringify(byVerdict)}`);
console.log(`  súčet cost_usd:      ${totalCost}`);
console.log(`  production_effect null: ${prodNull} / ${runs.length}`);
console.log(`  nečitateľné riadky:  ${unreadable}`);
