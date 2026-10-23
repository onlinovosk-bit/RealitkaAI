// verify-core.mjs — čisté funkcie pre `revolis-verify` (completion + plan-lint).
//
// Žiadne I/O, žiadne závislosti: testuje sa to bez gitu, bez vitestu, bez siete.
// Stavy sú štyri a nezamieňajú sa:
//   PASS          príkaz sa naozaj vykonal, vykonal aspoň 1 test/kontrolu a skončil 0
//   FAIL          príkaz sa vykonal a zlyhal (alebo porušil explicitné pravidlo)
//   BLOCKED       kontrola sa nedala spustiť (chýba nástroj, DB, prístup)
//   NOT_VERIFIED  nikto to nespustil, alebo chýba dôkaz (aj „0 testov nájdených")
// Preskočený test sa NIKDY nepočíta ako PASS.

export const STATUS = Object.freeze({
  PASS: "PASS",
  FAIL: "FAIL",
  BLOCKED: "BLOCKED",
  NOT_VERIFIED: "NOT_VERIFIED",
});

// FAIL > BLOCKED > NOT_VERIFIED > PASS
const SEVERITY = { PASS: 0, NOT_VERIFIED: 1, BLOCKED: 2, FAIL: 3 };

export function worst(statuses) {
  if (!statuses.length) return STATUS.NOT_VERIFIED;
  return statuses.reduce((a, b) => (SEVERITY[b] > SEVERITY[a] ? b : a));
}

// ── 1. klasifikácia zmenených súborov ──────────────────────────────────────

