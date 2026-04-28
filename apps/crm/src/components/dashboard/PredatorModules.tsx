"use client";

import { EyeOff, Mail, Zap } from "lucide-react";

const modules = [
  {
    id: 4,
    title: "AUTOMATIZOVANÝ EXKLUZÍVNY LIST",
    description:
      "AI identifikuje kritické zmeny v katastri (plomby/dedičstvo). Systém vygeneruje personalizovanú ponuku, ktorá vás v očiach majiteľa okamžite stavia do pozície jediného logického partnera.",
    icon: <Mail className="h-6 w-6 text-blue-500" />,
    cta: "GENEROVAŤ PONUKU, KTORÁ SA NEODMIETA",
    badge: "L99 KATASTER RADAR",
  },
  {
    id: 5,
    title: "EXTRAKCIA SKRYTÝCH PROVÍZIÍ",
    description:
      "Algoritmus preoseje vašu databázu a identifikuje spiace príležitosti. Vyťažíme peniaze z kontaktov, na ktoré ste už dávno zabudli.",
    icon: <Zap className="h-6 w-6 text-yellow-500" />,
    cta: "SPUSTIŤ EXTRAKCIU PROVÍZIÍ",
    badge: "GHOST ENGINE 2.0",
  },
  {
    id: 6,
    title: "TICHÁ OPERÁCIA: BAZOŠ",
    description:
      "AI agent nepretržite infiltruje súkromnú inzerciu. Odhalí vyčerpaných inzerentov a doručí vám ich v momente, kedy sú najviac naklonení spolupráci.",
    icon: <EyeOff className="h-6 w-6 text-red-500" />,
    cta: "AKTIVOVAŤ NEVIDITEĽNÝ NÁBOR",
    badge: "STEALTH AGENT",
  },
];

export function PredatorModules() {
  return (
    <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-3">
      {modules.map((mod) => (
        <div
          key={mod.id}
          className="group relative overflow-hidden rounded-[2rem] border border-white/5 bg-[#0a0a0b] p-8 transition-all duration-500 hover:border-blue-500/30"
        >
          <div className="absolute -right-24 -top-24 h-48 w-48 bg-blue-500/5 blur-[100px] transition-all group-hover:bg-blue-500/10" />

          <div className="mb-6 flex items-start justify-between">
            <div className="rounded-2xl bg-white/5 p-3">{mod.icon}</div>
            <span className="rounded-full border border-white/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
              {mod.badge}
            </span>
          </div>

          <h3 className="mb-4 text-lg font-black uppercase leading-none tracking-tighter text-white italic">
            {mod.title}
          </h3>

          <p className="mb-8 text-xs font-medium leading-relaxed text-slate-400">{mod.description}</p>

          <button className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-white italic shadow-xl transition-all duration-300 group-hover:border-blue-500 group-hover:bg-blue-600">
            {mod.cta}
          </button>
        </div>
      ))}
    </div>
  );
}
