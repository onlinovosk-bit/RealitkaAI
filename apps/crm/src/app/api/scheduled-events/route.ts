import { errorResponse, okResponse } from "@/lib/api-response";
import { createActivity } from "@/lib/activities-store";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  createScheduledEvent,
  leadBelongsToAgency,
  listScheduledEvents,
  propertyBelongsToAgency,
} from "@/lib/scheduled-events/store";
import {
  validateListQuery,
  validateScheduledEventInput,
} from "@/lib/scheduled-events/validation";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return errorResponse("Neautorizovaný prístup.", 401);
  }

  const parsedQuery = validateListQuery(new URL(request.url).searchParams);
  if (!parsedQuery.ok) {
    return errorResponse(parsedQuery.error, 400);
  }

  const events = await listScheduledEvents(parsedQuery.value, supabase);
  return okResponse({ events });
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return errorResponse("Neautorizovaný prístup.", 401);
  }
  if (!profile.agency_id) {
    return errorResponse("Profil nemá priradenú agentúru.", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Neplatné JSON telo.", 400);
  }

  const parsed = validateScheduledEventInput(body);
  if (!parsed.ok) {
    return errorResponse(parsed.error, 400);
  }

  const input = parsed.value;
  const supabase = await createClient();

  if (input.leadId) {
    const ok = await leadBelongsToAgency(
      input.leadId,
      profile.agency_id,
      supabase,
    );
    if (!ok) {
      return errorResponse("Lead nepatrí do vašej agentúry.", 403);
    }
  }

  if (input.propertyId) {
    const ok = await propertyBelongsToAgency(
      input.propertyId,
      profile.agency_id,
      supabase,
    );
    if (!ok) {
      return errorResponse("Nehnuteľnosť nepatrí do vašej agentúry.", 403);
    }
  }

  try {
    const event = await createScheduledEvent(
      profile.agency_id,
      profile.id,
      input,
      supabase,
    );

    if (event.leadId) {
      await createActivity({
        leadId: event.leadId,
        type: "Kalendár",
        title: "Naplánovaná udalosť",
        text: `${event.title} — ${new Date(event.startsAt).toLocaleString("sk-SK")}`,
        entityType: "scheduled_event",
        entityId: event.id,
        actorName: profile.full_name || "Maklér",
        source: "scheduled-events",
        severity: "info",
        meta: {
          eventType: event.eventType,
          status: event.status,
          location: event.location,
        },
      });
    }

    return okResponse({ event }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nepodarilo sa vytvoriť udalosť.";
    return errorResponse(message, 400);
  }
}
