import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: prospects } = await supabase
    .from("AI AGENT AUTOMAT ONBOARDING no.2.01")
    .select("*")
    .eq("status", "PROSPECT");

  for (const p of prospects ?? []) {
    const score =
      (p.agent_count ?? 0) * 10 +
      (p.region ? 10 : 0) +
      (p.phone ? 20 : 0) +
      (p.website_url ? 20 : 0) +
      (p.raw_data?.length > 100 ? 10 : 0);

    await supabase
      .from("AI AGENT AUTOMAT ONBOARDING no.2.01")
      .update({ lead_score: score })
      .eq("id", p.id);
  }

  return NextResponse.json({ updated: prospects?.length ?? 0 });
}
