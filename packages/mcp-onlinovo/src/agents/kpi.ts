import { AgentError } from "./types.js";

/**
 * Pre-registered KPI definitions and the arithmetic behind them. Nothing here is interpreted by a
 * model. A KPI that is not in this registry cannot be the primary metric of an experiment.
 */
export type KpiKind = "proportion" | "mean";

export interface KpiDefinition {
  id: string;
  name: string;
  kind: KpiKind;
  unit: "ratio" | "EUR" | "count";
  definition: string;
}

export const KPI_REGISTRY: readonly KpiDefinition[] = [
  {
    id: "incremental_contribution_profit_per_recipient",
    name: "Contribution profit per recipient",
    kind: "mean",
    unit: "EUR",
    definition:
      "(net revenue − COGS − discounts − payment fees − shipping net cost − marketing cost) per recipient, observed per arm. The experiment effect is treatment minus control.",
  },
  { id: "net_revenue_per_recipient", name: "Net revenue per recipient", kind: "mean", unit: "EUR", definition: "Net revenue (ex VAT) per recipient." },
  { id: "orders_per_recipient", name: "Orders per recipient", kind: "mean", unit: "count", definition: "Fulfilled orders per recipient inside the window." },
  { id: "aov_net", name: "Net AOV", kind: "mean", unit: "EUR", definition: "Net revenue per fulfilled order." },
  { id: "second_purchase_rate_90d", name: "Second purchase rate 90 d", kind: "proportion", unit: "ratio", definition: "Share of customers with a second fulfilled order within 90 days." },
  { id: "scan_rate", name: "QR scan rate", kind: "proportion", unit: "ratio", definition: "Scans divided by cards shipped." },
  { id: "bundle_attach_rate", name: "Bundle attach rate", kind: "proportion", unit: "ratio", definition: "Share of eligible orders that include the offered bundle." },
];

const BY_ID: ReadonlyMap<string, KpiDefinition> = new Map(KPI_REGISTRY.map((k) => [k.id, k]));

export function getKpi(id: string): KpiDefinition {
  const kpi = BY_ID.get(id);
  if (!kpi) throw new AgentError("UNKNOWN_KPI", `KPI "${id}" is not in the pre-registered registry`);
  return kpi;
}

/** Aggregates per arm. Proportions need `successes`; means need `sum` and `sum_sq`. */
export interface ArmAggregate {
  n: number;
  successes?: number;
  sum?: number;
  sum_sq?: number;
}

export interface DiffEstimate {
  control_value: number;
  treatment_value: number;
  difference: number;
  standard_error: number;
  ci95_low: number;
  ci95_high: number;
  relative_lift: number | null;
}

const Z_ALPHA_2 = 1.959964;
const Z_BETA_80 = 0.841621;
const round6 = (x: number) => Math.round(x * 1e6) / 1e6;

function valueAndVariance(kind: KpiKind, a: ArmAggregate, label: string): { value: number; varianceOfMean: number } {
  if (!Number.isInteger(a.n) || a.n < 2) throw new AgentError("MISSING_DATA", `${label}: n must be an integer >= 2`);
  if (kind === "proportion") {
    if (a.successes === undefined || !Number.isInteger(a.successes) || a.successes < 0 || a.successes > a.n) {
      throw new AgentError("MISSING_DATA", `${label}: successes must be an integer in 0..n`);
    }
    const p = a.successes / a.n;
    return { value: p, varianceOfMean: (p * (1 - p)) / a.n };
  }
  if (a.sum === undefined || a.sum_sq === undefined || !Number.isFinite(a.sum) || !Number.isFinite(a.sum_sq)) {
    throw new AgentError("MISSING_DATA", `${label}: sum and sum_sq are required for a mean KPI`);
  }
  const mean = a.sum / a.n;
  // Σx² can never be smaller than (Σx)²/n. A smaller value is an impossible aggregate, not "zero variance".
  const rawSs = a.sum_sq - (a.sum * a.sum) / a.n;
  if (rawSs < -1e-9 * Math.max(1, Math.abs(a.sum_sq))) {
    throw new AgentError("MISSING_DATA", `${label}: sum_sq is smaller than sum^2/n, the aggregate is impossible`);
  }
  const sampleVariance = Math.max(0, rawSs / (a.n - 1));
  return { value: mean, varianceOfMean: sampleVariance / a.n };
}

