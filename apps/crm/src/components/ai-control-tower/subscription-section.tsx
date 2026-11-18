"use client";

import type { SubscriptionCapacityView } from "@revolis/model-gateway/subscription-capacity";
import SubscriptionSnapshotForm from "@/components/ai-control-tower/subscription-form";

function barClass(used: number | null): string {
  if (used === null) return "bg-slate-700";
  if (used >= 95) return "bg-red-500";
  if (used >= 85) return "bg-orange-400";
  if (used >= 70) return "bg-amber-400";
  if (used >= 50) return "bg-sky-400";
  return "bg-emerald-400";
}

function badgeClass(status: SubscriptionCapacityView["cards"][number]["status"]): string {
  if (status === "live") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
  if (status === "manual") return "border-sky-500/40 bg-sky-500/10 text-sky-200";
  if (status === "stale") return "border-amber-500/40 bg-amber-500/10 text-amber-200";
  return "border-slate-600 bg-slate-800/80 text-slate-300";
}

export default function SubscriptionSection({
  view,
  canWrite,
}: {
  view: SubscriptionCapacityView;
  canWrite: boolean;
}) {
  return (
    <section className="space-y-4" data-testid="external-subscription-capacity">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
          External Subscription Capacity
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Percentá predplatného sa neprevádzajú na EUR. Grok Bot weekly je jeden zdieľaný pool. Claude weekly a
          session sú samostatné. Chýbajúci zdroj je UNAVAILABLE.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {view.cards.map((card) => (
          <article
            key={card.id}
            className="rounded-xl border border-slate-700 bg-slate-900/70 p-4"
            data-testid={`subscription-${card.id}`}
            data-status={card.statusCode}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-white">{card.label}</h3>
              <span className={`rounded-full border px-2 py-0.5 text-xs ${badgeClass(card.status)}`}>
                {card.statusCode}
              </span>
            </div>
            <p className="mt-3 text-lg font-semibold text-white">
              {card.usedDisplay} spotreba · {card.remainingDisplay} zostáva
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full ${barClass(card.usedPercent)}`}
                style={{ width: `${card.usedPercent ?? 0}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-slate-400">Reset: {card.resetDisplay}</p>
            <p className="mt-1 text-xs text-slate-400">
              Zdroj: {card.source}
              {card.capturedAt ? ` · aktualizácia ${card.capturedAt}` : ""}
            </p>
            <p className="mt-2 text-sm text-slate-200">Prognóza: {card.forecastLabel}</p>
            <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">
              Reakcia: {card.reactionLabel}
            </p>
            <p className="mt-1 text-sm text-slate-300">{card.recommendation}</p>
            {card.note ? <p className="mt-2 text-xs text-slate-500">{card.note}</p> : null}
          </article>
        ))}
      </div>

      {canWrite ? (
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Manuálny snímok</h3>
          <p className="mt-1 text-xs text-slate-500">
            Len platform admin. Do formulára nepatria API kľúče. Rovnaký pool sa aktualizuje, vzorky ostávajú pre
            predikciu.
          </p>
          <SubscriptionSnapshotForm />
        </div>
      ) : null}
    </section>
  );
}
