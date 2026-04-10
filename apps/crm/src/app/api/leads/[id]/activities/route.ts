import { NextResponse } from "next/server";
import { getActivitiesByLeadId } from "@/lib/leads-store";
import { createActivity } from "@/lib/activities-store";
import { rescoreLead } from "@/lib/rescore-lead";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const activities = await getActivitiesByLeadId(id);
    return NextResponse.json({ ok: true, activities });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nepodarilo sa načítať aktivity.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const activity = await createActivity({
      leadId: id,
      type: body.type ?? "Poznámka",
      title: body.type ?? "Poznámka",
      text: body.note ?? "",
      entityType: "lead",
      entityId: id,
      actorName: "Agent",
      source: "crm",
      severity: "info",
    });

    rescoreLead(id); // fire-and-forget

    return NextResponse.json({ ok: true, activity });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nepodarilo sa pridať aktivitu.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
