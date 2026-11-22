import type { SupabaseClient } from "@supabase/supabase-js";
import type { BuyerIntent } from "@/lib/buyer-intent";

const INTENT_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Load a buyer_intent for the public /nehnutelnosti personalization banner.
 *
 * `createAdminClient()` (service role) bypasses tenant RLS on `buyer_intents`.
 * Agency scope MUST be applied here via `leads!inner(agency_id)` — otherwise
 * any UUID in `?intentId=` can render another tenant's focus text / budget.
 */
export async function fetchPublicBuyerIntent(
  client: SupabaseClient,
  intentId: string,
  agencyId: string,
): Promise<BuyerIntent | null> {
  if (!INTENT_ID_RE.test(intentId) || !agencyId) return null;

  const { data, error } = await client
    .from("buyer_intents")
    .select(
      "id, lead_id, deal_type, property_type, primary_city, budget_min, budget_max, time_horizon_months, new_build_only, needs_mortgage_help, raw_focus_text, client_segment, buyer_readiness_score, created_at, updated_at, leads!inner(agency_id)",
    )
    .eq("id", intentId)
    .eq("leads.agency_id", agencyId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    leadId: data.lead_id,
    dealType: data.deal_type,
    propertyType: data.property_type,
    primaryCity: data.primary_city,
    budgetMin: data.budget_min,
    budgetMax: data.budget_max,
    timeHorizonMonths: data.time_horizon_months,
    newBuildOnly: data.new_build_only,
    needsMortgageHelp: data.needs_mortgage_help,
    rawFocusText: data.raw_focus_text,
    clientSegment: data.client_segment,
    buyerReadinessScore: data.buyer_readiness_score,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  } as BuyerIntent;
}
