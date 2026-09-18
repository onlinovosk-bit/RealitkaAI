import test from "node:test";
import assert from "node:assert/strict";
import {
  BUS_ALIVE_CAPABILITY,
  buildBlockerEnvelope,
  buildResultEnvelope,
  evaluateTask,
  handledTaskIds,
  validateOutgoing,
  type BusEnvelope,
  type ClaudeRunReport,
} from "../src/index.ts";

function task(overrides: Partial<BusEnvelope> = {}): BusEnvelope {
  return {
    v: 1,
    id: "TASK-20260918-002-bus-live-test",
    type: "task",
    status: "open",
    from: "sol-gpt",
    to: "claude-code",
    created_at: "2026-09-18T18:55:32.857Z",
    mode: "READ_ONLY",
    stop_after_report: true,
    summary: "BUS LIVE TEST: potvrd prijatie spravy cez Revolis BUS.",
    next_action: { gate: "AUTO-SAFE", description: "Odpovedz BUS ALIVE a nevykonavaj ziadne zmeny." },
    body: "",
    ...overrides,
  };
}

const run: ClaudeRunReport = {
  reply: "BUS ALIVE",
  sessionId: "773347d6-0861-489e-a6ba-8b7ed26ac39e",
  model: "sonnet",
  numTurns: 1,
  durationMs: 4210,
  costUsd: 0.002,
  command: 'claude -p --output-format json --tools ""',
};

test("an AUTO-SAFE READ_ONLY bus-alive task executes", () => {
  const decision = evaluateTask(task());
  assert.equal(decision.execute, true);
  assert.equal(decision.execute && decision.capability.id, "bus-alive");
});

test("the gates refuse everything that is not explicitly permitted", () => {
  const cases: Array<[Partial<BusEnvelope>, string]> = [
    [{ to: "cursor" }, "not_addressed"],
    [{ type: "result" }, "not_a_task"],
    [{ status: "done" }, "not_open"],
    [{ mode: undefined }, "mode_not_read_only"],
    [{ mode: "IMPLEMENT" }, "mode_not_read_only"],
    [{ next_action: { gate: "GO REQUIRED", description: "deploy" } }, "gate_not_auto_safe"],
    [{ next_action: undefined }, "gate_not_auto_safe"],
    [
      { decisions_required: [{ id: "D1", question: "merge?", gate: "GO REQUIRED" }] },
      "founder_decision_pending",
    ],
    [{ summary: "Zmaz vetvy", next_action: { gate: "AUTO-SAFE", description: "zmaz 281 vetiev" } }, "no_capability"],
  ];

  for (const [overrides, code] of cases) {
    const decision = evaluateTask(task(overrides));
    assert.equal(decision.execute, false, `${code} should not execute`);
    assert.equal(decision.execute === false && decision.code, code);
  }
});

test("a task already answered on the bus never runs twice", () => {
  const answer: BusEnvelope = {
    ...task(),
    id: "MSG-20260918-004-bus-alive",
    type: "result",
    status: "done",
    from: "claude-code",
    to: "sol-gpt",
    thread: "TASK-20260918-002-bus-live-test",
  };
  const handled = handledTaskIds([answer]);
  assert.ok(handled.has("TASK-20260918-002-bus-live-test"));

  const decision = evaluateTask(task(), { handled });
  assert.equal(decision.execute, false);
  assert.equal(decision.execute === false && decision.code, "already_handled");
});

test("handledTaskIds ignores messages this agent did not send", () => {
  const foreign: BusEnvelope = { ...task(), from: "cursor", to: "sol-gpt", thread: "TASK-20260918-002-bus-live-test" };
  assert.equal(handledTaskIds([foreign]).size, 0);
});

test("the bus-alive capability rejects a reply that is not the contract", () => {
  assert.equal(BUS_ALIVE_CAPABILITY.verify("BUS ALIVE"), null);
  assert.equal(BUS_ALIVE_CAPABILITY.verify("  bus alive \n"), null);
  assert.match(BUS_ALIVE_CAPABILITY.verify("Sure! The bus is alive.") ?? "", /expected "BUS ALIVE"/);
});

test("the result envelope is a valid v1 result threaded to the task", () => {
  const source = task();
  const result = buildResultEnvelope({
    task: source,
    capability: BUS_ALIVE_CAPABILITY,
    run,
    now: new Date("2026-09-18T19:10:00.000Z"),
    repoCommit: "5bedc19a4",
  });

  assert.deepEqual(validateOutgoing(result), []);
  assert.equal(result.type, "result");
  assert.equal(result.from, "claude-code");
  assert.equal(result.to, "sol-gpt");
  assert.equal(result.thread, source.id);
  assert.equal(result.task_id, source.id);
  assert.equal(result.mode, "READ_ONLY");
  assert.equal(result.counters?.repo_changes, 0);
  assert.match(result.summary, /^BUS ALIVE/);
  assert.match(result.body, /claude_session_id: 773347d6/);
  assert.match(result.body, /repo_commit_at_execution: 5bedc19a4/);
});

test("the result keeps the founder gate: the bus cannot self-approve", () => {
  const result = buildResultEnvelope({ task: task(), capability: BUS_ALIVE_CAPABILITY, run });
  assert.equal(result.next_action?.gate, "GO REQUIRED");
  assert.equal(result.stop_after_report, true);
});

test("a refused task produces a valid blocker, not an invented result", () => {
  const refused = evaluateTask(task({ mode: "IMPLEMENT" }));
  assert.equal(refused.execute, false);
  const blocker = buildBlockerEnvelope(task({ mode: "IMPLEMENT" }), refused as Extract<typeof refused, { execute: false }>);

  assert.deepEqual(validateOutgoing(blocker), []);
  assert.equal(blocker.type, "blocker");
  assert.equal(blocker.status, "blocked");
  assert.equal(blocker.counters?.executed, 0);
  assert.equal(blocker.next_action?.gate, "GO REQUIRED");
});

test("only gate refusals are reported back; routing misses stay silent", () => {
  const routing = evaluateTask(task({ to: "cursor" }));
  assert.equal(routing.execute === false && routing.reportable, false);
  const gate = evaluateTask(task({ mode: "IMPLEMENT" }));
  assert.equal(gate.execute === false && gate.reportable, true);
});

test("a summary stays a single line under the envelope limit", () => {
  const result = buildResultEnvelope({
    task: task({ id: "TASK-20260918-009-very-long", summary: "x".repeat(260) }),
    capability: BUS_ALIVE_CAPABILITY,
    run: { ...run, reply: "BUS ALIVE\n\nwith a trailing note that should never reach the summary" },
  });
  assert.ok(!result.summary.includes("\n"));
  assert.ok(result.summary.length <= 280);
  assert.deepEqual(validateOutgoing(result), []);
});
