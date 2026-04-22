"use client";

import React, { useState } from "react";
import {
  Mail, Bell, Map, Zap, Lock,
  Mic2, ListChecks, PhoneCall, Activity,
} from "lucide-react";

const L99ScanDashboardV4 = () => {
  const [activeTab, setActiveTab] = useState("enterprise");

  const handleCta = (feature: string) => {
    window.location.href = `https://app.revolis.ai/register?utm_source=l99scan&utm_content=${encodeURIComponent(feature)}`;
  };

  return (
    <div className="min-h-screen bg-[#020205] text-slate-200 font-sans p-4 md:p-12">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <header className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6 text-blue-400">
            <span className="text-[10px] uppercase tracking-widest font-bold italic">
              Revolis L99 Intelligence
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight uppercase">
            REVOLIS <span className="text-blue-500">EKOSYSTÉM</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl">
            Všetko pre tvoj realitný biznis. Od ranného plánu práce až po tajné informácie z trhu.
          </p>
        </header>

        {/* PROGRAM SELECTOR */}
        <div className="flex flex-wrap gap-4 mb-12 border-b border-white/5 pb-8">
          {(["starter", "pro", "enterprise"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-3 rounded-xl font-bold uppercase text-xs tracking-widest transition-all ${
                activeTab === tab
                  ? "bg-blue-600 text-white shadow-[0_0_20px_-5px_rgba(37,99,235,0.6)]"
                  : "bg-white/5 text-slate-500 hover:bg-white/10"
              }`}
            >
              {tab === "enterprise"
                ? "Enterprise (L99)"
                : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* FEATURES GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

          {/* STARTER */}
          <div className="p-8 rounded-[2rem] border bg-[#0A0A12] border-white/10">
            <div className="mb-8 text-blue-400"><ListChecks size={32} /></div>
            <h3 className="text-xl font-bold text-white mb-3 uppercase italic">AI Plán práce</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              <strong>Zjednodušene:</strong> AI ti ráno povie, komu máš zavolať ako prvému, aby si dnes zarobil čo najviac. Nemusíš nad tým rozmýšľať.
            </p>
          </div>

          <div className="p-8 rounded-[2rem] border bg-[#0A0A12] border-white/10">
            <div className="mb-8 text-blue-400"><PhoneCall size={32} /></div>
            <h3 className="text-xl font-bold text-white mb-3 uppercase italic">AI Call Analyzer</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              <strong>Zjednodušene:</strong> Robot si vypočuje tvoj hovor a napíše ti, čo si urobil dobre a kde si mal radšej mlčať, aby si klienta presvedčil.
            </p>
          </div>

          <div className="p-8 rounded-[2rem] border bg-[#0A0A12] border-white/10">
            <div className="mb-8 text-blue-400"><Activity size={32} /></div>
            <h3 className="text-xl font-bold text-white mb-3 uppercase italic">Stav klientov</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              <strong>Zjednodušene:</strong> Vidíš všetkých svojich ľudí na jednej kope a hneď vieš, kto je &quot;horúci&quot; na nákup a kto ťa len naťahuje.
            </p>
          </div>

          {/* PRO */}
          <div className={`p-8 rounded-[2rem] border transition-all duration-500 ${
            activeTab !== "starter"
              ? "bg-[#0A0A12] border-indigo-500/30"
              : "bg-[#050508] border-white/5 opacity-30 pointer-events-none"
          }`}>
            <div className="flex justify-between mb-8 text-indigo-400">
              <Mail size={32} /><Zap size={16} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3 uppercase italic">AI Ghostwriter</h3>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
              <strong>Zjednodušene:</strong> Stlačíš gombík a AI napíše majiteľovi domu taký presvedčivý list, že ti sám zavolá, aby si mu dom predal ty.
            </p>
            <button
              onClick={() => handleCta("ai-ghostwriter")}
              className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[11px] uppercase font-black tracking-widest hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all"
            >
              Chcem vidieť, ako píše AI listy
            </button>
          </div>

          <div className={`p-8 rounded-[2rem] border transition-all duration-500 ${
            activeTab !== "starter"
              ? "bg-[#0A0A12] border-indigo-500/30"
              : "bg-[#050508] border-white/5 opacity-30 pointer-events-none"
          }`}>
            <div className="flex justify-between mb-8 text-red-400">
              <Bell size={32} /><Zap size={16} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3 uppercase italic">Katastrálny Radar</h3>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
              <strong>Zjednodušene:</strong> Robot, ktorý ti pípne vždy, keď niekto na úrade zmení majiteľa bytu (napr. dedičstvo). Budeš tam prvý.
            </p>
            <button
              onClick={() => handleCta("katastralny-radar")}
              className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[11px] uppercase font-black tracking-widest hover:bg-red-600 hover:text-white hover:border-red-600 transition-all"
            >
              Zobraziť čerstvé dedičstvá v PO
            </button>
          </div>

          {/* ENTERPRISE */}
          <div className={`p-8 rounded-[2rem] border transition-all duration-500 ${
            activeTab === "enterprise"
              ? "bg-[#0A0A12] border-blue-500/30"
              : "bg-[#050508] border-white/5 opacity-30 pointer-events-none"
          }`}>
            <div className="flex justify-between mb-8 text-blue-400">
              <Map size={32} /><Lock size={16} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3 uppercase italic">Bio-Social Bod Zlomu</h3>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
              <strong>Zjednodušene:</strong> Mapa mesta, ktorá ti povie: &quot;Na tejto ulici sa o chvíľu začne sťahovať veľa ľudí&quot;. Vieš to skôr ako oni.
            </p>
            <button
              onClick={() => handleCta("bod-zlomu")}
              className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[11px] uppercase font-black tracking-widest hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all"
            >
              Odomknúť mapu &quot;Bod zlomu&quot;
            </button>
          </div>

          <div className={`p-8 rounded-[2rem] border transition-all duration-500 ${
            activeTab === "enterprise"
              ? "bg-[#0A0A12] border-blue-500/30"
              : "bg-[#050508] border-white/5 opacity-30 pointer-events-none"
          }`}>
            <div className="flex justify-between mb-8 text-blue-400">
              <Mic2 size={32} /><Lock size={16} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3 uppercase italic">Emocionálny skener</h3>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
              <strong>Zjednodušene:</strong> AI počúva, čo klienta na byte naozaj zaujíma a povie ti, na čo presne máš zatlačiť, aby si u neho vyvolal túžbu kúpiť to hneď.
            </p>
            <button
              onClick={() => handleCta("emocionalny-skener")}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl text-[11px] uppercase font-black tracking-widest hover:scale-105 transition-all"
            >
              Vyvolať okamžitý záujem kupujúceho
            </button>
          </div>

        </div>

        {/* FOOTER CTA */}
        <footer className="mt-20 p-12 bg-blue-600/10 border border-blue-500/20 rounded-[3rem] text-center">
          <h2 className="text-2xl font-black text-white mb-4 uppercase italic">
            Chceš odomknúť plnú silu Revolis?
          </h2>
          <button
            onClick={() => handleCta("plna-sila-revolis")}
            className="px-10 py-5 bg-blue-600 text-white font-black rounded-xl text-xs uppercase tracking-widest hover:scale-105 transition-all"
          >
            Zobraziť neférovú výhodu pre moju RK
          </button>
        </footer>

      </div>
    </div>
  );
};

export default L99ScanDashboardV4;
