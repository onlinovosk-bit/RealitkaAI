"use client";

import { SLATE_HORIZON, WORKDESK_CARD, WORKDESK_KPI } from "@/lib/slate-horizon-theme";
import {
  REVENUE_TILE_REGISTRY,
  countLeadsBySource,
  type RevenueTilePolicy,
} from "@/lib/modules/revenue-intelligence";
import type { Lead } from "@/lib/leads-store";

function Card({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <div
      className="rounded-2xl border p-5"
      style={{
        background: WORKDESK_CARD.background,
        borderColor: accent ?? WORKDESK_CARD.borderColor,
        boxShadow: WORKDESK_CARD.boxShadow,
      }}
    >
      {children}
    </div>
  );
}

function PendingTile({
  title,
  policy,
  sourceLabel,
}: {
  title: string;
  policy: RevenueTilePolicy;
  sourceLabel?: string;
}) {
  return (
    <Card accent={SLATE_HORIZON.softBorder}>
      <p className="mb-2 text-[10px] font-bold uppercase" style={{ color: SLATE_HORIZON.muted }}>
        {title}
      </p>
      <p className="text-sm font-semibold" style={{ color: SLATE_HORIZON.deep }}>
        Počíta sa z {sourceLabel ?? policy.source}.
      </p>
      <p className="mt-2 text-xs" style={{ color: SLATE_HORIZON.muted }}>
        {policy.pendingMessage ?? "Dlaždica čaká na napojenie dátového zdroja."}
      </p>
    </Card>
  );
}

export default function RevenueView({ leads }: { leads: Lead[] }) {
  const sourceRows = countLeadsBySource(leads);
  const topSources = sourceRows.slice(0, 4);
  const totalNew = leads.filter((lead) => lead.status === "Nový" || lead.status === "new").length;

  const liquidityPolicy = REVENUE_TILE_REGISTRY.liquidity_radar;
  const pipelinePolicy = REVENUE_TILE_REGISTRY.pipeline_velocity;
  const demandGapPolicy = REVENUE_TILE_REGISTRY.demand_supply_gap;
  const forecastPolicy = REVENUE_TILE_REGISTRY.forecast_risk;
  const aiPriorityPolicy = REVENUE_TILE_REGISTRY.ai_priority_strip;
  const neuralPolicy = REVENUE_TILE_REGISTRY.neural_prediction_accuracy;
  const pulsePolicy = REVENUE_TILE_REGISTRY.live_market_pulse;

  return (
    <section
      className="space-y-8 rounded-[2rem] border p-6 md:p-8"
      style={{
        background: WORKDESK_KPI.background,
        borderColor: WORKDESK_KPI.borderColor,
        boxShadow: WORKDESK_KPI.boxShadow,
      }}
    >
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p
            className="text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{ color: SLATE_HORIZON.brandDeep }}
          >
            Revenue intelligence
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight md:text-3xl" style={{ color: SLATE_HORIZON.ink }}>
            Kde vzniká príležitosť
          </h2>
          <p className="mt-2 text-xs" style={{ color: SLATE_HORIZON.muted }}>
            Live dlaždice: Action Queue, Leady podľa zdroja a Kataster kontext.
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase" style={{ color: SLATE_HORIZON.muted }}>
            Action Queue
          </p>
          <p className="font-mono text-xs font-semibold" style={{ color: SLATE_HORIZON.greenDark }}>
            {totalNew} leadov čaká na prvý kontakt
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <PendingTile
          title="Likvidita v Radare"
          policy={liquidityPolicy}
          sourceLabel="leads.budget"
        />

        <Card accent="#FDE68A">
          <p className="mb-2 text-[10px] font-bold uppercase" style={{ color: SLATE_HORIZON.muted }}>
            Leady podľa zdroja
          </p>
          <div className="space-y-2">
            {topSources.length > 0 ? (
              topSources.map((row) => (
                <div key={row.source} className="flex items-center justify-between text-xs">
                  <span style={{ color: SLATE_HORIZON.deep }}>{row.source}</span>
                  <span className="font-bold" style={{ color: SLATE_HORIZON.brandDeep }}>
                    {row.count}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs" style={{ color: SLATE_HORIZON.muted }}>
                Počkajte na prvé leady.
              </p>
            )}
          </div>
        </Card>

        <PendingTile title="Pipeline Velocity" policy={pipelinePolicy} sourceLabel="zmeny status v čase" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <PendingTile title="Forecast / predikcia rizika" policy={forecastPolicy} sourceLabel="activities + status história" />

        <Card accent="#93C5FD">
          <p className="mb-2 text-[10px] font-bold uppercase" style={{ color: SLATE_HORIZON.muted }}>
            Kataster / parcelný kontext
          </p>
          <p className="text-sm font-semibold" style={{ color: SLATE_HORIZON.deep }}>
            Live display-only nad ZBGIS WMS.
          </p>
          <p className="mt-2 text-xs" style={{ color: SLATE_HORIZON.muted }}>
            Modul je dostupný v L99 Hub; bez vlastníkov a bez ukladania citlivých dát.
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <PendingTile title="AI Priority Strip" policy={aiPriorityPolicy} sourceLabel="leads.ai_priority" />

        <Card accent={SLATE_HORIZON.line}>
          <h3 className="mb-6 text-center text-xs font-bold uppercase tracking-widest" style={{ color: SLATE_HORIZON.deep }}>
            Skrytá dlaždica
          </h3>
          <p className="text-sm font-semibold" style={{ color: SLATE_HORIZON.deep }}>
            {demandGapPolicy.label}
          </p>
          <p className="mt-2 text-xs" style={{ color: SLATE_HORIZON.muted }}>
            Skryté: zdroj {demandGapPolicy.source} ešte nie je legálne/prevádzkovo napojený.
          </p>
        </Card>

        <Card accent={SLATE_HORIZON.line}>
          <h3 className="mb-6 text-center text-xs font-bold uppercase tracking-widest" style={{ color: SLATE_HORIZON.deep }}>
            Skrytá dlaždica
          </h3>
          <p className="text-sm font-semibold" style={{ color: SLATE_HORIZON.deep }}>
            {neuralPolicy.label} / {pulsePolicy.label}
          </p>
          <p className="mt-2 text-xs" style={{ color: SLATE_HORIZON.muted }}>
            Skryté: vyžadujú historické/portálové zdroje, ktoré zatiaľ nie sú napojené.
          </p>
        </Card>
      </div>
    </section>
  );
}
