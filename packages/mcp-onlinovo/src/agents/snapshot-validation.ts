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

function finiteNumber(value: unknown, field: string, min?: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || (min !== undefined && value < min)) {
    throw new AgentError("INVALID_INPUT", `${field} must be a finite number${min !== undefined ? ` >= ${min}` : ""}`);
  }
  return value;
}

/**
 * Everything both agents read from a snapshot is checked once, up front, before any rule runs:
 * structure, pseudonymous references, every timestamp and every number on an order line.
 * A NaN or a string where a number belongs would otherwise turn a FACT into `null` or "05".
 */
export function assertValidSnapshot(snapshot: RevenueSnapshot): void {
  if (!snapshot || !Array.isArray(snapshot.orders) || !Array.isArray(snapshot.customers) || !Array.isArray(snapshot.products)) {
    throw new AgentError("INVALID_INPUT", "snapshot must contain customers, orders and products arrays");
  }
  parseIsoTimestamp(snapshot.as_of, "snapshot.as_of");
  for (const order of snapshot.orders) {
    assertCustomerRef(order.customer_ref);
    parseIsoTimestamp(order.placed_at, "order.placed_at");
    if (!Array.isArray(order.lines)) throw new AgentError("INVALID_INPUT", "order.lines must be an array");
    for (const line of order.lines) {
      finiteNumber(line?.units, "order line units", 0);
      finiteNumber(line?.net_revenue, "order line net_revenue");
      if (line.net_cost !== null) finiteNumber(line.net_cost, "order line net_cost");
    }
  }
  for (const customer of snapshot.customers) {
    assertCustomerRef(customer.customer_ref);
    if (!Array.isArray(customer.interventions)) throw new AgentError("INVALID_INPUT", "customer.interventions must be an array");
    for (const intervention of customer.interventions) parseIsoTimestamp(intervention?.at, "intervention.at");
  }
}
