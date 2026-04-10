"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getLeads, type Lead } from "@/lib/leads-store";
import PriorityLeads from "@/components/dashboard/priority-leads";
import AiInsightsPanel from "@/components/dashboard/AiInsightsPanel";
import { getCurrentProfile } from "@/lib/auth";
import type { PlanTier } from "@/lib/ai-engine";
import PropertiesSummaryWidget from "@/components/dashboard/properties-summary-widget";
import QuickActionsBar from "@/components/dashboard/QuickActionsBar";
import RecentActivityFeed from "@/components/dashboard/recent-activity-feed";
import DailyActionPanel from "@/components/dashboard/DailyActionPanel";

type ForecastingSummary = {
  totalLeads: number;
  expectedClosedDeals: number;
  expectedPipelineValue: number;
  avgProbabilityPercent: number;
};

type ForecastingTargets = {
  expectedClosedDeals: number;
  expectedPipelineValue: number;
  avgProbabilityPercent: number;
};

const DEFAULT_FORECAST_TARGETS: ForecastingTargets = {
  expectedClosedDeals: 3,
  expectedPipelineValue: 500000,
  avgProbabilityPercent: 35,
};

function getTrend(value: number, target: number, suffix = "") {
  const diff = value - target;
  if (diff > 0) return { label: `+${diff.toFixed(suffix ? 0 : 2)}${suffix} nad cieľom`, className: "text-emerald-700" };
  if (diff < 0) return { label: `${diff.toFixed(suffix ? 0 : 2)}${suffix} pod cieľom`, className: "text-rose-700" };
  return { label: "Na cieľovej hodnote", className: "text-gray-600" };
}

function KpiCard({ title, value, subtitle }: { title: string; value: string | number; subtitle: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{title}</p>
      <h2 className="mt-2 text-3xl font-bold text-gray-900">{value}</h2>
      <p className="mt-2 text-sm text-gray-500">{subtitle}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [userName, setUserName] = useState<string | undefined>(undefined);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [plan, setPlan] = useState<PlanTier>("free");
  const [forecastingSummary, setForecastingSummary] = useState<ForecastingSummary | null>(null);
  const [forecastTargets, setForecastTargets] = useState<ForecastingTargets>(DEFAULT_FORECAST_TARGETS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const leadsData = await getLeads();
        setLeads(leadsData);
        try {
          const response = await fetch("/api/forecasting/summary");
          if (response.ok) {
            const payload = await response.json();
            if (payload?.summary) setForecastingSummary(payload.summary as ForecastingSummary);
            if (payload?.targets) {
              setForecastTargets({
                expectedClosedDeals: Number(payload.targets.expectedClosedDeals) || DEFAULT_FORECAST_TARGETS.expectedClosedDeals,
                expectedPipelineValue: Number(payload.targets.expectedPipelineValue) || DEFAULT_FORECAST_TARGETS.expectedPipelineValue,
                avgProbabilityPercent: Number(payload.targets.avgProbabilityPercent) || DEFAULT_FORECAST_TARGETS.avgProbabilityPercent,
              });
            }
          }
        } catch { /* forecasting optional */ }
        // Personalizácia: načítaj meno užívateľa
        try {
          const profile = await getCurrentProfile?.();
          setUserName(profile?.full_name || profile?.email || undefined);
        } catch {}
        try {
          const planRes = await fetch("/api/billing/plan");
          if (planRes.ok) {
            const planData = await planRes.json();
            if (planData?.result?.tier) setPlan(planData.result.tier as PlanTier);
          }
        } catch {}
      } catch (error) {
        console.error("Failed to load dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    }
    void loadDashboard();
  }, []);

  if (isLoading) {
    return (
      <main className="p-6">
        <div className="text-center text-sm text-gray-400">Načítavam dashboard…</div>
      </main>
    );
  }

  const totalLeads = leads.length;
  const hotLeads = leads.filter(l => l.status === "Horúci").length;
  const showings = leads.filter(l => l.status === "Obhliadka").length;
  const offers = leads.filter(l => l.status === "Ponuka").length;
  const conversionRate = totalLeads > 0 ? Math.round((offers / totalLeads) * 100) : 0;

  const dealsTrend = forecastingSummary ? getTrend(forecastingSummary.expectedClosedDeals, forecastTargets.expectedClosedDeals) : null;
  const valueTrend = forecastingSummary ? getTrend(forecastingSummary.expectedPipelineValue, forecastTargets.expectedPipelineValue, " EUR") : null;
  const probabilityTrend = forecastingSummary ? getTrend(forecastingSummary.avgProbabilityPercent, forecastTargets.avgProbabilityPercent, " %") : null;

  return (
    <main className="p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-gray-500">Prehľad výkonnosti tímu a prioritných leadov.</p>
        </div>

        <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="Všetky leady" value={totalLeads} subtitle="V databáze CRM" />
          <KpiCard title="Obhliadky" value={showings} subtitle="Naplánované stretnutia" />
          <KpiCard title="Horúce leady" value={hotLeads} subtitle="Najvyššia priorita" />
          <KpiCard title="Konverzný pomer" value={`${conversionRate}%`} subtitle="Ponuky / celkové" />
        </section>

        <QuickActionsBar />

        <DailyActionPanel leads={leads} plan={plan} />

        <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <PriorityLeads leads={leads} plan={plan} />
          <AiInsightsPanel leads={leads} plan={plan} />
        </section>

        <section className="mb-6">
          <RecentActivityFeed />
        </section>

        <section className="mb-6">
          <Link
            href="/forecasting"
            className="block rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-gray-300 hover:shadow"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Forecasting & Benchmarky</h2>
                <p className="mt-1 text-sm text-gray-500">Predikcia pipeline, benchmark zdrojov leadov a výkonu agentov.</p>
              </div>
              <span className="text-sm font-medium text-gray-700">Otvoriť →</span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-500">Expected deals</p>
                <p className="mt-1 text-base font-semibold text-gray-900">
                  {forecastingSummary ? forecastingSummary.expectedClosedDeals.toFixed(2) : "—"}
                </p>
                {dealsTrend && <p className={`mt-1 text-xs ${dealsTrend.className}`}>{dealsTrend.label}</p>}
              </div>
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-500">Expected value</p>
                <p className="mt-1 text-base font-semibold text-gray-900">
                  {forecastingSummary ? `${forecastingSummary.expectedPipelineValue.toLocaleString("sk-SK")} EUR` : "—"}
                </p>
                {valueTrend && <p className={`mt-1 text-xs ${valueTrend.className}`}>{valueTrend.label}</p>}
              </div>
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-500">Avg probability</p>
                <p className="mt-1 text-base font-semibold text-gray-900">
                  {forecastingSummary ? `${forecastingSummary.avgProbabilityPercent} %` : "—"}
                </p>
                {probabilityTrend && <p className={`mt-1 text-xs ${probabilityTrend.className}`}>{probabilityTrend.label}</p>}
              </div>
            </div>
          </Link>
        </section>

        <section>
          <PropertiesSummaryWidget />
        </section>
      </div>
    </main>
  );
}
