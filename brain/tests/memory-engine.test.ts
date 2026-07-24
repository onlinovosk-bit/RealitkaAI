import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { calculateDelta, runAudit, type AuditReport } from "../src/audit.js";
import { collectFindings } from "../src/audit-core.js";
import { buildRegistry } from "../src/catalog.js";
import { runIngest } from "../src/ingest.js";
import { loadBrain } from "../src/loader.js";
import { listFiles } from "../src/repo.js";
import { validateDecisionRecord, validateRegistryRecord } from "../src/schema.js";
import { generateWeekly } from "../src/weekly.js";

const here = __dirname;
const fixtureRoot = resolve(here, "fixtures");
const repoRoot = resolve(here, "..", "..");

function temporaryRoot(): string {
  return mkdtempSync(resolve(tmpdir(), "revolis-brain-"));
}

function installFixtures(root: string): { brainRoot: string; auditDir: string; learningDir: string } {
  const brainRoot = resolve(root, "brain");
  const auditDir = resolve(brainRoot, "audits");
  const learningDir = resolve(brainRoot, "learning");
  mkdirSync(resolve(brainRoot, "registry"), { recursive: true });
  mkdirSync(resolve(brainRoot, "decisions"), { recursive: true });
  mkdirSync(resolve(root, "fixture"), { recursive: true });
  writeFileSync(resolve(root, "fixture", "source.md"), "# Source\n", "utf8");
  cpSync(resolve(fixtureRoot, "registry.json"), resolve(brainRoot, "registry", "index.json"));
  cpSync(resolve(fixtureRoot, "decisions.json"), resolve(brainRoot, "decisions", "index.json"));
  return { brainRoot, auditDir, learningDir };
}

test("schema validator accepts fixtures and rejects canonical generated records", () => {
  const registry = JSON.parse(readFileSync(resolve(fixtureRoot, "registry.json"), "utf8"))[0];
  const decision = JSON.parse(readFileSync(resolve(fixtureRoot, "decisions.json"), "utf8"))[0];
  assert.deepEqual(validateRegistryRecord(registry), []);
  assert.deepEqual(validateDecisionRecord(decision), []);
  assert.ok(validateRegistryRecord({ ...registry, canonical: true }).some((issue) => issue.code === "canonical"));
});

