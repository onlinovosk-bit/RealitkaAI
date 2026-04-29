import { errorResponse, okResponse } from "@/lib/api-response";
import { createSaasLead } from "@/lib/sales-funnel-store";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { DEFAULT_CHECKLIST, computeReadinessScore } from "@/lib/onboarding-mvp";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim();
    const company = String(body?.company ?? "").trim();
    const agentsCount = Number(body?.agentsCount ?? 0);

    if (!name || !email || !company) {
      return errorResponse("Meno, email a spoločnosť sú povinné.", 400);
    }

    if (!Number.isFinite(agentsCount) || agentsCount <= 0) {
      return errorResponse("Počet agentov musí byť väčší ako 0.", 400);
    }

    const lead = await createSaasLead({
      name,
      email,
      phone: String(body?.phone ?? "").trim(),
      company,
      agentsCount,
      city: String(body?.city ?? "").trim(),
      note: String(body?.note ?? "").trim(),
      source: String(body?.source ?? "Demo page").trim(),
    });

    // MVP onboarding pipeline bootstrap:
    // 1) create/update onboarding checklist baseline
    // 2) schedule D1/D3/D7 messages for this client
    const service = createServiceRoleClient();
    if (service) {
      const readinessScore = computeReadinessScore(DEFAULT_CHECKLIST);
      const { data: progress } = await service
        .from("client_onboarding_progress")
        .upsert(
          {
            company,
            contact_name: name,
            contact_email: email.toLowerCase(),
            agents_count: agentsCount,
            checklist: DEFAULT_CHECKLIST,
            readiness_score: readinessScore,
            last_activity_at: new Date().toISOString(),
          },
          { onConflict: "company,contact_email" }
        )
        .select("id")
        .maybeSingle();

      if (progress?.id) {
        const base = new Date();
        const days = [1, 3, 7] as const;
        const payload = days.map((d) => {
          const scheduled = new Date(base);
          scheduled.setDate(base.getDate() + d);
          return {
            progress_id: progress.id,
            message_day: `d${d}`,
            scheduled_for: scheduled.toISOString(),
          };
        });
        await service
          .from("client_onboarding_messages")
          .upsert(payload, { onConflict: "progress_id,message_day" });
      }
    }

    return okResponse({ lead });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Nepodarilo sa spracovať demo request.",
      500
    );
  }
}
