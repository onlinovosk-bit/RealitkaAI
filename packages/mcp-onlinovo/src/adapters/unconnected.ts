import type { OpenOrder, ShopAdapter, ShopHealth, StockItem } from "./types.js";

export class UnconnectedAdapter implements ShopAdapter {
  readonly source = "unconnected" as const;

  async health(): Promise<ShopHealth> {
    return { shop_connected: false, detail: "shop_adapter_unconnected" };
  }

  async stockLow(_threshold: number): Promise<StockItem[]> {
    return [];
  }

  async ordersOpen(): Promise<OpenOrder[]> {
    return [];
  }
}
