import { okResponse, errorResponse } from "@/lib/api-response";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/settings/usage-metrics?days=14
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return errorResponse("Neautorizovaný prístup.", 401);
  }

  const profile = await getCurrentProfile();
  const agencyId = profile?.agency_id;
  if (!agencyId) {
    return errorResponse("Profil nemá priradenú agentúru.", 400);
  }

  const { searchParams } = new URL(req.url);
  const days = Math.min(parseInt(searchParams.get("days") ?? "14", 10), 90);
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("usage_metrics_daily")
    .select("metric_day, metric, amount")
    .eq("agency_id", agencyId)
    .gte("metric_day", since)
    .order("metric_day", { ascending: false });

  if (error) {
    return errorResponse(
      `Nepodarilo sa načítať metriky: ${error.message}`,
      500
    );
  }

  return okResponse({ agencyId, days, rows: data ?? [] });
}
