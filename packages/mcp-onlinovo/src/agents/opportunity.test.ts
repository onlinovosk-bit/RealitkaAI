import assert from "node:assert/strict";
import { test } from "node:test";
import { RunBudget } from "./budget.js";
import { buildFixtureSnapshot } from "./fixture-data.js";
import { actionVerdict } from "./guard.js";
import {
  DEFAULT_OPPORTUNITY_PARAMS,
  detectOpportunities,
  type OpportunityParams,
} from "./opportunity.js";
import { AgentError, type OrderRecord, type RevenueSnapshot } from "./types.js";

const NOW = new Date("2026-10-02T08:00:00.000Z");
const DAY = 86_400_000;
const NO_ENV = {} as NodeJS.ProcessEnv;

const WITH_ASSUMPTIONS: OpportunityParams = {
  ...DEFAULT_OPPORTUNITY_PARAMS,
  assumptions: {
    vat_rate: 0.23,
    revenue_per_recipient_gross: { low: 0.9, high: 1.5 },
    incremental_share: { low: 0.4, high: 0.7 },
    unpaid_recovery_share: { low: 0.15, high: 0.25 },
    stockout_lost_share: { low: 0.3, high: 0.6 },
  },
};

const fixture = () => buildFixtureSnapshot(NOW);

function codeOf(fn: () => unknown): string | null {
  try {
    fn();
    return null;
  } catch (err) {
    return err instanceof AgentError ? err.code : "OTHER";
  }
}

function order(ref: string, customer: string, daysAgo: number, status: OrderRecord["status"] = "fulfilled"): OrderRecord {
  return {
    order_ref: ref,
    customer_ref: customer,
    placed_at: new Date(NOW.getTime() - daysAgo * DAY).toISOString(),
    status,
    lines: [{ sku: "FIX-X-100", family: "x", size_ml: 100, units: 1, net_revenue: 20, net_cost: 15 }],
  };
}

function custom(orders: OrderRecord[], consent: "marketing_ok" | "unknown" = "marketing_ok"): RevenueSnapshot {
  const refs = [...new Set(orders.map((o) => o.customer_ref))];
  return {
    source: "fixture",
    as_of: NOW.toISOString(),
    customers: refs.map((customer_ref) => ({ customer_ref, consent, interventions: [] })),
    orders,
    products: [],
  };
}

const typesOf = (run: ReturnType<typeof detectOpportunities>) => run.opportunities.map((o) => o.type).sort();

test("fixture yields the four opportunity types with factual counts", () => {
  const run = detectOpportunities(fixture(), NOW, WITH_ASSUMPTIONS);
  assert.equal(run.status, "OK");
  assert.deepEqual(typesOf(run), ["REACTIVATION_POOL", "REORDER_WINDOW", "STOCKOUT_LEAK", "UNPAID_RECOVERY"]);
  const get = (type: string, key: string) =>
    run.opportunities.find((o) => o.type === type)?.evidence.find((e) => e.key === key)?.value;
  assert.equal(get("REORDER_WINDOW", "audience_total"), 3);
  assert.equal(get("REORDER_WINDOW", "audience_consented"), 2);
  assert.equal(get("REACTIVATION_POOL", "audience_total"), 2);
  assert.equal(get("REACTIVATION_POOL", "audience_consented"), 1);
  assert.equal(get("UNPAID_RECOVERY", "unpaid_orders"), 1);
  assert.equal(get("STOCKOUT_LEAK", "units_in_lookback"), 7);
});

test("the run is reproducible: same input, same ids, same values", () => {
  const snapshot = fixture();
  const a = detectOpportunities(snapshot, NOW, WITH_ASSUMPTIONS);
  const b = detectOpportunities(structuredClone(snapshot), NOW, WITH_ASSUMPTIONS);
  assert.deepEqual(a.opportunities, b.opportunities);
});

test("ids change when the data changes (no stale identity)", () => {
  const base = fixture();
  const changed = fixture();
  changed.orders.push(order("FIX-ORDER-EXTRA", "FIX-CUS-001", 400));
  const idsA = detectOpportunities(base, NOW).opportunities.map((o) => o.opportunity_id);
  const idsB = detectOpportunities(changed, NOW).opportunities.map((o) => o.opportunity_id);
  assert.notDeepEqual(idsA, idsB);
});

