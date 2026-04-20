"use client";
import { useState } from "react";
import type { BriResult } from "@/lib/l99/types";

interface Props {
  bri: BriResult;
  showReasoning?: boolean;
}

const LEVEL_LABELS = {
  critical: { label: "🔥 Kritická priorita", cls: "bri-critical" },
  high:     { label: "⚡ Vysoká priorita",   cls: "bri-high" },
  medium:   { label: "📊 Stredná priorita",  cls: "bri-medium" },
  low:      { label: "🔵 Nízka aktivita",    cls: "bri-low" },
};

export default function BriScoreCard({ bri, showReasoning = true }: Props) {
  const [expanded, setExpanded] = useState(false);
  const level = LEVEL_LABELS[bri.alertLevel];

  return (
    <div className="radiant-glow-enterprise rounded-2xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#6366F1" }}>
          🧠 Index pripravenosti záujemcu™
        </p>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-bold ${level.cls}`}
          style={{ background: "rgba(0,0,0,0.3)" }}
        >
          {level.label}
        </span>
      </div>

      <div className="mb-3 flex items-baseline gap-2">
        <span
          className="text-5xl font-extrabold"
          style={{ color: "#F0F9FF", fontFamily: "var(--font-syne, sans-serif)" }}
        >
          {bri.score}
        </span>
        <span style={{ color: "#475569" }}>/100</span>
      </div>

      {showReasoning && (
        <p className="mb-4 text-xs italic" style={{ color: "#94A3B8" }}>
          {bri.reasoningString}
        </p>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="mb-2 text-xs transition-colors hover:opacity-80"
        style={{ color: "#6366F1" }}
      >
        {expanded ? "▲ Skryť detaily" : "▼ Zobraziť faktory (AI transparentnosť)"}
      </button>

      {expanded && (
        <div className="space-y-2">
          {bri.reasoningFactors.map((factor, i) => (
            <div key={i}>
              <div className="mb-1 flex justify-between text-xs">
                <span style={{ color: "#CBD5E1" }}>{factor.factor}</span>
                <span style={{ color: "#6366F1" }}>{factor.contribution} bodov</span>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: "#0F1F3D" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${factor.value}%`,
                    background: "linear-gradient(90deg, #6366F1, #F59E0B)",
                  }}
                />
              </div>
              <p className="mt-0.5 text-xs" style={{ color: "#475569" }}>
                {factor.explanation}
              </p>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs" style={{ color: "#334155" }}>
        Vypočítané: {new Date(bri.calculatedAt).toLocaleString("sk-SK")}
        {" · "}
        <span style={{ color: "#475569" }}>EU AI Act compliant</span>
      </p>
    </div>
  );
}
