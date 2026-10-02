/**
 * Shared types for the three ONLINOVO agentic roles (docs/onlinovo/ONL-AGENTS-P08-AGENT-SPECS.md).
 * Pure data. No I/O, no LLM, no network.
 */

export type AgentId = "ONL-REVENUE-OPPORTUNITY" | "ONL-CUSTOMER-NEXT-ACTION" | "ONL-EXPERIMENT";

/** FACT comes from data. ESTIMATE is computed from explicit assumptions. INFERENCE never becomes a FACT silently. */
export type EvidenceKind = "FACT" | "ESTIMATE" | "ASSUMPTION" | "INFERENCE";

export interface Evidence {
  kind: EvidenceKind;
  key: string;
  value: string | number | boolean | null;
  source: string;
}

export type Confidence = "high" | "medium" | "low";

/** Maps to the numeric confidence the Control Contract authority engine expects (minConfidence 0.6). */
export const CONFIDENCE_SCORE: Record<Confidence, number> = { high: 0.9, medium: 0.7, low: 0.4 };

export type PolicyStatus = "AUTONOMOUS" | "APPROVAL_REQUIRED";

/** Honest source label. There is deliberately no "shoptet" or "leadhub" here: neither is connected. */
export type DataSourceName = "fixture" | "unconnected";

export type OrderStatus = "fulfilled" | "unpaid" | "cancelled" | "uncollected_cod" | "other";

export interface OrderLine {
  sku: string;
  /** Fragrance family key, e.g. "boreal". */
  family: string;
  size_ml: number | null;
  units: number;
  net_revenue: number;
  /** null = UNKNOWN. Never guessed. */
  net_cost: number | null;
}

export interface OrderRecord {
  order_ref: string;
  /** Pseudonymous reference. Never an e-mail or a phone number. */
  customer_ref: string;
  placed_at: string;
  status: OrderStatus;
  lines: OrderLine[];
}

export interface ProductRecord {
  sku: string;
  family: string;
  size_ml: number | null;
  list_price_gross: number | null;
  unit_cost_net: number | null;
  /** null = UNKNOWN. */
  in_stock: boolean | null;
}

export type Consent = "marketing_ok" | "unknown" | "opted_out";

export interface Intervention {
  action: string;
  at: string;
}

export interface CustomerRecord {
  customer_ref: string;
  consent: Consent;
  interventions: Intervention[];
}

export interface RevenueSnapshot {
  source: DataSourceName;
  /** ISO timestamp of the data, not of the request. */
  as_of: string;
  customers: CustomerRecord[];
  orders: OrderRecord[];
  products: ProductRecord[];
}

export class AgentError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(`${code}: ${message}`);
    this.name = "AgentError";
    this.code = code;
  }
}
