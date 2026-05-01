import { NextResponse } from "next/server";
import { okResponse, errorResponse } from "@/lib/api-response";
import { deleteLead, getLead, updateLead } from "@/lib/leads-store";
import { createActivity } from "@/lib/activities-store";
import { autoRecalculateForLead } from "@/lib/matching-hooks";
import { rescoreLead } from "@/lib/rescore-lead";
import { UUIDSchema } from "@/lib/api-validate";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const idValidation = UUIDSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid lead ID format" },
        { status: 400 }
      );
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
    const { id } = await params;

    const idValidation = UUIDSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid lead ID format" },
        { status: 400 }
      );
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
    return okResponse({ lead });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Nepodarilo sa načítať lead.",
      400
    );
  }
}
