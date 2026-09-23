import { describe, expect, it } from "vitest";

import { createInMemorySink, runControlledAgent } from "@revolis/control-contract";
import { createControlRunContext } from "@/lib/control-plane/run-context";
import {
  createControlledFollowupAgent,
  FOLLOWUP_CONTROLLED_ACTION,
} from "@/lib/agents/followup/controlled";
import type { FollowupLeadInput } from "@/lib/agents/followup/types";

const TENANT = "b101361c-e250-4c43-b099-52c4febeb450";
const NOW = new Date("2026-09-19T10:00:00.000Z");
const NOW_MS = NOW.getTime();
const DAY = 86_400_000;

function makeRun(correlation: string, run = "run-1") {
  const sink = createInMemorySink();
  let counter = 0;
  const ctx = createControlRunContext({
    tenantId: TENANT,
    correlationId: correlation,
    runId: run,
    actor: { kind: "agent", agentId: "followup_agent", version: "2.0.0-control-contract" },
    sink,
    now: () => NOW,
    newId: () => `ev-${++counter}`,
  });
  return { sink, ctx };
}

function staleLead(overrides: Partial<FollowupLeadInput> = {}): FollowupLeadInput {
  return {
    id: "lead-1",
    name: "Testovací Klient",
    email: "klient@example.test",
    phone: null,
    status: "Teplý",
    last_contact: new Date(NOW_MS - 9 * DAY).toISOString(),
    updated_at: new Date(NOW_MS - 9 * DAY).toISOString(),
    source: "web",
    ...overrides,
  };
}

describe("controlled followup agent — closed loop (CP-P0-4 acceptance #4)", () => {
  it("runs OBSERVE → DECIDE → AUTHORIZE → ACT → OUTCOME → LEARN under one correlation_id", async () => {
    const { sink, ctx } = makeRun("corr-1");
    const result = await runControlledAgent(
      createControlledFollowupAgent(),
      { lead: staleLead(), nowMs: NOW_MS },
      ctx,
    );

    expect(result.termination).toBe("acted");
    expect(result.verdict?.authority).toBe("AUTONOMOUS");
    expect(result.action?.action).toBe(FOLLOWUP_CONTROLLED_ACTION);

    // Acceptance #5 — the whole run is retrievable by one correlation_id.
    const trace = sink.traceByCorrelationId("corr-1");
    expect(trace.map((event) => event.type)).toEqual([
      "observation.recorded",
      "observation.recorded",
      "observation.recorded",
      "observation.recorded",
      "decision.made",
      "authority.evaluated",
      "action.executed",
      "outcome.reported",
      "lesson.learned",
    ]);
    expect(new Set(trace.map((event) => event.correlationId)).size).toBe(1);
    expect(new Set(trace.map((event) => event.runId)).size).toBe(1);
  });

  it("closes the loop with an honest outcome — the draft's effect is not observable here", async () => {
    const { ctx } = makeRun("corr-2");
    const result = await runControlledAgent(
      createControlledFollowupAgent(),
      { lead: staleLead(), nowMs: NOW_MS },
      ctx,
    );

    expect(result.outcome?.outcome.status).toBe("unknown");
    expect(result.outcome?.outcome.reason).toBe("not_observable");
    expect(result.outcome?.outcome.valueEur).toBeNull();
  });

  it("I-011 — no event payload carries the lead's name, e-mail or phone", async () => {
    const { sink, ctx } = makeRun("corr-3");
    await runControlledAgent(
      createControlledFollowupAgent(),
      { lead: staleLead(), nowMs: NOW_MS },
      ctx,
    );

    const serialized = JSON.stringify(sink.events);
    expect(serialized).not.toContain("Testovací Klient");
    expect(serialized).not.toContain("klient@example.test");
    // The draft body itself never enters an event either.
    expect(serialized).not.toContain("Dobrý deň");
  });

  it("I-012 — a lead with no contact timestamp yields `unavailable`, not a guess", async () => {
    const { sink, ctx } = makeRun("corr-4");
    await runControlledAgent(
      createControlledFollowupAgent(),
      { lead: staleLead({ last_contact: null, updated_at: null }), nowMs: NOW_MS },
      ctx,
    );

    const idle = sink.events.find(
      (event) => event.type === "observation.recorded" && event.payload.kind === "days_since_last_contact",
    );
    expect(idle?.payload.availability).toBe("unavailable");
    expect(idle?.payload.value).toBeNull();
  });

  it("a lead the engine says to wait on ends as `no_decision`, not as a fabricated decision", async () => {
    const { sink, ctx } = makeRun("corr-5");
    const result = await runControlledAgent(
      createControlledFollowupAgent(),
      {
        lead: staleLead({ last_contact: new Date(NOW_MS - 1 * DAY).toISOString() }),
        nowMs: NOW_MS,
      },
      ctx,
    );

    expect(result.termination).toBe("no_decision");
    expect(sink.events.some((event) => event.type === "decision.made")).toBe(false);
  });

  it("a lead with no contact channel ends as `no_decision` (broker_review is not an agent action)", async () => {
    const { ctx } = makeRun("corr-6");
    const result = await runControlledAgent(
      createControlledFollowupAgent(),
      { lead: staleLead({ email: null, phone: null }), nowMs: NOW_MS },
      ctx,
    );
    expect(result.termination).toBe("no_decision");
  });
});

