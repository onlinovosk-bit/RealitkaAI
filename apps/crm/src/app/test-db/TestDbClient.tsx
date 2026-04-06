"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Building2, User, Settings, Bot, Import, GitMerge, 
  Share2, Target, Rocket, CheckCircle2, ArrowRight, 
  ChevronRight, Upload, Phone, Linkedin, Globe
} from "lucide-react";

// --- TYPES & GOVERNANCE ---
type OnboardingData = {
  role: string;
  agencyName: string;
  city: string;
  agentCount: string;
  monthlyLeads: string;
  currentCrm: string;
  phone: string;
  linkedin: string;
  bio: string;
  aiName: string;
  aiTone: string;
  goals: { leads: string; conversion: string };
};

const STEPS = [
  "Vitaj", "Realitka", "Profil", "AI Asistent", 
  "Import", "Pipeline", "Prepojenia", "Ciele", "Hotovo"
];

// --- COMPONENTS ---

const StepIndicator = ({ currentStep }: { currentStep: number }) => (
  <div className="fixed left-12 top-1/2 -translate-y-1/2 hidden xl:flex flex-col gap-6 z-20">
    {STEPS.map((step, idx) => {
      const isCompleted = idx + 1 < currentStep;
      const isActive = idx + 1 === currentStep;
      return (
        <div key={step} className="flex items-center gap-4 group cursor-default">
          <div className={`h-10 w-1 px-0.5 rounded-full transition-all duration-500 ${
            isActive ? "bg-blue-600 h-16 shadow-[0_0_15px_rgba(37,99,235,0.6)]" : 
            isCompleted ? "bg-blue-600/40" : "bg-white/10"
          }`} />
          <span className={`text-[10px] uppercase tracking-[0.3em] font-bold transition-colors ${
            isActive ? "text-white" : "text-white/20"
          }`}>
            {String(idx + 1).padStart(2, '0')} {step}
          </span>
        </div>
      );
    })}
  </div>
);

