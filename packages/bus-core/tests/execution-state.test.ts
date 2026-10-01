import test from "node:test";
import assert from "node:assert/strict";
import {
  LEASE_TTL_MS,
  MAX_PERSISTENCE_ATTEMPTS,
  leaseExpired,
  leaseUntil,
  persistenceExhausted,
  planFor,
  type ExecutionRecord,
  type ExecutionState,
} from "../src/execution-state.ts";

const NOW = new Date("2026-09-21T12:00:00Z");
const ME = "runner@host/boot-1/100";
const OTHER = "runner@host/boot-2/200";

function record(state: ExecutionState, overrides: Partial<ExecutionRecord> = {}): ExecutionRecord {
  return {
    task_id: "TASK-20260921-001-x",
    state,
    owner: ME,
    lease_expires_at: leaseUntil(NOW),
    persistence_attempts: 0,
    updated_at: NOW.toISOString(),
    ...overrides,
  };
}

const expired = { lease_expires_at: new Date(NOW.getTime() - 1).toISOString() };

test("a lease expires on time, and an unreadable one counts as expired", () => {
  assert.equal(leaseExpired(record("CLAIMED"), NOW), false);
  assert.equal(leaseExpired(record("CLAIMED"), new Date(NOW.getTime() + LEASE_TTL_MS + 1)), true);
  assert.equal(leaseExpired(record("CLAIMED", { lease_expires_at: "not a date" }), NOW), true);
});

test("no record: an idempotent capability may run, a non-idempotent one may not", () => {
  assert.equal(planFor(undefined, { now: NOW, owner: ME, idempotent: true }).action, "execute");

  const refused = planFor(undefined, { now: NOW, owner: ME, idempotent: false });
  assert.equal(refused.action, "needs_founder");
  assert.match(refused.reason, /a repeat cannot be ruled out/);
});

test("an unmarked capability is treated as not idempotent", () => {
  assert.equal(planFor(undefined, { now: NOW, owner: ME }).action, "needs_founder");
});

test("EXECUTED resumes persistence and never re-executes", () => {
  for (const state of ["EXECUTED", "RESULT_POSTED"] as const) {
    const plan = planFor(record(state, { ...expired, reply: "BUS ALIVE", idempotent: true }), {
      now: NOW,
      owner: OTHER,
      idempotent: true,
    });
    assert.equal(plan.action, "resume_persistence", `${state} must not re-execute`);
  }
});

test("EXECUTED stays resume_persistence even for an idempotent capability", () => {
  // I1 is about persistence failing, not about whether a repeat would be safe.
  const plan = planFor(record("EXECUTED", { reply: "BUS ALIVE" }), { now: NOW, owner: ME, idempotent: true });
  assert.equal(plan.action, "resume_persistence");
});

test("an interrupted EXECUTING is UNKNOWN: idempotent retries, the rest waits for the founder", () => {
  const retry = planFor(record("EXECUTING", expired), { now: NOW, owner: ME, idempotent: true });
  assert.equal(retry.action, "execute");

  const stop = planFor(record("EXECUTING", expired), { now: NOW, owner: ME, idempotent: false });
  assert.equal(stop.action, "needs_founder");
  assert.equal(stop.code, "execution_unknown");
});

test("a live lease held by another runner is left alone", () => {
  for (const state of ["CLAIMED", "EXECUTING", "EXECUTED"] as const) {
    const plan = planFor(record(state, { owner: OTHER }), { now: NOW, owner: ME, idempotent: true });
    assert.equal(plan.action, "skip", `${state} under a live foreign lease`);
    assert.equal(plan.code, "lease_held");
  }
});

test("an expired CLAIMED restarts — nothing had run yet", () => {
  const plan = planFor(record("CLAIMED", { ...expired, owner: OTHER }), { now: NOW, owner: ME, idempotent: true });
  assert.equal(plan.action, "execute");
});

test("terminal states are skipped, each with its own reason", () => {
  const done = planFor(record("DONE", { result_id: "MSG-20260921-001-r" }), { now: NOW, owner: ME, idempotent: true });
  assert.equal(done.action, "skip");
  assert.match(done.reason, /MSG-20260921-001-r/);

  const founder = planFor(record("NEEDS_FOUNDER", { failure: "execution_unknown" }), { now: NOW, owner: ME });
  assert.equal(founder.action, "skip");
  assert.equal(founder.code, "needs_founder");

  const failed = planFor(record("FAILED_PERSISTENT", { failure: "github 500" }), { now: NOW, owner: ME, idempotent: true });
  assert.equal(failed.action, "skip");
  assert.equal(failed.code, "failed_persistent");
  assert.match(failed.reason, /github 500/);
});

test("a spent persistence budget stops the automatic retry, it does not loop", () => {
  const plan = planFor(
    record("EXECUTED", { ...expired, reply: "BUS ALIVE", persistence_attempts: MAX_PERSISTENCE_ATTEMPTS }),
    { now: NOW, owner: ME, idempotent: true },
  );
  assert.equal(plan.action, "skip");
  assert.equal(plan.code, "failed_persistent");

  assert.equal(persistenceExhausted({ persistence_attempts: MAX_PERSISTENCE_ATTEMPTS - 1 }), false);
  assert.equal(persistenceExhausted({ persistence_attempts: MAX_PERSISTENCE_ATTEMPTS }), true);
});

test("the founder's parameters are what the module ships", () => {
  assert.equal(LEASE_TTL_MS, 120_000);
  assert.equal(MAX_PERSISTENCE_ATTEMPTS, 2);
});
