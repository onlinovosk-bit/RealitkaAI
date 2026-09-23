import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMessageId,
  idDateFor,
  formatIdDate,
  LOST_TEXT_FIELD,
  envelopeFromJson,
  findLikelySecrets,
  parseBusDocument,
  serializeEnvelope,
  validateEnvelope,
} from "../src/envelope.ts";
import type { BusEnvelope } from "../src/types.ts";

const sample: BusEnvelope = {
  v: 1,
  id: "MSG-20260918-001-branch-audit",
  type: "result",
  status: "done",
  from: "claude-code",
  to: "sol-gpt",
  created_at: "2026-09-18T09:00:00Z",
  task_id: "TASK-347-BRANCH-AUDIT",
  mode: "READ_ONLY",
  stop_after_report: true,
  summary: "347 branches classified against origin/main",
  counters: { safe_to_delete: 281, open_pr: 31, superseded: 18, unique_work: 11, uncertain: 6 },
  decisions_required: [
    { id: "D1", question: "Delete the 281 merged branches?", gate: "GO REQUIRED", recommendation: "yes, batched" },
  ],
  evidence: { commands: ["git for-each-ref"], files: ["docs/reports/branch-audit.md"] },
  next_action: { gate: "GO REQUIRED", description: "Founder approves batch deletion of 281 merged branches" },
  body: "## Summary\n\nFull classification table in the linked report.",
};

test("serialize -> parse round trip preserves every field", () => {
  const parsed = parseBusDocument(serializeEnvelope(sample));
  assert.deepEqual(parsed.errors, []);
  assert.deepEqual(parsed.envelope, sample);
});

test("a file without frontmatter is kept as legacy, never invented into an envelope", () => {
  const parsed = parseBusDocument("# REVOLIS EXECUTION RESULT\n\nMESSAGE_ID:\nMSG-20260916-090\n", "outbox/legacy.md");
  assert.equal(parsed.envelope, undefined);
  assert.equal(parsed.legacy?.legacy, true);
  assert.equal(parsed.legacy?.id, "REVOLIS EXECUTION RESULT");
  assert.deepEqual(parsed.errors, []);
});

test("validation rejects unknown agents, bad gates and multi-line summaries", () => {
  const errors = validateEnvelope({
    ...sample,
    to: "grok" as never,
    summary: "line one\nline two",
    next_action: { gate: "MAYBE" as never, description: "" },
  });
  const fields = errors.map((error) => error.field);
  assert.ok(fields.includes("to"));
  assert.ok(fields.includes("summary"));
  assert.ok(fields.includes("next_action.gate"));
  assert.ok(fields.includes("next_action.description"));
});

test("validation rejects a malformed id", () => {
  const errors = validateEnvelope({ ...sample, id: "random-note" });
  assert.ok(errors.some((error) => error.field === "id"));
});

test("secrets are blocked at the envelope boundary", () => {
  const errors = validateEnvelope({ ...sample, body: `token: ghp_${"a".repeat(36)}` });
  assert.ok(errors.some((error) => error.message.includes("github token")));
  assert.deepEqual(findLikelySecrets("postgres://user:hunter2@db.host/postgres"), ["postgres url with password"]);
  assert.deepEqual(findLikelySecrets("nothing to see"), []);
});

test("buildMessageId produces stable, slugified ids", () => {
  const id = buildMessageId("result", new Date("2026-09-18T10:00:00Z"), 3, "Šialené  Vetvy / Audit!");
  assert.equal(id, "MSG-20260918-003-sialene-vetvy-audit");
  assert.equal(buildMessageId("task", new Date("2026-09-18T10:00:00Z"), 12, "x"), "TASK-20260918-012-x");
});

test("envelopeFromJson fills created_at and validates", () => {
  const result = envelopeFromJson(
    {
      id: "MSG-20260918-002-plan",
      type: "task",
      status: "open",
      from: "sol-gpt",
      to: "claude-code",
      summary: "Classify branches",
      body: "",
    },
    () => new Date("2026-09-18T11:22:33Z"),
  );
  assert.deepEqual(result.errors, []);
  assert.equal(result.envelope?.created_at, "2026-09-18T11:22:33.000Z");
});

test("envelopeFromJson rejects non-objects", () => {
  assert.equal(envelopeFromJson("nope").envelope, undefined);
});

test("an unquoted value containing # is warned about, not silently halved", () => {
  const raw = ["---", "v: 1", ...Object.entries({
    id: "MSG-20260918-003-pr-593-open",
    type: "state",
    status: "open",
    from: "claude-code",
    to: "sol-gpt",
    created_at: "2026-09-18T09:00:00Z",
  }).map(([key, value]) => `${key}: ${value}`), "summary: PR #593 is open", "---", "", "body"].join("\n");

  const parsed = parseBusDocument(raw);
  assert.equal(parsed.envelope?.summary, "PR", "YAML keeps only the text before the #");
  assert.deepEqual(parsed.errors, [], "a halved summary is still a valid envelope — that is why it needs a warning");

  const lost = (parsed.warnings ?? []).filter((warning) => warning.field === LOST_TEXT_FIELD);
  assert.equal(lost.length, 1);
  assert.match(lost[0]!.message, /line 9: "#593 is open" was read as a YAML comment and dropped/);
  assert.match(lost[0]!.message, /wrap the value in quotes/);
});

test("quoting the value keeps the text and raises no warning", () => {
  const parsed = parseBusDocument(serializeEnvelope({ ...sample, summary: "PR #593 is open" }));
  assert.equal(parsed.envelope?.summary, "PR #593 is open");
  assert.deepEqual(parsed.warnings ?? [], []);
});

test("a deliberate comment is not reported as lost text", () => {
  const raw = serializeEnvelope(sample).replace("status: done", "status: done   # closed on main");
  const parsed = parseBusDocument(raw);
  assert.equal(parsed.envelope?.status, "done");
  assert.deepEqual((parsed.warnings ?? []).filter((warning) => warning.field === LOST_TEXT_FIELD), []);
});

test("the id date follows created_at, not the wall clock", () => {
  // Date-independent on purpose: the previous regression only showed up on days
  // other than the one the test was written on, so it sat red for three days.
  const created = "2026-09-18T09:00:00Z";
  const today = new Date();
  const idDate = idDateFor(created, today);

  assert.equal(formatIdDate(idDate), "20260918");
  assert.notEqual(
    formatIdDate(idDate),
    formatIdDate(today),
    "created_at is in the past, so the id must not carry today's date",
  );
  assert.equal(buildMessageId("result", idDate, 1, "pr-593"), "MSG-20260918-001-pr-593");
});

test("an absent or unparseable created_at falls back to the supplied clock", () => {
  const fallback = new Date("2026-01-02T03:04:05Z");
  assert.equal(formatIdDate(idDateFor(undefined, fallback)), "20260102");
  assert.equal(formatIdDate(idDateFor("", fallback)), "20260102");
  assert.equal(formatIdDate(idDateFor("not a date", fallback)), "20260102");
});