test("an estimate carries its assumptions and is null without them", () => {
  const withA = detectOpportunities(fixture(), NOW, WITH_ASSUMPTIONS).opportunities;
  const reorder = withA.find((o) => o.type === "REORDER_WINDOW");
  assert.ok(reorder?.estimated_value);
  assert.equal(reorder.estimated_value.kind, "ESTIMATE");
  assert.equal(reorder.estimated_value.low, 0.59);
  assert.equal(reorder.estimated_value.high, 1.71);
  assert.equal(reorder.estimated_value.basis.vat_rate, 0.23);
  const unpaid = withA.find((o) => o.type === "UNPAID_RECOVERY");
  assert.equal(unpaid?.estimated_value?.low, 4.01);
  assert.equal(unpaid?.estimated_value?.high, 6.69);

  const without = detectOpportunities(fixture(), NOW).opportunities;
  assert.ok(without.length > 0);
  for (const o of without) assert.equal(o.estimated_value, null, o.type);
});

test("evidence is labelled: counts are FACT, windows are ASSUMPTION, nothing is INFERENCE", () => {
  const run = detectOpportunities(fixture(), NOW, WITH_ASSUMPTIONS);
  for (const o of run.opportunities) {
    assert.ok(o.evidence.length > 0, o.type);
    for (const e of o.evidence) {
      assert.ok(e.kind === "FACT" || e.kind === "ASSUMPTION", `${o.type}.${e.key}`);
      if (/^(window_days|min_age_hours|lookback_days)$/.test(e.key)) assert.equal(e.kind, "ASSUMPTION", e.key);
      else assert.equal(e.kind, "FACT", e.key);
    }
  }
});

test("a customer-facing opportunity is prepared, never executed: tier 3, approval, blocked by the registry", () => {
  const run = detectOpportunities(fixture(), NOW, WITH_ASSUMPTIONS);
  for (const type of ["REORDER_WINDOW", "REACTIVATION_POOL", "UNPAID_RECOVERY"]) {
    const a = run.opportunities.find((o) => o.type === type)?.recommended_next_action;
    assert.ok(a, type);
    assert.equal(a.tier, 3);
    assert.equal(a.customer_facing, true);
    assert.equal(a.requires_approval, true);
    assert.equal(a.execution, "BLOCKED");
    assert.equal(a.blocked_by, "onlinovo.campaign.send");
    assert.equal(actionVerdict(a.blocked_by, 1, NO_ENV).verdict, "FORBIDDEN");
  }
  const stock = run.opportunities.find((o) => o.type === "STOCKOUT_LEAK")?.recommended_next_action;
  assert.equal(stock?.customer_facing, false);
  assert.equal(stock?.execution, "HUMAN_ONLY");
});

test("small audiences are low confidence and therefore need a human (policy status)", () => {
  const run = detectOpportunities(fixture(), NOW, WITH_ASSUMPTIONS);
  const reorder = run.opportunities.find((o) => o.type === "REORDER_WINDOW");
  assert.equal(reorder?.confidence, "low");
  assert.equal(reorder?.policy_status, "APPROVAL_REQUIRED");
});

test("stock UNKNOWN is never turned into a stock-out claim", () => {
  const run = detectOpportunities(fixture(), NOW, WITH_ASSUMPTIONS);
  assert.deepEqual(run.data_quality.unknown_stock_skus, ["FIX-UNKNOWN-STOCK-50"]);
  assert.equal(run.opportunities.some((o) => o.segment_or_scope.includes("FIX-UNKNOWN-STOCK-50")), false);
  assert.equal(run.opportunities.filter((o) => o.type === "STOCKOUT_LEAK").length, 1);
});

test("a stale snapshot yields no opportunities (fail-closed)", () => {
  const old = fixture();
  old.as_of = new Date(NOW.getTime() - 49 * 3_600_000).toISOString();
  const run = detectOpportunities(old, NOW, WITH_ASSUMPTIONS);
  assert.equal(run.status, "STALE_SNAPSHOT");
  assert.deepEqual(run.opportunities, []);
  const fresh = fixture();
  fresh.as_of = new Date(NOW.getTime() - 47 * 3_600_000).toISOString();
  assert.equal(detectOpportunities(fresh, NOW).status, "OK");
});

