/**
 * Revolis Inter-Agent Bus — canonical envelope types (v1).
 *
 * The bus is a transport, not a chat log. One envelope = one action, result or
 * decision, small enough that the receiving agent never needs the original
 * conversation.
 */

export const BUS_ENVELOPE_VERSION = 1 as const;

export const BUS_BOXES = [
  "inbox",
  "outbox",
  "tasks",
  "context",
  "decisions",
  "state",
  "archive",
] as const;
export type BusBox = (typeof BUS_BOXES)[number];

export const BUS_AGENTS = [
  "sol-gpt",
  "claude-code",
  "founder",
  "runner",
  "cursor",
] as const;
export type BusAgent = (typeof BUS_AGENTS)[number];

export const BUS_MESSAGE_TYPES = [
  "task",
  "context",
  "result",
  "decision",
  "state",
  "blocker",
] as const;
export type BusMessageType = (typeof BUS_MESSAGE_TYPES)[number];

export const BUS_STATUSES = [
  "draft",
  "open",
  "in_progress",
  "blocked",
  "done",
  "archived",
] as const;
export type BusStatus = (typeof BUS_STATUSES)[number];

/** Authority gate. Nothing beyond AUTO-SAFE may execute without the founder. */
export const BUS_GATES = ["AUTO-SAFE", "GO REQUIRED", "STOP"] as const;
export type BusGate = (typeof BUS_GATES)[number];

export const BUS_MODES = ["READ_ONLY", "PLAN", "IMPLEMENT", "REVIEW"] as const;
export type BusMode = (typeof BUS_MODES)[number];

export interface BusDecisionRequest {
  /** Stable within the envelope: D1, D2, ... */
  id: string;
  question: string;
  options?: string[];
  recommendation?: string;
  gate: BusGate;
}

export interface BusEvidence {
  commands?: string[];
  files?: string[];
  urls?: string[];
}

export interface BusNextAction {
  gate: BusGate;
  description: string;
}

export interface BusScope {
  repo_paths?: string[];
  forbidden_paths?: string[];
  external_systems?: string[];
}

export interface BusEnvelope {
  v: typeof BUS_ENVELOPE_VERSION;
  id: string;
  type: BusMessageType;
  status: BusStatus;
  from: BusAgent;
  to: BusAgent;
  created_at: string;
  updated_at?: string;
  task_id?: string;
  /** Conversation thread; defaults to task_id when absent. */
  thread?: string;
  mode?: BusMode;
  /** Execution agent must stop and report instead of continuing autonomously. */
  stop_after_report?: boolean;
  /** One line. This is what the other agent reads first. */
  summary: string;
  /** Machine-countable facts (safe_to_delete: 281, open_pr: 31, ...). */
  counters?: Record<string, number>;
  decisions_required?: BusDecisionRequest[];
  evidence?: BusEvidence;
  next_action?: BusNextAction;
  scope?: BusScope;
  /** Markdown detail. Never required for the receiving agent to act. */
  body: string;
}

/** A bus file that predates v1 (no parsable frontmatter). Never auto-rewritten. */
export interface BusLegacyDocument {
  legacy: true;
  path: string;
  id: string;
  raw: string;
}

export interface BusRef {
  box: BusBox;
  id: string;
  path: string;
}

export interface BusValidationError {
  field: string;
  message: string;
}
