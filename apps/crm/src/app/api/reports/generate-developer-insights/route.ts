import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type GapRow = {
  neighborhood_name: string;
  demand_index: number;
  supply_index: number;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city")?.trim() || "Prešov";

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_supply_demand_gap", {
    city_name: city,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const stats = (data ?? []) as GapRow[];
  const opportunities = stats
    .filter((s) => Number(s.demand_index) > Number(s.supply_index) * 1.4)
    .slice(0, 8)
    .map((s) => ({
      location: s.neighborhood_name,
      recommended_action: "Focus on 2-room apartments",
      estimated_roi: "High",
      demand_index: Number(s.demand_index),
      supply_index: Number(s.supply_index),
    }));

  return NextResponse.json({
    ok: true,
    report: {
      title: `Market Intelligence Report: ${city}`,
      quarter: "Q2 2026",
      top_opportunities: opportunities,
      certified_by: "Revolis.AI Neural Engine",
    },
  });
}
