import assert from "node:assert/strict";
import { test } from "node:test";
import { canonicalJson } from "./canonical.js";
import { RunBudget } from "./budget.js";
import { buildFixtureSnapshot } from "./fixture-data.js";
import { DEFAULT_NEXT_ACTION_RULES, decideNextAction, type NextActionDecision } from "./next-action.js";
import { AgentError, type OrderRecord, type RevenueSnapshot } from "./types.js";

const NOW = new Date("2026-10-02T08:00:00.000Z");
const DAY = 86_400_000;
const HOUR = 3_600_000;
const fx = () => buildFixtureSnapshot(NOW);
const decide = (id: string, snapshot: RevenueSnapshot = fx(), extra: Partial<Parameters<typeof decideNextAction>[0]> = {}) =>
  decideNextAction({ customer_ref: `FIX-CUS-${id}`, snapshot, now: NOW, ...extra });

function codeOf(fn: () => unknown): string | null {
  try {
    fn();
    return null;
  } catch (err) {
    return err instanceof AgentError ? err.code : "OTHER";
  }
}

function single100(ref: string, customer: string, daysAgo: number, family = "boreal"): OrderRecord {
  return {
    order_ref: ref,
    customer_ref: customer,
    placed_at: new Date(NOW.getTime() - daysAgo * DAY).toISOString(),
    status: "fulfilled",
    lines: [{ sku: `FIX-${family.toUpperCase()}-100`, family, size_ml: 100, units: 1, net_revenue: 26.75, net_cost: 20.49 }],
  };
}

function oneCustomer(daysAgo: number, mutate?: (s: RevenueSnapshot) => void): RevenueSnapshot {
  const s = fx();
  s.orders = [single100("FIX-ORDER-T1", "FIX-CUS-900", daysAgo)];
  s.customers = [{ customer_ref: "FIX-CUS-900", consent: "marketing_ok", interventions: [] }];
  mutate?.(s);
  return s;
}
const d900 = (daysAgo: number, mutate?: (s: RevenueSnapshot) => void): NextActionDecision =>
  decide("900", oneCustomer(daysAgo, mutate));

test("every candidate window picks the expected action on the fixture", () => {
  assert.equal(decide("001").action, "REPLENISHMENT");
  assert.equal(decide("004").action, "REACTIVATION");
  assert.equal(decide("010").action, "DISCOVERY");
  assert.equal(decide("019").action, "REPLENISHMENT");
  assert.equal(decide("006").action, "REPLENISHMENT");
});

test("priority order decides between eligible candidates and the trace shows the others", () => {
  const d = decide("001");
  assert.equal(d.action, "REPLENISHMENT");
  const bundle = d.candidates.find((c) => c.action === "BUNDLE");
  assert.equal(bundle?.eligible, true);
  const d20 = d900(20);
  assert.equal(d20.action, "BUNDLE");
  assert.ok(d20.candidates.some((c) => c.action === "CROSS_SELL" && c.eligible));
  assert.ok(d20.candidates.some((c) => c.action === "DISCOVERY" && c.eligible));
});

test("CROSS_SELL is chosen when no set is available, BUNDLE needs a known cost", () => {
  const noSet = d900(20, (s) => {
    s.products = s.products.filter((p) => p.kind !== "set");
  });
  assert.equal(noSet.action, "CROSS_SELL");
  assert.equal(noSet.candidates.find((c) => c.action === "BUNDLE")?.reason, "NO_SET_IN_STOCK");

  const unknownCost = d900(20, (s) => {
    for (const p of s.products) if (p.kind === "set") p.unit_cost_net = null;
  });
  assert.equal(unknownCost.action, "CROSS_SELL");
  assert.equal(unknownCost.candidates.find((c) => c.action === "BUNDLE")?.reason, "UNKNOWN_COST");
});

test("an unknown stock never becomes an eligible replenishment", () => {
  const d = d900(120, (s) => {
    for (const p of s.products) if (p.family === "boreal" && p.kind === "single") p.in_stock = null;
  });
  assert.equal(d.candidates.find((c) => c.action === "REPLENISHMENT")?.reason, "STOCK_UNKNOWN");
  assert.notEqual(d.action, "REPLENISHMENT");
});

