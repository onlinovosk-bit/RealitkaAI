// Orchestrácia štyroch brán. Nevolá merge, deploy ani post-release.
// MISSING, FAILED a NOT_VERIFIED nie sú úspech. JSON stav zásobníka sa ignoruje.

import { createRequire } from "node:module";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const TOOL_ROOT = fileURLToPath(new URL("../../..", import.meta.url));

export const PIPELINE_STAGES = Object.freeze([
  "intake",
  "plan",
  "preflight",
  "implement",
  "validate",
  "independent_review",
  "evidence_gate",
  "pr_readiness",
]);

export const PROBE_STATUS = Object.freeze({
  VERIFIED: "VERIFIED",
  MISSING: "MISSING",
  FAILED: "FAILED",
  NOT_VERIFIED: "NOT_VERIFIED",
});

export const STACKS = Object.freeze([
  { id: "completion", path: "scripts/ci/lib/verify-core.mjs", symbol: "evaluateWorkflow" },
  { id: "visual", path: "scripts/ci/lib/visual-qa.mjs", symbol: "compareRgba" },
  { id: "lifecycle", path: "scripts/ci/lib/api-lifecycle.mjs", symbol: "classifyNotice" },
  { id: "cost", path: "packages/bus-core/src/cost-governor.ts", symbol: "selectRoute" },
]);

const STACK_IDS = new Set(STACKS.map((stack) => stack.id));

export function classifyProbe({ id, present, executed = false, passed = false, code = null }) {
  if (!present) return { id, status: PROBE_STATUS.MISSING, passesAsPass: false, code: code || "module_absent" };
  if (!executed) return { id, status: PROBE_STATUS.NOT_VERIFIED, passesAsPass: false, code: code || "not_executed" };
  if (passed === true) return { id, status: PROBE_STATUS.VERIFIED, passesAsPass: true, code: code || "executed" };
  return { id, status: PROBE_STATUS.FAILED, passesAsPass: false, code: code || "check_failed" };
}

function selfCheck(id, fn) {
  if (id === "completion") {
    const wf = fn({ assertedState: "PR_READY", evidence: { started: true } });
    return Boolean(wf && wf.prReady === false && wf.performsMerge === false && wf.performsDeploy === false);
  }
  if (id === "visual") {
    const frame = { width: 1, height: 1, rgba: Uint8Array.from([1, 2, 3, 255]) };
    const same = fn(frame, frame, { maxChangedRatio: 0 });
    return same?.status === "PASS" && same.changedPixels === 0;
  }
  if (id === "lifecycle") {
    const notice = fn({});
    return notice?.autoMigrate === false && notice?.class === "missing_source";
  }
  if (id === "cost") {
    const decision = fn({
      apply_switch: true,
      environment: "production",
      retries_used: 0,
      max_retries: 0,
      candidates: [],
      budget_remaining_usd: 1,
      case_id: "probe",
      metric: "exact_match",
      quality_bar: 1,
    });
    return decision?.applied === false && decision?.decision === "BLOCK" && decision?.code === "production_switch_forbidden";
  }
  return false;
}

