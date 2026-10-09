import assert from "node:assert/strict";
import { test } from "node:test";
import { RunBudget } from "./budget.js";
import { hashOf } from "./canonical.js";
import {
  approveExperiment,
  blockExperiment,
  decideExperiment,
  ExperimentLedger,
  proposeExperiment,
  recordResult,
  resultSeal,
  startExperiment,
  type Approval,
  type ExperimentSpec,
  type ProposalInput,
} from "./experiment.js";
import { AgentError } from "./types.js";

const APPROVAL: Approval = { approval_id: "ap-1", approved_by: "founder", approved_at: "2026-10-02T09:00:00.000Z" };

function codeOf(fn: () => unknown): string | null {
  try {
    fn();
    return null;
  } catch (err) {
    return err instanceof AgentError ? err.code : "OTHER";
  }
}

const proposal = (over: Partial<ProposalInput> = {}): ProposalInput => ({
  hypothesis: "A reorder reminder at day 45 raises the 90 day second purchase rate",
  control: "no reminder",
  treatment: "reminder at day 45",
  audience: { description: "single-order customers, 91-180 days", size: 2000, opportunity_id: "opp_test" },
  primary_metric: "second_purchase_rate_90d",
  secondary_metrics: ["orders_per_recipient"],
  success_threshold: { metric: "second_purchase_rate_90d", min_difference: 0.03 },
  stop_conditions: [
    { metric: "second_purchase_rate_90d", direction: "below", value: -0.05, description: "treatment is worse by more than 5 points" },
  ],
  allocation: { control: 0.5, treatment: 0.5 },
  duration_days: 30,
  min_sample_per_arm: 600,
  ...over,
});

const proposed = (over: Partial<ProposalInput> = {}) => proposeExperiment(proposal(over));
const approved = (over: Partial<ProposalInput> = {}) => approveExperiment(proposed(over), APPROVAL);
const running = (over: Partial<ProposalInput> = {}) => startExperiment(approved(over));

const SECONDARY_OK = { orders_per_recipient: { control: { n: 700, sum: 70, sum_sq: 90 }, treatment: { n: 700, sum: 80, sum_sq: 100 } } };
const arms = (n: number, c: number, t: number) => ({
  control: { n, successes: c },
  treatment: { n, successes: t },
  secondary: SECONDARY_OK,
});
const full = (over: Partial<ProposalInput>, r: ReturnType<typeof arms>) => decideExperiment(recordResult(running(over), r));

test("a proposal is PROPOSED, deterministic and carries a pre-registered plan", () => {
  const a = proposed();
  assert.equal(a.state, "PROPOSED");
  assert.equal(a.approval, null);
  assert.equal(a.lock_hash, null);
  assert.equal(a.experiment_id, proposed().experiment_id);
  assert.match(a.experiment_id, /^exp_[0-9a-f]{16}$/);
  assert.notEqual(a.experiment_id, proposed({ treatment: "reminder at day 30" }).experiment_id);
  assert.equal(a.planned_power, "ADEQUATE_POSSIBLE");
  assert.equal(proposed({ audience: { description: "small", size: 800 } }).planned_power, "INDICATIVE_ONLY");
});

test("a proposal without a success threshold is refused (no success without a pre-set bar)", () => {
  assert.equal(codeOf(() => proposeExperiment(proposal({ success_threshold: undefined }))), "THRESHOLD_REQUIRED");
  assert.equal(codeOf(() => proposeExperiment(proposal({ success_threshold: { metric: "second_purchase_rate_90d", min_difference: Number.NaN } }))), "THRESHOLD_REQUIRED");
  assert.equal(codeOf(() => proposeExperiment(proposal({ success_threshold: { metric: "orders_per_recipient", min_difference: 0.1 } }))), "INVALID_INPUT");
});

test("an unknown KPI, a repeated primary metric, missing stop conditions and a missing sample plan are refused", () => {
  assert.equal(codeOf(() => proposeExperiment(proposal({ primary_metric: "open_rate", success_threshold: { metric: "open_rate", min_difference: 0.1 } }))), "UNKNOWN_KPI");
  assert.equal(codeOf(() => proposeExperiment(proposal({ secondary_metrics: ["second_purchase_rate_90d"] }))), "INVALID_INPUT");
  assert.equal(codeOf(() => proposeExperiment(proposal({ stop_conditions: [] }))), "STOP_CONDITION_REQUIRED");
  assert.equal(codeOf(() => proposeExperiment(proposal({ min_sample_per_arm: undefined }))), "SAMPLE_PLAN_REQUIRED");
  assert.equal(codeOf(() => proposeExperiment(proposal({ allocation: { control: 0.9, treatment: 0.2 } }))), "ALLOCATION_INVALID");
  assert.equal(codeOf(() => proposeExperiment(proposal({ audience: { description: "x", size: 0 } }))), "INVALID_INPUT");
  assert.equal(codeOf(() => proposeExperiment(proposal({ duration_days: 0 }))), "INVALID_INPUT");
  assert.equal(codeOf(() => proposeExperiment(proposal({ hypothesis: "  " }))), "INVALID_INPUT");
});

test("the call budget applies to proposals", () => {
  const budget = new RunBudget({ maxRows: 1, maxCalls: 1, maxRetries: 0, maxLlmCalls: 0 });
  proposeExperiment(proposal(), budget);
  assert.equal(codeOf(() => proposeExperiment(proposal(), budget)), "BUDGET_EXCEEDED");
});

test("approval needs a human approval object", () => {
  const p = proposed();
  assert.equal(codeOf(() => approveExperiment(p, undefined)), "APPROVAL_REQUIRED");
  assert.equal(codeOf(() => approveExperiment(p, { ...APPROVAL, approval_id: "" })), "APPROVAL_REQUIRED");
  assert.equal(codeOf(() => approveExperiment(p, { ...APPROVAL, approved_by: " " })), "APPROVAL_REQUIRED");
  assert.equal(codeOf(() => approveExperiment(p, { ...APPROVAL, approved_at: "soon" })), "APPROVAL_REQUIRED");
  const a = approveExperiment(p, APPROVAL);
  assert.equal(a.state, "APPROVED");
  assert.deepEqual(a.approval, APPROVAL);
  assert.ok(a.lock_hash);
  assert.equal(p.state, "PROPOSED");
});

test("states cannot be skipped and final states cannot move", () => {
  assert.equal(codeOf(() => startExperiment(proposed())), "INVALID_TRANSITION");
  assert.equal(codeOf(() => recordResult(approved(), arms(700, 77, 116))), "INVALID_TRANSITION");
  assert.equal(codeOf(() => decideExperiment(running())), "INVALID_TRANSITION");
  const kept = full({}, arms(700, 77, 116));
  assert.equal(kept.state, "KEEP");
  assert.equal(codeOf(() => blockExperiment(kept, "late")), "INVALID_TRANSITION");
  assert.equal(codeOf(() => startExperiment(kept)), "INVALID_TRANSITION");
});

