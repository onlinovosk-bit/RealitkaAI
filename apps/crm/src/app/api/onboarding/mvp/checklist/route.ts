import { errorResponse, okResponse } from "@/lib/api-response";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { computeReadinessScore, DEFAULT_CHECKLIST, normalizeChecklist } from "@/lib/onboarding-mvp";

export async function GET(request: Request) {
  const supabase = createServiceRoleClient();
  if (!supabase) return errorResponse("Service role nie je nakonfigurovaný.", 500);

  const { searchParams } = new URL(request.url);
  const company = (searchParams.get("company") ?? "").trim();
  const email = (searchParams.get("email") ?? "").trim().toLowerCase();

  if (!company || !email) {
    return errorResponse("Parametre company a email sú povinné.", 400);
  }

  const { data, error } = await supabase
    .from("client_onboarding_progress")
    .select("*")
    .ilike("company", company)
    .ilike("contact_email", email)
    .maybeSingle();

  if (error) return errorResponse(error.message, 500);

  if (!data) {
    return okResponse({
      progress: {
        company,
        contact_email: email,
        checklist: DEFAULT_CHECKLIST,
        readiness_score: 0,
        risk: "high",
      },
      exists: false,
    });
  }

  const checklist = normalizeChecklist((data.checklist as Record<string, boolean>) ?? {});
  const readiness = computeReadinessScore(checklist);
  return okResponse({
    progress: {
      ...data,
      checklist,
      readiness_score: readiness,
    },
    exists: true,
  });
}

export async function POST(request: Request) {
  const supabase = createServiceRoleClient();
  if (!supabase) return errorResponse("Service role nie je nakonfigurovaný.", 500);

  const body = (await request.json()) as {
    company?: string;
    contactName?: string;
    contactEmail?: string;
    agentsCount?: number;
    checklist?: Record<string, boolean>;
  };

  const company = (body.company ?? "").trim();
  const contactEmail = (body.contactEmail ?? "").trim().toLowerCase();
  const contactName = (body.contactName ?? "").trim();
  const agentsCount = Number(body.agentsCount ?? 1);

  if (!company || !contactEmail) {
    return errorResponse("company a contactEmail sú povinné.", 400);
  }

  const checklist = normalizeChecklist(body.checklist ?? {});
  const readinessScore = computeReadinessScore(checklist);
  const nowIso = new Date().toISOString();

  const payload = {
    company,
    contact_name: contactName || null,
    contact_email: contactEmail,
    agents_count: Number.isFinite(agentsCount) && agentsCount > 0 ? agentsCount : 1,
    checklist,
    readiness_score: readinessScore,
    last_activity_at: nowIso,
  };

  const { data, error } = await supabase
    .from("client_onboarding_progress")
    .upsert(payload, { onConflict: "company,contact_email" })
    .select("*")
    .single();

  if (error) return errorResponse(error.message, 500);

  return okResponse({ progress: data });
}

