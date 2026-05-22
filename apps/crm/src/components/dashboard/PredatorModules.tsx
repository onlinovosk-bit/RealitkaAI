"use client";

import { EyeOff, Mail, Zap } from "lucide-react";
import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";

const modules = [
  {
    id: 4,
    title: "AUTOMATIZOVANÝ EXKLUZÍVNY LIST",
    description:
      "AI identifikuje kritické zmeny v katastri (plomby/dedičstvo). Systém vygeneruje personalizovanú ponuku, ktorá vás v očiach majiteľa okamžite stavia do pozície jediného logického partnera.",
    icon: <Mail className="h-6 w-6" style={{ color: SLATE_HORIZON.brandDeep }} />,
    cta: "GENEROVAŤ PONUKU, KTORÁ SA NEODMIETA",
    badge: "L99 KATASTER RADAR",
  },
  {
    id: 5,
    title: "EXTRAKCIA SKRYTÝCH PROVÍZIÍ",
    description:
      "Algoritmus preoseje vašu databázu a identifikuje spiace príležitosti. Vyťažíme peniaze z kontaktov, na ktoré ste už dávno zabudli.",
    icon: <Zap className="h-6 w-6" style={{ color: SLATE_HORIZON.amber }} />,
    cta: "SPUSTIŤ EXTRAKCIU PROVÍZIÍ",
    badge: "GHOST ENGINE 2.0",
  },
  {
    id: 6,
    title: "TICHÁ OPERÁCIA: BAZOŠ",
    description:
      "AI agent nepretržite infiltruje súkromnú inzerciu. Odhalí vyčerpaných inzerentov a doručí vám ich v momente, kedy sú najviac naklonení spolupráci.",
    icon: <EyeOff className="h-6 w-6" style={{ color: SLATE_HORIZON.red }} />,
    cta: "AKTIVOVAŤ NEVIDITEĽNÝ NÁBOR",
    badge: "STEALTH AGENT",
  },
];

export function PredatorModules() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {modules.map((mod) => (
        <div
          key={mod.id}
          className="group relative overflow-hidden rounded-3xl border p-8 transition-all duration-300 hover:shadow-md"
          style={{
            background: WORKDESK_CARD.background,
            borderColor: WORKDESK_CARD.borderColor,
            boxShadow: WORKDESK_CARD.boxShadow,
          }}
        >
          <div className="mb-6 flex items-start justify-between">
            <div className="rounded-2xl border p-3" style={{ borderColor: SLATE_HORIZON.line, background: SLATE_HORIZON.bg }}>
              {mod.icon}
            </div>
            <span
              className="rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em]"
              style={{ borderColor: SLATE_HORIZON.line, color: SLATE_HORIZON.muted }}
            >
              {mod.badge}
            </span>
          </div>

          <h3 className="mb-4 text-lg font-black uppercase leading-none tracking-tight italic" style={{ color: SLATE_HORIZON.ink }}>
            {mod.title}
          </h3>

          <p className="mb-8 text-xs font-medium leading-relaxed" style={{ color: SLATE_HORIZON.muted }}>
            {mod.description}
          </p>

          <button
            type="button"
            className="w-full rounded-2xl border py-4 text-[10px] font-black uppercase tracking-[0.15em] italic transition-all duration-300 hover:opacity-90"
            style={{
              borderColor: SLATE_HORIZON.softBorder,
              background: SLATE_HORIZON.soft,
              color: SLATE_HORIZON.brandDeep,
            }}
          >
            {mod.cta}
          </button>
        </div>
      ))}
    </div>
  );
}
