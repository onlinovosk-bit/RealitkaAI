#!/usr/bin/env node
/**
 * Cieľová cesta: apps/crm/scripts/judge.mjs
 *
 * JUDGE — nezávislá brána medzi agentom a `main`.
 *
 * Prečo to existuje: 8. 9. 2026 agent v BUS-004 uviedol `expectedFileHash`,
 * ktorý nezodpovedal ani git blobu, ani raw SHA-1 — hodnotu si vymyslel a sám
 * si prácu schválil. Judge je strojová podoba pravidla z OrgOS:
 * hodnota v auditnom artefakte musí pochádzať z príkazu.
 *
 * Judge NEVOLÁ MODEL. Nemá názor. Iba spúšťa a porovnáva.
 * Acceptance so `expect: runs_on_pull_request|runs_on_ci|external` nespúšťa —
 * overí cieľ (napr. CI workflow) a zaznamená EXTERNAL. Telo .md je próza.
 * ADR: docs/architecture/adr-2026-09-11b-software-factory-v1-minimum.md
 *
 * Použitie:
 *   node apps/crm/scripts/judge.mjs --task .ai/bus/tasks/TASK-0042.md
 *   node apps/crm/scripts/judge.mjs --task <cesta> --write-verdict
 *   node apps/crm/scripts/judge.mjs --task <cesta> --base origin/main
 *
 * Exit kódy:  0 ACCEPT · 1 REJECT · 2 BLOCKED · 3 HUMAN
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from "node:fs";
import { execSync, spawnSync } from "node:child_process";
import { join } from "node:path";
import yaml from "js-yaml";

const EXIT = { ACCEPT: 0, REJECT: 1, BLOCKED: 2, HUMAN: 3 };
const LEDGER_DIR = ".ai/bus/ledger";
// Cena behu sa meria iba ak ju dodá volajúci; inak ledger zapíše null.
const costRaw = process.env.JUDGE_RUN_COST_USD;
const costMeasured =
  costRaw != null && costRaw.trim() !== "" && Number.isFinite(Number(costRaw));
const HIGH_RISK = new Set(["high", "critical"]);
// Judge si sam zapisuje ledger — agent za to nesmie dostat REJECT.
const IMPLICIT_ALLOW = [".ai/bus/ledger/**"];
const GLOBSTAR = "__GLOBSTAR__";

const args = process.argv.slice(2);
const argv = (name, dflt = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
};
const taskPath = argv("--task");
const base = argv("--base", "origin/main");
const writeVerdict = args.includes("--write-verdict");

if (!taskPath) {
  console.error("Chýba --task <cesta k Task Contractu>");
  process.exit(EXIT.BLOCKED);
}
if (!existsSync(taskPath)) {
  console.error(`Task Contract neexistuje: ${taskPath}`);
  process.exit(EXIT.BLOCKED);
}

/* -- 1. nacitaj Task Contract (YAML frontmatter v .md) -------------------- */
/* Telo .md je proza. Judge z neho NIKDY necita data — iba front matter. */
const raw = readFileSync(taskPath, "utf8").replace(/^\uFEFF/, "");
const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
if (!fm) fail("BLOCKED", "Task Contract nema YAML frontmatter medzi `---`.");

let task;
try {
  task = yaml.load(fm[1]);
} catch (e) {
  fail("BLOCKED", `YAML sa neda nacitat: ${e.message}`);
}
if (!task || typeof task !== "object") {
  fail("BLOCKED", "Front matter nie je YAML objekt.");
}

const runId = `RUN-${new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14)}-${task.id ?? "NOID"}`;
const startedAt = new Date().toISOString();
const rows = [];
let verdict = null;
let reason = "";

/* -- 2. verdict blok musi byt prazdny (IBA front-matter verdict.result) -- */
/* Dokumentacny odsek v tele s textom "result: REJECT" nie je verdikt. */
{
  const prior = task.verdict && typeof task.verdict === "object" ? task.verdict.result : undefined;
  const filled =
    prior != null &&
    !(typeof prior === "string" && prior.trim() === "");
  if (filled) {
    fail(
      "BLOCKED",
      `Blok verdict je predvyplneny (result=${JSON.stringify(prior)}). Verdikt smie zapisat iba Judge.`,
    );
  }
}

/* -- 3. acceptance ------------------------------------------------------- */
const acceptance = Array.isArray(task.acceptance) ? task.acceptance : [];
if (acceptance.length === 0) {
  fail("BLOCKED", "Task Contract nema ani jedno `acceptance`. Bez neho sa neda overit nic.");
}

const scope = task.scope ?? {};
/** expect: runs_on_pull_request | runs_on_ci | external — Judge nespusta, iba eviduje. */
const EXTERNAL_EXPECT = /^(runs_on_pull_request|runs_on_ci|external)\b/i;

