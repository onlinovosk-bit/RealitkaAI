/**
 * Durable execution state for the consumer — the policy half.
 *
 * Consumer v1 wrapped running Claude and writing the result in one `try`, so a
 * failed write released the claim and the next run executed Claude again. The
 * claim had no expiry either, so a killed process blocked the task forever.
 * Which of the two happened depended on whether the OS had wiped the state
 * directory. ADR 2026-09-21 fixes that by making the phases explicit:
 *
 *   CLAIMED -> EXECUTING -> EXECUTED -> RESULT_POSTED -> DONE
 *
 * This module holds the rules; the runner holds the files and the clock. No fs,
 * no network, no child processes — every decision below is testable on its own.
 */

/** Founder decisions, 2026-09-21. */
export const CLAUDE_RUN_TIMEOUT_MS = 10 * 60_000;
export const LEASE_TTL_MS = 2 * 60_000;
export const HEARTBEAT_INTERVAL_MS = 30_000;
/** Automatic retries of persistence AFTER a reply exists. Never of execution. */
export const MAX_PERSISTENCE_ATTEMPTS = 2;

export const EXECUTION_STATES = [
  "CLAIMED",
  "EXECUTING",
  "EXECUTED",
  "RESULT_POSTED",
  "DONE",
  "FAILED_PERSISTENT",
  "NEEDS_FOUNDER",
] as const;
export type ExecutionState = (typeof EXECUTION_STATES)[number];

/** States in which a reply exists and Claude must never be asked again. */
export const REPLY_HELD_STATES: readonly ExecutionState[] = ["EXECUTED", "RESULT_POSTED"];

export interface ExecutionRun {
  sessionId?: string;
  model?: string;
  numTurns?: number;
  durationMs?: number;
  costUsd?: number | null;
  command?: string;
}

export interface ExecutionRecord {
  task_id: string;
  state: ExecutionState;
  /** `runner@<host>/<boot>/<pid>` — a restart must not look like the same holder. */
  owner: string;
  lease_expires_at: string;
  capability_id?: string;
  idempotent?: boolean;
  /** Persistence attempts spent so far. Execution attempts are never counted. */
  persistence_attempts: number;
  /** The durability anchor: written before any network call. */
  reply?: string;
  run?: ExecutionRun;
  result_id?: string;
  failure?: string;
  updated_at: string;
}

export function leaseExpired(record: ExecutionRecord, now: Date): boolean {
  const expiry = Date.parse(record.lease_expires_at);
  // An unparseable lease is an expired lease: better a contested task than a
  // permanently blocked one.
  return Number.isNaN(expiry) || expiry <= now.getTime();
}

export function leaseUntil(now: Date, ttlMs: number = LEASE_TTL_MS): string {
  return new Date(now.getTime() + ttlMs).toISOString();
}

export type ExecutionPlan =
  | { action: "execute"; reason: string }
  | { action: "resume_persistence"; reason: string }
  | { action: "skip"; code: string; reason: string }
  | { action: "needs_founder"; code: string; reason: string };

export interface PlanOptions {
  now: Date;
  /** This runner's identity. */
  owner: string;
  /** Capability metadata. Absent or false means a repeat is not provably safe. */
  idempotent?: boolean;
}

/**
 * Decide what this runner may do with a task, given what is on disk.
 *
 * The hard rule, from the founder: when the runner cannot prove the task has
 * not run, it does not run it — unless the capability is explicitly marked
 * idempotent. Silence is not proof.
 */
export function planFor(record: ExecutionRecord | undefined, options: PlanOptions): ExecutionPlan {
  const idempotent = options.idempotent === true;

  if (!record) {
    // No record is indistinguishable from a lost record. Under capability
    // policy B every AUTO-SAFE capability is read-only and therefore
    // idempotent, so this refusal is unreachable in practice — and it is the
    // correct default for the day that stops being true.
    return idempotent
      ? { action: "execute", reason: "no prior state for an idempotent capability" }
      : {
          action: "needs_founder",
          code: "unprovable_first_run",
          reason: "no local state and the capability is not marked idempotent — a repeat cannot be ruled out",
        };
  }

  if (record.state === "DONE") {
    return { action: "skip", code: "already_done", reason: `already completed as ${record.result_id ?? "a result"}` };
  }
  if (record.state === "NEEDS_FOUNDER") {
    return { action: "skip", code: "needs_founder", reason: record.failure ?? "waiting for a founder decision" };
  }
  if (record.state === "FAILED_PERSISTENT") {
    // The reply is still on disk; resuming it is a founder action, not an
    // automatic one, or the retry budget would mean nothing.
    return {
      action: "skip",
      code: "failed_persistent",
      reason: record.failure ?? `persistence gave up after ${record.persistence_attempts} attempts`,
    };
  }

  const held = !leaseExpired(record, options.now) && record.owner !== options.owner;
  if (held) {
    return { action: "skip", code: "lease_held", reason: `leased by ${record.owner} until ${record.lease_expires_at}` };
  }

  if (REPLY_HELD_STATES.includes(record.state)) {
    if (record.persistence_attempts >= MAX_PERSISTENCE_ATTEMPTS) {
      return {
        action: "skip",
        code: "failed_persistent",
        reason: `persistence budget of ${MAX_PERSISTENCE_ATTEMPTS} spent`,
      };
    }
    // I1: a reply exists, so the only thing left to do is write it.
    return { action: "resume_persistence", reason: `${record.state} with a stored reply` };
  }

  if (record.state === "EXECUTING") {
    // The process died mid-run, or the run outlived its timeout. Whether Claude
    // finished is unknowable from here.
    return idempotent
      ? { action: "execute", reason: "interrupted run of an idempotent capability" }
      : {
          action: "needs_founder",
          code: "execution_unknown",
          reason: "the run was interrupted and the capability is not marked idempotent",
        };
  }

  // CLAIMED with an expired or own lease: nothing ran.
  return { action: "execute", reason: "claim expired before execution started" };
}

/** Whether another persistence attempt is still within budget. */
export function persistenceExhausted(record: Pick<ExecutionRecord, "persistence_attempts">): boolean {
  return record.persistence_attempts >= MAX_PERSISTENCE_ATTEMPTS;
}
