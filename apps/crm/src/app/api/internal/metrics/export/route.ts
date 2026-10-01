import { NextResponse } from "next/server";
import { isFounderMetricsViewer } from "@/lib/metrics/access";
import {
  aiCostDailyCsv,
  founderMetricsSummaryCsv,
  metricsTrendsCsv,
} from "@/lib/metrics/csv";
import { fetchFounderMetrics } from "@/lib/metrics/fetch";
import { createClient } from "@/lib/supabase/server";

const VALID_KINDS = new Set(["summary", "ai-cost", "trends"]);

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isFounderMetricsViewer(user?.email)) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const kind = url.searchParams.get("kind")?.trim() ?? "summary";
  if (!VALID_KINDS.has(kind)) {
    return NextResponse.json({ ok: false, error: "Invalid kind" }, { status: 400 });
  }

  const metrics = await fetchFounderMetrics();
  if (!metrics) {
    return NextResponse.json({ ok: false, error: "Metrics unavailable" }, { status: 503 });
  }

  const date = new Date().toISOString().slice(0, 10);
  let csv: string;
  let filename: string;

  switch (kind) {
    case "ai-cost":
      if (!metrics.aiCost.available) {
        return NextResponse.json(
          { ok: false, error: "ai_cost_daily view unavailable" },
          { status: 503 },
        );
      }
      csv = aiCostDailyCsv(metrics.aiCostDailySeries);
      filename = `founder_metrics_ai_cost_${date}.csv`;
      break;
    case "trends":
      csv = metricsTrendsCsv(metrics.trends);
      filename = `founder_metrics_trends_${date}.csv`;
      break;
    default:
      csv = founderMetricsSummaryCsv(metrics);
      filename = `founder_metrics_summary_${date}.csv`;
  }

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=${filename}`,
    },
  });
}
