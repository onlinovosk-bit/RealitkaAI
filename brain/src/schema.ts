export const SCHEMA_VERSION = 1 as const;

export type Confidence = "high" | "medium" | "low";
export type Sensitivity = "public" | "internal" | "restricted";
export type AssetStatus = "active" | "planned" | "deprecated" | "unknown";
export type DecisionStatus =
  | "active"
  | "superseded"
  | "verification_required";

export interface EvidenceRef {
  path: string;
  line?: number;
  commit: string;
  note: string;
}

export interface SourceRef {
  path: string;
  commit: string;
}

export interface InventorySnapshot {
  fileCount: number;
  digest: string;
  sample: string[];
}

export interface RegistryRecord {
  schemaVersion: typeof SCHEMA_VERSION;
  id: string;
  type:
    | "governance"
    | "documentation"
    | "decision-log"
    | "policy"
    | "workflow"
    | "database"
    | "application"
    | "api"
    | "package"
    | "automation";
  name: string;
  purpose: string;
  owner: string;
  status: AssetStatus;
  source: SourceRef;
  createdAt: string;
  lastVerifiedAt: string;
  dependencies: string[];
  relatedDecisions: string[];
  evidence: EvidenceRef[];
  confidence: Confidence;
  sensitivity: Sensitivity;
  capabilities: string[];
  inventory: InventorySnapshot;
  canonical: false;
}

export interface DecisionRecord {
  schemaVersion: typeof SCHEMA_VERSION;
  id: string;
  title: string;
  date: string;
  owner: string;
  status: DecisionStatus;
  problem: string;
  choice: string;
  rationale: string;
  alternatives: string[];
  expectedOutcome: string;
  observedOutcome: string;
  reviewAt: string;
  relatedAssets: string[];
  supersedes: string[];
  source: SourceRef;
  evidence: EvidenceRef[];
  confidence: Confidence;
  sensitivity: Sensitivity;
  canonical: false;
}

export interface ValidationIssue {
  code: string;
  path: string;
  message: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ID_RE = /^[a-z0-9][a-z0-9._-]+$/i;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(
  object: Record<string, unknown>,
  key: string,
  at: string,
  issues: ValidationIssue[],
): void {
  if (typeof object[key] !== "string" || object[key] === "") {
    issues.push({ code: "required_string", path: `${at}.${key}`, message: "Expected a non-empty string" });
  }
}

function stringArray(
  object: Record<string, unknown>,
  key: string,
  at: string,
  issues: ValidationIssue[],
): void {
  const value = object[key];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    issues.push({ code: "string_array", path: `${at}.${key}`, message: "Expected an array of strings" });
  }
}

function enumValue(
  object: Record<string, unknown>,
  key: string,
  allowed: readonly string[],
  at: string,
  issues: ValidationIssue[],
): void {
  if (typeof object[key] !== "string" || !allowed.includes(object[key])) {
    issues.push({ code: "enum", path: `${at}.${key}`, message: `Expected one of: ${allowed.join(", ")}` });
  }
}

function validateDate(value: unknown, at: string, issues: ValidationIssue[]): void {
  if (typeof value !== "string" || !DATE_RE.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    issues.push({ code: "date", path: at, message: "Expected an ISO date (YYYY-MM-DD)" });
  }
}

function validateSource(value: unknown, at: string, issues: ValidationIssue[]): void {
  if (!isObject(value)) {
    issues.push({ code: "source", path: at, message: "Expected a source object" });
    return;
  }
  requiredString(value, "path", at, issues);
  requiredString(value, "commit", at, issues);
}

