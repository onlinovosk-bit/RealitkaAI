#!/usr/bin/env npx tsx
/**
 * Cleanup script — zmaže smoke/test profily z DB
 * Použitie: npx tsx scripts/cleanup-smoke-profiles.ts [--dry-run]
 * Bezpečné: maže len profily s testovacími emailmi a 0 leads
 */
import { createClient } from "@supabase/supabase-js";

const SMOKE_PATTERNS = [
  "%testuser_%@example.com",
  "%smoke_%@example.com",
  "%signup_%@testmail.com",
  "%crm_%@testmail.com",
];

const PROTECTED_EMAILS = new Set([
  "rastislav.smolko@gmail.com",
  "info@onlinovo.sk",
]);

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL a SUPABASE_SERVICE_ROLE_KEY sú povinné.");
    process.exit(1);
  }

  const supabase = createClient(url, key);

  console.log(`Mode: ${isDryRun ? "DRY RUN" : "LIVE DELETE"}`);

  const orFilter = SMOKE_PATTERNS.map((p) => `email.ilike.${p}`).join(",");
  const { data: rawCandidates, error: findError } = await supabase
    .from("profiles")
    .select("id, email, agency_id, created_at")
    .or(orFilter)
    .limit(500);

  if (findError) {
    console.error("❌ Chyba pri hľadaní profilov:", findError.message);
    process.exit(1);
  }

  const candidates = (rawCandidates ?? []).filter(
    (profile) => !PROTECTED_EMAILS.has(String(profile.email ?? "").toLowerCase()),
  );

  if (!candidates.length) {
    console.log("✅ Žiadne smoke profily nenájdené.");
    return;
  }

  const safeToDelete = [];
  for (const profile of candidates) {
    const { count } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("assigned_profile_id", profile.id);

    if ((count ?? 0) === 0) {
      safeToDelete.push(profile);
    } else {
      console.warn(`⚠ Preskočené: ${profile.email} má ${count} leads`);
    }
  }

  console.log(`Nájdených na zmazanie: ${safeToDelete.length}`);
  safeToDelete.forEach((p) => console.log(`  - ${p.email} (${p.created_at})`));

  if (isDryRun) {
    console.log("\nDRY RUN — žiadne zmeny.");
    return;
  }

  const ids = safeToDelete.map((p) => p.id);
  if (!ids.length) return;

  await supabase.from("import_jobs").delete().in("created_by", ids);

  const { error } = await supabase.from("profiles").delete().in("id", ids);
  if (error) {
    console.error("❌ Chyba:", error.message);
    process.exit(1);
  }

  console.log(`✅ Zmazaných: ${safeToDelete.length} profilov`);
}

main().catch(console.error);
