import assert from "node:assert/strict";
import { test } from "node:test";
import {
  classifySample,
  contributionProfit,
  contributionProfitPerRecipient,
  diffEstimate,
  getKpi,
  KPI_REGISTRY,
  requiredSamplePerArm,
} from "./kpi.js";
import { AgentError } from "./types.js";

function codeOf(fn: () => unknown): string | null {
  try {
    fn();
    return null;
  } catch (err) {
    return err instanceof AgentError ? err.code : "OTHER";
  }
}
const near = (a: number, b: number, eps = 1e-4) => assert.ok(Math.abs(a - b) <= eps, `${a} !~ ${b}`);

test("the KPI registry is pre-registered, unique and complete", () => {
  assert.equal(new Set(KPI_REGISTRY.map((k) => k.id)).size, KPI_REGISTRY.length);
  assert.equal(getKpi("incremental_contribution_profit_per_recipient").kind, "mean");
  assert.equal(getKpi("second_purchase_rate_90d").kind, "proportion");
  assert.equal(codeOf(() => getKpi("open_rate")), "UNKNOWN_KPI");
});

test("proportion difference and interval are computed, not estimated by a model", () => {
  const kpi = getKpi("second_purchase_rate_90d");
  const e = diffEstimate(kpi, { n: 1000, successes: 110 }, { n: 1000, successes: 165 });
  near(e.control_value, 0.11);
  near(e.treatment_value, 0.165);
  near(e.difference, 0.055);
  near(e.standard_error, 0.015353);
  near(e.ci95_low, 0.0249, 1e-3);
  near(e.ci95_high, 0.0851, 1e-3);
  near(e.relative_lift ?? NaN, 0.5);
});

test("mean difference uses the sample variance", () => {
  const kpi = getKpi("net_revenue_per_recipient");
  const e = diffEstimate(kpi, { n: 4, sum: 40, sum_sq: 420 }, { n: 4, sum: 48, sum_sq: 600 });
  near(e.control_value, 10);
  near(e.treatment_value, 12);
  near(e.difference, 2);
  near(e.standard_error, Math.sqrt(1.666667 + 2), 1e-4);
});

test("relative lift is null when the control is zero (no division by zero)", () => {
  const e = diffEstimate(getKpi("scan_rate"), { n: 100, successes: 0 }, { n: 100, successes: 5 });
  assert.equal(e.relative_lift, null);
});

test("missing or impossible aggregates are refused", () => {
  const p = getKpi("scan_rate");
  assert.equal(codeOf(() => diffEstimate(p, { n: 1, successes: 0 }, { n: 100, successes: 5 })), "MISSING_DATA");
  assert.equal(codeOf(() => diffEstimate(p, { n: 100 }, { n: 100, successes: 5 })), "MISSING_DATA");
  assert.equal(codeOf(() => diffEstimate(p, { n: 100, successes: 101 }, { n: 100, successes: 5 })), "MISSING_DATA");
  const m = getKpi("aov_net");
  assert.equal(codeOf(() => diffEstimate(m, { n: 10, sum: 100 }, { n: 10, sum: 100, sum_sq: 1100 })), "MISSING_DATA");
});

test("contribution profit follows the founder formula", () => {
  const v = contributionProfit({
    net_revenue: 1000,
    cogs: 710,
    discounts: 10,
    payment_fees: 15,
    shipping_net_cost: 5,
    marketing_cost: 140,
  });
  assert.deepEqual(v, { value: 120, unknown: [] });
  assert.deepEqual(
    contributionProfitPerRecipient({
      net_revenue: 1000,
      cogs: 710,
      discounts: 10,
      payment_fees: 15,
      shipping_net_cost: 5,
      marketing_cost: 140,
      recipients: 100,
    }),
    { value: 1.2, unknown: [] },
  );
});

test("an unknown input makes the contribution profit UNKNOWN, never zero and never guessed", () => {
  const v = contributionProfit({
    net_revenue: 1000,
    cogs: 710,
    discounts: 10,
    payment_fees: null,
    shipping_net_cost: 5,
    marketing_cost: null,
  });
  assert.equal(v.value, null);
  assert.deepEqual(v.unknown, ["payment_fees", "marketing_cost"]);
  assert.equal(codeOf(() => contributionProfitPerRecipient({ net_revenue: 1, cogs: 1, discounts: 0, payment_fees: 0, shipping_net_cost: 0, marketing_cost: 0, recipients: 0 })), "INVALID_INPUT");
});

test("required sample per arm grows as the detectable difference shrinks", () => {
  const n55 = requiredSamplePerArm("proportion", 0.11, 0.055);
  const n30 = requiredSamplePerArm("proportion", 0.11, 0.03);
  assert.ok(n55 >= 600 && n55 <= 630, String(n55));
  assert.ok(n30 > n55);
  assert.equal(codeOf(() => requiredSamplePerArm("proportion", 0.11, 0)), "INVALID_INPUT");
  assert.equal(codeOf(() => requiredSamplePerArm("mean", 5, 1)), "INVALID_INPUT");
  assert.ok(requiredSamplePerArm("mean", 5, 1, 4) > 0);
});

test("a sample below the plan is INDICATIVE, at the plan it is ADEQUATE", () => {
  assert.equal(classifySample(600, 600, 600), "ADEQUATE");
  assert.equal(classifySample(599, 600, 600), "INDICATIVE");
  assert.equal(classifySample(600, 599, 600), "INDICATIVE");
});
