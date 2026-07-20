"use client";

import { useState } from "react";

const PRO_PRICE = 99;
/** Illustrative scenario only — user-controlled uplift, not a claimed average. */
const DEFAULT_SCENARIO_UPLIFT_PCT = 15;

export default function RoiCalculator() {
  const [agents, setAgents] = useState(3);
  const [dealsPerMonth, setDealsPerMonth] = useState(5);
  const [avgCommission, setAvgCommission] = useState(3000);
  const [upliftPct, setUpliftPct] = useState(DEFAULT_SCENARIO_UPLIFT_PCT);

  const uplift = 1 + upliftPct / 100;
  const currentRevenue = agents * dealsPerMonth * avgCommission;
  const withRevolis = currentRevenue * uplift;
  const gain = withRevolis - currentRevenue;
  const roiDays = gain > 0 ? Math.round(PRO_PRICE / (gain / 30)) : 0;

  return (
    <div
      className="rounded-2xl p-6"
      style={{
        background: "rgba(34,211,238,0.04)",
        border: "1px solid rgba(34,211,238,0.15)",
      }}
    >
      <h3 className="text-lg font-bold mb-1" style={{ color: "#F0F9FF" }}>
        Kalkulačka scénára
      </h3>
      <p className="text-sm mb-6" style={{ color: "#64748B" }}>
        Model „čo keby“ — nie priemer z produkcie. Nastavte si vlastný odhad nárastu.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label
            className="text-xs font-semibold mb-2 block"
            style={{ color: "#94A3B8" }}
          >
            Počet maklérov
          </label>
          <input
            type="number"
            min={1}
            max={50}
            value={agents}
            onChange={(e) => setAgents(Math.max(1, Number(e.target.value)))}
            className="w-full rounded-xl px-4 py-2.5 text-sm font-bold outline-none"
            style={{
              background: "#0A1628",
              border: "1px solid #112240",
              color: "#F0F9FF",
            }}
          />
        </div>

        <div>
          <label
            className="text-xs font-semibold mb-2 block"
            style={{ color: "#94A3B8" }}
          >
            Obchody / maklér / mesiac
          </label>
          <input
            type="number"
            min={1}
            max={20}
            value={dealsPerMonth}
            onChange={(e) =>
              setDealsPerMonth(Math.max(1, Number(e.target.value)))
            }
            className="w-full rounded-xl px-4 py-2.5 text-sm font-bold outline-none"
            style={{
              background: "#0A1628",
              border: "1px solid #112240",
              color: "#F0F9FF",
            }}
          />
        </div>

        <div>
          <label
            className="text-xs font-semibold mb-2 block"
            style={{ color: "#94A3B8" }}
          >
            Priemerná provízia (€)
          </label>
          <input
            type="number"
            min={500}
            max={50000}
            step={500}
            value={avgCommission}
            onChange={(e) =>
              setAvgCommission(Math.max(500, Number(e.target.value)))
            }
            className="w-full rounded-xl px-4 py-2.5 text-sm font-bold outline-none"
            style={{
              background: "#0A1628",
              border: "1px solid #112240",
              color: "#F0F9FF",
            }}
          />
        </div>
      </div>

      <div className="mb-6">
        <label className="mb-2 block text-xs font-semibold" style={{ color: "#94A3B8" }}>
          Scénár nárastu uzavretí: +{upliftPct}%
        </label>
        <input
          type="range"
          min={5}
          max={40}
          value={upliftPct}
          onChange={(e) => setUpliftPct(Number(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Výsledky */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className="rounded-xl p-4 text-center"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.15)",
          }}
        >
          <p className="text-xs mb-1" style={{ color: "#94A3B8" }}>
            Bez Revolis.AI
          </p>
          <p className="text-2xl font-bold" style={{ color: "#FCA5A5" }}>
            {currentRevenue.toLocaleString("sk-SK")} €
          </p>
          <p className="text-xs" style={{ color: "#64748B" }}>
            provízií / mesiac
          </p>
        </div>

        <div
          className="rounded-xl p-4 text-center"
          style={{
            background: "rgba(34,211,238,0.08)",
            border: "1px solid rgba(34,211,238,0.15)",
          }}
        >
          <p className="text-xs mb-1" style={{ color: "#94A3B8" }}>
            Scénár s Revolis
          </p>
          <p className="text-2xl font-bold" style={{ color: "#22D3EE" }}>
            {Math.round(withRevolis).toLocaleString("sk-SK")} €
          </p>
          <p className="text-xs" style={{ color: "#64748B" }}>
            provízií / mesiac (+{upliftPct}%)
          </p>
        </div>

        <div
          className="rounded-xl p-4 text-center"
          style={{
            background: "rgba(16,185,129,0.08)",
            border: "1px solid rgba(16,185,129,0.15)",
          }}
        >
          <p className="text-xs mb-1" style={{ color: "#94A3B8" }}>
            Návratnosť (scénár)
          </p>
          <p className="text-2xl font-bold" style={{ color: "#34D399" }}>
            {roiDays} dní
          </p>
          <p className="text-xs" style={{ color: "#64748B" }}>
            zisk +{Math.round(gain).toLocaleString("sk-SK")} € / mes
          </p>
        </div>
      </div>

      <p className="text-xs mt-4 text-center" style={{ color: "#334155" }}>
        * Ilustratívny scénár podľa vašich vstupov — nie meraný priemer zákazníkov.
      </p>
    </div>
  );
}
