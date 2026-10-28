#!/usr/bin/env node
// revolis-verify — jeden vstupný bod pre dve kontroly zo spoločného inžinierskeho kontraktu.
//
//   node scripts/ci/revolis-verify.mjs completion [--base origin/main] [--scope "glob,glob"]
//                                      [--criteria kriteria.json] [--run] [--out dir]
//   node scripts/ci/revolis-verify.mjs plan-lint <plan.md>
//
// Kód výstupu: 0 = odvodený stav naozaj podporuje hotovo (workflow: prReady a kód nie je blocked)
//              1 = FAIL (kontrola zlyhala, neplatný prechod, alebo plán porušuje pravidlo)
//              2 = BLOCKED alebo NOT_VERIFIED (nedostatok dôkazu — nie je to PASS)
//
// Nič nemení: číta git, spúšťa existujúce kontroly (vitest, eslint, prepush-gate) a píše
// správu. Žiadny merge, push, deploy ani zápis do DB.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  STATUS, aggregate, evaluateCriteria, evaluateWorkflow, lintPlan, planChecks, renderMarkdown,
  scopeCheck, statusFromRun, untestedChanges, workflowExitCode,
} from "./lib/verify-core.mjs";

const ROOT = resolve(new URL("../..", import.meta.url).pathname);

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? def : process.argv[i + 1];
}
const flag = (name) => process.argv.includes(`--${name}`);

function sh(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { cwd: ROOT, encoding: "utf8", ...opts });
}

function changedFiles(base) {
  const committed = sh("git", ["diff", "--name-only", `${base}...HEAD`]);
  if (committed.status !== 0) {
    console.error(`git diff ${base}...HEAD zlyhal: ${committed.stderr.trim()}`);
    process.exit(2);
  }
  const dirty = sh("git", ["status", "--porcelain"]).stdout
    .split("\n").filter(Boolean).map((l) => l.slice(3).replace(/^"|"$/g, ""));
  return [...new Set([...committed.stdout.split("\n").filter(Boolean), ...dirty])].sort();
}

function toolExists(name) {
  return sh("sh", ["-c", `command -v ${name}`]).status === 0;
}

function runCheck(check, doRun) {
  const base = { id: check.id, title: check.title, required: check.required };
  if (!doRun) return { ...base, ...statusFromRun(check, { notRun: true }) };
  const tool = check.needsTool || (check.cmd[0] === "npx" ? null : check.cmd[0]);
  if (tool && !toolExists(tool)) return { ...base, ...statusFromRun(check, { toolMissing: true }) };
  const dbAvailable = toolExists("supabase") && toolExists("docker");
  if (check.needsDb && !dbAvailable) return { ...base, ...statusFromRun(check, { dbAvailable: false }) };
  const r = sh(check.cmd[0], check.cmd.slice(1), { cwd: join(ROOT, check.cwd), timeout: 15 * 60 * 1000, maxBuffer: 64 * 1024 * 1024 });
  const output = `${r.stdout || ""}\n${r.stderr || ""}`;
  return { ...base, ...statusFromRun(check, { exitCode: r.status ?? 1, output, dbAvailable }), tail: output.trim().split("\n").slice(-15).join("\n") };
}

