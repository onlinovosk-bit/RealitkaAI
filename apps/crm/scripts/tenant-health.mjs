#!/usr/bin/env node
/**
 * Readonly tenant health report (Supabase service role).
 *
 *   npm run ops:tenant-health
 *   node scripts/tenant-health.mjs --agency-id 11111111-1111-1111-1111-111111111111
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";

const SMOLKO_AGENCY_ID = "11111111-1111-1111-1111-111111111111";

function parseArgs(argv) {
  let agencyId = SMOLKO_AGENCY_ID;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--agency-id" && argv[i + 1]) {
      agencyId = argv[i + 1];
      i += 1;
    }
  }
  return { agencyId };
}

function ok(label, detail) {
  console.log(`✓  ${label}${detail ? ` — ${detail}` : ""}`);
}

function warn(label, detail) {
  console.log(`⚠  ${label}${detail ? ` — ${detail}` : ""}`);
}

function fail(label, detail) {
  console.log(`✗  ${label}${detail ? ` — ${detail}` : ""}`);
}

async function countExact(sb, table, filters) {
  let q = sb.from(table).select("*", { head: true, count: "exact" });
  for (const [col, val] of filters) {
    q = q.eq(col, val);
  }
  const { count, error } = await q;
  if (error) throw new Error(`${table}: ${error.message}`);
  return count ?? 0;
}

async function main() {
  const { agencyId } = parseArgs(process.argv.slice(2));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  const sb = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("");
  console.log("Revolis CRM — tenant health (readonly)\n");
  console.log(`Agency ID: ${agencyId}\n`);

  const { data: agency, error: agencyError } = await sb
    .from("agencies")
    .select("id, name, manual_plan, billing_source")
    .eq("id", agencyId)
    .maybeSingle();

  if (agencyError) throw new Error(agencyError.message);
  if (!agency) {
    fail("Agency row", "not found");
    process.exit(1);
  }
  ok("Agency", agency.name ?? agency.id);

  if (agency.manual_plan) {
    ok("manual_plan", agency.manual_plan);
  } else {
    warn("manual_plan", "NULL — run SMOLKO-OPS-RUNBOOK §1b UPDATE on prod");
  }

  const leadTotal = await countExact(sb, "leads", [["agency_id", agencyId]]);
  const scoreZero = await countExact(sb, "leads", [
    ["agency_id", agencyId],
    ["score", 0],
  ]);
  const withBudget = await countExact(sb, "leads", [
    ["agency_id", agencyId],
  ]);
  const { count: budgetFilled, error: budgetError } = await sb
    .from("leads")
    .select("*", { head: true, count: "exact" })
    .eq("agency_id", agencyId)
    .not("budget", "is", null)
    .neq("budget", "");
  if (budgetError) throw new Error(budgetError.message);

  const { data: priorityRows, error: priError } = await sb
    .from("leads")
    .select("ai_priority")
    .eq("agency_id", agencyId)
    .limit(5000);
  if (priError) throw new Error(priError.message);

  const priorityCounts = {};
  for (const row of priorityRows ?? []) {
    const key = row.ai_priority ?? "(null)";
    priorityCounts[key] = (priorityCounts[key] ?? 0) + 1;
  }

  console.log("\nLeads:");
  ok("total", String(leadTotal));
  if (leadTotal > 0 && scoreZero === leadTotal) {
    warn("score=0", `${scoreZero}/${leadTotal} — UI shows — until qualification or backfill`);
  } else {
    ok("score=0", `${scoreZero}/${leadTotal}`);
  }
  ok("with budget", `${budgetFilled ?? 0}/${withBudget}`);
  console.log("   ai_priority:", JSON.stringify(priorityCounts));

  const { data: profiles, error: profError } = await sb
    .from("profiles")
    .select("id, email, agency_id, auth_user_id")
    .eq("agency_id", agencyId)
    .limit(20);
  if (profError) throw new Error(profError.message);

  console.log("\nProfiles (agency_id match):");
  if (!profiles?.length) {
    warn("profiles", "none linked — zero-data risk for RLS");
  } else {
    for (const p of profiles) {
      const auth = p.auth_user_id ? "auth linked" : "NO auth_user_id";
      ok(p.email ?? p.id, auth);
    }
  }

  const propertyCount = await countExact(sb, "properties", [["agency_id", agencyId]]);
  console.log("\nProperties:", propertyCount);

  console.log("\nDone. See apps/crm/docs/SMOLKO-OPS-RUNBOOK.md for remediation.\n");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
