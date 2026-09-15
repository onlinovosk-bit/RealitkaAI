#!/usr/bin/env node
/**
 * Cieľová cesta: apps/crm/scripts/tc-orchestrator.mjs
 *
 * ORCHESTRÁTOR paralelného profilu PARALLEL-3 pre balík
 * 2026-09-16-typecheck-paydown-loop.
 *
 * Prečo to existuje: profil PARALLEL-3 predpokladá orchestrátora, ktorý
 * vytvorí worktrees, počká na workerov, zlúči ich vetvy a spustí Judge.
 * Cursor agent session je JEDEN agent — nevie spustiť troch workerov.
 * Deterministickú časť preto robí tento skript a agentom zostáva jediné:
 * opraviť typy v jednom súbore.
 *
 * NEVOLÁ MODEL. Nemá názor. Iba pripravuje, overuje a zlučuje.
 *
 * Použitie:
 *   node apps/crm/scripts/tc-orchestrator.mjs plan    --batch 1
 *   node apps/crm/scripts/tc-orchestrator.mjs status  --batch 1
 *   node apps/crm/scripts/tc-orchestrator.mjs collect --batch 1
 *   node apps/crm/scripts/tc-orchestrator.mjs finish  --batch 1
 *
 * Exit kódy: 0 OK · 1 NIE JE HOTOVÉ · 2 CHYBA/STOP
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { execSync, spawnSync } from "node:child_process";
import { join, resolve } from "node:path";

const OK = 0, NOT_READY = 1, STOP = 2;

const PKG = "docs/overnight/2026-09-16-typecheck-paydown-loop";
const PROFILE = `${PKG}/lanes-parallel.json`;
const LOCKS = ".ai/bus/state/typecheck-loop-locks.json";
const WORKROOT = process.env.TC_WORKROOT || "C:/RealitkaAI-run/tc";
const MAX_OPEN_PRS = 3;
const DONE_MARKER = ".tc-worker-done.json";

const [, , cmd, ...rest] = process.argv;
const arg = (n, d = null) => {
  const i = rest.indexOf(n);
  return i >= 0 && rest[i + 1] ? rest[i + 1] : d;
};
const batchNo = Number(arg("--batch", "0"));

if (!cmd || !["plan", "status", "collect", "finish"].includes(cmd)) {
  console.error("Použitie: tc-orchestrator.mjs plan|status|collect|finish --batch <N>");
  process.exit(STOP);
}
if (!batchNo) die("Chýba --batch <N>");

/* ── načítaj profil ─────────────────────────────────────────────────────── */
if (!existsSync(PROFILE)) die(`Profil neexistuje: ${PROFILE}`);
const profile = JSON.parse(readFileSync(PROFILE, "utf8"));
const batch = profile.batches.find((b) => b.batch === batchNo);
if (!batch) die(`Dávka ${batchNo} nie je v profile. Dávok je ${profile.batches.length}.`);

const intBranch = batch.integration_branch;
const taskFile = batch.task_contract;

switch (cmd) {
  case "plan":    plan();    break;
  case "status":  status();  break;
  case "collect": collect(); break;
  case "finish":  finish();  break;
}

/* ════════════════════════════════════════════════════════════════════════ */

