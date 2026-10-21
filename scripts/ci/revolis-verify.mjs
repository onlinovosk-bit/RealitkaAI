#!/usr/bin/env node
// revolis-verify — jeden vstupný bod pre dve kontroly zo spoločného inžinierskeho kontraktu.
//
//   node scripts/ci/revolis-verify.mjs completion [--base origin/main] [--scope "glob,glob"]
//                                      [--criteria kriteria.json] [--run] [--out dir]
//   node scripts/ci/revolis-verify.mjs plan-lint <plan.md>
//
// Kód výstupu: 0 = hotovo smie byť potvrdené / plán je v poriadku
//              1 = FAIL (kontrola zlyhala alebo plán porušuje pravidlo)
//              2 = BLOCKED alebo NOT_VERIFIED (nedostatok dôkazu — nie je to PASS)
//
// Nič nemení: číta git, spúšťa existujúce kontroly (vitest, eslint, prepush-gate) a píše
// správu. Žiadny merge, push, deploy ani zápis do DB.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  STATUS, aggregate, evaluateCriteria, lintPlan, planChecks, renderMarkdown,
  scopeCheck, statusFromRun, untestedChanges,
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
  const md = renderMarkdown(report);
  console.log(md);

  const out = arg("out");
  if (out) {
    mkdirSync(resolve(out), { recursive: true });
    writeFileSync(join(resolve(out), "verify-completion.json"), JSON.stringify(report, null, 2));
    writeFileSync(join(resolve(out), "verify-completion.md"), md);
  }
  process.exit(agg.overall === STATUS.FAIL ? 1 : agg.doneAllowed ? 0 : 2);
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
else { console.error("použitie: revolis-verify.mjs completion|plan-lint ..."); process.exit(2); }
