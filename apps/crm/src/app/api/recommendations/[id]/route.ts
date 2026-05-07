export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import {
  addLeadActivity,
  getAiRecommendationById,
  getLeadById,
  updateAiRecommendation,
  type AiRecommendationAuditItem,
  type AiRecommendationInput,
} from "@/lib/leads-store";
import { sendOnboardingEmail } from "@/lib/send-onboarding-email";
import { createClient } from "@/lib/supabase/server";

function formatPriority(priority: string) {
  if (priority === "high") return "Vysoká";
  if (priority === "medium") return "Stredná";
  return "Nízka";
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = (await request.json()) as Partial<AiRecommendationInput>;
    const previous = await getAiRecommendationById(id);

    let recommendation = await updateAiRecommendation(id, body);
    // Ochrana: ak by recommendation bol pole, vezmi prvý objekt
    if (Array.isArray(recommendation)) {
      recommendation = recommendation[0];
    }

    const lead = await getLeadById(recommendation.leadId);
    const changedFields: string[] = [];

    if (previous) {
      if (previous.title !== recommendation.title) changedFields.push("názov");
      if (previous.description !== recommendation.description) changedFields.push("popis");
      if (previous.priority !== recommendation.priority) {
        changedFields.push(
          `priorita ${formatPriority(previous.priority)} -> ${formatPriority(recommendation.priority)}`
        );
      }
      if (previous.status !== recommendation.status) {
        changedFields.push(
          `stav ${previous.status === "active" ? "Aktívne" : "Neaktívne"} -> ${recommendation.status === "active" ? "Aktívne" : "Neaktívne"}`
        );
      }
    }

    const action =
      previous?.status !== recommendation.status
        ? recommendation.status === "active"
          ? "activated"
          : "deactivated"
        : "updated";

    const auditText =
      action === "activated"
        ? `AI odporúčanie aktivované: '${recommendation.title}'.`
        : action === "deactivated"
          ? `AI odporúčanie deaktivované: '${recommendation.title}'.`
          : `AI odporúčanie upravené: '${recommendation.title}'${changedFields.length > 0 ? ` (${changedFields.join(", ")})` : ""}.`;

    await addLeadActivity(recommendation.leadId, auditText, "Email", {
      category: "ai_recommendation",
      action,
      entityId: recommendation.id,
      entityType: "ai_recommendation",
    });

    const audit: AiRecommendationAuditItem = {
      id: crypto.randomUUID(),
      leadId: recommendation.leadId,
      leadName: lead?.name ?? "Neznámy lead",
      action,
      text: auditText,
      date: new Date().toLocaleString("sk-SK", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    // Odoslanie AI activation emailu pri aktivácii odporúčania
    if (action === "activated" && lead?.email && lead?.name) {
      try {
        await sendOnboardingEmail('ai', lead.email, lead.name, 'https://app.revolis.ai/ai');
      } catch (e) {
        console.error('Nepodarilo sa odoslať AI activation email:', e);
      }
    }

    return NextResponse.json({ ok: true, recommendation, audit });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nepodarilo sa upraviť AI odporúčanie.";

    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}