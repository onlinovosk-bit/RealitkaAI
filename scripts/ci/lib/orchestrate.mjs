// Orchestrácia štyroch brán. Nevolá merge, deploy ani post-release.
// Chýbajúci modul alebo neznámy výsledok nie je PASS.

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

export const STACK_PATHS = Object.freeze({
  completion: "scripts/ci/lib/verify-core.mjs",
  visual: "scripts/ci/lib/visual-qa.mjs",
  lifecycle: "scripts/ci/lib/api-lifecycle.mjs",
  cost: "packages/bus-core/src/cost-governor.ts",
});

export function interpretStack({ id, modulePresent, result }) {
  if (!modulePresent) return { id, status: "NOT_VERIFIED", passesAsPass: false, code: "module_absent" };
  if (result?.status === "PASS") return { id, status: "PASS", passesAsPass: true, code: "measured" };
  return { id, status: result?.status || "NOT_VERIFIED", passesAsPass: false, code: "not_pass" };
}

export function probeStacks(exists) {
  return Object.entries(STACK_PATHS).map(([id, path]) => interpretStack({
    id,
    modulePresent: Boolean(exists(path)),
    result: null,
  }));
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
