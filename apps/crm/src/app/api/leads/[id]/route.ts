import { NextResponse } from "next/server";
import { okResponse, errorResponse } from "@/lib/api-response";
import { deleteLead, getLead, updateLead } from "@/lib/leads-store";
import { createActivity } from "@/lib/activities-store";
import { autoRecalculateForLead } from "@/lib/matching-hooks";
import { rescoreLead } from "@/lib/rescore-lead";
import { UUIDSchema } from "@/lib/api-validate";
import { globalEventBus } from "@/infra/messaging/EventBus";
import { createLeadStatusChangedEvent } from "@/domain/leads/events";
import { notifyHotLead } from "@/services/push/PushNotificationService";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { data: callerProfile } = await supabase
      .from("profiles").select("agency_id").eq("id", user.id).maybeSingle();

    const { id } = await params;

    const idValidation = UUIDSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid lead ID format" },
        { status: 400 }
      );
    }

    const { data: leadRow } = await supabase
      .from("leads").select("agency_id").eq("id", id).maybeSingle();
    if (callerProfile?.agency_id && leadRow?.agency_id !== callerProfile.agency_id) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const oldLead = await getLead(id);

    const lead = await updateLead(id, {
      name: body.name,
      email: body.email,
      phone: body.phone,
      location: body.location,
      budget: body.budget,
      propertyType: body.propertyType,
      rooms: body.rooms,
      financing: body.financing,
      timeline: body.timeline,
      source: body.source,
      status: body.status,
      score: typeof body.score === "number" ? body.score : undefined,
      assignedAgent: body.assignedAgent,
      lastContact: body.lastContact,
      note: body.note,
    });

    try {
      if (oldLead?.status !== lead.status) {
        await createActivity({
          leadId: id,
          type: "Pipeline",
          title: "Zmena stavu leadu",
          text: `Lead bol presunutý zo stavu "${oldLead?.status}" do stavu "${lead.status}".`,
          entityType: "lead",
          entityId: id,
          actorName: lead.assignedAgent || "Systém",
          source: "pipeline",
          severity: "info",
        });
      } else {
        await createActivity({
          leadId: id,
          type: "Úprava",
          title: "Upravený lead",
          text: "Boli upravené údaje leadu.",
          entityType: "lead",
          entityId: id,
          actorName: lead.assignedAgent || "Systém",
          source: "crm",
          severity: "info",
        });
      }
    } catch {}

    await autoRecalculateForLead(id);
    rescoreLead(id); // fire-and-forget: update score + AI insight

    if (oldLead?.status !== lead.status) {
      globalEventBus.emit(createLeadStatusChangedEvent(id, {
        fromStatus: oldLead?.status ?? "Nový",
        toStatus: lead.status,
        agencyId: null,
      }, 1)).catch(() => {/* best-effort */});

      if (lead.status === "Horúci" && lead.assignedProfileId) {
        notifyHotLead(lead.assignedProfileId, lead.name, id).catch(() => {/* best-effort */});
      }
    }

    return okResponse({ lead });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Nepodarilo sa upraviť lead.",
      400
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { data: callerProfile } = await supabase
      .from("profiles").select("agency_id").eq("id", user.id).maybeSingle();

    const { id } = await params;

    const idValidation = UUIDSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid lead ID format" },
        { status: 400 }
      );
    }

    const { data: leadRow } = await supabase
      .from("leads").select("agency_id").eq("id", id).maybeSingle();
    if (callerProfile?.agency_id && leadRow?.agency_id !== callerProfile.agency_id) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const oldLead = await getLead(id);

    await deleteLead(id);

    try {
      await createActivity({
        leadId: null,
        type: "Lead",
        title: "Zmazaný lead",
        text: `Lead "${oldLead?.name ?? id}" bol zmazaný zo systému.`,
        entityType: "lead",
        entityId: id,
        actorName: oldLead?.assignedAgent || "Systém",
        source: "crm",
        severity: "warning",
      });
    } catch {}

    return okResponse({ deletedId: id });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Nepodarilo sa zmazať lead.",
      400
    );
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const idValidation = UUIDSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid lead ID format" },
        { status: 400 }
      );
    }

    const lead = await getLead(id);
    if (!lead) {
      // Always return valid JSON, even if not found
      return okResponse({ lead: null });
    }

    const { data: callerProfile } = await supabase
      .from("profiles").select("agency_id").eq("id", user.id).maybeSingle();
    if (callerProfile?.agency_id) {
      const { data: leadRow } = await supabase
        .from("leads").select("agency_id").eq("id", id).maybeSingle();
      if (leadRow?.agency_id !== callerProfile.agency_id) {
        return errorResponse("Forbidden", 403);
      }
    }

    return okResponse({ lead });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Nepodarilo sa načítať lead.",
      400
    );
  }
}
