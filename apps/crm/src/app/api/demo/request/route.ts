import { errorResponse, okResponse } from "@/lib/api-response";
import { createSaasLead } from "@/lib/sales-funnel-store";

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

    return okResponse({ lead });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Nepodarilo sa spracovať demo request.",
      500
    );
  }
}
