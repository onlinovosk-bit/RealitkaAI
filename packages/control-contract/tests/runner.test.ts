import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ControlContractViolation,
  correlationId,
  createInMemorySink,
  deriveIdempotencyKey,
  resolveAuthority,
  runControlledAgent,
  runId,
  tenantId,
  type ActionResult,
  type Actor,
  type AuthorityVerdict,
  type ControlledAgent,
  type Decision,
  type Observation,
  type OutcomeRecord,
  type RunContext,
} from "../src/index.ts";

const TENANT = tenantId("11111111-1111-1111-1111-111111111111");
const CORRELATION = correlationId("corr-lead-1");
const RUN = runId("run-1");
const ACTOR: Actor = { kind: "agent", agentId: "test_agent", version: "1.0.0" };
const NOW = new Date("2026-09-19T10:00:00.000Z");

function makeContext(overrides: Partial<RunContext> = {}) {
  const sink = createInMemorySink();
  let counter = 0;
  const ctx: RunContext = {
    correlationId: CORRELATION,
    runId: RUN,
    tenantId: TENANT,
    actor: ACTOR,
    now: () => NOW,
    newId: () => `ev-${++counter}`,
    emit: sink.emit,
    resolveAuthority: (authorityContext) => resolveAuthority(authorityContext, { now: () => NOW }),
    systemState: { degraded: false, killSwitch: false },
    actorRole: "agent",
    ...overrides,
  };
  return { ctx, sink };
}

function observation(id: string): Observation {
  return {
    observationId: id,
    tenantId: TENANT,
    entityType: "lead",
    entityId: "lead-1",
    kind: "days_since_last_contact",
    evidenceRef: "leads.last_contact#lead-1",
    value: 9,
    availability: "available",
    observedAt: NOW.toISOString(),
    provenance: {
      sourceSystem: "crm.leads",
      sourceRef: "lead-1",
      derivedFrom: [],
      computedBy: "test@1.0.0",
      measuredAt: NOW.toISOString(),
    },
  };
}

function decisionFor(action: string, confidence = 0.9): Decision {
  return {
    decisionId: "dec-1",
    correlationId: CORRELATION,
    tenantId: TENANT,
    actor: ACTOR,
    observations: ["obs-1"],
    decision: "follow_up",
    action,
    entityType: "lead",
    entityId: "lead-1",
    alternatives: [{ option: "wait", rejectedBecause: "lead is stale" }],
    confidence,
    expectedOutcome: "reply_or_meeting",
    expectedValueEur: null,
    policyRef: null,
    decidedAt: NOW.toISOString(),
  };
}

type Overrides = {
  observations?: Observation[];
  decision?: Decision | null;
  act?: (decision: Decision, verdict: AuthorityVerdict, ctx: RunContext) => Promise<ActionResult>;
  withLearn?: boolean;
};

function makeAgent(overrides: Overrides = {}): ControlledAgent<null> {
  const decision = overrides.decision === undefined ? decisionFor("followup.draft") : overrides.decision;
  const agent: ControlledAgent<null> = {
    agentId: "test_agent",
    version: "1.0.0",
    capabilities: ["OBSERVE", "RECOMMEND"],
    observe: async () => overrides.observations ?? [observation("obs-1")],
    decide: async () => decision,
    act:
      overrides.act ??
      (async (dec, _verdict, ctx) => ({
        actionId: "act-1",
        correlationId: ctx.correlationId,
        causationId: ctx.correlationId as unknown as ActionResult["causationId"],
        tenantId: ctx.tenantId,
        actor: ctx.actor,
        action: dec.action,
        idempotencyKey: deriveIdempotencyKey({
          agentId: "test_agent",
          action: dec.action,
          tenantId: ctx.tenantId,
          entityId: dec.entityId,
          decisionId: dec.decisionId,
        }),
        status: "succeeded",
        costEur: 0,
        model: null,
        latencyMs: 3,
        errorCode: null,
        actedAt: ctx.now().toISOString(),
      })),
    reportOutcome: async (action, ctx): Promise<OutcomeRecord> => ({
      outcomeId: "out-1",
      correlationId: ctx.correlationId,
      causationId: action.causationId,
      tenantId: ctx.tenantId,
      decisionId: "dec-1",
      outcome: {
        status: "unknown",
        reason: "too_early",
        valueEur: null,
        measuredAt: ctx.now().toISOString(),
        recheckAfter: "2026-09-26T10:00:00.000Z",
      },
    }),
  };
  if (overrides.withLearn) {
    agent.learn = async (dec, outcome) => ({
      lessonId: "les-1",
      correlationId: dec.correlationId,
      decisionId: dec.decisionId,
      expected: dec.expectedOutcome,
      actual: outcome.outcome.status,
      delta: null,
      confidenceWasCalibrated: null,
      status: "raw",
    });
  }
  return agent;
}

