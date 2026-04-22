"use client";

import React, { useState } from "react";
import {
  Calculator, Search,
  Target, Zap, Lock, BarChart3,
} from "lucide-react";

const L99ScanDashboard = () => {
  const [activeTab, setActiveTab] = useState("enterprise");

  const handleUnlock = (feature: string) => {
    window.location.href = `https://app.revolis.ai/register?utm_source=l99scan&utm_content=${encodeURIComponent(feature)}`;
  };

  return (
    <div className="min-h-screen bg-[#020205] text-slate-200 font-sans p-4 md:p-12">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <header className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
            <span className="text-[10px] uppercase tracking-widest font-bold text-blue-400">
              L99 Intelligence Active
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight uppercase">
            Operačný Systém{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
              Revolis
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl leading-relaxed">
            Premeňte svoju RK z reaktívnej kancelárie na technologický monopol.
            Vlastnite dáta, ktoré konkurencia ani nevidí.
          </p>
        </header>

        {/* PREPÍNAČ PROGRAMOV */}
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
              {tab === "enterprise" ? "L99 Enterprise" : tab}
            </button>
          ))}
        </div>

        {/* FEATURE GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

          {/* 1: SHADOW MARKET SCANNER */}
          <div className={`group p-8 rounded-[2rem] border transition-all duration-500 ${
            activeTab === "enterprise"
              ? "bg-[#0A0A12] border-blue-500/30"
              : "bg-[#050508] border-white/5 opacity-50"
          }`}>
            <div className="flex justify-between items-start mb-8">
              <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
                <Search size={32} />
              </div>
              <Lock size={16} className="text-slate-700" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3 uppercase italic">
              Shadow Market Scanner
            </h3>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
              Získajte prístup k nehnuteľnostiam v procese dedenia a zmien na LV
              skôr, než sa objavia na Bazoši.
            </p>
            <button
              onClick={() => handleUnlock("Shadow Market")}
              className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[11px] uppercase font-black tracking-widest hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all"
            >
              Odomknúť mapu slepých miest v Prešove
            </button>
          </div>

          {/* 2: AI PERSUADER */}
          <div className={`group p-8 rounded-[2rem] border transition-all duration-500 ${
            activeTab !== "starter"
              ? "bg-[#0A0A12] border-indigo-500/30"
              : "bg-[#050508] border-white/5 opacity-50"
          }`}>
            <div className="flex justify-between items-start mb-8">
              <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
                <Target size={32} />
              </div>
              <Zap size={16} className="text-slate-700" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3 uppercase italic">
              AI Persuader
            </h3>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
              Automatizované nábory cez behaviorálne listy. AI vie, kedy je
              majiteľ psychologicky pripravený predávať.
            </p>
            <button
              onClick={() => handleUnlock("AI Persuader")}
              className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[11px] uppercase font-black tracking-widest hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all"
            >
              Zistiť, prečo 4 z 10 predajov končia v tichosti
            </button>
          </div>

          {/* 3: ROI ORACLE */}
          <div className={`group p-8 rounded-[2rem] border transition-all duration-500 ${
            activeTab === "enterprise"
              ? "bg-[#0A0A12] border-purple-500/30"
              : "bg-[#050508] border-white/5 opacity-50"
          }`}>
            <div className="flex justify-between items-start mb-8">
              <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400">
                <BarChart3 size={32} />
              </div>
              <Lock size={16} className="text-slate-700" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3 uppercase italic">
              ROI Oracle
            </h3>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
              Predpoveď čistého zisku z každého mandátu ešte pred jeho
              podpísaním. Diagnostika ziskovosti pobočky.
            </p>
            <button
              onClick={() => handleUnlock("ROI Oracle")}
              className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[11px] uppercase font-black tracking-widest hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-all"
            >
              Zobraziť skrytý potenciál mojej siete
            </button>
          </div>

          {/* 4: AI ODHADCA */}
          <div className="group p-8 rounded-[2rem] border bg-[#0A0A12] border-white/10 transition-all duration-500">
            <div className="flex justify-between items-start mb-8">
              <div className="p-3 bg-slate-500/10 rounded-2xl text-slate-400">
                <Calculator size={32} />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-3 uppercase italic">
              AI Odhadca 3.0
            </h3>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
              Zmeňte svoj web na magnet na kontakty. Majiteľ získa trhovú cenu,
              vy získate exkluzívny lead.
            </p>
            <button
              onClick={() => handleUnlock("AI Odhadca")}
              className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[11px] uppercase font-black tracking-widest hover:bg-white hover:text-black transition-all"
            >
              Zistiť, o koľko sused nadhodnotil svoju cenu
            </button>
          </div>

        </div>

        {/* FOOTER CTA */}
        <footer className="mt-24 p-12 bg-gradient-to-b from-blue-600/20 to-transparent border border-blue-500/20 rounded-[3rem] text-center">
          <h2 className="text-3xl font-black text-white mb-6 uppercase italic tracking-tighter">
            Pripravený na technologický monopol v Prešove?
          </h2>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <button
              onClick={() => handleUnlock("neviditelny-makler")}
              className="px-10 py-5 bg-blue-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest hover:scale-105 transition-transform"
            >
              Aktivovať režim &quot;Neviditeľný maklér&quot;
            </button>
            <button
              onClick={() => handleUnlock("prestali-inzerovat")}
              className="px-10 py-5 bg-white/5 border border-white/10 text-white font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
            >
              Prečo najúspešnejšie RK prestávajú inzerovať?
            </button>
          </div>
        </footer>

      </div>
    </div>
  );
};

export default L99ScanDashboard;
