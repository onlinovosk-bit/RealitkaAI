"use client";

import { useState } from "react";
import {
  Calculator,
  Users,
  ShieldAlert,
  Share2,
  Mail,
  RefreshCcw,
} from "lucide-react";

const UTM =
  "https://app.revolis.ai/register?utm_source=email&utm_medium=direct-outreach&utm_campaign=smolko_reality&utm_content=enterprise_v31";

export default function AIAsistentEnterprise() {
  const [step, setStep] = useState(1);
  const [syncStatus, setSyncStatus] = useState<"idle" | "analyzing" | "synced">("idle");

  const startSync = () => {
    if (syncStatus !== "idle") return;
    setSyncStatus("analyzing");
    setTimeout(() => setSyncStatus("synced"), 3000);
  };

  return (
    <div className="min-h-screen bg-[#050509] text-white p-6 md:p-16 font-sans">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="mb-16 border-b border-white/5 pb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-600 px-3 py-1 rounded text-[10px] font-black tracking-tighter uppercase">
              Enterprise AI
            </div>
            <div className="text-slate-500 text-sm font-mono tracking-widest">
              v3.1 Production Release
            </div>
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter">
            AI ASISTENT <span className="text-blue-500">REVOLIS</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl leading-relaxed">
            Nelineárna akvizícia nehnuteľností. Tri moduly, ktoré menia analógové
            dáta na exkluzívne mandáty v reálnom čase.
          </p>
        </div>

        {/* 3 MODULY */}
        <div className="grid lg:grid-cols-3 gap-10">

          {/* 1. AI Ghostwriter */}
          <div className="bg-[#0C0C14] border border-red-500/20 rounded-3xl p-8 hover:border-red-500/40 transition-all group">
            <div className="flex justify-between items-start mb-10">
              <ShieldAlert
                className="text-red-500 group-hover:scale-110 transition-transform"
                size={48}
              />
              <div className="text-[10px] bg-red-500/10 text-red-500 px-2 py-1 rounded font-bold uppercase border border-red-500/20">
                Active Monitoring
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-4 italic">AI Ghostwriter</h2>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
              Katastrálny radar identifikuje plomby a dedičstvá. AI okamžite
              generuje expertný list pre majiteľa s analýzou ceny.
            </p>
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-mono">LV-234/2026</span>
                <span className="text-red-400 font-bold tracking-tighter">ZÁPIS DEDIČSTVA</span>
              </div>
              <div className="h-px bg-white/5" />
              <p className="text-[11px] text-slate-400 italic">
                "Zistili sme zmenu na Sabinovskej&nbsp;12. Tu je trhový audit pre vaše rozhodovanie..."
              </p>
              <a
                href={UTM}
                className="w-full py-4 bg-red-600 hover:bg-red-500 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
              >
                <Mail size={14} /> Vygenerovať PDF list
              </a>
            </div>
          </div>

          {/* 2. AI Odhadca */}
          <div className="bg-[#0C0C14] border border-blue-500/20 rounded-3xl p-8 hover:border-blue-500/40 transition-all">
            <div className="flex justify-between items-start mb-10">
              <Calculator className="text-blue-500" size={48} />
              <div className="text-[10px] bg-blue-500/10 text-blue-500 px-2 py-1 rounded font-bold uppercase border border-blue-500/20">
                Lead Magnet
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-4 italic">AI Odhadca</h2>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
              Konvertuje neúspešných kupujúcich na predajcov. Systém preverí
              "Exit Strategy" každého záujemcu o obhliadku.
            </p>
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
              {step === 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
                >
                  Spustiť simuláciu leadu
                </button>
              ) : (
                <div
                  style={{
                    animation: "fadeSlideUp 0.35s ease-out both",
                  }}
                >
                  <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg mb-4 text-[11px] text-blue-300">
                    <strong>AI Arbitráž:</strong> Zistili sme, že kupujúci má byt na predaj na Sekčove.
                  </div>
                  <a
                    href={UTM}
                    className="w-full py-4 bg-green-600 hover:bg-green-500 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center transition-all"
                  >
                    Vytvoriť záznam v CRM
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* 3. Digital Twin */}
          <div className="bg-[#0C0C14] border border-purple-500/20 rounded-3xl p-8 hover:border-purple-500/40 transition-all">
            <div className="flex justify-between items-start mb-10">
              <Users className="text-purple-500" size={48} />
              <div className="text-[10px] bg-purple-500/10 text-purple-500 px-2 py-1 rounded font-bold uppercase border border-purple-500/20">
                Scale Engine
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-4 italic">Digital Twin</h2>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
              Diagnostikuje neúspech samopredajcov na Bazoši a hľadá ich digitálne
              dvojčatá pre Lookalike kampane.
            </p>
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
              <div className="mb-4 h-4 flex items-center">
                {syncStatus === "analyzing" && (
                  <div className="h-1 bg-purple-500 w-full animate-pulse rounded" />
                )}
                {syncStatus === "synced" && (
                  <p className="text-[10px] text-green-400 font-bold uppercase w-full text-center">
                    Sync Complete!
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={startSync}
                disabled={syncStatus === "analyzing"}
                className="w-full py-4 border border-purple-500/30 text-purple-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-purple-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {syncStatus === "analyzing" ? (
                  <RefreshCcw size={14} className="animate-spin" />
                ) : (
                  <Share2 size={14} />
                )}
                {syncStatus === "synced"
                  ? "Audiencia Live na Meta"
                  : "Aktivovať AI Targeting"}
              </button>
            </div>
          </div>

        </div>

        {/* FOOTER CTA */}
        <div className="mt-20 p-12 bg-gradient-to-br from-blue-600/10 to-transparent border border-white/5 rounded-[40px] text-center">
          <h3 className="text-3xl font-bold mb-6 italic">
            Pripravené na trhovú expanziu.
          </h3>
          <a
            href={UTM}
            className="inline-block px-12 py-6 bg-white text-black font-black rounded-2xl text-sm uppercase tracking-tighter hover:scale-105 transition-all"
          >
            Aktivovať Enterprise balík pre Vaše Nehnuteľnosti
          </a>
        </div>

      </div>
    </div>
  );
}