test("after approval the primary metric, threshold, stop conditions, allocation and sample plan are locked", () => {
  const tamper = (mutate: (s: ExperimentSpec) => void) => {
    const s = approved();
    mutate(s);
    return s;
  };
  assert.equal(codeOf(() => startExperiment(tamper((s) => { s.primary_metric = "net_revenue_per_recipient"; }))), "KPI_LOCKED");
  assert.equal(codeOf(() => startExperiment(tamper((s) => { s.success_threshold.min_difference = 0.001; }))), "KPI_LOCKED");
  assert.equal(codeOf(() => startExperiment(tamper((s) => { s.stop_conditions = []; }))), "KPI_LOCKED");
  assert.equal(codeOf(() => startExperiment(tamper((s) => { s.allocation = { control: 0.2, treatment: 0.8 }; }))), "KPI_LOCKED");
  assert.equal(codeOf(() => startExperiment(tamper((s) => { s.min_sample_per_arm = 10; }))), "KPI_LOCKED");

  const run = running();
  run.success_threshold.min_difference = 0.0001;
  assert.equal(codeOf(() => recordResult(run, arms(700, 77, 116))), "KPI_LOCKED");

  const complete = recordResult(running(), arms(700, 77, 116));
  complete.primary_metric = "scan_rate";
  assert.equal(codeOf(() => decideExperiment(complete)), "KPI_LOCKED");
});

test("an adequate sample that meets the pre-set threshold is KEEP", () => {
  const e = full({}, arms(700, 77, 116));
  assert.equal(e.state, "KEEP");
  assert.equal(e.decision?.reason, "THRESHOLD_MET_ADEQUATE_SAMPLE");
  assert.equal(e.result?.sample_class, "ADEQUATE");
  assert.ok((e.result?.estimate.ci95_low ?? 0) > 0);
});

test("a clearly negative result is REJECT and the negative number stays in the record", () => {
  const e = full({}, arms(700, 77, 70));
  assert.equal(e.state, "REJECT");
  assert.equal(e.decision?.reason, "CLEARLY_BELOW_THRESHOLD");
  assert.ok((e.result?.estimate.difference ?? 0) < 0);
});

test("an adequate sample whose interval spans the threshold is ITERATE, not KEEP", () => {
  const e = full({ success_threshold: { metric: "second_purchase_rate_90d", min_difference: 0.05 } }, arms(700, 77, 102));
  assert.equal(e.state, "ITERATE");
  assert.equal(e.decision?.reason, "INCONCLUSIVE");
});

test("a small sample is INDICATIVE and can never be KEEP, however large the effect", () => {
  const e = full({}, arms(50, 5, 20));
  assert.equal(e.result?.sample_class, "INDICATIVE");
  assert.equal(e.state, "ITERATE");
  assert.equal(e.decision?.reason, "INDICATIVE_SAMPLE");
  assert.ok((e.result?.estimate.difference ?? 0) > 0.2);
});

test("a stop condition rejects even an indicative sample, and the sample class is still recorded", () => {
  const e = full({}, arms(50, 25, 10));
  assert.equal(e.state, "REJECT");
  assert.equal(e.decision?.reason, "STOP_CONDITION");
  assert.equal(e.result?.sample_class, "INDICATIVE");
  assert.ok(e.result?.stop_breached);
});

test("a stop condition on a secondary metric also stops the experiment", () => {
  const spec = {
    stop_conditions: [{ metric: "orders_per_recipient", direction: "below" as const, value: 0, description: "fewer orders per recipient" }],
  };
  const bad = {
    ...arms(700, 77, 116),
    secondary: { orders_per_recipient: { control: { n: 700, sum: 100, sum_sq: 130 }, treatment: { n: 700, sum: 60, sum_sq: 80 } } },
  };
  const e = full(spec, bad);
  assert.equal(e.state, "REJECT");
  assert.equal(e.decision?.reason, "STOP_CONDITION");
});

test("missing secondary data is refused, not skipped", () => {
  const r = { control: { n: 700, successes: 77 }, treatment: { n: 700, successes: 116 } };
  assert.equal(codeOf(() => recordResult(running(), r)), "MISSING_DATA");
});

test("functions never mutate their input", () => {
  const p = proposed();
  const before = JSON.stringify(p);
  approveExperiment(p, APPROVAL);
  assert.equal(JSON.stringify(p), before);
  const r = running();
  const rBefore = JSON.stringify(r);
  recordResult(r, arms(700, 77, 116));
  assert.equal(JSON.stringify(r), rBefore);
});

test("blocking needs a reason and works from any non-final state", () => {
  assert.equal(blockExperiment(proposed(), "source gone").state, "BLOCKED");
  assert.equal(blockExperiment(running(), "source gone").decision?.decision, "BLOCKED");
  assert.equal(codeOf(() => blockExperiment(proposed(), " ")), "INVALID_INPUT");
});

test("the ledger refuses duplicates, illegal moves and any change to a recorded result", () => {
  const ledger = new ExperimentLedger();
  const p = proposed();
  ledger.add(p);
  assert.equal(codeOf(() => ledger.add(p)), "DUPLICATE_EXPERIMENT");

  const a = approveExperiment(p, APPROVAL);
  ledger.update(a);
  assert.equal(codeOf(() => ledger.update({ ...a, state: "KEEP" })), "INVALID_TRANSITION");

  const complete = recordResult(startExperiment(a), arms(700, 77, 70));
  ledger.update(startExperiment(a));
  ledger.update(complete);
  const decided = decideExperiment(complete);
  ledger.update(decided);

  assert.equal(codeOf(() => ledger.update({ ...decided, result: null })), "RESULT_IMMUTABLE");
  const altered = structuredClone(decided);
  altered.result!.estimate.difference = 0.5;
  assert.equal(codeOf(() => ledger.update(altered)), "RESULT_IMMUTABLE");
  assert.equal(ledger.get(p.experiment_id)?.decision?.decision, "REJECT");
  assert.ok((ledger.get(p.experiment_id)?.result?.estimate.difference ?? 0) < 0);
});

test("the ledger exposes no delete and returns copies", () => {
  const ledger = new ExperimentLedger();
  const p = proposed();
  ledger.add(p);
  const names = Object.getOwnPropertyNames(Object.getPrototypeOf(ledger));
  assert.equal(names.some((n) => /delete|remove|clear|purge/i.test(n)), false);
  const copy = ledger.get(p.experiment_id)!;
  copy.hypothesis = "tampered";
  assert.notEqual(ledger.get(p.experiment_id)!.hypothesis, "tampered");
  assert.equal(ledger.list().length, 1);
  assert.equal(codeOf(() => ledger.update(proposed({ treatment: "other" }))), "INVALID_INPUT");
});

test("meeting the threshold with an interval that includes zero is not KEEP", () => {
  const e = full({ success_threshold: { metric: "second_purchase_rate_90d", min_difference: 0.01 } }, arms(700, 77, 85));
  assert.ok((e.result?.estimate.difference ?? 0) >= 0.01);
  assert.ok((e.result?.estimate.ci95_low ?? 1) <= 0);
  assert.equal(e.state, "ITERATE");
});

// ── P11 findings ──────────────────────────────────────────────────────────────────────────────

