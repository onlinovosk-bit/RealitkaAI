import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { auditJsonFiles } from "./audit-core.js";
import type { AuditReport } from "./audit.js";
import { argString, isoDate, parseCliArgs, writeIfChanged } from "./repo.js";

interface Recommendation {
  priority: number;
  action: string;
  evidence: string;
  confidence: "high" | "medium" | "low";
}

function git(repoRoot: string, args: string[]): string {
  try {
    return execFileSync("git", args, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function isoWeek(dateText: string): string {
  const date = new Date(`${dateText}T00:00:00Z`);
  const target = new Date(date);
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((target.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function loadLatestAudit(outputDir: string): AuditReport {
  const latest = auditJsonFiles(outputDir).at(-1);
  if (!latest) throw new Error(`No audit JSON found in ${outputDir}; run brain:audit first.`);
  return JSON.parse(readFileSync(latest, "utf8")) as AuditReport;
}

function recommendationFor(report: AuditReport): Recommendation[] {
  const severityRank = { error: 0, warning: 1, advisory: 2 } as const;
  const confidenceRank = { high: 0, medium: 1, low: 2 } as const;
  return [...report.findings]
    .sort((left, right) =>
      severityRank[left.severity] - severityRank[right.severity]
      || confidenceRank[left.confidence] - confidenceRank[right.confidence]
      || left.key.localeCompare(right.key),
    )
    .slice(0, 5)
    .map((finding, index) => ({
      priority: index + 1,
      action: finding.severity === "error"
        ? `Fix ${finding.title.toLowerCase()}.`
        : `Review ${finding.title.toLowerCase()}.`,
      evidence: finding.evidence[0]
        ? `${finding.evidence[0].path}${finding.evidence[0].line ? `:${finding.evidence[0].line}` : ""}`
        : "unavailable",
      confidence: finding.confidence,
    }));
}

export function generateWeekly(options: {
  repoRoot: string;
  auditDir: string;
  outputDir: string;
  date?: string;
}): { path: string; recommendations: Recommendation[]; commits: number; filesChanged: number } {
  const date = options.date ?? isoDate();
  const report = loadLatestAudit(options.auditDir);
  const log = git(options.repoRoot, ["log", "--since=7.days", "--format=%H%x09%s"]);
  const changed = git(options.repoRoot, ["log", "--since=7.days", "--name-only", "--format="])
    .split(/\r?\n/)
    .filter(Boolean);
  const commits = log ? log.split(/\r?\n/).filter(Boolean) : [];
  const changedFiles = [...new Set(changed)].sort();
  const recommendations = recommendationFor(report);
  const week = isoWeek(date);
  mkdirSync(options.outputDir, { recursive: true });
  const path = resolve(options.outputDir, `${week}.md`);
  const lines = [
    `# Memory Engine weekly - ${week}`,
    "",
    `Source audit: ${basename(auditJsonFiles(options.auditDir).at(-1) ?? "unavailable")}`,
    `Generated for: ${date}`,
    "",
    "## Repository changes",
    "",
    `- Commits in the last 7 days: ${commits.length}`,
    `- Distinct changed files: ${changedFiles.length}`,
    `- Audit delta: +${report.delta.added.length} / -${report.delta.resolved.length} / =${report.delta.unchanged.length}`,
    "",
    "Recent commits:",
    "",
    ...(commits.slice(0, 10).map((entry) => `- ${entry}`)),
    ...(commits.length === 0 ? ["- unavailable"] : []),
    "",
    "## Knowledge health",
    "",
    `- Current errors: ${report.summary.errors}`,
    `- Current warnings: ${report.summary.warnings}`,
    `- Current advisory findings: ${report.summary.advisory}`,
    "",
    "## Prioritized recommendations",
    "",
    ...(recommendations.flatMap((item) => [
      `${item.priority}. ${item.action}`,
      `   Evidence: \`${item.evidence}\`; confidence: ${item.confidence}.`,
    ])),
    ...(recommendations.length === 0 ? ["No recommendations from the current audit."] : []),
    "",
    "## Unavailable inputs",
    "",
    `- Marketing metrics: ${report.unavailable.marketingMetrics}`,
    `- Customer metrics: ${report.unavailable.customerMetrics}`,
    `- Cost-of-waiting baseline: ${report.unavailable.costOfWaitingBaselineMinutes}`,
    "",
    "No unavailable input was replaced with sample or estimated data.",
    "",
  ];
  writeIfChanged(path, `${lines.join("\n").trimEnd()}\n`);
  return { path, recommendations, commits: commits.length, filesChanged: changedFiles.length };
}

function main(): void {
  const args = parseCliArgs(process.argv.slice(2));
  const repoRoot = resolve(argString(args, "repo-root") ?? process.cwd());
  const auditDir = resolve(repoRoot, argString(args, "audit-dir") ?? "brain/audits");
  const outputDir = resolve(repoRoot, argString(args, "output-dir") ?? "brain/learning");
  if (!existsSync(auditDir)) throw new Error(`Audit directory does not exist: ${auditDir}`);
  const result = generateWeekly({ repoRoot, auditDir, outputDir, date: argString(args, "date") });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

const entry = process.argv[1]?.replace(/\\/g, "/");
if (entry?.endsWith("/weekly.ts") || entry?.endsWith("/weekly.js")) main();
