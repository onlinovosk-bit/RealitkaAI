"use client";

import { useMemo, useState } from "react";
import type { ControlTowerView, Figure, ProviderCard } from "@revolis/model-gateway/usage";
import SubscriptionSection from "@/components/ai-control-tower/subscription-section";

function badgeClass(status: Figure["confidence"] | ProviderCard["status"]): string {
  if (status === "live") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
  if (status === "manual") return "border-sky-500/40 bg-sky-500/10 text-sky-200";
  if (status === "stale") return "border-amber-500/40 bg-amber-500/10 text-amber-200";
  return "border-slate-600 bg-slate-800/80 text-slate-300";
}

function FigureLine({ label, figure }: { label: string; figure: Figure }) {
  return (
    <div className="mt-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{figure.display}</p>
      <p className="mt-1 text-xs text-slate-400">
        {figure.confidence === "live"
          ? "Živé"
          : figure.confidence === "manual"
            ? "Manuálne"
            : figure.confidence === "stale"
              ? "Zastarané"
              : "Nedostupné"}
        {" · "}
        {figure.source}
        {figure.updatedAt ? ` · ${figure.updatedAt}` : ""}
      </p>
    </div>
  );
}

export default function ControlTowerDashboard({
  view,
  canWriteSnapshots = false,
}: {
  view: ControlTowerView;
  canWriteSnapshots?: boolean;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const cards = useMemo(
    () =>
      view.cards.filter((card) => {
        if (!needle) return true;
        return `${card.label} ${card.provider} ${card.statusLabel}`.toLowerCase().includes(needle);
      }),
    [needle, view.cards],
  );
  const projects = useMemo(
    () =>
      view.projects.filter((project) => {
        if (!needle) return true;
        return `${project.label} ${project.id}`.toLowerCase().includes(needle);
      }),
    [needle, view.projects],
  );

  return (
    <div className="space-y-6" data-testid="ai-control-tower">
      <label className="block">
        <span className="text-xs uppercase tracking-wide text-slate-500">Hľadať</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Poskytovateľ alebo projekt"
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none ring-sky-500/40 focus:ring"
        />
      </label>

      {view.empty ? (
        <div
          className="rounded-xl border border-dashed border-slate-600 bg-slate-900/60 p-6 text-sm text-slate-300"
          data-testid="ai-control-tower-empty"
        >
          Žiadna prečítaná spotreba ani snímok kvóty. Čísla sa nedopĺňajú. Ledger: {view.ledgerState}. Audit:{" "}
          {view.auditState}. Snímky: {view.snapshotState}.
        </div>
      ) : null}

      <SubscriptionSection view={view.subscriptions} canWrite={canWriteSnapshots} />

      <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 sm:p-5" data-testid="shared-pool">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Spoločný mesačný strop</h2>
          <span className={`rounded-full border px-2 py-0.5 text-xs ${badgeClass(view.sharedPool.status)}`}>
            {view.sharedPool.statusLabel}
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-400">{view.sharedPool.note}</p>
        <div className="mt-2 grid gap-4 sm:grid-cols-3">
          <FigureLine label="Spotreba" figure={view.sharedPool.consumption} />
          <FigureLine label="Limit governora" figure={view.sharedPool.limit} />
          <div className="mt-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Reset obdobia</p>
            <p className="mt-1 text-sm text-white">{view.sharedPool.reset.display}</p>
            <p className="mt-1 text-xs text-slate-400">
              Manuálne · {view.sharedPool.reset.source}
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-200">Prognóza: {view.sharedPool.forecastLabel}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {view.sharedPool.critical ? (
            <span className="rounded-full border border-red-500/50 bg-red-500/10 px-2 py-0.5 text-red-200">Kritické</span>
          ) : null}
          {view.sharedPool.blocked ? (
            <span className="rounded-full border border-red-500/50 bg-red-500/10 px-2 py-0.5 text-red-200">Blokované</span>
          ) : (
            <span className="rounded-full border border-slate-600 px-2 py-0.5 text-slate-300">Nie je blokované</span>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {cards.length === 0 ? (
          <p className="text-sm text-slate-400">Žiadny poskytovateľ nezodpovedá hľadaniu.</p>
        ) : (
          cards.map((card) => (
            <article
              key={card.provider}
              className="rounded-xl border border-slate-700 bg-slate-900/70 p-4"
              data-testid={`provider-${card.provider}`}
              data-status={card.status}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-white">{card.label}</h3>
                <span className={`rounded-full border px-2 py-0.5 text-xs ${badgeClass(card.status)}`}>
                  {card.statusLabel}
                </span>
              </div>
              <FigureLine label="Spotreba" figure={card.consumption} />
              <FigureLine label="Limit poskytovateľa" figure={card.vendorLimit} />
              <div className="mt-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Reset</p>
                <p className="mt-1 text-sm text-white">{card.reset.display}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {card.reset.confidence === "unavailable" ? "Nedostupné" : card.reset.confidence === "manual" ? "Manuálne" : card.reset.confidence === "stale" ? "Zastarané" : "Živé"}
                  {" · "}
                  {card.reset.source}
                </p>
              </div>
              <FigureLine label="Počet modelov" figure={card.modelCount} />
              <p className="mt-3 text-xs text-slate-400">Hlavička API: {card.rateLimitLabel}</p>
              <p className="mt-2 text-sm text-slate-200">Prognóza: {card.forecastLabel}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {card.critical ? (
                  <span className="rounded-full border border-red-500/50 bg-red-500/10 px-2 py-0.5 text-red-200">Kritické</span>
                ) : null}
                {card.blocked ? (
                  <span className="rounded-full border border-red-500/50 bg-red-500/10 px-2 py-0.5 text-red-200">
                    {card.blockedLabel ?? "Blokované"}
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-xs text-slate-500">{card.note}</p>
            </article>
          ))
        )}
      </section>

      <section className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-2 font-medium">Projekt</th>
              <th className="px-4 py-2 font-medium">Spotreba z poolu</th>
              <th className="px-4 py-2 font-medium">Strop</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950/40">
            {projects.map((project) => (
              <tr key={project.id}>
                <td className="px-4 py-3 text-white">{project.label}</td>
                <td className="px-4 py-3">
                  <div className="text-white">{project.consumed.display}</div>
                  <div className="text-xs text-slate-500">{project.consumed.source}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-white">{project.budget.display}</div>
                  <div className="text-xs text-slate-500">{project.budget.source}</div>
                </td>
              </tr>
            ))}
            <tr>
              <td className="px-4 py-3 text-white">Urgentná rezerva</td>
              <td className="px-4 py-3 text-slate-400" colSpan={2}>
                {view.urgentReserve.display}
                <span className="mt-1 block text-xs text-slate-500">{view.urgentReserve.source}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-4" data-testid="tower-alerts">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Prahové alerty</h2>
        <p className="mt-2 text-xs text-slate-400">
          Doručenie: {view.alertDelivery.display} · {view.alertDelivery.source}
        </p>
        {view.alerts.length === 0 ? (
          <p className="mt-3 text-sm text-slate-300">Žiadny nový prah z prečítaných dát.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-slate-200">
            {view.alerts.map((alert) => (
              <li key={alert.key}>{alert.label}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
