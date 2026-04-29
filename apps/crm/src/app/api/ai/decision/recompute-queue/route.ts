import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDecisionFeatureFlags } from "@/lib/ai/decision-flags";
import type { PriorityBucket } from "@/lib/ai/decision-engine-types";

function toBucket(score: number): PriorityBucket {
  if (score >= 85) return "critical";
  if (score >= 70) return "high";
  if (score >= 45) return "normal";
  return "low";
}

export async function POST() {
  const flags = getDecisionFeatureFlags();
  if (!flags.decisionEngineEnabled) {
    return NextResponse.json({ ok: false, error: "Decision engine disabled by feature flag." }, { status: 403 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { data: leads, error } = await supabase
    .from("leads")
    .select("id, name, score, bri_score, budget, status")
    .limit(500);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const queue = (leads ?? [])
    .map((lead) => {
      const baseScore = typeof lead.bri_score === "number" ? lead.bri_score : typeof lead.score === "number" ? lead.score : 50;
      const successProb = Math.max(0.05, Math.min(0.95, baseScore / 100));
      const budget = typeof lead.budget === "number" ? lead.budget : 1000;
      const expectedRevenue = Math.round(budget * successProb * 100) / 100;
      const priorityBucket = toBucket(baseScore);
      return {
        leadId: lead.id,
        name: lead.name ?? "Lead",
        priorityBucket,
        score: baseScore,
        successProb,
        expectedRevenue,
        reason: `score=${baseScore}, status=${lead.status ?? "unknown"}`,
      };
    })
    .sort((a, b) => {
      if (a.priorityBucket !== b.priorityBucket) {
        const order: Record<PriorityBucket, number> = { critical: 0, high: 1, normal: 2, low: 3 };
        return order[a.priorityBucket] - order[b.priorityBucket];
      }
      return b.expectedRevenue - a.expectedRevenue;
    });

  return NextResponse.json({ ok: true, queue });
}
