/**
 * The platform executor. It — not the agent — walks the six phases, so the
 * contract invariants are enforced in one place.
 *
 * Every run terminates in exactly one of:
 *   no_observations · no_decision · forbidden · approval_required · acted
 * and every terminal state except `no_observations` / `no_decision` produces an
 * OutcomeRecord. That is I-006 made structural: a loop cannot be left open
 * silently, which is precisely how 240 production decisions reached 0 outcomes.
 */
import { buildAuthorityContext, mayAct, type AuthorityVerdict } from "./authority.ts";
import { ControlContractViolation, type ControlledAgent, type RunContext } from "./agent.ts";
import type { ControlEvent, ControlEventType } from "./events.ts";
import { causationId as toCausationId, type CausationId } from "./identity.ts";
import { deriveIdempotencyKey } from "./idempotency.ts";
import {
  isValidOutcome,
  type ActionResult,
  type Decision,
  type Lesson,
  type Observation,
  type Outcome,
  type OutcomeRecord,
} from "./phases.ts";
import { DEFAULT_AUTHORITY_POLICY, type AuthorityPolicy } from "./policy.ts";

export type RunTermination =
  | "no_observations"
  | "no_decision"
  | "forbidden"
  | "approval_required"
  | "acted";

export type ControlRunResult = {
  correlationId: string;
  runId: string;
  termination: RunTermination;
  observations: Observation[];
  decision: Decision | null;
  verdict: AuthorityVerdict | null;
  action: ActionResult | null;
  outcome: OutcomeRecord | null;
  lesson: Lesson | null;
  emitted: ControlEvent[];
};

type EmitInput = {
  type: ControlEventType;
  causationId: CausationId | null;
  entityType: string;
  entityId: string;
  idempotencyKey: string;
  payload: Record<string, unknown>;
};

export type RunOptions = { policy?: AuthorityPolicy };

