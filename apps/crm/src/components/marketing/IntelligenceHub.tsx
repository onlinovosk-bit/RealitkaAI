"use client";
import { useState } from "react";
import { Lock, Mic2, Map, AlertTriangle, Hammer, Globe, Users } from "lucide-react";
import { CompetitionMap } from "./CompetitionMap";

const MODULES = [
  { id: "skener",    title: "Emocionálny skener",  icon: Mic2,         tier: "pro",         color: "#818CF8", text: "AI spozná čo sa klientovi páči a povie ti, na čo zatlačiť." },
  { id: "bod",       title: "Bod Zlomu",            icon: Map,          tier: "pro",         color: "#818CF8", text: "Mapa ulíc kde sa o chvíľu začne sťahovanie." },
  { id: "finance",   title: "Finančné problémy",    icon: AlertTriangle, tier: "enterprise", color: "#60A5FA", text: "AI sleduje exekúcie – vieš kto potrebuje rýchly predaj." },
  { id: "stavba",    title: "Plánovaná stavba",     icon: Hammer,       tier: "enterprise",  color: "#60A5FA", text: "Stavebné povolenia = budúci predajca bytu." },
  { id: "zmena",     title: "Zmena v okolí",        icon: Globe,        tier: "enterprise",  color: "#60A5FA", text: "Predikcia kde porastú ceny (školy, parky, infraštruktúra)." },
  { id: "komunita",  title: "Nálada v komunite",    icon: Users,        tier: "enterprise",  color: "#60A5FA", text: "Facebook skupiny a diskusie – vieš čo ľudia plánujú predať." },
];

export default function IntelligenceHub() {
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      {/* Competition Map demo (locked) */}
      <CompetitionMap isProtocolActive={false} />

      {/* Moduly */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES.map((mod) => {
          const Icon = mod.icon;
          const isOpen = preview === mod.id;
          return (
            <div
              key={mod.id}
              className="group relative p-5 rounded-2xl border cursor-pointer transition-all duration-300"
              style={{
                background: isOpen ? "rgba(37,99,235,0.08)" : "#0A0A12",
                border: isOpen
                  ? `1px solid ${mod.color}50`
                  : "1px solid rgba(255,255,255,0.06)",
                opacity: 0.6,
              }}
              onClick={() => setPreview(isOpen ? null : mod.id)}
            >
              {/* Lock overlay */}
              <div className="absolute top-3 right-3">
                <Lock size={12} style={{ color: "#334155" }} />
              </div>

              <Icon size={22} className="mb-3" style={{ color: mod.color }} />
              <h4 className="text-sm font-black text-white mb-1 uppercase italic">
                {mod.title}
              </h4>
              <p className="text-xs leading-relaxed" style={{ color: "#475569" }}>
                {mod.text}
              </p>

              {isOpen && (
                <div
                  className="mt-3 pt-3 text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    color: mod.color,
                    borderTop: `1px solid ${mod.color}20`,
                  }}
                >
                  Dostupné v {mod.tier === "pro" ? "Market Vision" : "Protocol Authority"}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs" style={{ color: "#334155" }}>
        Interaktívna ukážka · Skutočné dáta po prihlásení
      </p>
    </div>
  );
}
