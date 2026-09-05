import { trackGaEvent } from "@/lib/analytics/gtag";

export type SprievodcaAnalyticsContext = {
  agency_slug: string;
  session_id: string;
};

function track(
  eventName: string,
  ctx: SprievodcaAnalyticsContext,
  extra?: Record<string, string | number | boolean | undefined>,
): void {
  trackGaEvent(eventName, {
    agency_slug: ctx.agency_slug,
    session_id: ctx.session_id,
    ...extra,
  });
}

export function trackSprievodcaStarted(
  agencySlug: string,
  sessionId: string,
): void {
  track("sprievodca_started", { agency_slug: agencySlug, session_id: sessionId });
}

export function trackSprievodcaSubmitted(
  agencySlug: string,
  sessionId: string,
  dealType: string,
  propertyType: string,
): void {
  track(
    "sprievodca_submitted",
    { agency_slug: agencySlug, session_id: sessionId },
    { deal_type: dealType, property_type: propertyType },
  );
}

export function trackResultsShown(
  agencySlug: string,
  sessionId: string,
  resultCount: number,
): void {
  track(
    "results_shown",
    { agency_slug: agencySlug, session_id: sessionId },
    { result_count: resultCount },
  );
}

export function trackResultsEmpty(
  agencySlug: string,
  sessionId: string,
  dealType: string,
  propertyType: string,
): void {
  track(
    "results_empty",
    { agency_slug: agencySlug, session_id: sessionId },
    { deal_type: dealType, property_type: propertyType },
  );
}

export function trackUnknownSectionShown(
  agencySlug: string,
  sessionId: string,
  unknownCount: number,
): void {
  track(
    "unknown_section_shown",
    { agency_slug: agencySlug, session_id: sessionId },
    { unknown_count: unknownCount },
  );
}

export function trackListingClicked(
  agencySlug: string,
  sessionId: string,
  listingPosition: number,
): void {
  track(
    "listing_clicked",
    { agency_slug: agencySlug, session_id: sessionId },
    { listing_position: listingPosition },
  );
}
