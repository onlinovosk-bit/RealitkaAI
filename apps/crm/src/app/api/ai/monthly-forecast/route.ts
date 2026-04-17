import { NextResponse } from "next/server";
import { calculateMonthlyMoneyForecast, calculateTrend } from "@/lib/ai/forecast-money";
import { readForecastEurSnapshot, writeForecastEurSnapshot } from "@/lib/ai/forecast-snapshot";
import { listLeads } from "@/lib/leads-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const leads = await listLeads();
    const forecast = calculateMonthlyMoneyForecast(leads);

    const prev = readForecastEurSnapshot();
    const trend = prev ? calculateTrend(forecast.totalExpectedEur, prev.valueEur) : null;

    writeForecastEurSnapshot(forecast.totalExpectedEur);

    return NextResponse.json({
      ok: true,
      monthLabel: new Date().toLocaleString("sk-SK", { month: "long", year: "numeric" }),
      totalExpectedEur: forecast.totalExpectedEur,
      breakdown: forecast.breakdown,
      trend: trend
        ? {
            diffEur: trend.diff,
            percent: trend.percent,
            previousEur: prev?.valueEur ?? null,
          }
        : null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Forecast zlyhal.",
      },
      { status: 500 }
    );
  }
}
