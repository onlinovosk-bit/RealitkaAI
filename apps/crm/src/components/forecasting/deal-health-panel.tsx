import Link from "next/link";
import type { DealHealthIssue } from "@/lib/forecasting-store";
import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";

export default function DealHealthPanel({ rows }: { rows: DealHealthIssue[] }) {
  if (!rows.length) {
    return (
      <section
        className="rounded-2xl border p-5"
        style={{
          background: WORKDESK_CARD.background,
          borderColor: WORKDESK_CARD.borderColor,
          boxShadow: WORKDESK_CARD.boxShadow,
        }}
      >
        <h2 className="text-lg font-semibold" style={{ color: SLATE_HORIZON.ink }}>
          Deal health
        </h2>
        <p className="mt-2 text-sm" style={{ color: SLATE_HORIZON.muted }}>
          Žiadne výrazné riziká — žiadne omeškané úlohy ani pokročilé fázy bez úloh.
        </p>
      </section>
    );
  }

  return (
    <section
      className="rounded-2xl border p-5"
      style={{
        background: WORKDESK_CARD.background,
        borderColor: "#FDE68A",
        boxShadow: WORKDESK_CARD.boxShadow,
      }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold" style={{ color: "#B45309" }}>
          Deal health (majiteľ)
        </h2>
        <span className="text-xs uppercase tracking-wide" style={{ color: SLATE_HORIZON.muted }}>
          W4
        </span>
      </div>
      <p className="mt-1 text-sm" style={{ color: SLATE_HORIZON.muted }}>
        Omeškané otvorené úlohy alebo obhliadka/ponuka bez priradeného follow-upu v úlohách.
      </p>
      <ul className="mt-4 divide-y" style={{ borderColor: SLATE_HORIZON.line }}>
        {rows.map((r) => (
          <li key={r.leadId} className="flex flex-wrap items-start justify-between gap-2 py-3 first:pt-0">
            <div>
              <Link
                href={`/leads/${r.leadId}`}
                className="font-medium hover:opacity-80"
                style={{ color: SLATE_HORIZON.brandDeep }}
              >
                {r.leadName}
              </Link>
              <p className="mt-0.5 text-xs" style={{ color: SLATE_HORIZON.muted }}>
                {r.note}
              </p>
            </div>
            <div className="text-right text-xs" style={{ color: SLATE_HORIZON.muted }}>
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
