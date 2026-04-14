/**
 * Denný job – generuje AI Playbook pre všetkých agentov o 7:00.
 * Spustenie: npx tsx src/jobs/run-daily-playbook.ts
 *
 * Cron (Railway / Vercel Cron / crontab):
 *   0 7 * * * npx tsx src/jobs/run-daily-playbook.ts
 *
 * Požiadavky v .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import { generateDailyPlaybook } from "@/services/simulator/daySimulator";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function main() {
  console.log(`[${new Date().toISOString()}] Spúšťam denný AI Playbook job...`);

  // Načítaj všetky profily agentov
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("role", ["agent", "manager", "admin", "owner"]);

  if (error) {
    console.error("Chyba pri načítaní profilov:", error.message);
    process.exit(1);
  }

  if (!profiles || profiles.length === 0) {
    console.log("Žiadni agenti nenájdení – spúšťam globálne.");
    const items = await generateDailyPlaybook(supabase);
    console.log(`  Globálny Playbook: ${items.length} položiek`);
  } else {
    for (const profile of profiles) {
      console.log(`  Agent: ${profile.full_name ?? profile.email} (${profile.id})`);
      const items = await generateDailyPlaybook(supabase);
      console.log(`    → ${items.length} položiek v Playbooku`);
    }
  }

  console.log("Denný AI Playbook job dokončený.");
}

main().catch((e) => {
  console.error("Job zlyhalo:", e);
  process.exit(1);
});
