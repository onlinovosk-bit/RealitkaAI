import type { OpenOrder, ShopAdapter, ShopHealth, StockItem } from "./types.js";

const SHOPTET_API_HOST = "https://api.myshoptet.com/api";

/**
 * Private API adapter (Premium-only). Does not guess product/order JSON.
 * Health may ping GET /api/eshop (documented). stock/orders stay blocked
 * until a redacted live sample exists — no fictional mapping.
 */
export class ShoptetPrivateAdapter implements ShopAdapter {
  readonly source = "shoptet" as const;
  private readonly token: string | undefined;
  private readonly fetchImpl: typeof fetch;

  constructor(token: string | undefined, fetchImpl: typeof fetch = fetch) {
    this.token = token?.trim() ? token.trim() : undefined;
    this.fetchImpl = fetchImpl;
  }

  async health(): Promise<ShopHealth> {
    if (!this.token) {
      return { shop_connected: false, detail: "SHOP_TOKEN_MISSING" };
    }
    const res = await this.fetchImpl(`${SHOPTET_API_HOST}/eshop`, {
      method: "GET",
      headers: {
        "Shoptet-Private-API-Token": this.token,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      return { shop_connected: false, detail: `SHOP_HTTP_${res.status}` };
    }
    return { shop_connected: true, detail: "shoptet_eshop_ok" };
  }

  async stockLow(_threshold: number): Promise<StockItem[]> {
    throw Object.assign(new Error("Shoptet product mapping is not in MVP"), {
      code: "SHOP_MAPPING_BLOCKED",
    });
  }

  async ordersOpen(): Promise<OpenOrder[]> {
    throw Object.assign(new Error("Shoptet order mapping is not in MVP"), {
      code: "SHOP_MAPPING_BLOCKED",
    });
  }
}
