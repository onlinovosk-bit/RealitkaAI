/**
 * Consumer-side policy for the execution agent (`claude-code`).
 *
 * The bus can deliver anything; this module decides what an automated Claude
 * Code process is allowed to act on without the founder in the loop. It is
 * deliberately pure — no HTTP, no child processes — so every gate is testable
 * without touching the live bus.
 *
 * Default posture is refusal: a task executes only when it is addressed to this
 * agent, open, READ_ONLY, gated AUTO-SAFE, carries no pending founder decision,
 * and matches a capability that is explicitly on the allowlist.
 */

import { validateEnvelope } from "./envelope.ts";
import type { BusAgent, BusEnvelope, BusValidationError } from "./types.ts";

export const CONSUMER_AGENT: BusAgent = "claude-code";

/** One thing the consumer knows how to do. Anything unmatched is refused. */
export interface BusCapability {
  id: string;
  /** Does this capability answer the task? */
  matches(task: BusEnvelope): boolean;
  /** The prompt handed to the real Claude Code process. */
  prompt(task: BusEnvelope): string;
  /** Contract check on the reply. Returns a reason when the reply is wrong. */
  verify(reply: string): string | null;
}

function taskText(task: BusEnvelope): string {
  return [task.summary, task.next_action?.description ?? "", task.body].join("\n");
}

/**
 * v1 capability: confirm the transport is live. It answers with two fixed words
 * and touches nothing — the smallest action that still proves the whole loop.
 */
export const BUS_ALIVE_CAPABILITY: BusCapability = {
  id: "bus-alive",
  matches: (task) => /\bBUS\s+ALIVE\b/i.test(taskText(task)),
  prompt: (task) =>
    [
      `Revolis BUS task ${task.id}, from ${task.from} to ${CONSUMER_AGENT}.`,
      `MODE: ${task.mode ?? "READ_ONLY"} — repository changes are forbidden and you have no tools.`,
      `Requested action: ${task.next_action?.description ?? task.summary}`,
      "",
      "Reply with exactly the two words: BUS ALIVE",
      "No explanation, no punctuation, nothing else.",
    ].join("\n"),
  verify: (reply) =>
    reply.trim().toUpperCase() === "BUS ALIVE"
      ? null
      : `expected "BUS ALIVE", got ${JSON.stringify(reply.trim().slice(0, 80))}`,
};

export const DEFAULT_CAPABILITIES: BusCapability[] = [BUS_ALIVE_CAPABILITY];

export type ConsumerRefusalCode =
  | "not_addressed"
  | "not_a_task"
  | "not_open"
  | "mode_not_read_only"
  | "gate_not_auto_safe"
  | "founder_decision_pending"
  | "no_capability"
  | "already_handled";

/** Refusals worth telling the sender about. The rest are silent no-ops. */
const REPORTABLE: ReadonlySet<ConsumerRefusalCode> = new Set<ConsumerRefusalCode>([
  "mode_not_read_only",
  "gate_not_auto_safe",
  "founder_decision_pending",
  "no_capability",
]);

export type ConsumerDecision =
  | { execute: true; capability: BusCapability }
  | { execute: false; code: ConsumerRefusalCode; reason: string; reportable: boolean };

export type ConsumerRefusal = Extract<ConsumerDecision, { execute: false }>;

function refuse(code: ConsumerRefusalCode, reason: string): ConsumerRefusal {
  return { execute: false, code, reason, reportable: REPORTABLE.has(code) };
}

export interface EvaluateOptions {
  capabilities?: BusCapability[];
  /** Task ids this agent has already answered on the bus. */
  handled?: ReadonlySet<string>;
}

/**
 * The gate. Order matters: identity first, then the BUS v1 authority gates,
 * then the capability allowlist.
 */
export function evaluateTask(task: BusEnvelope, options: EvaluateOptions = {}): ConsumerDecision {
  const capabilities = options.capabilities ?? DEFAULT_CAPABILITIES;

  if (task.to !== CONSUMER_AGENT) return refuse("not_addressed", `addressed to ${task.to}`);
  if (task.type !== "task") return refuse("not_a_task", `type is ${task.type}`);
  if (task.status !== "open") return refuse("not_open", `status is ${task.status}`);
  if (options.handled?.has(task.id)) return refuse("already_handled", "this agent has already answered on the bus");

  // An unset mode is not an implicit READ_ONLY: silence is never permission.
  if (task.mode !== "READ_ONLY") {
    return refuse("mode_not_read_only", `mode is ${task.mode ?? "unset"} — only READ_ONLY runs unattended`);
  }
  if (task.next_action?.gate !== "AUTO-SAFE") {
    return refuse("gate_not_auto_safe", `next_action.gate is ${task.next_action?.gate ?? "unset"} — founder GO required`);
  }
  const pending = task.decisions_required ?? [];
  if (pending.length > 0) {
    return refuse("founder_decision_pending", `${pending.length} founder decision(s) still open`);
  }

  const capability = capabilities.find((candidate) => candidate.matches(task));
  if (!capability) {
    return refuse(
      "no_capability",
      `no consumer capability matches this task (have: ${capabilities.map((entry) => entry.id).join(", ")})`,
    );
  }
  return { execute: true, capability };
}

