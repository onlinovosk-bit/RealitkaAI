import { hashOf } from "./canonical.js";
import { RunBudget } from "./budget.js";
import { assertCustomerRef } from "./pseudonym.js";
import { policyStatusFor } from "./guard.js";
import {
  AgentError,
  type Confidence,
  type CustomerRecord,
  type EstimatedValue,
  type Evidence,
  type Opportunity,
  type OrderRecord,
  type PreparedAction,
  type RevenueSnapshot,
} from "./types.js";

/**
 * ONL-REVENUE-OPPORTUNITY. Deterministic detection of evidence-backed opportunities.
 * Every count, date and sum below is computed here. There is no LLM and no network.
 * The default windows are ASSUMPTIONS (they are policy knobs, not facts) and are echoed in
 * the evidence of every opportunity.
 */
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const SOURCE = "onlinovo.revenue_snapshot";

export interface RangeAssumption {
  low: number;
  high: number;
}

export interface OpportunityAssumptions {
  vat_rate: number;
  /** Attributed gross revenue per recipient of a reorder or reactivation mail. */
  revenue_per_recipient_gross?: RangeAssumption;
  /** Share of attributed revenue that is truly incremental (0..1). */
  incremental_share?: RangeAssumption;
  unpaid_recovery_share?: RangeAssumption;
  stockout_lost_share?: RangeAssumption;
}

export interface OpportunityParams {
  max_snapshot_age_hours: number;
  reorder_window_days: readonly [number, number];
  reactivation_window_days: readonly [number, number];
  unpaid_min_age_hours: number;
  unpaid_max_age_days: number;
  stockout_min_units: number;
  stockout_lookback_days: number;
  ttl_days: number;
  assumptions?: OpportunityAssumptions;
}

export const DEFAULT_OPPORTUNITY_PARAMS: Readonly<OpportunityParams> = {
  max_snapshot_age_hours: 48,
  reorder_window_days: [91, 180],
  reactivation_window_days: [181, 365],
  unpaid_min_age_hours: 2,
  unpaid_max_age_days: 14,
  stockout_min_units: 5,
  stockout_lookback_days: 90,
  ttl_days: 7,
};

export type OpportunityRunStatus = "OK" | "STALE_SNAPSHOT" | "UNCONNECTED";

export interface OpportunityRun {
  status: OpportunityRunStatus;
  source: RevenueSnapshot["source"];
  as_of: string;
  opportunities: Opportunity[];
  data_quality: {
    live: false;
    unknown_stock_skus: string[];
    order_lines_without_cost: number;
    duplicate_orders_ignored: number;
  };
  usage: ReturnType<RunBudget["usage"]>;
}

function parseTime(iso: string, field: string): number {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) throw new AgentError("INVALID_INPUT", `${field} is not a valid timestamp`);
  return ms;
}

const daysBetween = (fromMs: number, toMs: number): number => Math.floor((toMs - fromMs) / DAY);
const round2 = (n: number): number => Math.round(n * 100) / 100;

function confidenceFromN(n: number, high: number, medium: number): Confidence {
  if (n >= high) return "high";
  if (n >= medium) return "medium";
  return "low";
}

function fact(key: string, value: Evidence["value"]): Evidence {
  return { kind: "FACT", key, value, source: SOURCE };
}
function assumption(key: string, value: Evidence["value"]): Evidence {
  return { kind: "ASSUMPTION", key, value, source: "params" };
}

function customerFacing(name: PreparedAction["name"]): PreparedAction {
  return { name, tier: 3, customer_facing: true, requires_approval: true, execution: "BLOCKED", blocked_by: "onlinovo.campaign.send" };
}

function rangeValue(
  metric: EstimatedValue["metric"],
  base: number,
  range: RangeAssumption | undefined,
  basis: Record<string, number | string>,
): EstimatedValue | null {
  if (!range || !Number.isFinite(base)) return null;
  return {
    kind: "ESTIMATE",
    currency: "EUR",
    metric,
    low: round2(base * range.low),
    high: round2(base * range.high),
    basis,
  };
}

