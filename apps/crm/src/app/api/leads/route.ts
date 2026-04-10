import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Fetch leads with required fields
  const { data, error } = await supabase
    .from("leads")
    .select("id, name, phone, status, last_contact_at, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json([], { status: 500 });
  }

  // Normalize statuses (SK → AI engine)
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
