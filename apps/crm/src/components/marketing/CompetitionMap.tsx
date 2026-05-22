"use client";

import { useState, useEffect } from "react";
import { Shield, Loader2 } from "lucide-react";
import Link from "next/link";
import type { CompetitionSector } from "@/types/intelligence-hub";
import { SLATE_HORIZON, WORKDESK_CARD, WORKDESK_LOCKED } from "@/lib/slate-horizon-theme";

const DEMO_SECTORS: CompetitionSector[] = [
  { name: "Sekčov", district: "Prešov – Sekčov", competitorCount: 4, heatScore: 80, isDemo: true, trend: "rising" },
  { name: "Sídlisko III", district: "Prešov – Sídlisko III", competitorCount: 1, heatScore: 25, isDemo: true, trend: "stable" },
  { name: "Terasa", district: "Prešov – Terasa", competitorCount: 6, heatScore: 95, isDemo: true, trend: "rising" },
];

const TREND_ICON: Record<CompetitionSector["trend"], string> = { rising: "↑", falling: "↓", stable: "→" };
const TREND_COLOR: Record<CompetitionSector["trend"], string> = {
  rising: SLATE_HORIZON.red,
  falling: SLATE_HORIZON.greenDark,
  stable: SLATE_HORIZON.muted,
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

  const cardStyle = {
    background: WORKDESK_CARD.background,
    border: `1px solid ${WORKDESK_CARD.borderColor}`,
    boxShadow: WORKDESK_CARD.boxShadow,
  };

  if (!isProtocolActive) {
    return (
      <div className="relative overflow-hidden rounded-[2.5rem] p-8" style={cardStyle}>
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-[2.5rem]"
          style={{ background: WORKDESK_LOCKED.overlay, backdropFilter: "blur(6px)" }}
        >
          <Shield size={32} className="mb-3" style={{ color: SLATE_HORIZON.brand }} aria-hidden />
          <p className="mb-1 text-sm font-bold" style={{ color: WORKDESK_LOCKED.titleColor }}>
            Protocol Authority Required
          </p>
          <p className="mb-4 max-w-xs text-center text-xs" style={{ color: WORKDESK_LOCKED.subtitleColor }}>
            Competition Heatmap je dostupná len pre Protocol Authority plán (449€/mes)
          </p>
          {onUpgrade ? (
            <button
              type="button"
              onClick={onUpgrade}
              className={`min-h-11 rounded-xl px-5 py-2.5 text-xs font-black uppercase transition-all hover:scale-[1.02] ${SLATE_HORIZON.focusRing}`}
              style={{ background: SLATE_HORIZON.brand, color: "#fff" }}
            >
              Upgradovať na Protocol Authority
            </button>
          ) : (
            <Link
              href="/billing"
              className={`inline-block min-h-11 rounded-xl px-5 py-2.5 text-xs font-black uppercase transition-all hover:scale-[1.02] ${SLATE_HORIZON.focusRing}`}
              style={{ background: SLATE_HORIZON.brand, color: "#fff" }}
            >
              Zobraziť plány
            </Link>
          )}
        </div>
        <div className="pointer-events-none blur-sm opacity-20" aria-hidden>
          {DEMO_SECTORS.map((s) => (
            <div key={s.name} className="mb-4 space-y-1">
              <div className="h-2 rounded" style={{ background: SLATE_HORIZON.line }} />
              <div
                className="h-1.5 rounded"
                style={{ width: `${s.heatScore}%`, background: s.heatScore > 70 ? SLATE_HORIZON.red : SLATE_HORIZON.brand }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[2.5rem] p-8" style={cardStyle}>
      <div className="mb-8 flex items-center justify-between">
        <h3 className="text-xs font-black uppercase italic tracking-[0.2em]" style={{ color: SLATE_HORIZON.ink }}>
          Live Radar Konkurencie
        </h3>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: SLATE_HORIZON.red }} aria-hidden />
          <span className="text-[9px] font-bold uppercase" style={{ color: SLATE_HORIZON.red }}>
            Protocol Link Active
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8" style={{ color: SLATE_HORIZON.muted }}>
          <Loader2 size={14} className="animate-spin" aria-hidden />
          <span className="text-xs">Načítavam radar...</span>
        </div>
      ) : (
        <div className="space-y-5">
          {sectors.map((s) => (
            <div key={s.name}>
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase" style={{ color: SLATE_HORIZON.deep }}>
                    {s.name}
                  </span>
                  {s.isDemo && (
                    <span className="text-[8px]" style={{ color: SLATE_HORIZON.muted }}>
                      demo
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase">
                  <span style={{ color: TREND_COLOR[s.trend] }}>{TREND_ICON[s.trend]}</span>
                  <span style={{ color: s.heatScore > 70 ? SLATE_HORIZON.red : SLATE_HORIZON.brandDeep }}>
                    {s.competitorCount} makléri v zóne
                  </span>
                </div>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: SLATE_HORIZON.line }}>
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${s.heatScore}%`,
                    background: s.heatScore > 70 ? SLATE_HORIZON.red : SLATE_HORIZON.brand,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="mt-8 text-center text-[8px] uppercase italic tracking-widest" style={{ color: SLATE_HORIZON.muted }}>
        Demo simulácia · Ghost Mode Shield aktívny
      </p>
    </div>
  );
}
