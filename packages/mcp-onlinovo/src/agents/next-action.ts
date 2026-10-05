import { RunBudget } from "./budget.js";
import { assertCustomerRef } from "./pseudonym.js";
import { assertOrdersNotFromTheFuture, assertValidSnapshot, parseIsoTimestamp } from "./snapshot-validation.js";
import { AgentError, type Confidence, type Evidence, type OrderRecord, type RevenueSnapshot } from "./types.js";

/**
 * ONL-CUSTOMER-NEXT-ACTION. Picks ONE action for ONE pseudonymised customer from a finite set.
 * Eligibility, dates, frequency caps and candidate generation are rules. The ranking among
 * already eligible candidates is a fixed priority list. Contextual ranking by an LLM is allowed
 * by the spec only among eligible candidates and is not wired in this build.
 */
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const SOURCE = "onlinovo.revenue_snapshot";

export type NextActionName = "NO_ACTION" | "REPLENISHMENT" | "CROSS_SELL" | "BUNDLE" | "REACTIVATION" | "DISCOVERY";
export type CandidateName = Exclude<NextActionName, "NO_ACTION">;

export type NextActionPolicyStatus =
  | "REQUIRES_APPROVAL"
  | "BLOCKED_CONSENT"
  | "BLOCKED_FREQUENCY_CAP"
  | "BLOCKED_OPEN_PAYMENT"
  | "BLOCKED_STALE"
  | "BLOCKED_INVALID_STATE"
  | "BLOCKED_SOURCE_UNCONNECTED"
  | "NO_ELIGIBLE_CANDIDATE";

export interface NextActionRules {
  max_snapshot_age_hours: number;
  frequency_cap_days: number;
  open_payment_hours: number;
  discovery_days: readonly [number, number];
  replenishment_days: readonly [number, number];
  cross_sell_days: readonly [number, number];
  bundle_days: readonly [number, number];
  reactivation_days: readonly [number, number];
  ttl_hours: number;
  priority: readonly CandidateName[];
}

/** Every value here is a policy knob (ASSUMPTION), not a fact about customers. */
export const DEFAULT_NEXT_ACTION_RULES: Readonly<NextActionRules> = {
  max_snapshot_age_hours: 48,
  frequency_cap_days: 3,
  open_payment_hours: 24,
  discovery_days: [14, 44],
  replenishment_days: [45, 180],
  cross_sell_days: [14, 90],
  bundle_days: [14, 180],
  reactivation_days: [181, 365],
  ttl_hours: 72,
  priority: ["REPLENISHMENT", "BUNDLE", "CROSS_SELL", "REACTIVATION", "DISCOVERY"],
};

export interface CandidateTrace {
  action: CandidateName;
  eligible: boolean;
  reason: string;
}

export interface NextActionDecision {
  customer_ref: string;
  action: NextActionName;
  evidence: Evidence[];
  confidence: Confidence;
  expires_at: string;
  policy_status: NextActionPolicyStatus;
  candidates: CandidateTrace[];
  /** Present only when an action was chosen. The action is a recommendation; nothing is sent. */
  next_step: { requires_approval: true; execution: "BLOCKED"; blocked_by: "onlinovo.campaign.send" } | null;
}

const fact = (key: string, value: Evidence["value"]): Evidence => ({ kind: "FACT", key, value, source: SOURCE });
const assumed = (key: string, value: Evidence["value"]): Evidence => ({ kind: "ASSUMPTION", key, value, source: "rules" });

const inWindow = (days: number, w: readonly [number, number]) => days >= w[0] && days <= w[1];

function blocked(
  ref: string,
  status: NextActionPolicyStatus,
  now: Date,
  rules: NextActionRules,
  evidence: Evidence[],
): NextActionDecision {
  return {
    customer_ref: ref,
    action: "NO_ACTION",
    evidence,
    confidence: "low",
    expires_at: new Date(now.getTime() + rules.ttl_hours * HOUR).toISOString(),
    policy_status: status,
    candidates: [],
    next_step: null,
  };
}

