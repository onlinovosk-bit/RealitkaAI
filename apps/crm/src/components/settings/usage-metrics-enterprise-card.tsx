"use client";

import { useEffect, useState } from "react";
import { BarChart3, Loader2 } from "lucide-react";

type Row = { metric_day: string; metric: string; amount: number };

export default function UsageMetricsEnterpriseCard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/settings/usage-metrics?days=14");
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "Chyba");
        if (!cancelled) setRows(data.rows ?? []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Nepodarilo sa načítať.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totals = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.metric] = (acc[r.metric] ?? 0) + Number(r.amount);
    return acc;
  }, {});

  return (
    <div
      className="rounded-2xl border p-5 shadow-sm"
      style={{ borderColor: "#0F1F3D", background: "#080D1A" }}
    >
      <div className="mb-3 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-indigo-400" aria-hidden />
        <h3 className="text-base font-semibold" style={{ color: "#F0F9FF" }}>
          Využitie (AI a automatizácia)
        </h3>
      </div>
      <p className="mb-4 text-xs" style={{ color: "#64748B" }}>
        Súhrn za posledných 14 dní: spotreba tokenov umelej inteligencie,
        vektorové otlačky, denné párovanie a odoslané oslovovacie správy.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm" style={{ color: "#94A3B8" }}>
          <Loader2 className="h-4 w-4 animate-spin" />
          Načítavam…
        </div>
      ) : error ? (
        <p className="text-sm text-amber-400">{error}</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {Object.keys(totals).length === 0 ? (
            <li style={{ color: "#64748B" }}>Zatiaľ žiadne záznamy.</li>
          ) : (
            Object.entries(totals).map(([metric, amount]) => (
              <li
                key={metric}
                className="flex justify-between gap-4 rounded-lg px-3 py-2"
                style={{ background: "rgba(99,102,241,0.08)" }}
              >
                <span style={{ color: "#CBD5E1" }}>{metric}</span>
                <span className="font-mono tabular-nums text-indigo-200">
                  {amount}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