for (const a of acceptance) {
  const id = a.id ?? "?";
  const cmd = String(a.cmd ?? "").trim();
  const expect = String(a.expect ?? "exit_code == 0").trim();

  if (!cmd) {
    rows.push({ id, cmd: "(prazdny)", status: "BLOCKED", detail: "acceptance bez prikazu" });
    continue;
  }
  if (/^(echo|true|:)\b/.test(cmd)) {
    rows.push({ id, cmd, status: "BLOCKED", detail: "prikaz nic neoveruje" });
    continue;
  }
  if (expect.startsWith("all_paths_in")) {
    rows.push({ id, cmd, ...checkScope() });
    continue;
  }
  if (EXTERNAL_EXPECT.test(expect)) {
    rows.push({ id, cmd, ...checkExternal(cmd, expect) });
    continue;
  }

  const r = spawnSync(cmd, { shell: true, encoding: "utf8", timeout: 15 * 60000 });
  if (r.error && r.error.code === "ENOENT") {
    rows.push({ id, cmd, status: "BLOCKED", detail: "prikaz sa neda spustit" });
    continue;
  }
  if (r.status === null) {
    rows.push({ id, cmd, status: "BLOCKED", detail: "prikaz nedobehol (timeout/signal)" });
    continue;
  }
  // Chybajuca kontrola je ZLYHANIE, nie preskocenie.
  // (Poucenie z find-dead-exports.mjs: workflow ju ticho preskocil a job bol zeleny.)
  const err = `${r.stderr ?? ""}`;
  const unrunnable =
    r.status === 127 ||
    /MODULE_NOT_FOUND|Cannot find module|command not found|No such file or directory/i.test(err);
  if (unrunnable) {
    rows.push({ id, cmd, status: "BLOCKED", detail: "kontrola je nespustitelna (chybajuci skript/prikaz)" });
    continue;
  }

  const want = /exit_code\s*==\s*(\d+)/.exec(expect);
  const wanted = want ? Number(want[1]) : 0;
  rows.push({
    id,
    cmd,
    status: r.status === wanted ? "PASS" : "FAIL",
    detail: `exit ${r.status}, ocakavane ${wanted}`,
    exit_code: r.status,
  });
}

/* -- 4. scope ------------------------------------------------------------ */
const scopeAlreadyChecked = acceptance.some((a) =>
  String(a.expect ?? "").trim().startsWith("all_paths_in"),
);
if (!scopeAlreadyChecked && Array.isArray(scope.repo_paths) && scope.repo_paths.length) {
  rows.push({ id: "SCOPE", cmd: `git diff --name-only ${base}...HEAD`, ...checkScope() });
}

/* -- 5. rozpocet --------------------------------------------------------- */
const budget = task.budget ?? {};
const spent = ledgerSpend(task.id);
let budgetBreach = null;
if (budget.max_cost_usd != null && spent.cost > Number(budget.max_cost_usd)) {
  budgetBreach = `naklady ${spent.cost.toFixed(2)} > limit ${budget.max_cost_usd} USD`;
}
if (budget.max_iterations != null && spent.runs >= Number(budget.max_iterations)) {
  budgetBreach = `${spent.runs} behov >= limit ${budget.max_iterations}`;
}

/* -- 6. verdikt ---------------------------------------------------------- */
const blocked = rows.filter((r) => r.status === "BLOCKED");
const failed = rows.filter((r) => r.status === "FAIL");
const risk = String(task.risk ?? "medium").toLowerCase();

if (blocked.length) {
  verdict = "BLOCKED";
  reason = blocked.map((r) => `${r.id}: ${r.detail}`).join(" | ");
} else if (failed.length) {
  verdict = "REJECT";
  reason = failed.map((r) => `${r.id}: ${r.detail}`).join(" | ");
} else if (budgetBreach) {
  verdict = "HUMAN";
  reason = `rozpocet prekroceny - ${budgetBreach}`;
} else if (HIGH_RISK.has(risk)) {
  verdict = "HUMAN";
  reason = `vsetky kontroly PASS, ale risk=${risk} vyzaduje cloveka`;
} else {
  verdict = "ACCEPT";
  const nPass = rows.filter((r) => r.status === "PASS").length;
  const nExt = rows.filter((r) => r.status === "EXTERNAL").length;
  reason =
    nExt > 0
      ? `${nPass} kontrol PASS, ${nExt} EXTERNAL (CI), risk=${risk}`
      : `${rows.length} kontrol PASS, risk=${risk}`;
}

/* -- 7. vystup + zapis --------------------------------------------------- */
report();
writeLedger();
if (writeVerdict) patchContract();
process.exit(EXIT[verdict]);

/* ======================================================================== */

function checkScope() {
  let changed;
  try {
    changed = execSync(`git diff --name-only ${base}...HEAD`, { encoding: "utf8" })
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return { status: "BLOCKED", detail: `git diff proti ${base} sa neda spustit` };
  }
  const allow = [...(scope.repo_paths ?? []), ...IMPLICIT_ALLOW];
  const forbid = scope.forbidden_paths ?? [];
  const hit = changed.filter((f) => forbid.some((p) => matches(f, p)));
  if (hit.length) return { status: "FAIL", detail: `zakazana cesta: ${hit.join(", ")}` };
  const bad = changed.filter((f) => !allow.some((p) => matches(f, p)));
  if (bad.length) return { status: "FAIL", detail: `mimo scope: ${bad.join(", ")}` };
  return { status: "PASS", detail: `${changed.length} suborov, vsetky v scope` };
}

