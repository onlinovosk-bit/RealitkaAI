import { hashOf } from "./canonical.js";
import { RunBudget } from "./budget.js";
import { validateAllocation, type Allocation } from "./allocation.js";
import { classifySample, diffEstimate, getKpi, MIN_ADEQUATE_SAMPLE_PER_ARM, type ArmAggregate, type DiffEstimate, type SampleClass } from "./kpi.js";
import { AgentError } from "./types.js";

/**
 * ONL-EXPERIMENT. A pure state machine over an immutable specification.
 * Every function returns a new object. There is no persistence and nothing is started against
 * customers: PROPOSED is the only state an agent can create. APPROVED needs a human approval object.
 */
export type ExperimentState = "PROPOSED" | "APPROVED" | "RUNNING" | "COMPLETE" | "KEEP" | "REJECT" | "ITERATE" | "BLOCKED";

const TRANSITIONS: Readonly<Record<ExperimentState, readonly ExperimentState[]>> = {
  PROPOSED: ["APPROVED", "BLOCKED"],
  APPROVED: ["RUNNING", "BLOCKED"],
  RUNNING: ["COMPLETE", "BLOCKED"],
  COMPLETE: ["KEEP", "REJECT", "ITERATE", "BLOCKED"],
  KEEP: [],
  REJECT: [],
  ITERATE: [],
  BLOCKED: [],
};

export interface StopCondition {
  metric: string;
  direction: "below" | "above";
  value: number;
  description: string;
}

export interface Approval {
  approval_id: string;
  approved_by: string;
  approved_at: string;
}

export interface ExperimentResult {
  primary_metric: string;
  estimate: DiffEstimate;
  sample_class: SampleClass;
  n_control: number;
  n_treatment: number;
  required_per_arm: number;
  secondary: Array<{ metric: string; estimate: DiffEstimate }>;
  stop_breached: StopCondition | null;
}

export type DecisionReason =
  | "STOP_CONDITION"
  | "INDICATIVE_SAMPLE"
  | "THRESHOLD_MET_ADEQUATE_SAMPLE"
  | "CLEARLY_BELOW_THRESHOLD"
  | "INCONCLUSIVE"
  | "MISSING_DATA";

export interface ExperimentDecision {
  decision: "KEEP" | "REJECT" | "ITERATE" | "BLOCKED";
  reason: DecisionReason;
  note: string;
}

export interface ExperimentSpec {
  experiment_id: string;
  hypothesis: string;
  control: string;
  treatment: string;
  audience: { description: string; size: number; opportunity_id: string | null };
  primary_metric: string;
  secondary_metrics: string[];
  success_threshold: { metric: string; min_difference: number };
  stop_conditions: StopCondition[];
  allocation: Allocation;
  allocation_salt: string;
  duration_days: number;
  min_sample_per_arm: number;
  /** INDICATIVE_ONLY when the audience cannot reach the planned sample in both arms. Known before the experiment starts. */
  planned_power: "ADEQUATE_POSSIBLE" | "INDICATIVE_ONLY";
  state: ExperimentState;
  approval: Approval | null;
  /** Hash of everything that must not change after approval. null while PROPOSED. */
  lock_hash: string | null;
  result: ExperimentResult | null;
  /** Hash of `result` taken when it was recorded. A decision refuses a result that no longer matches it. */
  result_hash: string | null;
  decision: ExperimentDecision | null;
}

export interface ProposalInput {
  hypothesis: string;
  control: string;
  treatment: string;
  audience: { description: string; size: number; opportunity_id?: string | null };
  primary_metric: string;
  secondary_metrics?: string[];
  success_threshold?: { metric: string; min_difference: number };
  stop_conditions?: StopCondition[];
  allocation: Allocation;
  duration_days: number;
  min_sample_per_arm?: number;
}

function nonEmpty(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new AgentError("INVALID_INPUT", `${field} is required`);
  return value.trim();
}