/**
 * Task ids this agent has already answered. Derived from the bus itself rather
 * than local state, so a second machine (or a restarted consumer) cannot run
 * the same task twice.
 */
export function handledTaskIds(envelopes: BusEnvelope[]): Set<string> {
  const handled = new Set<string>();
  for (const envelope of envelopes) {
    if (envelope.from !== CONSUMER_AGENT) continue;
    if (envelope.thread) handled.add(envelope.thread);
    if (envelope.task_id) handled.add(envelope.task_id);
  }
  return handled;
}

/** Facts about the real Claude Code run, carried into the result as evidence. */
export interface ClaudeRunReport {
  reply: string;
  sessionId?: string;
  model?: string;
  numTurns?: number;
  durationMs?: number;
  costUsd?: number | null;
  command: string;
}

function oneLine(text: string, maxChars = 240): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= maxChars ? flat : `${flat.slice(0, maxChars - 1)}...`;
}

export interface BuildResultOptions {
  task: BusEnvelope;
  capability: BusCapability;
  run: ClaudeRunReport;
  now?: Date;
  /** Repo state at execution time — proof the read-only task changed nothing. */
  repoCommit?: string;
}

/** A BUS v1 `result` answering one task. The bus assigns the id on POST. */
export function buildResultEnvelope(options: BuildResultOptions): BusEnvelope {
  const { task, capability, run } = options;
  const now = options.now ?? new Date();

  const body = [
    `reply: ${run.reply.trim()}`,
    `capability: ${capability.id}`,
    `executor: real Claude Code process (${run.command})`,
    run.sessionId ? `claude_session_id: ${run.sessionId}` : null,
    run.model ? `claude_model: ${run.model}` : null,
    options.repoCommit ? `repo_commit_at_execution: ${options.repoCommit}` : null,
    `bus_task_id: ${task.id}`,
    `timestamp: ${now.toISOString()}`,
    "",
    "Repozitar nezmeneny: Claude Code proces bezal s vypnutymi nastrojmi,",
    "takze nemal pristup k suborom, prikazom ani sieti.",
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  return {
    v: 1,
    id: "",
    type: "result",
    status: "done",
    from: CONSUMER_AGENT,
    to: task.from,
    created_at: now.toISOString(),
    task_id: task.task_id ?? task.id,
    thread: task.id,
    mode: "READ_ONLY",
    stop_after_report: true,
    summary: oneLine(`${run.reply.trim()} - ${task.id} spracovany realnym Claude Code procesom, bez zmien v repozitari`),
    counters: {
      received: 1,
      repo_changes: 0,
      claude_turns: run.numTurns ?? 0,
      duration_ms: Math.round(run.durationMs ?? 0),
    },
    evidence: { commands: [run.command], files: [], urls: [] },
    next_action: {
      gate: "GO REQUIRED",
      description: "Founder rozhodne, ci sa consumer rozsiri za capability bus-alive",
    },
    body,
  };
}

/** A BUS v1 `blocker` telling the sender why a task was not executed. */
export function buildBlockerEnvelope(task: BusEnvelope, decision: ConsumerRefusal, now = new Date()): BusEnvelope {
  return {
    v: 1,
    id: "",
    type: "blocker",
    status: "blocked",
    from: CONSUMER_AGENT,
    to: task.from,
    created_at: now.toISOString(),
    task_id: task.task_id ?? task.id,
    thread: task.id,
    mode: "READ_ONLY",
    stop_after_report: true,
    summary: oneLine(`Nespustene (${decision.code}): ${decision.reason}`),
    counters: { received: 1, executed: 0, repo_changes: 0 },
    next_action: {
      gate: "GO REQUIRED",
      description: "Founder rozhodne: upravit ulohu na AUTO-SAFE/READ_ONLY alebo doplnit capability",
    },
    body: [
      `Consumer prijal ulohu ${task.id}, ale nespustil ju.`,
      "",
      `code: ${decision.code}`,
      `reason: ${decision.reason}`,
      "",
      "Ziadne zmeny v repozitari, ziadny Claude Code proces nebol spusteny.",
    ].join("\n"),
  };
}

/** Local validation before anything reaches the bus. Id is assigned server-side. */
export function validateOutgoing(envelope: BusEnvelope): BusValidationError[] {
  return validateEnvelope(envelope).filter((error) => !(error.field === "id" && envelope.id === ""));
}