describe("runControlledAgent — the closed loop", () => {
  it("emits observe → decide → authorize → act → outcome → learn under one correlation_id", async () => {
    const { ctx, sink } = makeContext();
    const result = await runControlledAgent(makeAgent({ withLearn: true }), null, ctx);

    assert.equal(result.termination, "acted");
    const trace = sink.traceByCorrelationId(CORRELATION);
    assert.deepEqual(
      trace.map((e) => e.type),
      [
        "observation.recorded",
        "decision.made",
        "authority.evaluated",
        "action.executed",
        "outcome.reported",
        "lesson.learned",
      ],
    );
    // Acceptance #5 — one query by one correlation_id returns the whole run.
    assert.equal(new Set(trace.map((e) => e.correlationId)).size, 1);
    assert.equal(new Set(trace.map((e) => e.runId)).size, 1);
    for (const event of trace) {
      assert.equal(event.schemaVersion, 2);
      assert.equal(event.scope, "tenant");
      assert.equal(event.tenantId, TENANT);
    }
  });

  it("chains causation: every event but the first names the event that caused it", async () => {
    const { ctx, sink } = makeContext();
    await runControlledAgent(makeAgent({ withLearn: true }), null, ctx);
    const trace = sink.traceByCorrelationId(CORRELATION);
    const ids = new Set(trace.map((e) => e.eventId));

    assert.equal(trace[0]?.causationId, null);
    for (const event of trace.slice(1)) {
      assert.ok(event.causationId, `${event.type} has no causationId`);
      assert.ok(ids.has(event.causationId as string), `${event.type} causation is not an event id`);
    }
  });

  it("derives the idempotency key on the platform and rejects an agent that returns another", async () => {
    const { ctx } = makeContext();
    const agent = makeAgent({
      act: async (dec, _verdict, runCtx) => ({
        actionId: "act-1",
        correlationId: runCtx.correlationId,
        causationId: runCtx.correlationId as unknown as ActionResult["causationId"],
        tenantId: runCtx.tenantId,
        actor: runCtx.actor,
        action: dec.action,
        idempotencyKey: "i-made-this-up",
        status: "succeeded",
        costEur: null,
        model: null,
        latencyMs: null,
        errorCode: null,
        actedAt: runCtx.now().toISOString(),
      }),
    });
    await assert.rejects(
      () => runControlledAgent(agent, null, ctx),
      (error: unknown) =>
        error instanceof ControlContractViolation && error.invariant === "I-009",
    );
  });

  it("rejects an agent that acts on a different action than it decided (I-004)", async () => {
    const { ctx } = makeContext();
    const agent = makeAgent({
      act: async (dec, _verdict, runCtx) => ({
        actionId: "act-1",
        correlationId: runCtx.correlationId,
        causationId: runCtx.correlationId as unknown as ActionResult["causationId"],
        tenantId: runCtx.tenantId,
        actor: runCtx.actor,
        action: "lead.score.recompute",
        idempotencyKey: deriveIdempotencyKey({
          agentId: "test_agent",
          action: dec.action,
          tenantId: runCtx.tenantId,
          entityId: dec.entityId,
          decisionId: dec.decisionId,
        }),
        status: "succeeded",
        costEur: null,
        model: null,
        latencyMs: null,
        errorCode: null,
        actedAt: runCtx.now().toISOString(),
      }),
    });
    await assert.rejects(
      () => runControlledAgent(agent, null, ctx),
      (error: unknown) =>
        error instanceof ControlContractViolation && error.invariant === "I-004",
    );
  });

  it("rejects a decision that cites no observation (I-005)", async () => {
    const { ctx } = makeContext();
    const agent = makeAgent({ decision: { ...decisionFor("followup.draft"), observations: [] } });
    await assert.rejects(
      () => runControlledAgent(agent, null, ctx),
      (error: unknown) =>
        error instanceof ControlContractViolation && error.invariant === "I-005",
    );
  });

  it("rejects a decision citing an observation this run never made (I-005)", async () => {
    const { ctx } = makeContext();
    const agent = makeAgent({
      decision: { ...decisionFor("followup.draft"), observations: ["obs-from-nowhere"] },
    });
    await assert.rejects(
      () => runControlledAgent(agent, null, ctx),
      (error: unknown) =>
        error instanceof ControlContractViolation && error.invariant === "I-005",
    );
  });
});