function audienceValue(
  consented: number,
  params: OpportunityParams,
): EstimatedValue | null {
  const a = params.assumptions;
  if (!a?.revenue_per_recipient_gross || !a.incremental_share) return null;
  const net = (gross: number) => gross / (1 + a.vat_rate);
  return {
    kind: "ESTIMATE",
    currency: "EUR",
    metric: "incremental_net_revenue",
    low: round2(consented * net(a.revenue_per_recipient_gross.low) * a.incremental_share.low),
    high: round2(consented * net(a.revenue_per_recipient_gross.high) * a.incremental_share.high),
    basis: {
      consented_recipients: consented,
      revenue_per_recipient_gross_low: a.revenue_per_recipient_gross.low,
      revenue_per_recipient_gross_high: a.revenue_per_recipient_gross.high,
      incremental_share_low: a.incremental_share.low,
      incremental_share_high: a.incremental_share.high,
      vat_rate: a.vat_rate,
    },
  };
}

function midpoint(o: Opportunity): number {
  return o.estimated_value ? (o.estimated_value.low + o.estimated_value.high) / 2 : -1;
}

function validate(snapshot: RevenueSnapshot): void {
  if (!snapshot || !Array.isArray(snapshot.orders) || !Array.isArray(snapshot.customers) || !Array.isArray(snapshot.products)) {
    throw new AgentError("INVALID_INPUT", "snapshot must contain customers, orders and products arrays");
  }
  for (const order of snapshot.orders) {
    assertCustomerRef(order.customer_ref);
    // An unparseable timestamp makes every age comparison false, so it would slip through every filter.
    parseTime(order.placed_at, "order.placed_at");
  }
  for (const customer of snapshot.customers) assertCustomerRef(customer.customer_ref);
}

