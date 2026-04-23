"use client";

import { useState } from "react";
import { NeuralPulse } from "@/components/visuals/NeuralPulse";
import { GhostBanner } from "@/components/marketing/GhostBanner";
import { CompetitionMap } from "@/components/marketing/CompetitionMap";

const GHOST_DATA = {
  sessionId:   "smolko-demo-2024",
  city:        "Prešov a Košice",
  district:    "Sekčov / Terasa",
  leadCount:   14,
  lastSeenAt:  new Date().toISOString(),
};

export function SmolkoDemoPage() {
  const [showBanner, setShowBanner] = useState(true);

  return (
    <div className="min-h-screen bg-[#010103] text-white relative overflow-hidden font-sans">
      <NeuralPulse />

      {showBanner && (
        <GhostBanner
          data={GHOST_DATA}
          onDismiss={() => setShowBanner(false)}
          onUnlock={() => { window.location.href = "/billing"; }}
        />
      )}

      <div className="max-w-6xl mx-auto pt-32 px-6">

        {/* Header */}
        <header className="mb-16 border-l-4 border-blue-600 pl-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-500 mb-3">
            Revolis L99 Protocol · Exkluzívna ukážka
          </p>
          <h1 className="text-5xl font-black uppercase italic tracking-tighter mb-4">
            Reality Smolko <span className="text-blue-500">×</span> Revolis
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl font-light italic">
            „Váš osobný sprievodca svetom realít – teraz s výkonom umelej inteligencie L99."
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">

          {/* Dashboard Preview */}
          <div
            className="p-10 rounded-[3rem] backdrop-blur-md"
            style={{
              background: "rgba(10,10,18,0.80)",
              border:     "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-6">
              Market Vision Dashboard
            </p>

            <div className="space-y-4 mb-10">
              {/* Aktívna karta */}
              <div
                className="p-5 rounded-2xl"
                style={{ background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.20)" }}
              >
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                  Aktuálny Focus: Prešovský kraj
                </p>
                <p className="text-white font-bold text-sm">
                  Identifikovaných 8 nových príležitostí
                  <span className="text-slate-400 font-normal"> (Dedičstvo / Dar)</span>
                </p>
              </div>

              {/* Zamknutá karta */}
              <div
                className="p-5 rounded-2xl opacity-40 cursor-not-allowed select-none"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
              >
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 underline italic">
                  Protocol Authority · Stealth Bypass
                </p>
                <p className="text-white/50 font-bold text-sm italic">
                  Skenujem aktivitu 912 členov Realitnej únie…
                </p>
              </div>

              {/* Štatistiky */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Nové leady", value: "14", color: "#34D399" },
                  { label: "Exekúcie",   value: "3",  color: "#FCA5A5" },
                  { label: "Dedičstvá",  value: "5",  color: "#FBBF24" },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="p-3 rounded-xl text-center"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    <div className="text-xl font-black" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => { window.location.href = "/billing"; }}
              className="w-full py-5 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] transition-all hover:scale-105"
              style={{
                background:  "#2563EB",
                boxShadow:   "0 0 30px rgba(37,99,235,0.4)",
                color:       "#fff",
              }}
            >
              Spustiť Inteligentný Nábor →
            </button>
          </div>

          {/* Konkurenčná mapa */}
          <CompetitionMap isProtocolActive={false} onUpgrade={() => { window.location.href = "/billing"; }} />

        </div>

        <footer className="mt-20 pb-20 text-center">
          <p className="text-[9px] uppercase tracking-[0.5em]" style={{ color: "#1E293B" }}>
            Exkluzívne pre p. Rastislava Smolka, RSc. · Revolis L99 Protocol
          </p>
        </footer>

      </div>
    </div>
  );
}
