import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import type { LoadedBrain } from "./loader.js";
import { listFiles, readText, slash } from "./repo.js";
import type { Confidence, EvidenceRef } from "./schema.js";

export type FindingCategory =
  | "validation"
  | "staleness"
  | "docs-code-conflict"
  | "duplicate-behavior"
  | "unused-asset"
  | "decision-outcome"
  | "source-availability";

export interface AuditFinding {
  key: string;
  category: FindingCategory;
  severity: "error" | "warning" | "advisory";
  title: string;
  detail: string;
  evidence: EvidenceRef[];
  confidence: Confidence;
}

function evidence(path: string, note: string, line?: number, commit = "working-tree"): EvidenceRef {
  return { path, line, commit, note };
}

function daysBetween(left: string, right: string): number {
  return Math.floor((Date.parse(`${right}T00:00:00Z`) - Date.parse(`${left}T00:00:00Z`)) / 86_400_000);
}

function normalizePurpose(value: string): Set<string> {
  const stop = new Set(["and", "for", "the", "used", "with", "without", "from", "into", "only"]);
  return new Set(value.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((token) => token.length > 3 && !stop.has(token)));
}

function jaccard(left: Set<string>, right: Set<string>): number {
  const intersection = [...left].filter((token) => right.has(token)).length;
  const union = new Set([...left, ...right]).size;
  return union === 0 ? 0 : intersection / union;
}

function pathEvidence(repoRoot: string, path: string, line?: number): AuditFinding | undefined {
  const absolute = resolve(repoRoot, path);
  if (!existsSync(absolute)) {
    return {
      key: `missing-path:${slash(path)}`,
      category: "docs-code-conflict",
      severity: "warning",
      title: "Referenced path does not exist",
      detail: `${slash(path)} is referenced by a Brain record but is unavailable in this checkout.`,
      evidence: [evidence(slash(path), "Missing repository path", line)],
      confidence: "high",
    };
  }
  if (line !== undefined && statSync(absolute).isFile()) {
    const lineCount = readFileSync(absolute, "utf8").split(/\r?\n/).length;
    if (line > lineCount) {
      return {
        key: `missing-line:${slash(path)}:${line}`,
        category: "docs-code-conflict",
        severity: "warning",
        title: "Evidence line is outside the source file",
        detail: `${slash(path)} has ${lineCount} lines, but evidence points to line ${line}.`,
        evidence: [evidence(slash(path), "Out-of-range evidence line", line)],
        confidence: "high",
      };
    }
  }
  return undefined;
}

function localMarkdownLinks(repoRoot: string): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const docs = listFiles(repoRoot, ["docs/architecture", "memory"])
    .filter((path) => extname(path).toLowerCase() === ".md");
  const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g;

  for (const doc of docs) {
    const content = readText(repoRoot, doc);
    if (!content) continue;
    let match: RegExpExecArray | null;
    while ((match = linkPattern.exec(content)) !== null) {
      const raw = match[1].trim().replace(/^<|>$/g, "").split(/[?#]/)[0];
      if (!raw || /^(?:https?:|mailto:|tel:|#)/i.test(raw)) continue;
      const absolute = raw.startsWith("/")
        ? resolve(repoRoot, raw.slice(1))
        : resolve(repoRoot, dirname(doc), raw);
      if (existsSync(absolute)) continue;
      const line = content.slice(0, match.index).split(/\r?\n/).length;
      findings.push({
        key: `dead-link:${doc}:${line}:${raw}`,
        category: "docs-code-conflict",
        severity: "warning",
        title: "Dead local Markdown link",
        detail: `${doc}:${line} points to unavailable local target ${raw}.`,
        evidence: [evidence(doc, `Broken local link: ${raw}`, line)],
        confidence: "high",
      });
      if (findings.length >= 50) return findings;
    }
  }
  return findings;
}

function routePath(routeFile: string): string {
  return routeFile
    .replace(/^apps\/crm\/src\/app/, "")
    .replace(/\/route\.[cm]?[jt]sx?$/, "")
    .replace(/\[\.\.\.([^\]]+)\]/g, "*$1")
    .replace(/\[([^\]]+)\]/g, ":$1");
}

function documentedRoutes(repoRoot: string): AuditFinding[] {
  const routeFiles = listFiles(repoRoot, ["apps/crm/src/app/api"])
    .filter((path) => /\/route\.[cm]?[jt]sx?$/.test(path));
  const routes = routeFiles.map(routePath);
  const docs = listFiles(repoRoot, ["docs/architecture", "memory"])
    .filter((path) => extname(path).toLowerCase() === ".md");
  const findings: AuditFinding[] = [];

  for (const doc of docs) {
    const content = readText(repoRoot, doc);
    if (!content) continue;
    const pattern = /`(\/api\/[A-Za-z0-9_./:[\]-]+)`/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const mentioned = match[1].replace(/\/$/, "");
      if (mentioned.includes("...")) continue;
      const exists = routes.some((route) => {
        if (route.startsWith(`${mentioned}/`)) return true;
        const expression = `^${route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\:[^/]+/g, "[^/]+").replace(/\\\*[^/]+/g, ".+")}$`;
        return new RegExp(expression).test(mentioned);
      });
      if (exists) continue;
      const line = content.slice(0, match.index).split(/\r?\n/).length;
      findings.push({
        key: `missing-route:${doc}:${line}:${mentioned}`,
        category: "docs-code-conflict",
        severity: "advisory",
        title: "Documented API route was not found",
        detail: `${mentioned} has no matching route handler. Dynamic or intentionally removed routes require human review.`,
        evidence: [evidence(doc, `Documented route: ${mentioned}`, line)],
        confidence: "medium",
      });
      if (findings.length >= 50) return findings;
    }
  }
  return findings;
}