test("F3: a plan below the adequate-sample floor is refused, so INDICATIVE cannot be planned away", () => {
  assert.equal(codeOf(() => proposeExperiment(proposal({ min_sample_per_arm: 2 }))), "SAMPLE_PLAN_TOO_SMALL");
  assert.equal(codeOf(() => proposeExperiment(proposal({ min_sample_per_arm: 99 }))), "SAMPLE_PLAN_TOO_SMALL");
  assert.doesNotThrow(() => proposeExperiment(proposal({ min_sample_per_arm: 100 })));
  const tiny = full({ audience: { description: "large", size: 100_000 }, min_sample_per_arm: 100 }, arms(60, 3, 30));
  assert.notEqual(tiny.state, "KEEP");
  assert.equal(tiny.decision?.reason, "INDICATIVE_SAMPLE");
});

test("F4: a decision recomputes the sample class and refuses a tampered result", () => {
  const complete = () => recordResult(running(), arms(300, 30, 90));
  assert.equal(complete().result?.sample_class, "INDICATIVE");
  const tamper = (mutate: (s: ExperimentSpec) => void) => {
    const s = complete();
    mutate(s);
    return s;
  };
  assert.equal(codeOf(() => decideExperiment(tamper((s) => { (s.result as NonNullable<ExperimentSpec["result"]>).sample_class = "ADEQUATE"; }))), "RESULT_IMMUTABLE");
  assert.equal(codeOf(() => decideExperiment(tamper((s) => { (s.result as NonNullable<ExperimentSpec["result"]>).n_control = 5000; }))), "RESULT_IMMUTABLE");
  assert.equal(codeOf(() => decideExperiment(tamper((s) => { (s.result as NonNullable<ExperimentSpec["result"]>).stop_breached = { ...s.stop_conditions[0] }; }))), "RESULT_IMMUTABLE");
  assert.equal(codeOf(() => decideExperiment(tamper((s) => { (s.result as NonNullable<ExperimentSpec["result"]>).estimate.ci95_low = 0.5; }))), "RESULT_IMMUTABLE");
  assert.equal(codeOf(() => decideExperiment(tamper((s) => { s.result_hash = null; }))), "RESULT_IMMUTABLE");
  // a forger who also re-seals the tampered result is still caught: the class follows from the counts and the plan
  const resealed = tamper((s) => {
    (s.result as NonNullable<ExperimentSpec["result"]>).sample_class = "ADEQUATE";
    s.result_hash = resultSeal(s);
  });
  assert.equal(codeOf(() => decideExperiment(resealed)), "RESULT_IMMUTABLE");
  // and the honest path still works, with the class derived from the counts
  assert.equal(decideExperiment(complete()).decision?.reason, "INDICATIVE_SAMPLE");
});

test("F5: the ledger refuses to change the plan, remove the approval or swap the lock of an approved experiment", () => {
  const ledger = new ExperimentLedger();
  const a = approved();
  ledger.add(proposed());
  ledger.update(a);
  const attempt = (mutate: (s: ExperimentSpec) => void) => {
    const s = startExperiment(a);
    mutate(s);
    return codeOf(() => ledger.update(s));
  };
  assert.equal(attempt((s) => { s.success_threshold.min_difference = -100; }), "KPI_LOCKED");
  assert.equal(attempt((s) => { s.approval = null; }), "KPI_LOCKED");
  assert.equal(attempt((s) => { s.lock_hash = null; }), "KPI_LOCKED");
  assert.equal(attempt((s) => { s.lock_hash = "0".repeat(64); }), "KPI_LOCKED");
  assert.equal(attempt((s) => { s.approval = { ...(s.approval as Approval), approved_by: "someone else" }; }), "KPI_LOCKED");
  assert.equal(attempt(() => undefined), null, "an honest transition is accepted");
  assert.equal(ledger.get(a.experiment_id)?.state, "RUNNING");
});

test("F8: a stop condition direction must be below or above", () => {
  const bad = [{ metric: "second_purchase_rate_90d", direction: "sideways" as never, value: -0.05, description: "x" }];
  assert.equal(codeOf(() => proposeExperiment(proposal({ stop_conditions: bad }))), "INVALID_INPUT");
  const badValue = [{ metric: "second_purchase_rate_90d", direction: "below" as const, value: "-0.05" as never, description: "x" }];
  assert.equal(codeOf(() => proposeExperiment(proposal({ stop_conditions: badValue }))), "INVALID_INPUT");
});

test("F9: a stop condition on a metric that is neither primary nor secondary is refused at proposal, not at the end", () => {
  const stray = [{ metric: "scan_rate", direction: "below" as const, value: -0.05, description: "x" }];
  assert.equal(codeOf(() => proposeExperiment(proposal({ stop_conditions: stray }))), "INVALID_INPUT");
  assert.doesNotThrow(() =>
    proposeExperiment(proposal({ secondary_metrics: ["scan_rate"], stop_conditions: stray })),
  );
});

test("F13: the lock also covers the audience, the opportunity link and the experiment id", () => {
  const tamper = (mutate: (s: ExperimentSpec) => void) => {
    const s = approved();
    mutate(s);
    return codeOf(() => startExperiment(s));
  };
  assert.equal(tamper((s) => { s.audience.description = "everyone, including opted-out customers"; }), "KPI_LOCKED");
  assert.equal(tamper((s) => { s.audience.opportunity_id = "opp_other"; }), "KPI_LOCKED");
  assert.equal(tamper((s) => { s.audience.size = 1; }), "KPI_LOCKED");
  assert.equal(tamper((s) => { s.experiment_id = "exp_000000000000"; }), "KPI_LOCKED");
});

// ── P11 #2 findings ───────────────────────────────────────────────────────────────────────────

/** A ledger that has an honest experiment up to a COMPLETE result with an INDICATIVE sample. */
function ledgerAtComplete() {
  const ledger = new ExperimentLedger();
  const p = proposed();
  ledger.add(p);
  const a = approveExperiment(p, APPROVAL);
  ledger.update(a);
  const r = startExperiment(a);
  ledger.update(r);
  const complete = recordResult(r, arms(300, 30, 90));
  ledger.update(complete);
  return { ledger, complete };
}

test("N1: a COMPLETE experiment cannot be moved to KEEP with a decision the plan does not produce", () => {
  const { ledger, complete } = ledgerAtComplete();
  const forged = { decision: "KEEP" as const, reason: "THRESHOLD_MET_ADEQUATE_SAMPLE" as const, note: "trust me" };
  assert.equal(codeOf(() => ledger.update({ ...structuredClone(complete), state: "KEEP", decision: forged })), "RESULT_IMMUTABLE");
  assert.equal(codeOf(() => ledger.update({ ...structuredClone(complete), state: "KEEP", decision: null })), "RESULT_IMMUTABLE");
  assert.equal(ledger.get(complete.experiment_id)?.state, "COMPLETE");
  const honest = decideExperiment(complete);
  assert.equal(honest.state, "ITERATE");
  assert.equal(codeOf(() => ledger.update(honest)), null);
});

test("N1: a recorded decision cannot be overwritten, not even in a terminal state", () => {
  const { ledger, complete } = ledgerAtComplete();
  const honest = decideExperiment(complete);
  ledger.update(honest);
  const rewritten = structuredClone(honest);
  rewritten.decision = { decision: "ITERATE", reason: "INCONCLUSIVE", note: "rewritten" };
  assert.equal(codeOf(() => ledger.update(rewritten)), "RESULT_IMMUTABLE");
  assert.equal(codeOf(() => ledger.update({ ...structuredClone(honest), decision: null })), "RESULT_IMMUTABLE");
});

