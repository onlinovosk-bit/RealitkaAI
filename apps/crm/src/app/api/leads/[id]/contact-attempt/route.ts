import { z } from "zod";
import { errorResponse, okResponse } from "@/lib/api-response";
import { validateBody } from "@/lib/api-validate";
import { getCurrentProfile } from "@/lib/auth";
import { ContactEventValidationError, CONTACT_CHANNELS, CONTACT_OUTCOMES } from "@/lib/lead-contact-events/types";
import { recordContactAttempt } from "@/lib/lead-contact-events/store";
import { createClient } from "@/lib/supabase/server";
import { incrementUsageMetric } from "@/lib/usage-metrics";

export const dynamic = "force-dynamic";

/**
 * The closed vocabularies live in the substrate; this schema points at them
 * rather than restating them, so adding a channel cannot leave the API and the
 * store disagreeing about what a channel is.
 *
 * `outcome` is optional on purpose — see below.
 */
const ContactAttemptBody = z.object({
  channel: z.enum(CONTACT_CHANNELS),
  outcome: z.enum(CONTACT_OUTCOMES).optional(),
  note: z.string().trim().min(1).max(2000).optional(),
});

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
      return errorResponse("Profil nemá agentúru, ku ktorej by sa pokus priradil.", 403);
    }

    const { id: leadId } = await context.params;
    if (!leadId?.trim()) {
      return errorResponse("Chýba leadId.", 400);
    }

    const parsed = await validateBody(req, ContactAttemptBody);
    if (!parsed.ok) return parsed.response;

    const supabase = await createClient();
    const { id } = await recordContactAttempt(supabase, {
      agencyId: profile.agency_id,
      leadId: leadId.trim(),
      actorProfileId: profile.id,
      occurredAt: new Date(),
      channel: parsed.data.channel,
      outcome: parsed.data.outcome,
      source: "manual",
      note: parsed.data.note,
    });

    // After the write, never before: a counter must not be able to report an
    // attempt that was not recorded. It swallows its own failures internally,
    // so it cannot turn a recorded attempt into a 500 either.
    await incrementUsageMetric({
      agencyId: profile.agency_id,
      metric: "lead_contact_attempt",
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
