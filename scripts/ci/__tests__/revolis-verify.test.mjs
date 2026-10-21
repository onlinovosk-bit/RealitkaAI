// Testy pre scripts/ci/lib/verify-core.mjs a statické strážce adaptérov.
// Spustenie: node --test scripts/ci/__tests__/revolis-verify.test.mjs
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { resolve } from "node:path";
import {
  STATUS, aggregate, classifyFile, criticalFlowsFor, evaluateCriteria, globToRegExp, lintPlan,
  parseVitestSummary, planChecks, scopeCheck, statusFromRun, untestedChanges, worst,
} from "../lib/verify-core.mjs";

const ROOT = resolve(new URL("../../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(ROOT, rel), "utf8");
const vitest = { kind: "vitest", cmd: ["npx", "vitest"] };

// ── stavy: preskočené, blokované a nespustené nie sú PASS ───────────────────

test("0 vykonaných testov s exit 0 je NOT_VERIFIED, nie PASS", () => {
  const r = statusFromRun(vitest, { exitCode: 0, output: " Test Files  1 skipped (1)\n      Tests  3 skipped (3)\n" });
  assert.equal(r.status, STATUS.NOT_VERIFIED);
});

test("preskočené testy sa hlásia, ale PASS vzniká iba z vykonaných", () => {
  const r = statusFromRun(vitest, { exitCode: 0, output: "      Tests  10 passed | 4 skipped (14)\n" });
  assert.equal(r.status, STATUS.PASS);
  assert.match(r.note, /preskočených 4/);
  assert.match(r.note, /nepočítajú/);
  assert.equal(r.summary.tests.skipped, 4);
});

test("nenulový exit je FAIL aj keď výstup obsahuje prešlé testy", () => {
  const r = statusFromRun(vitest, { exitCode: 1, output: "      Tests  1 failed | 9 passed (10)\n" });
  assert.equal(r.status, STATUS.FAIL);
});

test("chýbajúci nástroj a chýbajúca DB sú BLOCKED, nikdy PASS ani FAIL", () => {
  assert.equal(statusFromRun({ ...vitest, needsTool: "supabase" }, { toolMissing: true }).status, STATUS.BLOCKED);
  assert.equal(statusFromRun({ ...vitest, needsDb: true }, { dbAvailable: false, exitCode: 0, output: "Tests 5 passed" }).status, STATUS.BLOCKED);
});

test("nespustená kontrola (bez --run) je NOT_VERIFIED", () => {
  assert.equal(statusFromRun(vitest, { notRun: true }).status, STATUS.NOT_VERIFIED);
});

test("brána s riadkami NEOVERENÉ ich ukáže v poznámke, nezahodí ich", () => {
  const out = "\u001b[33mNEOVERENÉ\u001b[0m  migrácie: spusti s --with-db\nVŠETKO PREŠLO\n";
  const r = statusFromRun({ kind: "gate", cmd: ["bash"] }, { exitCode: 0, output: out });
  assert.equal(r.status, STATUS.PASS);
  assert.match(r.note, /1 neoverených/);
  assert.match(r.note, /migrácie/);
  assert.equal(statusFromRun({ kind: "gate", cmd: ["bash"] }, { exitCode: 0, output: "VŠETKO PREŠLO" }).note, "exit 0");
});

test("worst: FAIL > BLOCKED > NOT_VERIFIED > PASS; prázdny zoznam nie je PASS", () => {
  assert.equal(worst(["PASS", "NOT_VERIFIED", "BLOCKED"]), "BLOCKED");
  assert.equal(worst(["PASS", "FAIL", "BLOCKED"]), "FAIL");
  assert.equal(worst([]), "NOT_VERIFIED");
});

test("parseVitestSummary číta pass/fail/skip/todo", () => {
  const s = parseVitestSummary(" Test Files  2 passed | 1 skipped (3)\n      Tests  5 passed | 2 failed | 3 skipped | 1 todo (11)\n");
  assert.deepEqual(s.tests, { passed: 5, failed: 2, skipped: 3, todo: 1 });
  assert.deepEqual(s.files, { passed: 2, failed: 0, skipped: 1 });
});

// ── kritériá a verdikt „hotovo" ─────────────────────────────────────────────

const pass = { id: "related-tests", status: STATUS.PASS, required: true };

test("kritérium bez dôkazu alebo iba s ručným tvrdením je NOT_VERIFIED", () => {
  const out = evaluateCriteria(
    [{ id: "AC1", text: "a" }, { id: "AC2", text: "b", evidence: ["manual:vyskúšal som"] }, { id: "AC3", text: "c", evidence: ["check:neexistuje"] }],
    [pass],
  );
  assert.deepEqual(out.map((c) => c.status), ["NOT_VERIFIED", "NOT_VERIFIED", "NOT_VERIFIED"]);
});

test("kritérium je PASS iba keď všetky odkazované kontroly sú PASS", () => {
  const ok = evaluateCriteria([{ id: "AC1", text: "x", evidence: ["check:related-tests"] }], [pass]);
  assert.equal(ok[0].status, STATUS.PASS);
  const bad = evaluateCriteria([{ id: "AC1", text: "x", evidence: ["check:related-tests", "check:lint"] }],
    [pass, { id: "lint", status: STATUS.FAIL }]);
  assert.equal(bad[0].status, STATUS.FAIL);
});

test("DONE nie je povolené bez akceptačných kritérií, ani keď všetky kontroly prešli", () => {
  const a = aggregate({ checks: [pass], criteria: [], scope: null, untested: [] });
  assert.equal(a.doneAllowed, false);
  assert.equal(a.overall, STATUS.NOT_VERIFIED);
});

test("DONE je povolené iba keď kontroly, kritériá, rozsah a pokrytie sú PASS", () => {
  const crit = evaluateCriteria([{ id: "AC1", text: "x", evidence: ["check:related-tests"] }], [pass]);
  const a = aggregate({ checks: [pass], criteria: crit, scope: { status: STATUS.PASS, note: "ok" }, untested: [] });
  assert.equal(a.doneAllowed, true);
  assert.equal(a.overall, STATUS.PASS);
});

test("jeden FAIL, BLOCKED alebo nepokrytý zdroj zruší DONE", () => {
  const crit = evaluateCriteria([{ id: "AC1", text: "x", evidence: ["check:related-tests"] }], [pass]);
  const base = { checks: [pass], criteria: crit, scope: { status: STATUS.PASS, note: "ok" }, untested: [] };
  assert.equal(aggregate({ ...base, checks: [pass, { id: "x", status: STATUS.FAIL, required: true }] }).doneAllowed, false);
  assert.equal(aggregate({ ...base, checks: [pass, { id: "x", status: STATUS.BLOCKED, required: true }] }).doneAllowed, false);
  assert.equal(aggregate({ ...base, untested: ["apps/crm/src/lib/a.ts"] }).doneAllowed, false);
  assert.equal(aggregate({ ...base, scope: { status: STATUS.FAIL, note: "mimo" } }).doneAllowed, false);
});

// ── výber kontrol z diffu, rozsah, nepokryté zmeny ──────────────────────────

test("klasifikácia súborov", () => {
  assert.equal(classifyFile("apps/crm/src/lib/a.ts"), "src");
  assert.equal(classifyFile("apps/crm/src/lib/__tests__/a.test.ts"), "test");
  assert.equal(classifyFile("apps/crm/supabase/migrations/20261005100100_x.sql"), "migration");
  assert.equal(classifyFile("docs/x.md"), "docs");
  assert.equal(classifyFile("scripts/ci/x.sh"), "infra");
  assert.equal(classifyFile("AGENTS.md"), "infra");
});

test("zmena v CRM zdroji pridá related-tests a lint; docs-only nepridá nič", () => {
  const ids = planChecks(["apps/crm/src/lib/a.ts"]).map((c) => c.id);
  assert.ok(ids.includes("related-tests") && ids.includes("lint-changed"));
  assert.deepEqual(planChecks(["docs/a.md", "memory/b.md"]), []);
});

test("migrácia pridá replay kontrolu s nárokom na DB a nástroj", () => {
  const m = planChecks(["apps/crm/supabase/migrations/20261005100100_x.sql"]).find((c) => c.id === "migrations-replay");
  assert.ok(m && m.needsDb && m.needsTool === "supabase");
});

test("kritický tok sa pridá podľa cesty (billing, tenant-isolation)", () => {
  assert.deepEqual(criticalFlowsFor(["apps/crm/src/app/api/billing/checkout/route.ts"]).map((f) => f.id), ["billing"]);
  assert.ok(criticalFlowsFor(["apps/crm/supabase/migrations/1_x.sql"]).some((f) => f.id === "tenant-isolation"));
  assert.ok(planChecks(["apps/crm/src/app/api/billing/x.ts"]).some((c) => c.id === "flow:billing"));
});

test("zmenený zdroj bez testu sa nahlási; zmenený alebo susedný test ho kryje", () => {
  const none = () => false;
  assert.deepEqual(untestedChanges(["apps/crm/src/lib/a.ts"], none), ["apps/crm/src/lib/a.ts"]);
  assert.deepEqual(untestedChanges(["apps/crm/src/lib/a.ts", "apps/crm/src/lib/__tests__/a.test.ts"], none), []);
  assert.deepEqual(untestedChanges(["apps/crm/src/lib/a.ts"], (p) => p === "apps/crm/src/lib/a.test.ts"), []);
});

test("rozsah: súbor mimo deklarovaného rozsahu je FAIL; bez rozsahu NOT_VERIFIED", () => {
  assert.equal(scopeCheck(["a/x.ts", "b/y.ts"], ["a/**"]).status, STATUS.FAIL);
  assert.deepEqual(scopeCheck(["a/x.ts", "b/y.ts"], ["a/**"]).outside, ["b/y.ts"]);
  assert.equal(scopeCheck(["a/x.ts"], ["a/**"]).status, STATUS.PASS);
  assert.equal(scopeCheck(["a/x.ts"], []).status, STATUS.NOT_VERIFIED);
  assert.ok(globToRegExp("scripts/ci/*.sh").test("scripts/ci/a.sh"));
  assert.ok(!globToRegExp("scripts/ci/*.sh").test("scripts/ci/lib/a.sh"));
});

// ── lint plánu ──────────────────────────────────────────────────────────────

const GOOD_PLAN = `# Plán
## Rozsah
Oprava X.
## Znovupoužitie
Použijem lib/y.ts.
## Akceptačné kritériá
- \`npx vitest related\` skončí exit 0 a vykoná ≥ 1 test
## Riziká
Nízke.
## Brány
Merge vyžaduje FOUNDER GO.
## Kroky
1. Zmeniť lib/y.ts
2. Pridať test
3. Otvoriť draft PR
## Mimo rozsahu
Merge a deploy.
`;

test("úplný plán prejde; sekcia „Mimo rozsahu“ s merge nevyžaduje FOUNDER GO sama o sebe", () => {
  assert.equal(lintPlan(GOOD_PLAN).ok, true);
  const noGate = GOOD_PLAN.replace("Merge vyžaduje FOUNDER GO.", "Nič zvláštne.").replace("3. Otvoriť draft PR", "3. Otvoriť draft PR");
  assert.equal(lintPlan(noGate).ok, true);
});

test("plán s krokom merge/deploy bez FOUNDER GO v bránach padá", () => {
  const bad = GOOD_PLAN.replace("Merge vyžaduje FOUNDER GO.", "Nič.").replace("3. Otvoriť draft PR", "3. Zmergovať a nasadiť do PROD");
  const r = lintPlan(bad);
  assert.equal(r.ok, false);
  assert.ok(r.findings.some((f) => f.code === "missing-founder-go"));
});

test("chýbajúce sekcie, prázdne alebo vágne kritériá plán zamietnu", () => {
  assert.ok(lintPlan("# prázdny").findings.some((f) => f.code === "missing-acceptance"));
  assert.ok(lintPlan(GOOD_PLAN.replace(/- `npx[^\n]*/, "")).findings.some((f) => f.code === "empty-acceptance"));
  const vague = lintPlan(GOOD_PLAN.replace(/- `npx[^\n]*/, "- Všetko funguje správne"));
  assert.ok(vague.findings.some((f) => f.code === "vague-acceptance"));
  assert.equal(vague.ok, false);
});

test("príliš dlhý plán je varovanie, nie chyba", () => {
  const steps = Array.from({ length: 14 }, (_, i) => `${i + 1}. krok ${i}`).join("\n");
  const r = lintPlan(GOOD_PLAN.replace(/1\. Zmeniť[\s\S]*?draft PR/, steps));
  assert.ok(r.findings.some((f) => f.code === "too-many-steps" && f.level === "warn"));
});

// ── statické strážce: adaptéry hostiteľov ukazujú na existujúce zdroje ──────

const SKILLS = ["revolis-verify-completion", "revolis-review-plan"];

test("obe Skills existujú, majú frontmatter a odkazujú na skutočné súbory", () => {
  for (const name of SKILLS) {
    const rel = `.claude/skills/${name}/SKILL.md`;
    assert.ok(existsSync(resolve(ROOT, rel)), `chýba ${rel}`);
    const txt = read(rel);
    assert.match(txt, new RegExp(`^---\\nname: ${name}\\n`), `${name}: frontmatter name`);
    assert.match(txt, /\ndescription:/, `${name}: description`);
    for (const m of txt.matchAll(/`((?:scripts|docs|\.claude|\.cursor)\/[^`\s]+?\.(?:mjs|sh|md|mdc))`/g)) {
      assert.ok(existsSync(resolve(ROOT, m[1])), `${name} odkazuje na neexistujúci súbor ${m[1]}`);
    }
  }
});

test("AGENTS.md a Cursor pravidlo ukazujú na obe Skills a na spoločný kontrakt", () => {
  for (const rel of ["AGENTS.md", ".cursor/rules/revolis-cross-agent.mdc"]) {
    const txt = read(rel);
    for (const s of SKILLS) assert.ok(txt.includes(`.claude/skills/${s}/SKILL.md`), `${rel} neodkazuje na ${s}`);
    assert.ok(txt.includes("docs/architecture/cross-agent-engineering-contract.md"), `${rel} neodkazuje na kontrakt`);
  }
});

test("kontrakt zakazuje merge, deploy a PROD bez explicitného GO foundera", () => {
  const txt = read("docs/architecture/cross-agent-engineering-contract.md");
  for (const k of ["merge", "LIVE", "migr", "tajomst"]) assert.ok(new RegExp(k, "i").test(txt), `kontrakt nespomína ${k}`);
  assert.match(txt, /zelen[ée] CI[^.\n]*(nie je|nestačí|neznamená)/i);
});

test("Skill verify-completion nepripúšťa DONE bez dôkazu a pozná štyri stavy", () => {
  const txt = read(".claude/skills/revolis-verify-completion/SKILL.md");
  for (const st of ["PASS", "FAIL", "BLOCKED", "NOT_VERIFIED"]) assert.ok(txt.includes(st), `chýba stav ${st}`);
  assert.match(txt, /preskočen[^.\n]*nie (je|sú)[^.\n]*PASS|preskočen[^.\n]*nepočítaj/i);
});
