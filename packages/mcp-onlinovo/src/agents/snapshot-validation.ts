import { assertCustomerRef } from "./pseudonym.js";
import { AgentError, type RevenueSnapshot } from "./types.js";

/**
 * Strict ISO 8601 date-time: `2026-10-02T08:00:00Z`, optional seconds and fraction, a mandatory zone.
 * `Date.parse` alone is not enough: V8 accepts "1", "abc 1" and "12" as dates, rolls "2026-02-30" over to
 * March and reads "T24:00" as the next day. A timestamp that is silently wrong makes every age comparison
 * quietly wrong, so it is refused instead.
 */
const ISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/;

export function parseIsoTimestamp(value: unknown, field: string): number {
  if (typeof value !== "string") throw new AgentError("INVALID_INPUT", `${field} must be an ISO 8601 timestamp`);
  const m = value.match(ISO);
  if (!m) throw new AgentError("INVALID_INPUT", `${field} is not a valid ISO 8601 timestamp`);
  const [year, month, day, hour] = [m[1], m[2], m[3], m[4]].map(Number);
  const calendar = new Date(Date.UTC(year, month - 1, day));
  const real =
    calendar.getUTCFullYear() === year && calendar.getUTCMonth() === month - 1 && calendar.getUTCDate() === day;
  // Minutes and seconds above 59 are rejected by `Date.parse` itself (the final check, pinned by a test);
  // an hour of 24 and an impossible calendar day are not, so they are checked here.
  if (!real || hour > 23) {
    throw new AgentError("INVALID_INPUT", `${field} is not a real date and time`);
  }
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) throw new AgentError("INVALID_INPUT", `${field} is not a valid ISO 8601 timestamp`);
  return ms;
}

/** Money and units above this are not data, they are an overflow waiting to happen (50 000 rows of it still sum safely). */
const MAX_MAGNITUDE = 1e12;

function finiteNumber(value: unknown, field: string, min?: number): number {
  if (
    typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) > MAX_MAGNITUDE ||
    (min !== undefined && value < min)
  ) {
    throw new AgentError(
      "INVALID_INPUT",
      `${field} must be a finite number with magnitude <= ${MAX_MAGNITUDE}${min !== undefined ? ` and >= ${min}` : ""}`,
    );
  }
  return value;
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new AgentError("INVALID_INPUT", `${field} must be an object`);
  }
  return value as Record<string, unknown>;
}

function oneOf(value: unknown, allowed: readonly string[], field: string): void {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new AgentError("INVALID_INPUT", `${field} must be one of ${allowed.join(", ")}`);
  }
}

function numberOrNull(value: unknown, field: string): void {
  if (value !== null) finiteNumber(value, field);
}

/**
 * Everything both agents read from a snapshot is checked once, up front, before any rule runs:
 * structure, pseudonymous references, every timestamp, every enum and every number.
 * A NaN or a string where a number belongs would otherwise turn a FACT into `null` or "05",
 * and a null row would surface as a raw TypeError instead of INVALID_INPUT.
 */
export function assertValidSnapshot(snapshot: RevenueSnapshot): void {
  if (!snapshot || !Array.isArray(snapshot.orders) || !Array.isArray(snapshot.customers) || !Array.isArray(snapshot.products)) {
    throw new AgentError("INVALID_INPUT", "snapshot must contain customers, orders and products arrays");
  }
  oneOf(snapshot.source, ["fixture", "unconnected"], "snapshot.source");
  parseIsoTimestamp(snapshot.as_of, "snapshot.as_of");
  for (const raw of snapshot.orders) {
    const order = record(raw, "order");
    assertCustomerRef(order.customer_ref);
    parseIsoTimestamp(order.placed_at, "order.placed_at");
    if (typeof order.order_ref !== "string" || order.order_ref === "") throw new AgentError("INVALID_INPUT", "order.order_ref must be a non-empty string");
    oneOf(order.status, ["fulfilled", "unpaid", "cancelled", "uncollected_cod", "other"], "order.status");
    if (!Array.isArray(order.lines)) throw new AgentError("INVALID_INPUT", "order.lines must be an array");
    for (const rawLine of order.lines) {
      const line = record(rawLine, "order line");
      finiteNumber(line.units, "order line units", 0);
      finiteNumber(line.net_revenue, "order line net_revenue");
      numberOrNull(line.net_cost, "order line net_cost");
      numberOrNull(line.size_ml, "order line size_ml");
    }
  }
  for (const raw of snapshot.customers) {
    const customer = record(raw, "customer");
    assertCustomerRef(customer.customer_ref);
    oneOf(customer.consent, ["marketing_ok", "unknown", "opted_out"], "customer.consent");
    if (!Array.isArray(customer.interventions)) throw new AgentError("INVALID_INPUT", "customer.interventions must be an array");
    for (const rawIntervention of customer.interventions) {
      const intervention = record(rawIntervention, "intervention");
      parseIsoTimestamp(intervention.at, "intervention.at");
      if (typeof intervention.action !== "string") throw new AgentError("INVALID_INPUT", "intervention.action must be a string");
    }
  }
  for (const raw of snapshot.products) {
    const product = record(raw, "product");
    if (typeof product.sku !== "string" || product.sku === "") throw new AgentError("INVALID_INPUT", "product.sku must be a non-empty string");
    oneOf(product.kind, ["single", "set", "tester"], "product.kind");
    numberOrNull(product.size_ml, "product.size_ml");
    numberOrNull(product.list_price_gross, "product.list_price_gross");
    numberOrNull(product.unit_cost_net, "product.unit_cost_net");
    if (product.in_stock !== null && typeof product.in_stock !== "boolean") {
      throw new AgentError("INVALID_INPUT", "product.in_stock must be true, false or null (UNKNOWN)");
    }
  }
}