function typescriptCompiler(root) {
  const candidates = [
    join(TOOL_ROOT, "node_modules/typescript/lib/typescript.js"),
    join(TOOL_ROOT, "apps/crm/node_modules/typescript/lib/typescript.js"),
    join(root, "node_modules/typescript/lib/typescript.js"),
    join(root, "apps/crm/node_modules/typescript/lib/typescript.js"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return require(candidate);
  }
  return null;
}

// Node 20 (krok Test CI helper scripts) import .ts odmietne. Súbor sa preloží
// existujúcim typescript a spustí sa vygenerovaný modul. Chýbajúci prekladač
// alebo chyba importu ostáva import_failed, nie VERIFIED.
export async function loadStackModule(path, root, options = {}) {
  if (options.native !== false) {
    try {
      return await import(pathToFileURL(path).href);
    } catch (error) {
      if (!path.endsWith(".ts")) throw error;
    }
  } else if (!path.endsWith(".ts")) {
    return import(pathToFileURL(path).href);
  }
  const ts = typescriptCompiler(root);
  if (!ts) throw new Error("typescript_missing");
  const emitted = ts.transpileModule(readFileSync(path, "utf8"), {
    fileName: path,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      verbatimModuleSyntax: false,
    },
  });
  const dir = mkdtempSync(join(tmpdir(), "orch-ts-"));
  const file = join(dir, "probe.mjs");
  writeFileSync(file, emitted.outputText);
  try {
    return await import(pathToFileURL(file).href);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export async function probeStacks(root) {
  const rows = [];
  for (const spec of STACKS) {
    const path = resolve(root, spec.path);
    if (!existsSync(path)) {
      rows.push(classifyProbe({ id: spec.id, present: false }));
      continue;
    }
    try {
      const mod = await loadStackModule(path, root);
      const fn = mod[spec.symbol];
      if (typeof fn !== "function") {
        rows.push(classifyProbe({ id: spec.id, present: true, executed: false, code: "symbol_absent" }));
        continue;
      }
      let passed = false;
      try {
        passed = selfCheck(spec.id, fn) === true;
      } catch {
        rows.push(classifyProbe({ id: spec.id, present: true, executed: true, passed: false, code: "check_threw" }));
        continue;
      }
      rows.push(classifyProbe({ id: spec.id, present: true, executed: true, passed }));
    } catch {
      rows.push(classifyProbe({ id: spec.id, present: true, executed: true, passed: false, code: "import_failed" }));
    }
  }
  return rows;
}

export function guardPipeline({ stageResults, checks, probes }) {
  if (!stageResults || typeof stageResults !== "object" || Array.isArray(stageResults)) {
    return stopped(null, [{ id: "config", status: PROBE_STATUS.FAILED, code: "malformed_config" }]);
  }
  if (checks != null && !Array.isArray(checks)) {
    return stopped("evidence_gate", [{ id: "checks", status: PROBE_STATUS.FAILED, code: "malformed_config" }]);
  }
  if (!Array.isArray(probes)) {
    return stopped("evidence_gate", [{ id: "stacks", status: PROBE_STATUS.NOT_VERIFIED, code: "probe_missing" }]);
  }
  const stackChecks = [];
  for (const spec of STACKS) {
    const probe = probes.find((row) => row && row.id === spec.id);
    if (!probe) {
      stackChecks.push({ id: spec.id, required: true, status: PROBE_STATUS.NOT_VERIFIED, code: "probe_missing" });
      continue;
    }
    stackChecks.push({
      id: spec.id,
      required: true,
      status: probe.status === PROBE_STATUS.VERIFIED ? "PASS" : probe.status,
      code: probe.code,
    });
  }
  const extra = [];
  for (const check of checks || []) {
    if (!check || typeof check !== "object" || Array.isArray(check) || typeof check.id !== "string") {
      return stopped("evidence_gate", [{ id: "checks", status: PROBE_STATUS.FAILED, code: "malformed_config" }]);
    }
    if (STACK_IDS.has(check.id)) continue;
    extra.push(check);
  }
  const result = runPipeline({ stageResults, checks: [...stackChecks, ...extra] });
  return { ...result, probes };
}

function stopped(reached, blockedBy) {
  return {
    prReady: false,
    reached,
    blockedBy,
    actions: [],
    performsMerge: false,
    performsDeploy: false,
    postReleaseRan: false,
  };
}

export function runPipeline({ stageResults = {}, checks = null } = {}) {
  const blockedBy = [];
  let reached = null;
  for (const stage of PIPELINE_STAGES) {
    if (stage === "evidence_gate") {
      const required = Array.isArray(checks) ? checks.filter((check) => check.required === true) : [];
      if (!required.length) {
        blockedBy.push({ id: "mandatory", status: "NOT_VERIFIED", code: "no_mandatory_check" });
        return stopped("evidence_gate", blockedBy);
      }
      for (const check of required) {
        if (check.status !== "PASS") blockedBy.push({ id: check.id, status: check.status ?? "NOT_VERIFIED" });
      }
      if (blockedBy.length) return stopped("evidence_gate", blockedBy);
    }
    const result = stageResults[stage];
    if (!result || result.status !== "PASS") {
      blockedBy.push({ stage, status: result?.status ?? "NOT_VERIFIED" });
      return stopped(stage, blockedBy);
    }
    reached = stage;
  }
  return {
    prReady: true,
    reached,
    blockedBy,
    actions: [],
    performsMerge: false,
    performsDeploy: false,
    postReleaseRan: false,
  };
}