test("N1: a result cannot be planted before COMPLETE, and a record cannot change without a state transition", () => {
  const ledger = new ExperimentLedger();
  const p = proposed();
  ledger.add(p);
  const a = approveExperiment(p, APPROVAL);
  const fake = recordResult(startExperiment(a), arms(700, 77, 116)).result;
  const planted = { ...structuredClone(a), result: fake, result_hash: "0".repeat(64) };
  assert.equal(codeOf(() => ledger.update(planted)), "RESULT_IMMUTABLE");
  ledger.update(a);
  assert.equal(codeOf(() => ledger.update({ ...structuredClone(a), result: fake, result_hash: "0".repeat(64) })), "RESULT_IMMUTABLE");
  const running = startExperiment(a);
  assert.equal(codeOf(() => ledger.update({ ...structuredClone(running), result: fake, result_hash: "0".repeat(64) })), "RESULT_IMMUTABLE");
  ledger.update(running);
  assert.equal(codeOf(() => ledger.update({ ...structuredClone(running), planned_power: "INDICATIVE_ONLY" })), "KPI_LOCKED");
  assert.equal(codeOf(() => ledger.update({ ...structuredClone(running), decision: { decision: "BLOCKED", reason: "MISSING_DATA", note: "x" } })), "INVALID_TRANSITION");
  assert.equal(codeOf(() => ledger.update(structuredClone(running))), null, "an identical record is a harmless no-op");
});

test("N1: the move out of PROPOSED needs a human approval and a lock computed over this very plan", () => {
  const p = proposed();
  const a = approveExperiment(p, APPROVAL);
  const fresh = () => {
    const ledger = new ExperimentLedger();
    ledger.add(p);
    return ledger;
  };
  assert.equal(codeOf(() => fresh().update({ ...structuredClone(a), approval: null })), "APPROVAL_REQUIRED");
  assert.equal(codeOf(() => fresh().update({ ...structuredClone(a), approval: { ...APPROVAL, approved_by: " " } })), "APPROVAL_REQUIRED");
  assert.equal(codeOf(() => fresh().update({ ...structuredClone(a), lock_hash: null })), "KPI_LOCKED");
  assert.equal(codeOf(() => fresh().update({ ...structuredClone(a), lock_hash: "f".repeat(64) })), "KPI_LOCKED");
  assert.equal(codeOf(() => fresh().update({ ...structuredClone(a), allocation_salt: "salt_forged00000000" })), "KPI_LOCKED");
  assert.equal(codeOf(() => fresh().update(structuredClone(a))), null);
});

test("N1: an experiment enters the ledger only as a fresh PROPOSAL with an id that matches its plan", () => {
  const ledger = new ExperimentLedger();
  assert.equal(codeOf(() => ledger.add(approved())), "INVALID_TRANSITION");
  assert.equal(codeOf(() => ledger.add({ ...proposed(), result: null, decision: { decision: "KEEP", reason: "THRESHOLD_MET_ADEQUATE_SAMPLE", note: "x" } })), "INVALID_TRANSITION");
  assert.equal(codeOf(() => ledger.add({ ...proposed(), experiment_id: "exp_000000000000" })), "KPI_LOCKED");
  const other = proposed({ treatment: "other" });
  assert.equal(codeOf(() => ledger.add({ ...proposed(), hypothesis: "changed after the id was derived" })), "KPI_LOCKED");
  assert.equal(codeOf(() => ledger.add(other)), null);
  assert.equal(codeOf(() => ledger.update({ ...other, state: "BLOCKED", decision: { decision: "BLOCKED", reason: "MISSING_DATA", note: " " } })), "INVALID_TRANSITION");
  assert.equal(codeOf(() => ledger.update(blockExperiment(other, "source gone"))), null);
});

test("N2: a sealed result cannot be lifted from another experiment, even when both have the same plan size", () => {
  const completeA = recordResult(running(), arms(700, 77, 116));
  const completeB = recordResult(running({ treatment: "reminder at day 30" }), arms(700, 77, 116));
  const transplanted = { ...structuredClone(completeA), result: structuredClone(completeB.result), result_hash: completeB.result_hash };
  assert.equal(codeOf(() => decideExperiment(transplanted)), "RESULT_IMMUTABLE");
  assert.notEqual(completeA.result_hash, completeB.result_hash, "the seal depends on the experiment, not only on the numbers");
  assert.deepEqual(completeA.result, completeB.result, "the two results are identical, so only the experiment id tells them apart");
  assert.equal(resultSeal(completeA), completeA.result_hash);
});

test("N8: an absurd planned sample is refused", () => {
  assert.equal(codeOf(() => proposeExperiment(proposal({ min_sample_per_arm: 1e308 }))), "SAMPLE_PLAN_REQUIRED");
  assert.equal(codeOf(() => proposeExperiment(proposal({ min_sample_per_arm: 10_000_001 }))), "SAMPLE_PLAN_REQUIRED");
  assert.doesNotThrow(() => proposeExperiment(proposal({ audience: { description: "huge", size: 100_000_000 }, min_sample_per_arm: 10_000_000 })));
});

test("N1: a forger who computes a lock over a forged allocation salt is still stopped: the salt follows from the plan", () => {
  const p = proposed();
  const ledger = new ExperimentLedger();
  ledger.add(p);
  const forgedButLocked = approveExperiment({ ...structuredClone(p), allocation_salt: "salt_forged0000000" }, APPROVAL);
  assert.equal(codeOf(() => ledger.update(forgedButLocked)), "KPI_LOCKED");
});

test("N1: an experiment blocked before approval cannot carry an approval or a lock", () => {
  const p = proposed();
  const ledger = new ExperimentLedger();
  ledger.add(p);
  const blocked = blockExperiment(p, "source gone");
  assert.equal(codeOf(() => ledger.update({ ...structuredClone(blocked), approval: APPROVAL })), "KPI_LOCKED");
  assert.equal(codeOf(() => ledger.update({ ...structuredClone(blocked), lock_hash: "f".repeat(64) })), "KPI_LOCKED");
  assert.equal(codeOf(() => ledger.update(blocked)), null);
});

test("N1: the move to COMPLETE needs a sealed result whose sample class follows from the counts", () => {
  const p = proposed();
  const setup = () => {
    const ledger = new ExperimentLedger();
    ledger.add(p);
    const a = approveExperiment(p, APPROVAL);
    ledger.update(a);
    const r = startExperiment(a);
    ledger.update(r);
    return { ledger, complete: recordResult(r, arms(300, 30, 90)) };
  };
  const unsealed = setup();
  assert.equal(codeOf(() => unsealed.ledger.update({ ...structuredClone(unsealed.complete), result_hash: null })), "RESULT_IMMUTABLE");
  const edited = setup();
  const lie = structuredClone(edited.complete);
  (lie.result as NonNullable<ExperimentSpec["result"]>).sample_class = "ADEQUATE";
  assert.equal(codeOf(() => edited.ledger.update(lie)), "RESULT_IMMUTABLE", "edited without re-sealing");
  lie.result_hash = resultSeal(lie);
  assert.equal(codeOf(() => edited.ledger.update(lie)), "RESULT_IMMUTABLE", "re-sealed: the class still does not follow from the counts");
  assert.equal(codeOf(() => edited.ledger.update(edited.complete)), null);
});

