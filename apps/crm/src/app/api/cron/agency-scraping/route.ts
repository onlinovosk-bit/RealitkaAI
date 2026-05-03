import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { AgencyDiscoveryEngine } from "@/domain/agency/AgencyDiscovery";
import { SupabaseAgenciesRepository } from "@/infra/db/SupabaseAgenciesRepository";
import { PortalNehnutelnostiSource } from "@/infra/scraping/PortalNehnutelnostiSource";
import { AgencyScrapingService } from "@/services/agency/AgencyScrapingService";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const agenciesRepo = new SupabaseAgenciesRepository(supabase);
  const discoveryEngine = new AgencyDiscoveryEngine([new PortalNehnutelnostiSource(3)], agenciesRepo);
  const scrapingService = new AgencyScrapingService(discoveryEngine);

  await scrapingService.runFullCycle();

  return NextResponse.json({ ok: true, ts: new Date().toISOString() });
}
