import type { OpenOrder, ShopAdapter, ShopHealth, StockItem } from "./types.js";

/** Clearly fake SKUs. Never label this as live Shoptet. */
const FIXTURE_STOCK: StockItem[] = [
  { sku: "FIX-SKU-001", qty: 2, threshold: 5 },
  { sku: "FIX-SKU-002", qty: 12, threshold: 5 },
  { sku: "FIX-SKU-003", qty: 0, threshold: 5 },
];

const FIXTURE_ORDERS: OpenOrder[] = [
  { id: "FIX-ORDER-1001", status: "unpaid", age_hours: 18 },
  { id: "FIX-ORDER-1002", status: "processing", age_hours: 4 },
];

export class FixtureAdapter implements ShopAdapter {
  readonly source = "fixture" as const;

  async health(): Promise<ShopHealth> {
    return { shop_connected: false, detail: "fixture_adapter_not_live_shop" };
  }

  async stockLow(threshold: number): Promise<StockItem[]> {
    return FIXTURE_STOCK.filter((item) => item.qty < threshold).map((item) => ({
      ...item,
      threshold,
    }));
  }

  async ordersOpen(): Promise<OpenOrder[]> {
    return FIXTURE_ORDERS.map((order) => ({ ...order }));
  }
}