test("loader detects duplicate IDs and high-confidence sensitive values", () => {
  const root = temporaryRoot();
  try {
    const { brainRoot } = installFixtures(root);
    const registryPath = resolve(brainRoot, "registry", "index.json");
    const registry = JSON.parse(readFileSync(registryPath, "utf8"));
    registry.push({ ...registry[0], purpose: "Contact owner@example.com" });
    writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
    const loaded = loadBrain(brainRoot);
    assert.ok(loaded.issues.some((issue) => issue.code === "duplicate_id"));
    assert.ok(loaded.issues.some((issue) => issue.code === "sensitive_value"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("ingest is idempotent and emits at least fifteen evidenced decisions", () => {
  const root = temporaryRoot();
  try {
    const brainRoot = resolve(root, "brain");
    const first = runIngest({ repoRoot, brainRoot });
    const registryFirst = readFileSync(resolve(brainRoot, "registry", "index.json"), "utf8");
    const decisionsFirst = readFileSync(resolve(brainRoot, "decisions", "index.json"), "utf8");
    const second = runIngest({ repoRoot, brainRoot });
    assert.equal(first.validationIssues, 0);
    assert.equal(first.decisionCount >= 15, true);
    assert.equal(second.changed.length, 0);
    assert.equal(second.valid, true);
    assert.equal(readFileSync(resolve(brainRoot, "registry", "index.json"), "utf8"), registryFirst);
    assert.equal(readFileSync(resolve(brainRoot, "decisions", "index.json"), "utf8"), decisionsFirst);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("audit delta changes from added to unchanged on the second identical run", () => {
  const root = temporaryRoot();
  try {
    const { brainRoot, auditDir } = installFixtures(root);
    const first = runAudit({
      repoRoot: root,
      brainRoot,
      outputDir: auditDir,
      auditDate: "2026-07-22",
      generatedAt: "2026-07-22T20:00:00.000Z",
    });
    const second = runAudit({
      repoRoot: root,
      brainRoot,
      outputDir: auditDir,
      auditDate: "2026-07-22",
      generatedAt: "2026-07-22T20:00:00.000Z",
    });
    assert.ok(first.delta.added.length > 0);
    assert.equal(first.delta.unchanged.length, 0);
    assert.equal(second.delta.added.length, 0);
    assert.deepEqual(second.delta.resolved, []);
    assert.equal(second.delta.unchanged.length, second.findings.length);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("delta reports resolved findings", () => {
  const finding = {
    key: "fixture:key",
    category: "staleness" as const,
    severity: "advisory" as const,
    title: "Fixture",
    detail: "Fixture",
    evidence: [],
    confidence: "high" as const,
  };
  const previous = { generatedAt: "previous", findings: [finding] } as unknown as AuditReport;
  assert.deepEqual(calculateDelta([], previous), {
    comparedTo: "previous",
    added: [],
    resolved: ["fixture:key"],
    unchanged: [],
  });
});

test("weekly report emits no more than five evidenced recommendations", () => {
  const root = temporaryRoot();
  try {
    const { brainRoot, auditDir, learningDir } = installFixtures(root);
    const report = runAudit({
      repoRoot: root,
      brainRoot,
      outputDir: auditDir,
      auditDate: "2026-07-22",
      generatedAt: "2026-07-22T20:00:00.000Z",
    });
    while (report.findings.length < 7) {
      const index = report.findings.length;
      report.findings.push({
        key: `extra:${index}`,
        category: "staleness",
        severity: "advisory",
        title: `Extra ${index}`,
        detail: "Fixture",
        evidence: [{ path: "fixture/source.md", line: 1, commit: "fixture", note: "Fixture" }],
        confidence: "low",
      });
    }
    writeFileSync(resolve(auditDir, "2026-07-22.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    const weekly = generateWeekly({ repoRoot: root, auditDir, outputDir: learningDir, date: "2026-07-22" });
    const content = readFileSync(weekly.path, "utf8");
    assert.equal(weekly.recommendations.length, 5);
    assert.match(content, /Marketing metrics: unavailable/);
    assert.doesNotMatch(content, /6\. Review/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("loader rejects unknown relatedAssets", () => {
  const root = temporaryRoot();
  try {
    const { brainRoot } = installFixtures(root);
    const decisionsPath = resolve(brainRoot, "decisions", "index.json");
    const decisions = JSON.parse(readFileSync(decisionsPath, "utf8"));
    decisions[0].relatedAssets = ["missing.asset.id"];
    writeFileSync(decisionsPath, `${JSON.stringify(decisions, null, 2)}\n`, "utf8");
    const loaded = loadBrain(brainRoot);
    assert.ok(loaded.issues.some((issue) => issue.code === "missing_related_asset"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("listFiles uses walk fallback for non-git fixture roots", () => {
  const root = temporaryRoot();
  try {
    mkdirSync(resolve(root, "fixture"), { recursive: true });
    writeFileSync(resolve(root, "fixture", "note.md"), "# fixture\n", "utf8");
    assert.deepEqual(listFiles(root, ["fixture"]), ["fixture/note.md"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("audit flags deprecated revolis_leads with no application usage", () => {
  const brainRoot = resolve(repoRoot, "brain");
  const brain = loadBrain(brainRoot);
  const findings = collectFindings({
    repoRoot,
    brain,
    auditDate: "2026-07-23",
  });
  assert.ok(findings.some((finding) => finding.key === "deprecated-table:revolis_leads"));
});

test("repository inventory includes only files known to Git", () => {
  const expected = execFileSync("git", ["ls-files", "-z", "--", "automation/n8n"], {
    cwd: repoRoot,
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean)
    .sort();
  const automation = buildRegistry(repoRoot).find((record) => record.id === "automation.n8n");
  assert.ok(automation);
  assert.equal(automation.inventory.fileCount, expected.length);
  assert.deepEqual(automation.inventory.sample, expected.slice(0, 12));
  if (expected.length === 0) {
    assert.equal(automation.inventory.digest, "unavailable");
  }
});
