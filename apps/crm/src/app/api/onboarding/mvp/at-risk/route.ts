import { errorResponse, okResponse } from "@/lib/api-response";
import { computeReadinessScore, getRiskLabel, normalizeChecklist } from "@/lib/onboarding-mvp";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createServiceRoleClient();
  if (!supabase) return errorResponse("Service role nie je nakonfigurovaný.", 500);

  const { data, error } = await supabase
    .from("client_onboarding_progress")
    .select("id, company, contact_name, contact_email, readiness_score, checklist, last_activity_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) return errorResponse(error.message, 500);

  const enriched = (data ?? []).map((row) => {
    const checklist = normalizeChecklist((row.checklist as Record<string, boolean>) ?? {});
    const readiness = computeReadinessScore(checklist);
    const risk = getRiskLabel(readiness, row.last_activity_at);
    return {
      ...row,
      readiness_score: readiness,
      risk,
      missingSteps: Object.entries(checklist)
        .filter(([, done]) => !done)
        .map(([key]) => key),
    };
  });

  const atRisk = enriched.filter((r) => r.risk !== "low");
  return okResponse({ total: enriched.length, atRisk: atRisk.length, clients: atRisk });
}

