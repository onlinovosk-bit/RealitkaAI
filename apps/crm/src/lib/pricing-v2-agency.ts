/**
 * Cenník v2 (W3-fix): stav v2 predplatného kancelárie z EXISTUJÚCEHO zdroja (`agencies.pricing_model`,
 * `agencies.pricing_band`, ktoré plní webhook vetvy A). Žiadny nový endpoint, žiadny zápis.
 * Volá sa LEN pri zapnutom prepínači (pred migráciou stĺpce nemusia existovať; chyba = legacy).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { PRICING_V2_BAND_IDS, type PricingV2BandId } from "@/lib/pricing-v2";
import { PRICING_V2_AGENCY_MODEL } from "@/lib/pricing-v2-contract";

export type AgencyPricingV2 = { bandId: PricingV2BandId | null };

/** Čistá funkcia: riadok `agencies` -> v2 stav alebo null (legacy / neznáme / nečitateľné = legacy). */
export function parseAgencyPricingV2(
  row: { pricing_model?: unknown; pricing_band?: unknown } | null | undefined,
): AgencyPricingV2 | null {
  if (!row || row.pricing_model !== PRICING_V2_AGENCY_MODEL) return null;
  const band = (PRICING_V2_BAND_IDS as readonly unknown[]).includes(row.pricing_band)
    ? (row.pricing_band as PricingV2BandId)
    : null;
  return { bandId: band };
}

export async function fetchAgencyPricingV2(supabase: SupabaseClient, agencyId: string): Promise<AgencyPricingV2 | null> {
  try {
    const { data, error } = await supabase
      .from("agencies")
      .select("pricing_model, pricing_band")
      .eq("id", agencyId)
      .maybeSingle();
    if (error) return null;
    return parseAgencyPricingV2(data);
  } catch {
    return null;
  }
}
