import { NextResponse } from "next/server";
import { getActivitiesByLeadId, getLead } from "@/lib/leads-store";
import { createActivity } from "@/lib/activities-store";
import { rescoreLead } from "@/lib/rescore-lead";
import { getCurrentProfile } from "@/lib/auth";
import { tryCreateReminderFromNote } from "@/lib/google-calendar-server";

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

    const note = typeof body.note === "string" ? body.note : "";

    const activity = await createActivity({
      leadId: id,
      type: body.type ?? "Poznámka",
      title: body.type ?? "Poznámka",
      text: note,
      entityType: "lead",
      entityId: id,
      actorName: "Agent",
      source: "crm",
      severity: "info",
    });

    rescoreLead(id); // fire-and-forget

    const profile = await getCurrentProfile();
    const lead = await getLead(id);
    const leadName = lead?.name?.trim() || "Kontakt";

    let calendar:
      | { status: "created"; eventId?: string }
      | { status: "fallback"; url: string }
      | { status: "skipped" }
      | undefined;

    if (profile?.id && note.trim()) {
      const result = await tryCreateReminderFromNote({
        profileId: profile.id,
        leadName,
        note: note.trim(),
      });
      if (result.kind === "created") {
        calendar = { status: "created", eventId: result.eventId };
      } else if (result.kind === "fallback") {
        calendar = { status: "fallback", url: result.url };
      } else {
        calendar = { status: "skipped" };
      }
    }

    return NextResponse.json({ ok: true, activity, calendar });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nepodarilo sa pridať aktivitu.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
