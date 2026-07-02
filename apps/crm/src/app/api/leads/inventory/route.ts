import { okResponse, errorResponse } from "@/lib/api-response";
import { listLeads } from "@/lib/leads-store";
import { resolveLeadsWithServiceFallback } from "@/lib/leads/resolve-leads-inventory-fallback";
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
    user.email,
  );

  const [leads, teams, profiles] = await Promise.all([
    listLeads(undefined, supabase),
    listTeams(supabase),
    listProfiles(supabase),
  ]);

  const service = createServiceRoleClient();
  const safeLeads = await resolveLeadsWithServiceFallback({
    rlsLeads: leads,
    agencyId: profile?.agency_id ?? null,
    isContactsView,
    fetchAgencyLeads: async (agencyId) => {
      if (!service) return [];
      const { data } = await service
        .from("leads")
        .select("*")
        .eq("agency_id", agencyId)
        .order("score", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(500);
      return Array.isArray(data) ? data : [];
    },
    fetchPropertyContacts: async (agencyId) => {
      if (!service) return [];
      const { data } = await service
        .from("properties")
        .select(
          "id, title, location, type, rooms, owner_name, owner_phone, broker_name, broker_email, broker_phone, created_at",
        )
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false })
        .limit(500);
      return Array.isArray(data) ? data : [];
    },
  });

  return okResponse({
    inventory: {
      leads: safeLeads,
      teams: teams.map((team) => ({ id: team.id, name: team.name })),
      profiles: profiles.map((profileRow) => ({
        id: profileRow.id,
        teamId: profileRow.teamId,
        fullName: profileRow.fullName,
        isActive: profileRow.isActive,
      })),
    },
  });
}
