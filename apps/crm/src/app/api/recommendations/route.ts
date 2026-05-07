import { NextResponse } from "next/server";
import {
  addLeadActivity,
  createAiRecommendation,
  getLeadById,
  listAiRecommendationsAdmin,
  type AiRecommendationAuditItem,
  type AiRecommendationInput,
} from "@/lib/leads-store";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const recommendations = await listAiRecommendationsAdmin();
    return NextResponse.json({ ok: true, recommendations });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nepodarilo sa načítať AI odporúčania.";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as AiRecommendationInput;
    const recommendation = await createAiRecommendation(body);
    const lead = await getLeadById(recommendation.leadId);
    const auditText = `AI odporúčanie vytvorené: '${recommendation.title}' (${recommendation.priority}).`;

    await addLeadActivity(recommendation.leadId, auditText, "Email", {
      category: "ai_recommendation",
      action: "created",
      entityId: recommendation.id,
      entityType: "ai_recommendation",
    });

    const audit: AiRecommendationAuditItem = {
      id: crypto.randomUUID(),
      leadId: recommendation.leadId,
      leadName: lead?.name ?? "Neznámy lead",
      action: "created",
      text: auditText,
      date: new Date().toLocaleString("sk-SK", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    return NextResponse.json({ ok: true, recommendation, audit }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nepodarilo sa vytvoriť AI odporúčanie.";

    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}