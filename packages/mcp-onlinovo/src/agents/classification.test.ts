import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertClassificationSafe,
  LLM_WIRED,
  NEVER_LLM,
  OPERATION_CLASS,
  type OperationClass,
} from "./classification.js";

test("the shipped classification table is safe", () => {
  assert.doesNotThrow(() => assertClassificationSafe());
});

test("every operation that computes a number is deterministic", () => {
  for (const op of NEVER_LLM) {
    const cls = OPERATION_CLASS[op];
    assert.ok(cls === "FUNCTION" || cls === "RULE" || cls === "SQL" || cls === "PTC" || cls === "API", op);
  }
});

test("SABOTAGE: classifying revenue_sum as LLM-REASONING is refused", () => {
  const sabotaged: Record<string, OperationClass> = { ...OPERATION_CLASS, revenue_sum: "LLM-REASONING" };
  assert.throws(() => assertClassificationSafe(sabotaged), /LLM_FORBIDDEN_FOR_OPERATION: revenue_sum/);
});

test("an operation missing from the table is refused, not assumed deterministic", () => {
  const partial: Record<string, OperationClass> = { ...OPERATION_CLASS };
  delete partial.kpi_calculation;
  assert.throws(() => assertClassificationSafe(partial), /UNCLASSIFIED_OPERATION: kpi_calculation/);
});

test("no LLM is wired in this build", () => {
  assert.equal(LLM_WIRED, false);
});

test("LLM-REASONING exists only for the four contextual tasks", () => {
  const llm = Object.entries(OPERATION_CLASS)
    .filter(([, cls]) => cls === "LLM-REASONING")
    .map(([op]) => op)
    .sort();
  assert.deepEqual(llm, [
    "candidate_action_reasoning",
    "contextual_prioritization",
    "hypothesis_generation",
    "result_interpretation",
  ]);
});