export function collectFindings(options: {
  repoRoot: string;
  brain: LoadedBrain;
  auditDate: string;
}): AuditFinding[] {
  const { repoRoot, brain, auditDate } = options;
  const findings: AuditFinding[] = brain.issues.map((issue, index) => ({
    key: `validation:${issue.code}:${issue.path}:${index}`,
    category: "validation",
    severity: "error",
    title: `Brain validation failed: ${issue.code}`,
    detail: issue.message,
    evidence: [evidence(issue.path, issue.message)],
    confidence: "high",
  }));

  for (const record of brain.registry) {
    if (daysBetween(record.lastVerifiedAt, auditDate) > 30) {
      findings.push({
        key: `stale:${record.id}`,
        category: "staleness",
        severity: "advisory",
        title: "Registry source has not been verified for more than 30 days",
        detail: `${record.id} was last verified on ${record.lastVerifiedAt}.`,
        evidence: record.evidence,
        confidence: "high",
      });
    }
    if (record.status === "unknown" || record.source.commit === "uncommitted") {
      findings.push({
        key: `source-unavailable:${record.id}`,
        category: "source-availability",
        severity: "warning",
        title: "Registry source is not committed and verifiable",
        detail: `${record.id} cannot act as a stable source until its owner approves and versions it.`,
        evidence: record.evidence,
        confidence: "high",
      });
    }
    const missing = pathEvidence(repoRoot, record.source.path);
    if (missing) findings.push(missing);
    for (const item of record.evidence) {
      const evidenceMissing = pathEvidence(repoRoot, item.path, item.line);
      if (evidenceMissing) findings.push(evidenceMissing);
    }
  }

  for (let leftIndex = 0; leftIndex < brain.registry.length; leftIndex += 1) {
    const left = brain.registry[leftIndex];
    for (let rightIndex = leftIndex + 1; rightIndex < brain.registry.length; rightIndex += 1) {
      const right = brain.registry[rightIndex];
      const sharedCapabilities = left.capabilities.filter((capability) => right.capabilities.includes(capability));
      const similarity = jaccard(normalizePurpose(left.purpose), normalizePurpose(right.purpose));
      if (sharedCapabilities.length < 2 && similarity < 0.72) continue;
      findings.push({
        key: `duplicate:${left.id}:${right.id}`,
        category: "duplicate-behavior",
        severity: "advisory",
        title: "Possible duplicate capability ownership",
        detail: `${left.id} and ${right.id} overlap; this is a review signal, not an automatic duplicate verdict.`,
        evidence: [...left.evidence.slice(0, 1), ...right.evidence.slice(0, 1)],
        confidence: sharedCapabilities.length >= 2 ? "medium" : "low",
      });
    }
  }

  const incoming = new Set(brain.registry.flatMap((record) => record.dependencies));
  for (const record of brain.registry) {
    if (record.status !== "active" || record.relatedDecisions.length > 0 || incoming.has(record.id)) continue;
    if (!(["workflow", "automation"] as string[]).includes(record.type)) continue;
    findings.push({
      key: `unused:${record.id}`,
      category: "unused-asset",
      severity: "advisory",
      title: "Workflow or automation has no recorded consumer",
      detail: `${record.id} has no incoming registry dependency or related decision. Usage telemetry is unavailable, so review manually.`,
      evidence: record.evidence,
      confidence: "low",
    });
  }

  for (const decision of brain.decisions) {
    for (const item of decision.evidence) {
      const missing = pathEvidence(repoRoot, item.path, item.line);
      if (missing) findings.push(missing);
    }
    const unavailable = decision.observedOutcome.toLowerCase().includes("unavailable");
    const due = decision.reviewAt <= auditDate;
    if (decision.status !== "superseded" && ((unavailable && due) || decision.status === "verification_required")) {
      findings.push({
        key: `decision-outcome:${decision.id}`,
        category: "decision-outcome",
        severity: due ? "warning" : "advisory",
        title: "Decision outcome needs verification",
        detail: `${decision.id} has review date ${decision.reviewAt}; recorded outcome: ${decision.observedOutcome}`,
        evidence: decision.evidence,
        confidence: "high",
      });
    }
  }

  findings.push(...localMarkdownLinks(repoRoot));
  findings.push(...documentedRoutes(repoRoot));

  return [...new Map(findings.map((finding) => [finding.key, finding])).values()]
    .sort((left, right) => left.key.localeCompare(right.key));
}

export function auditJsonFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((name) => name.endsWith(".json"))
    .map((name) => resolve(directory, name))
    .filter((path) => statSync(path).isFile())
    .sort();
}