export function decideNextAction(input: {
  customer_ref: string;
  snapshot: RevenueSnapshot;
  now: Date;
  rules?: NextActionRules;
  budget?: RunBudget;
}): NextActionDecision {
  const { snapshot, now } = input;
  const rules = input.rules ?? DEFAULT_NEXT_ACTION_RULES;
  const budget = input.budget ?? new RunBudget();
  assertCustomerRef(input.customer_ref);
  const ref = input.customer_ref;

  assertValidSnapshot(snapshot);
  budget.spendRows(snapshot.orders.length + snapshot.customers.length + snapshot.products.length);

  const nowMs = now.getTime();
  const ageHours = (nowMs - parseIsoTimestamp(snapshot.as_of, "snapshot.as_of")) / HOUR;
  if (ageHours < -1) throw new AgentError("INVALID_INPUT", "snapshot.as_of is in the future");
  assertOrdersNotFromTheFuture(snapshot, nowMs);
  if (ageHours > rules.max_snapshot_age_hours) {
    return blocked(ref, "BLOCKED_STALE", now, rules, [fact("snapshot_age_hours", Math.floor(ageHours))]);
  }
  if (snapshot.source === "unconnected") {
    return blocked(ref, "BLOCKED_SOURCE_UNCONNECTED", now, rules, [fact("source", "unconnected")]);
  }

  const customer = snapshot.customers.find((c) => c.customer_ref === ref);
  if (!customer) return blocked(ref, "BLOCKED_INVALID_STATE", now, rules, [fact("customer_found", false)]);

  const base: Evidence[] = [fact("consent", customer.consent)];
  if (customer.consent !== "marketing_ok") return blocked(ref, "BLOCKED_CONSENT", now, rules, base);

  // De-duplicate order rows, first occurrence wins.
  const seen = new Set<string>();
  const orders: OrderRecord[] = [];
  for (const o of snapshot.orders) {
    if (o.customer_ref !== ref || seen.has(o.order_ref)) continue;
    seen.add(o.order_ref);
    orders.push(o);
  }
  const fulfilled = orders
    .filter((o) => o.status === "fulfilled")
    .sort((a, b) => Date.parse(b.placed_at) - Date.parse(a.placed_at));

  // A fresh unpaid order has priority: the payment flow owns this customer right now.
  const openPayment = orders.some((o) => {
    if (o.status !== "unpaid") return false;
    const placed = parseIsoTimestamp(o.placed_at, "order.placed_at");
    if ((nowMs - placed) / HOUR > rules.open_payment_hours) return false;
    return !fulfilled.some((f) => Date.parse(f.placed_at) > placed);
  });
  if (openPayment) {
    return blocked(ref, "BLOCKED_OPEN_PAYMENT", now, rules, [...base, fact("open_payment_window_hours", rules.open_payment_hours)]);
  }

  // Frequency cap. A timestamp from the future is invalid state, not "no recent contact".
  let lastInterventionMs: number | null = null;
  for (const i of customer.interventions) {
    const at = parseIsoTimestamp(i.at, "intervention.at");
    if (at > nowMs + HOUR) return blocked(ref, "BLOCKED_INVALID_STATE", now, rules, [...base, fact("intervention_in_future", true)]);
    if (lastInterventionMs === null || at > lastInterventionMs) lastInterventionMs = at;
  }
  base.push(
    fact("days_since_last_intervention", lastInterventionMs === null ? null : Math.max(0, Math.floor((nowMs - lastInterventionMs) / DAY))),
  );
  if (lastInterventionMs !== null && nowMs - lastInterventionMs < rules.frequency_cap_days * DAY) {
    return blocked(ref, "BLOCKED_FREQUENCY_CAP", now, rules, [...base, assumed("frequency_cap_days", rules.frequency_cap_days)]);
  }

  if (fulfilled.length === 0) {
    return blocked(ref, "NO_ELIGIBLE_CANDIDATE", now, rules, [...base, fact("fulfilled_orders", 0)]);
  }
  const last = fulfilled[0];
  const days = Math.max(0, Math.floor((nowMs - Date.parse(last.placed_at)) / DAY));
  base.push(fact("fulfilled_orders", fulfilled.length), fact("days_since_last_order", days));

  // ── Candidate generation (RULE) ──
  const products = snapshot.products;
  const lastFamilies = [...new Set(last.lines.map((l) => l.family))];
  const trace: CandidateTrace[] = [];
  const eligible = new Set<CandidateName>();
  const add = (action: CandidateName, ok: boolean, reason: string) => {
    trace.push({ action, eligible: ok, reason });
    if (ok) eligible.add(action);
  };

  if (inWindow(days, rules.replenishment_days)) {
    const stocked = products.filter((p) => lastFamilies.includes(p.family) && p.kind === "single" && p.in_stock === true);
    const unknown = products.some((p) => lastFamilies.includes(p.family) && p.kind === "single" && p.in_stock === null);
    add("REPLENISHMENT", stocked.length > 0, stocked.length > 0 ? "in_window_and_in_stock" : unknown ? "STOCK_UNKNOWN" : "NOT_IN_STOCK");
  }
  if (inWindow(days, rules.bundle_days)) {
    const alreadySet = last.lines.some((l) => products.find((p) => p.sku === l.sku)?.kind === "set");
    const sets = products.filter((p) => lastFamilies.includes(p.family) && p.kind === "set" && p.in_stock === true);
    const withCost = sets.filter((p) => p.unit_cost_net !== null);
    if (alreadySet) add("BUNDLE", false, "ALREADY_BOUGHT_SET");
    else if (sets.length === 0) add("BUNDLE", false, "NO_SET_IN_STOCK");
    else if (withCost.length === 0) add("BUNDLE", false, "UNKNOWN_COST");
    else add("BUNDLE", true, "set_in_stock_with_known_cost");
  }
  if (inWindow(days, rules.cross_sell_days)) {
    const boughtLarge = last.lines.some((l) => l.size_ml === 100);
    const boughtSmall = last.lines.some((l) => l.size_ml !== null && l.size_ml <= 50);
    const small = products.filter(
      (p) => lastFamilies.includes(p.family) && p.size_ml !== null && p.size_ml <= 50 && p.in_stock === true && p.kind !== "set",
    );
    if (!boughtLarge) add("CROSS_SELL", false, "NO_100ML_IN_LAST_ORDER");
    else if (boughtSmall) add("CROSS_SELL", false, "ALREADY_BOUGHT_SMALL_SIZE");
    else if (small.length === 0) add("CROSS_SELL", false, "NO_SMALL_SIZE_IN_STOCK");
    else add("CROSS_SELL", true, "small_size_in_stock");
  }
  if (inWindow(days, rules.reactivation_days)) add("REACTIVATION", true, "in_window");
  if (inWindow(days, rules.discovery_days)) {
    add("DISCOVERY", fulfilled.length === 1, fulfilled.length === 1 ? "single_order_in_window" : "MORE_THAN_ONE_ORDER");
  }

  const chosen = rules.priority.find((c) => eligible.has(c));
  const evidence = [
    ...base,
    assumed("priority_order", rules.priority.join(">")),
    ...trace.map((t) => fact(`candidate_${t.action}`, `${t.eligible ? "eligible" : "ineligible"}:${t.reason}`)),
  ];
  const expires_at = new Date(nowMs + rules.ttl_hours * HOUR).toISOString();

  if (!chosen) {
    return { customer_ref: ref, action: "NO_ACTION", evidence, confidence: "low", expires_at, policy_status: "NO_ELIGIBLE_CANDIDATE", candidates: trace, next_step: null };
  }

  // Uncalibrated rules never claim "high". Missing cost on the last order lowers confidence.
  const costKnown = last.lines.every((l) => l.net_cost !== null);
  const confidence: Confidence = costKnown ? "medium" : "low";
  return {
    customer_ref: ref,
    action: chosen,
    evidence,
    confidence,
    expires_at,
    policy_status: "REQUIRES_APPROVAL",
    candidates: trace,
    next_step: { requires_approval: true, execution: "BLOCKED", blocked_by: "onlinovo.campaign.send" },
  };
}
