import { errorResponse, okResponse } from "@/lib/api-response";
import { createActivity } from "@/lib/activities-store";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  deleteScheduledEvent,
  getScheduledEventById,
  leadBelongsToAgency,
  propertyBelongsToAgency,
  updateScheduledEvent,
} from "@/lib/scheduled-events/store";
import { validateScheduledEventUpdate } from "@/lib/scheduled-events/validation";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return errorResponse("Neautorizovaný prístup.", 401);
  }

  const { id } = await context.params;
  const event = await getScheduledEventById(id, supabase);
  if (!event) {
    return errorResponse("Udalosť neexistuje.", 404);
  }

  return okResponse({ event });
}

export async function PATCH(request: Request, context: RouteContext) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return errorResponse("Neautorizovaný prístup.", 401);
  }
  if (!profile.agency_id) {
    return errorResponse("Profil nemá priradenú agentúru.", 403);
  }

  const { id } = await context.params;
  const supabase = await createClient();

  const existing = await getScheduledEventById(id, supabase);
  if (!existing) {
    return errorResponse("Udalosť neexistuje.", 404);
  }
  if (existing.agencyId !== profile.agency_id) {
    return errorResponse("Zakázaný prístup.", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Neplatné JSON telo.", 400);
  }

  const parsed = validateScheduledEventUpdate(body);
  if (!parsed.ok) {
    return errorResponse(parsed.error, 400);
  }

  const patch = parsed.value;

  if (patch.leadId) {
    const ok = await leadBelongsToAgency(
      patch.leadId,
      profile.agency_id,
      supabase,
    );
    if (!ok) {
      return errorResponse("Lead nepatrí do vašej agentúry.", 403);
    }
  }

  if (patch.propertyId) {
    const ok = await propertyBelongsToAgency(
      patch.propertyId,
      profile.agency_id,
      supabase,
    );
    if (!ok) {
      return errorResponse("Nehnuteľnosť nepatrí do vašej agentúry.", 403);
    }
  }

  const mergedStarts = patch.startsAt ?? existing.startsAt;
  const mergedEnds = patch.endsAt ?? existing.endsAt;
  if (Date.parse(mergedEnds) <= Date.parse(mergedStarts)) {
    return errorResponse("endsAt musí byť po startsAt.", 400);
  }

  try {
    const event = await updateScheduledEvent(id, patch, supabase);

    const leadId = event.leadId ?? existing.leadId;
    if (leadId) {
      const activityTitle =
        event.status === "cancelled"
          ? "Zrušená udalosť"
          : event.status === "confirmed"
            ? "Potvrdená udalosť"
            : "Upravená udalosť";

      await createActivity({
        leadId,
        type: "Kalendár",
        title: activityTitle,
        text: `${event.title} — ${new Date(event.startsAt).toLocaleString("sk-SK")}`,
        entityType: "scheduled_event",
        entityId: event.id,
        actorName: profile.full_name || "Maklér",
        source: "scheduled-events",
        severity: event.status === "cancelled" ? "warning" : "info",
        meta: { eventType: event.eventType, status: event.status },
      });
    }

    return okResponse({ event });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nepodarilo sa upraviť udalosť.";
    return errorResponse(message, 400);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return errorResponse("Neautorizovaný prístup.", 401);
  }
  if (!profile.agency_id) {
    return errorResponse("Profil nemá priradenú agentúru.", 403);
  }

  const { id } = await context.params;
  const supabase = await createClient();

  const existing = await getScheduledEventById(id, supabase);
  if (!existing) {
    return errorResponse("Udalosť neexistuje.", 404);
  }
  if (existing.agencyId !== profile.agency_id) {
    return errorResponse("Zakázaný prístup.", 403);
  }

  try {
    await deleteScheduledEvent(id, supabase);

    if (existing.leadId) {
      await createActivity({
        leadId: existing.leadId,
        type: "Kalendár",
        title: "Zmazaná udalosť",
        text: `${existing.title} bola odstránená z kalendára.`,
        entityType: "scheduled_event",
        entityId: id,
        actorName: profile.full_name || "Maklér",
        source: "scheduled-events",
        severity: "warning",
      });
    }

    return okResponse({ deleted: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nepodarilo sa zmazať udalosť.";
    return errorResponse(message, 400);
  }
}
