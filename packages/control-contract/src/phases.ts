/**
 * CP-SPEC §3.3 — the six phase records.
 *
 * Contract invariant (§3.1): every action traces to exactly one decision, every
 * decision to at least one observation, and every action ends in an outcome or an
 * explicit outcome_unknown with a reason. An unfinished loop is an error, not silence.
 */
import type { Actor, CausationId, CorrelationId, TenantId } from "./identity.ts";
import type { Provenance } from "./provenance.ts";

// ─────────────────────────── OBSERVE ───────────────────────────

/** I-012 — an unconnected source yields `unavailable`, never an estimate (AP-001). */
export type Availability = "available" | "unavailable";

export type Observation = {
  observationId: string;
  tenantId: TenantId;
  entityType: string;
  entityId: string;
  kind: string;
  /** A reference to the evidence, not the evidence itself. */
  evidenceRef: string;
  value: number | string | null;
  availability: Availability;
  observedAt: string;
  provenance: Provenance;
};

// ─────────────────────────── DECIDE ───────────────────────────

export type Alternative = { option: string; rejectedBecause: string };

export type Decision = {
  decisionId: string;
  correlationId: CorrelationId;
  tenantId: TenantId;
  actor: Actor;
  /** Observation ids. I-005: must not be empty. */
  observations: string[];
  decision: string;
  /** The action name the decision intends to take — must exist in the registry. */
  action: string;
  entityType: string;
  entityId: string;
  alternatives: Alternative[];
  confidence: number;
  expectedOutcome: string;
  expectedValueEur: number | null;
  policyRef: string | null;
  decidedAt: string;
};

// ─────────────────────────── ACT ───────────────────────────

export type ActionStatus = "succeeded" | "failed" | "partial";

/** §3.7 — only these are retryable, and only in ACT. */
export type RetryableErrorCode = "TRANSIENT" | "TIMEOUT" | "RATE_LIMIT";

export type ActionResult = {
  actionId: string;
  correlationId: CorrelationId;
  /** = decisionId or approvalId. Always the cause, never the entity. */
  causationId: CausationId;
  tenantId: TenantId;
  actor: Actor;
  action: string;
  idempotencyKey: string;
  status: ActionStatus;
  costEur: number | null;
  model: string | null;
  latencyMs: number | null;
  errorCode: string | null;
  actedAt: string;
};

export function isRetryable(errorCode: string | null): errorCode is RetryableErrorCode {
  return errorCode === "TRANSIENT" || errorCode === "TIMEOUT" || errorCode === "RATE_LIMIT";
}

// ─────────────────────── REPORT OUTCOME ───────────────────────

/**
 * Seven terminal states. Without `rejected` / `expired` / `cancelled`, a loop that
 * never reached ACT would stay open forever — which is how 240 decisions on
 * production ended up with 0 outcomes.
 */
export type OutcomeStatus =
  | "success"
  | "failure"
  | "partial"
  | "cancelled"
  | "rejected"
  | "expired"
  | "unknown";

export type OutcomeUnknownReason = "too_early" | "not_observable" | "source_missing";

export type Outcome = {
  status: OutcomeStatus;
  /** Required exactly when status is "unknown"; null otherwise. */
  reason: OutcomeUnknownReason | null;
  valueEur: number | null;
  measuredAt: string;
  /** Only for unknown/too_early. */
  recheckAfter: string | null;
};

export type OutcomeRecord = {
  outcomeId: string;
  correlationId: CorrelationId;
  /** = actionId, or the decisionId when the loop closed before ACT. */
  causationId: CausationId;
  tenantId: TenantId;
  decisionId: string;
  outcome: Outcome;
};

export function isValidOutcome(outcome: Outcome): boolean {
  if (outcome.status === "unknown") return outcome.reason !== null;
  return outcome.reason === null;
}

// ─────────────────────────── LEARN ───────────────────────────

export type LessonStatus = "raw" | "evidence" | "validated" | "organizational";

export type Lesson = {
  lessonId: string;
  correlationId: CorrelationId;
  decisionId: string;
  expected: string;
  actual: string;
  delta: number | null;
  confidenceWasCalibrated: boolean | null;
  status: LessonStatus;
};
