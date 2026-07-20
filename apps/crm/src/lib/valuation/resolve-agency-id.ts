import type { SupabaseClient } from "@supabase/supabase-js";
import type { ValuationAgencyConfig } from "@/lib/valuation/agency-config";

/** Config agencyId first, then DB lookup by slug (for tenants not yet in env). */
export async function resolveValuationAgencyId(
  supabase: SupabaseClient,
  agency: ValuationAgencyConfig,
): Promise<string | null> {
  if (agency.agencyId) return agency.agencyId;

  const { data, error } = await supabase
    .from("agencies")
    .select("id")
    .eq("slug", agency.slug)
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
}
