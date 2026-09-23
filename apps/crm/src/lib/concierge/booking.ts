/**
 * N10 — Concierge booking wrapper around scheduled_events idempotency.
 * Does not invent slots; callers must supply startsAt/endsAt from freebusy.
 */

import { buildScheduledEventIdempotencyKey } from "@/lib/scheduled-events/store";
import type { ScheduledEventInput } from "@/lib/scheduled-events/types";

export type ConciergeBookingDraft = {
  agencyId: string;
  profileId: string;
  leadId?: string | null;
  propertyId?: string | null;
  title: string;
  startsAt: string;
  endsAt: string;
  timezone?: string;
  location?: string;
  description?: string;
};

export function toScheduledEventInput(
  draft: ConciergeBookingDraft,
): ScheduledEventInput {
  return {
    leadId: draft.leadId ?? null,
    propertyId: draft.propertyId ?? null,
    eventType: "viewing",
    title: draft.title.slice(0, 200),
    description: draft.description ?? "Concierge booking",
    location: draft.location ?? "",
    startsAt: draft.startsAt,
    endsAt: draft.endsAt,
    timezone: draft.timezone ?? "Europe/Bratislava",
    meta: { source: "website-concierge" },
  };
}

export function conciergeBookingIdempotencyKey(
  draft: ConciergeBookingDraft,
): string {
  return buildScheduledEventIdempotencyKey(
    draft.agencyId,
    toScheduledEventInput(draft),
  );
}
