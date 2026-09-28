import test from "node:test";
import assert from "node:assert/strict";
import { renderDigest, renderQueueDigest } from "../src/digest.ts";
import type { BusEnvelope } from "../src/types.ts";

const base: BusEnvelope = {
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
  decisions_required: Array.from({ length: 17 }, (_, index) => ({
    id: `D${index + 1}`,
    question: `Keep branch ${index + 1}?`,
    gate: "GO REQUIRED" as const,
  })),
  evidence: { commands: ["git for-each-ref"], files: ["docs/reports/branch-audit.md"], urls: [] },
  next_action: { gate: "GO REQUIRED", description: "Approve batch deletion of 281 merged branches" },
  body: "x".repeat(5000),
};

test("digest carries the decision skeleton, not the body", () => {
  const digest = renderDigest(base);
  assert.match(digest, /^TASK-347-BRANCH-AUDIT/);
  assert.match(digest, /STATUS: DONE/);
  assert.match(digest, /SAFE_TO_DELETE: 281/);
  assert.match(digest, /FOUNDER_DECISIONS_REQUIRED: 17/);
  assert.match(digest, /NEXT: \[GO REQUIRED\]/);
  assert.match(digest, /STOP_AFTER_REPORT: true/);
  assert.ok(!digest.includes("xxxxx"), "body must not leak into the digest");
});

test("digest caps the listed decisions and says how many are hidden", () => {
  const digest = renderDigest(base, { maxDecisions: 3 });
  assert.match(digest, /\+14 more/);
  assert.equal((digest.match(/\[GO REQUIRED\]/g) ?? []).length, 4); // 3 decisions + next action
});

test("digest respects the character budget", () => {
  const digest = renderDigest(base, { maxChars: 200 });
  assert.ok(digest.length <= 200, `digest was ${digest.length} chars`);
  assert.match(digest, /truncated/);
});

test("digest of a message with no decisions still states zero", () => {
  const digest = renderDigest({ ...base, decisions_required: undefined, counters: undefined });
  assert.match(digest, /FOUNDER_DECISIONS_REQUIRED: 0/);
});

test("queue digest aggregates pending decisions", () => {
  const queue = renderQueueDigest([base, { ...base, id: "MSG-20260918-002-x", decisions_required: undefined }]);
  assert.match(queue, /BUS: 2 messages, FOUNDER_DECISIONS_REQUIRED: 17/);
  assert.match(queue, /MSG-20260918-002-x {2}claude-code->sol-gpt {2}result\/done \[GO REQUIRED\]/);
});

test("empty queue is explicit", () => {
  assert.equal(renderQueueDigest([]), "BUS: empty (0 messages)");
});
