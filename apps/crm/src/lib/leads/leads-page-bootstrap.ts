import { listLeads } from "@/lib/leads-store";
import {
  linkProfileToAuthUser,
  resolveProfileForAuthUser,
} from "@/lib/profiles/resolve-profile-for-auth";
import type { SupabaseClient } from "@supabase/supabase-js";

export type LeadsPageBootstrap = {
  profileMissingAgency: boolean;
  initialLeadCount?: number;
};

/** SSR hint pre LeadsPageClient (skutočný zoznam sa načíta v prehliadači). */
export async function bootstrapLeadsPage(
  supabase: SupabaseClient,
): Promise<LeadsPageBootstrap> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { profileMissingAgency: false };
  }

  await linkProfileToAuthUser(supabase, user.id, user.email);

  const { profileMissingAgency } = await resolveProfileForAuthUser(
    supabase,
    user.id,
    "agency_id",
  );

  const leads = await listLeads(undefined, supabase);

  return {
    profileMissingAgency,
    initialLeadCount: leads.length,
  };
}
