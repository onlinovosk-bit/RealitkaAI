import { okResponse, errorResponse } from "@/lib/api-response";
import { listLeads } from "@/lib/leads-store";
import { linkProfileToAuthUser } from "@/lib/profiles/resolve-profile-for-auth";
import { listProfiles, listTeams } from "@/lib/team-store";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Inventár príležitostí pre prihláseného používateľa (RLS).
 * Záloha pre LeadsPageClient ak priamy browser Supabase zlyhá.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  await linkProfileToAuthUser(supabase, user.id, user.email);

  const [leads, teams, profiles] = await Promise.all([
    listLeads(undefined, supabase),
    listTeams(supabase),
    listProfiles(supabase),
  ]);

  return okResponse({
    inventory: {
      leads,
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
