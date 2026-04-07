"use client";
import React, { useState, useEffect, useRef } from "react";
import { supabaseClient } from "@/lib/supabase/client";
// FIX: Explicitný import pre typovú bezpečnosť (ADR-012)
import { v4 as uuidv4 } from "uuid";

// --- UI Kit Components (Robust & Type-Safe) ---

function showToast(msg: string) {
  if (typeof window !== "undefined") {
    const el = document.createElement("div");
    el.textContent = msg;
    el.style.cssText = "position:fixed;bottom:32px;left:50%;transform:translateX(-50%);background:#222;color:#fff;padding:12px 24px;border-radius:8px;z-index:9999;font-size:15px;box-shadow:0 4px 12px rgba(0,0,0,0.1);";
    document.body.appendChild(el);
    setTimeout(() => { el.remove(); }, 3200);
  }
}

function PrimaryBtn({ onClick, children, disabled }: { onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 w-full md:w-auto transition-all active:scale-95">{children}</button>;
}

function SecondaryBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all">{children}</button>;
}

function TagGroup({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  // FIX: Ochrana proti undefined poli (prevencia bieleho screenu)
  const safeSelected = Array.isArray(selected) ? selected : [];
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => onToggle(opt)}
          className={"border rounded-full px-4 py-1.5 text-sm transition-all " + (safeSelected.includes(opt) ? "bg-gray-900 text-white border-gray-900" : "border-gray-300 text-gray-700 hover:bg-gray-50")}>
          {opt}
        </button>
      ))}
    </div>
  )
}

function OptionCard({ id, emoji, label, desc, active, onClick }: { id: string; emoji: string; label: string; desc: string; active: boolean; onClick: (id: string) => void }) {
  return (
    <button type="button" onClick={() => onClick(id)}
      className={"border rounded-xl p-4 flex flex-col items-center text-center gap-1 w-full transition-all " + (active ? "border-2 border-gray-900 bg-gray-50 scale-[1.02]" : "border border-gray-200 hover:border-gray-400 opacity-70 hover:opacity-100")}>
      <span className="text-2xl mb-1">{emoji}</span>
      <span className="text-sm font-bold text-gray-900">{label}</span>
      {desc && <span className="text-[10px] text-gray-500 leading-tight">{desc}</span>}
    </button>
  );
}

const sidebarSteps = [
  { id: 1, emoji: "🚀", label: "Vitaj" },
  { id: 2, emoji: "🏢", label: "Realitka" },
  { id: 3, emoji: "👤", label: "Profil" },
  { id: 4, emoji: "🤖", label: "AI Sofia" },
  { id: 5, emoji: "📋", label: "Import" },
  { id: 6, emoji: "🏗️", label: "Pipeline" },
  { id: 7, emoji: "🔗", label: "Prepojenia" },
  { id: 8, emoji: "🎯", label: "Ciele" },
];

