/**
 * Every operation an ONLINOVO agent performs is classified. Anything that produces a number a
 * human might act on is deterministic. LLM-REASONING exists in the table only for the tasks in
 * P08 where determinism is insufficient, and `LLM_WIRED` stays false until someone wires and
 * measures it (P08 §K).
 */
export type OperationClass = "PTC" | "RULE" | "API" | "SQL" | "FUNCTION" | "LLM-REASONING";

export const OPERATION_CLASS = {
  snapshot_read: "FUNCTION",
  customer_count: "FUNCTION",
  date_diff_days: "FUNCTION",
  rfm_value: "FUNCTION",
  revenue_sum: "FUNCTION",
  margin: "FUNCTION",
  eligibility: "RULE",
  frequency_cap: "RULE",
  threshold_check: "RULE",
  candidate_generation: "RULE",
  opportunity_ranking: "FUNCTION",
  allocation_hash: "FUNCTION",
  experiment_arithmetic: "FUNCTION",
  kpi_calculation: "FUNCTION",
  sample_classification: "RULE",
  state_transition: "RULE",
  contextual_prioritization: "LLM-REASONING",
  hypothesis_generation: "LLM-REASONING",
  candidate_action_reasoning: "LLM-REASONING",
  result_interpretation: "LLM-REASONING",
} as const satisfies Record<string, OperationClass>;

/** An LLM must never compute any of these. */
export const NEVER_LLM = [
  "customer_count",
  "date_diff_days",
  "rfm_value",
  "revenue_sum",
  "margin",
  "eligibility",
  "frequency_cap",
  "threshold_check",
  "experiment_arithmetic",
  "kpi_calculation",
] as const;

/** P10 wires no LLM. Flipping this needs a measured cost and a founder decision. */
export const LLM_WIRED = false;

export function assertClassificationSafe(
  table: Readonly<Record<string, OperationClass>> = OPERATION_CLASS,
): void {
  for (const op of NEVER_LLM) {
    const cls = table[op];
    if (cls === undefined) throw new Error(`UNCLASSIFIED_OPERATION: ${op}`);
    if (cls === "LLM-REASONING") throw new Error(`LLM_FORBIDDEN_FOR_OPERATION: ${op}`);
  }
}
