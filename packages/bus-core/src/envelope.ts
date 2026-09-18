/** Envelope parsing, validation and markdown serialization. */

import {
  BUS_AGENTS,
  BUS_ENVELOPE_VERSION,
  BUS_GATES,
  BUS_MESSAGE_TYPES,
  BUS_MODES,
  BUS_STATUSES,
  type BusAgent,
  type BusDecisionRequest,
  type BusEnvelope,
  type BusGate,
  type BusLegacyDocument,
  type BusMessageType,
  type BusStatus,
  type BusValidationError,
} from "./types.ts";
import { parseYaml, stringifyYaml, type YamlStrippedComment, type YamlValue } from "./yaml.ts";

/**
 * Field used for warnings about frontmatter text YAML dropped as a comment.
 * Callers that write messages (the CLI) refuse on these rather than storing a
 * message whose text was silently cut in half.
 */
export const LOST_TEXT_FIELD = "frontmatter.lost_text";

const ID_PREFIX: Record<BusMessageType, string> = {
  task: "TASK",
  context: "CTX",
  result: "MSG",
  blocker: "MSG",
  state: "MSG",
  decision: "DEC",
};

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/** Conservative check for credentials that must never enter the bus. */
const SECRET_PATTERNS: Array<[string, RegExp]> = [
  ["github token", /\bgh[pousr]_[A-Za-z0-9]{16,}\b/],
  ["anthropic key", /\bsk-ant-[A-Za-z0-9_-]{16,}\b/],
  ["openai key", /\bsk-(?:proj-)?[A-Za-z0-9]{32,}\b/],
  ["supabase service key", /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/],
  ["postgres url with password", /\bpostgres(?:ql)?:\/\/[^\s:@]+:[^\s@]+@/],
  ["inline secret assignment", /\b(?:SERVICE_ROLE_KEY|SECRET_KEY|API_KEY|ACCESS_TOKEN|PASSWORD)\s*[=:]\s*['"]?[A-Za-z0-9/_+=-]{12,}/],
];

export function findLikelySecrets(text: string): string[] {
  return SECRET_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([label]) => label);
}

export function idPrefixFor(type: BusMessageType): string {
  return ID_PREFIX[type];
}

export function formatIdDate(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

/** `MSG-20260918-003-branch-audit` */
export function buildMessageId(type: BusMessageType, date: Date, sequence: number, slug: string): string {
  const normalized = slug
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  const seq = String(sequence).padStart(3, "0");
  return `${idPrefixFor(type)}-${formatIdDate(date)}-${seq}-${normalized || "untitled"}`;
}

export function isBusId(value: string): boolean {
  return /^(MSG|TASK|CTX|DEC)-[A-Za-z0-9][A-Za-z0-9-]*$/.test(value);
}

function asStringArray(value: YamlValue | undefined): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) return undefined;
  return value.map((item) => String(item));
}

function asCounters(value: YamlValue | undefined): Record<string, number> | undefined {
  if (value === undefined || value === null || Array.isArray(value) || typeof value !== "object") return undefined;
  const out: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value)) {
    const num = typeof raw === "number" ? raw : Number(raw);
    if (Number.isFinite(num)) out[key] = num;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function asDecisions(value: YamlValue | undefined): BusDecisionRequest[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const decisions = value
    .filter((item): item is Record<string, YamlValue> => item !== null && typeof item === "object" && !Array.isArray(item))
    .map((item, index) => ({
      id: item.id ? String(item.id) : `D${index + 1}`,
      question: String(item.question ?? ""),
      options: asStringArray(item.options),
      recommendation: item.recommendation === undefined || item.recommendation === null ? undefined : String(item.recommendation),
      gate: (item.gate ? String(item.gate) : "GO REQUIRED") as BusGate,
    }));
  return decisions.length > 0 ? decisions : undefined;
}

/** Drop `undefined` keys so envelopes compare and serialize as clean JSON. */
function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => stripUndefined(item)) as unknown as T;
  if (value === null || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (child === undefined) continue;
    out[key] = stripUndefined(child);
  }
  return out as T;
}

