import { okResponse, errorResponse } from "@/lib/api-response";
import { getCurrentProfile } from "@/lib/auth";
import { upsertScrapedAgencies } from "@/lib/db/scraped-agencies-store";
import { scoreAgency } from "@/lib/scoring/agency-score";
import { scrapeRealEstate } from "@/lib/scraper/realestate-scraper";
import { requireFeature } from "@/lib/feature-gating";

export const dynamic = "force-dynamic";

/**
 * Vercel Cron: nastav `CRON_SECRET` v Project → Environment Variables.
 * Vercel pri volaní cronu automaticky pridá `Authorization: Bearer <CRON_SECRET>` (pozri README).
 * Lokálne: curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/scrape
 */
function verifyCronAuth(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const q = new URL(request.url).searchParams.get("secret");
  return q === secret;
}

function minScore(): number {
  const v = Number(process.env.SCRAPER_MIN_SCORE ?? "30");
  return Number.isFinite(v) ? v : 30;
}

/**
 * GET — cron (Authorization: Bearer CRON_SECRET or ?secret=). No session.
 * POST — authenticated owner/manager + outreach feature; manual run.
 */
export async function GET(request: Request) {
  if (!verifyCronAuth(request)) {
    return errorResponse("Unauthorized", 401);
  }

  return runScrapePipeline();
}

export async function POST() {
  try {
    await requireFeature("outreach");
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Outreach nie je dostupný.", 403);
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    return errorResponse("Neplatná session.", 401);
  }

  const role = (profile.role ?? "").toLowerCase();
  if (!["owner", "manager"].includes(role)) {
    return errorResponse("Vyžadovaná rola owner alebo manager.", 403);
  }

  return runScrapePipeline();
}

async function runScrapePipeline() {
  const { agencies, mode, warning } = await scrapeRealEstate();
  const threshold = minScore();
  const passed = agencies.filter((a) => scoreAgency(a) > threshold);

  const { inserted, errors } = await upsertScrapedAgencies(passed);

  return okResponse({
    success: true,
    mode,
    warning,
    threshold,
    scanned: agencies.length,
    saved: inserted,
    passedCount: passed.length,
    errors,
    persistenceConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  });
}
