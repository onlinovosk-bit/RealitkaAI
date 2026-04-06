"use client";
import React, { useState, useEffect, useRef } from "react";
// OPRAVA: Zladenie s tvojím lib/supabase/client.ts
import { supabaseClient } from "@/lib/supabase/client";
import { v4 as uuidv4 } from "uuid";

// --- Pomocné komponenty (UI Kit) ---

function showToast(msg: string) {
  if (typeof window !== "undefined") {
    const el = document.createElement("div");
    el.textContent = msg;
    el.style.position = "fixed";
    el.style.bottom = "32px";
    el.style.left = "50%";
    el.style.transform = "translateX(-50%)";
    el.style.background = "#222";
    el.style.color = "#fff";
    el.style.padding = "12px 24px";
    el.style.borderRadius = "8px";
    el.style.zIndex = "9999";
    el.style.fontSize = "15px";
    document.body.appendChild(el);
    setTimeout(() => { el.remove(); }, 3200);
  }
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700 mb-4">{children}</div>;
}
function PrimaryBtn({ onClick, children, disabled }: { onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 w-full md:w-auto">{children}</button>;
}
function SecondaryBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">{children}</button>;
}
function Toggle({ on, onToggle, label, desc, emoji }: { on: boolean; onToggle: () => void; label: string; desc: string; emoji: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-start gap-3">
        <span>{emoji}</span>
        <div>
          <div className="text-sm font-medium text-gray-900">{label}</div>
          {desc && <div className="text-xs text-gray-500">{desc}</div>}
        </div>
      </div>
      <button type="button" onClick={onToggle} className={"relative inline-flex h-6 w-11 items-center rounded-full transition-colors " + (on ? "bg-gray-900" : "bg-gray-300")}>
        <span className={"inline-block h-4 w-4 transform rounded-full bg-white transition-transform " + (on ? "translate-x-6" : "translate-x-1")} />
      </button>
    </div>
  );
}
function TagGroup({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => onToggle(opt)}
          className={"border rounded px-3 py-1 text-sm transition-all " + (selected.includes(opt) ? "bg-gray-900 text-white border-gray-900" : "border-gray-300 text-gray-700 hover:bg-gray-50")}>
          {opt}
        </button>
      ))}
    </div>
  );
}
function OptionCard({ id, emoji, label, desc, active, onClick }: { id: string; emoji: string; label: string; desc: string; active: boolean; onClick: (id: string) => void }) {
  return (
    <button type="button" onClick={() => onClick(id)}
      className={"border rounded-lg p-4 flex flex-col items-center text-center gap-1 w-full transition-all " + (active ? "border-2 border-gray-900 bg-gray-50" : "border border-gray-200 hover:border-gray-400")}>
      <span className="text-2xl">{emoji}</span>
      <span className="text-sm font-medium text-gray-900">{label}</span>
      {desc && <span className="text-[10px] text-gray-500 leading-tight">{desc}</span>}
    </button>
  );
}

const sidebarSteps = [
  { id: 1, emoji: "🚀", label: "Vitaj", duration: "1 min" },
  { id: 2, emoji: "🏢", label: "Realitka", duration: "3 min" },
  { id: 3, emoji: "👤", label: "Profil", duration: "2 min" },
  { id: 4, emoji: "🤖", label: "AI Asistent", duration: "4 min" },
  { id: 5, emoji: "📋", label: "Import", duration: "3 min" },
  { id: 6, emoji: "🏗️", label: "Pipeline", duration: "2 min" },
  { id: 7, emoji: "🔗", label: "Prepojenia", duration: "2 min" },
  { id: 8, emoji: "🎯", label: "Ciele", duration: "1 min" },
  { id: 9, emoji: "✓", label: "Hotovo!", duration: "" },
];

