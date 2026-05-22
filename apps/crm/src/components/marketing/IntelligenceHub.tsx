"use client";

import { useState } from "react";
import { Lock, Mic2, Map, AlertTriangle, Hammer, Globe, Users } from "lucide-react";
import { CompetitionMap } from "./CompetitionMap";
import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";
import { DEMO } from "@/lib/demo-slate-styles";

const MODULES = [
  { id: "skener", title: "Emocionálny skener", icon: Mic2, tier: "pro", color: SLATE_HORIZON.brandDeep, text: "AI spozná čo sa klientovi páči a povie ti, na čo zatlačiť." },
  { id: "bod", title: "Bod Zlomu", icon: Map, tier: "pro", color: SLATE_HORIZON.brandDeep, text: "Mapa ulíc kde sa o chvíľu začne sťahovanie." },
  { id: "finance", title: "Finančné problémy", icon: AlertTriangle, tier: "enterprise", color: SLATE_HORIZON.brand, text: "AI sleduje exekúcie – vieš kto potrebuje rýchly predaj." },
  { id: "stavba", title: "Plánovaná stavba", icon: Hammer, tier: "enterprise", color: SLATE_HORIZON.brand, text: "Stavebné povolenia = budúci predajca bytu." },
  { id: "zmena", title: "Zmena v okolí", icon: Globe, tier: "enterprise", color: SLATE_HORIZON.brand, text: "Predikcia kde porastú ceny (školy, parky, infraštruktúra)." },
  { id: "komunita", title: "Nálada v komunite", icon: Users, tier: "enterprise", color: SLATE_HORIZON.brand, text: "Facebook skupiny a diskusie – vieš čo ľudia plánujú predať." },
];

export default function IntelligenceHub() {
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      <CompetitionMap isProtocolActive={false} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((mod) => {
          const Icon = mod.icon;
          const isOpen = preview === mod.id;
          return (
            <button
              key={mod.id}
              type="button"
              className={`group relative rounded-2xl border p-5 text-left transition-all duration-300 ${SLATE_HORIZON.focusRing}`}
              style={{
                background: isOpen ? DEMO.brandTint : WORKDESK_CARD.background,
                border: isOpen ? `1px solid ${SLATE_HORIZON.softBorder}` : `1px solid ${WORKDESK_CARD.borderColor}`,
                boxShadow: WORKDESK_CARD.boxShadow,
                opacity: 0.85,
              }}
              onClick={() => setPreview(isOpen ? null : mod.id)}
            >
              <div className="absolute right-3 top-3">
                <Lock size={12} style={{ color: SLATE_HORIZON.muted }} aria-hidden />
              </div>

              <Icon size={22} className="mb-3" style={{ color: mod.color }} aria-hidden />
              <h4 className="mb-1 text-sm font-black uppercase italic" style={{ color: SLATE_HORIZON.ink }}>
                {mod.title}
              </h4>
              <p className="text-xs leading-relaxed" style={{ color: SLATE_HORIZON.muted }}>
                {mod.text}
              </p>

              {isOpen && (
                <div
                  className="mt-3 pt-3 text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    color: mod.color,
                    borderTop: `1px solid ${SLATE_HORIZON.line}`,
                  }}
                >
                  Dostupné v {mod.tier === "pro" ? "Market Vision" : "Protocol Authority"}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-center text-xs" style={{ color: SLATE_HORIZON.muted }}>
        Interaktívna ukážka · Skutočné dáta po prihlásení
      </p>
    </div>
  );
}