export default function TestDbClient() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    role: "", agencyName: "", city: "", agentCount: "",
    monthlyLeads: "", currentCrm: "", phone: "", linkedin: "",
    bio: "", aiName: "Sofia", aiTone: "Profesionálny",
    goals: { leads: "", conversion: "" }
  });

  const next = () => setStep(s => Math.min(s + 1, 9));
  const back = () => setStep(s => Math.max(s - 1, 1));

  const updateData = (fields: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...fields }));
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-blue-600/30 font-sans antialiased overflow-hidden relative">
      
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none" />

      <StepIndicator currentStep={step} />

      <main className="relative z-10 max-w-4xl mx-auto px-6 pt-24 pb-20 min-h-screen flex flex-col items-center">
        
        {/* Header Branding */}
        <div className="mb-16 text-center">
          <h1 className="text-4xl font-black italic tracking-tighter uppercase mb-2">
            REVOLIS<span className="text-blue-600 text-5xl">.</span>AI
          </h1>
          <div className="h-0.5 w-12 bg-blue-600 mx-auto rounded-full" />
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: WELCOME */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full text-center space-y-12">
              <div className="space-y-4">
                <h2 className="text-6xl font-black italic uppercase tracking-tight">Vitaj v Revolis.AI</h2>
                <p className="text-white/40 text-lg uppercase tracking-widest font-medium">Nastavenie účtu za 15 minút</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { id: 'owner', label: 'Majiteľ kancelárie', icon: <Building2 /> },
                  { id: 'agent', label: 'Samostatný maklér', icon: <User /> },
                  { id: 'manager', label: 'Office Manager', icon: <Settings /> }
                ].map(role => (
                  <button key={role.id} onClick={() => { updateData({ role: role.id }); next(); }} className="group p-8 bg-white/5 border border-white/10 rounded-[2.5rem] hover:border-blue-600/50 hover:bg-blue-600/5 transition-all text-center">
                    <div className="mb-4 flex justify-center text-white/20 group-hover:text-blue-600 transition-colors">{role.icon}</div>
                    <span className="text-xs font-bold uppercase tracking-widest">{role.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 2: AGENCY CONFIG */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-2xl space-y-10">
              <h2 className="text-4xl font-black italic uppercase text-center">Nastav svoju realitku</h2>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 ml-4">Názov kancelárie</label>
                  <input className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl focus:border-blue-600 outline-none transition-all" value={data.agencyName} onChange={e => updateData({ agencyName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 ml-4">Mesto</label>
                  <input className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl focus:border-blue-600 outline-none transition-all" value={data.city} onChange={e => updateData({ city: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 ml-4">Počet maklérov</label>
                  <input type="number" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl focus:border-blue-600 outline-none transition-all" value={data.agentCount} onChange={e => updateData({ agentCount: e.target.value })} />
                </div>
              </div>
              <button onClick={next} className="w-full py-5 bg-blue-600 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-500 shadow-xl shadow-blue-600/20">Pokračovať</button>
            </motion.div>
          )}

          {/* STEP 4: AI ASISTENT */}
          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-2xl space-y-10 text-center">
              <div className="w-24 h-24 bg-blue-600/10 border border-blue-600/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <Bot className="w-12 h-12 text-blue-600" />
              </div>
              <h2 className="text-4xl font-black italic uppercase">Nakonfiguruj AI asistenta</h2>
              <div className="space-y-8 text-left">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 ml-4">Meno asistenta</label>
                  <input className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl focus:border-blue-600 outline-none transition-all font-bold text-xl" value={data.aiName} onChange={e => updateData({ aiName: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {['Profesionálny', 'Priateľský', 'Analytický', 'Energický'].map(tone => (
                    <button key={tone} onClick={() => updateData({ aiTone: tone })} className={`p-4 rounded-xl border transition-all text-xs font-bold uppercase tracking-widest ${data.aiTone === tone ? 'bg-blue-600 border-blue-600' : 'bg-white/5 border-white/10 text-white/40'}`}>
                      {tone}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={next} className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">Uložiť AI konfiguráciu</button>
            </motion.div>
          )}

          {/* STEP 9: FINISH */}
          {step === 9 && (
            <motion.div key="s9" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-8">
              <div className="relative">
                <motion.div animate={{ scale: [1, 1.2, 1], rotate: 360 }} transition={{ duration: 4, repeat: Infinity }} className="absolute inset-0 bg-blue-600/20 blur-3xl rounded-full" />
                <div className="relative w-32 h-32 bg-blue-600 rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(37,99,235,0.5)]">
                  <CheckCircle2 className="w-16 h-16 text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-6xl font-black italic uppercase tracking-tighter">Revolis.AI je živý!</h2>
                <p className="text-white/40 tracking-[0.4em] uppercase text-[10px] font-bold">Váš Real Estate OS bol úspešne inicializovaný</p>
              </div>
              <div className="pt-10">
                <button className="px-12 py-6 bg-white text-black font-black rounded-full uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center gap-4 mx-auto group">
                  Vstúpiť do Dashboardu <ArrowRight className="group-hover:translate-x-2 transition-transform" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: PROFIL */}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-2xl mx-auto space-y-10">
              <h2 className="text-4xl font-black italic uppercase text-center">Profil makléra</h2>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 ml-4">Telefón</label>
                  <input className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl focus:border-blue-600 outline-none transition-all" value={data.phone} onChange={e => updateData({ phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 ml-4">LinkedIn</label>
                  <input className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl focus:border-blue-600 outline-none transition-all" value={data.linkedin} onChange={e => updateData({ linkedin: e.target.value })} />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 ml-4">Bio</label>
                  <textarea className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl focus:border-blue-600 outline-none transition-all min-h-[80px]" value={data.bio} onChange={e => updateData({ bio: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-4 justify-center">
                <button onClick={back} className="px-10 py-5 bg-white/5 rounded-2xl font-bold uppercase text-[10px] tracking-widest">Späť</button>
                <button onClick={next} className="px-10 py-5 bg-blue-600 rounded-2xl font-bold uppercase text-[10px] tracking-widest">Pokračovať</button>
              </div>
            </motion.div>
          )}

          {/* STEP 5: IMPORT */}
          {step === 5 && (
            <motion.div key="s5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-2xl mx-auto space-y-10">
              <h2 className="text-4xl font-black italic uppercase text-center">Import dát</h2>
              <div className="flex flex-col items-center gap-8">
                <div className="flex flex-col gap-2 w-full">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 ml-4">Aktuálny CRM systém</label>
                  <input className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl focus:border-blue-600 outline-none transition-all" value={data.currentCrm} onChange={e => updateData({ currentCrm: e.target.value })} />
                </div>
                <div className="flex flex-col gap-2 w-full">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 ml-4">Mesačný počet leadov</label>
                  <input type="number" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl focus:border-blue-600 outline-none transition-all" value={data.monthlyLeads} onChange={e => updateData({ monthlyLeads: e.target.value })} />
                </div>
                <div className="flex flex-col gap-2 w-full">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 ml-4">Importovať dáta</label>
                  <button className="w-full py-5 bg-blue-600 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-500 shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2"><Upload className="w-5 h-5" /> Nahrať súbor</button>
                </div>
              </div>
              <div className="flex gap-4 justify-center">
                <button onClick={back} className="px-10 py-5 bg-white/5 rounded-2xl font-bold uppercase text-[10px] tracking-widest">Späť</button>
                <button onClick={next} className="px-10 py-5 bg-blue-600 rounded-2xl font-bold uppercase text-[10px] tracking-widest">Pokračovať</button>
              </div>
            </motion.div>
          )}

          {/* STEP 6: PIPELINE */}
          {step === 6 && (
            <motion.div key="s6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-2xl mx-auto space-y-10">
              <h2 className="text-4xl font-black italic uppercase text-center">Pipeline nastavenie</h2>
              <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-2 w-full">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 ml-4">Ciele leadov</label>
                  <input className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl focus:border-blue-600 outline-none transition-all" value={data.goals.leads} onChange={e => updateData({ goals: { ...data.goals, leads: e.target.value } })} />
                </div>
                <div className="flex flex-col gap-2 w-full">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 ml-4">Konverzný pomer (%)</label>
                  <input className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl focus:border-blue-600 outline-none transition-all" value={data.goals.conversion} onChange={e => updateData({ goals: { ...data.goals, conversion: e.target.value } })} />
                </div>
              </div>
              <div className="flex gap-4 justify-center">
                <button onClick={back} className="px-10 py-5 bg-white/5 rounded-2xl font-bold uppercase text-[10px] tracking-widest">Späť</button>
                <button onClick={next} className="px-10 py-5 bg-blue-600 rounded-2xl font-bold uppercase text-[10px] tracking-widest">Pokračovať</button>
              </div>
            </motion.div>
          )}

          {/* STEP 7: INTEGRÁCIE */}
          {step === 7 && (
            <motion.div key="s7" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-3xl mx-auto space-y-10">
              <h2 className="text-4xl font-black italic uppercase text-center mb-8">Prepojenia a Integrácie</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { emoji: "🏠", name: "Nehnuteľnosti.sk", desc: "Import a synchronizácia inzerátov." },
                  { emoji: "🏢", name: "Reality.sk", desc: "Automatický export ponúk." },
                  { emoji: "🏡", name: "TopReality.sk", desc: "Lead generation z portálu." },
                  { emoji: "📅", name: "Google Calendar", desc: "Synchronizácia udalostí a obhliadok." },
                  { emoji: "💬", name: "WhatsApp Business", desc: "Chat s klientmi priamo z CRM." },
                  { emoji: "✉️", name: "Gmail", desc: "Prepojenie e-mailovej komunikácie." },
                  { emoji: "📥", name: "Facebook Leads", desc: "Automatický import leadov z Facebooku." },
                  { emoji: "💼", name: "Slack / Teams", desc: "Notifikácie a tímová spolupráca." }
                ].map((card, idx) => (
                  <div key={card.name} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-6 gap-4">
                    <div className="flex items-start gap-4">
                      <span className="text-3xl">{card.emoji}</span>
                      <div>
                        <div className="font-bold text-base">{card.name}</div>
                        <div className="text-xs text-white/40">{card.desc}</div>
                      </div>
                    </div>
                    <button type="button" className="px-6 py-3 bg-blue-600 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-blue-500 transition-all">Pripojiť</button>
                  </div>
                ))}
              </div>
              <div className="mt-8 p-6 bg-blue-600/10 border border-blue-600/20 rounded-2xl text-blue-200 text-xs text-left">
                <b>Tip:</b> Integrácie môžete pripojiť aj neskôr v nastaveniach. Odporúčame však prepojiť aspoň jeden portál pre plnú funkcionalitu.
              </div>
              <div className="flex gap-4 justify-center mt-8">
                <button onClick={back} className="px-10 py-5 bg-white/5 rounded-2xl font-bold uppercase text-[10px] tracking-widest">← Späť</button>
                <button onClick={next} className="px-10 py-5 bg-white/10 rounded-2xl font-bold uppercase text-[10px] tracking-widest">Preskočiť</button>
                <button onClick={next} className="px-10 py-5 bg-blue-600 rounded-2xl font-bold uppercase text-[10px] tracking-widest">Pokračovať →</button>
              </div>
            </motion.div>
          )}

          {/* STEP 8: CIELE */}
          {step === 8 && (
            <motion.div key="s8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-2xl mx-auto space-y-10">
              <h2 className="text-4xl font-black italic uppercase text-center">Ciele a očakávania</h2>
              <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-2 w-full">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 ml-4">Hlavný cieľ s RevolisAI</label>
                  <input className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl focus:border-blue-600 outline-none transition-all" value={data.goals.leads} onChange={e => updateData({ goals: { ...data.goals, leads: e.target.value } })} />
                </div>
                <div className="flex flex-col gap-2 w-full">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 ml-4">Očakávaný konverzný pomer (%)</label>
                  <input className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl focus:border-blue-600 outline-none transition-all" value={data.goals.conversion} onChange={e => updateData({ goals: { ...data.goals, conversion: e.target.value } })} />
                </div>
              </div>
              <div className="flex gap-4 justify-center">
                <button onClick={back} className="px-10 py-5 bg-white/5 rounded-2xl font-bold uppercase text-[10px] tracking-widest">Späť</button>
                <button onClick={next} className="px-10 py-5 bg-blue-600 rounded-2xl font-bold uppercase text-[10px] tracking-widest">Pokračovať</button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Global Footer Progress */}
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-4 text-white/20 text-[10px] font-bold tracking-[0.4em] uppercase">
          <Globe className="w-3 h-3" /> Revolis Global Node: Active
        </div>

      </main>
    </div>
  );
}