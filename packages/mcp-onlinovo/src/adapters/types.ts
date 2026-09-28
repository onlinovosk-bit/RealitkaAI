export type ShopSource = "fixture" | "unconnected" | "shoptet";

export interface StockItem {
  sku: string;
  qty: number;
  threshold: number;
}

export interface OpenOrder {
  id: string;
  status: string;
  age_hours: number;
}

export interface ShopHealth {
  shop_connected: boolean;
  detail: string;
}

export interface ShopAdapter {
  readonly source: ShopSource;
  health(): Promise<ShopHealth>;
  stockLow(threshold: number): Promise<StockItem[]>;
  ordersOpen(): Promise<OpenOrder[]>;
}
