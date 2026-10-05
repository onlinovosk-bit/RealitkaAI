import assert from "node:assert/strict";
import { test } from "node:test";
import { RunBudget } from "./budget.js";
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
  assert.match(a.experiment_id, /^exp_[0-9a-f]{12}$/);
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
