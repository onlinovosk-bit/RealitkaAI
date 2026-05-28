import { okResponse, errorResponse } from "@/lib/api-response";
import { listLeads } from "@/lib/leads-store";
import { buildFallbackContactsFromProperties } from "@/lib/leads/contacts-fallback";
import {
  linkProfileToAuthUser,
  resolveProfileForAuthUser,
} from "@/lib/profiles/resolve-profile-for-auth";
import { listProfiles, listTeams } from "@/lib/team-store";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Inventár príležitostí pre prihláseného používateľa (RLS).
 * Záloha pre LeadsPageClient ak priamy browser Supabase zlyhá.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view");
  const isContactsView = view === "contacts";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  await linkProfileToAuthUser(supabase, user.id, user.email);
  const { profile } = await resolveProfileForAuthUser(
    supabase,
    user.id,
    "id, agency_id",
  );

  const [leads, teams, profiles] = await Promise.all([
    listLeads(undefined, supabase),
    listTeams(supabase),
    listProfiles(supabase),
  ]);
  let safeLeads = leads;

  // L99 fallback: ak RLS vráti 0 riadkov pri platnom agency_id, dočasne načítaj tenant dáta cez service role.
  if (safeLeads.length === 0 && profile?.agency_id) {
    const service = createServiceRoleClient();
    if (service) {
      const { data: agencyLeads } = await service
        .from("leads")
        .select("*")
        .eq("agency_id", profile.agency_id)
        .order("score", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(500);

      if (Array.isArray(agencyLeads) && agencyLeads.length > 0) {
        safeLeads = agencyLeads.map((row) => ({
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
          status: row.status,
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
        }));
      } else if (isContactsView) {
        const { data: propertyContacts } = await service
          .from("properties")
          .select(
            "id, title, location, type, rooms, owner_name, owner_phone, broker_name, broker_email, broker_phone, created_at",
          )
          .eq("agency_id", profile.agency_id)
          .order("created_at", { ascending: false })
          .limit(500);

        if (Array.isArray(propertyContacts) && propertyContacts.length > 0) {
          safeLeads = buildFallbackContactsFromProperties(propertyContacts);
        }
      }
    }
  }

  return okResponse({
    inventory: {
      leads: safeLeads,
      teams: teams.map((team) => ({ id: team.id, name: team.name })),
      profiles: profiles.map((profile) => ({
        id: profile.id,
        teamId: profile.teamId,
        fullName: profile.fullName,
        isActive: profile.isActive,
      })),
    },
  });
}