test("a snapshot from the future is invalid state", () => {
  const future = fixture();
  future.as_of = new Date(NOW.getTime() + 5 * 3_600_000).toISOString();
  assert.equal(codeOf(() => detectOpportunities(future, NOW)), "INVALID_INPUT");
});

test("an unconnected source returns an honest empty run", () => {
  const snap: RevenueSnapshot = { source: "unconnected", as_of: NOW.toISOString(), customers: [], orders: [], products: [] };
  const run = detectOpportunities(snap, NOW);
  assert.equal(run.status, "UNCONNECTED");
  assert.equal(run.source, "unconnected");
  assert.deepEqual(run.opportunities, []);
});

test("missing data produces no opportunity instead of an invented one", () => {
  const snap = fixture();
  snap.orders = [];
  snap.products = [];
  const run = detectOpportunities(snap, NOW, WITH_ASSUMPTIONS);
  assert.equal(run.status, "OK");
  assert.deepEqual(run.opportunities, []);
});

test("invalid snapshot structure is refused", () => {
  assert.equal(codeOf(() => detectOpportunities({} as RevenueSnapshot, NOW)), "INVALID_INPUT");
  const bad = fixture();
  bad.as_of = "not-a-date";
  assert.equal(codeOf(() => detectOpportunities(bad, NOW)), "INVALID_INPUT");
});

test("an e-mail in customer_ref is refused, not processed", () => {
  const snap = custom([order("FIX-ORDER-1", "jana@example.test", 120)]);
  assert.equal(codeOf(() => detectOpportunities(snap, NOW)), "PII_IN_REF");
});

test("duplicate order rows are counted once", () => {
  const o = order("FIX-ORDER-D1", "FIX-CUS-100", 120);
  const single = detectOpportunities(custom([o]), NOW);
  const doubled = detectOpportunities(custom([o, structuredClone(o)]), NOW);
  assert.equal(doubled.data_quality.duplicate_orders_ignored, 1);
  const count = (run: typeof single) => run.opportunities[0]?.evidence.find((e) => e.key === "audience_total")?.value;
  assert.equal(count(single), 1);
  assert.equal(count(doubled), 1);
});

test("an unpaid order that was followed by a fulfilled order is not a recovery", () => {
  const snap = custom([order("FIX-ORDER-U1", "FIX-CUS-200", 3, "unpaid"), order("FIX-ORDER-U2", "FIX-CUS-200", 2)]);
  assert.equal(typesOf(detectOpportunities(snap, NOW)).includes("UNPAID_RECOVERY"), false);
  const alone = custom([order("FIX-ORDER-U3", "FIX-CUS-201", 3, "unpaid")]);
  assert.equal(typesOf(detectOpportunities(alone, NOW)).includes("UNPAID_RECOVERY"), true);
});

test("window boundaries are inclusive and exact: 90 no, 91 yes, 180 yes, 181 goes to reactivation", () => {
  const types = (days: number) => typesOf(detectOpportunities(custom([order(`FIX-ORDER-B${days}`, "FIX-CUS-300", days)]), NOW));
  assert.deepEqual(types(90), []);
  assert.deepEqual(types(91), ["REORDER_WINDOW"]);
  assert.deepEqual(types(180), ["REORDER_WINDOW"]);
  assert.deepEqual(types(181), ["REACTIVATION_POOL"]);
  assert.deepEqual(types(365), ["REACTIVATION_POOL"]);
  assert.deepEqual(types(366), []);
});

test("a customer without marketing consent is never in the audience", () => {
  const snap = custom([order("FIX-ORDER-C1", "FIX-CUS-400", 120)], "unknown");
  assert.deepEqual(detectOpportunities(snap, NOW).opportunities, []);
});

test("opportunities are ranked by estimated value, those without an estimate come last", () => {
  const run = detectOpportunities(fixture(), NOW, WITH_ASSUMPTIONS);
  const mids = run.opportunities.map((o) => (o.estimated_value ? (o.estimated_value.low + o.estimated_value.high) / 2 : -1));
  assert.deepEqual(mids, [...mids].sort((a, b) => b - a));
  const noEstimate = detectOpportunities(fixture(), NOW).opportunities;
  assert.ok(noEstimate.length >= 2);
});