function plan() {
  preflight();

  const locks = readLocks();
  const open = locks.locks.filter((l) => l.status === "OPEN").length;
  if (open >= MAX_OPEN_PRS) {
    console.error(`\nSTOP: max_open_prs — ${open} otvorených PR (limit ${MAX_OPEN_PRS}).`);
    console.error("Zmerguj rozpracované PR a spusti plan znova.\n");
    process.exit(STOP);
  }
  if (locks.locks.some((l) => l.batch === batchNo && l.status !== "FAILED")) {
    die(`Dávka ${batchNo} už má zámok. Použi status alebo collect.`);
  }

  const base = sh("git rev-parse origin/main").trim();
  console.log(`\nDÁVKA ${batchNo}  [${batch.tier}]  ${batch.workers.length} workerov · ${batch.errors} chýb`);
  console.log(`BASE_SHA ${base}`);
  console.log("-".repeat(78));

  mkdirSync(WORKROOT, { recursive: true });
  const created = [];

  for (const w of batch.workers) {
    const dir = resolve(WORKROOT, w.branch.replace(/[\/]/g, "-"));
    if (existsSync(dir)) die(`Worktree už existuje: ${dir}. Uprác ho alebo použi collect.`);
    sh(`git worktree add -b ${w.branch} "${dir}" ${base}`);
    // Lesenie orchestratora nesmie skoncit v diffe workera ani v PR.
    // Zistene testom: `git add -A` inak zoberie PROMPT.md aj marker
    // a kontrola uzemia ich oznaci ako "mimo uzemia".
    excludeScaffolding(dir);
    writeWorkerPrompt(dir, w);
    created.push({ ...w, dir });
    console.log(`  ${String(w.errors).padStart(2)} chýb  ${w.branch}`);
    console.log(`          ${dir}`);
  }

  locks.locks.push({
    batch: batchNo,
    branch: intBranch,
    territory: batch.workers.map((w) => w.file),
    workers: created.map((c) => ({ branch: c.branch, dir: c.dir, file: c.file })),
    status: "PENDING",
    base_sha: base,
    locked_at: new Date().toISOString(),
    pr: null,
  });
  writeLocks(locks);

  console.log("-".repeat(78));
  console.log("\nĎALEJ — v každom worktree zvlášť:");
  console.log("  1. npm ci                       (dá sa spustiť vo všetkých troch naraz)");
  console.log("  2. otvor Cursor v tom priečinku a vlož obsah PROMPT.md");
  console.log("\nKeď workeri dobehnú:");
  console.log(`  node apps/crm/scripts/tc-orchestrator.mjs status  --batch ${batchNo}`);
  console.log(`  node apps/crm/scripts/tc-orchestrator.mjs collect --batch ${batchNo}\n`);
}

function status() {
  const lock = lockFor(batchNo);
  console.log(`\nDÁVKA ${batchNo} — stav workerov\n` + "-".repeat(78));
  let done = 0;
  for (const w of lock.workers) {
    const marker = join(w.dir, DONE_MARKER);
    if (!existsSync(marker)) {
      console.log(`  ČAKÁ      ${w.file}`);
      continue;
    }
    let m;
    try { m = JSON.parse(readFileSync(marker, "utf8")); }
    catch { console.log(`  CHYBNÝ    ${w.file}  (${DONE_MARKER} sa nedá načítať)`); continue; }
    console.log(`  ${String(m.status).padEnd(9)} ${w.file}  ${m.note ?? ""}`);
    done++;
  }
  console.log("-".repeat(78));
  console.log(`hotových ${done}/${lock.workers.length}\n`);
  process.exit(done === lock.workers.length ? OK : NOT_READY);
}

