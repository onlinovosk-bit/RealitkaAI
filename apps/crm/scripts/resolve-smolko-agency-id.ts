/**
 * Vypíše agency_id pre Reality Smolko (Vercel TRIAGE_AGENCY_ID).
 * Env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY z apps/crm/.env.local
 *
 *   npx tsx scripts/resolve-smolko-agency-id.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

config({ path: resolve(__dirname, "../.env.local") });

async function main() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error("Chýba SUPABASE_URL alebo SUPABASE_SERVICE_ROLE_KEY v apps/crm/.env.local");
    process.exit(1);
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });

  const { data: agencies, error } = await sb
    .from("agencies")
    .select("id,name,slug,realvia_identifikator,realvia_identifikator2")
    .limit(100);

  if (error) {
    console.error("agencies:", error.message);
    process.exit(1);
  }

  const smolko = (agencies ?? []).filter((a) => {
    const blob = `${a.name ?? ""} ${a.slug ?? ""} ${a.realvia_identifikator ?? ""}`.toLowerCase();
    return blob.includes("smolko");
  });

  if (smolko.length === 0) {
    console.log("Nenašiel som agency s 'smolko' v name/slug/realvia_identifikator.");
    console.log("Dostupné agentúry (prvých 10):");
    for (const a of (agencies ?? []).slice(0, 10)) {
      console.log(`  ${a.id}  ${a.name ?? "(bez mena)"}  slug=${a.slug ?? "-"}`);
    }
    process.exit(2);
  }

  const primary = smolko[0]!;
  console.log("\n=== Smolko agency (pre Vercel TRIAGE_AGENCY_ID) ===");
  console.log(`TRIAGE_AGENCY_ID=${primary.id}`);
  console.log(`name=${primary.name ?? ""}`);
  console.log(`slug=${primary.slug ?? ""}`);

  const agencyId = primary.id;
  const [totalLeads, importedStatus, untriaged] = await Promise.all([
    sb.from("leads").select("id", { count: "exact", head: true }).eq("agency_id", agencyId),
    sb.from("leads").select("id", { count: "exact", head: true }).eq("agency_id", agencyId).eq("status", "imported"),
    sb
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agencyId)
      .is("ai_triage_at", null)
      .in("status", ["Nový", "Teplý", "Horúci", "Obhliadka", "Ponuka", "imported"]),
  ]);

  console.log("\n=== Diagnostika leadov (service role) ===");
  console.log(`leads_total=${totalLeads.count ?? 0}`);
  console.log(`status_imported=${importedStatus.count ?? 0} (pred migráciou imported→Nový)`);
  console.log(`untriaged_open=${untriaged.count ?? 0} (kandidáti na cron)`);
  console.log("\nVercel: Settings → Environment Variables → Production + Preview");
  console.log("  TRIAGE_AGENCY_ID = hodnota TRIAGE_AGENCY_ID vyššie");
  console.log("  TRIAGE_LEAD_LIMIT = 500");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
