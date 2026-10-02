import type { CustomerRecord, OrderLine, OrderRecord, OrderStatus, ProductRecord, RevenueSnapshot } from "./types.js";

/**
 * Clearly synthetic data. Every reference starts with FIX-, there is no e-mail and no phone number,
 * and the prices only illustrate the shape of the business. Dates are relative to `now` so that the
 * fixture is always fresh and, for a fixed `now`, always identical.
 */
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function line(sku: string, family: string, size: number | null, units: number, unitRevenue: number, unitCost: number | null): OrderLine {
  return {
    sku,
    family,
    size_ml: size,
    units,
    net_revenue: Math.round(unitRevenue * units * 100) / 100,
    net_cost: unitCost === null ? null : Math.round(unitCost * units * 100) / 100,
  };
}

const boreal100 = (units = 1) => line("FIX-BOREAL-100", "boreal", 100, units, 26.75, 20.49);
const boreal50 = (units = 1) => line("FIX-BOREAL-50", "boreal", 50, units, 15.85, 10.93);
const caribbean100 = (units = 1) => line("FIX-CARIBBEAN-100", "caribbean", 100, units, 22.4, 16.8);
const iris100 = (units = 1) => line("FIX-IRIS-100", "iris", 100, units, 22.4, 16.8);

export const FIXTURE_PRODUCTS: readonly ProductRecord[] = [
  { sku: "FIX-BOREAL-100", family: "boreal", kind: "single", size_ml: 100, list_price_gross: 32.9, unit_cost_net: 20.49, in_stock: true },
  { sku: "FIX-BOREAL-50", family: "boreal", kind: "single", size_ml: 50, list_price_gross: 19.5, unit_cost_net: 10.93, in_stock: false },
  { sku: "FIX-BOREAL-15", family: "boreal", kind: "tester", size_ml: 15, list_price_gross: 6, unit_cost_net: 0.08, in_stock: true },
  { sku: "FIX-BOREAL-SET", family: "boreal", kind: "set", size_ml: 100, list_price_gross: 39, unit_cost_net: 20.8, in_stock: true },
  { sku: "FIX-CARIBBEAN-100", family: "caribbean", kind: "single", size_ml: 100, list_price_gross: 27.5, unit_cost_net: 16.8, in_stock: true },
  { sku: "FIX-IRIS-100", family: "iris", kind: "single", size_ml: 100, list_price_gross: 27.5, unit_cost_net: 16.8, in_stock: true },
  { sku: "FIX-UNKNOWN-STOCK-50", family: "unknown_stock", kind: "single", size_ml: 50, list_price_gross: 19.5, unit_cost_net: null, in_stock: null },
];

export function buildFixtureSnapshot(now: Date): RevenueSnapshot {
  const t = (msAgo: number) => new Date(now.getTime() - msAgo).toISOString();
  const orders: OrderRecord[] = [];
  const customers: CustomerRecord[] = [];

  const order = (ref: string, customer: string, msAgo: number, status: OrderStatus, lines: OrderLine[]) => {
    orders.push({ order_ref: `FIX-ORDER-${ref}`, customer_ref: `FIX-CUS-${customer}`, placed_at: t(msAgo), status, lines });
  };
  const customer = (id: string, consent: CustomerRecord["consent"], interventions: CustomerRecord["interventions"] = []) => {
    customers.push({ customer_ref: `FIX-CUS-${id}`, consent, interventions });
  };

  customer("001", "marketing_ok");
  order("1001", "001", 120 * DAY, "fulfilled", [boreal100()]);
  customer("002", "marketing_ok", [{ action: "REPLENISHMENT", at: t(2 * DAY) }]);
  order("1002", "002", 150 * DAY, "fulfilled", [caribbean100()]);
  customer("003", "unknown");
  order("1003", "003", 100 * DAY, "fulfilled", [boreal100()]);
  customer("004", "marketing_ok");
  order("1004", "004", 250 * DAY, "fulfilled", [caribbean100()]);
  customer("005", "opted_out");
  order("1005", "005", 300 * DAY, "fulfilled", [boreal100()]);
  customer("006", "marketing_ok");
  order("1006", "006", 200 * DAY, "fulfilled", [boreal100()]);
  order("1066", "006", 60 * DAY, "fulfilled", [caribbean100(), boreal50()]);
  customer("007", "marketing_ok");
  order("1007", "007", 10 * DAY, "fulfilled", [boreal100()]);
  customer("008", "marketing_ok");
  order("1008", "008", 5 * HOUR, "unpaid", [boreal100()]);
  customer("009", "marketing_ok");
  order("1009", "009", 30 * HOUR, "unpaid", [caribbean100()]);
  order("1099", "009", 20 * HOUR, "fulfilled", [caribbean100()]);
  customer("010", "marketing_ok");
  order("1010", "010", 30 * DAY, "fulfilled", [iris100()]);
  customer("011", "marketing_ok");
  order("1011", "011", 70 * DAY, "fulfilled", [boreal100()]);
  customer("012", "marketing_ok");
  order("1012", "012", 40 * DAY, "cancelled", [boreal100()]);
  customer("019", "marketing_ok");
  order("1019", "019", 90 * DAY, "fulfilled", [caribbean100()]);

  // Six single-unit Boreal 50 ml sales inside 90 days: demand for a product that is out of stock.
  [30, 40, 50, 60, 70, 80].forEach((days, i) => {
    const id = String(13 + i).padStart(3, "0");
    customer(id, "marketing_ok");
    order(`10${id}`, id, days * DAY, "fulfilled", [boreal50()]);
  });

  return {
    source: "fixture",
    as_of: now.toISOString(),
    customers,
    orders,
    products: FIXTURE_PRODUCTS.map((p) => ({ ...p })),
  };
}