describe("runControlledAgent — no terminal state is silent (I-006)", () => {
  it("a FORBIDDEN verdict closes the loop with outcome `cancelled` and never calls act()", async () => {
    const { ctx, sink } = makeContext();
    let acted = false;
    const agent = makeAgent({
      decision: decisionFor("portal.scrape"),
      act: async () => {
        acted = true;
        throw new Error("act() must not be reached for a FORBIDDEN action");
      },
    });
    const result = await runControlledAgent(agent, null, ctx);

    assert.equal(acted, false);
    assert.equal(result.termination, "forbidden");
    assert.equal(result.verdict?.authority, "FORBIDDEN");
    assert.equal(result.outcome?.outcome.status, "cancelled");
    assert.ok(sink.events.some((e) => e.type === "outcome.reported"));
    assert.equal(sink.events.some((e) => e.type === "action.executed"), false);
  });

  it("APPROVAL_REQUIRED emits approval.requested and closes as unknown/too_early with a recheck", async () => {
    const { ctx, sink } = makeContext();
    let acted = false;
    const agent = makeAgent({
      decision: decisionFor("followup.email.send"),
      act: async () => {
        acted = true;
        throw new Error("act() must not be reached without an approval");
      },
    });
    const result = await runControlledAgent(agent, null, ctx);

    assert.equal(acted, false);
    assert.equal(result.termination, "approval_required");
    assert.equal(result.outcome?.outcome.status, "unknown");
    assert.equal(result.outcome?.outcome.reason, "too_early");
    assert.ok(result.outcome?.outcome.recheckAfter);
    assert.deepEqual(
      sink.events.map((e) => e.type),
      [
        "observation.recorded",
        "decision.made",
        "authority.evaluated",
        "approval.requested",
        "outcome.reported",
      ],
    );
  });

  it("the approval request carries the authority context snapshot (§3.5)", async () => {
    const { ctx, sink } = makeContext();
    await runControlledAgent(
      makeAgent({ decision: decisionFor("followup.email.send"), act: async () => {
        throw new Error("unreachable");
      } }),
      null,
      ctx,
    );
    const request = sink.events.find((e) => e.type === "approval.requested");
    assert.ok(request);
    assert.ok(request.payload.authorityContextSnapshot);
  });

  it("a kill switch flipped between AUTHORIZE and ACT still stops the side effect (I-007)", async () => {
    const systemState = { degraded: false, killSwitch: false };
    const { ctx } = makeContext({ systemState });
    let acted = false;
    const agent = makeAgent({
      act: async () => {
        acted = true;
        throw new Error("act() must not be reached after the kill switch");
      },
    });
    const patched: ControlledAgent<null> = {
      ...agent,
      decide: async (obs, runCtx) => {
        const decision = await agent.decide(obs, runCtx);
        systemState.killSwitch = true; // flipped after DECIDE, before ACT
        return decision;
      },
    };
    const result = await runControlledAgent(patched, null, ctx);
    assert.equal(acted, false);
    assert.equal(result.termination, "forbidden");
  });

  it("no observations ends the run before DECIDE", async () => {
    const { ctx, sink } = makeContext();
    const result = await runControlledAgent(makeAgent({ observations: [] }), null, ctx);
    assert.equal(result.termination, "no_observations");
    assert.equal(result.decision, null);
    assert.equal(sink.events.length, 0);
  });

  it("no decision ends the run before AUTHORIZE", async () => {
    const { ctx, sink } = makeContext();
    const result = await runControlledAgent(makeAgent({ decision: null }), null, ctx);
    assert.equal(result.termination, "no_decision");
    assert.deepEqual(sink.events.map((e) => e.type), ["observation.recorded"]);
  });
});

describe("runControlledAgent — the sink cannot be tricked into a duplicate", () => {
  it("replaying the same run emits the same keys and the sink deduplicates (I-009)", async () => {
    const sink = createInMemorySink();
    for (const attempt of [1, 2]) {
      let counter = 0;
      await runControlledAgent(makeAgent(), null, {
        correlationId: CORRELATION,
        runId: runId(`run-${attempt}`),
        tenantId: TENANT,
        actor: ACTOR,
        now: () => NOW,
        newId: () => `ev-${attempt}-${++counter}`,
        emit: sink.emit,
        resolveAuthority: (c) => resolveAuthority(c, { now: () => NOW }),
        systemState: { degraded: false, killSwitch: false },
        actorRole: "agent",
      });
    }
    assert.deepEqual(
      sink.events.map((e) => e.type),
      ["observation.recorded", "decision.made", "authority.evaluated", "action.executed", "outcome.reported"],
    );
  });

  it("a platform-scoped event with a tenant id is refused by the sink (I-002 / D-06)", async () => {
    const sink = createInMemorySink();
    await assert.rejects(
      () =>
        sink.emit({
          eventId: "ev-x",
          schemaVersion: 2,
          scope: "platform",
          tenantId: TENANT,
          type: "decision.made",
          occurredAt: NOW.toISOString(),
          actor: ACTOR,
          source: "test",
          entityType: "lead",
          entityId: "lead-1",
          correlationId: CORRELATION,
          causationId: null,
          runId: RUN,
          idempotencyKey: "k",
          payload: {},
        }),
      /scope\/tenantId mismatch/,
    );
  });
});