function collect() {
  const lock = lockFor(batchNo);

  // collect NIE JE idempotentny a nesmie sa tvarit, ze je.
  // Po uspesnom behu je worktree prveho workera prepnuty na integracnu vetvu,
  // takze jeho diff voci BASE uz obsahuje aj cudzie subory — druhy beh by
  // prveho workera vyhodil ako "mimo uzemia" a ticho zostavil MENSIU davku.
  // Zistene testom.
  if (lock.integration_dir) {
    console.error(`\nSTOP: dávka ${batchNo} je už zintegrovaná.`);
    console.error(`  vetva:    ${intBranch}`);
    console.error(`  worktree: ${lock.integration_dir}`);
    console.error(`\nĎalej patrí Judge a finish, nie druhý collect:`);
    console.error(`  cd "${lock.integration_dir}"`);
    console.error(`  node apps/crm/scripts/judge.mjs --task ${taskFile} --write-verdict`);
    console.error(`  node apps/crm/scripts/tc-orchestrator.mjs finish --batch ${batchNo}`);
    console.error(`\nAk ju chceš zostaviť nanovo, najprv vráť zámok na PENDING`);
    console.error(`a worktree workerov na ich vlastné vetvy.\n`);
    process.exit(STOP);
  }

  const good = [], skipped = [];

  for (const w of lock.workers) {
    const marker = join(w.dir, DONE_MARKER);
    if (!existsSync(marker)) die(`Worker ešte nedobehol: ${w.file}. Spusti status.`);
    const m = JSON.parse(readFileSync(marker, "utf8"));
    if (m.status !== "DONE") { skipped.push({ ...w, reason: m.status + ": " + (m.note ?? "") }); continue; }

    // Overenie, ze worker sa naozaj drzal svojho uzemia.
    const changed = sh(`git -C "${w.dir}" diff --name-only ${lock.base_sha}...HEAD`)
      .split("\n").map((s) => s.trim()).filter(Boolean);
    const outside = changed.filter((f) => f !== w.file);
    if (outside.length) {
      skipped.push({ ...w, reason: "mimo územia: " + outside.join(", ") });
      continue;
    }
    if (!changed.length) { skipped.push({ ...w, reason: "žiadna zmena" }); continue; }
    good.push(w);
  }

  console.log(`\nDÁVKA ${batchNo} — integrácia\n` + "-".repeat(78));
  for (const s of skipped) console.log(`  VYNECHANÝ ${s.file}  — ${s.reason}`);
  if (!good.length) { console.error("\nSTOP: ani jeden worker neprešiel.\n"); process.exit(STOP); }

  // Integrujeme v worktree prveho workera — ma uz node_modules a je na
  // vetve z BASE_SHA. Setri to jeden cely worktree (~1,2 GB) a hlavne
  // NEPREPINA vetvu v hlavnom checkoute foundera, ktory moze dalej pracovat.
  const intDir = good[0].dir;
  const g = (c) => {
    const r = spawnSync("git", ["-C", intDir, ...c], { encoding: "utf8", shell: false });
    return r;
  };
  let r0 = g(["checkout", "-B", intBranch, lock.base_sha]);
  if (r0.status !== 0) {
    console.error(`\nSTOP: nedá sa založiť ${intBranch} v ${intDir}`);
    console.error(r0.stdout + r0.stderr);
    process.exit(STOP);
  }
  for (const w of good) {
    const r = g(["merge", "--no-ff", "--no-edit", w.branch]);
    if (r.status !== 0) {
      console.error(`\nSTOP: merge_conflict pri ${w.branch}`);
      console.error("Územia mali byť disjunktné — návrh má dieru, beh sa zastavuje.");
      console.error(r.stdout + r.stderr);
      g(["merge", "--abort"]);
      process.exit(STOP);
    }
    console.log(`  ZLÚČENÝ   ${w.file}`);
  }

  writeBatchContract(good, intDir);
  lock.integration_dir = intDir;
  saveLock(lock);
  console.log("-".repeat(78));
  console.log(`\nIntegračná vetva ${intBranch} pripravená, ${good.length} súborov.`);
  console.log(`Worktree:      ${intDir}`);
  console.log(`Task Contract: ${taskFile}\n`);
  console.log("Judge — spusti Z TOHO worktree:");
  console.log(`  cd "${intDir}"`);
  console.log(`  node apps/crm/scripts/judge.mjs --task ${taskFile} --write-verdict\n`);
  console.log(`Ak ACCEPT:  node apps/crm/scripts/tc-orchestrator.mjs finish --batch ${batchNo}\n`);
}

function finish() {
  const lock = lockFor(batchNo);
  // Judge musel dobehnut a zapisat verdikt do kontraktu.
  const intDir = lock.integration_dir;
  if (!intDir) die("Zámok nemá integration_dir. Spusti collect.");
  const contract = join(intDir, taskFile);
  if (!existsSync(contract)) die(`Task Contract neexistuje: ${contract}. Spusti collect.`);
  const txt = readFileSync(contract, "utf8");
  const m = /result:\s*(ACCEPT|REJECT|BLOCKED|HUMAN)/.exec(txt);
  if (!m) die("V Task Contracte nie je verdikt. Spusti Judge s --write-verdict.");
  if (m[1] !== "ACCEPT") {
    console.error(`\nSTOP: verdikt je ${m[1]}, nie ACCEPT. PR sa neotvára.\n`);
    lock.status = "FAILED"; saveLock(lock);
    process.exit(STOP);
  }

  sh(`git -C "${intDir}" add -A`);
  sh(`git -C "${intDir}" -c user.name=tc-orchestrator -c user.email=orchestrator@revolis.local commit -m "chore(tc): batch ${batchNo} task contract + judge verdict" --allow-empty`);
  sh(`git -C "${intDir}" push -u origin ${intBranch}`);
  lock.status = "OPEN";
  lock.pushed_at = new Date().toISOString();
  saveLock(lock);

  console.log(`\nVetva ${intBranch} pushnutá.`);
  console.log("\nOtvor PR ručne alebo cez gh:");
  console.log(`  gh pr create --base main --head ${intBranch} \\`);
  console.log(`    --title "fix(types): typecheck paydown batch ${batchNo} (${batch.errors} errors)" \\`);
  console.log(`    --body "Profil PARALLEL-3, dávka ${batchNo}. Judge: ACCEPT."`);
  console.log(`\nPotom doplň číslo PR do ${LOCKS} a spusti plan pre dávku ${batchNo + 1}.\n`);
}

