import test from "node:test";
import assert from "node:assert/strict";
import {
  AUTHORITY_KEYS,
  BUS_ALIVE_CAPABILITY,
  DEFAULT_CAPABILITIES,
  REPO_HEAD_CAPABILITY,
  lostAuthorityText,
  LOST_TEXT_FIELD,
  parseBusDocument,
  buildBlockerEnvelope,
  buildResultEnvelope,
  evaluateTask,
  handledTaskIds,
  serializeEnvelope,
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
  // It declares no facts, so an empty set is what the runner hands it.
  assert.equal(BUS_ALIVE_CAPABILITY.verify("BUS ALIVE", {}), null);
  assert.equal(BUS_ALIVE_CAPABILITY.verify("  bus alive \n", {}), null);
  assert.match(BUS_ALIVE_CAPABILITY.verify("Sure! The bus is alive.", {}) ?? "", /expected "BUS ALIVE"/);
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

/** A task file as an author writes it, with an unquoted `#` on one line. */
function draft(line: string): string {
  return [
    "---",
    "v: 1",
    "id: TASK-20260918-098-lost-text-probe",
    "type: task",
    "status: open",
    "from: sol-gpt",
    "to: claude-code",
    "created_at: 2026-09-18T20:30:00.000Z",
    "mode: READ_ONLY",
    "summary: BUS LIVE TEST",
    "next_action:",
    "  gate: AUTO-SAFE",
    "  description: Odpovedz BUS ALIVE",
    "---",
    "",
  ]
    .map((entry) => (entry.trim().startsWith(`${line.trim().split(":")[0]!}:`) ? line : entry))
    .join("\n");
}

test("a qualifier eaten from mode or gate is refused, not executed", () => {
  for (const [line, key] of [
    ["mode: READ_ONLY #neskor IMPLEMENT", "mode"],
    ["  gate: AUTO-SAFE #len po review od foundera", "gate"],
    ["to: claude-code #iba ak je founder online", "to"],
    ["status: open #zatial nespustat", "status"],
  ] as const) {
    const parsed = parseBusDocument(draft(line), "<probe>");
    const damaged = lostAuthorityText(parsed.warnings);
    assert.equal(damaged.length, 1, `${key} should be reported as damaged`);
    assert.equal(damaged[0]!.key, key);

    const decision = evaluateTask(parsed.envelope!, { warnings: parsed.warnings });
    assert.equal(decision.execute, false, `${key} must not execute`);
    assert.equal(decision.execute === false && decision.code, "lost_text_in_authority_field");
    assert.equal(decision.execute === false && decision.reportable, true);
  }
});

test("the same task without the eaten qualifier still executes", () => {
  const parsed = parseBusDocument(draft("mode: READ_ONLY"), "<probe>");
  assert.deepEqual(lostAuthorityText(parsed.warnings), []);
  assert.equal(evaluateTask(parsed.envelope!, { warnings: parsed.warnings }).execute, true);
});

test("text eaten from a field the gate does not read still executes", () => {
  // `description` is prose. It is worth a warning, but it carries no authority,
  // and refusing on it would make every `#593` reference unanswerable.
  const parsed = parseBusDocument(draft("  description: Odpovedz BUS ALIVE #593"), "<probe>");
  assert.equal((parsed.warnings ?? []).some((warning) => warning.field === LOST_TEXT_FIELD), true);
  assert.deepEqual(lostAuthorityText(parsed.warnings), []);
  assert.equal(evaluateTask(parsed.envelope!, { warnings: parsed.warnings }).execute, true);
});

test("a deliberate comment is not treated as damage", () => {
  const parsed = parseBusDocument(draft("mode: READ_ONLY # zamerny komentar"), "<probe>");
  assert.deepEqual(lostAuthorityText(parsed.warnings), []);
  assert.equal(evaluateTask(parsed.envelope!, { warnings: parsed.warnings }).execute, true);
});

test("the damaged check runs before the gate trusts any authority value", () => {
  // `to` is itself an authority key: checking identity first would mean
  // trusting a value the parser already knows is incomplete.
  const parsed = parseBusDocument(draft("to: claude-code #iba po GO"), "<probe>");
  const decision = evaluateTask(parsed.envelope!, { warnings: parsed.warnings });
  assert.equal(decision.execute === false && decision.code, "lost_text_in_authority_field");
});

test("AUTHORITY_KEYS covers exactly the fields the gate reads", () => {
  assert.deepEqual([...AUTHORITY_KEYS].sort(), ["gate", "mode", "status", "to", "type"]);
});

test("a JSON-posted envelope round-trips through YAML without losing text", () => {
  // Messages from a remote agent arrive as JSON and are serialized to YAML by
  // the bus. Serialization must quote whatever the parser would later eat.
  const posted = buildResultEnvelope({
    task: task({ next_action: { gate: "AUTO-SAFE", description: "Odpovedz BUS ALIVE #593 a nic nemen" } }),
    capability: BUS_ALIVE_CAPABILITY,
    run,
  });
  posted.id = "MSG-20260918-099-roundtrip";
  const reparsed = parseBusDocument(serializeEnvelope(posted), "<roundtrip>");
  assert.deepEqual(lostAuthorityText(reparsed.warnings), []);
  assert.equal(reparsed.envelope!.next_action?.gate, "GO REQUIRED");
  assert.equal(reparsed.envelope!.mode, "READ_ONLY");
});

const HEAD = "5b2e9153b70a6dbad0bd8f1573b23f301e6ee612";

test("repo-head is registered and declares the one fact it needs", () => {
  assert.ok(DEFAULT_CAPABILITIES.includes(REPO_HEAD_CAPABILITY));
  assert.deepEqual(REPO_HEAD_CAPABILITY.facts, ["repo_head"]);
  // A read changes nothing, so a second run is indistinguishable from the first.
  assert.equal(REPO_HEAD_CAPABILITY.idempotent, true);
});

test("repo-head matches the phrase and nothing else", () => {
  assert.equal(REPO_HEAD_CAPABILITY.matches(task({ summary: "report the REPO HEAD" })), true);
  assert.equal(REPO_HEAD_CAPABILITY.matches(task({ summary: "repo head, lowercase" })), true);
  assert.equal(REPO_HEAD_CAPABILITY.matches(task({ summary: "BUS ALIVE" })), false);
  // "repository head" is not the phrase: matching loosely would let an
  // unrelated task pull a capability it never asked for.
  assert.equal(REPO_HEAD_CAPABILITY.matches(task({ summary: "give me the repository head" })), false);
});

test("the repo-head prompt carries the sha the runner read", () => {
  const prompt = REPO_HEAD_CAPABILITY.prompt(task(), { repo_head: HEAD });
  assert.match(prompt, new RegExp(HEAD));
  // The tool posture is restated in the prompt, not only in the process flags.
  assert.match(prompt, /you have no tools/);
});

test("repo-head accepts only the sha it handed over", () => {
  assert.equal(REPO_HEAD_CAPABILITY.verify(HEAD, { repo_head: HEAD }), null);
  assert.equal(REPO_HEAD_CAPABILITY.verify(`  ${HEAD}\n`, { repo_head: HEAD }), null);
});

test("repo-head rejects a well-formed sha that is not the head — the invention case", () => {
  // This is the assertion the capability exists for. A model that answers with
  // a plausible sha instead of the one it was given must fail the contract,
  // otherwise the reply proves nothing about the machine.
  const invented = "0123456789abcdef0123456789abcdef01234567";
  assert.match(REPO_HEAD_CAPABILITY.verify(invented, { repo_head: HEAD }) ?? "", /is not the repository head/);
});

test("repo-head rejects a reply that is not a sha at all", () => {
  assert.match(
    REPO_HEAD_CAPABILITY.verify("The head is 5b2e915.", { repo_head: HEAD }) ?? "",
    /expected a 40-character commit sha/,
  );
  // An abbreviated sha is still wrong: the contract is the full value.
  assert.match(REPO_HEAD_CAPABILITY.verify("5b2e915", { repo_head: HEAD }) ?? "", /expected a 40-character commit sha/);
  assert.match(REPO_HEAD_CAPABILITY.verify(HEAD.toUpperCase(), { repo_head: HEAD }) ?? "", /expected a 40-character commit sha/);
});

test("repo-head fails closed when the fact never arrived", () => {
  // The runner does not call a contract without the facts it declared. If that
  // ever changed, an unverifiable reply must not pass for a verified one.
  assert.match(REPO_HEAD_CAPABILITY.verify(HEAD, {}) ?? "", /repo_head was not gathered/);
});
