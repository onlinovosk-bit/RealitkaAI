/**
 * DEMAND-D4 — matching over existing demand records + the business funnel.
 *
 * Default is a DRY RUN: reads the latest lead_demands row per lead of one
 * agency, runs the engine, prints the funnel (contract §4). Nothing is written.
 * `--apply` writes demand_property_matches (never `leads`) and is meant for the
 * one-off backfill after D1 is live on PROD — run it only on founder GO.
 *
 *   npx tsx scripts/demand-match-run.ts --agency <uuid>            # dry run
 *   npx tsx scripts/demand-match-run.ts --agency <uuid> --apply    # write
 *
 * .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import type { Demand } from "../src/lib/demand/contract";
import { hasMinimalDemand, matchDemand } from "../src/lib/demand/match";
import { loadAgencyProperties, runDemandMatching } from "../src/lib/demand/match-store";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const agencyId = arg("agency");
  const apply = process.argv.includes("--apply");
  if (!agencyId) throw new Error("--agency <uuid> is required (one tenant per run)");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const { count: leadCount } = await db
    .from("leads").select("id", { count: "exact", head: true }).eq("agency_id", agencyId);

  const { data: rows, error } = await db
    .from("lead_demands")
    .select("id, lead_id, status, demand, created_at")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false })
    .limit(10000);
  if (error) throw new Error(`lead_demands: ${error.message}`);

  const latest = new Map<string, { id: string; lead_id: string; status: string; demand: Demand }>();
  for (const r of rows ?? []) if (!latest.has(r.lead_id)) latest.set(r.lead_id, r as never);

  const properties = await loadAgencyProperties(db, agencyId);
  const funnel = {
    leads: leadCount ?? 0,
    with_demand_record: latest.size,
    valid_record: 0,
    minimal_demand: 0,
    with_match: 0,
    matches_total: 0,
    not_a_buyer: 0,
    written: 0,
  };

  for (const rec of latest.values()) {
    if (rec.status !== "ok") continue;
    funnel.valid_record++;
    if (!hasMinimalDemand(rec.demand)) continue;
    funnel.minimal_demand++;
    const run = apply
      ? await runDemandMatching(db, { agencyId, leadId: rec.lead_id, demandRecordId: rec.id, demand: rec.demand })
      : { ...matchDemand(rec.demand, properties), written: 0 };
    if (!run.ok) {
      if (run.reason === "not_a_buyer") funnel.not_a_buyer++;
      continue;
    }
    if (run.matches.length > 0) funnel.with_match++;
    funnel.matches_total += run.matches.length;
    funnel.written += run.written;
  }

  console.log(JSON.stringify({ mode: apply ? "APPLY" : "DRY_RUN", agency_id: agencyId, properties: properties.length, ...funnel }, null, 2));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
