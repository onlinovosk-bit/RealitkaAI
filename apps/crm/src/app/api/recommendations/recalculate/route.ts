import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recalculateAllRecommendations, recalculateRecommendationsForLead } from "@/lib/recommendations-store";
import { createActivity } from "@/lib/activities-store";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const leadId = body?.leadId as string | undefined;

    if (leadId) {
      const result = await recalculateRecommendationsForLead(leadId);

      await createActivity({
        leadId,
        type: "AI",
        title: "Prepočet AI odporúčaní pre lead",
        text: `Pre lead boli prepočítané AI odporúčania. Zapísaných odporúčaní: ${result.inserted}.`,
        entityType: "lead",
        entityId: leadId,
        actorName: "Systém",
        source: "ai",
        severity: "info",
        meta: result,
      });

      return NextResponse.json({ ok: true, mode: "single", result });
    }

    const result = await recalculateAllRecommendations();

    await createActivity({
      leadId: null,
      type: "AI",
      title: "Globálny prepočet AI odporúčaní",
      text: `Bol spustený globálny prepočet AI odporúčaní. Zapísaných odporúčaní: ${result.totalRows}.`,
      entityType: "ai_recommendations",
      entityId: "global",
      actorName: "Systém",
      source: "ai",
      severity: "info",
      meta: result,
    });

    return NextResponse.json({ ok: true, mode: "all", result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Nepodarilo sa prepočítať AI odporúčania.",
      },
      { status: 400 }
    );
  }
}
