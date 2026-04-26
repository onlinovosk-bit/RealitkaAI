import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type CoachingPayload = {
  stats: {
    funnelDropOffStage: string;
    followUpConsistency: number;
    avgDealVelocityDays: number;
  };
  insight: string;
  streakDays: number;
  followUpRankLabel: string;
  dealVelocityLabel: string;
  dealVelocityDeltaLabel: string;
};

function buildFallbackInsight(stage: string, consistency: number) {
  const pct = Math.round(consistency * 100);
  return `Fakty: Najväčší prepad máš vo fáze ${stage} a follow-up konzistencia je ${pct}%. Technika: po obhliadke pošli do 24h sumarizačnú správu + konkrétny ďalší krok. Motivácia: pri tejto disciplíne vieš zrýchliť uzavretie a zvýšiť počet rezervácií.`;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data: stats } = await supabase
    .from("broker_performance_stats")
    .select("id,funnel_drop_off_stage,follow_up_consistency,avg_deal_velocity_days,created_at")
    .eq("broker_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: note } = await supabase
    .from("notifications")
    .select("content,created_at")
    .eq("user_id", user.id)
    .eq("type", "AI_COACH_TIP")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!stats) {
    const fallback: CoachingPayload = {
      stats: {
        funnelDropOffStage: "after_first_viewing",
        followUpConsistency: 0.58,
        avgDealVelocityDays: 18,
      },
      insight: buildFallbackInsight("after_first_viewing", 0.58),
      streakDays: 3,
      followUpRankLabel: "TOP 12%",
      dealVelocityLabel: "18 DNÍ",
      dealVelocityDeltaLabel: "O 4 dni rýchlejšie ako priemer",
    };
    return NextResponse.json({ ok: true, ...fallback, source: "fallback" });
  }

  const stage = stats.funnel_drop_off_stage ?? "after_first_viewing";
  const consistency = Number(stats.follow_up_consistency ?? 0);
  const avgDealVelocityDays = Number(stats.avg_deal_velocity_days ?? 0);
  const insight = note?.content || buildFallbackInsight(stage, consistency);

  const payload: CoachingPayload = {
    stats: {
      funnelDropOffStage: stage,
      followUpConsistency: consistency,
      avgDealVelocityDays,
    },
    insight,
    streakDays: 3,
    followUpRankLabel: "TOP 12%",
    dealVelocityLabel: `${avgDealVelocityDays || 18} DNÍ`,
    dealVelocityDeltaLabel:
      avgDealVelocityDays > 0
        ? `O ${Math.max(1, 22 - avgDealVelocityDays)} dni rýchlejšie ako priemer`
        : "O 4 dni rýchlejšie ako priemer",
  };

  return NextResponse.json({ ok: true, ...payload, source: "db" });
}
