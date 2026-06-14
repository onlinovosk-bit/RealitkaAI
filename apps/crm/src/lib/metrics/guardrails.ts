/**
 * Founder guardrail bands — @see apps/crm/docs/pricing-v1.md
 */
export const METRICS_GUARDRAILS = {
  cockpitAttachMinPct: 40,
  nrrMinPct: 110,
  creditRevenueMinPct: 10,
  creditRevenueMaxPct: 25,
} as const;

export type GuardrailBand = "pass" | "warn" | "fail" | "unavailable";

export function bandCockpitAttach(pct: number | null): GuardrailBand {
  if (pct == null || Number.isNaN(pct)) return "unavailable";
  return pct >= METRICS_GUARDRAILS.cockpitAttachMinPct ? "pass" : "fail";
}

export function bandNrr(pct: number | null): GuardrailBand {
  if (pct == null || Number.isNaN(pct)) return "unavailable";
  return pct >= METRICS_GUARDRAILS.nrrMinPct ? "pass" : "fail";
}

export function bandCreditRevenuePct(pct: number | null): GuardrailBand {
  if (pct == null || Number.isNaN(pct)) return "unavailable";
  const { creditRevenueMinPct, creditRevenueMaxPct } = METRICS_GUARDRAILS;
  if (pct >= creditRevenueMinPct && pct <= creditRevenueMaxPct) return "pass";
  if (pct < creditRevenueMinPct - 5 || pct > creditRevenueMaxPct + 5) return "fail";
  return "warn";
}
