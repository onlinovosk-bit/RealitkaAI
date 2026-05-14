import Link from "next/link";
import type { DealHealthIssue } from "@/lib/forecasting-store";

export default function DealHealthPanel({ rows }: { rows: DealHealthIssue[] }) {
  if (!rows.length) {
    return (
      <section className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
        <h2 className="text-lg font-semibold text-slate-100">Deal health</h2>
        <p className="mt-2 text-sm text-slate-500">
          Žiadne výrazné riziká — žiadne omeškané úlohy ani pokročilé fázy bez úloh.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-amber-500/20 bg-slate-950/50 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold text-amber-100">Deal health (majiteľ)</h2>
        <span className="text-xs uppercase tracking-wide text-slate-500">W4</span>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Omeškané otvorené úlohy alebo obhliadka/ponuka bez priradeného follow-upu v úlohách.
      </p>
      <ul className="mt-4 divide-y divide-white/5">
        {rows.map((r) => (
          <li key={r.leadId} className="flex flex-wrap items-start justify-between gap-2 py-3 first:pt-0">
            <div>
              <Link href={`/leads/${r.leadId}`} className="font-medium text-white hover:text-cyan-300">
                {r.leadName}
              </Link>
              <p className="text-xs text-slate-400 mt-0.5">{r.note}</p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p>Pravdep. {r.probabilityPercent}%</p>
              <p className="capitalize">
                {r.kind === "after_deadline_open_tasks" ? "Po termíne" : "Bez úlohy"}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
