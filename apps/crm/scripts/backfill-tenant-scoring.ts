/**
 * Heuristický backfill `leads.score` pre tenant (AI Scoring 2.0 calculateLeadAiScore).
 * Neprepisuje buyer_readiness_score ani ai_priority.
 *
 *   npx tsx scripts/backfill-tenant-scoring.ts --dry-run
 *   npx tsx scripts/backfill-tenant-scoring.ts --apply --limit 50
 *
 * .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import { calculateLeadAiScore } from "../src/lib/ai-scoring";

const SMOLKO_AGENCY_ID = "11111111-1111-1111-1111-111111111111";

type LeadRow = {
  id: string;
  name: string;
  location: string | null;
  budget: string | null;
  property_type: string | null;
  rooms: string | null;
  financing: string | null;
  timeline: string | null;
  status: string | null;
  score: number | null;
  note: string | null;
  source: string | null;
  assigned_agent: string | null;
};

function parseArgs(argv: string[]) {
  let agencyId = SMOLKO_AGENCY_ID;
  let apply = false;
  let limit = 500;

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--agency-id" && argv[i + 1]) {
      agencyId = argv[i + 1];
      i += 1;
    } else if (token === "--apply") {
      apply = true;
    } else if (token === "--dry-run") {
      apply = false;
    } else if (token === "--limit" && argv[i + 1]) {
      limit = Number(argv[i + 1]);
      i += 1;
    }
  }

  if (!Number.isFinite(limit) || limit <= 0) {
    throw new Error("--limit must be a positive number");
  }

  return { agencyId, apply, limit };
}

async function loadMatchesForLeads(
  sb: any,
  leadIds: string[],
) {
  if (leadIds.length === 0) return [];

  const { data, error } = await sb
    .from("lead_property_matches")
    .select("lead_id, score")
    .in("lead_id", leadIds);

  if (error) throw new Error(`lead_property_matches: ${error.message}`);

  return (data ?? []).map((row: { lead_id: string; score: number | null }) => ({
    leadId: row.lead_id as string,
    matchScore: Number(row.score ?? 0),
  }));
}

function mapRow(row: LeadRow) {
  return {
    id: row.id,
    name: row.name,
    location: row.location ?? "",
    budget: row.budget ?? "",
    propertyType: row.property_type ?? "",
    rooms: row.rooms ?? "",
    financing: row.financing ?? "",
    timeline: row.timeline ?? "",
    status: row.status ?? "Nový",
    score: Number(row.score ?? 0),
    note: row.note ?? "",
    source: row.source ?? "",
    assignedAgent: row.assigned_agent ?? "",
  };
}

async function main() {
  const { agencyId, apply, limit } = parseArgs(process.argv.slice(2));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Chýba NEXT_PUBLIC_SUPABASE_URL alebo SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });

  const { data: rows, error } = await sb
    .from("leads")
    .select(
      "id, name, location, budget, property_type, rooms, financing, timeline, status, score, note, source, assigned_agent",
    )
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  const leads = (rows ?? []) as LeadRow[];
  const leadIds = leads.map((row) => row.id);
  const matches = await loadMatchesForLeads(sb, leadIds);
  const related = { matches, recommendations: [], tasks: [], messages: [] };

  const scored = leads.map((row) => {
    const lead = mapRow(row);
    const result = calculateLeadAiScore({ lead, ...related });
    return { id: row.id, name: row.name, oldScore: row.score ?? 0, newScore: result.score };
  });

  const wouldChange = scored.filter((s) => s.newScore !== s.oldScore);
  const band = { low: 0, mid: 0, high: 0 };
  for (const s of scored) {
    if (s.newScore >= 70) band.high += 1;
    else if (s.newScore >= 40) band.mid += 1;
    else band.low += 1;
  }

  console.log("");
  console.log(`Backfill tenant scoring — agency ${agencyId}`);
  console.log(`Mode: ${apply ? "APPLY (writes score)" : "DRY-RUN"}`);
  console.log(`Leads loaded: ${scored.length}, matches loaded: ${matches.length}, would update: ${wouldChange.length}`);
  console.log(`Distribution (new): low<40=${band.low}, 40-69=${band.mid}, 70+=${band.high}`);
  console.log("Sample:", wouldChange.slice(0, 5));

  if (!apply) {
    console.log("\nPouži --apply na zápis. Pre plný tenant zvýš --limit.\n");
    return;
  }

  let updated = 0;
  for (const item of wouldChange) {
    const { error: upErr } = await sb
      .from("leads")
      .update({ score: item.newScore })
      .eq("id", item.id)
      .eq("agency_id", agencyId);
    if (upErr) throw new Error(`${item.id}: ${upErr.message}`);
    updated += 1;
  }

  console.log(`\nUpdated ${updated} lead(s).\n`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