function validateEvidence(value: unknown, at: string, issues: ValidationIssue[]): void {
  if (!Array.isArray(value) || value.length === 0) {
    issues.push({ code: "evidence", path: at, message: "Expected at least one evidence reference" });
    return;
  }
  value.forEach((item, index) => {
    const itemPath = `${at}[${index}]`;
    if (!isObject(item)) {
      issues.push({ code: "evidence", path: itemPath, message: "Expected an evidence object" });
      return;
    }
    requiredString(item, "path", itemPath, issues);
    requiredString(item, "commit", itemPath, issues);
    requiredString(item, "note", itemPath, issues);
    if (item.line !== undefined && (!Number.isInteger(item.line) || Number(item.line) < 1)) {
      issues.push({ code: "line", path: `${itemPath}.line`, message: "Expected a positive line number" });
    }
  });
}

export function validateRegistryRecord(value: unknown, at = "record"): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isObject(value)) return [{ code: "object", path: at, message: "Expected an object" }];

  if (value.schemaVersion !== SCHEMA_VERSION) issues.push({ code: "schema_version", path: `${at}.schemaVersion`, message: "Unsupported schema version" });
  for (const key of ["id", "name", "purpose", "owner"] as const) requiredString(value, key, at, issues);
  if (typeof value.id === "string" && !ID_RE.test(value.id)) issues.push({ code: "id", path: `${at}.id`, message: "Invalid stable ID" });
  enumValue(value, "type", ["governance", "documentation", "decision-log", "policy", "workflow", "database", "application", "api", "package", "automation"], at, issues);
  enumValue(value, "status", ["active", "planned", "deprecated", "unknown"], at, issues);
  enumValue(value, "confidence", ["high", "medium", "low"], at, issues);
  enumValue(value, "sensitivity", ["public", "internal", "restricted"], at, issues);
  if (value.canonical !== false) issues.push({ code: "canonical", path: `${at}.canonical`, message: "Generated registry entries must be non-canonical" });
  validateDate(value.createdAt, `${at}.createdAt`, issues);
  validateDate(value.lastVerifiedAt, `${at}.lastVerifiedAt`, issues);
  validateSource(value.source, `${at}.source`, issues);
  validateEvidence(value.evidence, `${at}.evidence`, issues);
  for (const key of ["dependencies", "relatedDecisions", "capabilities"] as const) stringArray(value, key, at, issues);

  if (!isObject(value.inventory)) {
    issues.push({ code: "inventory", path: `${at}.inventory`, message: "Expected an inventory snapshot" });
  } else {
    if (!Number.isInteger(value.inventory.fileCount) || Number(value.inventory.fileCount) < 0) issues.push({ code: "file_count", path: `${at}.inventory.fileCount`, message: "Expected a non-negative integer" });
    requiredString(value.inventory, "digest", `${at}.inventory`, issues);
    stringArray(value.inventory, "sample", `${at}.inventory`, issues);
  }
  return issues;
}

export function validateDecisionRecord(value: unknown, at = "decision"): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isObject(value)) return [{ code: "object", path: at, message: "Expected an object" }];

  if (value.schemaVersion !== SCHEMA_VERSION) issues.push({ code: "schema_version", path: `${at}.schemaVersion`, message: "Unsupported schema version" });
  for (const key of ["id", "title", "owner", "problem", "choice", "rationale", "expectedOutcome", "observedOutcome"] as const) requiredString(value, key, at, issues);
  if (typeof value.id === "string" && !ID_RE.test(value.id)) issues.push({ code: "id", path: `${at}.id`, message: "Invalid stable ID" });
  enumValue(value, "status", ["active", "superseded", "verification_required"], at, issues);
  enumValue(value, "confidence", ["high", "medium", "low"], at, issues);
  enumValue(value, "sensitivity", ["public", "internal", "restricted"], at, issues);
  if (value.canonical !== false) issues.push({ code: "canonical", path: `${at}.canonical`, message: "Derived decision entries must be non-canonical" });
  validateDate(value.date, `${at}.date`, issues);
  validateDate(value.reviewAt, `${at}.reviewAt`, issues);
  validateSource(value.source, `${at}.source`, issues);
  validateEvidence(value.evidence, `${at}.evidence`, issues);
  for (const key of ["alternatives", "relatedAssets", "supersedes"] as const) stringArray(value, key, at, issues);
  return issues;
}
