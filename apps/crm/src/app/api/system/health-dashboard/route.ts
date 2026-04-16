import { okResponse, errorResponse } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth";
import { getEnvironmentHealth } from "@/lib/app-env";
import { createClient } from "@/lib/supabase/server";
import { runSmokeTests } from "@/lib/smoke-tests";

/**
 * GET /api/system/health-dashboard
 * SLA / embeddings / cron / integrácie (owner-friendly).
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return errorResponse("Neautorizovaný prístup.", 401);
  }

  const supabase = await createClient();

  const [embeddingsLeads, embeddingsProps, lastCronRow, smokePack] = await Promise.all([
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .not("embedding", "is", null),
    supabase
      .from("properties")
      .select("id", { count: "exact", head: true })
      .not("embedding", "is", null),
    (async () => {
      const r = await supabase
        .from("platform_events")
        .select("created_at, payload")
        .eq("event_type", "system.cron.daily_match")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (r.error) return null;
      return r.data;
    })(),
    runSmokeTests().catch(() => ({
      ok: false,
      checks: [] as { ok: boolean; label: string; message: string }[],
    })),
  ]);

  const leadTotal = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true });

  const propTotal = await supabase
    .from("properties")
    .select("id", { count: "exact", head: true });

  const withEmbLeads = embeddingsLeads.count ?? 0;
  const withEmbProps = embeddingsProps.count ?? 0;
  const totalLeads = leadTotal.count ?? 0;
  const totalProps = propTotal.count ?? 0;

  const environment = getEnvironmentHealth();

  return okResponse({
    generatedAt: new Date().toISOString(),
    environment,
    embeddings: {
      leadsIndexed: withEmbLeads,
      leadsTotal: totalLeads,
      propertiesIndexed: withEmbProps,
      propertiesTotal: totalProps,
      coverageLeads:
        totalLeads > 0 ? Math.round((withEmbLeads / totalLeads) * 1000) / 10 : null,
      coverageProperties:
        totalProps > 0 ? Math.round((withEmbProps / totalProps) * 1000) / 10 : null,
    },
    cron: {
      lastDailyMatchAt: lastCronRow?.created_at ?? null,
      lastPayload: lastCronRow?.payload ?? null,
    },
    integrations: {
      smokeChecks: smokePack.checks,
      smokeOk: smokePack.checks.length > 0 ? smokePack.checks.every((s) => s.ok) : null,
    },
  });
}
