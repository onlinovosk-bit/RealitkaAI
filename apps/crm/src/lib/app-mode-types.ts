/**
 * Revolis.AI - režim aplikácie (demo vs. produkčné dáta).
 */

export type AppMode = "demo" | "production";

export const APP_MODE_COOKIE = "revolis-app-mode";

export const APP_MODE_STORAGE_KEY = "revolis-app-mode";

/**
 * Typy udalostí pre AI Activity Feed (Gong-style).
 */
export type AiActivityType =
  | "matching"
  | "ghosting_recovery"
  | "bri_regional"
  | "bri_delta"
  | "scoring"
  | "insights"
  | "market_scan";

export interface AiActivityFeedItem {
  id: string;
  activityType: AiActivityType;
  /** Krátky nadpis pre timeline */
  title: string;
  /** Ľudsky čitateľný popis "prečo AI urobila krok" */
  body: string;
  createdAt: string;
  /** Voliteľné metadáta (leadId, propertyId, score, ...) */
  meta?: Record<string, string | number | undefined>;
}