/** Difference of treatment and control with a normal-approximation 95 % interval. */
export function diffEstimate(kpi: KpiDefinition, control: ArmAggregate, treatment: ArmAggregate): DiffEstimate {
  const c = valueAndVariance(kpi.kind, control, "control");
  const t = valueAndVariance(kpi.kind, treatment, "treatment");
  const difference = t.value - c.value;
  const se = Math.sqrt(c.varianceOfMean + t.varianceOfMean);
  return {
    control_value: round6(c.value),
    treatment_value: round6(t.value),
    difference: round6(difference),
    standard_error: round6(se),
    ci95_low: round6(difference - Z_ALPHA_2 * se),
    ci95_high: round6(difference + Z_ALPHA_2 * se),
    relative_lift: c.value === 0 ? null : round6(difference / c.value),
  };
}

export interface ContributionInputs {
  net_revenue: number | null;
  cogs: number | null;
  discounts: number | null;
  payment_fees: number | null;
  /** Shipping cost minus shipping revenue. Positive = a cost. */
  shipping_net_cost: number | null;
  marketing_cost: number | null;
  recipients: number;
}

/** Revenue − COGS − discounts − payment fees − shipping net cost − marketing = contribution profit. A null input makes the result UNKNOWN, never zero. */
export function contributionProfit(input: ContributionInputsWithoutRecipients): { value: number | null; unknown: string[] } {
  const keys = ["net_revenue", "cogs", "discounts", "payment_fees", "shipping_net_cost", "marketing_cost"] as const;
  const unknown = keys.filter((k) => input[k] === null || !Number.isFinite(input[k] as number));
  if (unknown.length > 0) return { value: null, unknown: [...unknown] };
  const value =
    (input.net_revenue as number) -
    (input.cogs as number) -
    (input.discounts as number) -
    (input.payment_fees as number) -
    (input.shipping_net_cost as number) -
    (input.marketing_cost as number);
  return { value: Math.round(value * 100) / 100, unknown: [] };
}

export type ContributionInputsWithoutRecipients = Omit<ContributionInputs, "recipients">;

export function contributionProfitPerRecipient(input: ContributionInputs): { value: number | null; unknown: string[] } {
  if (!Number.isInteger(input.recipients) || input.recipients <= 0) {
    throw new AgentError("INVALID_INPUT", "recipients must be a positive integer");
  }
  const { recipients, ...rest } = input;
  const total = contributionProfit(rest);
  return { value: total.value === null ? null : Math.round((total.value / recipients) * 1e4) / 1e4, unknown: total.unknown };
}

/** Required sample per arm for a two-sided test at 5 % significance and 80 % power. */
export function requiredSamplePerArm(
  kind: KpiKind,
  baseline: number,
  minDetectableDifference: number,
  standardDeviation?: number,
): number {
  if (!(minDetectableDifference > 0)) throw new AgentError("INVALID_INPUT", "minDetectableDifference must be positive");
  const z = Z_ALPHA_2 + Z_BETA_80;
  if (kind === "proportion") {
    const p1 = baseline + minDetectableDifference;
    if (baseline <= 0 || p1 >= 1) throw new AgentError("INVALID_INPUT", "baseline and baseline + difference must be inside (0, 1)");
    const pBar = (baseline + p1) / 2;
    return Math.ceil((2 * z * z * pBar * (1 - pBar)) / (minDetectableDifference * minDetectableDifference));
  }
  if (standardDeviation === undefined || !(standardDeviation > 0)) {
    throw new AgentError("INVALID_INPUT", "standardDeviation is required for a mean KPI");
  }
  return Math.ceil((2 * z * z * standardDeviation * standardDeviation) / (minDetectableDifference * minDetectableDifference));
}

export type SampleClass = "ADEQUATE" | "INDICATIVE";

/**
 * Policy floor, not a statistical derivation: no experiment may call a sample adequate with fewer units
 * per arm than this, whatever the plan says. The plan's own size (`requiredSamplePerArm`) can only raise it.
 * Without the floor a plan could be pre-registered with min_sample_per_arm = 2 and "pass" on n = 2.
 */
export const MIN_ADEQUATE_SAMPLE_PER_ARM = 100;

/** Below the planned size, or below the policy floor, the result is only indicative. There is no third option. */
export function classifySample(nControl: number, nTreatment: number, requiredPerArm: number): SampleClass {
  const required = Math.max(requiredPerArm, MIN_ADEQUATE_SAMPLE_PER_ARM);
  return nControl >= required && nTreatment >= required ? "ADEQUATE" : "INDICATIVE";
}
