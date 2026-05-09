import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

const ONBOARDING_TABLE = "AI AGENT AUTOMAT ONBOARDING no.2.01";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from(ONBOARDING_TABLE)
    .select("segment, contacted_at, demo_clicked_at");

  if (error) {
    console.error("Heatmap fetch failed:", error);
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  const stats: Record<string, { total: number; contacted: number; demo_clicked: number }> = {};

  for (const row of data ?? []) {
    const seg = row.segment ?? "UNKNOWN";
    if (!stats[seg]) stats[seg] = { total: 0, contacted: 0, demo_clicked: 0 };

    stats[seg].total += 1;
    if (row.contacted_at) stats[seg].contacted += 1;
    if (row.demo_clicked_at) stats[seg].demo_clicked += 1;
  }

  return NextResponse.json({ stats });
}
