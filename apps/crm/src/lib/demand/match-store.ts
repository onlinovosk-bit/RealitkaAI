/**
 * DEMAND-D4 persistence. Reads the agency's own listings, runs the pure engine,
 * writes one row per match keyed by the demand record it came from.
 *
 * Off by default: `DEMAND_MATCHING_ENABLED=true` is its own production switch,
 * separate from extraction, so D1 can run (and be measured) without D4 writing.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Demand } from "./contract";
import { DEMAND_MATCH_ENGINE, matchDemand, type MatchRun, type PropertyForMatch } from "./match";

export function demandMatchingEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.DEMAND_MATCHING_ENABLED === "true";
}

const PROPERTY_COLUMNS = "id, type, location, price, rooms_count, usable_area, transaction_type, status";

export async function loadAgencyProperties(
  admin: SupabaseClient,
  agencyId: string,
): Promise<PropertyForMatch[]> {
  const { data, error } = await admin
    .from("properties")
    .select(PROPERTY_COLUMNS)
    .eq("agency_id", agencyId)
    .limit(5000);
  if (error) throw new Error(`properties: ${error.message}`);
  return (data ?? []) as PropertyForMatch[];
}

export type MatchPersistResult = MatchRun & { written: number; error?: string };

export async function runDemandMatching(
  admin: SupabaseClient,
  input: { agencyId: string; leadId: string; demandRecordId: string; demand: Demand },
  opts: { write: boolean } = { write: true },
): Promise<MatchPersistResult> {
  const properties = await loadAgencyProperties(admin, input.agencyId);
  const run = matchDemand(input.demand, properties);
  if (!run.ok || run.matches.length === 0 || !opts.write) return { ...run, written: 0 };

  const rows = run.matches.map((m) => ({
    agency_id: input.agencyId,
    lead_id: input.leadId,
    demand_record_id: input.demandRecordId,
    property_id: m.property_id,
    score: m.score,
    fields: m.fields,
    engine: DEMAND_MATCH_ENGINE,
  }));
  const { error } = await admin
    .from("demand_property_matches")
    .upsert(rows, { onConflict: "demand_record_id,property_id" });
  return error ? { ...run, written: 0, error: error.message } : { ...run, written: rows.length };
}
