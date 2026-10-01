import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { auditJsonFiles, collectFindings, type AuditFinding } from "./audit-core.js";
import { loadBrain } from "./loader.js";
import { argString, isoDate, parseCliArgs, stableJson, writeIfChanged } from "./repo.js";

export interface AuditDelta {
  comparedTo: string | "none";
  added: string[];
  resolved: string[];
  unchanged: string[];
}

export interface AuditReport {
  schemaVersion: 1;
  auditDate: string;
  generatedAt: string;
  scope: "repository-only";
  sourcePolicy: "tracked-files-only";
  findings: AuditFinding[];
  summary: {
    registryRecords: number;
    decisionRecords: number;
    errors: number;
    warnings: number;
    advisory: number;
  };
  unavailable: {
    marketingMetrics: string;
    customerMetrics: string;
    costOfWaitingBaselineMinutes: string;
  };
  delta: AuditDelta;
}

function previousReport(outputDir: string, target: string): AuditReport | undefined {
  const candidates = auditJsonFiles(outputDir).filter((path) => path !== target);
  if (existsSync(target)) candidates.push(target);
  const latest = candidates.sort().at(-1);
  if (!latest) return undefined;
  try {
    return JSON.parse(readFileSync(latest, "utf8")) as AuditReport;
  } catch {
    return undefined;
  }
}

export function calculateDelta(current: AuditFinding[], previous?: AuditReport): AuditDelta {
  const currentKeys = new Set(current.map((finding) => finding.key));
  const previousKeys = new Set(previous?.findings.map((finding) => finding.key) ?? []);
  return {
    comparedTo: previous?.generatedAt ?? "none",
    added: [...currentKeys].filter((key) => !previousKeys.has(key)).sort(),
    resolved: [...previousKeys].filter((key) => !currentKeys.has(key)).sort(),
    unchanged: [...currentKeys].filter((key) => previousKeys.has(key)).sort(),
  };
}

function markdown(report: AuditReport): string {
  const lines = [
    `# Memory Engine audit - ${report.auditDate}`,
    "",
    `Generated: ${report.generatedAt}`,
    `Scope: ${report.scope}; source policy: ${report.sourcePolicy}`,
    "",
    "## Summary",
    "",
    `- Registry records: ${report.summary.registryRecords}`,
    `- Decision records: ${report.summary.decisionRecords}`,
    `- Errors: ${report.summary.errors}`,
    `- Warnings: ${report.summary.warnings}`,
    `- Advisory findings: ${report.summary.advisory}`,
    `- Delta: +${report.delta.added.length} / -${report.delta.resolved.length} / =${report.delta.unchanged.length}`,
    "",
    "## Findings",
    "",
  ];

  if (report.findings.length === 0) lines.push("No findings.", "");
  for (const finding of report.findings) {
    lines.push(
      `### [${finding.severity.toUpperCase()}] ${finding.title}`,
      "",
      `${finding.detail}`,
      "",
      `Category: ${finding.category}; confidence: ${finding.confidence}; key: \`${finding.key}\``,
      "",
      ...finding.evidence.map((item) => `- Evidence: \`${item.path}${item.line ? `:${item.line}` : ""}\` - ${item.note}`),
      "",
    );
  }

  lines.push(
    "## Unavailable measurements",
    "",
    `- Marketing metrics: ${report.unavailable.marketingMetrics}`,
    `- Customer metrics: ${report.unavailable.customerMetrics}`,
    `- Cost-of-waiting baseline: ${report.unavailable.costOfWaitingBaselineMinutes}`,
    "",
    "These values are not replaced with estimates. Measurement starts only after a defined source exists.",
    "",
  );
  return `${lines.join("\n").trimEnd()}\n`;
}

export function runAudit(options: {
  repoRoot: string;
  brainRoot: string;
  outputDir: string;
  auditDate?: string;
  generatedAt?: string;
}): AuditReport {
  const auditDate = options.auditDate ?? isoDate();
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const brain = loadBrain(options.brainRoot);
  const findings = collectFindings({ repoRoot: options.repoRoot, brain, auditDate });
  mkdirSync(options.outputDir, { recursive: true });
  const jsonPath = resolve(options.outputDir, `${auditDate}.json`);
  const mdPath = resolve(options.outputDir, `${auditDate}.md`);
  const previous = previousReport(options.outputDir, jsonPath);
  const report: AuditReport = {
    schemaVersion: 1,
    auditDate,
    generatedAt,
    scope: "repository-only",
    sourcePolicy: "tracked-files-only",
    findings,
    summary: {
      registryRecords: brain.registry.length,
      decisionRecords: brain.decisions.length,
      errors: findings.filter((finding) => finding.severity === "error").length,
      warnings: findings.filter((finding) => finding.severity === "warning").length,
      advisory: findings.filter((finding) => finding.severity === "advisory").length,
    },
    unavailable: {
      marketingMetrics: "unavailable - no connected repository source",
      customerMetrics: "unavailable - no privacy-approved repository source",
      costOfWaitingBaselineMinutes: "unavailable - no measured time series exists for 2026-07-22",
    },
    delta: calculateDelta(findings, previous),
  };
  writeIfChanged(jsonPath, stableJson(report));
  writeIfChanged(mdPath, markdown(report));
  return report;
}

function main(): void {
  const args = parseCliArgs(process.argv.slice(2));
  const repoRoot = resolve(argString(args, "repo-root") ?? process.cwd());
  const brainRoot = resolve(repoRoot, argString(args, "brain-root") ?? "brain");
  const outputDir = resolve(repoRoot, argString(args, "output-dir") ?? "brain/audits");
  const report = runAudit({
    repoRoot,
    brainRoot,
    outputDir,
    auditDate: argString(args, "date"),
  });
  process.stdout.write(stableJson({ summary: report.summary, delta: report.delta, outputDir }));
  if (report.summary.errors > 0 && args.has("strict")) process.exitCode = 1;
}

const entry = process.argv[1]?.replace(/\\/g, "/");
if (entry?.endsWith("/audit.ts") || entry?.endsWith("/audit.js")) main();
