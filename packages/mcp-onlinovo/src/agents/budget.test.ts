import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_LIMITS, RunBudget } from "./budget.js";
import { AgentError } from "./types.js";

function code(fn: () => void): string | null {
  try {
    fn();
    return null;
  } catch (err) {
    return err instanceof AgentError ? err.code : "OTHER";
  }
}

test("rows within the limit pass and are counted", () => {
  const budget = new RunBudget();
  budget.spendRows(1000);
  assert.equal(budget.usage().rows, 1000);
});

test("rows over the limit stop the run with BUDGET_EXCEEDED", () => {
  const budget = new RunBudget({ ...DEFAULT_LIMITS, maxRows: 10 });
  assert.equal(code(() => budget.spendRows(11)), "BUDGET_EXCEEDED");
});

test("calls over the limit stop the run", () => {
  const budget = new RunBudget({ ...DEFAULT_LIMITS, maxCalls: 2 });
  budget.spendCall();
  budget.spendCall();
  assert.equal(code(() => budget.spendCall()), "BUDGET_EXCEEDED");
});

test("the first retry is already excessive (deterministic code retries nothing)", () => {
  assert.equal(DEFAULT_LIMITS.maxRetries, 0);
  assert.equal(code(() => new RunBudget().spendRetry()), "BUDGET_EXCEEDED");
});

test("an LLM call is excessive while the LLM budget is zero", () => {
  assert.equal(DEFAULT_LIMITS.maxLlmCalls, 0);
  assert.equal(code(() => new RunBudget().spendLlmCall()), "BUDGET_EXCEEDED");
});

test("the default row limit is 50 000", () => {
  assert.equal(DEFAULT_LIMITS.maxRows, 50_000);
  assert.equal(code(() => new RunBudget().spendRows(50_001)), "BUDGET_EXCEEDED");
  assert.equal(code(() => new RunBudget().spendRows(50_000)), null);
});
