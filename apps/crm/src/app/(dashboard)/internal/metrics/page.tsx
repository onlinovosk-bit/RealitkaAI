import { notFound } from "next/navigation";
import FounderMetricsDashboard from "@/components/metrics/FounderMetricsDashboard";
import { canViewFounderMetrics } from "@/lib/metrics/access";
import { fetchFounderMetrics } from "@/lib/metrics/fetch";
import { METRICS_GUARDRAILS } from "@/lib/metrics/guardrails";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function FounderMetricsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("is_platform_admin")
        .eq("auth_user_id", user.id)
        .maybeSingle()
    : { data: null };

  if (!canViewFounderMetrics({
    email: user?.email,
    isPlatformAdmin: profile?.is_platform_admin,
  })) {
    // Zámerne notFound(), nie „nemáš prístup" — neoprávnenému používateľovi sa
    // existencia internej stránky neprezrádza. Že to doteraz vyzeralo ako pád,
    // spôsobovala rozbitá not-found stránka, nie táto brána.
    notFound();
  }

  const metrics = await fetchFounderMetrics();

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-widest text-slate-500">Internal · Founder</p>
          <h1 className="mt-1 text-3xl font-bold">Metriky</h1>
          <p className="mt-2 text-sm text-slate-400">
            Guardrails: Cockpit attach &gt;{METRICS_GUARDRAILS.cockpitAttachMinPct} % · NRR &gt;
            {METRICS_GUARDRAILS.nrrMinPct} % · Credit revenue{" "}
            {METRICS_GUARDRAILS.creditRevenueMinPct}–{METRICS_GUARDRAILS.creditRevenueMaxPct} %
          </p>
          {metrics ? (
            <p className="mt-1 text-xs text-slate-500">
              As of {new Date(metrics.asOf).toLocaleString("sk-SK")} UTC
            </p>
          ) : null}
        </header>

        {!metrics ? (
          <div
            className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center text-red-200"
            data-testid="founder-metrics-error"
          >
            Nepodarilo sa načítať metriky — skontroluj service role a Supabase schému.
          </div>
        ) : (
          <FounderMetricsDashboard metrics={metrics} />
        )}
      </div>
    </main>
  );
}