/**
 * Tretia kategoria: kontrola bezi mimo Judge (CI / PR check).
 * Judge ju nespusta — overi, ze ciel existuje, a zaznamena EXTERNAL.
 * Chybajuci workflow = FAIL (presunuta kontrola nesmie byt ticha diera).
 *
 * cmd formy:
 *   .github/workflows/saas-grade-pipeline.yml
 *   github-actions:saas-grade-pipeline.yml
 */
function resolveWorkflowPath(cmd) {
  const ga = /^github-actions:(.+)$/i.exec(cmd);
  if (ga) {
    return join(".github", "workflows", ga[1].replace(/^workflows\//i, "").trim());
  }
  const normalized = String(cmd).replace(/\\/g, "/").replace(/^\.\//, "");
  if (normalized.startsWith(".github/workflows/")) {
    return join(...normalized.split("/"));
  }
  return null;
}

function checkExternal(cmd, expect) {
  const wf = resolveWorkflowPath(cmd);
  if (!wf) {
    return { status: "BLOCKED", detail: `neznamy typ externej kontroly: ${cmd}` };
  }
  if (!existsSync(wf)) {
    return { status: "FAIL", detail: `CI workflow neexistuje: ${wf}` };
  }
  const text = readFileSync(wf, "utf8");
  if (/pull_request/i.test(expect) && !/pull_request/.test(text)) {
    return { status: "FAIL", detail: `${wf} nema on: pull_request` };
  }
  return { status: "EXTERNAL", detail: `evidovane v CI: ${wf}` };
}

function matches(file, pattern) {
  const rx = new RegExp(
    "^" +
      String(pattern)
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .split("**").join(GLOBSTAR)
        .replace(/\*/g, "[^/]*")
        .split(GLOBSTAR).join(".*") +
      "$",
  );
  return rx.test(file);
}

function ledgerFile() {
  return join(LEDGER_DIR, `${new Date().toISOString().slice(0, 7)}.jsonl`);
}

function ledgerSpend(taskId) {
  const out = { runs: 0, cost: 0 };
  const file = ledgerFile();
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line);
      if (e.task_id === taskId) {
        out.runs++;
        out.cost += Number(e.cost_usd ?? 0);
      }
    } catch {
      /* poskodeny riadok ignoruj - ledger je append-only */
    }
  }
  return out;
}

function report() {
  console.log(`\nJUDGE  ${task.id ?? "?"}  |  ${taskPath}`);
  console.log("-".repeat(96));
  console.log("ID".padEnd(8) + "PRIKAZ".padEnd(48) + "STAV".padEnd(9) + "DETAIL");
  for (const r of rows) {
    console.log(
      String(r.id).padEnd(8) +
        String(r.cmd).slice(0, 46).padEnd(48) +
        String(r.status).padEnd(9) +
        String(r.detail ?? ""),
    );
  }
  console.log("-".repeat(96));
  console.log(`VERDIKT: ${verdict}  --  ${reason}`);
  console.log(`run_id:  ${runId}`);
}

function writeLedger() {
  mkdirSync(LEDGER_DIR, { recursive: true });
  const entry = {
    run_id: runId,
    task_id: task.id ?? null,
    agent: task.owner ?? null,
    model: process.env.JUDGE_MODEL ?? null,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    iterations: spent.runs + 1,
    // Buď to meria, alebo tam to číslo nie je (runner/11-ledger-memory.md).
    // Bez JUDGE_RUN_COST_USD sa cena nemeria -> null, nikdy 0.
    cost_usd: costMeasured ? Number(process.env.JUDGE_RUN_COST_USD) : null,
    cost_measured: costMeasured,
    acceptance: rows.map((r) => ({
      id: r.id,
      cmd: r.cmd,
      exit_code: r.exit_code ?? null,
      pass: r.status === "PASS" || r.status === "EXTERNAL",
      status: r.status,
    })),
    verdict,
    reason,
    pr_url: process.env.JUDGE_PR_URL ?? null,
    merged_at: null,
    production_effect: null,
  };
  appendFileSync(ledgerFile(), JSON.stringify(entry) + "\n");
  console.log(`Ledger:  ${ledgerFile()}`);
}

function patchContract() {
  const block =
    "verdict:\n" +
    `  result: ${verdict}\n` +
    `  reason: ${JSON.stringify(reason)}\n` +
    `  checked_at: ${new Date().toISOString()}\n` +
    `  ledger_run_id: ${runId}`;
  let front = fm[1];
  front = /(^|\n)verdict:/.test(front)
    ? front.replace(/(^|\n)verdict:[\s\S]*?(?=\n[a-z_]+:|$)/, "\n" + block)
    : front.trimEnd() + "\n\n" + block;
  writeFileSync(taskPath, raw.replace(fm[0], `---\n${front}\n---`));
  console.log(`Verdikt zapisany do ${taskPath}`);
}

function fail(v, msg) {
  console.error(`\nJUDGE  ${v}\n  ${msg}\n`);
  process.exit(EXIT[v]);
}
