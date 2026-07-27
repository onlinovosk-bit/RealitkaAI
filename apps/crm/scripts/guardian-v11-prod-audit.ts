/**
 * Read-only prod audit for Guardian v1.1 PR (agencies + invalid STALE counts).
 * Env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from apps/crm/.env.local
 */
import { config } from "dotenv";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

config({ path: resolve(__dirname, "../.env.local") });

const MS_DAY = 24 * 60 * 60 * 1000;
const STALE_ACTIVITY_WINDOW_DAYS = 90;
const STALE_QUIET_DAYS = 7;

async function main() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const now = Date.now();

  const { data: agencies, error: agErr } = await sb
    .from("agencies")
    .select("id,name,slug,is_active")
    .order("name");

  if (agErr) {
    console.error("agencies:", agErr.message);
    process.exit(1);
  }

  const { data: tenants } = await sb.from("valuation_tenants").select("agency_id,slug,is_sandbox");

  console.log("\n=== Agency report ===");
  for (const a of agencies ?? []) {
    const { count: leads } = await sb
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", a.id);
    const vt = (tenants ?? []).find((t) => t.agency_id === a.id);
    let type = "tenant";
    if (vt?.is_sandbox) type = "sandbox/demo";
    else if (!a.is_active) type = "inactive";
    else if (a.slug === "reality-smolko") type = "paying (reference client)";
    console.log(
      `${a.id}\t${a.name ?? ""}\t${a.slug ?? ""}\t${type}\tleads=${leads ?? 0}`,
    );
  }

  const { data: openStale, error: staleErr } = await sb
    .from("guardian_findings")
    .select("id, agency_id, lead_id, rule_code, detected_at")
    .eq("rule_code", "STALE")
    .is("resolved_at", null);

  if (staleErr) {
    console.error("guardian_findings:", staleErr.message);
    process.exit(1);
  }

  let invalidStaleNoEventsEver = 0;
  let invalidStaleNo90dActivity = 0;
  let invalidStaleRecent7d = 0;
  let validStaleV11 = 0;

  for (const f of openStale ?? []) {
    const { data: events } = await sb
      .from("lead_events")
      .select("created_at")
      .eq("lead_id", f.lead_id)
      .eq("agency_id", f.agency_id)
      .order("created_at", { ascending: false });

    const times = (events ?? [])
      .map((e) => Date.parse(String(e.created_at)))
      .filter((t) => !Number.isNaN(t));

    if (times.length === 0) {
      invalidStaleNoEventsEver += 1;
      continue;
    }

    const latest = Math.max(...times);
    const has90d = times.some((t) => now - t <= STALE_ACTIVITY_WINDOW_DAYS * MS_DAY);
    const has7d = times.some((t) => now - t <= STALE_QUIET_DAYS * MS_DAY);

    if (!has90d) invalidStaleNo90dActivity += 1;
    else if (has7d) invalidStaleRecent7d += 1;
    else validStaleV11 += 1;
  }

  const { count: openTotal } = await sb
    .from("guardian_findings")
    .select("id", { count: "exact", head: true })
    .is("resolved_at", null);

  const { data: allOpen } = await sb
    .from("guardian_findings")
    .select("rule_code")
    .is("resolved_at", null);

  const byRule: Record<string, number> = {};
  for (const r of allOpen ?? []) {
    const code = String(r.rule_code);
    byRule[code] = (byRule[code] ?? 0) + 1;
  }

  console.log("\n=== Open guardian_findings (prod) ===");
  console.log(JSON.stringify({ openTotal, byRule }, null, 2));

  console.log("\n=== STALE v1.1 reclassification (open STALE only) ===");
  console.log(
    JSON.stringify(
      {
        openStaleTotal: openStale?.length ?? 0,
        validUnderV11: validStaleV11,
        invalidNoLeadEventsEver: invalidStaleNoEventsEver,
        invalidNoActivityInLast90d: invalidStaleNo90dActivity,
        invalidActivityWithinLast7d: invalidStaleRecent7d,
        invalidTotal:
          invalidStaleNoEventsEver + invalidStaleNo90dActivity + invalidStaleRecent7d,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
