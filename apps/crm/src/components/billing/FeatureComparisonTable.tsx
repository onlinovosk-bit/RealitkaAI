"use client";
import { Fragment } from "react";
import { useState } from "react";

type FeatureRow = {
  category: string;
  feature: string;
  smartStart: string | boolean;
  activeForce: string | boolean;
  marketVision: string | boolean;
  protocolAuthority: string | boolean;
  highlight?: boolean;
};

const FEATURES: FeatureRow[] = [
  // 14+ nových L99 feature flagov podľa aktuálnej matice
  {
    category: "Živé Obchody",
    feature: "Ambient Deal Radar",
    smartStart: false,
    activeForce: false,
    marketVision: false,
    protocolAuthority: true,
    highlight: true,
  },
  {
    category: "Živé Obchody",
    feature: "Ghost 2.0 (BSM 2026)",
    smartStart: false,
    activeForce: false,
    marketVision: true,
    protocolAuthority: true,
    highlight: true,
  },
  {
    category: "Živé Obchody",
    feature: "Kataster Pulse (Limit 100)",
    smartStart: false,
    activeForce: false,
    marketVision: true,
    protocolAuthority: true,
    highlight: true,
  },
  {
    category: "Živé Obchody",
    feature: "Kataster Pulse UNLIMITED",
    smartStart: false,
    activeForce: false,
    marketVision: false,
    protocolAuthority: true,
    highlight: true,
  },
  {
    category: "Živé Obchody",
    feature: "Zero-Click Ingestor",
    smartStart: false,
    activeForce: true,
    marketVision: true,
    protocolAuthority: true,
  },
  {
    category: "Živé Obchody",
    feature: "Ambient Radar Digest",
    smartStart: false,
    activeForce: false,
    marketVision: true,
    protocolAuthority: true,
  },
  {
    category: "Trhová Prevaha",
    feature: "Neural Lead Scoring",
    smartStart: false,
    activeForce: false,
    marketVision: true,
    protocolAuthority: true,
  },
  {
    category: "Trhová Prevaha",
    feature: "Hyper-local Heatmaps",
    smartStart: false,
    activeForce: false,
    marketVision: true,
    protocolAuthority: true,
    highlight: true,
  },
  {
    category: "Trhová Prevaha",
    feature: "Competitor Sleep Detector",
    smartStart: false,
    activeForce: false,
    marketVision: false,
    protocolAuthority: true,
    highlight: true,
  },
  {
    category: "Trhová Prevaha",
    feature: "AI Cenotvorba",
    smartStart: false,
    activeForce: false,
    marketVision: true,
    protocolAuthority: true,
  },
  {
    category: "Trhová Prevaha",
    feature: "Shadow Inventory",
    smartStart: false,
    activeForce: false,
    marketVision: false,
    protocolAuthority: true,
    highlight: true,
  },
  {
    category: "Trhová Prevaha",
    feature: "Market Gap Report",
    smartStart: false,
    activeForce: false,
    marketVision: false,
    protocolAuthority: true,
  },
  {
    category: "Hodnota Značky",
    feature: "Broker Reputation Profile",
    smartStart: true,
    activeForce: true,
    marketVision: true,
    protocolAuthority: true,
  },
  {
    category: "Hodnota Značky",
    feature: "Verified Certificate",
    smartStart: false,
    activeForce: false,
    marketVision: false,
    protocolAuthority: true,
    highlight: true,
  },
  {
    category: "Hodnota Značky",
    feature: "AI Coaching",
    smartStart: false,
    activeForce: false,
    marketVision: false,
    protocolAuthority: true,
    highlight: true,
  },
  {
    category: "Hodnota Značky",
    feature: "Digital Onboarding",
    smartStart: false,
    activeForce: true,
    marketVision: true,
    protocolAuthority: true,
  },
  {
    category: "Hodnota Značky",
    feature: "Agent Integrity Monitor",
    smartStart: false,
    activeForce: false,
    marketVision: false,
    protocolAuthority: true,
  },
  {
    category: "Hodnota Značky",
    feature: "Performance Analytics",
    smartStart: false,
    activeForce: true,
    marketVision: true,
    protocolAuthority: true,
  },
];

function Cell({ value }: { value: string | boolean }) {
  if (value === true) return <span style={{ color: "#22D3EE" }}>✓</span>;
  if (value === false) return <span style={{ color: "#334155" }}>—</span>;
  return <span className="text-xs" style={{ color: "#94A3B8" }}>{value}</span>;
}

export default function FeatureComparisonTable() {
  const [open, setOpen] = useState(false);
  const categories = [...new Set(FEATURES.map((f) => f.category))];

  return (
    <div className="mt-8">
      <button
        onClick={() => setOpen(!open)}
        className="w-full rounded-2xl p-4 text-sm font-semibold transition-all"
        style={{
          background: "rgba(34,211,238,0.04)",
          border: "1px solid rgba(34,211,238,0.10)",
          color: "#22D3EE",
        }}
      >
        {open ? "▲ Skryť" : "▼ Zobraziť"} kompletné porovnanie funkcií
      </button>

      {open && (
        <div
          className="mt-4 overflow-hidden rounded-2xl"
          style={{ border: "1px solid #112240" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#0A1628" }}>
                <th className="p-4 text-left" style={{ color: "#64748B" }}>
                  Funkcia
                </th>
                {["Smart Start", "Active Force", "Market Vision", "Protocol Authority"].map((plan, i) => (
                  <th
                    key={plan}
                    className="p-4 text-center font-bold"
                    style={{ color: i === 3 ? "#EAB308" : i === 2 ? "#34D399" : "#F0F9FF" }}
                  >
                    {i === 2 && <span className="mr-1">⭐</span>}
                    {plan}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <Fragment key={`cat-group-${category}`}>
                  <tr style={{ background: "#050914" }}>
                    <td
                      colSpan={5}
                      className="px-4 py-2 text-xs font-bold uppercase tracking-wider"
                      style={{ color: "#334155" }}
                    >
                      {category}
                    </td>
                  </tr>
                  {FEATURES.filter((f) => f.category === category).map((feature, i) => (
                    <tr
                      key={`${category}-${i}`}
                      className="border-t"
                      style={{
                        borderColor: "#0F1F3D",
                        background: feature.highlight
                          ? "rgba(34,211,238,0.03)"
                          : "#0A1628",
                      }}
                    >
                      <td className="p-4" style={{ color: "#CBD5E1" }}>
                        {feature.feature}
                      </td>
                      <td className="p-4 text-center">
                        <Cell value={feature.smartStart} />
                      </td>
                      <td className="p-4 text-center">
                        <Cell value={feature.activeForce} />
                      </td>
                      <td className="p-4 text-center">
                        <Cell value={feature.marketVision} />
                      </td>
                      <td className="p-4 text-center">
                        <Cell value={feature.protocolAuthority} />
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
