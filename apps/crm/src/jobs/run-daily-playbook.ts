/**
 * Denný job – generuje AI Playbook pre všetkých agentov o 7:00.
 * Spustenie: npx tsx src/jobs/run-daily-playbook.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import { DailyPlaybookService } from "@/services/playbook/DailyPlaybookService";
import { SupabaseProfilesRepository } from "@/infra/db/SupabaseProfilesRepository";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
  console.log(`[${new Date().toISOString()}] Spúšťam denný AI Playbook job...`);

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const profilesRepo = new SupabaseProfilesRepository(supabase);
  const playbookService = new DailyPlaybookService(supabase, profilesRepo);

  await playbookService.runForAllAgents();

  console.log("Denný AI Playbook job dokončený.");
}

main().catch((e) => {
  console.error("Job zlyhal:", e);
  process.exit(1);
});
