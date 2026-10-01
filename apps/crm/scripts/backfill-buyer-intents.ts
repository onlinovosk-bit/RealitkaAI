/**
 * Backfill buyer_intents from existing leads (Smolko / tenant-scoped).
 * Only inserts when property_type maps to a dwelling type (e.g. Byt → flat).
 * Empty property_type leads are skipped — no guessing.
 *
 *   npx tsx scripts/backfill-buyer-intents.ts --dry-run
 *   npx tsx scripts/backfill-buyer-intents.ts --apply
 *
 * .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import {
  buildBuyerIntentFromLead,
  type LeadIntentBackfillRow,
} from "../src/lib/buyer-intent";

const SMOLKO_AGENCY_ID = "11111111-1111-1111-1111-111111111111";

function parseArgs(argv: string[]) {
  let agencyId = SMOLKO_AGENCY_ID;
  let apply = false;

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--agency-id" && argv[i + 1]) {
      agencyId = argv[i + 1];
      i += 1;
    } else if (token === "--apply") {
      apply = true;
    } else if (token === "--dry-run") {
      apply = false;
    }
  }

  return { agencyId, apply };
}

async function main() {
  const { agencyId, apply } = parseArgs(process.argv.slice(2));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");

  const sb = createClient(url, key, { auth: { persistSession: false } });

  const { count: totalLeads, error: countError } = await sb
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("agency_id", agencyId);

  if (countError) throw new Error(`leads count failed: ${countError.message}`);

  const { data: leads, error: leadsError } = await sb
    .from("leads")
    .select(
      "id,name,email,location,budget,property_type,financing,timeline,status,note,client_segment,buyer_readiness_score",
    )
    .eq("agency_id", agencyId);

  if (leadsError) throw new Error(`leads query failed: ${leadsError.message}`);

  const leadRows = (leads ?? []) as LeadIntentBackfillRow[];

  const { data: existingIntents, error: intentsError } = await sb
    .from("buyer_intents")
    .select("lead_id");

  if (intentsError) throw new Error(`buyer_intents query failed: ${intentsError.message}`);

  const hasIntent = new Set((existingIntents ?? []).map((r) => r.lead_id as string));

  const candidates = leadRows.map((lead) => {
    if (hasIntent.has(lead.id)) {
      return { leadId: lead.id, name: lead.name, property_type: lead.property_type, skipReason: "intent_exists" };
    }
    const built = buildBuyerIntentFromLead(lead);
    return {
      leadId: lead.id,
      name: lead.name,
      property_type: lead.property_type,
      skipReason: built.skipReason,
      intentInput: built.intentInput,
      segment: built.segment,
      readinessScore: built.readinessScore,
    };
  });

  const toInsert = candidates.filter((c) => c.intentInput && !c.skipReason);
  const skipped = candidates.filter((c) => c.skipReason);

  const skipBreakdown = skipped.reduce<Record<string, number>>((acc, row) => {
    const key = row.skipReason ?? "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const report = {
    phase: apply ? "apply" : "dry_run",
    agencyId,
    totalLeads: totalLeads ?? leadRows.length,
    wouldInsert: toInsert.length,
    skipped: skipped.length,
    skippedInsufficientSourceData: skipBreakdown.insufficient_source_data ?? 0,
    skippedUnmappablePropertyType: skipBreakdown.unmappable_property_type ?? 0,
    inserts: toInsert.map((c) => ({
      leadId: c.leadId,
      name: c.name,
      property_type: c.property_type,
      deal_type: c.intentInput?.dealType,
      intent_property_type: c.intentInput?.propertyType,
      readinessScore: c.readinessScore,
    })),
    skipBreakdown,
  };

  console.log(JSON.stringify(report, null, 2));

  if (!apply) {
    console.log("\nDry-run only. Re-run with --apply to write buyer_intents.");
    return;
  }

  if (toInsert.length === 0) {
    console.log("Nothing to insert.");
    return;
  }

  for (const row of toInsert) {
    const input = row.intentInput!;
    const { error } = await sb.from("buyer_intents").upsert(
      {
        lead_id: row.leadId,
        deal_type: input.dealType,
        property_type: input.propertyType,
        primary_city: input.primaryCity,
        budget_min: input.budgetMin,
        budget_max: input.budgetMax,
        time_horizon_months: input.timeHorizonMonths,
        new_build_only: input.newBuildOnly,
        needs_mortgage_help: input.needsMortgageHelp,
        raw_focus_text: input.rawFocusText,
        client_segment: row.segment ?? "other",
        buyer_readiness_score: row.readinessScore ?? 0,
      },
      { onConflict: "lead_id" },
    );

    if (error) throw new Error(`upsert failed for ${row.leadId}: ${error.message}`);

    await sb
      .from("leads")
      .update({
        client_segment: row.segment ?? "other",
        buyer_readiness_score: row.readinessScore ?? 0,
      })
      .eq("id", row.leadId);
  }

  console.log(`\nInserted/updated ${toInsert.length} buyer_intents.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