test("N1: after the result is recorded its seal cannot be swapped, and no decision can appear before the result", () => {
  const { ledger, complete } = ledgerAtComplete();
  const honest = decideExperiment(complete);
  assert.equal(codeOf(() => ledger.update({ ...structuredClone(honest), result_hash: "0".repeat(64) })), "RESULT_IMMUTABLE");
  assert.equal(codeOf(() => ledger.update(honest)), null);

  const other = new ExperimentLedger();
  const p = proposed({ treatment: "reminder at day 20" });
  other.add(p);
  const a = approveExperiment(p, APPROVAL);
  assert.equal(codeOf(() => other.update({ ...structuredClone(a), decision: { decision: "KEEP", reason: "THRESHOLD_MET_ADEQUATE_SAMPLE", note: "x" } })), "INVALID_TRANSITION");
});

test("N1: a PROPOSED experiment cannot be edited in place, in particular no approval or lock can be attached without a transition", () => {
  const p = proposed();
  const ledger = new ExperimentLedger();
  ledger.add(p);
  assert.equal(codeOf(() => ledger.update({ ...structuredClone(p), approval: APPROVAL })), "INVALID_TRANSITION");
  assert.equal(codeOf(() => ledger.update({ ...structuredClone(p), lock_hash: "f".repeat(64) })), "INVALID_TRANSITION");
  assert.equal(codeOf(() => ledger.update(structuredClone(p))), null, "an identical record is a harmless no-op");
});

// ── P11 #3 findings ───────────────────────────────────────────────────────────────────────────

/** What an attacker can do: compute the id and the salt of an arbitrary plan with the public hash. */
function forge(over: Record<string, unknown>): ExperimentSpec {
  const base = proposed();
  const plan = {
    hypothesis: base.hypothesis, control: base.control, treatment: base.treatment, audience: base.audience,
    primary_metric: base.primary_metric, secondary_metrics: base.secondary_metrics, success_threshold: base.success_threshold,
    stop_conditions: base.stop_conditions, allocation: base.allocation, duration_days: base.duration_days,
    min_sample_per_arm: base.min_sample_per_arm, ...over,
  };
  const id = hashOf(plan).slice(0, 16);
  return {
    ...base, ...plan,
    experiment_id: `exp_${id}`,
    allocation_salt: `salt_${hashOf({ id, kind: "allocation" }).slice(0, 16)}`,
  } as ExperimentSpec;
}

test("N1: a record may only change state along a legal transition, and the state label is the decision's own", () => {
  const p = proposed();
  const ledger = new ExperimentLedger();
  ledger.add(p);
  assert.equal(codeOf(() => ledger.update({ ...approved(), state: "RUNNING" })), "INVALID_TRANSITION", "PROPOSED -> RUNNING skips approval");
  assert.equal(codeOf(() => ledger.update({ ...structuredClone(p), state: "COMPLETE" })), "INVALID_TRANSITION");

  const { ledger: l2, complete } = ledgerAtComplete();
  const honest = decideExperiment(complete);
  for (const label of ["KEEP", "REJECT"] as const) {
    assert.equal(codeOf(() => l2.update({ ...structuredClone(honest), state: label })), "RESULT_IMMUTABLE", `ITERATE decision under the label ${label}`);
  }
  assert.equal(codeOf(() => l2.update(honest)), null);
  for (const label of ["KEEP", "REJECT", "ITERATE", "COMPLETE", "RUNNING", "APPROVED", "PROPOSED"] as const) {
    assert.equal(codeOf(() => l2.update({ ...structuredClone(honest), state: label })), label === "ITERATE" ? null : "INVALID_TRANSITION", `from a decided experiment to ${label}`);
  }
});

test("N1: COMPLETE can be blocked, and every kind of KEEP/REJECT/ITERATE label mismatch is refused from a COMPLETE record", () => {
  const { ledger, complete } = ledgerAtComplete();
  const decision = decideExperiment(complete).decision;
  for (const label of ["KEEP", "REJECT"] as const) {
    assert.equal(codeOf(() => ledger.update({ ...structuredClone(complete), state: label, decision })), "RESULT_IMMUTABLE", label);
  }
  assert.equal(codeOf(() => ledger.update(blockExperiment(complete, "source gone"))), null);
});

test("N2: the ledger copies a record once: a getter or a proxy cannot show the checks one thing and the store another", () => {
  const p = proposed();
  const ledger = new ExperimentLedger();
  let reads = 0;
  const evil = { ...p };
  Object.defineProperty(evil, "state", { enumerable: true, get: () => (++reads === 1 ? "PROPOSED" : "COMPLETE") });
  assert.equal(codeOf(() => ledger.add(evil as ExperimentSpec)), null);
  assert.equal(ledger.get(p.experiment_id)?.state, "PROPOSED", "what was checked is what was stored");

  const a = approved();
  ledger.update(a);
  const run = startExperiment(a);
  let seen = 0;
  const sneaky = { ...run };
  Object.defineProperty(sneaky, "state", { enumerable: true, get: () => (++seen === 1 ? "RUNNING" : "KEEP") });
  assert.equal(codeOf(() => ledger.update(sneaky as ExperimentSpec)), null);
  assert.equal(ledger.get(p.experiment_id)?.state, "RUNNING");
  assert.equal(ledger.get(p.experiment_id)?.result, null);

  assert.equal(codeOf(() => ledger.update(new Proxy({ ...run }, {}) as ExperimentSpec)), "INVALID_INPUT");
  assert.equal(codeOf(() => ledger.update({ ...run, hypothesis: (() => 1) as never })), "INVALID_INPUT");
  for (const bad of [null, undefined, 5, "x"]) {
    assert.equal(codeOf(() => ledger.add(bad as never)), "INVALID_INPUT", String(bad));
    assert.equal(codeOf(() => ledger.update(bad as never)), "INVALID_INPUT", String(bad));
  }
});

test("N2: a caller's later changes to an object it handed over, or to a copy it got back, change nothing", () => {
  const p = proposed();
  const ledger = new ExperimentLedger();
  ledger.add(p);
  p.hypothesis = "changed after add";
  assert.notEqual(ledger.get(proposed().experiment_id)?.hypothesis, "changed after add");

  const a = approved();
  ledger.update(a);
  a.state = "KEEP";
  assert.equal(ledger.get(a.experiment_id)?.state, "APPROVED");

  ledger.list()[0].hypothesis = "changed through list()";
  assert.notEqual(ledger.get(a.experiment_id)?.hypothesis, "changed through list()");
  ledger.get(a.experiment_id)!.state = "KEEP";
  assert.equal(ledger.get(a.experiment_id)?.state, "APPROVED");
});

