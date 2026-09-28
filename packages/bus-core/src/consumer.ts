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

import { LOST_TEXT_FIELD, validateEnvelope } from "./envelope.ts";
import type { BusAgent, BusEnvelope, BusValidationError } from "./types.ts";

export const CONSUMER_AGENT: BusAgent = "claude-code";

/**
 * Frontmatter keys the gate actually reads. If YAML silently ate text from one
 * of these, the sender wrote a condition the gate never saw — `mode: READ_ONLY
 * #neskor IMPLEMENT` parses to a clean `READ_ONLY`. The value looks valid, so
 * no amount of validating it can recover the qualifier. Refuse instead.
 */
export const AUTHORITY_KEYS: readonly string[] = ["to", "type", "status", "mode", "gate"];

/** lost_text warnings that landed on a key the gate depends on. */
export function lostAuthorityText(warnings: readonly BusValidationError[] = []): BusValidationError[] {
  return warnings.filter(
    (warning) => warning.field === LOST_TEXT_FIELD && warning.key !== undefined && AUTHORITY_KEYS.includes(warning.key),
  );
}

/**
 * A read-only fact the runner reads from the machine on a capability's behalf.
 *
 * Deliberately a closed union rather than a command string: a capability names
 * what it needs, and the runner alone decides how — and whether — to obtain it.
 * A capability therefore cannot widen its own reach by asking for something new,
 * which is the whole reason the executing process can keep running with no tools.
 */
export type BusFactId = "repo_head";

/** Facts gathered for one execution. Missing means the runner could not read it. */
export type BusFacts = Partial<Record<BusFactId, string>>;