test("lines without a known cost are reported, not filled in", () => {
  const snap = fixture();
  snap.orders[0].lines[0].net_cost = null;
  const run = detectOpportunities(snap, NOW);
  assert.equal(run.data_quality.order_lines_without_cost, 1);
});

test("the row budget stops an oversized run", () => {
  const budget = new RunBudget({ maxRows: 5, maxCalls: 10, maxRetries: 0, maxLlmCalls: 0 });
  assert.equal(codeOf(() => detectOpportunities(fixture(), NOW, DEFAULT_OPPORTUNITY_PARAMS, budget)), "BUDGET_EXCEEDED");
});

test("expiry follows the ttl", () => {
  const run = detectOpportunities(fixture(), NOW, { ...DEFAULT_OPPORTUNITY_PARAMS, ttl_days: 3 });
  for (const o of run.opportunities) assert.equal(o.expires_at, new Date(NOW.getTime() + 3 * DAY).toISOString());
});

test("a product whose stock is UNKNOWN is not a stock-out even when it sells well", () => {
  const snap = custom(
    Array.from({ length: 8 }, (_, i) => ({
      ...order(`FIX-ORDER-S${i}`, `FIX-CUS-5${String(i).padStart(2, "0")}`, 10 + i),
      lines: [{ sku: "FIX-NOSTOCK-50", family: "nostock", size_ml: 50, units: 1, net_revenue: 15, net_cost: 10 }],
    })),
  );
  snap.products = [
    { sku: "FIX-NOSTOCK-50", family: "nostock", kind: "single", size_ml: 50, list_price_gross: 19.5, unit_cost_net: 10, in_stock: null },
  ];
  const run = detectOpportunities(snap, NOW);
  assert.equal(typesOf(run).includes("STOCKOUT_LEAK"), false);
  assert.deepEqual(run.data_quality.unknown_stock_skus, ["FIX-NOSTOCK-50"]);
  snap.products[0].in_stock = false;
  assert.equal(typesOf(detectOpportunities(snap, NOW)).includes("STOCKOUT_LEAK"), true);
});

test("an e-mail as customer_ref is refused wherever it appears (order only, customer only)", () => {
  const orderOnly = custom([order("FIX-ORDER-P1", "FIX-CUS-600", 120)]);
  orderOnly.orders[0].customer_ref = "jana@example.test";
  assert.equal(codeOf(() => detectOpportunities(orderOnly, NOW)), "PII_IN_REF");
  const customerOnly = custom([order("FIX-ORDER-P2", "FIX-CUS-601", 120)]);
  customerOnly.customers[0].customer_ref = "+421 905 123 456";
  assert.equal(codeOf(() => detectOpportunities(customerOnly, NOW)), "PII_IN_REF");
});

test("unpaid age bounds: younger than 2 h and older than 14 days are not recoveries", () => {
  const ageHours = (hours: number) => {
    const o = order(`FIX-ORDER-A${hours}`, `FIX-CUS-7${String(hours).padStart(3, "0")}`, 0, "unpaid");
    o.placed_at = new Date(NOW.getTime() - hours * 3_600_000).toISOString();
    return typesOf(detectOpportunities(custom([o]), NOW)).includes("UNPAID_RECOVERY");
  };
  assert.equal(ageHours(1), false);
  assert.equal(ageHours(2), true);
  assert.equal(ageHours(14 * 24), true);
  assert.equal(ageHours(14 * 24 + 1), false);
});

// ── P11 findings ──────────────────────────────────────────────────────────────────────────────

test("F2: an order with an unparseable timestamp makes the snapshot invalid instead of slipping through every filter", () => {
  for (const status of ["unpaid", "fulfilled", "cancelled"] as const) {
    const o = order("FIX-ORDER-BAD", "FIX-CUS-800", 5, status);
    o.placed_at = "garbage";
    assert.equal(codeOf(() => detectOpportunities(custom([o], "unknown"), NOW)), "INVALID_INPUT", status);
  }
});

test("the snapshot age limit is exact: 48 h is fresh, 48 h and one millisecond is stale", () => {
  const at = (extraMs: number) => {
    const snap = fixture();
    snap.as_of = new Date(NOW.getTime() - 48 * 3_600_000 - extraMs).toISOString();
    return detectOpportunities(snap, NOW).status;
  };
  assert.equal(at(0), "OK");
  assert.equal(at(1), "STALE_SNAPSHOT");
});

