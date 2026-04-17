import { okResponse, errorResponse } from "@/lib/api-response";
import { getCurrentProfile } from "@/lib/auth";
import { listScrapedAgencies } from "@/lib/db/scraped-agencies-store";
import { requireFeature } from "@/lib/feature-gating";

export async function GET() {
  try {
    await requireFeature("outreach");
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Outreach nie je dostupný.", 403);
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    return errorResponse("Neplatná session.", 401);
  }

  const rows = await listScrapedAgencies(80);
  const persistenceConfigured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return okResponse({
    prospects: rows,
    persistenceConfigured,
    hint: persistenceConfigured
      ? undefined
      : "Nastavte SUPABASE_SERVICE_ROLE_KEY v serverovom prostredí, aby sa scraper uložil do DB.",
  });
}
