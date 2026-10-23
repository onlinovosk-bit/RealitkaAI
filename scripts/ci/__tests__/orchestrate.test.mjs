// Spustenie: node --test scripts/ci/__tests__/orchestrate.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { join, resolve } from "node:path";
import { PIPELINE_STAGES, probeStacks, runPipeline } from "../lib/orchestrate.mjs";

const ROOT = resolve(new URL("../../..", import.meta.url).pathname);

function passedStages(over = {}) {
  return { ...Object.fromEntries(PIPELINE_STAGES.map((stage) => [stage, { status: "PASS" }])), ...over };
}

const mandatoryPass = [{ id: "completion", required: true, status: "PASS" }];

test("povinný FAIL blokuje PR readiness a nevydá merge ani deploy", () => {
  const result = runPipeline({
    stageResults: passedStages(),
    checks: [{ id: "completion", required: true, status: "FAIL" }],
  });
  assert.equal(result.prReady, false);
  assert.equal(result.reached, "evidence_gate");
  assert.ok(result.blockedBy.some((item) => item.id === "completion" && item.status === "FAIL"));
  assert.deepEqual(result.actions, []);
  assert.equal(result.performsMerge, false);
  assert.equal(result.performsDeploy, false);
  assert.equal(result.postReleaseRan, false);
});

test("zlyhaná validate sa nedostane do pr_readiness", () => {
  const result = runPipeline({
    stageResults: passedStages({ validate: { status: "FAIL" } }),
    checks: mandatoryPass,
  });
  assert.equal(result.prReady, false);
  assert.equal(result.reached, "validate");
});

test("všetky povinné PASS dávajú prReady bez merge a post-release sa nespustí", () => {
  const result = runPipeline({ stageResults: passedStages(), checks: mandatoryPass });
  assert.equal(result.prReady, true);
  assert.equal(result.reached, "pr_readiness");
  assert.equal(result.performsMerge, false);
  assert.equal(result.performsDeploy, false);
  assert.equal(result.postReleaseRan, false);
  assert.equal(PIPELINE_STAGES.includes("post_release"), false);
});

test("prítomnosť súboru ani chýbajúci modul nie sú PASS", () => {
  for (const row of probeStacks(() => true)) assert.equal(row.status, "NOT_VERIFIED");
  for (const row of probeStacks(() => false)) {
    assert.notEqual(row.status, "PASS");
    assert.equal(row.passesAsPass, false);
  }
});

test("CLI vráti nenulový kód, keď povinná kontrola zlyhá", () => {
  const dir = mkdtempSync(join(tmpdir(), "orch-"));
  const fixture = join(dir, "fixture.json");
  writeFileSync(fixture, JSON.stringify({
    stageResults: passedStages(),
    checks: [{ id: "lifecycle", required: true, status: "FAIL" }],
  }));
  const run = spawnSync(process.execPath, ["scripts/ci/revolis-orchestrate.mjs", "--fixture", fixture], {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert.equal(run.status, 1);
  const body = JSON.parse(run.stdout);
  assert.equal(body.prReady, false);
  assert.equal(body.performsMerge, false);
  assert.equal(body.performsDeploy, false);
});