export function classifyFile(path) {
  if (/(^|\/)(__tests__|tests)\/|\.(test|spec)\.[cm]?[jt]sx?$/.test(path)) return "test";
  if (/(^|\/)supabase\/migrations\/.+\.sql$/.test(path)) return "migration";
  // Pokyny pre agentov menia správanie agentov, nie sú to „iba dokumentácia".
  if (path === "AGENTS.md" || path === "CLAUDE.md") return "infra";
  if (/^(docs|memory|\.ai)\//.test(path) || (!path.includes("/") && path.endsWith(".md"))) return "docs";
  if (/^(\.github|scripts|\.claude|\.cursor)\//.test(path) || path === "AGENTS.md") return "infra";
  if (/^(apps\/[^/]+|packages\/[^/]+)\/src\//.test(path)) return "src";
  return "other";
}

// Kritické toky: ak diff sahá na cestu, ktorá sedí na `pattern`, pridá sa povinná
// kontrola so zhodnými vitest filtrami. `needsDb` = potrebuje lokálny Postgres,
// bez neho je výsledok BLOCKED (nie PASS a nie FAIL).
export const CRITICAL_FLOWS = [
  { id: "billing", pattern: /billing|pricing|stripe|checkout|credits/i, filters: ["billing", "pricing-v2"], needsDb: false },
  { id: "inbound", pattern: /inbound|acquire|gmail|email/i, filters: ["inbound", "acquire"], needsDb: false },
  { id: "tenant-isolation", pattern: /rls|supabase\/migrations|agency_id|tenant/i, filters: ["rls", "tenant"], needsDb: true },
  { id: "auth", pattern: /(^|\/)(auth|middleware|proxy)[./-]|\/auth\//i, filters: ["auth", "middleware"], needsDb: false },
];

export function criticalFlowsFor(files) {
  return CRITICAL_FLOWS.filter((f) => files.some((p) => f.pattern.test(p)));
}

// ── 2. plán kontrol z diffu ────────────────────────────────────────────────

export function planChecks(files) {
  const kinds = files.map(classifyFile);
  const src = files.filter((_, i) => kinds[i] === "src");
  const crmSrc = src.filter((p) => p.startsWith("apps/crm/"));
  const checks = [];

  if (crmSrc.length) {
    const rel = crmSrc.map((p) => p.replace(/^apps\/crm\//, ""));
    checks.push({
      id: "related-tests",
      title: "Testy viazané na zmenené súbory (vitest related)",
      cwd: "apps/crm",
      cmd: ["npx", "vitest", "related", "--run", ...rel],
      required: true,
      kind: "vitest",
    });
    checks.push({
      id: "lint-changed",
      title: "ESLint na zmenených súboroch",
      cwd: "apps/crm",
      cmd: ["npx", "eslint", "--quiet", ...rel.filter((p) => /\.[jt]sx?$/.test(p))],
      required: true,
      kind: "lint",
    });
  }

  for (const flow of criticalFlowsFor(files)) {
    checks.push({
      id: `flow:${flow.id}`,
      title: `Kritický tok: ${flow.id}`,
      cwd: "apps/crm",
      cmd: ["npx", "vitest", "run", ...flow.filters],
      required: true,
      kind: "vitest",
      needsDb: flow.needsDb,
    });
  }

  if (kinds.includes("migration")) {
    checks.push({
      id: "migrations-replay",
      title: "Migrácie na čistej DB (supabase db reset)",
      cwd: "apps/crm",
      cmd: ["supabase", "db", "reset"],
      required: true,
      kind: "db",
      needsTool: "supabase",
      needsDb: true,
    });
  }

  if (kinds.includes("infra")) {
    checks.push({
      id: "prepush-gate",
      title: "Existujúca pred-push brána (scripts/ci/prepush-gate.sh)",
      cwd: ".",
      cmd: ["bash", "scripts/ci/prepush-gate.sh"],
      required: true,
      kind: "gate",
    });
  }

  return checks;
}

// ── 3. nepokryté zmeny a rozsah ────────────────────────────────────────────

// Zmenený zdrojový súbor bez testu: ani zmeneného v diffe, ani susedného na disku.
export function untestedChanges(files, exists) {
  const changedTests = new Set(files.filter((p) => classifyFile(p) === "test"));
  const out = [];
  for (const p of files) {
    if (classifyFile(p) !== "src") continue;
    if (!/\.[cm]?[jt]sx?$/.test(p)) continue;
    const m = p.match(/^(.*\/)?([^/]+)\.([cm]?[jt]sx?)$/);
    if (!m) continue;
    const [, dir = "", base] = m;
    const candidates = [
      `${dir}${base}.test.ts`, `${dir}${base}.test.tsx`, `${dir}__tests__/${base}.test.ts`,
      `${dir}__tests__/${base}.test.tsx`, `${dir}__tests__/route.test.ts`,
    ];
    const hasTest = candidates.some((c) => changedTests.has(c) || exists(c));
    if (!hasTest) out.push(p);
  }
  return out;
}

export function globToRegExp(glob) {
  const esc = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*\//g, "§§/").replace(/\*\*/g, "§§").replace(/\*/g, "[^/]*")
    .replace(/§§\//g, "(?:.*/)?").replace(/§§/g, ".*");
  return new RegExp(`^${esc}$`);
}

export function scopeCheck(files, scopeGlobs) {
  if (!scopeGlobs || !scopeGlobs.length) {
    return { status: STATUS.NOT_VERIFIED, outside: [], note: "rozsah nebol deklarovaný (--scope), expanziu rozsahu nemožno posúdiť" };
  }
  const res = scopeGlobs.map(globToRegExp);
  const outside = files.filter((p) => !res.some((r) => r.test(p)));
  return outside.length
    ? { status: STATUS.FAIL, outside, note: `${outside.length} súbor(ov) mimo deklarovaného rozsahu` }
    : { status: STATUS.PASS, outside: [], note: "všetky zmeny sú v deklarovanom rozsahu" };
}

// ── 4. výsledok behu príkazu ───────────────────────────────────────────────

export function parseVitestSummary(output) {
  const line = (output.match(/^\s*Tests\s+.*$/m) || [""])[0];
  const get = (word) => {
    const m = line.match(new RegExp(`(\\d+)\\s+${word}`));
    return m ? Number(m[1]) : 0;
  };
  const filesLine = (output.match(/^\s*Test Files\s+.*$/m) || [""])[0];
  const fget = (word) => {
    const m = filesLine.match(new RegExp(`(\\d+)\\s+${word}`));
    return m ? Number(m[1]) : 0;
  };
  return {
    tests: { passed: get("passed"), failed: get("failed"), skipped: get("skipped"), todo: get("todo") },
    files: { passed: fget("passed"), failed: fget("failed"), skipped: fget("skipped") },
  };
}

export function statusFromRun(check, run) {
  // run = { exitCode, output, toolMissing, dbAvailable, notRun }
  if (run.notRun) return { status: STATUS.NOT_VERIFIED, note: "naplánované, nespustené (chýba --run)" };
  if (run.toolMissing) return { status: STATUS.BLOCKED, note: `chýba nástroj: ${check.needsTool || check.cmd[0]}` };
  if (check.needsDb && !run.dbAvailable) return { status: STATUS.BLOCKED, note: "vyžaduje lokálnu DB (supabase), tá nie je dostupná" };
  if (run.exitCode !== 0) {
    const s = check.kind === "vitest" ? parseVitestSummary(run.output || "") : null;
    return { status: STATUS.FAIL, note: `exit ${run.exitCode}`, summary: s };
  }
  if (check.kind === "vitest") {
    const s = parseVitestSummary(run.output || "");
    const executed = s.tests.passed + s.tests.failed;
    if (executed === 0) return { status: STATUS.NOT_VERIFIED, note: "exit 0, ale 0 vykonaných testov", summary: s };
    const skippedNote = s.tests.skipped ? `, preskočených ${s.tests.skipped} (nepočítajú sa ako PASS)` : "";
    return { status: STATUS.PASS, note: `vykonaných ${executed}${skippedNote}`, summary: s };
  }
  if (check.kind === "gate") {
    // prepush-gate hlási to, čo nezvládol overiť, riadkami „NEOVERENÉ". Report ich nesmie zahodiť.
    const unverified = (run.output || "").split("\n").filter((l) => /NEOVEREN/.test(l)).map((l) => l.replace(/\x1b\[[0-9;]*m/g, "").trim());
    if (unverified.length) return { status: STATUS.PASS, note: `exit 0; brána hlási ${unverified.length} neoverených: ${unverified.join(" | ")}`, unverified };
  }
  return { status: STATUS.PASS, note: "exit 0" };
}

// ── 5. akceptačné kritériá ─────────────────────────────────────────────────

// criterion = { id, text, evidence: ["check:<id>", "manual:<text>"] }
export function evaluateCriteria(criteria, results) {
  const byId = new Map(results.map((r) => [r.id, r]));
  return (criteria || []).map((c) => {
    const ev = Array.isArray(c.evidence) ? c.evidence : [];
    if (!ev.length) return { ...c, status: STATUS.NOT_VERIFIED, note: "kritérium nemá dôkaz" };
    const parts = ev.map((e) => {
      if (e.startsWith("check:")) {
        const r = byId.get(e.slice(6));
        return r ? r.status : STATUS.NOT_VERIFIED;
      }
      // ručné tvrdenie nie je dôkaz: nikdy nedá PASS
      return STATUS.NOT_VERIFIED;
    });
    const status = worst(parts);
    const manualOnly = ev.every((e) => !e.startsWith("check:"));
    return { ...c, status, note: manualOnly ? "iba ručné tvrdenie (nie je dôkaz)" : "podľa odkazovaných kontrol" };
  });
}

// ── 6. celkový verdikt ─────────────────────────────────────────────────────

export function aggregate({ checks, criteria, scope, untested }) {
  const required = checks.filter((c) => c.required).map((c) => c.status);
  const crit = criteria.map((c) => c.status);
  const parts = [...required];
  if (scope) parts.push(scope.status === STATUS.PASS ? STATUS.PASS : scope.status);
  if (untested.length) parts.push(STATUS.NOT_VERIFIED);
  if (!criteria.length) parts.push(STATUS.NOT_VERIFIED); // bez kritérií sa „hotovo" posúdiť nedá
  parts.push(...crit);
  const overall = worst(parts);
  return {
    overall,
    doneAllowed: overall === STATUS.PASS && criteria.length > 0,
    reasons: {
      noCriteria: criteria.length === 0,
      untested,
      scopeNote: scope ? scope.note : "rozsah neposúdený",
    },
  };
}

export function renderMarkdown(report) {
  const L = [];
  L.push(`# Verifikácia dokončenia: **${report.overall}**`);
  L.push("");
  L.push(`**DONE povolené: ${report.doneAllowed ? "ÁNO" : "NIE"}**`);
  L.push("");
  L.push(`Zmenených súborov: ${report.files.length} (base \`${report.base}\`)`);
  L.push("");
  L.push("| Kontrola | Stav | Poznámka |");
  L.push("|---|---|---|");
  for (const c of report.checks) L.push(`| ${c.title} | ${c.status} | ${c.note} |`);
  if (!report.checks.length) L.push("| (žiadna spustiteľná kontrola pre tento diff) | NOT_VERIFIED | docs/memory alebo prázdny diff |");
  L.push("");
  L.push("## Akceptačné kritériá");
  if (!report.criteria.length) L.push("- (žiadne zadané → DONE nemožno potvrdiť)");
  for (const c of report.criteria) L.push(`- ${c.id} — ${c.status}: ${c.text} _(${c.note})_`);
  L.push("");
  L.push("## Rozsah a pokrytie");
  L.push(`- Rozsah: ${report.scope ? report.scope.note : "neposúdený"}`);
  if (report.reasons.untested.length) {
    L.push(`- Zmenený zdroj bez testu (${report.reasons.untested.length}):`);
    for (const p of report.reasons.untested) L.push(`  - ${p}`);
  } else L.push("- Zmenený zdroj bez testu: žiadny");
  L.push("");
  L.push("_Preskočené testy sa nepočítajú ako PASS. BLOCKED a NOT_VERIFIED nie sú PASS._");
  return L.join("\n");
}

// ── 7. lint plánu (revolis-review-plan) ────────────────────────────────────

const REQUIRED_SECTIONS = [
  { key: "scope", re: /^#{1,4}\s*(scope|rozsah)\b/im },
  { key: "reuse", re: /^#{1,4}\s*(reuse|znovupou[žz]itie|existuj[úu]ce)/im },
  { key: "acceptance", re: /^#{1,4}\s*(acceptance|akcepta[čc]n[ée])/im },
  { key: "risks", re: /^#{1,4}\s*(risks?|rizik)/im },
  { key: "gates", re: /^#{1,4}\s*(gates?|br[áa]ny)/im },
  { key: "steps", re: /^#{1,4}\s*(steps?|kroky|implement)/im },
  { key: "out-of-scope", re: /^#{1,4}\s*(out of scope|mimo rozsahu)/im },
];

const VAGUE = /\b(works?|working|properly|correctly|fine|ok|nice|robust|funguje|správne|spravne|v poriadku)\b/i;
const FOUNDER_ACTION = /\b(merge|deploy|nasaden|migr[aá]ci|production|prod\b|secret|drop\b|delete|stripe|live\b|platb)/i;

export function sectionBody(text, sectionRe) {
  const m = text.match(sectionRe);
  if (!m) return "";
  const start = m.index + m[0].length;
  const rest = text.slice(start);
  const next = rest.search(/^#{1,4}\s/m);
  return next === -1 ? rest : rest.slice(0, next);
}

export function lintPlan(text) {
  const findings = [];
  const add = (level, code, msg) => findings.push({ level, code, msg });

  for (const s of REQUIRED_SECTIONS) {
    if (!s.re.test(text)) add("error", `missing-${s.key}`, `chýba sekcia: ${s.key}`);
  }

  const acc = sectionBody(text, REQUIRED_SECTIONS[2].re);
  const accItems = acc.split("\n").filter((l) => /^\s*(?:[-*]|\d+\.)\s+\S/.test(l));
  if (REQUIRED_SECTIONS[2].re.test(text) && accItems.length === 0) {
    add("error", "empty-acceptance", "sekcia akceptačných kritérií je prázdna");
  }
  for (const item of accItems) {
    const verifiable = /[`\d/]|\bPASS\b|\btest|\bCI\b|\bSELECT\b|\bexit\b/i.test(item);
    if (VAGUE.test(item) && !verifiable) {
      add("error", "vague-acceptance", `nemerateľné kritérium: "${item.trim().slice(0, 80)}"`);
    }
  }

  const steps = sectionBody(text, REQUIRED_SECTIONS[5].re).split("\n").filter((l) => /^\s*(?:[-*]|\d+\.)\s+\S/.test(l));
  if (steps.length > 12) add("warn", "too-many-steps", `${steps.length} krokov; najmenší bezpečný plán má mať ≤ 12`);

  // Founder GO sa vyžaduje podľa toho, čo plán PLÁNUJE urobiť (kroky), nie podľa
  // sekcie „Mimo rozsahu", kde sa merge/deploy zámerne vylučujú.
  const stepsText = steps.join("\n");
  if (FOUNDER_ACTION.test(stepsText)) {
    const gates = sectionBody(text, REQUIRED_SECTIONS[4].re);
    if (!/(founder\s*go|go\s*foundera|vyžaduje\s*go|founder approval)/i.test(gates)) {
      add("error", "missing-founder-go", "kroky plánu sa dotýkajú merge/deploy/migrácie/secretu/platby, ale sekcia brán neuvádza FOUNDER GO");
    }
  }

  return { ok: !findings.some((f) => f.level === "error"), findings };
}

// ── 8. stavy úlohy (evidence gate) ─────────────────────────────────────────
// Agentove tvrdenie nie je dôkaz. Nástroj nikdy nevykoná merge ani deploy.

export const WORKFLOW_STATES = Object.freeze([
  "PLANNED",
  "IN_PROGRESS",
  "IMPLEMENTED",
  "TESTED",
  "REVIEWED",
  "PR_READY",
  "HUMAN_APPROVED",
  "MERGED",
  "DEPLOYED",
  "PRODUCTION_VERIFIED",
]);

const PR_READY_AT = WORKFLOW_STATES.indexOf("PR_READY");

export function checkTransition(from, to) {
  const a = WORKFLOW_STATES.indexOf(from);
  const b = WORKFLOW_STATES.indexOf(to);
  if (a < 0 || b < 0) return { ok: false, code: "unknown_state", from, to, allowed: null };
  if (b !== a + 1) {
    return { ok: false, code: "invalid_transition", from, to, allowed: WORKFLOW_STATES[a + 1] ?? null };
  }
  return { ok: true, code: "ok", from, to, requiresHuman: b > PR_READY_AT };
}

export function deriveWorkflowState(evidence = {}) {
  const blockers = [];
  const files = Array.isArray(evidence.filesChanged) ? evidence.filesChanged : [];
  const base = { actions: [], performsMerge: false, performsDeploy: false };

  if (!evidence.started) {
    return { ...base, state: "PLANNED", prReady: false, blockers };
  }
  if (!files.length) {
    blockers.push({ code: "no_files" });
    return { ...base, state: "IN_PROGRESS", prReady: false, blockers };
  }

  const checks = Array.isArray(evidence.checks) ? evidence.checks : [];
  const required = checks.filter((c) => c.required !== false);
  const criteria = Array.isArray(evidence.criteria) ? evidence.criteria : [];
  const untested = Array.isArray(evidence.untested) ? evidence.untested : [];
  if (!required.length || required.some((c) => c.status !== STATUS.PASS)) {
    blockers.push({ code: required.some((c) => c.status === STATUS.FAIL) ? "failed_checks" : "checks_not_pass" });
    return { ...base, state: "IMPLEMENTED", prReady: false, blockers };
  }
  if (!criteria.length || criteria.some((c) => c.status !== STATUS.PASS)) {
    blockers.push({ code: "criteria" });
    return { ...base, state: "IMPLEMENTED", prReady: false, blockers };
  }
  if (evidence.scopeStatus !== STATUS.PASS) {
    blockers.push({ code: "scope" });
    return { ...base, state: "IMPLEMENTED", prReady: false, blockers };
  }
  if (untested.length) {
    blockers.push({ code: "untested" });
    return { ...base, state: "IMPLEMENTED", prReady: false, blockers };
  }

  const review = evidence.independentReview;
  if (!review || review.status !== STATUS.PASS || review.source === "agent_assertion" || !review.reviewer || !review.artifact) {
    blockers.push({ code: "no_review" });
    return { ...base, state: "TESTED", prReady: false, blockers };
  }
  if (evidence.author && review.reviewer === evidence.author) {
    blockers.push({ code: "self_review" });
    return { ...base, state: "TESTED", prReady: false, blockers };
  }

  // Stavy za PR_READY sú v `checkTransition`, ale tento príkaz ich neudeľuje.
  // JSON záznam „founder" nie je dôkaz identity a nesmie vyzerať ako merge.
  return { ...base, state: "PR_READY", prReady: true, blockers };
}

export function evaluateWorkflow({ assertedState = null, previousState = null, evidence = {} } = {}) {
  const derived = deriveWorkflowState(evidence);
  const shell = {
    ...derived,
    assertedState,
    effectiveState: derived.state,
  };
  if (previousState && assertedState) {
    const step = checkTransition(previousState, assertedState);
    if (!step.ok) return { ...shell, ok: false, code: step.code, prReady: false };
  }
  if (assertedState && !WORKFLOW_STATES.includes(assertedState)) {
    return { ...shell, ok: false, code: "unknown_state", prReady: false };
  }
  if (assertedState && WORKFLOW_STATES.indexOf(assertedState) > WORKFLOW_STATES.indexOf(derived.state)) {
    return {
      ...shell,
      ok: false,
      code: "assertion_not_evidence",
      prReady: false,
      blockers: [...derived.blockers, { code: "assertion_not_evidence" }],
    };
  }
  return { ...shell, ok: true, code: derived.prReady ? "evidence_supports_state" : "blocked" };
}
