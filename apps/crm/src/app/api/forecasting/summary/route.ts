import { NextResponse }        from "next/server";
import { createClient }        from "@/lib/supabase/server";
import { getForecastingData }  from "@/lib/forecasting-store";

function getEnvNumber(name: string, fallback: number) {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const data    = await getForecastingData();
    const targets = {
      expectedClosedDeals:    getEnvNumber("FORECAST_TARGET_EXPECTED_CLOSED_DEALS", 3),
      expectedPipelineValue:  getEnvNumber("FORECAST_TARGET_EXPECTED_PIPELINE_VALUE", 500000),
      avgProbabilityPercent:  getEnvNumber("FORECAST_TARGET_AVG_PROBABILITY_PERCENT", 35),
    };

    return NextResponse.json({
      ok: true,
      summary: {
        totalLeads:             data.kpis.totalLeads,
        expectedClosedDeals:    data.kpis.expectedClosedDeals,
        expectedPipelineValue:  data.kpis.expectedPipelineValue,
        avgProbabilityPercent:  data.kpis.avgProbabilityPercent,
      },
      targets,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Nepodarilo sa načítať forecasting summary." }, { status: 500 });
  }
}