test("N3: add() applies every proposal rule to a hand-built record, even with a self-consistent id", () => {
  const cases: Array<[Record<string, unknown>, string]> = [
    [{ min_sample_per_arm: 5 }, "SAMPLE_PLAN_TOO_SMALL"],
    [{ min_sample_per_arm: 1e12 }, "SAMPLE_PLAN_REQUIRED"],
    [{ allocation: { control: 0.99, treatment: 0.99 } }, "ALLOCATION_INVALID"],
    [{ stop_conditions: [] }, "STOP_CONDITION_REQUIRED"],
    [{ primary_metric: "open_rate", success_threshold: { metric: "open_rate", min_difference: 0.1 } }, "UNKNOWN_KPI"],
    [{ audience: { description: "x", size: Number.NaN, opportunity_id: null } }, "INVALID_INPUT"],
    [{ duration_days: 1e9 }, "INVALID_INPUT"],
    [{ hypothesis: "  untrimmed  " }, "KPI_LOCKED"],
  ];
  for (const [over, code] of cases) {
    assert.equal(codeOf(() => new ExperimentLedger().add(forge(over))), code, JSON.stringify(over).slice(0, 60));
  }
  assert.equal(codeOf(() => new ExperimentLedger().add(forge({}))), null, "an honest record built the same way is accepted");
});

test("N3: add() refuses a record with missing, unknown or malformed parts as INVALID_INPUT, not a raw TypeError", () => {
  const ledger = () => new ExperimentLedger();
  const p = proposed();
  assert.equal(codeOf(() => ledger().add({ ...p, extra: 1 } as never)), "INVALID_INPUT");
  const { audience: _a, ...noAudience } = p;
  assert.equal(codeOf(() => ledger().add(noAudience as never)), "INVALID_INPUT");
  assert.equal(codeOf(() => ledger().add({ ...p, audience: null } as never)), "INVALID_INPUT");
  assert.ok(["INVALID_INPUT", "UNKNOWN_KPI"].includes(String(codeOf(() => ledger().add({ ...p, stop_conditions: "x" } as never)))), "an AgentError, not a raw TypeError");
  const l = ledger();
  l.add(p);
  assert.equal(codeOf(() => l.update({ ...approved(), audience: { ...p.audience, extra: 1 } } as never)), "KPI_LOCKED");
});

test("N8: an approval needs string id and approver, an ISO 8601 timestamp and no extra fields", () => {
  const p = proposed();
  for (const bad of [
    { ...APPROVAL, approved_at: "1" },
    { ...APPROVAL, approved_at: "abc 2026" },
    { ...APPROVAL, approved_at: "2026-02-30T08:00:00Z" },
    { ...APPROVAL, approved_by: 7 },
    { ...APPROVAL, approval_id: null },
    { ...APPROVAL, extra: "x" },
    { approval_id: "ap-1", approved_by: "founder" },
  ]) {
    assert.equal(codeOf(() => approveExperiment(p, bad as never)), "APPROVAL_REQUIRED", JSON.stringify(bad));
  }
  assert.doesNotThrow(() => approveExperiment(p, APPROVAL));
  const ledger = new ExperimentLedger();
  ledger.add(p);
  const forged = { ...structuredClone(approveExperiment(p, APPROVAL)), approval: { ...APPROVAL, approved_by: 7 } };
  assert.equal(codeOf(() => ledger.update(forged as never)), "APPROVAL_REQUIRED");
});

test("the id depends on every part of the plan: stop conditions, duration, opportunity link", () => {
  const base = proposed().experiment_id;
  assert.notEqual(proposed({ duration_days: 31 }).experiment_id, base);
  assert.notEqual(proposed({ audience: { description: "single-order customers, 91-180 days", size: 2000, opportunity_id: "opp_other" } }).experiment_id, base);
  assert.notEqual(
    proposed({ stop_conditions: [{ metric: "second_purchase_rate_90d", direction: "below", value: -0.1, description: "treatment is worse by more than 10 points" }] }).experiment_id,
    base,
  );
  assert.notEqual(proposed({ secondary_metrics: [] }).experiment_id, base);
});

test("planned power: adequate exactly when the SMALLER arm reaches the plan", () => {
  const power = (size: number, control: number, treatment: number, min: number) =>
    proposed({ audience: { description: "x", size }, allocation: { control, treatment }, min_sample_per_arm: min }).planned_power;
  assert.equal(power(1200, 0.5, 0.5, 600), "ADEQUATE_POSSIBLE");
  assert.equal(power(1199, 0.5, 0.5, 600), "INDICATIVE_ONLY");
  assert.equal(power(10_000, 0.9, 0.1, 2000), "INDICATIVE_ONLY", "the treatment arm is the small one");
  assert.equal(power(10_000, 0.1, 0.9, 2000), "INDICATIVE_ONLY", "and so is the control arm when it is the small one");
  assert.equal(power(10_000, 0.9, 0.1, 1000), "ADEQUATE_POSSIBLE");
});

test("a re-sealed result with a different planned sample per arm is refused: the class follows the plan", () => {
  const p = proposed();
  const ledger = new ExperimentLedger();
  ledger.add(p);
  const a = approveExperiment(p, APPROVAL);
  ledger.update(a);
  const r = startExperiment(a);
  ledger.update(r);
  const complete = recordResult(r, arms(300, 30, 90));
  const lie = structuredClone(complete);
  (lie.result as NonNullable<ExperimentSpec["result"]>).required_per_arm = 100;
  lie.result_hash = resultSeal(lie);
  assert.equal(codeOf(() => ledger.update(lie)), "RESULT_IMMUTABLE");
  assert.equal(codeOf(() => decideExperiment(lie)), "RESULT_IMMUTABLE");
});

test("N1: add() takes only a PROPOSED record, whichever other fields are clean, and each planted field alone is refused", () => {
  const p = proposed();
  const fresh = () => new ExperimentLedger();
  for (const state of ["APPROVED", "RUNNING", "COMPLETE", "KEEP", "REJECT", "ITERATE", "BLOCKED"] as const) {
    assert.equal(codeOf(() => fresh().add({ ...structuredClone(p), state })), "INVALID_TRANSITION", state);
  }
  const planted: Array<[string, Record<string, unknown>]> = [
    ["approval", { approval: APPROVAL }],
    ["lock_hash", { lock_hash: "f".repeat(64) }],
    ["result", { result: { fake: 1 } }],
    ["result_hash", { result_hash: "f".repeat(64) }],
    ["decision", { decision: { decision: "KEEP", reason: "THRESHOLD_MET_ADEQUATE_SAMPLE", note: "x" } }],
  ];
  for (const [name, over] of planted) {
    assert.equal(codeOf(() => fresh().add({ ...structuredClone(p), ...over } as never)), "INVALID_TRANSITION", name);
  }
});

test("N3: the plan's audience record carries exactly its three fields, and an id equal to the normalised plan does not excuse a non-normalised one", () => {
  const p = proposed();
  assert.equal(codeOf(() => new ExperimentLedger().add({ ...structuredClone(p), audience: { ...p.audience, extra: 1 } } as never)), "KPI_LOCKED");
  assert.equal(codeOf(() => new ExperimentLedger().add({ ...structuredClone(p), hypothesis: `  ${p.hypothesis}  ` })), "KPI_LOCKED", "same id, untrimmed text");
  assert.equal(codeOf(() => new ExperimentLedger().add({ ...structuredClone(p), secondary_metrics: [...p.secondary_metrics, ...p.secondary_metrics] })), "KPI_LOCKED", "same id, duplicated secondary metric");
});

