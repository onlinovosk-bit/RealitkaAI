"use client";

import type {
  OperatorAgencyRow,
  OperatorAttentionItem,
  OperatorDashboardPayload,
} from "@/lib/operator/types";

function formatAge(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  if (Number.isNaN(ms) || ms < 0) return "—";
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} d`;
}

function statusChip(status: OperatorAgencyRow["status"], excluded: boolean) {
  if (excluded || status === "system") {
    return (
      <span className="rounded-full border border-slate-600 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">
        systém
      </span>
    );
  }
  if (status === "onboarding") {
    return (
      <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-300">
        onboarding
      </span>
    );
  }
  return (
    <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-300">
      beží
    </span>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex h-6 items-end gap-0.5" aria-hidden>
      {values.map((v, i) => (
        <div
          key={i}
          className="w-1 rounded-sm bg-violet-400/70"
          style={{ height: `${Math.max(8, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

function HealthStrip({ payload }: { payload: OperatorDashboardPayload }) {
  const h = payload.platformHealth;
  return (
    <div
      className="flex flex-wrap items-center gap-4 border-b border-slate-800 bg-slate-900/80 px-6 py-3 font-mono text-xs text-slate-400"
      data-testid="operator-health-strip"
    >
      <span>
        Widgety: {h.valuationWidgetsEnabled}/{h.valuationWidgetsTotal} zapnuté
      </span>
      <span>
        Strážca: {h.guardianLastRunAt ? formatAge(h.guardianLastRunAt) + " dozadu" : "zatiaľ bez dát"}
      </span>
      <span>
        Denný súhrn: {h.guardianDigestEnabled ? "zapnutý" : "vypnutý"}
      </span>
      <span className="ml-auto text-slate-500">
        Beh runnera: {h.guardianRunnerEnabled ? "áno" : "vypnutý"}
      </span>
    </div>
  );
}

function AttentionFeed({ items }: { items: OperatorAttentionItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-slate-400" data-testid="operator-attention-empty">
        Dnes žiadne signály — všetko v norme alebo mimo rozsahu.
      </p>
    );
  }
  return (
    <ul className="grid gap-2" data-testid="operator-attention-feed">
      {items.slice(0, 20).map((item, idx) => (
        <li
          key={`${item.agencyId}-${item.signalType}-${idx}`}
          className="grid grid-cols-[4px_1fr_auto] gap-3 rounded-lg border border-slate-800 bg-slate-900/60"
        >
          <div
            className={
              item.priority === 1
                ? "rounded-l-lg bg-red-500"
                : item.priority === 2
                  ? "rounded-l-lg bg-amber-400"
                  : "rounded-l-lg bg-blue-400"
            }
          />
          <div className="py-3">
            <p className="font-mono text-[10px] uppercase tracking-wide text-slate-500">
              {item.agencyName}
            </p>
            <p className="font-semibold text-slate-100">{item.label}</p>
            <p className="text-sm text-slate-400">{item.detail}</p>
          </div>
          <div className="flex items-center pr-4 font-mono text-xs text-red-300">
            {formatAge(item.detectedAt)}
          </div>
        </li>
      ))}
    </ul>
  );
}

function reactionCell(row: OperatorAgencyRow) {
  if (row.reaction24hStatus === "unavailable") {
    return <span className="text-slate-500">zatiaľ bez dát</span>;
  }
  const pct = Math.round((row.reaction24hPct ?? 0) * 100);
  return <span className="font-mono text-slate-200">{pct} %</span>;
}

export default function OperatorDashboardClient({
  payload,
}: {
  payload: OperatorDashboardPayload;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <HealthStrip payload={payload} />
      <div className="mx-auto max-w-6xl px-6 py-8">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-widest text-slate-500">Platforma · Operátor</p>
          <h1 className="mt-1 text-3xl font-bold">Prehľad kancelárií</h1>
          <p className="mt-2 text-sm text-slate-400">
            Agregáty bez PII · as of {new Date(payload.asOf).toLocaleString("sk-SK")}
          </p>
        </header>

        <section className="mb-10">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Pozornosť dnes
          </h2>
          <AttentionFeed items={payload.attention} />
        </section>

        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Kancelárie
          </h2>
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[880px] text-sm" data-testid="operator-agency-table">
              <thead>
                <tr className="border-b border-slate-800 text-left font-mono text-[10px] uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Kancelária</th>
                  <th className="px-4 py-3">Stav</th>
                  <th className="px-4 py-3">Kontakty 7 d</th>
                  <th className="px-4 py-3">Trend 14 d</th>
                  <th className="px-4 py-3">Reakcia 24 h</th>
                  <th className="px-4 py-3">Won / Lost</th>
                  <th className="px-4 py-3">Nálezy</th>
                  <th className="px-4 py-3">Zdravie</th>
                </tr>
              </thead>
              <tbody>
                {payload.agencies.map((row) => (
                  <tr key={row.agencyId} className="border-b border-slate-800/80 hover:bg-slate-900/50">
                    <td className="px-4 py-3 font-medium">
                      {row.agencyName}
                      {row.excludedFromScoring ? (
                        <span className="mt-0.5 block text-xs text-slate-500">mimo hodnotenia</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{statusChip(row.status, row.excludedFromScoring)}</td>
                    <td className="px-4 py-3 font-mono">
                      {row.contacts7d}
                      <span className="text-slate-500"> / {row.contactsTotal}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Sparkline values={row.trend14d} />
                    </td>
                    <td className="px-4 py-3">{reactionCell(row)}</td>
                    <td className="px-4 py-3 font-mono">
                      {row.dealsWon} / {row.dealsLost}
                    </td>
                    <td className="px-4 py-3 font-mono">{row.openGuardianFindings}</td>
                    <td className="px-4 py-3 font-mono">
                      {row.healthScore === null ? "—" : row.healthScore}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
