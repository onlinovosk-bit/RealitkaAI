/**
 * Job – scraping agentúr z portálov.
 * Spustenie: npx tsx src/jobs/run-agency-scraping.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

import { AgencyDiscoveryEngine } from "@/domain/agency/AgencyDiscovery";
import { SupabaseAgenciesRepository } from "@/infra/db/SupabaseAgenciesRepository";
import { PortalNehnutelnostiSource } from "@/infra/scraping/PortalNehnutelnostiSource";
// import { PortalRealitySkSource } from "@/infra/scraping/PortalRealitySkSource";
import { AgencyScrapingService } from "@/services/agency/AgencyScrapingService";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
  console.log(`[${new Date().toISOString()}] Spúšťam Agency Scraping job...`);

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const agenciesRepo = new SupabaseAgenciesRepository(supabase);

  const sources = [
    new PortalNehnutelnostiSource(),
    // new PortalRealitySkSource(),
    // ďalšie portály...
  ];

  const discoveryEngine = new AgencyDiscoveryEngine(sources, agenciesRepo);
  const scrapingService = new AgencyScrapingService(discoveryEngine);

  await scrapingService.runFullCycle();

  console.log("Agency Scraping job dokončený.");
}

main().catch((e) => {
  console.error("Job zlyhal:", e);
  process.exit(1);
});