"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getLeads, type Lead } from "@/lib/leads-store";
import PriorityLeads from "@/components/dashboard/priority-leads";
import AiInsightsPanel from "@/components/dashboard/AiInsightsPanel";
import EnterpriseSalesIntelligencePanel from "@/components/dashboard/EnterpriseSalesIntelligencePanel";
import { supabaseClient } from "@/lib/supabase/client";
import type { PlanTier } from "@/lib/ai-engine";
import PropertiesSummaryWidget from "@/components/dashboard/properties-summary-widget";
import QuickActionsBar from "@/components/dashboard/QuickActionsBar";
import RecentActivityFeed from "@/components/dashboard/recent-activity-feed";
import DailyActionPanel from "@/components/dashboard/DailyActionPanel";
import TodaysTenLeads from "@/components/dashboard/TodaysTenLeads";
import BrokerCoach from "@/components/coaching/BrokerCoach";
import RevenueView from "@/components/dashboard/RevenueView";
import { useMockAIActivity } from "@/hooks/useMockAIActivity";
import { useCountUp, useGlowOnHover } from "@/hooks/useSpaceInteractions";
import AIPulseSystem from "@/components/space/AIPulseSystem";
import { AIAssistBanner } from "@/components/dashboard/AIAssistBanner";
import { AssistantPanelDynamic } from "@/components/dashboard/AssistantPanel.dynamic";
import L99DecisionOpsPanel from "@/components/dashboard/L99DecisionOpsPanel";

type ForecastingSummary = {
  totalLeads: number;
  expectedClosedDeals: number;
  expectedPipelineValue: number;
  avgProbabilityPercent: number;
};

type MonthlyMoneyForecastPayload = {
  ok?: boolean;
  monthLabel?: string;
  totalExpectedEur?: number;
  breakdown?: Array<{ segment: string; count: number; expectedEur: number }>;
  trend?: { diffEur: number; percent: number; previousEur: number | null } | null;
};

type ForecastingTargets = {
  expectedClosedDeals: number;
  expectedPipelineValue: number;
  avgProbabilityPercent: number;
};

type CoachingInsightPayload = {
  stats: {
    funnelDropOffStage: string;
    followUpConsistency: number;
    avgDealVelocityDays: number;
  };
  insight: string;
  streakDays: number;
  followUpRankLabel: string;
  dealVelocityLabel: string;
  dealVelocityDeltaLabel: string;
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
  const [glowRef, glowStyle] = useGlowOnHover();
  const numeric = typeof value === "number" ? value : Number(String(value).replace("%", ""));
  const animated = useCountUp(Number.isNaN(numeric) ? 0 : numeric);
  const shownValue = typeof value === "string" && value.includes("%") ? `${animated}%` : animated;

  return (
    <div
      ref={glowRef as any}
      style={{ ...glowStyle, background: "#080D1A", borderColor: "rgba(34,211,238,0.10)" }}
      className="rounded-2xl border p-4 md:p-5"
    >
      <p className="text-xs md:text-sm" style={{ color: "#64748B" }}>{title}</p>
      <h2 className="mt-1.5 text-2xl md:text-3xl font-bold" style={{ color: "#F0F9FF" }}>{shownValue}</h2>
      <p className="mt-1 text-xs md:text-sm" style={{ color: "#475569" }}>{subtitle}</p>
    </div>
  );
}

