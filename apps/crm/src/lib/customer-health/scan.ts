import type { SupabaseClient } from "@supabase/supabase-js";
import {
  evaluateAgencyHealth,
  sortAgencyHealthResults,
} from "@/lib/customer-health/evaluate";
import { isPayingAgency } from "@/lib/customer-health/paid";
import { CUSTOMER_HEALTH_THRESHOLDS as T } from "@/lib/customer-health/thresholds";
import type { AgencyHealthResult } from "@/lib/customer-health/types";
import { isOperatorExcludedAgency } from "@/lib/operator/config";

type AgencyRow = {
  id: string;
  name: string;
  plan: string | null;
  manual_plan: string | null;
  subscription_status: string | null;
  account_tier: string | null;
  is_active: boolean | null;
};

type ProfileRow = {
  id: string;
  agency_id: string;
  auth_user_id: string | null;
  role: string | null;
};

function daysBetween(later: Date, earlier: Date): number {
  return (later.getTime() - earlier.getTime()) / (24 * 60 * 60 * 1000);
}

/**
 * Load auth.users.last_sign_in_at keyed by auth user id.
 * Join path for profiles MUST use auth_user_id — never profiles.id.
 */
export async function loadLastSignInByAuthUserId(
  admin: SupabaseClient,
): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users ?? [];
    for (const u of users) {
      map.set(u.id, u.last_sign_in_at ?? null);
    }
    if (users.length < perPage) break;
    page += 1;
    if (page > 50) break;
  }
  return map;
}

export async function scanCustomerHealth(
  admin: SupabaseClient,
  now = new Date(),
): Promise<AgencyHealthResult[]> {
  const { data: agencies, error: agenciesError } = await admin
    .from("agencies")
    .select("id, name, plan, manual_plan, subscription_status, account_tier, is_active");

  if (agenciesError) throw agenciesError;

  const active = ((agencies ?? []) as AgencyRow[]).filter(
    (a) => a.is_active !== false && !isOperatorExcludedAgency(a.id),
  );

  if (active.length === 0) return [];

  const agencyIds = active.map((a) => a.id);

  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("id, agency_id, auth_user_id, role")
    .in("agency_id", agencyIds);

  if (profilesError) throw profilesError;

  const profileRows = (profiles ?? []) as ProfileRow[];
  const lastSignIn = await loadLastSignInByAuthUserId(admin);

  const lastLeadByAgency = new Map<string, string>();
  for (const agencyId of agencyIds) {
    const { data: lead, error: leadError } = await admin
      .from("leads")
      .select("created_at")
      .eq("agency_id", agencyId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (leadError) throw leadError;
    if (lead?.created_at) lastLeadByAgency.set(agencyId, lead.created_at);
  }

  const cutoff30 = new Date(
    now.getTime() - T.DAYS_NO_TEAM_LOGIN_RED * 24 * 60 * 60 * 1000,
  );

  const results: AgencyHealthResult[] = [];

  for (const agency of active) {
    const team = profileRows.filter((p) => p.agency_id === agency.id);
    const lastLeadIso = lastLeadByAgency.get(agency.id);
    const daysSinceLastLead = lastLeadIso
      ? daysBetween(now, new Date(lastLeadIso))
      : null;

    const owners = team.filter((p) => {
      const role = (p.role ?? "").toLowerCase();
      return role === "owner" || role === "founder";
    });

    let daysSinceOwnerLogin: number | null = null;
    if (owners.length > 0) {
      let latest: Date | null = null;
      for (const o of owners) {
        // Join ONLY via auth_user_id — never profiles.id as auth uid.
        if (!o.auth_user_id) continue;
        const iso = lastSignIn.get(o.auth_user_id);
        if (!iso) continue;
        const d = new Date(iso);
        if (!latest || d > latest) latest = d;
      }
      if (latest) daysSinceOwnerLogin = daysBetween(now, latest);
      else daysSinceOwnerLogin = Number.POSITIVE_INFINITY;
    }

    let neverCount = 0;
    let anyTeamLoginWithin30d = false;
    for (const p of team) {
      if (!p.auth_user_id) {
        neverCount += 1;
        continue;
      }
      const iso = lastSignIn.get(p.auth_user_id);
      if (!iso) {
        neverCount += 1;
        continue;
      }
      const d = new Date(iso);
      if (d >= cutoff30) anyTeamLoginWithin30d = true;
    }

    const neverLoggedInShare = team.length === 0 ? 0 : neverCount / team.length;

    results.push(
      evaluateAgencyHealth({
        agencyId: agency.id,
        agencyName: agency.name,
        daysSinceLastLead,
        daysSinceOwnerLogin:
          daysSinceOwnerLogin === Number.POSITIVE_INFINITY
            ? 9999
            : daysSinceOwnerLogin,
        neverLoggedInShare,
        profileCount: team.length,
        anyTeamLoginWithin30d: team.length === 0 ? true : anyTeamLoginWithin30d,
        isPaying: isPayingAgency(agency),
      }),
    );
  }

  return sortAgencyHealthResults(results.filter((r) => r.severity !== null));
}
