import { NextResponse } from "next/server";
import { getForecastingData } from "@/lib/forecasting-store";

function getEnvNumber(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function GET() {
  try {
    const data = await getForecastingData();
    const targets = {
      expectedClosedDeals: getEnvNumber("FORECAST_TARGET_EXPECTED_CLOSED_DEALS", 3),
      expectedPipelineValue: getEnvNumber("FORECAST_TARGET_EXPECTED_PIPELINE_VALUE", 500000),
      avgProbabilityPercent: getEnvNumber("FORECAST_TARGET_AVG_PROBABILITY_PERCENT", 35),
    };

    return NextResponse.json({
      ok: true,
      summary: {
        totalLeads: data.kpis.totalLeads,
        expectedClosedDeals: data.kpis.expectedClosedDeals,
        expectedPipelineValue: data.kpis.expectedPipelineValue,
        avgProbabilityPercent: data.kpis.avgProbabilityPercent,
      },
      targets,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Nepodarilo sa nacitat forecasting summary.",
      },
      { status: 500 }
    );
  }
}
