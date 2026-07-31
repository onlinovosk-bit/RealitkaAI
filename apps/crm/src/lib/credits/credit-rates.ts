/**
 * Single source of truth for credit consumption rates (Vlna 2A).
 * Call-site wiring is Wave 3 — founder decides which actions spend credits.
 *
 * Rationale for LEAD_UNLOCK=20: docs/pricing/2026-07-31-kreditovy-model-5-strategii.md
 * (Kamzík ~300 €/tip; 20 credits ≈ 17,20 € at ~0,86 €/credit).
 */
export const CREDIT_RATE_CODES = [
  "LEAD_UNLOCK",
  "AI_ANALYSIS",
  "AI_EMAIL",
  "LISTING_DESCRIPTION",
] as const;

export type CreditRateCode = (typeof CREDIT_RATE_CODES)[number];

export const CREDIT_RATES = {
  LEAD_UNLOCK: 20,
  AI_ANALYSIS: 1,
  AI_EMAIL: 1,
  LISTING_DESCRIPTION: 2,
} as const satisfies Record<CreditRateCode, number>;

export function getCreditRate(code: CreditRateCode): number {
  return CREDIT_RATES[code];
}