export interface ParseResult {
  envelope?: BusEnvelope;
  legacy?: BusLegacyDocument;
  /** Frontmatter without `v: 1` — readable, but not held to the v1 contract. */
  preV1?: boolean;
  /** Blocking problems. Only v1 envelopes produce these. */
  errors: BusValidationError[];
  /** Same checks on a pre-v1 message: informative, never blocking. */
  warnings?: BusValidationError[];
}

/**
 * Parse a bus markdown file. Files without frontmatter are returned as legacy
 * documents — they stay readable, they are never rewritten or invented into an
 * envelope.
 */
export function parseBusDocument(raw: string, path = "<memory>"): ParseResult {
  const match = FRONTMATTER.exec(raw.replace(/^﻿/, ""));
  if (!match) {
    const heading = /^#\s*(.+)$/m.exec(raw);
    return {
      legacy: {
        legacy: true,
        path,
        id: heading?.[1]?.trim() ?? path,
        raw,
      },
      errors: [],
    };
  }

  const lostText: BusValidationError[] = [];
  const onComment = (comment: YamlStrippedComment) => {
    if (!comment.suspicious) return; // `# note` is a real comment; `#593` is prose
    const dropped = comment.dropped.length > 60 ? `${comment.dropped.slice(0, 57)}...` : comment.dropped;
    // The parser counts lines inside the frontmatter block; the author opens
    // the file, where the opening `---` takes line 1.
    const fileLine = comment.lineNo + 1;
    lostText.push({
      field: LOST_TEXT_FIELD,
      message:
        `line ${fileLine}: "${dropped}" was read as a YAML comment and dropped ` +
        `(the value kept is "${comment.kept}") — wrap the value in quotes to keep it`,
    });
  };

  let front: Record<string, YamlValue>;
  try {
    front = parseYaml(match[1]!, { onComment });
  } catch (error) {
    return {
      errors: [{ field: "frontmatter", message: error instanceof Error ? error.message : String(error) }],
    };
  }

  const scope = front.scope && typeof front.scope === "object" && !Array.isArray(front.scope) ? front.scope : undefined;
  const evidence =
    front.evidence && typeof front.evidence === "object" && !Array.isArray(front.evidence) ? front.evidence : undefined;
  const nextAction =
    front.next_action && typeof front.next_action === "object" && !Array.isArray(front.next_action)
      ? front.next_action
      : undefined;

  // `re` is the pre-v1 spelling of `thread`.
  const thread = front.thread ?? front.re;
  const envelope: BusEnvelope = {
    v: BUS_ENVELOPE_VERSION,
    id: String(front.id ?? ""),
    type: String(front.type ?? "") as BusMessageType,
    status: String(front.status ?? "") as BusStatus,
    from: String(front.from ?? front.owner ?? "") as BusAgent,
    to: String(front.to ?? "") as BusAgent,
    created_at: String(front.created_at ?? front.created ?? ""),
    updated_at: front.updated_at === undefined || front.updated_at === null ? undefined : String(front.updated_at),
    task_id: front.task_id === undefined || front.task_id === null ? undefined : String(front.task_id),
    thread: thread === undefined || thread === null ? undefined : String(thread),
    mode: front.mode === undefined || front.mode === null ? undefined : (String(front.mode) as BusEnvelope["mode"]),
    stop_after_report: typeof front.stop_after_report === "boolean" ? front.stop_after_report : undefined,
    summary: front.summary === undefined || front.summary === null ? "" : String(front.summary),
    counters: asCounters(front.counters),
    decisions_required: asDecisions(front.decisions_required),
    evidence: evidence
      ? {
          commands: asStringArray(evidence.commands),
          files: asStringArray(evidence.files),
          urls: asStringArray(evidence.urls),
        }
      : undefined,
    next_action: nextAction
      ? {
          gate: String(nextAction.gate ?? "") as BusGate,
          description: String(nextAction.description ?? ""),
        }
      : undefined,
    scope: scope
      ? {
          repo_paths: asStringArray(scope.repo_paths),
          forbidden_paths: asStringArray(scope.forbidden_paths),
          external_systems: asStringArray(scope.external_systems),
        }
      : undefined,
    body: (match[2] ?? "").trim(),
  };

  const cleaned = stripUndefined(envelope);
  const problems = validateEnvelope(cleaned);
  // Pre-v1 messages predate this contract. They stay readable and are never
  // rewritten; their gaps are reported as warnings so CI can still gate v1.
  const preV1 = front.v !== BUS_ENVELOPE_VERSION;
  const warnings = [...lostText, ...(preV1 ? problems : [])];
  return {
    envelope: cleaned,
    preV1,
    errors: preV1 ? [] : problems,
    ...(warnings.length > 0 ? { warnings } : {}),
  };
}

