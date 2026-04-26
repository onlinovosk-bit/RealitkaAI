// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

async function triggerStrategicAlert(rk: any) {
  await supabase.from("strategic_alerts").insert({
    profile_id: rk.profile_id ?? null,
    title: `PRÍLEŽITOSŤ: ${rk.target_rk_name} vykazuje útlm`,
    description: `V lokalite ${rk.location_focus ?? "nezadané"} klesla aktivita konkurencie. Odporúčame spustiť náborovú kampaň v tejto zóne.`,
    severity: "high",
    type: "COMPETITOR_SLEEP",
    location_focus: rk.location_focus ?? null,
  });
}

Deno.serve(async () => {
  const { data: competitors, error } = await supabase
    .from("competitor_monitoring")
    .select("*")
    .eq("status", "active");

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
  }

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  let scanned = 0;
  let sleeping = 0;

  for (const rk of competitors ?? []) {
    scanned += 1;
    const { count: recentActivityCount } = await supabase
      .from("competitor_activity_logs")
      .select("*", { count: "exact", head: true })
      .eq("competitor_id", rk.id)
      .gte("created_at", oneWeekAgo.toISOString());

    if ((recentActivityCount ?? 0) < 3) {
      sleeping += 1;
      await supabase
        .from("competitor_monitoring")
        .update({ status: "sleeping" })
        .eq("id", rk.id);
      await triggerStrategicAlert(rk);
    }
  }

  return new Response(
    JSON.stringify({ ok: true, scanned, sleeping }),
    { headers: { "Content-Type": "application/json" } },
  );
});
