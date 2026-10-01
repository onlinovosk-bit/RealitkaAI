import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { CoachingPayload } from "@/lib/coaching/coaching-payload";

/** Insight text computed from the broker's measured stats (used when no AI tip is stored). */
function buildStatsInsight(stage: string, consistency: number) {
  const pct = Math.round(consistency * 100);
  const stageLabel = stage === "after_first_viewing" ? "po prvej obhliadke" : stage;
  return `Fakty: Najviac obchodov strácaš ${stageLabel} a pravidelný follow-up máš na ${pct}%. Technika: po obhliadke pošli klientovi do 24 hodín krátku správu: čo ste videli a aký je ďalší krok. Motivácia: keď to budeš robiť vždy, obchody sa uzavrú rýchlejšie a získaš viac rezervácií.`;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data: stats, error: statsError } = await supabase
    .from("broker_performance_stats")
    .select("id,funnel_drop_off_stage,follow_up_consistency,avg_deal_velocity_days,created_at")
    .eq("broker_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (statsError) {
    console.error("[coaching/insight] stats unavailable:", statsError.message);
  }
  if (!stats) {
    // No measured stats → no panel. Showing sample numbers as the broker's own is the failure.
    return NextResponse.json({ ok: false, reason: "no_stats", source: "none" });
  }

  const { data: note } = await supabase
    .from("notifications")
    .select("content,created_at")
    .eq("user_id", user.id)
    .eq("type", "AI_COACH_TIP")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const stage = stats.funnel_drop_off_stage ?? "after_first_viewing";
  const consistency = Number(stats.follow_up_consistency ?? 0);
  const avgDealVelocityDays = Number(stats.avg_deal_velocity_days ?? 0);
  const insight = note?.content || buildStatsInsight(stage, consistency);

  const payload: CoachingPayload = {
    stats: {
      funnelDropOffStage: stage,
      followUpConsistency: consistency,
      avgDealVelocityDays,
    },
    insight,
    streakDays: null,
    followUpRankLabel: null,
    dealVelocityLabel: avgDealVelocityDays > 0 ? `${avgDealVelocityDays} DNÍ` : null,
    dealVelocityDeltaLabel: null,
  };

  return NextResponse.json({ ok: true, ...payload, source: "db" });
}
