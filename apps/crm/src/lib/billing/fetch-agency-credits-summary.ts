import type { SupabaseClient } from "@supabase/supabase-js";
import { getAgencyIdForAuthUser } from "@/lib/auth";
import {
  monthlyAgencyGrantCredits,
  parseSeatTier,
  type SeatTier,
} from "@/lib/program-tier-pricing";

export type AgencyCreditsSummary = {
  creditsBalance: number;
  grantBalance: number;
  purchasedBalance: number;
  monthlyGrantCredits: number;
};

function seatTierFromAccountTier(accountTier: string | null): SeatTier {
  switch (accountTier) {
    case "starter":
    case "free":
      return "solo";
    case "enterprise":
      return "office";
    default:
      return parseSeatTier(accountTier);
  }
}

export async function fetchAgencyCreditsSummary(
  supabase: SupabaseClient,
  authUserId: string,
): Promise<AgencyCreditsSummary | null> {
  const agencyId = await getAgencyIdForAuthUser(supabase, authUserId);
  if (!agencyId) return null;

  const { data, error } = await supabase
    .from("agencies")
    .select(
      "credits_balance, grant_credits_balance, purchased_credits_balance, seats, account_tier, owner_cockpit_active",
    )
    .eq("id", agencyId)
    .maybeSingle();

  if (error || !data) return null;

  const seatTier = seatTierFromAccountTier(data.account_tier ?? null);
  const seatCount = data.seats ?? 1;

  return {
    creditsBalance: data.credits_balance ?? 0,
    grantBalance: data.grant_credits_balance ?? 0,
    purchasedBalance: data.purchased_credits_balance ?? 0,
    monthlyGrantCredits: monthlyAgencyGrantCredits({
      seatTier,
      seatCount,
      ownerCockpitActive: Boolean(data.owner_cockpit_active),
    }),
  };
}