function lockOf(spec: ExperimentSpec): string {
  return hashOf({
    experiment_id: spec.experiment_id,
    audience: spec.audience,
    hypothesis: spec.hypothesis,
    control: spec.control,
    treatment: spec.treatment,
    primary_metric: spec.primary_metric,
    secondary_metrics: spec.secondary_metrics,
    success_threshold: spec.success_threshold,
    stop_conditions: spec.stop_conditions,
    allocation: spec.allocation,
    allocation_salt: spec.allocation_salt,
    duration_days: spec.duration_days,
    min_sample_per_arm: spec.min_sample_per_arm,
  });
}

/** Detects any change to the pre-registered plan after approval. */
export function verifyLock(spec: ExperimentSpec): void {
  if (spec.lock_hash === null) return;
  if (lockOf(spec) !== spec.lock_hash) {
    throw new AgentError("KPI_LOCKED", "the pre-registered plan changed after approval (metric, threshold, stop conditions, allocation or sample plan)");
  }
}

function move(spec: ExperimentSpec, to: ExperimentState): ExperimentSpec {
  if (!TRANSITIONS[spec.state].includes(to)) {
    throw new AgentError("INVALID_TRANSITION", `${spec.state} -> ${to} is not allowed`);
  }
  return { ...structuredClone(spec), state: to };
}

export function proposeExperiment(input: ProposalInput, budget: RunBudget = new RunBudget()): ExperimentSpec {
  budget.spendCall();
  const hypothesis = nonEmpty(input.hypothesis, "hypothesis");
  const control = nonEmpty(input.control, "control");
  const treatment = nonEmpty(input.treatment, "treatment");
  nonEmpty(input.audience?.description, "audience.description");
  if (!Number.isInteger(input.audience.size) || input.audience.size <= 0) {
    throw new AgentError("INVALID_INPUT", "audience.size must be a positive integer");
  }
  getKpi(input.primary_metric);
  const secondary = [...new Set(input.secondary_metrics ?? [])];
  for (const m of secondary) getKpi(m);
  if (secondary.includes(input.primary_metric)) {
    throw new AgentError("INVALID_INPUT", "the primary metric cannot also be a secondary metric");
  }
  if (!input.success_threshold || !Number.isFinite(input.success_threshold.min_difference)) {
    throw new AgentError("THRESHOLD_REQUIRED", "a success threshold must be defined before the experiment starts");
  }
  if (input.success_threshold.metric !== input.primary_metric) {
    throw new AgentError("INVALID_INPUT", "the success threshold must be defined on the primary metric");
  }
  if (!input.stop_conditions || input.stop_conditions.length === 0) {
    throw new AgentError("STOP_CONDITION_REQUIRED", "at least one stop condition is required");
  }
  const observed = new Set([input.primary_metric, ...secondary]);
  for (const s of input.stop_conditions) {
    getKpi(s.metric);
    if (s.direction !== "below" && s.direction !== "above") {
      throw new AgentError("INVALID_INPUT", 'stop condition direction must be "below" or "above"');
    }
    if (typeof s.value !== "number" || !Number.isFinite(s.value)) throw new AgentError("INVALID_INPUT", "stop condition value must be a number");
    if (!observed.has(s.metric)) {
      throw new AgentError("INVALID_INPUT", `stop condition metric ${s.metric} is neither the primary nor a secondary metric, so it could never be evaluated`);
    }
  }
  validateAllocation(input.allocation);
  if (!Number.isInteger(input.duration_days) || input.duration_days <= 0 || input.duration_days > 365) {
    throw new AgentError("INVALID_INPUT", "duration_days must be an integer in 1..365");
  }
  if (!Number.isInteger(input.min_sample_per_arm) || (input.min_sample_per_arm as number) <= 0) {
    throw new AgentError("SAMPLE_PLAN_REQUIRED", "min_sample_per_arm must be planned as a positive integer");
  }
  if ((input.min_sample_per_arm as number) < MIN_ADEQUATE_SAMPLE_PER_ARM) {
    throw new AgentError(
      "SAMPLE_PLAN_TOO_SMALL",
      `min_sample_per_arm must be at least ${MIN_ADEQUATE_SAMPLE_PER_ARM}: a smaller plan could never be classified adequate`,
    );
  }
  const min = input.min_sample_per_arm as number;

  const core = {
    hypothesis,
    control,
    treatment,
    audience: { description: input.audience.description.trim(), size: input.audience.size, opportunity_id: input.audience.opportunity_id ?? null },
    primary_metric: input.primary_metric,
    secondary_metrics: secondary,
    success_threshold: { ...input.success_threshold },
    stop_conditions: input.stop_conditions.map((s) => ({ ...s })),
    allocation: { ...input.allocation },
    duration_days: input.duration_days,
    min_sample_per_arm: min,
  };
  const id = hashOf(core).slice(0, 12);
  const smallestArm = Math.floor(core.audience.size * Math.min(input.allocation.control, input.allocation.treatment));
  return {
    experiment_id: `exp_${id}`,
    ...core,
    allocation_salt: `salt_${hashOf({ id, kind: "allocation" }).slice(0, 16)}`,
    planned_power: smallestArm >= min ? "ADEQUATE_POSSIBLE" : "INDICATIVE_ONLY",
    state: "PROPOSED",
    approval: null,
    lock_hash: null,
    result: null,
    result_hash: null,
    decision: null,
  };
}