/* ════════════════════════════════════════════════════════════════════════ */

function preflight() {
  const problems = [];
  if (!existsSync("apps/crm/scripts/judge.mjs")) problems.push("judge.mjs neexistuje — je #554 zmergovaný?");
  if (!existsSync("apps/crm/scripts/typecheck-baseline.mjs")) problems.push("typecheck-baseline.mjs neexistuje");
  // Orchestrator si sam pise zamky a Judge ledger — vlastne stopy nesmu
  // blokovat dalsi plan. Vsetko ostatne ano.
  const OWN = [LOCKS, ".ai/bus/ledger/"];
  const dirty = sh("git status --porcelain").trim().split("\n")
    .map((l) => l.trim()).filter(Boolean)
    .filter((l) => !OWN.some((o) => l.includes(o)));
  if (dirty.length) problems.push("pracovny strom nie je cisty:\n  " + dirty.slice(0, 5).join("\n  "));
  try { sh("git fetch origin"); } catch { problems.push("git fetch origin zlyhal"); }

  if (problems.length) {
    console.error("\nPRE-FLIGHT NEPREŠIEL:");
    for (const p of problems) console.error("  · " + p);
    console.error("");
    process.exit(STOP);
  }
  console.log("pre-flight OK");
}

function excludeScaffolding(dir) {
  const gitPath = sh(`git -C "${dir}" rev-parse --git-path info/exclude`).trim();
  const abs = resolve(dir, gitPath);
  mkdirSync(join(abs, ".."), { recursive: true });
  const cur = existsSync(abs) ? readFileSync(abs, "utf8") : "";
  if (!cur.includes("PROMPT.md")) {
    writeFileSync(abs, cur + `\n# lesenie tc-orchestratora - nikdy necommitovat\nPROMPT.md\n${DONE_MARKER}\n`);
  }
}

function writeWorkerPrompt(dir, w) {
  const p = `# WORKER — ${w.file}

Si worker dávky ${batchNo} profilu PARALLEL-3.
Pracuješ v tomto worktree, vetva \`${w.branch}\`.

## ÚLOHA

Oprav **${w.errors}** typových chýb v **jedinom** súbore:

    ${w.file}

Zisti ich takto:

    npx tsc --noEmit -p apps/crm/tsconfig.json 2>&1 | Select-String "${w.file.replace("apps/crm/", "")}"

## POVOLENÉ

- doplniť chýbajúci typ, generiku, \`satisfies\`
- doplniť chýbajúce pole do fixture tak, aby zodpovedalo skutočnému typu
- zúžiť \`unknown\` cez type guard
- opraviť skutočnú nezhodu typu

## ZAKÁZANÉ — každé z toho je tichý no-op

    as any · as unknown as X · @ts-ignore · @ts-expect-error
    it.skip · describe.skip · oslabenie assertion
    zmena tsconfig.json alebo next.config.js
    zmena akéhokoľvek iného súboru než ${w.file}

Ak sa chyba nedá opraviť bez niektorého z týchto, **nerob to** — zapíš
\`BLOCKED\` podľa postupu nižšie.

## OVERENIE

    npm --prefix apps/crm test
    git diff --name-only ${"${BASE}"}...HEAD     # musí vypísať IBA ${w.file}

## KEĎ SI HOTOVÝ

Commitni a do koreňa tohto worktree zapíš \`${DONE_MARKER}\`:

\`\`\`json
{ "status": "DONE", "file": "${w.file}", "errors_before": ${w.errors}, "note": "" }
\`\`\`

Ak sa to nedá opraviť poctivo:

\`\`\`json
{ "status": "BLOCKED", "file": "${w.file}", "note": "<dôvod jednou vetou>" }
\`\`\`

**Nepushuj, neotváraj PR, nemerguj.** To robí orchestrátor.
Ostatní dvaja workeri bežia súbežne v iných priečinkoch — nedotýkaj sa ich.
`;
  writeFileSync(join(dir, "PROMPT.md"), p);
}