test("N1: a BLOCKED decision has exactly decision, reason and a text note", () => {
  const p = proposed();
  const ledgerWith = () => {
    const l = new ExperimentLedger();
    l.add(p);
    return l;
  };
  const blocked = blockExperiment(p, "source gone");
  const decisions: Array<[string, unknown]> = [
    ["extra field", { ...blocked.decision, extra: 1 }],
    ["numeric note", { ...blocked.decision, note: 5 }],
    ["empty note", { ...blocked.decision, note: "  " }],
    ["other reason", { ...blocked.decision, reason: "STOP_CONDITION" }],
    ["other decision", { ...blocked.decision, decision: "KEEP" }],
    ["null", null],
  ];
  for (const [name, decision] of decisions) {
    assert.equal(codeOf(() => ledgerWith().update({ ...structuredClone(blocked), decision } as never)), "INVALID_TRANSITION", name);
  }
  assert.equal(codeOf(() => ledgerWith().update(blocked)), null);
});

// ── P11 #4 findings ───────────────────────────────────────────────────────────────────────────

test("N1/N2: only JSON-shaped data enters the ledger: cycles, BigInt, Map, Set, Date, typed arrays, undefined and NaN are INVALID_INPUT, never a raw error", () => {
  const p = proposed();
  const bad: Array<[string, (s: Record<string, any>) => void]> = [
    ["cycle in audience", (s) => { s.audience.self = s.audience; }],
    ["BigInt in audience", (s) => { s.audience.x = 1n; }],
    ["Map in a stop condition", (s) => { s.stop_conditions[0].x = new Map([["a", 1]]); }],
    ["Set", (s) => { s.audience.x = new Set([1]); }],
    ["Date", (s) => { s.audience.x = new Date(0); }],
    ["typed array", (s) => { s.audience.x = new Uint8Array(4); }],
    ["ArrayBuffer", (s) => { s.audience.x = new ArrayBuffer(4); }],
    ["undefined value", (s) => { s.audience.x = undefined; }],
    ["NaN", (s) => { s.audience.x = Number.NaN; }],
    ["Infinity", (s) => { s.success_threshold.x = Number.POSITIVE_INFINITY; }],
    ["sparse array", (s) => { s.secondary_metrics = new Array(3); }],
    ["deep nesting", (s) => { let o: any = s.audience; for (let i = 0; i < 40; i += 1) { o.n = {}; o = o.n; } }],
    ["too many nodes", (s) => { s.audience.x = Array.from({ length: 6000 }, (_, i) => i); }],
  ];
  for (const [name, mutate] of bad) {
    const rec = structuredClone(p) as Record<string, any>;
    mutate(rec);
    assert.equal(codeOf(() => new ExperimentLedger().add(rec as never)), "INVALID_INPUT", `add: ${name}`);
  }
  const ledger = new ExperimentLedger();
  ledger.add(p);
  const a = approved();
  for (const [name, mutate] of bad) {
    const rec = structuredClone(a) as Record<string, any>;
    mutate(rec);
    assert.equal(codeOf(() => ledger.update(rec as never)), "INVALID_INPUT", `update: ${name}`);
  }
  assert.equal(codeOf(() => ledger.update(a)), null, "the honest record still goes through after all the refusals");
});

test("N2: a Map swapped in after approval cannot change a locked plan, because a Map never gets in", () => {
  const p = proposed();
  const withMap = structuredClone(p) as Record<string, any>;
  withMap.stop_conditions[0].x = new Map([["a", 1]]);
  assert.equal(codeOf(() => new ExperimentLedger().add(withMap as never)), "INVALID_INPUT");
});

test("L1 gap: a decided record with the right label but a changed decision (reason or note) is refused", () => {
  const { ledger, complete } = ledgerAtComplete();
  const honest = decideExperiment(complete);
  for (const over of [{ note: "rewritten" }, { reason: "INCONCLUSIVE" }, { extra: 1 }] as const) {
    const lie = structuredClone(honest) as Record<string, any>;
    lie.decision = { ...lie.decision, ...over };
    assert.equal(codeOf(() => ledger.update(lie as never)), "RESULT_IMMUTABLE", JSON.stringify(over));
  }
  assert.equal(codeOf(() => ledger.update(honest)), null);
});

test("N3: an approval id, an approver, a text or a note made only of white space or invisible characters is blank", () => {
  const p = proposed();
  for (const blank of ["", "   ", "\u200B", "\u200D\u2060", "\u00AD", "\u180E", "\uFEFF", " \u200B \t"]) {
    assert.equal(codeOf(() => approveExperiment(p, { ...APPROVAL, approval_id: blank })), "APPROVAL_REQUIRED", `id ${JSON.stringify(blank)}`);
    assert.equal(codeOf(() => approveExperiment(p, { ...APPROVAL, approved_by: blank })), "APPROVAL_REQUIRED", `by ${JSON.stringify(blank)}`);
    assert.equal(codeOf(() => proposeExperiment(proposal({ hypothesis: blank }))), "INVALID_INPUT", `hypothesis ${JSON.stringify(blank)}`);
    assert.equal(codeOf(() => blockExperiment(p, blank)), "INVALID_INPUT", `note ${JSON.stringify(blank)}`);
  }
  const ledger = new ExperimentLedger();
  ledger.add(p);
  const blocked = blockExperiment(p, "source gone");
  assert.equal(codeOf(() => ledger.update({ ...structuredClone(blocked), decision: { ...blocked.decision, note: "\u200B" } } as never)), "INVALID_TRANSITION");
  assert.doesNotThrow(() => approveExperiment(p, { ...APPROVAL, approval_id: "ap-\u200B-1" }), "invisible characters inside a real id are not blank");
});

