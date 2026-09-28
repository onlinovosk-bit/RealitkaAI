import { okResponse, errorResponse } from "@/lib/api-response";
import { createSaasLead } from "@/lib/sales-funnel-store";
import { runDemoBookingAutomation } from "@/lib/demo-booking-store";
import { checkAiRateLimit } from "@/lib/ai/rate-guard";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const block = await checkAiRateLimit(ip, "demo-request", 3);
  if (block) return Response.json(block, { status: 429 });

  try {
    const body = await request.json();

    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim();
    const company = String(body?.company ?? "").trim();
    const agentsCount = Number(body?.agentsCount ?? 0);

    if (!name || !email || !company) {
      return errorResponse("Chýba meno, email alebo firma.", 400);
    }

    // Public funnel — no tenant session. Service role required for saas_leads +
    // orphan CRM task (tasks_agency rejects lead_id null under anon/authenticated).
    const service = createServiceRoleClient();
    if (!service) {
      return errorResponse("Služba nie je dostupná.", 503);
    }

    const saasLead = await createSaasLead(
      {
        name,
        email,
        phone: String(body?.phone ?? "").trim(),
        company,
        agentsCount,
        city: String(body?.city ?? "").trim(),
        note: String(body?.note ?? "").trim(),
        source: "Demo request",
      },
      service,
    );

    const automation = await runDemoBookingAutomation(
      {
        id: saasLead.id,
        name: saasLead.name,
        email: saasLead.email,
        phone: saasLead.phone,
        company: saasLead.company,
        agentsCount: saasLead.agentsCount,
        city: saasLead.city,
        note: saasLead.note,
        source: saasLead.source,
        status: saasLead.status,
      },
      service,
    );

    if (!automation.ok) {
      return errorResponse(
        "Demo request sa uložil, ale CRM follow-up úloha zlyhala. Skúste znova.",
        500,
        { saasLeadId: saasLead.id, automation },
      );
    }

    return okResponse({
      result: {
        saasLead,
        automation,
      },
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Nepodarilo sa odoslať demo request.",
      400
    );
  }
}