function completion() {
  const base = arg("base", "origin/main");
  const scope = arg("scope", "") ? arg("scope").split(",").map((s) => s.trim()).filter(Boolean) : [];
  const critFile = arg("criteria");
  const criteriaIn = critFile ? JSON.parse(readFileSync(resolve(critFile), "utf8")) : [];
  const files = changedFiles(base);

  const checks = planChecks(files).map((c) => runCheck(c, flag("run")));
  const untested = untestedChanges(files, (p) => existsSync(join(ROOT, p)));
  const scopeRes = scopeCheck(files, scope);
  const criteria = evaluateCriteria(criteriaIn, checks);
  const agg = aggregate({ checks, criteria, scope: scopeRes, untested });

  const report = { base, files, checks, criteria, scope: scopeRes, ...agg };
  let md = renderMarkdown(report);
  let workflowExit = null;
  const taskPath = arg("task", "");
  if (taskPath) {
    const task = JSON.parse(readFileSync(resolve(taskPath), "utf8"));
    const wf = evaluateWorkflow({
      assertedState: task.assertedState ?? null,
      previousState: task.previousState ?? null,
      evidence: evidenceFromTask(task, { files, checks, criteria, scopeStatus: scopeRes.status, untested }),
    });
    report.workflow = wf;
    md += `\n## Stav úlohy\n\nEfektívny stav: **${wf.effectiveState}** · kód: \`${wf.code}\` · PR ready: ${wf.prReady ? "áno" : "nie"} · merge: nie · deploy: nie\n`;
    workflowExit = workflowExitCode(wf);
  }
  console.log(md);

  const out = arg("out");
  if (out) {
    mkdirSync(resolve(out), { recursive: true });
    writeFileSync(join(resolve(out), "verify-completion.json"), JSON.stringify(report, null, 2));
    writeFileSync(join(resolve(out), "verify-completion.md"), md);
  }
  if (workflowExit !== null) process.exit(workflowExit);
  process.exit(agg.overall === STATUS.FAIL ? 1 : agg.doneAllowed ? 0 : 2);
}

function evidenceFromTask(task, measured) {
  return {
    started: measured.files.length > 0 || Boolean(task.started),
    author: task.author,
    filesChanged: measured.files,
    checks: measured.checks,
    criteria: measured.criteria,
    scopeStatus: measured.scopeStatus,
    untested: measured.untested,
    independentReview: task.independentReview ?? null,
    humanApproval: task.humanApproval ?? null,
    mergeEvidence: task.mergeEvidence ?? null,
    deployEvidence: task.deployEvidence ?? null,
    productionEvidence: task.productionEvidence ?? null,
  };
}

function workflow() {
  const taskPath = arg("task", "");
  if (!taskPath) { console.error("použitie: workflow --task <file.json> [--run]"); process.exit(2); }
  const task = JSON.parse(readFileSync(resolve(taskPath), "utf8"));
  const base = arg("base", "origin/main");
  const scope = Array.isArray(task.scope) ? task.scope : [];
  const criteriaIn = Array.isArray(task.criteria) ? task.criteria : [];
  const files = changedFiles(base);
  const checks = planChecks(files).map((c) => runCheck(c, flag("run")));
  const untested = untestedChanges(files, (p) => existsSync(join(ROOT, p)));
  const scopeRes = scopeCheck(files, scope);
  const criteria = evaluateCriteria(criteriaIn, checks);
  const wf = evaluateWorkflow({
    assertedState: task.assertedState ?? null,
    previousState: task.previousState ?? null,
    evidence: evidenceFromTask(task, { files, checks, criteria, scopeStatus: scopeRes.status, untested }),
  });
  console.log(`# Stav úlohy: **${wf.effectiveState}**`);
  console.log("");
  console.log(`Kód: \`${wf.code}\``);
  console.log(`Tvrdený stav: ${wf.assertedState ?? "(žiadny)"}`);
  console.log(`PR ready: ${wf.prReady ? "áno" : "nie"}`);
  console.log("Merge: nie. Deploy: nie.");
  if (wf.blockers.length) console.log(`Blokéry: ${wf.blockers.map((b) => b.code).join(", ")}`);
  console.log("");
  console.log("_Stavy kontrol pochádzajú z behu, nie z JSON tvrdenia. Tvrdenie agenta samo osebe stav neposunie._");
  if (!task.assertedState) process.exit(2);
  process.exit(workflowExitCode(wf));
}

function planLint() {
  const file = process.argv[3];
  if (!file) { console.error("použitie: plan-lint <plan.md>"); process.exit(2); }
  const res = lintPlan(readFileSync(resolve(file), "utf8"));
  for (const f of res.findings) console.log(`${f.level.toUpperCase()} ${f.code}: ${f.msg}`);
  console.log(res.ok ? "PLAN OK" : "PLAN NEPLATNÝ");
  process.exit(res.ok ? 0 : 1);
}

const cmd = process.argv[2];
if (cmd === "completion") completion();
else if (cmd === "plan-lint") planLint();
else if (cmd === "workflow") workflow();
else { console.error("použitie: revolis-verify.mjs completion|plan-lint|workflow ..."); process.exit(2); }
