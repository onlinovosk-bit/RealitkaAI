import { NextResponse } from "next/server";
import { okResponse, errorResponse } from "@/lib/api-response";
import { autoErrorCapture } from "@/lib/auto-error-capture";
import { createActivity } from "@/lib/activities-store";
import { createClient } from "@/lib/supabase/server";
import { createLead } from "@/lib/leads-store";
import { autoRecalculateForLead } from "@/lib/matching-hooks";

/** Legacy AI endpoint – normalizované leady pre scoring (session). */
export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leads")
    .select("id, name, phone, status, last_contact_at:last_contact, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("GET /api/leads failed:", error.message);
    // Stabilizačný fallback: API nezhodí UI pri dočasnej DB chybe.
    return NextResponse.json([], {
      status: 200,
      headers: {
        "x-revolis-warning": "leads_fetch_failed",
      },
    });
  }

  const normalized = (data || []).map((lead) => ({
    ...lead,
    status:
      lead.status === "Nový"
        ? "Nový"
        : lead.status === "Obhliadka"
          ? "Obhliadka"
          : lead.status === "Ponuka"
            ? "Ponuka"
            : "Iné",
  }));

  return NextResponse.json(normalized);
}

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
    } catch {
      /* best-effort */
    }

    await autoRecalculateForLead(lead.id);

    return okResponse({ lead });
  } catch (error) {
    const result = autoErrorCapture(error, "POST /api/leads");
    return errorResponse(result.error, 400);
  }
}
