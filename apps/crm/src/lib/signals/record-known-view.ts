/**
 * First-party view of a listing by a known contact.
 *
 * The public listing page knows the person only through a buyer intent.
 * The client sends that intent id and the property id. The lead id is read
 * on the server. A lead id in the request is ignored.
 */

import { isClosedLeadStatus } from "./return-signal";
import { recordRepeatView, type LooseDb } from "./write-return-step";

const ACTIVE_PROPERTY = new Set(["Aktivna", "Aktívna", "active", "Active"]);

export interface KnownViewResult {
  recorded: boolean;
  reason: string;
  agencyId?: string;
}

export async function recordKnownContactView(
  db: LooseDb,
  input: { intentId: string; propertyId: string },
): Promise<KnownViewResult> {
  const { data: intents, error: intentError } = await db
    .from("buyer_intents")
    .select("id, lead_id")
    .eq("id", input.intentId)
    .limit(1);
  if (intentError) return { recorded: false, reason: intentError.message };
  const intent = Array.isArray(intents) ? intents[0] : null;
  const leadId = intent?.lead_id ? String(intent.lead_id) : "";
  if (!leadId) return { recorded: false, reason: "unknown_intent" };

  const { data: leads, error: leadError } = await db
    .from("leads")
    .select("id, status, agency_id, assigned_profile_id")
    .eq("id", leadId)
    .limit(1);
  if (leadError) return { recorded: false, reason: leadError.message };
  const lead = Array.isArray(leads) ? leads[0] : null;
  if (!lead) return { recorded: false, reason: "unknown_lead" };
  if (isClosedLeadStatus(lead.status != null ? String(lead.status) : null)) {
    return { recorded: false, reason: "closed_lead" };
  }
  const profileId = lead.assigned_profile_id ? String(lead.assigned_profile_id) : "";
  const agencyId = lead.agency_id ? String(lead.agency_id) : "";
  if (!profileId || !agencyId) return { recorded: false, reason: "lead_without_broker" };

  const { data: props, error: propError } = await db
    .from("properties")
    .select("id, agency_id, status")
    .eq("id", input.propertyId)
    .limit(1);
  if (propError) return { recorded: false, reason: propError.message };
  const property = Array.isArray(props) ? props[0] : null;
  if (!property) return { recorded: false, reason: "unknown_property" };
  if (String(property.agency_id ?? "") !== agencyId) {
    return { recorded: false, reason: "other_agency" };
  }
  if (!ACTIVE_PROPERTY.has(String(property.status ?? ""))) {
    return { recorded: false, reason: "inactive_property" };
  }

  const { error: insertError } = await db.from("events").insert({
    profile_id: profileId,
    entity_type: "property",
    entity_id: input.propertyId,
    event_type: "property_viewed",
    payload: {
      lead_id: leadId,
      property_id: input.propertyId,
      source: "buyer_intent",
    },
  });
  if (insertError) return { recorded: false, reason: insertError.message };

  await recordRepeatView(db, { lead_id: leadId, property_id: input.propertyId });
  return { recorded: true, reason: "recorded", agencyId };
}