test("no marketing consent means NO_ACTION, whatever the history says", () => {
  assert.equal(decide("003").action, "NO_ACTION");
  assert.equal(decide("003").policy_status, "BLOCKED_CONSENT");
  assert.equal(decide("005").policy_status, "BLOCKED_CONSENT");
});

test("the frequency cap blocks, exactly at the boundary", () => {
  assert.equal(decide("002").policy_status, "BLOCKED_FREQUENCY_CAP");
  const withIntervention = (msAgo: number) =>
    d900(120, (s) => {
      s.customers[0].interventions = [{ action: "REPLENISHMENT", at: new Date(NOW.getTime() - msAgo).toISOString() }];
    });
  assert.equal(withIntervention(3 * DAY - 1).policy_status, "BLOCKED_FREQUENCY_CAP");
  assert.equal(withIntervention(3 * DAY).action, "REPLENISHMENT");
});

test("an intervention timestamp in the future is invalid state, not silence", () => {
  const d = d900(120, (s) => {
    s.customers[0].interventions = [{ action: "REPLENISHMENT", at: new Date(NOW.getTime() + 5 * DAY).toISOString() }];
  });
  assert.equal(d.policy_status, "BLOCKED_INVALID_STATE");
  assert.equal(d.action, "NO_ACTION");
});

test("a fresh unpaid order blocks marketing, a superseded one does not", () => {
  assert.equal(decide("008").policy_status, "BLOCKED_OPEN_PAYMENT");
  assert.notEqual(decide("009").policy_status, "BLOCKED_OPEN_PAYMENT");
});

test("too recent, cancelled-only and unknown customers get NO_ACTION with a reason", () => {
  assert.equal(decide("007").policy_status, "NO_ELIGIBLE_CANDIDATE");
  assert.equal(decide("012").policy_status, "NO_ELIGIBLE_CANDIDATE");
  const unknown = decide("999");
  assert.equal(unknown.action, "NO_ACTION");
  assert.equal(unknown.policy_status, "BLOCKED_INVALID_STATE");
});

test("window boundaries are exact", () => {
  assert.equal(d900(13).action, "NO_ACTION");
  assert.equal(d900(180).action, "REPLENISHMENT");
  assert.equal(d900(181).action, "REACTIVATION");
  assert.equal(d900(365).action, "REACTIVATION");
  assert.equal(d900(366).action, "NO_ACTION");
});

test("a stale or unconnected snapshot never produces an action", () => {
  const stale = fx();
  stale.as_of = new Date(NOW.getTime() - 49 * HOUR).toISOString();
  assert.equal(decide("001", stale).policy_status, "BLOCKED_STALE");
  const unconnected: RevenueSnapshot = { source: "unconnected", as_of: NOW.toISOString(), customers: [], orders: [], products: [] };
  assert.equal(decide("001", unconnected).policy_status, "BLOCKED_SOURCE_UNCONNECTED");
});

test("an e-mail or phone as customer_ref is refused before any lookup", () => {
  for (const ref of ["jana@example.test", "+421 905 123 456", "customer-1", ""]) {
    assert.ok(["PII_IN_REF", "INVALID_INPUT"].includes(codeOf(() => decideNextAction({ customer_ref: ref, snapshot: fx(), now: NOW })) ?? ""), ref);
  }
});

test("every chosen action is a recommendation that needs approval and is blocked from execution", () => {
  for (const id of ["001", "004", "010", "019", "006"]) {
    const d = decide(id);
    assert.notEqual(d.action, "NO_ACTION", id);
    assert.equal(d.policy_status, "REQUIRES_APPROVAL", id);
    assert.deepEqual(d.next_step, { requires_approval: true, execution: "BLOCKED", blocked_by: "onlinovo.campaign.send" }, id);
  }
  assert.equal(decide("007").next_step, null);
});

test("the same request gives the same answer (duplicate requests are harmless)", () => {
  assert.equal(canonicalJson(decide("001")), canonicalJson(decide("001")));
});

