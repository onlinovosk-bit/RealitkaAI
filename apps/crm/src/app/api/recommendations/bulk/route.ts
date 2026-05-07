import { NextResponse } from "next/server";
import {
  addLeadActivity,
  getLeadById,
  listAiRecommendationsAdmin,
  updateAiRecommendation,
  type AiRecommendationAuditItem,
  type AiRecommendationAdminItem,
  type AiRecommendationStatus,
} from "@/lib/leads-store";
import { createClient } from "@/lib/supabase/server";

function formatDate(value: Date) {
  return value.toLocaleString("sk-SK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as {
      ids?: string[];
      status?: AiRecommendationStatus;
    };

    const ids = Array.isArray(body.ids)
      ? body.ids.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      : [];

    if (ids.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Chýbajú ID odporúčaní." },
        { status: 400 }
      );
    }

    if (body.status !== "active" && body.status !== "inactive") {
      return NextResponse.json(
        { ok: false, error: "Neplatný cieľový stav odporúčaní." },
        { status: 400 }
      );
    }

    const existing = await listAiRecommendationsAdmin();
    const existingMap = new Map(existing.map((item) => [item.id, item]));

    const updates = await Promise.all(
      ids.map(async (id) => {
        const previous = existingMap.get(id);
        const recommendation = await updateAiRecommendation(id, { status: body.status });
        const lead = await getLeadById(recommendation.leadId);
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
              : `AI odporúčanie upravené: '${recommendation.title}'.`;

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
          date: formatDate(new Date()),
        };

        return { recommendation, audit };
      })
    );

    return NextResponse.json({
      ok: true,
      recommendations: updates.map((item) => item.recommendation) satisfies AiRecommendationAdminItem[],
      audits: updates.map((item) => item.audit),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nepodarilo sa hromadne upraviť odporúčania.";

    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
