import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ValuationEstimateResult,
  ValuationPropertyInput,
} from "@/lib/valuation/types";

export type ValuationEstimateInsert = {
  agency_id: string;
  session_id: string | null;
  location: string;
  postal_code: string | null;
  sqm: number;
  rooms: number | null;
  floor: number | null;
  total_floors: number | null;
  year_built: number | null;
  land_sqm: number | null;
  property_type: string;
  estimate_min: number | null;
  estimate_mid: number | null;
  estimate_max: number | null;
  price_data_version: string | null;
  is_sandbox: boolean;
  lead_id: string | null;
};

/** Extract tenant slug from public widget referer (/odhad/{slug}). */
export function resolveAgencySlugFromReferer(referer: string | null): string | null {
  if (!referer) return null;
  try {
    const pathname = new URL(referer).pathname;
    const match = pathname.match(/^\/odhad\/([^/]+)\/?$/i);
    return match?.[1]?.trim().toLowerCase() ?? null;
  } catch {
    return null;
  }
}

export function buildValuationEstimateInsert(input: {
  agencyId: string;
  isSandbox: boolean;
  sessionId?: string;
  property: ValuationPropertyInput;
  estimate: ValuationEstimateResult;
  leadId?: string | null;
}): ValuationEstimateInsert {
  const low = estimateBandValue(input.estimate.low);
  const high = estimateBandValue(input.estimate.high);
  const mid =
    low != null && high != null ? Math.round((low + high) / 2) : null;

  return {
    agency_id: input.agencyId,
    session_id: input.sessionId?.trim().slice(0, 64) ?? null,
    location: input.property.location.trim().slice(0, 200),
    postal_code: input.property.postalCode?.trim().slice(0, 12) ?? null,
    sqm: input.property.sqm,
    rooms: input.property.rooms ?? null,
    floor: input.property.floor ?? null,
    total_floors: input.property.totalFloors ?? null,
    year_built: input.property.yearBuilt ?? null,
    land_sqm: input.property.landSqm ?? null,
    property_type: input.property.propertyType,
    estimate_min: low,
    estimate_mid: mid,
    estimate_max: high,
    price_data_version: input.estimate.sourceQuarter ?? null,
    is_sandbox: input.isSandbox,
    lead_id: input.leadId ?? null,
  };
}

function estimateBandValue(value: number | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Best-effort persistence — callers must not fail the widget response on error.
 */
export async function persistValuationEstimate(
  supabase: SupabaseClient,
  row: ValuationEstimateInsert,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("valuation_estimates").insert(row);
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