describe("controlled followup agent — authority", () => {
  it("an SMS-sourced lead falls below the confidence floor and needs a human", async () => {
    const { sink, ctx } = makeRun("corr-7");
    const result = await runControlledAgent(
      createControlledFollowupAgent(),
      {
        lead: staleLead({ email: null, phone: "+421900000000", source: "sms-kampaň" }),
        nowMs: NOW_MS,
      },
      ctx,
    );

    // The rule engine's SMS confidence is 0.55, the policy floor is 0.60.
    expect(result.verdict?.authority).toBe("APPROVAL_REQUIRED");
    expect(result.verdict?.appliedRules).toContain("low_confidence_floor");
    expect(result.termination).toBe("approval_required");
    expect(result.action).toBeNull();
    expect(sink.events.some((event) => event.type === "approval.requested")).toBe(true);
    // Even so, the loop closes — it does not stay open like the 240 production rows.
    expect(result.outcome?.outcome.status).toBe("unknown");
    expect(result.outcome?.outcome.reason).toBe("too_early");
    expect(result.outcome?.outcome.recheckAfter).toBeTruthy();
  });

  it("a kill switch stops the agent before it drafts anything", async () => {
    const sink = createInMemorySink();
    let counter = 0;
    const ctx = createControlRunContext({
      tenantId: TENANT,
      correlationId: "corr-8",
      runId: "run-1",
      actor: { kind: "agent", agentId: "followup_agent", version: "2.0.0-control-contract" },
      sink,
      now: () => NOW,
      newId: () => `ev-${++counter}`,
      systemState: { degraded: false, killSwitch: true },
    });

    const result = await runControlledAgent(
      createControlledFollowupAgent(),
      { lead: staleLead(), nowMs: NOW_MS },
      ctx,
    );

    expect(result.verdict?.authority).toBe("FORBIDDEN");
    expect(result.termination).toBe("forbidden");
    expect(result.action).toBeNull();
    expect(result.outcome?.outcome.status).toBe("cancelled");
  });
});

describe("controlled followup agent — idempotency (I-009)", () => {
  it("a retry — new runId, same correlationId — recomputes the same key", async () => {
    const attempt1 = makeRun("corr-9", "run-1");
    const attempt2 = makeRun("corr-9", "run-2");

    const a = await runControlledAgent(
      createControlledFollowupAgent(),
      { lead: staleLead(), nowMs: NOW_MS },
      attempt1.ctx,
    );
    const b = await runControlledAgent(
      createControlledFollowupAgent(),
      { lead: staleLead(), nowMs: NOW_MS },
      attempt2.ctx,
    );

    expect(a.runId).not.toBe(b.runId);
    expect(a.action?.idempotencyKey).toBe(b.action?.idempotencyKey);
    expect(a.action?.idempotencyKey).toMatch(/^[0-9a-f]{64}$/);
  });

  it("a retry into the same sink does not duplicate the action event", async () => {
    const sink = createInMemorySink();
    for (const run of ["run-1", "run-2"]) {
      let counter = 0;
      const ctx = createControlRunContext({
        tenantId: TENANT,
        correlationId: "corr-retry",
        runId: run,
        actor: { kind: "agent", agentId: "followup_agent", version: "2.0.0-control-contract" },
        sink,
        now: () => NOW,
        newId: () => `${run}-ev-${++counter}`,
      });
      await runControlledAgent(
        createControlledFollowupAgent(),
        { lead: staleLead(), nowMs: NOW_MS },
        ctx,
      );
    }
    expect(sink.events.filter((event) => event.type === "action.executed")).toHaveLength(1);
    expect(sink.events.filter((event) => event.type === "decision.made")).toHaveLength(1);
  });

  it("a different lead produces a different key", async () => {
    const first = makeRun("corr-10");
    const second = makeRun("corr-11");

    const a = await runControlledAgent(
      createControlledFollowupAgent(),
      { lead: staleLead(), nowMs: NOW_MS },
      first.ctx,
    );
    const b = await runControlledAgent(
      createControlledFollowupAgent(),
      { lead: staleLead({ id: "lead-2" }), nowMs: NOW_MS },
      second.ctx,
    );

    expect(a.action?.idempotencyKey).not.toBe(b.action?.idempotencyKey);
  });
});