function writeBatchContract(good, intDir) {
  mkdirSync(join(intDir, ".ai/bus/tasks"), { recursive: true });
  const paths = good.map((w) => `    - ${w.file}`).join("\n");

  // Bus validator prichadza s PR #555. Ak je na baze pritomny, zaradime ho
  // ako plnohodnotnu kontrolu. Ak nie je, NEMLCIME o tom — zapiseme to do
  // kontraktu ako poznamku, aby "chybajuca kontrola" bola vidno v artefakte.
  // (Presne ten vzor, ktory v tomto repe raz uz zlyhal: find-dead-exports.mjs
  //  bol vo workflowe deklarovany, v repe chybal, workflow ho ticho preskocil
  //  a job bol zeleny.)
  const busValidator = join(intDir, "apps/crm/scripts/bus-validate.mjs");
  const hasBus = existsSync(busValidator);
  const busAcceptance = hasBus
    ? `  - id: B5\n` +
      `    desc: "bus schema bez noveho porusenia"\n` +
      `    cmd: "node apps/crm/scripts/bus-validate.mjs --ci"\n` +
      `    expect: exit_code == 0\n`
    : "";
  const busNote = hasBus
    ? "Bus validator (#555) je na baze — acceptance B5 je zaradena."
    : "Bus validator (#555) NIE JE na baze — acceptance B5 vynechana. " +
      "Nie je to preskocena kontrola, je to kontrola, ktora na tejto baze " +
      "neexistuje. Po merge #555 ju dalsia davka dostane automaticky.";
  console.log(`  ${hasBus ? "B5 zaradena" : "B5 vynechana"} — ${hasBus ? "bus-validate.mjs je na baze" : "bus-validate.mjs na baze nie je"}`);
  const c = `---
id: TASK-TC-BATCH-${batchNo}
type: task
status: running
owner: tc-orchestrator
created_at: ${new Date().toISOString()}

scope:
  repo_paths:
${paths}
  forbidden_paths:
    - apps/crm/next.config.js
    - apps/crm/tsconfig.json
    - apps/crm/scripts/typecheck-baseline.json
    - apps/crm/src/lib/infra/**
    - apps/crm/supabase/migrations/**

acceptance:
  - id: B1
    desc: "typovych chyb ubudlo, nepribudlo"
    cmd: "node apps/crm/scripts/typecheck-baseline.mjs"
    expect: exit_code == 0
  - id: B2
    desc: "testy prechadzaju"
    cmd: "npm --prefix apps/crm test"
    expect: exit_code == 0
  - id: B3
    desc: "API kontrakt bez noveho porusenia"
    cmd: "node apps/crm/scripts/check-api-contract.mjs --ci"
    expect: exit_code == 0
  - id: B4
    desc: "diff nevysiel zo scope"
    cmd: "git diff --name-only origin/main...HEAD"
    expect: all_paths_in(scope.repo_paths)
${busAcceptance}
budget:
  max_iterations: 3
  max_cost_usd: 2

risk: low

verdict:
  result: null
---

# TASK-TC-BATCH-${batchNo}

Integrovana davka ${batchNo} profilu PARALLEL-3, ${good.length} suborov.

## Najprv som hladal

Orchestrator zlucil vetvy workerov do ${intBranch}. Kazdy worker menil prave
jeden subor; disjointnost overena pred merge.

## Rozsah kontrol

${busNote}
`;
  writeFileSync(join(intDir, taskFile), c);
}

function readLocks() {
  if (!existsSync(LOCKS)) return { locks: [] };
  return JSON.parse(readFileSync(LOCKS, "utf8"));
}
function writeLocks(l) {
  mkdirSync(".ai/bus/state", { recursive: true });
  writeFileSync(LOCKS, JSON.stringify(l, null, 1) + "\n");
}
function lockFor(n) {
  const l = readLocks().locks.find((x) => x.batch === n && x.status !== "FAILED");
  if (!l) die(`Dávka ${n} nemá aktívny zámok. Spusti plan.`);
  return l;
}
function saveLock(lock) {
  const all = readLocks();
  const i = all.locks.findIndex((x) => x.batch === lock.batch && x.status !== "FAILED");
  all.locks[i] = lock;
  writeLocks(all);
}
function sh(c, quiet = false) {
  try { return execSync(c, { encoding: "utf8", stdio: quiet ? "pipe" : ["ignore", "pipe", "pipe"] }); }
  catch (e) { if (quiet) return ""; throw e; }
}
function die(msg) { console.error(`\nCHYBA: ${msg}\n`); process.exit(STOP); }
