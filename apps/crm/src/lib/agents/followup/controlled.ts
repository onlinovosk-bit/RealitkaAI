/**
 * CP-P0-4 acceptance #4 / OD-8 — `followup_agent` migrated onto the Control Contract.
 *
 * This wraps the existing rule engine; it does NOT replace it. `evaluateFollowupLead`
 * stays the single source of the follow-up rules, so the migration adds the missing
 * phases (AUTHORIZE, a real OUTCOME, LEARN) without changing what the agent decides.
 *
 * Server-only: the contract's idempotency key uses `node:crypto`.
 *
 * Record ids are derived from the correlationId, not the runId, so a retry of the
 * same business thread recomputes the same decisionId and therefore the same
 * idempotency key (§3.7: retry = new runId, same correlationId). The correlationId
 * must not contain ":" — it is a component of the hashed key.
 *
 * What the migration fixes, measured on production 2026-09-19:
 *   · 240 decisions / 0 outcomes — the loop had no terminal state that did not
 *     depend on a lead reaching a terminal status. Here every run ends in an
 *     OutcomeRecord, including the runs that decide to do nothing.
 *   · 240 rows over 48 leads = 5 duplicate decisions per lead. The platform-derived
 *     idempotency key makes a repeat run of the same decision a no-op.
 *   · The agent had no AUTHORIZE phase at all.
 */
import {
  deriveIdempotencyKey,
  type ActionResult,
  type ControlledAgent,
  type Decision,
  type Lesson,
  type Observation,
  type OutcomeRecord,
  type Provenance,
  type RunContext,
} from "@revolis/control-contract";

import { FOLLOWUP_AGENT_NAME, MS_PER_DAY, STALE_CONTACT_DAYS } from "@/lib/agents/followup/constants";
import { evaluateFollowupLead } from "@/lib/agents/followup/engine";
import { reviewFollowupDraft } from "@/lib/agents/followup/guardianReview";
import type { DraftAction, FollowupLeadInput } from "@/lib/agents/followup/types";

export const FOLLOWUP_CONTROLLED_AGENT_ID = FOLLOWUP_AGENT_NAME;
export const FOLLOWUP_CONTROLLED_AGENT_VERSION = "2.0.0-control-contract";

/** The only action this agent may take. It drafts; it does not send. */
export const FOLLOWUP_CONTROLLED_ACTION = "followup.draft";

const COMPUTED_BY = `followup.engine@${FOLLOWUP_CONTROLLED_AGENT_VERSION}`;

export type FollowupControlledInput = {
  lead: FollowupLeadInput;
  /** Injected for deterministic tests; defaults to the run context clock. */
  nowMs?: number;
};

type RunState = {
  lead: FollowupLeadInput;
  nowMs: number;
  draft: DraftAction | null;
  confidence: number;
  expectedOutcome: string;
  expectedValueEur: number | null;
};

function provenanceFor(ctx: RunContext, sourceRef: string, derived: boolean): Provenance {
  return {
    sourceSystem: "crm.leads",
    sourceRef,
    derivedFrom: derived ? [ctx.correlationId] : [],
    computedBy: derived ? COMPUTED_BY : null,
    measuredAt: ctx.now().toISOString(),
  };
}

function daysSince(iso: string | null | undefined, nowMs: number): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.floor((nowMs - ms) / MS_PER_DAY));
}

/**
 * I-011 — observations carry references and flags, never the lead's name, e-mail
 * or phone. The draft body (which does contain the name) never enters an event.
 */
function observeLead(lead: FollowupLeadInput, nowMs: number, ctx: RunContext): Observation[] {
  const idle = daysSince(lead.last_contact ?? lead.updated_at, nowMs);
  const make = (
    suffix: string,
    kind: string,
    value: number | string | null,
    available: boolean,
    derived: boolean,
  ): Observation => ({
    observationId: `${ctx.correlationId}/obs/${suffix}`,
    tenantId: ctx.tenantId,
    entityType: "lead",
    entityId: lead.id,
    kind,
    evidenceRef: `public.leads#${lead.id}`,
    value: available ? value : null,
    availability: available ? "available" : "unavailable",
    observedAt: ctx.now().toISOString(),
    provenance: provenanceFor(ctx, `public.leads#${lead.id}`, derived),
  });

  return [
    make("idle", "days_since_last_contact", idle, idle !== null, true),
    make("status", "lead_status", lead.status || null, Boolean(lead.status), false),
    make("email", "email_channel", null, Boolean(lead.email?.trim()), false),
    make("sms", "sms_channel", null, Boolean(lead.phone?.trim()), false),
  ];
}

