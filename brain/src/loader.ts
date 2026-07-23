import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import {
  type DecisionRecord,
  type RegistryRecord,
  type ValidationIssue,
  validateDecisionRecord,
  validateRegistryRecord,
} from "./schema.js";

export interface LoadedBrain {
  registry: RegistryRecord[];
  decisions: DecisionRecord[];
  issues: ValidationIssue[];
}

const SECRET_PATTERNS: Array<[string, RegExp]> = [
  ["private_key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["live_secret", /\b(?:sk|rk)_(?:live|prod)_[A-Za-z0-9_-]{12,}\b/],
  ["jwt", /\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\b/],
  ["email", /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i],
];

function jsonFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((name) => name.endsWith(".json"))
    .map((name) => resolve(directory, name))
    .filter((path) => statSync(path).isFile())
    .sort();
}

function loadValues(directory: string, issues: ValidationIssue[]): unknown[] {
  const values: unknown[] = [];
  for (const file of jsonFiles(directory)) {
    try {
      const parsed = JSON.parse(readFileSync(file, "utf8")) as unknown;
      values.push(...(Array.isArray(parsed) ? parsed : [parsed]));
    } catch (error) {
      issues.push({ code: "invalid_json", path: file, message: error instanceof Error ? error.message : "Invalid JSON" });
    }
  }
  return values;
}

function duplicateIds(
  values: Array<{ id: string }>,
  namespace: string,
  issues: ValidationIssue[],
): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value.id)) issues.push({ code: "duplicate_id", path: namespace, message: `Duplicate ID: ${value.id}` });
    seen.add(value.id);
  }
}

function sensitiveValues(values: unknown[], namespace: string, issues: ValidationIssue[]): void {
  const serialized = JSON.stringify(values);
  for (const [name, pattern] of SECRET_PATTERNS) {
    if (pattern.test(serialized)) issues.push({ code: "sensitive_value", path: namespace, message: `Detected forbidden ${name} pattern` });
  }
}

export function loadBrain(brainRoot: string): LoadedBrain {
  const issues: ValidationIssue[] = [];
  const rawRegistry = loadValues(resolve(brainRoot, "registry"), issues);
  const rawDecisions = loadValues(resolve(brainRoot, "decisions"), issues);

  rawRegistry.forEach((record, index) => issues.push(...validateRegistryRecord(record, `registry[${index}]`)));
  rawDecisions.forEach((record, index) => issues.push(...validateDecisionRecord(record, `decisions[${index}]`)));

  const registry = rawRegistry.filter((value) => validateRegistryRecord(value).length === 0) as RegistryRecord[];
  const decisions = rawDecisions.filter((value) => validateDecisionRecord(value).length === 0) as DecisionRecord[];
  duplicateIds(registry, "registry", issues);
  duplicateIds(decisions, "decisions", issues);
  sensitiveValues(registry, "registry", issues);
  sensitiveValues(decisions, "decisions", issues);

  const registryIds = new Set(registry.map((record) => record.id));
  const decisionIds = new Set(decisions.map((record) => record.id));
  for (const record of registry) {
    for (const dependency of record.dependencies) {
      if (!registryIds.has(dependency)) issues.push({ code: "missing_dependency", path: record.id, message: `Unknown registry dependency: ${dependency}` });
    }
    for (const decision of record.relatedDecisions) {
      if (!decisionIds.has(decision)) issues.push({ code: "missing_decision", path: record.id, message: `Unknown related decision: ${decision}` });
    }
  }
  for (const decision of decisions) {
    for (const superseded of decision.supersedes) {
      if (!decisionIds.has(superseded)) issues.push({ code: "missing_superseded", path: decision.id, message: `Unknown superseded decision: ${superseded}` });
    }
  }

  return { registry, decisions, issues };
}
