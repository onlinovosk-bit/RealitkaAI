"use client";

import { Eye, Zap, AlertTriangle, Mic2, Map, TrendingUp } from "lucide-react";

const FEATURES = [
  {
    icon: Eye,
    badge: "L99 MODULE",
    badgeColor: "#60A5FA",
    title: "„Za koľko predal sused?"",
    desc: "Unikátny monitoring pohybov cien na konkrétnej ulici. Aktivuje zvedavosť klientov a udržuje značku Reality Smolko v ich povedomí mesiace pred samotným predajom.",
    tier: "starter",
  },
  {
    icon: AlertTriangle,
    badge: "MARKET VISION",
    badgeColor: "#818CF8",
    title: "Finančný radar",
    desc: "AI sleduje exekúcie a dedičské konania v Prešovskom kraji. Vieš kto potrebuje rýchly predaj skôr, ako sa objaví na portáli.",
    tier: "pro",
  },
  {
    icon: Mic2,
    badge: "MARKET VISION",
    badgeColor: "#818CF8",
    title: "Emocionálny skener",
    desc: "AI počúva obhliadku a v reálnom čase ti šepká na čo má klient pozitívnu reakciu — kde zatlačiť, kde spomaliť.",
    tier: "pro",
  },
  {
    icon: Map,
    badge: "PROTOCOL AUTHORITY",
    badgeColor: "#34D399",
    title: "Bod Zlomu",
    desc: "Mapa ulíc kde sa o 6–18 mesiacov začne sťahovanie. Budeš tam s ponukou prvý — bez studeného hovoru.",
    tier: "enterprise",
  },
  {
    icon: Zap,
    badge: "PROTOCOL AUTHORITY",
    badgeColor: "#34D399",
    title: "Stealth Bypass",
    desc: "Sleduje aktivitu maklérov konkurencie. Vieš ktoré mandáty sa uvoľnia a kedy oslovia predávajúceho znova.",
    tier: "enterprise",
  },
  {
    icon: TrendingUp,
    badge: "PROTOCOL AUTHORITY",
    badgeColor: "#34D399",
    title: "Neural Market Feed",
    desc: "Predikcia rastu cien podľa infraštruktúry — nová škola, park, diaľnica. Klientom ukazuješ čísla ktoré nikto iný nemá.",
    tier: "enterprise",
  },
];

const TIER_ORDER: Record<string, number> = { starter: 0, pro: 1, enterprise: 2 };

export function FeatureGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {FEATURES.map((f) => {
        const Icon = f.icon;
        const dimmed = TIER_ORDER[f.tier] > 0;
        return (
          <div
            key={f.title}
            className="p-6 rounded-3xl flex flex-col gap-4 transition-all duration-300"
            style={{
              background:  dimmed ? "rgba(10,10,18,0.6)" : "rgba(255,255,255,0.04)",
              border:      dimmed ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(255,255,255,0.10)",
              opacity:     f.tier === "enterprise" ? 0.65 : 1,
            }}
          >
            {/* Badge */}
            <div className="flex items-center gap-2">
              <Icon size={14} style={{ color: f.badgeColor }} />
              <span
                className="text-[9px] font-black uppercase tracking-widest"
                style={{ color: f.badgeColor }}
              >
                {f.badge}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-lg font-black italic uppercase tracking-tighter text-white leading-tight">
              {f.title}
            </h3>

            {/* Desc */}
            <p className="text-sm leading-relaxed" style={{ color: "#64748B" }}>
              {f.desc}
            </p>
          </div>
        );
      })}
    </div>
  );
}
