// Spustenie: node --test scripts/ci/__tests__/orchestrate.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { join, resolve } from "node:path";
import { classifyProbe, PIPELINE_STAGES, PROBE_STATUS, runPipeline } from "../lib/orchestrate.mjs";

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

test("MISSING, FAILED a NOT_VERIFIED nie sú úspech a nie sú to isté", () => {
  const missing = classifyProbe({ id: "visual", present: false });
  const unverified = classifyProbe({ id: "visual", present: true, executed: false });
  const failed = classifyProbe({ id: "visual", present: true, executed: true, passed: false });
  const verified = classifyProbe({ id: "visual", present: true, executed: true, passed: true });
  assert.equal(missing.status, PROBE_STATUS.MISSING);
  assert.equal(unverified.status, PROBE_STATUS.NOT_VERIFIED);
  assert.equal(failed.status, PROBE_STATUS.FAILED);
  assert.equal(verified.status, PROBE_STATUS.VERIFIED);
  assert.notEqual(missing.status, unverified.status);
  for (const row of [missing, unverified, failed]) assert.equal(row.passesAsPass, false);
  assert.equal(verified.passesAsPass, true);
});

function runCli(body, root) {
  const dir = mkdtempSync(join(tmpdir(), "orch-"));
  const fixture = join(dir, "fixture.json");
  writeFileSync(fixture, typeof body === "string" ? body : JSON.stringify(body));
  const args = ["scripts/ci/revolis-orchestrate.mjs", "--fixture", fixture];
  if (root) args.push("--root", root);
  return spawnSync(process.execPath, args, { cwd: ROOT, encoding: "utf8" });
}

const readyStages = () => passedStages();

test("vstupný príkaz nie je ready, keď povinný visual modul chýba", () => {
  const root = mkdtempSync(join(tmpdir(), "orch-root-"));
  const run = runCli({
    stageResults: readyStages(),
    checks: [{ id: "visual", required: true, status: "PASS" }],
  }, root);
  assert.notEqual(run.status, 0);
  const body = JSON.parse(run.stdout);
  assert.equal(body.prReady, false);
  assert.equal(body.performsMerge, false);
  assert.ok(body.probes.some((row) => row.id === "visual" && row.status === "MISSING"));
  assert.ok(body.probes.some((row) => row.id === "lifecycle" && row.status === "MISSING"));
});

test("vstupný príkaz rozlíši FAILED a NOT_VERIFIED a pokazený JSON", () => {
  const failedRoot = mkdtempSync(join(tmpdir(), "orch-fail-"));
  mkdirSync(join(failedRoot, "scripts/ci/lib"), { recursive: true });
  writeFileSync(join(failedRoot, "scripts/ci/lib/visual-qa.mjs"), "throw new Error('boom');\n");
  const failed = runCli({ stageResults: readyStages(), checks: [{ id: "visual", required: true, status: "PASS" }] }, failedRoot);
  assert.notEqual(failed.status, 0);
  const failedBody = JSON.parse(failed.stdout);
  assert.equal(failedBody.prReady, false);
  assert.ok(failedBody.probes.some((row) => row.id === "visual" && row.status === "FAILED"));

  const unverifiedRoot = mkdtempSync(join(tmpdir(), "orch-nv-"));
  mkdirSync(join(unverifiedRoot, "scripts/ci/lib"), { recursive: true });
  writeFileSync(join(unverifiedRoot, "scripts/ci/lib/visual-qa.mjs"), "export const compareRgba = 1;\n");
  const unverified = runCli({ stageResults: readyStages() }, unverifiedRoot);
  assert.notEqual(unverified.status, 0);
  const unverifiedBody = JSON.parse(unverified.stdout);
  assert.equal(unverifiedBody.prReady, false);
  assert.ok(unverifiedBody.probes.some((row) => row.id === "visual" && row.status === "NOT_VERIFIED"));

  const malformed = runCli("{", null);
  assert.equal(malformed.status, 2);
  assert.equal(JSON.parse(malformed.stdout).prReady, false);

  const badShape = runCli({ stageResults: [], checks: "PASS" });
  assert.notEqual(badShape.status, 0);
  assert.equal(JSON.parse(badShape.stdout).prReady, false);
});

test("overený strom je ready a JSON zásobníka to neprepíše", () => {
  const run = runCli({
    stageResults: readyStages(),
    checks: [
      { id: "visual", required: true, status: "FAIL" },
      { id: "completion", required: true, status: "PASS" },
    ],
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  const body = JSON.parse(run.stdout);
  assert.equal(body.prReady, true);
  assert.equal(body.performsMerge, false);
  assert.equal(body.performsDeploy, false);
  assert.equal(body.postReleaseRan, false);
  for (const id of ["completion", "visual", "lifecycle", "cost"]) {
    assert.ok(body.probes.some((row) => row.id === id && row.status === "VERIFIED"), id);
  }
});

test("CLI vráti nenulový kód, keď povinná kontrola mimo zásobníka zlyhá", () => {
  const run = runCli({
    stageResults: passedStages(),
    checks: [{ id: "release-notes", required: true, status: "FAIL" }],
  });
  assert.equal(run.status, 1);
  const body = JSON.parse(run.stdout);
  assert.equal(body.prReady, false);
  assert.equal(body.performsMerge, false);
  assert.equal(body.performsDeploy, false);
});