export default function DashboardPage() {
  useMockAIActivity();
  const [userName, setUserName] = useState<string | undefined>(undefined);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [plan, setPlan] = useState<PlanTier>("free");
  const [planKey, setPlanKey] = useState<string>("free");
  const [forecastingSummary, setForecastingSummary] = useState<ForecastingSummary | null>(null);
  const [monthlyMoney, setMonthlyMoney] = useState<MonthlyMoneyForecastPayload | null>(null);
  /** Prečo niekedy nevidno blok: fetch na /api/ai/monthly-forecast musí vrátiť 200 + ok:true (inak starý deploy alebo 500). */
  const [monthlyMoneyStatus, setMonthlyMoneyStatus] = useState<"loading" | "ok" | "error">("loading");
  const [forecastTargets, setForecastTargets] = useState<ForecastingTargets>(DEFAULT_FORECAST_TARGETS);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [enterpriseSalesIntelligence, setEnterpriseSalesIntelligence] = useState(false);
  const [coachingPayload, setCoachingPayload] = useState<CoachingInsightPayload | null>(null);

  const assistantLeadOptions = useMemo(
    () => leads.map((l) => ({ id: l.id, name: l.name })),
    [leads]
  );
  const assistantDefaultLeadId = useMemo(() => leads[0]?.id, [leads]);

  useEffect(() => {
    async function loadDashboard() {
      try {
        let leadsData: Lead[] = [];
        try {
          leadsData = await getLeads();
        } catch (e) {
          console.error("Failed to load leads:", e);
        }
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

        try {
          const mf = await fetch("/api/ai/monthly-forecast");
          const m = (await mf.json()) as MonthlyMoneyForecastPayload & { error?: string };
          if (mf.ok && m?.ok && typeof m.totalExpectedEur === "number") {
            setMonthlyMoney(m);
            setMonthlyMoneyStatus("ok");
          } else {
            setMonthlyMoneyStatus("error");
          }
        } catch {
          setMonthlyMoneyStatus("error");
        }

        try {
          const { data: { user } } = await supabaseClient.auth.getUser();
          if (user) {
            const { data: profile } = await supabaseClient
              .from("profiles")
              .select("full_name, email")
              .eq("auth_user_id", user.id)
              .maybeSingle();
            setUserName(profile?.full_name || profile?.email || user.email || undefined);
          }
        } catch { /* user name optional */ }

        try {
          const planRes = await fetch("/api/billing/plan");
          if (planRes.ok) {
            const planData = await planRes.json();
            if (planData?.tier) setPlan(planData.tier as PlanTier);
            if (planData?.planKey) setPlanKey(planData.planKey as string);
            if (planData?.enterpriseSalesIntelligence) {
              setEnterpriseSalesIntelligence(true);
            }
          }
        } catch { /* plan optional */ }

        try {
          const coachingRes = await fetch("/api/coaching/insight");
          if (coachingRes.ok) {
            const coachingData = (await coachingRes.json()) as { ok?: boolean } & CoachingInsightPayload;
            if (coachingData?.ok) {
              setCoachingPayload({
                stats: coachingData.stats,
                insight: coachingData.insight,
                streakDays: coachingData.streakDays,
                followUpRankLabel: coachingData.followUpRankLabel,
                dealVelocityLabel: coachingData.dealVelocityLabel,
                dealVelocityDeltaLabel: coachingData.dealVelocityDeltaLabel,
              });
            }
          }
        } catch {
          // coaching panel is optional
        }
      } catch (error) {
        console.error("Failed to load dashboard:", error);
        setLoadError("Nepodarilo sa načítať dáta pre prehľad. Skúste obnoviť stránku.");
      } finally {
        setIsLoading(false);
      }
    }
    void loadDashboard();
  }, []);

  if (isLoading) {
    return (
      <main className="p-6">
        <div className="text-center text-sm text-gray-400">Načítavam prehľad…</div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="p-6">
        <div className="mx-auto max-w-md text-center">
          <h2 className="text-lg font-bold text-gray-100">Chyba pri načítaní</h2>
          <p className="mt-2 text-sm text-gray-400">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-xl px-5 py-2.5 text-sm font-semibold"
            style={{
              background: "rgba(34,211,238,0.08)",
              border: "1px solid rgba(34,211,238,0.2)",
              color: "#22d3ee",
            }}
          >
            Obnoviť stránku
          </button>
        </div>
      </main>
    );
  }

  const totalLeads = leads.length;
  const hotLeads = leads.filter(l => l.status === "Horúci").length;
  const showings = leads.filter(l => l.status === "Obhliadka").length;
  const offers = leads.filter(l => l.status === "Ponuka").length;
  const conversionRate = totalLeads > 0 ? Math.round((offers / totalLeads) * 100) : 0;
  const displayTotalLeads = totalLeads;

  const dealsTrend = forecastingSummary ? getTrend(forecastingSummary.expectedClosedDeals, forecastTargets.expectedClosedDeals) : null;
  const valueTrend = forecastingSummary ? getTrend(forecastingSummary.expectedPipelineValue, forecastTargets.expectedPipelineValue, " EUR") : null;
  const probabilityTrend = forecastingSummary ? getTrend(forecastingSummary.avgProbabilityPercent, forecastTargets.avgProbabilityPercent, " %") : null;
  const showRevenueCommandCenter = planKey === "command" || planKey === "enterprise";

  return (
    <main className="p-3 md:p-6" style={{ background: "#050914", minHeight: "100vh" }}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 md:mb-6">
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: "#F0F9FF" }}>Prehľad biznisu</h1>
          <p className="mt-1 text-sm" style={{ color: "#64748B" }}>Prehľad výkonnosti tímu a prioritných príležitostí.</p>
        </div>

        <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <AIAssistBanner plan={plan ?? "free"} />
          <AssistantPanelDynamic
            defaultLeadId={assistantDefaultLeadId}
            leadOptions={assistantLeadOptions}
          />
        </section>

        <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="Všetky príležitosti" value={displayTotalLeads} subtitle="V databáze CRM" />
          <KpiCard title="Obhliadky" value={showings} subtitle="Naplánované stretnutia" />
          <KpiCard title="Horúce príležitosti" value={hotLeads} subtitle="Najvyššia priorita" />
          <KpiCard title="Konverzný pomer" value={`${conversionRate}%`} subtitle="Ponuky / celkové" />
        </section>

        <section className="mb-6 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 via-slate-900/80 to-slate-950 p-5 text-white shadow-[0_0_32px_rgba(16,185,129,0.12)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300/90">
            AI Sales OS — mesačný odhad (€)
          </p>
          {monthlyMoneyStatus === "loading" && (
            <p className="mt-3 text-sm text-emerald-100/80">Načítavam mesačný odhad…</p>
          )}
          {monthlyMoneyStatus === "error" && (
            <div className="mt-3 text-sm text-amber-100/95">
              <p>Mesačný odhad sa nepodarilo načítať.</p>
              <p className="mt-2 text-xs text-emerald-200/70">
                Skontroluj v novom paneli prehliadača adresu{" "}
                <code className="rounded bg-black/30 px-1">/api/ai/monthly-forecast</code> — ak dostaneš{" "}
                <strong>404</strong>, na produkcii ešte nie je nasadený kód s touto route. Po úspešnom deployi
                sa tu zobrazí suma a rozpad.
              </p>
            </div>
          )}
          {monthlyMoneyStatus === "ok" && monthlyMoney && (
            <>
              <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-sm text-emerald-100/80">{monthlyMoney.monthLabel}</p>
                  <p className="mt-1 text-3xl font-bold tabular-nums">
                    {monthlyMoney.totalExpectedEur?.toLocaleString("sk-SK")} ,- €
                  </p>
                  {monthlyMoney.trend && (
                    <p className="mt-1 text-sm text-emerald-200/90">
                      Trend vs. posledný výpočet: {monthlyMoney.trend.percent > 0 ? "+" : ""}
                      {monthlyMoney.trend.percent}% ({monthlyMoney.trend.diffEur > 0 ? "+" : ""}
                      {monthlyMoney.trend.diffEur.toLocaleString("sk-SK")} €)
                    </p>
                  )}
                </div>
                <div className="text-right text-xs text-emerald-100/70">
                  <p>Hot / warm / cold (rozpad)</p>
                  {monthlyMoney.breakdown && (
                    <ul className="mt-1 space-y-0.5">
                      {monthlyMoney.breakdown.map((b) => (
                        <li key={b.segment}>
                          {b.segment}: {b.count} → {b.expectedEur.toLocaleString("sk-SK")} €
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <p className="mt-3 text-[11px] text-emerald-200/60">
                Model: hodnota z rozpočtu × pravdepodobnosť podľa skóre (viac v dokumentácii AI Sales OS).
              </p>
            </>
          )}
        </section>

        <QuickActionsBar />

        <DailyActionPanel leads={leads} plan={plan} />
        <div className="mb-6">
          <TodaysTenLeads leads={leads} />
        </div>
        <L99DecisionOpsPanel leads={assistantLeadOptions} />

        {coachingPayload ? (
          <section className="mb-6">
            <BrokerCoach
              insight={coachingPayload.insight}
              streakDays={coachingPayload.streakDays}
              brokerStats={{
                followUpRankLabel: coachingPayload.followUpRankLabel,
                dealVelocityLabel: coachingPayload.dealVelocityLabel,
                dealVelocityDeltaLabel: coachingPayload.dealVelocityDeltaLabel,
              }}
            />
          </section>
        ) : null}

        <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <PriorityLeads leads={leads} plan={plan} />
          <AiInsightsPanel leads={leads} plan={plan} />
        </section>

        <section className="mb-6">
          <EnterpriseSalesIntelligencePanel
            enabled={enterpriseSalesIntelligence}
          />
        </section>

        {showRevenueCommandCenter ? (
          <section className="mb-6">
            <RevenueView />
          </section>
        ) : null}

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
                <h2 className="text-lg font-semibold text-gray-900">Kde zarobíme a kde zaostávame.</h2>
                <p className="mt-1 text-sm text-gray-500">Predpoveď vývoja klientov, porovnanie zdrojov príležitostí a výkonu maklérov.</p>
              </div>
              <span className="text-sm font-medium text-gray-700">Otvoriť →</span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-500">Očakávané uzavretia</p>
                <p className="mt-1 text-base font-semibold text-gray-900">
                  {forecastingSummary ? forecastingSummary.expectedClosedDeals.toFixed(2) : "—"}
                </p>
                {dealsTrend && <p className={`mt-1 text-xs ${dealsTrend.className}`}>{dealsTrend.label}</p>}
              </div>
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-500">Očakávaná hodnota</p>
                <p className="mt-1 text-base font-semibold text-gray-900">
                  {forecastingSummary ? `${forecastingSummary.expectedPipelineValue.toLocaleString("sk-SK")} EUR` : "—"}
                </p>
                {valueTrend && <p className={`mt-1 text-xs ${valueTrend.className}`}>{valueTrend.label}</p>}
              </div>
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-500">Priem. pravdepodobnosť</p>
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
      <AIPulseSystem />
    </main>
  );
}
