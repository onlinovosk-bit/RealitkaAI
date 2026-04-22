"use client";
import { useState, useEffect } from "react";
import { Shield, Loader2 } from "lucide-react";
import Link from "next/link";
import type { CompetitionSector } from "@/types/intelligence-hub";

const DEMO_SECTORS: CompetitionSector[] = [
  { name: "Sekčov",       district: "Prešov – Sekčov",       competitorCount: 4, heatScore: 80, isDemo: true, trend: "rising"  },
  { name: "Sídlisko III", district: "Prešov – Sídlisko III", competitorCount: 1, heatScore: 25, isDemo: true, trend: "stable"  },
  { name: "Terasa",       district: "Prešov – Terasa",       competitorCount: 6, heatScore: 95, isDemo: true, trend: "rising"  },
];

const TREND_ICON:  Record<CompetitionSector["trend"], string> = { rising: "↑", falling: "↓", stable: "→" };
const TREND_COLOR: Record<CompetitionSector["trend"], string> = {
  rising:  "#EF4444",
  falling: "#34D399",
  stable:  "#94A3B8",
};

interface Props {
  isProtocolActive: boolean;
  onUpgrade?: () => void;
}

export function CompetitionMap({ isProtocolActive, onUpgrade }: Props) {
  const [sectors, setSectors] = useState<CompetitionSector[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setSectors(DEMO_SECTORS);
      setLoading(false);
    }, 600);
    return () => clearTimeout(t);
  }, []);

  if (!isProtocolActive) {
    return (
      <div
        className="rounded-[2.5rem] p-8 relative overflow-hidden"
        style={{ background: "#0A0A12", border: "1px solid rgba(255,255,255,0.04)" }}
      >
        {/* Lock overlay */}
        <div
          className="absolute inset-0 rounded-[2.5rem] flex flex-col items-center justify-center z-10"
          style={{ background: "rgba(2,2,5,0.88)", backdropFilter: "blur(8px)" }}
        >
          <Shield size={32} className="mb-3" style={{ color: "#1E293B" }} />
          <p className="text-sm font-bold text-white mb-1">Protocol Authority Required</p>
          <p className="text-xs mb-4 text-center max-w-xs" style={{ color: "#334155" }}>
            Competition Heatmap je dostupná len pre Protocol Authority plán (449€/mes)
          </p>
          {onUpgrade ? (
            <button
              onClick={onUpgrade}
              className="px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all hover:scale-105"
              style={{ background: "#2563EB", color: "#fff" }}
            >
              Upgradovať na Protocol Authority
            </button>
          ) : (
            <Link
              href="/billing"
              className="px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all hover:scale-105 inline-block"
              style={{ background: "#2563EB", color: "#fff" }}
            >
              Zobraziť plány
            </Link>
          )}
        </div>
        {/* Blurred preview */}
        <div className="blur-sm opacity-10 pointer-events-none" aria-hidden>
          {DEMO_SECTORS.map((s) => (
            <div key={s.name} className="mb-4 space-y-1">
              <div className="h-2 rounded" style={{ background: "rgba(255,255,255,0.10)" }} />
              <div
                className="h-1.5 rounded"
                style={{ width: `${s.heatScore}%`, background: s.heatScore > 70 ? "#EF4444" : "#3B82F6" }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-[2.5rem] p-8"
      style={{ background: "#0A0A12", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="flex justify-between items-center mb-8">
        <h3
          className="font-black italic uppercase text-xs tracking-[0.2em]"
          style={{ color: "#F0F9FF" }}
        >
          Live Radar Konkurencie
        </h3>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#EF4444" }} />
          <span className="text-[9px] font-bold uppercase" style={{ color: "#EF4444" }}>
            Protocol Link Active
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 gap-2" style={{ color: "#334155" }}>
          <Loader2 size={14} className="animate-spin" />
          <span className="text-xs">Načítavam radar...</span>
        </div>
      ) : (
        <div className="space-y-5">
          {sectors.map((s) => (
            <div key={s.name}>
              <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase" style={{ color: "#94A3B8" }}>
                    {s.name}
                  </span>
                  {s.isDemo && <span className="text-[8px]" style={{ color: "#1E293B" }}>demo</span>}
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase">
                  <span style={{ color: TREND_COLOR[s.trend] }}>{TREND_ICON[s.trend]}</span>
                  <span style={{ color: s.heatScore > 70 ? "#FCA5A5" : "#93C5FD" }}>
                    {s.competitorCount} makléri v zóne
                  </span>
                </div>
              </div>
              <div
                className="h-1.5 w-full rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width:      `${s.heatScore}%`,
                    background: s.heatScore > 70 ? "#EF4444" : "#3B82F6",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      <p
        className="mt-8 text-[8px] italic uppercase text-center tracking-widest"
        style={{ color: "#1E293B" }}
      >
        Demo simulácia · Ghost Mode Shield aktívny
      </p>
    </div>
  );
}
