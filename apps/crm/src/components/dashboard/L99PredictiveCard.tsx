"use client";

import type { L99Result } from "@/lib/ai/l99-engine";

export function L99PredictiveCard({ result }: { result: L99Result }) {
  if (result.status === "LOCKED") {
    return (
      <div className="enterprise-locked-overlay-wrapper relative rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900/60 p-6">
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <div
            className="mb-3 flex h-10 w-10 items-center justify-center rounded-full text-lg"
            style={{ background: "rgba(99,102,241,0.12)", color: "#6366F1" }}
          >
            🔒
          </div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
            L99 PREDICTIVE ENGINE
          </h3>
          <p className="mt-1 text-[10px] text-slate-500">
            Dostupné iba v programe Enterprise
          </p>
          <a
            href="/billing"
            className="mt-4 rounded-full bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-500"
          >
            UPGRADE NA ENTERPRISE
          </a>
        </div>
      </div>
    );
  }

  const bri = result.bri ?? 0;
  const isHot = bri > 85;

  return (
    <div
      className={`rounded-2xl p-5 transition-all duration-700 ${
        isHot ? "bg-radiant-enterprise text-white shadow-2xl" : "border border-slate-700 bg-slate-900/80"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className="text-[10px] font-bold tracking-widest"
            style={{ color: isHot ? "#fbbf24" : "#6366F1" }}
          >
            BUYER READINESS INDEX™
          </p>
          <h2 className={`mt-1 text-4xl font-black ${isHot ? "text-gold-gradient" : "text-white"}`}>
            {bri}%
          </h2>
        </div>

        {result.isShadowMatch && (
          <span
            className="animate-bounce rounded-full px-2 py-1 text-[9px] font-black"
            style={{ background: "#fbbf24", color: "#0f172a" }}
          >
            SHADOW MATCH
          </span>
        )}
      </div>

      {result.insights.length > 0 && (
        <div className="mt-5 space-y-2">
          <p className="text-[11px] font-medium opacity-70">
            Kľúčové faktory Asistenta AI:
          </p>
          {result.insights.map((insight, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg p-2 text-[10px] backdrop-blur-md"
              style={{ background: isHot ? "rgba(255,255,255,0.10)" : "rgba(99,102,241,0.08)" }}
            >
              <span className="mt-0.5 shrink-0">⚡</span>
              <span>{insight}</span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-[9px] opacity-40">
        Revolis.AI využíva technológiu Asistent AI. Všetky predikcie majú informatívny charakter.
      </p>
    </div>
  );
}