export default function TestDbClient() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "", role: "", goals: [] as string[],
    agencyName: "", city: "", agentCount: "", monthlyLeads: "",
    currentCrm: [] as string[], pains: [] as string[],
    officePhone: "", website: "",
    phone: "", linkedin: "", bio: "",
    specializations: [] as string[], languages: ["Slovenčina"] as string[],
    aiName: "Sofia", aiTone: "💼 PROFESIONÁLNY", autoReply: true, workHours: false, leadScoring: true,
    importSource: "",
    pipelineToggles: { welcome: true, followUp: true, reminder: true, score: true, birthday: false },
    connections: [] as string[], primaryGoal: "",
    kpiLeads: 30, kpiDays: 45, kpiConversion: 15,
  });
  const [loading, setLoading] = useState(true);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    const hydrate = async () => {
      let sessionId = localStorage.getItem("onboarding_session_id");
      if (!sessionId) {
        setLoading(false);
        return;
      }
      sessionIdRef.current = sessionId;
      const { data, error } = await supabaseClient
        .from("onboarding_sessions")
        .select("step, form_data")
        .eq("session_id", sessionId)
        .maybeSingle();
        
      if (data) {
        setStep(data.step || 1);
        if (data.form_data) setFormData(data.form_data);
      }
      setLoading(false);
    };
    hydrate();
  }, []);

  const saveProgress = async (nextStep: number, nextFormData: any) => {
    let sessionId = sessionIdRef.current;
    if (!sessionId) {
      sessionId = uuidv4();
      sessionIdRef.current = sessionId;
      localStorage.setItem("onboarding_session_id", sessionId);
    }
    const { error } = await supabaseClient
      .from("onboarding_sessions")
      .upsert([
        {
          session_id: sessionId,
          step: nextStep,
          form_data: nextFormData,
          updated_at: new Date().toISOString(),
        },
      ], { onConflict: 'session_id' });

    if (error) {
      showToast("Chyba synchronizácie.");
      console.error(error);
    }
  };

  const update = (fields: object) => setFormData(prev => ({ ...prev, ...fields }));
  
  const next = async () => {
    const nextStep = Math.min(step + 1, 9);
    setStep(nextStep);
    await saveProgress(nextStep, formData);
    window.scrollTo(0, 0);
  };
  
  const back = () => {
    setStep(s => Math.max(s - 1, 1));
    window.scrollTo(0, 0);
  };

  const progress = ((step - 1) / 8) * 100;

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-500 font-medium">Načítavam vašu reláciu...</div>;

  return (
    <div className="flex min-h-screen bg-white text-gray-900">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-gray-100 p-6 shrink-0 bg-gray-50/30">
        <div className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-[0.2em]">Postup Onboardingom</div>
        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-8">
          <div className="bg-gray-900 h-1.5 rounded-full transition-all duration-500" style={{ width: progress + "%" }} />
        </div>
        <nav className="space-y-1">
          {sidebarSteps.map(s => (
            <div key={s.id} className={"flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors " + (s.id === step ? "bg-white shadow-sm border border-gray-100 font-bold text-gray-900" : "text-gray-400 font-medium")}>
              <span className={s.id === step ? "grayscale-0" : "grayscale"}>{s.emoji}</span>
              <span>{s.label}</span>
              {s.duration && <span className="ml-auto text-[10px] opacity-60 font-normal">{s.duration}</span>}
            </div>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-8 md:p-16 max-w-4xl overflow-y-auto">
        {step <= 8 && (
          <p className="text-[10px] font-bold text-gray-400 mb-4 uppercase tracking-[0.3em]">REVOLIS OS — KROK {step} / 8</p>
        )}

        {/* STEP 1: VITAJ */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h1 className="text-4xl font-bold tracking-tight mb-4 text-gray-900">Vitaj v Revolis.AI 🚀</h1>
            <p className="text-lg text-gray-500 mb-8 max-w-xl">Nastavme váš systém tak, aby AI asistent Sofia začala pracovať na vašich leadoch ešte dnes.</p>
            <div className="mb-8 max-w-md">
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide text-[10px]">Vaše celé meno *</label>
              <input className="border border-gray-200 rounded-xl px-4 py-3 w-full text-base focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all" placeholder="Napr. Tomáš Novák" value={formData.name} onChange={e => update({ name: e.target.value })} />
            </div>
            <p className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide text-[10px]">Vaša rola v realitách</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {[
                { id: "owner", emoji: "🏛️", label: "Majiteľ kancelárie", desc: "Vediem agentúru" },
                { id: "agent", emoji: "💛", label: "Samostatný maklér", desc: "Pracujem na seba" },
                { id: "manager", emoji: "⚙️", label: "Office Manager", desc: "Spravujem tím" },
              ].map(c => (
                <OptionCard key={c.id} {...c} active={formData.role === c.id} onClick={id => update({ role: id })} />
              ))}
            </div>
            <PrimaryBtn disabled={!formData.name || !formData.role} onClick={next}>Začať konfiguráciu →</PrimaryBtn>
          </div>
        )}

        {/* STEP 2: REALITKA */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <h1 className="text-3xl font-bold mb-2">Vaša Realitná Kancelária 🏢</h1>
            <p className="text-gray-500 mb-8">Tieto údaje Sofia použije pri komunikácii so záujemcami.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-[10px] font-bold text-gray-700 mb-2 uppercase">Názov kancelárie *</label>
                <input className="border border-gray-200 rounded-xl px-4 py-3 w-full" placeholder="Napr. Reality Novák" value={formData.agencyName} onChange={e => update({ agencyName: e.target.value })} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-700 mb-2 uppercase">Mesto / Región *</label>
                <input className="border border-gray-200 rounded-xl px-4 py-3 w-full" placeholder="Napr. Poprad a okolie" value={formData.city} onChange={e => update({ city: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-4"><SecondaryBtn onClick={back}>Späť</SecondaryBtn><PrimaryBtn disabled={!formData.agencyName || !formData.city} onClick={next}>Uložiť a pokračovať →</PrimaryBtn></div>
          </div>
        )}

        {/* ... (Tu by boli kroky 3-7, ktoré sú rovnaké ako v tvojom kóde, len som ich skrátil pre dĺžku správy) ... */}
        
        {/* STEP 8: CIELE (Tu končil tvoj pôvodný kód) */}
        {step === 8 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <h1 className="text-3xl font-bold mb-2">Definuj svoje ciele 🎯</h1>
            <p className="text-gray-600 mb-6">Revolis prispôsobí AI odporúčania podľa tvojich priorít.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {[
                { id: "leads", emoji: "📊", label: "Viac leadov", desc: "Chcem zvýšiť počet dopytov" },
                { id: "close", emoji: "⚡", label: "Rýchle uzavretie", desc: "Skrátiť čas od kontaktu po zmluvu" },
                { id: "auto", emoji: "🤖", label: "Automatizácia", desc: "Menej manuálnych úloh" },
                { id: "analytics", emoji: "📈", label: "Lepší prehľad", desc: "Vidieť presne čo funguje" },
              ].map(c => (
                <OptionCard key={c.id} {...c} active={formData.primaryGoal === c.id} onClick={id => update({ primaryGoal: id })} />
              ))}
            </div>
            
            <div className="bg-gray-50 rounded-2xl p-6 mb-8 space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">Cieľ: Leadov mesačne</span>
                  <span className="text-sm font-bold text-gray-900">{formData.kpiLeads}</span>
                </div>
                <input type="range" min={5} max={200} step={5} value={formData.kpiLeads} onChange={e => update({ kpiLeads: Number(e.target.value) })} className="w-full accent-gray-900" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">Cieľ: Konverzný pomer</span>
                  <span className="text-sm font-bold text-gray-900">{formData.kpiConversion}%</span>
                </div>
                <input type="range" min={1} max={50} value={formData.kpiConversion} onChange={e => update({ kpiConversion: Number(e.target.value) })} className="w-full accent-gray-900" />
              </div>
            </div>

            <div className="flex gap-4"><SecondaryBtn onClick={back}>Späť</SecondaryBtn><PrimaryBtn onClick={next}>Dokončiť nastavenie ✓</PrimaryBtn></div>
          </div>
        )}

        {/* STEP 9: HOTOVO */}
        {step === 9 && (
          <div className="text-center py-12 animate-in zoom-in-95 duration-700">
            <div className="text-6xl mb-6">🎊</div>
            <h1 className="text-4xl font-bold mb-4">Všetko je pripravené!</h1>
            <p className="text-gray-500 mb-10 max-w-md mx-auto">Váš Real Estate OS je nakonfigurovaný. Asistentka Sofia je pripravená spracovať váš prvý lead.</p>
            
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 mb-10 text-left max-w-sm mx-auto">
               <h3 className="text-sm font-bold uppercase mb-4 tracking-widest text-gray-400 text-center">Zhrnutie profilu</h3>
               <div className="space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-gray-400">Maklér:</span> <span className="font-bold">{formData.name}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-400">Agentúra:</span> <span className="font-bold">{formData.agencyName}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-400">AI Asistent:</span> <span className="font-bold">{formData.aiName} ({formData.aiTone})</span></div>
               </div>
            </div>

            <button 
              onClick={() => window.location.href = "/dashboard"} 
              className="bg-gray-900 text-white px-12 py-4 rounded-2xl font-bold shadow-xl shadow-gray-200 hover:scale-105 transition-transform"
            >
              Vstúpiť do Dashboardu
            </button>
          </div>
        )}
      </main>
    </div>
  );
}