test("N5: a sealed result whose counts or estimates are not numbers is refused as RESULT_IMMUTABLE, not a raw TypeError", () => {
  const p = proposed();
  const setup = () => {
    const ledger = new ExperimentLedger();
    ledger.add(p);
    const a = approveExperiment(p, APPROVAL);
    ledger.update(a);
    const r = startExperiment(a);
    ledger.update(r);
    return { ledger, complete: recordResult(r, arms(700, 77, 116)) };
  };
  const shapes: Array<[string, (r: Record<string, any>) => void]> = [
    ["estimate null", (r) => { r.estimate = null; }],
    ["estimate NaN field", (r) => { r.estimate.difference = null; }],
    ["n_control string", (r) => { r.n_control = "700"; }],
    ["n_control fraction", (r) => { r.n_control = 700.5; }],
    ["n_control negative", (r) => { r.n_control = -1; }],
    ["secondary not array", (r) => { r.secondary = null; }],
    ["secondary entry broken", (r) => { r.secondary = [{ metric: 5 }]; }],
    ["stop_breached string", (r) => { r.stop_breached = "yes"; }],
    ["stop_breached direction", (r) => { r.stop_breached = { metric: "a", direction: "sideways", value: 1 }; }],
    ["primary_metric number", (r) => { r.primary_metric = 5; }],
    ["n_treatment fraction, class unchanged", (r) => { r.n_treatment = 700.5; }],
    ["n_control fraction, class unchanged", (r) => { r.n_control = 700.5; }],
    ["n_control negative with a matching class", (r) => { r.n_control = -1; r.sample_class = "INDICATIVE"; }],
    ["n_treatment negative with a matching class", (r) => { r.n_treatment = -1; r.sample_class = "INDICATIVE"; }],
    ["relative_lift text", (r) => { r.estimate.relative_lift = "x"; }],
    ["secondary relative_lift text", (r) => { r.secondary[0].estimate.relative_lift = "x"; }],
    ["secondary estimate missing field", (r) => { delete r.secondary[0].estimate.standard_error; }],
    ["required_per_arm null", (r) => { r.required_per_arm = null; }],
  ];
  for (const [name, mutate] of shapes) {
    const { ledger, complete } = setup();
    const lie = structuredClone(complete) as Record<string, any>;
    mutate(lie.result);
    lie.result_hash = resultSeal(lie as never);
    assert.equal(codeOf(() => ledger.update(lie as never)), "RESULT_IMMUTABLE", `update: ${name}`);
    assert.equal(codeOf(() => decideExperiment(lie as never)), "RESULT_IMMUTABLE", `decide: ${name}`);
  }
});

test("N6: an approval is read once: a getter cannot pass the check and be stored as something else", () => {
  const p = proposed();
  let reads = 0;
  const sneaky = {
    approved_by: "founder",
    approved_at: "2026-10-02T09:00:00.000Z",
    get approval_id() {
      reads += 1;
      return reads === 1 ? "ap-1" : "";
    },
  };
  const a = approveExperiment(p, sneaky as never);
  assert.equal(a.approval?.approval_id, "ap-1");
  assert.equal(reads, 1);
  assert.equal(codeOf(() => approveExperiment(p, { ...APPROVAL, toJSON: () => null } as never)), "APPROVAL_REQUIRED");
});

test("N8: free text and stop conditions are bounded", () => {
  assert.doesNotThrow(() => proposeExperiment(proposal({ hypothesis: "h".repeat(2000) })));
  assert.equal(codeOf(() => proposeExperiment(proposal({ hypothesis: "h".repeat(2001) }))), "INVALID_INPUT");
  const stop = { metric: "second_purchase_rate_90d", direction: "below" as const, value: -0.05, description: "d" };
  assert.doesNotThrow(() => proposeExperiment(proposal({ stop_conditions: Array.from({ length: 20 }, () => ({ ...stop })) })));
  assert.equal(codeOf(() => proposeExperiment(proposal({ stop_conditions: Array.from({ length: 21 }, () => ({ ...stop })) }))), "INVALID_INPUT");
  assert.equal(codeOf(() => proposeExperiment(proposal({ stop_conditions: [{ ...stop, description: "d".repeat(2001) }] }))), "INVALID_INPUT");
  assert.equal(codeOf(() => proposeExperiment(proposal({ stop_conditions: [{ ...stop, description: undefined as never }] }))), "INVALID_INPUT");
  assert.equal(codeOf(() => proposeExperiment(proposal({ stop_conditions: [null as never] }))), "INVALID_INPUT");
});

test("N7: the experiment id carries 64 bits of the plan hash", () => {
  assert.match(proposed().experiment_id, /^exp_[0-9a-f]{16}$/);
});

test("P11#5: hidden storage on an array, Map or typed array, never enters the ledger", () => {
  const ledger = new ExperimentLedger();
  const withProp = (mk: (a: unknown[]) => void) => {
    const p = proposed() as unknown as { stop_conditions: unknown[]; secondary_metrics: unknown[] };
    mk(p.stop_conditions);
    return p;
  };
  for (const hide of [
    (a: unknown[]) => { (a as unknown as Record<string, unknown>).m = new Map([[1, 2]]); },
    (a: unknown[]) => { (a as unknown as Record<string, unknown>).payload = new Uint8Array(10); },
    (a: unknown[]) => { (a as unknown as Record<string, unknown>).x = 1; },
  ]) {
    assert.equal(codeOf(() => ledger.add(withProp(hide) as never)), "INVALID_INPUT");
  }
  const sparse = proposed() as unknown as { stop_conditions: unknown[] };
  sparse.stop_conditions.length = 3;
  assert.equal(codeOf(() => ledger.add(sparse as never)), "INVALID_INPUT");
});

test("P11#5: look-alike blanks and oversized approval or note fields are refused", () => {
  const p = proposed();
  for (const blank of ["\u3164", "\u2800", "\u200E", "\u202A", "\u180B", "\u2061", "\u0600", "\u061C", "\uFE0F", "\u0001", "\u0085"]) {
    assert.equal(codeOf(() => approveExperiment(p, { ...APPROVAL, approved_by: blank })), "APPROVAL_REQUIRED", `by ${JSON.stringify(blank)}`);
  }
  assert.equal(codeOf(() => approveExperiment(p, { ...APPROVAL, approved_by: "x".repeat(2001) })), "APPROVAL_REQUIRED");
  assert.equal(codeOf(() => approveExperiment(p, { ...APPROVAL, approval_id: "x".repeat(2001) })), "APPROVAL_REQUIRED");
  assert.equal(codeOf(() => proposed({ audience: { description: "d", size: 10, opportunity_id: "x".repeat(2001) } })), "INVALID_INPUT");
  assert.equal(codeOf(() => proposed({ audience: { description: "d", size: 10, opportunity_id: 5 as never } })), "INVALID_INPUT");
  assert.equal(codeOf(() => approveExperiment(p, { ...APPROVAL, approved_by: "founder" })), null);
});

test("P11#6: look-alike blanks outside the first list are refused too", () => {
  const p = proposed();
  for (const blank of ["\u{E000}", "\u0378", "\uD800", "\u0300"]) {
    assert.equal(codeOf(() => approveExperiment(p, { ...APPROVAL, approved_by: blank })), "APPROVAL_REQUIRED", JSON.stringify(blank));
  }
});

test("P11#6: a field the plan schema does not know is never stored", () => {
  const withExtra = proposed({
    success_threshold: { metric: "second_purchase_rate_90d", min_difference: 0.03, junk: { deep: 1 } } as never,
    allocation: { control: 0.5, treatment: 0.5, junk: "x" } as never,
    stop_conditions: [{ metric: "second_purchase_rate_90d", direction: "below", value: -0.05, description: "d", junk: [1] } as never],
  });
  assert.deepEqual(Object.keys(withExtra.success_threshold).sort(), ["metric", "min_difference"]);
  assert.deepEqual(Object.keys(withExtra.allocation).sort(), ["control", "treatment"]);
  assert.deepEqual(Object.keys(withExtra.stop_conditions[0]).sort(), ["description", "direction", "metric", "value"]);
  const clean = proposed({
    stop_conditions: [{ metric: "second_purchase_rate_90d", direction: "below", value: -0.05, description: "d" }],
  });
  assert.equal(withExtra.experiment_id, clean.experiment_id, "an unknown field does not change the plan id");
});
