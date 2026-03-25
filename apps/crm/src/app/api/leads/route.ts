import { okResponse, errorResponse } from "@/lib/api-response";
import { autoErrorCapture } from "@/lib/auto-error-capture";
import { createLead } from "@/lib/leads-store";
import { createActivity } from "@/lib/activities-store";
import { autoRecalculateForLead } from "@/lib/matching-hooks";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const lead = await createLead({
      name: body.name ?? "",
      email: body.email ?? "",
      phone: body.phone ?? "",
      location: body.location ?? "",
      budget: body.budget ?? "",
      propertyType: body.propertyType ?? "Byt",
      rooms: body.rooms ?? "2 izby",
      financing: body.financing ?? "Hypotéka",
      timeline: body.timeline ?? "Do 3 mesiacov",
      source: body.source ?? "Web formulár",
      status: body.status ?? "Nový",
      score: Number(body.score ?? 50),
      assignedAgent: body.assignedAgent ?? "Nepriradený",
      note: body.note ?? "",
    });

    try {
      await createActivity({
        leadId: lead.id,
        type: "Lead",
        title: "Vytvorený lead",
        text: `Bol vytvorený nový lead: ${lead.name}.`,
        entityType: "lead",
        entityId: lead.id,
        actorName: lead.assignedAgent || "Systém",
        source: "crm",
        severity: "info",
      });
    } catch {}

    await autoRecalculateForLead(lead.id);

    return okResponse({ lead });
  } catch (error) {
    const result = autoErrorCapture(error, "POST /api/leads");
    return errorResponse(result.error, 400);
  }
}
