import type { Lead } from "@/lib/leads-store";
import { buildFallbackContactsFromProperties } from "@/lib/leads/contacts-fallback";

type AgencyLeadRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  budget: string;
  property_type: string;
  rooms: string;
  financing: string;
  timeline: string;
  source: string;
  status: string;
  score: number | null;
  assigned_agent: string;
  assigned_profile_id?: string | null;
  last_contact?: string | null;
  note?: string | null;
  client_segment?: string | null;
  buyer_readiness_score?: number | null;
  ai_insight?: string | null;
  sofia_insight?: string | null;
  ai_priority?: string | null;
  ai_reason?: string | null;
  ai_triage_at?: string | null;
  ai_priority_manual_at?: string | null;
  last_ai_followup_at?: string | null;
  ai_followup_count?: number | null;
};

export function mapAgencyLeadRow(row: AgencyLeadRow): Lead {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    location: row.location,
    budget: row.budget,
    propertyType: row.property_type,
    rooms: row.rooms,
    financing: row.financing,
    timeline: row.timeline,
    source: row.source,
    status: row.status as Lead["status"],
    score: Number(row.score ?? 0),
    assignedAgent: row.assigned_agent,
    assignedProfileId: row.assigned_profile_id ?? null,
    lastContact: row.last_contact || "Bez kontaktu",
    note: row.note || "",
    client_segment: row.client_segment ?? null,
    buyer_readiness_score: row.buyer_readiness_score ?? null,
    ai_insight: row.ai_insight ?? null,
    sofia_insight: row.sofia_insight ?? null,
    ai_engine: null,
    aiPriority: row.ai_priority ?? null,
    aiReason: row.ai_reason ?? null,
    aiTriageAt: row.ai_triage_at ?? null,
    aiPriorityManualAt: row.ai_priority_manual_at ?? null,
    lastAiFollowupAt: row.last_ai_followup_at ?? null,
    aiFollowupCount: row.ai_followup_count ?? 0,
  };
}

/**
 * Keď RLS vráti 0 leadov, načítaj tenant dáta cez service role (leads, potom contacts z properties).
 */
export async function resolveLeadsWithServiceFallback(input: {
  rlsLeads: Lead[];
  agencyId: string | null;
  isContactsView: boolean;
  fetchAgencyLeads: (agencyId: string) => Promise<AgencyLeadRow[]>;
  fetchPropertyContacts: (agencyId: string) => Promise<Parameters<typeof buildFallbackContactsFromProperties>[0]>;
}): Promise<Lead[]> {
  const { rlsLeads, agencyId, isContactsView, fetchAgencyLeads, fetchPropertyContacts } = input;

  if (rlsLeads.length > 0 || !agencyId) {
    return rlsLeads;
  }

  const agencyLeads = await fetchAgencyLeads(agencyId);
  if (agencyLeads.length > 0) {
    return agencyLeads.map(mapAgencyLeadRow);
  }

  if (!isContactsView) {
    return rlsLeads;
  }

  const propertyContacts = await fetchPropertyContacts(agencyId);
  if (propertyContacts.length === 0) {
    return rlsLeads;
  }

  return buildFallbackContactsFromProperties(propertyContacts);
}