export function createControlledFollowupAgent(): ControlledAgent<FollowupControlledInput> {
  // One run, one lead. The state is scoped to the agent instance the runner drives.
  let state: RunState | null = null;

  return {
    agentId: FOLLOWUP_CONTROLLED_AGENT_ID,
    version: FOLLOWUP_CONTROLLED_AGENT_VERSION,
    capabilities: ["OBSERVE", "ANALYZE", "RECOMMEND"],

    async observe(input, ctx) {
      const nowMs = input.nowMs ?? ctx.now().getTime();
      state = {
        lead: input.lead,
        nowMs,
        draft: null,
        confidence: 0,
        expectedOutcome: "",
        expectedValueEur: null,
      };
      return observeLead(input.lead, nowMs, ctx);
    },

    async decide(observations, ctx): Promise<Decision | null> {
      if (!state) throw new Error("decide() called before observe()");
      const { draft, prediction } = evaluateFollowupLead(state.lead, {
        agencyId: ctx.tenantId,
        nowMs: state.nowMs,
      });

      // "wait" and "broker_review" are not decisions to act on — the run ends
      // with no decision rather than with a fabricated one.
      if (!draft || draft.decision === "wait" || draft.decision === "broker_review") {
        return null;
      }

      state.draft = draft;
      // The rule engine's confidence is a rule-based constant, not a measurement.
      // It is carried through unchanged and its provenance says so.
      state.confidence = prediction?.confidence ?? 0;
      state.expectedOutcome = prediction?.expected_outcome ?? "broker_review_of_draft";
      state.expectedValueEur = prediction?.expected_value_eur ?? null;

      return {
        decisionId: `${ctx.correlationId}/decision`,
        correlationId: ctx.correlationId,
        tenantId: ctx.tenantId,
        actor: ctx.actor,
        observations: observations.map((observation) => observation.observationId),
        decision: draft.decision,
        action: FOLLOWUP_CONTROLLED_ACTION,
        entityType: "lead",
        entityId: state.lead.id,
        alternatives: [
          {
            option: "wait",
            rejectedBecause: `lead idle for at least ${STALE_CONTACT_DAYS} days`,
          },
        ],
        confidence: state.confidence,
        expectedOutcome: state.expectedOutcome,
        expectedValueEur: state.expectedValueEur,
        policyRef: `followup.engine.rules@${STALE_CONTACT_DAYS}d`,
        decidedAt: ctx.now().toISOString(),
      };
    },

    async act(decision, _verdict, ctx): Promise<ActionResult> {
      if (!state?.draft) throw new Error("act() called without a draft");
      const startedAt = Date.now();
      const guardian = reviewFollowupDraft(state.draft, state.lead, ctx.tenantId);

      return {
        actionId: `${ctx.correlationId}/action`,
        correlationId: ctx.correlationId,
        causationId: decision.decisionId as unknown as ActionResult["causationId"],
        tenantId: ctx.tenantId,
        actor: ctx.actor,
        action: decision.action,
        idempotencyKey: deriveIdempotencyKey({
          agentId: FOLLOWUP_CONTROLLED_AGENT_ID,
          action: decision.action,
          tenantId: ctx.tenantId,
          entityId: decision.entityId,
          decisionId: decision.decisionId,
        }),
        // A blocked draft is a real, non-silent failure — not a success with a caveat.
        status: guardian.blockedSend ? "failed" : "succeeded",
        costEur: 0,
        model: null,
        latencyMs: Date.now() - startedAt,
        errorCode: guardian.blockedSend ? `guardian:${guardian.reasons.join(",")}` : null,
        actedAt: ctx.now().toISOString(),
      };
    },

    async reportOutcome(action, ctx): Promise<OutcomeRecord> {
      if (!state) throw new Error("reportOutcome() called before observe()");
      const decisionId = `${ctx.correlationId}/decision`;
      const measuredAt = ctx.now().toISOString();

      if (action.status === "failed") {
        return {
          outcomeId: `${ctx.correlationId}/outcome`,
          correlationId: ctx.correlationId,
          causationId: action.causationId,
          tenantId: ctx.tenantId,
          decisionId,
          outcome: {
            status: "failure",
            reason: null,
            valueEur: 0,
            measuredAt,
            recheckAfter: null,
          },
        };
      }

      // The draft exists; whether a broker sends it is not observable from here.
      // I-012 / AP-001: that is `unknown`, never an invented success.
      return {
        outcomeId: `${ctx.correlationId}/outcome`,
        correlationId: ctx.correlationId,
        causationId: action.causationId,
        tenantId: ctx.tenantId,
        decisionId,
        outcome: {
          status: "unknown",
          reason: "not_observable",
          valueEur: null,
          measuredAt,
          recheckAfter: null,
        },
      };
    },

    async learn(decision, outcome): Promise<Lesson> {
      const delta =
        outcome.outcome.valueEur !== null && decision.expectedValueEur !== null
          ? outcome.outcome.valueEur - decision.expectedValueEur
          : null;

      return {
        lessonId: `${decision.decisionId}:lesson`,
        correlationId: decision.correlationId,
        decisionId: decision.decisionId,
        expected: decision.expectedOutcome,
        actual: outcome.outcome.status,
        delta,
        // Calibration needs an observed outcome. `unknown` teaches nothing yet.
        confidenceWasCalibrated:
          outcome.outcome.status === "unknown"
            ? null
            : outcome.outcome.status === "success",
        status: "raw",
      };
    },
  };
}