/** Only a human approval object moves PROPOSED to APPROVED. No agent action exposes this function. */
export function approveExperiment(spec: ExperimentSpec, approval: Approval | undefined): ExperimentSpec {
  if (!approval || !approval.approval_id?.trim() || !approval.approved_by?.trim() || !Number.isFinite(Date.parse(approval.approved_at))) {
    throw new AgentError("APPROVAL_REQUIRED", "a human approval (id, approver, timestamp) is required");
  }
  const next = move(spec, "APPROVED");
  next.approval = { ...approval };
  next.lock_hash = lockOf(next);
  return next;
}

export function startExperiment(spec: ExperimentSpec): ExperimentSpec {
  verifyLock(spec);
  return move(spec, "RUNNING");
}

export interface ResultInput {
  control: ArmAggregate;
  treatment: ArmAggregate;
  secondary?: Record<string, { control: ArmAggregate; treatment: ArmAggregate }>;
}

function breached(stop: StopCondition, estimate: DiffEstimate): boolean {
  return stop.direction === "below" ? estimate.difference < stop.value : estimate.difference > stop.value;
}

/** RUNNING to COMPLETE. The primary metric comes from the spec, never from the caller. */
export function recordResult(spec: ExperimentSpec, input: ResultInput): ExperimentSpec {
  verifyLock(spec);
  const next = move(spec, "COMPLETE");
  const primary = getKpi(spec.primary_metric);
  const estimate = diffEstimate(primary, input.control, input.treatment);
  const secondary = spec.secondary_metrics.map((metric) => {
    const arms = input.secondary?.[metric];
    if (!arms) throw new AgentError("MISSING_DATA", `secondary metric ${metric} has no data`);
    return { metric, estimate: diffEstimate(getKpi(metric), arms.control, arms.treatment) };
  });
  let stop: StopCondition | null = null;
  for (const s of spec.stop_conditions) {
    const est = s.metric === spec.primary_metric ? estimate : secondary.find((x) => x.metric === s.metric)?.estimate;
    if (!est) throw new AgentError("MISSING_DATA", `stop condition metric ${s.metric} has no data`);
    if (breached(s, est)) {
      stop = s;
      break;
    }
  }
  next.result = {
    primary_metric: spec.primary_metric,
    estimate,
    sample_class: classifySample(input.control.n, input.treatment.n, spec.min_sample_per_arm),
    n_control: input.control.n,
    n_treatment: input.treatment.n,
    required_per_arm: spec.min_sample_per_arm,
    secondary,
    stop_breached: stop,
  };
  next.result_hash = hashOf(next.result);
  return next;
}