test("duplicate order rows do not change the decision", () => {
  const s = fx();
  s.orders.push(...structuredClone(s.orders.filter((o) => o.customer_ref === "FIX-CUS-010")));
  assert.equal(decide("010", s).action, "DISCOVERY");
  assert.equal(canonicalJson(decide("010", s)), canonicalJson(decide("010")));
});

test("uncalibrated rules never claim high confidence, a missing cost lowers it", () => {
  assert.equal(decide("001").confidence, "medium");
  const d = d900(120, (s) => {
    s.orders[0].lines[0].net_cost = null;
  });
  assert.equal(d.confidence, "low");
});

test("evidence carries no PII and labels facts and assumptions", () => {
  const d = decide("001");
  assert.equal(canonicalJson(d).includes("@"), false);
  for (const e of d.evidence) assert.ok(e.kind === "FACT" || e.kind === "ASSUMPTION", e.key);
  assert.equal(d.evidence.find((e) => e.key === "days_since_last_order")?.value, 120);
});

test("expiry follows the ttl and the budget stops an oversized snapshot", () => {
  assert.equal(decide("001").expires_at, new Date(NOW.getTime() + DEFAULT_NEXT_ACTION_RULES.ttl_hours * HOUR).toISOString());
  const budget = new RunBudget({ maxRows: 3, maxCalls: 10, maxRetries: 0, maxLlmCalls: 0 });
  assert.equal(codeOf(() => decide("001", fx(), { budget })), "BUDGET_EXCEEDED");
});

test("an invalid snapshot is refused", () => {
  assert.equal(codeOf(() => decide("001", {} as RevenueSnapshot)), "INVALID_INPUT");
  const bad = fx();
  bad.as_of = "yesterday";
  assert.equal(codeOf(() => decide("001", bad)), "INVALID_INPUT");
});

test("an unpaid order that was followed by a fulfilled one does not block (supersession, not just age)", () => {
  const s = oneCustomer(120);
  s.orders.push({
    ...single100("FIX-ORDER-T2", "FIX-CUS-900", 0),
    status: "unpaid",
    placed_at: new Date(NOW.getTime() - 10 * HOUR).toISOString(),
  });
  assert.equal(decide("900", s).policy_status, "BLOCKED_OPEN_PAYMENT");
  s.orders.push({
    ...single100("FIX-ORDER-T3", "FIX-CUS-900", 0),
    placed_at: new Date(NOW.getTime() - 5 * HOUR).toISOString(),
  });
  assert.notEqual(decide("900", s).policy_status, "BLOCKED_OPEN_PAYMENT");
});

test("DISCOVERY is only for a customer with a single fulfilled order", () => {
  const s = fx();
  s.orders.push(single100("FIX-ORDER-T4", "FIX-CUS-010", 200, "iris"));
  const d = decide("010", s);
  assert.equal(d.candidates.find((c) => c.action === "DISCOVERY")?.eligible, false);
  assert.equal(d.candidates.find((c) => c.action === "DISCOVERY")?.reason, "MORE_THAN_ONE_ORDER");
  assert.equal(d.action, "NO_ACTION");
});

// ── P11 findings ──────────────────────────────────────────────────────────────────────────────

test("F2: an order with an unparseable timestamp, even another customer's, makes the snapshot invalid", () => {
  const s = oneCustomer(120);
  s.orders.push({ ...single100("FIX-ORDER-BAD", "FIX-CUS-901", 5), placed_at: "garbage" });
  assert.equal(codeOf(() => decide("900", s)), "INVALID_INPUT");
});

test("the replenishment window opens exactly on day 45 and discovery closes on day 44", () => {
  const eligible = (days: number, action: string) => d900(days).candidates.find((c) => c.action === action)?.eligible === true;
  assert.equal(eligible(44, "DISCOVERY"), true);
  assert.equal(eligible(44, "REPLENISHMENT"), false);
  assert.equal(eligible(45, "REPLENISHMENT"), true);
  assert.equal(eligible(45, "DISCOVERY"), false);
  assert.equal(d900(45).action, "REPLENISHMENT");
  assert.equal(eligible(180, "REPLENISHMENT"), true);
});

