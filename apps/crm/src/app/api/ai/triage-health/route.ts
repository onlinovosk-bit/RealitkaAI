import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type MetricRow = {
  run_id: string;
  duration_ms: number;
  lock_stale_recovery: number;
  ai_api_fallback_leads: number;
  outcome: string;
  finished_at: string;
};

/**
 * Agregácia kvality AI triáže za posledných 24 h pre aktívnu agentúru (RLS / profiles.agency_id).
 * Metriky behu batchu z tabuľky ai_triage_run_metrics (ak je nasadená migrácia).
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("id", user.id)
    .maybeSingle();

  const agencyId = profile?.agency_id as string | undefined;
  const hints = {
    batch_duration:
      "Z DB stĺpec duration_ms / beh cronu; doplnok: log `ai_triage_run_end`.",
    stale_recovery:
      "Z DB lock_stale_recovery (globálne čísla behu); doplnok: log `ai_triage_lock_phase`.",
    ai_failures:
      "Počet leadov s `AI volanie zlyhalo` v `ai_reason`; doplnok: log `ai_triage_ai_request_failure`.",
  };

  if (!agencyId) {
    return NextResponse.json({
      ok: true,
      window_hours: 24,
      triaged_total: 0,
      ai_native_count: 0,
      fallback_count: 0,
      fallback_ratio: null,
      run_metrics: null,
      hints,
    });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: rows, error } = await supabase
    .from("leads")
    .select("ai_reason")
    .eq("agency_id", agencyId)
    .gte("ai_triage_at", since)
    .not("ai_triage_at", "is", null);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const list = rows ?? [];
  const triaged_total = list.length;
  let fallback_count = 0;
  for (const r of list) {
    const reason = String((r as { ai_reason?: string | null }).ai_reason ?? "");
    if (
      reason.includes("Fallback skóre") ||
      reason.includes("Model nevrátil platný JSON") ||
      reason.includes("AI volanie zlyhalo")
    ) {
      fallback_count += 1;
    }
  }
  const ai_native_count = Math.max(0, triaged_total - fallback_count);
  const fallback_ratio = triaged_total > 0 ? fallback_count / triaged_total : null;

  const { data: metricRows, error: metricErr } = await supabase
    .from("ai_triage_run_metrics")
    .select(
      "run_id, duration_ms, lock_stale_recovery, ai_api_fallback_leads, outcome, finished_at",
    )
    .eq("agency_id", agencyId)
    .gte("finished_at", since)
    .order("finished_at", { ascending: false });

  let run_metrics: {
    runs_observed: number;
    avg_duration_ms: number | null;
    total_stale_lock_recoveries: number;
    total_ai_api_fallback_leads: number;
    error_runs: number;
  } | null = null;

  if (!metricErr && metricRows && metricRows.length > 0) {
    const typed = metricRows as MetricRow[];
    const byRun = new Map<string, MetricRow>();
    for (const r of typed) {
      if (!byRun.has(r.run_id)) {
        byRun.set(r.run_id, r);
      }
    }
    const unique = [...byRun.values()];
    const runs_observed = unique.length;
    const avg_duration_ms =
      runs_observed > 0
        ? Math.round(unique.reduce((s, r) => s + r.duration_ms, 0) / runs_observed)
        : null;
    const total_stale_lock_recoveries = typed.reduce(
      (s, r) => s + (r.lock_stale_recovery ?? 0),
      0,
    );
    const total_ai_api_fallback_leads = typed.reduce(
      (s, r) => s + (r.ai_api_fallback_leads ?? 0),
      0,
    );
    const error_runs = unique.filter((r) => r.outcome === "error").length;

    run_metrics = {
      runs_observed,
      avg_duration_ms,
      total_stale_lock_recoveries,
      total_ai_api_fallback_leads,
      error_runs,
    };
  }

  return NextResponse.json({
    ok: true,
    window_hours: 24,
    triaged_total,
    ai_native_count,
    fallback_count,
    fallback_ratio,
    run_metrics,
    hints,
  });
}