export function validateEnvelope(envelope: Partial<BusEnvelope>): BusValidationError[] {
  const errors: BusValidationError[] = [];
  const require = (field: string, ok: boolean, message: string) => {
    if (!ok) errors.push({ field, message });
  };

  require("id", typeof envelope.id === "string" && isBusId(envelope.id), "missing or malformed id (PREFIX-YYYYMMDD-NNN-slug)");
  require("type", BUS_MESSAGE_TYPES.includes(envelope.type as BusMessageType), `type must be one of ${BUS_MESSAGE_TYPES.join("|")}`);
  require("status", BUS_STATUSES.includes(envelope.status as BusStatus), `status must be one of ${BUS_STATUSES.join("|")}`);
  require("from", BUS_AGENTS.includes(envelope.from as BusAgent), `from must be one of ${BUS_AGENTS.join("|")}`);
  require("to", BUS_AGENTS.includes(envelope.to as BusAgent), `to must be one of ${BUS_AGENTS.join("|")}`);
  require(
    "created_at",
    typeof envelope.created_at === "string" && !Number.isNaN(Date.parse(envelope.created_at)),
    "created_at must be an ISO timestamp",
  );
  require("summary", typeof envelope.summary === "string" && envelope.summary.trim().length > 0, "summary is required (one line)");
  if (typeof envelope.summary === "string" && envelope.summary.length > 280) {
    errors.push({ field: "summary", message: "summary must stay under 280 characters — detail belongs in body" });
  }
  if (envelope.summary?.includes("\n")) {
    errors.push({ field: "summary", message: "summary must be a single line" });
  }
  if (envelope.mode !== undefined && !BUS_MODES.includes(envelope.mode)) {
    errors.push({ field: "mode", message: `mode must be one of ${BUS_MODES.join("|")}` });
  }
  if (envelope.next_action && !BUS_GATES.includes(envelope.next_action.gate)) {
    errors.push({ field: "next_action.gate", message: `gate must be one of ${BUS_GATES.join("|")}` });
  }
  if (envelope.next_action && !envelope.next_action.description?.trim()) {
    errors.push({ field: "next_action.description", message: "next_action needs exactly one concrete action" });
  }
  envelope.decisions_required?.forEach((decision, index) => {
    if (!decision.question?.trim()) {
      errors.push({ field: `decisions_required[${index}].question`, message: "decision needs a question" });
    }
    if (!BUS_GATES.includes(decision.gate)) {
      errors.push({ field: `decisions_required[${index}].gate`, message: `gate must be one of ${BUS_GATES.join("|")}` });
    }
  });

  const secrets = findLikelySecrets(`${envelope.summary ?? ""}\n${envelope.body ?? ""}`);
  secrets.forEach((label) => errors.push({ field: "body", message: `possible ${label} in message — bus rule 6 forbids secrets` }));

  return errors;
}