/** COMPLETE to KEEP, REJECT, ITERATE or BLOCKED. Fully determined by the pre-registered plan. */
export function decideExperiment(spec: ExperimentSpec): ExperimentSpec {
  verifyLock(spec);
  if (spec.state !== "COMPLETE" || !spec.result) {
    throw new AgentError("INVALID_TRANSITION", "a decision needs a COMPLETE experiment with a recorded result");
  }
  const r = spec.result;
  if (spec.result_hash === null || hashOf(r) !== spec.result_hash) {
    throw new AgentError("RESULT_IMMUTABLE", "the recorded result does not match the hash taken when it was recorded");
  }
  // The sample class is recomputed from the counts and the plan. A stored class is never trusted.
  const sampleClass = classifySample(r.n_control, r.n_treatment, spec.min_sample_per_arm);
  if (r.required_per_arm !== spec.min_sample_per_arm || r.sample_class !== sampleClass) {
    throw new AgentError("RESULT_IMMUTABLE", "the recorded sample class does not follow from the sample counts and the pre-registered plan");
  }
  let decision: ExperimentDecision;
  if (r.stop_breached) {
    decision = { decision: "REJECT", reason: "STOP_CONDITION", note: `Stop condition on ${r.stop_breached.metric} was breached: ${r.stop_breached.description}` };
  } else if (sampleClass === "INDICATIVE") {
    decision = {
      decision: "ITERATE",
      reason: "INDICATIVE_SAMPLE",
      note: `Sample ${r.n_control}/${r.n_treatment} is below the planned ${r.required_per_arm} per arm. The result is indicative, not conclusive.`,
    };
  } else if (r.estimate.difference >= spec.success_threshold.min_difference && r.estimate.ci95_low > 0) {
    decision = { decision: "KEEP", reason: "THRESHOLD_MET_ADEQUATE_SAMPLE", note: "Pre-registered threshold met with an adequate sample." };
  } else if (r.estimate.ci95_high < spec.success_threshold.min_difference) {
    decision = { decision: "REJECT", reason: "CLEARLY_BELOW_THRESHOLD", note: "The whole 95 % interval lies below the pre-registered threshold." };
  } else {
    decision = { decision: "ITERATE", reason: "INCONCLUSIVE", note: "Adequate sample, but the interval spans the threshold." };
  }
  const next = move(spec, decision.decision);
  next.decision = decision;
  return next;
}

/** Block any non-final experiment, for example when its data source disappears. */
export function blockExperiment(spec: ExperimentSpec, note: string): ExperimentSpec {
  const next = move(spec, "BLOCKED");
  next.decision = { decision: "BLOCKED", reason: "MISSING_DATA", note: nonEmpty(note, "note") };
  return next;
}

/** In-memory ledger. There is no delete and a recorded result can never be removed. */
export class ExperimentLedger {
  private readonly items = new Map<string, ExperimentSpec>();

  add(spec: ExperimentSpec): void {
    if (this.items.has(spec.experiment_id)) {
      throw new AgentError("DUPLICATE_EXPERIMENT", `experiment ${spec.experiment_id} already exists`);
    }
    this.items.set(spec.experiment_id, structuredClone(spec));
  }

  update(spec: ExperimentSpec): void {
    const stored = this.items.get(spec.experiment_id);
    if (!stored) throw new AgentError("INVALID_INPUT", `experiment ${spec.experiment_id} is unknown`);
    if (stored.state !== spec.state && !TRANSITIONS[stored.state].includes(spec.state)) {
      throw new AgentError("INVALID_TRANSITION", `${stored.state} -> ${spec.state} is not allowed`);
    }
    if (stored.lock_hash !== null) {
      // After approval the plan, the approval and the allocation salt are frozen for good.
      if (spec.lock_hash !== stored.lock_hash || hashOf(spec.approval) !== hashOf(stored.approval)) {
        throw new AgentError("KPI_LOCKED", "the approval or the lock of an approved experiment cannot be changed or removed");
      }
      verifyLock(spec);
    }
    if (stored.result && (!spec.result || hashOf(spec.result) !== hashOf(stored.result))) {
      throw new AgentError("RESULT_IMMUTABLE", "a recorded result cannot be removed or changed");
    }
    this.items.set(spec.experiment_id, structuredClone(spec));
  }

  get(id: string): ExperimentSpec | null {
    const spec = this.items.get(id);
    return spec ? structuredClone(spec) : null;
  }

  list(): ExperimentSpec[] {
    return [...this.items.values()].map((s) => structuredClone(s));
  }
}