test("an estimate needs BOTH revenue per recipient and incremental share; one alone gives null", () => {
  const run = (assumptions: NonNullable<OpportunityParams["assumptions"]>) =>
    detectOpportunities(fixture(), NOW, { ...DEFAULT_OPPORTUNITY_PARAMS, assumptions }).opportunities.filter((o) => o.type === "REORDER_WINDOW" || o.type === "REACTIVATION_POOL");
  for (const o of run({ vat_rate: 0.23 })) assert.equal(o.estimated_value, null, "vat only");
  for (const o of run({ vat_rate: 0.23, revenue_per_recipient_gross: { low: 1, high: 2 } })) assert.equal(o.estimated_value, null, "revenue only");
  for (const o of run({ vat_rate: 0.23, incremental_share: { low: 0.1, high: 0.2 } })) assert.equal(o.estimated_value, null, "share only");
  for (const o of run({ vat_rate: 0.23, revenue_per_recipient_gross: { low: 1, high: 2 }, incremental_share: { low: 0.1, high: 0.2 } })) {
    assert.equal(o.estimated_value?.kind, "ESTIMATE");
  }
});

test("the stock-out threshold is exact: 5 units in the look-back is a leak, 4 is not", () => {
  const units = (n: number) => {
    const snap = custom(
      Array.from({ length: n }, (_, i) => ({
        ...order(`FIX-ORDER-U${i}`, `FIX-CUS-4${String(i).padStart(2, "0")}`, 10 + i),
        lines: [{ sku: "FIX-OUT-50", family: "out", size_ml: 50, units: 1, net_revenue: 15, net_cost: 10 }],
      })),
    );
    snap.products = [{ sku: "FIX-OUT-50", family: "out", kind: "single", size_ml: 50, list_price_gross: 19.5, unit_cost_net: 10, in_stock: false }];
    return typesOf(detectOpportunities(snap, NOW)).includes("STOCKOUT_LEAK");
  };
  assert.equal(units(4), false);
  assert.equal(units(5), true);
});

test("REORDER_WINDOW needs exactly one fulfilled order, whichever row comes first", () => {
  const inWindow = order("FIX-ORDER-R1", "FIX-CUS-410", 120);
  const older = order("FIX-ORDER-R2", "FIX-CUS-410", 300);
  assert.equal(typesOf(detectOpportunities(custom([inWindow, older]), NOW)).includes("REORDER_WINDOW"), false, "in-window row first");
  assert.equal(typesOf(detectOpportunities(custom([older, inWindow]), NOW)).includes("REORDER_WINDOW"), false, "older row first");
  assert.equal(typesOf(detectOpportunities(custom([inWindow]), NOW)).includes("REORDER_WINDOW"), true);
});

test("N3/N4 through the agent: a sloppy date or a NaN on a line is refused, never read as something else", () => {
  for (const placed_at of ["abc 1", "1", "2026-02-30T08:00:00Z", "2026-10-01T24:00:00Z"]) {
    const o = order("FIX-ORDER-BADT", "FIX-CUS-810", 5, "unpaid");
    o.placed_at = placed_at;
    assert.equal(codeOf(() => detectOpportunities(custom([o]), NOW)), "INVALID_INPUT", placed_at);
  }
  for (const units of [Number.NaN, "5", -3]) {
    const o = order("FIX-ORDER-BADL", "FIX-CUS-811", 20);
    o.lines[0].units = units as never;
    assert.equal(codeOf(() => detectOpportunities(custom([o]), NOW)), "INVALID_INPUT", String(units));
  }
  const bad = fixture();
  bad.as_of = "12";
  assert.equal(codeOf(() => detectOpportunities(bad, NOW)), "INVALID_INPUT");
});

test("a snapshot dated up to one hour ahead of now is tolerated (clock skew), further ahead is invalid state", () => {
  const at = (minutes: number) => {
    const s = fixture();
    s.as_of = new Date(NOW.getTime() + minutes * 60_000).toISOString();
    return codeOf(() => detectOpportunities(s, NOW));
  };
  assert.equal(at(59), null);
  assert.equal(at(60), null);
  assert.equal(at(61), "INVALID_INPUT");
});