/** Serialize to the on-disk markdown format (frontmatter + body). */
export function serializeEnvelope(envelope: BusEnvelope): string {
  const front: Record<string, YamlValue> = {
    v: envelope.v,
    id: envelope.id,
    type: envelope.type,
    status: envelope.status,
    from: envelope.from,
    to: envelope.to,
    created_at: envelope.created_at,
  };
  if (envelope.updated_at) front.updated_at = envelope.updated_at;
  if (envelope.task_id) front.task_id = envelope.task_id;
  if (envelope.thread) front.thread = envelope.thread;
  if (envelope.mode) front.mode = envelope.mode;
  if (envelope.stop_after_report !== undefined) front.stop_after_report = envelope.stop_after_report;
  front.summary = envelope.summary;
  if (envelope.counters) front.counters = envelope.counters as unknown as YamlValue;
  if (envelope.decisions_required) {
    front.decisions_required = envelope.decisions_required.map((decision) => {
      const item: Record<string, YamlValue> = { id: decision.id, question: decision.question, gate: decision.gate };
      if (decision.options) item.options = decision.options;
      if (decision.recommendation) item.recommendation = decision.recommendation;
      return item;
    });
  }
  if (envelope.evidence) {
    const evidence: Record<string, YamlValue> = {};
    if (envelope.evidence.commands) evidence.commands = envelope.evidence.commands;
    if (envelope.evidence.files) evidence.files = envelope.evidence.files;
    if (envelope.evidence.urls) evidence.urls = envelope.evidence.urls;
    if (Object.keys(evidence).length > 0) front.evidence = evidence;
  }
  if (envelope.scope) {
    const scope: Record<string, YamlValue> = {};
    if (envelope.scope.repo_paths) scope.repo_paths = envelope.scope.repo_paths;
    if (envelope.scope.forbidden_paths) scope.forbidden_paths = envelope.scope.forbidden_paths;
    if (envelope.scope.external_systems) scope.external_systems = envelope.scope.external_systems;
    if (Object.keys(scope).length > 0) front.scope = scope;
  }
  if (envelope.next_action) {
    front.next_action = { gate: envelope.next_action.gate, description: envelope.next_action.description };
  }

  return `---\n${stringifyYaml(front)}\n---\n\n${envelope.body.trim()}\n`;
}

/** Round-trip helper used by the CLI and the HTTP adapter. */
export function envelopeFromJson(input: unknown, now: () => Date = () => new Date()): ParseResult {
  if (input === null || typeof input !== "object") {
    return { errors: [{ field: "body", message: "envelope must be a JSON object" }] };
  }
  const raw = input as Record<string, unknown>;
  const envelope: BusEnvelope = {
    v: BUS_ENVELOPE_VERSION,
    id: String(raw.id ?? ""),
    type: raw.type as BusMessageType,
    status: (raw.status as BusStatus) ?? "open",
    from: raw.from as BusAgent,
    to: raw.to as BusAgent,
    created_at: typeof raw.created_at === "string" ? raw.created_at : now().toISOString(),
    updated_at: typeof raw.updated_at === "string" ? raw.updated_at : undefined,
    task_id: typeof raw.task_id === "string" ? raw.task_id : undefined,
    thread: typeof raw.thread === "string" ? raw.thread : undefined,
    mode: raw.mode as BusEnvelope["mode"],
    stop_after_report: typeof raw.stop_after_report === "boolean" ? raw.stop_after_report : undefined,
    summary: typeof raw.summary === "string" ? raw.summary : "",
    counters: asCounters(raw.counters as YamlValue),
    decisions_required: asDecisions(raw.decisions_required as YamlValue),
    evidence: raw.evidence as BusEnvelope["evidence"],
    next_action: raw.next_action as BusEnvelope["next_action"],
    scope: raw.scope as BusEnvelope["scope"],
    body: typeof raw.body === "string" ? raw.body : "",
  };
  const cleaned = stripUndefined(envelope);
  return { envelope: cleaned, errors: validateEnvelope(cleaned) };
}