export async function runControlledAgent<TInput>(
  agent: ControlledAgent<TInput>,
  input: TInput,
  ctx: RunContext,
  options: RunOptions = {},
): Promise<ControlRunResult> {
  const policy = options.policy ?? DEFAULT_AUTHORITY_POLICY;
  const emitted: ControlEvent[] = [];

  const emit = async (input_: EmitInput): Promise<CausationId> => {
    const event: ControlEvent = {
      eventId: ctx.newId(),
      schemaVersion: 2,
      scope: "tenant",
      tenantId: ctx.tenantId,
      type: input_.type,
      occurredAt: ctx.now().toISOString(),
      actor: ctx.actor,
      source: `${agent.agentId}@${agent.version}`,
      entityType: input_.entityType,
      entityId: input_.entityId,
      correlationId: ctx.correlationId,
      causationId: input_.causationId,
      runId: ctx.runId,
      idempotencyKey: input_.idempotencyKey,
      payload: input_.payload,
    };
    await ctx.emit(event);
    emitted.push(event);
    return toCausationId(event.eventId);
  };

  const base = {
    correlationId: ctx.correlationId as string,
    runId: ctx.runId as string,
    emitted,
  };

  // ───────────────────────────── OBSERVE ─────────────────────────────
  const observations = await agent.observe(input, ctx);

  let lastCausation: CausationId | null = null;
  for (const observation of observations) {
    lastCausation = await emit({
      type: "observation.recorded",
      causationId: null,
      entityType: observation.entityType,
      entityId: observation.entityId,
      idempotencyKey: observation.observationId,
      payload: {
        kind: observation.kind,
        evidenceRef: observation.evidenceRef,
        availability: observation.availability,
        value: observation.availability === "available" ? observation.value : null,
        _provenance: observation.provenance,
      },
    });
  }

  if (observations.length === 0) {
    return {
      ...base,
      termination: "no_observations",
      observations,
      decision: null,
      verdict: null,
      action: null,
      outcome: null,
      lesson: null,
    };
  }

  // ───────────────────────────── DECIDE ─────────────────────────────
  const decision = await agent.decide(observations, ctx);
  if (!decision) {
    return {
      ...base,
      termination: "no_decision",
      observations,
      decision: null,
      verdict: null,
      action: null,
      outcome: null,
      lesson: null,
    };
  }

  if (decision.observations.length === 0) {
    throw new ControlContractViolation(
      "I-005",
      `decision ${decision.decisionId} references no observation`,
    );
  }
  const observationIds = new Set(observations.map((o) => o.observationId));
  for (const ref of decision.observations) {
    if (!observationIds.has(ref)) {
      throw new ControlContractViolation(
        "I-005",
        `decision ${decision.decisionId} references unknown observation ${ref}`,
      );
    }
  }

  const decisionEventId = await emit({
    type: "decision.made",
    causationId: lastCausation,
    entityType: decision.entityType,
    entityId: decision.entityId,
    idempotencyKey: decision.decisionId,
    payload: {
      decision: decision.decision,
      action: decision.action,
      confidence: decision.confidence,
      expectedOutcome: decision.expectedOutcome,
      expectedValueEur: decision.expectedValueEur,
      alternatives: decision.alternatives,
      observations: decision.observations,
      policyRef: decision.policyRef,
    },
  });

  const idempotencyKey = deriveIdempotencyKey({
    agentId: agent.agentId,
    action: decision.action,
    tenantId: ctx.tenantId,
    entityId: decision.entityId,
    decisionId: decision.decisionId,
  });

  // ──────────────────────────── AUTHORIZE ────────────────────────────
  const authorityContext = buildAuthorityContext(decision.action, {
    agentId: agent.agentId,
    tenantId: ctx.tenantId,
    actorRole: ctx.actorRole,
    confidence: decision.confidence,
    systemState: ctx.systemState,
  });

  const verdict: AuthorityVerdict = authorityContext
    ? ctx.resolveAuthority(authorityContext)
    : {
        authority: "FORBIDDEN",
        policyRef: `${policy.policyId}@${policy.version}`,
        rationale: `Action "${decision.action}" is not in the action registry.`,
        approvalId: null,
        evaluatedAt: ctx.now().toISOString(),
        appliedRules: ["unregistered_action"],
      };

  const verdictEventId = await emit({
    type: "authority.evaluated",
    causationId: decisionEventId,
    entityType: decision.entityType,
    entityId: decision.entityId,
    idempotencyKey: `${decision.decisionId}:authority`,
    payload: {
      action: decision.action,
      authority: verdict.authority,
      policyRef: verdict.policyRef,
      rationale: verdict.rationale,
      appliedRules: verdict.appliedRules,
    },
  });

  const recordOutcome = async (
    outcome: Outcome,
    causation: CausationId,
    eventCausation: CausationId,
  ): Promise<OutcomeRecord> => {
    if (!isValidOutcome(outcome)) {
      throw new ControlContractViolation(
        "I-006",
        `outcome status "${outcome.status}" with reason "${outcome.reason}" is not a valid pair`,
      );
    }
    const record: OutcomeRecord = {
      outcomeId: ctx.newId(),
      correlationId: ctx.correlationId,
      causationId: causation,
      tenantId: ctx.tenantId,
      decisionId: decision.decisionId,
      outcome,
    };
    await emit({
      type: "outcome.reported",
      causationId: eventCausation,
      entityType: decision.entityType,
      entityId: decision.entityId,
      idempotencyKey: `${idempotencyKey}:outcome`,
      payload: {
        status: outcome.status,
        reason: outcome.reason,
        valueEur: outcome.valueEur,
        recheckAfter: outcome.recheckAfter,
        decisionId: decision.decisionId,
      },
    });
    return record;
  };

  const closeWithoutAct = async (
    outcome: Outcome,
    termination: RunTermination,
  ): Promise<ControlRunResult> => {
    // causationId is always an EVENT id, never a domain record id.
    const record = await recordOutcome(outcome, verdictEventId, verdictEventId);
    return {
      ...base,
      termination,
      observations,
      decision,
      verdict,
      action: null,
      outcome: record,
      lesson: null,
    };
  };

  if (verdict.authority === "FORBIDDEN") {
    return closeWithoutAct(
      {
        status: "cancelled",
        reason: null,
        valueEur: null,
        measuredAt: ctx.now().toISOString(),
        recheckAfter: null,
      },
      "forbidden",
    );
  }

  if (!mayAct(verdict)) {
    // Durable approvals are CP-P0-2. Until that gate, the honest terminal state
    // is outcome_unknown{too_early} with a recheck window (§3.7) — never silence.
    await emit({
      type: "approval.requested",
      causationId: verdictEventId,
      entityType: decision.entityType,
      entityId: decision.entityId,
      idempotencyKey: `${idempotencyKey}:approval`,
      payload: {
        action: decision.action,
        authorityContextSnapshot: authorityContext,
        rationale: verdict.rationale,
      },
    });
    const recheckAfter = new Date(
      ctx.now().getTime() + policy.outcomeSlaMinutes * 60_000,
    ).toISOString();
    return closeWithoutAct(
      {
        status: "unknown",
        reason: "too_early",
        valueEur: null,
        measuredAt: ctx.now().toISOString(),
        recheckAfter,
      },
      "approval_required",
    );
  }

  // ─────────────────────────────── ACT ───────────────────────────────
  // I-007 — authority is re-resolved immediately before the side effect, so a
  // kill switch or a policy change between AUTHORIZE and ACT still bites.
  if (authorityContext) {
    const recheck = ctx.resolveAuthority(authorityContext);
    if (recheck.authority === "FORBIDDEN") {
      return closeWithoutAct(
        {
          status: "cancelled",
          reason: null,
          valueEur: null,
          measuredAt: ctx.now().toISOString(),
          recheckAfter: null,
        },
        "forbidden",
      );
    }
    if (recheck.authority === "APPROVAL_REQUIRED" && verdict.approvalId === null) {
      return closeWithoutAct(
        {
          status: "unknown",
          reason: "too_early",
          valueEur: null,
          measuredAt: ctx.now().toISOString(),
          recheckAfter: new Date(
            ctx.now().getTime() + policy.outcomeSlaMinutes * 60_000,
          ).toISOString(),
        },
        "approval_required",
      );
    }
  }

  const action = await agent.act(decision, verdict, ctx);
  if (action.idempotencyKey !== idempotencyKey) {
    throw new ControlContractViolation(
      "I-009",
      `agent returned idempotencyKey "${action.idempotencyKey}", platform derived "${idempotencyKey}"`,
    );
  }
  if (action.action !== decision.action) {
    throw new ControlContractViolation(
      "I-004",
      `agent acted "${action.action}" but decided "${decision.action}"`,
    );
  }

  const actionEventId = await emit({
    type: "action.executed",
    // Always an EVENT id. The approval record id travels in ActionResult.causationId.
    causationId: decisionEventId,
    entityType: decision.entityType,
    entityId: decision.entityId,
    idempotencyKey,
    payload: {
      action: action.action,
      status: action.status,
      costEur: action.costEur,
      model: action.model,
      latencyMs: action.latencyMs,
      errorCode: action.errorCode,
    },
  });

  // ────────────────────────── REPORT OUTCOME ──────────────────────────
  const outcomeRecord = await agent.reportOutcome(action, ctx);
  if (!isValidOutcome(outcomeRecord.outcome)) {
    throw new ControlContractViolation(
      "I-006",
      `outcome status "${outcomeRecord.outcome.status}" with reason "${outcomeRecord.outcome.reason}" is not a valid pair`,
    );
  }
  const outcomeEventId = await emit({
    type: "outcome.reported",
    causationId: actionEventId,
    entityType: decision.entityType,
    entityId: decision.entityId,
    idempotencyKey: `${idempotencyKey}:outcome`,
    payload: {
      status: outcomeRecord.outcome.status,
      reason: outcomeRecord.outcome.reason,
      valueEur: outcomeRecord.outcome.valueEur,
      recheckAfter: outcomeRecord.outcome.recheckAfter,
      decisionId: decision.decisionId,
    },
  });

  // ────────────────────────────── LEARN ──────────────────────────────
  let lesson: Lesson | null = null;
  if (agent.learn) {
    lesson = await agent.learn(decision, outcomeRecord);
    await emit({
      type: "lesson.learned",
      causationId: outcomeEventId,
      entityType: decision.entityType,
      entityId: decision.entityId,
      idempotencyKey: `${idempotencyKey}:lesson`,
      payload: {
        expected: lesson.expected,
        actual: lesson.actual,
        delta: lesson.delta,
        confidenceWasCalibrated: lesson.confidenceWasCalibrated,
        status: lesson.status,
      },
    });
  }

  return {
    ...base,
    termination: "acted",
    observations,
    decision,
    verdict,
    action,
    outcome: outcomeRecord,
    lesson,
  };
}
