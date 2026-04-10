"use client";
import { Zap, Sparkles } from "lucide-react";

export default function RevolisAIPage() {
  return (
    <div className="p-8 bg-black min-h-screen text-white">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-12 border-b border-white/10 pb-8">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 mb-2">
              <Sparkles size={18} />
              <span className="text-sm font-bold uppercase tracking-widest">Revolis Intelligence</span>
            </div>
            <h1 className="text-5xl font-black italic tracking-tighter uppercase">AI MATCHING</h1>
          </div>
          <button className="bg-white text-black px-8 py-4 rounded-full font-black hover:scale-105 transition-transform flex items-center gap-2">
            <Zap size={20} fill="black" />
            SPUSTIŤ SCAN
          </button>
        </header>

        <div className="bg-zinc-900/50 border border-dashed border-white/10 p-20 rounded-[3rem] text-center">
          <p className="text-zinc-500 font-medium text-xl">
            Priečinok úspešne vytvorený. Systém je pripravený na dáta.
          </p>
        </div>
      </div>
    </div>
  );
}
