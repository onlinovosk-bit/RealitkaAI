import { errorResponse, okResponse } from "@/lib/api-response";
import { getCurrentProfile } from "@/lib/auth";
import {
  CONTACT_CHANNELS,
  CONTACT_OUTCOMES,
  ContactEventValidationError,
  type ContactChannel,
  type ContactOutcome,
} from "@/lib/lead-contact-events/types";
import { recordContactAttempt } from "@/lib/lead-contact-events/store";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST — record that a human tried to reach this lead.
 *
 * Deliberately NOT `/api/ai/lead-events`. That route is gated behind
 * `isEnterpriseSalesIntelligenceEnabled()`, and putting a contact attempt
 * behind it would make C1 (preheated) measurable only for Enterprise tenants —
 * so the funnel numbers would be a property of the price list rather than of
 * the work. A contact attempt is not intelligence; it is the most basic CRM
 * fact there is, and every plan records it.
 *
 * What this endpoint claims, and what it refuses to claim:
 *
 *   claims    a human pressed Call or Email at this time, on this channel
 *   refuses   that the lead answered, replied, or was reached at all
 *
 * So `outcome` is optional and is left unset by the UI. The substrate models
 * that as unknown rather than as a negative, which is the whole reason it has
 * three states.
 *
 * `occurred_at` is taken from the server clock, never from the request. A
 * client-supplied timestamp is a client-controlled funnel metric, and the
 * substrate would accept it: it only rejects times more than five minutes in
 * the future.
 */
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return errorResponse("Unauthorized", 401);
    }
    if (!profile.agency_id) {
      // A profile with no agency has no tenant to attribute the attempt to,
      // and the substrate would have to invent one.
      return errorResponse("Profil nemá agentúru, k ktorej by sa pokus priradil.", 403);
    }

    const { id: leadId } = await context.params;
    if (!leadId?.trim()) {
      return errorResponse("Chýba leadId.", 400);
    }

    const body = (await req.json().catch(() => ({}))) as {
      channel?: string;
      outcome?: string;
      note?: string;
    };

    const channel = body.channel?.trim();
    if (!channel || !CONTACT_CHANNELS.includes(channel as ContactChannel)) {
      return errorResponse(
        `Neplatný channel. Povolené: ${CONTACT_CHANNELS.join(", ")}.`,
        400,
      );
    }

    const outcome = body.outcome?.trim();
    if (outcome && !CONTACT_OUTCOMES.includes(outcome as ContactOutcome)) {
      return errorResponse(
        `Neplatný outcome. Povolené: ${CONTACT_OUTCOMES.join(", ")}.`,
        400,
      );
    }

    const supabase = await createClient();
    const { id } = await recordContactAttempt(supabase, {
      agencyId: profile.agency_id,
      leadId: leadId.trim(),
      actorProfileId: profile.id,
      occurredAt: new Date(),
      channel: channel as ContactChannel,
      outcome: outcome ? (outcome as ContactOutcome) : undefined,
      source: "manual",
      note: body.note?.trim() || undefined,
    });

    return okResponse({ eventId: id });
  } catch (error) {
    if (error instanceof ContactEventValidationError) {
      // Cross-tenant and unknown-lead both land here; neither is a server fault.
      return errorResponse(error.message, 400);
    }
    return errorResponse(
      error instanceof Error ? error.message : "Pokus o kontakt sa nepodarilo zaznamenať.",
      500,
    );
  }
}
