import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildForecastSnapshot } from "@/lib/ai/forecast-snapshot";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { data: leads } = await supabase.from("leads").select("score, budget").eq("is_active", true);
  const snapshot = buildForecastSnapshot(
    new Date().toISOString().slice(0, 7),
    (leads ?? []).map((l) => ({ score: l.score ?? 50, budget: l.budget ?? 0 }))
  );
  return NextResponse.json({ ok: true, forecast: snapshot });
}