test("the open-payment hold lasts exactly 24 hours: at 24 h it still blocks, a minute later it does not", () => {
  const withUnpaid = (ageMs: number) => {
    const s = oneCustomer(120);
    s.orders.push({ ...single100("FIX-ORDER-UP", "FIX-CUS-900", 0), status: "unpaid", placed_at: new Date(NOW.getTime() - ageMs).toISOString() });
    return decide("900", s).policy_status;
  };
  assert.equal(withUnpaid(24 * HOUR), "BLOCKED_OPEN_PAYMENT");
  assert.notEqual(withUnpaid(24 * HOUR + 60_000), "BLOCKED_OPEN_PAYMENT");
});

test("N3/N4 through the agent: a sloppy date, a NaN line or a bad intervention on ANY customer refuses the snapshot", () => {
  const s = oneCustomer(120);
  s.orders.push({ ...single100("FIX-ORDER-X1", "FIX-CUS-902", 5), placed_at: "abc 1" });
  assert.equal(codeOf(() => decide("900", s)), "INVALID_INPUT");

  const t = oneCustomer(120);
  t.orders[0].lines[0].units = Number.NaN;
  assert.equal(codeOf(() => decide("900", t)), "INVALID_INPUT");

  const u = oneCustomer(120);
  u.customers.push({ customer_ref: "FIX-CUS-903", consent: "marketing_ok", interventions: [{ action: "REPLENISHMENT", at: "12" }] });
  assert.equal(codeOf(() => decide("900", u)), "INVALID_INPUT");

  const v = oneCustomer(120);
  v.as_of = "abc 1";
  assert.equal(codeOf(() => decide("900", v)), "INVALID_INPUT");
});

test("the snapshot age limit is exact here too: 48 h is fresh, 48 h and one millisecond is stale", () => {
  const at = (extraMs: number) => {
    const s = oneCustomer(120);
    s.as_of = new Date(NOW.getTime() - 48 * HOUR - extraMs).toISOString();
    return decide("900", s).policy_status;
  };
  assert.notEqual(at(0), "BLOCKED_STALE");
  assert.equal(at(1), "BLOCKED_STALE");
});

test("a snapshot dated up to one hour ahead of now is tolerated (clock skew), further ahead is invalid state", () => {
  const at = (minutes: number) => {
    const s = oneCustomer(120);
    s.as_of = new Date(NOW.getTime() + minutes * 60_000).toISOString();
    return codeOf(() => decide("900", s));
  };
  assert.equal(at(59), null);
  assert.equal(at(60), null);
  assert.equal(at(61), "INVALID_INPUT");
});

test("N4 through the agent: an order dated far in the future is INVALID_INPUT, not a negative age", () => {
  const s = oneCustomer(120);
  s.orders.push({ ...single100("FIX-ORDER-FUT", "FIX-CUS-904", 0), placed_at: "2099-01-01T00:00:00.000Z" });
  assert.equal(codeOf(() => decide("900", s)), "INVALID_INPUT");
});

test("an intervention up to one hour ahead is tolerated, further ahead is BLOCKED_INVALID_STATE", () => {
  const at = (ms: number) =>
    d900(120, (s) => {
      s.customers[0].interventions = [{ action: "REPLENISHMENT", at: new Date(NOW.getTime() + ms).toISOString() }];
    }).policy_status;
  assert.notEqual(at(3_600_000), "BLOCKED_INVALID_STATE");
  assert.equal(at(3_600_001), "BLOCKED_INVALID_STATE");
});

test("P11#5: a timestamp inside the one hour skew never yields a negative day count", () => {
  const d = d900(120, (s) => {
    s.customers[0].interventions = [{ action: "REPLENISHMENT", at: new Date(NOW.getTime() + 1_800_000).toISOString() }];
  });
  const ev = d.evidence.find((e) => e.key === "days_since_last_intervention");
  assert.ok(typeof ev?.value === "number" && ev.value >= 0, String(ev?.value));
  for (const e of d.evidence) if (e.key.startsWith("days_since")) assert.ok(typeof e.value !== "number" || e.value >= 0, e.key);
});
