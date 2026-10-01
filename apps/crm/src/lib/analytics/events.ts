import { trackGaEvent } from "@/lib/analytics/gtag";
import type { ValuationAbVariant } from "@/lib/valuation/ab-test";

export type ValuationAnalyticsContext = {
  ab_variant: ValuationAbVariant;
  agency_slug: string;
  session_id: string;
};

export function trackValuationAnalyticsEvent(
  eventName: string,
  ctx: ValuationAnalyticsContext,
  extra?: Record<string, string | number | boolean | undefined>,
): void {
  trackGaEvent(eventName, {
    ab_variant: ctx.ab_variant,
    agency_slug: ctx.agency_slug,
    session_id: ctx.session_id,
    ...extra,
  });
}
