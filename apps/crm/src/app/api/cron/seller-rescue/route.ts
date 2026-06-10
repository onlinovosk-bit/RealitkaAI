export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications/store";
import { calculateChurnScore, buildChurnResult } from "@/lib/routines/churn-score";

const CLOSED_STATUSES = ["Uzavretý", "Archivovaný", "Stratený"];

async function runSellerRescue() {
  const supabase = createAdminClient();

  const { data: agencies } = await supabase
    .from("agencies")
    .select("id, name");

  if (!agencies?.length) {
    return NextResponse.json({ ok: true, processed: 0, atRiskLeads: 0 });
  }

  let totalAtRisk = 0;

  for (const agency of agencies) {
    const { data: leads } = await supabase
      .from("leads")
      .select(`
        id, name, last_contact, ai_priority,
        status, created_at, assigned_profile_id,
        profiles!assigned_profile_id(full_name)
      `)
      .eq("agency_id", agency.id)
      .limit(300);

    const openLeads = (leads ?? []).filter(
      (lead) => !CLOSED_STATUSES.includes(String(lead.status ?? "")),
    );

    if (!openLeads.length) continue;

    const scored = openLeads
      .map((lead) => {
        const profile = lead.profiles as { full_name?: string | null } | null;
        return {
          lead,
          score: calculateChurnScore(lead),
          agentName: profile?.full_name ?? "Maklér",
        };
      })
      .filter(({ score }) => score >= 50)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    if (!scored.length) continue;

    const rescueData = scored.map(({ lead, score, agentName }) =>
      buildChurnResult(lead, score, agentName),
    );

    const topScore = rescueData[0].churnScore;
    await createNotification({
      agencyId: agency.id,
      type: "seller_rescue",
      priority: topScore >= 80 ? "critical" : "high",
      title: `🚨 ${rescueData.length} ohrozených klientov dnes`,
      body: `TOP riziko: ${rescueData[0].leadName} (${topScore}/100)`,
      data: { leads: rescueData },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    totalAtRisk += rescueData.length;
  }

  return NextResponse.json({
    ok: true,
    processed: agencies.length,
    atRiskLeads: totalAtRisk,
  });
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return await runSellerRescue();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[seller-rescue] failed:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
