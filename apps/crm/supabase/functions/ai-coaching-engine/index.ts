// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

function fallbackInsight(stats: any) {
  const consistencyPct = Math.round((Number(stats.follow_up_consistency ?? 0) || 0) * 100);
  const stage = stats.funnel_drop_off_stage || "after_first_viewing";
  return `Fakty: Najväčší prepad máš vo fáze ${stage} a follow-up konzistencia je ${consistencyPct}%. Technika: nastav do 24 hodín druhý kontakt so skriptom 2 otázok + 1 konkrétny ďalší krok. Motivácia: pri tejto disciplíne vieš zrýchliť uzavretie o 2-4 dni a zvýšiť počet rezervácií.`;
}

async function generateWeeklyInsight(brokerId: string) {
  const { data: stats } = await supabase
    .from("broker_performance_stats")
    .select("*")
    .eq("broker_id", brokerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!stats) return null;

  const insight = fallbackInsight(stats);

  await supabase.from("notifications").insert({
    user_id: brokerId,
    type: "AI_COACH_TIP",
    content: insight,
    metadata: { stats_id: stats.id },
  });

  return insight;
}

Deno.serve(async (req: Request) => {
  const payload = await req.json().catch(() => ({}));
  const brokerId = payload?.brokerId;
  if (!brokerId) {
    return new Response(JSON.stringify({ ok: false, error: "brokerId is required" }), { status: 400 });
  }

  const insight = await generateWeeklyInsight(String(brokerId));
  if (!insight) {
    return new Response(JSON.stringify({ ok: false, error: "No stats found for broker" }), { status: 404 });
  }

  return new Response(JSON.stringify({ ok: true, insight }), {
    headers: { "Content-Type": "application/json" },
  });
});
