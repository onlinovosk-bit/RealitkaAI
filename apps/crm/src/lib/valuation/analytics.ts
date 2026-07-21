import type { ValuationAbVariant } from "@/lib/valuation/ab-test";
import {
  trackValuationAnalyticsEvent,
  type ValuationAnalyticsContext,
} from "@/lib/analytics/events";

function ctx(
  tenantSlug: string,
  abVariant: ValuationAbVariant,
  sessionId: string,
): ValuationAnalyticsContext {
  return {
    ab_variant: abVariant,
    agency_slug: tenantSlug,
    session_id: sessionId,
  };
}

export function trackValuationStarted(
  tenantSlug: string,
  abVariant: ValuationAbVariant,
  sessionId: string,
): void {
  trackValuationAnalyticsEvent("valuation_started", ctx(tenantSlug, abVariant, sessionId));
}

export function trackValuationStepCompleted(
  tenantSlug: string,
  abVariant: ValuationAbVariant,
  sessionId: string,
  stepName: string,
): void {
  trackValuationAnalyticsEvent("step_completed", ctx(tenantSlug, abVariant, sessionId), {
    step_name: stepName,
  });
}

export function trackValuationShown(
  tenantSlug: string,
  abVariant: ValuationAbVariant,
  sessionId: string,
  hasEstimate: boolean,
): void {
  trackValuationAnalyticsEvent("valuation_shown", ctx(tenantSlug, abVariant, sessionId), {
    has_estimate: hasEstimate,
  });
}

export function trackValuationContactSubmitted(
  tenantSlug: string,
  abVariant: ValuationAbVariant,
  sessionId: string,
): void {
  trackValuationAnalyticsEvent("contact_submitted", ctx(tenantSlug, abVariant, sessionId));
}

export function trackValuationLeadSubmitted(
  tenantSlug: string,
  abVariant: ValuationAbVariant,
  sessionId: string,
  propertyType: string,
): void {
  trackValuationAnalyticsEvent("lead_submitted", ctx(tenantSlug, abVariant, sessionId), {
    source: "valuation_widget",
    property_type: propertyType,
  });
}

export function trackValuationAbandon(
  tenantSlug: string,
  abVariant: ValuationAbVariant,
  sessionId: string,
  lastStep: string,
): void {
  trackValuationAnalyticsEvent("abandon", ctx(tenantSlug, abVariant, sessionId), {
    last_step: lastStep,
  });
}