/** One thing the consumer knows how to do. Anything unmatched is refused. */
export interface BusCapability {
  id: string;
  /**
   * May this capability be run a second time when the runner cannot prove the
   * first run did not happen? Only a capability with no observable effect can
   * answer true. Absent means false: silence is not proof.
   */
  idempotent: boolean;
  /**
   * Read-only facts the runner must gather before this capability runs. Absent
   * means none, and a capability that declares a fact does not run without it.
   */
  facts?: readonly BusFactId[];
  /** Does this capability answer the task? */
  matches(task: BusEnvelope): boolean;
  /** The prompt handed to the real Claude Code process. */
  prompt(task: BusEnvelope, facts: BusFacts): string;
  /** Contract check on the reply. Returns a reason when the reply is wrong. */
  verify(reply: string, facts: BusFacts): string | null;
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
  // Two fixed words and no tools: running it twice is indistinguishable from
  // running it once.
  idempotent: true,
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

const COMMIT_SHA = /^[0-9a-f]{40}$/;

/**
 * v1 capability: report the commit the runner is standing on.
 *
 * The first capability whose answer is not a constant. `BUS ALIVE` proves the
 * loop turns; this proves the answer travelling through it came from the
 * machine, because the contract compares the reply against the sha the runner
 * read before the process started.
 *
 * What it does NOT prove, and must not be read as proving: that the executing
 * model read anything. It still runs with `--tools ""` and cannot. The runner
 * reads, the model relays, and the check catches a model that invents a sha
 * instead of relaying the one it was handed. Giving the model its own read
 * access is a separate decision with a separate gate.
 */
export const REPO_HEAD_CAPABILITY: BusCapability = {
  id: "repo-head",
  // Reporting a value back changes nothing on the machine, so a second run is
  // indistinguishable from the first.
  idempotent: true,
  facts: ["repo_head"],
  matches: (task) => /\bREPO\s+HEAD\b/i.test(taskText(task)),
  prompt: (task, facts) =>
    [
      `Revolis BUS task ${task.id}, from ${task.from} to ${CONSUMER_AGENT}.`,
      `MODE: ${task.mode ?? "READ_ONLY"} — repository changes are forbidden and you have no tools.`,
      `Requested action: ${task.next_action?.description ?? task.summary}`,
      "",
      `The runner read the repository head for you: ${facts.repo_head ?? "(unavailable)"}`,
      "",
      "Reply with exactly that commit sha: 40 lowercase hexadecimal characters.",
      "Do not shorten it, do not guess one, no explanation, nothing else.",
    ].join("\n"),
  verify: (reply, facts) => {
    const expected = facts.repo_head;
    // A capability that declares a fact never reaches its own contract without
    // it. If it somehow did, the reply is unverifiable, which is a failure.
    if (!expected) return "repo_head was not gathered — the reply cannot be checked against anything";
    const got = reply.trim();
    if (!COMMIT_SHA.test(got)) return `expected a 40-character commit sha, got ${JSON.stringify(got.slice(0, 80))}`;
    return got === expected ? null : `reply ${got} is not the repository head ${expected}`;
  },
};

export const DEFAULT_CAPABILITIES: BusCapability[] = [BUS_ALIVE_CAPABILITY, REPO_HEAD_CAPABILITY];

export type ConsumerRefusalCode =
  | "not_addressed"
  | "not_a_task"
  | "not_open"
  | "mode_not_read_only"
  | "gate_not_auto_safe"
  | "founder_decision_pending"
  | "no_capability"
  | "already_handled"
  | "lost_text_in_authority_field"
  // Raised by the runner's durable state rather than by the gates: a run whose
  // outcome cannot be established, so it is parked instead of repeated.
  | "execution_unknown"
  | "unprovable_first_run"
  | "capability_gone"
  | "daily_cap_reached";

/** Refusals worth telling the sender about. The rest are silent no-ops. */
const REPORTABLE: ReadonlySet<ConsumerRefusalCode> = new Set<ConsumerRefusalCode>([
  "mode_not_read_only",
  "gate_not_auto_safe",
  "founder_decision_pending",
  "no_capability",
  "lost_text_in_authority_field",
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
  /**
   * Parse warnings for this task's own file. Without them the gate cannot tell
   * a clean `READ_ONLY` from one that lost a qualifier to a YAML comment.
   */
  warnings?: readonly BusValidationError[];
}

/**
 * The gate. Order matters: identity first, then the BUS v1 authority gates,
 * then the capability allowlist.
 */
export function evaluateTask(task: BusEnvelope, options: EvaluateOptions = {}): ConsumerDecision {
  const capabilities = options.capabilities ?? DEFAULT_CAPABILITIES;

  const damaged = lostAuthorityText(options.warnings);
  if (damaged.length > 0) {
    return refuse(
      "lost_text_in_authority_field",
      `frontmatter lost text on ${damaged.map((warning) => warning.key).join(", ")} — ` +
        `the gate would read a value the sender did not write (${damaged[0]!.message})`,
    );
  }

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
 * Task ids this agent has already **answered** — that is, produced a result for.
 * Derived from the bus itself rather than local state, so a second machine (or a
 * restarted consumer) cannot run the same task twice.
 *
 * Blockers deliberately do not count. A blocker says "I did not run this", and
 * treating it as an answer gagged the task forever: once refused, a task could
 * never run again even after the founder fixed the very thing that refused it.
 * Under a one-shot runner that was invisible; under a runner polling every
 * minute it is a trap. Duplicate execution stays guarded by results, and by the
 * durable execution state on the runner itself.
 */
export function handledTaskIds(envelopes: BusEnvelope[]): Set<string> {
  const handled = new Set<string>();
  for (const envelope of envelopes) {
    if (envelope.from !== CONSUMER_AGENT) continue;
    if (envelope.type === "blocker") continue;
    if (envelope.thread) handled.add(envelope.thread);
    if (envelope.task_id) handled.add(envelope.task_id);
  }
  return handled;
}

/**
 * The refusal already reported for each task, so the runner can stay silent
 * about a refusal it has already explained — without ever closing the task.
 * Keyed by task, valued by the refusal code carried in the blocker body.
 */
export function reportedRefusals(envelopes: BusEnvelope[]): Map<string, Set<string>> {
  const reported = new Map<string, Set<string>>();
  for (const envelope of envelopes) {
    if (envelope.from !== CONSUMER_AGENT || envelope.type !== "blocker") continue;
    const code = /^code:\s*(\S+)$/m.exec(envelope.body)?.[1];
    if (!code) continue;
    for (const key of [envelope.thread, envelope.task_id]) {
      if (!key) continue;
      const codes = reported.get(key) ?? new Set<string>();
      codes.add(code);
      reported.set(key, codes);
    }
  }
  return reported;
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