export default function TestDbClient() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "", role: "", agencyName: "", city: "",
    phone: "", linkedin: "", bio: "",
    specializations: [] as string[],
    aiName: "Sofia", aiTone: "💼 PROFESIONÁLNY", 
    pipelineToggles: { welcome: true, followUp: true, reminder: true, score: true },
    primaryGoal: "", kpiLeads: 30, kpiConversion: 15,
  });
  const [loading, setLoading] = useState(true);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    const hydrate = async () => {
      // FIX L134: Safe hydration s nullish coalescing
      const savedId = typeof window !== "undefined" ? localStorage.getItem("onboarding_session_id") : null;
      const sessionId = savedId ?? "";
      
      if (!sessionId) {
        setLoading(false);
        return;
      }
      
      sessionIdRef.current = sessionId;
      const { data } = await supabaseClient
        .from("onboarding_sessions")
        .select("step, form_data")
        .eq("session_id", sessionId)
        .maybeSingle();
        
      if (data) {
        setStep(data.step || 1);
        if (data.form_data) setFormData(prev => ({ ...prev, ...data.form_data }));
      }
      setLoading(false);
    };
    hydrate();
  }, []);

  const saveProgress = async (nextStep: number, nextFormData: any) => {
    // FIX UUID: Generovanie novej session ak neexistuje
    let sessionId = sessionIdRef.current;
    if (!sessionId) {
      sessionId = uuidv4();
      sessionIdRef.current = sessionId;
      localStorage.setItem("onboarding_session_id", sessionId);
    }

    const { error } = await supabaseClient
      .from("onboarding_sessions")
      .upsert({
        session_id: sessionId,
        step: nextStep,
        form_data: nextFormData,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Supabase Error:", error);
      showToast("Chyba synchronizácie.");
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

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-gray-50 text-gray-400 font-medium animate-pulse">Inicializácia Revolis OS...</div>;

  return (
    <div className="flex min-h-screen bg-white text-gray-900 font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-gray-100 p-8 shrink-0 bg-gray-50/20">
        <div className="flex items-center gap-2 mb-12">
          <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-white font-bold text-xl">R</div>
          <span className="font-bold tracking-tight">Revolis.AI</span>
        </div>
        <nav className="space-y-4">
          {sidebarSteps.map(s => (
            <div key={s.id} className={"flex items-center gap-3 text-sm " + (s.id === step ? "text-gray-900 font-bold" : "text-gray-300 font-medium")}> 
              <span className={s.id === step ? "grayscale-0" : "grayscale"}>{s.emoji}</span>
              <span>{s.label}</span>
              {s.id < step && <span className="ml-auto text-green-500">✓</span>}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 md:p-20 max-w-4xl overflow-y-auto mx-auto">
        
        {/* KROK 1: VITAJ */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-4xl font-bold mb-4 tracking-tight">Vitajte v budúcnosti realít 🚀</h1>
            <p className="text-gray-500 mb-10 text-lg">Pripravte sa na AI-first predaj. Začnime vaším menom.</p>
            <div className="space-y-6 max-w-md">
               <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Celé meno</label>
                  <input className="w-full border-b-2 border-gray-100 focus:border-gray-900 outline-none py-3 text-xl transition-all" value={formData.name} onChange={e => update({ name: e.target.value })} placeholder="Ján Maklér" />
               </div>
               <div className="pt-4">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-4">Vaša pozícia</label>
                  <div className="grid grid-cols-2 gap-3">
                    <OptionCard id="owner" emoji="🏛️" label="Majiteľ" desc="Agentúra" active={formData.role === "owner"} onClick={id => update({ role: id })} />
                    <OptionCard id="agent" emoji="💛" label="Maklér" desc="Solo" active={formData.role === "agent"} onClick={id => update({ role: id })} />
                  </div>
               </div>
            </div>
            <div className="mt-12">
              <PrimaryBtn disabled={!formData.name || !formData.role} onClick={next}>Pokračovať →</PrimaryBtn>
            </div>
          </div>
        )}

        {/* KROK 2: REALITKA */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <h1 className="text-3xl font-bold mb-8 text-gray-900">O vašej kancelárii 🏢</h1>
            <div className="space-y-8 max-w-lg">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Názov realitky</label>
                    <input className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-gray-900 transition-all" value={formData.agencyName} onChange={e => update({ agencyName: e.target.value })} placeholder="Napr. Diamond Reality" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Pôsobisko (Mesto)</label>
                    <input className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-gray-900 transition-all" value={formData.city} onChange={e => update({ city: e.target.value })} placeholder="Napr. Bratislava" />
                  </div>
               </div>
            </div>
            <div className="mt-12 flex gap-4">
              <SecondaryBtn onClick={back}>Späť</SecondaryBtn>
              <PrimaryBtn disabled={!formData.agencyName || !formData.city} onClick={next}>Pokračovať →</PrimaryBtn>
            </div>
          </div>
        )}

        {/* KROK 3: PROFIL (OPRAVENÝ) */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <h1 className="text-3xl font-bold mb-2 text-gray-900">Profil makléra 👤</h1>
            <p className="text-gray-500 mb-10">Tieto detaily Sofia použije na budovanie vašej dôveryhodnosti.</p>
            <div className="space-y-6 max-w-lg">
               <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Telefón pre klientov</label>
                  <input className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none" value={formData.phone} onChange={e => update({ phone: e.target.value })} placeholder="+421 900 000 000" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-4">Na čo sa špecializujete?</label>
                  <TagGroup 
                    options={["Byty", "Rodinné domy", "Pozemky", "Komerčné", "Luxusné"]} 
                    selected={formData.specializations} 
                    onToggle={v => {
                      const curr = formData.specializations || [];
                      update({ specializations: curr.includes(v) ? curr.filter(x => x !== v) : [...curr, v] });
                    }}
                  />
               </div>
            </div>
            <div className="mt-12 flex gap-4">
              <SecondaryBtn onClick={back}>Späť</SecondaryBtn>
              <PrimaryBtn onClick={next}>Nastaviť AI Asistentku →</PrimaryBtn>
            </div>
          </div>
        )}

        {/* KROK 4: AI SOFIA */}
        {step === 4 && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">— KROK 4 ZO 8 —</p>
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">Nakonfiguruj AI asistenta 🤖</h1>
            <p className="text-gray-600 mb-6">Toto je srdce Revolisu. Tvoj AI obchodník bude pracovať za teba non-stop. Nastav mu osobnosť a správanie.</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Meno tvojho AI asistenta</label>
              <input className="border border-gray-300 rounded-lg px-3 py-2 w-full" value={formData.aiName} onChange={e => update({ aiName: e.target.value })} />
            </div>
            <p className="text-sm font-medium text-gray-700 mb-2">Tón komunikácie AI</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {["💼 PROFESIONÁLNY","😊 PRIATEĽSKÝ","✨ LUXUSNÝ","⚡ ENERGICKÝ","🎩 FORMÁLNY"].map(tone => (
                <button key={tone} type="button" onClick={() => update({ aiTone: tone })}
                  className={"rounded-lg px-3 py-2 text-xs font-medium " + (formData.aiTone === tone ? "border-2 border-gray-900 bg-gray-50 text-gray-900" : "border border-gray-200 text-gray-600 hover:bg-gray-50")}> 
                  {tone}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primárny jazyk</label>
                <select className="border border-gray-300 rounded-lg px-3 py-2 w-full">
                  <option>sk Slovenčina</option><option>cs Čeština</option><option>en Angličtina</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Oneskorenie auto-odpovede</label>
                <select className="border border-gray-300 rounded-lg px-3 py-2 w-full">
                  <option>5 minút (odporúčané)</option><option>Okamžite</option><option>15 minút</option><option>30 minút</option>
                </select>
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg px-4 mb-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div className="flex items-start gap-3">
                  <span>🤖</span>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Automatické odpovedanie</div>
                    <div className="text-xs text-gray-500">AI odpovedá na každý dotaz automaticky bez tvojho zásahu.</div>
                  </div>
                </div>
                <button type="button" onClick={() => update({ autoReply: !formData.autoReply })}
                  className={"relative inline-flex h-6 w-11 items-center rounded-full " + (formData.autoReply ? "bg-gray-900" : "bg-gray-300")}> 
                  <span className={"inline-block h-4 w-4 transform rounded-full bg-white transition-transform " + (formData.autoReply ? "translate-x-6" : "translate-x-1")} />
                </button>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div className="flex items-start gap-3">
                  <span>🕐</span>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Pracovné hodiny</div>
                    <div className="text-xs text-gray-500">AI odpovedá len počas pracovných hodín (napr. 8:00–18:00).</div>
                  </div>
                </div>
                <button type="button" onClick={() => update({ workHours: !formData.workHours })}
                  className={"relative inline-flex h-6 w-11 items-center rounded-full " + (formData.workHours ? "bg-gray-900" : "bg-gray-300")}> 
                  <span className={"inline-block h-4 w-4 transform rounded-full bg-white transition-transform " + (formData.workHours ? "translate-x-6" : "translate-x-1")} />
                </button>
              </div>
              <div className="flex items-center justify-between py-3">
                <div className="flex items-start gap-3">
                  <span>⭐</span>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Smart lead scoring</div>
                    <div className="text-xs text-gray-500">AI automaticky hodnotí pripravenosť leadov a upozorní na top prioritné.</div>
                  </div>
                </div>
                <button type="button" onClick={() => update({ leadScoring: !formData.leadScoring })}
                  className={"relative inline-flex h-6 w-11 items-center rounded-full " + (formData.leadScoring ? "bg-gray-900" : "bg-gray-300")}> 
                  <span className={"inline-block h-4 w-4 transform rounded-full bg-white transition-transform " + (formData.leadScoring ? "translate-x-6" : "translate-x-1")} />
                </button>
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-lg">🤖</div>
                <div>
                  <div className="font-medium text-sm text-gray-900">{formData.aiName}</div>
                  <div className="text-xs text-green-600">● Online — odpovedá za 5 min</div>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-3 text-sm text-gray-700">
                Dobrý deň! Som {formData.aiName}, digitálny asistent našej realitnej kancelárie. Rád vám pomôžem nájsť nehnuteľnosť podľa vašich predstáv. Čo práve hľadáte?
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700 mb-4">
              ⚡ Výsledok maklérov s Revolis AI: Priemerná odpoveď na lead za 2 min (vs. 4 hodiny manuálne). Konverzný pomer leadov +34%.
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={back} className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">← Späť</button>
              <button type="button" onClick={next} className="bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700">Generovať AI & pokračovať →</button>
            </div>
          </div>
        )}
        {/* KROK 8: CIELE (FINÁLE) */}
        {step === 8 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <h1 className="text-3xl font-bold mb-2 text-gray-900">Nastavme KPI 🎯</h1>
            <p className="text-gray-500 mb-10">Čo má Sofia za cieľ dosiahnuť v prvom mesiaci?</p>
            <div className="bg-gray-50 p-8 rounded-3xl space-y-10 max-w-lg">
               <div>
                  <div className="flex justify-between mb-4"><span className="font-bold">Cieľ: Nové leady</span> <span className="bg-gray-900 text-white px-3 py-1 rounded text-sm">{formData.kpiLeads}</span></div>
                  <input type="range" min={5} max={100} value={formData.kpiLeads} onChange={e => update({ kpiLeads: Number(e.target.value) })} className="w-full accent-gray-900" />
               </div>
               <div>
                  <div className="flex justify-between mb-4"><span className="font-bold">Cieľ: Konverzia</span> <span className="bg-gray-900 text-white px-3 py-1 rounded text-sm">{formData.kpiConversion}%</span></div>
                  <input type="range" min={5} max={50} value={formData.kpiConversion} onChange={e => update({ kpiConversion: Number(e.target.value) })} className="w-full accent-gray-900" />
               </div>
            </div>
            <div className="mt-12 flex gap-4">
              <SecondaryBtn onClick={back}>Späť</SecondaryBtn>
              <PrimaryBtn onClick={next}>Dokončiť ✓</PrimaryBtn>
            </div>
          </div>
        )}

        {/* KROK 9: HOTOVO */}
        {step === 9 && (
          <div className="text-center py-20 animate-in zoom-in-95 duration-700">
            <div className="text-7xl mb-6">🎉</div>
            <h1 className="text-4xl font-extrabold mb-4">Váš Real Estate OS je live!</h1>
            <p className="text-gray-500 mb-12 max-w-md mx-auto">Všetky nastavenia boli úspešne uložené do databázy. Sofia je pripravená.</p>
            <button onClick={() => window.location.href = "/dashboard"} className="bg-gray-900 text-white px-10 py-4 rounded-2xl font-bold hover:shadow-2xl transition-all">Vstúpiť do Dashboardu</button>
          </div>
        )}

      </main>
    </div>
  );
}