/** Pure function. Same snapshot, same `now`, same params give the same ids and the same numbers. */
export function detectOpportunities(
  snapshot: RevenueSnapshot,
  now: Date,
  params: OpportunityParams = DEFAULT_OPPORTUNITY_PARAMS,
  budget: RunBudget = new RunBudget(),
): OpportunityRun {
  validate(snapshot);
  budget.spendRows(snapshot.orders.length + snapshot.customers.length + snapshot.products.length);

  const asOfMs = parseTime(snapshot.as_of, "snapshot.as_of");
  const nowMs = now.getTime();
  const ageHours = (nowMs - asOfMs) / HOUR;
  const empty = (status: OpportunityRunStatus): OpportunityRun => ({
    status,
    source: snapshot.source,
    as_of: snapshot.as_of,
    opportunities: [],
    data_quality: { live: false, unknown_stock_skus: [], order_lines_without_cost: 0, duplicate_orders_ignored: 0 },
    usage: budget.usage(),
  });
  if (ageHours < -1) throw new AgentError("INVALID_INPUT", "snapshot.as_of is in the future");
  if (ageHours > params.max_snapshot_age_hours) return empty("STALE_SNAPSHOT");
  if (snapshot.source === "unconnected") return empty("UNCONNECTED");

  // Duplicate order rows are counted once. First occurrence wins.
  const seen = new Set<string>();
  const orders: OrderRecord[] = [];
  let duplicates = 0;
  for (const order of snapshot.orders) {
    if (seen.has(order.order_ref)) {
      duplicates += 1;
      continue;
    }
    seen.add(order.order_ref);
    orders.push(order);
  }

  const consent = new Map<string, CustomerRecord["consent"]>();
  for (const c of snapshot.customers) if (!consent.has(c.customer_ref)) consent.set(c.customer_ref, c.consent);
  const consented = (ref: string) => consent.get(ref) === "marketing_ok";

  const fulfilledByCustomer = new Map<string, OrderRecord[]>();
  for (const order of orders) {
    if (order.status !== "fulfilled") continue;
    const list = fulfilledByCustomer.get(order.customer_ref) ?? [];
    list.push(order);
    fulfilledByCustomer.set(order.customer_ref, list);
  }
  const lastFulfilled = (ref: string): OrderRecord | null => {
    const list = fulfilledByCustomer.get(ref);
    if (!list?.length) return null;
    return [...list].sort((a, b) => Date.parse(b.placed_at) - Date.parse(a.placed_at))[0];
  };
  const orderNet = (o: OrderRecord) => o.lines.reduce((sum, l) => sum + l.net_revenue, 0);

  const snapshotHash = hashOf(snapshot);
  const paramsHash = hashOf(params);
  const expiresAt = new Date(nowMs + params.ttl_days * DAY).toISOString();
  const idOf = (type: string, scope: string) => `opp_${hashOf({ type, scope, snapshotHash, paramsHash }).slice(0, 16)}`;
  const opportunities: Opportunity[] = [];

  // ── REORDER_WINDOW: exactly one fulfilled order, last one inside the window ──
  {
    const [lo, hi] = params.reorder_window_days;
    const refs: string[] = [];
    for (const [ref, list] of fulfilledByCustomer) {
      if (list.length !== 1) continue;
      const d = daysBetween(Date.parse(list[0].placed_at), nowMs);
      if (d >= lo && d <= hi) refs.push(ref);
    }
    const eligible = refs.filter(consented);
    if (eligible.length > 0) {
      const avgNet = eligible.reduce((s, r) => s + orderNet(lastFulfilled(r) as OrderRecord), 0) / eligible.length;
      const scope = `single-order customers, last fulfilled order ${lo}-${hi} days ago`;
      const confidence = confidenceFromN(eligible.length, 100, 30);
      opportunities.push({
        opportunity_id: idOf("REORDER_WINDOW", scope),
        type: "REORDER_WINDOW",
        segment_or_scope: scope,
        evidence: [
          fact("audience_total", refs.length),
          fact("audience_consented", eligible.length),
          fact("avg_net_order_value_eur", round2(avgNet)),
          assumption("window_days", `${lo}-${hi}`),
        ],
        estimated_value: audienceValue(eligible.length, params),
        confidence,
        recommended_next_action: customerFacing("PREPARE_REORDER_AUDIENCE"),
        constraints: [
          "only customers with consent marketing_ok are counted",
          "frequency cap is applied per customer when the next action is decided",
          "sending is BLOCKED: LeadHub write contract unverified",
        ],
        expires_at: expiresAt,
        policy_status: policyStatusFor(confidence),
      });
    }
  }

  // ── REACTIVATION_POOL: last fulfilled order inside the long window, any number of orders ──
  {
    const [lo, hi] = params.reactivation_window_days;
    const refs: string[] = [];
    for (const ref of fulfilledByCustomer.keys()) {
      const last = lastFulfilled(ref) as OrderRecord;
      const d = daysBetween(Date.parse(last.placed_at), nowMs);
      if (d >= lo && d <= hi) refs.push(ref);
    }
    const eligible = refs.filter(consented);
    if (eligible.length > 0) {
      const singles = eligible.filter((r) => (fulfilledByCustomer.get(r) ?? []).length === 1).length;
      const scope = `customers whose last fulfilled order was ${lo}-${hi} days ago`;
      const confidence = confidenceFromN(eligible.length, 100, 30);
      opportunities.push({
        opportunity_id: idOf("REACTIVATION_POOL", scope),
        type: "REACTIVATION_POOL",
        segment_or_scope: scope,
        evidence: [
          fact("audience_total", refs.length),
          fact("audience_consented", eligible.length),
          fact("single_order_customers", singles),
          assumption("window_days", `${lo}-${hi}`),
        ],
        estimated_value: audienceValue(eligible.length, params),
        confidence,
        recommended_next_action: customerFacing("PREPARE_REACTIVATION_AUDIENCE"),
        constraints: [
          "only customers with consent marketing_ok are counted",
          "sending is BLOCKED: LeadHub write contract unverified",
        ],
        expires_at: expiresAt,
        policy_status: policyStatusFor(confidence),
      });
    }
  }

  // ── UNPAID_RECOVERY: unpaid, old enough, not superseded by a later fulfilled order ──
  {
    const unpaid = orders.filter((o) => {
      if (o.status !== "unpaid") return false;
      const placed = Date.parse(o.placed_at);
      const ageH = (nowMs - placed) / HOUR;
      if (ageH < params.unpaid_min_age_hours || ageH > params.unpaid_max_age_days * 24) return false;
      const later = (fulfilledByCustomer.get(o.customer_ref) ?? []).some((f) => Date.parse(f.placed_at) > placed);
      return !later;
    });
    if (unpaid.length > 0) {
      const value = unpaid.reduce((s, o) => s + orderNet(o), 0);
      const scope = `unpaid orders aged ${params.unpaid_min_age_hours} h to ${params.unpaid_max_age_days} days, not superseded`;
      const confidence = confidenceFromN(unpaid.length, 30, 10);
      opportunities.push({
        opportunity_id: idOf("UNPAID_RECOVERY", scope),
        type: "UNPAID_RECOVERY",
        segment_or_scope: scope,
        evidence: [
          fact("unpaid_orders", unpaid.length),
          fact("unpaid_net_value_eur", round2(value)),
          assumption("min_age_hours", params.unpaid_min_age_hours),
        ],
        estimated_value: rangeValue("recovered_net_revenue", value, params.assumptions?.unpaid_recovery_share, {
          unpaid_net_value_eur: round2(value),
          recovery_share_low: params.assumptions?.unpaid_recovery_share?.low ?? 0,
          recovery_share_high: params.assumptions?.unpaid_recovery_share?.high ?? 0,
        }),
        confidence,
        recommended_next_action: customerFacing("PREPARE_PAYMENT_REMINDER"),
        constraints: [
          "a customer who later bought is excluded",
          "sending is BLOCKED: LeadHub write contract unverified",
        ],
        expires_at: expiresAt,
        policy_status: policyStatusFor(confidence),
      });
    }
  }

  // ── STOCKOUT_LEAK: demand for a product that is known to be out of stock ──
  const unknownStock: string[] = [];
  for (const product of snapshot.products) {
    if (product.in_stock === null) {
      unknownStock.push(product.sku);
      continue;
    }
    if (product.in_stock !== false) continue;
    const cutoff = nowMs - params.stockout_lookback_days * DAY;
    let units = 0;
    let revenue = 0;
    let soldOrders = 0;
    for (const order of orders) {
      if (order.status !== "fulfilled" || Date.parse(order.placed_at) < cutoff) continue;
      const lines = order.lines.filter((l) => l.sku === product.sku);
      if (lines.length === 0) continue;
      soldOrders += 1;
      for (const l of lines) {
        units += l.units;
        revenue += l.net_revenue;
      }
    }
    if (units < params.stockout_min_units) continue;
    const monthlyRevenue = (revenue / params.stockout_lookback_days) * 30;
    const scope = `sku ${product.sku} is out of stock`;
    const confidence = confidenceFromN(units, 20, 8);
    opportunities.push({
      opportunity_id: idOf("STOCKOUT_LEAK", scope),
      type: "STOCKOUT_LEAK",
      segment_or_scope: scope,
      evidence: [
        fact("sku", product.sku),
        fact("in_stock", false),
        fact("units_in_lookback", units),
        fact("orders_in_lookback", soldOrders),
        fact("net_revenue_in_lookback_eur", round2(revenue)),
        assumption("lookback_days", params.stockout_lookback_days),
      ],
      estimated_value: rangeValue("net_revenue_at_risk", monthlyRevenue, params.assumptions?.stockout_lost_share, {
        monthly_net_revenue_run_rate_eur: round2(monthlyRevenue),
        lost_share_low: params.assumptions?.stockout_lost_share?.low ?? 0,
        lost_share_high: params.assumptions?.stockout_lost_share?.high ?? 0,
      }),
      confidence,
      recommended_next_action: {
        name: "RESTOCK_OR_PAUSE_ADS",
        tier: 1,
        customer_facing: false,
        requires_approval: false,
        execution: "HUMAN_ONLY",
        blocked_by: null,
      },
      constraints: ["stock flag comes from the source snapshot, quantity is UNKNOWN", "a person restocks or pauses ads"],
      expires_at: expiresAt,
      policy_status: policyStatusFor(confidence),
    });
  }

  opportunities.sort((a, b) => midpoint(b) - midpoint(a) || (a.opportunity_id < b.opportunity_id ? -1 : 1));

  return {
    status: "OK",
    source: snapshot.source,
    as_of: snapshot.as_of,
    opportunities,
    data_quality: {
      live: false,
      unknown_stock_skus: unknownStock,
      order_lines_without_cost: orders.flatMap((o) => o.lines).filter((l) => l.net_cost === null).length,
      duplicate_orders_ignored: duplicates,
    },
    usage: budget.usage(),
  };
}
