import assert from "node:assert/strict";
import { test } from "node:test";
import { buildFixtureSnapshot } from "./fixture-data.js";
import { assertValidSnapshot, parseIsoTimestamp } from "./snapshot-validation.js";
import { AgentError, type RevenueSnapshot } from "./types.js";

const NOW = new Date("2026-10-02T08:00:00.000Z");
const fx = (): RevenueSnapshot => buildFixtureSnapshot(NOW);

function codeOf(fn: () => unknown): string | null {
  try {
    fn();
    return null;
  } catch (err) {
    return err instanceof AgentError ? err.code : "OTHER";
  }
}

test("N3: only a real ISO 8601 date-time with a zone is a timestamp", () => {
  for (const ok of ["2026-10-02T08:00:00Z", "2026-10-02T08:00:00.123Z", "2026-10-02T08:00Z", "2026-10-02T08:00:00+02:00", "2024-02-29T23:59:59Z", "2026-10-02T08:00:00.123456789-05:30"]) {
    assert.equal(Number.isFinite(parseIsoTimestamp(ok, "t")), true, ok);
  }
  const bad = [
    "1", "0", "12", "abc 1", "1/1/1", "garbage", "", " ", "2026-10-02", "2026-10-02 08:00:00", "2026-10-02T08:00:00",
    "2026-02-30T08:00:00Z", "2026-13-01T08:00:00Z", "2026-00-10T08:00:00Z", "2026-10-00T08:00:00Z", "2026-10-32T08:00:00Z",
    "2026-10-02T24:00:00Z", "2026-10-02T08:60:00Z", "2026-10-02T08:00:60Z", "2025-02-29T08:00:00Z", "2026-10-02T08:00:00Zjunk",
    "  2026-10-02T08:00:00Z", "2026-10-02T08:00:00z", "+002026-10-02T08:00:00Z",
  ];
  for (const text of bad) assert.equal(codeOf(() => parseIsoTimestamp(text, "t")), "INVALID_INPUT", JSON.stringify(text));
  for (const notString of [123, null, undefined, {}, [], true, new Date()]) {
    assert.equal(codeOf(() => parseIsoTimestamp(notString, "t")), "INVALID_INPUT", String(notString));
  }
});

test("a valid fixture snapshot passes", () => {
  assert.doesNotThrow(() => assertValidSnapshot(fx()));
});

test("N3: a bad timestamp anywhere in the snapshot is refused: as_of, any order, any customer's intervention", () => {
  const withBad = (mutate: (s: RevenueSnapshot) => void) => {
    const s = fx();
    mutate(s);
    return codeOf(() => assertValidSnapshot(s));
  };
  assert.equal(withBad((s) => { s.as_of = "abc 1"; }), "INVALID_INPUT");
  assert.equal(withBad((s) => { s.orders[0].placed_at = "abc 1"; }), "INVALID_INPUT");
  assert.equal(withBad((s) => { s.orders[s.orders.length - 1].placed_at = "2026-02-30T08:00:00Z"; }), "INVALID_INPUT");
  const holder = fx().customers.findIndex((c) => c.interventions.length > 0);
  assert.ok(holder >= 0, "the fixture has a customer with an intervention");
  assert.equal(withBad((s) => { s.customers[holder].interventions[0].at = "12"; }), "INVALID_INPUT");
  assert.equal(withBad((s) => { s.customers[0].interventions = undefined as never; }), "INVALID_INPUT");
});

test("N4: units and money on an order line must be finite numbers, units not negative", () => {
  const withLine = (mutate: (line: RevenueSnapshot["orders"][number]["lines"][number]) => void) => {
    const s = fx();
    mutate(s.orders[0].lines[0]);
    return codeOf(() => assertValidSnapshot(s));
  };
  for (const units of [Number.NaN, Number.POSITIVE_INFINITY, "5", null, undefined, -1]) {
    assert.equal(withLine((l) => { l.units = units as never; }), "INVALID_INPUT", `units ${String(units)}`);
  }
  for (const revenue of [Number.NaN, Number.NEGATIVE_INFINITY, "20", null, undefined]) {
    assert.equal(withLine((l) => { l.net_revenue = revenue as never; }), "INVALID_INPUT", `net_revenue ${String(revenue)}`);
  }
  for (const cost of [Number.NaN, "10", undefined]) {
    assert.equal(withLine((l) => { l.net_cost = cost as never; }), "INVALID_INPUT", `net_cost ${String(cost)}`);
  }
  assert.equal(withLine((l) => { l.net_cost = null; }), null, "an unknown cost stays allowed: UNKNOWN is not an error");
  assert.equal(withLine((l) => { l.units = 0; }), null);
  assert.equal(codeOf(() => assertValidSnapshot((() => { const s = fx(); s.orders[0].lines = undefined as never; return s; })())), "INVALID_INPUT");
  assert.equal(codeOf(() => assertValidSnapshot((() => { const s = fx(); s.orders[0].lines = [null as never]; return s; })())), "INVALID_INPUT");
});

test("the structure and the references are still checked first", () => {
  assert.equal(codeOf(() => assertValidSnapshot(null as never)), "INVALID_INPUT");
  assert.equal(codeOf(() => assertValidSnapshot({ ...fx(), orders: "x" as never })), "INVALID_INPUT");
  const s = fx();
  s.orders[0].customer_ref = "jana@example.test";
  assert.equal(codeOf(() => assertValidSnapshot(s)), "PII_IN_REF");
  const t = fx();
  t.customers[0].customer_ref = "+421 905 123 456";
  assert.equal(codeOf(() => assertValidSnapshot(t)), "PII_IN_REF");
});
